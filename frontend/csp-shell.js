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
      <div></div>
      <div class="top-actions"><button class="icon-btn">🔔</button><div class="profile"><span class="avatar">JA</span><strong>Account</strong><span>⌄</span></div></div>
    </header>
    <main class="csp-main"><section class="csp-content" id="content"></section></main>
  </div>`;
  const content=document.getElementById('content');
  const titles={dashboard:['Dashboard','Portal foundation'],meeseva:['Meeseva Forms','State-based service catalogue'],real:['Real Services','API and assisted services'],wallet:['Wallets','Separate wallet areas are reserved'],transactions:['Transactions','Transaction engine placeholder'],reports:['Reports','Reporting workspace reserved'],complaints:['Complaints','Support workspace reserved'],settings:['Settings','Portal configuration']};
  function render(view='dashboard'){
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    const [title,sub]=titles[view];
    content.innerHTML=`
      <div class="page-head"><div><div class="eyebrow">CSP Portal</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${sub}</p></div></div>
      ${view==='dashboard'?dashboard():placeholder(title)}
      <div class="dimensions">Production shell target: desktop 1440×900 reference • sidebar 260px • topbar 72px • responsive mobile shell</div>`;
  }
  function dashboard(){return `
    <div class="cards">
      <div class="card stat"><div class="stat-top"><span class="stat-label">Digital Forms Wallet</span><span class="stat-icon">₹</span></div><div class="stat-value">₹0.00</div><div class="stat-note">Wallet engine reserved</div></div>
      <div class="card stat"><div class="stat-top"><span class="stat-label">Real Services Wallet</span><span class="stat-icon">⚡</span></div><div class="stat-value">₹0.00</div><div class="stat-note">Wallet engine reserved</div></div>
      <div class="card stat"><div class="stat-top"><span class="stat-label">Active Services</span><span class="stat-icon">▦</span></div><div class="stat-value">0</div><div class="stat-note">No services loaded yet</div></div>
    </div>
    <div class="section-grid">
      <div class="card section-card"><div class="section-title">Service Catalogue</div><div class="empty"><div><strong>No services added yet</strong>Meeseva and Real Services will appear here automatically after Master Admin publishes them.</div></div></div>
      <div class="card section-card"><div class="section-title">Future State Catalogue</div><div class="service-placeholder"><div class="service-box"><span class="badge">Reserved</span><div class="service-title">Telangana</div><small>Meeseva services will be loaded dynamically.</small></div><div class="service-box"><span class="badge">Reserved</span><div class="service-title">Andhra Pradesh</div><small>Same dashboard area; no separate page.</small></div><div class="service-box"><span class="badge">Reserved</span><div class="service-title">Karnataka</div><small>State configuration only.</small></div><div class="service-box"><span class="badge">Reserved</span><div class="service-title">State 4</div><small>Can be configured later.</small></div></div></div>
    </div>`;}
  function placeholder(title){return `<div class="card section-card"><div class="empty"><div><strong>${title} workspace</strong>This is intentionally empty in the foundation build. Services and workflows will be loaded through the central configuration engine.</div></div></div>`;}
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{render(b.dataset.view);document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('open')}));
  document.getElementById('menu').addEventListener('click',()=>{document.getElementById('sidebar').classList.add('open')});
  document.getElementById('overlay').addEventListener('click',()=>{document.getElementById('sidebar').classList.remove('open')});
  render();
})();