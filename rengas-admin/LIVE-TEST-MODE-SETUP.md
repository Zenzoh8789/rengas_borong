# Temporary live demo: same visible OTP flow as local

No SMS or email account is needed for this mode.

1. Deploy rengas-admin-test-mode.zip to the backend/admin project.
2. Deploy delivery-customer-web-test-mode.zip to the customer website.
3. In the BACKEND Hostinger environment variables, add:
   PASSWORD_RESET_TEST_MODE = true
   PASSWORD_RESET_TEST_PHONES = the actual registered TEST account phone number
   Keep NODE_ENV = production.

Do not enter the words "the actual registered TEST account phone number":
replace them with your test account's number. No number is enabled in the code
or this package by default. Use the number stored on the test account.

4. Save and redeploy/restart the backend.
5. Open Forgot password, enter that test number, and click Send Reset OTP.
6. The OTP appears below the form. Enter it, verify, choose and confirm a new
   password, submit, and sign in with the new password.

This mode deliberately exposes the reset code for ONLY the configured test
accounts. Anyone who knows a listed phone number can reset that account.
Use accounts with test data only. Other accounts retain their normal
email/SMS requirements and never receive a visible production test code.
Wildcards and empty lists do not enable any account.

After testing:
Set PASSWORD_RESET_TEST_MODE=false and redeploy. Remove the test phone list.
Already issued codes/tokens retain their normal short expiry.

Validation: backend and customer builds checked; automated tests cover
production with no mail/SMS credentials, enabled/disabled flags, phone matching,
blank/wildcard lists, rejection of unlisted phone numbers, OTP verification,
new password login, old password rejection and token reuse.

No Hostinger deployment or live customer-password change was performed by the
assistant. These archives contain source code; keep your existing environment
variables and normal build/deployment commands.
