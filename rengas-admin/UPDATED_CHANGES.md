# Updated code changes

## Included fixes

1. All upload-related code now uses one configurable `UPLOAD_DIR`.
2. Product images remain available after logout, backend restart and new deployment when `UPLOAD_DIR` points to persistent storage.
3. Uploaded JPG/PNG/WebP files are limited to 8 MB, decoded to verify their real contents, resized to at most 1600×1600, stripped of metadata and saved as compressed progressive JPEG.
4. Bulk-upload product images use the same persistent directory.
5. Catalogue PDF generation reads from that directory, caches optimized image buffers, removes noisy per-path logs, and times out remote images after eight seconds.
6. PDFKit compression remains enabled; catalogue images remain resized/compressed before embedding.
7. Backend default port is consistently 3000.
   The Vite development proxy also targets port 3000.
8. A PM2 ecosystem file and production environment template are included.
9. Catalogue products are loaded with one database query instead of one query
   per nine-product page.
10. Catalogue thumbnails use smaller JPEG dimensions and quality to reduce PDF
    generation time and download size.
11. The frontend now starts a direct streamed browser download instead of
    waiting for the complete PDF Blob in memory.
12. The committed frontend environment and Vite fallback now both use backend
    port 3000, permanently removing the recurring 3002 proxy conflict.

## Production installation

Create persistent storage:

```sh
sudo mkdir -p /var/www/rengas-admin/shared/uploads/products
sudo chown -R $USER:www-data /var/www/rengas-admin/shared/uploads
sudo chmod -R 775 /var/www/rengas-admin/shared/uploads
```

Copy and edit the environment file:

```sh
cp backend/.env.example backend/.env
```

Set at minimum `DB_PASSWORD`, `JWT_SECRET`, `BACKEND_PUBLIC_URL` and:

```env
PORT=3000
UPLOAD_DIR=/var/www/rengas-admin/shared/uploads
```

Build and start from the project directory:

```sh
npm run install:all
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

Nginx should serve the same physical directory:

```nginx
location /uploads/ {
    alias /var/www/rengas-admin/shared/uploads/;
    try_files $uri =404;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 180s;
    client_max_body_size 110m;
}
```

## Existing image migration

First copy existing files from the old `backend/uploads` or project `uploads` directory into the new persistent directory. Then use phpMyAdmin to normalize localhost database values:

```sql
UPDATE products
SET image_url = SUBSTRING(image_url, LOCATE('/uploads/', image_url))
WHERE image_url LIKE '%/uploads/%';
```

Back up the database before running the update.

## Verification

1. Upload and save a product image.
2. Confirm `products.image_url` contains `/uploads/<file>.jpg`.
3. Open `https://YOUR-DOMAIN/uploads/<file>.jpg` in an incognito window.
4. Log out and in again.
5. Run `pm2 restart rengas-backend` and verify the image still opens.

The backend TypeScript production build was executed successfully after these changes.

## Step 10: database query performance

1. Dashboard order totals are calculated by one conditional aggregate query instead
   of loading every order into Node.js memory.
2. Customer and order totals run concurrently.
3. Weekly totals use a bounded seven-day calendar range and do not count future orders.
4. Monthly totals use year-aware date boundaries.
5. Order exports apply date, range, month, or customer filters in MySQL before rows
   are loaded and joined.
6. New installations include indexes for order date and customer/date lookups.
7. Existing installations can safely run
   `database/step10-performance-indexes.sql` more than once.
