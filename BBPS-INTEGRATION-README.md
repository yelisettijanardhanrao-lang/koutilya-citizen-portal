# Koutilya BBPS Integration

## Provider
This integration uses the Decentro / Neowise BBPS API.

Provider base URL:
https://pay2all.in/api/v1

## Required environment variable
Add this to your existing `backend/.env` (do not commit the key):

PAY2ALL_API_KEY=YOUR_PAY2ALL_API_KEY

Keep all of your existing MongoDB/JWT settings unchanged.

## Admin flow
1. Start backend.
2. Start frontend.
3. Login as Admin.
4. Open **BBPS** in the Admin sidebar.
5. Click **Test API Connection**.
6. Click **Sync BBPS Operators**.
7. Click **Enable for Users**.

## User flow
When BBPS is enabled, the existing citizen **Meeseva Applications** page automatically shows a new **Bill Payments (BBPS)** card.

Citizen selects a biller, enters the connection/consumer number, and can fetch the bill details.

## Important
The provider documentation currently verified for this integration exposes:
- operator list
- operator icons
- balance
- view bill
- transaction status

A verified bill-payment execution endpoint was not available in the public documentation we inspected, so the code deliberately does NOT invent a payment endpoint. Once the provider gives the payment API endpoint/request schema and production credentials, the payment step can be connected safely.
