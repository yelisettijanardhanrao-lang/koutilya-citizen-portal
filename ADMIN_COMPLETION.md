# Koutilya Citizen Portal — Admin Completion

## Scope

This release completes the **Admin Portal only**. The existing Citizen Portal pages, service catalogue, application forms, wallet UI and citizen routes are intentionally left unchanged.

There are only two roles:

- `user` — citizen
- `admin` — administrator

No master-admin or super-admin role is used.

## Admin navigation

- Dashboard — existing dashboard retained
- Users & Wallets
- Services
- Logout

The old `/applications` and `/admin-application/:id` admin pages are no longer exposed by the frontend.

## Users & Wallets

Admin can:

- View all citizen accounts
- Select a citizen
- See account details
- See current wallet balance
- See application count
- See transaction count
- See user-wise applications
- See all common application fields
- See service-specific `serviceData`
- Add wallet top-up
- Record every top-up as a wallet transaction
- View wallet/transaction history
- Reset a citizen password without displaying the old password

### CSV export

Inside the selected citizen view:

1. Select citizen
2. Select From Date
3. Select To Date
4. The **Download CSV** button appears
5. Download the selected user's application data for that date range

CSV columns are exactly:

- Applicant Name
- Father Name
- Date of Birth
- Mobile Number
- Address

Date of birth and address are resolved from service-specific application data when available, with common application fields used as fallbacks.

## Services

New admin service catalogue at:

`/admin-services`

Admin can:

- View services
- Add service
- Edit service
- Enable / disable service
- Delete service
- Configure fee
- Configure category
- Configure icon
- Configure citizen route
- Configure form fields
- Configure required documents

Existing services are seeded into the new admin service catalogue on first backend startup.

### Important citizen-portal boundary

The current Citizen Portal service list is intentionally **not modified in this release**, as requested. Therefore, the new admin service catalogue is ready for future dynamic integration, but adding a new service in Admin does not yet change the existing hard-coded Citizen `Services.jsx` page. That integration can be done later as a separate citizen-portal change.

## Backend

Added:

- `backend/models/Service.js`
- `backend/routes/serviceRoutes.js`
- `backend/utils/seedServices.js`

Updated:

- `backend/routes/adminRoutes.js`
- `backend/server.js`

The existing citizen application/payment/PDF functionality is not redesigned.

## Run

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Use the existing `.env` / `.env.example` configuration for MongoDB, JWT and frontend API URL.
