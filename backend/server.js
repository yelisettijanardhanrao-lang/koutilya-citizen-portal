import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import lateBirthPdfRouter from './routes/lateBirthPdf.js';
import crypto from 'crypto';
import { initDb, mutate, getDb, id, hashPassword, randomPassword, now } from './portal-db.js';
import { decideAffidavit } from './affidavit-rules.js';


/* =====================================================
   BASIC SETUP
   ===================================================== */

const app = express();
// Production CORS: allow the Cloudflare CSP frontend to use the Render API with session cookies.
app.use((req,res,next)=>{
  const origin=req.headers.origin;
  if(origin==='https://csp.koutilyasolutions.in'){
    res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Credentials','true');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if(req.method==='OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({limit:'3mb',verify:(req,res,buf)=>{req.rawBody=Buffer.from(buf);}}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
   Project root:

   E:\late_birth_html
*/
const ROOT = path.join(__dirname, '..');
// Lightweight .env loader so production/test settings work without an extra dependency.
async function loadEnvFile(filePath) {
  try {
    const envText = await fs.readFile(filePath, 'utf8');
    for (const raw of envText.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}
// Support both project-root .env and backend/.env. This lets local deployments
// keep their SMTP/Cashfree secrets beside the backend without exposing them to the frontend.
await loadEnvFile(path.join(ROOT, '.env'));
await loadEnvFile(path.join(__dirname, '.env'));
await initDb();



/* =====================================================
   KOUTILYA CITIZEN PORTAL AUTH / WALLET / SUPPORT
   Additive layer. Existing forms/templates/PDF generators
   are retained; payment enforcement happens before PDF routes.
   ===================================================== */
const SESSION_COOKIE='kspl_session';
const SESSION_TTL_DAYS=7;
function cookieValue(req,name){const raw=req.headers.cookie||'';const part=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return part?decodeURIComponent(part.slice(name.length+1)):'';}
function bearerValue(req){const h=String(req.headers.authorization||'');return /^Bearer\s+/i.test(h)?h.replace(/^Bearer\s+/i,'').trim():'';}
function authToken(req,name){return bearerValue(req)||cookieValue(req,name);}
function setCookie(res,name,value,maxAge=SESSION_TTL_DAYS*86400){res.setHeader('Set-Cookie',`${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);}
function clearCookie(res,name){res.setHeader('Set-Cookie',`${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);}
async function sessionUser(req){const token=authToken(req,SESSION_COOKIE);if(!token)return null;const db=await getDb();const s=db.sessions.find(x=>x.token===token&&x.expiresAt>Date.now());return s?db.users.find(u=>u.id===s.userId&&u.active):null;}
async function requireUser(req,res,next){const user=await sessionUser(req);if(!user)return res.status(401).json({success:false,message:'Please login.'});req.user=user;next();}
function requireChangedPassword(req,res,next){if(req.user?.mustChangePassword)return res.status(403).json({success:false,code:'PASSWORD_CHANGE_REQUIRED',message:'Please change your temporary password before using citizen services.'});next();}
function publicUser(u){return{id:u.id,userId:u.userId,name:u.name,mobile:u.mobile,email:u.email,city:u.city,mustChangePassword:!!u.mustChangePassword,createdAt:u.createdAt};}
const serviceNames={death:'Late Registration of Death','late-birth':'Late Registration of Birth',income:'Income Certificate',ews:'EWS Income Certificate',obc:'OBC Certificate','caste-integrated':'Caste / Integrated Certificate','family-member':'Family Membership Certificate',seeding:'Pattadar Aadhaar Seeding','death-affidavit':'Death Registration Affidavit','family-member-affidavit':'Family Member Affidavit','one-same-person-affidavit':'One & Same Person Affidavit','name-difference-affidavit':'Name Difference Affidavit'};
function affidavitServiceKey(key){return String(key||'').startsWith('affidavit:')||/affidavit|declaration/i.test(String(key||''));}
function serviceFee(key){return affidavitServiceKey(key)?5:2;}
async function sendEmail({to, subject, text, html}) {
  // Resend HTTPS API — used in production
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const from = process.env.MAIL_FROM || 'info@koutilyasolutions.in';

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: text || '',
          html: html || String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('RESEND EMAIL ERROR', response.status, result);
        return false;
      }

      console.log('RESEND EMAIL SENT', {
        to,
        subject,
        id: result.id || null
      });

      return true;
    } catch (e) {
      console.error('RESEND EMAIL ERROR', e.message);
      return false;
    }
  }

  // SMTP fallback for environments where SMTP is permitted
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const tls = await import('node:tls');
      const net = await import('node:net');

      const port = Number(process.env.SMTP_PORT || 465);
      const secure =
        String(process.env.SMTP_SECURE || 'true') !== 'false';

      let socket = secure
        ? tls.connect({
            host: process.env.SMTP_HOST,
            port,
            rejectUnauthorized: true
          })
        : net.createConnection({
            host: process.env.SMTP_HOST,
            port
          });

      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('SMTP connection timeout')),
          15000
        );

        socket.once('connect', () => {
          clearTimeout(timer);
          resolve();
        });

        socket.once('error', reject);
      });

      const readReply = () =>
        new Promise((resolve, reject) => {
          let buf = '';

          const onData = chunk => {
            buf += chunk.toString();

            const lines = buf
              .split(/\r?\n/)
              .filter(Boolean);

            if (
              lines.length &&
              /^\d{3} /.test(lines[lines.length - 1])
            ) {
              socket.off('data', onData);
              resolve(lines.join('\n'));
            }
          };

          socket.on('data', onData);
          socket.once('error', reject);
        });

      const command = async (c, expect) => {
        socket.write(c + '\r\n');

        const r = await readReply();

        if (!r.startsWith(String(expect))) {
          throw new Error('SMTP: ' + r);
        }

        return r;
      };

      await readReply();
      await command('EHLO localhost', 250);

      if (!secure) {
        await command('STARTTLS', 220);

        await new Promise((resolve, reject) => {
          const upgraded = tls.connect({
            socket,
            servername: process.env.SMTP_HOST,
            rejectUnauthorized: true
          });

          upgraded.once('secureConnect', () => {
            socket = upgraded;
            resolve();
          });

          upgraded.once('error', reject);
        });

        await command('EHLO localhost', 250);
      }

      await command('AUTH LOGIN', 334);
      await command(
        Buffer.from(process.env.SMTP_USER).toString('base64'),
        334
      );
      await command(
        Buffer.from(process.env.SMTP_PASS).toString('base64'),
        235
      );

      const from =
        process.env.MAIL_FROM || process.env.SMTP_USER;

      await command(`MAIL FROM:<${from}>`, 250);
      await command(`RCPT TO:<${to}>`, 250);
      await command('DATA', 354);

      const body =
        html ||
        String(text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

      socket.write(
        `From: ${from}\r\n` +
        `To: ${to}\r\n` +
        `Subject: ${subject}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
        `${body}\r\n.\r\n`
      );

      await readReply();
      await command('QUIT', 221);

      socket.end();

      return true;
    } catch (e) {
      console.error('SMTP ERROR', e.message);
      return false;
    }
  }

  console.warn('[EMAIL NOT CONFIGURED]', {
    to,
    subject
  });

  return false;
}


app.post('/api/auth/register',async(req,res)=>{try{const name=String(req.body.name||'').trim(),mobile=String(req.body.mobile||'').replace(/\D/g,''),email=String(req.body.email||'').trim().toLowerCase(),city=String(req.body.city||'').trim();if(!name||!/^[6-9]\d{9}$/.test(mobile)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!city)return res.status(400).json({success:false,message:'Enter valid name, 10-digit mobile, email and city.'});const result=await mutate(db=>{if(db.users.some(u=>u.mobile===mobile))throw new Error('This mobile number is already registered.');if(db.users.some(u=>u.email===email))throw new Error('This email address is already registered.');let userId;do{db.counters.user+=1;userId=`KSPL${db.counters.user}`;}while(db.users.some(u=>u.userId===userId));const password=randomPassword();const user={id:id('usr'),userId,name,mobile,email,city,passwordHash:hashPassword(password),mustChangePassword:true,walletBalance:0,pdfEntitlements:[],active:true,createdAt:now()};db.users.push(user);return{user,password};});const msg=`Koutilya Solutions Citizen Portal\nUser ID: ${result.user.userId}\nTemporary Password: ${result.password}\nPlease login and change your password immediately.`;
const emailSent=await sendEmail({to:result.user.email,subject:'Koutilya Citizen Portal Login Credentials',text:msg});if(!emailSent){await mutate(db=>{db.users=db.users.filter(u=>u.id!==result.user.id);});return res.status(503).json({success:false,message:'Registration could not be completed because the credential email could not be sent. Please try again after email settings are verified.'});}res.json({success:true,message:'Registration successful. Your User ID and temporary password have been sent to your registered email address.'});}catch(e){console.error('REGISTER ERROR',e);res.status(409).json({success:false,message:e.message});}});
app.post('/api/auth/login',async(req,res)=>{const userId=String(req.body.userId||'').trim().toUpperCase(),password=String(req.body.password||'');const db=await getDb();const user=db.users.find(u=>u.userId===userId&&u.active);if(!user||user.passwordHash!==hashPassword(password))return res.status(401).json({success:false,message:'Invalid User ID or password.'});const token=crypto.randomBytes(32).toString('hex');await mutate(db=>{db.sessions=db.sessions.filter(s=>s.expiresAt>Date.now());db.sessions.push({token,userId:user.id,createdAt:now(),expiresAt:Date.now()+SESSION_TTL_DAYS*86400000});});setCookie(res,SESSION_COOKIE,token);res.json({success:true,user:publicUser(user),authToken:token});});
// Unified CSP login: one login screen decides whether the credentials belong to the administrator or a citizen.
app.post('/api/auth/unified-login',async(req,res)=>{
  const uid=String(req.body.userId||'').trim(), password=String(req.body.password||'');
  if(uid===ADMIN_USER_ID && password===ADMIN_PASSWORD){
    const token=crypto.randomBytes(32).toString('hex');
    await mutate(db=>{db.sessions=db.sessions.filter(s=>s.expiresAt>Date.now());db.sessions.push({token,role:'admin',userId:'ADMIN',createdAt:now(),expiresAt:Date.now()+SESSION_TTL_DAYS*86400000});});
    clearCookie(res,SESSION_COOKIE);
    setCookie(res,ADMIN_COOKIE,token);
    return res.json({success:true,role:'admin',redirect:'/admin/dashboard',authToken:token});
  }
  const userId=uid.toUpperCase();
  const db=await getDb();
  const user=db.users.find(u=>u.userId===userId&&u.active);
  if(!user||user.passwordHash!==hashPassword(password))return res.status(401).json({success:false,message:'Invalid User ID or password.'});
  const token=crypto.randomBytes(32).toString('hex');
  await mutate(db=>{db.sessions=db.sessions.filter(s=>s.expiresAt>Date.now());db.sessions.push({token,userId:user.id,createdAt:now(),expiresAt:Date.now()+SESSION_TTL_DAYS*86400000});});
  clearCookie(res,ADMIN_COOKIE);
  setCookie(res,SESSION_COOKIE,token);
  res.json({success:true,role:'user',user:publicUser(user),redirect:'/',mustChangePassword:!!user.mustChangePassword,authToken:token});
});
app.post('/api/auth/logout',async(req,res)=>{const token=authToken(req,SESSION_COOKIE);await mutate(db=>{db.sessions=db.sessions.filter(s=>s.token!==token)});clearCookie(res,SESSION_COOKIE);res.json({success:true});});
app.get('/api/auth/me',requireUser,(req,res)=>res.json({success:true,user:publicUser(req.user)}));
app.post('/api/auth/change-password',requireUser,async(req,res)=>{const cur=String(req.body.currentPassword||''),next=String(req.body.newPassword||''),confirm=String(req.body.confirmPassword||'');if(req.user.passwordHash!==hashPassword(cur))return res.status(400).json({success:false,message:'Current password is incorrect.'});if(next.length<8)return res.status(400).json({success:false,message:'New password must be at least 8 characters.'});if(next!==confirm)return res.status(400).json({success:false,message:'New password and confirm password do not match.'});await mutate(db=>{const u=db.users.find(x=>x.id===req.user.id);u.passwordHash=hashPassword(next);u.mustChangePassword=false;});await mutate(db=>{db.sessions=db.sessions.filter(s=>s.userId!==req.user.id);});clearCookie(res,SESSION_COOKIE);res.json({success:true,message:'Password changed successfully. Please login again.'});});
app.get('/api/portal/dashboard',requireUser,requireChangedPassword,async(req,res)=>{const db=await getDb(),u=db.users.find(x=>x.id===req.user.id),tx=db.transactions.filter(x=>x.userId===u.id),serviceTx=tx.filter(x=>x.type==='service');res.json({success:true,user:publicUser(u),stats:{transactions:serviceTx.length,amountSpent:serviceTx.reduce((a,x)=>a+Number(x.amount||0),0),balance:Number(u.walletBalance||0)},recent:tx.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8)});});
app.get('/api/portal/transactions',requireUser,requireChangedPassword,async(req,res)=>{const from=String(req.query.from||''),to=String(req.query.to||''),db=await getDb();const rows=db.transactions.filter(x=>x.userId===req.user.id).filter(x=>!from||x.createdAt.slice(0,10)>=from).filter(x=>!to||x.createdAt.slice(0,10)<=to).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));res.json({success:true,transactions:rows});});
app.get('/api/wallet',requireUser,requireChangedPassword,async(req,res)=>{const db=await getDb(),u=db.users.find(x=>x.id===req.user.id);res.json({success:true,balance:Number(u.walletBalance||0),transactions:db.transactions.filter(x=>x.userId===u.id&&x.type==='topup').sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});});

async function cashfreeCreateOrder(user,amount){const appId=process.env.CASHFREE_APP_ID||process.env.CASHFREE_CLIENT_ID,secret=process.env.CASHFREE_SECRET_KEY||process.env.CASHFREE_CLIENT_SECRET;if(!appId||!secret)throw new Error('Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY.');const env=process.env.CASHFREE_ENV==='production'?'production':'sandbox',base=env==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg',origin=process.env.PUBLIC_BASE_URL||`http://localhost:${PORT}`,orderId=`kspl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;const payload={order_id:orderId,order_amount:amount,order_currency:'INR',customer_details:{customer_id:user.userId,customer_name:user.name,customer_email:user.email,customer_phone:user.mobile},order_meta:{return_url:`${origin}/?cashfree_return=1&order_id=${encodeURIComponent(orderId)}`,notify_url:`${origin}/api/wallet/cashfree/webhook`},order_note:`Koutilya wallet top-up for ${user.userId}`};const r=await fetch(`${base}/orders`,{method:'POST',headers:{'Content-Type':'application/json','x-client-id':appId,'x-client-secret':secret,'x-api-version':'2025-01-01','x-idempotency-key':crypto.randomUUID()},body:JSON.stringify(payload)});
const j=await r.json();if(!r.ok)throw new Error(`Cashfree HTTP ${r.status}: ${j.message||JSON.stringify(j)}`);return{orderId,paymentSessionId:j.payment_session_id,environment:env};}
app.post('/api/wallet/topup',requireUser,requireChangedPassword,async(req,res)=>{const amount=Number(req.body.amount);if(!Number.isFinite(amount)||amount<10||amount>100000)return res.status(400).json({success:false,message:'Top-up amount must be between ₹10 and ₹1,00,000.'});try{const order=await cashfreeCreateOrder(req.user,amount);await mutate(db=>db.cashfreeOrders.push({...order,userId:req.user.id,amount,status:'PENDING',createdAt:now()}));res.json({success:true,...order});}catch(e){res.status(502).json({success:false,message:e.message});}});
async function creditTopup(orderId){return mutate(db=>{const o=db.cashfreeOrders.find(x=>x.orderId===orderId);if(!o||o.status==='SUCCESS')return false;const u=db.users.find(x=>x.id===o.userId);if(!u)return false;o.status='SUCCESS';u.walletBalance=Number((Number(u.walletBalance||0)+Number(o.amount)).toFixed(2));db.transactions.push({id:id('txn'),userId:u.id,type:'topup',direction:'credit',amount:Number(o.amount),description:'Cashfree Wallet Top-up',reference:o.orderId,createdAt:now(),status:'SUCCESS'});return true;});}
app.get('/api/wallet/verify/:orderId',requireUser,requireChangedPassword,async(req,res)=>{const db=await getDb(),o=db.cashfreeOrders.find(x=>x.orderId===req.params.orderId&&x.userId===req.user.id);if(!o)return res.status(404).json({success:false,message:'Top-up order not found.'});const appId=process.env.CASHFREE_APP_ID||process.env.CASHFREE_CLIENT_ID,secret=process.env.CASHFREE_SECRET_KEY||process.env.CASHFREE_CLIENT_SECRET;if(!appId||!secret)return res.status(503).json({success:false,message:'Cashfree is not configured.'});const base=process.env.CASHFREE_ENV==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';try{const r=await fetch(`${base}/orders/${encodeURIComponent(o.orderId)}/payments`,{headers:{'x-client-id':appId,'x-client-secret':secret,'x-api-version':'2025-01-01'}});const j=await r.json();const paid=Array.isArray(j)&&j.some(p=>String(p.payment_status||'').toUpperCase()==='SUCCESS');if(paid)await creditTopup(o.orderId);res.json({success:true,paid});}catch(e){res.status(502).json({success:false,message:e.message});}});
app.post('/api/wallet/cashfree/webhook',async(req,res)=>{try{
  const signature=req.headers['x-webhook-signature'],timestamp=req.headers['x-webhook-timestamp'],secret=process.env.CASHFREE_SECRET_KEY||process.env.CASHFREE_CLIENT_SECRET;
  if(!signature||!timestamp||!secret||!req.rawBody)return res.status(401).json({success:false,message:'Invalid webhook signature.'});
  const expected=crypto.createHmac('sha256',secret).update(String(timestamp)+req.rawBody.toString('utf8')).digest('base64');
  if(!crypto.timingSafeEqual(Buffer.from(String(signature)),Buffer.from(expected)))return res.status(401).json({success:false,message:'Invalid webhook signature.'});
  const orderId=req.body?.data?.order?.order_id||req.body?.data?.order_id;if(orderId)await creditTopup(orderId);res.json({success:true});
}catch(e){console.error('Cashfree webhook error',e);res.status(400).json({success:false});}});

app.post('/api/portal/pay-service',requireUser,requireChangedPassword,async(req,res)=>{const serviceKey=String(req.body.serviceKey||'').trim();if(!serviceKey)return res.status(400).json({success:false,message:'Service key is required.'});const amount=serviceFee(serviceKey);const result=await mutate(db=>{const u=db.users.find(x=>x.id===req.user.id),balance=Number(u.walletBalance||0);if(balance<amount)return{insufficient:true,balance};u.walletBalance=Number((balance-amount).toFixed(2));const tx={id:id('txn'),userId:u.id,type:'service',direction:'debit',amount,serviceKey,description:`${serviceNames[serviceKey]||serviceKey.replace(/^affidavit:/,'')||'Citizen Service'} application fee`,createdAt:now(),status:'SUCCESS'};db.transactions.push(tx);u.pdfEntitlements=[...(u.pdfEntitlements||[]),{serviceKey,createdAt:Date.now()}];return{balance:u.walletBalance,amount};});if(result.insufficient)return res.status(402).json({success:false,code:'WALLET_LOW',message:`Wallet balance is ₹${result.balance.toFixed(2)}. Please add ₹${amount.toFixed(2)} to Wallet first.`,balance:result.balance});res.json({success:true,balance:result.balance,amount});});

app.post('/api/portal/refund-service',requireUser,requireChangedPassword,async(req,res)=>{const serviceKey=String(req.body.serviceKey||'');const result=await mutate(db=>{const u=db.users.find(x=>x.id===req.user.id);const i=db.transactions.findIndex(x=>x.userId===u.id&&x.type==='service'&&x.serviceKey===serviceKey&&x.status==='SUCCESS'&&x.refunded!==true);if(i<0)return{ok:false};const tx=db.transactions[i];tx.refunded=true;u.walletBalance=Number((Number(u.walletBalance||0)+Number(tx.amount)).toFixed(2));db.transactions.push({id:id('txn'),userId:u.id,type:'refund',direction:'credit',amount:Number(tx.amount),serviceKey,description:'Automatic refund — PDF generation failed',createdAt:now(),status:'SUCCESS'});return{ok:true,balance:u.walletBalance};});res.json({success:!!result.ok,balance:result.balance});});

async function entitlementKey(reqPath){const p=reqPath.toLowerCase();if(p.includes('/api/pdf/affidavit/')){const m=p.match(/\/api\/pdf\/affidavit\/([^/?]+)/);return m?`affidavit:${m[1]}`:'affidavit';}if(p.includes('/api/pdf/death-affidavit'))return'death-affidavit';if(p.includes('/api/pdf/family-member-affidavit'))return'family-member-affidavit';if(p.includes('/api/pdf/one-same-person-affidavit'))return'one-same-person-affidavit';if(p.includes('/api/pdf/name-difference-affidavit'))return'name-difference-affidavit';const m=p.match(/\/api\/pdf\/([^/?]+)/);return m?m[1]:'';}
async function hasEntitlement(user,key){const db=await getDb(),u=db.users.find(x=>x.id===user.id);return (u?.pdfEntitlements||[]).some(x=>x.serviceKey===key);}
async function consumeEntitlement(user,key){return mutate(db=>{const u=db.users.find(x=>x.id===user.id);const i=(u?.pdfEntitlements||[]).findIndex(x=>x.serviceKey===key);if(i<0)return false;u.pdfEntitlements.splice(i,1);return true;});}
// Payment is reserved before generation, but the entitlement is consumed only after a successful 2xx PDF response.
// This prevents a failed PDF generation from consuming the paid entitlement; the existing client refund flow then restores the wallet debit.
app.use('/api/pdf',async(req,res,next)=>{if(req.method!=='POST')return next();const user=await sessionUser(req);if(!user)return res.status(401).json({success:false,message:'Login required.'});if(user.mustChangePassword)return res.status(403).json({success:false,code:'PASSWORD_CHANGE_REQUIRED',message:'Please change your temporary password before generating PDFs.'});const key=await entitlementKey(req.originalUrl);if(await hasEntitlement(user,key)){req.user=user;res.once('finish',async()=>{if(res.statusCode>=200&&res.statusCode<300){await consumeEntitlement(user,key).catch(e=>console.error('ENTITLEMENT CONSUME ERROR',e));await mutate(db=>{const u=db.users.find(x=>x.id===user.id);if(u)db.applications.push({id:id('app'),userId:u.id,userIdDisplay:u.userId,serviceKey:key,serviceName:serviceNames[key]||key,createdAt:now(),data:req.body||{}});}).catch(e=>console.error('APPLICATION LOG ERROR',e));}});return next();}return res.status(402).json({success:false,code:'PAYMENT_REQUIRED',message:`Please pay the ₹${serviceFee(key)} service fee from your wallet before generating the PDF.`});});

app.get('/api/portal/complaints',requireUser,requireChangedPassword,async(req,res)=>{const db=await getDb();const rows=db.complaints.filter(x=>x.userId===req.user.userId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));res.json({success:true,complaints:rows});});
app.post('/api/portal/complaints',requireUser,requireChangedPassword,async(req,res)=>{const subject=String(req.body.subject||'').trim(),message=String(req.body.message||'').trim();if(!message)return res.status(400).json({success:false,message:'Please enter your complaint.'});const c=await mutate(db=>{const row={id:id('cmp'),sr:null,userId:req.user.userId,name:req.user.name,mobile:req.user.mobile,email:req.user.email,subject,message,status:'OPEN',createdAt:now()};db.complaints.push(row);return row;});res.json({success:true,message:'Complaint submitted successfully. Admin will review and resolve it.',status:c.status});});
const chatbot=(text)=>{const t=String(text||'').toLowerCase();if(/hello|hi|namaste/.test(t))return'Hello! Welcome to Koutilya Solutions Citizen Services. How can I help you today?';if(/wallet|top.?up|balance/.test(t))return'Go to Wallet → Add Top-up. Service fees are deducted from your wallet.';if(/complaint|problem|issue/.test(t))return'Use Raise a Complaint to submit a query. An SR number is generated automatically.';if(/certificate|meeseva|application/.test(t))return'Open Meeseva Applications, choose a service, complete the form and generate the PDF after the ₹2 fee is paid.';if(/affidavit/.test(t))return'Open Affidavits to search for the required affidavit or declaration.';if(/password|login/.test(t))return'Use Change Password to set your new password. First-time users must change the temporary password.';return'I can help with login, Meeseva applications, affidavits, wallet, transactions and complaints.';};
app.get('/api/portal/chat',requireUser,requireChangedPassword,async(req,res)=>{const db=await getDb();const rows=db.chats.filter(x=>x.userId===req.user.userId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));res.json({success:true,chats:rows});});
app.post('/api/portal/chat',requireUser,requireChangedPassword,async(req,res)=>{const message=String(req.body.message||'').trim();if(!message)return res.status(400).json({success:false,message:'Enter a message.'});const reply=chatbot(message);await mutate(db=>db.chats.push({id:id('chat'),userId:req.user.userId,name:req.user.name,message,reply,createdAt:now()}));res.json({success:true,reply});});

/* =====================================================
   GENERATED PDF DIRECTORY
   ===================================================== */

const GENERATED_DIR = path.join(
  ROOT,
  'generated'
);

/*
   Create the generated folder once at startup.

   IMPORTANT:
   recursive:true means:
   - If the folder already exists -> no EEXIST error
   - If it does not exist -> it is created
*/
await fs.mkdir(
  GENERATED_DIR,
  {
    recursive: true
  }
);


/* =====================================================
   MIDDLEWARE
   ===================================================== */

app.use(
  express.json({
    limit: '3mb'
  })
);


/* =====================================================
   FRONTEND
   ===================================================== */

app.use(
  express.static(
    path.join(ROOT, 'frontend'),
    { index: false }
  )
);


/* =====================================================
   GENERATED PDF DOWNLOADS
   ===================================================== */

app.use(
  '/generated',
  express.static(
    GENERATED_DIR
  )
);

/* =====================================================
   LATE REGISTRATION OF BIRTH
   Existing application is kept in frontend/forms/late-birth.html.
   Mount its PDF router so the form is fully connected to the main portal.
   ===================================================== */
app.use('/api/pdf', lateBirthPdfRouter);


/* =====================================================
   APPLICATION TEMPLATES
   ===================================================== */

const templates = {

  'death-affidavit-individual': [
    'death-affidavit-individual.html',
    'Death_Registration_Individual_Affidavit.pdf',
    '612pt 842pt'
  ],

  'death-affidavit-joint': [
    'death-affidavit-joint.html',
    'Death_Registration_Joint_Affidavit.pdf',
    '612pt 842pt'
  ],

  death: [
    'death.html',
    'Late_Registration_Death_Application.pdf',
    '612pt 1008pt'
  ],

  income: [
    'income.html',
    'Income_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  ews: [
    'ews.html',
    'EWS_Income_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  obc: [
    'obc.html',
    'OBC_Certificate_Application.pdf',
    '612pt 1008pt'
  ],

  'caste-integrated': [
    'caste-integrated.html',
    'Caste_Integrated_Application.pdf',
    '612pt 842pt'
  ],

  'family-member': [
    'family-member.html',
    'Family_Membership_Certificate_Application.pdf',
    '612pt 792pt'
  ],

  seeding: [
    'seeding.html',
    'Pattadar_Aadhaar_Seeding_Application.pdf',
    '612pt 792pt'
  ]

};


/* =====================================================
   LOGO
   ===================================================== */

const logoPath = path.join(
  ROOT,
  'frontend',
  'assets',
  'meeseva-logo.png'
);

let requireLogo = null;

if (fsSync.existsSync(logoPath)) {

  requireLogo =
    await fs.readFile(
      logoPath
    );
}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function esc(value = '') {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

}


/* =====================================================
   ADD AUTOMATIC DEATH PRONOUNS
   ===================================================== */


/* =====================================================
   AFFIDAVIT OUTPUT FORMATTING
   - Person names: UPPERCASE
   - Other text: Title Case
   - Dates: DD/MM/YYYY
   ===================================================== */
function affidavitTitleCase(value = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.toLowerCase()
    .replace(/\b([a-z])/g, c => c.toUpperCase())
    .replace(/\bD\.No\.?\b/gi, 'D.No.')
    .replace(/\bR\/O\b/gi, 'R/o')
    .replace(/\bS\/O\b/gi, 'S/O')
    .replace(/\bD\/O\b/gi, 'D/O')
    .replace(/\bW\/O\b/gi, 'W/O')
    .replace(/\bC\/O\b/gi, 'C/O');
}

function affidavitUpper(value = '') {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function affidavitDate(value = '') {
  const v = String(value ?? '').trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}/${m}/${y}`;
  }
  let m = v.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
  if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
  const digits = v.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  if (digits.length === 6) return `${digits.slice(0,2)}/${digits.slice(2,4)}/20${digits.slice(4)}`;
  return v;
}

function normalizeAffidavitField(key, value) {
  const v = String(value ?? '').trim();
  if (!v) return '';
  const k = String(key || '');
  if (/date/i.test(k)) return affidavitDate(v);
  if (/(applicantName|deponentName|deceasedName|deceasedSpouse|parentName|fatherName|motherName|husbandName|wifeName|guardianName|spouseName|proprietorName|nomineeName|witnessName|nameOne|nameTwo|joint\d+Name|joint\d+Father|joint\d+Parent)/i.test(k)) return affidavitUpper(v);
  if (/(^|)(Relation|relationship|deponentRelation|applicantRelation|deceasedRelationship|joint\d+Relation)$/i.test(k)) return affidavitUpper(v);
  return affidavitTitleCase(v);
}

function normalizeAffidavitData(data = {}) {
  const out = {};
  for (const [key, value] of Object.entries(data || {})) out[key] = normalizeAffidavitField(key, value);
  return out;
}

function addDeathPronouns(data = {}) {

  const gender =
    String(
      data.deceasedGender ||
      data.gender ||
      ''
    ).trim().toLowerCase();


  /*
     IMPORTANT:
     Do not guess gender from the person's name.

     The form should send:
       Male
       Female
  */

  if (gender === 'female' || gender === 'f') {

    data.deceasedPronoun = 'she';
    data.deceasedObjectPronoun = 'her';
    data.deceasedPossessive = 'her';

  } else {

    data.deceasedPronoun = 'he';
    data.deceasedObjectPronoun = 'him';
    data.deceasedPossessive = 'his';

  }

  return data;
}


/* =====================================================
   TEMPLATE FIELD REPLACEMENT

   Supports ALL of these:

   {name}
   {{name}}

   Empty fields become empty strings.

   Entered values are NOT changed in the server;
   the HTML template controls bold/underline styling.
   ===================================================== */

function replaceFields(
  html,
  originalData = {}
) {

  const data = {
    ...originalData
  };


  /*
     Automatic male/female pronouns.
  */
  addDeathPronouns(data);


  /*
     Replace logo only when a template asks for it.
  */
  if (
    requireLogo &&
    html.includes('{{LOGO_DATA}}')
  ) {

    const logo =
      requireLogo.toString('base64');

    html = html.replaceAll(
      '{{LOGO_DATA}}',
      `data:image/png;base64,${logo}`
    );

  }


  /*
     Replace every supplied field directly.

     This is intentionally explicit rather than relying
     only on one regex, so BOTH:
       {joint1Name}
       {{joint1Name}}
     are guaranteed to work.
  */

  for (
    const [key, value]
    of Object.entries(data)
  ) {

    const safeValue =
      value === undefined ||
      value === null
        ? ''
        : esc(String(value));


    /*
       IMPORTANT: replace DOUBLE braces first.
       Otherwise `{{field}}` contains `{field}` and
       replacing single braces first turns it into `{}`.
    */
    html = html.replaceAll(
      `{{${key}}}`,
      safeValue
    );


    /*
       Single braces (supported for older templates)
    */
    html = html.replaceAll(
      `{${key}}`,
      safeValue
    );

  }


  /*
     Safety cleanup.

     If a placeholder exists in the template but the
     frontend did not send that field, never allow
     {fieldName} or {{fieldName}} to appear in the PDF.
  */

  html = html.replace(
    /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g,
    ''
  );


  return html;
}


/* =====================================================
   HEALTH CHECK
   ===================================================== */

app.get(
  '/api/health',
  (req, res) => {

    res.json({
      success: true
    });

  }
);


/* =====================================================
   AP LOCATION CSV
   ===================================================== */

app.get(
  '/api/locations',
  async (req, res) => {

    try {

      const possibleFiles = [

        path.join(
          ROOT,
          'andhra_pradesh_villages.csv'
        ),

        path.join(
          ROOT,
          'frontend',
          'andhra_pradesh_villages.csv'
        ),

        path.join(
          ROOT,
          'backend',
          'templates',
          'andhra_pradesh_villages.csv'
        )

      ];


      let csvPath = null;


      for (
        const filePath of possibleFiles
      ) {

        if (
          fsSync.existsSync(filePath)
        ) {

          csvPath = filePath;
          break;

        }

      }


      console.log(
        'Location CSV requested'
      );


      if (!csvPath) {

        console.error(
          'AP LOCATION CSV NOT FOUND'
        );

        possibleFiles.forEach(
          file =>
            console.error(file)
        );


        return res.status(404).json({

          success: false,

          error:
            'andhra_pradesh_villages.csv not found',

          checked:
            possibleFiles

        });

      }


      console.log(
        'Using location CSV:',
        csvPath
      );


      const csv =
        await fs.readFile(
          csvPath,
          'utf8'
        );


      res.setHeader(
        'Content-Type',
        'text/csv; charset=utf-8'
      );


      return res.send(csv);

    }

    catch (error) {

      console.error(
        'Location CSV error:',
        error
      );


      return res.status(500).json({

        success: false,

        error:
          error.message ||
          'Unable to load location data'

      });

    }

  }
);


/* =====================================================
   AFFIDAVITS & DECLARATIONS CATALOG
   -----------------------------------------------------
   This is an additive module.
   Existing application routes are left unchanged.
   ===================================================== */

const AFFIDAVIT_CATALOG_PATH =
  path.join(
    ROOT,
    'backend',
    'data',
    'affidavit-catalog.json'
  );

let affidavitCatalog = [];

try {
  if (fsSync.existsSync(AFFIDAVIT_CATALOG_PATH)) {
    affidavitCatalog = JSON.parse(
      await fs.readFile(
        AFFIDAVIT_CATALOG_PATH,
        'utf8'
      )
    );
  }
} catch (error) {
  console.error(
    'Affidavit catalog load error:',
    error
  );
  affidavitCatalog = [];
}

app.get(
  '/api/affidavits',
  (req, res) => {
    res.json({
      success: true,
      count: affidavitCatalog.length,
      services: affidavitCatalog
    });
  }
);

app.get(
  '/api/affidavits/:id',
  (req, res) => {
    const item = affidavitCatalog.find(
      entry => entry.id === req.params.id
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Affidavit service not found'
      });
    }

    return res.json({
      success: true,
      service: item
    });
  }
);


/* =====================================================
   AFFIDAVIT RULES / CASE DECISION LAYER
   Keeps citizen-facing decisions factual: the citizen selects
   the service and describes the case; the platform returns the
   applicable preparation guidance without asking the citizen to
   decide whether an affidavit/declaration is legally required.
   ===================================================== */
app.post('/api/affidavits/:id/requirements', requireUser, requireChangedPassword, async (req, res) => {
  const service = affidavitCatalog.find(x => x.id === req.params.id);
  if (!service) return res.status(404).json({success:false,message:'Affidavit service not found'});
  const result = decideAffidavit(service, {
    caseType: String(req.body?.caseType || '').trim(),
    jurisdiction: String(req.body?.jurisdiction || '').trim(),
    authorityChoice: String(req.body?.authority || '').trim()
  });
  return res.json({success:true, serviceId:service.id, serviceTitle:service.title, ...result});
});

/* =====================================================
   DEATH REGISTRATION AFFIDAVIT
   ONE APPLICATION -> TWO SEPARATE PDFs

   IMPORTANT:
   - No mkdir here
   - GENERATED_DIR was already created at startup
   - Individual and Joint are generated separately
   ===================================================== */

app.post(
  '/api/pdf/death-affidavit',
  async (req, res) => {

    let browser = null;

    try {

      /* ---------------------------------------------
         FORM DATA
         --------------------------------------------- */

      const data =
        normalizeAffidavitData(addDeathPronouns({
          ...(req.body || {})
        }));


      console.log(
        ''
      );

      console.log(
        '========== DEATH AFFIDAVIT DATA =========='
      );

      console.log(
        JSON.stringify(
          data,
          null,
          2
        )
      );

      console.log(
        '==========================================='
      );


      /* ---------------------------------------------
         REQUIRED FIELD
         --------------------------------------------- */

      if (!data.deceasedName) {

        return res.status(400).json({

          success: false,

          message:
            'Deceased name is required'

        });

      }


      /* ---------------------------------------------
         TEMPLATE PATHS
         --------------------------------------------- */

      const individualTemplatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          'death-affidavit-individual.html'
        );


      const jointTemplatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          'death-affidavit-joint.html'
        );


      /* ---------------------------------------------
         CHECK TEMPLATES
         --------------------------------------------- */

      if (
        !fsSync.existsSync(
          individualTemplatePath
        )
      ) {

        return res.status(500).json({

          success: false,

          message:
            'Individual affidavit template not found',

          path:
            individualTemplatePath

        });

      }


      if (
        !fsSync.existsSync(
          jointTemplatePath
        )
      ) {

        return res.status(500).json({

          success: false,

          message:
            'Joint affidavit template not found',

          path:
            jointTemplatePath

        });

      }


      /* ---------------------------------------------
         READ TEMPLATES
         --------------------------------------------- */

      let individualHtml =
        await fs.readFile(
          individualTemplatePath,
          'utf8'
        );


      let jointHtml =
        await fs.readFile(
          jointTemplatePath,
          'utf8'
        );


      console.log(
        'Individual template:',
        individualTemplatePath
      );

      console.log(
        'Joint template:',
        jointTemplatePath
      );


      /* ---------------------------------------------
         REPLACE FORM DATA
         --------------------------------------------- */

      individualHtml =
        replaceFields(
          individualHtml,
          data
        );


      jointHtml =
        replaceFields(
          jointHtml,
          data
        );


      /*
         HARD CHECK:

         If any known placeholder is still present,
         log it before Puppeteer runs.
      */

      console.log(
        'Individual unresolved placeholders:',
        (
          individualHtml.match(
            /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g
          ) || []
        )
      );

      console.log(
        'Joint unresolved placeholders:',
        (
          jointHtml.match(
            /\{\{?\s*[a-zA-Z0-9_]+\s*\}?\}/g
          ) || []
        )
      );


      /* ---------------------------------------------
         LAUNCH PUPPETEER
         --------------------------------------------- */

      browser =
        await puppeteer.launch({

          headless: true,

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]

        });


      const page =
        await browser.newPage();


      /* =================================================
         PDF 1
         INDIVIDUAL AFFIDAVIT
         ================================================= */

      await page.setContent(
        individualHtml,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      const individualPdf =
        await page.pdf({

          format: 'A4',

          printBackground: true,

          preferCSSPageSize: true,

          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }

        });


      const timestamp =
        Date.now();


      const individualFileName =
        `Death_Registration_Individual_${timestamp}.pdf`;


      const individualFilePath =
        path.join(
          GENERATED_DIR,
          individualFileName
        );


      await fs.writeFile(
        individualFilePath,
        Buffer.from(individualPdf)
      );


      console.log(
        'Individual PDF created:',
        individualFilePath
      );


      /* =================================================
         PDF 2
         JOINT AFFIDAVIT
         ================================================= */

      await page.setContent(
        jointHtml,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      const jointPdf =
        await page.pdf({

          format: 'A4',

          printBackground: true,

          preferCSSPageSize: true,

          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }

        });


      const jointFileName =
        `Death_Registration_Joint_${timestamp}.pdf`;


      const jointFilePath =
        path.join(
          GENERATED_DIR,
          jointFileName
        );


      await fs.writeFile(
        jointFilePath,
        Buffer.from(jointPdf)
      );


      console.log(
        'Joint PDF created:',
        jointFilePath
      );


      /* ---------------------------------------------
         CLOSE BROWSER
         --------------------------------------------- */

      await browser.close();

      browser = null;


      /* ---------------------------------------------
         DOWNLOAD URLS
         --------------------------------------------- */

      const baseUrl =
        `${req.protocol}://${req.get('host')}`;


      /* ---------------------------------------------
         RETURN TWO PDF LINKS
         --------------------------------------------- */

      return res.json({

        success: true,

        message:
          'Two affidavit PDFs generated successfully',

        individualPdf:
          `${baseUrl}/generated/${individualFileName}`,

        jointPdf:
          `${baseUrl}/generated/${jointFileName}`

      });

    }

    catch (error) {

      console.error(
        'Death affidavit generation error:',
        error
      );


      if (browser) {

        await browser
          .close()
          .catch(
            () => {}
          );

      }


      if (!res.headersSent) {

        return res.status(500).json({

          success: false,

          message:
            error.message ||
            'Death affidavit PDF generation failed'

        });

      }

    }

  }
);


/* =====================================================
   FAMILY MEMBER CERTIFICATE AFFIDAVIT
   One affidavit; continuation pages are A4.
   The first page reserves 6 inches of blank space for
   non-judicial stamp paper, with 1 inch side/bottom margins.
   ===================================================== */

function familyTitleCase(value = '') { return affidavitTitleCase(value); }
function familyUpper(value = '') { return affidavitUpper(value); }

function familyRowsHtml(members = []) {
  return members.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(familyUpper(m.name || ''))}</td><td>${esc(m.age || '')}</td><td>${esc(familyUpper(m.parent || ''))}</td><td>${esc(familyTitleCase(m.relationship || ''))}</td><td>${esc(m.aadhaar || '')}</td></tr>`).join('');
}

function witnessRowsHtml(witnesses = []) {
  return witnesses.map((w, i) => `<div class="sig">${i + 1}. __________________________________ (${esc(familyUpper(w.name || ''))})</div>`).join('');
}

app.post('/api/pdf/family-member-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const data = normalizeAffidavitData(req.body || {});
    if (!data.deceasedName || !data.dateOfDeath || !data.applicantName) {
      return res.status(400).json({ success: false, message: 'Deceased name, date of death and applicant name are required' });
    }
    const members = Array.isArray(data.familyMembers) ? data.familyMembers.filter(x => x && x.name) : [];
    const witnesses = Array.isArray(data.witnesses) ? data.witnesses.filter(x => x && x.name) : [];
    if (!members.length) return res.status(400).json({ success: false, message: 'At least one family member is required' });
    if (!witnesses.length) return res.status(400).json({ success: false, message: 'At least one deponent / witness is required' });

    const templatePath = path.join(ROOT, 'backend', 'templates', 'family-member-affidavit.html');
    let html = await fs.readFile(templatePath, 'utf8');
    const replacements = {
      deceasedName: familyUpper(data.deceasedName),
      deceasedRelationName: familyTitleCase(data.deceasedRelationName),
      deceasedAddress: familyTitleCase(data.deceasedAddress),
      dateOfDeath: data.dateOfDeath,
      applicantName: familyUpper(data.applicantName),
      applicantRelationship: familyTitleCase(data.applicantRelationship),
      purpose: familyTitleCase(data.purpose || 'official use'),
      familyRows: familyRowsHtml(members),
      witnessRows: witnessRowsHtml(witnesses)
    };
    for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value ?? '');
    html = html.replace(/\{\{[^}]+\}\}/g, '');

    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'koutilya-family-affidavit-'));
    const file = path.join(tmp, 'family-member-affidavit.html');
    await fs.writeFile(file, html, 'utf8');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`file://${file}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: {top:0,right:0,bottom:0,left:0} });
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="Family_Member_Certificate_Affidavit.pdf"');
    return res.end(Buffer.from(pdf));
  } catch (error) {
    console.error('Family Member affidavit PDF error:', error);
    if (!res.headersSent) return res.status(500).json({ success:false, message:error.message || 'PDF generation failed' });
  } finally {
    if (browser) await browser.close().catch(()=>{});
    if (tmp) await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});
  }
});


/* =====================================================
   ONE & SAME PERSON AFFIDAVIT
   One document. Page 1 reserves 6 inches for
   non-judicial stamp paper; continuation flows on A4.
   ===================================================== */

function oneSameTitleCase(value = '') {
  return String(value).trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function oneSameUpper(value = '') {
  return String(value).trim().toUpperCase();
}

app.post('/api/pdf/one-same-person-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;

  try {
    const data = normalizeAffidavitData(req.body || {});

    const required = [
      ['applicantName', 'Applicant name'],
      ['nameOne', 'First name'],
      ['nameTwo', 'Second name'],
      ['documentOne', 'First document'],
      ['documentTwo', 'Second document'],
      ['reason', 'Reason for variation'],
      ['address', 'Address']
    ];

    for (const [key, label] of required) {
      if (!String(data[key] || '').trim()) {
        return res.status(400).json({
          success: false,
          message: `${label} is required`
        });
      }
    }

    const templatePath = path.join(
      ROOT,
      'backend',
      'templates',
      'one-same-person-affidavit.html'
    );

    let html = await fs.readFile(templatePath, 'utf8');

    const replacements = {
      applicantName: oneSameUpper(data.applicantName),
      applicantRelation: oneSameUpper(data.applicantRelation || 'S/O'),
      parentOrSpouseName: oneSameUpper(data.parentOrSpouseName || ''),
      age: data.age || '',
      address: oneSameTitleCase(data.address),
      nameOne: oneSameUpper(data.nameOne),
      nameTwo: oneSameUpper(data.nameTwo),
      documentOne: oneSameTitleCase(data.documentOne),
      documentTwo: oneSameTitleCase(data.documentTwo),
      reason: oneSameTitleCase(data.reason),
      purposeAuthority: oneSameTitleCase(data.purposeAuthority || 'the concerned authority'),
      place: affidavitTitleCase(data.place),
      executionDate: affidavitDate(data.executionDate)
    };

    for (const [key, value] of Object.entries(replacements)) {
      html = html.replaceAll(`{{${key}}}`, esc(value ?? ''));
    }

    html = html.replace(/\{\{[^}]+\}\}/g, '');

    tmp = await fs.mkdtemp(
      path.join(os.tmpdir(), 'koutilya-one-same-person-')
    );

    const file = path.join(
      tmp,
      'one-same-person-affidavit.html'
    );

    await fs.writeFile(file, html, 'utf8');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();

    await page.goto(
      `file://${file}`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }
    );

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    const fileName =
      `One_Same_Person_Affidavit_${Date.now()}.pdf`;

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    return res.end(Buffer.from(pdf));

  } catch (error) {

    console.error(
      'One & Same Person affidavit PDF error:',
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          'PDF generation failed'
      });
    }

  } finally {

    if (browser) {
      await browser.close().catch(() => {});
    }

    if (tmp) {
      await fs.rm(
        tmp,
        {
          recursive: true,
          force: true
        }
      ).catch(() => {});
    }

  }
});


/* =====================================================
   GENERIC PDF GENERATION
   EXISTING SERVICES

   Do not disturb the existing applications.
   ===================================================== */

/* =====================================================
   NAME DIFFERENCE AFFIDAVIT
   Single document. Page 1 stamp-paper reserved area;
   continuation pages flow naturally onto A4.
   ===================================================== */
app.post('/api/pdf/name-difference-affidavit', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const data = normalizeAffidavitData(req.body || {});
    const required = [
      ['applicantName','Applicant / Declarant name'], ['relation','Relation'],
      ['parentName','Father / Husband / Guardian name'], ['age','Age'], ['address','Full address'],
      ['correctName','Correct / Preferred name'], ['recordName','Name as appearing in record'],
      ['documentName','Document / record'], ['differenceType','Nature of difference'],
      ['reason','Reason / explanation'], ['purposeAuthority','Concerned authority / purpose'],
      ['place','Place of execution'], ['executionDate','Date of execution']
    ];
    for (const [key,label] of required) {
      if (!String(data[key] || '').trim()) return res.status(400).json({success:false,message:`${label} is required`});
    }
    const templatePath=path.join(ROOT,'backend','templates','name-difference-affidavit.html');
    let html=await fs.readFile(templatePath,'utf8');
    const titleCase=v=>String(v||'').trim().toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const upper=v=>String(v||'').trim().toUpperCase();
    const replacements={applicantName:upper(data.applicantName),relation:upper(data.relation),parentName:upper(data.parentName),age:data.age,address:titleCase(data.address),correctName:upper(data.correctName),recordName:upper(data.recordName),documentName:titleCase(data.documentName),differenceType:titleCase(data.differenceType),reason:titleCase(data.reason),purposeAuthority:titleCase(data.purposeAuthority),place:titleCase(data.place),executionDate:data.executionDate};
    for (const [key,value] of Object.entries(replacements)) html=html.replaceAll(`{{${key}}}`,esc(value));
    html=html.replace(/\{\{[^}]+\}\}/g,'');
    tmp=await fs.mkdtemp(path.join(os.tmpdir(),'koutilya-name-difference-'));
    const file=path.join(tmp,'name-difference-affidavit.html'); await fs.writeFile(file,html,'utf8');
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
    const page=await browser.newPage(); await page.goto(`file://${file}`,{waitUntil:'domcontentloaded',timeout:30000});
    const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:0,right:0,bottom:0,left:0}});
    res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition','attachment; filename="Name_Difference_Affidavit.pdf"'); return res.end(Buffer.from(pdf));
  } catch(error) {
    console.error('Name difference affidavit PDF error:',error);
    if(!res.headersSent) return res.status(500).json({success:false,message:error.message||'Name difference affidavit PDF generation failed'});
  } finally {
    if(browser) await browser.close().catch(()=>{});
    if(tmp) await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});
  }
});

/* =====================================================
   UNIVERSAL AFFIDAVIT / DECLARATION GENERATOR
   All catalogue services without a dedicated prescribed
   live form use this route. It creates a citizen-use draft,
   never an authority-branded or claimed-official format.
   ===================================================== */
app.post('/api/pdf/affidavit/:id', async (req, res) => {
  let browser = null;
  let tmp = null;
  try {
    const service = affidavitCatalog.find(x => x.id === req.params.id);
    if (!service) return res.status(404).json({success:false,message:'Affidavit service not found'});
    const data = req.body || {};
    const fields = Array.isArray(service.fields) ? service.fields : [];
    for (let i=0;i<fields.length;i++) {
      if (fields[i].required && !String(data[`field_${i}`] || '').trim()) {
        return res.status(400).json({success:false,message:`${fields[i].label} is required`});
      }
    }
    if (!String(data.authority || '').trim()) return res.status(400).json({success:false,message:'Department / authority is required'});
    if (!String(data.case_type || '').trim()) return res.status(400).json({success:false,message:'Case type is required'});
    if (!String(data.jurisdiction || '').trim()) return res.status(400).json({success:false,message:'State / jurisdiction is required'});
    if (!String(data.execution_place || '').trim()) return res.status(400).json({success:false,message:'Place of execution is required'});
    if (!String(data.execution_date || '').trim()) return res.status(400).json({success:false,message:'Date of execution is required'});

    const decision = decideAffidavit(service, {caseType:data.case_type, jurisdiction:data.jurisdiction, authorityChoice:data.authority});
    const normalizeDate = raw => {
      const v = String(raw || '').trim();
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y,mo,d]=v.split('-'); return `${d}/${mo}/${y}`; }
      const m = v.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{4})$/);
      if (m) return `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}/${m[3]}`;
      const digits=v.replace(/\D/g,''); if(digits.length===8)return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`; return v;
    };
    const titleCase = raw => String(raw||'').trim().toLowerCase().replace(/\b([a-z])/g,m=>m.toUpperCase());
    const isName = label => /\b(name)\b|father|mother|husband|wife|guardian|parent|deponent|deceased|applicant|proprietor|person/i.test(String(label||''));
    const isDate = f => f?.type==='date' || /\bdate\b|dob|date of birth|date of death/i.test(String(f?.label||''));
    const fmt = (f,raw) => { const v=String(raw||'').trim(); if(!v)return ''; if(isDate(f))return normalizeDate(v); if(isName(f?.label))return titleCase(v).toUpperCase(); return v; };
    const val=i=>fmt(fields[i],data[`field_${i}`]);
    const escDoc=v=>esc(v).replace(/\n/g,'<br>');
    const applicantIndex=fields.findIndex(f=>/applicant|declarant|proprietor|person name|name of applicant/i.test(f.label||''));
    const relationIndex=fields.findIndex(f=>/relation|relationship/i.test(f.label||''));
    const ageIndex=fields.findIndex(f=>/^age/i.test(f.label||''));
    const addressIndex=fields.findIndex(f=>/address/i.test(f.label||''));
    const applicant=applicantIndex>=0?val(applicantIndex):''; const relation=relationIndex>=0?val(relationIndex):''; const age=ageIndex>=0?val(ageIndex):''; const address=addressIndex>=0?val(addressIndex):'';
    let lead=`<p class="lead">I, <strong>${escDoc(applicant||'the undersigned declarant')}</strong>`; if(relation)lead+=`, <strong>${escDoc(relation)}</strong>`; if(age)lead+=`, aged <strong>${escDoc(age)}</strong> years`; if(address)lead+=`, residing at <strong>${escDoc(address)}</strong>`; lead+=`, do hereby solemnly affirm and declare as follows:</p>`;
    const template=String(decision.matterTemplate || service.matter_template || '').trim();
    const context=template.replace(/\{\{(\d+)\}\}/g,(_,n)=>escDoc(val(Number(n))||''));
    const rawClauses = context.split(/(?<=[.!?])\s+/).filter(Boolean);
    const execDate=normalizeDate(data.execution_date), execPlace=titleCase(data.execution_place);
    const checklist=decision.checklist.map(x=>`<li>${escDoc(x)}</li>`).join('');
    const steps=decision.steps.map(x=>`<li>${escDoc(x)}</li>`).join('');
    const warnings=decision.warnings.map(x=>`<li>${escDoc(x)}</li>`).join('');
    const refs=decision.officialReferences.map(x=>`<li>${escDoc(x)}</li>`).join('');
    const guideTitle=decision.officialFormat?'Authority-specific preparation guide':'Preparation & submission guide';

    // A4 affidavit first sheet: reserve exactly 5 inches at the top for the
    // printed graphic/shield/registration area supplied on the physical sheet.
    // The usable first-sheet area is 5.69in high (A4 11.69in - 5in top - 1in bottom).
    // Matter that does not fit is deliberately moved to clean continuation sheets.
    const firstPageLimit = 1180;
    const continuationLimit = 2600;
    const estimate = text => Math.ceil(String(text).length / 82);
    let firstClauses=[], remainingClauses=[];
    let used=estimate(service.title)+estimate(data.case_type)+estimate(data.jurisdiction)+estimate(applicant||'')+estimate(address||'')+8;
    for(const clause of rawClauses){
      const cost=estimate(clause)+1;
      if(used+cost<=firstPageLimit || firstClauses.length===0){ firstClauses.push(clause); used+=cost; }
      else remainingClauses.push(clause);
    }
    const clauseHtml=(arr,start=0)=>arr.map((x,i)=>`<p class="clause"><span class="num">${start+i+1}.</span>${x}</p>`).join('');
    const continuationChunks=[];
    let chunk=[], chunkUsed=0, clauseOffset=firstClauses.length;
    for(const clause of remainingClauses){
      const cost=estimate(clause)+1;
      if(chunk.length && chunkUsed+cost>continuationLimit){ continuationChunks.push(chunk); chunk=[]; chunkUsed=0; }
      chunk.push(clause); chunkUsed+=cost;
    }
    if(chunk.length) continuationChunks.push(chunk);
    const verification=`<div class="verification"><strong>VERIFICATION</strong><br>I verify that the statements made herein are true and correct to the best of my knowledge and belief and that no material fact has been concealed.</div><div class="place">Place: <strong>${escDoc(execPlace)}</strong><br>Date: <strong>${escDoc(execDate)}</strong></div><div class="sig"><div class="sigbox"><div class="line"></div><strong>DEPONENT / DECLARANT</strong></div></div><div class="notary">BEFORE ME<br><br>NOTARY PUBLIC / COMPETENT AUTHORITY</div>`;
    const firstHtml=`<section class="page first-page"><h1 class="title">${escDoc(service.title)}</h1><div class="meta"><div><strong>Case:</strong> ${escDoc(data.case_type)}</div><div><strong>State / Jurisdiction:</strong> ${escDoc(data.jurisdiction)}</div></div><div class="body">${lead}${clauseHtml(firstClauses)}${remainingClauses.length===0?verification:''}</div></section>`;
    let continuationHtml='';
    continuationChunks.forEach((chunk,idx)=>{
      const isLast=idx===continuationChunks.length-1;
      const start=firstClauses.length+continuationChunks.slice(0,idx).reduce((n,a)=>n+a.length,0);
      continuationHtml+=`<section class="page continuation"><div class="continuation-title">${escDoc(service.title)} — Continuation</div><div class="body">${clauseHtml(chunk,start)}${isLast?verification:''}</div></section>`;
    });
    const guideHtml=`<section class="page guide"><h2>${guideTitle}</h2><h3>Documents / records to keep ready</h3><ul>${checklist}</ul><h3>What to do after generation</h3><ul>${steps}</ul>${warnings?`<h3>Important case notes</h3><ul>${warnings}</ul>`:''}${refs?`<h3>Official references checked</h3><ul>${refs}</ul>`:''}<div class="notice"><strong>Important:</strong> Follow the current requirement of the selected receiving authority. Where a prescribed annexure, application form, Gazette process, newspaper publication, court order or other statutory step applies, that authority requirement controls.</div></section>`;
    const html=`<!doctype html><html><head><meta charset="utf-8"><style>
      @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:"Times New Roman",serif;font-size:11.5pt;line-height:1.48}.page{width:210mm;height:297mm;page-break-after:always;position:relative;background:#fff;padding:25.4mm}.first-page{padding:127mm 25.4mm 25.4mm}.continuation{padding:25.4mm}.title{text-align:center;font-weight:700;font-size:16pt;line-height:1.2;margin:0 0 10px;text-transform:uppercase;text-decoration:underline;text-underline-offset:3px}.meta{font-family:Arial,sans-serif;font-size:9pt;line-height:1.35;border:1px solid #bfc7cf;padding:7px 9px;margin:0 0 13px;background:#fafafa}.body{width:100%}.lead{text-align:justify;margin:0 0 9px;line-height:1.45}.body p{text-align:justify;margin:0 0 8px;line-height:1.45}.clause{margin:0 0 8px;text-align:justify;line-height:1.45}.num{display:inline-block;font-weight:700;min-width:20px}.verification{margin-top:15px;border-top:1px solid #333;padding-top:10px}.verification strong{display:block;text-align:center;margin-bottom:7px}.sig{display:flex;justify-content:flex-end;margin-top:22px}.sigbox{text-align:center;min-width:190px}.line{border-top:1px solid #111;margin-bottom:5px}.place{margin-top:14px;line-height:1.6}.notary{text-align:center;margin-top:22px;font-weight:700;line-height:1.4}.continuation-title{text-align:center;font-weight:700;font-size:13pt;text-transform:uppercase;text-decoration:underline;margin:0 0 20px}.guide{page-break-before:always;font-family:Arial,sans-serif}.guide h2{font-size:16pt;color:#123f70;margin:0 0 12px}.guide h3{font-size:11pt;color:#123f70;margin:18px 0 7px}.guide ul{margin:6px 0 0 20px;padding:0}.guide li{margin:0 0 7px;line-height:1.4}.notice{border:1px solid #d6b56a;background:#fff9e8;padding:10px;margin-top:15px;font-size:9pt}.page:last-child{page-break-after:auto}
    </style></head><body>${firstHtml}${continuationHtml}${guideHtml}</body></html>`;
    tmp=await fs.mkdtemp(path.join(os.tmpdir(),'koutilya-universal-affidavit-')); const file=path.join(tmp,'affidavit.html'); await fs.writeFile(file,html,'utf8');
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']}); const page=await browser.newPage(); await page.goto(`file://${file}`,{waitUntil:'domcontentloaded',timeout:30000});
    const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,margin:{top:0,right:0,bottom:0,left:0}});
    const filename=(service.title||'Affidavit').replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'')+'.pdf'; res.setHeader('Content-Type','application/pdf'); res.setHeader('Content-Disposition',`attachment; filename="${filename}"`); return res.end(Buffer.from(pdf));
  } catch(error){ console.error('Universal affidavit PDF error:',error); if(!res.headersSent)return res.status(500).json({success:false,message:error.message||'PDF generation failed'}); }
  finally{if(browser)await browser.close().catch(()=>{});if(tmp)await fs.rm(tmp,{recursive:true,force:true}).catch(()=>{});}
});

app.post(
  '/api/pdf/:name',
  async (req, res) => {

    const cfg =
      templates[
        req.params.name
      ];


    if (!cfg) {

      return res.status(404).json({

        success: false,

        message:
          'Unknown application'

      });

    }


    let browser = null;
    let tmp = null;
    let chromeProfileDir = null;


    try {

      /* ---------------------------------------------
         TEMPLATE
         --------------------------------------------- */

      const templatePath =
        path.join(
          ROOT,
          'backend',
          'templates',
          cfg[0]
        );


      console.log(
        'PDF template:',
        templatePath
      );


      const source =
        await fs.readFile(
          templatePath,
          'utf8'
        );


      /* ---------------------------------------------
         REPLACE FIELDS
         --------------------------------------------- */

      const html =
        replaceFields(
          source,
          req.body || {}
        );


      /* ---------------------------------------------
         TEMP DIRECTORY
         --------------------------------------------- */

      tmp =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'koutilya-html7-'
          )
        );


      const file =
        path.join(
          tmp,
          'application.html'
        );


      await fs.writeFile(
        file,
        html,
        'utf8'
      );


      /* ---------------------------------------------
         PUPPETEER
         --------------------------------------------- */

      chromeProfileDir =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'koutilya-chrome-app-'
          )
        );

      browser =
        await puppeteer.launch({

          headless: true,
          userDataDir: chromeProfileDir,

          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--no-first-run',
            '--no-default-browser-check'
          ]

        });


      const page =
        await browser.newPage();


      await page.goto(
        `file://${file}`,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );


      /* ---------------------------------------------
         PDF
         --------------------------------------------- */

      const pdf =
        await page.pdf({

          format: 'A4',

          printBackground: true,

          preferCSSPageSize: true,

          margin: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          }

        });


      /* ---------------------------------------------
         RESPONSE
         --------------------------------------------- */

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );


      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${cfg[1]}"`
      );


      return res.end(
        Buffer.from(pdf)
      );

    }

    catch (error) {

      console.error(
        `${req.params.name} PDF error:`,
        error
      );


      if (!res.headersSent) {

        return res.status(500).json({

          success: false,

          message:
            error.message ||
            'PDF generation failed'

        });

      }

    }

    finally {

      if (browser) {

        await browser
          .close()
          .catch(
            () => {}
          );

      }


      if (chromeProfileDir) {

        await fs
          .rm(
            chromeProfileDir,
            {
              recursive: true,
              force: true
            }
          )
          .catch(
            () => {}
          );

      }


      if (tmp) {

        await fs
          .rm(
            tmp,
            {
              recursive: true,
              force: true
            }
          )
          .catch(
            () => {}
          );

      }

    }

  }
);





// Admin authentication is intentionally separate and has no citizen-facing link.
const ADMIN_COOKIE='kspl_admin_session';
const ADMIN_USER_ID='JSServices';
const ADMIN_PASSWORD='Jsservices@246563';
async function requireAdmin(req,res,next){const token=authToken(req,ADMIN_COOKIE);if(!token)return res.status(401).json({success:false,message:'Admin login required.'});const db=await getDb();const s=db.sessions.find(x=>x.token===token&&x.role==='admin'&&x.expiresAt>Date.now());if(!s)return res.status(401).json({success:false,message:'Admin login required.'});next();}
app.post('/api/admin/login',async(req,res)=>{const uid=String(req.body.userId||'').trim(),pw=String(req.body.password||'');const expectedUid=ADMIN_USER_ID,expectedPw=ADMIN_PASSWORD;if(uid!==expectedUid||pw!==expectedPw)return res.status(401).json({success:false,message:'Invalid admin credentials.'});const token=crypto.randomBytes(32).toString('hex');await mutate(db=>db.sessions.push({token,role:'admin',userId:'ADMIN',createdAt:now(),expiresAt:Date.now()+SESSION_TTL_DAYS*86400000}));setCookie(res,ADMIN_COOKIE,token);res.json({success:true,authToken:token});});
app.get('/admin',(req,res)=>res.redirect('/admin-login.html'));
app.post('/api/admin/logout',async(req,res)=>{const token=authToken(req,ADMIN_COOKIE);await mutate(db=>{db.sessions=db.sessions.filter(s=>s.token!==token)});clearCookie(res,ADMIN_COOKIE);res.json({success:true});});
app.get('/admin/dashboard',requireAdmin,(req,res)=>res.sendFile(path.join(ROOT,'frontend','admin-dashboard.html')));

async function adminUser(req,res,next){const token=authToken(req,ADMIN_COOKIE);if(!token)return res.status(401).json({success:false,message:'Admin login required.'});const db=await getDb();const s=db.sessions.find(x=>x.token===token&&x.role==='admin'&&x.expiresAt>Date.now());if(!s)return res.status(401).json({success:false,message:'Admin login required.'});req.admin=true;next();}

app.get('/api/admin/complaints',adminUser,async(req,res)=>{const db=await getDb();const status=String(req.query.status||'ALL').toUpperCase();const rows=db.complaints.filter(x=>status==='ALL'||x.status===status).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));res.json({success:true,complaints:rows});});
app.post('/api/admin/complaints/:id/resolve',adminUser,async(req,res)=>{const resolution=String(req.body.resolution||'').trim();if(!resolution)return res.status(400).json({success:false,message:'Enter resolution details.'});const result=await mutate(db=>{const c=db.complaints.find(x=>x.id===req.params.id);if(!c)throw new Error('Complaint not found.');if(c.status==='RESOLVED')return {already:true,c};db.counters.complaint+=1;c.sr=`KSPL-SR-${db.counters.complaint}`;c.status='RESOLVED';c.resolution=resolution;c.resolvedAt=now();return {already:false,c};});if(result.already)return res.json({success:true,message:'Complaint is already resolved.',complaint:result.c});const c=result.c;const text=`Koutilya Solutions Citizen Portal\n\nYour complaint has been resolved.\nSR Number: ${c.sr}\nSubject: ${c.subject}\nResolution: ${c.resolution}\n\nThank you.`;const sent=await sendEmail({to:c.email,subject:`Complaint Resolved — ${c.sr}`,text});res.json({success:true,message:sent?'Complaint resolved and SR number emailed to the citizen.':'Complaint resolved. Email delivery is not configured.',emailSent:sent,complaint:c});});
app.get('/api/admin/chats',adminUser,async(req,res)=>{const db=await getDb();const userId=String(req.query.userId||'').trim();const from=String(req.query.from||''),to=String(req.query.to||'');const rows=db.chats.filter(x=>!userId||x.userId===userId).filter(x=>!from||x.createdAt.slice(0,10)>=from).filter(x=>!to||x.createdAt.slice(0,10)<=to).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));res.json({success:true,chats:rows});});

app.get('/api/admin/summary',adminUser,async(req,res)=>{
  const db=await getDb();
  const users=db.users.filter(u=>u.active!==false);
  const services=db.transactions.filter(t=>t.type==='service'&&t.status==='SUCCESS'&&!t.refunded);
  res.json({success:true,summary:{totalUsers:users.length,totalApplications:db.applications.length,totalSpent:services.reduce((a,t)=>a+Number(t.amount||0),0),totalWallet:users.reduce((a,u)=>a+Number(u.walletBalance||0),0)}});
});

app.get('/api/admin/users',adminUser,async(req,res)=>{
  const db=await getDb();
  const users=db.users.filter(u=>u.active!==false).map(u=>({id:u.id,userId:u.userId,name:u.name,mobile:u.mobile,email:u.email,city:u.city,walletBalance:Number(u.walletBalance||0),createdAt:u.createdAt}));
  res.json({success:true,users});
});

app.get('/api/admin/wallet/:userId',adminUser,async(req,res)=>{
  const db=await getDb();
  const u=db.users.find(x=>x.id===req.params.userId||x.userId===req.params.userId);
  if(!u)return res.status(404).json({success:false,message:'User not found.'});
  const from=String(req.query.from||''),to=String(req.query.to||'');
  const tx=db.transactions.filter(x=>x.userId===u.id).filter(x=>!from||x.createdAt.slice(0,10)>=from).filter(x=>!to||x.createdAt.slice(0,10)<=to).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const topups=db.transactions.filter(x=>x.userId===u.id&&x.direction==='credit'&&['topup','refund'].includes(x.type));
  const spent=db.transactions.filter(x=>x.userId===u.id&&x.type==='service'&&x.status==='SUCCESS'&&!x.refunded);
  const uncredited=(db.cashfreeOrders||[]).filter(o=>o.userId===u.id&&o.status!=='SUCCESS').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)); res.json({success:true,user:{id:u.id,userId:u.userId,name:u.name,email:u.email,mobile:u.mobile},summary:{totalTopup:topups.reduce((a,x)=>a+Number(x.amount||0),0),totalSpent:spent.reduce((a,x)=>a+Number(x.amount||0),0),balance:Number(u.walletBalance||0)},transactions:tx,uncreditedOrders:uncredited});
});

app.post('/api/admin/wallet/:userId/manual-topup',adminUser,async(req,res)=>{
  const amount=Number(req.body.amount);
  if(!Number.isFinite(amount)||amount<=0||amount>1000000)return res.status(400).json({success:false,message:'Enter a valid amount up to ₹10,00,000.'});
  const result=await mutate(db=>{
    const u=db.users.find(x=>x.id===req.params.userId||x.userId===req.params.userId);
    if(!u)throw new Error('User not found.');
    u.walletBalance=Number((Number(u.walletBalance||0)+amount).toFixed(2));
    const reference=`ADMIN-TOPUP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    db.transactions.push({id:id('txn'),userId:u.id,type:'topup',direction:'credit',amount:Number(amount.toFixed(2)),description:'Manual wallet top-up by Admin',reference,createdAt:now(),status:'SUCCESS',source:'ADMIN'});
    return {userId:u.userId,balance:u.walletBalance,reference};
  });
  res.json({success:true,message:`₹${amount.toFixed(2)} added successfully to ${result.userId}.`,...result});
});

app.post('/api/admin/wallet/:userId/credit-cashfree-order',adminUser,async(req,res)=>{
  const orderId=String(req.body.orderId||'').trim();
  if(!orderId)return res.status(400).json({success:false,message:'Order ID is required.'});
  const result=await mutate(db=>{
    const o=db.cashfreeOrders.find(x=>x.orderId===orderId&&(x.userId===req.params.userId||x.userId===db.users.find(u=>u.id===req.params.userId||u.userId===req.params.userId)?.id));
    if(!o)throw new Error('Cashfree order not found for this user.');
    if(o.status==='SUCCESS')return {already:true};
    const u=db.users.find(x=>x.id===o.userId);if(!u)throw new Error('User not found.');
    o.status='SUCCESS';o.statusUpdatedBy='ADMIN';o.statusUpdatedAt=now();
    u.walletBalance=Number((Number(u.walletBalance||0)+Number(o.amount)).toFixed(2));
    db.transactions.push({id:id('txn'),userId:u.id,type:'topup',direction:'credit',amount:Number(o.amount),description:'Cashfree wallet top-up manually reconciled by Admin',reference:o.orderId,createdAt:now(),status:'SUCCESS',source:'ADMIN_RECONCILIATION'});
    return {already:false,userId:u.userId,balance:u.walletBalance,amount:Number(o.amount),reference:o.orderId};
  });
  if(result.already)return res.json({success:true,message:'This Cashfree order is already credited.'});
  res.json({success:true,message:`₹${result.amount.toFixed(2)} reconciled and credited to ${result.userId}.`,...result});
});

app.post('/api/admin/users/:userId/reset-password',adminUser,async(req,res)=>{
  const result=await mutate(db=>{
    const u=db.users.find(x=>x.id===req.params.userId||x.userId===req.params.userId);
    if(!u)throw new Error('User not found.');
    const password=randomPassword();
    u.passwordHash=hashPassword(password);u.mustChangePassword=true;
    return {user:u,password};
  });
  const text=`Koutilya Solutions Citizen Portal\n\nYour password has been reset by Admin.\nUser ID: ${result.user.userId}\nTemporary Password: ${result.password}\n\nPlease login with this temporary password and change it immediately.`;
  const sent=await sendEmail({to:result.user.email,subject:'Koutilya Citizen Portal — Password Reset',text});
  res.json({success:true,message:sent?'Temporary password has been sent to the user registered email.':'Password reset completed, but email delivery is not configured.',emailSent:sent});
});

function csvCell(v){const s=String(v??'');return `"${s.replace(/"/g,'""')}"`;}
app.get('/api/admin/reports.csv',adminUser,async(req,res)=>{
  const db=await getDb();const userId=String(req.query.userId||'');const from=String(req.query.from||''),to=String(req.query.to||'');
  const user=db.users.find(u=>u.id===userId||u.userId===userId);if(!user)return res.status(404).json({success:false,message:'Select a valid user.'});
  const rows=db.applications.filter(a=>a.userId===user.id).filter(a=>!from||a.createdAt.slice(0,10)>=from).filter(a=>!to||a.createdAt.slice(0,10)<=to).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
  const headers=['Application Date','User ID','Service','Applicant Name','Father Name','Date of Birth','Mobile Number','Address','Mother Name'];
  const out=[headers.map(csvCell).join(',')];
  for(const a of rows){const d=a.data||{};const get=(...keys)=>{for(const k of keys){if(d[k]!==undefined&&d[k]!==null&&String(d[k]).trim()!=='')return d[k];}return '';};out.push([a.createdAt,a.userId,a.serviceName||a.serviceKey,get('applicant_name','applicantName','name','full_name','child_name'),get('father_name','fatherName','father','deceased_father'),get('date_of_birth','dob','dateOfBirth'),get('mobile','mobile_number','phone'),get('address','full_address','present_address','permanent_address'),get('mother_name','motherName','mother')].map(csvCell).join(','));}
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${user.userId}_application_report.csv"`);res.send('\ufeff'+out.join('\r\n'));
});


app.get('/', (req,res)=>{res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');res.setHeader('Pragma','no-cache');res.setHeader('Expires','0');res.sendFile(path.join(ROOT,'frontend','portal.html'));});

/* =====================================================
   START SERVER
   ===================================================== */

const PORT =
  process.env.PORT || 5000;


app.listen(
  PORT,
  () => {

    console.log('');

    console.log(
      '=========================================='
    );

    console.log(
      'KOUTILYA HTML PDF SERVER'
    );

    console.log(
      '=========================================='
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Location API: http://localhost:${PORT}/api/locations`
    );

    console.log(
      `Generated PDFs: ${GENERATED_DIR}`
    );

    console.log(
      '=========================================='
    );

    console.log('');

  }
);
