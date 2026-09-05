// Citizen registration mode: citizens create their own password and use their email as User ID.
import express from 'express';
import crypto from 'node:crypto';
import { mutate, hashPassword, id, now, getDb } from './portal-db.js';

const originalPost = express.application.post;

function findCitizen(db, credential) {
  const value = String(credential || '').trim().toLowerCase();
  return db.users.find(u => u.active && (String(u.userId || '').toLowerCase() === value || String(u.email || '').toLowerCase() === value));
}

function publicCitizen(user) {
  return { id:user.id, userId:user.userId, name:user.name, mobile:user.mobile, email:user.email, city:user.city, mustChangePassword:!!user.mustChangePassword, createdAt:user.createdAt };
}

function registration(req, res) {
  return (async () => {
    try {
      const name=String(req.body?.name||'').trim();
      const mobile=String(req.body?.mobile||'').replace(/\D/g,'');
      const email=String(req.body?.email||'').trim().toLowerCase();
      const city=String(req.body?.city||'').trim();
      const password=String(req.body?.password||'');
      const confirm=String(req.body?.confirmPassword||'');
      if(!name||!/^[6-9]\d{9}$/.test(mobile)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!city) return res.status(400).json({success:false,message:'Enter valid name, 10-digit mobile, email and city.'});
      if(password.length<8) return res.status(400).json({success:false,message:'Password must be at least 8 characters.'});
      if(password!==confirm) return res.status(400).json({success:false,message:'Password and confirm password do not match.'});
      const user=await mutate(db=>{
        if(db.users.some(u=>u.mobile===mobile)) throw new Error('This mobile number is already registered.');
        if(db.users.some(u=>String(u.email||'').toLowerCase()===email)) throw new Error('This email address is already registered.');
        if(db.users.some(u=>String(u.userId||'').toLowerCase()===email)) throw new Error('This email address is already registered.');
        const created={id:id('usr'),userId:email,name,mobile,email,city,passwordHash:hashPassword(password),mustChangePassword:false,walletBalance:0,pdfEntitlements:[],active:true,createdAt:now()};
        db.users.push(created); return created;
      });
      console.log('CITIZEN REGISTRATION SUCCESS',{userId:user.userId});
      return res.json({success:true,userId:user.userId,message:'Registration successful. Your registered email address is your User ID. Please go back to the Login page and login with your email and password.'});
    } catch(e) { console.error('REGISTER ERROR',e); return res.status(409).json({success:false,message:e.message||'Registration failed.'}); }
  })();
}

function citizenLogin(req,res){
  return (async()=>{
    const credential=String(req.body?.userId||'').trim();
    const password=String(req.body?.password||'');
    const db=await getDb(); const user=findCitizen(db,credential);
    if(!user||user.passwordHash!==hashPassword(password)) return res.status(401).json({success:false,message:'Invalid User ID/email or password.'});
    const token=crypto.randomBytes(32).toString('hex');
    await mutate(db=>{db.sessions=db.sessions.filter(s=>s.expiresAt>Date.now());db.sessions.push({token,userId:user.id,createdAt:now(),expiresAt:Date.now()+7*86400000});});
    res.setHeader('Set-Cookie',`kspl_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7*86400}`);
    return res.json({success:true,role:'user',user:publicCitizen(user),redirect:'/',mustChangePassword:!!user.mustChangePassword,authToken:token});
  })();
}

express.application.post=function(path,...handlers){
  if(path==='/api/auth/register') return originalPost.call(this,path,registration);
  if(path==='/api/auth/unified-login') {
    const originalHandler=handlers[handlers.length-1];
    const wrapped=[...handlers.slice(0,-1),async(req,res,next)=>{
      const db=await getDb();
      if(findCitizen(db,req.body?.userId)) return citizenLogin(req,res);
      return originalHandler(req,res,next);
    }];
    return originalPost.call(this,path,...wrapped);
  }
  return originalPost.call(this,path,...handlers);
};

// Rewrite only the registration screen in the existing static portal JS.
const originalStatic=express.static;
express.static=function(...args){
  const middleware=originalStatic(...args);
  return function(req,res,next){
    if(req.method==='HEAD'||req.path!=='/portal-app.js') return middleware(req,res,next);
    const chunks=[]; const write=res.write.bind(res); const end=res.end.bind(res);
    res.write=(chunk,encoding,cb)=>{if(chunk)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding));if(typeof cb==='function')cb();return true;};
    res.end=(chunk,encoding,cb)=>{if(chunk)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding));let source=Buffer.concat(chunks).toString('utf8');
      source=source.replace(/function register\(\)\{[\s\S]*?\n\nasync function loginUser\(\)/,`function register(){\n  app.innerHTML=\`<main class="auth-page"><div class="auth-split"><section class="auth-showcase compact">\${brandMarkup('Citizen Registration')}<div class="showcase-copy"><span class="eyebrow">NEW CITIZEN ACCOUNT</span><h1>Start your digital service journey.</h1><p>Register with your email as your Koutilya User ID and create your own password.</p></div><div class="registration-points"><div>✓ Email ID is your User ID</div><div>✓ Create your own password</div><div>✓ Login immediately after registration</div></div></section><section class="auth-side"><div class="auth-card">\${brandMarkup('Citizen Registration')}<h2>Create your account</h2><p class="auth-lead">Enter your details and create your own password. No credential email is required.</p><form id="regForm"><div class="form-grid"><div class="field"><label for="regName">Full Name</label><input id="regName" autocomplete="name" required></div><div class="field"><label for="regMobile">Mobile Number</label><input id="regMobile" inputmode="numeric" maxlength="10" autocomplete="tel" required></div><div class="field"><label for="regEmail">Email ID / User ID</label><input id="regEmail" type="email" autocomplete="username" required></div><div class="field"><label for="regCity">City</label><input id="regCity" autocomplete="address-level2" required></div><div class="field"><label for="regPassword">Create Password</label><input id="regPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label for="regConfirmPassword">Confirm Password</label><input id="regConfirmPassword" type="password" minlength="8" autocomplete="new-password" required></div></div><button class="primary" type="submit">Register Citizen Account</button></form><div id="regMsg" class="msg hidden"></div><div class="auth-links"><button class="link-btn" id="backLogin" type="button">← Back to Login</button></div></div></section></div></main>\`;\n  document.getElementById('regForm').addEventListener('submit',async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;const password=document.getElementById('regPassword').value;const confirmPassword=document.getElementById('regConfirmPassword').value;if(password!==confirmPassword){showMsg('regMsg','Password and confirm password do not match.','err');btn.disabled=false;return;}showMsg('regMsg','Creating your citizen account…','info');try{const j=await api('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('regName').value.trim(),mobile:document.getElementById('regMobile').value.trim(),email:document.getElementById('regEmail').value.trim(),city:document.getElementById('regCity').value.trim(),password,confirmPassword})});showMsg('regMsg',j.message,'ok');setTimeout(auth,2500);}catch(err){showMsg('regMsg',err.message,'err')}finally{btn.disabled=false;}});\n  document.getElementById('backLogin').addEventListener('click',auth);\n}\n\nasync function loginUser()`);
      res.removeHeader('ETag');res.removeHeader('Content-Length');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Length',Buffer.byteLength(source));res.write=write;res.end=end;return end(source,'utf8',cb);};
    return middleware(req,res,next);
  };
};