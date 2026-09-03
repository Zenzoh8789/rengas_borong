# Rengas Admin commands

## First-time setup (Windows, macOS, or Linux)

1. Install Node.js 20 or newer and MySQL 8.
2. Copy `backend/.env.example` to `backend/.env` and set real secrets.
   `JWT_SECRET` must be at least 32 random characters. Default values such as
   `root`, `password`, `dev-secret`, and the example placeholders are rejected.
   To start the optional local MySQL container with those values, run
   `docker compose --env-file backend/.env up -d mysql`.

The application checks environment files in this order:

1. `ENV_FILE`, when explicitly set (absolute or relative to the working directory).
2. `backend/.env`, used by root `npm start` and PM2 deployments.
3. `.env`, used by backend-only commands started inside `backend`.

Existing operating-system environment variables take precedence over file values.
3. Install dependencies:

```sh
npm run install:all
```

For an existing database created before Step 10, apply the idempotent performance
indexes once (back up the database first):

```sh
mysql -u YOUR_DB_USER -p YOUR_DB_NAME < database/step10-performance-indexes.sql
```

New databases created from `database/schema.sql` already include these indexes.

4. Start frontend and backend together:

```sh
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3000/api`

## Production build

```sh
npm run build
```

The frontend output is in `frontend/dist` and the backend output is in
`backend/dist`.

## VPS restart with PM2

From the project directory:

```sh
npm run build
pm2 restart rengas-backend --update-env
```

The HTTP port opens only after Nest and MySQL initialize successfully. Configure
the process manager or hosting platform startup grace period to allow database
connection retries; a closed port during initialization means the service is not
ready and must not receive traffic.

Serve `frontend/dist` through Nginx and proxy `/api` plus `/uploads` to
`http://127.0.0.1:3000`.

For production uploads, set `UPLOAD_DIR` to a persistent directory outside
`dist`, for example `/var/www/rengas-admin/shared/uploads`. The same directory
must be used by the application and the Nginx `/uploads/` alias. See
`UPDATED_CHANGES.md` for the complete configuration and migration steps.

## Responsive validation widths

Test the browser at 360, 390, 480, 768, 820, 1024, 1280, 1440, and 1920 pixels.
The CSS includes touch-sized controls, mobile product cards, tablet navigation,
safe-area handling, dynamic viewport height, and reduced-motion support.
