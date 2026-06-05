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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routers import auth, hierarchy, transactions, allocations, reports, dashboard, websocket, remittance_rules

app.include_router(auth.router)
app.include_router(hierarchy.router)
app.include_router(transactions.router)
app.include_router(allocations.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(websocket.router)
app.include_router(remittance_rules.router)


@app.get("/")
def root():
    return {
        "name": "Assemblies of God Financial System",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
