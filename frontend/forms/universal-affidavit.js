document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('id');
  const loading = document.getElementById('loading'), app = document.getElementById('app');
  const title = document.getElementById('title'), sub = document.getElementById('sub'), info = document.getElementById('info');
  const fields = document.getElementById('fields'), checklist = document.getElementById('checklist');
  const outputs = document.getElementById('outputs'), steps = document.getElementById('steps'), warnings = document.getElementById('warnings');
  const form = document.getElementById('form'), msg = document.getElementById('msg'), reset = document.getElementById('reset');
  const generateButton = form?.querySelector('button[type=submit]');
  let service = null;
  const esc = s => String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const states = ['Andhra Pradesh','Telangana','Other State / Authority'];
  const authorityLabel = s => String(s||'').toLowerCase().includes('passport')?'Passport Seva':String(s||'').toLowerCase().includes('uidai')||String(s||'').toLowerCase().includes('aadhaar')?'UIDAI / Aadhaar':String(s||'').toLowerCase().includes('pan')?'PAN / Income Tax':String(s||'').toLowerCase().includes('andhra')?'Andhra Pradesh':String(s||'').toLowerCase().includes('telangana')?'Telangana':'Concerned Authority';
  function typeFor(t){return t==='number'?'number':t==='email'?'email':t==='tel'?'tel':'text';}
  function renderField(f,i){
    const n='field_'+i, full=f.type==='textarea'||/address|details|reason|description|documents|members|sources|purpose/i.test(f.label||'');
    const req=f.required?' required':'';
    let c='';
    if(f.type==='textarea') c=`<textarea name="${n}"${req} placeholder="Enter ${esc(f.label||'')} "></textarea>`;
    else if(f.type==='select'&&Array.isArray(f.options)) c=`<select name="${n}"${req}><option value="">Select</option>${f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
    else c=`<input type="${typeFor(f.type)}" name="${n}"${req} placeholder="Enter ${esc(f.label||'')}" ${f.type==='date'?'inputmode="numeric"':''}>`;
    return `<div class="field ${full?'full':''}"><label>${esc(f.label||`Field ${i+1}`)}${f.required?' <span class="required">*</span>':''}</label>${c}</div>`;
  }
  function renderList(el, list){ if(!el)return; el.innerHTML=(list||[]).map(x=>`<li>${esc(x)}</li>`).join(''); }
  function setMsg(t,good=false){msg.textContent=t;msg.className='msg show '+(good?'good':'bad');}
  async function refreshRules(){
    const caseType=form.elements.case_type.value, jurisdiction=form.elements.jurisdiction.value, authority=form.elements.authority?.value||'';
    if(!caseType||!jurisdiction)return;
    try{
      const r=await fetch(`/api/affidavits/${encodeURIComponent(service.id)}/requirements`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseType,jurisdiction,authority})});
      const j=await r.json(); if(!r.ok||!j.success)throw new Error(j.message||'Unable to determine requirements');
      renderList(checklist,j.checklist); renderList(outputs,j.outputs); renderList(steps,j.steps); renderList(warnings,j.warnings);
      if(generateButton){ generateButton.disabled = j.documentRequired === false; generateButton.textContent = j.documentRequired === false ? 'Not Required' : 'Generate'; generateButton.title = j.documentRequired === false ? 'No affidavit/declaration is indicated for this route' : ''; }
      const selectedAuthority=form.elements.authority?.value||'Concerned Authority';
      const official=j.officialFormat?'<strong>Authority format:</strong> A prescribed authority form/annexure may apply. This preparation document does not replace a prescribed authority form.': '<strong>Case guidance:</strong> Requirements are determined from the selected authority, state and case facts.';
      info.innerHTML=official+`<br><br><strong>Selected authority:</strong> ${esc(selectedAuthority)}`;
    }catch(e){console.warn(e);setMsg(e.message||'Unable to load case requirements');}
  }
  try{
    if(!id)throw new Error('Service not selected');
    const r=await fetch('/api/affidavits/'+encodeURIComponent(id)); const j=await r.json(); if(!r.ok||!j.success)throw new Error(j.message||'Service not found');
    service=j.service; title.textContent=service.title||'Affidavit / Declaration'; sub.textContent=service.purpose||'Case-specific document preparation';
    const caseOptions=Array.isArray(service.case_types)&&service.case_types.length?service.case_types:['New / first-time case','Correction / discrepancy','Change of particulars','Other case'];
    const authorityOptions=Array.isArray(service.departments)&&service.departments.length?service.departments:['Concerned Authority'];
    fields.innerHTML=`<div class="field"><label>Department / Authority <span class="required">*</span></label><select name="authority" required><option value="">Select department / authority</option>${authorityOptions.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></div><div class="field"><label>State / Jurisdiction <span class="required">*</span></label><select name="jurisdiction" required><option value="">Select state / jurisdiction</option>${states.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div><div class="field full"><label>What best describes your case? <span class="required">*</span></label><select name="case_type" required><option value="">Select your case</option>${caseOptions.map(x=>`<option>${esc(x)}</option>`).join('')}</select><small>This identifies the facts of the case. You do not have to decide whether an affidavit, declaration, Gazette, newspaper notice or other supporting document is required.</small></div>`+(service.fields||[]).map(renderField).join('')+`<div class="field"><label>Place of Execution <span class="required">*</span></label><input name="execution_place" required placeholder="Enter place"></div><div class="field"><label>Date of Execution <span class="required">*</span></label><input name="execution_date" required placeholder="DD/MM/YYYY" inputmode="numeric"></div>`;
    const dateEl=form.elements.execution_date; const now=new Date(); dateEl.value=String(now.getDate()).padStart(2,'0')+'/'+String(now.getMonth()+1).padStart(2,'0')+'/'+now.getFullYear();
    renderList(checklist,service.checklist||['Original supporting records relevant to this service','Identity and address proof']);
    renderList(outputs,['Service-specific affidavit / declaration draft','Preparation checklist and submission guidance']);
    if(generateButton){ generateButton.disabled=false; generateButton.textContent='Generate'; }
    renderList(steps,['Review the completed document carefully','Print and sign as instructed','Complete required notarisation / attestation, if applicable','Carry originals and self-attested copies when submitting']);
    renderList(warnings,service.notes||[]);
    form.elements.case_type.addEventListener('change',refreshRules); form.elements.jurisdiction.addEventListener('change',refreshRules); form.elements.authority.addEventListener('change',refreshRules);
    info.innerHTML=`<strong>Before you continue:</strong> Enter facts exactly from the original records. Koutilya determines the preparation guidance from the selected service, state and case type; it does not ask you to choose the legal document route.`;
    loading.classList.add('hidden'); app.classList.remove('hidden');
  }catch(e){loading.textContent=e.message;return;}
  reset.addEventListener('click',()=>{form.reset();setMsg('');renderList(checklist,service?.checklist||[]);});
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(generateButton?.disabled){ setMsg('No affidavit or declaration is indicated for the selected authority and case. Follow the preparation checklist shown.'); return; } setMsg('Generating…');
    const data=Object.fromEntries(new FormData(form).entries());
    try{
      const r=await fetch('/api/pdf/affidavit/'+encodeURIComponent(service.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(!r.ok){let j={};try{j=await r.json()}catch{};throw new Error(j.message||'PDF generation failed');}
      const blob=await r.blob(), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=(service.title||'Affidavit').replace(/[^a-z0-9]+/gi,'_')+'.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),3000); setMsg('Generated successfully.',true);
    }catch(err){setMsg(err.message||'Unable to generate PDF');}
  });
});
