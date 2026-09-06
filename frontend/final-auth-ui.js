(() => {
  function applyFinalLoginUI() {
    const form = document.getElementById('loginForm');
    const input = document.getElementById('uid');
    if (!form || !input) return;

    const label = form.querySelector('label[for="uid"]');
    if (label) label.textContent = 'Mobile Number';
    input.type = 'tel';
    input.inputMode = 'numeric';
    input.maxLength = 10;
    input.autocomplete = 'tel';
    input.placeholder = 'Enter Mobile Number';
    input.pattern = '[6-9][0-9]{9}';

    const lead = form.closest('.auth-card')?.querySelector('.auth-lead');
    if (lead) lead.textContent = 'Sign in with your mobile number and password to continue.';
  }

  const observer = new MutationObserver(applyFinalLoginUI);
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  applyFinalLoginUI();
})();
