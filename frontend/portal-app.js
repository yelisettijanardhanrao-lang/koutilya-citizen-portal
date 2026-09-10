const app = document.getElementById('app');
const state = { user:null, services:[], view:'home' };
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const escAttr = esc;
const api = async (url, opts={}) => { const r=await fetch(url,opts); let j={}; try{j=await r.json()}catch{} if(!r.ok) throw Object.assign(new Error(j.message||'Request failed'),{status:r.status,data:j}); return j; };

function brandMarkup(sub='Citizen Digital Platform'){
  return `<div class="brand"><div class="brand-mark">KS</div><div><strong>Koutilya Solutions</strong><small>${esc(sub)}</small></div></div>`;
}
function showMsg(id,text,type='err'){const el=document.getElementById(id); if(!el)return; el.className='msg '+type; el.textContent=text;}

function auth(){
  app.innerHTML=`<main class="auth-page final-auth"><div class="auth-split">
    <section class="auth-showcase">
      <div class="final-logo"><img src="/assets/koutilya-auth-logo.png" alt="Koutilya Solutions"></div>
      <div class="final-copy">
        <h1><span>Empowering</span><strong>Citizens Digitally</strong></h1>
        <p>All Government &amp; Citizen Services<br>in One Place</p>
      </div>
      <div class="final-services">
        <div><b>SV</b><span>MeeSeva Applications</span></div>
        <div><b>SV</b><span>Online Document Services</span></div>
        <div><b>AFF</b><span>Affidavits &amp; Declarations</span></div>
        <div><b>RW</b><span>Resume Writer</span></div>
        <div><b>SV</b><span>Jobs, Exams &amp; Education Alerts</span></div>
      </div>
      <div class="final-signature">Your Service Partner<br>for a Brighter Tomorrow</div>
    </section>
    <section class="auth-side">
      <div class="final-login-card">
        <div class="final-avatar">KS</div>
        <h2>Login to Your Account</h2>
        <p>Access all citizen services securely</p>
        <form id="loginForm">
          <div class="final-field"><label for="uid">User ID</label><div class="final-input"><input id="uid" autocomplete="username" placeholder="Enter registered Email ID" required></div></div>
          <div class="final-field"><label for="pw">Password</label><div class="final-input"><input id="pw" type="password" autocomplete="current-password" placeholder="Enter password" required><button id="showPwBtn" type="button" aria-label="Show password">\uD83D\uDC41</button></div></div>
          <div class="final-forgot"><a href="#" id="forgotPasswordLink">Forgot Password?</a></div>
          <button class="final-login-btn" type="submit">Login</button>
        </form>
        <div id="msg" class="msg hidden"></div>
        <div class="final-divider"><span>New to Koutilya Citizen Portal?</span></div>
        <button class="final-register-btn" id="registerBtn" type="button">Create New Account</button>
        <div class="final-trust">
          <div><b>OK</b><span>Simple</span></div><i></i>
          <div><b>SEC</b><span>Secure</span></div><i></i>
          <div><b>REL</b><span>Reliable</span></div><i></i>
          <div><b>CIT</b><span>Citizen First</span></div>
        </div>
      </div>
    </section>
  </div></main>`;
  document.getElementById('loginForm').addEventListener('submit',e=>{e.preventDefault();loginUser();});
  document.getElementById('showPwBtn').addEventListener('click',()=>{const p=document.getElementById('pw');const b=document.getElementById('showPwBtn');if(p.type==='password'){p.type='text';b.textContent='\uD83D\uDE48';b.setAttribute('aria-label','Hide password');}else{p.type='password';b.textContent='\uD83D\uDC41';b.setAttribute('aria-label','Show password');}});
  document.getElementById('forgotPasswordLink').addEventListener('click',e=>e.preventDefault());
  document.getElementById('registerBtn').addEventListener('click',register);
}
function register(){
  app.innerHTML=`<main class="auth-page"><div class="auth-split"><section class="auth-showcase compact">${brandMarkup('Citizen Registration')}<div class="showcase-copy"><span class="eyebrow">NEW CITIZEN ACCOUNT</span><h1>Start your digital service journey.</h1><p>Register once and use the same Koutilya User ID for applications, affidavits, wallet, transactions and support.</p></div><div class="registration-points"><div>OK Unique Koutilya User ID</div><div>OK Temporary password for first login</div><div>OK Mandatory password change for security</div><div>OK Citizen profile linked to your account</div></div></section><section class="auth-side"><div class="auth-card">
    ${brandMarkup('Citizen Registration')}<h2>Create your account</h2><p class="auth-lead">Enter the details below. Your unique User ID and temporary password will be sent to your registered email address.</p><div class="registration-alert-note"><b>Government Jobs & Exam Alerts</b><span>After registration, your email is automatically enrolled to receive Koutilya Government Jobs, Competitive Exams & Education Alerts. No category selection is required. You can unsubscribe from alert emails at any time.</span></div>
    <form id="regForm"><div class="form-grid"><div class="field"><label for="regName">Full Name</label><input id="regName" autocomplete="name" required></div><div class="field"><label for="regMobile">Mobile Number</label><input id="regMobile" inputmode="numeric" maxlength="10" autocomplete="tel" required></div><div class="field"><label for="regEmail">Email ID</label><input id="regEmail" type="email" autocomplete="email" required></div><div class="field"><label for="regCity">City</label><input id="regCity" autocomplete="address-level2" required></div></div><button class="primary" type="submit">Register Citizen Account</button></form>
    <div id="regMsg" class="msg hidden"></div><div class="auth-links"><button class="link-btn" id="backLogin" type="button">Back to Login</button></div>
  </div></section></div></main>`;
  document.getElementById('regForm').addEventListener('submit',async e=>{e.preventDefault(); const btn=e.submitter;btn.disabled=true;showMsg('regMsg','Creating your citizen account and sending credentials to your email...','info');try{const j=await api('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('regName').value.trim(),mobile:document.getElementById('regMobile').value.trim(),email:document.getElementById('regEmail').value.trim(),city:document.getElementById('regCity').value.trim()})});showMsg('regMsg',j.message,'ok');setTimeout(auth,4500);}catch(err){showMsg('regMsg',err.message,'err')}finally{btn.disabled=false;}});
  document.getElementById('backLogin').addEventListener('click',auth);
}

async function loginUser(){
  const btn=document.querySelector('#loginForm .final-login-btn');if(btn)btn.disabled=true;showMsg('msg','Signing in...','info');
  try{const j=await api('/api/auth/unified-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:document.getElementById('uid').value.trim(),password:document.getElementById('pw').value})});
    if(j.authToken)localStorage.setItem('kspl_auth_token',j.authToken);
    if(j.role==='admin'){location.href=j.redirect||'/admin/dashboard';return;}
    state.user=j.user;if(j.user.mustChangePassword){forceChange();return;}await boot();
  }catch(e){showMsg('msg',e.message,'err');}finally{if(btn)btn.disabled=false;}
}
function forceChange(){
  app.innerHTML=`<main class="auth-page"><div class="auth-card narrow">${brandMarkup('First Login Security')}<h2>Change your temporary password</h2><p class="auth-lead">For your security, the temporary password must be changed before you can use the portal.</p><form id="changeForm"><div class="field"><label>Current Password</label><input id="cur" type="password" required><label class="show-password"><input id="showCur" type="checkbox"> Show password</label></div><div class="field"><label>New Password</label><input id="newp" type="password" minlength="8" required placeholder="Minimum 8 characters"><label class="show-password"><input id="showNew" type="checkbox"> Show password</label></div><div class="field"><label>Confirm New Password</label><input id="conf" type="password" minlength="8" required><label class="show-password"><input id="showConf" type="checkbox"> Show password</label></div><button class="primary" type="submit">Change Password</button></form><div id="changeMsg" class="msg hidden"></div></div></main>`;
  document.getElementById('showCur').addEventListener('change',e=>cur.type=e.target.checked?'text':'password');document.getElementById('showNew').addEventListener('change',e=>newp.type=e.target.checked?'text':'password');document.getElementById('showConf').addEventListener('change',e=>conf.type=e.target.checked?'text':'password');document.getElementById('changeForm').addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:cur.value,newPassword:newp.value,confirmPassword:conf.value})});showMsg('changeMsg',j.message,'ok');localStorage.removeItem('kspl_auth_token');setTimeout(auth,1800);}catch(err){showMsg('changeMsg',err.message,'err');}});
}

function shell(){
 app.innerHTML=`
 <div class="portal">
  <header class="topbar">
   <div class="top-brand">
    <div class="brand-mark small">KS</div>
    <div class="brand-copy">
     <strong>Koutilya Solutions</strong>
     <small>Citizen Digital Platform</small>
    </div>
   </div>

   <div class="header-actions">
    <button class="header-action notification-btn" id="notificationBtn" type="button">
     <span>!</span><b id="notificationBadge">0</b>
    </button>

    <button class="wallet-chip" id="headerWallet" type="button">
     <span class="wallet-symbol">Rs</span>
     <span>
      <small>Wallet Balance</small>
      <strong id="headerWalletBalance">Rs 0.00</strong>
     </span>
    </button>

    <button class="profile-chip" id="profileChip" type="button">
     <span class="avatar" id="avatar">K</span>
     <span class="profile-copy">
      <small>Hello, Citizen</small>
      <strong id="topname"></strong>
      <em id="topid"></em>
     </span>
     <span class="profile-arrow">v</span>
    </button>
   </div>
  </header>

  <div class="layout">
   <aside class="sidebar">
    <div class="side-title">CITIZEN MENU</div>
    ${[
     ['home','HOME','Home'],
     ['resume','RES','Koutilya Resume Writer'],
     ['alerts','ALERT','Jobs, Exams & Education Alerts'],
     ['services','MEE','MeeSeva Applications'],
     ['affidavits','AFF','Affidavits'],
     ['pvc','PVC','Print PVC'],
      ['idcards','ID','ID Card Maker'],
     ['wallet','WAL','Wallet'],
     ['transactions','TXN','Transactions'],
     ['complaint','?','Raise a Complaint'],
     ['profile','USR','Profile'],
     ['password','PWD','Change Password'],
     ['logout','OUT','Logout']
    ].map(x=>`<button class="navbtn" data-view="${x[0]}" type="button"><span class="navicon">${x[1]}</span><span>${x[2]}</span></button>`).join('')}
   </aside>

   <main class="content" id="content"></main>
  </div>

  <footer class="bottom">Koutilya Digital Platform</footer>
  <button class="chat-toggle" id="chatToggle" type="button">?</button>
  <div id="chatRoot"></div>
 </div>`;

 document.querySelectorAll('.navbtn').forEach(b=>{
  b.addEventListener('click',()=>navigate(b.dataset.view));
 });

 document.getElementById('chatToggle').addEventListener('click',toggleChat);

 document.getElementById('headerWallet').addEventListener('click',()=>{
  navigate('wallet');
 });

 document.getElementById('profileChip').addEventListener('click',()=>{
  navigate('profile');
 });

 document.getElementById('notificationBtn').addEventListener('click',()=>{
  navigate('alerts');
 });

 const globalSearch=document.getElementById('globalServiceSearch');

 if(globalSearch){
  globalSearch.addEventListener('keydown',e=>{
   if(e.key==='Enter'){
    const value=globalSearch.value;
    navigate('services');

    setTimeout(()=>{
     const localSearch=document.querySelector('.meeseva-search input');

     if(localSearch){
      localSearch.value=value;
      localSearch.dispatchEvent(new Event('input',{bubbles:true}));
     }
    },50);
   }
  });
 }

 updateUser();
}

function updateUser(){
 const name=state.user?.name||'Citizen';
 const userId=state.user?.userId||'';
 const avatar=(name||'K')[0].toUpperCase();

 const topname=document.getElementById('topname');
 const topid=document.getElementById('topid');
 const avatarEl=document.getElementById('avatar');

 if(topname) topname.textContent=name;
 if(topid) topid.textContent=userId;
 if(avatarEl) avatarEl.textContent=avatar;

 const balance=state.user?.walletBalance ?? state.user?.wallet ?? 0;
 const walletEl=document.getElementById('headerWalletBalance');

 if(walletEl){
  const n=Number(balance);
  walletEl.textContent='Rs '+(Number.isFinite(n)?n.toFixed(2):'0.00');
 }
}

async function boot(){
 shell();
 await loadServices();
 await handleReturn();
 navigate('home');
}

async function loadServices(){try{const j=await api('/api/affidavits');state.services=j.services||[];}catch(e){state.services=[];}}
function navigate(v){state.view=v;document.querySelectorAll('.navbtn').forEach(x=>x.classList.toggle('active',x.dataset.view===v));const fn={home,resume,alerts,services,affidavits,pvc,idcards,wallet,transactions,complaint,profile,password,logout}[v]||home;fn();}

async function home(){content.innerHTML=`<section class="hero"><div><span class="eyebrow">KOUTILYA SOLUTIONS</span><h1>Welcome, ${esc(state.user.name)}</h1><p>Your citizen services are available from one secure digital workspace.</p></div><div class="hero-id"><small>USER ID</small><strong>${esc(state.user.userId)}</strong></div></section><div class="cards" id="stats"><div class="stat"><span>Completed Transactions</span><strong>-</strong></div><div class="stat"><span>Amount Spent</span><strong>-</strong></div><div class="stat"><span>Wallet Balance</span><strong>-</strong></div></div><section class="panel"><div class="panel-head"><div><h2>Quick Services</h2><p>Choose a service and continue without leaving your dashboard.</p></div></div><div class="service-grid quick"><div class="service" data-go="alerts"><div class="ico orange">!</div><strong>Jobs, Exams & Education Alerts</strong><span>Government recruitment, competitive examinations, entrance tests and education updates.</span></div><div class="service" data-go="resume"><div class="ico blue">RW</div><strong>Koutilya Resume Writer</strong><span>Create a professional resume and generate a PDF for job applications.</span><em>Rs 10 on PDF generation</em></div><div class="service" data-go="services"><div class="ico blue">SV</div><strong>MeeSeva Applications</strong><span>Late registration, income, EWS, OBC, caste, family and seeding applications.</span></div><div class="service" data-go="affidavits"><div class="ico purple">RW</div><strong>Affidavits & Declarations</strong><span>Browse 80 citizen-use affidavit and declaration services.</span></div><div class="service" data-go="wallet"><div class="ico green">Rs </div><strong>Wallet</strong><span>Add balance securely and use it for service fees.</span></div><div class="service" data-go="transactions"><div class="ico orange"><-></div><strong>Transactions</strong><span>Search your service and wallet transaction history.</span></div></div></section><section class="panel note-panel"><div class="note-icon">OK</div><div><h3>How Koutilya helps</h3><p>We provide digital preparation of citizen-service applications and citizen-use affidavits, PDF generation, wallet-based service payments, transaction records and support. The concerned authority remains responsible for statutory approval, verification and final acceptance.</p></div></section>`;
 document.querySelectorAll('[data-go]').forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.go)));try{const j=await api('/api/portal/dashboard');stats.innerHTML=`<div class="stat"><span>Completed Transactions</span><strong>${j.stats.transactions}</strong></div><div class="stat"><span>Amount Spent</span><strong>Rs ${j.stats.amountSpent.toFixed(2)}</strong></div><div class="stat"><span>Wallet Balance</span><strong>Rs ${j.stats.balance.toFixed(2)}</strong></div>`;state.user.walletBalance=j.stats.balance;updateUser();}catch(e){}
}
const meeseva=[['death','Late Registration of Death','/forms/death.html'],['late-birth','Late Registration of Birth','/forms/late-birth.html'],['income','Income Certificate','/forms/income.html'],['ews','EWS Income Certificate','/forms/ews.html'],['obc','OBC Certificate','/forms/obc.html'],['caste-integrated','Caste / Integrated Certificate','/forms/caste-integrated.html'],['family-member','Family Membership Certificate','/forms/family-member.html'],['seeding','Pattadar Aadhaar Seeding','/forms/seeding.html']];
const meesevaChecklists={death:['Applicant Aadhaar / valid ID proof','Deceased person death record / hospital or burial evidence, as applicable','Address / residence proof','Relationship proof, if required','Passport-size photograph, if requested'], 'late-birth':['Applicant/parent Aadhaar or valid ID','Proof of birth such as hospital/birth record, if available','Address / residence proof','Parent/guardian relationship proof','Documents explaining delayed registration, if required'],income:['Applicant identity proof','Address/residence proof','Income/source supporting documents','Family/income particulars','Authority-specific application or certificate records, if required'],ews:['Identity and address proof','Family income/source records','Asset/property particulars','Agricultural land/property records where applicable','EWS application/supporting documents required by the authority'],obc:['Identity and address proof','Community/caste supporting record','Family/income details','Non-creamy-layer supporting records where applicable','Authority-specific OBC/NCL documents'], 'caste-integrated':['Identity and address proof','Caste/community supporting record','Previous caste certificate, if any','Family/parent community records where applicable','Authority-specific integrated certificate documents'], 'family-member':['Applicant identity/address proof','Death certificate or reference record, where applicable','Relationship/family records','Family member identity records','Authority-specific family membership documents'],seeding:['Pattadar/passbook or land record','Aadhaar/identity details','Survey and land particulars','Mobile number linked/required for service','Authority-specific seeding records']};
function serviceIcon(key){return ({death:'D', 'late-birth':'B',income:'Rs ',ews:'OK',obc:'OBC','caste-integrated':'CI','family-member':'FM',seeding:'PA'})[key]||'SV';}
function smartTitleCase(value){
  const s=String(value||'').trim().replace(/\s+/g,' ');
  if(!s)return '';
  const acronyms=new Set(['IT','HR','BPO','KYC','GST','TDS','MS','MBA','MCA','BCA','B.Tech.','M.Tech.','B.Sc.','M.Sc.','B.Com.','M.Com.','B.A.','M.A.','B.Ed.','M.Ed.','SSC','HSC','CBSE','ICSE','API','UI','UX','SQL','HTML','CSS','PHP','C','C++','C#','AI','ML']);
  return s.toLowerCase().split(/\s+/).map(w=>{
    const clean=w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9.#+-]+$/g,'');
    if(acronyms.has(clean.toUpperCase()) || acronyms.has(clean)) return w.replace(/[A-Za-z]+/g,m=>m.toUpperCase());
    return w.charAt(0).toUpperCase()+w.slice(1);
  }).join(' ');
}
function resumeNormalizeText(value){
 let s=String(value??'').replace(/\r/g,' ').replace(/\s+/g,' ').trim(); if(!s)return '';
 const r=[[/\bvisakhpatham\b/gi,'Visakhapatnam'],[/\bvishakapatnam\b/gi,'Visakhapatnam'],[/\bvisakapatnam\b/gi,'Visakhapatnam'],[/\bandhra\s+univerity\b/gi,'Andhra University'],[/\bstatments?\b/gi,'statements'],[/\bqui?res?\b/gi,'queries'],[/\bcleart\b/gi,'clear'],[/\bbraches\b/gi,'branches'],[/\butiliy\b/gi,'utility'],[/\bexcell\b/gi,'Excel'],[/\btalley\b/gi,'Tally'],[/\btallyman\b/gi,'Tally']]; for(const [a,b] of r)s=s.replace(a,b); return s;
}
function writerLines(text){return resumeNormalizeText(text).split(/\n+/).flatMap(x=>x.split(/[;]+/)).map(x=>x.trim()).filter(Boolean);}
function writerSkills(text){return writerLines(String(text||'').replace(/,/g,'\n')).map(x=>x.replace(/^[ | \---\s]+/,'').trim()).filter(Boolean);}
function normalizeRole(role){return smartTitleCase(String(role||'Professional').replace(/\s+/g,' ').trim());}
function roleArticle(role){return /^[aeiou]/i.test(String(role||''))?'an':'a';}
function normalizeEducation(text){
  const map={'bsc':'B.Sc.','b.sc':'B.Sc.','msc':'M.Sc.','m.sc':'M.Sc.','bcom':'B.Com.','b.com':'B.Com.','mcom':'M.Com.','m.com':'M.Com.','ba':'B.A.','b.a':'B.A.','ma':'M.A.','m.a':'M.A.','btech':'B.Tech.','b.tech':'B.Tech.','mtech':'M.Tech.','m.tech':'M.Tech.','bca':'BCA','mca':'MCA','mba':'MBA','bed':'B.Ed.','b.ed':'B.Ed.','med':'M.Ed.','m.ed':'M.Ed.','10th':'Secondary School Certificate (10th)','12th':'Higher Secondary / Intermediate'};
  return writerLines(text).map(x=>map[x.toLowerCase().trim()]||smartTitleCase(x)).join('\n');
}
function polishSkill(s){
  const x=String(s||'').trim().replace(/^[- | ]+/,'').trim(); if(!x)return '';
  const low=x.toLowerCase();
  const map={'ms excel':'MS Excel','excel':'MS Excel','ms office':'MS Office','microsoft office':'MS Office','tally':'Tally','customer handling':'Customer Service & Customer Handling','customer service':'Customer Service','cash handling':'Cash Handling','billing':'Billing & Invoicing','communication':'Communication','teamwork':'Teamwork','leadership':'Leadership','problem solving':'Problem Solving','data entry':'Data Entry','computer knowledge':'Computer Skills','computer work':'Computer Skills','html':'HTML','css':'CSS','javascript':'JavaScript','java':'Java','python':'Python','accounts':'Accounting','accounting':'Accounting'};
  return map[low]||smartTitleCase(x);
}
function isExperienceDuration(s){return /^(?:\d+(?:\.\d+)?\+?\s*(?:years?|yrs?|months?|mos?))(?:\s+of\s+experience)?$/i.test(String(s||'').trim());}
function sentenceCase(s){const x=String(s||'').trim();return x?x.charAt(0).toUpperCase()+x.slice(1).replace(/\s+/g,' '):'';}
function polishExperienceLine(s){
 let x=resumeNormalizeText(s).trim().replace(/^[- | ]+\s*/,''); if(!x||isExperienceDuration(x)||/^fresher$/i.test(x))return '';
 const l=x.toLowerCase();
 const exact={'billing':'Handled billing activities.','billing queries':'Handled billing-related queries and provided appropriate support.','salary statements':'Prepared salary statements as part of routine office activities.','bank statements':'Reviewed bank statements as part of routine accounting activities.','tally':'Used Tally for the stated accounting and transaction-related work.','excel':'Used MS Excel for the stated records, calculations or reporting work.'};
 if(exact[l])return exact[l];
 const clauses=x.replace(/\b(i am|i'm|am|i was|i|we|we are|we're)\b/gi,' ').replace(/\s+(and|&|then)\s+/gi,'|').split('|').map(v=>v.trim()).filter(Boolean);
 if(clauses.length>1){const out=[];for(const c of clauses){const b=polishExperienceLine(c);if(b&&!out.includes(b))out.push(b);}if(out.length)return out.join('\n');}
 let y=x.replace(/^\s*(i\s+)?(?:am|was|do|did)\s+/i,'').replace(/\s+/g,' ').trim();
 if(/salary statements/i.test(y))return 'Prepared salary statements as part of routine office activities.';
 if(/billing[- ]related queries|billing queries/i.test(y))return 'Handled billing-related queries and provided appropriate support.';
 if(/daily requirements|day-to-day requirements/i.test(y))return 'Handled day-to-day requirements and routine office needs.';
 if(/tally/i.test(y)&&/excel/i.test(y))return 'Used Tally and MS Excel for the stated accounting and record-keeping work.';
 if(/tally/i.test(y))return 'Used Tally for the stated accounting and transaction-related work.';
 if(/excel/i.test(y))return 'Used MS Excel for the stated records, calculations or reporting work.';
 if(/customer/i.test(y)&&/(call|query|support|handle|handling)/i.test(y))return 'Handled customer queries and provided appropriate support.';
 y=y.replace(/[.!?]+$/,'').trim();return y?y.charAt(0).toUpperCase()+y.slice(1)+'.':'';
}
function polishProjectLine(s){const x=String(s||'').trim().replace(/^[- | ]+\s*/,'');return x?sentenceCase(x).replace(/\.$/,'')+'.':'';}
function polishCertificationLine(s){const x=String(s||'').trim().replace(/^[- | ]+\s*/,'');return x?sentenceCase(x).replace(/\.$/,'')+'.':'';}
function polishAchievementLine(s){const x=String(s||'').trim().replace(/^[- | ]+\s*/,'');return x?sentenceCase(x).replace(/\.$/,'')+'.':'';}
function buildKoutilyaResume(d){
  const role=normalizeRole(d.targetRole), skills=writerSkills(d.skills).map(polishSkill).filter(Boolean), exp=writerLines(d.experience), projects=writerLines(d.projects), internships=writerLines(d.internships), certs=writerLines(d.certifications), ach=writerLines(d.achievements), langs=writerSkills(d.languages).map(smartTitleCase);
  const education=normalizeEducation(d.education), skillText=skills.slice(0,10).join(', '), expDuration=exp.find(isExperienceDuration)||'', status=String(d.careerStatus||'').toLowerCase();
  const fresher=/fresh|student|entry/.test(status);
  const experience=exp.filter(x=>!isExperienceDuration(x)&&!/^fresher$/i.test(x)).map(polishExperienceLine).filter(Boolean);
  const projectText=projects.map(polishProjectLine).filter(Boolean), internshipText=internships.map(polishProjectLine).filter(Boolean), certText=certs.map(polishCertificationLine).filter(Boolean), achText=ach.map(polishAchievementLine).filter(Boolean);
  const company=d.company?smartTitleCase(d.company):'', jobTitle=d.jobTitle?normalizeRole(d.jobTitle):role, dates=String(d.employmentDates||'').trim();
  if(!fresher && (company||dates||d.jobTitle)) experience.unshift([jobTitle,company,dates].filter(Boolean).join('  |  '));
  const summary=fresher
    ? `Candidate for ${role} with ${education||'the education listed'} and skills including ${skillText||'the skills listed in the resume'}.`
    : `${role} professional${expDuration?` with ${expDuration.replace(/\s+of\s+experience/i,'')} of experience`:''} with experience in ${skillText||'the skills listed in the resume'} at ${company||'the organization listed'}.`;
  return {...d,fullName:smartTitleCase(d.fullName),targetRole:role,jobTitle,company,employmentDates:dates,education,skills:skills.join('  |  '),languages:langs.join(', '),summary,experience:experience.join('\n'),projects:projectText.join('\n'),internships:internshipText.join('\n'),certifications:certText.join('\n'),achievements:achText.join('\n'),strengths:skills.slice(0,6).join('  |  '),writerGenerated:true,fresher};
}
function resumeSection(title,text,cls=''){if(!text)return ''; return `<section class="resume-section ${cls}"><h3>${esc(title)}</h3><div>${esc(text).replace(/\n/g,'<br>')}</div></section>`;}
function resumeTemplateName(t){return ({executive:'Executive',modern:'Modern ATS',classic:'Classic Professional',creative:'Contemporary'})[t]||'Modern ATS';}
function resumePreviewHtml(d){
  const theme=['executive','modern','classic','creative'].includes(d.template)?d.template:'modern';
  const photo=d.level==='professional'&&d.photo?`<img class="resume-preview-photo" src="${escAttr(d.photo)}" alt="Profile photo">`:'';
  const contact=[d.mobile,d.email,d.location].filter(Boolean).map(esc).join('   |   ');
  const lines=v=>String(v||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const bullets=v=>lines(v).map(x=>`<li>${esc(x)}</li>`).join('');
  const section=(title,body,cls='')=>body?`<section class="resume-section ${cls}"><div class="resume-section-title">${esc(title)}<span></span></div>${body}</section>`:'';
  const exp=lines(d.experience), expBullets=exp.length&&!d.fresher?exp.slice(1):[];
  const expBlock=!d.fresher&&d.experience?`<div class="resume-job"><div class="resume-job-head"><div><strong>${esc(d.jobTitle||d.targetRole)}</strong>${d.company?`<small>${esc(d.company)}</small>`:''}</div><em>${esc(d.employmentDates||'')}</em></div>${expBullets.length?`<ul>${bullets(expBullets.join('\n'))}</ul>`:''}</div>`:'';
  const educationLines=lines(d.education);
  return `<div class="resume-paper resume-theme-${theme}" id="resumePaper">
    <header class="resume-head">${photo}<div class="resume-head-main"><h1>${esc(d.fullName)}</h1><div class="resume-role">${esc(d.targetRole)}</div><div class="resume-contact">${contact}</div>${d.linkedin?`<div class="resume-link">${esc(d.linkedin)}</div>`:''}</div></header>
    ${section('Professional Summary',`<p>${esc(d.summary)}</p>`)}
    ${section('Core Skills',`<div class="resume-skills">${esc(d.skills)}</div>`)}
    ${expBlock?section('Professional Experience',expBlock):''}
    ${d.projects?section('Projects / Practical Work',`<ul>${bullets(d.projects)}</ul>`):''}
    ${d.internships?section('Internship / Training',`<ul>${bullets(d.internships)}</ul>`):''}
    ${section('Education',`<div class="resume-education">${educationLines.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`)}
    ${d.certifications?section('Certifications & Training',`<ul>${bullets(d.certifications)}</ul>`):''}
    ${d.achievements?section('Achievements',`<ul>${bullets(d.achievements)}</ul>`):''}
    ${d.strengths?section('Core Strengths',`<div class="resume-skills">${esc(d.strengths)}</div>`):''}
    ${d.languages?section('Languages',`<div class="resume-skills">${esc(d.languages)}</div>`):''}
  </div>`;
}
function resume(){
  const F={fullName:['Full Name','text','Enter your full name'],mobile:['Mobile Number','tel','10-digit mobile number'],email:['Email ID','email','yourname@example.com'],location:['Current City / State','text','City, State'],careerStatus:['Career Stage','select',''],targetRole:['Target Job Role','text','What job are you applying for?'],industry:['Target Industry / Field','text','Optional'],education:['Education','textarea','Tell us your qualification, course, college/university and year in simple words.'],skills:['Genuine Skills & Tools','textarea','Write the tools, software or skills you actually know. One per line is best.'],languages:['Languages Known','text','Example: Telugu, English'],company:['Company / Organization','text','Where did you actually work?'],jobTitle:['Job Title / Designation','text','What was your actual job title?'],employmentDates:['Employment Period','text','Example: June 2022 - March 2025'],experience:['What did you actually do?','textarea','Explain your real work in your own simple words. Do not worry about resume language.'],projects:['Project / Practical Work','textarea','Tell us what the project was, what you personally did, tools used and the actual result.'],internships:['Internship / Training','textarea','Organization, duration and what you actually did or learned.'],certifications:['Certifications / Training','textarea','Certificate name, issuer and year. Only genuine credentials.'],achievements:['Achievements / Awards','textarea','Only real awards, recognition or measurable achievements.'],linkedin:['LinkedIn / Portfolio','url','Optional: https://...']};
  const T=[['modern','Modern ATS','Clean, recruiter-first and ATS-safe'],['executive','Executive','Premium corporate hierarchy'],['classic','Classic Professional','Formal and traditional'],['creative','Contemporary','Modern visual treatment, still ATS-conscious']];
  const steps=[['Experience','Career stage'],['Design','Choose a template'],['Profile','About you & target job'],['Work','Your real work story'],['Education','Education & skills'],['Proof','Projects & credentials'],['Review','Koutilya writes it']];
  const draft={level:'basic',template:'modern'};let step=0;
  const field=(k,req=false)=>{const [label,type,ph]=F[k];return `<div class="field ${type==='textarea'?'full':''}" data-rf="${k}"><label>${esc(label)}${req?' <span class="required-mark">*</span>':''}</label>${type==='textarea'?`<textarea id="resume_${k}" placeholder="${escAttr(ph)}"></textarea>`:type==='select'?`<select id="resume_${k}"><option value="">Select one</option><option>No Experience</option><option>Less Than 3 Years</option><option>3-5 Years</option><option>5-10 Years</option><option>10+ Years</option><option>Student / Fresher</option><option>Career Changer</option><option>Returning to Work</option><option>Self-Employed / Business</option></select>`:`<input id="resume_${k}" type="${type}" placeholder="${escAttr(ph)}">`}</div>`};
  const roleProfile=()=>{const r=String(draft.targetRole||'').toLowerCase();if(/account|finance|billing|tally/.test(r))return {label:'Accounts / Finance',questions:[['work_q1','What were you responsible for every day?','Example: I did billing, entered sales and purchase bills, and checked accounts.'],['work_q2','Which software or tools did you actually use?','Example: I used Tally and Excel.'],['work_q3','What records, reports or documents did you handle?','Example: I checked bank statements and prepared monthly reports.'],['work_q4','Did you deal with customers, vendors or payments? Tell us what you actually did.','Example: I spoke to customers about pending payments.'],['work_q5','What result, improvement or responsibility are you proud of, if any?','Leave blank if there is nothing specific.']]};if(/sales|business development|marketing/.test(r))return {label:'Sales / Marketing',questions:[['work_q1','What did you sell or promote, and who were the customers?','Example: I sold insurance policies to retail customers.'],['work_q2','How did you find or follow up with customers?','Example: I called leads and followed up with interested customers.'],['work_q3','What did you do during a normal sales day?','Example: I explained products, prepared quotations and followed up.'],['work_q4','Did you use any CRM, software or reporting tools?','Example: I used Excel to maintain customer follow-up records.'],['work_q5','Do you know any genuine sales result or target you achieved?','Only give numbers if you know they are true.']]};if(/developer|software|programmer|web|it|technical|engineer/.test(r))return {label:'Technology / Technical',questions:[['work_q1','What did you build, maintain, test or support?','Example: I worked on a website and fixed issues reported by users.'],['work_q2','Which programming languages, software or tools did you actually use?','Example: I used HTML, CSS and JavaScript.'],['work_q3','What part of the work did you personally handle?','Example: I created the login and registration pages.'],['work_q4','Did you work with a team, clients or users? What did you actually do?','Example: I discussed requirements with the team.'],['work_q5','What real result did your work produce?','Example: The pages were completed and used for the college website.']]};if(/teacher|teaching|trainer|lecturer|education/.test(r))return {label:'Teaching / Education',questions:[['work_q1','Who did you teach or support?','Example: I taught school students in mathematics.'],['work_q2','What subjects or activities did you handle?','Example: I prepared lessons and explained concepts.'],['work_q3','How did you prepare lessons, tests or learning material?','Describe what you actually did.'],['work_q4','How did you communicate with students or parents?','Describe your real interaction.'],['work_q5','Any genuine result or recognition?','Leave blank if none.']]};if(/admin|office|reception|back office|data entry/.test(r))return {label:'Administration / Office',questions:[['work_q1','What office work did you handle every day?','Example: I maintained records and prepared documents.'],['work_q2','Which software or tools did you actually use?','Example: I used MS Word and Excel.'],['work_q3','What records, files, reports or correspondence did you manage?','Describe your actual work.'],['work_q4','Did you coordinate with customers, staff or vendors?','Describe what you actually did.'],['work_q5','Did you handle any important responsibility independently?','Only state what was true.']]};return {label:'General / Role-specific',questions:[['work_q1','What were your main responsibilities?','Tell us what you did every day in simple words.'],['work_q2','Which tools, software or equipment did you actually use?','Only list things you really used.'],['work_q3','Who did you work with or support?','Customers, colleagues, students, vendors, users, etc. - only if applicable.'],['work_q4','What documents, tasks or processes did you handle?','Describe your actual work.'],['work_q5','What real result, responsibility or improvement can you mention?','Leave blank if you do not have one.']]};};
  const fresherProfile=()=>{const r=String(draft.targetRole||'').toLowerCase();if(/developer|software|web|it|technical/.test(r))return [['project_q1','What did you build or work on?','Tell us the project in simple words.'],['project_q2','What part did you personally do?','Be specific about your own contribution.'],['project_q3','Which tools or technologies did you actually use?','Only genuine tools.'],['project_q4','What was the result or purpose of the project?','Tell us what the project achieved or was intended to do.']];if(/account|finance/.test(r))return [['project_q1','What practical accounting work have you done?','Example: I practiced Tally entries and prepared sample reports.'],['project_q2','What did you personally handle?','Tell us the real work you performed.'],['project_q3','Which accounting tools did you actually use?','Only genuine tools.'],['project_q4','What did you learn or complete?','Only factual information.']];return [['project_q1','What project or practical work have you done?','Tell us the project in simple words.'],['project_q2','What did you personally do?','Do not describe work done by someone else.'],['project_q3','Which tools or skills did you actually use?','Only genuine tools.'],['project_q4','What was the actual result or purpose?','Tell us what it achieved or was intended to do.']];};
  content.innerHTML=`<section class="panel resume-builder-v3"><div class="resume-v3-head"><div><span class="eyebrow">KOUTILYA RESUME WRITER</span><h2>Tell Koutilya your story. We write the resume.</h2><p>You answer simple questions in your own words. Koutilya turns those facts into professional resume language and chooses the right sections. No invented facts.</p></div><div class="fee-badge">Final PDF <b>Rs 10</b></div></div><div class="resume-v3-layout"><aside class="resume-v3-sidebar"><div class="resume-v3-side-title">YOUR RESUME</div><div class="resume-v3-progress"><span id="resumeProgressBar"></span></div><div id="resumeStepList">${steps.map((x,i)=>`<button type="button" class="resume-v3-step ${i===0?'active':''}" data-step="${i}"><b>0${i+1}</b><span><strong>${x[0]}</strong><small>${x[1]}</small></span></button>`).join('')}</div><div class="resume-v3-trust"><b>KOUTILYA Koutilya Writer</b><span>Simple answers in. Professional resume out. Suggestions are never treated as facts without your confirmation.</span></div></aside><main class="resume-v3-main"><div class="resume-service-bar"><div><b>Resume service</b><span>Professional writing and PDF generation</span></div><select id="resumeLevel"><option value="basic">Basic</option><option value="standard">Standard</option><option value="advanced">Advanced</option><option value="professional">Professional</option></select></div><input type="hidden" id="resumeTemplate" value="modern"><div class="resume-v3-question"><span id="resumeQuestionKicker">STEP 1 OF 7</span><h3 id="resumeQuestionTitle"></h3><p id="resumeQuestionHelp"></p></div><div id="resumeBuilderBody"></div><div class="resume-v3-nav"><button type="button" class="small-btn" id="resumePrev">Back</button><div><span id="resumeNavHint"></span><button type="button" class="primary" id="resumeNext">Continue -></button></div></div><div id="resumeMsg" class="msg hidden"></div></main><aside class="resume-v3-preview"><div class="resume-v3-preview-head"><div><b>LIVE RESUME PREVIEW</b><span id="resumePreviewStatus">Your document builds as you answer</span></div><span class="preview-lock-badge">Private draft</span></div><div class="resume-preview-lock" id="resumeLivePreview"><div class="resume-empty-preview"><strong>Your professional resume will appear here</strong><span>Answer the questions and Koutilya will write the document automatically.</span></div></div></aside></div></section>`;
  const body=document.getElementById('resumeBuilderBody'),next=document.getElementById('resumeNext'),prev=document.getElementById('resumePrev'),progress=document.getElementById('resumeProgressBar'),preview=document.getElementById('resumeLivePreview'),stepList=document.getElementById('resumeStepList'),kicker=document.getElementById('resumeQuestionKicker'),questionTitle=document.getElementById('resumeQuestionTitle'),questionHelp=document.getElementById('resumeQuestionHelp'),navHint=document.getElementById('resumeNavHint');
  const customKeys=()=>[...document.querySelectorAll('[data-draft-key]')].map(e=>e.dataset.draftKey);
  const capture=()=>{draft.level=document.getElementById('resumeLevel').value;draft.template=document.getElementById('resumeTemplate').value;Object.keys(F).forEach(k=>{const e=document.getElementById('resume_'+k);if(e)draft[k]=e.value.trim();});customKeys().forEach(k=>{const e=document.getElementById('resume_'+k);if(e)draft[k]=e.value.trim();});};
  const restore=()=>{document.getElementById('resumeLevel').value=draft.level;document.getElementById('resumeTemplate').value=draft.template;Object.keys(F).forEach(k=>{const e=document.getElementById('resume_'+k);if(e&&draft[k]!=null)e.value=draft[k];});customKeys().forEach(k=>{const e=document.getElementById('resume_'+k);if(e&&draft[k]!=null)e.value=draft[k];});};
  const snap=()=>{capture();return {...draft};};
  const roleSuggestions=()=>{const r=String(draft.targetRole||'').toLowerCase();if(/account|finance|billing|tally/.test(r))return ['Tally / Accounting Software','MS Excel','Billing & Invoicing','Bank Reconciliation','Record Keeping'];if(/sales|marketing/.test(r))return ['Customer Service','Sales Follow-up','Lead Management','Communication','CRM'];if(/developer|software|it|technical|engineer/.test(r))return ['Programming','Testing','Documentation','Problem Solving','Version Control'];if(/admin|office|reception|data entry/.test(r))return ['MS Office','Documentation','Record Keeping','Coordination','Data Entry'];if(/teacher|teaching|education/.test(r))return ['Lesson Planning','Classroom Support','Communication','Student Support','Documentation'];return ['Communication','Problem Solving','Teamwork','Documentation','Time Management'];};
  const mergeWorkAnswers=()=>{const vals=[];const prof=roleProfile();prof.questions.forEach((q,i)=>{const v=String(draft[q[0]]||'').trim();if(v)vals.push(v);});if(vals.length)draft.experience=vals.join('\n');const pv=fresherProfile();const pvals=[];pv.forEach(q=>{const v=String(draft[q[0]]||'').trim();if(v)pvals.push(v);});if(pvals.length)draft.projects=pvals.join('\n');};
  const updatePreview=()=>{capture();mergeWorkAnswers();const d=buildKoutilyaResume({...draft});if(!Object.values(draft).some(v=>String(v||'').trim()))return;preview.innerHTML=resumePreviewHtml(d);document.getElementById('resumePreviewStatus').textContent='Live - Koutilya is rewriting your answers';};
  const render=()=>{capture();mergeWorkAnswers();stepList.querySelectorAll('.resume-v3-step').forEach((b,i)=>{b.classList.toggle('active',i===step);b.classList.toggle('done',i<step);});progress.style.width=(step/6*100)+'%';kicker.textContent=`STEP ${step+1} OF 7`;prev.disabled=step===0;
    if(step===0){questionTitle.textContent='How long have you been working?';questionHelp.textContent='Choose the closest option. Koutilya will use this only to decide which questions are relevant.';body.innerHTML=`<div class="resume-choice-grid">${['No Experience','Less Than 3 Years','3-5 Years','5-10 Years','10+ Years','Student / Fresher','Career Changer','Returning to Work','Self-Employed / Business'].map(x=>`<button type="button" data-exp="${escAttr(x)}"><strong>${x}</strong><span>${/No Experience|Student/.test(x)?'Starting your career':'Professional experience'}</span></button>`).join('')}</div><div class="resume-choice-foot">This answer is not printed on your resume.</div>`;body.querySelectorAll('[data-exp]').forEach(b=>{if(b.dataset.exp===draft.careerStatus)b.classList.add('selected');b.addEventListener('click',()=>{draft.careerStatus=b.dataset.exp;body.querySelectorAll('[data-exp]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');updatePreview();});});
    }else if(step===1){questionTitle.textContent='Choose your resume design';questionHelp.textContent='Choose a professional look. The content is written by Koutilya separately from the design.';body.innerHTML=`<div class="resume-template-grid resume-v3-template-grid">${T.map(x=>`<button type="button" class="resume-template-card ${x[0]===draft.template?'selected':''}" data-template="${x[0]}"><span class="template-mini template-mini-${x[0]}"><i></i><b></b><em></em><em></em><em></em></span><strong>${x[1]}</strong><small>${x[2]}</small></button>`).join('')}</div>`;body.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>{draft.template=b.dataset.template;body.querySelectorAll('[data-template]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');updatePreview();}));
    }else if(step===2){questionTitle.textContent='Tell us about yourself and the job you want';questionHelp.textContent='Answer normally. You do not need to know resume language. Koutilya will write the heading and target-focused summary.';body.innerHTML=`<div class="resume-interview-card"><div class="form-grid">${['fullName','mobile','email','location','targetRole','industry'].map((k,i)=>field(k,i<5)).join('')}</div><div class="resume-assist-note"><b>Write naturally</b><span>For example, enter your real job title or target role. Koutilya will handle professional capitalization and wording.</span></div></div>`;
    }else if(step===3){const status=String(draft.careerStatus||'').toLowerCase(),work=!/no experience|student|fresher/.test(status);if(work){const rp=roleProfile();questionTitle.textContent=`Tell us about your work as ${draft.targetRole||'a professional'}`;questionHelp.textContent=`Koutilya has tailored these questions for ${rp.label}. Give simple factual answers. You don't need to write bullets.`;body.innerHTML=`<div class="resume-interview-card"><div class="form-grid">${['company','jobTitle','employmentDates'].map(k=>field(k,true)).join('')}</div><div class="resume-question-stack">${rp.questions.map((q,i)=>`<div class="simple-question"><label>${i+1}. ${esc(q[1])}<span class="required-mark">*</span></label><textarea id="resume_${q[0]}" data-draft-key="${q[0]}" placeholder="${escAttr(q[2])}"></textarea></div>`).join('')}</div><div class="resume-assist-note"><b>What Koutilya does</b><span>Your answers are facts. Koutilya will turn them into clear, professional achievement-style bullets without adding anything you did not say.</span></div><div id="resumeKoutilyaDraft" class="resume-koutilya-draft"></div></div>`;}else{questionTitle.textContent=`Tell us about your real project or practical work`;questionHelp.textContent='A fresher resume needs evidence. Answer these simple questions about something you actually did.';const qs=fresherProfile();body.innerHTML=`<div class="resume-interview-card"><div class="resume-question-stack">${qs.map((q,i)=>`<div class="simple-question"><label>${i+1}. ${esc(q[1])}<span class="required-mark">*</span></label><textarea id="resume_${q[0]}" data-draft-key="${q[0]}" placeholder="${escAttr(q[2])}"></textarea></div>`).join('')}</div><div class="resume-mini-field">${field('internships',false)}</div><div class="resume-assist-note"><b>Don't worry about wording</b><span>Even if your answer is one or two simple sentences, Koutilya will rewrite it professionally.</span></div><div id="resumeKoutilyaDraft" class="resume-koutilya-draft"></div></div>`;}}
    else if(step===4){questionTitle.textContent='What did you study and what do you genuinely know?';questionHelp.textContent='Koutilya can suggest skills for your target role. You decide which ones are actually true for you.';body.innerHTML=`<div class="resume-interview-card"><div class="form-grid">${['education','skills','languages'].map(k=>field(k,true)).join('')}</div><div class="resume-suggestion-box"><div><b>Possible skills for ${esc(draft.targetRole||'your target role')}</b><span>Click + only for skills you genuinely have. Added suggestions become part of your factual draft.</span></div><div id="resumeSkillSuggestions">${roleSuggestions().map(x=>`<button type="button" class="resume-suggestion" data-skill="${escAttr(x)}">+ ${esc(x)}</button>`).join('')}</div></div></div>`;body.querySelectorAll('[data-skill]').forEach(b=>b.addEventListener('click',()=>{const ta=document.getElementById('resume_skills');const vals=ta.value.split(/[\n,]/).map(x=>x.trim().toLowerCase()).filter(Boolean);if(!vals.includes(b.dataset.skill.toLowerCase()))ta.value=ta.value.trim()?(ta.value.trim()+'\n'+b.dataset.skill):b.dataset.skill;b.classList.add('added');b.textContent='OK '+b.dataset.skill;capture();updatePreview();}));
    }else if(step===5){questionTitle.textContent='What else proves your value?';questionHelp.textContent='Add only genuine projects, internships, certifications, awards and links. Koutilya will select and format the useful sections.';body.innerHTML=`<div class="resume-interview-card"><div class="form-grid">${['certifications','achievements','linkedin'].map(k=>field(k,false)).join('')}</div><div class="resume-quality-rule"><b>No filler and no invented content</b><span>If you don't have a certification or award, leave it blank. Koutilya will not create content simply to fill the page.</span></div></div>`;
    }else{const d=buildKoutilyaResume(snap());questionTitle.textContent='Review the resume Koutilya has written';questionHelp.textContent='This is where you check the facts. If something is wrong, go back and change your simple answers. The professional wording is generated from those answers.';body.innerHTML=`<div class="resume-final-review"><div class="resume-final-check"><b>FACT CHECK</b><span>Every employer, qualification, responsibility, project, certification and achievement must come from information you supplied or explicitly accepted.</span></div><div class="resume-review-grid"><div><strong>Target role</strong><span>${esc(d.targetRole||'-')}</span></div><div><strong>Design</strong><span>${esc(resumeTemplateName(d.template))}</span></div><div><strong>Writing</strong><span>Koutilya professional rewriting</span></div><div><strong>PDF fee</strong><span>Rs 10 after successful generation</span></div></div><div class="resume-written-explain"><b>How your answers become a resume</b><p>Koutilya removes casual wording, groups related facts, improves sentence structure, uses professional action language where supported by your facts, and leaves unsupported claims out.</p></div></div>`;next.textContent='Generate Final PDF - Rs 10';navHint.textContent='Rs 10 is deducted only after the PDF is created successfully.';updatePreview();return;}
    next.textContent='Continue ->';navHint.textContent=step===0?'Choose one option to continue.':'Your answers stay in this private draft.';restore();body.querySelectorAll('input,select,textarea').forEach(e=>e.addEventListener('input',()=>{capture();mergeWorkAnswers();updatePreview();}));updatePreview();
    const kd=document.getElementById('resumeKoutilyaDraft');if(kd){const d=buildKoutilyaResume({...draft});const lines=String(d.experience||d.projects||'').split('\n').filter(Boolean).slice(0,5);if(lines.length)kd.innerHTML=`<div class="resume-koutilya-draft-head"><b>KOUTILYA Koutilya wording preview</b><span>This is generated from your answers; nothing here is added as a fact automatically.</span></div><ul>${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;}}
  const validate=()=>{const d=snap();mergeWorkAnswers();const status=String(d.careerStatus||'').toLowerCase(),missing=[];if(step===0&&!d.careerStatus)missing.push('career stage');if(step===2){[['fullName','Full Name'],['mobile','Mobile Number'],['email','Email ID'],['location','City / Location'],['targetRole','Target Job Role']].forEach(x=>{if(!d[x[0]])missing.push(x[1]);});}if(step===3){const work=!/no experience|student|fresher/.test(status);if(work){[['company','Company / Organization'],['jobTitle','Job Title / Designation'],['employmentDates','Employment Period']].forEach(x=>{if(!d[x[0]])missing.push(x[1]);});const rp=roleProfile();rp.questions.forEach(q=>{if(!String(d[q[0]]||'').trim()&&q[0]!=='work_q5')missing.push(`answer to question ${rp.questions.indexOf(q)+1}`);});if(String(d.experience||'').trim().length<100)missing.push('a little more detail about your actual work');}else{const qs=fresherProfile();qs.forEach(q=>{if(!String(d[q[0]]||'').trim())missing.push(`answer to question ${qs.indexOf(q)+1}`);});}}if(step===4){[['education','Education'],['skills','Genuine Skills'],['languages','Languages Known']].forEach(x=>{if(!d[x[0]])missing.push(x[1]);});}if(missing.length){showMsg('resumeMsg','Before continuing, Koutilya needs '+missing.join(', ')+'. This helps produce a real professional resume instead of simply printing a short form.','err');return false;}return true;};
  prev.addEventListener('click',()=>{capture();mergeWorkAnswers();if(step){step--;render();}});stepList.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{const t=Number(b.dataset.step);if(t<=step){capture();mergeWorkAnswers();step=t;render();}}));next.addEventListener('click',async()=>{if(step<6){if(!validate())return;capture();mergeWorkAnswers();step++;render();}else{await generateResumeFromBuilder(snap());}});document.getElementById('resumeLevel').addEventListener('change',()=>{capture();updatePreview();});render();
}
async function generateResumeFromBuilder(data){
  const written=buildKoutilyaResume(data);content.innerHTML=`<section class="panel resume-preview-panel"><div class="panel-head"><div><span class="eyebrow">KOUTILYA RESUME WRITER  |  FINAL REVIEW</span><h2>Your professionally written resume</h2><p>Koutilya has written and structured the resume from your supplied facts. Correct anything factual before generating the paid PDF.</p></div><div class="resume-preview-actions"><button class="small-btn" id="editResume">EDIT Edit Answers</button><button class="primary" id="generateResume">Generate PDF - Rs 10</button></div></div><div class="resume-preview-toolbar"><div><b>${resumeTemplateName(written.template)} template</b><span>Recruiter-focused  |  ATS-conscious  |  No Koutilya branding in the downloaded resume</span></div><button class="small-btn" id="changeTemplate">Change design</button></div><div class="resume-writer-note"><b>KOUTILYA Written by Koutilya</b><span>Professional wording is derived only from the facts you supplied. Suggestions had to be explicitly added by you.</span></div><div class="resume-preview-lock" id="resumePreview">${resumePreviewHtml(written)}</div><div id="resumeGenerateMsg" class="msg hidden"></div></section>`;
  document.getElementById('editResume').addEventListener('click',()=>resume());document.getElementById('changeTemplate').addEventListener('click',()=>resume());const preview=document.getElementById('resumePreview');['contextmenu','selectstart','dragstart','copy','cut'].forEach(ev=>preview.addEventListener(ev,e=>e.preventDefault()));preview.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['c','x','u','s','p','a'].includes(String(e.key).toLowerCase()))e.preventDefault();});document.getElementById('generateResume').addEventListener('click',async()=>{const btn=document.getElementById('generateResume');btn.disabled=true;showMsg('resumeGenerateMsg','Generating final PDF... Rs 10 will be deducted only after successful PDF generation.','info');try{const j=await api('/api/resume/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const bytes=Uint8Array.from(atob(j.pdfBase64),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=j.filename||'Resume.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);showMsg('resumeGenerateMsg',`Resume generated successfully. Rs ${Number(j.amount||10).toFixed(2)} deducted. Wallet balance: Rs ${Number(j.walletBalance||0).toFixed(2)}.`,'ok');}catch(e){showMsg('resumeGenerateMsg',e.message,'err');}finally{btn.disabled=false;}});
}
function readResumeData(){const ids=['fullName','mobile','email','location','careerStatus','targetRole','education','skills','industry','company','jobTitle','employmentDates','experience','projects','internships','certifications','achievements','languages','linkedin'];const data={level:document.getElementById('resumeLevel').value,template:document.getElementById('resumeTemplate').value};ids.forEach(k=>{const el=document.getElementById('resume_'+k);if(el)data[k]=el.value.trim();});const photo=document.getElementById('resumePhoto');if(photo?.files?.[0])return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{data.photo=r.result;resolve(data)};r.onerror=reject;r.readAsDataURL(photo.files[0]);});return Promise.resolve(data);}
async function showResumePreview(){
  const raw=await readResumeData();const missing=[];for(const [k,label] of [['fullName','Full Name'],['mobile','Mobile Number'],['email','Email ID'],['location','City / Location'],['careerStatus','Career Status'],['targetRole','Target Job Role'],['education','Education'],['skills','Skills / Things You Know'],['languages','Languages Known']])if(!raw[k])missing.push(label);
  const status=String(raw.careerStatus||'').toLowerCase();const needsWork=/experienced|currently working|career changer|returning to work|self-employed|business/.test(status);const needsEntry=/fresher|student|entry/.test(status);
  if(needsWork){if(!raw.company)missing.push('Company / Organization');if(!raw.jobTitle)missing.push('Job Title / Designation');if(!raw.employmentDates)missing.push('Employment Period');if(!raw.experience)missing.push('Work Experience / Responsibilities');}
  if(needsEntry&&!raw.projects&&!raw.internships)missing.push('At least one real Project / Practical Work or Internship / Training');
  if(missing.length){showMsg('resumeMsg','Koutilya needs these details before it can write a credible resume: '+missing.join(', ')+'.','err');return;}
  const data=buildKoutilyaResume(raw);content.innerHTML=`<section class="panel resume-preview-panel"><div class="panel-head"><div><span class="eyebrow">KOUTILYA RESUME WRITER  |  WRITTEN & DESIGNED</span><h2>Your Resume Preview</h2><p>Koutilya has written the resume from the facts you supplied. Check the facts, wording and design before generating the paid PDF.</p></div><div class="resume-preview-actions"><button class="small-btn" id="editResume">EDIT Edit Answers</button><button class="primary" id="generateResume">Generate PDF - Rs 10</button></div></div><div class="resume-preview-toolbar"><div><b>${resumeTemplateName(data.template)} template</b><span>Recruiter-focused  |  ATS-conscious  |  No Koutilya branding in the downloaded resume</span></div><button class="small-btn" id="changeTemplate">Change design</button></div><div class="resume-writer-note"><b>KOUTILYA Written by Koutilya</b><span>Professional wording is generated only from the facts you supplied. If a project, achievement or credential was not provided, it is not invented.</span></div><div class="resume-preview-lock" id="resumePreview">${resumePreviewHtml(data)}</div><div id="resumeGenerateMsg" class="msg hidden"></div></section>`;
  document.getElementById('editResume').addEventListener('click',()=>resume());document.getElementById('changeTemplate').addEventListener('click',()=>resume());
  const preview=document.getElementById('resumePreview');['contextmenu','selectstart','dragstart','copy','cut'].forEach(ev=>preview.addEventListener(ev,e=>e.preventDefault()));preview.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['c','x','u','s','p','a'].includes(String(e.key).toLowerCase()))e.preventDefault();});preview.setAttribute('oncontextmenu','return false');preview.setAttribute('onselectstart','return false');
  document.getElementById('generateResume').addEventListener('click',async()=>{const btn=document.getElementById('generateResume');btn.disabled=true;showMsg('resumeGenerateMsg','Generating your final PDF... Rs 10 will be deducted only after successful PDF generation.','info');try{const j=await api('/api/resume/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const bytes=Uint8Array.from(atob(j.pdfBase64),c=>c.charCodeAt(0));const blob=new Blob([bytes],{type:'application/pdf'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=j.filename||'Resume.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);showMsg('resumeGenerateMsg',`Resume generated successfully. Rs ${Number(j.amount||10).toFixed(2)} deducted. Wallet balance: Rs ${Number(j.walletBalance||0).toFixed(2)}.`,'ok');}catch(e){showMsg('resumeGenerateMsg',e.message,'err');}finally{btn.disabled=false;}});
}

async function alerts(){
 content.innerHTML=`<section class="panel alerts-dashboard">
  <div class="panel-head">
   <div>
    <span class="eyebrow">KOUTILYA ALERTS</span>
    <h2>Jobs, Exams & Education Notifications</h2>
    <p>Select a notification to open the official portal directly.</p>
   </div>
  </div>
  <div class="alert-toolbar">
   <div class="alert-toolbar-title"><strong>Notifications</strong><span id="alertCountLabel"></span></div>
   <input id="alertSearch" type="search" placeholder="Search notifications...">
  </div>
  <div id="alertList" class="alert-source-grid"><div class="empty-state">Loading notifications...</div></div>
 </section>`;
 try{
  const j=await api('/api/alerts');
  const sources=(j.sources||[]).filter(s=>s&&s.active!==false&&s.officialUrl);
  const notes=j.notifications||[];
  alertCountLabel.textContent=`  |  ${notes.length} available`;
  const render=()=>{
   const q=(alertSearch.value||'').trim().toLowerCase();
   const rows=sources.filter(s=>!q||[s.name,s.scope,s.type].some(v=>String(v||'').toLowerCase().includes(q)));
   alertCountLabel.textContent=`  |  ${rows.length} available`;
   alertList.innerHTML=rows.map(s=>{
    const label=/notification$/i.test(s.name)?s.name:`${s.name} Notification`;
    return `<a class="alert-source-btn" href="${escAttr(s.officialUrl)}" target="_blank" rel="noopener noreferrer"><span>${esc(label)}</span><b aria-hidden="true">></b></a>`;
   }).join('')||'<div class="empty-state">No matching notifications found.</div>';
  };
  alertSearch.addEventListener('input',render);
  render();
 }catch(e){alertList.innerHTML=`<div class="empty-state">${esc(e.message||'Unable to load notifications.')}</div>`;}
}
function services(){
  content.innerHTML=`
    <section class="meeseva-page">

      <div class="meeseva-hero">
        <div class="meeseva-hero-main">
          <span class="eyebrow">CITIZEN SERVICES</span>
          <h1>MeeSeva Applications</h1>
          <p>Apply for certificates, licenses and various government services.</p>

          <div class="meeseva-toolbar">
            <div class="meeseva-search">
              <input id="meesevaSearch" type="search" placeholder="Search applications...">
              <span>⌕</span>
            </div>

            <select id="meesevaCategory">
              <option value="">All Categories</option>
              <option value="certificate">Certificates</option>
              <option value="registration">Registrations</option>
              <option value="aadhaar">Aadhaar</option>
            </select>

            <select id="meesevaState">
              <option value="">All States</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Telangana">Telangana</option>
              <option value="Other">Other States</option>
            </select>
          </div>
        </div>

        <div class="meeseva-trust">
          <h3>Empowering<br>Citizens Digitally</h3>
          <p>All Government & Citizen Services<br>in One Place</p>
          <div class="trust-row"><b>⚡</b><span>Fast</span></div>
          <div class="trust-row"><b>♢</b><span>Secure</span></div>
          <div class="trust-row"><b>●</b><span>Reliable</span></div>
          <div class="trust-row"><b>♥</b><span>Citizen First</span></div>
        </div>
      </div>

      <div class="meeseva-grid" id="meesevaGrid"></div>

      <footer class="meeseva-footer">
        <span>Koutilya Digital Platform</span>
        <i>|</i>
        <span>Simple</span>
        <i>|</i>
        <span>Secure</span>
        <i>|</i>
        <span>Reliable</span>
        <i>|</i>
        <span>Citizen First</span>
      </footer>

    </section>
  `;

  const grid=document.getElementById('meesevaGrid');
  const search=document.getElementById('meesevaSearch');
  const category=document.getElementById('meesevaCategory');
  const stateFilter=document.getElementById('meesevaState');

  function categoryFor(k){
    if(k==='death'||k==='late-birth') return 'registration';
    if(k==='seeding') return 'aadhaar';
    return 'certificate';
  }

  function render(){
    const q=(search.value||'').trim().toLowerCase();
    const cat=category.value;
    const rows=meeseva.filter(([k,t])=>{
      const matchText=!q||t.toLowerCase().includes(q);
      const matchCat=!cat||categoryFor(k)===cat;
      return matchText&&matchCat;
    });

    grid.innerHTML=rows.map(([k,t])=>`
      <article class="meeseva-card" data-service="${esc(k)}">
        <div class="meeseva-icon">${({death:"D", "late-birth":"B", income:"IN", ews:"EWS", obc:"OBC", "caste-integrated":"CI", "family-member":"FM", seeding:"PA"})[k] || "SV"}</div>
        <h3>${esc(t)}</h3>
        <p>Apply for ${esc(t)}</p>
        <button type="button">Apply Now <span>→</span></button>
      </article>
    `).join('') || '<div class="meeseva-empty">No matching applications found.</div>';

    grid.querySelectorAll('[data-service]').forEach(card=>{
      card.addEventListener('click',()=>{
        const row=meeseva.find(y=>y[0]===card.dataset.service);
        if(row){
          openFormWorkspace(
            row[2],
            row[0],
            row[1],
            2,
            meesevaChecklists[row[0]]||[],
            'meeseva'
          );
        }
      });
    });
  }

  search.addEventListener('input',render);
  category.addEventListener('change',render);
  stateFilter.addEventListener('change',render);

  render();
}
function affidavits(){const cats=[...new Set(state.services.map(x=>x.category).filter(Boolean))].sort();const depts=[...new Set(state.services.flatMap(x=>x.departments||[]).filter(Boolean))].sort();const states=['Andhra Pradesh','Telangana','Other States / Authorities'];content.innerHTML=`<section class="panel"><div class="panel-head"><div><span class="eyebrow">AFFIDAVITS & DECLARATIONS</span><h2>Prepare the documents for your case</h2><p>Select the authority area and service. Koutilya uses the service and your case facts to determine the applicable document package.</p></div><div class="fee-badge">Service fee <b>Rs 5</b></div></div><div class="toolbar"><input id="affSearch" placeholder="Search service or purpose..."><select id="affDept"><option value="">All departments</option>${depts.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select id="affState"><option value="">All states / authorities</option>${states.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select id="affCat"><option value="">All categories</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="aff-guidance"><b>You do not need to decide which affidavit or declaration is required.</b> Choose the service that describes your case and provide the facts requested. The final checklist and document package are determined by the service rules. Authority-prescribed formats are used only when verified.</div><div id="affGrid" class="service-grid affidavit-grid"></div></section>`;const render=()=>{const q=affSearch.value.toLowerCase(),c=affCat.value,d=affDept.value,st=affState.value;const rows=state.services.filter(x=>(!q||((x.title||'')+' '+(x.category||'')+' '+(x.purpose||'')).toLowerCase().includes(q))&&(!c||x.category===c)&&(!d||(x.departments||[]).includes(d))&&(!st||(x.jurisdictions||[]).some(j=>j===st||j.includes(st))));affGrid.innerHTML=rows.map(x=>`<div class="service" data-aff="${esc(x.id)}"><div class="ico purple">RW</div><strong>${esc(x.title)}</strong><span>${esc((x.departments||[]).join('  |  '))}<br>${esc(x.purpose||'Case-specific document preparation')}</span><em>Rs 5 on PDF generation</em></div>`).join('')||'<div class="empty-state">No matching document services found.</div>';affGrid.querySelectorAll('[data-aff]').forEach(x=>x.addEventListener('click',()=>openAff(x.dataset.aff)));};affSearch.addEventListener('input',render);affCat.addEventListener('change',render);affDept.addEventListener('change',render);affState.addEventListener('change',render);render();}
function openAff(id){const item=state.services.find(x=>x.id===id);let url='/forms/universal-affidavit.html?id='+encodeURIComponent(id);if(id==='late-death-registration')url='/forms/death-affidavit.html';if(id==='family-member')url='/forms/family-member-affidavit.html';if(id==='one-same-person')url='/forms/one-same-person-affidavit.html';if(id==='name-difference')url='/forms/name-difference-affidavit.html';openFormWorkspace(url,id,item?.title||'Affidavit / Declaration',5,item?.checklist||[], 'affidavit');}
function openFormWorkspace(url,key,title,fee,checklistItems,type){content.innerHTML=`<section class="panel form-panel"><div class="panel-head"><div><span class="eyebrow">${type==='affidavit'?'AFFIDAVIT / DECLARATION':'MEESEVA APPLICATION'}</span><h2>${esc(title)}</h2><p>Complete the form on the left. Keep the listed documents ready before proceeding.</p></div><button class="small-btn" id="backForm">Back</button></div><div class="form-workspace"><div class="iframe-wrap"><iframe id="serviceFrame" src="${url}" title="${esc(title)}"></iframe></div><aside class="requirements"><div class="requirements-head"><div class="req-icon">OK</div><div><h3>Documents to Keep Ready</h3><span>Guidance for this service</span></div></div><ul>${(checklistItems.length?checklistItems:['Original supporting records relevant to this service','Identity proof','Address proof','Authority-specific form or annexure, if prescribed']).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><div class="fee-card"><span>Service fee</span><strong>Rs ${fee}</strong><small>Deducted from Wallet only when PDF is generated.</small></div><div class="req-note"><b>Important</b><br>Requirements can vary by the receiving authority. Carry originals and copies where applicable and verify the current requirements before signing or submitting.</div></aside></div></section>`;document.getElementById('backForm').addEventListener('click',()=>navigate(type==='affidavit'?'affidavits':'services'));prepareEmbeddedFrame(document.getElementById('serviceFrame'),type);}
function prepareEmbeddedFrame(frame,type){frame.addEventListener('load',()=>{try{const doc=frame.contentDocument;if(!doc)return;const s=doc.createElement('style');s.textContent=`html,body{width:100%!important;min-width:0!important;background:#f5f8fc!important;margin:0!important;padding:0!important}body{overflow-x:hidden!important}.portal-header,.portal-footer,.portal-nav,.portal-header-inner,.portal-main>header,body>header,body>footer,.portal-back,.back{display:none!important}.portal-page{padding:0!important;margin:0!important}.container{width:100%!important;max-width:none!important;margin:0!important;padding:22px 24px 42px!important;background:transparent!important;box-shadow:none!important;border-radius:0!important}.container>.card,.container .card{width:100%!important;max-width:none!important;margin:0!important}form{width:100%!important;max-width:none!important}.grid,.form-grid{width:100%!important}input,select,textarea{max-width:none!important}h1{margin-top:0!important}${type==='affidavit'?'.side,#checklist{display:none!important}':''}@media(max-width:760px){.container{padding:16px 12px 30px!important}.grid,.form-grid{grid-template-columns:1fr!important}}`;doc.head.appendChild(s);doc.documentElement.classList.add('kspl-embedded');}catch(e){console.warn(e);}});}
function wallet(){content.innerHTML=`<section class="panel"><div class="panel-head"><div><span class="eyebrow">SECURE WALLET</span><h2>Wallet</h2><p>Add money through Cashfree and use the balance for citizen service fees.</p></div></div><div class="wallet-hero"><div><span>Available Balance</span><strong id="walletBal">Rs 0.00</strong></div><div class="wallet-badge">Cashfree Secure Checkout</div></div><div class="topup-box"><div class="field"><label>Top-up Amount</label><input id="topupAmount" type="number" min="50" max="100000" step="1" placeholder="Minimum Rs 50"></div><div class="amounts"><button type="button" data-amt="100">Rs 100</button><button type="button" data-amt="250">Rs 250</button><button type="button" data-amt="500">Rs 500</button><button type="button" data-amt="1000">Rs 1,000</button></div><button class="primary" id="topup">Add Money to Wallet</button><div id="walletMsg" class="msg hidden"></div></div></section><section class="panel"><div class="panel-head"><h2>Wallet Transactions</h2></div><div id="walletTx"></div></section>`;document.querySelectorAll('[data-amt]').forEach(b=>b.addEventListener('click',()=>{topupAmount.value=b.dataset.amt;}));topup.addEventListener('click',doTopup);loadWallet();}
async function loadWallet(){try{const j=await api('/api/wallet');walletBal.textContent='Rs '+j.balance.toFixed(2);walletTx.innerHTML=table(j.transactions);}catch(e){toast(e.message,true)}}
async function doTopup(){const amount=Number(topupAmount.value);if(!Number.isFinite(amount)||amount<50){showMsg('walletMsg','Minimum wallet top-up amount is Rs 50. Please enter Rs 50 or more.','err');topupAmount.focus();return;}showMsg('walletMsg','Creating secure Cashfree payment...','info');try{const j=await api('/api/wallet/topup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount})});const cf=window.Cashfree({mode:j.environment==='production'?'production':'sandbox'});await cf.checkout({paymentSessionId:j.paymentSessionId,redirectTarget:'_self'});}catch(e){showMsg('walletMsg',e.message,'err')}}
function table(rows){if(!rows?.length)return'<div class="empty-state">No transactions yet.</div>';return`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${new Date(x.createdAt).toLocaleString()}</td><td>${esc(x.description||'')}</td><td class="${x.direction==='credit'?'credit':'debit'}">${x.direction==='credit'?'+':'-'}Rs ${Number(x.amount).toFixed(2)}</td><td>${esc(x.status||'')}</td></tr>`).join('')}</tbody></table></div>`}
function transactions(){content.innerHTML=`<section class="panel"><div class="panel-head"><div><span class="eyebrow">HISTORY</span><h2>Transactions</h2><p>Search service fees, wallet top-ups and refunds by date.</p></div></div><div class="date-search"><div class="field"><label>From date</label><input id="from" type="date"></div><div class="field"><label>To date</label><input id="to" type="date"></div><button class="small-btn" id="searchTx">Search</button></div><div id="tx" class="transaction-result"></div></section>`;searchTx.addEventListener('click',loadTx);loadTx();}
async function loadTx(){try{const j=await api('/api/portal/transactions?from='+encodeURIComponent(from.value||'')+'&to='+encodeURIComponent(to.value||''));tx.innerHTML=table(j.transactions);}catch(e){toast(e.message,true)}}
function complaint(){content.innerHTML=`<section class="panel"><div class="panel-head"><div><span class="eyebrow">CITIZEN SUPPORT</span><h2>Raise a Complaint</h2><p>Submit your issue to Admin. The SR number is assigned after Admin resolves the complaint.</p></div></div><form id="complaintForm"><div class="form-grid"><div class="field full"><label>Subject</label><input id="subject" required></div><div class="field full"><label>Complaint / Query</label><textarea id="complaintText" required placeholder="Describe your issue or query"></textarea></div></div><button class="primary compact-btn" type="submit">Submit Complaint</button></form><div id="cmpMsg" class="msg hidden"></div></section><section class="panel"><div class="panel-head"><h2>My Complaints</h2></div><div id="myComplaints"></div></section>`;complaintForm.addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/portal/complaints',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:subject.value,message:complaintText.value})});showMsg('cmpMsg',j.message,'ok');complaintForm.reset();await loadMyComplaints();}catch(err){showMsg('cmpMsg',err.message,'err')}});loadMyComplaints()}
async function loadMyComplaints(){try{const j=await api('/api/portal/complaints');myComplaints.innerHTML=j.complaints.length?j.complaints.map(c=>`<article class="citizen-complaint"><div><b>${esc(c.subject||'Complaint')}</b><span class="status-pill ${c.status==='RESOLVED'?'resolved':'open'}">${esc(c.status)}</span></div><p>${esc(c.message)}</p><small>${new Date(c.createdAt).toLocaleString()}${c.status==='RESOLVED'&&c.sr?`  |  SR Number: <b>${esc(c.sr)}</b>`:''}</small>${c.resolution?`<div class="resolution-box"><b>Admin Resolution</b><div>${esc(c.resolution)}</div></div>`:''}</article>`).join(''):'<div class="empty-state">No complaints yet.</div>'}catch(e){myComplaints.innerHTML='<div class="empty-state">Unable to load complaints.</div>'}}
function profile(){content.innerHTML=`<section class="panel profile-panel"><div class="panel-head"><div><span class="eyebrow">MY ACCOUNT</span><h2>Profile</h2><p>Your registered citizen details.</p></div></div><div class="profile-grid"><div class="profile-item"><span>Registered Name</span><strong>${esc(state.user.name)}</strong></div><div class="profile-item"><span>User ID</span><strong>${esc(state.user.userId)}</strong></div><div class="profile-item"><span>Email ID</span><strong>${esc(state.user.email)}</strong></div><div class="profile-item"><span>Mobile Number</span><strong>${esc(state.user.mobile)}</strong></div><div class="profile-item"><span>City</span><strong>${esc(state.user.city)}</strong></div></div></section>`}
function password(){content.innerHTML=`<section class="panel narrow-panel"><div class="panel-head"><div><span class="eyebrow">SECURITY</span><h2>Change Password</h2><p>Choose a strong password you do not use elsewhere.</p></div></div><form id="pwForm"><div class="field"><label>Current Password</label><input id="cur" type="password" required></div><div class="field"><label>New Password</label><input id="newp" type="password" minlength="8" required></div><div class="field"><label>Confirm New Password</label><input id="conf" type="password" minlength="8" required></div><button class="primary compact-btn" type="submit">Change Password</button></form><div id="pwMsg" class="msg hidden"></div></section>`;pwForm.addEventListener('submit',async e=>{e.preventDefault();try{const j=await api('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:cur.value,newPassword:newp.value,confirmPassword:conf.value})});showMsg('pwMsg',j.message,'ok');setTimeout(auth,1800);}catch(err){showMsg('pwMsg',err.message,'err')}})}
async function logout(){try{await api('/api/auth/logout',{method:'POST'});}finally{localStorage.removeItem('kspl_auth_token');state.user=null;auth();}}
/* id-card-maker-module: 25 professional ID card designs */
function idcards(){
const cats=[
 {id:'students',name:'School Students',sub:'School / Student Identity Cards',fields:['Student Name','Admission / ID No.','Class / Section','Date of Birth','Father / Guardian Name','Blood Group','Mobile Number','School Name','School Address','Academic Year','Valid Upto']},
 {id:'college',name:'College Students',sub:'College / University Identity Cards',fields:['Student Name','College ID No.','Course / Branch','Year / Semester','Date of Birth','Father / Guardian Name','Blood Group','Mobile Number','College Name','College Address','Academic Year','Valid Upto']},
 {id:'government',name:'Government Employees',sub:'Government Department Employee Cards',fields:['Employee Name','Employee ID','Designation','Department','Date of Birth','Date of Joining','Blood Group','Mobile Number','Office Name','Office Address','Valid Upto']},
 {id:'corporate',name:'Corporate Employees',sub:'Corporate / Company Employee Cards',fields:['Employee Name','Employee ID','Designation','Department','Date of Joining','Blood Group','Mobile Number','Email','Company Name','Office Address','Valid Upto']},
 {id:'private',name:'Private Employees',sub:'Private Company Employee Cards',fields:['Employee Name','Employee ID','Designation','Department','Date of Joining','Blood Group','Mobile Number','Email','Company Name','Office Address','Valid Upto']}
];

/* Five distinct visual backgrounds. Each is used for every category, giving 25 combinations. */
const designs=[
 {id:'wave',name:'Blue Wave',desc:'Blue curved professional background'},
 {id:'red',name:'Red Executive',desc:'Red and white executive background'},
 {id:'green',name:'Green Secure',desc:'Green institutional background'},
 {id:'purple',name:'Purple Premium',desc:'Purple premium background'},
 {id:'gold',name:'Black Gold',desc:'Black and gold executive background'}
];

const FEE=5;
let catId='students',designId='wave',photoData='',logoData='',signatureData='',paid=false,side='front';
const values={};

content.innerHTML=`
<section class="panel id-card-maker-module">
<style>
.id-card-maker-module{max-width:1180px}
.idc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:16px}
.idc-head h2{margin:0 0 5px}.idc-head p{margin:0;opacity:.72}
.idc-grid{display:grid;grid-template-columns:210px 1fr;gap:15px}
.idc-cats,.idc-main,.idc-preview-panel{border:1px solid #d2dfec;border-radius:14px;background:#fff}
.idc-cats{padding:10px;height:max-content}
.idc-cat{display:block;width:100%;text-align:left;border:0;background:#f7faff;border-radius:9px;padding:11px;margin-bottom:6px;cursor:pointer}
.idc-cat.active{background:#e4f2ff;box-shadow:inset 3px 0 #1677d2}
.idc-cat strong,.idc-cat span{display:block}.idc-cat span{font-size:10px;opacity:.62;margin-top:3px}
.idc-main{padding:15px}.idc-main h3{margin:0 0 10px}
.idc-upload-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:13px}
.idc-upload{border:1px dashed #b6cce0;border-radius:9px;padding:10px;background:#fbfdff}
.idc-upload label{display:block;font-size:11px;font-weight:800;margin-bottom:6px}.idc-upload input{width:100%;font-size:10px}
.idc-upload small{display:block;margin-top:4px;font-size:9px;opacity:.62}
.idc-fields{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.idc-field label{display:block;font-size:10px;font-weight:700;margin-bottom:4px}
.idc-field input{width:100%;box-sizing:border-box;padding:9px;border:1px solid #c9d8e6;border-radius:7px}
.idc-full{grid-column:1/-1}
.idc-designs{margin-top:14px}.idc-designs h3{margin-bottom:9px}
.idc-design-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.idc-design{border:1px solid #cbd9e7;border-radius:8px;padding:7px;background:#fff;cursor:pointer}
.idc-design.active{border:2px solid #1474c9;padding:6px}
.idc-mini{height:58px;border-radius:6px;position:relative;overflow:hidden;border:1px solid #d5dee7}
.idc-mini.wave{background:linear-gradient(155deg,#075a9b 0 42%,#fff 43% 63%,#16a3df 64% 75%,#073f75 76%)}
.idc-mini.red{background:linear-gradient(155deg,#8e1724 0 43%,#fff 44% 64%,#d64a55 65% 76%,#71101b 77%)}
.idc-mini.green{background:linear-gradient(155deg,#086b50 0 43%,#fff 44% 64%,#35ad7c 65% 76%,#07513d 77%)}
.idc-mini.purple{background:linear-gradient(155deg,#45206d 0 43%,#fff 44% 64%,#9b61c6 65% 76%,#32134f 77%)}
.idc-mini.gold{background:linear-gradient(155deg,#161616 0 43%,#f7f0d2 44% 64%,#b9963e 65% 76%,#090909 77%)}
.idc-mini:after{content:'|||| ||| |||||| ||';position:absolute;left:35%;bottom:6px;background:#fff;color:#111;font-size:6px;padding:2px 4px;letter-spacing:1px}
.idc-design b,.idc-design small{display:block}.idc-design b{font-size:10px;margin-top:5px}.idc-design small{font-size:8px;opacity:.62;margin-top:2px}
.idc-pay{margin-top:12px;padding:9px 11px;border:1px solid #efd39b;border-radius:8px;background:#fff8e8;font-size:11px}
.idc-paid{background:#eaf8ee;border-color:#b8e0c4}
.idc-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.idc-btn{border:0;border-radius:7px;padding:9px 13px;font-weight:700;cursor:pointer}.idc-primary{background:#126cc1;color:#fff}.idc-secondary{background:#edf4fb;color:#174d78}.idc-btn:disabled{opacity:.5;cursor:not-allowed}
.idc-preview-panel{margin-top:15px;padding:15px}
.idc-preview-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}.idc-preview-head h3{margin:0}
.idc-tabs button{border:0;border-radius:7px;padding:7px 12px;margin-left:5px;cursor:pointer;background:#edf3f8;font-weight:700}.idc-tabs button.active{background:#126cc1;color:#fff}
.idc-stage{background:#eef3f8;border-radius:10px;padding:30px;min-height:290px;overflow:auto}
.idc-card{width:360px;height:225px;margin:auto;position:relative;overflow:hidden;border:2px solid #173f67;border-radius:14px;background:#fff;box-shadow:0 6px 20px rgba(20,50,80,.18);font-family:Arial,sans-serif;color:#102a43}
.idc-card:after{content:'';position:absolute;left:-55px;right:-55px;bottom:-85px;height:130px;border-radius:50%;background:rgba(255,255,255,.92)}
.idc-card.wave{background:linear-gradient(165deg,#fff 0 70%,#e8f6ff 70% 82%,#0875bd 82% 90%,#064a83 90%)}
.idc-card.red{background:linear-gradient(165deg,#fff 0 70%,#fff1f2 70% 82%,#d44b57 82% 90%,#8d1723 90%)}
.idc-card.green{background:linear-gradient(165deg,#fff 0 70%,#eaf8f2 70% 82%,#31a97a 82% 90%,#07553f 90%)}
.idc-card.purple{background:linear-gradient(165deg,#fff 0 70%,#f5edfa 70% 82%,#965bc2 82% 90%,#3c195d 90%)}
.idc-card.gold{background:linear-gradient(165deg,#fff 0 70%,#fbf5df 70% 82%,#b4933b 82% 90%,#171717 90%)}
.idc-top{height:55px;padding:0 14px;display:flex;align-items:center;gap:9px;color:#fff;position:relative;z-index:2;overflow:hidden}
.idc-top:before{content:'';position:absolute;left:-20px;right:-20px;bottom:-38px;height:60px;border-radius:50%;background:rgba(255,255,255,.12)}
.idc-card.wave .idc-top{background:#0968ad}.idc-card.red .idc-top{background:#9b202c}.idc-card.green .idc-top{background:#087054}.idc-card.purple .idc-top{background:#52237b}.idc-card.gold .idc-top{background:#191919}
.idc-logo{width:37px;height:37px;border-radius:7px;background:#fff;display:flex;align-items:center;justify-content:center;color:#17466e;font-size:9px;font-weight:800;overflow:hidden;flex:none}.idc-logo img{width:100%;height:100%;object-fit:contain}
.idc-org{font-size:13px;font-weight:800;line-height:1.15;position:relative;z-index:1}.idc-org small{display:block;font-size:7px;font-weight:400;margin-top:3px;opacity:.85}
.idc-body{display:flex;gap:12px;padding:11px 13px;position:relative;z-index:2}.idc-photo{width:70px;height:84px;flex:none;border:1px solid #8fa8bc;border-radius:6px;object-fit:cover;background:#edf2f5;display:flex;align-items:center;justify-content:center;font-size:9px;color:#637687}
.idc-info{font-size:9px;line-height:1.48;max-width:245px}.idc-name{font-size:14px;font-weight:800;margin-bottom:3px}.idc-row b{display:inline-block;min-width:48px}
.idc-barcode{position:absolute;left:13px;bottom:8px;width:125px;height:25px;z-index:4;background:#fff}
.idc-valid{position:absolute;right:14px;bottom:10px;font-size:7px;z-index:4;font-weight:700}
.idc-sign{position:absolute;right:14px;bottom:30px;width:72px;height:25px;object-fit:contain;z-index:5}
.idc-sign-label{position:absolute;right:11px;bottom:19px;font-size:6px;z-index:5}
.idc-card.gold .idc-valid{color:#5d4a15}
.idc-back-card{width:360px;height:225px;margin:auto;position:relative;overflow:hidden;border:2px solid #173f67;border-radius:14px;background:#fff;box-shadow:0 6px 20px rgba(20,50,80,.18);font-family:Arial,sans-serif;color:#102a43}
.idc-back-card:after{content:'';position:absolute;left:-50px;right:-50px;bottom:-80px;height:120px;border-radius:50%;background:rgba(20,120,190,.10)}
.idc-back-head{height:50px;padding:0 14px;display:flex;align-items:center;color:#fff;font-size:13px;font-weight:800;position:relative;z-index:2}
.idc-back-card.wave .idc-back-head{background:#0968ad}.idc-back-card.red .idc-back-head{background:#9b202c}.idc-back-card.green .idc-back-head{background:#087054}.idc-back-card.purple .idc-back-head{background:#52237b}.idc-back-card.gold .idc-back-head{background:#191919}
.idc-back-body{padding:12px 14px;font-size:8px;line-height:1.45;position:relative;z-index:2}.idc-back-body p{margin:0 0 6px}
.idc-back-bar{position:absolute;left:14px;bottom:13px;width:145px;height:29px;background:#fff;z-index:4}.idc-back-sign{position:absolute;right:15px;bottom:31px;width:72px;height:27px;object-fit:contain;z-index:4}.idc-back-label{position:absolute;right:11px;bottom:19px;font-size:6px;z-index:4}
@media(max-width:850px){.idc-grid{grid-template-columns:1fr}.idc-fields{grid-template-columns:repeat(2,1fr)}.idc-design-grid{grid-template-columns:repeat(3,1fr)}}
@media(max-width:600px){.idc-fields,.idc-upload-grid{grid-template-columns:1fr}.idc-design-grid{grid-template-columns:repeat(2,1fr)}}
.idc-print-sheet{display:none}
@media print{
  @page{size:A4 portrait;margin:0}
  html,body{margin:0!important;padding:0!important;background:#fff!important}
  body *{visibility:hidden!important}
  .idc-print-sheet,.idc-print-sheet *{visibility:visible!important}
  .idc-print-sheet{
    display:flex!important;
    position:absolute!important;
    left:0!important;
    top:0!important;
    width:210mm!important;
    height:297mm!important;
    box-sizing:border-box!important;
    padding:25mm 15mm!important;
    gap:12mm!important;
    align-items:flex-start!important;
    justify-content:center!important;
    background:#fff!important;
    overflow:hidden!important;
  }
  .idc-print-card{
    flex:0 0 auto!important;
    width:85.6mm!important;
    height:54mm!important;
    box-sizing:border-box!important;
    page-break-inside:avoid!important;
  }
  .idc-print-card .idc-card,
  .idc-print-card .idc-back-card{
    width:85.6mm!important;
    height:54mm!important;
    margin:0!important;
    box-shadow:none!important;
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
  }
}
</style>

<div class="idc-head">
<div><span class="eyebrow">DOCUMENT SERVICE</span><h2>ID Card Maker</h2><p>25 professional designs with barcode, logo, photo and authorised signature.</p></div>
</div>

<div class="idc-grid">
<div class="idc-cats">${cats.map((c,i)=>`<button type="button" class="idc-cat ${i===0?'active':''}" data-idc-cat="${c.id}"><strong>${c.name}</strong><span>${c.sub}</span></button>`).join('')}</div>

<div class="idc-main">
<h3 id="idcCategoryTitle">${cats[0].name}</h3>

<div class="idc-upload-grid">
<div class="idc-upload"><label>Organization / Company Logo</label><input id="idcLogo" type="file" accept="image/png,image/jpeg"><small>PNG/JPG - Maximum 2 MB</small></div>
<div class="idc-upload"><label>Student / Employee Photo</label><input id="idcPhoto" type="file" accept="image/png,image/jpeg"><small>PNG/JPG - Maximum 2 MB</small></div>
<div class="idc-upload"><label>Authorised Signature</label><input id="idcSignature" type="file" accept="image/png,image/jpeg"><small>PNG/JPG - Maximum 2 MB</small></div>
</div>

<div id="idcFields" class="idc-fields"></div>

<div class="idc-designs"><h3>Choose ID Card Design - 5</h3><div id="idcDesigns" class="idc-design-grid"></div></div>

<div class="idc-pay" id="idcPayNote">ID Card Generation Fee: <b>Rs 5</b>. Payment is required before PDF generation or printing.</div>

<div class="idc-actions">
<button type="button" class="idc-btn idc-primary" id="idcPay">Pay Rs 5 & Generate</button>
<button type="button" class="idc-btn idc-secondary" id="idcPrint" disabled>Print / Save PDF</button>
<button type="button" class="idc-btn idc-secondary" id="idcReset">Clear Form</button>
</div>
</div>
</div>
</section>

<section class="panel idc-preview-panel">
<div class="idc-preview-head"><h3>Live ID Card Preview</h3><div class="idc-tabs"><button id="idcFrontTab" class="active">Front Side</button><button id="idcBackTab">Back Side</button></div></div>
<div class="idc-stage" id="idcStage"></div>
</section>`;

function escId(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function readImage(input,cb){
 const f=input.files?.[0];if(!f)return;
 if(!/^image\/(png|jpe?g)$/.test(f.type)){alert('Please select a PNG or JPG image.');input.value='';return;}
 if(f.size>2*1024*1024){alert('Maximum image size is 2 MB.');input.value='';return;}
 const r=new FileReader();r.onload=()=>cb(String(r.result||''));r.readAsDataURL(f);
}
function bindUpload(id,setter){document.getElementById(id).addEventListener('change',e=>readImage(e.currentTarget,d=>{setter(d);renderPreview();}));}

/* Deterministic barcode-like SVG generated locally from the ID value. No external library or URL. */
function barcodeSvg(text,width,height){
 text=String(text||'ID-0001').replace(/[^A-Za-z0-9\-]/g,'').slice(0,24)||'ID0001';
 let bits='11010010000';
 for(let i=0;i<text.length;i++){
   const n=text.charCodeAt(i);
   bits+=(n.toString(2).padStart(8,'0')+'1011');
 }
 bits+='1100011101011';
 let x=2, bars='',unit=(width-4)/bits.length;
 for(let i=0;i<bits.length;i++)if(bits[i]==='1')bars+=`<rect x="${(x+i*unit).toFixed(2)}" y="1" width="${Math.max(unit,.8).toFixed(2)}" height="${height-8}" fill="#111"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bars}<text x="${width/2}" y="${height-1}" text-anchor="middle" font-family="Arial" font-size="6" fill="#111">${escId(text)}</text></svg>`;
}

function renderFields(){
 const c=cats.find(x=>x.id===catId)||cats[0];
 idcCategoryTitle.textContent=c.name;
 idcFields.innerHTML=c.fields.map((f,i)=>`<div class="idc-field ${f.includes('Address')?'idc-full':''}"><label for="idcf_${i}">${f}</label><input id="idcf_${i}" data-idc-field="${escId(f)}" value="${escId(values[f]||'')}" placeholder="${escId(f)}"></div>`).join('');
 idcFields.querySelectorAll('[data-idc-field]').forEach(el=>el.addEventListener('input',()=>{values[el.dataset.idcField]=el.value;renderPreview();}));
}

function renderDesigns(){
 idcDesigns.innerHTML=designs.map(d=>`<button type="button" class="idc-design ${d.id===designId?'active':''}" data-idc-design="${d.id}"><div class="idc-mini ${d.id}"></div><b>${d.name}</b><small>${d.desc}</small></button>`).join('');
 idcDesigns.querySelectorAll('[data-idc-design]').forEach(el=>el.addEventListener('click',()=>{designId=el.dataset.idcDesign;renderDesigns();renderPreview();}));
}

function renderPreview(){
 const c=cats.find(x=>x.id===catId)||cats[0];
 const name=values['Student Name']||values['Employee Name']||'Your Name';
 const org=values['School Name']||values['College Name']||values['Office Name']||values['Company Name']||'Institution / Company Name';
 const id=values['Admission / ID No.']||values['College ID No.']||values['Employee ID']||'ID-0001';
 const role=values['Class / Section']||values['Course / Branch']||values['Designation']||'Designation / Course';
 const dept=values['Department']||values['Year / Semester']||'';
 const valid=values['Valid Upto']||values['Academic Year']||'Valid Identity Card';
 const barcode=barcodeSvg(id,125,25);
 const backBarcode=barcodeSvg(id,145,29);
 const logo=logoData?`<img src="${logoData}" alt="Logo">`:'ID';
 const photo=photoData?`<img class="idc-photo" src="${photoData}" alt="Photo">`:`<div class="idc-photo">PHOTO</div>`;
 const sign=signatureData?`<img class="idc-sign" src="${signatureData}" alt="Authorised Signature">`:'';

 if(side==='back'){
  idcStage.innerHTML=`<div class="idc-back-card ${designId}">
   <div class="idc-back-head">${escId(org)}</div>
   <div class="idc-back-body">
    <p><b>IDENTITY CARD</b></p>
    <p>This card remains the property of the issuing institution / organisation. If found, please return it to the issuing office.</p>
    <p><b>Name:</b> ${escId(name)}</p>
    <p><b>ID Number:</b> ${escId(id)}</p>
    <p><b>Contact:</b> ${escId(values['Mobile Number']||'')}</p>
    <p><b>Address:</b> ${escId(values['School Address']||values['College Address']||values['Office Address']||'')}</p>
   </div>
   <div class="idc-back-bar">${backBarcode}</div>
   ${signatureData?`<img class="idc-back-sign" src="${signatureData}" alt="Authorised Signature">`:''}
   <span class="idc-back-label">Authorised Signature</span>
  </div>`;
 }else{
  idcStage.innerHTML=`<div class="idc-card ${designId}">
   <div class="idc-top"><span class="idc-logo">${logo}</span><span class="idc-org">${escId(org)}<small>${escId(c.name)}</small></span></div>
   <div class="idc-body">${photo}<div class="idc-info">
    <div class="idc-name">${escId(name)}</div>
    <div class="idc-row"><b>ID:</b> ${escId(id)}</div>
    <div class="idc-row"><b>Role:</b> ${escId(role)}</div>
    ${dept?`<div class="idc-row"><b>Dept:</b> ${escId(dept)}</div>`:''}
    ${values['Date of Birth']?`<div class="idc-row"><b>DOB:</b> ${escId(values['Date of Birth'])}</div>`:''}
    ${values['Blood Group']?`<div class="idc-row"><b>Blood:</b> ${escId(values['Blood Group'])}</div>`:''}
   </div></div>
   <div class="idc-barcode">${barcode}</div>
   ${sign}
   ${signatureData?'<span class="idc-sign-label">Authorised Signature</span>':''}
   <span class="idc-valid">${escId(valid)}</span>
  </div>`;
 }
}

document.querySelectorAll('[data-idc-cat]').forEach(el=>el.addEventListener('click',()=>{
 catId=el.dataset.idcCat;
 document.querySelectorAll('[data-idc-cat]').forEach(x=>x.classList.toggle('active',x===el));
 renderFields();renderPreview();
}));

idcFrontTab.addEventListener('click',()=>{side='front';idcFrontTab.classList.add('active');idcBackTab.classList.remove('active');renderPreview();});
idcBackTab.addEventListener('click',()=>{side='back';idcBackTab.classList.add('active');idcFrontTab.classList.remove('active');renderPreview();});

bindUpload('idcLogo',v=>logoData=v);
bindUpload('idcPhoto',v=>photoData=v);
bindUpload('idcSignature',v=>signatureData=v);

renderFields();renderDesigns();renderPreview();

idcPrint.addEventListener('click',()=>{
 if(!paid){alert('Please complete the Rs 5 payment before printing.');return;}

 const oldSheet=document.getElementById('idcPrintSheet');
 if(oldSheet)oldSheet.remove();

 const c=cats.find(x=>x.id===catId)||cats[0];
 const name=values['Student Name']||values['Employee Name']||'Your Name';
 const org=values['School Name']||values['College Name']||values['Office Name']||values['Company Name']||'Institution / Company Name';
 const id=values['Admission / ID No.']||values['College ID No.']||values['Employee ID']||'ID-0001';
 const role=values['Class / Section']||values['Course / Branch']||values['Designation']||'Designation / Course';
 const dept=values['Department']||values['Year / Semester']||'';
 const valid=values['Valid Upto']||values['Academic Year']||'Valid Identity Card';
 const barcode=barcodeSvg(id,125,25);
 const backBarcode=barcodeSvg(id,145,29);
 const logo=logoData?`<img src="${logoData}" alt="Logo">`:'ID';
 const photo=photoData?`<img class="idc-photo" src="${photoData}" alt="Photo">`:`<div class="idc-photo">PHOTO</div>`;
 const sign=signatureData?`<img class="idc-sign" src="${signatureData}" alt="Authorised Signature">`:'';

 const front=`<div class="idc-card ${designId}">
   <div class="idc-top"><span class="idc-logo">${logo}</span><span class="idc-org">${escId(org)}<small>${escId(c.name)}</small></span></div>
   <div class="idc-body">${photo}<div class="idc-info">
    <div class="idc-name">${escId(name)}</div>
    <div class="idc-row"><b>ID:</b> ${escId(id)}</div>
    <div class="idc-row"><b>Role:</b> ${escId(role)}</div>
    ${dept?`<div class="idc-row"><b>Dept:</b> ${escId(dept)}</div>`:''}
    ${values['Date of Birth']?`<div class="idc-row"><b>DOB:</b> ${escId(values['Date of Birth'])}</div>`:''}
    ${values['Blood Group']?`<div class="idc-row"><b>Blood:</b> ${escId(values['Blood Group'])}</div>`:''}
   </div></div>
   <div class="idc-barcode">${barcode}</div>
   ${sign}
   ${signatureData?'<span class="idc-sign-label">Authorised Signature</span>':''}
   <span class="idc-valid">${escId(valid)}</span>
  </div>`;

 const back=`<div class="idc-back-card ${designId}">
   <div class="idc-back-head">${escId(org)}</div>
   <div class="idc-back-body">
    <p><b>IDENTITY CARD</b></p>
    <p>This card remains the property of the issuing institution / organisation. If found, please return it to the issuing office.</p>
    <p><b>Name:</b> ${escId(name)}</p>
    <p><b>ID Number:</b> ${escId(id)}</p>
    <p><b>Contact:</b> ${escId(values['Mobile Number']||'')}</p>
    <p><b>Address:</b> ${escId(values['School Address']||values['College Address']||values['Office Address']||'')}</p>
   </div>
   <div class="idc-back-bar">${backBarcode}</div>
   ${signatureData?`<img class="idc-back-sign" src="${signatureData}" alt="Authorised Signature">`:''}
   <span class="idc-back-label">Authorised Signature</span>
  </div>`;

 const sheet=document.createElement('div');
 sheet.id='idcPrintSheet';
 sheet.className='idc-print-sheet';
 sheet.innerHTML=`<div class="idc-print-card">${front}</div><div class="idc-print-card">${back}</div>`;
 document.body.appendChild(sheet);

 const cleanup=()=>{setTimeout(()=>document.getElementById('idcPrintSheet')?.remove(),500);window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup);
 setTimeout(()=>window.print(),100);
});

idcPay.addEventListener('click',async()=>{
 if(paid){alert('Payment already completed. You can print/save the ID card.');return;}
 const agree=document.getElementById('bsAgree');
 if(agree&&!agree.checked){alert('Please accept the terms and conditions before payment.');return;}
 idcPay.disabled=true;idcPay.textContent='Processing Rs 5...';
 try{
  const r=await fetch('/api/portal/pay-service',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({serviceKey:'affidavit:business-idcards'})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.message||'Unable to process wallet payment.');
  paid=true;
  idcPay.style.display='none';
  idcPrint.disabled=false;
  idcPayNote.classList.add('idc-paid');
  idcPayNote.innerHTML='<b>Payment successful.</b> Rs 5 has been charged. Print / Save PDF is now unlocked.';
 }catch(e){alert(e.message||'Unable to process payment.');}
 finally{if(!paid){idcPay.disabled=false;idcPay.textContent='Pay Rs 5 & Generate';}}
});

idcReset.addEventListener('click',()=>{
 Object.keys(values).forEach(k=>delete values[k]);
 photoData='';logoData='';signatureData='';paid=false;side='front';
 idcPay.style.display='';idcPay.disabled=false;idcPay.textContent='Pay Rs 5 & Generate';
 idcPrint.disabled=true;
 idcPayNote.classList.remove('idc-paid');
 idcPayNote.innerHTML='ID Card Generation Fee: <b>Rs 5</b>. Payment is required before PDF generation or printing.';
 ['idcLogo','idcPhoto','idcSignature'].forEach(x=>document.getElementById(x).value='');
 renderFields();renderPreview();
});
}
function pvc(){content.innerHTML=`<section class="panel"><div class="empty-module"><div class="empty-icon">CI</div><h2>Print PVC</h2><p>PVC printing is reserved for the next module. The menu and portal workspace are ready; the PVC workflow will be connected when the service requirements are provided.</p></div></section>`}
function toggleChat(){const root=document.getElementById('chatRoot');if(root.innerHTML){root.innerHTML='';return;}root.innerHTML=`<section class="chat"><div class="chat-head"><div><strong>Koutilya Support</strong><small>Automated citizen assistance</small></div><button id="chatClose">x</button></div><div class="chat-body" id="chatBody"><div class="bubble bot">Hello! I can help with login, MeeSeva applications, affidavits, wallet, transactions and complaints.</div></div><div class="chat-input"><input id="chatInput" placeholder="Type your message..."><button id="chatSend">Send</button></div></section>`;chatClose.addEventListener('click',toggleChat);chatSend.addEventListener('click',sendChat);chatInput.addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});loadChatHistory();}
async function loadChatHistory(){try{const j=await api('/api/portal/chat');if(!j.chats?.length)return;chatBody.innerHTML='';j.chats.forEach(c=>{chatBody.insertAdjacentHTML('beforeend',`<div class="bubble me">${esc(c.message)}</div><div class="bubble bot">${esc(c.reply)}</div>`)});chatBody.scrollTop=chatBody.scrollHeight}catch(e){}}
async function sendChat(){const v=chatInput.value.trim();if(!v)return;chatBody.insertAdjacentHTML('beforeend',`<div class="bubble me">${esc(v)}</div>`);chatInput.value='';try{const j=await api('/api/portal/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})});chatBody.insertAdjacentHTML('beforeend',`<div class="bubble bot">${esc(j.reply)}</div>`);chatBody.scrollTop=chatBody.scrollHeight;}catch(e){chatBody.insertAdjacentHTML('beforeend',`<div class="bubble bot">${esc(e.message)}</div>`);}}
async function handleReturn(){const q=new URLSearchParams(location.search),oid=q.get('order_id');if(q.get('cashfree_return')==='1'&&oid){try{const j=await api('/api/wallet/verify/'+encodeURIComponent(oid));toast(j.paid?'Wallet top-up successful.':'Payment is not confirmed yet.',!j.paid);history.replaceState({},'',location.pathname);}catch(e){toast(e.message,true)}}}
function toast(text,error=false){const t=document.createElement('div');t.className='toast '+(error?'err':'ok');t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),3500);}
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.data?.type==='wallet-required'){toast(e.data.message||'Please add money to Wallet.',true);navigate('wallet');}});
(async()=>{try{const j=await api('/api/auth/me');state.user=j.user;if(j.user.mustChangePassword){forceChange();return;}await boot();}catch{auth();}})();
