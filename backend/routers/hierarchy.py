from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth as auth_utils

router = APIRouter(prefix="/api/hierarchy", tags=["Hierarchy"])


# General Council
@router.get("/general-councils", response_model=List[schemas.GeneralCouncilResponse])
def list_general_councils(db: Session = Depends(get_db), current_user=Depends(auth_utils.get_current_active_user)):
    return db.query(models.GeneralCouncil).all()


@router.post("/general-councils", response_model=schemas.GeneralCouncilResponse)
def create_general_council(
    data: schemas.GeneralCouncilCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role != "general_council_admin":
        raise HTTPException(status_code=403, detail="Only General Council Admin can create councils")
    gc = models.GeneralCouncil(**data.model_dump())
    db.add(gc)
    db.commit()
    db.refresh(gc)
    return gc


@router.put("/general-councils/{gc_id}", response_model=schemas.GeneralCouncilResponse)
def update_general_council(
    gc_id: int,
    data: schemas.GeneralCouncilCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    gc = db.query(models.GeneralCouncil).filter(models.GeneralCouncil.id == gc_id).first()
    if not gc:
        raise HTTPException(status_code=404, detail="General Council not found")
    for k, v in data.model_dump().items():
        setattr(gc, k, v)
    db.commit()
    db.refresh(gc)
    return gc


@router.delete("/general-councils/{gc_id}")
def delete_general_council(
    gc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    gc = db.query(models.GeneralCouncil).filter(models.GeneralCouncil.id == gc_id).first()
    if not gc:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(gc)
    db.commit()
    return {"message": "Deleted"}


# Districts
@router.get("/districts", response_model=List[schemas.DistrictResponse])
def list_districts(gc_id: int = None, db: Session = Depends(get_db), current_user=Depends(auth_utils.get_current_active_user)):
    q = db.query(models.District)
    if gc_id:
        q = q.filter(models.District.general_council_id == gc_id)
    return q.all()


@router.post("/districts", response_model=schemas.DistrictResponse)
def create_district(
    data: schemas.DistrictCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    district = models.District(**data.model_dump())
    db.add(district)
    db.commit()
    db.refresh(district)
    return district


@router.put("/districts/{district_id}", response_model=schemas.DistrictResponse)
def update_district(
    district_id: int,
    data: schemas.DistrictCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    district = db.query(models.District).filter(models.District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    for k, v in data.model_dump().items():
        setattr(district, k, v)
    db.commit()
    db.refresh(district)
    return district


@router.delete("/districts/{district_id}")
def delete_district(
    district_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    district = db.query(models.District).filter(models.District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(district)
    db.commit()
    return {"message": "Deleted"}


# Sections
@router.get("/sections", response_model=List[schemas.SectionResponse])
def list_sections(district_id: int = None, db: Session = Depends(get_db), current_user=Depends(auth_utils.get_current_active_user)):
    q = db.query(models.Section)
    if district_id:
        q = q.filter(models.Section.district_id == district_id)
    return q.all()


@router.post("/sections", response_model=schemas.SectionResponse)
def create_section(
    data: schemas.SectionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin", "section_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    section = models.Section(**data.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/sections/{section_id}", response_model=schemas.SectionResponse)
def update_section(
    section_id: int,
    data: schemas.SectionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    section = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    for k, v in data.model_dump().items():
        setattr(section, k, v)
    db.commit()
    db.refresh(section)
    return section


@router.delete("/sections/{section_id}")
def delete_section(
    section_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    section = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(section)
    db.commit()
    return {"message": "Deleted"}


# Local Churches
@router.get("/churches", response_model=List[schemas.LocalChurchResponse])
def list_churches(section_id: int = None, db: Session = Depends(get_db), current_user=Depends(auth_utils.get_current_active_user)):
    q = db.query(models.LocalChurch)
    if section_id:
        q = q.filter(models.LocalChurch.section_id == section_id)
    return q.all()


@router.post("/churches", response_model=schemas.LocalChurchResponse)
def create_church(
    data: schemas.LocalChurchCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    if current_user.role not in ["general_council_admin", "district_admin", "section_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    church = models.LocalChurch(**data.model_dump())
    db.add(church)
    db.commit()
    db.refresh(church)
    return church


@router.put("/churches/{church_id}", response_model=schemas.LocalChurchResponse)
def update_church(
    church_id: int,
    data: schemas.LocalChurchUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    church = db.query(models.LocalChurch).filter(models.LocalChurch.id == church_id).first()
    if not church:
        raise HTTPException(status_code=404, detail="Church not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(church, k, v)
    db.commit()
    db.refresh(church)
    return church


@router.delete("/churches/{church_id}")
def delete_church(
    church_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(auth_utils.get_current_active_user)
):
    church = db.query(models.LocalChurch).filter(models.LocalChurch.id == church_id).first()
    if not church:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(church)
    db.commit()
    return {"message": "Deleted"}


# Full hierarchy tree
@router.get("/tree")
def get_hierarchy_tree(db: Session = Depends(get_db), current_user=Depends(auth_utils.get_current_active_user)):
    councils = db.query(models.GeneralCouncil).all()
    tree = []
    for gc in councils:
        gc_node = {
            "id": gc.id,
            "name": gc.name,
            "type": "general_council",
            "country": gc.country,
            "children": []
        }
        districts = db.query(models.District).filter(models.District.general_council_id == gc.id).all()
        for d in districts:
            d_node = {
                "id": d.id,
                "name": d.name,
                "type": "district",
                "children": []
            }
            sections = db.query(models.Section).filter(models.Section.district_id == d.id).all()
            for s in sections:
                s_node = {
                    "id": s.id,
                    "name": s.name,
                    "type": "section",
                    "children": []
                }
                churches = db.query(models.LocalChurch).filter(models.LocalChurch.section_id == s.id).all()
                for c in churches:
                    s_node["children"].append({
                        "id": c.id,
                        "name": c.name,
                        "type": "local_church",
                        "pastor_name": c.pastor_name,
                        "member_count": c.member_count,
                        "children": []
                    })
                d_node["children"].append(s_node)
            gc_node["children"].append(d_node)
        tree.append(gc_node)
    return tree
