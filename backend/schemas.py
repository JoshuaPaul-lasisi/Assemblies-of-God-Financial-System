from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime, date


# User schemas
class UserBase(BaseModel):
    username: str
    email: str
    role: str
    hierarchy_level: str
    entity_id: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    hierarchy_level: Optional[str] = None
    entity_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Auth schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# General Council schemas
class GeneralCouncilBase(BaseModel):
    name: str
    country: str


class GeneralCouncilCreate(GeneralCouncilBase):
    pass


class GeneralCouncilResponse(GeneralCouncilBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# District schemas
class DistrictBase(BaseModel):
    name: str
    general_council_id: int


class DistrictCreate(DistrictBase):
    pass


class DistrictResponse(DistrictBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Section schemas
class SectionBase(BaseModel):
    name: str
    district_id: int


class SectionCreate(SectionBase):
    pass


class SectionResponse(SectionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Local Church schemas
class LocalChurchBase(BaseModel):
    name: str
    section_id: int
    pastor_name: Optional[str] = None
    member_count: int = 0


class LocalChurchCreate(LocalChurchBase):
    pass


class LocalChurchUpdate(BaseModel):
    name: Optional[str] = None
    pastor_name: Optional[str] = None
    member_count: Optional[int] = None


class LocalChurchResponse(LocalChurchBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Allocation Rule schemas
class AllocationRuleBase(BaseModel):
    name: str
    level: str
    amount: float
    description: Optional[str] = None
    is_fixed: bool = True


class AllocationRuleCreate(AllocationRuleBase):
    pass


class AllocationRuleUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    is_fixed: Optional[bool] = None


class AllocationRuleResponse(AllocationRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Delegation Rule schemas
class DelegationRuleBase(BaseModel):
    name: str
    level: str
    min_amount: float
    max_amount: Optional[float] = None
    requires_approval_from: str


class DelegationRuleCreate(DelegationRuleBase):
    pass


class DelegationRuleResponse(DelegationRuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Transaction schemas
class TransactionBase(BaseModel):
    transaction_type: str
    amount: float
    from_entity_type: Optional[str] = None
    from_entity_id: Optional[int] = None
    to_entity_type: Optional[str] = None
    to_entity_id: Optional[int] = None
    description: Optional[str] = None


class TransactionCreate(TransactionBase):
    fund_type: Optional[str] = None


class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: int
    status: str
    receipt_number: Optional[str] = None
    approved_by: Optional[int] = None
    rule_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Report schemas
class ReportBase(BaseModel):
    title: str
    report_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ReportCreate(ReportBase):
    pass


class ReportResponse(ReportBase):
    id: int
    generated_by: Optional[int] = None
    file_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Notification schemas
class NotificationBase(BaseModel):
    message: str
    type: str = "info"


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Dashboard schemas
class DashboardStats(BaseModel):
    total_transactions: int
    total_amount: float
    pending_transactions: int
    completed_transactions: int
    monthly_income: float
    monthly_expenses: float
    hierarchy_breakdown: dict
    recent_transactions: List[TransactionResponse]


class HierarchyTree(BaseModel):
    id: int
    name: str
    type: str
    children: Optional[List["HierarchyTree"]] = []


HierarchyTree.model_rebuild()


# ── Remittance Rules ─────────────────────────────────────────────────────────

class RemittanceRuleBase(BaseModel):
    name: str
    from_level: str
    to_level: str
    fund_type: str
    rule_type: str
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    minimum_amount: Optional[float] = None
    maximum_amount: Optional[float] = None
    frequency: str = "monthly"
    effective_from: date
    effective_to: Optional[date] = None
    scope_entity_type: str
    scope_entity_id: int
    requires_dual_auth: bool = False


class RemittanceRuleCreate(RemittanceRuleBase):
    pass


class RemittanceRuleUpdate(BaseModel):
    name: Optional[str] = None
    fund_type: Optional[str] = None
    rule_type: Optional[str] = None
    percentage: Optional[float] = None
    fixed_amount: Optional[float] = None
    minimum_amount: Optional[float] = None
    maximum_amount: Optional[float] = None
    frequency: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    requires_dual_auth: Optional[bool] = None


class UserBrief(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class RemittanceRuleResponse(RemittanceRuleBase):
    id: int
    is_active: bool
    status: str
    created_by_id: int
    created_by: Optional[UserBrief] = None
    approved_by_id: Optional[int] = None
    approved_by: Optional[UserBrief] = None
    approved_at: Optional[datetime] = None
    second_approver_id: Optional[int] = None
    second_approver: Optional[UserBrief] = None
    second_approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RemittanceRuleAuditLogResponse(BaseModel):
    id: int
    rule_id: int
    action: str
    changed_by_id: int
    changed_by: Optional[UserBrief] = None
    changed_at: datetime
    previous_values: Optional[str] = None
    new_values: Optional[str] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True


class RemittanceCalculateRequest(BaseModel):
    amount: float
    fund_type: str
    from_level: str
    to_level: str
    scope_entity_type: str
    scope_entity_id: int


class RemittanceCalculateResponse(BaseModel):
    rule_name: str
    rule_type: str
    input_amount: float
    calculated_amount: float
    breakdown: str


class SubmitApproveRequest(BaseModel):
    note: Optional[str] = None
