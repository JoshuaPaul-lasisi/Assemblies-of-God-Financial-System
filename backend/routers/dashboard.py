from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    now = datetime.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Base query - filter by entity for non-admin users
    q = db.query(models.Transaction)

    total_transactions = q.count()
    total_amount = db.query(func.sum(models.Transaction.amount)).scalar() or 0
    pending = q.filter(models.Transaction.status == "pending").count()
    completed = q.filter(models.Transaction.status == "completed").count()

    monthly_q = q.filter(models.Transaction.created_at >= month_start)
    monthly_income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.created_at >= month_start,
        models.Transaction.transaction_type.in_(["allocation", "remittance", "payment"])
    ).scalar() or 0

    monthly_expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.created_at >= month_start,
        models.Transaction.transaction_type == "expense"
    ).scalar() or 0

    # Hierarchy breakdown
    gc_count = db.query(models.GeneralCouncil).count()
    district_count = db.query(models.District).count()
    section_count = db.query(models.Section).count()
    church_count = db.query(models.LocalChurch).count()

    # Recent transactions
    recent = db.query(models.Transaction).order_by(
        models.Transaction.created_at.desc()
    ).limit(10).all()

    # Monthly chart data (last 6 months)
    chart_data = []
    for i in range(5, -1, -1):
        month_date = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        next_month = (month_date.replace(day=28) + timedelta(days=4)).replace(day=1)
        month_txs = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.created_at >= month_date,
            models.Transaction.created_at < next_month
        ).scalar() or 0
        chart_data.append({
            "month": month_date.strftime("%b %Y"),
            "amount": float(month_txs)
        })

    # Transaction type breakdown
    type_breakdown = {}
    for ttype in ["allocation", "payment", "remittance", "expense"]:
        count = db.query(models.Transaction).filter(
            models.Transaction.transaction_type == ttype
        ).count()
        amount = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.transaction_type == ttype
        ).scalar() or 0
        type_breakdown[ttype] = {"count": count, "amount": float(amount)}

    return {
        "total_transactions": total_transactions,
        "total_amount": float(total_amount),
        "pending_transactions": pending,
        "completed_transactions": completed,
        "monthly_income": float(monthly_income),
        "monthly_expenses": float(monthly_expenses),
        "hierarchy_breakdown": {
            "general_councils": gc_count,
            "districts": district_count,
            "sections": section_count,
            "churches": church_count
        },
        "recent_transactions": [
            {
                "id": tx.id,
                "receipt_number": tx.receipt_number,
                "transaction_type": tx.transaction_type,
                "amount": tx.amount,
                "status": tx.status,
                "from_entity_type": tx.from_entity_type,
                "to_entity_type": tx.to_entity_type,
                "created_at": tx.created_at.isoformat()
            }
            for tx in recent
        ],
        "monthly_chart": chart_data,
        "type_breakdown": type_breakdown
    }


@router.get("/notifications")
def get_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).limit(20).all()

    return [
        {
            "id": n.id,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat()
        }
        for n in notifications
    ]


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.post("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}
