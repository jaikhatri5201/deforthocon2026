# DEFORTHOCON 2026 PWA — Version 6

Permanent production URL: https://deforthocon2026.vercel.app/

## Version 6 changes
- Scientific programme updated to Programme 4 (08 October 2026).
- Latest 4-page programme PDF is available in the in-app reader.
- Organising team includes Nodal Officer: Lt Col JP Khatri — 8826985246.
- Added **My Certificate** utility for Faculty and Delegates.
- Certificate lookup accepts the registered email ID or mobile number.
- Attendee contact details are **not** stored in public repository files.
- Certificate release is date-gated and attendance-gated.
- Locked DEFORTHOCON certificate artwork is used as the background; only name, category and unique certificate number are added dynamically.
- MMC Credit Hours: 04.

## Certificate privacy / deployment
The API endpoint `api/certificate-lookup.js` reads the private attendee records from the Vercel environment variable:

`CERTIFICATE_RECORDS_JSON`

Do **not** commit the attendee workbook or private certificate record JSON to GitHub.

Recommended additional environment variable:
`CERTIFICATE_RELEASE_AT=2026-10-17T17:00:00+05:30`

The current secure records file is maintained separately from the public PWA. Before certificate release, update `eligible` to `true` only for persons whose attendance has been verified.

## Certificate numbering
Current numbering is a single continuous sequence:
- faculty first
- delegates next
- format `DEF26-0001`, `DEF26-0002`, etc.

Future additions should receive the next unused number; do not renumber already-issued certificates.

## Files most often edited
- `data.json` — programme, committee, contacts, announcements
- `faculty_profiles.json` — faculty directory
- `api/certificate-lookup.js` — lookup service
- `certificate.js` — certificate PDF generation
- `assets/certificate-template.png` — locked certificate artwork
- `style.css` — UI styling
- `sw.js` — cache version / offline assets

## Important
Programme 4 is still subject to further changes. Update `data.json`, programme PDF/pages and bump the service-worker cache key whenever a new programme version is published.
