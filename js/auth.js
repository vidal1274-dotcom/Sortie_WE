/* auth.js — Authentification locale (pas de serveur, Web Crypto SHA-256) */

const LS_USERS   = 'trekko_users';
const SS_CURRENT = 'trekko_current_user';
const SALT       = 'trekko_nimes_2026';

/* ── Hachage SHA-256 ─────────────────────────────────────────────────────── */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data     = encoder.encode(SALT + password);
  const hashBuf  = await crypto.subtle.digest('SHA-256', data);
  const hashArr  = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Helpers stockage ────────────────────────────────────────────────────── */
function _loadUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || '{}'); }
  catch { return {}; }
}

function _saveUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function _setSession(username, key) {
  sessionStorage.setItem(SS_CURRENT, JSON.stringify({ username, key }));
}

/* ── API publique ────────────────────────────────────────────────────────── */

/**
 * Inscrit un nouvel utilisateur.
 * @returns {{ ok: boolean, username?: string, error?: string }}
 */
export async function register(username, password) {
  if (!username || username.trim().length < 3) {
    return { ok: false, error: "Le nom d'utilisateur doit faire au moins 3 caractères." };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: 'Le mot de passe doit faire au moins 4 caractères.' };
  }

  const users = _loadUsers();
  const key   = username.trim().toLowerCase();

  if (users[key]) {
    return { ok: false, error: "Ce nom d'utilisateur existe déjà." };
  }

  const hash = await hashPassword(password);
  users[key] = {
    username:  username.trim(),
    hash,
    createdAt: new Date().toISOString(),
  };
  _saveUsers(users);
  _setSession(username.trim(), key);

  return { ok: true, username: username.trim() };
}

/**
 * Connecte un utilisateur existant.
 * @returns {{ ok: boolean, username?: string, error?: string }}
 */
export async function login(username, password) {
  if (!username || !password) {
    return { ok: false, error: 'Identifiants manquants.' };
  }

  const users = _loadUsers();
  const key   = username.trim().toLowerCase();
  const user  = users[key];

  if (!user) {
    return { ok: false, error: "Nom d'utilisateur introuvable." };
  }

  const hash = await hashPassword(password);
  if (hash !== user.hash) {
    return { ok: false, error: 'Mot de passe incorrect.' };
  }

  _setSession(user.username, key);
  return { ok: true, username: user.username };
}

/** Déconnecte l'utilisateur courant. */
export function logout() {
  sessionStorage.removeItem(SS_CURRENT);
}

/**
 * Retourne l'utilisateur courant depuis sessionStorage.
 * @returns {{ username: string, key: string } | null}
 */
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(SS_CURRENT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @returns {boolean} */
export function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Préfixe pour les clés localStorage propres à cet utilisateur.
 * @returns {string}  ex. "u_alice_" ou "" si non connecté
 */
export function getUserPrefix() {
  const user = getCurrentUser();
  return user ? `u_${user.key}_` : '';
}

/**
 * Liste tous les comptes enregistrés.
 * @returns {{ username: string, createdAt: string }[]}
 */
export function getUserList() {
  const users = _loadUsers();
  return Object.values(users).map(({ username, createdAt }) => ({ username, createdAt }));
}

/* ── Écran d'authentification ────────────────────────────────────────────── */

/**
 * Initialise l'écran d'authentification.
 * Si l'utilisateur est déjà connecté, appelle immédiatement onLogin().
 * Sinon affiche le formulaire login / register.
 *
 * @param {(user: { username: string, key: string }) => void} onLogin
 */
export function initAuthScreen(onLogin) {
  const screen = document.getElementById('auth-screen');
  if (!screen) return;

  if (isLoggedIn()) {
    screen.classList.add('hidden');
    onLogin(getCurrentUser());
    return;
  }

  // Migration : si aucun compte trekko mais un ancien compte sorties
  const oldRaw = localStorage.getItem('sorties_users');
  if (oldRaw) {
    try {
      const oldUsers = JSON.parse(oldRaw);
      const first = Object.values(oldUsers)[0];
      if (first) {
        const key = first.username.trim().toLowerCase();
        const users = _loadUsers();
        if (!users[key]) {
          users[key] = { username: first.username, hash: first.hash, createdAt: first.createdAt || new Date().toISOString() };
          _saveUsers(users);
        }
        _setSession(first.username, key);
        screen.classList.add('hidden');
        onLogin(getCurrentUser());
        return;
      }
    } catch(e) { /* ignore */ }
  }

  // Premier lancement : auto-créer un compte "voyageur" et se connecter directement
  const users = getUserList();
  if (users.length === 0) {
    const autoUser = { username: 'Voyageur', hash: 'auto', createdAt: new Date().toISOString() };
    const allUsers = {};
    allUsers['voyageur'] = autoUser;
    _saveUsers(allUsers);
    _setSession('Voyageur', 'voyageur');
    screen.classList.add('hidden');
    onLogin(getCurrentUser());
    return;
  }

  screen.classList.remove('hidden');
  _renderAuthForm(screen, onLogin, false);
}

/* ── Rendu interne ───────────────────────────────────────────────────────── */

function _renderAuthForm(container, onLogin, isRegister) {
  const users = getUserList();

  container.innerHTML = `
    <div class="auth-bg"></div>
    <div class="auth-card">
      <div class="auth-logo">🗺️</div>
      <div class="auth-title">TREKKO</div>
      <div class="auth-subtitle">${isRegister
        ? 'Créez votre compte pour commencer'
        : 'Bon retour ! Connectez-vous pour continuer'}</div>

      <form class="auth-form" id="auth-form" novalidate>
        <div class="auth-field">
          <label class="auth-label" for="auth-username">Nom d'utilisateur</label>
          <input class="auth-input" id="auth-username" type="text"
                 autocomplete="${isRegister ? 'username' : 'username'}"
                 autocapitalize="none" spellcheck="false"
                 placeholder="votre pseudo" required />
        </div>

        <div class="auth-field">
          <label class="auth-label" for="auth-password">Mot de passe</label>
          <input class="auth-input" id="auth-password" type="password"
                 autocomplete="${isRegister ? 'new-password' : 'current-password'}"
                 placeholder="${isRegister ? 'min. 4 caractères' : '••••••••'}" required />
        </div>

        ${isRegister ? `
        <div class="auth-field">
          <label class="auth-label" for="auth-confirm">Confirmer le mot de passe</label>
          <input class="auth-input" id="auth-confirm" type="password"
                 autocomplete="new-password"
                 placeholder="répétez le mot de passe" required />
        </div>` : ''}

        <div id="auth-error" class="auth-error hidden"></div>

        <button type="submit" class="auth-btn" id="auth-submit">
          ${isRegister ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      ${users.length > 0 ? `
      <p style="margin-top:16px;font-size:13px;">
        <button class="auth-link" id="auth-toggle">
          ${isRegister ? 'Déjà un compte ? Se connecter' : 'Créer un nouveau compte'}
        </button>
      </p>` : ''}

      ${users.length > 0 ? `
      <div class="auth-users">
        <div class="auth-users-title">Comptes existants</div>
        <div>
          ${users.map(u => `
            <button class="auth-user-chip" data-username="${_escHtml(u.username)}">
              👤 ${_escHtml(u.username)}
            </button>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `;

  /* ── Références DOM ─────────────────────────────────── */
  const form        = container.querySelector('#auth-form');
  const inputUser   = container.querySelector('#auth-username');
  const inputPass   = container.querySelector('#auth-password');
  const inputConf   = container.querySelector('#auth-confirm');
  const errorDiv    = container.querySelector('#auth-error');
  const toggleBtn   = container.querySelector('#auth-toggle');
  const chips       = container.querySelectorAll('.auth-user-chip');

  /* ── Chips utilisateurs ─────────────────────────────── */
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      inputUser.value = chip.dataset.username;
      inputPass.value = '';
      inputPass.focus();
    });
  });

  /* ── Bascule login / register ───────────────────────── */
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      _renderAuthForm(container, onLogin, !isRegister);
    });
  }

  /* ── Touche Entrée sur les champs mot de passe ──────── */
  const handleEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); _doSubmit(); } };
  inputPass?.addEventListener('keydown', handleEnter);
  inputConf?.addEventListener('keydown', handleEnter);

  /* ── Soumission ─────────────────────────────────────── */
  form.addEventListener('submit', (e) => { e.preventDefault(); _doSubmit(); });

  function _showError(msg) {
    errorDiv.textContent  = msg;
    errorDiv.classList.remove('hidden');
  }

  function _hideError() {
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
  }

  async function _doSubmit() {
    _hideError();

    const username = inputUser.value.trim();
    const password = inputPass.value;
    const confirm  = inputConf ? inputConf.value : null;

    /* Validation côté client */
    if (username.length < 3) {
      _showError("Le nom d'utilisateur doit faire au moins 3 caractères.");
      inputUser.focus();
      return;
    }
    if (password.length < 4) {
      _showError('Le mot de passe doit faire au moins 4 caractères.');
      inputPass.focus();
      return;
    }
    if (isRegister && confirm !== null && password !== confirm) {
      _showError('Les mots de passe ne correspondent pas.');
      inputConf.focus();
      return;
    }

    const submitBtn = container.querySelector('#auth-submit');
    submitBtn.disabled   = true;
    submitBtn.textContent = isRegister ? 'Création…' : 'Connexion…';

    const result = isRegister
      ? await register(username, password)
      : await login(username, password);

    if (!result.ok) {
      _showError(result.error || 'Une erreur est survenue.');
      submitBtn.disabled    = false;
      submitBtn.textContent = isRegister ? 'Créer mon compte' : 'Se connecter';
      return;
    }

    /* Succès → animation de sortie */
    const screen = container;
    screen.classList.add('auth-animate-out');
    setTimeout(() => {
      screen.classList.add('hidden');
      onLogin(getCurrentUser());
    }, 300);
  }
}

/* ── Utilitaire ──────────────────────────────────────────────────────────── */
function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
