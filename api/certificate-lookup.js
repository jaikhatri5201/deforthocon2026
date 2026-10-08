/* Secure certificate lookup for DEFORTHOCON 2026.
   Attendee data is stored only in the Vercel environment variable
   CERTIFICATE_RECORDS_JSON; it is never shipped with the public PWA.
*/
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const raw = String(body.identifier || '').trim();
  if (!raw || raw.length > 120) {
    return res.status(400).json({ ok: false, message: 'Enter the registered email ID or mobile number.' });
  }

  const releaseAt = process.env.CERTIFICATE_RELEASE_AT || '2026-10-17T17:00:00+05:30';
  const now = new Date();
  const release = new Date(releaseAt);
  if (Number.isFinite(release.getTime()) && now < release) {
    return res.status(200).json({
      ok: true,
      status: 'not_released',
      releaseAt,
      message: 'Certificates will be released after the conference and attendance verification.'
    });
  }

  let records = [];
  try { records = JSON.parse(process.env.CERTIFICATE_RECORDS_JSON || '[]'); }
  catch (_) { records = []; }

  const isEmail = raw.includes('@');
  const email = isEmail ? raw.toLowerCase() : '';
  const digits = raw.replace(/\D/g, '');
  const phone = digits.length >= 10 ? digits.slice(-10) : '';

  if ((!isEmail && !phone) || (isEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
    return res.status(400).json({ ok: false, message: 'Enter a valid registered email ID or 10-digit mobile number.' });
  }

  const found = records.find(r =>
    (email && Array.isArray(r.emails) && r.emails.some(v => String(v).toLowerCase() === email)) ||
    (phone && Array.isArray(r.phones) && r.phones.some(v => String(v).replace(/\D/g, '').slice(-10) === phone))
  );

  if (!found) {
    return res.status(404).json({
      ok: false,
      status: 'not_found',
      message: 'No matching registration record was found. Please check the email/mobile used for registration.'
    });
  }

  if (!found.eligible) {
    return res.status(200).json({
      ok: true,
      status: 'attendance_pending',
      message: 'Your record was found, but the certificate has not yet been released. Attendance verification is pending.'
    });
  }

  return res.status(200).json({
    ok: true,
    status: 'ready',
    certificate: {
      name: String(found.name || ''),
      category: found.category === 'faculty' ? 'faculty' : 'delegate',
      certificateNo: String(found.certificateNo || '')
    }
  });
};
