// Cashfree compatibility shim: keep portal User ID as email, but never send an email as Cashfree customer_id.
const originalFetch = globalThis.fetch;
if (typeof originalFetch === 'function') {
  globalThis.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (/api\.cashfree\.com/i.test(String(url)) && init?.body) {
        const raw = Buffer.isBuffer(init.body) ? init.body.toString('utf8') : String(init.body);
        const payload = JSON.parse(raw);
        if (payload?.customer_details?.customer_id && /@/.test(String(payload.customer_details.customer_id))) {
          const email = String(payload.customer_details.customer_id).trim().toLowerCase();
          const safe = email.replace(/[^a-z0-9]/gi, '').slice(0, 30) || 'customer';
          payload.customer_details.customer_id = `KSPL_${safe}`;
          init = { ...init, body: JSON.stringify(payload) };
          console.log('CASHFREE CUSTOMER_ID FIX APPLIED', payload.customer_details.customer_id);
        }
      }
    } catch (e) {
      console.error('CASHFREE CUSTOMER_ID SHIM ERROR', e.message);
    }
    return originalFetch(input, init);
  };
}
