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
function jpegBytes(canvas){const b64=canvas.toDataURL('image/jpeg',0.94).split(',')[1],s=atob(b64);const a=new Uint8Array(s.length);for(let i=0;i<a.length;i++)a[i]=s.charCodeAt(i);return a;}
async function download(){
 if(!cert)return;
 const btn=$('certificate-download');btn.disabled=true;btn.textContent='Preparing PDF…';
 try{
  const categoryImage=cert.category==='faculty'?'Faculty':cert.category==='delegate'?'Delegate':null;
  if(!categoryImage)throw new Error('Certificate category is not valid.');
  const bg=await loadImage(`assets/DEFORTHOCON_2026_${categoryImage}_Certificate_Approved_17Oct2026.png`).catch(()=>{throw new Error('Approved certificate artwork is not installed. Please contact the organiser.');});
  const c=document.createElement('canvas');c.width=bg.naturalWidth;c.height=bg.naturalHeight;
  const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(bg,0,0,c.width,c.height);
  const w=c.width,h=c.height;
  // 17 October 2026: observer-approved Faculty and Delegate master,
  // transcribed from the two-slide approved PPTX. The existing logos, frame,
  // authorised signatures and issue date remain on the category artwork.
  // Replace superseded text from the previous master; do not alter the art.
  const paper='#faf7f0',maroon='#860020',navy='#1a2a54',ink='#3c3c3c';
  const shade=(x1,y1,x2,y2)=>{ctx.fillStyle=paper;ctx.fillRect(w*x1,h*y1,w*(x2-x1),h*(y2-y1));};
  shade(.10,.440,.90,.779);
  shade(.740,.835,.968,.941);
  shade(.690,.938,.968,.972);
  shade(.044,.940,.325,.972);
  const serif='Georgia, "Times New Roman", serif';
  function line(value,x,y,pt,maxWidth,options={}){
    let size=pt*w/841.89;
    const style=(options.italic?'italic ':'')+(options.bold?'bold ':'');
    ctx.textAlign=options.align||'center';ctx.textBaseline='middle';
    ctx.fillStyle=options.color||navy;
    while(size>=w*.011){
      ctx.font=style+size+'px '+(options.font||serif);
      if(ctx.measureText(value).width<=w*maxWidth)break;
      size-=1;
    }
    ctx.fillText(value,w*x,h*y);
  }
  line('This is to certify that,',.495,.472,20,.52,{italic:true});
  const nameSize=30*w/841.89;
  if(document.fonts?.load){try{await document.fonts.load('italic '+nameSize+'px '+attendeeNameFont,cert.name);}catch{}}
  drawFittedText(ctx,cert.name,{x:w*.495,y:h*.527,pt:nameSize,minPt:w*.021,width:w*.47,
    color:maroon,font:attendeeNameFont,weight:'italic'});
  ctx.beginPath();ctx.moveTo(w*.295,h*.564);ctx.lineTo(w*.705,h*.564);
  ctx.strokeStyle='#c59547';ctx.lineWidth=Math.max(1,w*.0011);ctx.stroke();
  line('has attended DEFORTHOCON 2026',.495,.595,19,.65,{bold:true,color:maroon});
  line('held at Military Hospital Khadki, Pune on 16 – 17 October 2026.',.495,.642,16,.79);
  const isFaculty=cert.category==='faculty';
  line('Your participation as '+(isFaculty?'faculty':'a delegate')+' is acknowledged and appreciated.',
    .495,.683,16,.79,{italic:true});
  line('Maharashtra Medical Council has approved '+(isFaculty?'05':'04')+
    ' CPD credit points for '+(isFaculty?'faculty.':'delegates.'),
    .495,.720,12.8,.79,{bold:true,color:maroon});
  line('MMC CPD Code Number: MMC/MAC/2026/D-025865   •   NO: MMC/Accre.Cert/SPA-0334/2015 / 09 Oct 2026',
    .495,.757,11.6,.82,{color:ink});
  // Print-fidelity repair: use the actual signature pixels ALREADY IN THE
  // approved image master, never hand-traced/Path2D imitations.
  // Crop boxes are mapped from the embedded signature images and geometry
  // of the two-slide, 17 October observer-approved PPT (A4 landscape).
  ctx.fillStyle=paper;
  ctx.fillRect(w*.035,h*.779,w*.93,h*.192);
  const signatureCrops=[
    // original embedded signatures: Convenor, Chairperson, Organising Secretary
    {sx:.0895,sy:.7860,sw:.1603,sh:.0705,dx:.0895,dy:.7860,dw:.1603,dh:.0705},
    {sx:.3257,sy:.8060,sw:.1274,sh:.0708,dx:.3257,dy:.8060,dw:.1274,dh:.0708},
    {sx:.5733,sy:.7830,sw:.1104,sh:.0727,dx:.5733,dy:.7830,dw:.1104,dh:.0727}
  ];
  for(const s of signatureCrops){
    ctx.drawImage(bg,w*s.sx,h*s.sy,w*s.sw,h*s.sh,
      w*s.dx,h*s.dy,w*s.dw,h*s.dh);
  }
  // Preserve the approved four-column signatory panel; observer has no digital signature.
  line('Col Rup Singh Parmar',.186,.875,13.2,.235,{bold:true,color:maroon});
  line('Convenor',.186,.907,12.8,.16,{bold:true,color:maroon});
  line('Brig Vishal Sondhi',.404,.875,13.2,.215,{bold:true,color:maroon});
  line('Organising Chairperson',.404,.907,12.3,.24,{bold:true,color:maroon});
  line('Lt Col Tushar Gogia',.628,.875,13.2,.22,{bold:true,color:maroon});
  line('Organising Secretary',.628,.907,12.3,.245,{bold:true,color:maroon});
  line('Dr Yogesh Gaikwad',.850,.875,13.2,.205,{bold:true,color:maroon});
  line('MMC Observer',.850,.907,12.6,.18,{bold:true,color:maroon});
  line('Code: MMC/MAO-01266/2017',.850,.954,10.3,.255,{color:ink});
  line('Certificate No.:',.058,.954,11.9,.122,{align:'left',color:ink});
  line(cert.certificateNo,.180,.954,11.9,.17,{align:'left',color:ink});
  line('Date of Issue: 17 October 2026',.500,.954,11.9,.31,{color:ink});
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
