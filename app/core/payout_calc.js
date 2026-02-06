/*
  Copyright (c) 2025 Cahit Ugur
  SPDX-License-Identifier: MIT
*/

import { USUAL_SUSPECTS } from './shared-data.js';
import { initFooter, initSharedIcons } from './shared-icons.js';
import { initSettings } from './settings.js';
import { loadSettingsData, normalizeSettingsData } from './settings-store.js';

function initPayoutCalculator() {
  const root = document.querySelector('[data-app="payout"]');
  if (!root) return;

  initSharedIcons();
  initFooter();

  const MAX_ROWS = 32;
  const STORAGE_KEY = 'poker-payout:v1';

  const rowsTbody = document.getElementById('rows');
  const addRowBtn = document.getElementById('addRowBtn');
  const deleteRowBtn = document.getElementById('deleteRowBtn');
  const clearBtn = document.getElementById('clearBtn');
  const usualSuspectsBtn = document.getElementById('usualSuspectsBtn');
  const buyInInput = document.getElementById('buyInInput');
  const totalInEl = document.getElementById('totalIn');
  const totalOutEl = document.getElementById('totalOut');
  const totalPayoutEl = document.getElementById('totalPayout');
  const statusEl = document.getElementById('balanceStatus');
  const statusText = statusEl.querySelector('.status-text');
  const capNote = document.getElementById('rowCapNote');

  let deleteButtonMode = false;
  let checkboxesVisible = false;

  function fmt(n) {
    return (Math.round(n * 100) / 100).toFixed(2).replace('-0.00', '0.00');
  }
  function fmtInt(n) {
    return Math.round(n).toString().replace('-0', '0');
  }
  function parseNum(v) {
    if (!v) return 0;
    let str = String(v).trim();
    if (str === '') return 0;
    if (str.includes(',') && str.includes('.')) {
      if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
      else str = str.replace(/,/g, '');
    } else if (str.includes(',')) str = str.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str.replace(/[^0-9+\-\.]/g, ''));
    return Number.isFinite(num) ? num : 0;
  }

  function toBase64Url(bytes) {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function fromBase64Url(str) {
    const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function compressString(value) {
    if (!('CompressionStream' in window)) return null;
    const encoder = new TextEncoder();
    const stream = new Blob([encoder.encode(value)]).stream().pipeThrough(new CompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  }

  async function decompressToString(bytes) {
    if (!('DecompressionStream' in window)) return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  async function encodeShareData(data) {
    const rows = (data.rows || []).map((row) => [row.name || '', row.in || '', row.out || '', row.settled ? 1 : 0]);
    const compact = { v: 1, b: data.buyIn || '', r: rows };
    const json = JSON.stringify(compact);
    const compressed = await compressString(json);
    if (compressed) return `z${toBase64Url(compressed)}`;
    return `j${toBase64Url(new TextEncoder().encode(json))}`;
  }

  async function decodeShareData(encoded) {
    let mode = encoded[0];
    let payload = encoded;
    if (mode === 'z' || mode === 'j') {
      payload = encoded.slice(1);
    } else {
      mode = 'j';
    }

    try {
      const bytes = fromBase64Url(payload);
      const text = mode === 'z' ? await decompressToString(bytes) : new TextDecoder().decode(bytes);
      if (!text) throw new Error('Decode failed');
      const raw = JSON.parse(text);
      if (raw && raw.v === 1 && Array.isArray(raw.r)) {
        return {
          rows: raw.r.map((row) => ({
            name: row?.[0] ?? '',
            in: row?.[1] ?? '',
            out: row?.[2] ?? '',
            settled: Boolean(row?.[3])
          })),
          buyIn: raw.b ?? ''
        };
      }
      return raw;
    } catch (e) {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const raw = JSON.parse(atob(padded));
      return raw;
    }
  }

  function validateInput(i) {
    const raw = i.value.trim();
    if (raw === '') {
      i.classList.remove('invalid');
      return;
    }
    const ok = !isNaN(parseNum(raw));
    i.classList.toggle('invalid', !ok);
  }

  function getBuyInVal() {
    if (!buyInInput) return null;
    const raw = String(buyInInput.value).trim();
    if (raw === '') return null;
    const n = parseNum(raw);
    return Number.isFinite(n) ? raw : null;
  }

  function createCellWithInput(cls, ph, opts = {}, def = '') {
    const td = document.createElement('td');
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = cls;
    inp.placeholder = ph;
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    if (opts.inputmode) inp.setAttribute('inputmode', opts.inputmode);
    if (opts.enterkeyhint) inp.setAttribute('enterkeyhint', opts.enterkeyhint);
    if (opts.pattern) inp.setAttribute('pattern', opts.pattern);
    if (def !== '') inp.value = def;
    td.appendChild(inp);
    return { td, inp };
  }

  function attachFieldHandlers(nameInp, inInp, outInp) {
    const updateZeroClass = () => {
      const inVal = parseNum(inInp.value);
      const outVal = parseNum(outInp.value);
      inInp.classList.toggle('zero-value', inVal === 0);
      outInp.classList.toggle('zero-value', outVal === 0);
    };
    const onChange = () => {
      validateInput(inInp);
      validateInput(outInp);
      updateZeroClass();
      recalc();
      save();
    };
    inInp.addEventListener('input', onChange);
    outInp.addEventListener('input', onChange);
    inInp.addEventListener('blur', updateZeroClass);
    outInp.addEventListener('blur', updateZeroClass);
    updateZeroClass();
    for (const el of [nameInp, inInp, outInp]) {
      el.addEventListener('input', save);
      el.addEventListener('click', () => {
        el.select();
      });
    }
  }

  function createRow(values) {
    const tr = document.createElement('tr');
    const nameDef = values?.name ?? '';
    const inDef = values?.in ?? (getBuyInVal() ?? '30');
    const outDef = values?.out ?? '';
    const settledDef = values?.settled ?? false;

    const nameCell = createCellWithInput('input-field name-input', 'Player', { inputmode: 'text', enterkeyhint: 'next' }, nameDef);
    const wrapper = document.createElement('div');
    let wrapperClasses = 'name-cell-wrapper';
    if (deleteButtonMode) {
      wrapperClasses += ' hidden-checkboxes';
    } else {
      wrapperClasses += ' hidden-delete-btns';
      if (!checkboxesVisible) {
        wrapperClasses += ' hidden-checkboxes';
      }
    }
    wrapper.className = wrapperClasses;
    wrapper.appendChild(nameCell.inp);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settledDef;
    checkbox.title = 'Settled';
    checkbox.addEventListener('change', save);
    wrapper.appendChild(checkbox);
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.title = 'Delete player';
    deleteBtn.setAttribute('aria-label', 'Delete player');
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const playerName = tr._refs.name.value.trim();
      const index = Array.from(rowsTbody.children).indexOf(tr);
      if (index !== -1) {
        rowsTbody.removeChild(tr);
        if (playerName && usualSuspects.includes(playerName) && !availableSuspects.includes(playerName)) {
          availableSuspects.push(playerName);
          availableSuspects.sort();
          if (suspectsList && suspectsList.style.display === 'flex') {
            const renderFn = window.renderSuspectsList;
            if (renderFn) renderFn();
          }
        }
      }
      updateCapNote();
      recalc();
      save();
    });
    wrapper.appendChild(deleteBtn);
    nameCell.td.innerHTML = '';
    nameCell.td.appendChild(wrapper);
    tr.appendChild(nameCell.td);

    const stepMinusTd = document.createElement('td');
    stepMinusTd.className = 'step-cell minus-cell';
    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'step-btn minus';
    minusBtn.textContent = '−';
    minusBtn.title = 'Subtract buy-in';
    minusBtn.setAttribute('aria-label', 'Subtract buy-in');
    stepMinusTd.appendChild(minusBtn);
    tr.appendChild(stepMinusTd);

    const inCell = createCellWithInput('input-field num-input', '0', { inputmode: 'numeric', enterkeyhint: 'next', pattern: '[0-9\\- ]*' }, inDef);
    tr.appendChild(inCell.td);

    const stepPlusTd = document.createElement('td');
    stepPlusTd.className = 'step-cell plus-cell';
    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'step-btn plus';
    plusBtn.textContent = '+';
    plusBtn.title = 'Add buy-in';
    plusBtn.setAttribute('aria-label', 'Add buy-in');
    stepPlusTd.appendChild(plusBtn);
    tr.appendChild(stepPlusTd);

    const outCell = createCellWithInput('input-field num-input', '0.00', { inputmode: 'decimal', enterkeyhint: 'next', pattern: '[0-9.,\\- ]*' }, outDef);
    tr.appendChild(outCell.td);
    const payoutTd = document.createElement('td');
    payoutTd.className = 'payout';
    payoutTd.textContent = '0.00';
    tr.appendChild(payoutTd);

    attachFieldHandlers(nameCell.inp, inCell.inp, outCell.inp);

    function adjustIn(delta) {
      const buy = getBuyInVal();
      const buyNum = buy !== null ? parseNum(buy) : null;
      if (buyNum === null) return;
      const cur = parseNum(inCell.inp.value);
      let newVal = cur + delta * buyNum;
      if (newVal < buyNum) newVal = buyNum;
      inCell.inp.value = fmtInt(newVal);
      validateInput(inCell.inp);
      recalc();
      save();
    }
    minusBtn.addEventListener('click', () => adjustIn(-1));
    plusBtn.addEventListener('click', () => adjustIn(1));

    tr._refs = { checkbox: checkbox, name: nameCell.inp, in: inCell.inp, out: outCell.inp, payout: payoutTd };
    return tr;
  }

  function updateCapNote() {
    const count = rowsTbody.children.length;
    if (capNote) capNote.textContent = `${count} / ${MAX_ROWS} rows`;
    addRowBtn.disabled = count >= MAX_ROWS;
    deleteRowBtn.disabled = count <= 0;
  }

  function addRow(values) {
    if (rowsTbody.children.length >= MAX_ROWS) return null;
    const tr = createRow(values);
    rowsTbody.appendChild(tr);
    updateCapNote();
    recalc();
    save();
    return tr;
  }

  function deleteRow() {
    if (rowsTbody.children.length > 0) {
      rowsTbody.removeChild(rowsTbody.lastElementChild);
      updateCapNote();
      recalc();
      save();
    }
  }

  function clearTable() {
    rowsTbody.innerHTML = '';
    for (let i = 0; i < 2; i++) addRow();
  availableSuspects = [...usualSuspects];
    deleteButtonMode = false;
    checkboxesVisible = false;
    for (const tr of rowsTbody.children) {
      const wrapper = tr.querySelector('.name-cell-wrapper');
      if (wrapper) {
        wrapper.classList.add('hidden-delete-btns');
        wrapper.classList.add('hidden-checkboxes');
      }
    }
    if (suspectsList && suspectsList.style.display === 'flex') {
      const renderFn = window.renderSuspectsList;
      if (renderFn) renderFn();
    }
    recalc();
    localStorage.removeItem(STORAGE_KEY);
  }

  function serialize() {
    const rows = [];
    for (const tr of rowsTbody.children) {
      rows.push({
        name: tr._refs.name.value,
        in: tr._refs.in.value,
        out: tr._refs.out.value,
        settled: tr._refs.checkbox.checked
      });
    }
    return { rows };
  }

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Object.assign({}, serialize(), { buyIn: buyInInput ? buyInInput.value : undefined }))
      );
    } catch (e) {
      /* storage might be disabled */
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.rows)) return false;
      rowsTbody.innerHTML = '';
      if (buyInInput && data.buyIn) buyInInput.value = data.buyIn;
      for (const r of data.rows) {
        addRow({ name: r.name ?? '', in: r.in ?? '', out: r.out ?? '', settled: r.settled ?? false });
      }
      recalc();
      return true;
    } catch (e) {
      return false;
    }
  }

  function recalc() {
    let totalIn = 0;
    let totalOut = 0;
    for (const tr of rowsTbody.children) {
      let inv = parseNum(tr._refs.in.value);
      let outv = parseNum(tr._refs.out.value);
      if (outv < 0) {
        outv = 0;
        tr._refs.out.value = fmt(outv);
        validateInput(tr._refs.out);
      }
      const payout = outv - inv;
      tr._refs.payout.textContent = fmt(payout);
      totalIn += inv;
      totalOut += outv;
    }
    totalInEl.textContent = fmtInt(totalIn);
    totalOutEl.textContent = fmt(totalOut);
    totalPayoutEl.textContent = fmt(totalOut - totalIn);
    const balanced = Math.abs(Math.round((totalOut - totalIn) * 100)) === 0;
    statusEl.classList.toggle('ok', balanced);
    statusEl.classList.toggle('warn', !balanced);
    statusText.textContent = balanced ? 'Balanced' : 'Unbalanced';
  }

  const urlParams = new URLSearchParams(window.location.search);

  async function loadSharedDataFromUrl() {
    const sharedData = urlParams.get('s') || urlParams.get('share');
    if (!sharedData) return false;
    try {
      const data = await decodeShareData(sharedData);
      if (data && Array.isArray(data.rows)) {
        rowsTbody.innerHTML = '';
        if (buyInInput && data.buyIn) buyInInput.value = data.buyIn;
        for (const r of data.rows) {
          addRow({ name: r.name ?? '', in: r.in ?? '', out: r.out ?? '', settled: r.settled ?? false });
        }
        recalc();
        return true;
      }
    } catch (e) {
      /* data might be corrupted */
    }
    return false;
  }

  loadSharedDataFromUrl().then((dataLoaded) => {
    if (!dataLoaded && !restore()) {
      for (let i = 0; i < 2; i++) addRow();
    }
  });

  addRowBtn.addEventListener('click', () => {
    addRow();
  });

  deleteRowBtn.style.opacity = '1';
  deleteRowBtn.addEventListener('click', () => {
    deleteButtonMode = !deleteButtonMode;
    for (const tr of rowsTbody.children) {
      const wrapper = tr.querySelector('.name-cell-wrapper');
      if (wrapper) {
        if (deleteButtonMode) {
          wrapper.classList.remove('hidden-delete-btns');
          wrapper.classList.add('hidden-checkboxes');
        } else {
          wrapper.classList.add('hidden-delete-btns');
          if (checkboxesVisible) {
            wrapper.classList.remove('hidden-checkboxes');
          } else {
            wrapper.classList.add('hidden-checkboxes');
          }
        }
      }
    }
    if (deleteButtonMode) {
      deleteRowBtn.style.opacity = '1';
      settleBtn.style.opacity = '1';
      checkboxesVisible = false;
    }
  });

  clearBtn.addEventListener('click', clearTable);

  let usualSuspects = [...USUAL_SUSPECTS];
  let availableSuspects = [...usualSuspects];
  const suspectsList = document.getElementById('usualSuspectsList');

  if (usualSuspectsBtn) {
    function renderSuspectsList() {
      if (!suspectsList) return;
      suspectsList.innerHTML = '';
      for (const name of availableSuspects) {
        const chip = document.createElement('span');
        chip.className = 'player-chip';
        chip.textContent = name;
        chip.addEventListener('click', () => {
          let emptyRow = null;
          for (const tr of rowsTbody.children) {
            if (!tr._refs.name.value.trim()) {
              emptyRow = tr;
              break;
            }
          }

          const buyInValue = getBuyInVal();

          if (emptyRow) {
            emptyRow._refs.name.value = name;
            if (buyInValue !== null) {
              emptyRow._refs.in.value = fmtInt(parseNum(buyInValue));
            }
          } else {
            addRow({ name, in: buyInValue || '', out: '' });
          }

          availableSuspects = availableSuspects.filter((n) => n !== name);
          renderSuspectsList();
          recalc();
          save();
        });
        suspectsList.appendChild(chip);
      }
    }

    window.renderSuspectsList = renderSuspectsList;

    usualSuspectsBtn.addEventListener('click', () => {
      if (suspectsList.style.display === 'none' || suspectsList.style.display === '') {
        suspectsList.style.display = 'flex';
        renderSuspectsList();
      } else {
        suspectsList.style.display = 'none';
      }
    });
  }

  const refreshAvailableSuspects = () => {
    const usedNames = new Set();
    for (const tr of rowsTbody.children) {
      const name = tr._refs?.name?.value?.trim();
      if (name) usedNames.add(name);
    }
    availableSuspects = usualSuspects.filter((name) => !usedNames.has(name));
    if (suspectsList && suspectsList.style.display === 'flex') {
      const renderFn = window.renderSuspectsList;
      if (renderFn) renderFn();
    }
  };

  const loadUsualSuspects = async () => {
    try {
      const data = normalizeSettingsData(await loadSettingsData(), USUAL_SUSPECTS.map((name) => ({ name, revtag: '' })));
      usualSuspects = data.usualSuspects.map((item) => item.name);
    } catch (e) {
      usualSuspects = [...USUAL_SUSPECTS];
    }
    refreshAvailableSuspects();
  };

  window.addEventListener('usual-suspects-updated', (event) => {
    const detail = event.detail;
    if (detail?.usualSuspects) {
      usualSuspects = detail.usualSuspects.map((item) => item.name);
      refreshAvailableSuspects();
    }
  });

  loadUsualSuspects();

  if (buyInInput) {
    buyInInput.addEventListener('input', () => {
      validateInput(buyInInput);
      const val = getBuyInVal();
      for (const tr of rowsTbody.children) {
        try {
          const inEl = tr._refs && tr._refs.in;
          if (inEl) {
            inEl.value = val !== null ? fmtInt(parseNum(val)) : inEl.value;
            validateInput(inEl);
          }
        } catch (e) {
          /* noop */
        }
      }
      save();
      recalc();
    });
    buyInInput.addEventListener('click', () => {
      buyInInput.select();
    });
  }

  const settleBtn = document.getElementById('settleBtn');

  if (settleBtn) {
    settleBtn.style.opacity = '1';

    settleBtn.addEventListener('click', () => {
      if (deleteButtonMode) {
        deleteButtonMode = false;
        for (const tr of rowsTbody.children) {
          const wrapper = tr.querySelector('.name-cell-wrapper');
          if (wrapper) {
            wrapper.classList.add('hidden-delete-btns');
          }
        }
        deleteRowBtn.style.opacity = '1';
      }
      checkboxesVisible = !checkboxesVisible;
      for (const tr of rowsTbody.children) {
        const wrapper = tr.querySelector('.name-cell-wrapper');
        if (wrapper) {
          if (checkboxesVisible) {
            wrapper.classList.remove('hidden-checkboxes');
          } else {
            wrapper.classList.add('hidden-checkboxes');
          }
        }
      }
      settleBtn.style.opacity = '1';
    });
  }

  const spcMenuLink = document.querySelector('#menuDropdown a[href="side-pot.html"]');
  if (spcMenuLink) {
    spcMenuLink.addEventListener('click', () => {
      const names = [];
      for (const tr of rowsTbody.children) {
        const name = tr._refs.name.value.trim();
        if (name) names.push(name);
      }
      const params = new URLSearchParams();
      if (names.length > 0) params.set('names', names.join(','));
      const targetUrl = new URL(spcMenuLink.getAttribute('href') || 'side-pot.html', window.location.href);
      targetUrl.search = params.toString();
      spcMenuLink.href = targetUrl.toString();
    });
  }

  const menuBtn = document.getElementById('menuBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const optionsDropdown = document.getElementById('optionsDropdown');
      if (optionsDropdown && optionsDropdown.classList.contains('active')) {
        optionsDropdown.classList.remove('active');
      }
      menuDropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      menuDropdown.classList.remove('active');
    });
  }

  const optionsBtn = document.getElementById('optionsBtn');
  const optionsDropdown = document.getElementById('optionsDropdown');
  const shareBtn = document.getElementById('shareBtn');

  function showToastNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
    }, 2000);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 2300);
  }

  initSettings({ showToast: showToastNotification });

  if (optionsBtn && optionsDropdown) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuDropdownEl = document.getElementById('menuDropdown');
      if (menuDropdownEl && menuDropdownEl.classList.contains('active')) {
        menuDropdownEl.classList.remove('active');
      }
      optionsDropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => {
      optionsDropdown.classList.remove('active');
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const ppcData = serialize();
      ppcData.buyIn = buyInInput ? buyInInput.value : '';
      const encoded = await encodeShareData(ppcData);
      const shareUrl = window.location.href.split('?')[0] + '?s=' + encoded;
      const linkLabel = 'Poker Payout Share';

      if (navigator.clipboard) {
        const html = `<a href="${shareUrl}">${linkLabel}</a>`;
        if (navigator.clipboard.write) {
          const item = new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([shareUrl], { type: 'text/plain' })
          });
          navigator.clipboard.write([item]).then(
            () => showToastNotification('Share link copied to clipboard!'),
            () => fallbackCopy(shareUrl)
          );
        } else if (navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(
            () => showToastNotification('Share link copied to clipboard!'),
            () => fallbackCopy(shareUrl)
          );
        } else {
          fallbackCopy(shareUrl);
        }
      } else {
        fallbackCopy(shareUrl);
      }

      function fallbackCopy(url) {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (success) {
            showToastNotification('Share link copied to clipboard!');
          } else {
            showToastNotification('Failed to copy link');
          }
        } catch (e) {
          showToastNotification('Failed to copy link');
        }
      }

      optionsDropdown.classList.remove('active');
    });
  }

  recalc();
}

initPayoutCalculator();
