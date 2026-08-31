(function () {
  const vscode = acquireVsCodeApi();

  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const formEl = document.getElementById('form');
  const addBtn = document.getElementById('addBtn');
  const emptyAddBtn = document.getElementById('emptyAddBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const browseBtn = document.getElementById('browseBtn');
  const formTitle = document.getElementById('formTitle');
  const webLoginBtn = document.getElementById('webLoginBtn');
  const orDivider = document.getElementById('orDivider');

  const fields = {
    name: document.getElementById('f-name'),
    gitName: document.getElementById('f-gitName'),
    gitEmail: document.getElementById('f-gitEmail'),
    sshKeyPath: document.getElementById('f-sshKeyPath'),
    githubUsername: document.getElementById('f-githubUsername'),
  };
  const errors = {
    name: document.getElementById('e-name'),
    gitName: document.getElementById('e-gitName'),
    gitEmail: document.getElementById('e-gitEmail'),
    sshKeyPath: document.getElementById('e-sshKeyPath'),
    githubUsername: document.getElementById('e-githubUsername'),
  };

  let editingOriginalName = null;
  let latestProfiles = [];

  function clearErrors() {
    for (const key of Object.keys(errors)) errors[key].textContent = '';
  }

  function resetWebLoginBtn() {
    webLoginBtn.disabled = false;
    webLoginBtn.textContent = 'Sign in with GitHub';
  }

  function openForm(profile) {
    clearErrors();
    editingOriginalName = profile ? profile.name : null;
    formTitle.textContent = profile ? `Edit "${profile.name}"` : 'Add profile';
    fields.name.value = profile ? profile.name : '';
    fields.name.disabled = Boolean(profile);
    fields.gitName.value = profile ? profile.gitName : '';
    fields.gitEmail.value = profile ? profile.gitEmail : '';
    fields.sshKeyPath.value = profile ? profile.sshKeyPath : '';
    fields.githubUsername.value = profile ? profile.githubUsername : '';
    formEl.style.display = 'flex';

    // Signing in via the browser is only for adding a brand-new account, not editing one.
    webLoginBtn.style.display = profile ? 'none' : '';
    orDivider.style.display = profile ? 'none' : '';
    resetWebLoginBtn();

    fields.name.disabled ? fields.gitName.focus() : fields.name.focus();
  }

  function closeForm() {
    formEl.style.display = 'none';
    editingOriginalName = null;
  }

  function icon(pathData) {
    return `<svg viewBox="0 0 16 16" fill="currentColor"><path d="${pathData}"/></svg>`;
  }

  const ICON_ADD = 'M8 2a.75.75 0 0 1 .75.75V7.25H13a.75.75 0 0 1 0 1.5H8.75v4.5a.75.75 0 0 1-1.5 0V8.75H3a.75.75 0 0 1 0-1.5h4.25V2.75A.75.75 0 0 1 8 2z';
  const ICON_TRASH =
    'M6.5 1.5h3a1 1 0 0 1 1 1V3H13a.5.5 0 0 1 0 1h-.55l-.65 9.1a1.5 1.5 0 0 1-1.5 1.4h-4.6a1.5 1.5 0 0 1-1.5-1.4L3.55 4H3a.5.5 0 0 1 0-1h2.5v-.5a1 1 0 0 1 1-1zm-1.94 2.5.64 8.95a.5.5 0 0 0 .5.47h4.6a.5.5 0 0 0 .5-.47L11.44 4h-6.88zM6.5 3h3v-.5a0 0 0 0 0 0 0h-3a0 0 0 0 0 0 0V3z';
  const ICON_EMPTY =
    'M8 12.5c2.49 0 4.5-2.01 4.5-4.5S10.49 3.5 8 3.5 3.5 5.51 3.5 8s2.01 4.5 4.5 4.5zM8 14.75c-3.34 0-9 1.68-9 5.02V21h18v-1.23c0-3.34-5.66-5.02-9-5.02z';

  addBtn.innerHTML = icon(ICON_ADD);
  addBtn.title = 'Add profile';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render(profiles, active) {
    latestProfiles = profiles;

    if (profiles.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    emptyEl.style.display = 'none';

    listEl.innerHTML = profiles
      .map((p) => {
        const isActive = p.name === active;
        return `
        <div class="card ${isActive ? 'active' : ''}" data-name="${escapeHtml(p.name)}">
          <div class="card-top">
            <div class="card-name">${escapeHtml(p.name)}</div>
            ${isActive ? '<span class="badge">Active</span>' : ''}
          </div>
          <div class="card-meta">
            <div class="row"><span class="k">commits as</span><span class="v">${escapeHtml(p.gitName)} &lt;${escapeHtml(p.gitEmail)}&gt;</span></div>
            <div class="row"><span class="k">ssh key</span><span class="v">${escapeHtml(p.sshKeyPath)}</span></div>
            <div class="row"><span class="k">gh account</span><span class="v">${escapeHtml(p.githubUsername)}</span></div>
          </div>
          <div class="card-actions">
            <button class="primary" data-action="switch" ${isActive ? 'disabled' : ''}>${isActive ? 'Active' : 'Switch'}</button>
            <button class="ghost" data-action="edit" title="Edit">Edit</button>
            <button class="icon-btn" data-action="remove" title="Remove">${icon(ICON_TRASH)}</button>
          </div>
        </div>`;
      })
      .join('');
  }

  listEl.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const card = e.target.closest('.card');
    const name = card.getAttribute('data-name');
    const profile = latestProfiles.find((p) => p.name === name);

    if (actionEl.dataset.action === 'switch') {
      vscode.postMessage({ type: 'switch', name });
    } else if (actionEl.dataset.action === 'edit') {
      openForm(profile);
    } else if (actionEl.dataset.action === 'remove') {
      if (confirm(`Remove profile "${name}"? This only deletes the saved record — your git config, SSH key, and GitHub account are untouched.`)) {
        vscode.postMessage({ type: 'remove', name });
      }
    }
  });

  addBtn.addEventListener('click', () => openForm(null));
  emptyAddBtn.addEventListener('click', () => openForm(null));
  cancelBtn.addEventListener('click', closeForm);

  browseBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'browseSshKey' });
  });

  webLoginBtn.addEventListener('click', () => {
    webLoginBtn.disabled = true;
    webLoginBtn.textContent = 'Signing in… check the terminal';
    vscode.postMessage({ type: 'startWebLogin' });
  });

  saveBtn.addEventListener('click', () => {
    clearErrors();
    vscode.postMessage({
      type: 'save',
      originalName: editingOriginalName,
      profile: {
        name: fields.name.value,
        gitName: fields.gitName.value,
        gitEmail: fields.gitEmail.value,
        sshKeyPath: fields.sshKeyPath.value,
        githubUsername: fields.githubUsername.value,
      },
    });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'profiles':
        render(message.profiles, message.active);
        break;
      case 'sshKeyPicked':
        fields.sshKeyPath.value = message.path;
        break;
      case 'saveErrors':
        for (const [key, text] of Object.entries(message.errors)) {
          if (errors[key]) errors[key].textContent = text;
        }
        break;
      case 'saved':
        closeForm();
        break;
      case 'webLoginFailed':
      case 'webLoginCancelled':
        resetWebLoginBtn();
        break;
    }
  });

  emptyEl.querySelector('.empty-icon').innerHTML = icon(ICON_EMPTY);

  vscode.postMessage({ type: 'ready' });
})();
