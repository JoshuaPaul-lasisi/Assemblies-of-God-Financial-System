from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from database import get_db
import models
import schemas
import auth as auth_utils
from routers.websocket import manager

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def generate_receipt_number(db: Session, level: str) -> str:
    year = datetime.now().year
    level_codes = {
        "general_council": "GC",
        "district": "DT",
        "section": "SC",
        "local_church": "LC"
    }
    code = level_codes.get(level, "TX")
    count = db.query(models.Transaction).count() + 1
    return f"AG-{year}-{code}-{count:05d}"


def determine_approval_level(amount: float) -> str:
    if amount < 10000:
        return "auto"
    elif amount < 50000:
        return "section"
    elif amount < 200000:
        return "district"
    else:
        return "general_council"


@router.get("", response_model=List[schemas.TransactionResponse])
def list_transactions(
    status: Optional[str] = None,
    transaction_type: Optional[str] = None,
    from_entity_type: Optional[str] = None,
    from_entity_id: Optional[int] = None,
    to_entity_type: Optional[str] = None,
    to_entity_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    q = db.query(models.Transaction)
    if status:
        q = q.filter(models.Transaction.status == status)
    if transaction_type:
        q = q.filter(models.Transaction.transaction_type == transaction_type)
    if from_entity_type:
        q = q.filter(models.Transaction.from_entity_type == from_entity_type)
    if from_entity_id:
        q = q.filter(models.Transaction.from_entity_id == from_entity_id)
    if to_entity_type:
        q = q.filter(models.Transaction.to_entity_type == to_entity_type)
    if to_entity_id:
        q = q.filter(models.Transaction.to_entity_id == to_entity_id)
    return q.order_by(models.Transaction.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{transaction_id}", response_model=schemas.TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.post("", response_model=schemas.TransactionResponse)
async def create_transaction(
    data: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    # Determine approval level based on amount
    approval_level = determine_approval_level(data.amount)

    # Auto-approve small transactions
    initial_status = "completed" if approval_level == "auto" else "pending"

    # Generate receipt number
    from_level = data.from_entity_type or "local_church"
    receipt_number = generate_receipt_number(db, from_level)

    # Look up applicable remittance rule if this is a remittance transaction
    rule_id = None
    dump = data.model_dump()
    fund_type_val = dump.pop("fund_type", None)

    if data.transaction_type == "remittance" and data.from_entity_type and data.to_entity_type:
        today = date.today()
        scope_type = data.from_entity_type
        scope_id = data.from_entity_id
        matched_rule = db.query(models.RemittanceRule).filter(
            models.RemittanceRule.status == "active",
            models.RemittanceRule.is_active == True,
            models.RemittanceRule.from_level == data.from_entity_type,
            models.RemittanceRule.to_level == data.to_entity_type,
            models.RemittanceRule.scope_entity_type == scope_type,
            models.RemittanceRule.scope_entity_id == scope_id,
            models.RemittanceRule.effective_from <= today,
        ).filter(
            (models.RemittanceRule.effective_to == None) |
            (models.RemittanceRule.effective_to >= today)
        ).first()

        if matched_rule:
            rule_id = matched_rule.id
            # Auto-calculate amount if rule found
            if matched_rule.rule_type == "percentage" and matched_rule.percentage:
                calculated = data.amount * matched_rule.percentage / 100.0
                if matched_rule.maximum_amount:
                    calculated = min(calculated, matched_rule.maximum_amount)
                dump["amount"] = round(calculated, 2)
            elif matched_rule.rule_type == "fixed" and matched_rule.fixed_amount:
                dump["amount"] = matched_rule.fixed_amount
            elif matched_rule.rule_type == "hybrid":
                pct = matched_rule.percentage or 0.0
                pct_result = data.amount * pct / 100.0
                minimum = matched_rule.minimum_amount or 0.0
                calculated = max(pct_result, minimum)
                if matched_rule.maximum_amount:
                    calculated = min(calculated, matched_rule.maximum_amount)
                dump["amount"] = round(calculated, 2)

    tx = models.Transaction(
        **dump,
        rule_id=rule_id,
        status=initial_status,
        receipt_number=receipt_number
    )

    if initial_status == "completed":
        tx.approved_by = current_user.id

    db.add(tx)
    db.commit()
    db.refresh(tx)

    # Broadcast WebSocket notification
    await manager.broadcast({
        "type": "new_transaction",
        "data": {
            "id": tx.id,
            "receipt_number": tx.receipt_number,
            "amount": tx.amount,
            "transaction_type": tx.transaction_type,
            "status": tx.status,
            "created_at": tx.created_at.isoformat()
        }
    })

    # Create notification for relevant admins
    if initial_status == "pending":
        # Notify approvers
        approver_roles = []
        if approval_level == "section":
            approver_roles = ["section_admin", "district_admin", "general_council_admin"]
        elif approval_level == "district":
            approver_roles = ["district_admin", "general_council_admin"]
        elif approval_level == "general_council":
            approver_roles = ["general_council_admin"]

        approvers = db.query(models.User).filter(models.User.role.in_(approver_roles)).all()
        for approver in approvers:
            notif = models.Notification(
                user_id=approver.id,
                message=f"New transaction {receipt_number} for ${data.amount:,.2f} requires your approval.",
                type="approval_required"
            )
            db.add(notif)
        db.commit()

    return tx


@router.post("/{transaction_id}/approve", response_model=schemas.TransactionResponse)
async def approve_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin", "section_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to approve transactions")

    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    tx.status = "approved"
    tx.approved_by = current_user.id
    db.commit()
    db.refresh(tx)

    await manager.broadcast({
        "type": "transaction_approved",
        "data": {
            "id": tx.id,
            "receipt_number": tx.receipt_number,
            "status": tx.status,
            "approved_by": current_user.username
        }
    })

    return tx


@router.post("/{transaction_id}/complete", response_model=schemas.TransactionResponse)
async def complete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.status != "approved":
        raise HTTPException(status_code=400, detail="Transaction must be approved first")

    tx.status = "completed"
    db.commit()
    db.refresh(tx)

    await manager.broadcast({
        "type": "transaction_completed",
        "data": {
            "id": tx.id,
            "receipt_number": tx.receipt_number,
            "status": tx.status,
        }
    })

    return tx


@router.post("/{transaction_id}/reject", response_model=schemas.TransactionResponse)
async def reject_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin", "section_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction is not pending")

    tx.status = "rejected"
    tx.approved_by = current_user.id
    db.commit()
    db.refresh(tx)

    await manager.broadcast({
        "type": "transaction_rejected",
        "data": {
            "id": tx.id,
            "receipt_number": tx.receipt_number,
            "status": tx.status,
        }
    })

    return tx
