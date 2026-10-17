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
  const bg=await loadImage(`assets/DEFORTHOCON_2026_${categoryImage}_Certificate_BG_FINAL.png`).catch(()=>{throw new Error('Approved certificate artwork is not installed. Please contact the organiser.');});
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
  // Restore all THREE authorised signatures from the 17 October approved PPTX.
  // The former background placed the third signature in the observer column;
  // repaint the bottom band and use the approved four-column arrangement.
  // These paths were traced from the three signature images in that PPTX.
  ctx.fillStyle=paper;
  ctx.fillRect(w*.036,h*.780,w*.929,h*.185);
  const signatures=[
    {x:.186,y:.807,width:.124,height:.054,vw:349,vh:105,path:"M132,84 131,87 134,87 135,85Z M348,45 346,44 342,47 331,50 325,50 322,52 314,52 231,66 224,66 216,69 172,77 160,81 153,81 151,83 153,85 157,85 163,82 180,78 236,68 240,66 248,66 271,61 293,59 296,57 325,54 343,50 347,48Z M255,22 249,21 252,24 250,29 237,40 229,42 225,36 227,26 221,25 226,11 225,2 221,0 218,1 210,11 209,19 215,27 215,30 205,42 201,40 198,29 190,28 183,37 181,42 178,40 175,34 170,34 167,39 162,38 157,42 154,42 156,48 150,54 148,49 142,46 146,39 146,32 143,32 140,35 129,40 106,57 89,55 93,42 92,39 90,39 88,50 85,56 73,54 68,50 69,45 78,40 115,29 150,21 168,15 172,10 170,8 166,8 113,23 111,25 82,34 72,40 28,54 26,56 9,62 7,64 7,69 13,69 11,65 14,62 56,47 60,47 61,45 66,46 65,51 68,55 74,57 82,57 84,59 84,63 81,67 63,73 61,75 17,93 1,101 0,104 18,101 20,99 25,99 45,92 62,88 64,86 68,86 91,78 95,75 98,75 104,81 104,78 101,74 103,72 109,70 124,58 128,62 134,60 141,50 144,50 146,52 146,57 151,57 154,53 158,54 159,45 163,41 166,45 166,51 168,51 170,39 172,37 174,38 176,43 183,48 190,46 194,42 196,37 201,45 207,44 221,28 223,30 223,41 226,44 234,44 250,34 255,27Z"},
    {x:.404,y:.809,width:.105,height:.052,vw:281,vh:105,path:"M280,66 277,68 280,69Z M44,46 44,50 47,50 47,47Z M255,30 252,30 249,45 247,47 240,44 236,45 248,49 252,45 251,41 255,33Z M2,23 0,24 1,27Z M56,104 68,103 120,87 158,79 220,71 254,70 263,72 264,70 256,68 220,69 177,74 137,81 137,78 149,74 154,66 157,68 165,66 169,62 169,58 171,56 183,57 184,60 189,60 189,58 186,58 185,54 167,55 164,51 161,51 154,58 152,64 136,48 138,42 148,38 160,30 162,25 157,24 146,30 136,40 134,44 134,49 137,54 150,66 150,69 147,72 135,76 133,74 133,59 127,54 121,54 127,33 127,19 124,18 116,39 113,62 108,66 101,68 101,63 96,60 93,62 91,70 96,70 99,72 100,70 104,70 112,66 113,74 115,76 117,75 122,79 133,79 135,81 132,83 101,90 72,100 56,102Z M257,17 257,20 260,20 260,17Z M91,12 88,13 72,52 69,64 63,70 61,70 59,67 59,64 65,59 69,53 69,48 64,47 60,49 56,55 56,64 35,82 34,80 40,67 40,62 38,62 38,66 31,82 31,85 37,84 50,71 56,67 59,71 48,79 48,83 50,85 58,83 62,78 62,73 66,70 68,71 69,77 72,77 79,69 81,76 89,75 84,75 82,73 82,66 80,66 71,75 70,67 83,49 87,40Z M43,4 37,6 29,22 29,29 32,35 35,37 31,28 31,23 36,12 42,7 43,16 41,28 33,55 20,79 14,86 8,89 5,88 3,85 2,74 4,61 14,23 14,8 12,6 7,10 3,18 4,21 8,13 11,10 12,11 11,28 4,52 0,74 1,86 6,91 10,91 18,85 33,60 38,46 42,25 44,21 45,7Z M238,0 235,1 231,8 225,30 224,41 219,46 214,48 213,46 220,30 220,3 218,4 217,11 210,30 210,47 203,55 201,54 200,49 196,53 197,57 203,57 211,49 217,50 223,45 224,47 228,47 226,44 226,40 235,19 236,12 238,9Z"},
    {x:.628,y:.809,width:.117,height:.052,vw:306,vh:105,path:"M261,40 266,45 266,41Z M305,104 298,100 280,94 250,89 228,88 223,86 228,78 230,66 242,57 243,59 241,65 244,68 248,69 264,65 278,68 289,67 294,65 298,61 297,58 289,63 272,63 267,61 269,56 267,54 263,54 255,59 253,65 247,65 245,63 253,52 250,50 233,62 231,62 230,60 239,51 237,48 234,48 225,55 224,59 221,58 222,55 219,52 212,51 205,55 200,60 199,64 181,71 180,69 172,69 168,64 171,61 200,47 229,27 242,14 244,10 243,3 238,0 224,0 201,6 180,14 162,23 141,37 130,48 127,55 117,64 114,63 117,58 117,53 137,28 142,20 141,18 138,18 131,23 102,52 87,64 85,62 91,53 90,50 71,63 69,63 69,60 66,58 52,68 51,67 61,56 61,54 58,53 52,60 42,68 32,74 27,75 26,68 37,55 50,21 55,15 61,11 60,9 58,9 46,17 34,22 30,26 32,28 35,28 36,25 45,21 46,22 41,42 31,61 29,63 28,62 31,54 31,48 28,45 24,45 11,52 5,58 0,68 0,75 3,78 12,77 22,71 24,72 24,75 26,77 32,77 42,71 43,74 48,74 57,68 59,72 79,72 85,69 93,69 99,67 108,61 109,66 111,68 123,67 126,65 130,65 133,67 154,67 165,64 168,70 171,72 171,76 176,77 201,65 211,67 219,62 226,61 226,66 211,78 204,86 173,86 128,89 57,99 52,101 51,103 99,94 130,90 197,87 203,89 203,94 205,96 211,96 221,88 237,89 278,95Z"}
  ];
  for(const s of signatures){
    ctx.save();
    ctx.translate(w*(s.x-s.width/2),h*s.y);
    ctx.scale(w*s.width/s.vw,h*s.height/s.vh);
    ctx.fillStyle='#303448';
    ctx.fill(new Path2D(s.path));
    ctx.restore();
  }
  line('Col Rup Singh Parmar',.186,.875,13.2,.235,{bold:true,color:maroon});
  line('Convenor',.186,.907,12.8,.16,{bold:true,color:maroon});
  line('Brig Vishal Sondhi',.404,.875,13.2,.215,{bold:true,color:maroon});
  line('Organising Chairperson',.404,.907,12.3,.24,{bold:true,color:maroon});
  line('Lt Col Tushar Gogia',.628,.875,13.2,.22,{bold:true,color:maroon});
  line('Organising Secretary',.628,.907,12.3,.245,{bold:true,color:maroon});
  // MMC specifically prohibits the observer's digital signature.
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
