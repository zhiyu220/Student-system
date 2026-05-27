# ⚠️ DONT.md — Files You Must NOT Edit Alone

> These files are **shared infrastructure** used by every page or every API route.  
> A careless edit here will **break everyone's work simultaneously**.  
> If you genuinely need to change one of them, **open a PR and get at least one other member to review it first**.

---

## 🖥️ Frontend — Shared JavaScript

### `frontend/js/sidebar.js`
**Why it's dangerous:** Defines the entire navigation structure (`NAV_SECTIONS`).  
Every HTML page renders its sidebar from this single source of truth.  
Adding/renaming/removing a route here affects **all 13 pages** at once.

✅ Allowed: adding a new nav item **only after** the corresponding HTML page is merged.  
❌ Never: rename `id`/`href` fields, reorder sections, or change the data structure.

---

### `frontend/js/api.js`
**Why it's dangerous:** Contains `APP_CONFIG` (app name, version, API base URL),
all token helpers (`saveToken` / `getToken` / `clearToken`),
and the `api` object that **every page** calls for every backend request.  
Breaking this file = 100% of pages stop working.

✅ Allowed: adding a new `api.xxx()` method at the bottom.  
❌ Never: rename existing methods, change `APP_CONFIG` keys, or alter `resolveApiBase()`.

---

### `frontend/js/auth.js`
**Why it's dangerous:** Handles login-gate (`checkAuth`), token refresh, and the
`must_change_password` redirect flow. Every protected page calls `checkAuth()` on load.  
A wrong redirect or cleared token will log everyone out instantly.

✅ Allowed: tweaking error messages.  
❌ Never: change redirect targets, remove `clearToken()` calls, or alter the guard logic.

---

## ⚙️ Backend — Core Infrastructure

### `backend/app/core/auth.py`
**Why it's dangerous:** Issues and validates **every JWT token** in the system.
Changing `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_HOURS`, or the `SECRET_KEY` derivation
will invalidate all currently-logged-in users and can silently break auth for every route.

✅ Allowed: tightening password validation rules.  
❌ Never: touch the JWT encode/decode logic or token expiry without a coordinated deploy.

---

### `backend/app/core/db.py`
**Why it's dangerous:** Creates the SQLAlchemy `AsyncEngine` and session factory used
by every single database query in the project.
Any change here affects all 10+ route files simultaneously.

✅ Allowed: adjusting connection pool settings **after benchmarking**.  
❌ Never: change the session factory signature or the `get_db` dependency.

---

### `backend/app/core/config.py`
**Why it's dangerous:** Parses environment variables and exposes the `settings` singleton
imported by auth, db, and every route.
Adding a required field without updating `.env` will crash the server on startup.

✅ Allowed: adding a **optional** field with a safe default.  
❌ Never: rename existing fields or remove default values.

---

## 🗄️ Backend — Data Models (DB Schema)

### `backend/app/models/user.py`
### `backend/app/models/course.py`
**Why it's dangerous:** These map directly to database tables.
Renaming or dropping a column without a migration script will cause runtime errors
across **every route** that touches that table.

✅ Allowed: adding a **nullable** column with a migration script included in the same PR.  
❌ Never: rename columns, change column types, or drop columns without a migration.

---

## 🔑 Auth Route

### `backend/app/api/routes/auth.py`
**Why it's dangerous:** The `/api/auth/login` and `/api/auth/me` endpoints are called
by `api.js` and `auth.js` on every page load. Changing the response schema
(e.g., renaming `must_change_password`) will silently break the frontend redirect flow.

✅ Allowed: adding rate-limiting or logging.  
❌ Never: change response field names or the token payload structure.

---

## 📦 Dependency Manifest

### `backend/requirements.txt`
**Why it's dangerous:** Shared by all developers and the CI/CD environment.
Adding an incompatible version pin or removing a package breaks everyone's local setup
and the production deployment.

✅ Allowed: adding a new package **with a pinned version** (`package==x.y.z`).  
❌ Never: remove packages or use unpinned ranges (e.g., `package>=1.0`) without discussion.

---

## 📋 Quick Reference

| File | Impact if broken |
|------|-----------------|
| `frontend/js/sidebar.js` | All pages lose navigation |
| `frontend/js/api.js` | All pages lose API access |
| `frontend/js/auth.js` | All pages lose auth guard |
| `backend/app/core/auth.py` | All JWT validation breaks |
| `backend/app/core/db.py` | All DB queries fail |
| `backend/app/core/config.py` | Server won't start |
| `backend/app/models/user.py` | User-related routes crash |
| `backend/app/models/course.py` | Course-related routes crash |
| `backend/app/api/routes/auth.py` | Login/auth flow breaks |
| `backend/requirements.txt` | Local env & deploy break |

---

> **Rule of thumb:** if a file has no `// owned by:` comment and is imported/included
> by more than two other files, treat it as shared infrastructure and follow this guide.
