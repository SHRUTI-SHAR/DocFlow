"""
Pydantic schemas for Excel Mapping feature
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import UUID


# ==================== Request Schemas ====================

class UploadTemplateResponse(BaseModel):
    """Response after uploading Excel template"""
    columns: List[str] = Field(..., description="List of column headers from Excel")
    sheet_name: str = Field(..., description="Name of the sheet parsed")
    row_count: int = Field(0, description="Number of data rows (excluding header)")
    all_sheets: List[str] = Field(default_factory=list, description="All worksheet names in the file")
    
    class Config:
        json_schema_extra = {
            "example": {
                "columns": ["Company Name", "Registration Number", "Date", "Address"],
                "sheet_name": "Sheet1",
                "row_count": 0,
                "all_sheets": ["Sheet1", "Sheet2", "Data"]
            }
        }


class SuggestMappingRequest(BaseModel):
    """Request to suggest mappings"""
    excel_columns: List[str] = Field(..., description="Column headers from Excel")
    template_id: Optional[str] = Field(None, description="Use existing template if provided")
    
    class Config:
        json_schema_extra = {
            "example": {
                "excel_columns": ["Company Name", "Reg No", "Date"],
                "template_id": None
            }
        }


class MappingSuggestion(BaseModel):
    """Single mapping suggestion"""
    excel_column: str = Field(..., description="Excel column header")
    suggested_field: Optional[str] = Field(None, description="Suggested field name to map")
    confidence: float = Field(0.0, description="Confidence score (0-1)")
    sample_value: Optional[str] = Field(None, description="Sample value from the field")
    alternative_fields: List[str] = Field(default_factory=list, description="Other possible field matches")


class AvailableField(BaseModel):
    """Available field for mapping"""
    field_name: str
    field_label: Optional[str] = None
    field_type: str = "text"
    field_group: Optional[str] = None
    sample_value: Optional[str] = None
    occurrence_count: int = 1  # How many documents have this field


class SuggestMappingResponse(BaseModel):
    """Response with AI-suggested mappings"""
    mappings: List[MappingSuggestion] = Field(..., description="Suggested mappings")
    available_fields: List[AvailableField] = Field(..., description="All available fields")
    existing_template: Optional[str] = Field(None, description="Matched existing template ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mappings": [
                    {
                        "excel_column": "Company Name",
                        "suggested_field": "tinjauan_usaha_paragraphs_0",
                        "confidence": 0.85,
                        "sample_value": "PT Bumiwarna Agungperkasa",
                        "alternative_fields": ["document_metadata_tipe_pak"]
                    }
                ],
                "available_fields": [
                    {
                        "field_name": "document_metadata_nomor_pak",
                        "field_label": "Document Metadata Nomor Pak",
                        "field_type": "text",
                        "sample_value": "CMB2/6/015/PAK"
                    }
                ]
            }
        }


class ExportRequest(BaseModel):
    """Request to export data with mappings"""
    mappings: Dict[str, Optional[str]] = Field(..., description="Excel column to field name mapping")
    format: str = Field("xlsx", description="Export format: 'xlsx' or 'csv'")
    save_template: bool = Field(False, description="Save this mapping as a template")
    template_name: Optional[str] = Field(None, description="Name for the template if saving")
    template_description: Optional[str] = Field(None, description="Description for the template")
    document_ids: Optional[List[str]] = Field(None, description="Specific document IDs to export (None = all)")
    expand_arrays: bool = Field(False, description="Expand array fields into multiple rows")
    array_field_pattern: Optional[str] = Field(None, description="Pattern to identify arrays to expand (e.g., 'fasilitas_kredit.table')")
    template_id: Optional[str] = Field(None, description="Template ID for post-processing")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mappings": {
                    "Company Name": "tinjauan_usaha_paragraphs_0",
                    "Reg No": "document_metadata_nomor_pak",
                    "Date": "document_metadata_tanggal"
                },
                "format": "xlsx",
                "save_template": True,
                "template_name": "PAK Document Mapping",
                "expand_arrays": False
            }
        }


class ExportPreviewRequest(BaseModel):
    """Request to preview export data"""
    mappings: Dict[str, Optional[str]] = Field(..., description="Excel column to field name mapping")
    limit: int = Field(5, description="Number of rows to preview")
    expand_arrays: bool = Field(False, description="Expand array fields into multiple rows")
    array_field_pattern: Optional[str] = Field(None, description="Pattern to identify arrays to expand")
    template_id: Optional[str] = Field(None, description="Template ID for post-processing")


class ExportPreviewRow(BaseModel):
    """Single row in export preview"""
    document_id: str
    document_name: str
    values: Dict[str, Optional[str]]  # Excel column -> value


class ExportPreviewResponse(BaseModel):
    """Response with export preview"""
    columns: List[str]
    rows: List[ExportPreviewRow]
    total_documents: int


# ==================== Template Schemas ====================

class MappingTemplateCreate(BaseModel):
    """Create a new mapping template"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    document_type: Optional[str] = None
    columns: List[Dict[str, Any]] = Field(default_factory=list)


class MappingTemplateUpdate(BaseModel):
    """Update an existing mapping template"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    document_type: Optional[str] = None
    columns: Optional[List[Dict[str, Any]]] = None


class MappingTemplateResponse(BaseModel):
    """Mapping template response"""
    id: str
    user_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    document_type: Optional[str] = None
    excel_columns: List[str]
    field_mappings: Dict[str, Optional[str]]
    sample_file_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    column_count: Optional[int] = 0  # Number of columns in template
    columns: Optional[List[Dict]] = None  # Full column details for Template Management UI
    
    class Config:
        from_attributes = True


class MappingTemplateListResponse(BaseModel):
    """List of mapping templates"""
    templates: List[MappingTemplateResponse]
    total: int
