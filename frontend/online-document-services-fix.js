(()=>{
  const labels={
    'pdf-jpg':'PDF to JPG','pdf-png':'PDF to PNG','pdf-word':'PDF to Word','word-pdf':'Word to PDF',
    'jpg-text':'JPG / PNG to Text','searchable':'Scanned PDF','screenshot':'Screenshot to Text',
    'image-word':'Image to Word','jpg-png':'JPG to PNG','png-jpg':'PNG to JPG','webp':'WebP Conversion','heic':'HEIC Conversion',
    'edit-pdf':'Add Text to PDF','highlight':'Highlight / Underline','draw':'Draw / Shapes','fill':'Basic Form Filling','deskew':'Deskew'
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
  const home=()=>window.__odsHome&&window.__odsHome();
  function card(tool){const el=document.querySelector(`[data-tool="${CSS.escape(tool)}"]`);return el}
  function show(tool){
    const main=document.getElementById('odsMain'); if(!main)return;
    main.innerHTML=`<section class="ods-panel"><div class="ods-back"><button id="odsFixBack">← Back</button></div><h2>${esc(labels[tool]||tool)}</h2><p>This tool is being completed with the correct processing engine. It will not silently produce a false result.</p><div class="ods-paid-lock"><h3>Engine required</h3><p>${tool==='pdf-jpg'||tool==='pdf-png'?'PDF page rendering needs a PDF renderer.':tool.includes('text')||tool==='searchable'?'OCR requires a browser/server OCR engine.':'This conversion needs a document conversion engine.'}</p><p>Basic PDF and image tools that are already supported remain free.</p></div></section>`;
    document.getElementById('odsFixBack').onclick=home;
  }
  function fixClicks(){
    Object.keys(labels).forEach(t=>{const el=card(t);if(el&&!el.dataset.fixBound){el.dataset.fixBound='1';el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();show(t)},true)}});
  }
  function fixPaid(){
    document.querySelectorAll('[data-tool]').forEach(el=>{
      if(el.dataset.tool&&el.querySelector('.paid')&&!el.dataset.paidFix){el.dataset.paidFix='1';el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();paid(el.dataset.tool)},true)}
    });
  }
  const paidMap={passport:['Passport Photo Ready','₹15','Prepare passport-size photo with crop, background, dimensions, KB and printable sheet.'],signature:['Signature Ready','₹5','Clean, crop, resize and prepare signature to the required dimensions and KB.'],thumb:['Thumb Impression Ready','₹5','Prepare a clean, correctly sized thumb impression.'],security:['Document Security','₹5+','Password protection, metadata removal and permanent redaction.'],fillable:['Fillable PDF Creator','₹20+','Create fillable fields such as text, date, checkbox, dropdown and signature fields.'],templates:['Document Templates','₹5–₹15','Generate commonly used letters, undertakings, declarations, NOC and request letters.']};
  function paid(tool){const x=paidMap[tool];if(!x)return;const main=document.getElementById('odsMain');main.innerHTML=`<section class="ods-panel"><div class="ods-back"><button id="odsPaidBack">← Back</button></div><h2>${x[0]} <span class="ods-price">${x[1]}</span></h2><p>${x[2]}</p><div class="ods-note">Paid service. Payment will be collected only when the final preparation flow is connected. No charge is taken in this preview stage.</div><div class="ods-paid-lock"><h3>Service workflow</h3><p>Selecting this service is ready to be connected to the existing wallet/payment flow without changing existing wallet balances or applications.</p></div></section>`;document.getElementById('odsPaidBack').onclick=home}
  function run(){fixClicks();fixPaid()}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();