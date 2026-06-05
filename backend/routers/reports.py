from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/reports", tags=["Reports"])

REPORTS_DIR = "./reports"
os.makedirs(REPORTS_DIR, exist_ok=True)


def generate_pdf_report(report: models.Report, transactions, db: Session) -> str:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    except ImportError:
        return None

    filename = f"{REPORTS_DIR}/report_{report.id}_{int(datetime.now().timestamp())}.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("Assemblies of God Financial System", styles['Title']))
    elements.append(Paragraph(report.title, styles['Heading1']))
    elements.append(Spacer(1, 0.2 * inch))

    # Report metadata
    meta = [
        ["Report Type:", report.report_type],
        ["Entity Type:", report.entity_type or "All"],
        ["Period:", f"{report.period_start.strftime('%Y-%m-%d') if report.period_start else 'N/A'} to {report.period_end.strftime('%Y-%m-%d') if report.period_end else 'N/A'}"],
        ["Generated:", datetime.now().strftime("%Y-%m-%d %H:%M:%S")],
    ]
    meta_table = Table(meta, colWidths=[2 * inch, 4 * inch])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.3 * inch))

    # Transactions table
    headers = ["Receipt #", "Type", "Amount", "Status", "Date"]
    data = [headers]
    total = 0
    for tx in transactions:
        data.append([
            tx.receipt_number or "",
            tx.transaction_type,
            f"${tx.amount:,.2f}",
            tx.status,
            tx.created_at.strftime("%Y-%m-%d")
        ])
        total += tx.amount

    # Summary row
    data.append(["", "TOTAL", f"${total:,.2f}", "", ""])

    table = Table(data, colWidths=[1.5 * inch, 1.2 * inch, 1.3 * inch, 1.2 * inch, 1.3 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f0f4f8')]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#d4af37')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
    ]))
    elements.append(table)

    doc.build(elements)
    return filename


@router.get("", response_model=List[schemas.ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    return db.query(models.Report).order_by(models.Report.created_at.desc()).all()


@router.post("", response_model=schemas.ReportResponse)
def create_report(
    data: schemas.ReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    report = models.Report(
        **data.model_dump(),
        generated_by=current_user.id
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Build transaction query
    q = db.query(models.Transaction)
    if data.entity_type:
        q = q.filter(
            (models.Transaction.from_entity_type == data.entity_type) |
            (models.Transaction.to_entity_type == data.entity_type)
        )
    if data.entity_id:
        q = q.filter(
            (models.Transaction.from_entity_id == data.entity_id) |
            (models.Transaction.to_entity_id == data.entity_id)
        )
    if data.period_start:
        q = q.filter(models.Transaction.created_at >= data.period_start)
    if data.period_end:
        q = q.filter(models.Transaction.created_at <= data.period_end)
    transactions = q.all()

    # Generate PDF
    file_path = generate_pdf_report(report, transactions, db)
    if file_path:
        report.file_path = file_path
        db.commit()
        db.refresh(report)

    return report


@router.get("/{report_id}", response_model=schemas.ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(
        report.file_path,
        media_type="application/pdf",
        filename=f"report_{report_id}.pdf"
    )


@router.get("/summary/monthly")
def monthly_summary(
    year: int = None,
    month: int = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    now = datetime.now()
    year = year or now.year
    month = month or now.month

    q = db.query(models.Transaction)
    if entity_type:
        q = q.filter(
            (models.Transaction.from_entity_type == entity_type) |
            (models.Transaction.to_entity_type == entity_type)
        )
    if entity_id:
        q = q.filter(
            (models.Transaction.from_entity_id == entity_id) |
            (models.Transaction.to_entity_id == entity_id)
        )

    transactions = q.all()
    by_type = {}
    for tx in transactions:
        t = tx.transaction_type
        if t not in by_type:
            by_type[t] = {"count": 0, "total": 0.0}
        by_type[t]["count"] += 1
        by_type[t]["total"] += tx.amount

    return {
        "year": year,
        "month": month,
        "summary": by_type,
        "total_transactions": len(transactions),
        "total_amount": sum(tx.amount for tx in transactions)
    }
