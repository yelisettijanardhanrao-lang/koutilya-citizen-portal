/* AP 30 application launcher — Handoff continuation.
   Reads the central registry and delegates individual service forms to the
   isolated AP application service engine.
*/
(function(){
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=()=>document.getElementById('content');
  function states(){
    const services=window.CSP_SERVICE_CONFIG?.getState('ap')||[];
    root().innerHTML='<section class="allindia-page"><div class="allindia-head"><span class="eyebrow">ANDHRA PRADESH • DEVELOPMENT</span><h1>AP Digital Applications</h1><p>30 application sources supplied for the AP pilot.</p></div><div class="application-card-grid">'+services.map(x=>'<button class="application-card" data-ap-service="'+esc(x.id)+'"><span class="app-icon">▣</span><span><strong>'+esc(x.name)+'</strong><small>Source: '+esc(x.source)+'</small></span></button>').join('')+'</div></section>';
    document.querySelectorAll('[data-ap-service]').forEach(b=>b.onclick=()=>window.CSP_AP_APPLICATION_SERVICE.render(b.dataset.apService));
  }
  function install(){
    const b=document.querySelector('.navbtn[data-view="services"]');
    if(b&&!b.dataset.ap30handoff){b.dataset.ap30handoff='1';b.addEventListener('click',()=>setTimeout(states,0));}
  }
  window.CSP_AP30_PILOT={states};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();