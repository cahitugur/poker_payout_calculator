/*
  Copyright (c) 2025 Cahit Ugur
  SPDX-License-Identifier: MIT
*/

import { USUAL_SUSPECTS } from './shared-data.js';
import { initFooter, initSharedIcons } from './shared-icons.js';

function initSidePotCalculator() {
  const root = document.querySelector('[data-app="sidepot"]');
  if (!root) return;

  initSharedIcons();
  initFooter();

  const MAX_ROWS = 32;
  const STORAGE_KEY = 'poker-sidepot:v1';

  const rowsTbody = document.getElementById('rows');
  const addRowBtn = document.getElementById('addRowBtn');
  const deleteRowBtn = document.getElementById('deleteRowBtn');
  const clearBtn = document.getElementById('clearBtn');
  const usualSuspectsBtn = document.getElementById('usualSuspectsBtn');
  const boardsInput = document.getElementById('boardsInput');
  const totalBetEl = document.getElementById('totalBet');
  const potsDisplay = document.getElementById('potsDisplay');
  const potsContainer = document.getElementById('potsContainer');
  const statusEl = document.getElementById('balanceStatus');
  const statusText = statusEl ? statusEl.querySelector('.status-text') : null;

  let deleteButtonMode = false;
  let availableSuspects = [...USUAL_SUSPECTS];

  function fmt(n) {
    return (Math.round(n * 100) / 100).toFixed(2).replace('-0.00', '0.00');
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
    const rows = (data.rows || []).map((row) => [row.name || '', row.bet || '']);
    const compact = { v: 1, b: data.boards || '1', i: data.initialPot || '0', r: rows };
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
          rows: raw.r.map((row) => ({ name: row?.[0] ?? '', bet: row?.[1] ?? '' })),
          boards: raw.b ?? '1',
          initialPot: raw.i ?? '0'
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

  function createInitialPotRow(betDef = '') {
    const tr = document.createElement('tr');
    tr.className = 'initial-pot-row';

    const nameTd = document.createElement('td');
    nameTd.textContent = 'Initial Pot';
    nameTd.className = 'initial-pot-name';
    tr.appendChild(nameTd);

    for (let i = 0; i < 3; i++) {
      const empty = document.createElement('td');
      empty.className = 'empty-cell';
      tr.appendChild(empty);
    }

    const betCell = createCellWithInput('input-field num-input', '0.00', { inputmode: 'decimal', enterkeyhint: 'next', pattern: '[0-9.,\\- ]*' }, betDef);
    tr.appendChild(betCell.td);

    const wonTd = document.createElement('td');
    wonTd.className = 'payout';
    wonTd.textContent = '—';
    tr.appendChild(wonTd);

    const updateZeroClass = () => {
      const val = parseNum(betCell.inp.value);
      betCell.inp.classList.toggle('zero-value', val === 0);
    };
    const onChange = () => {
      validateInput(betCell.inp);
      updateZeroClass();
      recalc();
      save();
    };
    betCell.inp.addEventListener('input', onChange);
    betCell.inp.addEventListener('blur', onChange);
    betCell.inp.addEventListener('click', () => {
      betCell.inp.select();
    });
    updateZeroClass();

    tr._refs = { bet: betCell.inp, isInitialPot: true };
    return tr;
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

  function focusNext(from) {
    const inputs = [...rowsTbody.querySelectorAll('.name-input,.num-input')];
    const idx = inputs.indexOf(from);
    if (idx === -1) return;
    const next = inputs[idx + 1];
    if (next) {
      next.focus();
      if (next.select) next.select();
    }
  }

  function attachFieldHandlers(nameInp, betInp) {
    const updateZeroClass = () => {
      const val = parseNum(betInp.value);
      betInp.classList.toggle('zero-value', val === 0);
    };
    const onChange = () => {
      validateInput(betInp);
      updateZeroClass();
      recalc();
      save();
    };
    betInp.addEventListener('input', onChange);
    betInp.addEventListener('blur', updateZeroClass);
    nameInp.addEventListener('input', () => {
      recalc();
      save();
    });
    updateZeroClass();
    for (const el of [nameInp, betInp]) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          focusNext(e.currentTarget);
        }
      });
      el.addEventListener('click', () => {
        el.select();
      });
    }
  }

  function createRow(values) {
    const tr = document.createElement('tr');
    const nameDef = values?.name ?? '';
    const betDef = values?.bet ?? '';

    const nameCell = createCellWithInput('input-field name-input', 'Player', { inputmode: 'text', enterkeyhint: 'next' }, nameDef);

    const wrapper = document.createElement('div');
    wrapper.className = deleteButtonMode ? 'name-cell-wrapper' : 'name-cell-wrapper hidden-delete-btns';
    wrapper.appendChild(nameCell.inp);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const playerName = tr._refs.name.value.trim();
      rowsTbody.removeChild(tr);
      if (playerName && USUAL_SUSPECTS.includes(playerName) && !availableSuspects.includes(playerName)) {
        availableSuspects.push(playerName);
        availableSuspects.sort();
        const suspectsList = document.getElementById('usualSuspectsList');
        if (suspectsList && suspectsList.style.display === 'flex') {
          const renderFn = window.renderSuspectsList;
          if (renderFn) renderFn();
        }
      }
      recalc();
      save();
    });
    wrapper.appendChild(deleteBtn);

    nameCell.td.innerHTML = '';
    nameCell.td.appendChild(wrapper);

    tr.appendChild(nameCell.td);

    const empty1 = document.createElement('td');
    empty1.className = 'empty-cell';
    tr.appendChild(empty1);

    const empty2 = document.createElement('td');
    empty2.className = 'empty-cell';
    tr.appendChild(empty2);

    const empty3 = document.createElement('td');
    empty3.className = 'empty-cell';
    tr.appendChild(empty3);

    const betCell = createCellWithInput('input-field num-input', '0.00', { inputmode: 'decimal', enterkeyhint: 'next', pattern: '[0-9.,\\- ]*' }, betDef);
    tr.appendChild(betCell.td);

    const wonTd = document.createElement('td');
    wonTd.className = 'payout';
    wonTd.textContent = '0.00';
    tr.appendChild(wonTd);

    attachFieldHandlers(nameCell.inp, betCell.inp);

    tr._refs = { name: nameCell.inp, bet: betCell.inp, wonTd: wonTd };
    return tr;
  }

  function calculateSidePots() {
    const rows = [];
    let initialPot = 0;

    for (const tr of rowsTbody.children) {
      if (tr._refs.isInitialPot) {
        initialPot = parseNum(tr._refs.bet.value);
        continue;
      }

      const name = tr._refs.name.value.trim() || '(no name)';
      const bet = parseNum(tr._refs.bet.value);
      if (bet > 0) {
        rows.push({ name, bet, original: bet, tr });
      }
    }

    if (rows.length === 0) return [];

    rows.sort((a, b) => a.bet - b.bet);

    const pots = [];
    let prevBet = 0;
    let remainingPlayers = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const currentBet = rows[i].bet;
      if (currentBet > prevBet) {
        const potSize = (currentBet - prevBet) * remainingPlayers;
        const potPlayers = rows.slice(i).map((p) => p.name);
        const potEligibleRows = rows.slice(i).map((p) => p.tr);
        const potName = pots.length === 0 ? 'Main Pot' : `Side Pot ${pots.length}`;

        let finalPotSize = potSize;
        if (pots.length === 0 && initialPot > 0) {
          finalPotSize += initialPot;
        }

        pots.push({ name: potName, size: finalPotSize, players: potPlayers, eligibleRows: potEligibleRows, winners: [] });
      }
      remainingPlayers--;
      prevBet = currentBet;
    }

    return pots;
  }

  function displayPots(pots) {
    if (pots.length === 0) {
      potsDisplay.style.display = 'none';
      return;
    }

    const numBoards = Math.max(1, Math.min(2, parseInt(boardsInput.value) || 1));
    potsDisplay.style.display = 'block';

    const checkedState = new Map();
    const existingCheckboxes = potsContainer.querySelectorAll('input[type="checkbox"]');

    const potPlayerCounts = new Map();
    for (const cb of existingCheckboxes) {
      const potKey = `${cb.dataset.potIdx}-${cb.dataset.boardNum}`;
      potPlayerCounts.set(potKey, (potPlayerCounts.get(potKey) || 0) + 1);
    }

    for (const cb of existingCheckboxes) {
      const potKey = `${cb.dataset.potIdx}-${cb.dataset.boardNum}`;
      const playerCount = potPlayerCounts.get(potKey) || 0;

      if (playerCount > 1) {
        const key = `${cb.dataset.potIdx}-${cb.dataset.boardNum}-${cb.dataset.playerName}`;
        checkedState.set(key, cb.checked);
      }
    }

    potsContainer.innerHTML = '';

    if (numBoards === 1) {
      const potsList = document.createElement('div');
      for (let potIdx = 0; potIdx < pots.length; potIdx++) {
        potsList.appendChild(createPotItem(pots[potIdx], potIdx, 0, pots, checkedState));
      }
      potsContainer.appendChild(potsList);
    } else {
      const boardsGrid = document.createElement('div');
      boardsGrid.className = 'boards-grid';

      for (let boardNum = 0; boardNum < 2; boardNum++) {
        const boardColumn = document.createElement('div');
        boardColumn.className = 'board-column';

        const boardTitle = document.createElement('div');
        boardTitle.className = 'board-title';
        boardTitle.textContent = `Board ${boardNum + 1}`;
        boardColumn.appendChild(boardTitle);

        for (let potIdx = 0; potIdx < pots.length; potIdx++) {
          boardColumn.appendChild(createPotItem(pots[potIdx], potIdx, boardNum, pots, checkedState));
        }

        boardsGrid.appendChild(boardColumn);
      }
      potsContainer.appendChild(boardsGrid);
    }
  }

  function createPotItem(pot, potIdx, boardNum, allPots, checkedState) {
    const numBoards = Math.max(1, Math.min(2, parseInt(boardsInput.value) || 1));
    const potSize = pot.size / numBoards;

    const potDiv = document.createElement('div');
    potDiv.className = 'pot-item' + (pot.name.includes('Side') ? ' side-pot' : '');

    const potHeader = document.createElement('div');
    potHeader.className = 'pot-header';
    potHeader.innerHTML = `<div class="pot-name">${pot.name}</div><div class="pot-amount">${fmt(potSize)}</div>`;

    const potDetails = document.createElement('div');
    potDetails.className = 'pot-details';

    const winnersSection = document.createElement('div');
    winnersSection.className = 'pot-section';
    const winnersDiv = document.createElement('div');
    winnersDiv.className = 'pot-winners';

    for (let i = 0; i < pot.players.length; i++) {
      const playerName = pot.players[i];
      const checkboxId = `pot-${potIdx}-board-${boardNum}-winner-${i}`;

      const label = document.createElement('label');
      label.className = 'winner-checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = checkboxId;
      checkbox.dataset.potIdx = potIdx;
      checkbox.dataset.boardNum = boardNum;
      checkbox.dataset.playerIdx = i;
      checkbox.dataset.playerName = playerName;

      const stateKey = `${potIdx}-${boardNum}-${playerName}`;
      if (pot.players.length === 1) {
        checkbox.checked = true;
      } else if (checkedState && checkedState.has(stateKey)) {
        checkbox.checked = checkedState.get(stateKey);
      } else {
        checkbox.checked = false;
      }

      checkbox.addEventListener('change', (e) => {
        handleWinnerCheckboxChange(e.target, allPots);
        recalc();
        save();
      });

      const labelText = document.createElement('label');
      labelText.htmlFor = checkboxId;
      labelText.textContent = playerName;

      label.appendChild(checkbox);
      label.appendChild(labelText);
      winnersDiv.appendChild(label);
    }
    winnersSection.appendChild(winnersDiv);

    potDetails.appendChild(winnersSection);

    potDiv.appendChild(potHeader);
    potDiv.appendChild(potDetails);

    return potDiv;
  }

  function addRow(values) {
    if (rowsTbody.children.length >= MAX_ROWS) return null;
    const tr = createRow(values);
    rowsTbody.appendChild(tr);
    recalc();
    save();
    return tr;
  }

  function deleteRow() {
    if (rowsTbody.children.length > 1 && !rowsTbody.lastElementChild._refs.isInitialPot) {
      rowsTbody.removeChild(rowsTbody.lastElementChild);
      recalc();
      save();
    }
  }

  function clearTable() {
    rowsTbody.innerHTML = '';
    rowsTbody.appendChild(createInitialPotRow(''));
    for (let i = 0; i < 2; i++) addRow();
    availableSuspects = [...USUAL_SUSPECTS];
    deleteButtonMode = false;
    for (const tr of rowsTbody.children) {
      const wrapper = tr.querySelector('.name-cell-wrapper');
      if (wrapper) {
        wrapper.classList.add('hidden-delete-btns');
      }
    }
    const suspectsList = document.getElementById('usualSuspectsList');
    if (suspectsList && suspectsList.style.display === 'flex') {
      const renderFn = window.renderSuspectsList;
      if (renderFn) renderFn();
    }
    (function () {
      const first = rowsTbody.querySelector('.name-input');
      if (first && window.innerWidth >= 1024) first.focus();
    })();
    recalc();
    localStorage.removeItem(STORAGE_KEY);
  }

  function serialize() {
    const rows = [];
    let initialPot = '0';

    for (const tr of rowsTbody.children) {
      if (tr._refs.isInitialPot) {
        initialPot = tr._refs.bet.value;
      } else {
        rows.push({
          name: tr._refs.name.value,
          bet: tr._refs.bet.value
        });
      }
    }
    return {
      rows,
      boards: boardsInput ? boardsInput.value : '1',
      initialPot
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
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
      if (boardsInput && data.boards) boardsInput.value = data.boards;
      rowsTbody.appendChild(createInitialPotRow(data.initialPot || ''));
      for (const r of data.rows) {
        addRow({ name: r.name ?? '', bet: r.bet ?? '' });
      }
      recalc();
      return true;
    } catch (e) {
      return false;
    }
  }

  function handleWinnerCheckboxChange(checkbox, allPots) {
    const currentPotIdx = parseInt(checkbox.dataset.potIdx);
    const boardNum = parseInt(checkbox.dataset.boardNum);
    const playerName = checkbox.dataset.playerName;
    const isChecked = checkbox.checked;

    for (let potIdx = currentPotIdx + 1; potIdx < allPots.length; potIdx++) {
      const pot = allPots[potIdx];

      if (pot.players.includes(playerName)) {
        const targetCheckbox = potsContainer.querySelector(
          `input[data-pot-idx="${potIdx}"][data-board-num="${boardNum}"][data-player-name="${playerName}"]`
        );
        if (targetCheckbox) {
          targetCheckbox.checked = isChecked;
        }
      }
    }
  }

  function calculateWinnings(pots) {
    const numBoards = Math.max(1, Math.min(2, parseInt(boardsInput.value) || 1));

    for (const tr of rowsTbody.children) {
      if (tr._refs.isInitialPot) continue;
      tr._refs.wonTd.textContent = '0.00';
    }

    for (let potIdx = 0; potIdx < pots.length; potIdx++) {
      const pot = pots[potIdx];
      const potSizePerBoard = pot.size / numBoards;

      for (let boardNum = 0; boardNum < numBoards; boardNum++) {
        const checkedWinners = [];

        const potCheckboxes = potsContainer.querySelectorAll(
          `input[data-pot-idx="${potIdx}"][data-board-num="${boardNum}"]:checked`
        );
        for (const cb of potCheckboxes) {
          const playerIdx = parseInt(cb.dataset.playerIdx);
          checkedWinners.push(pot.players[playerIdx]);
        }

        if (checkedWinners.length > 0) {
          const winPerWinner = potSizePerBoard / checkedWinners.length;
          for (const tr of rowsTbody.children) {
            if (tr._refs.isInitialPot) continue;
            const playerName = tr._refs.name.value.trim();
            if (checkedWinners.includes(playerName)) {
              const currentWon = parseNum(tr._refs.wonTd.textContent);
              tr._refs.wonTd.textContent = fmt(currentWon + winPerWinner);
            }
          }
        }
      }
    }

    let totalWon = 0;
    for (const tr of rowsTbody.children) {
      if (tr._refs.isInitialPot) continue;
      totalWon += parseNum(tr._refs.wonTd.textContent);
    }
    document.getElementById('totalWon').textContent = fmt(totalWon);
    return totalWon;
  }

  function recalc() {
    let totalBet = 0;
    for (const tr of rowsTbody.children) {
      const betv = parseNum(tr._refs.bet.value);
      if (betv < 0) tr._refs.bet.value = fmt(0);
      totalBet += parseNum(tr._refs.bet.value);
    }
    totalBetEl.textContent = fmt(totalBet);

    const pots = calculateSidePots();
    displayPots(pots);
    const totalWon = calculateWinnings(pots);

    if (statusEl && statusText) {
      const balanced = Math.abs(Math.round((totalWon - totalBet) * 100)) === 0;
      statusEl.classList.toggle('ok', balanced);
      statusEl.classList.toggle('warn', !balanced);
      statusText.textContent = balanced ? 'Balanced' : 'Unbalanced';
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const transferredNames = urlParams.get('names');

  if (transferredNames && !restore()) {
    const names = transferredNames.split(',').filter((n) => n.trim());
    rowsTbody.innerHTML = '';
    rowsTbody.appendChild(createInitialPotRow(''));
    if (names.length > 0) {
      for (const name of names) {
        addRow({ name: name.trim(), bet: '' });
      }
    } else {
      for (let i = 0; i < 2; i++) addRow();
    }
  } else if (!restore()) {
    rowsTbody.appendChild(createInitialPotRow(''));
    for (let i = 0; i < 2; i++) addRow();
  }

  addRowBtn.addEventListener('click', () => {
    const tr = addRow();
    if (tr) {
      if (window.innerWidth >= 1024) tr._refs.name.focus();
    }
  });

  deleteRowBtn.addEventListener('click', () => {
    deleteButtonMode = !deleteButtonMode;
    for (const tr of rowsTbody.children) {
      const wrapper = tr.querySelector('.name-cell-wrapper');
      if (wrapper) {
        if (deleteButtonMode) {
          wrapper.classList.remove('hidden-delete-btns');
        } else {
          wrapper.classList.add('hidden-delete-btns');
        }
      }
    }
    deleteRowBtn.style.opacity = '1';
  });

  clearBtn.addEventListener('click', clearTable);
  if (boardsInput) {
    boardsInput.addEventListener('change', () => {
      recalc();
      save();
    });
  }

  deleteRowBtn.style.opacity = '1';

  let suspectsList = document.getElementById('usualSuspectsList');

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
          if (!tr._refs.isInitialPot && !tr._refs.name.value.trim()) {
            emptyRow = tr;
            break;
          }
        }

        let initialPotValue = '';
        const initialPotRow = rowsTbody.children[0];
        if (initialPotRow && initialPotRow._refs.isInitialPot) {
          const potVal = initialPotRow._refs.bet.value.trim();
          if (potVal) initialPotValue = potVal;
        }

        if (emptyRow) {
          emptyRow._refs.name.value = name;
          if (initialPotValue) {
            emptyRow._refs.bet.value = initialPotValue;
          }
        } else {
          addRow({ name, bet: initialPotValue });
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

  if (usualSuspectsBtn) {
    usualSuspectsBtn.addEventListener('click', () => {
      if (suspectsList.style.display === 'none' || suspectsList.style.display === '') {
        suspectsList.style.display = 'flex';
        renderSuspectsList();
      } else {
        suspectsList.style.display = 'none';
      }
    });
  }

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
  if (optionsBtn && optionsDropdown) {
    optionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuDropdownEl = document.getElementById('menuDropdown');
      if (menuDropdownEl && menuDropdownEl.classList.contains('active')) {
        menuDropdownEl.classList.remove('active');
      }
      optionsDropdown.classList.toggle('active');
    });
  }

  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        const spcData = serialize();
        const encoded = await encodeShareData(spcData);
        const shareUrl = window.location.href.split('?')[0] + '?s=' + encoded;
        const linkLabel = 'Side Pot Share';

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
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.left = '-999999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
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
      } catch (e) {
        showToastNotification('Error copying share link');
      }
    });
  }

  document.addEventListener('click', () => {
    if (optionsDropdown) optionsDropdown.classList.remove('active');
  });

  async function loadSharedDataFromUrl() {
    const shareParam = urlParams.get('s') || urlParams.get('share');
    if (!shareParam) return;

    if (shareParam && !transferredNames) {
      try {
        const sharedData = await decodeShareData(shareParam);
        if (sharedData && sharedData.rows && Array.isArray(sharedData.rows)) {
          rowsTbody.innerHTML = '';
          if (boardsInput && sharedData.boards) boardsInput.value = sharedData.boards;
          rowsTbody.appendChild(createInitialPotRow(sharedData.initialPot || ''));
          for (const r of sharedData.rows) {
            addRow({ name: r.name ?? '', bet: r.bet ?? '' });
          }
          const usedNames = sharedData.rows.map((r) => r.name).filter((n) => n && USUAL_SUSPECTS.includes(n));
          availableSuspects = USUAL_SUSPECTS.filter((n) => !usedNames.includes(n));
          recalc();
        }
      } catch (e) {
        if (!restore()) {
          rowsTbody.appendChild(createInitialPotRow(''));
          for (let i = 0; i < 2; i++) addRow();
        }
      }
    } else if (shareParam && transferredNames) {
      try {
        const sharedData = await decodeShareData(shareParam);
        if (sharedData && sharedData.rows && Array.isArray(sharedData.rows)) {
          rowsTbody.innerHTML = '';
          if (boardsInput && sharedData.boards) boardsInput.value = sharedData.boards;
          rowsTbody.appendChild(createInitialPotRow(sharedData.initialPot || ''));
          for (const r of sharedData.rows) {
            addRow({ name: r.name ?? '', bet: r.bet ?? '' });
          }
          const usedNames = sharedData.rows.map((r) => r.name).filter((n) => n && USUAL_SUSPECTS.includes(n));
          availableSuspects = USUAL_SUSPECTS.filter((n) => !usedNames.includes(n));
          recalc();
        }
      } catch (e) {
        if (transferredNames && !restore()) {
          const names = transferredNames.split(',').filter((n) => n.trim());
          rowsTbody.innerHTML = '';
          rowsTbody.appendChild(createInitialPotRow(''));
          if (names.length > 0) {
            for (const name of names) {
              addRow({ name: name.trim(), bet: '' });
            }
          } else {
            for (let i = 0; i < 2; i++) addRow();
          }
        }
      }
    }
  }

  loadSharedDataFromUrl();

  recalc();
}

initSidePotCalculator();
