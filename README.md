# Gleamator

> Student ERP & attendance web application (backend + frontend)

Portfolio: https://riteshn.me/

## About

This repository contains the backend (Django) and frontend (Vite + React) for the Gleamator student ERP project.


---
## Quickstart (macOS / Linux)

### Prerequisites
- Python 3.11+ and `pip`
- Node.js 16+ / npm or Yarn
- MySQL server (or adjust `ENGINE`/settings for another DB)

### Backend (Django)
1. Create and activate a virtualenv in the project root (recommended path: `.venv`):

```bash
python -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:

```bash
pip install -r backend/erp/requirements.txt
```

3. Create a `.env` file for local development (copy the example and edit values):

```bash
cp backend/erp/.env.example backend/erp/.env
# edit backend/erp/.env and set SECRET_KEY, DB_NAME, DB_USER, DB_PASSWORD, etc.
```

4. Run Django migrations and create a superuser:

```bash
cd backend/erp
python manage.py migrate
python manage.py createsuperuser
```

5. Start the backend (development server on 127.0.0.1:8080):

```bash
./run-backend.sh
# or: python manage.py runserver 127.0.0.1:8080
```

### Frontend (Vite + React)
1. Install Node dependencies and run the dev server:

```bash
./run-frontend.sh
# or:
cd frontend/student
npm install
npm run dev
```

2. The frontend expects the API to be available at `http://127.0.0.1:8080/api/` during development (see `frontend/student/src/lib/api.js`). If your backend runs on a different URL, set `VITE_API_BASE` in your environment or edit `api.js`.

### Notes
- The backend reads configuration from `backend/erp/.env` when `python-dotenv` is installed. Ensure `SECRET_KEY` and `DB_*` variables are present there.
- Don't commit real secrets. Add `backend/erp/.env` to `.gitignore` if necessary.
- To apply production settings, update `erp/erp/settings.py` and environment variables accordingly.

If you want, I can add a `Makefile` or Docker Compose setup for easier local dev.

If you'd like, I can expand this README with setup/run instructions, environment variables, or CI configuration.
