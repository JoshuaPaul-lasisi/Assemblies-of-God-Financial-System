import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Assemblies of God Financial System",
    description="National financial management system for Assemblies of God hierarchy",
    version="1.0.0"
)

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers import auth, hierarchy, transactions, allocations, reports, dashboard, websocket, remittance_rules, users

app.include_router(auth.router)
app.include_router(hierarchy.router)
app.include_router(transactions.router)
app.include_router(allocations.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(websocket.router)
app.include_router(remittance_rules.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {
        "name": "Assemblies of God Financial System",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/admin/seed")
def admin_seed(key: str):
    if key != os.getenv("SEED_SECRET", ""):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="forbidden")
    import subprocess
    result = subprocess.run(
        ["python", "seed.py"],
        capture_output=True, text=True,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    return {"returncode": result.returncode, "stdout": result.stdout[-3000:], "stderr": result.stderr[-3000:]}


@app.get("/health/db")
def health_db():
    from database import SessionLocal
    import models
    db = SessionLocal()
    try:
        user_count = db.query(models.User).count()
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        from auth import verify_password
        pw_ok = None
        pw_error = None
        if admin:
            try:
                pw_ok = verify_password("admin123", admin.hashed_password)
            except Exception as e:
                pw_error = str(e)
        return {
            "status": "ok",
            "user_count": user_count,
            "admin_exists": admin is not None,
            "admin_active": admin.is_active if admin else None,
            "hash_prefix": admin.hashed_password[:10] if admin else None,
            "password_check": pw_ok,
            "password_check_error": pw_error,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}
    finally:
        db.close()
