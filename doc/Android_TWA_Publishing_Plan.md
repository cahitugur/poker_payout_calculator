# Poker Payout Calculator — Android TWA Publishing Plan

This document describes the step-by-step plan to publish the Poker Payout Calculator
as an Android app on the Google Play Store using a **Trusted Web Activity (TWA)**.

A TWA wraps your hosted website in a lightweight Android shell. The app loads your
GitHub Pages site in a full-screen Chrome Custom Tab (no browser UI). Code updates
are instant — just push to GitHub Pages.

---

## Overview

| Item              | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Wrapper           | Trusted Web Activity (TWA)                                         |
| Build tool        | Bubblewrap CLI (Google)                                            |
| Hosted site       | `https://cahitugur.github.io/poker_payout_calculator/app/ui/`      |
| Package name      | `com.cahitugur.pokercalc`                                          |
| Estimated effort  | ~1 day active work, ~1 week wall time (Play Store review)          |

---

## Phase 1 — Prerequisites

### 1.1 Google Play Developer Account
- Sign up at https://play.google.com/console
- One-time registration fee: **$25 USD**
- Requires a personal Google account

### 1.2 Install Android Studio
- Download from https://developer.android.com/studio
- Needed for the Android SDK and signing tools (`keytool`, `apksigner`)

### 1.3 Install JDK 17+
- Android build tools require Java
- Check: `java -version`

### 1.4 Install Node.js & npm
- Required by Bubblewrap
- Check: `node -v && npm -v`

---

## Phase 2 — Prepare the Web App for PWA

A TWA requires the site to be a valid **Progressive Web App (PWA)**.

### 2.1 Create a Web App Manifest

Create `docs/app/ui/manifest.json`:

```json
{
  "name": "Poker Payout Calculator",
  "short_name": "Poker Calc",
  "description": "Calculate poker payouts and settle with Revolut payment links",
  "start_url": ".",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0b1020",
  "background_color": "#0b1020",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 2.2 Link the Manifest from HTML

Add to `<head>` in both `index.html` and `side-pot.html`:

```html
<link rel="manifest" href="manifest.json" />
```

### 2.3 Create Static App Icons

Export static PNG icons (currently generated dynamically by `shared-icons.js`):

- `docs/app/ui/icons/icon-192.png` — 192×192 (regular)
- `docs/app/ui/icons/icon-512.png` — 512×512 (regular)
- `docs/app/ui/icons/icon-maskable-192.png` — 192×192 (maskable, with safe zone padding)
- `docs/app/ui/icons/icon-maskable-512.png` — 512×512 (maskable, with safe zone padding)

The icon is a green ♠ on a dark `#0b1020` background with rounded corners.

Tool: https://maskable.app/editor to preview and create maskable variants.

### 2.4 Add a Service Worker

Create `docs/app/ui/sw.js`:

```js
const CACHE_NAME = 'poker-calc-v1';
const URLS_TO_CACHE = [
  '.',
  'index.html',
  'side-pot.html',
  'styles.css',
  '../core/payout_calc.js',
  '../core/sidepot_calc.js',
  '../core/settings.js',
  '../core/settings-store.js',
  '../core/shared-data.js',
  '../core/shared-icons.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Register it from `index.html` and `side-pot.html`:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
</script>
```

### 2.5 Verify PWA Compliance

1. Push everything to GitHub Pages
2. Open `https://cahitugur.github.io/poker_payout_calculator/app/ui/` in Chrome
3. Open DevTools → Lighthouse → Run PWA audit
4. Fix any issues until the "Installable" badge shows ✅

---

## Phase 3 — Generate a Signing Key

```bash
keytool -genkey -v \
  -keystore poker-calc.keystore \
  -alias poker-calc \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass <YOUR_PASSWORD> \
  -keypass <YOUR_PASSWORD> \
  -dname "CN=Cahit Ugur"
```

**⚠️ BACK UP this keystore file. You cannot update the app without it.**

Get the SHA-256 fingerprint:

```bash
keytool -list -v -keystore poker-calc.keystore -alias poker-calc | grep SHA256
```

Save the fingerprint — you'll need it in the next phase.

---

## Phase 4 — Set Up Digital Asset Links

This tells Android that your app and your website belong to the same owner.
Without this, the TWA shows a browser URL bar at the top.

Create `docs/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.cahitugur.pokercalc",
    "sha256_cert_fingerprints": ["<YOUR_SHA256_FINGERPRINT>"]
  }
}]
```

Push to GitHub. Verify it's accessible at:
```
https://cahitugur.github.io/poker_payout_calculator/.well-known/assetlinks.json
```

> **Note:** GitHub Pages may not serve from `.well-known/` by default.
> If it doesn't work, add a `_config.yml` file to `docs/` with:
> ```yaml
> include: [".well-known"]
> ```

---

## Phase 5 — Build the Android App with Bubblewrap

### 5.1 Install Bubblewrap

```bash
npm install -g @nickvdl/nickvdl
```

> Note: Search npm for "nickvdl twa android" or look for the
> Google Chrome Labs TWA builder CLI. The package name may have changed.

### 5.2 Initialize the TWA Project

```bash
mkdir poker-calc-twa && cd poker-calc-twa
npx nickvdl init --manifest https://cahitugur.github.io/poker_payout_calculator/app/ui/manifest.json
```

When prompted, configure:
- **Package name:** `com.cahitugur.pokercalc`
- **App name:** `Poker Payout Calculator`
- **Launcher URL:** `https://cahitugur.github.io/poker_payout_calculator/app/ui/`
- **Status bar color:** `#0b1020`
- **Splash screen color:** `#0b1020`
- **Signing key:** path to `poker-calc.keystore`

### 5.3 Build the App Bundle

```bash
npx nickvdl build
```

This outputs a signed `.aab` (Android App Bundle) file.

### 5.4 Test Locally

```bash
npx nickvdl install
```

This installs the APK on a connected Android device or emulator for testing.

---

## Phase 6 — Create the Play Store Listing

Go to [Google Play Console](https://play.google.com/console) and create a new app.

### 6.1 App Details
- **App name:** Poker Payout Calculator
- **Default language:** English
- **App type:** App (not Game)
- **Free / Paid:** Free

### 6.2 Store Listing
- **Short description** (80 chars max):
  > Calculate poker payouts and settle up with Revolut links.
- **Full description** (4000 chars max):
  > Poker Payout Calculator helps you track buy-ins, cash-outs, and calculate
  > who owes whom at the end of a poker session. Features include:
  > - Add/remove players with one tap
  > - Usual suspects list for quick player entry
  > - Settle mode with checkboxes
  > - Generate Revolut payment links for easy settlement
  > - Side pot calculator for all-in situations
  > - Share game state via URL
  > - Dark mode optimized for poker table use

### 6.3 Graphics Assets
| Asset           | Size       | Notes                                    |
| --------------- | ---------- | ---------------------------------------- |
| App icon        | 512×512    | High-res, same as manifest icon          |
| Feature graphic | 1024×500   | Banner shown at top of Play Store page   |
| Phone screenshots | 2-8 images | Min 320px, max 3840px on shortest side |

Take screenshots from an Android phone or emulator running the app.

### 6.4 Content Rating
- Complete the content rating questionnaire
- This app has no violence, gambling for money, or user-generated content
- Expected rating: **Everyone**

### 6.5 Data Safety
- **Data collected:** None (all data stays on-device in LocalStorage)
- **Data shared with third parties:** None
- **Encryption:** HTTPS in transit
- **Data deletion:** User can clear browser/app data

---

## Phase 7 — Upload & Publish

1. Go to **Release → Production → Create new release**
2. Upload the `.aab` file from Phase 5
3. Add release notes (e.g., "Initial release")
4. **Review and roll out**
5. Google reviews the app — typically **1–7 days** for first submission

---

## Phase 8 — Ongoing Maintenance

### Code Updates
Just push to GitHub Pages. The TWA loads your website, so updates are **instant**
for all users — no need to rebuild or resubmit the app.

### App Shell Updates
Only rebuild and upload a new `.aab` if you change:
- App icons or splash screen
- Package name or signing key
- TWA configuration (e.g., status bar color)

### Signing Key
- **Never lose** `poker-calc.keystore` — you cannot update the app without it
- Store a backup in a secure location (not in the Git repo)

---

## Future: Migration to Capacitor

If you later need native features (push notifications, camera, etc.), you can
migrate from TWA to Capacitor. The web code stays the same — only the Android
shell changes. See the `app/platform/capacitor/` placeholder folder.

---

## Checklist

- [ ] Google Play Developer account ($25)
- [ ] Android Studio + JDK 17+ installed
- [ ] Node.js + npm installed
- [ ] `manifest.json` created and linked
- [ ] Static PNG icons exported (192, 512, maskable variants)
- [ ] Service worker created and registered
- [ ] Lighthouse PWA audit passes
- [ ] Signing keystore generated and backed up
- [ ] `assetlinks.json` deployed to `docs/.well-known/`
- [ ] Bubblewrap project initialized and built
- [ ] APK tested on real device / emulator
- [ ] Play Store listing completed (description, screenshots, icon)
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed
- [ ] `.aab` uploaded to Play Console
- [ ] App reviewed and published
