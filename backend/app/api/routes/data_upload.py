"""Data upload and processing API endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
import pandas as pd
import io
import os
from uuid import uuid4

from app.core.config import settings

router = APIRouter()


class UploadResult(BaseModel):
    """Result of file upload."""

    upload_id: str
    filename: str
    file_size: int
    rows: int
    columns: int
    column_names: list
    preview: list
    validation_status: str
    validation_messages: list


class DataValidationResult(BaseModel):
    """Data validation result."""

    is_valid: bool
    errors: list
    warnings: list
    suggestions: list


def validate_file_extension(filename: str) -> bool:
    """Check if file extension is allowed."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in settings.ALLOWED_EXTENSIONS


def detect_data_quality_issues(df: pd.DataFrame) -> DataValidationResult:
    """Analyze data for quality issues."""
    errors = []
    warnings = []
    suggestions = []

    # Check for empty dataframe
    if df.empty:
        errors.append("File contains no data")
        return DataValidationResult(
            is_valid=False, errors=errors, warnings=warnings, suggestions=suggestions
        )

    # Check for missing values
    missing = df.isnull().sum()
    for col, count in missing.items():
        if count > 0:
            pct = (count / len(df)) * 100
            if pct > 50:
                errors.append(f"Column '{col}' has {pct:.1f}% missing values")
            elif pct > 10:
                warnings.append(f"Column '{col}' has {pct:.1f}% missing values")

    # Check for numeric columns
    numeric_cols = df.select_dtypes(include=["number"]).columns
    if len(numeric_cols) == 0:
        warnings.append("No numeric columns detected - TEA calculations require numeric data")

    # Check for potential unit issues
    for col in numeric_cols:
        if df[col].max() > 1e9:
            suggestions.append(
                f"Column '{col}' has very large values - verify units are correct"
            )

    # Check for duplicate rows
    duplicates = df.duplicated().sum()
    if duplicates > 0:
        warnings.append(f"Found {duplicates} duplicate rows")

    is_valid = len(errors) == 0
    return DataValidationResult(
        is_valid=is_valid, errors=errors, warnings=warnings, suggestions=suggestions
    )


@router.post("/", response_model=UploadResult)
async def upload_data(
    file: UploadFile = File(...),
    project_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
):
    """
    Upload CSV or Excel file for TEA analysis.

    Supported formats: .csv, .xlsx, .xls
    Maximum file size: 50MB
    """
    # Validate file extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Check file size
    max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    # Parse file
    try:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    # Validate data quality
    validation = detect_data_quality_issues(df)

    # Generate upload ID
    upload_id = str(uuid4())

    # Create preview (first 10 rows)
    preview = df.head(10).to_dict(orient="records")

    # TODO: Save to storage and database

    validation_status = "valid" if validation.is_valid else "invalid"
    validation_messages = validation.errors + validation.warnings

    return UploadResult(
        upload_id=upload_id,
        filename=file.filename,
        file_size=file_size,
        rows=len(df),
        columns=len(df.columns),
        column_names=list(df.columns),
        preview=preview,
        validation_status=validation_status,
        validation_messages=validation_messages,
    )


@router.post("/{upload_id}/validate", response_model=DataValidationResult)
async def validate_upload(upload_id: str):
    """Run detailed validation on uploaded data."""
    # TODO: Retrieve from storage and run validation
    return DataValidationResult(
        is_valid=True,
        errors=[],
        warnings=["Validation not fully implemented yet"],
        suggestions=[],
    )


@router.get("/{upload_id}/preview")
async def get_upload_preview(upload_id: str, rows: int = 10):
    """Get preview of uploaded data."""
    # TODO: Retrieve from storage
    return {
        "upload_id": upload_id,
        "preview": [],
        "message": "Preview not implemented yet - data not persisted",
    }


@router.post("/{upload_id}/map-columns")
async def map_columns(upload_id: str, column_mapping: dict):
    """
    Map uploaded columns to TEA input fields.

    Example mapping:
    {
        "Cost_USD": "capex_per_kw",
        "Output_MW": "capacity_mw",
        "Efficiency_%": "capacity_factor"
    }
    """
    # TODO: Apply column mapping and validate
    return {
        "upload_id": upload_id,
        "mapping_applied": column_mapping,
        "status": "success",
    }
