import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../portal-db.js';
import { ensureSources, upsertSubscriber, getSubscribers, insertNotification, listNotifications, wasDelivered, recordDelivery, getSubscriberByToken, unsubscribeToken, stats } from './db.js';

const DEFAULT_BASE = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
const SOURCE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sources.json');
let sources = [];
async function loadSources(){ if(!sources.length) sources=JSON.parse(await fs.readFile(SOURCE_FILE,'utf8')); return sources; }
function unsubscribeTokenForUser(userId){const secret=process.env.JOB_ALERT_UNSUBSCRIBE_SECRET||'koutilya-local-alert-secret-change-in-production';return crypto.createHmac('sha256',secret).update(String(userId)).digest('hex')}
const KEYWORDS = /(notification|advertisement|recruit|vacan|vacancy|exam|admission|entrance|application|registration|hall ticket|admit card|answer key|result|counselling|counseling|schedule|important notice|last date|extension|correction|provisional|final|shortlist|merit|appointment|selection)/i;
const GENERIC_TITLES = /^(examination|active examinations|forthcoming examinations|answer keys?|recruitment|recruitment notices?|career(?:s)?|careers?|downloads?|notices?|notice board|results?|admissions?|home|login|contact|tenders?|circulars?|latest news|news)$/i;
function clean(s=''){return String(s).replace(/\s+/g,' ').trim()}
function hash(v){return crypto.createHash('sha256').update(v).digest('hex')}
function absolute(base,href){try{return new URL(href,base).href}catch{return null}}
function extractRss(xml,source){const out=[];const items=String(xml).match(/<item[\s\S]*?<\/item>/gi)||[];for(const item of items){const title=clean(item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g,''));const link=clean(item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]);const desc=clean(item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<[^>]+>/g,' '));const pub=clean(item.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i)?.[1]);if(title&&link){const url=absolute(source.officialUrl,link)||source.officialUrl;out.push({title,summary:desc,officialUrl:url,applicationUrl:source.applicationUrl||null,publishedAt:pub||null})}}return out}
function extractDateText(text){const x=clean(text);const m=x.match(/(?:\b(?:0?[1-9]|[12]\d|3[01])[-\/.](?:0?[1-9]|1[0-2])[-\/.](?:20\d{2})\b|\b(?:20\d{2})[-\/.](?:0?[1-9]|1[0-2])[-\/.](?:0?[1-9]|[12]\d|3[01])\b)/);return m?m[0]:null}
function extractLabeledDate(text,labels){const x=clean(text);const re=new RegExp('(?:'+labels.join('|')+')\\s*[:\-]?\\s*([^|;\n]{1,40})','i');const m=x.match(re);return m?extractDateText(m[1]):null}
function pickApplicationUrl(html,base,start,end,source){if(source.applicationUrl)return source.applicationUrl;const region=html.slice(Math.max(0,start-1200),Math.min(html.length,end+1800));const arx=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let best=null;let a;while((a=arx.exec(region))){const text=clean(a[2].replace(/<[^>]+>/g,' '));const href=absolute(base,a[1]);if(!href||!text)continue;if(/apply|application|registration|register|online form|click here to apply|apply online|application portal/i.test(text)){best=href;break}}return best}
function extractHtml(html,source){const out=[];const seen=new Set();const rx=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;while((m=rx.exec(html))){const title=clean(m[2].replace(/<[^>]+>/g,' '));const url=absolute(source.officialUrl,m[1]);if(!url||!title||title.length<8||title.length>260||GENERIC_TITLES.test(title)||!KEYWORDS.test(title))continue;const parent=clean(html.slice(Math.max(0,m.index-700),Math.min(html.length,rx.lastIndex+1200)).replace(/<[^>]+>/g,' '));const publishedAt=extractLabeledDate(parent,['notification date','published','date of notification'])||extractDateText(parent);const applicationStartAt=extractLabeledDate(parent,['application date','start date','commencement of submission','online application starts','application starts']);const deadlineAt=extractLabeledDate(parent,['end date','last date','closing date','last date for submission','deadline']);const applicationUrl=pickApplicationUrl(html,source.officialUrl,m.index,rx.lastIndex,source);const k=title+'|'+url;if(seen.has(k))continue;seen.add(k);out.push({title,summary:'Official notification/update published by '+source.name+'.',officialUrl:url,applicationUrl,publishedAt,applicationStartAt,deadlineAt});if(out.length>=20)break}return out}
async function fetchSource(source){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(source.officialUrl,{headers:{'User-Agent':'Koutilya-Citizen-Alerts/1.0 (official-source-monitoring)'},signal:controller.signal,redirect:'follow'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const text=await r.text();if(/<rss|<feed|<channel/i.test(text))return extractRss(text,source);return extractHtml(text,source)}finally{clearTimeout(timer)}}
function normalize(item,source){const title=clean(item.title);const officialUrl=item.officialUrl||source.officialUrl;const applicationUrl=item.applicationUrl||source.applicationUrl||null;const fingerprint=hash([source.id,title,officialUrl,applicationUrl||''].join('|').toLowerCase());return {sourceId:source.id,sourceName:source.name,alertType:source.type||'GOVERNMENT_ALERT',scope:source.scope,category:source.type,title,summary:clean(item.summary||`Official update from ${source.name}.`),officialUrl,applicationUrl,publishedAt:item.publishedAt||null,applicationStartAt:item.applicationStartAt||null,deadlineAt:item.deadlineAt||null,fingerprint}}
function formatAlertDate(value){if(!value)return 'Not specified';const d=new Date(value);if(Number.isNaN(d.getTime()))return esc(value);return d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'});}
function sourceDisplay(n){
 const id=String(n.sourceId||'').toLowerCase();
 if(id==='ap-eapcet')return 'EAPCET Notification';
 if(id==='ts-eapcet')return 'EAPCET Notification';
 return clean(n.sourceName||n.title||'Government Notification');
}
function applicationUrlFor(n){
 const src=sources.find(s=>s.id===n.sourceId);
 return n.applicationUrl||(src&&src.applicationUrl)||n.officialUrl;
}
function emailSubject(n){return `Koutilya Alert — ${sourceDisplay(n)} · ${String(n.scope||'NATIONAL').replace(/_/g,'_')}`}
function emailHtml(n,unsubscribe){
 const notificationDate=n.publishedAt||null;
 const applicationDate=n.applicationStartAt||null;
 const endDate=n.deadlineAt||null;
 const display=sourceDisplay(n);
 const scope=String(n.scope||'NATIONAL').replace(/ /g,'_');
 const applyUrl=applicationUrlFor(n);
 return `<div style="margin:0;background:#f3f6fa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#17324d"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dce5ee;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(16,45,70,.06)"><div style="padding:20px 24px;background:#0b4d8a;color:#fff"><div style="font-size:20px;font-weight:700">Koutilya Solutions</div><div style="margin-top:4px;font-size:13px;color:#dcecff">Government Jobs, Competitive Exams & Education Alerts</div></div><div style="padding:24px"><h2 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#102f4a">${esc(display)} · ${esc(scope)}</h2><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 22px;background:#f7f9fc;border:1px solid #e1e8ef"><tr><td style="padding:12px 13px;border-bottom:1px solid #e1e8ef;font-weight:700">Notification Date</td><td style="padding:12px 13px;border-bottom:1px solid #e1e8ef;text-align:right">${formatAlertDate(notificationDate)}</td></tr><tr><td style="padding:12px 13px;border-bottom:1px solid #e1e8ef;font-weight:700">Application Date</td><td style="padding:12px 13px;border-bottom:1px solid #e1e8ef;text-align:right">${formatAlertDate(applicationDate)}</td></tr><tr><td style="padding:12px 13px;font-weight:700">End Date</td><td style="padding:12px 13px;text-align:right">${formatAlertDate(endDate)}</td></tr></table><p style="margin:0 0 22px"><a href="${escAttr(applyUrl)}" style="display:inline-block;padding:12px 19px;background:#0b65c2;color:#fff;text-decoration:none;border-radius:7px;font-weight:700">Open Official Notification</a></p><div style="border-top:1px solid #dfe6ed;padding-top:14px"><p style="font-size:11px;line-height:1.55;color:#66798b;margin:0 0 10px">Koutilya Solutions is an information/alert service and is not a government authority. Please verify eligibility, dates, fees and instructions on the official website before applying.</p><p style="font-size:11px;margin:0"><a href="${escAttr(unsubscribe)}" style="color:#0b65c2">Unsubscribe from these alerts</a></p></div></div></div></div>`;
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c))}
function escAttr(s){return esc(s).replace(/`/g,'&#96;')}
export function createJobAlertService({sendEmail}){
 return {
  async init(){await loadSources();await ensureSources(sources)},
  async enrollUser(user){if(!user?.id||!user?.email)return null;return upsertSubscriber(user)},
  async syncAllUsers(){await loadSources();const db=await getDb();let n=0;for(const u of db.users||[]){if(u.active!==false&&u.email){const r=await upsertSubscriber(u);if(r)n++}}return n},
  async collect({test=false}={}){await loadSources();await ensureSources(sources);if(test)return this.seedTestNotification();let newCount=0,checked=0,errors=[];for(const source of sources.filter(s=>s.active!==false)){checked++;try{const items=await fetchSource(source);for(const item of items){const n=normalize(item,source);const r=await insertNotification(n);if(r.created)newCount++}}catch(e){errors.push({source:source.id,error:e.message})}}return {checked,newCount,errors}},
  async seedTestNotification(){
   const n=normalize({
    title:'EAPCET Notification · ANDHRA_PRADESH',
    summary:'AP EAPCET 2026 application notification.',
    officialUrl:'https://cets.apsche.ap.gov.in/EAPCET/Eapcet/EAPCET_HomePage.aspx',
    publishedAt:'2026-02-03T00:00:00+05:30',
    applicationStartAt:'2026-02-04T00:00:00+05:30',
    deadlineAt:'2026-03-24T00:00:00+05:30'
   },{id:'ap-eapcet',type:'ENTRANCE_EXAM',scope:'ANDHRA_PRADESH',name:'AP EAPCET',officialUrl:'https://cets.apsche.ap.gov.in/EAPCET/Eapcet/EAPCET_HomePage.aspx',applicationUrl:'https://cets.apsche.ap.gov.in/EAPCET/Eapcet/EAPCET_HomePage.aspx'});
   n.fingerprint=hash('LOCAL_EAPCET_TEST_'+Date.now());
   const r=await insertNotification(n);
   return {checked:1,newCount:r.created?1:0,errors:[],notification:r.notification};
  },
  async sendPending({dryRun=String(process.env.JOB_ALERT_DRY_RUN||'true').toLowerCase()!=='false',limit=100,onlyNotificationIds=null}={}){await loadSources();await this.syncAllUsers();const subs=await getSubscribers();let notes=await listNotifications(Math.max(limit,100));if(Array.isArray(onlyNotificationIds))notes=notes.filter(n=>onlyNotificationIds.includes(n.id));let attempted=0,sent=0,skipped=0,errors=[];for(const n of notes){for(const s of subs){if(attempted>=limit)break;if(await wasDelivered(n.id,s.id)){skipped++;continue}attempted++;const token=unsubscribeTokenForUser(s.userId);const unsubscribe=`${DEFAULT_BASE}/api/alerts/unsubscribe?token=${encodeURIComponent(token)}`;if(dryRun){await recordDelivery({notificationId:n.id,subscriberId:s.id,status:'DRY_RUN'});continue}try{const result=await sendEmail({to:s.email,subject:emailSubject(n),text:`${sourceDisplay(n)} · ${String(n.scope||'NATIONAL').replace(/ /g,'_')}\n\nNotification Date: ${formatAlertDate(n.publishedAt)}\nApplication Date: ${formatAlertDate(n.applicationStartAt)}\nEnd Date: ${formatAlertDate(n.deadlineAt)}\n\nOpen Official Notification: ${applicationUrlFor(n)}\n\nKoutilya is not a government authority.`,html:emailHtml(n,unsubscribe)});if(!result)throw new Error('Email provider returned false');await recordDelivery({notificationId:n.id,subscriberId:s.id,status:'SENT'});sent++}catch(e){errors.push({subscriber:s.userCode,error:e.message});await recordDelivery({notificationId:n.id,subscriberId:s.id,status:'ERROR',error:e.message})}}if(attempted>=limit)break}return {subscribers:subs.length,notifications:notes.length,attempted,sent,skipped,dryRun,errors}},
  async run({test=false,dryRun}={}){await loadSources();const before=new Set((await listNotifications(100000)).map(n=>n.id));const c=await this.collect({test});const after=(await listNotifications(100000));const fresh=after.filter(n=>!before.has(n.id)).map(n=>n.id);const s=await this.sendPending({dryRun,onlyNotificationIds:fresh});return {collection:c,sending:s,newNotificationIds:fresh,stats:await stats()}},
  async list(limit){return listNotifications(limit)},
  async getStats(){return stats()},
  async unsubscribe(token){return unsubscribeToken(token)},
  async subscriberByToken(token){return getSubscriberByToken(token)},
  get sourceCatalog(){return sources}
 }
}
