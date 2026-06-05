from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/allocations", tags=["Allocations"])


# Allocation Rules
@router.get("/rules", response_model=List[schemas.AllocationRuleResponse])
def list_allocation_rules(
    level: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    q = db.query(models.AllocationRule)
    if level:
        q = q.filter(models.AllocationRule.level == level)
    return q.all()


@router.post("/rules", response_model=schemas.AllocationRuleResponse)
def create_allocation_rule(
    data: schemas.AllocationRuleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    rule = models.AllocationRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.put("/rules/{rule_id}", response_model=schemas.AllocationRuleResponse)
def update_allocation_rule(
    rule_id: int,
    data: schemas.AllocationRuleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    rule = db.query(models.AllocationRule).filter(models.AllocationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
def delete_allocation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin"]:
        raise HTTPException(status_code=403, detail="Only General Council Admin can delete rules")
    rule = db.query(models.AllocationRule).filter(models.AllocationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(rule)
    db.commit()
    return {"message": "Deleted"}


# Delegation Rules
@router.get("/delegation-rules", response_model=List[schemas.DelegationRuleResponse])
def list_delegation_rules(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    return db.query(models.DelegationRule).all()


@router.post("/delegation-rules", response_model=schemas.DelegationRuleResponse)
def create_delegation_rule(
    data: schemas.DelegationRuleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin"]:
        raise HTTPException(status_code=403, detail="Only General Council Admin can manage delegation rules")
    rule = models.DelegationRule(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/delegation-rules/{rule_id}")
def delete_delegation_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    rule = db.query(models.DelegationRule).filter(models.DelegationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(rule)
    db.commit()
    return {"message": "Deleted"}
