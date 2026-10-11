/* DEFORTHOCON certificate service. Private records are provided only via Vercel env vars. */
const crypto = require('crypto');
function constantTimeEqual(a,b) {
  const x=Buffer.from(String(a||'')); const y=Buffer.from(String(b||''));
  return x.length===y.length && x.length>0 && crypto.timingSafeEqual(x,y);
}
function normalizeRecord(r) {
  return {name:String(r.name||'').trim(),category:String(r.category||'').toLowerCase().trim(),
    eligible:r.eligible===true,certificateNo:String(r.certificateNo||'').trim(),
    emails:Array.isArray(r.emails)?r.emails.map(x=>String(x).trim().toLowerCase()):[],
    phones:Array.isArray(r.phones)?r.phones.map(x=>String(x).replace(/\D/g,'').slice(-10)):[]};
}
module.exports = function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,message:'Method not allowed.'});}
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{body={};}}
  const raw=String(body.identifier||'').trim();
  if(!raw||raw.length>120)return res.status(400).json({ok:false,message:'Enter the registered email ID or mobile number.'});

  // Isolated organiser-only DRY RUN, even before release. NO REAL attendee record is accessed.
  // To test, set CERTIFICATE_TEST_KEY in Vercel Production environment and redeploy.
  if(body.testMode===true){
    const secret=process.env.CERTIFICATE_TEST_KEY||'';
    if(secret.length<16 || !constantTimeEqual(body.testKey,secret)){
      return res.status(403).json({ok:false,message:'Test access denied. Check the private organiser test key.'});
    }
    const cat=raw==='test-faculty@deforthocon.test'?'faculty':raw==='test-delegate@deforthocon.test'?'delegate':null;
    if(!cat)return res.status(404).json({ok:false,message:'Use the synthetic delegate or faculty test identifier.'});
    return res.status(200).json({ok:true,status:'ready',certificate:{
      name:cat==='faculty'?'Dr Sample Faculty':'Dr Sample Delegate', category:cat,
      certificateNo:cat==='faculty'?'TEST-DEF26-FAC':'TEST-DEF26-DEL',testOnly:true
    }});
  }

  // Normal certificates cannot be issued before release, regardless of eligibility.
  const releaseAt=process.env.CERTIFICATE_RELEASE_AT||'2026-10-17T17:00:00+05:30';
  const release=new Date(releaseAt);
  if(!Number.isFinite(release.getTime()))return res.status(503).json({ok:false,message:'Certificate release time is not configured correctly.'});
  if(Date.now()<release.getTime())return res.status(200).json({ok:true,status:'not_released',releaseAt,
      message:'Certificates are locked until 17 October after the conference and attendance verification.'});

  let data=[];
  try { data=JSON.parse(process.env.CERTIFICATE_RECORDS_JSON||'[]'); }
  catch {return res.status(503).json({ok:false,message:'Certificate records are temporarily unavailable. Please contact the organising team.'});}
  if(!Array.isArray(data))return res.status(503).json({ok:false,message:'Certificate records are not configured correctly.'});
  const isEmail=raw.includes('@');
  const email=isEmail?raw.toLowerCase():'';
  const digits=raw.replace(/\D/g,'');
  const phone=digits.length>=10?digits.slice(-10):'';
  if((isEmail&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))||(!isEmail&&phone.length!==10))
    return res.status(400).json({ok:false,message:'Enter a valid registered email ID or 10-digit mobile number.'});
  const matches=data.map(normalizeRecord).filter(r=>
    (email&&r.emails.includes(email))||(phone&&r.phones.includes(phone)));
  if(matches.length>1)return res.status(409).json({ok:false,message:'Multiple attendee records match these details. Please contact the organising team for verification.'});
  const found=matches[0];
  if(!found)return res.status(404).json({ok:false,status:'not_found',message:'No matching registration record was found. Please contact the organising team to confirm your registered email/mobile.'});
  if(!found.eligible)return res.status(200).json({ok:true,status:'attendance_pending',message:'Registration found. Attendance has not yet been verified for certificate issue.'});
  if(!found.name || !['delegate','faculty'].includes(found.category) || !/^DEF26-[0-9A-Za-z-]{3,30}$/.test(found.certificateNo))
    return res.status(503).json({ok:false,message:'Your record needs correction before certificate issue. Please contact the organising team.'});
  return res.status(200).json({ok:true,status:'ready',certificate:{name:found.name,category:found.category,certificateNo:found.certificateNo,testOnly:false}});
};
