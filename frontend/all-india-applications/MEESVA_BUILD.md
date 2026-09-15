# Four-State MeeSeva Build

States: Andhra Pradesh, Telangana, Tamil Nadu, Karnataka.

Navigation stays in the same browser tab: Citizen Menu -> MeeSeva Applications -> state card -> application card -> one-page input form.

Aadhaar autofill is limited to Full Name, Father Name, Date of Birth, Gender, Aadhaar Number where applicable, Address where applicable, and Mobile Number where applicable. Service-specific fields remain manual. No supporting-document upload section is included.

Payment flow: Submit -> authenticated server-side ₹2 wallet deduction -> only after success replace Submit with Generate PDF -> Generate PDF -> downloadable PDF. No Preview button is part of this workflow.

The frontend module calls POST /api/applications to save the application, POST /api/applications/:id/submit-payment to debit ₹2, and POST /api/applications/:id/generate-pdf to generate a paid PDF. The server-side gate files in backend/controllers/applicationPaymentGateController.js and backend/routes/applicationPaymentGateRoutes.js provide the payment/PDF logic; the production server must mount the route before deployment.
