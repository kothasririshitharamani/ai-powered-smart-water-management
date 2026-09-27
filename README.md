# AI-Powered Smart Water Management and Farmer Support System

The repository contains two applications directly at its root: a Flask API in `backend/` and a Telugu-only Expo React Native application in `mobile/`.

## Backend

Use Python 3.11 or newer. Configure a virtual environment in `backend/`, install `backend/requirements.txt`, and copy `backend/.env.example` to `backend/.env` with unique random values for both secrets before deployment.

From `backend/`, run `flask --app run.py init-db` to initialize the SQLite development database, `pytest` to run checks, and `flask --app run.py run --host 0.0.0.0` to start the API. Farmer registration (`POST /api/auth/register`) requires `name`, `mobile`, `password`, `village`, `district`, and `preferred_language` (Telugu). Login (`POST /api/auth/login`) requires `mobile` and `password`; `GET /api/auth/me` validates a Bearer JWT and returns the current farmer for mobile session restoration. Authenticated farmer profiles are read with `GET /api/profile` and saved with `PUT /api/profile`. Email is not part of farmer authentication.

Authenticated water endpoints are `GET/POST /api/water-budget` and `GET/POST /api/water-usage`. `WaterBudget.amount_liters` is authoritative for the current calendar year; profile `available_water` is synchronized to that budget in the same transaction for compatibility with Farmer Profile. Annual budgets are uniquely keyed per farmer and period start. Usage is stored in liters and applies to the current year's budget; usage that would exceed the remaining budget is rejected. Warning levels use remaining-water thresholds configured by `WATER_LOW_REMAINING_PERCENT` (default 30) and `WATER_VERY_LOW_REMAINING_PERCENT` (default 15), with `0 <= very-low < low <= 100` required.

Database schema changes use Flask-Migrate (`flask --app run.py db migrate` and `flask --app run.py db upgrade`).

## Mobile

Use Node.js and npm. Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL` to the reachable backend URL. From `mobile/`, run `npm install`, `npm run typecheck`, and `npm start`. Run `npm run test:e2e` to migrate a disposable SQLite database, start an isolated Flask server, and exercise the Telugu authentication flow end to end.

The app restores the saved secure JWT, then routes to Telugu registration/login, incomplete farmer profile setup, or the authenticated home. Home and Water Management read the same centralized backend-backed budget and usage state. Other product feature screens and workflows have intentionally not been added. `npm test` runs the authentication, profile, and water flow against an isolated, migrated Flask backend and SQLite database.
