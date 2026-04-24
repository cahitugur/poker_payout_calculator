# Poker Payout Calculator (Capacitor-ready)

This folder contains the refactored, future-proof app structure for Capacitor.

## Structure

- `core/`: calculator logic and shared helpers
- `ui/`: HTML + CSS for the calculators
- `platform/capacitor/`: placeholder for Capacitor platform output

## Open the UI

Open `ui/index.html` for the default landing page (new app link, PWA install notes, legacy links). The legacy payout calculator is at `ui/payout.html`; Side Pot is at `ui/side-pot.html` (also linked from the menu on those pages).

## Notes

- The app is dark-mode by default and optimized for poker table use.
- Shared icons and footer injection are handled in `core/shared-icons.js`.
