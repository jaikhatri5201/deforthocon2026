/* Exact-source certificate artwork, dynamic verified fields, and a private dry-run test.
   Offline-capable PDF writer embeds the completed A4 certificate as a full-page JPEG.
   It does NOT rely on an external PDF JavaScript CDN. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const isTestPage=new URLSearchParams(location.search).get('certificateTest')==='1';
let cert=null;
function message(msg,kind='info'){
 const el=$('certificate-message');if(!el)return;
 el.textContent=msg||'';el.className='certificate-message '+kind;el.hidden=!msg;
}
const testSelected=()=>isTestPage&&$('certificate-test-toggle')?.checked;
async function lookup(e){
 e?.preventDefault?.();cert=null;$('certificate-result').hidden=true;
 const test=testSelected();
 const identifier=test?('test-'+$('certificate-test-category').value+'@deforthocon.test'):$('certificate-identifier').value.trim();
 if(!identifier)return message('Enter the registered email ID or mobile number.','error');
 const key=test?$('certificate-test-key').value:'';
 if(test && !key)return message('Enter the private organiser test key.','error');
 const btn=$('certificate-submit');btn.disabled=true;btn.textContent='Checking…';
 message(test?'Testing the certificate service…':'Checking the certificate record…');
 try {
   const response=await fetch('/api/certificate-lookup',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({identifier,testMode:test,testKey:key}),cache:'no-store',credentials:'same-origin'});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.ok)return message(result.message||'Certificate service unavailable.','error');
   if(result.status!=='ready')return message(result.message||'Certificate not available.',result.status==='not_released'?'info':'pending');
   cert=result.certificate;
   $('certificate-person-name').textContent=cert.name;
   $('certificate-person-category').textContent=cert.category==='faculty'?'Faculty':'Delegate';
   $('certificate-person-cpd').textContent=cert.category==='faculty'?'05 CPD points for faculty':'04 CPD points for delegates';
   $('certificate-person-number').textContent=cert.certificateNo;
   $('certificate-result').hidden=false;
   message(cert.testOnly?'TEST ONLY: download a watermarked sample PDF to check the complete workflow.':'Certificate ready. Verify your name before downloading.','success');
 }catch(err){message('Unable to reach certificate server. Check your internet connection and retry.','error');}
 finally{btn.disabled=false;btn.textContent='Find my certificate';}
}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
// Apple Chancery is a device font; unavailable devices use an italic serif fallback.
const attendeeNameFont='"Apple Chancery", Georgia, "Times New Roman", serif';
function drawFittedText(ctx,text,{x,y,pt=85,minPt=45,width,color,font,weight=''}){
  let size=pt;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
  for(;size>=minPt;size-=2){ctx.font=`${weight} ${size}px ${font}`;if(ctx.measureText(text).width<=width)break;}
  if(size<minPt)throw new Error('The attendee name is too long for the certificate. Contact the organiser to verify its spelling.');
  ctx.fillText(text,x,y);
}
const ascii=s=>new TextEncoder().encode(s);
function bytesConcat(chunks){const len=chunks.reduce((a,b)=>a+b.length,0);const result=new Uint8Array(len);let at=0;for(const p of chunks){result.set(p,at);at+=p.length;}return result;}
function pdfFromJpeg(jpeg,width,height){
 const pagesize='841.89 595.28';
 const offsets=[0],parts=[];let count=0;
 function append(u){parts.push(u);count+=u.length;}
 function obj(id,body){offsets[id]=count;append(ascii(`${id} 0 obj\n`));for(const segment of body)append(segment);append(ascii('\nendobj\n'));}
 append(ascii('%PDF-1.4\n%----\n'));
 obj(1,[ascii('<< /Type /Catalog /Pages 2 0 R >>')]);
 obj(2,[ascii('<< /Type /Pages /Count 1 /Kids [3 0 R] >>')]);
 obj(3,[ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pagesize}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`)]);
 obj(4,[ascii(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,ascii('\nendstream')]);
 const commands=ascii('q\n841.89 0 0 595.28 0 0 cm\n/Im0 Do\nQ\n');
 obj(5,[ascii(`<< /Length ${commands.length} >>\nstream\n`),commands,ascii('endstream')]);
 const startxref=count;
 append(ascii(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`));
 return new Blob([bytesConcat(parts)],{type:'application/pdf'});
}
function jpegBytes(canvas){const b64=canvas.toDataURL('image/jpeg',0.99).split(',')[1],s=atob(b64);const a=new Uint8Array(s.length);for(let i=0;i<a.length;i++)a[i]=s.charCodeAt(i);return a;}
async function download(){
 if(!cert)return;
 const btn=$('certificate-download');btn.disabled=true;btn.textContent='Preparing PDF…';
 try{
  const categoryImage=cert.category==='faculty'?'Faculty':cert.category==='delegate'?'Delegate':null;
  if(!categoryImage)throw new Error('Certificate category is not valid.');
  const bg=await loadImage(`assets/DEFORTHOCON_2026_${categoryImage}_Certificate_FINAL_17Oct2026_v2.png`).catch(()=>{throw new Error('Approved certificate artwork is not installed. Please contact the organiser.');});
  const c=document.createElement('canvas');c.width=bg.naturalWidth;c.height=bg.naturalHeight;
  const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(bg,0,0,c.width,c.height);
  const w=c.width,h=c.height;
  // The two observer-approved PNGs contain ALL fixed certificate wording,
  // CPD points, CPD code, logos, names/designations and authentic signatures.
  // Never mask or redraw any of that approved artwork. The ONLY additions
  // are the verified attendee name and the unique certificate number.
  const ink='#3c3c3c',maroon='#860020';
  const nameSize=30*w/841.89;
  if(document.fonts?.load){try{await document.fonts.load(`italic ${nameSize}px ${attendeeNameFont}`,cert.name);}catch{}}
  drawFittedText(ctx,cert.name,{x:w*.495,y:h*.527,pt:nameSize,minPt:w*.021,width:w*.57,
    color:maroon,font:attendeeNameFont,weight:'italic'});
  const numberSize=11.8*w/841.89;
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=ink;
  ctx.font=`${numberSize}px Georgia, "Times New Roman", serif`;
  if(ctx.measureText(cert.certificateNo).width>w*.18){
    throw new Error('The certificate number is too long for the approved layout. Contact the organiser.');
  }
  ctx.fillText(cert.certificateNo,w*.190,h*.956);
  if(cert.testOnly){
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-0.25);
    ctx.fillStyle='rgba(170,23,45,0.27)';ctx.textAlign='center';ctx.font=`bold ${w*.095}px Arial, sans-serif`;
    ctx.fillText('TEST ONLY',0,0);ctx.font=`bold ${w*.020}px Arial, sans-serif`;
    ctx.fillText('NOT VALID FOR MMC CREDIT OR ATTENDANCE',0,h*.085);ctx.restore();
  }
  const blob=pdfFromJpeg(jpegBytes(c),c.width,c.height);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');const safe=cert.name.replace(/[^\w\- ]/g,'').trim().replace(/\s+/g,'_')||'Certificate';
  a.href=url;a.download=`DEFORTHOCON_2026_${safe}_${cert.certificateNo}.pdf`;document.body.append(a);a.click();a.remove();
  message(cert.testOnly?'Watermarked test PDF generated. Open it and inspect the name, category, signatures and certificate number.':'Certificate PDF prepared. If the download is not visible, check your browser Downloads folder.','success');
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(err){console.error(err);message('PDF could not be prepared: '+(err.message||'Please retry in Safari or Chrome.'),'error');}
 finally{btn.disabled=false;btn.textContent='Download certificate PDF';}
}
function setup(){
 $('certificate-form')?.addEventListener('submit',lookup);
 $('certificate-download')?.addEventListener('click',download);
 if(isTestPage){const panel=$('certificate-test-panel');panel.hidden=false;
   $('certificate-test-toggle').addEventListener('change',()=>{
      const enabled=testSelected();$('certificate-test-controls').hidden=!enabled;
      $('certificate-identifier').disabled=enabled;$('certificate-identifier').required=!enabled;
      $('certificate-result').hidden=true;cert=null;message('');
   });
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
