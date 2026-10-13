/* DEFORTHOCON 2026 anonymous scientific-session feedback. No personal data is requested. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('session-feedback-form'),target=$('feedback-sessions'),submit=$('feedback-submit'),status=$('feedback-status');
  if(!form || !target || !submit || !status)return;
  let sessions=[],day=0,ready=false,busy=false;
  const responses=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAcademic=title=>/^(Session\s+\d+|Special Session)\b/i.test(title);
  const sessionKey=(dayIndex,sessionIndex)=>'d'+(dayIndex+1)+'-s'+(sessionIndex+1);
  const byDay=n=>sessions.filter(x=>x.dayIndex===n);
  function paint(){
    target.innerHTML='<div class="feedback-table-head"><span>Scientific session</span><span>Rating: 1–5 or Not attended</span><span>Comment / remark (optional)</span></div>'+
      byDay(day).map(s=>{
        const current=responses.get(s.key)||{};
        const radios=[1,2,3,4,5].map(n=>
          '<label class="feedback-option"><input type="radio" name="rating-'+esc(s.key)+'" value="'+n+'" '+(current.rating===n?'checked':'')+'><span>'+n+'</span></label>').join('');
        const na='<label class="feedback-option feedback-na"><input type="radio" name="rating-'+esc(s.key)+'" value="na" '+(current.attended===false?'checked':'')+'><span>Not attended</span></label>';
        return '<div class="feedback-table-row" data-key="'+esc(s.key)+'">'+
          '<div class="feedback-session-name"><strong>'+esc(s.title)+'</strong><small>'+esc(s.time)+' h · '+esc(s.chairs.join(' · '))+'</small></div>'+
          '<fieldset class="feedback-rating"><legend class="sr-only">Rate '+esc(s.title)+'</legend>'+radios+na+'</fieldset>'+
          '<div class="feedback-remarks"><label class="sr-only" for="remark-'+esc(s.key)+'">Comment on '+esc(s.title)+'</label><textarea id="remark-'+esc(s.key)+'" data-remark="'+esc(s.key)+'" maxlength="500" rows="2" placeholder="Optional remarks">'+esc(current.comment||'')+'</textarea></div></div>';
      }).join('');
    for(const b of document.querySelectorAll('[data-feedback-day]')){
      const selected=Number(b.dataset.feedbackDay)===day;
      b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));
    }
  }
  function setState(key,patch){responses.set(key,{...(responses.get(key)||{}),...patch});}
  target.addEventListener('change',e=>{
    const input=e.target.closest('input[type="radio"]');
    if(!input)return;
    const row=input.closest('[data-key]');if(!row)return;
    setState(row.dataset.key,input.value==='na'?{rating:null,attended:false}:{rating:Number(input.value),attended:true});
  });
  target.addEventListener('input',e=>{
    const el=e.target.closest('[data-remark]');
    if(el)setState(el.dataset.remark,{comment:el.value.slice(0,500)});
  });
  document.querySelectorAll('[data-feedback-day]').forEach(b=>b.addEventListener('click',()=>{day=Number(b.dataset.feedbackDay);paint();}));
  async function checkReady(){
    try{
      const response=await fetch('/api/feedback',{cache:'no-store'});
      const info=await response.json();
      ready=response.ok&&info.ready===true;
      status.textContent=ready?'Anonymous feedback is open. Rate any sessions attended across both days, then submit once.':'Feedback collection is being prepared. Submission will open after organiser verification.';
    }catch{ready=false;status.textContent='Unable to check feedback availability. Please try again later.';}
    submit.disabled=!ready||busy;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!ready||busy)return;
    const answers=sessions.filter(s=>responses.has(s.key)).map(s=>{
      const v=responses.get(s.key);
      return {session:s.key,rating:v.rating??null,attended:v.attended===false?false:true,comment:String(v.comment||'').trim().slice(0,500)};
    }).filter(r=>r.rating!==null||r.attended===false||r.comment);
    if(!answers.length){status.textContent='Please rate at least one session, or mark it Not attended.';return;}
    busy=true;submit.disabled=true;status.textContent='Sending feedback securely…';
    try{
      const reply=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({answers,formStartedAt:startedAt,honey:''}),cache:'no-store',credentials:'omit'});
      const result=await reply.json();
      if(!reply.ok||result.ok!==true)throw new Error(result.message||'Feedback could not be saved.');
      responses.clear();paint();status.textContent='Thank you. Your anonymous feedback has been saved successfully.';
      form.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);
      submit.textContent='Feedback submitted';ready=false;
    }catch(err){status.textContent=err.message||'Unable to submit. Please try again.';}
    finally{busy=false;submit.disabled=!ready;}
  });
  const startedAt=Date.now();
  fetch('data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();})
    .then(data=>{
      sessions=(data.days||[]).flatMap((d,di)=>(d.sessions||[]).map((s,si)=>({
        key:sessionKey(di,si),title:s.title,time:s.time,chairs:s.chairs||[],dayIndex:di
      })).filter(s=>isAcademic(s.title)));
      if(!sessions.length)throw new Error();
      paint();checkReady();
    }).catch(()=>{status.textContent='Unable to load the session list. Please refresh.';});
  window.addEventListener('focus',()=>{if(!busy&&!ready)checkReady();});
})();