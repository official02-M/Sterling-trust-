/* ============================================================
   STERLING BANK — app shell (sidebar + topbar)
   ============================================================ */

const STB_NAV = [
  { id:'dashboard',     href:'dashboard.html',         icon:'fa-house',                  label:'Dashboard' },
  { id:'transfer',      href:'transfer-internal.html', icon:'fa-arrow-right-arrow-left', label:'Transfers' },
  { id:'external',      href:'transfer-external.html', icon:'fa-building-columns',       label:'External' },
  { id:'move',          href:'move-money.html',        icon:'fa-shuffle',                label:'Move money' },
  { id:'save',          href:'save.html',              icon:'fa-piggy-bank',             label:'Save' },
  { id:'history',       href:'history.html',           icon:'fa-file-invoice',           label:'History' },
  { id:'notifications', href:'notifications.html',     icon:'fa-bell',                   label:'Notifications' },
  { id:'profile',       href:'profile.html',           icon:'fa-user',                   label:'Profile' },
  { id:'settings',      href:'settings.html',          icon:'fa-gear',                   label:'Settings' },
  { id:'help',          href:'help.html',              icon:'fa-circle-question',        label:'Help' }
];

function stbBootstrapDrawer({ active, onReady }) {
  stbOnAuth(async (user, data) => {
    try { mountShell(active, user, data); }
    catch (e) { console.error('mountShell failed:', e); }
    if (typeof onReady === 'function') onReady(user, data);
  });
}

function mountShell(active, user, data) {
  document.body.classList.add('has-sidebar');

  /* ---------- SIDEBAR ---------- */
  if (!document.getElementById('stbSidebar')) {
    const aside = document.createElement('aside');
    aside.id = 'stbSidebar';
    aside.className = 'stb-sidebar';
    aside.innerHTML = `
      <div class="stb-sidebar-head">
        <a href="dashboard.html" class="stb-brand">
          <div class="stb-brand-mark"><i class="fas fa-bolt"></i></div>
          <div>
            <div class="stb-brand-text">Sterling<span>Bank</span></div>
            <div class="stb-brand-sub">BANKING FOR A BETTER TOMORROW</div>
          </div>
        </a>
        <button class="stb-sidebar-close" id="stbSidebarClose" aria-label="Close menu">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <nav class="stb-nav">
        ${STB_NAV.map(n => `
          <a href="${n.href}" class="stb-nav-item ${n.id === active ? 'active' : ''}">
            <i class="fas ${n.icon}"></i><span>${n.label}</span>
          </a>`).join('')}
      </nav>
      <div class="stb-sidebar-promo">
        <h4>Bank smarter on the go</h4>
        <p>Access your account, make payments and more — anytime, anywhere.</p>
        <button class="btn btn-primary btn-block" type="button" id="stbAppBtn">
          <i class="fas fa-download"></i> Get the app
        </button>
      </div>
      <div class="stb-sidebar-foot">
        <a href="help.html">
          <i class="fas fa-headset"></i>
          <div>
            <div style="color:var(--ink);font-weight:600;">Need help?</div>
            <div style="font-size:.7rem;">Contact support</div>
          </div>
        </a>
      </div>`;
    document.body.insertBefore(aside, document.body.firstChild);

    const overlay = document.createElement('div');
    overlay.className = 'stb-sidebar-overlay';
    overlay.id = 'stbSidebarOverlay';
    document.body.insertBefore(overlay, aside.nextSibling);

    const close = () => {
      aside.classList.remove('open');
      overlay.classList.remove('open');
    };
    overlay.addEventListener('click', close);
    aside.querySelector('#stbSidebarClose').addEventListener('click', close);
    aside.querySelector('#stbAppBtn').addEventListener('click', () =>
      stbToast('Mobile app coming soon.', 'success'));
  }

  /* ---------- TOPBAR ---------- */
  let top = document.querySelector('.stb-top');
  if (!top) {
    top = document.createElement('header');
    top.className = 'stb-top';
    const main = document.querySelector('main') || document.body;
    main.parentNode.insertBefore(top, main);
  }

  top.innerHTML = `
    <div class="stb-top-inner">
      
      <!-- Logo Far Left -->
      <a href="dashboard.html" class="stb-brand stb-top-brand">
        <div class="stb-brand-mark"><i class="fas fa-bolt"></i></div>
        <div class="stb-brand-text">Sterling<span>Bank</span></div>
      </a>

      <!-- Search Center (Desktop Only) -->
      <div class="stb-search">
        <i class="fas fa-magnifying-glass"></i>
        <input type="text" id="stbSearchInput"
               placeholder="Search for transactions, accounts, or services..." />
      </div>

      <!-- Actions Right -->
      <div class="stb-top-actions">
        <button class="stb-icon-btn" id="stbNotifBtn" title="Notifications" type="button">
          <i class="fas fa-bell"></i>
          <span class="stb-notif-dot" id="stbNotifDot" style="display:none;"></span>
        </button>
        
        <!-- Mobile Hamburger (Visible only on mobile) -->
        <button class="stb-menu-btn" id="stbMenuBtn" aria-label="Open menu" type="button">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>`;

  document.getElementById('stbMenuBtn').addEventListener('click', () => {
    document.getElementById('stbSidebar').classList.add('open');
    document.getElementById('stbSidebarOverlay').classList.add('open');
  });
  
  document.getElementById('stbNotifBtn').addEventListener('click', () =>
    location.href = 'notifications.html');

  /* Unread dot */
  try {
    db.collection('notifications')
      .where('uid', '==', user.uid)
      .where('read', '==', false)
      .limit(1)
      .onSnapshot(s => {
        const dot = document.getElementById('stbNotifDot');
        if (dot) dot.style.display = s.empty ? 'none' : 'block';
      }, () => {});
  } catch (e) {}

  /* Search box filter */
  const si = document.getElementById('stbSearchInput');
  if (si && location.pathname.endsWith('history.html')) {
    si.addEventListener('input', () => {
      const q = si.value.trim().toLowerCase();
      document.querySelectorAll('.tx-row').forEach(r =>
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none');
    });
  }
}

/* ============================================================
   UPDATED AUTH GUARD
   ============================================================ */
function stbOnAuth(cb) {
  return auth.onAuthStateChanged(async user => {
    if (!user) { 
      location.replace('index.html'); // Redirect to landing page if not logged in
      return; 
    }
    try {
      const snap = await db.collection(COL.users).doc(user.uid).get();
      const data = snap.exists ? snap.data() : {};
      const status = data.status || 'pending';
      
      if (status === 'blocked') {
        await auth.signOut();
        location.replace('login.html?blocked=1');
        return;
      }
      
      if (status === 'pending' && !location.pathname.endsWith('pending.html')) {
        location.replace('pending.html');
        return;
      }

      cb(user, data);
    } catch (e) { 
      console.error('Auth read error:', e); 
      cb(user, {}); 
    }
  });
}
