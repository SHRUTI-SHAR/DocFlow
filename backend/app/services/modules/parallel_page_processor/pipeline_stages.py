"""
Pipeline stages for the ParallelPageProcessor.

Contains methods for the later stages of the processing pipeline:
- step8_parse_response: Response parsing
- step9_process_signatures: Signature processing with YOLO results
- process_encoding_and_llm: Encoding and LLM call processing
"""

import time
import logging
from typing import Dict, Any, TYPE_CHECKING
from concurrent.futures import CancelledError

from PIL import Image

if TYPE_CHECKING:
    from ..pdf_processor import PDFProcessor
    from ..yolo_detector import YOLODetector
    from ...llm import GeminiClient
    from ...prompts import PromptService

logger = logging.getLogger(__name__)


def step8_parse_response(
    llm_client: 'GeminiClient',
    prompt_service: 'PromptService',
    page_num: int,
    page_result: Dict[str, Any],
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 8: Response parsing - Convert hierarchical data to fields if needed.
    
    Args:
        llm_client: LLM client instance
        prompt_service: Prompt service instance
        page_num: Zero-based page number
        page_result: Result from LLM API call
        context: Processing context with task info
        
    Returns:
        Dictionary with page_fields, page_hierarchical_data, and page_data
    """
    task = context.get("task")
    page_fields = page_result.get("fields", [])

    # Convert hierarchical_data to fields if needed
    if task in ["field_detection", "form_creation"] and not page_fields and page_result.get("hierarchical_data"):
        page_hierarchical_data = page_result.get("hierarchical_data")
        from ..pdf_processing_service import PDFProcessingService
        temp_service = PDFProcessingService(llm_client, prompt_service)
        page_fields = temp_service._convert_hierarchical_to_fields(page_hierarchical_data, page_num + 1)

    return {
        "page_fields": page_fields,
        "page_hierarchical_data": page_result.get("hierarchical_data"),
        "page_data": page_result.get("_parsed", {})
    }


def step9_process_signatures(
    pdf_processor: 'PDFProcessor',
    yolo_detector: 'YOLODetector',
    page_num: int,
    page_data: Dict[str, Any],
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 9: Signature processing - uses only YOLO signatures.
    
    Args:
        pdf_processor: PDF processor instance for image encoding
        yolo_detector: YOLO detector instance
        page_num: Zero-based page number
        page_data: Page data dictionary containing LLM result and images
        context: Processing context with YOLO futures
        
    Returns:
        Dictionary with processed page result including signatures
    """
    page_result = page_data.get("llm_result", {})
    page_data_parsed = page_data.get("page_data", {})

    # Early return if YOLO is disabled - skip all signature processing overhead
    if not yolo_detector.is_enabled():
        logger.debug(f"[Page {page_num + 1}] YOLO signature detection disabled - skipping signature processing")
        # Return minimal result without signature processing
        original_img = page_data.get("original_img")
        page_image_original = None
        if original_img:
            page_image_original = pdf_processor._encode_image_simple(original_img)

        return {
            "page_result": page_result,
            "page_image_processed": page_data.get("encoded_image"),
            "page_image_original": page_image_original,
            "page_fields": page_data.get("page_fields", []),
            "page_hierarchical_data": page_data.get("page_hierarchical_data"),
            "page_data": page_data_parsed,
            "page_num": page_num,
        }

    # Check if YOLO detection is still running (for both TEXT and IMAGE paths)
    # Wait for it to complete if it's running
    content_type = page_data.get("content_type", "text")
    stage1_6_futures = context.get("stage1_6_futures", {})

    # Check if there's a pending YOLO detection for this page (image blocks for TEXT path, full page for IMAGE path)
    if stage1_6_futures:
        # Find the future for this page
        yolo_future = None
        for future, future_page_num in stage1_6_futures.items():
            if future_page_num == page_num:
                yolo_future = future
                break

        if yolo_future:
            if not yolo_future.done():
                yolo_type = "full-page" if content_type == "image" else "image block"
                logger.debug(f"⏳ [Page {page_num + 1}] Waiting for {yolo_type} YOLO detection to complete...")
                try:
                    # Fix: Increased timeout from 30s to 60s for batch processing
                    # Batch YOLO can take longer than individual detection
                    yolo_signatures = yolo_future.result(timeout=60)
                    page_data["yolo_signatures"] = yolo_signatures
                    logger.debug(f"✅ [Page {page_num + 1}] {yolo_type.capitalize()} YOLO detection completed")
                except Exception as e:
                    # Fix: Better error messages with exception type
                    error_msg = str(e) if str(e) else f"{type(e).__name__} (no message)"
                    if "timeout" in error_msg.lower() or isinstance(e, TimeoutError):
                        logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection timed out after 60s (batch processing may be slow)")
                    else:
                        logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection failed: {error_msg}")
                    page_data["yolo_signatures"] = []
            else:
                # Future is already done, but signatures might not be in page_data yet
                # Try to get result directly from future
                try:
                    if yolo_future.cancelled():
                        logger.debug(f"⚠️ [Page {page_num + 1}] YOLO future was cancelled")
                        page_data["yolo_signatures"] = []
                    else:
                        yolo_signatures = yolo_future.result()
                        if yolo_signatures and not page_data.get("yolo_signatures"):
                            page_data["yolo_signatures"] = yolo_signatures
                            logger.debug(f"✅ [Page {page_num + 1}] Retrieved YOLO signatures from completed future")
                except CancelledError:
                    logger.debug(f"⚠️ [Page {page_num + 1}] YOLO future was cancelled")
                    page_data["yolo_signatures"] = []
                except Exception as e:
                    # Fix: Better error logging
                    error_msg = str(e) if str(e) else f"{type(e).__name__} (no message)"
                    logger.debug(f"⚠️ [Page {page_num + 1}] Could not get YOLO result from future: {error_msg}")
                    page_data["yolo_signatures"] = []

    # Get YOLO signatures (if any)
    # Check both in page_data (if already stored) and wait for any pending futures
    yolo_signatures = page_data.get("yolo_signatures", [])

    page_image_original_encoded = None
    all_signatures = []

    # Use only YOLO signatures - no LLM signature detection
    if yolo_signatures:
        all_signatures = yolo_signatures.copy()
        logger.debug(f"✅ [Page {page_num + 1}] Using {len(all_signatures)} YOLO-detected signature(s)")
    else:
        logger.debug(f"[Page {page_num + 1}] No YOLO signatures detected")

    # Process signatures if we have any
    if all_signatures:
        # YOLO signatures already have image_base64 from the image block
        # No need to crop from full page - the block image IS the signature
        processed_signatures = []
        for sig in all_signatures:
            # YOLO signatures already have image_base64, just use them directly
            if sig.get("image_base64"):
                processed_signatures.append(sig)
            else:
                # Fallback: if somehow image_base64 is missing, log warning
                logger.warning(f"⚠️ [Page {page_num + 1}] Signature missing image_base64: {sig}")
                processed_signatures.append(sig)

        # Update page data with signatures
        page_data_parsed["signatures"] = processed_signatures
        page_result["_parsed"] = page_data_parsed

        if isinstance(page_result, dict) and "hierarchical_data" in page_result:
            page_hierarchical_data = page_result.get("hierarchical_data")
            if isinstance(page_hierarchical_data, dict):
                # Always add signatures to hierarchical_data (create key if needed)
                page_hierarchical_data["signatures"] = processed_signatures

        page_fields = page_data.get("page_fields", [])
        for field in page_fields:
            if field.get("label") == "signatures":
                field["value"] = processed_signatures
                break

        logger.debug(f"✅ Processed {len(processed_signatures)} YOLO-detected signature(s) on page {page_num + 1} (direct from image blocks)")

        # Create debug image with YOLO bboxes drawn ONLY for IMAGE path (scanned PDFs/image documents)
        # Skip debug images for TEXT path (text-based PDFs)
        content_type = page_data.get("content_type", "text")

        if content_type == "image" and processed_signatures:
            # Only create debug images for scanned PDFs/image documents
            original_img = page_data.get("original_img")

            if original_img:
                try:
                    # Create a copy of the original image to draw on
                    debug_img = original_img.copy()

                    # Draw all YOLO bboxes on the image
                    for i, sig in enumerate(processed_signatures):
                        bbox = sig.get('bbox', [])
                        if len(bbox) == 4:
                            # Draw bbox on debug image
                            pdf_processor._draw_bbox_on_image(debug_img, bbox)
                            logger.debug(f"🔍 [Page {page_num + 1}] Drew YOLO bbox {i+1}/{len(processed_signatures)}: {bbox}")

                    # Encode debug image
                    debug_data_url = pdf_processor._encode_image_simple(debug_img)

                    # Store debug image by page number (1-indexed)
                    pdf_processor._debug_images_by_page[page_num + 1] = debug_data_url
                    logger.debug(f"🔍 [Page {page_num + 1}] Created debug image with {len(processed_signatures)} YOLO bbox(es) drawn (IMAGE path)")
                except Exception as e:
                    logger.warning(f"⚠️ [Page {page_num + 1}] Failed to create debug image with YOLO bboxes: {e}")
            else:
                logger.debug(f"🔍 [Page {page_num + 1}] Skipping debug image - original_img not available (IMAGE path)")
        else:
            logger.debug(f"🔍 [Page {page_num + 1}] Skipping debug image - content_type is '{content_type}' (only creating for IMAGE path)")

    # ==========================================================================
    # FACE DETECTION PROCESSING
    # ==========================================================================
    # Check for face detection futures
    stage1_6_face_futures = context.get("stage1_6_face_futures", {})
    
    # Wait for face detection to complete if running
    if stage1_6_face_futures:
        face_future = None
        for future, future_page_num in stage1_6_face_futures.items():
            if future_page_num == page_num:
                face_future = future
                break

        if face_future:
            if not face_future.done():
                logger.debug(f"⏳ [Page {page_num + 1}] Waiting for face detection to complete...")
                try:
                    yolo_faces = face_future.result(timeout=60)
                    page_data["yolo_faces"] = yolo_faces
                    logger.debug(f"✅ [Page {page_num + 1}] Face detection completed")
                except Exception as e:
                    error_msg = str(e) if str(e) else f"{type(e).__name__} (no message)"
                    logger.warning(f"⚠️ [Page {page_num + 1}] Face detection failed: {error_msg}")
                    page_data["yolo_faces"] = []
            else:
                # Future is already done
                try:
                    if not face_future.cancelled():
                        yolo_faces = face_future.result()
                        if yolo_faces and not page_data.get("yolo_faces"):
                            page_data["yolo_faces"] = yolo_faces
                            logger.debug(f"✅ [Page {page_num + 1}] Retrieved YOLO faces from completed future")
                except Exception as e:
                    logger.debug(f"⚠️ [Page {page_num + 1}] Could not get face result from future: {e}")
                    page_data["yolo_faces"] = []

    # Process faces if we have any
    yolo_faces = page_data.get("yolo_faces", [])
    if yolo_faces:
        processed_faces = []
        for face in yolo_faces:
            if face.get("image_base64"):
                processed_faces.append(face)
            else:
                logger.warning(f"⚠️ [Page {page_num + 1}] Face missing image_base64: {face}")
                processed_faces.append(face)

        # Update page data with faces
        page_data_parsed["faces"] = processed_faces
        page_result["_parsed"] = page_data_parsed

        if isinstance(page_result, dict) and "hierarchical_data" in page_result:
            page_hierarchical_data = page_result.get("hierarchical_data")
            if isinstance(page_hierarchical_data, dict):
                # Add faces to hierarchical_data
                page_hierarchical_data["faces"] = processed_faces

        page_fields = page_data.get("page_fields", [])
        for field in page_fields:
            if field.get("label") == "faces":
                field["value"] = processed_faces
                break

        logger.debug(f"✅ Processed {len(processed_faces)} YOLO-detected face(s) on page {page_num + 1}")

    # Encode original image if not already encoded
    if page_image_original_encoded is None:
        original_img = page_data.get("original_img")
        if original_img:
            page_image_original = pdf_processor._encode_image_simple(original_img)
        else:
            page_image_original = None
    else:
        page_image_original = page_image_original_encoded

    return {
        "page_result": page_result,
        "page_image_processed": page_data.get("encoded_image"),
        "page_image_original": page_image_original,
        "page_fields": page_data.get("page_fields", []),
        "page_hierarchical_data": page_data.get("page_hierarchical_data"),
        "page_data": page_data_parsed,
        "page_num": page_num,
    }


def process_encoding_and_llm(
    pdf_processor: 'PDFProcessor',
    llm_client: 'GeminiClient',
    prompt_service: 'PromptService',
    page_num: int,
    page_image_processed_pil: Image.Image,
    page_image_original_pil: Image.Image,
    pdf_data: str,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process encoding and LLM call for a single page.
    This runs in a separate thread pool stage, allowing pipeline parallelism.
    
    Args:
        pdf_processor: PDF processor instance
        llm_client: LLM client instance
        prompt_service: Prompt service instance
        page_num: Zero-based page number
        page_image_processed_pil: Processed PIL Image
        page_image_original_pil: Original PIL Image
        pdf_data: Base64 encoded PDF data
        context: Processing context
        
    Returns:
        Dictionary with page results including fields and signatures
    """
    task = context.get("task")
    document_name = context.get("document_name", "Unknown")
    templates = context.get("templates")
    db_templates = context.get("db_templates")

    # Encode processed image to base64
    encoding_start = time.time()
    page_image_processed = pdf_processor._encode_image_simple(page_image_processed_pil)
    encoding_duration = time.time() - encoding_start
    logger.debug(f"📸 [Page {page_num + 1}] Image encoded to base64 in {encoding_duration:.2f}s")

    logger.info(f"✅ [Page {page_num + 1}] Ready for LLM call (encoding: {encoding_duration:.2f}s)")

    # Get prompt for this task (image-based extraction)
    prompt, response_format = prompt_service.get_task_prompt(task, templates, db_templates, content_type="image")

    # Call LLM API synchronously
    llm_start_time = time.time()
    logger.info(f"🤖 [Page {page_num + 1}] Starting LLM API call")
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
        from ..pdf_processing_service import PDFProcessingService
        temp_service = PDFProcessingService(llm_client, prompt_service)
        page_fields = temp_service._convert_hierarchical_to_fields(page_hierarchical_data, page_num + 1)

    # Process signatures if present
    page_image_original_encoded = None
    page_data = page_result.get("_parsed", {})

    if task == "without_template_extraction" and page_data and "signatures" in page_data and isinstance(page_data["signatures"], list):
        logger.info(f"🔍 Found {len(page_data['signatures'])} signatures on page {page_num + 1}")
        logger.debug(f"📸 Encoding original image for signature cropping (lazy encoding)")
        page_image_original_encoded = pdf_processor._encode_image_simple(page_image_original_pil)

        llm_image_size = page_data.get("image_size", {})
        llm_width = llm_image_size.get("width", 848)
        llm_height = llm_image_size.get("height", 1200)
        actual_width, actual_height = 2480, 3508
        scale_x = actual_width / llm_width
        scale_y = actual_height / llm_height

        if abs(scale_x - scale_y) / max(scale_x, scale_y) < 0.01:
            avg_scale = (scale_x + scale_y) / 2
            scale_x = scale_y = avg_scale

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

        cropped_signatures = pdf_processor.crop_signatures_from_page(
            page_image_original_encoded, converted_signatures, create_debug_image=True, page_number=page_num + 1
        )

        page_data["signatures"] = cropped_signatures
        page_result["_parsed"] = page_data

        if isinstance(page_result, dict) and "hierarchical_data" in page_result:
            page_hierarchical_data = page_result.get("hierarchical_data")
            if isinstance(page_hierarchical_data, dict) and "signatures" in page_hierarchical_data:
                page_hierarchical_data["signatures"] = cropped_signatures

        for field in page_fields:
            if field.get("label") == "signatures":
                field["value"] = cropped_signatures
                break

        logger.info(f"✅ Processed {len(cropped_signatures)} signatures on page {page_num + 1}")

    # Encode original image if not already encoded
    if page_image_original_encoded is None:
        page_image_original = pdf_processor._encode_image_simple(page_image_original_pil)
    else:
        page_image_original = page_image_original_encoded

    return {
        "page_result": page_result,
        "page_image_processed": page_image_processed,
        "page_image_original": page_image_original,
        "page_fields": page_fields,
        "page_hierarchical_data": page_result.get("hierarchical_data"),
        "page_data": page_data,
        "page_num": page_num,
    }
