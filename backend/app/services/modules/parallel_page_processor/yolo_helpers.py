"""
YOLO signature detection helper methods for ParallelPageProcessor.

This module contains all YOLO-related signature detection functionality:
- _step1_6_yolo_signature_detection: Detect signatures in PyMuPDF image blocks
- _step1_6_yolo_signature_detection_full_page_from_pil: Full page detection from PIL Image
- _step1_6_yolo_signature_detection_full_page: Full page detection from base64 encoded image
"""

import time
import io
import base64
import traceback
import logging
from typing import Dict, List, Any, TYPE_CHECKING

from PIL import Image

if TYPE_CHECKING:
    import fitz
    from ..pdf_processor import PDFProcessor
    from ..yolo_detector import YOLODetector

logger = logging.getLogger(__name__)


def step1_6_yolo_signature_detection(
    yolo_detector: 'YOLODetector',
    pdf_processor: 'PDFProcessor',
    page_num: int,
    image_blocks: List[Dict],
    page: 'fitz.Page'
) -> List[Dict[str, Any]]:
    """
    Stage 1.6: Detect signatures in PyMuPDF image blocks using YOLO

    Only processes if image_blocks exist and YOLO is enabled
    
    Args:
        yolo_detector: YOLO detector instance
        pdf_processor: PDF processor instance for image extraction
        page_num: Zero-based page number
        image_blocks: List of image blocks from PyMuPDF
        page: PyMuPDF page object
        
    Returns:
        List of detected signatures with bbox, confidence, and image_base64
    """
    if not yolo_detector.is_enabled() or not image_blocks or len(image_blocks) == 0:
        return []

    try:
        step_start_time = time.time()
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO detection on {len(image_blocks)} image blocks")

        # Extract image data from blocks
        extraction_start = time.time()
        extracted_blocks = pdf_processor.extract_image_blocks_data(page, image_blocks)
        extraction_time = time.time() - extraction_start
        logger.debug(f"   [Page {page_num + 1}] Image block extraction took {extraction_time:.2f}s")

        if not extracted_blocks:
            logger.debug(f"[Page {page_num + 1}] No image blocks extracted for YOLO detection")
            return []

        # Priority 1: Batch YOLO inference - process all image blocks in a single batch call
        # Extract all images first
        block_images = [block_data["image"] for block_data in extracted_blocks]

        # Run batch YOLO detection on all images at once (much faster than sequential)
        batch_start = time.time()
        try:
            batch_detections = yolo_detector.detect_signatures_in_images_batch(block_images)
            batch_time = time.time() - batch_start
            logger.debug(f"   [Page {page_num + 1}] Batch YOLO detection took {batch_time:.2f}s for {len(block_images)} images")
        except AttributeError as compat_error:
            # Fix: Handle model compatibility errors gracefully
            batch_time = time.time() - batch_start
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ [Page {page_num + 1}] YOLO model compatibility error: {error_msg}")
                logger.error("   YOLO model is incompatible with ultralytics version - skipping signature detection for this page")
                logger.error("   Solutions: Update ultralytics or use compatible model file")
                batch_detections = [[] for _ in block_images]  # Return empty detections
            else:
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection error (AttributeError): {compat_error}")
                batch_detections = [[] for _ in block_images]
        except Exception as yolo_error:
            # Fix: Better error handling for YOLO failures
            batch_time = time.time() - batch_start
            error_type = type(yolo_error).__name__
            error_msg = str(yolo_error)
            logger.warning(f"⚠️ [Page {page_num + 1}] Batch YOLO detection failed ({error_type}): {error_msg}")
            logger.warning(f"   Batch processing took {batch_time:.2f}s before failure")
            logger.warning("   Returning empty detections - signature detection skipped for this page")
            batch_detections = [[] for _ in block_images]  # Return empty detections to prevent cascading failures

        # Process batch results and map back to blocks
        yolo_signatures = []

        for block_idx, (block_data, detections) in enumerate(zip(extracted_blocks, batch_detections)):
            for detection in detections:
                if detection.get("is_signature"):
                    # If YOLO detected signature in this image block, return the block image directly
                    # No need for bbox mapping or cropping - the block IS the signature
                    block_image = block_data["image"]
                    block_bbox = block_data["block_bbox"]  # Block position on page

                    # Encode the image block directly as base64
                    img_buffer = io.BytesIO()
                    block_image.save(img_buffer, format="JPEG", quality=85)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    yolo_signatures.append({
                        "label": "signature",
                        "bbox": block_bbox,  # Block position on page
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url  # Direct image from block
                    })

        step_total_time = time.time() - step_start_time

        if yolo_signatures:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_signatures)} signature(s) in image blocks (total time: {step_total_time:.2f}s)")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no signatures in image blocks (total time: {step_total_time:.2f}s)")

        return yolo_signatures

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO model compatibility error in image block detection: {error_msg}")
            logger.error("   YOLO model is incompatible - signature detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO image block detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        # Fix: Better error logging with full exception details
        error_type = type(e).__name__
        error_msg = str(e) if str(e) else f"{error_type} (no message)"
        error_traceback = traceback.format_exc()
        logger.error(f"❌ Error in YOLO signature detection for page {page_num + 1} ({error_type}): {error_msg}")
        logger.debug(f"   Full traceback:\n{error_traceback}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU or reducing batch size")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []


def step1_6_yolo_signature_detection_full_page_from_pil(
    yolo_detector: 'YOLODetector',
    page_num: int,
    original_image: Image.Image
) -> List[Dict[str, Any]]:
    """
    Stage 1.6 (Full Page): Detect signatures in original unprocessed full page image using YOLO

    Used when LLM indicates signature presence in scanned PDF (IMAGE path)
    Uses the original image BEFORE text enhancement for better signature detection
    
    Args:
        yolo_detector: YOLO detector instance
        page_num: Zero-based page number
        original_image: Original PIL Image of the full page
        
    Returns:
        List of detected signatures with bbox, confidence, and image_base64
    """
    if not yolo_detector.is_enabled() or not original_image:
        return []

    try:
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO detection on ORIGINAL full page image (LLM indicated signature)")
        logger.debug(f"   Original image: size={original_image.size}, mode={original_image.mode}")

        # Run YOLO detection on original unprocessed image
        detections = yolo_detector.detect_signatures_in_image(original_image)

        yolo_signatures = []
        for detection in detections:
            if detection.get("is_signature"):
                # YOLO bbox is relative to original full page image
                yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax] in image coordinates

                if len(yolo_bbox) == 4:
                    # Crop signature from original full page image using YOLO bbox
                    xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                    cropped_signature = original_image.crop((xmin, ymin, xmax, ymax))

                    # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
                    if cropped_signature.mode == "RGBA":
                        # Create a white background
                        rgb_image = Image.new("RGB", cropped_signature.size, (255, 255, 255))
                        rgb_image.paste(cropped_signature, mask=cropped_signature.split()[3])  # Use alpha channel as mask
                        cropped_signature = rgb_image
                    elif cropped_signature.mode != "RGB":
                        cropped_signature = cropped_signature.convert("RGB")

                    # Encode cropped signature as base64
                    img_buffer = io.BytesIO()
                    cropped_signature.save(img_buffer, format="JPEG", quality=85)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    # Get image size for coordinate normalization (if needed)
                    img_width, img_height = original_image.size

                    yolo_signatures.append({
                        "label": "signature",
                        "bbox": yolo_bbox,  # Coordinates relative to original full page image
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url,  # Cropped signature image
                        "image_size": {"width": img_width, "height": img_height}  # For reference
                    })

        if yolo_signatures:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_signatures)} signature(s) in original full page image")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no signatures in original full page image")

        return yolo_signatures

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO model compatibility error in full-page detection: {error_msg}")
            logger.error("   YOLO model is incompatible - signature detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO full-page detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"❌ Error in YOLO full page signature detection for page {page_num + 1} ({error_type}): {error_msg}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []


def step1_6_yolo_signature_detection_full_page(
    yolo_detector: 'YOLODetector',
    page_num: int,
    encoded_image: str
) -> List[Dict[str, Any]]:
    """
    Stage 1.6 (Full Page): Detect signatures in full page image using YOLO (from base64)

    Fallback method when original PIL image is not available
    
    Args:
        yolo_detector: YOLO detector instance
        page_num: Zero-based page number
        encoded_image: Base64 encoded image data (with or without data URL prefix)
        
    Returns:
        List of detected signatures with bbox, confidence, and image_base64
    """
    if not yolo_detector.is_enabled() or not encoded_image:
        return []

    try:
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO detection on full page image (from base64, LLM indicated signature)")

        # Extract base64 data from data URL
        if "base64," in encoded_image:
            base64_data = encoded_image.split("base64,")[1]
        else:
            base64_data = encoded_image

        image_bytes = base64.b64decode(base64_data)
        full_page_image = Image.open(io.BytesIO(image_bytes))

        # Run YOLO detection on full page image
        detections = yolo_detector.detect_signatures_in_image(full_page_image)

        yolo_signatures = []
        for detection in detections:
            if detection.get("is_signature"):
                # YOLO bbox is relative to full page image
                yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax] in image coordinates

                if len(yolo_bbox) == 4:
                    # Crop signature from full page image using YOLO bbox
                    xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                    cropped_signature = full_page_image.crop((xmin, ymin, xmax, ymax))

                    # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
                    if cropped_signature.mode == "RGBA":
                        # Create a white background
                        rgb_image = Image.new("RGB", cropped_signature.size, (255, 255, 255))
                        rgb_image.paste(cropped_signature, mask=cropped_signature.split()[3])  # Use alpha channel as mask
                        cropped_signature = rgb_image
                    elif cropped_signature.mode != "RGB":
                        cropped_signature = cropped_signature.convert("RGB")

                    # Encode cropped signature as base64
                    img_buffer = io.BytesIO()
                    cropped_signature.save(img_buffer, format="JPEG", quality=85)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    # Get image size for coordinate normalization (if needed)
                    img_width, img_height = full_page_image.size

                    yolo_signatures.append({
                        "label": "signature",
                        "bbox": yolo_bbox,  # Coordinates relative to full page image
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url,  # Cropped signature image
                        "image_size": {"width": img_width, "height": img_height}  # For reference
                    })

        if yolo_signatures:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_signatures)} signature(s) in full page image")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no signatures in full page image")

        return yolo_signatures

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO model compatibility error in full-page detection (base64): {error_msg}")
            logger.error("   YOLO model is incompatible - signature detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO full-page detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"❌ Error in YOLO full page signature detection for page {page_num + 1} ({error_type}): {error_msg}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []
