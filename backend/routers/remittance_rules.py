"""Remittance Rules Engine router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import json

from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/remittance-rules", tags=["Remittance Rules"])

# ── Role helpers ────────────────────────────────────────────────────────────

ADMIN_ROLES = [
    models.UserRole.general_council_admin,
    models.UserRole.district_admin,
    models.UserRole.section_admin,
]

LEVEL_ORDER = {
    "general_council": 3,
    "district": 2,
    "section": 1,
    "local_church": 0,
}


def _require_admin(current_user: models.User):
    if current_user.role not in [r.value for r in ADMIN_ROLES]:
        raise HTTPException(status_code=403, detail="Admin role required")


def _rule_to_dict(rule: models.RemittanceRule) -> dict:
    return {
        "id": rule.id,
        "name": rule.name,
        "from_level": rule.from_level,
        "to_level": rule.to_level,
        "fund_type": rule.fund_type,
        "rule_type": rule.rule_type,
        "percentage": rule.percentage,
        "fixed_amount": rule.fixed_amount,
        "minimum_amount": rule.minimum_amount,
        "maximum_amount": rule.maximum_amount,
        "frequency": rule.frequency,
        "is_active": rule.is_active,
        "effective_from": str(rule.effective_from),
        "effective_to": str(rule.effective_to) if rule.effective_to else None,
        "scope_entity_type": rule.scope_entity_type,
        "scope_entity_id": rule.scope_entity_id,
        "requires_dual_auth": rule.requires_dual_auth,
        "status": rule.status,
        "approved_by_id": rule.approved_by_id,
        "approved_at": rule.approved_at.isoformat() if rule.approved_at else None,
        "second_approver_id": rule.second_approver_id,
        "second_approved_at": rule.second_approved_at.isoformat() if rule.second_approved_at else None,
    }


def _log_action(
    db: Session,
    rule: models.RemittanceRule,
    action: str,
    changed_by_id: int,
    previous_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    note: Optional[str] = None,
):
    log = models.RemittanceRuleAuditLog(
        rule_id=rule.id,
        action=action,
        changed_by_id=changed_by_id,
        changed_at=datetime.utcnow(),
        previous_values=json.dumps(previous_values) if previous_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        note=note,
    )
    db.add(log)


def _check_floor(db: Session, rule_data: schemas.RemittanceRuleCreate, current_user: models.User):
    """Enforce district/GC minimum floors for section-scoped rules."""
    if rule_data.scope_entity_type != "section":
        return  # only enforce for section-level rules

    # Find section's district
    section = db.query(models.Section).filter(models.Section.id == rule_data.scope_entity_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    district_id = section.district_id

    # Find section's GC via district
    district = db.query(models.District).filter(models.District.id == district_id).first()
    gc_id = district.general_council_id if district else None

    # Gather floor rules: district-scoped or GC-scoped active rules for the same fund_type (or "all")
    floor_rules = db.query(models.RemittanceRule).filter(
        models.RemittanceRule.status == "active",
        models.RemittanceRule.is_active == True,
        models.RemittanceRule.fund_type.in_([rule_data.fund_type, "all"]),
    ).filter(
        # district scope matching this section's district, or GC scope matching GC
        (
            (models.RemittanceRule.scope_entity_type == "district") &
            (models.RemittanceRule.scope_entity_id == district_id)
        ) | (
            (models.RemittanceRule.scope_entity_type == "general_council") &
            (models.RemittanceRule.scope_entity_id == gc_id)
        )
    ).all()

    for floor in floor_rules:
        if floor.rule_type in ("percentage", "hybrid") and floor.percentage is not None:
            # New rule must have at least this percentage
            new_pct = rule_data.percentage or 0.0
            if new_pct < floor.percentage:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Rule violates floor set by '{floor.name}': "
                        f"percentage {new_pct}% is below the required minimum of {floor.percentage}%"
                    )
                )
        if floor.rule_type in ("fixed", "hybrid") and floor.fixed_amount is not None:
            new_fixed = rule_data.fixed_amount or 0.0
            if new_fixed < floor.fixed_amount:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Rule violates floor set by '{floor.name}': "
                        f"fixed amount {new_fixed} is below the required minimum of {floor.fixed_amount}"
                    )
                )


def _can_user_see_scope(current_user: models.User, scope_entity_type: str, scope_entity_id: int, db: Session) -> bool:
    """Check if current_user's tier is at or above the rule's scope."""
    user_level = current_user.hierarchy_level
    user_entity_id = current_user.entity_id

    if current_user.role == "general_council_admin":
        return True  # GC admin sees everything

    if current_user.role == "district_admin":
        if scope_entity_type == "general_council":
            return False
        if scope_entity_type == "district":
            return scope_entity_id == user_entity_id
        if scope_entity_type == "section":
            section = db.query(models.Section).filter(models.Section.id == scope_entity_id).first()
            return section is not None and section.district_id == user_entity_id
        return False

    if current_user.role == "section_admin":
        if scope_entity_type in ("general_council", "district"):
            return False
        if scope_entity_type == "section":
            return scope_entity_id == user_entity_id
        return False

    return False


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[schemas.RemittanceRuleResponse])
def list_rules(
    scope_entity_type: Optional[str] = None,
    scope_entity_id: Optional[int] = None,
    fund_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    q = db.query(models.RemittanceRule)
    if scope_entity_type:
        q = q.filter(models.RemittanceRule.scope_entity_type == scope_entity_type)
    if scope_entity_id:
        q = q.filter(models.RemittanceRule.scope_entity_id == scope_entity_id)
    if fund_type:
        q = q.filter(models.RemittanceRule.fund_type == fund_type)
    if status:
        q = q.filter(models.RemittanceRule.status == status)

    rules = q.order_by(models.RemittanceRule.created_at.desc()).all()
    # Filter by visibility
    return [r for r in rules if _can_user_see_scope(current_user, r.scope_entity_type, r.scope_entity_id, db)]


@router.post("", response_model=schemas.RemittanceRuleResponse)
def create_rule(
    data: schemas.RemittanceRuleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)

    # local_church role cannot create rules
    if current_user.role == "church_admin":
        raise HTTPException(status_code=403, detail="Local church role cannot create remittance rules")

    # Section admin can only create rules scoped to their section
    if current_user.role == "section_admin":
        if data.scope_entity_type != "section" or data.scope_entity_id != current_user.entity_id:
            raise HTTPException(status_code=403, detail="Section admin can only create rules for their own section")

    # District admin can only create rules scoped to their district
    if current_user.role == "district_admin":
        if data.scope_entity_type == "general_council":
            raise HTTPException(status_code=403, detail="District admin cannot create GC-scoped rules")
        if data.scope_entity_type == "district" and data.scope_entity_id != current_user.entity_id:
            raise HTTPException(status_code=403, detail="District admin can only create rules for their own district")
        if data.scope_entity_type == "section":
            section = db.query(models.Section).filter(models.Section.id == data.scope_entity_id).first()
            if not section or section.district_id != current_user.entity_id:
                raise HTTPException(status_code=403, detail="Section does not belong to your district")

    # Check floor enforcement for section-scoped rules
    if data.scope_entity_type == "section":
        _check_floor(db, data, current_user)

    rule = models.RemittanceRule(
        **data.model_dump(),
        created_by_id=current_user.id,
        status=models.RemittanceRuleStatus.draft,
        is_active=False,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    _log_action(db, rule, "created", current_user.id, new_values=_rule_to_dict(rule))
    db.commit()

    return rule


@router.put("/{rule_id}", response_model=schemas.RemittanceRuleResponse)
def update_rule(
    rule_id: int,
    data: schemas.RemittanceRuleUpdate,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be updated")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    previous = _rule_to_dict(rule)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)

    _log_action(db, rule, "updated", current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=note)
    db.commit()
    return rule


@router.post("/{rule_id}/submit", response_model=schemas.RemittanceRuleResponse)
def submit_rule(
    rule_id: int,
    body: schemas.SubmitApproveRequest = schemas.SubmitApproveRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft rules can be submitted")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    previous = _rule_to_dict(rule)
    rule.status = models.RemittanceRuleStatus.pending_approval
    db.commit()
    db.refresh(rule)
    _log_action(db, rule, "updated", current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=body.note or "Submitted for approval")
    db.commit()
    return rule


@router.post("/{rule_id}/approve", response_model=schemas.RemittanceRuleResponse)
def approve_rule(
    rule_id: int,
    body: schemas.SubmitApproveRequest = schemas.SubmitApproveRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Rule is not pending approval")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")
    if rule.created_by_id == current_user.id:
        raise HTTPException(status_code=403, detail="Creator cannot approve their own rule")

    previous = _rule_to_dict(rule)
    rule.approved_by_id = current_user.id
    rule.approved_at = datetime.utcnow()

    if rule.requires_dual_auth:
        # stays pending_approval until second approval
        pass
    else:
        rule.status = models.RemittanceRuleStatus.active
        rule.is_active = True

    db.commit()
    db.refresh(rule)

    action = "approved" if not rule.requires_dual_auth else "approved"
    _log_action(db, rule, action, current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=body.note)
    if not rule.requires_dual_auth:
        _log_action(db, rule, "activated", current_user.id, note="Auto-activated after single approval")
    db.commit()
    return rule


@router.post("/{rule_id}/second-approve", response_model=schemas.RemittanceRuleResponse)
def second_approve_rule(
    rule_id: int,
    body: schemas.SubmitApproveRequest = schemas.SubmitApproveRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Rule is not pending approval")
    if not rule.requires_dual_auth:
        raise HTTPException(status_code=400, detail="Rule does not require dual authorization")
    if rule.approved_by_id is None:
        raise HTTPException(status_code=400, detail="First approval not yet given")
    if rule.approved_by_id == current_user.id or rule.created_by_id == current_user.id:
        raise HTTPException(status_code=403, detail="Cannot be the same approver")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    previous = _rule_to_dict(rule)
    rule.second_approver_id = current_user.id
    rule.second_approved_at = datetime.utcnow()
    rule.status = models.RemittanceRuleStatus.active
    rule.is_active = True
    db.commit()
    db.refresh(rule)

    _log_action(db, rule, "approved", current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=body.note or "Second approval given")
    _log_action(db, rule, "activated", current_user.id, note="Activated after dual approval")
    db.commit()
    return rule


@router.post("/{rule_id}/reject", response_model=schemas.RemittanceRuleResponse)
def reject_rule(
    rule_id: int,
    body: schemas.SubmitApproveRequest = schemas.SubmitApproveRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status not in ("pending_approval", "draft"):
        raise HTTPException(status_code=400, detail="Rule cannot be rejected in its current state")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    previous = _rule_to_dict(rule)
    rule.status = models.RemittanceRuleStatus.cancelled
    rule.is_active = False
    db.commit()
    db.refresh(rule)

    _log_action(db, rule, "rejected", current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=body.note)
    db.commit()
    return rule


@router.post("/{rule_id}/deactivate", response_model=schemas.RemittanceRuleResponse)
def deactivate_rule(
    rule_id: int,
    body: schemas.SubmitApproveRequest = schemas.SubmitApproveRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if rule.status != "active":
        raise HTTPException(status_code=400, detail="Only active rules can be deactivated")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    previous = _rule_to_dict(rule)
    rule.is_active = False
    rule.status = models.RemittanceRuleStatus.superseded
    db.commit()
    db.refresh(rule)

    _log_action(db, rule, "deactivated", current_user.id, previous_values=previous, new_values=_rule_to_dict(rule), note=body.note)
    db.commit()
    return rule


@router.get("/{rule_id}/audit-log", response_model=List[schemas.RemittanceRuleAuditLogResponse])
def get_rule_audit_log(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    rule = db.query(models.RemittanceRule).filter(models.RemittanceRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if not _can_user_see_scope(current_user, rule.scope_entity_type, rule.scope_entity_id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(models.RemittanceRuleAuditLog).filter(
        models.RemittanceRuleAuditLog.rule_id == rule_id
    ).order_by(models.RemittanceRuleAuditLog.changed_at.desc()).all()


@router.get("/audit-log/all", response_model=List[schemas.RemittanceRuleAuditLogResponse])
def get_all_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    _require_admin(current_user)
    all_logs = (
        db.query(models.RemittanceRuleAuditLog)
        .join(models.RemittanceRule, models.RemittanceRuleAuditLog.rule_id == models.RemittanceRule.id)
        .order_by(models.RemittanceRuleAuditLog.changed_at.desc())
        .all()
    )
    # Filter by visibility of the associated rule
    visible = [
        log for log in all_logs
        if _can_user_see_scope(current_user, log.rule.scope_entity_type, log.rule.scope_entity_id, db)
    ]
    return visible[skip: skip + limit]


@router.post("/calculate", response_model=schemas.RemittanceCalculateResponse)
def calculate_remittance(
    data: schemas.RemittanceCalculateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_active_user),
):
    """Given amount + fund_type + levels + entity, find applicable active rule and compute remittance."""
    today = date.today()

    # Look for an active rule matching criteria
    rule = db.query(models.RemittanceRule).filter(
        models.RemittanceRule.status == "active",
        models.RemittanceRule.is_active == True,
        models.RemittanceRule.from_level == data.from_level,
        models.RemittanceRule.to_level == data.to_level,
        models.RemittanceRule.scope_entity_type == data.scope_entity_type,
        models.RemittanceRule.scope_entity_id == data.scope_entity_id,
        models.RemittanceRule.fund_type.in_([data.fund_type, "all"]),
        models.RemittanceRule.effective_from <= today,
    ).filter(
        (models.RemittanceRule.effective_to == None) |
        (models.RemittanceRule.effective_to >= today)
    ).order_by(
        # Prefer exact fund_type match over "all"
        models.RemittanceRule.fund_type.desc()
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="No applicable active remittance rule found")

    amount = data.amount
    calculated = 0.0
    breakdown = ""

    if rule.rule_type == "percentage":
        pct = rule.percentage or 0.0
        calculated = amount * pct / 100.0
        breakdown = f"{pct}% of ₦{amount:,.2f} = ₦{calculated:,.2f}"

    elif rule.rule_type == "fixed":
        calculated = rule.fixed_amount or 0.0
        breakdown = f"Fixed amount: ₦{calculated:,.2f}"

    elif rule.rule_type == "hybrid":
        pct = rule.percentage or 0.0
        pct_result = amount * pct / 100.0
        minimum = rule.minimum_amount or 0.0
        calculated = max(pct_result, minimum)
        breakdown = (
            f"{pct}% of ₦{amount:,.2f} = ₦{pct_result:,.2f}"
            f"; min ₦{minimum:,.2f}"
            f" → ₦{calculated:,.2f}"
        )

    # Apply cap if set
    if rule.maximum_amount and calculated > rule.maximum_amount:
        breakdown += f" (capped at ₦{rule.maximum_amount:,.2f})"
        calculated = rule.maximum_amount

    return schemas.RemittanceCalculateResponse(
        rule_name=rule.name,
        rule_type=rule.rule_type,
        input_amount=amount,
        calculated_amount=round(calculated, 2),
        breakdown=breakdown,
    )
