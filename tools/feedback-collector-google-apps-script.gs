/**
 * DEFORTHOCON 2026 feedback collector - Google Sheet-bound Apps Script.
 * No names, phone numbers, email addresses, IP addresses or device identifiers are stored.
 *
 * 1. Create an empty Google Sheet named DEFORTHOCON 2026 Feedback.
 * 2. In that Sheet: Extensions > Apps Script; replace the starter code with this file.
 * 3. Deploy > New deployment > Web app > Execute as Me > Who has access: Anyone.
 * 4. Copy its /exec URL into the organiser's PRIVATE Vercel production env variable
 *    FEEDBACK_WEBHOOK_URL (never commit the URL to GitHub).
 * 5. Redeploy and verify that GET /api/feedback reports ready:true, then submit a test
 *    and confirm that it appears in the Sheet. Delete the clearly marked test row(s).
 */
const TAB_NAME='Session Ratings';
function doPost(e){
  const out=value=>ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
  try{
    const payload=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(payload.event!=='deforthocon2026-feedback'||
       typeof payload.submissionId!=='string'||!Array.isArray(payload.rows)||
       payload.rows.length<1||payload.rows.length>12) return out({ok:false});
    const ss=SpreadsheetApp.getActiveSpreadsheet();
    if(!ss)return out({ok:false,error:'Sheet missing'});
    let sheet=ss.getSheetByName(TAB_NAME);
    if(!sheet){sheet=ss.insertSheet(TAB_NAME);
      sheet.appendRow(['Submission ID','Submitted UTC','Conference day','Session ID',
        'Scientific session','Session time','Rating / attendance','Comment / remark']);}
    const rows=payload.rows.map(r=>[
      String(payload.submissionId).slice(0,50),
      String(payload.submittedAt||'').slice(0,30),
      String(r.date||'').slice(0,60),
      String(r.sessionId||'').slice(0,30),
      String(r.session||'').slice(0,160),
      String(r.time||'').slice(0,40),
      String(r.rating||'').slice(0,30),
      // Force leading formula characters to be literal in the spreadsheet.
      (s=>/^[=+@\-\t\r]/.test(s)?"'"+s:s)(String(r.comment||'').slice(0,500))
    ]);
    sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
    SpreadsheetApp.flush();
    return out({ok:true});
  }catch(ex){console.error(ex);return out({ok:false});}
}