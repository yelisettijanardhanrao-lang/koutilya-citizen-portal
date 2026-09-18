/* AP application service engine — Handoff-standard development module.
   One engine serves registered AP services; service-specific fields remain in
   state-application-config.js. Supporting-document uploads are intentionally absent.
*/
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=k=>String(k||'').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase());
  const root=()=>document.getElementById('content');
  const cfg=()=>window.CSP_SERVICE_CONFIG;
  const locationService=()=>window.CSP_LOCATION_SERVICE;

  async function locations(){
    if(!locationService()) throw new Error('Shared location service is not loaded.');
    return locationService().loadAPLocations();
  }

  function fieldHtml(k, required=false){
    const loc=['district','mandal','village'].includes(k);
    return '<div class="allindia-field"><label>'+esc(label(k))+(required?' *':'')+'</label>'+
      (loc ? '<select data-field="'+esc(k)+'" '+(required?'required':'')+'><option value="">Select '+esc(label(k))+'</option></select>'
           : '<input data-field="'+esc(k)+'" '+(required?'required':'')+' autocomplete="off">')+
      '</div>';
  }

  async function render(serviceId){
    const service=cfg()?.get('ap',serviceId);
    if(!service){ root().innerHTML='<section class="allindia-page"><p>Service not found.</p></section>'; return; }
    root().innerHTML='<section class="allindia-page form-page ap"><div class="crumb-row"><button class="back-link" id="apBack">← Back to AP Applications</button><span>AP Development</span></div>'+
      '<div class="form-header"><div class="state-emblem-box" aria-hidden="true">AP</div><div><span class="eyebrow">SOURCE: '+esc(service.source)+'</span><h1>'+esc(service.name)+'</h1><p>Application preparation • Development test</p></div></div>'+
      '<form id="apServiceForm">'+
      '<section class="input-section aadhaar-input"><h2>1. Aadhaar Autofill</h2><div class="aadhaar-row"><input type="file" id="aadhaarUpload" accept="image/*"><button type="button" id="autofill">⚡ Autofill Applicant Details</button></div><small id="ocrNote">Aadhaar is used only for citizen-side autofill. OCR provider is not connected in this local pilot; no values are guessed.</small></section>'+
      '<section class="input-section"><h2>2. Applicant Details</h2><div class="input-grid">'+
      ['full_name','father_name','date_of_birth','gender','aadhaar_number','mobile','address','district','mandal','village','pincode'].map((k,i)=>fieldHtml(k,i===0)).join('')+
      '</div></section>'+
      '<section class="input-section"><h2>3. '+esc(service.name)+' — Service Details</h2><div class="input-grid">'+
      service.fields.map((k,i)=>fieldHtml(k,i===0)).join('')+
      '</div></section>'+
      '<section class="input-section declaration"><h2>4. Declaration / Consent</h2><label><input type="checkbox" id="consent" required> I confirm that the information entered is correct and I accept the applicable terms.</label></section>'+
      '<div class="payment-note">CSP application-preparation fee: ₹'+Number(service.fee||2)+' • This prepares the application only and does not submit it to a government department.</div>'+
      '<div class="form-actions"><button type="button" id="clear">Clear</button><button type="submit" id="pay" class="submit-btn">Submit for Test — ₹'+Number(service.fee||2)+'</button></div><div id="msg" class="payment-message"></div></form></section>';
    document.getElementById('apBack').onclick=window.CSP_AP30_PILOT?.states;
    document.getElementById('clear').onclick=()=>document.getElementById('apServiceForm').reset();
    document.getElementById('autofill').onclick=()=>{
      const f=document.getElementById('aadhaarUpload').files[0];
      document.getElementById('ocrNote').textContent=f?'Aadhaar image selected. Local OCR adapter is not connected; enter/review the fields manually.':'Please choose an Aadhaar image first.';
    };
    const locs=await locations();
    setupLocations(locs);
    document.getElementById('apServiceForm').onsubmit=e=>pay(e,service);
  }

  function setupLocations(rows){
    const d=document.querySelector('[data-field="district"]'), m=document.querySelector('[data-field="mandal"]'), v=document.querySelector('[data-field="village"]');
    if(!d||!m||!v)return;
    const unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const opts=(el,vals,placeholder)=>{el.innerHTML='<option value="">'+placeholder+'</option>'+unique(vals).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');};
    opts(d,rows.map(x=>x.district),'Select District');
    d.onchange=()=>{opts(m,rows.filter(x=>x.district===d.value).map(x=>x.mandal),'Select Mandal');opts(v,[],'Select Village');};
    m.onchange=()=>opts(v,rows.filter(x=>x.district===d.value&&x.mandal===m.value).map(x=>x.village),'Select Village');
  }

  async function pay(e,service){
    e.preventDefault();
    const btn=document.getElementById('pay'),msg=document.getElementById('msg'); btn.disabled=true; msg.textContent='Processing test payment…';
    try{
      const h={'Content-Type':'application/json'},token=localStorage.getItem('kspl_auth_token'); if(token)h.Authorization='Bearer '+token;
      const r=await fetch('/api/portal/pay-service',{method:'POST',headers:h,credentials:'include',body:JSON.stringify({serviceKey:'application:ap:'+service.id})});
      const j=await r.json().catch(()=>({})); if(!r.ok||!j.success)throw new Error(j.message||'Test payment failed.');
      msg.textContent='Payment successful. ₹'+Number(service.fee||2)+' deducted. Generate the test PDF after reviewing the fields.';
      btn.remove();
      const g=document.createElement('button');g.type='button';g.className='generate-btn';g.textContent='Generate Test PDF';g.onclick=()=>pdf(service);document.querySelector('.form-actions').appendChild(g);
    }catch(err){msg.textContent=err.message||'Payment failed.';btn.disabled=false;}
  }

  function pdf(service){
    const vals={};document.querySelectorAll('[data-field]').forEach(e=>vals[e.dataset.field]=e.value.trim());
    const w=window.open('','_blank');if(!w){alert('Allow pop-ups to generate the test PDF.');return;}
    const rows=Object.entries(vals).filter(([,v])=>v);
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(service.name)+'</title><style>@page{size:A4;margin:14mm}body{font-family:Arial;color:#000;font-size:11px}.head{text-align:center;border-bottom:1px solid #000;padding-bottom:8px}.grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #000;border-left:1px solid #000;margin-top:12px}.c{border-right:1px solid #000;border-bottom:1px solid #000;padding:7px;min-height:28px}.c b{display:block;font-size:9px;margin-bottom:3px}.decl{margin-top:12px;border:1px solid #000;padding:9px}.sign{margin-top:55px;display:flex;justify-content:space-between}.sign span{width:38%;border-top:1px solid #000;text-align:center;padding-top:4px}.foot{margin-top:18px;text-align:center;font-size:7px}</style></head><body><div class="head"><div>ANDHRA PRADESH</div><h1>'+esc(service.name)+'</h1><div>Development test — application preparation copy</div></div><div class="grid">'+rows.map(([k,v])=>'<div class="c"><b>'+esc(label(k))+'</b>'+esc(v)+'</div>').join('')+'</div><div class="decl"><b>Declaration / Consent</b><br>I confirm that the information furnished is correct.</div><div class="sign"><span>Applicant Signature</span><span>Date</span></div><div class="foot">csp.koutilyasolutions.in • Preparation copy only • Not government approval/certification</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>');
    w.document.close();
  }
  window.CSP_AP_APPLICATION_SERVICE={render};
})();