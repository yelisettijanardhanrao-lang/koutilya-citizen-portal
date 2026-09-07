/* Reference module layout enhancer. Additive only; existing content, routes and handlers remain unchanged. */
(function(){
  function markCards(root, gridClass){
    if(!root)return;
    root.classList.add('ref-module-grid',gridClass);
    [...root.children].forEach(x=>x.classList.add('ref-module-card'));
  }
  function markAndArrange(){
    const content=document.getElementById('content');
    if(!content)return false;
    const active=document.querySelector('.navbtn.active');
    const view=active?.dataset?.view||'';
    content.dataset.refView=view;
    if(view==='home')return true;
    if(view==='services'){
      const grid=content.querySelector('.service-grid:not(.quick)');
      markCards(grid,'ref-grid-4');
    }else if(view==='affidavits'){
      const grid=content.querySelector('#affGrid');
      if(grid)markCards(grid,'ref-grid-4');
    }else if(view==='resume'){
      const grids=[...content.querySelectorAll('.service-grid')];
      const grid=grids.find(g=>g.children.length>=3);
      if(grid)markCards(grid,'ref-grid-5');
    }
    return true;
  }
  function boot(){
    let tries=0;
    const timer=setInterval(()=>{markAndArrange();if(++tries>80)clearInterval(timer)},250);
    const c=document.getElementById('content');
    if(c)new MutationObserver(()=>setTimeout(markAndArrange,0)).observe(c,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
