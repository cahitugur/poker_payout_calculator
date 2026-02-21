# ChipHappens — High-Level Requirements

> Last updated: 2026-02-21

---

## 1. Platform & Distribution

| ID | Requirement |
|----|-------------|
| P-1 | The app SHALL function as a Progressive Web App (PWA) on iOS Safari, including Add to Home Screen, offline support, and standalone display mode. |
| P-2 | The app architecture SHALL support upgrading to a native iOS app for Apple App Store distribution via Capacitor (or equivalent hybrid framework), without a full rewrite. |
| P-3 | The app SHALL be packaged as an installable Android app and listed on the Google Play Store (via Capacitor/TWA or equivalent). |
| P-4 | The app SHALL work in modern desktop browsers (Chrome, Firefox, Safari, Edge) with no plugin or extension dependencies. |
| P-5 | The app SHALL use a single shared codebase across all platforms (PWA, iOS, Android, desktop browser). |

---

## 2. Freemium Model

### 2.1 Free Tier

| ID | Requirement |
|----|-------------|
| F-1 | All core calculator features SHALL be available for free: payout calculator and side pot calculator. |
| F-2 | Free users SHALL be able to create an account and access limited cloud storage (settings, basic game history). |
| F-3 | Free users SHALL be limited to a maximum number of players per game (exact limit TBD). |
| F-4 | Free users SHALL be able to use the app fully without an account (local-only mode). |

### 2.2 Paid Tier (One-Time Purchase)

| ID | Requirement |
|----|-------------|
| F-5 | Paid tier SHALL be unlocked via a one-time purchase. Android: Google Play Billing. iOS (native, when available): App Store IAP. Web/PWA: Stripe or equivalent web payment provider. All managed through RevenueCat for unified entitlement tracking. |
| F-6 | Paid tier SHALL unlock: unlimited game history, unlimited players per game, poker groups, leaderboards, full PnL tracking, detailed statistics & analytics, push notifications, and data export. |
| F-7 | The app SHALL clearly communicate which features require the paid tier, with non-intrusive upgrade prompts. |
| F-8 | A user's paid status SHALL sync across all their devices when logged in. |

---

## 3. User Accounts & Data Storage

| ID | Requirement |
|----|-------------|
| A-1 | The app SHALL allow users to create an account (email/password or social login TBD). |
| A-2 | Authenticated users SHALL have their data stored in a remote database, including: settings, game history, poker friends list, PnL records, and group memberships. |
| A-3 | The app SHALL be fully functional without an account, storing all data locally on the device. |
| A-4 | Non-account users SHALL be offered the option to create an account at any time and migrate their local data to the cloud. |

---

## 4. Offline Mode & Data Sync

| ID | Requirement |
|----|-------------|
| O-1 | The app SHALL be fully functional offline — all calculator features, local settings, and cached game history SHALL remain accessible without an internet connection. |
| O-2 | When offline, new data (game results, settings changes) SHALL be saved locally. |
| O-3 | When connectivity is restored, locally stored data SHALL automatically sync to the remote database. |
| O-4 | Conflict resolution: if the same record was modified on multiple devices while offline, the app SHALL use a last-write-wins strategy (or prompt the user, TBD). |
| O-5 | The service worker SHALL pre-cache all app assets for instant offline loading. |

---

## 5. Security & Privacy

| ID | Requirement |
|----|-------------|
| S-1 | All network communication SHALL use HTTPS/TLS. |
| S-2 | User passwords SHALL be hashed and salted; plaintext passwords SHALL never be stored or transmitted. |
| S-3 | Authentication tokens SHALL be securely stored (HTTP-only cookies or secure device storage) and expire after a reasonable period. |
| S-4 | Personal data at rest SHALL be encrypted in the remote database. |
| S-5 | The app SHALL implement rate limiting on authentication endpoints to prevent brute-force attacks. |
| S-6 | The app SHALL comply with GDPR and CCPA: provide a privacy policy, obtain consent for data collection, support right to access, right to deletion, and data portability. |
| S-7 | The app SHALL allow users to permanently delete their account and all associated data. |

---

## 6. Poker Groups & Social Features

| ID | Requirement |
|----|-------------|
| G-1 | Users SHALL be able to create poker groups and invite other registered users to join. |
| G-2 | Group invitations SHALL be delivered via in-app notification, push notification, and/or shareable invite link. |
| G-3 | When a game session is settled, the results SHALL be uploaded to each participating player's database record. |
| G-4 | Game results SHALL feed into: per-player game history, per-player PnL tracking, group leaderboards, and statistical analysis. |
| G-5 | Group leaderboards SHALL display configurable rankings (e.g. total profit, win rate, sessions played) over selectable time periods. |
| G-6 | Group creators/admins SHALL be able to manage membership (invite, remove, assign roles). |

---

## 7. Game History, PnL & Analytics

| ID | Requirement |
|----|-------------|
| D-1 | The app SHALL store a complete history of settled game sessions per player, including date, stakes, buy-in, cash-out, and net result. |
| D-2 | The app SHALL display a running PnL (profit and loss) chart/graph per player over time. |
| D-3 | The app SHALL provide poker-relevant statistics, such as: average session profit/loss, win/loss ratio, biggest win, biggest loss, total sessions, total hours played (if tracked), and performance by group/stakes. |
| D-4 | Analytics features (beyond basic history) SHALL be part of the paid tier. |

---

## 8. Multi-Device Sync

| ID | Requirement |
|----|-------------|
| M-1 | Logged-in users SHALL see consistent data (settings, history, groups, PnL) across all their devices (phone, tablet, desktop). |
| M-2 | Changes made on one device SHALL propagate to other devices within a reasonable time (near real-time or on next app open). |
| M-3 | The sync mechanism SHALL handle the offline-to-online transition gracefully (see Section 4). |

---

## 9. Push Notifications

| ID | Requirement |
|----|-------------|
| N-1 | The app SHALL support push notifications for: group invitations, game session reminders, settlement reminders (e.g. "Player X still owes Player Y"), and game result summaries. |
| N-2 | Users SHALL be able to configure notification preferences (opt in/out per category). |
| N-3 | Push notifications SHALL work on Android (FCM) and iOS (APNs, when running as native app). Web push SHALL be supported where browser allows. |
| N-4 | Push notifications SHALL be a paid-tier feature. |

---

## 10. Internationalization (i18n)

| ID | Requirement |
|----|-------------|
| I-1 | The app SHALL support multiple languages. Initial release: English. Subsequent: Turkish, German, and others TBD. |
| I-2 | All user-facing strings SHALL be externalized into language resource files (not hardcoded). |
| I-3 | The app SHALL auto-detect the user's preferred language from browser/device settings, with a manual override in settings. |
| I-4 | Number and currency formatting SHALL respect locale conventions (decimal separators, currency symbols). |

---

## 11. Accessibility (a11y)

| ID | Requirement |
|----|-------------|
| AC-1 | The app SHALL conform to WCAG 2.1 Level AA guidelines. |
| AC-2 | All interactive elements SHALL be keyboard-navigable and have appropriate ARIA labels. |
| AC-3 | The app SHALL support screen readers (VoiceOver on iOS, TalkBack on Android). |
| AC-4 | Color contrast ratios SHALL meet WCAG AA minimums (4.5:1 for normal text, 3:1 for large text). |
| AC-5 | Tap targets SHALL be at least 44×44 CSS pixels (per Apple HIG / WCAG). |

---

## 12. Data Export & Portability

| ID | Requirement |
|----|-------------|
| E-1 | Paid users SHALL be able to export their complete game history and PnL data in standard formats (CSV, PDF). |
| E-2 | Users SHALL be able to request a full data export of all personal data stored in the system (GDPR data portability). |
| E-3 | Settings import/export SHALL continue to be supported (existing functionality). |

---

## Appendix: Requirement Priority Key

- **SHALL** — mandatory for the described milestone
- **SHOULD** — important but can be deferred if needed
- **MAY** — nice-to-have, future consideration
- **TBD** — decision pending, to be resolved during design/implementation