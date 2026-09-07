/* Exact reference header enhancer — additive only. */
(function(){
  function enhance(){
    const top=document.querySelector('.topbar');
    if(!top)return false;
    if(!top.querySelector('.ref-bell')){
      const bell=document.createElement('div');
      bell.className='ref-bell';
      bell.setAttribute('aria-label','Notifications');
      bell.innerHTML='♟<i></i>';
      const wallet=top.querySelector('.ref-wallet');
      const spacer=top.querySelector('.top-spacer');
      if(wallet)top.insertBefore(bell,wallet); else if(spacer)top.insertBefore(bell,spacer); else top.appendChild(bell);
    }
    return true;
  }
  let n=0;
  const timer=setInterval(()=>{if(enhance()||++n>40)clearInterval(timer)},250);
})();
