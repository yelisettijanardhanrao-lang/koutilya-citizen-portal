/* Common autofill engine for All-India Digital Application Templates. */
(function(){
  'use strict';

  window.CSPApplicationEngine = {
    fill(data, root=document) {
      const values = data || {};
      root.querySelectorAll('[data-field]').forEach(el => {
        const key = el.getAttribute('data-field');
        if (!Object.prototype.hasOwnProperty.call(values, key)) return;
        const value = values[key] == null ? '' : String(values[key]);
        if ('value' in el) el.value = value;
        else el.textContent = value;
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
      });
      return values;
    },
    getValues(root=document) {
      const out={};
      root.querySelectorAll('[data-field]').forEach(el => {
        const key=el.getAttribute('data-field');
        out[key] = 'value' in el ? el.value : el.textContent.trim();
      });
      return out;
    }
  };
})();