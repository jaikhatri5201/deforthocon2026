/* DEFORTHOCON Digital Publications. The SERVER authorises releases; browser time never does. */
(() => {
  'use strict';
  const releaseLabel='Available 16 Oct, 09:30 IST';
  const tabs=[...document.querySelectorAll('[data-publication-tab]')];
  const statusEl=document.getElementById('publication-status');
  const links=[...document.querySelectorAll('[data-publication-doc]')];
  if(!statusEl||!tabs.length||!links.length)return;
  function select(which){
    for(const tab of tabs){
      const selected=tab.dataset.publicationTab===which;
      tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex=selected?0:-1;
      document.getElementById('publication-panel-'+tab.dataset.publicationTab).hidden=!selected;
    }
  }
  tabs.forEach(tab=>tab.addEventListener('click',()=>select(tab.dataset.publicationTab)));
  select('souvenir');
  let lastStatus=null;
  async function updateStatus(){
    try{
      const response=await fetch('/api/publications',{cache:'no-store'});
      if(!response.ok)throw new Error('status unavailable');
      const info=await response.json();
      const ready=info.released===true;
      links.forEach(a=>{
        if(ready){
          const doc=a.dataset.publicationDoc;
          a.setAttribute('href','/api/publications?doc='+encodeURIComponent(doc));
          a.setAttribute('aria-disabled','false');a.removeAttribute('tabindex');
          a.textContent='Download PDF ↓';
        }else{
          a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1');
          a.textContent=releaseLabel;
        }
      });
      statusEl.textContent=ready?'Released · Downloads now available':'Scheduled release: Friday, 16 October 2026 at 09:30 hrs IST';
      lastStatus=ready;
    }catch{
      if(lastStatus===true)return; // A previously verified release still requires server authorisation at download.
      links.forEach(a=>{a.removeAttribute('href');a.setAttribute('aria-disabled','true');a.setAttribute('tabindex','-1');a.textContent=releaseLabel;});
      statusEl.textContent='Release status temporarily unavailable. Please refresh this page.';
    }
  }
  updateStatus();
  window.addEventListener('focus',updateStatus);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateStatus()});
  setInterval(updateStatus,30000);
})();
