/* Reference module layout enhancer. Does not replace existing content or handlers. */
(function(){
  function markAndArrange(){
    const content=document.getElementById('content');
    if(!content)return false;
    const active=document.querySelector('.navbtn.active');
    const view=active?.dataset?.view||'';
    content.dataset.refView=view;
    if(view==='home')return true;
    if(view==='services'||view==='affidavits'||view==='resume'){
      const candidates=[...content.querySelectorAll('div,section')].filter(el=>{
        if(el.closest('.ods-wrap'))return false;
        const kids=[...el.children];
        return kids.length>=4&&kids.length<=25;
      });
      candidates.sort((a,b)=>b.children.length-a.children.length);
      const grid=candidates[0];
      if(grid&&!grid.classList.contains('ref-module-grid')){
        const n=grid.children.length;
        grid.classList.add('ref-module-grid');
        grid.classList.add(view==='resume'?'ref-grid-5':(n>=8?'ref-grid-4':'ref-grid-3'));
        [...grid.children].forEach(x=>x.classList.add('ref-module-card'));
      }
    }
    return true;
  }
  function boot(){let tries=0;const timer=setInterval(()=>{markAndArrange();if(++tries>80)clearInterval(timer)},250);const c=document.getElementById('content');if(c)new MutationObserver(()=>setTimeout(markAndArrange,0)).observe(c,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
