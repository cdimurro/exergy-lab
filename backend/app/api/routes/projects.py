"""Project management API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4

router = APIRouter()


class ProjectCreate(BaseModel):
    """Create a new project."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    technology_type: str
    status: str = "draft"


class Project(BaseModel):
    """Project model."""

    id: str
    name: str
    description: Optional[str]
    technology_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    tea_results: Optional[dict] = None


# In-memory storage for MVP (will be replaced with PostgreSQL)
projects_db: dict = {}


@router.post("/", response_model=Project)
async def create_project(project: ProjectCreate):
    """Create a new TEA project."""
    project_id = str(uuid4())
    now = datetime.utcnow()

    new_project = Project(
        id=project_id,
        name=project.name,
        description=project.description,
        technology_type=project.technology_type,
        status=project.status,
        created_at=now,
        updated_at=now,
    )

    projects_db[project_id] = new_project
    return new_project


@router.get("/", response_model=List[Project])
async def list_projects(
    status: Optional[str] = None,
    technology_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all projects with optional filtering."""
    projects = list(projects_db.values())

    if status:
        projects = [p for p in projects if p.status == status]
    if technology_type:
        projects = [p for p in projects if p.technology_type == technology_type]

    return projects[offset : offset + limit]


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project by ID."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    return projects_db[project_id]


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, updates: dict):
    """Update a project."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects_db[project_id]
    project_dict = project.model_dump()

    for key, value in updates.items():
        if key in project_dict and key not in ["id", "created_at"]:
            project_dict[key] = value

    project_dict["updated_at"] = datetime.utcnow()
    projects_db[project_id] = Project(**project_dict)
    return projects_db[project_id]


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")

    del projects_db[project_id]
    return {"status": "deleted", "project_id": project_id}
