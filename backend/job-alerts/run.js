import dotenv from 'dotenv';
dotenv.config({path:'./.env'});
import { createJobAlertService } from './service.js';

async function sendEmail({to,subject,text,html}){
 const key=process.env.RESEND_API_KEY;
 if(!key){console.warn('No RESEND_API_KEY configured; email send skipped.');return false;}
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({from:process.env.MAIL_FROM||'info@koutilyasolutions.in',to:[to],subject,text,html})});
 return r.ok;
}
const svc=createJobAlertService({sendEmail});
await svc.init();
const result=await svc.run({test:false,dryRun:String(process.env.JOB_ALERT_DRY_RUN||'true').toLowerCase()!=='false'});
console.log(JSON.stringify(result,null,2));
