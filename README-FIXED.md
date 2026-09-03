# Adangal Portal - Bug Fixed Build

## Backend

```powershell
cd backend
copy .env.example .env
npm install
npm start
```

Set `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL` in `.env`.

Backend health check:
`http://localhost:5000/api/health`

## Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Important flow

1. Login/register.
2. Create a service application.
3. Preview.
4. Payment.
5. Backend marks payment paid and generates the service PDF.
6. Success page opens the generated PDF.
7. My Applications reloads applications from MongoDB.

The current build uses the existing demo payment flow and does not connect to a real payment gateway.
