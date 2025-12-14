"""
Page processing methods for extraction and template matching.

This module contains the per-page processing methods that handle:
- Single page extraction (synchronous version)
- Template-guided extraction
- Template matching

These methods are separated from the main processor to reduce file size.
"""

import logging
import time
from typing import Dict, Any, Optional, TYPE_CHECKING
from PIL import Image

if TYPE_CHECKING:
    from ..pdf_processor import PDFProcessor
    from ..llm_client import LLMClient
    from ..prompt_service import PromptService
    from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


async def process_page_for_template_extraction(
    pdf_processor: 'PDFProcessor',
    llm_client: 'LLMClient',
    prompt_service: 'PromptService',
    page_num: int,
    pdf_data: str,
    context: Dict[str, Any],
    convert_page_async_func,
    thread_pool: 'ThreadPoolExecutor'
) -> Dict[str, Any]:
    """
    Process a single page for template-guided extraction (Step 1)

    Args:
        pdf_processor: PDF processor instance
        llm_client: LLM client instance
        prompt_service: Prompt service instance
        page_num: Zero-based page number
        pdf_data: Base64 encoded PDF data
        context: Context dictionary containing:
            - document_name: Document name
        convert_page_async_func: Async function to convert page to image
        thread_pool: Thread pool for async operations

    Returns:
        Dictionary containing:
            - page_data: Extracted data (_parsed from LLM)
            - page_image_processed: Processed image
            - page_key_order: Key order from this page
    """
    document_name = context.get("document_name", "Unknown")

    # Convert page to image (async - runs in thread pool for parallel conversion)
    page_images = await convert_page_async_func(pdf_data, page_num, thread_pool)

    if not page_images or not isinstance(page_images, dict):
        raise ValueError(f"Failed to convert page {page_num + 1}")

    page_image_processed_pil = page_images.get("processed")  # PIL Image, not base64 yet

    if not page_image_processed_pil:
        raise ValueError(f"Failed to get processed image for page {page_num + 1}")

    # Encode processed image to base64 in async context (not blocking thread pool)
    page_image_processed = pdf_processor._encode_image_simple(page_image_processed_pil)

    # Get without_template_extraction prompt (used as Step 1 of template-guided extraction)
    extraction_prompt, extraction_response_format = prompt_service.get_task_prompt(
        "without_template_extraction", None, None
    )

    # Extract data from this page with semaphore control
    llm_semaphore = context.get("_llm_semaphore")
    if llm_semaphore:
        async with llm_semaphore:
            logger.debug(f"🤖 Calling LLM API for template extraction page {page_num + 1}")
            page_result = await llm_client.call_api(
                extraction_prompt, page_image_processed, extraction_response_format,
                "without_template_extraction", document_name=f"{document_name} (page {page_num + 1})"
            )
    else:
        page_result = await llm_client.call_api(
            extraction_prompt, page_image_processed, extraction_response_format,
            "without_template_extraction", document_name=f"{document_name} (page {page_num + 1})"
        )

    # Get the raw parsed data from the LLM response
    page_data = page_result.get("_parsed", {})

    # Get key order from this page
    page_key_order = page_data.get('_keyOrder', [])
    if not isinstance(page_key_order, list) or len(page_key_order) == 0:
        page_key_order = [k for k in page_data.keys() if not k.startswith('_')]

    return {
        "page_data": page_data,
        "page_image_processed": page_image_processed,
        "page_key_order": page_key_order,
        "page_result": page_result,
        "page_num": page_num,
    }


async def process_page_for_template_matching(
    pdf_processor: 'PDFProcessor',
    llm_client: 'LLMClient',
    prompt_service: 'PromptService',
    page_num: int,
    pdf_data: str,
    context: Dict[str, Any],
    convert_page_async_func,
    thread_pool: 'ThreadPoolExecutor'
) -> Dict[str, Any]:
    """
    Process a single page for template matching (Step 1 - field extraction)

    Args:
        pdf_processor: PDF processor instance
        llm_client: LLM client instance
        prompt_service: Prompt service instance
        page_num: Zero-based page number
        pdf_data: Base64 encoded PDF data
        context: Context dictionary containing:
            - document_name: Document name
        convert_page_async_func: Async function to convert page to image
        thread_pool: Thread pool for async operations

    Returns:
        Dictionary containing:
            - page_fields: Extracted fields
            - page_image_processed: Processed image
            - page_result: LLM API result
    """
    document_name = context.get("document_name", "Unknown")

    # Convert page to image (async - runs in thread pool for parallel conversion)
    page_images = await convert_page_async_func(pdf_data, page_num, thread_pool)

    if not page_images or not isinstance(page_images, dict):
        raise ValueError(f"Failed to convert page {page_num + 1}")

    page_image_processed_pil = page_images.get("processed")  # PIL Image, not base64 yet

    if not page_image_processed_pil:
        raise ValueError(f"Failed to get processed image for page {page_num + 1}")

    # Encode processed image to base64 in async context (not blocking thread pool)
    page_image_processed = pdf_processor._encode_image_simple(page_image_processed_pil)

    # Get prompt for field extraction
    field_prompt, field_response_format = prompt_service.get_task_prompt(
        "without_template_extraction", None, None
    )

    # Extract fields from this page with semaphore control
    llm_semaphore = context.get("_llm_semaphore")
    if llm_semaphore:
        async with llm_semaphore:
            logger.debug(f"🤖 Calling LLM API for template matching page {page_num + 1}")
            page_result = await llm_client.call_api(
                field_prompt, page_image_processed, field_response_format,
                "without_template_extraction", document_name=f"{document_name} (page {page_num + 1})"
            )
    else:
        page_result = await llm_client.call_api(
            field_prompt, page_image_processed, field_response_format,
            "without_template_extraction", document_name=f"{document_name} (page {page_num + 1})"
        )

    # Collect fields from this page
    page_fields = page_result.get("fields", [])

    # If no fields but we have hierarchical_data, convert it to fields
    if not page_fields and page_result.get("hierarchical_data"):
        page_hierarchical_data = page_result.get("hierarchical_data")
        # Import here to avoid circular dependency
        from .pdf_processing_service import PDFProcessingService
        temp_service = PDFProcessingService(llm_client, prompt_service)
        page_fields = temp_service._convert_hierarchical_to_fields(page_hierarchical_data, page_num + 1)

    # Add page number to each field
    for field in page_fields:
        field["page"] = page_num + 1

    return {
        "page_fields": page_fields,
        "page_image_processed": page_image_processed,
        "page_result": page_result,
        "page_num": page_num,
    }


def process_page_for_extraction_sync(
    pdf_processor: 'PDFProcessor',
    llm_client: 'LLMClient',
    prompt_service: 'PromptService',
    page_num: int,
    pdf_data: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synchronous version: Process a single page for extraction.
    
    Used by without_template_extraction, field_detection, form_creation.
    All operations (PDF conversion and LLM calls) run in threads for true parallelism.
    Supports text extraction when available, falls back to image conversion.

    Args:
        pdf_processor: PDF processor instance
        llm_client: LLM client instance
        prompt_service: Prompt service instance
        page_num: Zero-based page number
        pdf_data: Base64 encoded PDF data
        context: Context dictionary containing:
            - task: Task type
            - document_name: Document name
            - templates: Optional templates
            - db_templates: Optional DB templates
            - prefer_text: Whether to prefer text extraction (default: True)
            - text_confidence_threshold: Minimum confidence for text (default: 0.6)

    Returns:
        Dictionary containing:
            - page_result: LLM API result
            - page_image_processed: Processed image (if using image)
            - page_image_original: Original image (if using image)
            - page_text: Extracted text (if using text)
            - content_type: "text" or "image"
            - page_fields: Extracted fields
            - page_hierarchical_data: Hierarchical data
            - page_data: Parsed data (for signature processing)
    """
    task = context.get("task")
    document_name = context.get("document_name", "Unknown")
    templates = context.get("templates")
    db_templates = context.get("db_templates")
    prefer_text = context.get("prefer_text", True)
    text_confidence_threshold = context.get("text_confidence_threshold", 0.6)
    
    # Bank statement specific context
    document_type = context.get("document_type")
    is_first_page = context.get("is_first_page", True)  # Default to first page mode
    table_headers = context.get("table_headers", [])
    page_number = context.get("page_number", page_num + 1)  # 1-based page number for prompts

    # Try text extraction first if preferred (synchronous - runs in thread pool)
    content_type = "image"
    page_image_processed = None
    page_image_original = None
    page_image_processed_pil = None
    page_image_original_pil = None
    page_text = None
    actual_image_dimensions = None  # Store actual image dimensions for signature processing

    if prefer_text:
        text_data = pdf_processor.extract_text_from_page(pdf_data, page_num)
        if text_data and text_data["is_selectable"] and text_data["confidence"] >= text_confidence_threshold:
            logger.info(f"✅ [Page {page_num + 1}] Using TEXT extraction (confidence: {text_data['confidence']:.2f})")
            content_type = "text"
            page_text = text_data["text"]

    # If text extraction not used or failed, convert to image
    if content_type != "text":
        conversion_start_time = time.time()
        logger.info(f"📄 [Page {page_num + 1}] Starting PDF conversion")

        # Direct call to PDF processor (will be executed in thread pool)
        page_images = pdf_processor.convert_pdf_page_to_image(pdf_data, page_num)
        conversion_end_time = time.time()
        conversion_duration = conversion_end_time - conversion_start_time

        logger.info(f"✅ [Page {page_num + 1}] PDF conversion completed in {conversion_duration:.2f}s")

        page_image_processed_pil = page_images.get("processed")  # PIL Image, not base64 yet
        page_image_original_pil = page_images.get("original")  # PIL Image, not base64 yet
        actual_image_dimensions = page_images.get("dimensions")  # Actual image dimensions

        if not page_image_processed_pil:
            raise ValueError(f"Failed to get processed image for page {page_num + 1}")

        if not page_image_original_pil:
            raise ValueError(f"Failed to get original image for page {page_num + 1}")

        # Encode processed image to base64
        encoding_start = time.time()
        page_image_processed = pdf_processor._encode_image_simple(page_image_processed_pil)
        encoding_duration = time.time() - encoding_start
        logger.debug(f"📸 [Page {page_num + 1}] Image encoded to base64 in {encoding_duration:.2f}s")

        logger.info(f"✅ [Page {page_num + 1}] Ready for LLM call (conversion: {conversion_duration:.2f}s, encoding: {encoding_duration:.2f}s)")

    # Get prompt for this task (with content_type and document_type context for specialized prompts)
    prompt_context = {
        "is_first_page": is_first_page,
        "table_headers": table_headers,
        "page_number": page_number
    }
    prompt, response_format = prompt_service.get_task_prompt(
        task, templates, db_templates, content_type=content_type,
        document_type=document_type, context=prompt_context
    )

    # Call LLM API synchronously (will be executed in thread pool)
    llm_start_time = time.time()
    if content_type == "text":
        # Text-based extraction (prompt already includes instructions for text extraction)
        logger.info(f"📝 [Page {page_num + 1}] Starting LLM API call with TEXT ({len(page_text)} chars)")
        page_result = llm_client.call_api_sync(
            prompt, page_text, response_format, task,
            document_name=f"{document_name} (page {page_num + 1})",
            content_type="text"
        )
    else:
        # Image-based extraction (prompt already includes instructions for image extraction)
        logger.info(f"🤖 [Page {page_num + 1}] Starting LLM API call with IMAGE")
        page_result = llm_client.call_api_sync(
            prompt, page_image_processed, response_format, task,
            document_name=f"{document_name} (page {page_num + 1})",
            content_type="image"
        )
    llm_duration = time.time() - llm_start_time
    logger.info(f"✅ [Page {page_num + 1}] LLM call completed in {llm_duration:.2f}s")

    # Extract fields
    page_fields = page_result.get("fields", [])

    # Convert hierarchical_data to fields if needed
    if task in ["field_detection", "form_creation"] and not page_fields and page_result.get("hierarchical_data"):
        page_hierarchical_data = page_result.get("hierarchical_data")
        # Import here to avoid circular dependency
        from .pdf_processing_service import PDFProcessingService
        temp_service = PDFProcessingService(llm_client, prompt_service)
        page_fields = temp_service._convert_hierarchical_to_fields(page_hierarchical_data, page_num + 1)

    # Process signatures if present (for without_template_extraction task)
    page_image_original_encoded = None  # Track if we've encoded the original image
    page_data = page_result.get("_parsed", {})

    if task == "without_template_extraction" and page_data and "signatures" in page_data and isinstance(page_data["signatures"], list):
        logger.info(f"🔍 Found {len(page_data['signatures'])} signatures on page {page_num + 1}")

        # If we used text extraction, we need to convert to image for signature cropping
        if content_type == "text" and not page_image_original_pil:
            logger.info(f"⚠️ Text extraction was used, converting page to image for signature processing")
            page_images = pdf_processor.convert_pdf_page_to_image(pdf_data, page_num)
            if page_images:
                page_image_original_pil = page_images.get("original")
                page_image_processed_pil = page_images.get("processed")
                actual_image_dimensions = page_images.get("dimensions")

        # Only process signatures if we have an original image
        if page_image_original_pil:
            # Encode original image to base64 on-demand (only when signatures are detected)
            logger.debug(f"📸 Encoding original image for signature cropping (lazy encoding)")
            page_image_original_encoded = pdf_processor._encode_image_simple(page_image_original_pil)

            # Get image size from LLM response for coordinate conversion
            llm_image_size = page_data.get("image_size", {})
            llm_width = llm_image_size.get("width", 848)
            llm_height = llm_image_size.get("height", 1200)

            # Get actual image dimensions (dynamic - no longer hardcoded A4)
            if actual_image_dimensions:
                actual_width = actual_image_dimensions.get("width", page_image_original_pil.width)
                actual_height = actual_image_dimensions.get("height", page_image_original_pil.height)
            else:
                actual_width = page_image_original_pil.width
                actual_height = page_image_original_pil.height
            
            logger.debug(f"📐 Signature coordinate conversion: LLM={llm_width}x{llm_height} -> Actual={actual_width}x{actual_height}")

            # Convert bbox coordinates
            converted_signatures = []
            for sig in page_data["signatures"]:
                bbox = sig.get("bbox", [])
                if len(bbox) == 4:
                    converted_bbox = pdf_processor.convert_signature_coordinates(
                        bbox=bbox,
                        llm_width=llm_width,
                        llm_height=llm_height,
                        actual_width=actual_width,
                        actual_height=actual_height
                    )
                    converted_sig = sig.copy()
                    converted_sig["bbox"] = converted_bbox
                    converted_signatures.append(converted_sig)
                else:
                    converted_signatures.append(sig)

            # Crop signatures from original image
            cropped_signatures = pdf_processor.crop_signatures_from_page(
                    page_image_original_encoded, converted_signatures, create_debug_image=True, page_number=page_num + 1
            )

            # Update page data with cropped signatures
            page_data["signatures"] = cropped_signatures
            page_result["_parsed"] = page_data

            # Update hierarchical_data if present
            if isinstance(page_result, dict) and "hierarchical_data" in page_result:
                page_hierarchical_data = page_result.get("hierarchical_data")
                if isinstance(page_hierarchical_data, dict) and "signatures" in page_hierarchical_data:
                    page_hierarchical_data["signatures"] = cropped_signatures

            # Update fields
            for field in page_fields:
                if field.get("label") == "signatures":
                    field["value"] = cropped_signatures
                    break

            logger.info(f"✅ Processed {len(cropped_signatures)} signatures on page {page_num + 1}")
        else:
            logger.warning(f"⚠️ Cannot process signatures - no image available for page {page_num + 1}")

    # Encode original image to base64 only if it wasn't already encoded (for signatures)
    # If no signatures, we still need to return it for consistency, but encode it now
    if page_image_original_encoded is None:
        # Original wasn't encoded (no signatures found), encode it now for return value
        if page_image_original_pil:
            page_image_original = pdf_processor._encode_image_simple(page_image_original_pil)
        else:
            page_image_original = None
    else:
        # Already encoded (signatures were processed)
        page_image_original = page_image_original_encoded

    return {
        "page_result": page_result,
        "page_image_processed": page_image_processed,
        "page_image_original": page_image_original,
        "page_text": page_text,
        "content_type": content_type,
        "page_fields": page_fields,
        "page_hierarchical_data": page_result.get("hierarchical_data"),
        "page_data": page_data,
        "page_num": page_num,
    }
