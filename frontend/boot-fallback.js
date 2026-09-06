/* Emergency first-paint fallback for the citizen portal.
   It renders the approved login immediately so a slow/unavailable API or another
   frontend script can never leave the production page visually blank. The normal
   portal-app.js still takes over after loading. */
(function(){
  var root=document.getElementById('app');
  if(!root) return;
  root.innerHTML='<main style="min-height:100vh;display:flex;background:#f5f8fc;font-family:Inter,Segoe UI,Arial,sans-serif"><section style="display:flex;flex:1;min-height:100vh"><div style="flex:1;background:linear-gradient(145deg,#eaf4ff,#dcecff);padding:56px;display:flex;flex-direction:column;justify-content:center;color:#10243e"><div style="font-weight:800;letter-spacing:.08em;font-size:14px;color:#1769d1">KOUTILYA SOLUTIONS</div><h1 style="font-size:42px;line-height:1.08;margin:22px 0 14px;max-width:620px">Digital Citizen Services, made simple.</h1><p style="font-size:17px;line-height:1.7;max-width:650px;color:#526579">Prepare citizen applications and affidavits online, keep documents ready, manage your wallet and track your service transactions from one secure portal.</p><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:28px;max-width:650px"><div style="background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:16px"><b>MeeSeva Applications</b><br><small>Digital application preparation</small></div><div style="background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:16px"><b>Affidavits & Declarations</b><br><small>Service-specific document drafts</small></div><div style="background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:16px"><b>Digital Documents</b><br><small>Generate and save your PDF</small></div><div style="background:#fff;border:1px solid #dce6f2;border-radius:14px;padding:16px"><b>Secure Wallet</b><br><small>Top-up and pay service fees</small></div></div></div><div style="width:440px;background:#fff;display:flex;align-items:center;justify-content:center;padding:40px;box-sizing:border-box"><div style="width:100%;max-width:360px"><div style="font-weight:800;color:#12335a;font-size:18px">Koutilya Solutions</div><div style="color:#718096;font-size:12px;margin-top:3px">Secure Portal Login</div><h2 style="font-size:30px;color:#10243e;margin:32px 0 8px">Welcome back</h2><p style="color:#68798d;line-height:1.55;font-size:14px">Sign in with your Koutilya User ID or authorized Admin ID to continue.</p><form id="fallbackLogin" style="margin-top:24px"><label style="display:block;font-weight:700;color:#243b53;font-size:13px;margin-bottom:7px">User ID</label><input id="fallbackUid" autocomplete="username" placeholder="Enter registered Email ID" required style="width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #d5dfeb;border-radius:10px;font-size:14px;margin-bottom:16px"><label style="display:block;font-weight:700;color:#243b53;font-size:13px;margin-bottom:7px">Password</label><input id="fallbackPw" type="password" autocomplete="current-password" placeholder="Enter password" required style="width:100%;box-sizing:border-box;padding:13px 14px;border:1px solid #d5dfeb;border-radius:10px;font-size:14px"><label style="display:flex;align-items:center;gap:7px;margin:9px 0 18px;color:#526579;font-size:12px"><input id="fallbackShow" type="checkbox" style="width:auto"> Show password</label><button type="submit" style="width:100%;border:0;border-radius:10px;padding:14px;background:linear-gradient(135deg,#1769d1,#1254aa);color:#fff;font-weight:800;font-size:15px;cursor:pointer">Login</button></form><div id="fallbackMsg" style="min-height:22px;margin-top:12px;font-size:13px;color:#c0392b"></div><div style="border-top:1px solid #e5ebf2;margin:20px 0 14px"></div><button id="fallbackRegister" type="button" style="width:100%;padding:12px;border:1px solid #b9cbe0;background:#fff;color:#1769d1;border-radius:10px;font-weight:700">Create New Citizen Account</button></div></div></section></main>';
  var form=document.getElementById('fallbackLogin');
  var show=document.getElementById('fallbackShow');
  var msg=document.getElementById('fallbackMsg');
  if(show) show.onchange=function(){document.getElementById('fallbackPw').type=this.checked?'text':'password';};
  if(form) form.onsubmit=async function(e){
    e.preventDefault();
    msg.textContent='Signing in…';
    try{
      var base=window.KSPL_API_BASE||'';
      var r=await fetch(base+'/api/auth/unified-login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({userId:document.getElementById('fallbackUid').value.trim(),password:document.getElementById('fallbackPw').value})});
      var j=await r.json().catch(function(){return{};});
      if(!r.ok) throw new Error(j.message||'Login failed.');
      if(j.authToken)localStorage.setItem('kspl_auth_token',j.authToken);
      if(j.role==='admin'){location.href=j.redirect||'/admin/dashboard';return;}
      msg.style.color='#1f7a4d';msg.textContent='Login successful. Loading portal…';
      if(window.__KSPL_PORTAL_BOOT) window.__KSPL_PORTAL_BOOT(j); else location.reload();
    }catch(err){msg.style.color='#c0392b';msg.textContent=err.message||'Unable to login. Please try again.';}
  };
})();
