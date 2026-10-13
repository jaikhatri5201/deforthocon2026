/* Anonymous session feedback. Submissions are forwarded only to a private organiser-owned collector. */
const crypto=require('node:crypto');
const data=require('../data.json');
const allowed=new Map();
(data.days||[]).forEach((day,di)=>(day.sessions||[]).forEach((s,si)=>{
 if(/^(Session\s+\d+|Special Session)\b/i.test(s.title)){
  allowed.set('d'+(di+1)+'-s'+(si+1),{date:day.date,session:s.title,day:di+1,time:s.time});
 }
}));
const webhook=()=>process.env.FEEDBACK_WEBHOOK_URL||'';
const configured=()=>/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(webhook());
const fail=(res,status,message)=>res.status(status).json({ok:false,message});
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store, max-age=0, must-revalidate');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='GET')return res.status(200).json({ready:configured(),anonymous:true,sessions:allowed.size});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return fail(res,405,'Method not allowed.');}
 if(!configured())return fail(res,503,'Feedback is not open yet. Please try again later.');
 let dataIn=req.body||{};
 try{if(typeof dataIn==='string')dataIn=JSON.parse(dataIn);}catch{return fail(res,400,'Invalid feedback.');}
 if(typeof dataIn!=='object'||Array.isArray(dataIn)||dataIn===null)return fail(res,400,'Invalid feedback.');
 const raw=JSON.stringify(dataIn);
 if(raw.length>15000 || dataIn.honey)return fail(res,400,'Invalid submission.');
 const elapsed=Date.now()-Number(dataIn.formStartedAt||0);
 if(!Number.isFinite(elapsed)||elapsed<1800||elapsed>7*24*3600*1000)return fail(res,400,'Please reopen the feedback form before submitting.');
 const entries=dataIn.answers;
 if(!Array.isArray(entries)||entries.length<1||entries.length>allowed.size)return fail(res,400,'Please rate at least one session.');
 const seen=new Set(), rows=[];
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||typeof entry.session!=='string'||!allowed.has(entry.session)||seen.has(entry.session))return fail(res,400,'Invalid session selection.');
  seen.add(entry.session);
  const rating=entry.rating;
  const unattended=entry.attended===false;
  if(!(rating===null&&unattended) && !(Number.isInteger(rating)&&rating>=1&&rating<=5&&!unattended)){
    // A written remark can accompany an unrated session, but explicit attendance is still required.
    if(!(rating===null&&entry.attended===true&&typeof entry.comment==='string'&&entry.comment.trim()))return fail(res,400,'Use a rating from 1 to 5 or Not attended.');
  }
  const comment=String(entry.comment||'').trim();
  if(comment.length>500)return fail(res,400,'Remarks must be 500 characters or less.');
  rows.push({...allowed.get(entry.session),sessionId:entry.session,rating:unattended?'Not attended':(rating??''),comment});
 }
 const payload={
  submissionId:crypto.randomUUID(),submittedAt:new Date().toISOString(),event:'deforthocon2026-feedback',rows
 };
 try{
  const response=await fetch(webhook(),{method:'POST',redirect:'follow',
    headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),
    signal:AbortSignal.timeout(12000)});
  const result=await response.text();
  let verified=false;
  try{verified=response.ok&&JSON.parse(result).ok===true;}catch{}
  if(!verified)throw new Error('Collector did not confirm saving the feedback.');
  return res.status(200).json({ok:true,message:'Anonymous feedback saved.'});
 }catch(err){
  console.error('Feedback submission failed:',err.message);
  return fail(res,503,'Feedback could not be saved. Please try again shortly.');
 }
};