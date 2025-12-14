"""
Processing Worker Tasks - Vision API Integration with Parallel Processing
Processes PDFs using Gemini Vision for OCR and structured data extraction
"""

from app.workers.celery_app import celery_app
from typing import Dict, Any, Optional, List, Tuple
from uuid import UUID
import logging
import time
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor, as_completed
import math

logger = logging.getLogger(__name__)


def insert_extracted_fields_batch(
    db,
    document_id: str,
    job_id: str,
    page_results: List[Dict[str, Any]],
    extraction_model: str,
    extraction_task: str
) -> int:
    """
    Insert extracted fields from multiple pages into bulk_extracted_fields table
    
    This function performs 100% GRANULAR extraction - every single piece of data
    is stored, including:
    - Nested objects (flattened with dot notation: "address.street")
    - Tables/arrays (each row becomes separate fields with index: "items[0].name")
    - All primitive values (strings, numbers, booleans, even empty strings and punctuation)
    
    Args:
        db: Database session
        document_id: Document UUID
        job_id: Job UUID
        page_results: List of page extraction results
        extraction_model: Model used for extraction
        extraction_task: Task type (e.g., 'without_template_extraction')
    
    Returns:
        Number of fields inserted
    """
    from app.models.database import BulkExtractedField
    import json
    
    def flatten_data(data: Any, prefix: str = "", group: str = None) -> List[Dict[str, Any]]:
        """
        Recursively flatten any data structure into individual fields
        
        Examples:
        - {"name": "John"} → [{"field_name": "name", "field_value": "John"}]
        - {"address": {"street": "123 Main"}} → [{"field_name": "address.street", "field_value": "123 Main"}]
        - {"items": [{"name": "A"}, {"name": "B"}]} → [
            {"field_name": "items[0].name", "field_value": "A"},
            {"field_name": "items[1].name", "field_value": "B"}
          ]
        """
        fields = []
        
        if data is None:
            # Store null values too
            if prefix:
                fields.append({
                    'field_name': prefix,
                    'field_label': prefix.replace('_', ' ').replace('.', ' > ').title(),
                    'field_type': 'null',
                    'field_value': None,
                    'field_group': group,
                    'confidence_score': None
                })
            return fields
        
        if isinstance(data, dict):
            # Check if this is a special typed field (e.g., {"_type": "table", "value": [...]})
            if '_type' in data:
                field_type = data.get('_type', 'text')
                field_value = data.get('value')
                
                # For tables, flatten the rows
                if field_type == 'table' and isinstance(field_value, list):
                    for idx, row in enumerate(field_value):
                        if isinstance(row, dict):
                            for col_name, col_value in row.items():
                                full_name = f"{prefix}[{idx}].{col_name}" if prefix else f"[{idx}].{col_name}"
                                fields.append({
                                    'field_name': full_name,
                                    'field_label': f"{prefix.replace('_', ' ').title()} Row {idx+1} - {col_name.replace('_', ' ').title()}" if prefix else f"Row {idx+1} - {col_name.replace('_', ' ').title()}",
                                    'field_type': 'table_cell',
                                    'field_value': str(col_value) if col_value is not None else None,
                                    'field_group': group or prefix or 'table',
                                    'confidence_score': None
                                })
                        else:
                            full_name = f"{prefix}[{idx}]" if prefix else f"[{idx}]"
                            fields.append({
                                'field_name': full_name,
                                'field_label': f"{prefix.replace('_', ' ').title()} Item {idx+1}" if prefix else f"Item {idx+1}",
                                'field_type': 'table_cell',
                                'field_value': str(row) if row is not None else None,
                                'field_group': group or prefix or 'table',
                                'confidence_score': None
                            })
                else:
                    # Regular typed field
                    fields.append({
                        'field_name': prefix if prefix else 'value',
                        'field_label': prefix.replace('_', ' ').replace('.', ' > ').title() if prefix else 'Value',
                        'field_type': field_type,
                        'field_value': str(field_value) if field_value is not None else None,
                        'field_group': group,
                        'confidence_score': None
                    })
                return fields
            
            # Regular dictionary - recurse into each key
            current_group = group
            for key, value in data.items():
                # Skip metadata keys
                if key.startswith('_'):
                    continue
                
                new_prefix = f"{prefix}.{key}" if prefix else key
                
                # Determine group: use top-level key as group if not yet set
                if group is None and not prefix:
                    current_group = key
                
                # Recurse
                fields.extend(flatten_data(value, new_prefix, current_group))
            
            return fields
        
        elif isinstance(data, list):
            # Array - could be table rows or simple list
            if len(data) == 0:
                # Store empty array as well
                fields.append({
                    'field_name': prefix if prefix else 'array',
                    'field_label': prefix.replace('_', ' ').replace('.', ' > ').title() if prefix else 'Array',
                    'field_type': 'array',
                    'field_value': '[]',
                    'field_group': group,
                    'confidence_score': None
                })
                return fields
            
            # Process each item in array
            for idx, item in enumerate(data):
                item_prefix = f"{prefix}[{idx}]" if prefix else f"[{idx}]"
                
                if isinstance(item, dict):
                    # Object in array - flatten it
                    for item_key, item_value in item.items():
                        if item_key.startswith('_'):
                            continue
                        full_name = f"{item_prefix}.{item_key}"
                        fields.extend(flatten_data(item_value, full_name, group or prefix))
                elif isinstance(item, list):
                    # Nested array
                    fields.extend(flatten_data(item, item_prefix, group or prefix))
                else:
                    # Primitive in array
                    fields.append({
                        'field_name': item_prefix,
                        'field_label': f"{prefix.replace('_', ' ').title()} Item {idx+1}" if prefix else f"Item {idx+1}",
                        'field_type': type(item).__name__ if item is not None else 'null',
                        'field_value': str(item) if item is not None else None,
                        'field_group': group or prefix,
                        'confidence_score': None
                    })
            
            return fields
        
        else:
            # Primitive value (string, number, boolean)
            # This captures EVERYTHING including punctuation, empty strings, etc.
            value_str = str(data) if data is not None else None
            
            # Determine field type
            if isinstance(data, bool):
                field_type = 'boolean'
            elif isinstance(data, int):
                field_type = 'integer'
            elif isinstance(data, float):
                field_type = 'number'
            elif isinstance(data, str):
                field_type = 'text'
            else:
                field_type = type(data).__name__
            
            fields.append({
                'field_name': prefix if prefix else 'value',
                'field_label': prefix.replace('_', ' ').replace('.', ' > ').title() if prefix else 'Value',
                'field_type': field_type,
                'field_value': value_str,
                'field_group': group,
                'confidence_score': None
            })
            return fields
    
    fields_inserted = 0
    global_field_order = 0  # Track order across all pages for document-level ordering

    for page_result in page_results:
        if 'error' in page_result:
            # Skip failed pages
            continue
        
        page_num = page_result.get('page_number', 0)
        extraction_time_s = page_result.get('extraction_time_s', 0)
        tokens_used = page_result.get('tokens_used', 0)
        
        # Get fields from result - either explicit fields array or hierarchical_data
        fields = page_result.get('fields', [])
        hierarchical_data = page_result.get('hierarchical_data', {})
        
        # If no explicit fields array, extract from hierarchical_data using 100% granular flattening
        if not fields and hierarchical_data:
            fields = flatten_data(hierarchical_data)
            logger.debug(f"   📊 Page {page_num}: Flattened {len(fields)} fields from hierarchical data")
        
        # Insert each field
        for field in fields:
            try:
                confidence = field.get('confidence_score') or field.get('confidence')
                needs_review = confidence is not None and confidence < 0.7
                
                # Extract section name from field_group or field_name
                section_name = field.get('field_group') or None
                if not section_name and '.' in field.get('field_name', ''):
                    # Use first part of field name as section
                    section_name = field.get('field_name', '').split('.')[0]
                
                # Generate source location
                source_location = f"Page {page_num}"
                if section_name:
                    source_location += f", Section: {section_name}"
                
                # Extract context (first 200 chars of value)
                field_value = field.get('field_value')
                extraction_context = None
                if field_value:
                    context_str = str(field_value)[:200]
                    extraction_context = context_str if context_str else None
                
                extracted_field = BulkExtractedField(
                    document_id=document_id,
                    job_id=job_id,
                    field_name=field.get('field_name', 'unknown'),
                    field_label=field.get('field_label') or field.get('field_name', 'unknown'),
                    field_type=field.get('field_type', 'text'),
                    field_value=field_value,
                    field_group=field.get('field_group'),
                    confidence_score=confidence,
                    page_number=page_num,
                    field_order=global_field_order,  # Set explicit order
                    extraction_method='gemini_vision',
                    tokens_used=tokens_used,
                    processing_time_ms=int(extraction_time_s * 1000),
                    model_version=extraction_model,
                    validation_status='pending',
                    needs_manual_review=needs_review,
                    # NEW: Transcript metadata
                    section_name=section_name,
                    source_location=source_location,
                    extraction_context=extraction_context,
                    field_metadata={
                        'extraction_task': extraction_task,
                        'bounding_box': field.get('bounding_box'),
                        'ocr_text': field.get('ocr_text')
                    }
                )
                db.add(extracted_field)
                fields_inserted += 1
                global_field_order += 1  # Increment order for next field
                
            except Exception as field_error:
                logger.warning(f"Failed to insert field {field.get('field_name')}: {field_error}")
                continue
    
    try:
        db.commit()
        logger.info(f"   💾 Inserted {fields_inserted} fields into database (100% granular extraction)")
    except Exception as commit_error:
        logger.error(f"Failed to commit fields: {commit_error}")
        db.rollback()
        raise
    
    return fields_inserted


def process_single_page_with_retry(
    page_num: int,
    page_image: str,
    prompt: str,
    response_format: Dict[str, Any],
    extraction_task: str,
    document_filename: str,
    llm_client,
    max_retries: int = 3,
    retry_backoff_base: int = 5
) -> Dict[str, Any]:
    """
    Process a single page with retry logic and exponential backoff
    
    Args:
        page_num: Page number (0-indexed)
        page_image: Base64 encoded image
        prompt: Extraction prompt
        response_format: JSON schema for response
        extraction_task: Task type
        document_filename: Document name for logging
        llm_client: LLM client instance
        max_retries: Maximum retry attempts
        retry_backoff_base: Base seconds for exponential backoff
    
    Returns:
        Page extraction result dictionary
    """
    import time
    from requests.exceptions import ReadTimeout, ConnectionError
    
    page_start = time.time()
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            # Call Gemini Vision API for this page
            result = llm_client.call_api_sync(
                prompt=prompt,
                image_data=page_image,
                response_format=response_format,
                task=extraction_task,
                document_name=f"{document_filename} (page {page_num + 1})",
                content_type="image"
            )
            
            page_time = time.time() - page_start
            
            # Extract data from result
            hierarchical_data = result.get('hierarchical_data', {})
            fields = result.get('fields', [])
            usage = result.get('usage', {})
            
            # Count tokens
            tokens_used = usage.get('total_tokens', 0)
            
            # Count extracted fields/data
            field_count = len(fields) if fields else len(hierarchical_data.keys())
            
            logger.info(
                f"   ✅ Page {page_num + 1}: {field_count} fields, "
                f"{tokens_used} tokens, {page_time:.2f}s"
            )
            
            return {
                'page_number': page_num + 1,
                'extraction_time_s': round(page_time, 2),
                'tokens_used': tokens_used,
                'fields_extracted': field_count,
                'hierarchical_data': hierarchical_data,
                'fields': fields,
                'usage': usage,
                'finish_reason': result.get('finish_reason')
            }
            
        except (ReadTimeout, ConnectionError, Exception) as error:
            # Handle all network and API errors with retry logic
            last_error = error
            error_type = type(error).__name__
            
            # Check if this is a retryable network error
            is_network_error = isinstance(error, (ReadTimeout, ConnectionError))
            
            if attempt < max_retries and (is_network_error or 'timeout' in str(error).lower() or 'connection' in str(error).lower()):
                # Exponential backoff: 5s, 10s, 20s
                wait_time = retry_backoff_base * (2 ** (attempt - 1))
                logger.warning(
                    f"   ⚠️ Page {page_num + 1}: {error_type} on attempt {attempt}/{max_retries}, "
                    f"retrying in {wait_time}s..."
                )
                time.sleep(wait_time)
            else:
                # Non-retryable error or max retries reached
                logger.error(
                    f"   ❌ Page {page_num + 1}: {error_type} - {str(error)[:100]}"
                )
                break
    
    # Return error result
    return {
        'page_number': page_num + 1,
        'error': str(last_error),
        'error_type': type(last_error).__name__,
        'extraction_time_s': round(time.time() - page_start, 2)
    }


def process_page_batch(
    page_indices: List[int],
    page_images: List[str],
    prompt: str,
    response_format: Dict,
    extraction_mode: str,
    document_filename: str,
    llm_client,
    max_retries: int,
    retry_backoff_base: int
) -> List[Dict[str, Any]]:
    """
    Process a batch of pages sequentially in a single thread.
    
    This function is designed to be called by ThreadPoolExecutor where each thread
    processes multiple pages sequentially rather than one page per thread.
    
    Args:
        page_indices: List of page indices to process in this batch
        page_images: Full list of all page images (base64)
        prompt: Extraction prompt
        response_format: Response schema
        extraction_mode: 'normal' or 'bank_statement'
        document_filename: Document name for logging
        llm_client: LLM client instance
        max_retries: Retry attempts per page
        retry_backoff_base: Base backoff time in seconds
    
    Returns:
        List of results (one per page in batch)
    """
    batch_results = []
    
    logger.info(f"   🔄 Processing batch: pages {[idx+1 for idx in page_indices]}")
    
    for page_idx in page_indices:
        logger.info(f"   ⏳ Starting page {page_idx + 1}...")
        result = process_single_page_with_retry(
            page_num=page_idx,
            page_image=page_images[page_idx],
            prompt=prompt,
            response_format=response_format,
            extraction_task=extraction_mode,
            document_filename=document_filename,
            llm_client=llm_client,
            max_retries=max_retries,
            retry_backoff_base=retry_backoff_base
        )
        batch_results.append(result)
        logger.info(f"   ✅ Completed page {page_idx + 1}")
    
    return batch_results


@celery_app.task(bind=True, name='app.workers.processing.process_document', max_retries=3)
def process_document(self, document_id: str, job_id: str, job_config: Dict[str, Any]):
    """
    Process a single document - Extract structured data using Gemini Vision API with PARALLEL processing
    
    Workflow:
    1. Load PDF from file
    2. Convert PDF pages to images (parallel)
    3. Process all pages in PARALLEL batches (10 pages at a time)
    4. Insert extracted fields into bulk_extracted_fields table (every 10 pages)
    5. Update document status
    
    Args:
        document_id: Document ID
        job_id: Bulk job ID
        job_config: Job configuration (source, template, extraction_task, etc.)
    
    Returns:
        Processing result with statistics
    """
    logger.info(f"📄 Processing document {document_id} for job {job_id}")
    
    start_time = time.time()
    
    try:
        from app.core.database import get_sync_db
        from app.core.config import settings
        from app.models.database import BulkJobDocument
        from app.services.source_adapter import get_source_adapter
        from app.services.pdf_processor import PDFProcessor
        from app.services.llm_client import LLMClient
        from app.services.prompt_service import PromptService
        
        # Initialize services
        pdf_processor = PDFProcessor()
        llm_client = LLMClient()
        prompt_service = PromptService()
        
        # Get extraction task from job config
        extraction_task = job_config.get('extraction_task', 'without_template_extraction')
        templates = job_config.get('templates', None)
        
        # Get document type for special handling (bank statements, identity docs, etc.)
        processing_options = job_config.get('processing_options', {})
        document_type = processing_options.get('documentType', None) if processing_options else None
        is_bank_statement = document_type == 'bank_statement'
        
        if is_bank_statement:
            logger.info(f"📊 Bank Statement mode - multi-page table handling enabled")
        
        # Get configuration - use job-specific config if available, otherwise fall back to settings
        parallel_workers = processing_options.get('parallel_workers', settings.PARALLEL_PAGE_WORKERS)
        pages_per_thread = processing_options.get('pages_per_thread', getattr(settings, 'PAGES_PER_THREAD', 5))
        checkpoint_interval = processing_options.get('checkpoint_interval', settings.PROGRESS_CHECKPOINT_INTERVAL)
        max_retries = processing_options.get('max_retries', settings.MAX_RETRIES_PER_PAGE)
        retry_backoff = processing_options.get('retry_delay', settings.RETRY_BACKOFF_BASE)
        
        logger.info(
            f"📊 Processing Config: workers={parallel_workers}, pages/thread={pages_per_thread}, "
            f"checkpoint={checkpoint_interval}, retries={max_retries}"
        )
        
        # OPTIMIZATION: Calculate optimal thread distribution
        # Example: 50 pages with 10 threads = each thread processes 5 pages
        # Example: 25 pages with 10 threads = each thread processes 2-3 pages
        
        # Get database session
        db = next(get_sync_db())
        
        try:
            # Step 1: Get document from database
            document = db.query(BulkJobDocument).filter(
                BulkJobDocument.id == document_id
            ).first()
            
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            # Update status to processing
            document.status = 'processing'
            document.processing_started_at = datetime.utcnow()
            document.processing_stage = 'Loading document...'
            db.commit()
            
            logger.info(f"[1/5] Document loaded: {document.filename}")
            
            # Step 2: Load document content from source
            source_config = job_config.get('source_config', {})
            provider = source_config.get('provider', 'folder')  # Default to folder
            
            # Use appropriate adapter based on source type
            source_adapter = get_source_adapter(provider if provider else 'folder')
            
            # Pass config for cloud sources that need initialization
            if provider in ['google_drive', 'onedrive']:
                pdf_bytes = source_adapter.get_document_content(document.source_path, source_config)
            else:
                pdf_bytes = source_adapter.get_document_content(document.source_path)
            
            if not pdf_bytes:
                raise ValueError(f"Failed to load document from {document.source_path}")
            
            # Convert to base64 for PDFProcessor
            import base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            pdf_data_url = f"data:application/pdf;base64,{pdf_base64}"
            
            load_time = time.time() - start_time
            logger.info(f"[2/5] ✅ PDF loaded ({len(pdf_bytes)} bytes) in {load_time:.2f}s")
            
            # Step 3: Convert PDF to images
            page_count = pdf_processor.get_pdf_page_count(pdf_data_url)
            
            # Update stage - Converting to images
            document.processing_stage = f'Converting {page_count} pages to images...'
            document.total_pages = page_count
            db.commit()
            
            logger.info(f"[3/5] Converting PDF ({page_count} pages) to images for Vision API...")
            
            convert_start = time.time()
            
            # Use async function in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                page_images = loop.run_until_complete(
                    pdf_processor.convert_pdf_to_images(pdf_data_url)
                )
            finally:
                loop.close()
            
            convert_time = time.time() - convert_start
            logger.info(f"[3/5] ✅ Converted {len(page_images)} pages to images in {convert_time:.2f}s")
            
            # Update stage - Extracting data
            document.processing_stage = f'Extracting data from {len(page_images)} pages...'
            document.pages_processed = 0
            db.commit()
            
            # Step 4: Extract data from pages using PARALLEL processing
            logger.info(
                f"[4/5] Extracting data using Gemini Vision ({extraction_task}) - "
                f"PARALLEL mode ({parallel_workers} workers)..."
            )
            extract_start = time.time()
            
            extracted_pages = []
            total_tokens_used = 0
            total_fields_inserted = 0
            successful_pages = 0
            failed_pages = []
            
            # For bank statements, we need special sequential processing for header carryover
            bank_statement_headers = []  # Table headers from first page with table
            
            if is_bank_statement:
                # ==========================================
                # BANK STATEMENT MODE - Smart Header Detection
                # ==========================================
                # Don't assume page 1 has headers - some banks put headers on page 2+
                # Process pages sequentially until we find headers, then parallel for rest
                logger.info("   📊 Bank Statement mode: Smart header detection enabled")
                
                headers_found = False
                pages_processed_for_headers = 0
                max_pages_to_check_for_headers = min(3, len(page_images))  # Check up to first 3 pages
                
                # Process pages until we find table headers
                for page_idx in range(max_pages_to_check_for_headers):
                    if headers_found:
                        break
                    
                    page_image = page_images[page_idx]
                    logger.info(f"   📄 Processing page {page_idx + 1} to detect table headers...")
                    
                    # Use first-page prompt (which asks LLM to detect and report headers)
                    prompt, response_format = prompt_service.get_task_prompt(
                        task=extraction_task,
                        templates=templates,
                        content_type="image",
                        document_type=document_type,
                        context={
                            "is_first_page": True,  # Always use header-detection prompt
                            "table_headers": [],
                            "page_number": page_idx + 1
                        }
                    )
                    
                    result = process_single_page_with_retry(
                        page_idx,
                        page_image,
                        prompt,
                        response_format,
                        extraction_task,
                        document.filename,
                        llm_client,
                        max_retries,
                        retry_backoff
                    )
                    
                    extracted_pages.append(result)
                    pages_processed_for_headers += 1
                    
                    if 'error' not in result:
                        successful_pages += 1
                        total_tokens_used += result.get('tokens_used', 0)
                        
                        # Try to extract headers from this page
                        hierarchical_data = result.get('hierarchical_data', {})
                        if hierarchical_data and isinstance(hierarchical_data, dict):
                            # Check for explicit _table_headers
                            found_headers = hierarchical_data.get('_table_headers', [])
                            if found_headers:
                                bank_statement_headers = found_headers
                                headers_found = True
                                logger.info(f"   📋 Found table headers on page {page_idx + 1}: {bank_statement_headers}")
                            else:
                                # Try to infer from transactions
                                transactions = hierarchical_data.get('transactions', [])
                                if transactions and isinstance(transactions, list) and len(transactions) > 0:
                                    first_row = transactions[0]
                                    if isinstance(first_row, dict) and len(first_row.keys()) > 2:
                                        bank_statement_headers = list(first_row.keys())
                                        headers_found = True
                                        logger.info(f"   📋 Inferred headers from transactions on page {page_idx + 1}: {bank_statement_headers}")
                    else:
                        failed_pages.append(page_idx + 1)
                    
                    # Save this page's results
                    try:
                        fields_inserted = insert_extracted_fields_batch(
                            db=db,
                            document_id=document_id,
                            job_id=job_id,
                            page_results=[result],
                            extraction_model=llm_client.extraction_model,
                            extraction_task=extraction_task
                        )
                        total_fields_inserted += fields_inserted
                        document.total_fields_extracted = total_fields_inserted
                        document.pages_processed = pages_processed_for_headers
                        document.processing_stage = f'Extracting page {pages_processed_for_headers}/{len(page_images)}...'
                        db.commit()
                        logger.info(f"   ✅ Page {page_idx + 1}: {fields_inserted} fields saved")
                    except Exception as e:
                        logger.error(f"   ⚠️ Error saving page {page_idx + 1}: {e}")
                
                if not headers_found:
                    logger.warning("   ⚠️ No table headers found in first 3 pages, will let LLM detect per page")
                
                # Step 2: Process remaining pages
                remaining_start_idx = pages_processed_for_headers
                if remaining_start_idx < len(page_images):
                    remaining_images = page_images[remaining_start_idx:]
                    logger.info(f"   🚀 Processing pages {remaining_start_idx + 1}-{len(page_images)} {'with detected headers' if headers_found else 'with auto-detection'}")
                    
                    # Process remaining pages in parallel batches
                    for batch_start in range(0, len(remaining_images), checkpoint_interval):
                        batch_end = min(batch_start + checkpoint_interval, len(remaining_images))
                        batch_images = remaining_images[batch_start:batch_end]
                        actual_page_start = batch_start + remaining_start_idx + 1
                        
                        logger.info(f"   Processing batch: pages {actual_page_start}-{actual_page_start + len(batch_images) - 1}")
                        
                        batch_results = []
                        with ThreadPoolExecutor(max_workers=parallel_workers) as executor:
                            future_to_page = {}
                            
                            for i, page_image in enumerate(batch_images):
                                actual_page_num = batch_start + remaining_start_idx + i
                                
                                # If we found headers, use continuation prompt; otherwise use detection prompt
                                if headers_found:
                                    page_prompt, page_format = prompt_service.get_task_prompt(
                                        task=extraction_task,
                                        templates=templates,
                                        content_type="image",
                                        document_type=document_type,
                                        context={
                                            "is_first_page": False,
                                            "table_headers": bank_statement_headers,
                                            "page_number": actual_page_num + 1
                                        }
                                    )
                                else:
                                    # No headers found - let each page detect its own
                                    page_prompt, page_format = prompt_service.get_task_prompt(
                                        task=extraction_task,
                                        templates=templates,
                                        content_type="image",
                                        document_type=document_type,
                                        context={
                                            "is_first_page": True,  # Use detection mode
                                            "table_headers": [],
                                            "page_number": actual_page_num + 1
                                        }
                                    )
                                
                                future = executor.submit(
                                    process_single_page_with_retry,
                                    actual_page_num,
                                    page_image,
                                    page_prompt,
                                    page_format,
                                    extraction_task,
                                    document.filename,
                                    llm_client,
                                    max_retries,
                                    retry_backoff
                                )
                                future_to_page[future] = actual_page_num
                            
                            for future in as_completed(future_to_page):
                                page_num = future_to_page[future]
                                try:
                                    result = future.result()
                                    batch_results.append(result)
                                    
                                    if 'error' not in result:
                                        successful_pages += 1
                                        total_tokens_used += result.get('tokens_used', 0)
                                    else:
                                        failed_pages.append(page_num + 1)
                                except Exception as exc:
                                    logger.error(f"   ❌ Page {page_num + 1} exception: {exc}")
                                    batch_results.append({
                                        'page_number': page_num + 1,
                                        'error': str(exc)
                                    })
                                    failed_pages.append(page_num + 1)
                        
                        extracted_pages.extend(batch_results)
                        
                        # Save batch
                        try:
                            fields_inserted = insert_extracted_fields_batch(
                                db=db,
                                document_id=document_id,
                                job_id=job_id,
                                page_results=batch_results,
                                extraction_model=llm_client.extraction_model,
                                extraction_task=extraction_task
                            )
                            total_fields_inserted += fields_inserted
                            document.total_fields_extracted = total_fields_inserted
                            document.pages_processed = remaining_start_idx + len(extracted_pages) - pages_processed_for_headers
                            document.processing_stage = f'Extracting page {document.pages_processed}/{len(page_images)}...'
                            db.commit()
                            logger.info(f"   ✅ Batch complete: {total_fields_inserted} total fields saved")
                        except Exception as e:
                            logger.error(f"   ⚠️ Batch save error: {e}")
                
            else:
                # ==========================================
                # NORMAL MODE - Parallel Batch Processing with Page Batching
                # ==========================================
                # Get prompt and response format for the extraction task (no special context)
                prompt, response_format = prompt_service.get_task_prompt(
                    task=extraction_task,
                    templates=templates,
                    content_type="image"
                )
            
                # Process pages in checkpoints with batch-based threading
                for checkpoint_start in range(0, len(page_images), checkpoint_interval):
                    checkpoint_end = min(checkpoint_start + checkpoint_interval, len(page_images))
                    checkpoint_images = page_images[checkpoint_start:checkpoint_end]
                    
                    logger.info(f"   Processing checkpoint: pages {checkpoint_start + 1}-{checkpoint_end} ({len(checkpoint_images)} pages)")
                    
                    # Divide checkpoint pages into batches for threading
                    # Each thread will process pages_per_thread pages sequentially
                    total_pages_in_checkpoint = len(checkpoint_images)
                    num_batches = math.ceil(total_pages_in_checkpoint / pages_per_thread)
                    
                    page_batches = []
                    for batch_idx in range(num_batches):
                        batch_start_idx = batch_idx * pages_per_thread
                        batch_end_idx = min((batch_idx + 1) * pages_per_thread, total_pages_in_checkpoint)
                        # Create list of page indices for this batch (relative to checkpoint_start)
                        batch_page_indices = list(range(batch_start_idx, batch_end_idx))
                        # Convert to absolute page indices
                        absolute_indices = [checkpoint_start + idx for idx in batch_page_indices]
                        page_batches.append(absolute_indices)
                    
                    logger.info(f"   Divided into {num_batches} batches ({pages_per_thread} pages/batch)")
                    
                    # Process batches in parallel using ThreadPoolExecutor
                    checkpoint_results = []
                    with ThreadPoolExecutor(max_workers=parallel_workers) as executor:
                        # Submit each batch to a thread
                        future_to_batch = {
                            executor.submit(
                                process_page_batch,
                                batch_indices,
                                page_images,  # Pass full list, function will index into it
                                prompt,
                                response_format,
                                extraction_task,
                                document.filename,
                                llm_client,
                                max_retries,
                                retry_backoff
                            ): batch_indices
                            for batch_indices in page_batches
                        }
                        
                        # Collect results as batches complete
                        for future in as_completed(future_to_batch):
                            batch_indices = future_to_batch[future]
                            try:
                                batch_results = future.result()  # List of results from this batch
                                checkpoint_results.extend(batch_results)
                                
                                # Update counters
                                for result in batch_results:
                                    if 'error' not in result:
                                        successful_pages += 1
                                        total_tokens_used += result.get('tokens_used', 0)
                                    else:
                                        failed_pages.append(result['page_number'])
                                        
                            except Exception as exc:
                                logger.error(f"   ❌ Batch {batch_indices} exception: {exc}")
                                # Create error results for all pages in failed batch
                                for page_idx in batch_indices:
                                    checkpoint_results.append({
                                        'page_number': page_idx + 1,
                                        'error': str(exc),
                                        'error_type': type(exc).__name__
                                    })
                                    failed_pages.append(page_idx + 1)
                    
                    # Add checkpoint results to all results
                    extracted_pages.extend(checkpoint_results)
                    
                    # CHECKPOINT: Insert batch into database
                    try:
                        fields_inserted = insert_extracted_fields_batch(
                            db=db,
                            document_id=document_id,
                            job_id=job_id,
                            page_results=checkpoint_results,
                            extraction_model=llm_client.extraction_model,
                            extraction_task=extraction_task
                        )
                        total_fields_inserted += fields_inserted
                        
                        # Update document progress
                        document.total_fields_extracted = total_fields_inserted
                        document.pages_processed = checkpoint_end
                        document.processing_stage = f'Extracting page {checkpoint_end}/{page_count}...'
                        db.commit()
                        
                        logger.info(
                            f"   ✅ Checkpoint: {checkpoint_end}/{page_count} pages processed, "
                            f"{total_fields_inserted} fields saved"
                        )
                        
                    except Exception as checkpoint_error:
                        logger.error(f"   ⚠️ Checkpoint failed: {checkpoint_error}")
                    # Continue processing even if checkpoint fails
            
            extract_time = time.time() - extract_start
            logger.info(
                f"[4/5] ✅ Extracted data from {successful_pages}/{page_count} pages in {extract_time:.2f}s"
            )
            
            if failed_pages:
                logger.warning(f"   ⚠️ {len(failed_pages)} pages failed: {failed_pages[:10]}")
            
            # Step 4.5: Generate transcript for template-based mapping
            document.processing_stage = 'Generating searchable transcript...'
            db.commit()
            
            logger.info(f"[4.5/5] 📝 Generating searchable transcript...")
            transcript_start = time.time()
            
            try:
                from app.services.transcript_service import TranscriptService
                from app.models.database import BulkDocumentTranscript
                
                transcript_service = TranscriptService()
                transcript_data = transcript_service.generate_transcript(
                    extracted_pages=extracted_pages,
                    document_name=document.filename
                )
                
                # Save transcript to database
                transcript_record = BulkDocumentTranscript(
                    document_id=document.id,
                    job_id=UUID(job_id),
                    full_transcript=transcript_data['full_transcript'],
                    page_transcripts=transcript_data['page_transcripts'],
                    section_index=transcript_data['section_index'],
                    field_locations=transcript_data['field_locations'],
                    total_pages=transcript_data['total_pages'],
                    total_sections=transcript_data['total_sections'],
                    generation_time_ms=transcript_data['generation_time_ms']
                )
                
                db.add(transcript_record)
                db.commit()
                
                transcript_time = time.time() - transcript_start
                logger.info(
                    f"[4.5/5] ✅ Transcript generated in {transcript_time:.2f}s "
                    f"({transcript_data['total_sections']} sections, {len(transcript_data['field_locations'])} fields)"
                )
                
            except Exception as transcript_error:
                logger.warning(f"⚠️ Transcript generation failed (non-critical): {transcript_error}")
                # Continue processing even if transcript fails
            
            # Step 5: Update document status and metadata
            document.processing_stage = 'Saving results...'
            db.commit()
            
            total_time = time.time() - start_time
            
            # Store summary in token_usage field (for backward compatibility)
            document.token_usage = {
                'extraction_task': extraction_task,
                'page_count': page_count,
                'pages_extracted': successful_pages,
                'pages_failed': len(failed_pages),
                'failed_page_numbers': failed_pages,
                'total_tokens_used': total_tokens_used,
                'total_fields_extracted': total_fields_inserted,
                'timing': {
                    'load_time_s': round(load_time, 2),
                    'convert_time_s': round(convert_time, 2),
                    'extract_time_s': round(extract_time, 2),
                    'total_time_s': round(total_time, 2)
                },
                'processing_mode': 'parallel',
                'parallel_workers': parallel_workers
            }
            
            # Determine final status
            if failed_pages and successful_pages == 0:
                document.status = 'failed'
                document.error_message = f"All {len(failed_pages)} pages failed to process"
            elif failed_pages:
                document.status = 'needs_review'
                document.error_message = f"{len(failed_pages)} pages failed: {failed_pages[:5]}"
                
                # Add to review queue
                from app.models.database import BulkManualReviewQueue
                review_item = BulkManualReviewQueue(
                    document_id=document.id,
                    job_id=job_id,
                    reason=f"Partial processing failure: {len(failed_pages)}/{page_count} pages failed",
                    error_message=document.error_message,
                    error_type="Partial Processing Failure",
                    priority=2,  # Medium-high priority
                    status="pending"
                )
                db.add(review_item)
                logger.info(f"📋 Added document to review queue: {len(failed_pages)} pages failed")
            else:
                document.status = 'completed'
            
            document.processing_completed_at = datetime.utcnow()
            document.extraction_time_seconds = total_time
            document.total_fields_extracted = total_fields_inserted
            document.total_tokens_used = total_tokens_used
            
            db.commit()
            
            logger.info(
                f"[5/5] ✅ Document {document_id} processed!\n"
                f"   📊 Statistics:\n"
                f"      - Status: {document.status}\n"
                f"      - Total time: {total_time:.2f}s\n"
                f"      - Pages: {successful_pages}/{page_count} successful\n"
                f"      - Fields extracted: {total_fields_inserted:,}\n"
                f"      - Tokens used: {total_tokens_used:,}\n"
                f"      - Load: {load_time:.2f}s\n"
                f"      - Convert: {convert_time:.2f}s\n"
                f"      - Extract: {extract_time:.2f}s (parallel)\n"
                f"      - Failed pages: {len(failed_pages)}"
            )
            
            # Update job progress
            from app.models.database import BulkJob
            from sqlalchemy import func
            job = db.query(BulkJob).filter(BulkJob.id == job_id).first()
            if job:
                job.processed_documents = (job.processed_documents or 0) + 1
                if document.status == 'failed':
                    job.failed_documents = (job.failed_documents or 0) + 1
                
                # Check if all documents are processed
                total_docs = db.query(func.count(BulkJobDocument.id)).filter(
                    BulkJobDocument.job_id == job_id
                ).scalar()
                
                completed_docs = db.query(func.count(BulkJobDocument.id)).filter(
                    BulkJobDocument.job_id == job_id,
                    BulkJobDocument.status.in_(['completed', 'failed', 'needs_review'])
                ).scalar()
                
                # Update job status if all documents are done
                if completed_docs == total_docs and job.status == 'running':
                    job.status = 'completed'
                    job.completed_at = datetime.utcnow()
                    logger.info(f"✅ Job {job_id} completed! {completed_docs}/{total_docs} documents processed")
                
                db.commit()
            
            return {
                "document_id": document_id,
                "status": document.status,
                "success": document.status in ['completed', 'needs_review'],
                "pages_processed": successful_pages,
                "pages_failed": len(failed_pages),
                "fields_extracted": total_fields_inserted,
                "tokens_used": total_tokens_used,
                "processing_time_s": round(total_time, 2),
                "processing_mode": "parallel"
            }
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"❌ Processing failed for document {document_id}: {exc}", exc_info=True)
        
        # Update document status to failed
        try:
            db = next(get_sync_db())
            try:
                document = db.query(BulkJobDocument).filter(
                    BulkJobDocument.id == document_id
                ).first()
                if document:
                    document.status = 'failed'
                    document.error_message = str(exc)
                    document.error_type = type(exc).__name__
                    db.commit()
            finally:
                db.close()
        except Exception as db_error:
            logger.error(f"Failed to update document status: {db_error}")
        
        # Retry logic with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)  # 60s, 120s, 240s
            logger.info(f"Retrying in {countdown}s (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc, countdown=countdown)
        else:
            return {
                "document_id": document_id,
                "status": "failed",
                "success": False,
                "error": str(exc)
            }
