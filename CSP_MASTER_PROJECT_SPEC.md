# CSP Master Project Specification

## Purpose
This file is the permanent source of truth for the new Citizen Services Portal (CSP).

## Non-negotiable foundation rules
- Build the new CSP completely from scratch.
- Do not use the old Citizen Portal UI or architecture as the design/architecture reference.
- The old portal may only be used later for migration of required data/service information when explicitly requested.
- One dashboard/application shell.
- Fixed top bar and fixed left navigation.
- Services open inside the same dashboard content area; do not open separate browser pages/windows.
- User-facing UI must not expose technical implementation terms such as Service Engine, API Engine, Wallet Engine, etc.
- UI must be clean, professional, stable, responsive and suitable for production.
- Build the future-proof foundation before loading real services.

## Roles
Master Admin -> Distributor -> Retailer

Master Admin is the final controller for approvals, services, pricing, wallets, configurations and platform controls.

Distributor:
- Registration is available.
- Activation requires Master Admin approval.
- Can create unlimited retailers.
- Every retailer is linked to a distributor.

Retailer:
- Uses services published/allowed by the platform.
- Uses the appropriate wallet according to service configuration.

## Wallets
Two independent wallets:
- Digital Forms Wallet = BLUE
- Real Services Wallet = GREEN

Digital Forms Wallet:
- Government forms
- Certificates
- Affidavits
- Applications
- Document/form services

Real Services Wallet:
- BBPS
- AEPS
- PAN
- Bank verification
- GST
- RC
- DL
- Recharge
- Bill payment
- API/verification services

Every service has exactly one configured wallet type.
Transactions deduct only from that wallet.
Every wallet movement must create a ledger record.
Historical transactions preserve the exact price used at transaction time.
Failed service/API operations must not incorrectly deduct money.
Duplicate transaction protection is required.

## Service/Form Configuration
The service system must be built before real services are loaded.

Normal service creation must be possible through Master Admin configuration, without creating a new frontend page for each service.

Master Admin service configuration should support:
- Service Type: Digital Form / Real Service/API
- State
- Category
- Service Name
- Service Code
- Wallet Type
- Provider/API
- Request fields
- Field type
- Required/optional
- Validation
- Form pages/steps
- Documents
- API endpoint
- API method
- API authentication/configuration
- Request mapping
- Response mapping
- Success/failure conditions
- Master cost
- Distributor price/commission
- Retailer price/commission
- GST
- Transaction limits
- Active/inactive
- Test Service
- Preview
- Save & Publish

After publishing:
- The service automatically appears in the relevant catalogue/navigation.
- No manual page creation should be required.
- Disabling a service automatically removes/disables it for downstream users.

Complex integrations should use reusable integration modules rather than rebuilding the portal.

## Meeseva Forms
Meeseva Forms must remain inside the same dashboard.

State catalogue currently reserved for testing:
1. Telangana
2. Andhra Pradesh
3. Karnataka
4. State 4 / Other State

Exact state catalogue can be finalized later.

Example configuration:
Income Certificate - Telangana
- State: Telangana
- Category: Meeseva Forms
- Wallet: Digital Forms Wallet
- Pages: Applicant Details, Address Details, Family/Income Details, Documents, Declaration, Preview & Submit

## Data and transaction rules
- Proper validation is mandatory.
- Form data should autosave where appropriate.
- Money operations must use database transactions.
- Every transaction must have an immutable historical price snapshot.
- API timeout/retry handling must prevent duplicate billing.
- Audit logs are required for important administrative actions.
- Duplicate submissions must be protected.
- Service/API failure must roll back or avoid wallet deduction.
- Service configuration changes must be auditable.

## Testing
Before production:
- Test every navigation path.
- Test service configuration.
- Test publish/unpublish.
- Test wallet selection.
- Test successful transaction.
- Test failed transaction.
- Test duplicate transaction.
- Test insufficient balance.
- Test pricing changes while preserving old transaction prices.
- Test Distributor -> Retailer flow.
- Test mobile/responsive UI.
- Test API timeout/retry behaviour.
- Test permissions and unauthorized access.
- Test end-to-end actual flows.

Do not call the system production-ready until actual end-to-end testing is completed.

## Deployment rule
Develop/test separately first.
Do not blindly replace the current/live portal.
Production deployment occurs only after approval and testing.

## Current UI direction
Reference desktop: 1440 x 900
Sidebar: 260px
Top bar: 72px
Single dashboard shell
Blue Digital Forms Wallet
Green Real Services Wallet

## Current status
See CSP_CURRENT_STATUS.md.

## Change control
If a future request conflicts with a rule in this file, stop and clarify the conflict before changing the foundation. Do not silently redesign the architecture.
