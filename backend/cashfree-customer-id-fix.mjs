// Cashfree compatibility fix: keep the portal User ID as the registered email,
// but send Cashfree a stable alpha-numeric customer_id.
// This wrapper changes only Cashfree /orders request payloads.
import crypto from 'node:crypto';

const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  try {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (/https:\/\/(?:api|sandbox)\.cashfree\.com\/pg\/orders(?:\?|$)/i.test(url) && init?.body) {
      const payload = JSON.parse(String(init.body));
      const customer = payload?.customer_details;
      const portalId = String(customer?.customer_id || '');

      if (customer && /[^a-zA-Z0-9_-]/.test(portalId)) {
        const email = String(customer.customer_email || portalId).trim().toLowerCase();
        const stableId = crypto.createHash('sha256').update(email).digest('hex').slice(0, 24);
        customer.customer_id = `KSPL_${stableId}`;
        init = { ...init, body: JSON.stringify(payload) };
        console.log('[CASHFREE FIX] Portal email kept unchanged; Cashfree customer_id:', customer.customer_id);
      }
    }
  } catch (error) {
    console.error('[CASHFREE FIX] Payload adjustment skipped:', error?.message || error);
  }

  return originalFetch(input, init);
};
