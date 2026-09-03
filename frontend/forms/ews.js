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
  const mapping = {"financialYear": "financial_year", "applicantName": "applicant_name", "fatherName": "father_name", "gender": "gender", "dateOfBirth": "date_of_birth", "aadhaar": "aadhaar", "casteCategory": "caste_category", "subCasteCategory": "sub_caste_category", "doorNo": "door_no", "locality": "locality", "state": "state", "district": "district", "mandal": "mandal", "village": "village", "pincode": "pincode", "postalSame": "postal_same", "postalDoorNo": "postal_door_no", "postalLocality": "postal_locality", "postalState": "postal_state", "postalDistrict": "postal_district", "postalMandal": "postal_mandal", "postalVillage": "postal_village", "postalPincode": "postal_pincode", "mobile": "mobile", "mailId": "mail_id", "rationCard": "ration_card", "grossIncome": "gross_income", "land5": "land_5", "flat1000": "flat_1000", "plot100": "plot_100", "plot200": "plot_200"};
  Object.entries(mapping).forEach(([from,to]) => data[to] = raw[from] || '');
  data.__checks = [].reduce((o,k) => { o[k]=raw[k] || ''; return o; }, {});
  try {
    const r = await fetch('/api/pdf/ews', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if (!r.ok) throw new Error((await r.json().catch(()=>({}))).message || 'PDF generation failed');
    const blob = await r.blob(); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='ews.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.className='success'; status.textContent='PDF downloaded successfully.';
  } catch(err) { console.error(err); status.className='error'; status.textContent=err.message || 'PDF generation failed.'; }
  finally { button.disabled=false; }
});
