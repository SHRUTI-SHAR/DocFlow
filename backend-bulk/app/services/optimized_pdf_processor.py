"""
Optimized PDF Processor for Bulk Processing
Handles parallel PDF to image conversion
"""

import fitz  # PyMuPDF
import base64
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from typing import List, Optional, Dict, Any
from PIL import Image
import io

logger = logging.getLogger(__name__)


class OptimizedPDFProcessor:
    """
    Streamlined PDF processor optimized for bulk operations
    
    Key optimizations:
    - Parallel page conversion (uses all CPU cores)
    - Efficient memory management
    - Target: < 10 seconds for 60-page PDF
    """
    
    def __init__(self, max_workers: int = 16):
        """
        Initialize PDF processor
        
        Args:
            max_workers: Maximum parallel workers for page conversion
                        (default: 16 cores, adjust based on server)
        """
        self.max_workers = max_workers
        # Use ProcessPoolExecutor for true parallelism (not limited by GIL)
        self.executor = ProcessPoolExecutor(max_workers=max_workers)
        
        # Image conversion settings (optimized for LLM)
        self.dpi = 200  # Good quality, reasonable size
        self.zoom = self.dpi / 72.0  # PyMuPDF zoom factor
        
        logger.info(f"📄 OptimizedPDFProcessor initialized with {max_workers} workers")
    
    def shutdown(self):
        """Shutdown executor on cleanup"""
        self.executor.shutdown(wait=True)
        logger.info("OptimizedPDFProcessor executor shutdown")
    
    async def convert_pdf_to_images(
        self,
        pdf_data: str,
        start_page: int = 0,
        end_page: Optional[int] = None
    ) -> List[str]:
        """
        Convert PDF pages to base64-encoded images in parallel
        
        Args:
            pdf_data: Base64-encoded PDF data (or data URL)
            start_page: First page to convert (0-indexed)
            end_page: Last page to convert (exclusive, None = all pages)
            
        Returns:
            List of base64-encoded PNG images
            
        Performance:
            60 pages with 16 workers = ~6 seconds
        """
        import time
        start_time = time.time()
        
        # Decode PDF data
        pdf_bytes = self._decode_pdf(pdf_data)
        if not pdf_bytes:
            logger.error("Failed to decode PDF data")
            return []
        
        # Get page count
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_pages = len(doc)
            doc.close()
        except Exception as e:
            logger.error(f"Failed to open PDF: {e}")
            return []
        
        # Determine page range
        if end_page is None:
            end_page = total_pages
        else:
            end_page = min(end_page, total_pages)
        
        pages_to_convert = list(range(start_page, end_page))
        num_pages = len(pages_to_convert)
        
        logger.info(f"📄 Converting {num_pages} pages (pages {start_page}-{end_page-1}) in parallel")
        
        # Convert all pages in parallel
        loop = asyncio.get_event_loop()
        
        tasks = [
            loop.run_in_executor(
                self.executor,
                self._convert_single_page,
                pdf_bytes,
                page_num
            )
            for page_num in pages_to_convert
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        images = []
        failed_pages = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Failed to convert page {pages_to_convert[i]}: {result}")
                failed_pages.append(pages_to_convert[i])
            elif result:
                images.append(result)
        
        elapsed = time.time() - start_time
        
        logger.info(
            f"✅ Converted {len(images)}/{num_pages} pages in {elapsed:.2f}s "
            f"({len(failed_pages)} failed)"
        )
        
        return images
    
    @staticmethod
    def _convert_single_page(pdf_bytes: bytes, page_num: int) -> Optional[str]:
        """
        Convert a single PDF page to base64-encoded PNG image
        
        This runs in a separate process (via ProcessPoolExecutor)
        so it needs to be a static method
        
        Args:
            pdf_bytes: PDF file bytes
            page_num: Page number to convert (0-indexed)
            
        Returns:
            Base64-encoded PNG image or None on error
        """
        try:
            # Open PDF (each process opens its own copy)
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            # Get page
            if page_num >= len(doc):
                return None
            
            page = doc[page_num]
            
            # Convert to image
            zoom = 200 / 72.0  # 200 DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            
            # Convert to PNG bytes
            img_bytes = pix.pil_tobytes(format="PNG")
            
            # Encode to base64
            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
            
            doc.close()
            
            return img_base64
            
        except Exception as e:
            logger.error(f"Error converting page {page_num}: {e}")
            return None
    
    def _decode_pdf(self, pdf_data: str) -> Optional[bytes]:
        """
        Decode base64 PDF data
        
        Args:
            pdf_data: Base64-encoded PDF (with or without data URL prefix)
            
        Returns:
            PDF bytes or None
        """
        try:
            # Remove data URL prefix if present
            if pdf_data.startswith('data:'):
                # Format: data:application/pdf;base64,<base64_data>
                pdf_data = pdf_data.split(',', 1)[1]
            
            # Decode base64
            pdf_bytes = base64.b64decode(pdf_data)
            
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Failed to decode PDF data: {e}")
            return None
    
    def get_page_count(self, pdf_data: str) -> int:
        """
        Get number of pages in PDF
        
        Args:
            pdf_data: Base64-encoded PDF data
            
        Returns:
            Number of pages or 0 on error
        """
        pdf_bytes = self._decode_pdf(pdf_data)
        if not pdf_bytes:
            return 0
        
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(doc)
            doc.close()
            return page_count
        except Exception as e:
            logger.error(f"Failed to get page count: {e}")
            return 0


# Global instance (singleton pattern)
_pdf_processor: Optional[OptimizedPDFProcessor] = None


def get_pdf_processor() -> OptimizedPDFProcessor:
    """
    Get or create the global OptimizedPDFProcessor instance
    
    Usage in workers:
        processor = get_pdf_processor()
        images = await processor.convert_pdf_to_images(pdf_data)
    """
    global _pdf_processor
    
    if _pdf_processor is None:
        _pdf_processor = OptimizedPDFProcessor(max_workers=16)
    
    return _pdf_processor


def shutdown_pdf_processor():
    """
    Shutdown PDF processor on application cleanup
    """
    global _pdf_processor
    
    if _pdf_processor:
        _pdf_processor.shutdown()
        _pdf_processor = None
        logger.info("OptimizedPDFProcessor shutdown complete")
