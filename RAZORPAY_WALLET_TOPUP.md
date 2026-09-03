# Razorpay Wallet Top-up

The existing Citizen Wallet UI now has a backend implementation for Razorpay wallet top-ups. The citizen enters a minimum of ₹100, the backend creates a Razorpay order, Checkout opens, the server verifies the HMAC signature, checks the payment amount/order and ensures the payment is captured before crediting the wallet.

## Environment

Add these values to the existing `backend/.env` (do not commit or share the file):

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=
```

`RAZORPAY_WEBHOOK_SECRET` can be added later when a webhook is created in the Razorpay Dashboard. The browser verification flow works without it, but production reliability should use the `payment.captured` webhook as a second confirmation path.

## API routes

- `POST /api/wallet/topup/order` — authenticated citizen creates an order.
- `POST /api/wallet/topup/verify` — authenticated citizen submits Checkout response; the server verifies it and checks the captured payment.
- `POST /api/wallet/razorpay/webhook` — optional production webhook endpoint for `payment.captured`.

The Razorpay Key Secret is server-only. Never place it in frontend code.

## Test first

Use Razorpay Test Mode keys and a test payment before switching to Live Mode. Live payments move real money and require your Razorpay account's live activation/KYC.
