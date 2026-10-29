# Agent Instructions

## Project Map

- `backend/` is a Django REST Framework API. Each app owns its endpoints and domain logic: `accounts`, `departments`, `employees`, `analytics`, `predictions`, and `reports`.
- `frontend/` is a React 19 and Vite client. `src/App.jsx` owns routing, `src/context/AuthContext.jsx` owns client session state, and `src/services/api.js` is the shared Axios client.
- Django includes app routes in `backend/hr_analytics_backend/urls.py`. Vite proxies `/api` to Django at `127.0.0.1:8000`.

## Working Conventions

- Follow the setup, environment, API, and security guidance in [README.md](README.md); avoid duplicating it here. The frontend README also contains leftover Vite template text, so use the root README as the project reference.
- Keep endpoint behavior in the owning Django app. Reuse its serializers and service functions where present; preserve app URL ownership and add migrations for model changes.
- Backend permissions and queryset scoping are the security boundary. Do not rely on frontend route guards for authorization. Preserve manager department scope and employee self-scope when changing employee or analytics queries.
- `employees.views.filter_employee_queryset` is shared by employee views, exports, and analytics. Changes to its filtering behavior can affect all three.
- Frontend API calls should use the shared Axios client and its `/api` base URL. Keep session and token handling consistent with `AuthContext` and the interceptors in `services/api.js`.
- Logout currently removes tokens in the client but does not revoke them on the server. Do not describe it as token revocation or assume the backend blacklists JWTs.
- Seed data uses demonstration accounts and synthetic employee records. `python manage.py seed_data --clear` deletes existing employee, job-role, and department records; only run it against a disposable database.

## Verification

Run backend commands from `backend/`:

```powershell
python manage.py check
python manage.py test
python manage.py makemigrations --check --dry-run
```

Run frontend commands from `frontend/`:

```powershell
npm run lint
npm run build
```

Use the narrowest relevant tests first, then the broader checks when the change affects shared behavior. See [frontend/README.md](frontend/README.md) for frontend-specific startup notes and [README.md](README.md) for complete local setup.