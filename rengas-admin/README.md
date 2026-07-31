# Rengas Admin — React + NestJS + MySQL

A complete starter matching the supplied Rengas administration screenshots, with two role-based interfaces:

- **Admin**: product search/list, categories, product creation, catalogue and design dialogs.
- **Order Management Admin**: order/customer dashboard, customer creation, statistics and order rows.

## Source organization

The React application is organized by responsibility:

```text
frontend/src/
├── api/client.ts          Shared API request helper
├── types/index.ts         Shared application types
├── components/            One React component per file
├── App.tsx                Authentication and application entry only
├── main.tsx
└── styles.css
```

Important product-management components include `Products.tsx`,
`ProductModal.tsx`, `BulkUpload.tsx`, and `CategoryManager.tsx`.

The NestJS application is organized into feature folders:

```text
backend/src/
├── auth/auth.ts
├── products/crud.ts
├── features/features.ts
├── uploads/uploads.ts
├── entities.ts
├── app.module.ts
└── main.ts
```

When adding a new screen or feature, place it in its own file instead of
adding more code to `App.tsx`.

## Quick start

Requirements: Node.js 20+, Docker Desktop.

```bash
docker compose up -d
copy backend\.env.example backend\.env
npm install
npm run install:all
npm run dev
```

Open `http://localhost:5173`.

API runs at `http://localhost:3000/api`; Adminer runs at `http://localhost:8080`.

## Production notes

Change `JWT_SECRET` and database passwords before production. Login is authenticated against users stored in the database using bcrypt password hashes and the selected role. Store uploaded images in S3-compatible object storage, add a JWT authorization guard to protected controllers, and serve both applications behind HTTPS.

## Main API

`POST /api/auth/login`, `GET/POST /api/categories`, `GET/POST/PATCH/DELETE /api/products`, `GET/POST/PATCH/DELETE /api/customers`, `GET /api/orders`, `GET /api/dashboard/stats`.

Product images are uploaded through `POST /api/uploads/image` and served from the backend `/uploads` directory. For production hosting, replace local upload storage with S3-compatible object storage so files survive deployments.

## Bulk product images

The product bulk-upload screen accepts:

1. An Excel/CSV product file with `Code`, `Description`, `Category`, `UOM`,
   and `Price` columns.
2. An optional ZIP containing JPG, JPEG, PNG, or WebP product images.

Name every image using the matching product code. For example, product code
`0013` matches `0013.jpg`, and code `AGKU001` matches `AGKU001.webp`.
Matching is case-insensitive and images may be inside folders in the ZIP.
Keep codes with leading zeros formatted as text in Excel.

An optional `Image` or `imageUrl` column may contain a public HTTP(S) URL or
an exact filename from the ZIP. A blank image value preserves the existing
image when updating a product. The API returns up to 100 row-level errors.

## Upgrade an existing local database

After downloading a newer project version, apply new tables and seed categories without deleting current data:

```powershell
Get-Content database\upgrade.sql | docker compose exec -T mysql mysql -uroot -proot
```

Price imports accept `.csv`, `.xls`, or `.xlsx` files with `Code` and `Price` columns. Backend notifications are created when products, categories, prices, or design settings change.

## Generate catalogue PDF

Open **Generate Catalogue**, enter a title and date range, select one or more
categories, and click **Generate Catalogue**. The React application sends the
selection to:

```text
POST /api/catalogues/generate
```

NestJS creates and downloads an A4 PDF using current database products and
product images. The PDF includes:

- A cover page using the Design CMS banner, stock image, and footer when set.
- One or more pages per selected category.
- A 3-by-3 product grid with image, description, code, UOM, and price.
- A different accent color for each category.
- A fixed footer containing the logo, page number, and ORDER NOW text.

If a category contains more than nine products, additional pages are created
automatically. Products without an image use a neutral placeholder.
