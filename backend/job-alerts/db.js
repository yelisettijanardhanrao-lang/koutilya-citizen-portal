import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const JSON_FILE = path.join(ROOT, 'backend', 'portal-data', 'job-alerts.json');
const usePostgres = Boolean(process.env.DATABASE_URL);
let pool = null;
if (usePostgres) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  pool.on('error', e => console.error('JOB ALERT PG ERROR:', e.message));
}
const initial = { subscribers: [], notifications: [], deliveries: [], sources: [] };
const JSON_BACKUP = `${JSON_FILE}.bak`;
const JSON_TMP = `${JSON_FILE}.tmp`;
function norm(x){return {...initial,...(x||{}),subscribers:Array.isArray(x?.subscribers)?x.subscribers:[],notifications:Array.isArray(x?.notifications)?x.notifications:[],deliveries:Array.isArray(x?.deliveries)?x.deliveries:[],sources:Array.isArray(x?.sources)?x.sources:[]};}
async function initPg(){
  await pool.query(`CREATE TABLE IF NOT EXISTS job_alert_subscribers (id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,user_code TEXT,email TEXT NOT NULL,name TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',unsubscribe_token_hash TEXT NOT NULL UNIQUE,subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),unsubscribed_at TIMESTAMPTZ)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS job_alert_notifications (id TEXT PRIMARY KEY,source_id TEXT NOT NULL,alert_type TEXT NOT NULL,scope TEXT,category TEXT,title TEXT NOT NULL,summary TEXT,official_url TEXT NOT NULL,published_at TIMESTAMPTZ,deadline_at TIMESTAMPTZ,fingerprint TEXT NOT NULL UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS job_alert_deliveries (notification_id TEXT NOT NULL REFERENCES job_alert_notifications(id) ON DELETE CASCADE,subscriber_id TEXT NOT NULL REFERENCES job_alert_subscribers(id) ON DELETE CASCADE,sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),status TEXT NOT NULL,provider_id TEXT,error TEXT,PRIMARY KEY(notification_id,subscriber_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS job_alert_sources (id TEXT PRIMARY KEY,name TEXT NOT NULL,scope TEXT,type TEXT,official_url TEXT NOT NULL,active BOOLEAN NOT NULL DEFAULT TRUE,last_checked_at TIMESTAMPTZ)`);
}
async function init(){ if(usePostgres) return initPg(); await fs.mkdir(path.dirname(JSON_FILE),{recursive:true}); if(!fsSync.existsSync(JSON_FILE)){await fs.writeFile(JSON_FILE,JSON.stringify(initial,null,2));} }
async function parseFile(file){const text=await fs.readFile(file,'utf8'); if(!text.trim()) throw new Error('EMPTY_JSON'); return norm(JSON.parse(text));}
async function readJson(){
  await init();
  try { return await parseFile(JSON_FILE); }
  catch (e) {
    console.error('JOB ALERT JSON READ ERROR:', e.message);
    try {
      const backup = await parseFile(JSON_BACKUP);
      console.warn('JOB ALERT JSON: recovered from backup');
      return backup;
    } catch {}
    return initial;
  }
}
let q=Promise.resolve();
async function writeJson(db){
  const payload=JSON.stringify(norm(db),null,2);
  await fs.writeFile(JSON_TMP,payload,'utf8');
  if(fsSync.existsSync(JSON_FILE)) {
    try { await fs.copyFile(JSON_FILE,JSON_BACKUP); } catch {}
  }
  await fs.rename(JSON_TMP,JSON_FILE);
}
export async function mutate(fn){if(usePostgres){return pgTransaction(fn)} q=q.then(async()=>{const db=await readJson();const result=await fn(db);await writeJson(db);return result});return q}
async function pgTransaction(fn){
  await initPg();
  const c=await pool.connect();
  try{await c.query('BEGIN');
    const read=async()=>{const [s,n,d,src]=await Promise.all([c.query('SELECT * FROM job_alert_subscribers ORDER BY subscribed_at'),c.query('SELECT * FROM job_alert_notifications ORDER BY created_at DESC'),c.query('SELECT * FROM job_alert_deliveries'),c.query('SELECT * FROM job_alert_sources ORDER BY name')]);return {subscribers:s.rows.map(rowSub),notifications:n.rows.map(rowNot),deliveries:d.rows.map(rowDel),sources:src.rows.map(rowSrc)}};
    const db=await read(); const result=await fn(db); await c.query('COMMIT'); return result;
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}
function rowSub(r){return {id:r.id,userId:r.user_id,userCode:r.user_code,email:r.email,name:r.name,status:r.status,unsubscribeTokenHash:r.unsubscribe_token_hash,subscribedAt:r.subscribed_at?.toISOString?.()||r.subscribed_at,unsubscribedAt:r.unsubscribed_at?.toISOString?.()||r.unsubscribed_at}}
function rowNot(r){return {id:r.id,sourceId:r.source_id,alertType:r.alert_type,scope:r.scope,category:r.category,title:r.title,summary:r.summary,officialUrl:r.official_url,publishedAt:r.published_at?.toISOString?.()||r.published_at,deadlineAt:r.deadline_at?.toISOString?.()||r.deadline_at,fingerprint:r.fingerprint,createdAt:r.created_at?.toISOString?.()||r.created_at}}
function rowDel(r){return {notificationId:r.notification_id,subscriberId:r.subscriber_id,sentAt:r.sent_at?.toISOString?.()||r.sent_at,status:r.status,providerId:r.provider_id,error:r.error}}
function rowSrc(r){return {id:r.id,name:r.name,scope:r.scope,type:r.type,officialUrl:r.official_url,active:r.active,lastCheckedAt:r.last_checked_at?.toISOString?.()||r.last_checked_at}}
export async function ensureSources(rows){
  if(!usePostgres)return mutate(db=>{for(const s of rows){const i=db.sources.findIndex(x=>x.id===s.id);if(i<0)db.sources.push({...s,lastCheckedAt:null});else db.sources[i]={...db.sources[i],...s}}return db.sources.length});
  await initPg(); for(const s of rows) await pool.query(`INSERT INTO job_alert_sources(id,name,scope,type,official_url,active) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,scope=EXCLUDED.scope,type=EXCLUDED.type,official_url=EXCLUDED.official_url,active=EXCLUDED.active`,[s.id,s.name,s.scope,s.type,s.officialUrl,s.active!==false]); return rows.length;
}
export async function upsertSubscriber(user){
 const secret=process.env.JOB_ALERT_UNSUBSCRIBE_SECRET||'koutilya-local-alert-secret-change-in-production';
 const token=crypto.createHmac('sha256',secret).update(String(user.id)).digest('hex');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 if(!usePostgres){return mutate(db=>{let s=db.subscribers.find(x=>x.userId===user.id);if(s){if(s.status==='UNSUBSCRIBED')return {...s,token:null};s.email=user.email;s.name=user.name;s.userCode=user.userId;return {...s,token:null}}s={id:'jas_'+crypto.randomBytes(9).toString('hex'),userId:user.id,userCode:user.userId,email:user.email,name:user.name,status:'ACTIVE',unsubscribeTokenHash:hash,subscribedAt:new Date().toISOString(),unsubscribedAt:null};db.subscribers.push(s);return {...s,token}})}
 await initPg(); const r=await pool.query(`INSERT INTO job_alert_subscribers(id,user_id,user_code,email,name,status,unsubscribe_token_hash) VALUES($1,$2,$3,$4,$5,'ACTIVE',$6) ON CONFLICT(user_id) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,user_code=EXCLUDED.user_code RETURNING *`,['jas_'+crypto.randomBytes(9).toString('hex'),user.id,user.userId,user.email,user.name,hash]); return {...rowSub(r.rows[0]),token};
}
export async function getSubscribers(){if(!usePostgres){const db=await readJson();return db.subscribers.filter(s=>s.status==='ACTIVE')}await initPg();const r=await pool.query(`SELECT * FROM job_alert_subscribers WHERE status='ACTIVE' ORDER BY subscribed_at`);return r.rows.map(rowSub)}
export async function getSubscriberByToken(token){const hash=crypto.createHash('sha256').update(String(token||'')).digest('hex');if(!usePostgres){const db=await readJson();return db.subscribers.find(s=>s.unsubscribeTokenHash===hash)||null}await initPg();const r=await pool.query('SELECT * FROM job_alert_subscribers WHERE unsubscribe_token_hash=$1',[hash]);return r.rows[0]?rowSub(r.rows[0]):null}
export async function unsubscribeToken(token){const hash=crypto.createHash('sha256').update(String(token||'')).digest('hex');if(!usePostgres)return mutate(db=>{const s=db.subscribers.find(x=>x.unsubscribeTokenHash===hash);if(!s)return false;s.status='UNSUBSCRIBED';s.unsubscribedAt=new Date().toISOString();return true});await initPg();const r=await pool.query(`UPDATE job_alert_subscribers SET status='UNSUBSCRIBED',unsubscribed_at=NOW() WHERE unsubscribe_token_hash=$1`,[hash]);return r.rowCount>0}
export async function insertNotification(n){
 if(!usePostgres){return mutate(db=>{const old=db.notifications.find(x=>x.fingerprint===n.fingerprint);if(old)return {created:false,notification:old};const x={id:n.id||'jan_'+crypto.randomBytes(9).toString('hex'),createdAt:new Date().toISOString(),...n};db.notifications.push(x);return {created:true,notification:x}})}
 await initPg(); const r=await pool.query(`INSERT INTO job_alert_notifications(id,source_id,alert_type,scope,category,title,summary,official_url,published_at,deadline_at,fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(fingerprint) DO NOTHING RETURNING *`,[n.id||'jan_'+crypto.randomBytes(9).toString('hex'),n.sourceId,n.alertType,n.scope,n.category,n.title,n.summary,n.officialUrl,n.publishedAt||null,n.deadlineAt||null,n.fingerprint]);return r.rows[0]?{created:true,notification:rowNot(r.rows[0])}:{created:false,notification:null};
}
export async function listNotifications(limit=100){if(!usePostgres){const db=await readJson();return db.notifications.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,limit)}await initPg();const r=await pool.query('SELECT * FROM job_alert_notifications ORDER BY created_at DESC LIMIT $1',[limit]);return r.rows.map(rowNot)}
export async function wasDelivered(notificationId,subscriberId){if(!usePostgres){const db=await readJson();return db.deliveries.some(x=>x.notificationId===notificationId&&x.subscriberId===subscriberId&&x.status==='SENT')}await initPg();const r=await pool.query('SELECT 1 FROM job_alert_deliveries WHERE notification_id=$1 AND subscriber_id=$2 AND status=\'SENT\' LIMIT 1',[notificationId,subscriberId]);return r.rowCount>0}
export async function recordDelivery(d){if(!usePostgres)return mutate(db=>{const i=db.deliveries.findIndex(x=>x.notificationId===d.notificationId&&x.subscriberId===d.subscriberId);if(i>=0){db.deliveries[i]={...db.deliveries[i],...d,sentAt:new Date().toISOString()};return true}db.deliveries.push({sentAt:new Date().toISOString(),...d});return true});await initPg();await pool.query(`INSERT INTO job_alert_deliveries(notification_id,subscriber_id,status,provider_id,error) VALUES($1,$2,$3,$4,$5) ON CONFLICT(notification_id,subscriber_id) DO UPDATE SET sent_at=NOW(),status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,error=EXCLUDED.error`,[d.notificationId,d.subscriberId,d.status,d.providerId||null,d.error||null]);return true}
export async function stats(){if(!usePostgres){const db=await readJson();return {subscribers:db.subscribers.filter(s=>s.status==='ACTIVE').length,notifications:db.notifications.length,deliveries:db.deliveries.filter(x=>x.status==='SENT').length,sources:db.sources.filter(x=>x.active!==false).length}}await initPg();const [a,b,c,d]=await Promise.all([pool.query(`SELECT count(*)::int n FROM job_alert_subscribers WHERE status='ACTIVE'`),pool.query(`SELECT count(*)::int n FROM job_alert_notifications`),pool.query(`SELECT count(*)::int n FROM job_alert_deliveries WHERE status='SENT'`),pool.query(`SELECT count(*)::int n FROM job_alert_sources WHERE active=true`)]);return {subscribers:a.rows[0].n,notifications:b.rows[0].n,deliveries:c.rows[0].n,sources:d.rows[0].n}}
