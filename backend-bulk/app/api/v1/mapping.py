"""
API Endpoints for Excel Mapping feature

IMPROVED FOR BNI POC:
- Better field summary for debugging
- Enhanced export with match statistics
- Field search capability
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from io import BytesIO

from app.core.database import get_db
from app.services.excel_service import ExcelService
from app.services.template_mapping_service import TemplateMappingService
from app.models.mapping_schemas import (
    UploadTemplateResponse,
    SuggestMappingRequest,
    SuggestMappingResponse,
    ExportRequest,
    ExportPreviewRequest,
    ExportPreviewResponse,
    ExportPreviewRow,
    MappingTemplateCreate,
    MappingTemplateUpdate,
    MappingTemplateResponse,
    MappingTemplateListResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["mapping"])


# ==================== Template Upload & Mapping ====================

@router.post("/bulk-jobs/{job_id}/upload-template", response_model=UploadTemplateResponse)
async def upload_excel_template(
    job_id: str,
    file: UploadFile = File(...),
    sheet_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload an Excel template file and parse its column headers
    
    - **job_id**: The bulk job ID
    - **file**: Excel file (.xlsx, .xls)
    - **sheet_name**: Optional - specific worksheet to parse (default: first sheet)
    
    Returns the column headers from the specified worksheet
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    if not ExcelService.validate_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload an Excel file (.xlsx, .xls)"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Parse template with optional sheet name
        result = ExcelService.parse_template(content, file.filename, sheet_name)
        
        if not result["columns"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No column headers found in the Excel file. Please ensure the first row contains headers."
            )
        
        return UploadTemplateResponse(
            columns=result["columns"],
            sheet_name=result["sheet_name"],
            row_count=result["row_count"],
            all_sheets=result.get("all_sheets", [result["sheet_name"]])
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Failed to parse template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse Excel template"
        )


@router.post("/bulk-jobs/{job_id}/get-worksheets")
async def get_worksheets(
    job_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of all worksheets in an Excel file
    
    - **job_id**: The bulk job ID
    - **file**: Excel file (.xlsx, .xls)
    
    Returns list of worksheets with column counts
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    if not ExcelService.validate_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload an Excel file (.xlsx, .xls)"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Get all worksheets
        worksheets = ExcelService.get_worksheets(content, file.filename)
        
        return {
            "filename": file.filename,
            "worksheets": worksheets
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"❌ Failed to get worksheets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read Excel file"
        )


@router.post("/bulk-jobs/{job_id}/suggest-mapping", response_model=SuggestMappingResponse)
async def suggest_mapping(
    job_id: str,
    request: SuggestMappingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI-suggested mappings between Excel columns and extracted fields
    
    - **job_id**: The bulk job ID
    - **excel_columns**: List of column headers from the Excel template
    - **template_id**: Optional - use an existing template
    
    Returns suggested mappings with confidence scores
    """
    try:
        mapping_service = TemplateMappingService(db)
        
        # Use new template-based mapping
        if request.template_id:
            logger.info(f"🎯 Using template {request.template_id} for mapping")
            result = await mapping_service.apply_template_mapping(
                job_id=job_id,
                template_id=request.template_id
            )
            
            # Get sample values for template mappings
            if result['mappings']:
                # Get all field names that need samples
                field_names = tuple([m['db_field_name'] for m in result['mappings']])
                
                # Batch fetch sample values using IN clause
                placeholders = ','.join([f':field_{i}' for i in range(len(field_names))])
                sample_query = text(f"""
                    SELECT DISTINCT ON (field_name) 
                        field_name,
                        field_value
                    FROM bulk_extracted_fields 
                    WHERE job_id = :job_id 
                    AND field_name IN ({placeholders})
                    AND field_value IS NOT NULL
                    AND field_value != ''
                    ORDER BY field_name, id
                """)
                
                # Build params
                params = {'job_id': job_id}
                for i, fn in enumerate(field_names):
                    params[f'field_{i}'] = fn
                
                sample_result = await db.execute(sample_query, params)
                
                # Build sample value lookup
                samples = {row[0]: row[1] for row in sample_result.fetchall()}
                
                logger.info(f"📊 Fetched {len(samples)} sample values for {len(field_names)} fields")
            else:
                samples = {}
            
            # Convert to response format with samples
            suggestions = []
            for mapping in result['mappings']:
                # PRIORITY: 1. mapping's sample_value (from default_value), 2. extracted_value, 3. DB sample
                db_sample = samples.get(mapping['db_field_name'], '')
                mapping_sample = mapping.get('sample_value', '')
                extracted_value = mapping.get('extracted_value', '')
                
                # Use mapping's sample_value first (set during apply_template_mapping)
                # Then fall back to extracted_value or DB sample
                final_sample = mapping_sample or extracted_value or db_sample
                
                suggestions.append({
                    'excel_column': mapping['excel_column'],
                    'suggested_field': mapping['db_field_name'],
                    'confidence': mapping['confidence'],
                    'sample_value': str(final_sample)[:200] if final_sample else '',
                    'extracted_value': extracted_value,  # NEW: Direct value from AI
                    'alternative_fields': []
                })
            
            # FIXED: Fetch available fields from database so users can change mappings
            available_fields_query = text("""
                SELECT DISTINCT field_name
                FROM bulk_extracted_fields
                WHERE job_id = :job_id
                ORDER BY field_name
                LIMIT 500
            """)
            available_result = await db.execute(available_fields_query, {'job_id': job_id})
            all_field_names = [row[0] for row in available_result.fetchall()]
            
            available_fields_list = []
            for field_name in all_field_names:
                sample_val = samples.get(field_name, '')
                available_fields_list.append({
                    'field_name': field_name,
                    'field_label': field_name,
                    'field_type': 'text',
                    'sample_value': sample_val[:100] if sample_val else None
                })
            
            logger.info(f"📊 Returning {len(available_fields_list)} available fields for template mapping")
            
            return SuggestMappingResponse(
                mappings=suggestions,
                available_fields=available_fields_list,
                existing_template=request.template_id
            )
        else:
            # No template - use AI to suggest mappings
            logger.info(f"🤖 No template provided, using AI mapping for {len(request.excel_columns)} columns")
            result = await mapping_service.ai_suggest_mappings(
                job_id=job_id,
                excel_columns=request.excel_columns
            )
            
            # Fetch sample values for AI-suggested fields
            field_names = [m['suggested_field'] for m in result['mappings'] if m.get('suggested_field')]
            samples = {}
            
            if field_names:
                # Build dynamic IN clause
                placeholders = ', '.join([f':field_{i}' for i in range(len(field_names))])
                
                sample_query = text(f"""
                    SELECT DISTINCT ON (field_name) 
                        field_name,
                        field_value
                    FROM bulk_extracted_fields 
                    WHERE job_id = :job_id 
                    AND field_name IN ({placeholders})
                    AND field_value IS NOT NULL
                    AND field_value != ''
                    ORDER BY field_name, id
                """)
                
                # Build params
                params = {'job_id': job_id}
                for i, fn in enumerate(field_names):
                    params[f'field_{i}'] = fn
                
                sample_result = await db.execute(sample_query, params)
                samples = {row[0]: row[1] for row in sample_result.fetchall()}
                
                logger.info(f"📊 Fetched {len(samples)} sample values for AI suggestions")
                logger.info(f"🔍 SAMPLE QUERY field names (first 5): {field_names[:5]}")
                logger.info(f"✅ SAMPLE QUERY returned fields: {list(samples.keys())[:5]}")
            
            # Convert AI results to response format with samples
            suggestions = []
            for mapping in result['mappings']:
                sample_value = samples.get(mapping['suggested_field'], '')
                
                suggestions.append({
                    'excel_column': mapping['excel_column'],
                    'suggested_field': mapping['suggested_field'],
                    'confidence': mapping['confidence'],
                    'sample_value': sample_value[:100] if sample_value else '',
                    'alternative_fields': mapping.get('alternative_fields', [])
                })
            
            logger.info(f"📤 Sending {len(suggestions)} suggestions to frontend")
            if suggestions:
                logger.info(f"🔍 First 3 mappings: {[(s['excel_column'], s['suggested_field'], bool(s['sample_value'])) for s in suggestions[:3]]}")
            
            # Convert available_fields from list of strings to list of AvailableField objects
            available_fields_list = []
            for field_name in result.get('available_fields', [])[:100]:  # Limit to 100
                sample_val = samples.get(field_name, '') if samples else ''
                available_fields_list.append({
                    'field_name': field_name,
                    'field_label': field_name,
                    'field_type': 'text',
                    'sample_value': sample_val[:100] if sample_val else None
                })
            
            return SuggestMappingResponse(
                mappings=suggestions,
                available_fields=available_fields_list
            )
        
    except Exception as e:
        logger.error(f"❌ Failed to suggest mappings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate mapping suggestions: {str(e)}"
        )


@router.post("/bulk-jobs/{job_id}/export-preview", response_model=ExportPreviewResponse)
async def preview_export(
    job_id: str,
    request: ExportPreviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Preview the export data before downloading
    
    - **job_id**: The bulk job ID
    - **mappings**: Dict of {excel_column: field_name}
    - **limit**: Number of rows to preview (default: 5)
    """
    try:
        mapping_service = TemplateMappingService(db)
        
        # SAFETY CHECK: Handle None mappings
        if not request.mappings:
            logger.error(f"❌ No mappings provided in request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No mappings provided"
            )
        
        logger.info(f"📤 Preview export with {len(request.mappings)} mappings, template={request.template_id}")
        
        # Convert mappings to list format
        mappings_list = [
            {'excel_column': excel_col, 'db_field_name': field_name if field_name else ''}
            for excel_col, field_name in request.mappings.items()
        ]
        
        # Get export data with post-processing
        rows = await mapping_service.export_mapped_data(
            job_id=job_id,
            mappings=mappings_list,
            document_ids=None,
            template_id=request.template_id
        )
        
        # Limit rows for preview
        preview_rows = rows[:request.limit]
        
        # Format response
        columns = list(request.mappings.keys())
        preview_data = []
        
        for row in preview_rows:
            preview_data.append(ExportPreviewRow(
                document_id=row.get("_document_id", ""),
                document_name=row.get("_document_name", ""),
                values={col: row.get(col, "") for col in columns}
            ))
        
        return ExportPreviewResponse(
            columns=columns,
            rows=preview_data,
            total_documents=len(rows)
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to preview export: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.post("/bulk-jobs/{job_id}/export")
async def export_data(
    job_id: str,
    request: ExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Export data with the specified mappings
    
    - **job_id**: The bulk job ID
    - **mappings**: Dict of {excel_column: field_name}
    - **format**: 'xlsx' or 'csv'
    - **save_template**: Whether to save this mapping as a template
    - **template_name**: Name for the template (required if save_template is True)
    - **expand_arrays**: If True, expand array fields into multiple rows
    - **array_field_pattern**: Pattern to identify arrays to expand
    """
    try:
        # Log the incoming mappings to debug field name issues
        logger.info(f"📥 Export request for job {job_id}")
        
        # SAFETY CHECK: Handle None mappings
        if not request.mappings:
            logger.error(f"❌ No mappings provided in export request")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No mappings provided"
            )
        
        logger.info(f"📋 Mappings received ({len(request.mappings)} total)")
        
        mapping_service = TemplateMappingService(db)
        
        # Convert mappings to list format - handle None field names
        mappings_list = [
            {'excel_column': excel_col, 'db_field_name': field_name if field_name else ''}
            for excel_col, field_name in request.mappings.items()
        ]
        
        # Get export data with post-processing
        rows = await mapping_service.export_mapped_data(
            job_id=job_id,
            mappings=mappings_list,
            document_ids=request.document_ids,
            template_id=request.template_id
        )
        
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data found to export"
            )
        
        # Get columns in order
        columns = list(request.mappings.keys())
        
        # Debug log the data being exported
        logger.info(f"📊 Exporting {len(rows)} rows with {len(columns)} columns")
        if rows:
            first_row = rows[0]
            non_empty = sum(1 for k, v in first_row.items() if k in columns and v)
            logger.info(f"📋 First row: {non_empty}/{len(columns)} columns have values")
        
        # Generate file
        if request.format == "csv":
            file_content = ExcelService.generate_csv(columns, rows)
            media_type = "text/csv"
            filename = f"export_{job_id[:8]}.csv"
        else:
            file_content = ExcelService.generate_excel(columns, rows)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"export_{job_id[:8]}.xlsx"
        
        # Save template if requested
        if request.save_template and request.template_name:
            await mapping_service.save_template(
                user_id=None,  # TODO: Get from auth
                name=request.template_name,
                description=request.template_description,
                excel_columns=columns,
                field_mappings=request.mappings
            )
        
        # Return file
        return StreamingResponse(
            BytesIO(file_content),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to export: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )


# ==================== Template Management ====================

@router.get("/mapping-templates", response_model=MappingTemplateListResponse)
async def list_templates(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """List all saved mapping templates"""
    try:
        mapping_service = TemplateMappingService(db)
        templates_list = await mapping_service.list_templates()
        total = len(templates_list)
        templates_list = templates_list[skip:skip+limit]
        
        return MappingTemplateListResponse(
            templates=[
                MappingTemplateResponse(
                    id=t.get('template_id'),
                    user_id=None,
                    name=t.get('name'),
                    description=t.get('description'),
                    document_type=t.get('document_type'),
                    excel_columns=[],  # Columns stored separately
                    field_mappings={},  # Will load on detail
                    sample_file_name=None,
                    created_at=t.get('created_at'),
                    updated_at=t.get('updated_at'),
                    usage_count=0,
                    column_count=t.get('column_count', 0)
                )
                for t in templates_list
            ],
            total=total
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to list templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list templates"
        )


@router.post("/mapping-templates", response_model=MappingTemplateResponse)
async def create_template(
    request: MappingTemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new mapping template with column definitions"""
    try:
        mapping_service = TemplateMappingService(db)
        
        # Create template
        template_id = await mapping_service.create_template(
            name=request.name,
            description=request.description,
            document_type=request.document_type,
            columns=request.columns
        )
        
        # Fetch created template details
        template_details = await mapping_service.get_template_details(template_id)
        
        return MappingTemplateResponse(
            id=template_id,
            user_id=None,
            name=template_details.get('name'),
            description=template_details.get('description'),
            document_type=template_details.get('document_type'),
            excel_columns=template.excel_columns,
            field_mappings=template.field_mappings,
            sample_file_name=template.sample_file_name,
            created_at=template.created_at,
            updated_at=template.updated_at,
            usage_count=template.usage_count
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to create template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template"
        )


@router.get("/mapping-templates/{template_id}", response_model=MappingTemplateResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific mapping template"""
    try:
        mapping_service = TemplateMappingService(db)
        template_details = await mapping_service.get_template_details(template_id)
        
        if not template_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Build field mappings from columns
        field_mappings = {}
        excel_columns = []
        for col in template_details.get('columns', []):
            excel_col = col.get('excel_column')
            excel_columns.append(excel_col)
            # For now, field mappings will be determined at runtime
            field_mappings[excel_col] = col.get('source_field', '')
        
        return MappingTemplateResponse(
            id=template_details.get('template_id'),
            user_id=None,
            name=template_details.get('name'),
            description=template_details.get('description'),
            document_type=template_details.get('document_type'),
            excel_columns=excel_columns,
            field_mappings=field_mappings,
            sample_file_name=None,
            created_at=template_details.get('created_at'),
            updated_at=template_details.get('updated_at'),
            usage_count=0,
            columns=template_details.get('columns', [])  # Include full column details
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get template"
        )


@router.put("/mapping-templates/{template_id}", response_model=MappingTemplateResponse)
async def update_template(
    template_id: str,
    request: MappingTemplateUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing mapping template"""
    try:
        mapping_service = TemplateMappingService(db)
        
        # Update template
        success = await mapping_service.update_template(
            template_id=template_id,
            name=request.name,
            description=request.description,
            document_type=request.document_type,
            columns=request.columns
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Return updated template
        template_details = await mapping_service.get_template_details(template_id)
        
        return MappingTemplateResponse(
            id=template_details.get('template_id'),
            user_id=None,
            name=template_details.get('name'),
            description=template_details.get('description'),
            document_type=template_details.get('document_type'),
            excel_columns=[c.get('excel_column') for c in template_details.get('columns', [])],
            field_mappings={},
            sample_file_name=None,
            created_at=template_details.get('created_at'),
            updated_at=template_details.get('updated_at'),
            usage_count=0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update template"
        )


@router.delete("/mapping-templates/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a mapping template"""
    try:
        mapping_service = TemplateMappingService(db)
        success = await mapping_service.delete_template(template_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        return {"success": True, "message": "Template deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )


# ==================== Field Discovery & Debug ====================

@router.get("/bulk-jobs/{job_id}/field-summary")
async def get_field_summary(
    job_id: str,
    search: Optional[str] = Query(None, description="Search term to filter fields"),
    group_by: Optional[str] = Query("section", description="Group fields by: section, type, or none"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a summary of all extracted fields for a job.
    Useful for understanding what data is available for mapping.
    
    - **job_id**: The bulk job ID
    - **search**: Optional search term to filter field names
    - **group_by**: How to group fields (section, type, none)
    """
    try:
        import re
        from sqlalchemy import select, func, text
        from app.models.database import BulkExtractedField, BulkJobDocument
        from uuid import UUID
        
        job_uuid = UUID(job_id)
        
        # Get document count
        doc_query = select(func.count()).select_from(BulkJobDocument).where(
            BulkJobDocument.job_id == job_uuid
        )
        doc_result = await db.execute(doc_query)
        doc_count = doc_result.scalar() or 0
        
        # Get field statistics
        stats_query = select(
            func.count(BulkExtractedField.id).label('total_fields'),
            func.count(func.nullif(BulkExtractedField.field_value, '')).label('fields_with_values')
        ).where(
            BulkExtractedField.job_id == job_uuid
        )
        stats_result = await db.execute(stats_query)
        stats = stats_result.one()
        
        # Get unique fields with samples
        fields_query = select(
            BulkExtractedField.field_name,
            BulkExtractedField.field_value,
            func.count(BulkExtractedField.id).label('occurrence_count')
        ).where(
            BulkExtractedField.job_id == job_uuid
        )
        
        if search:
            fields_query = fields_query.where(
                BulkExtractedField.field_name.ilike(f"%{search}%")
            )
        
        fields_query = fields_query.group_by(
            BulkExtractedField.field_name,
            BulkExtractedField.field_value
        ).order_by(BulkExtractedField.field_name)
        
        fields_result = await db.execute(fields_query)
        all_fields = fields_result.all()
        
        # Deduplicate and organize
        unique_fields = {}
        for row in all_fields:
            name = row.field_name
            if name not in unique_fields:
                sample = row.field_value[:100] if row.field_value else ""
                unique_fields[name] = {
                    "field_name": name,
                    "sample_value": sample,
                    "has_value": bool(row.field_value and row.field_value.strip()),
                    "occurrence_count": row.occurrence_count
                }
            else:
                unique_fields[name]["occurrence_count"] += row.occurrence_count
                # Keep sample with value
                if row.field_value and not unique_fields[name]["has_value"]:
                    unique_fields[name]["sample_value"] = row.field_value[:100]
                    unique_fields[name]["has_value"] = True
        
        # Group fields
        grouped_fields = {}
        if group_by == "section":
            for name, field_data in unique_fields.items():
                # Extract section from field name
                match = re.match(r'^(\d+_\d+_)?([a-zA-Z_]+)', name)
                section = match.group(2) if match else "other"
                
                if section not in grouped_fields:
                    grouped_fields[section] = []
                grouped_fields[section].append(field_data)
        elif group_by == "type":
            for name, field_data in unique_fields.items():
                # Determine type from field name pattern
                if "[" in name:
                    field_type = "array"
                elif "table" in name.lower():
                    field_type = "table"
                else:
                    field_type = "simple"
                
                if field_type not in grouped_fields:
                    grouped_fields[field_type] = []
                grouped_fields[field_type].append(field_data)
        else:
            grouped_fields["all"] = list(unique_fields.values())
        
        return {
            "job_id": job_id,
            "document_count": doc_count,
            "total_fields": stats.total_fields,
            "fields_with_values": stats.fields_with_values,
            "unique_field_count": len(unique_fields),
            "groups": grouped_fields
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get field summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get field summary: {str(e)}"
        )


@router.get("/bulk-jobs/{job_id}/search-fields")
async def search_fields(
    job_id: str,
    query: str = Query(..., description="Search query for field names or values"),
    search_values: bool = Query(False, description="Also search in field values"),
    limit: int = Query(50, description="Maximum results to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for fields by name or value.
    Useful for finding specific data in extracted fields.
    
    - **job_id**: The bulk job ID
    - **query**: Search term
    - **search_values**: If True, also search in field values
    - **limit**: Maximum number of results
    """
    try:
        from sqlalchemy import select, or_
        from app.models.database import BulkExtractedField, BulkJobDocument
        from uuid import UUID
        
        job_uuid = UUID(job_id)
        
        # Build search query
        search_query = select(
            BulkExtractedField.field_name,
            BulkExtractedField.field_value,
            BulkJobDocument.filename
        ).join(
            BulkJobDocument,
            BulkExtractedField.document_id == BulkJobDocument.id
        ).where(
            BulkExtractedField.job_id == job_uuid
        )
        
        if search_values:
            search_query = search_query.where(
                or_(
                    BulkExtractedField.field_name.ilike(f"%{query}%"),
                    BulkExtractedField.field_value.ilike(f"%{query}%")
                )
            )
        else:
            search_query = search_query.where(
                BulkExtractedField.field_name.ilike(f"%{query}%")
            )
        
        search_query = search_query.limit(limit)
        
        result = await db.execute(search_query)
        matches = result.all()
        
        return {
            "job_id": job_id,
            "query": query,
            "search_values": search_values,
            "result_count": len(matches),
            "results": [
                {
                    "field_name": m.field_name,
                    "field_value": m.field_value[:200] if m.field_value else "",
                    "document": m.filename
                }
                for m in matches
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to search fields: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search fields: {str(e)}"
        )
