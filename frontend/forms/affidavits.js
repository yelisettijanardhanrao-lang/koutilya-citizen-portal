document.addEventListener('DOMContentLoaded', async () => {
  const search=document.getElementById('search'), department=document.getElementById('department'), state=document.getElementById('state'), grid=document.getElementById('grid'), empty=document.getElementById('empty');
  let services=[];
  try{const r=await fetch('/api/affidavits');const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||'Unable to load catalogue');services=j.services||[];}catch(e){grid.innerHTML='<div class="empty">Unable to load affidavit services.</div>';console.error(e);return;}
  const depts=[...new Set(services.flatMap(x=>x.departments||[]))].sort();
  depts.forEach(x=>department.insertAdjacentHTML('beforeend',`<option value="${x.replaceAll('"','&quot;')}">${x}</option>`));
  function render(){const q=search.value.trim().toLowerCase(),d=department.value,s=state.value;const list=services.filter(x=>{const hay=[x.title,x.category,x.purpose,(x.departments||[]).join(' '),(x.case_types||[]).join(' ')].join(' ').toLowerCase();return(!q||hay.includes(q))&&(!d||(x.departments||[]).includes(d))&&(!s||(x.jurisdictions||[]).includes(s));});grid.innerHTML='';empty.style.display=list.length?'none':'block';list.forEach(x=>{const card=document.createElement('div');card.className='item';card.innerHTML=`<h3>${x.title||'Untitled'}</h3><div class="meta">${x.category||''}</div><div class="purpose">${x.purpose||''}</div><div class="tags"><span>Case-specific</span><span>₹5 PDF package</span></div><div class="actions"><a class="button" href="${x.live_form&&x.live_form.startsWith('/forms/')?x.live_form:'/forms/universal-affidavit.html?id='+encodeURIComponent(x.id)}">Start</a></div>`;grid.appendChild(card);});}
  [search,department,state].forEach(el=>el.addEventListener('input',render));render();
});
