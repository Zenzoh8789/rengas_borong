# Forgot-password fix

## Included changes
- Customer portal: Forgot password -> registered phone -> OTP verification -> New Password + Confirm Password -> Reset Password -> Sign In.
- Development reset code stays visible on the OTP screen instead of disappearing with a toast. It is not sent by SMS.
- Reset navigation clears stale passwords/tokens; Back after OTP verification starts a new recovery request.
- Production reset SMS can use Twilio. Delivery errors are shown without exposing provider credentials.
- New passwords are validated and hashed; saving the new password atomically consumes the reset token so it cannot be reused.

## Install
1. Extract both corrected ZIPs alongside each other. Keep your existing environment files and uploads. These packages exclude .env secrets, dependencies and generated build files.
2. In rengas-admin/backend run npm ci.
3. Check whether your customers table has reset_otp_hash, reset_otp_expires_at, reset_otp_attempts, reset_token_hash and reset_token_expires_at. If missing, run backend/sql/2026-09-16-customer-password-reset.sql once against the intended database. The supplied migration selects rengas_admin; adjust that database name if yours differs. Do not rerun it when the columns already exist.
4. For local testing, keep NODE_ENV=development. Without Twilio configuration the OTP is displayed on the customer verification screen.
5. For production, configure backend-only TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and either TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID. For national numbers starting with 0, set SMS_DEFAULT_COUNTRY_CODE (for example 60 for Malaysia). Use the same registered phone number format when requesting reset. Numbers without a leading 0 must include their country calling code.
6. Run npm run build in rengas-admin/backend, then restart your backend using your existing deployment process.
7. In delivery-customer-web run npm ci and npm run build. Deploy apps/web/dist using your existing hosting setup and API configuration.

Twilio API reference: https://www.twilio.com/docs/messaging/api/message-resource
No provider credentials were supplied. Actual SMS delivery and live database changes have NOT been tested or performed.

## Verification
- Customer TypeScript/Vite production build: PASS.
- Backend Nest build: PASS.
- Focused reset suite: 9 checks PASS (including parent suite).
- Tests exercise form handlers, password mismatch, failed delivery, back navigation, new-password login, rejection of old password, expired/incorrect OTPs, attempt exhaustion, token expiry/reuse and concurrent password submission.
- Repository behavior and SMS transport use test doubles. These checks are not a live browser / database / SMS end-to-end test.
- Broader original backend suite: 28 passed, 3 failed in design-files and product-image-cleanup tests; those files were not modified by this fix.

Run focused checks after backend build, with both projects beside each other:
  node --test test/password-reset.test.cjs test/password-reset-ui.test.cjs

## Files changed
delivery-customer-web/apps/web/src/pages/LoginPage.tsx
delivery-customer-web/apps/web/src/context/AppContext.tsx
rengas-admin/backend/src/auth/auth.ts
rengas-admin/backend/src/auth/reset-sms.ts
rengas-admin/backend/.env.example
rengas-admin/backend/test/password-reset.test.cjs
rengas-admin/backend/test/password-reset-ui.test.cjs
