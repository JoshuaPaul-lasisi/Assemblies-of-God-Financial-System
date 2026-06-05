from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


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
    pass


class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: int
    status: str
    receipt_number: Optional[str] = None
    approved_by: Optional[int] = None
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
