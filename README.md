# CostraSphere AI

Full-stack AI SaaS platform for telecom infrastructure planning.

## Stack

- Frontend: React, Vite, TailwindCSS, Framer Motion, Leaflet, Leaflet Routing Machine, Recharts, jsPDF
- Backend: FastAPI, SQLite, SQLAlchemy, JWT, Pandas, geopy, haversine
- Auth: email/password, JWT persistence, Gmail SMTP OTP verification and password reset

## Required inputs

The app uses the provided files:

- `assets/images/logo.png`
- `assets/images/team_logo.png`
- `assets/images/tower.png`
- `data/*_city_costs.csv`
- `data/location_mapping.csv`

The backend merges the six country cost CSVs into a global city-cost dataset at runtime and exposes a developer-only export endpoint for `global_city_costs.csv`.

## Environment

`.env` is created with Gmail SMTP credentials, JWT secret, and SQLite URL. Gmail SMTP is implemented with Python `smtplib` and `MIMEText`.

## Run backend

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

## Run frontend

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Default developer account

- Email: `developer@costrasphere.ai`
- Password: `CostraSphere@Dev2026`

## Dashboards

- Customer: project creation, current/manual location input, detected telecom towers, OSRM route visualization, searchable tower list, customer-safe cost summary, saved projects, chatbot panel, PDF report download.
- Company/Admin: worker analytics, material and connector analytics, revenue charts, deployment planning, project approvals.
- Developer: SQLite database viewer, user management, project access, AI/API/SMTP/OTP logs, admin role management.

## Notes

Location matching uses OpenStreetMap Nominatim via `geopy`, city/state prioritization, and haversine distance. Chennai is explicitly pinned to Tamil Nadu when detected to prevent incorrect Andhra Pradesh matching.
