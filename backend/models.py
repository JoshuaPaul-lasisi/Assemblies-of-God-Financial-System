from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    general_council_admin = "general_council_admin"
    district_admin = "district_admin"
    section_admin = "section_admin"
    church_admin = "church_admin"
    viewer = "viewer"


class HierarchyLevel(str, enum.Enum):
    general_council = "general_council"
    district = "district"
    section = "section"
    local_church = "local_church"


class TransactionType(str, enum.Enum):
    allocation = "allocation"
    payment = "payment"
    remittance = "remittance"
    expense = "expense"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default=UserRole.viewer)
    hierarchy_level = Column(String, nullable=False, default=HierarchyLevel.local_church)
    entity_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    notifications = relationship("Notification", back_populates="user")


class GeneralCouncil(Base):
    __tablename__ = "general_councils"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    districts = relationship("District", back_populates="general_council")


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    general_council_id = Column(Integer, ForeignKey("general_councils.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    general_council = relationship("GeneralCouncil", back_populates="districts")
    sections = relationship("Section", back_populates="district")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    district_id = Column(Integer, ForeignKey("districts.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    district = relationship("District", back_populates="sections")
    local_churches = relationship("LocalChurch", back_populates="section")


class LocalChurch(Base):
    __tablename__ = "local_churches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=False)
    pastor_name = Column(String, nullable=True)
    member_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    section = relationship("Section", back_populates="local_churches")


class AllocationRule(Base):
    __tablename__ = "allocation_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_fixed = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    from_entity_type = Column(String, nullable=True)
    from_entity_id = Column(Integer, nullable=True)
    to_entity_type = Column(String, nullable=True)
    to_entity_id = Column(Integer, nullable=True)
    status = Column(String, default=TransactionStatus.pending)
    description = Column(Text, nullable=True)
    receipt_number = Column(String, unique=True, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    rule_id = Column(Integer, ForeignKey("remittance_rules.id"), nullable=True)

    approver = relationship("User", foreign_keys=[approved_by])
    remittance_rule = relationship("RemittanceRule", foreign_keys=[rule_id])


class DelegationRule(Base):
    __tablename__ = "delegation_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False)
    min_amount = Column(Float, nullable=False)
    max_amount = Column(Float, nullable=True)
    requires_approval_from = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(Integer, nullable=True)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    generator = relationship("User", foreign_keys=[generated_by])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, nullable=False, default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ── Remittance Rules Engine ──────────────────────────────────────────────────

class RemittanceFundType(str, enum.Enum):
    tithes = "tithes"
    building_fund = "building_fund"
    missions_fund = "missions_fund"
    general_offering = "general_offering"
    special_offering = "special_offering"
    all = "all"


class RemittanceRuleType(str, enum.Enum):
    percentage = "percentage"
    fixed = "fixed"
    hybrid = "hybrid"


class RemittanceFrequency(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    annually = "annually"


class RemittanceRuleStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    active = "active"
    superseded = "superseded"
    cancelled = "cancelled"


class RemittanceAuditAction(str, enum.Enum):
    created = "created"
    updated = "updated"
    approved = "approved"
    rejected = "rejected"
    activated = "activated"
    deactivated = "deactivated"
    superseded = "superseded"


class RemittanceRule(Base):
    __tablename__ = "remittance_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    from_level = Column(String, nullable=False)   # local_church / section / district
    to_level = Column(String, nullable=False)     # section / district / general_council
    fund_type = Column(String, nullable=False, default=RemittanceFundType.tithes)
    rule_type = Column(String, nullable=False, default=RemittanceRuleType.percentage)
    percentage = Column(Float, nullable=True)
    fixed_amount = Column(Float, nullable=True)
    minimum_amount = Column(Float, nullable=True)
    maximum_amount = Column(Float, nullable=True)
    frequency = Column(String, nullable=False, default=RemittanceFrequency.monthly)
    is_active = Column(Boolean, default=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scope_entity_type = Column(String, nullable=False)  # general_council / district / section
    scope_entity_id = Column(Integer, nullable=False)
    requires_dual_auth = Column(Boolean, default=False)
    status = Column(String, nullable=False, default=RemittanceRuleStatus.draft)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    second_approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    second_approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    second_approver = relationship("User", foreign_keys=[second_approver_id])
    audit_logs = relationship("RemittanceRuleAuditLog", back_populates="rule", cascade="all, delete-orphan")


class RemittanceRuleAuditLog(Base):
    __tablename__ = "remittance_rule_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("remittance_rules.id"), nullable=False)
    action = Column(String, nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    previous_values = Column(Text, nullable=True)   # JSON string
    new_values = Column(Text, nullable=True)         # JSON string
    note = Column(Text, nullable=True)

    rule = relationship("RemittanceRule", back_populates="audit_logs")
    changed_by = relationship("User", foreign_keys=[changed_by_id])
