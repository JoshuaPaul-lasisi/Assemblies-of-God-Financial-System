from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=schemas.Token)
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not auth_utils.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user account")

    access_token = auth_utils.create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if username exists
    existing = db.query(models.User).filter(
        (models.User.username == user_data.username) | (models.User.email == user_data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    hashed_pw = auth_utils.get_password_hash(user_data.password)
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pw,
        role=user_data.role,
        hierarchy_level=user_data.hierarchy_level,
        entity_id=user_data.entity_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth_utils.get_current_active_user)):
    return current_user


@router.get("/users", response_model=list[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.User).all()
