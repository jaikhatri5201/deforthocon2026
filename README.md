# DEFORTHOCON 2026 — Version 7.1 (MMC-accredited brochure)

Official conference PWA for 16–17 October 2026, Military Hospital Khadki, Pune.

Permanent website: https://deforthocon2026.vercel.app/

## What changed

- Replaced the programme with the latest supplied four-page scientific brochure. Day One inauguration 09:00–09:30, Insights From the Leaders 09:30–10:10 and **Inaugural Tea 10:10–10:40**.
- Chief Guest: **Surg VAdm Manish Honwad, VSM**. Removed outdated DGAFMS/Chief Patron listing.
- Updated speakers, chairs, programme timings and searchable faculty listings.
- MMC-approved **04 CPD credit points for delegates**, code **MMC/MAC/2026/D-025865** (MMC approval letter dated 09 October 2026). The accreditation also appears on brochure page 2 and in the app home, Programme and Conference information sections.
- New final certificate art prepared from the committee's 10 Oct editable certificate with the three official signatures, CPD and observer codes.
- New certificate PDF generator writes an A4 PDF **without external PDF-library dependencies**.
- Private test mode for organisers lets the committee test real API lookup + PDF downloads using **synthetic records only**, before release.

## DO NOT publish attendee records in GitHub

Attendee data belongs in the Vercel **Production Environment Variable** `CERTIFICATE_RECORDS_JSON`. The value is an array of records with `name`, `category` (`faculty` or `delegate`), `emails` (array), `phones` (array), `eligible` (boolean), and unique `certificateNo` (e.g. `DEF26-0102`). Real data must not be committed to the repository.

## Vercel settings

- `CERTIFICATE_RELEASE_AT`: `2026-10-17T17:00:00+05:30`
- `CERTIFICATE_RECORDS_JSON`: `[]` until the validated attendee list is ready
- `CERTIFICATE_TEST_KEY`: a random, private secret of at least 16 characters, set **only** in Vercel. This lets organisers run safe tests.

Redeploy after adding or changing environment variables. Vercel's Environment Variable values must be applied to **Production**.

## Safe pre-release dry run

1. Deploy the new files and wait for Vercel to show `Ready — Production`.
2. Open `https://deforthocon2026.vercel.app/?certificateTest=1#certificate`.
3. Enable organiser test mode, enter the private `CERTIFICATE_TEST_KEY`, select `Delegate` and click **Find my certificate**, then **Download certificate PDF**.
4. Repeat with `Faculty` and test on an iPhone in Safari and on a desktop browser. Both downloads must be readable A4 landscape PDF files.
5. The test certificates are clearly watermarked **TEST ONLY — NOT VALID**. Real attendee records remain unsearchable until the scheduled release and eligibility approval.
6. If testing is complete, remove `CERTIFICATE_TEST_KEY` from Vercel (then redeploy) to disable test mode entirely.

## Release checklist, 17 October

- Verify and upload master register; check uniqueness of emails/mobiles and certificate numbers.
- Ensure all eligible records have `eligible: true`, only after verifying attendance.
- Confirm faculty points in accordance with the MMC approval letter (one per lecture); the approved certificate artwork still shows `MMC Credit Hours: 04` as supplied.
- Confirm release date/time in Production env; redeploy any changed variables.
- Test one known eligible delegate and faculty AFTER release and ensure both downloaded PDFs show correct name/category/number.
- Helpdesk: contact the organising team if a record is missing, duplicated, or wrongly marked pending.

## Version naming

Update `CACHE` in `sw.js` whenever shipping a changed app. Installed PWAs will update their programme and certificate template when online.

**Source note:** The supplied brochure page 2 was minimally amended to replace the outdated “Applied For” text with MMC-approved CPD points and code. All other brochure content is retained. Day One continues to show “High Tea” on the supplied programme PDF while the app uses the committee-selected “Inaugural Tea.”
