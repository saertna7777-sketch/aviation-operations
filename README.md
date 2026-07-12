# Operations Contacts Portal

A zero-cost, static, mobile-first Progressive Web App for fast operational contact lookup. It supports instant search, data-driven filters, contact grouping, tap-to-call, copy, email, WhatsApp for valid Greek mobile numbers, offline use, and installation on a home screen.

## Included contact data

The supplied CSV was imported on 2026-07-12. It contains 79 contacts across Rhodes, Mykonos, Corfu, Santorini, Heraklion, Karpathos, and Thessaloniki. All JSON fields were compared directly with the source CSV after conversion.

One source cell for the Thessaloniki Permit Office contains the shorthand `2314400127-128-169`. Because the intended expansion of the additional numbers is ambiguous, the portal displays and copies the original value but intentionally does not create a potentially incorrect Call link for it. Confirm and replace this cell with separate complete numbers in the spreadsheet if each number must be callable.

The instructions below describe future updates.

Provide **one of these files**:

- Preferred: a CSV export of the tab with GID `818105568`, named `contacts-export.csv`.
- Alternative: an XLSX export of the workbook, named `contacts-export.xlsx` (you may need to specify the sheet name).

From Google Sheets: open the required tab, then choose **File → Download → Comma Separated Values (.csv)**. This downloads only the current tab. For XLSX choose **File → Download → Microsoft Excel (.xlsx)**.

Operational telephone numbers can be sensitive. Before publishing, confirm that every exported field is authorized for public access. A GitHub Pages site is public to anyone with its URL.

## Update the contacts

Place the exported file anywhere convenient, then run from the project directory:

```text
python tools/convert-spreadsheet.py contacts-export.csv
```

For XLSX:

```text
python tools/convert-spreadsheet.py contacts-export.xlsx --sheet "Exact tab name"
```

The converter recognizes common English and Greek headings. It prints the detected mapping. If a heading is unusual, map it explicitly:

```text
python tools/convert-spreadsheet.py contacts-export.csv --map phone="Mobile No" name="Contact Person" company="Handler"
```

Supported JSON fields are `station`, `company`, `airline`, `representativeType`, `role`, `name`, `phone`, `email`, `category`, and `notes`. Blank fields are allowed. Duplicate identical rows and empty rows are removed; the same person is preserved when airline, company, role, or other details differ. The original telephone text is preserved. The app separately derives a `tel:` value and normalizes recognizable Greek numbers to `+30…` without modifying the source data.

After conversion, inspect `data/contacts.json`, compare every number with the sheet, then commit it along with the site.

## Open locally

A service worker and JSON loading require a small local web server; double-clicking `index.html` is not sufficient. From the project directory run either:

```text
python -m http.server 8000
```

or any static server, then visit `http://localhost:8000`. On first load, use a normal network connection so the app can cache its files. Offline mode works after that first successful load.

## Deploy free on GitHub Pages

1. Create a GitHub repository, for example `her-operations`.
2. Upload all files in this directory to the repository root.
3. Open the repository's **Settings**.
4. Select **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the **main** branch and the **/(root)** folder, then save.
7. GitHub will publish a URL such as `https://username.github.io/her-operations/`.

All paths, manifest scope, start URL, and service worker assets are relative, so the app works in a GitHub Pages project subdirectory without modification.

## Install on a phone or tablet

- Android/Chrome or desktop Edge/Chrome: use the app's **Install app** button when shown, or the browser menu's **Install app / Add to Home screen** command.
- iPhone/iPad/Safari: tap **Share**, then **Add to Home Screen**. Safari does not expose the automatic installation prompt, so the in-app button may not appear.

When launched from the home screen, the portal opens in standalone mode. Telephone buttons use standard `tel:+30…` links and open the device's calling application. Email links use `mailto:`. WhatsApp is only offered when a number matches a valid-looking Greek mobile format.

## Add a station or operational section

Add new rows to the spreadsheet and reconvert it. If multiple stations exist, a station filter appears automatically and station becomes the primary grouping. The application only displays populated fields.

For a future non-contact operational section, add a separate JSON file under `data/`, a new navigation item in `index.html`, and a dedicated renderer in `app.js`. Keep separate datasets rather than adding unrelated columns to contacts.

## Privacy and security

- No analytics, tracking, advertising, accounts, databases, API keys, or third-party data services are used.
- Contact data remains in the static `data/contacts.json` file.
- Public GitHub Pages offers no access control. Do not publish personal or operationally sensitive data unless explicitly authorized.
- If access must be restricted, GitHub Pages is not an appropriate host; use an organization-approved authenticated platform instead.

## Maintenance checklist

After each data update, compare contact counts and every telephone number with the source sheet, test search and filters, tap several Call/email/WhatsApp actions on a phone, reload once online, then verify the list remains available in airplane mode. If an older cached version appears, close and reopen the installed app after the new deployment completes.
