"""
Export API endpoints for CSV and Excel generation
"""

import logging
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse

from ...services.export_service import get_export_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/bulk-jobs/{job_id}/export/csv")
async def export_job_to_csv(job_id: str):
    """
    Export all fields from a job to CSV format (flat)
    
    Returns CSV file with one row per field:
    - document_name, field_name, field_value, confidence, page, etc.
    """
    try:
        export_service = await get_export_service()
        csv_bytes = await export_service.generate_csv_export(job_id)
        
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=job_{job_id}_export.csv"
            }
        )
    except Exception as e:
        logger.error(f"❌ CSV export failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/bulk-jobs/{job_id}/export/excel")
async def export_job_to_excel(
    job_id: str,
    format: str = "pivoted"  # "summary", "pivoted", or "detailed"
):
    """
    Export all fields from a job to Excel format
    
    Formats:
    - summary: One row per document with statistics
    - pivoted: Fields as columns, documents as rows (like BNI format)
    - detailed: All fields listed with full metadata
    
    Query params:
    - format: Export format (default: pivoted)
    """
    try:
        export_service = await get_export_service()
        
        if format == "summary":
            excel_bytes = await export_service.generate_excel_summary(job_id)
            filename = f"job_{job_id}_summary.xlsx"
        elif format == "pivoted":
            excel_bytes = await export_service.generate_excel_pivoted(job_id)
            filename = f"job_{job_id}_pivoted.xlsx"
        else:
            raise HTTPException(status_code=400, detail=f"Invalid format: {format}")
        
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Excel export failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.get("/bulk-jobs/{job_id}/export/preview")
async def preview_export_data(job_id: str, limit: int = 10):
    """
    Preview export data without downloading
    Useful for checking data before full export
    
    Query params:
    - limit: Number of documents to preview (default: 10)
    """
    try:
        export_service = await get_export_service()
        documents = await export_service.query_job_fields(job_id)
        
        # Limit preview
        preview_docs = documents[:limit]
        
        return {
            "job_id": job_id,
            "total_documents": len(documents),
            "preview_count": len(preview_docs),
            "documents": preview_docs
        }
    except Exception as e:
        logger.error(f"❌ Preview failed for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
