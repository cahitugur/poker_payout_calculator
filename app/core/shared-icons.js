/**
 * Copyright (c) 2025 Cahit Ugur
 * SPDX-License-Identifier: MIT
 *
 * Shared icon generator and footer for poker calculator apps
 */

let footerInitialized = false;

// Icons are now served as static files (app/icons/app_icon.png) and declared
// in the web app manifest — no runtime canvas injection needed.
export function initSharedIcons() {
  // intentionally empty — kept for API compatibility
}

export function initFooter(versionText = 'Version 1.7') {
  if (footerInitialized) return;
  footerInitialized = true;
  const footer = document.querySelector('footer');
  if (footer && !footer.hasChildNodes()) {
    footer.textContent = versionText;
  }
}
