"""Seed script to populate the database with sample data."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
from models import (
    User, GeneralCouncil, District, Section, LocalChurch,
    AllocationRule, DelegationRule, Transaction, Notification,
    RemittanceRule, RemittanceRuleAuditLog,
    RemittanceRuleStatus, RemittanceFundType, RemittanceRuleType, RemittanceFrequency
)
from auth import get_password_hash
from datetime import datetime, timedelta, date
import random
import json

Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Seeding database...")

# Clear existing data
for model in [Notification, Transaction, RemittanceRuleAuditLog, RemittanceRule,
              AllocationRule, DelegationRule,
              User, LocalChurch, Section, District, GeneralCouncil]:
    db.query(model).delete()
db.commit()

# 1. General Council
gc = GeneralCouncil(name="Assemblies of God USA", country="United States")
db.add(gc)
db.commit()
db.refresh(gc)

# 2. Admin user for General Council
admin = User(
    username="admin",
    email="admin@ag-financial.org",
    hashed_password=get_password_hash("admin123"),
    role="general_council_admin",
    hierarchy_level="general_council",
    entity_id=gc.id,
    is_active=True
)
db.add(admin)
db.commit()
db.refresh(admin)

# 3. Districts
district_names = ["North Central District", "South Central District", "Pacific Northwest District"]
districts = []
for name in district_names:
    d = District(name=name, general_council_id=gc.id)
    db.add(d)
    db.commit()
    db.refresh(d)
    districts.append(d)

    # District admin
    slug = name.lower().replace(" ", "_")[:8]
    d_admin = User(
        username=f"d_admin_{d.id}",
        email=f"district{d.id}@ag-financial.org",
        hashed_password=get_password_hash("admin123"),
        role="district_admin",
        hierarchy_level="district",
        entity_id=d.id,
        is_active=True
    )
    db.add(d_admin)
db.commit()

# 4. Sections (3 per district)
section_names_base = [
    ["Metro Section", "Eastern Section", "Western Section"],
    ["Northern Section", "Southern Section", "Central Section"],
    ["Coastal Section", "Valley Section", "Mountain Section"]
]
sections = []
for i, district in enumerate(districts):
    for sec_name in section_names_base[i]:
        s = Section(name=sec_name, district_id=district.id)
        db.add(s)
        db.commit()
        db.refresh(s)
        sections.append(s)

        s_admin = User(
            username=f"s_admin_{s.id}",
            email=f"section{s.id}@ag-financial.org",
            hashed_password=get_password_hash("admin123"),
            role="section_admin",
            hierarchy_level="section",
            entity_id=s.id,
            is_active=True
        )
        db.add(s_admin)
db.commit()

# 5. Local Churches (5 per section)
pastor_names = [
    "Rev. James Wilson", "Pastor Sarah Johnson", "Rev. Michael Davis",
    "Pastor Emily Brown", "Rev. Robert Miller", "Pastor Jennifer Garcia",
    "Rev. William Martinez", "Pastor Linda Taylor", "Rev. David Anderson",
    "Pastor Mary Thomas", "Rev. Charles Jackson", "Pastor Patricia White",
    "Rev. Joseph Harris", "Pastor Barbara Lewis", "Rev. Daniel Robinson"
]
church_prefixes = ["First", "Grace", "Faith", "Hope", "Trinity", "Calvary",
                   "New Life", "Victory", "Cornerstone", "Harvest"]
church_suffixes = ["Assembly", "Church", "Fellowship", "Ministries", "AG"]

churches = []
pastor_idx = 0
for section in sections:
    for j in range(5):
        church_name = f"{random.choice(church_prefixes)} {random.choice(church_suffixes)} of God"
        c = LocalChurch(
            name=church_name,
            section_id=section.id,
            pastor_name=pastor_names[pastor_idx % len(pastor_names)],
            member_count=random.randint(50, 800)
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        churches.append(c)

        c_admin = User(
            username=f"church_admin_{c.id}",
            email=f"church{c.id}@ag-financial.org",
            hashed_password=get_password_hash("admin123"),
            role="church_admin",
            hierarchy_level="local_church",
            entity_id=c.id,
            is_active=True
        )
        db.add(c_admin)
        pastor_idx += 1
db.commit()

# 6. Allocation Rules
allocation_rules = [
    AllocationRule(name="Monthly Church Tithe", level="local_church", amount=5000.0,
                   description="Fixed monthly tithe from local church to section", is_fixed=True),
    AllocationRule(name="Section Remittance", level="section", amount=15000.0,
                   description="Monthly section remittance to district", is_fixed=True),
    AllocationRule(name="District Assessment", level="district", amount=45000.0,
                   description="Monthly district assessment to General Council", is_fixed=True),
    AllocationRule(name="Special Project Fund", level="local_church", amount=2500.0,
                   description="Quarterly contribution to special projects", is_fixed=False),
    AllocationRule(name="Missions Fund", level="section", amount=8000.0,
                   description="Monthly missions fund contribution", is_fixed=True),
]
for rule in allocation_rules:
    db.add(rule)
db.commit()

# 7. Delegation Rules
delegation_rules = [
    DelegationRule(name="Auto Approval", level="local_church",
                   min_amount=0, max_amount=9999.99,
                   requires_approval_from="auto"),
    DelegationRule(name="Section Approval Required", level="local_church",
                   min_amount=10000, max_amount=49999.99,
                   requires_approval_from="section"),
    DelegationRule(name="District Approval Required", level="section",
                   min_amount=50000, max_amount=199999.99,
                   requires_approval_from="district"),
    DelegationRule(name="General Council Approval Required", level="district",
                   min_amount=200000, max_amount=None,
                   requires_approval_from="general_council"),
]
for rule in delegation_rules:
    db.add(rule)
db.commit()

# 8. Transactions (historical data - last 6 months)
transaction_types = ["allocation", "payment", "remittance", "expense"]
statuses = ["completed", "completed", "completed", "pending", "approved"]
receipt_counter = 1

level_codes = {
    "general_council": "GC",
    "district": "DT",
    "section": "SC",
    "local_church": "LC"
}

now = datetime.now()
for month_offset in range(6):
    month_date = now - timedelta(days=month_offset * 30)

    # Monthly church allocations
    for church in churches:
        # Church to Section
        days_ago = random.randint(1, 28)
        tx_date = month_date.replace(day=min(days_ago, 28))
        amount = random.uniform(3000, 8000)
        status = random.choice(["completed", "completed", "pending"])
        receipt = f"AG-{tx_date.year}-LC-{receipt_counter:05d}"
        receipt_counter += 1

        tx = Transaction(
            transaction_type="allocation",
            amount=round(amount, 2),
            from_entity_type="local_church",
            from_entity_id=church.id,
            to_entity_type="section",
            to_entity_id=church.section_id,
            status=status,
            description=f"Monthly allocation from {church.name}",
            receipt_number=receipt,
            approved_by=admin.id if status in ["completed", "approved"] else None,
            created_at=tx_date
        )
        db.add(tx)

    # Section to District remittances
    for section in sections:
        amount = random.uniform(12000, 20000)
        status = "completed"
        receipt = f"AG-{month_date.year}-SC-{receipt_counter:05d}"
        receipt_counter += 1

        tx = Transaction(
            transaction_type="remittance",
            amount=round(amount, 2),
            from_entity_type="section",
            from_entity_id=section.id,
            to_entity_type="district",
            to_entity_id=section.district_id,
            status=status,
            description=f"Monthly remittance from {section.name}",
            receipt_number=receipt,
            approved_by=admin.id,
            created_at=month_date
        )
        db.add(tx)

    # District to GC
    for district in districts:
        amount = random.uniform(40000, 60000)
        receipt = f"AG-{month_date.year}-DT-{receipt_counter:05d}"
        receipt_counter += 1

        tx = Transaction(
            transaction_type="remittance",
            amount=round(amount, 2),
            from_entity_type="district",
            from_entity_id=district.id,
            to_entity_type="general_council",
            to_entity_id=gc.id,
            status="completed",
            description=f"Monthly district assessment from {district.name}",
            receipt_number=receipt,
            approved_by=admin.id,
            created_at=month_date
        )
        db.add(tx)

    # Some expenses
    for _ in range(5):
        church = random.choice(churches)
        amount = random.uniform(500, 5000)
        receipt = f"AG-{month_date.year}-LC-{receipt_counter:05d}"
        receipt_counter += 1

        tx = Transaction(
            transaction_type="expense",
            amount=round(amount, 2),
            from_entity_type="local_church",
            from_entity_id=church.id,
            to_entity_type=None,
            to_entity_id=None,
            status=random.choice(["completed", "pending"]),
            description=f"Operational expense - {random.choice(['utilities', 'maintenance', 'supplies', 'ministry'])}",
            receipt_number=receipt,
            created_at=month_date - timedelta(days=random.randint(0, 25))
        )
        db.add(tx)

db.commit()

# 9. Notifications for admin
notifs = [
    Notification(user_id=admin.id, message="System initialized successfully.", type="info", is_read=True),
    Notification(user_id=admin.id, message="3 transactions pending approval.", type="approval_required", is_read=False),
    Notification(user_id=admin.id, message="Monthly reports are ready for Q1.", type="report", is_read=False),
]
for n in notifs:
    db.add(n)
db.commit()

# 10. Remittance Rules
# Get one section and its district for scoped rules
first_section = sections[0]
first_district = districts[0]

# "National Tithe Remittance Floor" — GC level, 10% min
national_floor = RemittanceRule(
    name="National Tithe Remittance Floor",
    from_level="local_church",
    to_level="section",
    fund_type=RemittanceFundType.tithes,
    rule_type=RemittanceRuleType.percentage,
    percentage=10.0,
    minimum_amount=None,
    maximum_amount=None,
    fixed_amount=None,
    frequency=RemittanceFrequency.monthly,
    is_active=True,
    effective_from=date(2024, 1, 1),
    effective_to=None,
    created_by_id=admin.id,
    scope_entity_type="general_council",
    scope_entity_id=gc.id,
    requires_dual_auth=False,
    status=RemittanceRuleStatus.active,
    approved_by_id=admin.id,
    approved_at=datetime(2024, 1, 5),
)
db.add(national_floor)
db.commit()
db.refresh(national_floor)

# "Section Tithe Remittance" — section level, 15% tithes, monthly, dual auth, active
section_tithe = RemittanceRule(
    name="Section Tithe Remittance",
    from_level="local_church",
    to_level="section",
    fund_type=RemittanceFundType.tithes,
    rule_type=RemittanceRuleType.percentage,
    percentage=15.0,
    minimum_amount=None,
    maximum_amount=None,
    fixed_amount=None,
    frequency=RemittanceFrequency.monthly,
    is_active=True,
    effective_from=date(2024, 1, 1),
    effective_to=None,
    created_by_id=admin.id,
    scope_entity_type="section",
    scope_entity_id=first_section.id,
    requires_dual_auth=True,
    status=RemittanceRuleStatus.active,
    approved_by_id=admin.id,
    approved_at=datetime(2024, 1, 10),
    second_approver_id=admin.id,
    second_approved_at=datetime(2024, 1, 12),
)
db.add(section_tithe)
db.commit()
db.refresh(section_tithe)

# "Section Building Fund" — section level, fixed ₦2,000/month, active
section_building = RemittanceRule(
    name="Section Building Fund",
    from_level="local_church",
    to_level="section",
    fund_type=RemittanceFundType.building_fund,
    rule_type=RemittanceRuleType.fixed,
    percentage=None,
    minimum_amount=None,
    maximum_amount=None,
    fixed_amount=2000.0,
    frequency=RemittanceFrequency.monthly,
    is_active=True,
    effective_from=date(2024, 1, 1),
    effective_to=None,
    created_by_id=admin.id,
    scope_entity_type="section",
    scope_entity_id=first_section.id,
    requires_dual_auth=False,
    status=RemittanceRuleStatus.active,
    approved_by_id=admin.id,
    approved_at=datetime(2024, 1, 10),
)
db.add(section_building)
db.commit()
db.refresh(section_building)

# "Section Missions Offering" — section level, 20% of missions, quarterly, active
section_missions = RemittanceRule(
    name="Section Missions Offering",
    from_level="local_church",
    to_level="section",
    fund_type=RemittanceFundType.missions_fund,
    rule_type=RemittanceRuleType.percentage,
    percentage=20.0,
    minimum_amount=None,
    maximum_amount=None,
    fixed_amount=None,
    frequency=RemittanceFrequency.quarterly,
    is_active=True,
    effective_from=date(2024, 1, 1),
    effective_to=None,
    created_by_id=admin.id,
    scope_entity_type="section",
    scope_entity_id=first_section.id,
    requires_dual_auth=False,
    status=RemittanceRuleStatus.active,
    approved_by_id=admin.id,
    approved_at=datetime(2024, 1, 10),
)
db.add(section_missions)
db.commit()
db.refresh(section_missions)

# Add audit log entries for each rule
audit_entries = [
    RemittanceRuleAuditLog(
        rule_id=national_floor.id, action="created", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 1, 9, 0),
        new_values=json.dumps({"name": national_floor.name, "status": "draft"}),
        note="Initial creation of national tithe floor"
    ),
    RemittanceRuleAuditLog(
        rule_id=national_floor.id, action="approved", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 5, 10, 0),
        new_values=json.dumps({"status": "active"}),
        note="Approved by GC Admin"
    ),
    RemittanceRuleAuditLog(
        rule_id=national_floor.id, action="activated", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 5, 10, 0),
        note="Activated after single approval"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_tithe.id, action="created", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 8, 9, 0),
        new_values=json.dumps({"name": section_tithe.name, "status": "draft"}),
        note="Section tithe rule created"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_tithe.id, action="approved", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 10, 11, 0),
        new_values=json.dumps({"approved_by_id": admin.id}),
        note="First approval given"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_tithe.id, action="approved", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 12, 14, 0),
        new_values=json.dumps({"second_approver_id": admin.id, "status": "active"}),
        note="Second approval given — dual auth complete"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_tithe.id, action="activated", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 12, 14, 0),
        note="Activated after dual approval"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_building.id, action="created", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 8, 9, 30),
        new_values=json.dumps({"name": section_building.name, "status": "draft"}),
        note="Building fund rule created"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_building.id, action="approved", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 10, 11, 30),
        new_values=json.dumps({"status": "active"}),
        note="Approved"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_missions.id, action="created", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 8, 10, 0),
        new_values=json.dumps({"name": section_missions.name, "status": "draft"}),
        note="Missions offering rule created"
    ),
    RemittanceRuleAuditLog(
        rule_id=section_missions.id, action="approved", changed_by_id=admin.id,
        changed_at=datetime(2024, 1, 10, 12, 0),
        new_values=json.dumps({"status": "active"}),
        note="Approved"
    ),
]
for entry in audit_entries:
    db.add(entry)
db.commit()

db.close()

print(f"Seed complete!")
print(f"  General Councils: 1")
print(f"  Districts: {len(districts)}")
print(f"  Sections: {len(sections)}")
print(f"  Churches: {len(churches)}")
print(f"  Transactions: {receipt_counter - 1}")
print(f"\nDefault credentials:")
print(f"  Admin: admin / admin123")
print(f"  District Admin: d_admin_1 / admin123")
print(f"  Section Admin: s_admin_1 / admin123")
print(f"  Church Admin: church_admin_1 / admin123")
