# Order tracking update

1. Back up the `rengas_admin` database.
2. Run `backend/sql/2026-09-01-order-tracking-status.sql` once in MySQL Workbench.
3. Keep the existing `backend/.env` file from your local project; it is intentionally excluded from this package.
4. In `backend`, run `npm install`, `npm run build`, then `npm run start:dev`.
5. In `frontend`, run `npm install`, then `npm run dev`.
6. In the customer portal, run `npm install`, then `npm run dev`.

Order admins can set Accepted, Packed, Shipped, or Delivered. The customer portal reads that same status from the backend and highlights all reached tracking stages.
