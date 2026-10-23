/* ============================================================
   STERLING BANK — shared Firebase config + helpers
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMucqvSoBlUo5jn5Pu4ClQIGRlInu55mQ",
  authDomain: "project-app-259f2.firebaseapp.com",
  projectId: "project-app-259f2",
  storageBucket: "project-app-259f2.firebasestorage.app",
  messagingSenderId: "389607996830",
  appId: "1:389607996830:web:a9e456c60e4608f1a9ea8f"
};

// Branding + admin gate
const STB_BANK_NAME   = 'Sterling Bank';
const STB_ADMIN_EMAIL = 'enjoygfd42@gmail.com';

// Collections
const COL = {
  users:         'users',
  accounts:      'accounts',
  transactions:  'transactions',
  notifications: 'notifications',
  audit:         'audit_logs'
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();
const FV   = firebase.firestore.FieldValue;
const TS   = firebase.firestore.Timestamp;

/* ---------- formatting ---------- */
function stbMoney(n) {
  n = Number(n || 0);
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function stbMoneyShort(n) {
  n = Number(n || 0);
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return stbMoney(n);
}
function stbDate(ts, opts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-US', opts || {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function stbInitials(name) {
  return (name || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
}
function stbGenReference() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return 'STB-' + t + '-' + r;
}
function stbGenAccountNumber() {
  let n = '';
  for (let i = 0; i < 10; i++) n += Math.floor(Math.random() * 10);
  return n;
}
async function stbHashPin(pin) {
  const buf = new TextEncoder().encode('stb::' + pin);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- toast ---------- */
function stbToast(msg, type) {
  let el = document.getElementById('stb-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'stb-toast';
    el.className = 'stb-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'stb-toast show' + (type ? ' ' + type : '');
  clearTimeout(stbToast._t);
  stbToast._t = setTimeout(() => el.className = 'stb-toast', 2800);
}

/* ---------- auth guards ---------- */
function stbOnAuth(cb) {
  return auth.onAuthStateChanged(async user => {
    if (!user) { location.replace('login.html'); return; }
    try {
      const snap = await db.collection(COL.users).doc(user.uid).get();
      const data = snap.exists ? snap.data() : {};
      const status = data.status || 'pending';
      if (status === 'blocked') {
        await auth.signOut();
        location.replace('login.html?blocked=1');
        return;
      }
      cb(user, data);
    } catch (e) { console.error(e); cb(user, {}); }
  });
}
function stbSignOut() {
  return auth.signOut().then(() => location.replace('login.html'));
}

/* ---------- notifications ---------- */
async function stbNotify(uid, title, body, meta) {
  try {
    await db.collection(COL.notifications).add({
      uid, title, body: body || '',
      meta: meta || null,
      read: false,
      createdAt: FV.serverTimestamp()
    });
  } catch (e) { console.warn('notify failed', e); }
}