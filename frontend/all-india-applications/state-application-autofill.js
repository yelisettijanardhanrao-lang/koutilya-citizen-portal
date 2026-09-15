(function(){'use strict';
window.CSPStateAutofill={
  allowed:['full_name','father_name','date_of_birth','gender','aadhaar_number','address','mobile'],
  fillApplicant:function(data,root=document){
    const d=data||{};
    this.allowed.forEach(function(key){
      const el=root.querySelector('[data-field="'+key+'"]');
      if(el && Object.prototype.hasOwnProperty.call(d,key) && d[key]!=null){el.value=String(d[key]);el.dispatchEvent(new Event('input',{bubbles:true}));}
    });
  }
};
document.addEventListener('DOMContentLoaded',function(){
 const root=document.querySelector('[data-state-application]'); if(!root)return;
 const btn=root.querySelector('[data-autofill]'); if(!btn)return;
 btn.addEventListener('click',function(){
   const file=root.querySelector('[data-aadhaar-file]');
   if(!file||!file.files.length){alert('Please select an Aadhaar image first.');return;}
   // OCR adapter hook. Production implementation should call the approved OCR service.
   alert('Aadhaar selected. OCR adapter will populate only applicable applicant fields. Please review all values.');
 });
});
})();
