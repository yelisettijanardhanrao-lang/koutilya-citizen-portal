(() => {
  function applyFinalLoginUI() {
    const form = document.getElementById('loginForm');
    const input = document.getElementById('uid');
    if (!form || !input) return;

    const label = form.querySelector('label[for="uid"]');
    if (label) label.textContent = 'User ID';

    input.type = 'email';
    input.inputMode = 'email';
    input.removeAttribute('maxlength');
    input.autocomplete = 'username';
    input.placeholder = 'Enter registered Email ID';
    input.removeAttribute('pattern');

    const lead = form.closest('.auth-card')?.querySelector('.auth-lead');
    if (lead) lead.textContent = 'Sign in with your registered email address and password to continue.';
  }

  const observer = new MutationObserver(applyFinalLoginUI);
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  applyFinalLoginUI();
})();
