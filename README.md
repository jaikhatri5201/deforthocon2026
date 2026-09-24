# DEFORTHOCON 2026 — MH Khadki conference PWA (homepage design v2)

A lightweight static installable website, visually aligned to the finalised cream, maroon, navy and gold brochure. The home screen features the approved simple AMC-based emblem, readable event information, four navigation cards, daily programme links and a direct registration button. No paid domain, backend, database or API key is required for this version.

## Contents

- `index.html`, `style.css`, `app.js`: interface and interactions
- `data.json`: scientific programme, registration link, organiser contacts, notices
- `faculty_profiles.json`: editable verified photograph/affiliation/biography fields
- `assets/`: original brochure, genuine AMC-based app icons, registration QR
- `manifest.webmanifest`, `sw.js`: install and offline support

## Preview locally

From inside this folder run `python3 -m http.server 8000`, then visit `http://localhost:8000`. Do **not** open `index.html` directly using `file://`, because the site fetches JSON data.

## Free publishing option

1. Create or sign in to a Vercel account.
2. Upload this folder to a GitHub repository and import the repository into Vercel, or use Vercel CLI (`npx vercel` in the folder).
3. Choose **Other** as framework, the project root as the root directory, and leave the build command empty.
4. Deploy. The resulting URL can use a free `vercel.app` subdomain.
5. Open the HTTPS URL in Chrome/Edge (Install) or iOS Safari (Share → Add to Home Screen).

This folder has no `package.json`: it is a plain static site. Vercel may ask for a build preset; select **Other**.

## Updating the programme

Edit `data.json` > `days` > session time/chairs/entries. Revise `announcements` when appropriate. Commit/push or redeploy. **Do not re-run `build_data.py` after manual edits**: it is a starter-data generation script and would overwrite the JSON files.

The app uses network-first fetches with a cached fallback. Newly published content appears when a delegate opens/refreshes the app while online or taps Check for latest version. It does not send push notifications.

## Faculty profiles

Supply approved images under `assets/faculty/`, for example `assets/faculty/firstname-lastname.jpg`, then edit the exact person's record in `faculty_profiles.json`:

```json
{
  "photo": "assets/faculty/firstname-lastname.jpg",
  "affiliation": "Verified hospital or institution",
  "bio": "Short approved biography"
}
```

Only names and session roles from the brochure are currently populated; blank photo/affiliation/bio fields deliberately avoid making claims about faculty. Please obtain permission to publish portraits and use only confirmed professional information.

## Registration

The homepage and header Register buttons, and the QR in the Information panel, point to the registration URL encoded by the QR on page 2 of the finalised brochure. The URL points to an external Google Form. The app neither collects personal information nor handles payments.

## Accuracy and public release

The scientific programme follows pages 3 and 4 of the finalised brochure, with later changes expected. Check every speaker name, timing, venue detail and QR destination before issuing the public link. Do not place restricted military/hospital information or patient identifiers in the public app.


## Faculty directory (Version 3)
The Faculty page is intentionally text-first and uses the supplied MMC accreditation faculty list. No photographs or biographical claims are included. Each card shows the faculty member name, programme role, institution/affiliation and submitted session/topic details.


## Version 4: Brochure reader fix

The default **View brochure** link now opens a four-page image reader inside the app, rather than handing the installed PWA to the device's native PDF viewer. It includes a sticky **✕ Close** button, a bottom **Back to app** button, and **Zoom / Fit** control. The original PDF remains available through a separately-opening link at the end of the reader. The service worker cache has been bumped to `deforthocon-v4-brochure-reader` and all four reader images are cached for offline use.

To update the *existing* live URL, deploy these files to the existing Vercel project, not a second project. After publishing, completely close/reopen the installed PWA, then test the reader and its Back button.


## Version 5
- Adds a device-aware install guidance popup for iPhone/iPad and Android.
- Android/Chromium uses the browser's native install prompt when available.
- iPhone/iPad shows three concise Share → Add to Home Screen → Add instructions.
- Popup is suppressed when already installed and after dismissal for five days.
- Existing in-page Install section remains available under Conference information.
- Service-worker cache key bumped to force existing users onto v5 assets after redeployment.
