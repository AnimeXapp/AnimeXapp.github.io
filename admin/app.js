// ════════════════════════════════════════════════════════════════
// AnimeX Admin Panel · app.js
// Firebase Web SDK v10 (ESM desde CDN)
//
// ⚠️  ANTES DE USAR: reemplaza WEB_APP_ID con el appId de tu app
//    web en Firebase Console → Project Settings → Your apps →
//    agrega una web app si no existe → copia el appId.
//    También agrega "animexapp.github.io" en Firebase Console →
//    Authentication → Settings → Authorized domains.
// ════════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── CONFIG ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyCvB3s0FsDQHs59ccXsVvIm03tg0EamFBM',
  authDomain:        'animex-2da99.firebaseapp.com',
  projectId:         'animex-2da99',
  storageBucket:     'animex-2da99.firebasestorage.app',
  messagingSenderId: '94695001638',
  appId:             '1:94695001638:web:c6ea57f5e42de30d98a0e7',
};

const ADMIN_EMAIL = 'imaginariagames@gmail.com';
const PAGE_SIZE   = 25;

const ROLES = ['', 'admin', 'moderator', 'staff', 'vip', 'premium', 'donador'];
const ROLE_LABEL = {
  '':          '— Sin rol —',
  admin:       'Admin',
  moderator:   'Moderador',
  staff:       'Staff',
  vip:         'VIP',
  premium:     'Premium',
  donador:     'Donador',
};

// ── FIREBASE ──────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);
const db    = getFirestore(fbApp);

// ── STATE ─────────────────────────────────────────────────────
let currentUser    = null;
let lastUserDoc    = null;
let allLoaded      = false;
let currentSearch  = '';

// ════════════════════════════════════════════════════════════════
// TOASTS
// ════════════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ════════════════════════════════════════════════════════════════
// MODAL DE CONFIRMACIÓN
// ════════════════════════════════════════════════════════════════
function showConfirm({ title, body }) {
  return new Promise(resolve => {
    const overlay  = document.getElementById('modal');
    const titleEl  = document.getElementById('modal-title');
    const bodyEl   = document.getElementById('modal-body');
    let cancelBtn  = document.getElementById('modal-cancel');
    let confirmBtn = document.getElementById('modal-confirm');

    titleEl.textContent = title;
    bodyEl.textContent  = body;
    overlay.hidden = false;

    // Clonar para limpiar listeners previos
    const newCancel  = cancelBtn.cloneNode(true);
    const newConfirm = confirmBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);
    confirmBtn.replaceWith(newConfirm);

    const done = (ok) => { overlay.hidden = true; resolve(ok); };
    newCancel.onclick  = () => done(false);
    newConfirm.onclick = () => done(true);
  });
}

// ════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = user;
    showApp(user);
    navigate(location.hash || '#/users');
  } else if (user) {
    signOut(auth);
    showLoginError('Esta cuenta no tiene permisos de administrador.');
  } else {
    currentUser = null;
    showLogin();
  }
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.disabled    = true;
  btn.textContent = 'Iniciando…';
  hideLoginError();
  try {
    await signInWithEmailAndPassword(
      auth,
      document.getElementById('inp-email').value.trim(),
      document.getElementById('inp-password').value,
    );
  } catch (err) {
    btn.disabled    = false;
    btn.textContent = 'Iniciar sesión';
    showLoginError(friendlyAuthError(err.code));
  }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

function showLogin() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('app').hidden = true;
  const btn = document.getElementById('login-btn');
  btn.disabled    = false;
  btn.textContent = 'Iniciar sesión';
}

function showApp(user) {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app').hidden = false;
  const name = user.displayName || user.email.split('@')[0];
  document.getElementById('admin-label').textContent = name;
  const avatarEl = document.getElementById('admin-avatar');
  if (user.photoURL) {
    avatarEl.innerHTML = `<img src="${user.photoURL}" alt="">`;
  } else {
    avatarEl.textContent = name[0].toUpperCase();
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.hidden = false;
}
function hideLoginError() { document.getElementById('login-error').hidden = true; }

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email':      'Email inválido.',
    'auth/user-not-found':     'Usuario no encontrado.',
    'auth/wrong-password':     'Contraseña incorrecta.',
    'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/network-request-failed': 'Sin conexión. Revisa tu red.',
  };
  return map[code] || `Error (${code})`;
}

// ════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════
const routes = {
  '/users':         renderUsers,
  '/announcements': renderAnnouncements,
  '/support':       renderSupport,
};

window.addEventListener('hashchange', () => navigate(location.hash));

function navigate(hash) {
  if (!currentUser) return;
  const path = hash.replace('#', '') || '/users';
  document.querySelectorAll('.nav-link').forEach(l =>
    l.classList.toggle('active', `#${path}` === l.getAttribute('href'))
  );
  (routes[path] || renderUsers)();
}

// ════════════════════════════════════════════════════════════════
// ── USUARIOS ──
// ════════════════════════════════════════════════════════════════
async function renderUsers() {
  const main = document.getElementById('page-content');
  main.innerHTML = `
    <div class="page-header">
      <h1>Usuarios</h1>
      <input id="user-search" class="search-input" type="text"
             placeholder="Buscar por nombre…" value="${esc(currentSearch)}">
    </div>
    <div class="card">
      <div class="overflow-x">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Premium</th>
              <th>Shadow ban</th>
              <th>XCoins</th>
              <th>Último acceso</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr><td colspan="6" class="state-msg">Cargando…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" id="users-pager"></div>
    </div>
  `;

  lastUserDoc   = null;
  allLoaded     = false;

  document.getElementById('user-search').addEventListener('input', debounce(async e => {
    currentSearch = e.target.value.trim();
    lastUserDoc   = null;
    allLoaded     = false;
    await fetchUsers();
  }, 380));

  await fetchUsers();

  // Event delegation para edición inline
  document.getElementById('users-tbody').addEventListener('change', async e => {
    const t = e.target;

    if (t.dataset.action === 'role') {
      const newRole = t.value;
      await safeUpdate(t.dataset.uid, { role: newRole || null },
        `Rol → ${ROLE_LABEL[newRole] || '—'}`);
    }

    if (t.dataset.action === 'premium') {
      await safeUpdate(t.dataset.uid, { isPremium: t.checked },
        t.checked ? '✓ Premium activado' : 'Premium desactivado');
    }

    if (t.dataset.action === 'shadow') {
      if (t.checked) {
        const ok = await showConfirm({
          title: 'Aplicar shadow ban',
          body: 'El usuario seguirá viendo sus propios mensajes, pero los demás no los verán. ¿Continuar?',
        });
        if (!ok) { t.checked = false; return; }
      }
      await safeUpdate(t.dataset.uid, { shadowed: t.checked },
        t.checked ? 'Shadow ban aplicado' : 'Shadow ban removido');
    }
  });
}

async function fetchUsers() {
  const tbody = document.getElementById('users-tbody');
  const pager = document.getElementById('users-pager');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="state-msg">Cargando…</td></tr>';

  try {
    let q;

    if (currentSearch) {
      const s = currentSearch;
      q = query(
        collection(db, 'users'),
        orderBy('displayName'),
        where('displayName', '>=', s),
        where('displayName', '<=', s + ''),
        limit(PAGE_SIZE),
      );
    } else {
      const cons = [orderBy('lastSeen', 'desc'), limit(PAGE_SIZE)];
      if (lastUserDoc) cons.push(startAfter(lastUserDoc));
      q = query(collection(db, 'users'), ...cons);
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="state-msg">No se encontraron usuarios.</td></tr>';
      if (pager) pager.innerHTML = '';
      return;
    }

    lastUserDoc = snap.docs[snap.docs.length - 1];
    allLoaded   = snap.docs.length < PAGE_SIZE;

    tbody.innerHTML = snap.docs.map(d => userRow({ id: d.id, ...d.data() })).join('');

    if (pager) {
      pager.innerHTML = allLoaded || currentSearch
        ? ''
        : '<button class="btn btn-ghost" id="load-more">Cargar más</button>';
      document.getElementById('load-more')?.addEventListener('click', loadMore);
    }

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="state-msg" style="color:var(--danger)">
      Error al cargar: ${esc(err.message)}</td></tr>`;
  }
}

async function loadMore() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody || allLoaded) return;
  try {
    const q = query(
      collection(db, 'users'),
      orderBy('lastSeen', 'desc'),
      limit(PAGE_SIZE),
      startAfter(lastUserDoc),
    );
    const snap = await getDocs(q);
    if (snap.empty) { allLoaded = true; document.getElementById('users-pager').innerHTML = ''; return; }
    lastUserDoc = snap.docs[snap.docs.length - 1];
    allLoaded   = snap.docs.length < PAGE_SIZE;
    snap.docs.forEach(d => {
      tbody.insertAdjacentHTML('beforeend', userRow({ id: d.id, ...d.data() }));
    });
    if (allLoaded) document.getElementById('users-pager').innerHTML = '';
  } catch (err) {
    toast(`Error: ${err.message}`, 'error');
  }
}

function userRow(u) {
  const name    = esc(u.displayName || '—');
  const email   = esc(u.email || '—');
  const role    = u.role || '';
  const premium = u.isPremium ? 'checked' : '';
  const shadow  = u.shadowed  ? 'checked' : '';
  const coins   = (u.xcoins ?? 0).toLocaleString('es');
  const seen    = u.lastSeen?.toDate ? relTime(u.lastSeen.toDate()) : '—';

  const initial = (u.displayName || u.email || '?')[0].toUpperCase();
  const avatarInner = u.photoUrl
    ? `<img src="${esc(u.photoUrl)}" alt="">`
    : initial;

  const opts = ROLES.map(r =>
    `<option value="${r}" ${r === role ? 'selected' : ''}>${esc(ROLE_LABEL[r])}</option>`
  ).join('');

  return `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar">${avatarInner}</div>
          <div class="user-info">
            <div class="name">${name}</div>
            <div class="email">${email}</div>
          </div>
        </div>
      </td>
      <td>
        <select class="role-select" data-action="role" data-uid="${u.id}">${opts}</select>
      </td>
      <td>
        <label class="toggle">
          <input type="checkbox" data-action="premium" data-uid="${u.id}" ${premium}>
          <span class="toggle-track"></span>
        </label>
      </td>
      <td>
        <label class="toggle shadow-toggle">
          <input type="checkbox" data-action="shadow" data-uid="${u.id}" ${shadow}>
          <span class="toggle-track"></span>
        </label>
      </td>
      <td><span class="coins">✦ ${coins}</span></td>
      <td style="color:var(--muted);font-size:12px">${seen}</td>
    </tr>
  `;
}

async function safeUpdate(uid, data, successMsg) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
    toast(successMsg, 'success');
  } catch (err) {
    console.error(err);
    toast(`Error: ${err.message}`, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
// ── ANUNCIOS ──
// ════════════════════════════════════════════════════════════════
async function renderAnnouncements() {
  const main = document.getElementById('page-content');
  main.innerHTML = `
    <div class="page-header"><h1>Anuncios</h1></div>

    <div class="card card-pad" style="margin-bottom:20px">
      <p class="section-title" style="margin-top:0">Nuevo anuncio</p>
      <form id="ann-form" class="form-grid">
        <div class="form-group">
          <label for="ann-title">Título</label>
          <input id="ann-title" class="form-control" type="text" required
                 placeholder="Ej: Mantenimiento programado">
        </div>
        <div class="form-group">
          <label for="ann-body">Mensaje</label>
          <textarea id="ann-body" class="form-control" rows="3" required
                    placeholder="Escribe el mensaje del anuncio…"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" id="ann-btn" style="width:auto;padding:9px 24px">
            Publicar y notificar a todos
          </button>
        </div>
      </form>
    </div>

    <p class="section-title">Publicados recientemente</p>
    <div class="card" id="ann-list">
      <div class="state-msg">Cargando…</div>
    </div>
  `;

  document.getElementById('ann-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = document.getElementById('ann-btn');
    const title = document.getElementById('ann-title').value.trim();
    const body  = document.getElementById('ann-body').value.trim();

    btn.disabled    = true;
    btn.textContent = 'Publicando…';

    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        body,
        createdAt: serverTimestamp(),
        createdBy: currentUser.email,
      });
      toast('Anuncio publicado — notificación enviada ✓', 'success');
      e.target.reset();
      await loadAnnouncements();
    } catch (err) {
      toast(`Error: ${err.message}`, 'error');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Publicar y notificar a todos';
    }
  });

  await loadAnnouncements();
}

async function loadAnnouncements() {
  const listEl = document.getElementById('ann-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="state-msg">Cargando…</div>';

  try {
    const snap = await getDocs(
      query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20))
    );

    if (snap.empty) {
      listEl.innerHTML = '<div class="state-msg">Sin anuncios publicados aún.</div>';
      return;
    }

    listEl.innerHTML = snap.docs.map(d => {
      const a    = d.data();
      const date = a.createdAt?.toDate ? relTime(a.createdAt.toDate()) : '—';
      return `
        <div class="ann-item">
          <div class="ann-header">
            <span class="ann-title">${esc(a.title)}</span>
            <span class="ann-date">${date}</span>
          </div>
          <p class="ann-body">${esc(a.body)}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="state-msg" style="color:var(--danger)">
      Error: ${esc(err.message)}</div>`;
  }
}

// ════════════════════════════════════════════════════════════════
// ── SOPORTE ──
// ════════════════════════════════════════════════════════════════
let ticketFilter = '';

async function renderSupport() {
  const main = document.getElementById('page-content');
  ticketFilter = '';
  main.innerHTML = `
    <div class="page-header">
      <h1>Soporte</h1>
      <div class="filter-row">
        <button class="btn btn-ghost btn-sm filter-btn active" data-f="">Todos</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-f="open">Abiertos</button>
        <button class="btn btn-ghost btn-sm filter-btn" data-f="resolved">Resueltos</button>
      </div>
    </div>
    <div id="tickets-list"><div class="state-msg">Cargando…</div></div>
  `;

  main.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      main.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ticketFilter = btn.dataset.f;
      loadTickets();
    });
  });

  await loadTickets();
}

async function loadTickets() {
  const listEl = document.getElementById('tickets-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="state-msg">Cargando…</div>';

  try {
    const cons = [
      where('type', '==', 'support'),
      orderBy('createdAt', 'desc'),
      limit(40),
    ];
    if (ticketFilter) cons.push(where('status', '==', ticketFilter));

    const snap = await getDocs(query(collection(db, 'forum_posts'), ...cons));

    if (snap.empty) {
      listEl.innerHTML = '<div class="state-msg">No hay tickets.</div>';
      return;
    }

    listEl.innerHTML = snap.docs.map(d => ticketCard(d.id, d.data())).join('');

    listEl.querySelectorAll('[data-resolve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.resolve;
        const ok = await showConfirm({
          title: 'Resolver ticket',
          body:  'Se marcará como resuelto. Si es el primero que se resuelve para este usuario, recibirá el rango VIP automáticamente.',
        });
        if (!ok) return;

        btn.disabled    = true;
        btn.textContent = 'Resolviendo…';

        try {
          await updateDoc(doc(db, 'forum_posts', id), {
            status:     'resolved',
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUser.email,
          });
          toast('Ticket resuelto ✓', 'success');
          await loadTickets();
        } catch (err) {
          toast(`Error: ${err.message}`, 'error');
          btn.disabled    = false;
          btn.textContent = 'Resolver';
        }
      });
    });

  } catch (err) {
    console.error(err);
    // Firestore exige índice compuesto para where+orderBy en campos distintos
    const needsIndex = err.message?.includes('index');
    listEl.innerHTML = `
      <div class="state-msg" style="color:var(--danger)">
        ${needsIndex
          ? 'Se necesita un índice compuesto en Firestore. Revisa la consola del navegador para el link de creación automática.'
          : `Error: ${esc(err.message)}`}
      </div>`;
  }
}

function ticketCard(id, t) {
  const status    = t.status || 'open';
  const badgeCls  = status === 'resolved' ? 'status-resolved' : 'status-open';
  const badgeTxt  = status === 'resolved' ? 'Resuelto' : 'Abierto';
  const date      = t.createdAt?.toDate ? relTime(t.createdAt.toDate()) : '—';
  const resolveEl = status !== 'resolved'
    ? `<button class="btn btn-ghost btn-sm" data-resolve="${id}">Resolver</button>`
    : '';

  return `
    <div class="ticket-card">
      <div class="ticket-header">
        <div class="ticket-meta">
          <span class="status-badge ${badgeCls}">${badgeTxt}</span>
          <span class="ticket-user">${esc(t.userId || t.userEmail || '—')}</span>
        </div>
        <div class="ticket-actions">
          <span class="ticket-date">${date}</span>
          ${resolveEl}
        </div>
      </div>
      ${t.title ? `<p style="font-weight:500;font-size:13px;margin-bottom:6px">${esc(t.title)}</p>` : ''}
      <p class="ticket-body">${esc(t.content || t.body || '—')}</p>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function relTime(date) {
  const s = (Date.now() - date.getTime()) / 1000;
  if (s < 60)     return 'ahora';
  if (s < 3600)   return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400)  return `hace ${Math.floor(s / 3600)}h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)}d`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
