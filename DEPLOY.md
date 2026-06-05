# Deployment Guide — Assemblies of God Financial System

## Overview

- **Backend**: FastAPI → [Railway](https://railway.app)
- **Database**: PostgreSQL → [Supabase](https://supabase.com)
- **Frontend**: React/Vite → [Vercel](https://vercel.com)

---

## Step 1: Create Supabase Project (PostgreSQL Database)

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, fill in name, password, and select a region.
3. Wait for the project to initialize (~2 minutes).
4. Navigate to **Settings → Database**.
5. Under **Connection String**, select **URI** and copy the string. It looks like:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
6. Save this as your `DATABASE_URL` — you will need it in Railway.

> Note: Supabase may provide a `postgres://` URL. The backend automatically rewrites it to `postgresql://` for SQLAlchemy compatibility.

---

## Step 2: Deploy Backend to Railway

1. Go to [https://railway.app](https://railway.app) and sign in (GitHub login recommended).
2. Click **New Project → Deploy from GitHub repo**.
3. Select this repository (`Assemblies-of-God-Financial-System`).
4. Railway will auto-detect the `backend/` directory. If not, set **Root Directory** to `backend`.
5. Set the following **environment variables** in Railway's dashboard under **Variables**:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |
   | `SECRET_KEY` | A long random string (e.g., run `openssl rand -hex 32`) |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app,http://localhost:5173` (update after Vercel deploy) |
   | `PORT` | `8000` (Railway sets this automatically) |

6. Railway will build using `nixpacks` and start with:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
7. After deploy, Railway provides a public URL like `https://agfs-backend.up.railway.app`.
8. **Health check**: Visit `https://agfs-backend.up.railway.app/health` — should return `{"status": "ok"}`.

---

## Step 3: Deploy Frontend to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**, import this GitHub repository.
3. Set **Root Directory** to `frontend`.
4. Vercel will detect it as a Vite project automatically.
5. Under **Environment Variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://agfs-backend.up.railway.app` (your Railway URL) |
   | `VITE_WS_URL` | `wss://agfs-backend.up.railway.app` (note `wss://` for secure WebSocket) |

6. Click **Deploy**. Vercel provides a URL like `https://ag-financial.vercel.app`.
7. Go back to Railway and update `ALLOWED_ORIGINS` to include your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://ag-financial.vercel.app,http://localhost:5173
   ```

---

## Step 4: Initialize the Production Database

After both backend and database are live, run the seed script to populate initial data.

### Option A: From your local machine (with DATABASE_URL set)

```bash
cd backend
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
python seed.py
```

### Option B: Via Railway CLI

```bash
npm install -g @railway/cli
railway login
railway run python seed.py
```

This creates:
- 1 General Council
- 3 Districts, 9 Sections, 45 Local Churches
- Admin/district/section/church user accounts
- 6 months of sample transaction data
- Remittance rules and allocation rules

**Default credentials after seeding:**

| Role | Username | Password |
|---|---|---|
| GC Admin | `admin` | `admin123` |
| District Admin | `d_admin_1` | `admin123` |
| Section Admin | `s_admin_1` | `admin123` |
| Church Admin | `church_admin_1` | `admin123` |

> **Security**: Change all default passwords immediately after first login in production.

---

## Step 5: Post-Deployment Checklist

- [ ] Visit frontend URL and confirm login works
- [ ] Login as `admin` and check the Dashboard loads data
- [ ] Check WebSocket indicator shows "Live" in top bar
- [ ] Navigate to **User Management** and confirm users are listed
- [ ] Test locking/unlocking a non-admin user
- [ ] Test creating a new user via the Add User modal
- [ ] Visit `[railway-url]/health` to confirm health endpoint responds
- [ ] Update `ALLOWED_ORIGINS` in Railway to match exact Vercel domain

---

## Environment Variable Reference

### Backend (set in Railway)

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
SECRET_KEY=your-long-random-secret-key
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### Frontend (set in Vercel)

```env
VITE_API_URL=https://your-backend.railway.app
VITE_WS_URL=wss://your-backend.railway.app
```

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python seed.py          # Initialize local SQLite DB
uvicorn main:app --reload

# Frontend
cd frontend
cp .env.example .env    # Uses http://localhost:8000 by default
npm install
npm run dev
```

The backend defaults to SQLite (`agfs.db`) when `DATABASE_URL` is not set, so local development works without Supabase.
