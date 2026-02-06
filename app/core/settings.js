/*
  Copyright (c) 2026 Cahit Ugur
  SPDX-License-Identifier: MIT
  Shared settings + profile modal behavior
*/

import { DEFAULT_USUAL_SUSPECTS } from './shared-data.js';
import { loadSettingsData, normalizeSettingsData, saveSettingsData } from './settings-store.js';

export function initSettings({ showToast } = {}) {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const profileSettingsBtn = document.getElementById('profileSettingsBtn');
  const profileModal = document.getElementById('profileModal');
  const profileCloseBtn = document.getElementById('profileCloseBtn');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileRevtagInput = document.getElementById('profileRevtagInput');
  const profileSaveBtn = document.getElementById('profileSaveBtn');
  const usualSuspectsSettingsBtn = document.getElementById('usualSuspectsSettingsBtn');
  const usualSuspectsModal = document.getElementById('usualSuspectsModal');
  const usualSuspectsCloseBtn = document.getElementById('usualSuspectsCloseBtn');
  const usualSuspectsTableBody = document.getElementById('usualSuspectsTableBody');
  const addSuspectBtn = document.getElementById('addSuspectBtn');
  const suspectsSaveBtn = document.getElementById('suspectsSaveBtn');
  const menuDropdown = document.getElementById('menuDropdown');

  if (!settingsBtn && !settingsModal && !profileModal) return;

  const defaultSuspects = DEFAULT_USUAL_SUSPECTS;
  const notify = (message) => {
    if (typeof showToast === 'function') {
      showToast(message);
    }
  };

  const loadSettings = async () => normalizeSettingsData(await loadSettingsData(), defaultSuspects);

  const loadProfileSettings = async () => {
    if (!profileNameInput || !profileRevtagInput) return;
    try {
      const parsed = await loadSettings();
      profileNameInput.value = parsed.profile?.name ?? '';
      profileRevtagInput.value = parsed.profile?.revtag ?? '';
    } catch (e) {
      profileNameInput.value = '';
      profileRevtagInput.value = '';
    }
  };

  const saveProfileSettings = async () => {
    if (!profileNameInput || !profileRevtagInput) return false;
    const payload = {
      profile: {
        name: profileNameInput.value.trim(),
        revtag: profileRevtagInput.value.trim()
      }
    };
    try {
      const existing = await loadSettings();
      await saveSettingsData({
        profile: payload.profile,
        usualSuspects: existing.usualSuspects
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
    revInput.value = suspect?.revtag ?? '';
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
        const revtag = inputs[1]?.value?.trim() ?? '';
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
        usualSuspects
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSettingsModal();
      closeProfileModal();
      closeUsualSuspectsModal();
    }
  });
}
