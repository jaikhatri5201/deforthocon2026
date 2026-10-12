/* Timed download service: no public PDF files; encrypted-at-rest artifacts and server-only key. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const RELEASE_AT='2026-10-16T09:30:00+05:30'; // Conference-local IST, exact
const RELEASE_MS=Date.parse(RELEASE_AT);
const DOCUMENTS=Object.freeze({
 abstracts:{file:'abstracts.enc',name:'DEFORTHOCON_2026_Conference_Abstracts.pdf'},
 english:{file:'english.enc',name:'Arthroplasty_Patient_Information_English.pdf'},
 hindi:{file:'hindi.enc',name:'Arthroplasty_Patient_Information_Hindi.pdf'}
});
module.exports=function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,message:'Method not allowed.'});}
  const doc=typeof req.query?.doc==='string'?req.query.doc.trim():'';
  if(!doc)return res.status(200).json({released:Date.now()>=RELEASE_MS,releaseAt:RELEASE_AT});
  const item=Object.prototype.hasOwnProperty.call(DOCUMENTS,doc)?DOCUMENTS[doc]:null;
  if(!item)return res.status(404).json({ok:false,message:'Document not found.'});
  if(Date.now()<RELEASE_MS)return res.status(423).json({ok:false,message:'Available on 16 October 2026 at 09:30 hrs IST.'});
  const secret=process.env.PUBLICATIONS_AES256_KEY||'';
  if(!/^[0-9a-f]{64}$/i.test(secret))return res.status(503).json({ok:false,message:'This publication is being prepared. Please try again shortly.'});
  try{
    const encrypted=fs.readFileSync(path.join(process.cwd(),'private','publications',item.file));
    if(encrypted.length<29)throw new Error('Invalid encrypted document.');
    // Binary format: 12-byte nonce || encrypted PDF || 16-byte AES-GCM authentication tag.
    const nonce=encrypted.subarray(0,12),tag=encrypted.subarray(encrypted.length-16),body=encrypted.subarray(12,encrypted.length-16);
    const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(secret,'hex'),nonce);
    decipher.setAuthTag(tag);
    const pdf=Buffer.concat([decipher.update(body),decipher.final()]);
    if(pdf.subarray(0,5).toString()!=='%PDF-')throw new Error('Decrypted document is not PDF.');
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="'+item.name+'"');
    res.setHeader('Content-Length',String(pdf.length));
    return res.status(200).end(pdf);
  }catch(e){
    console.error('Publication unavailable',doc,e.message);
    return res.status(503).json({ok:false,message:'Download temporarily unavailable. Please contact the organising team.'});
  }
};
