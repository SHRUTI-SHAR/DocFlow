"""
Async utility functions for ParallelPageProcessor.

Contains async helper functions for:
- PDF page to image conversion (async wrapper)
- Page content extraction (text + images, async wrapper)
"""

import asyncio
import time
import logging
from typing import Dict, Any, Optional, TYPE_CHECKING
from concurrent.futures import ThreadPoolExecutor

if TYPE_CHECKING:
    from ..pdf_processor import PDFProcessor

logger = logging.getLogger(__name__)


async def convert_page_to_image_async(
    pdf_processor: 'PDFProcessor',
    pdf_data: str,
    page_num: int,
    thread_pool: ThreadPoolExecutor,
    max_retries: int = 1
) -> Optional[Dict[str, Any]]:
    """
    Async wrapper for PDF page to image conversion with retry logic.
    
    Runs the CPU-intensive PDF conversion in a thread pool to avoid
    blocking the async event loop.
    
    Args:
        pdf_processor: PDFProcessor instance
        pdf_data: Base64 encoded PDF data
        page_num: Zero-based page number to convert
        thread_pool: ThreadPoolExecutor to run blocking operation in
        max_retries: Number of retry attempts on failure (default: 1)
        
    Returns:
        Dictionary with 'processed' and 'original' PIL Image objects,
        or None if conversion fails after all retries.
    """
    loop = asyncio.get_event_loop()
    start_time = time.time()
    
    for attempt in range(max_retries + 1):
        try:
            result = await loop.run_in_executor(
                thread_pool,
                pdf_processor.convert_pdf_page_to_image,
                pdf_data,
                page_num
            )
            
            duration = time.time() - start_time
            if result:
                logger.debug(f"📄 [Page {page_num + 1}] Converted to image in {duration:.2f}s")
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            error_type = type(e).__name__
            
            if attempt < max_retries:
                logger.warning(
                    f"⚠️ [Page {page_num + 1}] Image conversion failed (attempt {attempt + 1}/{max_retries + 1}): "
                    f"{error_type}: {str(e)}"
                )
                # Brief delay before retry
                await asyncio.sleep(0.1 * (attempt + 1))
            else:
                logger.error(
                    f"❌ [Page {page_num + 1}] Image conversion failed after {max_retries + 1} attempts "
                    f"({duration:.2f}s): {error_type}: {str(e)}"
                )
                return None
    
    return None


async def extract_page_content_async(
    pdf_processor: 'PDFProcessor',
    pdf_data: str,
    page_num: int,
    thread_pool: ThreadPoolExecutor,
    prefer_text: bool = True,
    text_confidence_threshold: float = 0.6,
    max_retries: int = 1
) -> Dict[str, Any]:
    """
    Async wrapper for extracting page content (text or image).
    
    First attempts text extraction if preferred and confidence is high enough.
    Falls back to image conversion if text extraction is not viable.
    
    Args:
        pdf_processor: PDFProcessor instance
        pdf_data: Base64 encoded PDF data
        page_num: Zero-based page number
        thread_pool: ThreadPoolExecutor to run blocking operations in
        prefer_text: Whether to prefer text extraction over image (default: True)
        text_confidence_threshold: Minimum confidence for text extraction (default: 0.6)
        max_retries: Number of retry attempts on failure (default: 1)
        
    Returns:
        Dictionary containing:
            - content_type: "text" or "image"
            - text: Extracted text (if content_type is "text")
            - processed: Processed PIL Image (if content_type is "image")
            - original: Original PIL Image (if content_type is "image")
            - text_data: Full text extraction data (if attempted)
            - image_blocks: PyMuPDF image blocks (if content_type is "text")
    """
    loop = asyncio.get_event_loop()
    start_time = time.time()
    result = {
        "content_type": "image",
        "text": None,
        "processed": None,
        "original": None,
        "text_data": None,
        "image_blocks": None,
    }
    
    # Try text extraction first if preferred
    if prefer_text:
        try:
            text_data = await loop.run_in_executor(
                thread_pool,
                pdf_processor.extract_text_from_page,
                pdf_data,
                page_num
            )
            
            result["text_data"] = text_data
            
            if (text_data and 
                text_data.get("is_selectable") and 
                text_data.get("confidence", 0) >= text_confidence_threshold):
                
                duration = time.time() - start_time
                result["content_type"] = "text"
                result["text"] = text_data.get("text", "")
                result["image_blocks"] = text_data.get("image_blocks", [])
                
                logger.info(
                    f"✅ [Page {page_num + 1}] Using TEXT extraction "
                    f"(confidence: {text_data['confidence']:.2f}, {duration:.2f}s)"
                )
                return result
                
        except Exception as e:
            logger.warning(f"⚠️ [Page {page_num + 1}] Text extraction failed: {type(e).__name__}: {str(e)}")
    
    # Fall back to image conversion
    images = await convert_page_to_image_async(
        pdf_processor, pdf_data, page_num, thread_pool, max_retries
    )
    
    if images:
        duration = time.time() - start_time
        result["content_type"] = "image"
        result["processed"] = images.get("processed")
        result["original"] = images.get("original")
        logger.info(f"📷 [Page {page_num + 1}] Using IMAGE extraction ({duration:.2f}s)")
    else:
        logger.error(f"❌ [Page {page_num + 1}] Failed to extract content (both text and image)")
    
    return result
