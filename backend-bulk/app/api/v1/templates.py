"""
NEW Template-Based Mapping API
Clean, simple endpoints for template management and mapping
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import UUID

from app.core.database import get_db
from app.services.template_mapping_service import TemplateMappingService

router = APIRouter(prefix="/templates", tags=["Templates"])


# ============== REQUEST/RESPONSE MODELS ==============

class TemplateColumnCreate(BaseModel):
    """Template column definition"""
    excel_column: str = Field(..., description="Excel column name (e.g., 'Company Name')")
    search_keywords: List[str] = Field(..., description="Keywords to search in transcript")
    extraction_hint: Optional[str] = Field(None, description="Hint for AI extraction")
    source_page: Optional[str] = Field(None, description="Expected page number")
    source_section: Optional[str] = Field(None, description="Expected section name")
    data_type: str = Field(default="text", description="text, number, date, currency, yes_no")
    post_process_type: Optional[str] = Field(None, description="date_format, currency_format, etc.")
    post_process_config: Optional[dict] = Field(None, description="Post-processing configuration")
    default_value: Optional[str] = Field(None, description="Default value if not found")
    example_value: Optional[str] = Field(None, description="Example value for reference")


class TemplateCreate(BaseModel):
    """Create new template"""
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    document_type: str = Field(..., description="Type of document (e.g., 'credit_proposal')")
    columns: List[TemplateColumnCreate] = Field(..., description="Template columns")


class TemplateResponse(BaseModel):
    """Template info"""
    template_id: str
    name: str
    description: Optional[str]
    document_type: str
    column_count: int
    created_at: str
    updated_at: str


class MappingResultColumn(BaseModel):
    """Single column mapping result"""
    excel_column: str
    db_field_name: str
    confidence: float
    source_location: str
    match_method: str


class MappingResult(BaseModel):
    """Template mapping result"""
    template_id: str
    template_name: str
    total_columns: int
    mapped_columns: int
    unmapped_columns: int
    success_rate: float
    mappings: List[MappingResultColumn]
    unmapped: List[str]
    warnings: List[str]


class ExportRow(BaseModel):
    """Single exported row"""
    data: dict = Field(..., description="Row data with Excel column names as keys")


# ============== ENDPOINTS ==============

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template: TemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new template for document mapping.
    
    Example:
    ```json
    {
        "name": "BNI Credit Proposal",
        "document_type": "credit_proposal",
        "description": "Template for BNI credit proposal documents",
        "columns": [
            {
                "excel_column": "Company Name",
                "search_keywords": ["nama debitur", "nama perusahaan", "company name"],
                "extraction_hint": "The main company/debtor name",
                "data_type": "text"
            },
            {
                "excel_column": "Credit Limit",
                "search_keywords": ["plafond", "limit", "credit limit"],
                "data_type": "currency",
                "post_process_type": "currency_format"
            }
        ]
    }
    ```
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        result = await mapping_service.create_template(
            name=template.name,
            description=template.description,
            document_type=template.document_type,
            columns=[col.dict() for col in template.columns]
        )
        
        return TemplateResponse(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    document_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List all templates, optionally filtered by document type.
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        templates = await mapping_service.list_templates(document_type=document_type)
        return [TemplateResponse(**t) for t in templates]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}"
        )


@router.get("/{template_id}", response_model=dict)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get full template details including all columns.
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        template = await mapping_service.get_template_details(template_id)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template {template_id} not found"
            )
        
        return template
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}"
        )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a template.
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        deleted = await mapping_service.delete_template(template_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template {template_id} not found"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}"
        )


@router.post("/apply/{job_id}", response_model=MappingResult)
async def apply_template_to_job(
    job_id: str,
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Apply a template to map extracted data from a job.
    
    This will:
    1. Load the template and its columns
    2. Search transcripts for each column's keywords
    3. Match Excel columns to database field names
    4. Return mapping results with confidence scores
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        result = await mapping_service.apply_template_mapping(
            job_id=job_id,
            template_id=template_id
        )
        
        return MappingResult(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply template: {str(e)}"
        )


@router.post("/export/{job_id}", response_model=List[dict])
async def export_with_template(
    job_id: str,
    template_id: str,
    document_ids: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Export data using template mapping.
    
    Flow:
    1. Apply template to get mappings
    2. Export data using those mappings
    3. Return rows with Excel column names
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        # Apply template to get mappings
        mapping_result = await mapping_service.apply_template_mapping(
            job_id=job_id,
            template_id=template_id
        )
        
        # Export data using mappings
        rows = await mapping_service.export_mapped_data(
            job_id=job_id,
            mappings=mapping_result['mappings'],
            document_ids=document_ids
        )
        
        return rows
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )


@router.post("/test/{template_id}")
async def test_template(
    template_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Test a template on a single job to see mapping results.
    Returns detailed diagnostics for debugging.
    """
    mapping_service = TemplateMappingService(db)
    
    try:
        result = await mapping_service.apply_template_mapping(
            job_id=job_id,
            template_id=template_id
        )
        
        return {
            "template_id": template_id,
            "job_id": job_id,
            "success_rate": result['success_rate'],
            "mapped_columns": result['mapped_columns'],
            "total_columns": result['total_columns'],
            "mappings": result['mappings'],
            "unmapped": result['unmapped'],
            "warnings": result['warnings']
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test template: {str(e)}"
        )
