/*
  Copyright (c) 2026 Cahit Ugur
  SPDX-License-Identifier: MIT
  Shared settings storage helpers
*/

const SETTINGS_FILENAME = 'poker-calc-settings.json';
const DB_NAME = 'poker-calc-settings-db';
const STORE_NAME = 'file-handles';
const HANDLE_KEY = 'profile-file';
const LS_SETTINGS_KEY = 'poker-calc-settings';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const useLocalStorage = () => isMobile() || !window.showSaveFilePicker;

const openProfileDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getStoredHandle = async () => {
  if (!('indexedDB' in window)) return null;
  try {
    const db = await openProfileDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
};

const storeHandle = async (handle) => {
  if (!('indexedDB' in window)) return;
  try {
    const db = await openProfileDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    /* ignore storage errors */
  }
};

const ensureHandlePermission = async (handle, mode) => {
  if (!handle) return false;
  if (!handle.queryPermission) return true;
  const options = { mode };
  let status = await handle.queryPermission(options);
  if (status === 'granted') return true;
  status = await handle.requestPermission(options);
  return status === 'granted';
};

const getOrRequestHandle = async (mode = 'readwrite') => {
  let handle = await getStoredHandle();
  if (handle) {
    const ok = await ensureHandlePermission(handle, mode);
    if (ok) return handle;
  }
  if (!window.showSaveFilePicker) {
    return null;
  }
  handle = await window.showSaveFilePicker({
    suggestedName: SETTINGS_FILENAME,
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
  });
  const ok = await ensureHandlePermission(handle, mode);
  if (!ok) return null;
  await storeHandle(handle);
  return handle;
};

/* ── LocalStorage backend (mobile) ── */

const loadSettingsLS = () => {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

const saveSettingsLS = (payload) => {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(payload, null, 2));
};

/* ── File System Access API backend (desktop) ── */

export const openSettingsFileForImport = async () => {
  if (useLocalStorage()) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        try {
          const file = input.files?.[0];
          if (!file) { resolve(null); return; }
          const text = await file.text();
          const data = JSON.parse(text);
          resolve({ _lsImport: true, data });
        } catch (e) {
          reject(new Error('InvalidJSON'));
        } finally {
          document.body.removeChild(input);
        }
      });
      input.addEventListener('cancel', () => {
        document.body.removeChild(input);
        resolve(null);
      });
      document.body.appendChild(input);
      input.click();
    });
  }
  if (!window.showOpenFilePicker) return null;
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    multiple: false
  });
  if (handle) {
    await storeHandle(handle);
  }
  return handle || null;
};

export const readSettingsFromHandle = async (handle) => {
  if (!handle) return null;
  if (handle._lsImport) return handle.data;
  const file = await handle.getFile();
  const text = await file.text();
  if (!text) return null;
  return JSON.parse(text);
};

export const saveSettingsDataAs = async (payload) => {
  if (useLocalStorage()) {
    saveSettingsLS(payload);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = SETTINGS_FILENAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  if (!window.showSaveFilePicker) {
    throw new Error('FilePickerUnavailable');
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: SETTINGS_FILENAME,
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
  });
  const ok = await ensureHandlePermission(handle, 'readwrite');
  if (!ok) {
    throw new Error('FilePermissionDenied');
  }
  await storeHandle(handle);
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
};

export const normalizeSettingsData = (data, defaultSuspects = []) => {
  const profile = {
    name: data?.profile?.name ?? '',
    revtag: data?.profile?.revtag ?? ''
  };

  const normalizeSuspect = (item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const name = item.trim();
      return name ? { name, revtag: '' } : null;
    }
    const name = (item.name ?? '').trim();
    if (!name) return null;
    return { name, revtag: (item.revtag ?? '').trim() };
  };

  const list = Array.isArray(data?.usualSuspects)
    ? data.usualSuspects
    : Array.isArray(defaultSuspects)
      ? defaultSuspects
      : [];

  const usualSuspects = list
    .map(normalizeSuspect)
    .filter((item) => item !== null);

  const KNOWN_CURRENCIES = ['EUR', 'USD', 'BTC'];
  const rawCurrency = (data?.gameSettings?.currency ?? 'EUR').trim();
  const currency = KNOWN_CURRENCIES.includes(rawCurrency) ? rawCurrency : rawCurrency || 'EUR';
  const defaultBuyIn = data?.gameSettings?.defaultBuyIn ?? '30';
  const VALID_SETTLEMENT_MODES = ['banker', 'greedy'];
  const rawMode = (data?.gameSettings?.settlementMode ?? 'banker').trim();
  const settlementMode = VALID_SETTLEMENT_MODES.includes(rawMode) ? rawMode : 'banker';
  const gameSettings = { currency, defaultBuyIn: String(defaultBuyIn), settlementMode };

  return { profile, usualSuspects, gameSettings };
};

export const loadSettingsData = async () => {
  if (useLocalStorage()) return loadSettingsLS();
  const handle = await getStoredHandle();
  if (!handle) return null;
  const ok = await ensureHandlePermission(handle, 'read');
  if (!ok) return null;
  const file = await handle.getFile();
  const text = await file.text();
  if (!text) return null;
  return JSON.parse(text);
};

export const saveSettingsData = async (payload) => {
  if (useLocalStorage()) {
    saveSettingsLS(payload);
    return;
  }
  const handle = await getOrRequestHandle('readwrite');
  if (!handle) {
    throw new Error('FilePickerUnavailable');
  }
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
};
