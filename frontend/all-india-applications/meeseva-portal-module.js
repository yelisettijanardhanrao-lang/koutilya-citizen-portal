/* Koutilya Citizen Portal — four-state MeeSeva application navigator.
 * UI-only module: same browser tab, state cards -> application cards -> input form.
 * Payment/PDF calls are deliberately delegated to server endpoints.
 */
(function () {
  'use strict';

  const AP = [
    ['income','Income Certificate'],['caste-integrated','Caste / Integrated Certificate'],['residence','Residence Certificate'],
    ['family-member','Family Member Certificate'],['late-birth','Late Registration of Birth'],['death','Late Registration of Death'],
    ['ews','EWS Income Certificate'],['obc','OBC Certificate'],['seeding','Pattadar Aadhaar Seeding']
  ];
  const TS = [
    ['ews','EWS Application Form'],['death','Late Registration of Death'],['late-birth','Late Registration of Birth'],['family-member','Family Member Certificate'],
    ['no-property','No Property Certificate'],['no-earning','No Earning Member Certificate'],['residence','Residence Certificate'],['income','Income Certificate — General'],
    ['income-reimbursement','Income Fee Reimbursement'],['nativity-sc-bc','Nativity Certificate — SC/BC'],['nativity-st','Nativity Certificate — ST'],['ebc','EBC Application'],
    ['local-candidate','Local Candidate Certificate'],['minority','Minority Certificate'],['community-sc-bc','Community & Date of Birth — SC/BC'],
    ['community-st','Community & Date of Birth — ST'],['brahmin-caste','Brahmin Community Caste Certificate'],['obc','OBC Application'],['old-age-pension','Old Age Pension'],
    ['change-name','Change of Name'],['labour-registration','Labour Registration Establishment/Shop']
  ];
  const TN = (window.CSP_STATE_APPLICATIONS?.tamil_nadu?.services || []).map(x => [x.id, x.name]);
  const KA = (window.CSP_STATE_APPLICATIONS?.karnataka?.services || []).map(x => [x.id, x.name]);
  const states = {
    ap: {name:'Andhra Pradesh', native:'ఆంధ్ర ప్రదేశ్', lang:'English / తెలుగు', apps:AP, cls:'ap'},
    ts: {name:'Telangana', native:'తెలంగాణ', lang:'English / తెలుగు', apps:TS, cls:'ts'},
    tn: {name:'Tamil Nadu', native:'தமிழ்நாடு', lang:'English / தமிழ்', apps:TN, cls:'tn'},
    ka: {name:'Karnataka', native:'ಕರ್ನಾಟಕ', lang:'English / ಕನ್ನಡ', apps:KA, cls:'ka'}
  };

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const content = () => document.getElementById('content');
  const inputField = (label,key,type='text',required=false) => `<div class="allindia-field"><label>${esc(label)}${required?' <b>*</b>':''}</label><input type="${type}" data-field="${esc(key)}" ${required?'required':''}></div>`;

  function renderStates() {
    content().innerHTML = `<section class="allindia-page"><div class="allindia-head"><div><span class="eyebrow">CITIZEN SERVICES</span><h1>MeeSeva Applications</h1><p>Select your state to view applications. Everything stays in this browser tab.</p></div></div><div class="state-card-grid">${Object.entries(states).map(([id,s]) => `<button class="state-card ${s.cls}" data-state="${id}"><span class="state-symbol">${id.toUpperCase()}</span><strong>${esc(s.name)}</strong><em>${esc(s.native)}</em><small>${esc(s.lang)}</small><span class="state-count">${s.apps.length} applications</span></button>`).join('')}</div></section>`;
    document.querySelectorAll('[data-state]').forEach(b => b.addEventListener('click', () => renderApplications(b.dataset.state)));
  }

  function renderApplications(stateId) {
    const s = states[stateId];
    content().innerHTML = `<section class="allindia-page"><div class="crumb-row"><button class="back-link" id="backStates">← Back to States</button><span>${esc(s.name)}</span></div><div class="allindia-head compact"><div><span class="eyebrow">${esc(s.lang)}</span><h1>${esc(s.name)} Applications</h1><p>Select an application. Each application opens in the same browser tab.</p></div></div><div class="application-toolbar"><input id="applicationSearch" placeholder="Search application..."><span>${s.apps.length} available</span></div><div class="application-card-grid" id="applicationCards">${s.apps.map(([id,name]) => `<button class="application-card" data-app="${esc(id)}"><span class="app-icon">▣</span><span><strong>${esc(name)}</strong><small>Open application →</small></span></button>`).join('')}</div></section>`;
    document.getElementById('backStates').addEventListener('click', renderStates);
    document.getElementById('applicationSearch').addEventListener('input', e => {
      const q=e.target.value.toLowerCase().trim(); document.querySelectorAll('.application-card').forEach(x=>x.hidden=!x.innerText.toLowerCase().includes(q));
    });
    document.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => renderForm(stateId,b.dataset.app)));
  }

  function getApp(stateId, appId) {
    const s=states[stateId]; const pair=s.apps.find(x=>x[0]===appId); return pair || [appId,appId];
  }

  function renderForm(stateId, appId) {
    const s=states[stateId]; const [, name]=getApp(stateId,appId);
    const tnCfg=window.CSP_STATE_APPLICATIONS?.tamil_nadu?.services?.find(x=>x.id===appId);
    const kaCfg=window.CSP_STATE_APPLICATIONS?.karnataka?.services?.find(x=>x.id===appId);
    const fields=(tnCfg||kaCfg)?.fields || ['address','district','taluk','village','pincode','purpose','additional_details'];
    content().innerHTML = `<section class="allindia-page form-page ${s.cls}">
      <div class="crumb-row"><button class="back-link" id="backApps">← Back to ${esc(s.name)} Applications</button><span>${esc(name)}</span></div>
      <div class="form-header"><div class="state-emblem-box">${esc(stateId.toUpperCase())}<small>Government</small></div><div><span class="eyebrow">${esc(s.lang)}</span><h1>${esc(name)}</h1><p>Application preparation form</p></div><select id="formLanguage" aria-label="Form language"><option>English</option><option>${stateId==='tn'?'தமிழ்':stateId==='ka'?'ಕನ್ನಡ':'తెలుగు'}</option></select></div>
      <form id="allIndiaForm">
        <section class="input-section aadhaar-input"><h2>1. Aadhaar Autofill</h2><div class="aadhaar-row"><input type="file" id="aadhaarUpload" accept="image/*"><button type="button" id="autofillBtn">⚡ Autofill Applicant Details</button></div><small>Autofill is limited to Full Name, Father Name, Date of Birth, Gender, Aadhaar, Address and Mobile where applicable.</small></section>
        <section class="input-section"><h2>2. Applicant Details</h2><div class="input-grid">${inputField('Full Name','full_name','text',true)}${inputField('Father Name','father_name')}${inputField('Date of Birth','date_of_birth','date')}${inputField('Gender','gender')}${inputField('Aadhaar Number','aadhaar_number','text')}${inputField('Mobile Number','mobile','tel')}${inputField('Address','address')}</div></section>
        <section class="input-section"><h2>3. Application Details</h2><div class="input-grid">${fields.map((f,i)=>inputField(f.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase()),f,'text',i===0)).join('')}</div></section>
        <section class="input-section declaration"><h2>4. Declaration / Consent</h2><label><input type="checkbox" id="formConsent" required> I declare that the information provided is true and correct and I agree to the applicable terms.</label></section>
        <div class="payment-note">₹2 will be deducted from your wallet after Submit.</div>
        <div class="form-actions"><button type="button" id="clearForm">Clear</button><button type="submit" class="submit-btn" id="submitApplication">Submit — ₹2</button></div>
        <div id="paymentMessage" class="payment-message" role="status"></div>
      </form>
    </section>`;

    document.getElementById('backApps').addEventListener('click',()=>renderApplications(stateId));
    document.getElementById('clearForm').addEventListener('click',()=>document.getElementById('allIndiaForm').reset());
    document.getElementById('autofillBtn').addEventListener('click',()=>autofillApplicant());
    document.getElementById('allIndiaForm').addEventListener('submit', e=>submitApplication(e,stateId,appId,name));
  }

  function autofillApplicant(){
    const note=document.querySelector('.aadhaar-input small');
    const file=document.getElementById('aadhaarUpload')?.files?.[0];
    if(!file){ if(note)note.textContent='Please choose an Aadhaar image first.'; return; }
    if(note)note.textContent='Aadhaar OCR helper is ready for the permitted applicant fields. Review every value before submitting.';
    // OCR provider is intentionally not hard-coded here. The backend can supply the
    // permitted fields without allowing this helper to populate service-specific data.
  }

  async function submitApplication(e,stateId,appId,name){
    e.preventDefault(); const msg=document.getElementById('paymentMessage'); const btn=document.getElementById('submitApplication');
    if(!document.getElementById('formConsent').checked){msg.textContent='Please accept the declaration / consent.';return;}
    const values={}; document.querySelectorAll('[data-field]').forEach(x=>values[x.dataset.field]=x.value.trim());
    btn.disabled=true; msg.textContent='Submitting application and processing ₹2 wallet deduction...';
    try {
      const token=localStorage.getItem('kspl_auth_token');
      const headers={'Content-Type':'application/json'}; if(token)headers.Authorization='Bearer '+token;
      const save=await fetch('/api/applications',{method:'POST',headers,credentials:'include',body:JSON.stringify({service:`${stateId}:${appId}:${name}`,applicantName:values.full_name,fatherName:values.father_name,mobile:values.mobile,aadhaar:values.aadhaar_number,district:values.district,mandal:values.taluk,village:values.village,serviceData:values,paymentAmount:2})});
      const saved=await save.json(); if(!save.ok||!saved.success)throw new Error(saved.message||'Application submission failed.');
      const pay=await fetch(`/api/applications/${encodeURIComponent(saved.application._id)}/submit-payment`,{method:'POST',headers,credentials:'include'}); const paid=await pay.json(); if(!pay.ok||!paid.success)throw new Error(paid.message||'₹2 wallet deduction failed.');
      msg.textContent=`₹2 deducted successfully. Wallet balance: ₹${Number(paid.walletBalance||0).toFixed(2)}.`;
      const actions=document.querySelector('.form-actions'); actions.innerHTML='<button type="button" id="clearForm">Clear</button><button type="button" class="generate-btn" id="generatePdf">Generate PDF</button>';
      document.getElementById('clearForm').addEventListener('click',()=>document.getElementById('allIndiaForm').reset());
      document.getElementById('generatePdf').addEventListener('click',()=>generatePdf(saved.application._id));
    } catch(err){msg.textContent=err.message||'Submission failed.';btn.disabled=false;}
  }

  async function generatePdf(id){
    const msg=document.getElementById('paymentMessage'); const btn=document.getElementById('generatePdf'); btn.disabled=true; msg.textContent='Generating PDF...';
    try{const token=localStorage.getItem('kspl_auth_token');const h={};if(token)h.Authorization='Bearer '+token;const r=await fetch(`/api/applications/${encodeURIComponent(id)}/generate-pdf`,{method:'POST',headers:h,credentials:'include'});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||'PDF generation failed.');msg.innerHTML=`PDF ready. <a href="${esc(j.pdfUrl)}" target="_blank" rel="noopener">Download PDF</a>`;btn.disabled=false;}catch(e){msg.textContent=e.message;btn.disabled=false;}
  }

  function install(){
    const attach=()=>document.querySelectorAll('.navbtn[data-view="services"]').forEach(b=>{if(b.dataset.allIndiaBound)return;b.dataset.allIndiaBound='1';b.addEventListener('click',()=>setTimeout(renderStates,0));});
    attach(); new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
  }
  window.CSPMeeSevaModule={renderStates,renderApplications,renderForm,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
