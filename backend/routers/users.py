from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/users", tags=["User Management"])


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    hierarchy_level: Optional[str] = None
    entity_id: Optional[int] = None


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user)
):
    """List all users. Only accessible by general_council_admin."""
    if current_user.role != "general_council_admin":
        raise HTTPException(status_code=403, detail="Only General Council Admins can list users.")
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return users


@router.patch("/{user_id}/toggle-active", response_model=schemas.UserResponse)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user)
):
    """Toggle a user's is_active status (lockout/unlock). Admin cannot lock themselves."""
    if current_user.role != "general_council_admin":
        raise HTTPException(status_code=403, detail="Only General Council Admins can lock/unlock users.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot lock your own account.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    action = "unlocked" if user.is_active else "locked"
    # Log the action as a notification to admin
    notif = models.Notification(
        user_id=current_user.id,
        message=f"User '{user.username}' has been {action} by {current_user.username}.",
        type="info",
        is_read=False
    )
    db.add(notif)
    db.commit()

    return user


@router.patch("/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user)
):
    """Update a user's username, email, or role. Admin only."""
    if current_user.role != "general_council_admin":
        raise HTTPException(status_code=403, detail="Only General Council Admins can update users.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if data.username is not None:
        existing = db.query(models.User).filter(
            models.User.username == data.username,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken.")
        user.username = data.username

    if data.email is not None:
        existing = db.query(models.User).filter(
            models.User.email == data.email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
        user.email = data.email

    if data.role is not None:
        user.role = data.role

    if data.hierarchy_level is not None:
        user.hierarchy_level = data.hierarchy_level

    if data.entity_id is not None:
        user.entity_id = data.entity_id

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=schemas.UserResponse)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user)
):
    """Soft-delete a user by setting is_active=False. Admin only."""
    if current_user.role != "general_council_admin":
        raise HTTPException(status_code=403, detail="Only General Council Admins can delete users.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
