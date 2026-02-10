/*
  Copyright (c) 2026 Cahit Ugur
  SPDX-License-Identifier: MIT
  Shared settings + profile modal behavior
*/

import { DEFAULT_USUAL_SUSPECTS } from './shared-data.js';
import {
  loadSettingsData,
  normalizeSettingsData,
  openSettingsFileForImport,
  readSettingsFromHandle,
  saveSettingsData,
  saveSettingsDataAs
} from './settings-store.js';

export function initSettings({ showToast } = {}) {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  const profileModal = document.getElementById('profileModal');
  const profileCloseBtn = document.getElementById('profileCloseBtn');
  const profileBackBtn = document.getElementById('profileBackBtn');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileRevtagInput = document.getElementById('profileRevtagInput');
  const profileSaveBtn = document.getElementById('profileSaveBtn');
  const usualSuspectsSettingsBtn = document.getElementById('usualSuspectsSettingsBtn');
  const usualSuspectsModal = document.getElementById('usualSuspectsModal');
  const usualSuspectsCloseBtn = document.getElementById('usualSuspectsCloseBtn');
  const usualSuspectsBackBtn = document.getElementById('usualSuspectsBackBtn');
  const usualSuspectsTableBody = document.getElementById('usualSuspectsTableBody');
  const addSuspectBtn = document.getElementById('addSuspectBtn');
  const suspectsSaveBtn = document.getElementById('suspectsSaveBtn');
  const importSettingsBtn = document.getElementById('importSettingsBtn');
  const exportSettingsBtn = document.getElementById('exportSettingsBtn');
  const menuDropdown = document.getElementById('menuDropdown');
  const gameSettingsBtn = document.getElementById('gameSettingsBtn');
  const gameSettingsModal = document.getElementById('gameSettingsModal');
  const gameSettingsCloseBtn = document.getElementById('gameSettingsCloseBtn');
  const gameSettingsBackBtn = document.getElementById('gameSettingsBackBtn');
  const gameSettingsSaveBtn = document.getElementById('gameSettingsSaveBtn');
  const currencySelect = document.getElementById('currencySelect');
  const customCurrencyField = document.getElementById('customCurrencyField');
  const customCurrencyInput = document.getElementById('customCurrencyInput');
  const defaultBuyInInput = document.getElementById('defaultBuyInInput');

  if (!settingsBtn && !settingsModal && !profileModal) return;

  const defaultSuspects = DEFAULT_USUAL_SUSPECTS;
  const notify = (message) => {
    if (typeof showToast === 'function') {
      showToast(message);
    }
  };

  const formatRevtagDisplay = (value) => {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : '@';
  };

  const normalizeRevtagValue = (value) => {
    const trimmed = (value ?? '').trim();
    return trimmed === '@' ? '' : trimmed;
  };

  const loadSettings = async () => normalizeSettingsData(await loadSettingsData(), defaultSuspects);

  const buildSettingsPayload = async () => {
    const existing = await loadSettings();
    return {
      profile: existing.profile,
      usualSuspects: existing.usualSuspects,
      gameSettings: existing.gameSettings
    };
  };

  const loadProfileSettings = async () => {
    if (!profileNameInput || !profileRevtagInput) return;
    try {
      const parsed = await loadSettings();
      profileNameInput.value = parsed.profile?.name ?? '';
      profileRevtagInput.value = formatRevtagDisplay(parsed.profile?.revtag ?? '');
    } catch (e) {
      profileNameInput.value = '';
      profileRevtagInput.value = '@';
    }
  };

  const saveProfileSettings = async () => {
    if (!profileNameInput || !profileRevtagInput) return false;
    const payload = {
      profile: {
        name: profileNameInput.value.trim(),
        revtag: normalizeRevtagValue(profileRevtagInput.value)
      }
    };
    try {
      const existing = await loadSettings();
      await saveSettingsData({
        profile: payload.profile,
        usualSuspects: existing.usualSuspects,
        gameSettings: existing.gameSettings
      });
      notify('Profile saved');
      return true;
    } catch (e) {
      if (e && e.message === 'FilePickerUnavailable') {
        notify('File picker not supported in this browser');
      } else {
        notify('Unable to save profile file');
      }
      return false;
    }
  };

  const closeSettingsModal = () => {
    if (!settingsModal) return;
    settingsModal.classList.remove('active');
    settingsModal.setAttribute('aria-hidden', 'true');
  };

  const closeProfileModal = () => {
    if (!profileModal) return;
    profileModal.classList.remove('active');
    profileModal.setAttribute('aria-hidden', 'true');
  };

  const openSettingsModal = () => {
    if (!settingsModal) return;
    settingsModal.classList.add('active');
    settingsModal.setAttribute('aria-hidden', 'false');
  };

  const openProfileModal = async () => {
    if (!profileModal) return;
    profileModal.classList.add('active');
    profileModal.setAttribute('aria-hidden', 'false');
    await loadProfileSettings();
  };

  const closeUsualSuspectsModal = () => {
    if (!usualSuspectsModal) return;
    usualSuspectsModal.classList.remove('active');
    usualSuspectsModal.setAttribute('aria-hidden', 'true');
  };

  const openUsualSuspectsModal = async () => {
    if (!usualSuspectsModal) return;
    usualSuspectsModal.classList.add('active');
    usualSuspectsModal.setAttribute('aria-hidden', 'false');
    await loadUsualSuspectsSettings();
  };

  const renderUsualSuspects = (list) => {
    if (!usualSuspectsTableBody) return;
    usualSuspectsTableBody.innerHTML = '';
    const sorted = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    for (const suspect of sorted) {
      addSuspectRow(suspect);
    }
    if (sorted.length === 0) {
      addSuspectRow({ name: '', revtag: '' });
    }
  };

  const addSuspectRow = (suspect) => {
    if (!usualSuspectsTableBody) return;
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.className = 'input-field';
    nameInput.type = 'text';
    nameInput.placeholder = 'Name';
    nameInput.value = suspect?.name ?? '';
    nameTd.appendChild(nameInput);

    const revTd = document.createElement('td');
    const revInput = document.createElement('input');
    revInput.className = 'input-field';
    revInput.type = 'text';
    revInput.placeholder = 'Revtag';
  revInput.value = formatRevtagDisplay(suspect?.revtag ?? '');
    revTd.appendChild(revInput);

    const deleteTd = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑';
    deleteBtn.setAttribute('aria-label', 'Delete suspect');
    deleteBtn.addEventListener('click', () => {
      if (usualSuspectsTableBody) {
        usualSuspectsTableBody.removeChild(tr);
        if (!usualSuspectsTableBody.children.length) {
          addSuspectRow({ name: '', revtag: '' });
        }
      }
    });
    deleteTd.appendChild(deleteBtn);

    tr.appendChild(nameTd);
    tr.appendChild(revTd);
    tr.appendChild(deleteTd);
    usualSuspectsTableBody.appendChild(tr);
  };

  const readSuspectsFromTable = () => {
    if (!usualSuspectsTableBody) return [];
    const rows = Array.from(usualSuspectsTableBody.querySelectorAll('tr'));
    return rows
      .map((row) => {
        const inputs = row.querySelectorAll('input');
        const name = inputs[0]?.value?.trim() ?? '';
        const revtag = normalizeRevtagValue(inputs[1]?.value ?? '');
        if (!name) return null;
        return { name, revtag };
      })
      .filter((item) => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  };

  const loadUsualSuspectsSettings = async () => {
    try {
      const data = await loadSettings();
      renderUsualSuspects(data.usualSuspects);
    } catch (e) {
      renderUsualSuspects(defaultSuspects);
    }
  };

  const saveUsualSuspectsSettings = async () => {
    try {
      const existing = await loadSettings();
      const usualSuspects = readSuspectsFromTable();
      await saveSettingsData({
        profile: existing.profile,
        usualSuspects,
        gameSettings: existing.gameSettings
      });
      notify('Usual suspects saved');
      window.dispatchEvent(new CustomEvent('usual-suspects-updated', { detail: { usualSuspects } }));
      return true;
    } catch (e) {
      if (e && e.message === 'FilePickerUnavailable') {
        notify('File picker not supported in this browser');
      } else {
        notify('Unable to save usual suspects');
      }
      return false;
    }
  };

  const importSettings = async () => {
    try {
      const handle = await openSettingsFileForImport();
      if (!handle) {
        notify('File picker not supported in this browser');
        return;
      }
      const raw = await readSettingsFromHandle(handle);
      const normalized = normalizeSettingsData(raw, defaultSuspects);
      await saveSettingsData({
        profile: normalized.profile,
        usualSuspects: normalized.usualSuspects,
        gameSettings: normalized.gameSettings
      });
      if (profileModal?.classList.contains('active')) {
        profileNameInput.value = normalized.profile.name;
        profileRevtagInput.value = formatRevtagDisplay(normalized.profile.revtag);
      }
      if (usualSuspectsModal?.classList.contains('active')) {
        renderUsualSuspects(normalized.usualSuspects);
      }
      if (gameSettingsModal?.classList.contains('active')) {
        loadGameSettingsUI(normalized.gameSettings);
      }
      window.dispatchEvent(new CustomEvent('usual-suspects-updated', { detail: { usualSuspects: normalized.usualSuspects } }));
      window.dispatchEvent(new CustomEvent('game-settings-updated', { detail: { gameSettings: normalized.gameSettings } }));
      notify('Settings imported');
    } catch (e) {
      notify('Unable to import settings');
    }
  };

  const exportSettings = async () => {
    try {
      const payload = await buildSettingsPayload();
      await saveSettingsDataAs(payload);
      notify('Settings exported');
    } catch (e) {
      if (e && e.message === 'FilePickerUnavailable') {
        notify('File picker not supported in this browser');
      } else if (e && e.message === 'FilePermissionDenied') {
        notify('Permission denied for file save');
      } else {
        notify('Unable to export settings');
      }
    }
  };

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      menuDropdown?.classList.remove('active');
      openSettingsModal();
    });
  }

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', closeSettingsModal);
  }

  if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener('click', () => {
      closeSettingsModal();
      openProfileModal();
    });
  }

  if (profileCloseBtn) {
    profileCloseBtn.addEventListener('click', closeProfileModal);
  }

  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => {
      closeProfileModal();
      openSettingsModal();
    });
  }

  if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', () => {
      saveProfileSettings().then((didSave) => {
        if (didSave) closeProfileModal();
      });
    });
  }

  if (usualSuspectsSettingsBtn) {
    usualSuspectsSettingsBtn.addEventListener('click', () => {
      closeSettingsModal();
      openUsualSuspectsModal();
    });
  }

  if (usualSuspectsCloseBtn) {
    usualSuspectsCloseBtn.addEventListener('click', closeUsualSuspectsModal);
  }

  if (usualSuspectsBackBtn) {
    usualSuspectsBackBtn.addEventListener('click', () => {
      closeUsualSuspectsModal();
      openSettingsModal();
    });
  }

  if (addSuspectBtn) {
    addSuspectBtn.addEventListener('click', () => addSuspectRow({ name: '', revtag: '' }));
  }

  if (suspectsSaveBtn) {
    suspectsSaveBtn.addEventListener('click', () => {
      saveUsualSuspectsSettings().then((didSave) => {
        if (didSave) closeUsualSuspectsModal();
      });
    });
  }

  if (importSettingsBtn) {
    importSettingsBtn.addEventListener('click', () => {
      importSettings();
    });
  }

  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      exportSettings();
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === 'true') {
        closeSettingsModal();
      }
    });
  }

  if (profileModal) {
    profileModal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === 'true') {
        closeProfileModal();
      }
    });
  }

  if (usualSuspectsModal) {
    usualSuspectsModal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === 'true') {
        closeUsualSuspectsModal();
      }
    });
  }

  /* ── Game Settings modal ── */

  const KNOWN_CURRENCIES = ['EUR', 'USD', 'BTC'];

  const closeGameSettingsModal = () => {
    if (!gameSettingsModal) return;
    gameSettingsModal.classList.remove('active');
    gameSettingsModal.setAttribute('aria-hidden', 'true');
  };

  const openGameSettingsModal = async () => {
    if (!gameSettingsModal) return;
    gameSettingsModal.classList.add('active');
    gameSettingsModal.setAttribute('aria-hidden', 'false');
    await loadGameSettings();
  };

  const loadGameSettingsUI = (gs) => {
    if (!currencySelect) return;
    const cur = gs?.currency ?? 'EUR';
    if (KNOWN_CURRENCIES.includes(cur)) {
      currencySelect.value = cur;
      if (customCurrencyField) customCurrencyField.classList.add('is-hidden');
      if (customCurrencyInput) customCurrencyInput.value = '';
    } else {
      currencySelect.value = 'Other';
      if (customCurrencyField) customCurrencyField.classList.remove('is-hidden');
      if (customCurrencyInput) customCurrencyInput.value = cur;
    }
    if (defaultBuyInInput) defaultBuyInInput.value = gs?.defaultBuyIn ?? '30';
  };

  const loadGameSettings = async () => {
    try {
      const parsed = await loadSettings();
      loadGameSettingsUI(parsed.gameSettings);
    } catch (e) {
      loadGameSettingsUI({ currency: 'EUR', defaultBuyIn: '30' });
    }
  };

  const readGameSettingsFromUI = () => {
    let currency = currencySelect?.value ?? 'EUR';
    if (currency === 'Other') {
      currency = (customCurrencyInput?.value ?? '').trim() || 'EUR';
    }
    const defaultBuyIn = (defaultBuyInInput?.value ?? '30').trim() || '30';
    return { currency, defaultBuyIn };
  };

  const saveGameSettings = async () => {
    try {
      const existing = await loadSettings();
      const gameSettings = readGameSettingsFromUI();
      await saveSettingsData({
        profile: existing.profile,
        usualSuspects: existing.usualSuspects,
        gameSettings
      });
      notify('Game settings saved');
      window.dispatchEvent(new CustomEvent('game-settings-updated', { detail: { gameSettings } }));
      return true;
    } catch (e) {
      if (e && e.message === 'FilePickerUnavailable') {
        notify('File picker not supported in this browser');
      } else {
        notify('Unable to save game settings');
      }
      return false;
    }
  };

  if (currencySelect) {
    currencySelect.addEventListener('change', () => {
      if (customCurrencyField) {
        customCurrencyField.classList.toggle('is-hidden', currencySelect.value !== 'Other');
      }
    });
  }

  if (gameSettingsBtn) {
    gameSettingsBtn.addEventListener('click', () => {
      closeSettingsModal();
      openGameSettingsModal();
    });
  }

  if (gameSettingsCloseBtn) {
    gameSettingsCloseBtn.addEventListener('click', closeGameSettingsModal);
  }

  if (gameSettingsBackBtn) {
    gameSettingsBackBtn.addEventListener('click', () => {
      closeGameSettingsModal();
      openSettingsModal();
    });
  }

  if (gameSettingsSaveBtn) {
    gameSettingsSaveBtn.addEventListener('click', () => {
      saveGameSettings().then((didSave) => {
        if (didSave) closeGameSettingsModal();
      });
    });
  }

  if (gameSettingsModal) {
    gameSettingsModal.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset.close === 'true') {
        closeGameSettingsModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSettingsModal();
      closeProfileModal();
      closeUsualSuspectsModal();
      closeGameSettingsModal();
    }
  });
}
