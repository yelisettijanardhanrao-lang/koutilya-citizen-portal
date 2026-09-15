/* Demo connector. Production OCR endpoint can be connected here without changing templates. */
window.CSPApplicationAutofill = {
  async applyFromData(data, root=document) {
    if (!window.CSPApplicationEngine) throw new Error('Application engine not loaded');
    return window.CSPApplicationEngine.fill(data, root);
  }
};