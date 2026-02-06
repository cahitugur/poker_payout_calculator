/**
 * Copyright (c) 2025 Cahit Ugur
 * SPDX-License-Identifier: MIT
 *
 * Shared icon generator and footer for poker calculator apps
 */

let iconsInitialized = false;
let footerInitialized = false;

export function initSharedIcons() {
  if (iconsInitialized) return;
  iconsInitialized = true;

  function makeIcon(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0b0b20';
    const r = size * 0.18;
    const w = size;
    const h = size;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(w, 0, w, r, r);
    ctx.arcTo(w, h, w - r, h, r);
    ctx.arcTo(0, h, 0, h - r, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#16b981';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.floor(size * 0.7)}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.fillText('♠', size / 2, size / 2 + size * 0.02);

    return c.toDataURL('image/png');
  }

  try {
    const icon192 = makeIcon(192);
    const icon512 = makeIcon(512);

    const l1 = document.createElement('link');
    l1.rel = 'apple-touch-icon';
    l1.sizes = '192x192';
    l1.href = icon192;
    document.head.appendChild(l1);

    const l2 = document.createElement('link');
    l2.rel = 'icon';
    l2.type = 'image/png';
    l2.sizes = '512x512';
    l2.href = icon512;
    document.head.appendChild(l2);

    const linkpng = document.createElement('link');
    linkpng.rel = 'icon';
    linkpng.type = 'image/png';
    linkpng.sizes = '192x192';
    linkpng.href = icon192;
    document.head.appendChild(linkpng);
  } catch (e) {
    /* ignore */
  }
}

export function initFooter(versionText = 'Version 1.5') {
  if (footerInitialized) return;
  footerInitialized = true;
  const footer = document.querySelector('footer');
  if (footer && !footer.hasChildNodes()) {
    footer.textContent = versionText;
  }
}
