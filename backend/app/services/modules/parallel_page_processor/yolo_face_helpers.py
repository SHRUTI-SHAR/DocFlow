"""
YOLO face detection helper methods for ParallelPageProcessor.

This module contains all YOLO-related face/photo ID detection functionality:
- step1_6_yolo_face_detection: Detect faces/photos in PyMuPDF image blocks
- step1_6_yolo_face_detection_full_page_from_pil: Full page detection from PIL Image
- step1_6_yolo_face_detection_full_page: Full page detection from base64 encoded image
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
    from ..yolo_face_detector import YOLOFaceDetector

logger = logging.getLogger(__name__)


def step1_6_yolo_face_detection(
    face_detector: 'YOLOFaceDetector',
    pdf_processor: 'PDFProcessor',
    page_num: int,
    image_blocks: List[Dict],
    page: 'fitz.Page'
) -> List[Dict[str, Any]]:
    """
    Stage 1.6: Detect faces/photo IDs in PyMuPDF image blocks using YOLO

    Only processes if image_blocks exist and YOLO face detection is enabled
    
    Args:
        face_detector: YOLO face detector instance
        pdf_processor: PDF processor instance for image extraction
        page_num: Zero-based page number
        image_blocks: List of image blocks from PyMuPDF
        page: PyMuPDF page object
        
    Returns:
        List of detected faces with bbox, confidence, and image_base64
    """
    if not face_detector.is_enabled() or not image_blocks or len(image_blocks) == 0:
        return []

    try:
        step_start_time = time.time()
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO face detection on {len(image_blocks)} image blocks")

        # Extract image data from blocks
        extraction_start = time.time()
        extracted_blocks = pdf_processor.extract_image_blocks_data(page, image_blocks)
        extraction_time = time.time() - extraction_start
        logger.debug(f"   [Page {page_num + 1}] Image block extraction took {extraction_time:.2f}s")

        if not extracted_blocks:
            logger.debug(f"[Page {page_num + 1}] No image blocks extracted for YOLO face detection")
            return []

        # Priority 1: Batch YOLO inference - process all image blocks in a single batch call
        # Extract all images first
        block_images = [block_data["image"] for block_data in extracted_blocks]

        # Run batch YOLO detection on all images at once (much faster than sequential)
        batch_start = time.time()
        try:
            batch_detections = face_detector.detect_faces_in_images_batch(block_images)
            batch_time = time.time() - batch_start
            logger.debug(f"   [Page {page_num + 1}] Batch YOLO face detection took {batch_time:.2f}s for {len(block_images)} images")
        except AttributeError as compat_error:
            # Fix: Handle model compatibility errors gracefully
            batch_time = time.time() - batch_start
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ [Page {page_num + 1}] YOLO face model compatibility error: {error_msg}")
                logger.error("   YOLO face model is incompatible with ultralytics version - skipping face detection for this page")
                logger.error("   Solutions: Update ultralytics or use compatible model file")
                batch_detections = [[] for _ in block_images]  # Return empty detections
            else:
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face detection error (AttributeError): {compat_error}")
                batch_detections = [[] for _ in block_images]
        except Exception as yolo_error:
            # Fix: Better error handling for YOLO failures
            batch_time = time.time() - batch_start
            error_type = type(yolo_error).__name__
            error_msg = str(yolo_error)
            logger.warning(f"⚠️ [Page {page_num + 1}] Batch YOLO face detection failed ({error_type}): {error_msg}")
            logger.warning(f"   Batch processing took {batch_time:.2f}s before failure")
            logger.warning("   Returning empty detections - face detection skipped for this page")
            batch_detections = [[] for _ in block_images]  # Return empty detections to prevent cascading failures

        # Process batch results and map back to blocks
        yolo_faces = []

        for block_idx, (block_data, detections) in enumerate(zip(extracted_blocks, batch_detections)):
            for detection in detections:
                if detection.get("is_face"):
                    # If YOLO detected face in this image block, return the block image directly
                    # No need for bbox mapping or cropping - the block IS the face/photo
                    block_image = block_data["image"]
                    block_bbox = block_data["block_bbox"]  # Block position on page

                    # Encode the image block directly as base64
                    img_buffer = io.BytesIO()
                    block_image.save(img_buffer, format="JPEG", quality=85)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    yolo_faces.append({
                        "label": "face",
                        "bbox": block_bbox,  # Block position on page
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url  # Direct image from block
                    })

        step_total_time = time.time() - step_start_time

        if yolo_faces:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_faces)} face(s)/photo(s) in image blocks (total time: {step_total_time:.2f}s)")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no faces/photos in image blocks (total time: {step_total_time:.2f}s)")

        return yolo_faces

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO face model compatibility error in image block detection: {error_msg}")
            logger.error("   YOLO face model is incompatible - face detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face image block detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        # Fix: Better error logging with full exception details
        error_type = type(e).__name__
        error_msg = str(e) if str(e) else f"{error_type} (no message)"
        error_traceback = traceback.format_exc()
        logger.error(f"❌ Error in YOLO face detection for page {page_num + 1} ({error_type}): {error_msg}")
        logger.debug(f"   Full traceback:\n{error_traceback}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU or reducing batch size")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []


def step1_6_yolo_face_detection_full_page_from_pil(
    face_detector: 'YOLOFaceDetector',
    page_num: int,
    original_image: Image.Image
) -> List[Dict[str, Any]]:
    """
    Stage 1.6 (Full Page): Detect faces/photo IDs in original unprocessed full page image using YOLO

    Used when LLM indicates photo presence in scanned PDF (IMAGE path)
    Uses the original image BEFORE text enhancement for better face detection
    
    Args:
        face_detector: YOLO face detector instance
        page_num: Zero-based page number
        original_image: Original PIL Image of the full page
        
    Returns:
        List of detected faces with bbox, confidence, and image_base64
    """
    if not face_detector.is_enabled() or not original_image:
        return []

    try:
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO face detection on ORIGINAL full page image")
        logger.debug(f"   Original image: size={original_image.size}, mode={original_image.mode}")

        # Run YOLO detection on original unprocessed image
        detections = face_detector.detect_faces_in_image(original_image)

        yolo_faces = []
        for detection in detections:
            if detection.get("is_face"):
                # YOLO bbox is relative to original full page image
                yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax] in image coordinates

                if len(yolo_bbox) == 4:
                    # Expand bbox to capture the full photo ID, not just the face
                    # Photo IDs typically have the face in the upper portion with info below
                    xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                    
                    # Calculate face dimensions
                    face_width = xmax - xmin
                    face_height = ymax - ymin
                    
                    # Expand the crop area significantly to get the full photo ID region
                    # Expand: 50% left/right, 30% top, 110% bottom (to capture ID info below face)
                    expand_left = int(face_width * 0.5)
                    expand_right = int(face_width * 0.5)
                    expand_top = int(face_height * 0.3)
                    expand_bottom = int(face_height * 1.1)  # More expansion below for ID details
                    
                    # Apply expansion with bounds checking
                    img_width, img_height = original_image.size
                    crop_xmin = max(0, xmin - expand_left)
                    crop_ymin = max(0, ymin - expand_top)
                    crop_xmax = min(img_width, xmax + expand_right)
                    crop_ymax = min(img_height, ymax + expand_bottom)
                    
                    # Crop expanded region from original full page image
                    cropped_photo = original_image.crop((crop_xmin, crop_ymin, crop_xmax, crop_ymax))

                    # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
                    if cropped_photo.mode == "RGBA":
                        # Create a white background
                        rgb_image = Image.new("RGB", cropped_photo.size, (255, 255, 255))
                        rgb_image.paste(cropped_photo, mask=cropped_photo.split()[3])  # Use alpha channel as mask
                        cropped_photo = rgb_image
                    elif cropped_photo.mode != "RGB":
                        cropped_photo = cropped_photo.convert("RGB")

                    # Encode cropped photo region as base64
                    img_buffer = io.BytesIO()
                    cropped_photo.save(img_buffer, format="JPEG", quality=90)  # Higher quality for photos
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    yolo_faces.append({
                        "label": "Photo ID",
                        "bbox": [crop_xmin, crop_ymin, crop_xmax, crop_ymax],  # Expanded bbox
                        "face_bbox": yolo_bbox,  # Original face bbox for reference
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url,  # Expanded photo region
                        "image_size": {"width": img_width, "height": img_height}  # Full page size for reference
                    })

        if yolo_faces:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_faces)} face(s)/photo(s) in original full page image")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no faces/photos in original full page image")

        return yolo_faces

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO face model compatibility error in full-page detection: {error_msg}")
            logger.error("   YOLO face model is incompatible - face detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face full-page detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"❌ Error in YOLO full page face detection for page {page_num + 1} ({error_type}): {error_msg}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []


def step1_6_yolo_face_detection_full_page(
    face_detector: 'YOLOFaceDetector',
    page_num: int,
    encoded_image: str
) -> List[Dict[str, Any]]:
    """
    Stage 1.6 (Full Page): Detect faces/photo IDs in full page image using YOLO (from base64)

    Fallback method when original PIL image is not available
    
    Args:
        face_detector: YOLO face detector instance
        page_num: Zero-based page number
        encoded_image: Base64 encoded image data (with or without data URL prefix)
        
    Returns:
        List of detected faces with bbox, confidence, and image_base64
    """
    if not face_detector.is_enabled() or not encoded_image:
        return []

    try:
        logger.debug(f"🔍 [Page {page_num + 1}] Running YOLO face detection on full page image (from base64)")

        # Extract base64 data from data URL
        if "base64," in encoded_image:
            base64_data = encoded_image.split("base64,")[1]
        else:
            base64_data = encoded_image

        image_bytes = base64.b64decode(base64_data)
        full_page_image = Image.open(io.BytesIO(image_bytes))

        # Run YOLO detection on full page image
        detections = face_detector.detect_faces_in_image(full_page_image)

        yolo_faces = []
        for detection in detections:
            if detection.get("is_face"):
                # YOLO bbox is relative to full page image
                yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax] in image coordinates

                if len(yolo_bbox) == 4:
                    # Expand bbox to capture the full photo ID, not just the face
                    xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                    
                    # Calculate face dimensions
                    face_width = xmax - xmin
                    face_height = ymax - ymin
                    
                    # Expand the crop area significantly to get the full photo ID region
                    expand_left = int(face_width * 0.5)
                    expand_right = int(face_width * 0.5)
                    expand_top = int(face_height * 0.3)
                    expand_bottom = int(face_height * 1.1)
                    
                    # Apply expansion with bounds checking
                    img_width, img_height = full_page_image.size
                    crop_xmin = max(0, xmin - expand_left)
                    crop_ymin = max(0, ymin - expand_top)
                    crop_xmax = min(img_width, xmax + expand_right)
                    crop_ymax = min(img_height, ymax + expand_bottom)
                    
                    # Crop expanded region from full page image
                    cropped_photo = full_page_image.crop((crop_xmin, crop_ymin, crop_xmax, crop_ymax))

                    # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
                    if cropped_photo.mode == "RGBA":
                        # Create a white background
                        rgb_image = Image.new("RGB", cropped_photo.size, (255, 255, 255))
                        rgb_image.paste(cropped_photo, mask=cropped_photo.split()[3])  # Use alpha channel as mask
                        cropped_photo = rgb_image
                    elif cropped_photo.mode != "RGB":
                        cropped_photo = cropped_photo.convert("RGB")

                    # Encode cropped photo region as base64
                    img_buffer = io.BytesIO()
                    cropped_photo.save(img_buffer, format="JPEG", quality=90)
                    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                    image_data_url = f"data:image/jpeg;base64,{img_base64}"

                    yolo_faces.append({
                        "label": "Photo ID",
                        "bbox": [crop_xmin, crop_ymin, crop_xmax, crop_ymax],
                        "face_bbox": yolo_bbox,
                        "confidence": detection.get("confidence", 0.5),
                        "source": "yolo",
                        "image_base64": image_data_url,
                        "image_size": {"width": img_width, "height": img_height}
                    })

        if yolo_faces:
            logger.debug(f"✅ [Page {page_num + 1}] YOLO detected {len(yolo_faces)} face(s)/photo(s) in full page image")
        else:
            logger.debug(f"[Page {page_num + 1}] YOLO found no faces/photos in full page image")

        return yolo_faces

    except AttributeError as compat_error:
        # Fix: Handle model compatibility errors specifically
        error_msg = str(compat_error)
        if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
            logger.error(f"❌ [Page {page_num + 1}] YOLO face model compatibility error in full-page detection (base64): {error_msg}")
            logger.error("   YOLO face model is incompatible - face detection skipped for this page")
            return []
        else:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face full-page detection error (AttributeError): {compat_error}")
            return []
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        logger.error(f"❌ Error in YOLO full page face detection for page {page_num + 1} ({error_type}): {error_msg}")
        # Check for specific error types
        if "cuda" in error_msg.lower() and "out of memory" in error_msg.lower():
            logger.warning("   CUDA OOM - consider using CPU")
        elif "timeout" in error_msg.lower():
            logger.warning("   Timeout - YOLO processing took too long")
        return []
