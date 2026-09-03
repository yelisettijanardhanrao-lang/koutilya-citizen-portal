const form = document.getElementById('appForm');
const status = document.getElementById('status');
function titleCase(v) {
  return String(v || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
}
document.querySelectorAll('input[type="text"], textarea').forEach(el => {
  el.addEventListener('blur', () => {
    if (!el.name.toLowerCase().includes('email') && !el.name.toLowerCase().includes('aadhaar') && !el.name.toLowerCase().includes('pincode')) {
      el.value = titleCase(el.value);
    }
  });
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true; status.className=''; status.textContent='Generating PDF...';
  const raw = Object.fromEntries(new FormData(form));
  const data = {};
  const mapping = {"district": "district", "mandal": "mandal", "village": "village", "khataNumber": "khata_number", "seedingType": "seeding_type", "newMobile": "new_mobile", "newAadhaar": "new_aadhaar"};
  Object.entries(mapping).forEach(([from,to]) => data[to] = raw[from] || '');
  data.__checks = [].reduce((o,k) => { o[k]=raw[k] || ''; return o; }, {});
  try {
    const r = await fetch('/api/pdf/seeding', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).message || 'PDF generation failed');
    const blob = await r.blob(); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='seeding.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.className='success'; status.textContent='PDF downloaded successfully.';
  } catch(err) { console.error(err); status.className='error'; status.textContent=err.message || 'PDF generation failed.'; }
  finally { button.disabled=false; }
});
