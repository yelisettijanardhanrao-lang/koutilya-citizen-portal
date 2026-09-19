(() => {
  const root=document.getElementById('app');
  root.innerHTML=`
  <div class="csp-shell">
    <aside class="csp-sidebar" id="sidebar">
      <div class="brand"><span class="brand-mark">C</span><span>CSP PORTAL</span></div>
      <nav class="nav">
        <div class="nav-label">MAIN</div>
        <button class="nav-item active" data-view="dashboard"><span class="nav-icon">⌂</span>Dashboard</button>
        <div class="nav-label">SERVICES</div>
        <button class="nav-item" data-view="meeseva"><span class="nav-icon">▦</span>Meeseva Forms</button>
        <button class="nav-item" data-view="real"><span class="nav-icon">⚡</span>Real Services</button>
        <div class="nav-label">ACCOUNT</div>
        <button class="nav-item" data-view="wallet"><span class="nav-icon">₹</span>Wallets</button>
        <button class="nav-item" data-view="transactions"><span class="nav-icon">↔</span>Transactions</button>
        <button class="nav-item" data-view="reports"><span class="nav-icon">▤</span>Reports</button>
        <div class="nav-label">SUPPORT</div>
        <button class="nav-item" data-view="complaints"><span class="nav-icon">♧</span>Complaints</button>
        <button class="nav-item" data-view="settings"><span class="nav-icon">⚙</span>Settings</button>
      </nav>
    </aside>
    <div class="overlay" id="overlay"></div>
    <header class="csp-topbar">
      <div class="csp-brand-mobile">CSP PORTAL</div>
      <button class="icon-btn mobile-menu" id="menu">☰</button>
      <div class="test-badge">FOUNDATION TEST</div>
      <div class="top-actions"><button class="icon-btn">🔔</button><div class="profile"><span class="avatar">JA</span><strong>Account</strong><span>⌄</span></div></div>
    </header>
    <main class="csp-main"><section class="csp-content" id="content"></section></main>
  </div>`;
  const content=document.getElementById('content');
  const titles={dashboard:['Dashboard','Citizen service portal'],meeseva:['Meeseva Forms','One dashboard for all configured states'],real:['Real Services','Services will be added from the catalogue'],wallet:['Wallets','Two clearly separated wallet balances'],transactions:['Transactions','All wallet and service movements'],reports:['Reports','Reports will use the same dashboard shell'],complaints:['Complaints','Support and resolution workspace'],settings:['Settings','Account and portal preferences']};
  function render(view='dashboard'){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const [title,sub]=titles[view];
    content.innerHTML=`<div class="page-head"><div><div class="eyebrow">CSP Portal</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div></div>${view==='dashboard'?dashboard():placeholder(title)}`;
  }
  function dashboard(){return `
    <div class="cards">
      <div class="card stat digital-wallet"><div class="stat-top"><span class="stat-label">Digital Forms Wallet</span><span class="stat-icon">₹</span></div><div class="stat-value">₹0.00</div><div class="stat-note">Used only for Digital Forms</div></div>
      <div class="card stat real-wallet"><div class="stat-top"><span class="stat-label">Real Services Wallet</span><span class="stat-icon">⚡</span></div><div class="stat-value">₹0.00</div><div class="stat-note">Used only for Real Services</div></div>
      <div class="card stat"><div class="stat-top"><span class="stat-label">Active Services</span><span class="stat-icon">▦</span></div><div class="stat-value">0</div><div class="stat-note">No services published yet</div></div>
    </div>
    <div class="section-grid">
      <div class="card section-card"><div class="section-title">Services</div><div class="empty"><div><strong>No services yet</strong>This foundation intentionally starts without services. Published services will appear here automatically.</div></div></div>
      <div class="card section-card"><div class="section-title">Meeseva States</div><div class="service-placeholder">
        <div class="service-box"><span class="badge">Ready</span><div class="service-title">Telangana</div><small>Services will appear here without opening another page.</small></div>
        <div class="service-box"><span class="badge">Ready</span><div class="service-title">Andhra Pradesh</div><small>Same dashboard.</small></div>
        <div class="service-box"><span class="badge">Ready</span><div class="service-title">Karnataka</div><small>Same dashboard.</small></div>
        <div class="service-box"><span class="badge">Ready</span><div class="service-title">State 4</div><small>Configurable later.</small></div>
      </div></div>
    </div>
    <div class="dimensions">Reference: 1440×900 • sidebar 260px • topbar 72px • responsive mobile • single dashboard shell</div>`;}
  function placeholder(title){return `<div class="card section-card"><div class="empty"><div><strong>${title}</strong><span> This workspace stays inside the same dashboard. No separate browser page is opened.</span></div></div></div>`;}
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>render(b.dataset.view)));
  document.getElementById('menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('overlay').addEventListener('click',()=>document.getElementById('sidebar').classList.remove('open'));
  render();
})();