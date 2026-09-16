# Test and fix report — 15–16 September 2026

## TEST SUMMARY

- Admin: ISSUES — local account repaired; live login, refresh, logout, product creation and search passed.
- Order Admin: ISSUES — local account repaired; live login, customer list, order receipt and status update passed.
- Customer Portal: ISSUES — supplied mobile number is in WhatsApp Number, not Phone Number. Login succeeded using the stored Phone Number and supplied password. Product browsing, category filter, SKU search, product detail, add/remove cart, quantity calculation, refresh persistence and one test order passed.
- Admin-Customer Sync: PASS for the tested product and order: product 19464 / TEST-CODEX-20260915 appeared in the storefront; order RB-047 contained two units at RM 0.01, total RM 0.02. Order Admin saw the same customer, total and date. Packed status appeared on customer tracking after refresh. A later edit from two units to three persisted as RM 0.03 in both portals, then was restored to two units / RM 0.02.
- Security: PARTIAL — local API checks returned 401 for anonymous orders and wrong-role login; ORDER_ADMIN received 403 for Admin-only design settings while ADMIN received 200. Customer logout succeeded, and direct navigation to /orders after logout returned the sign-in page. This is not a complete security audit.
- Responsive: NOT VERIFIED at the requested breakpoints. The browser viewport override did not change the rendered 1280-by-720 viewport. The observed customer order layout had no obvious clipping at that size.

## BUG COUNTS

Confirmed issues in this targeted investigation: Critical 0; High 2; Medium 1; Low 0. These are not exhaustive counts for the entire application.

## TOP PRIORITY BUGS

### BUG-001
Severity: High
Module: Local staff login / account data
Issue: Both local account password hashes did not match the supplied passwords.
Reproduce: Submit the supplied admin or orderadmin credentials to the local login with the matching role.
Expected: Successful sign-in.
Actual: 401 Unauthorized. Direct bcrypt comparisons against both local database records returned false.
Recommended Fix: Completed locally. Reset only these two account hashes and roles in one transaction. Added an explicit development-only accounts:repair command. Verified both comparisons and both browser logins after repair.

### BUG-002
Severity: High
Module: Live Customer account configuration
Issue: The supplied mobile number is stored in WhatsApp Number while authentication uses Phone Number.
Reproduce: Sign in with the supplied mobile number and password.
Expected: The documented login works.
Actual: Invalid phone number or password. The same customer's stored Phone Number is 12345678; login with that number and the supplied password succeeded.
Recommended Fix: Correct the account's Phone Number through its account settings, or correct the supplied login instructions. No live identity or password was changed. Do not change authentication to accept ambiguous WhatsApp numbers as a fallback.

### BUG-003
Severity: Medium
Module: Staff login error display
Issue: Every exception was presented as invalid credentials, including server connection failures and unavailable backends.
Reproduce: Submit the login while its server is unreachable, as in the supplied screenshot.
Expected: A connection or temporary availability message.
Actual: Invalid username, password, or login type.
Recommended Fix: Completed in the delivered source. Added status-bearing ApiError and separate messages for 401, invalid input, rate limiting, server failure and network failure. The built frontend was exercised against a real invalid login (401) and a controlled 503; messages were correct. A successful login was also verified with the patched frontend.

## Additional setup correction

Fresh schema initialization has no Admin seed and there was no account-management command. The new explicit local repair command covers both existing and missing staff accounts. It never runs at API startup and refuses production mode or a non-loopback database host. The README documents it. Environment examples were sanitized, and a root Compose .env.example was added. Actual .env files are excluded from the deliverable.

## Validation

- Backend build passed.
- Frontend TypeScript check passed; production bundle passed using Vite's runner configuration loader. The default loader tried to write into the original read-only dependency directory; runner mode avoided that workspace restriction.
- 13 backend tests passed, including account hashing/transaction tests, rollback and production/remote refusal checks.
- Local API login: 201 for each repaired role. Wrong selected role: 401 for both. Anonymous protected orders: 401. Admin settings: ADMIN 200, ORDER_ADMIN 403.
- Actual live browser sessions were used for all three roles; code inspection was not substituted for the workflows listed as passed.

## Coverage limits

This was a targeted login repair plus critical-path smoke test, not completion of every phase of the supplied full audit. Bulk imports, all document exports, all CRUD combinations, exhaustive search/form boundaries, XSS/SQL-injection/upload probes, IDOR, full logout/back behavior and requested responsive sizes have not all been verified. The customer frontend source is absent from the ZIP, so no customer UI code was modified. No live website deployment was performed.

## Live test records

Only one test order was submitted: RB-047, RM 0.02, with two units of TEST ONLY - DO NOT FULFIL - Codex verification. Test product code TEST-CODEX-20260915, product ID 19464. The order's tracking was changed to Packed solely to test synchronization. Cleanup awaits the user's permanent-deletion confirmation. These records must not be fulfilled.

## PRODUCTION STATUS

NOT READY FOR PRODUCTION

The documented customer login still needs its account number or instructions corrected. The complete requested audit and responsive coverage remain incomplete. The delivered changes have not been deployed to either live website. Passing the tested workflows does not establish full production readiness.


