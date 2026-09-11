# Deploy the cleaned Rengas Admin project

Use Node.js 22.12+ (Node 24 recommended) and the existing MySQL database.

All .env* files were excluded without reading them. Keep the existing server configuration, database and upload storage when applying this source update. Do not overwrite them with empty files. Configuration can be supplied as process/hosting environment variables; no .env file is required when these variables are supplied externally.

Required backend variable names, taken from source validation: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET. JWT_SECRET must be at least 32 characters. Retain any other deployment settings already configured, including CORS and UPLOAD_DIR. Never set VITE_* variables to secret values.

From the project root:

```
npm ci
npm run build
npm start
```

npm ci installs backend and frontend dependencies through postinstall. The production build emits dist/main.js and dist/public. Restart the existing process manager instead of launching an extra server if the application already runs as a managed service.

To run the backend regression tests separately:

```
npm --prefix backend test
```

The tests use mock product repositories; no database connection or environment credentials are needed.

## This release

The store API no longer groups product rows by a stripped description. Every SKU has its own ID, full description, price, image and selling UOM. Existing customer clients can still read the response because each entry retains a single-element uoms array. Deploy this backend before the accompanying customer frontend.

The catalog PDF inclusion toggle retains its existing PDF-only meaning. No product or category records are automatically changed. No database migration is required for the catalog visibility fix. The old upgrade script no longer inserts the unrelated FRONTEND/BACKEND placeholder categories; it does not remove any already-existing categories.

## Verification after deployment

- With the audited database unchanged, customer category SKU counts should be 34, 244, 1519, 363, 208, 116 and 67, totaling 2551.
- Search for AGKU001 and confirm AGAL VILAKU WHITE (S) 800'S at RM120.00. AGW5 remains a separate 500'S pack at RM75.00.
- Confirm 18FRR and 18RO are separate products even though their descriptions and prices match.
- Check the selected SKU and quantity in the cart. Refresh a product detail URL directly.
- Correct the existing product/category assignments against the business master list. The code cannot infer a reliable mapping from the project ZIPs.

Source cleanup excludes old build folders, dependency folders, caches, logs, obsolete release notes and .env* files. Uploaded images and database scripts are retained because they may still be needed. The production website has not been deployed by this package preparation.
## Local versus deployment configuration

Set NODE_ENV=development for local use. Only when DB_HOST is localhost, 127.0.0.1 or ::1 does development mode allow database passwords from the default-password blocklist. A password is still required and must match MySQL. This setting does not create an account or change any database password.

Set NODE_ENV=production for deployment. Production, missing NODE_ENV, other modes and non-loopback database hosts retain the default-password rejection. JWT_SECRET must remain at least 32 characters and non-placeholder in every mode.

Local backend configuration: NODE_ENV=development, DB_HOST=127.0.0.1, DB_PORT=3307 for the supplied Docker mapping, plus your existing DB_USER, DB_PASSWORD, DB_NAME and JWT_SECRET.

Production configuration: NODE_ENV=production and the production database host, port, credentials and JWT secret. Keep configuration on the deployment host; no .env files are included in the source ZIP.

Environment-mode update verified by TypeScript compilation and 10 passing regression tests (six environment tests plus four catalog tests).
