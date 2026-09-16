/* Karnataka Caste Certificate test override. Development branch only. */
(function(){
'use strict';
const KA_CFG=window.CSP_STATE_APPLICATIONS?.karnataka?.services;
if(!Array.isArray(KA_CFG)) return;
const caste=KA_CFG.find(x=>x.id==='ka-caste');
if(caste){caste.name='Caste Certificate';caste.fields=['community','sub_group','father_caste','father_sub_caste','mother_caste','mother_sub_caste','applicant_religion','father_religion','mother_religion','birth_place','permanent_residence','applicant_status_natural_or_adopted','address','purpose'];}
function renameKarnatakaMenu(){document.querySelectorAll('.navbtn[data-view="services"]').forEach(b=>{const span=[...b.querySelectorAll('span')].find(x=>x.textContent.trim()==='MeeSeva Applications');if(span)span.textContent='Karnataka & State Applications';});}
function install(){renameKarnatakaMenu();new MutationObserver(renameKarnatakaMenu).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.CSP_KARNATAKA_CASTE_TEST=true;
})();
