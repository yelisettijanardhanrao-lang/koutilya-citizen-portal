(function(){'use strict';
  const FEE_ENDPOINT='/api/business-services/charge';
  async function chargeAndGenerate(service, data, generateFn){
    const agree=document.getElementById('bsAgree');
    if(agree && !agree.checked){alert('Please confirm that the information entered is correct.');return;}
    const button=document.querySelector('#bsForm .bs-primary');
    if(button){button.disabled=true;button.textContent='Checking wallet…';}
    try{
      const r=await fetch(FEE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({serviceId:service.id,serviceName:service.title,amount:Number(service.fee),documentData:data})});
      let j={};try{j=await r.json();}catch{}
      if(!r.ok) throw new Error(j.message||'Unable to process service payment.');
      generateFn(service,data,j);
    }catch(e){alert(e.message||'Unable to process service payment.');}
    finally{if(button){button.disabled=false;button.textContent='Generate Document';}}
  }
  window.__businessServicesChargeAndGenerate=chargeAndGenerate;
})();
