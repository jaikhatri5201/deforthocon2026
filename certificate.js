/* DEFORTHOCON 2026 certificate lookup + client-side PDF generation */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let cert = null;

  const setMessage = (message, kind='info') => {
    const box = $('certificate-message');
    if (!box) return;
    box.textContent = message || '';
    box.className = 'certificate-message ' + kind;
    box.hidden = !message;
  };

  const lookup = async (event) => {
    event?.preventDefault?.();
    cert = null;
    $('certificate-result').hidden = true;
    const identifier = $('certificate-identifier').value.trim();
    if (!identifier) return setMessage('Enter the registered email ID or mobile number.', 'error');

    $('certificate-submit').disabled = true;
    $('certificate-submit').textContent = 'Checking…';
    setMessage('Checking your certificate record…', 'info');
    try {
      const response = await fetch('/api/certificate-lookup', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({identifier}),
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setMessage(payload.message || 'Unable to find a matching certificate record.', 'error');
        return;
      }
      if (payload.status !== 'ready') {
        setMessage(payload.message || 'Certificate is not yet available.', payload.status === 'not_released' ? 'info' : 'pending');
        return;
      }
      cert = payload.certificate;
      $('certificate-person-name').textContent = cert.name;
      $('certificate-person-category').textContent = cert.category === 'faculty' ? 'Faculty' : 'Delegate';
      $('certificate-person-number').textContent = cert.certificateNo;
      $('certificate-result').hidden = false;
      setMessage('Certificate ready. Please verify your name before downloading.', 'success');
    } catch (_) {
      setMessage('Could not reach the certificate service. Please check your connection and try again.', 'error');
    } finally {
      $('certificate-submit').disabled = false;
      $('certificate-submit').textContent = 'Find my certificate';
    }
  };

  const loadImage = src => new Promise((resolve,reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const fitFont = (ctx, text, maxWidth, startPx, minPx) => {
    let size = startPx;
    while (size > minPx) {
      ctx.font = `${size}px "Alex Brush", "Apple Chancery", "Segoe Script", cursive`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  };

  const generatePDF = async () => {
    if (!cert) return;
    const button = $('certificate-download');
    button.disabled = true;
    button.textContent = 'Preparing PDF…';
    try {
      if (!window.jspdf?.jsPDF) throw new Error('PDF library unavailable');
      try { await document.fonts.load('120px "Alex Brush"'); } catch (_) {}

      const bg = await loadImage('assets/certificate-template.png');
      const canvas = document.createElement('canvas');
      canvas.width = bg.naturalWidth || 3507;
      canvas.height = bg.naturalHeight || 2482;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      // Name — centred in the exact blank name field of the locked proforma.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#a1123f';
      const nameSize = fitFont(ctx, cert.name, canvas.width * 0.48, 126, 82);
      ctx.font = `${nameSize}px "Alex Brush", "Apple Chancery", "Segoe Script", cursive`;
      ctx.fillText(cert.name, canvas.width * 0.492, canvas.height * 0.548);

      // Dynamic category wording.
      ctx.fillStyle = '#21365e';
      ctx.font = `italic 54px Georgia, "Times New Roman", serif`;
      ctx.fillText(`as ${cert.category} to the academic success of the conference.`, canvas.width * 0.525, canvas.height * 0.790);

      // Unique certificate number after the fixed "Certificate No.:" label.
      ctx.textAlign = 'left';
      ctx.fillStyle = '#3f3a34';
      ctx.font = `38px Georgia, "Times New Roman", serif`;
      ctx.fillText(cert.certificateNo, canvas.width * 0.182, canvas.height * 0.957);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({orientation:'landscape', unit:'mm', format:'a4', compress:true});
      const img = canvas.toDataURL('image/jpeg', 0.96);
      pdf.addImage(img, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      const safe = cert.name.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'_') || 'Certificate';
      pdf.save(`DEFORTHOCON_2026_${safe}_${cert.certificateNo}.pdf`);
    } catch (err) {
      console.error(err);
      setMessage('Certificate PDF could not be generated on this device. Please try again in Chrome, Safari or Edge.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Download certificate PDF';
    }
  };

  const setup = () => {
    $('certificate-form')?.addEventListener('submit', lookup);
    $('certificate-download')?.addEventListener('click', generatePDF);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
