/* Dashboard recovery guard — additive only.
   If the authenticated shell is present but #content stayed empty because an older/stale
   portal bundle stopped before its initial navigation, retry the existing Home handler.
   No API, wallet, user or database state is changed. */
(function(){
  let tries=0;
  const max=40;
  const timer=setInterval(()=>{
    try{
      const portal=document.querySelector('.portal');
      const content=document.getElementById('content');
      const home=document.querySelector('.navbtn[data-view="home"]');
      if(portal && content && home && !content.children.length){
        home.click();
      }
      if((content&&content.children.length)||++tries>=max)clearInterval(timer);
    }catch(e){
      if(++tries>=max)clearInterval(timer);
    }
  },250);
})();
