/* Reference module layout enhancer. Additive only; existing content, routes and handlers remain unchanged. */
(function(){
  function markCards(root,gridClass){
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
      markCards(content.querySelector('.service-grid:not(.quick)'),'ref-grid-4');
    }else if(view==='affidavits'){
      markCards(content.querySelector('#affGrid'),'ref-grid-4');
    }else if(view==='resume'){
      markCards([...content.querySelectorAll('.service-grid')].find(g=>g.children.length>=3),'ref-grid-5');
    }else if(view==='wallet'){
      const cards=content.querySelector('.cards');
      if(cards){cards.classList.add('ref-module-grid','ref-grid-3');[...cards.children].forEach(x=>x.classList.add('ref-module-card'));}
    }else if(view==='transactions'){
      const table=content.querySelector('.table-wrap');
      if(table)table.classList.add('ref-table-wrap');
    }else if(view==='profile'){
      [...content.querySelectorAll('.profile-grid,.form-grid')].forEach(g=>{g.classList.add('ref-profile-grid');[...g.children].forEach(x=>x.classList.add('ref-profile-item'));});
    }
    return true;
  }
  function boot(){
    let tries=0;
    const timer=setInterval(()=>{markAndArrange();if(++tries>80)clearInterval(timer)},250);
    const c=document.getElementById('content');
    if(c)new MutationObserver(()=>{window.requestAnimationFrame(markAndArrange)}).observe(c,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
