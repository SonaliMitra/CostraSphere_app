# Railway Single-App Deployment

This repository deploys as one Railway service:

- Flask serves API routes under `/api/*`.
- Flask serves the React production build from `frontend/dist`.
- React Router refresh works through Flask SPA fallback routing.
- Railway PostgreSQL is used automatically through `DATABASE_URL`.

## Railway settings

Set the service root to the repository root.

Railway/Nixpacks uses:

- `nixpacks.toml`
- `Procfile`
- `backend/requirements.txt`
- `frontend/package.json`

## Environment variables

Set these in Railway:

```env
EMAIL_USER=your-gmail-address
EMAIL_PASSWORD=your-gmail-app-password
JWT_SECRET=generate-a-long-random-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Attach a Railway PostgreSQL database to the same project and reference its `DATABASE_URL`.

## Build and start

Nixpacks will run:

```bash
pip install -r backend/requirements.txt
cd frontend && npm install
cd frontend && npm run build
gunicorn backend.app:app
```

## Local smoke test

```bash
cd frontend
npm install
npm run build
cd ..
python -m pip install -r backend/requirements.txt
python backend/app.py
```

Open:

```txt
http://127.0.0.1:5000
```
