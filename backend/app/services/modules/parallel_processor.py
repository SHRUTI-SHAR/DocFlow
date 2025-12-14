"""
Parallel Page Processor Module
Handles concurrent processing of PDF pages using async concurrency

This module is the main entry point for parallel page processing.
The implementation is split into several sub-modules for maintainability:
- parallel_page_processor/config.py: Configuration constants
- parallel_page_processor/async_utils.py: Async helper functions
- parallel_page_processor/yolo_helpers.py: YOLO signature detection helpers
- parallel_page_processor/pipeline_stages.py: Step 8, 9, and encoding/LLM stages
- parallel_page_processor/callbacks.py: Pipeline callback factory
- parallel_page_processor/page_methods.py: Per-page processing methods
"""

import asyncio
import logging
import time
import hashlib
import base64
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Dict, Any, List, Optional, Callable
from PIL import Image
import fitz  # PyMuPDF
from ..pdf_processor import PDFProcessor
from .llm_client import LLMClient
from .prompt_service import PromptService
from .yolo_signature_detector import YOLOSignatureDetector
from .yolo_face_detector import YOLOFaceDetector
from ...core.config import settings

# Import from modular package
from .parallel_page_processor import (
    config as pp_config,
    step1_6_yolo_signature_detection,
    step1_6_yolo_signature_detection_full_page,
    step1_6_yolo_signature_detection_full_page_from_pil,
    step1_6_yolo_face_detection,
    step1_6_yolo_face_detection_full_page,
    step1_6_yolo_face_detection_full_page_from_pil,
    step8_parse_response,
    step9_process_signatures,
    process_encoding_and_llm,
    PipelineCallbackFactory,
    process_page_for_extraction_sync as modular_process_page_for_extraction_sync,
    process_page_for_template_extraction as modular_process_page_for_template_extraction,
    process_page_for_template_matching as modular_process_page_for_template_matching,
)

logger = logging.getLogger(__name__)


class ParallelPageProcessor:
    """Handles parallel processing of PDF pages with configurable concurrency"""

    def __init__(
        self, 
        pdf_processor: PDFProcessor, 
        llm_client: LLMClient, 
        prompt_service: PromptService, 
        yolo_detector: Optional[YOLOSignatureDetector] = None,
        face_detector: Optional[YOLOFaceDetector] = None
    ):
        self.pdf_processor = pdf_processor
        self.llm_client = llm_client
        self.prompt_service = prompt_service
        self.max_workers = settings.PDF_PROCESSING_MAX_WORKERS
        # Thread pool for CPU-bound PDF conversion (runs in parallel with async)
        self._thread_pool = ThreadPoolExecutor(max_workers=settings.PDF_PROCESSING_MAX_WORKERS)
        # Use provided YOLO detector or create a new one (for backward compatibility)
        self.yolo_detector = yolo_detector if yolo_detector is not None else YOLOSignatureDetector()
        # Face detector for photo ID detection
        self.face_detector = face_detector if face_detector is not None else YOLOFaceDetector()

    async def _convert_page_to_image_async(self, pdf_data: str, page_num: int, thread_pool: ThreadPoolExecutor) -> Optional[Dict[str, str]]:
        """
        Convert a PDF page to image asynchronously using thread pool executor

        Uses concurrent.futures.Future with direct callback registration for immediate event loop notification.
        The callback uses the captured event loop directly to avoid delays from loop detection overhead.
        """
        submit_time = time.time()
        loop = asyncio.get_running_loop()

        future: Future = thread_pool.submit(
            self.pdf_processor.convert_pdf_page_to_image,
            pdf_data,
            page_num
        )

        asyncio_future = loop.create_future()

        def set_result(fut: Future):
            try:
                result = fut.result()
                loop.call_soon_threadsafe(asyncio_future.set_result, result)
            except Exception as e:
                loop.call_soon_threadsafe(asyncio_future.set_exception, e)

        future.add_done_callback(set_result)
        result = await asyncio_future

        receive_time = time.time()
        wait_duration = receive_time - submit_time
        if wait_duration > 1.0:
            logger.debug(f"📊 [Page {page_num + 1}] Thread pool returned result after {wait_duration:.2f}s")

        return result

    async def _extract_page_content_async(
        self,
        pdf_data: str,
        page_num: int,
        prefer_text: Optional[bool] = None,
        text_confidence_threshold: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract content from a PDF page asynchronously (text or image)"""
        if prefer_text is None:
            prefer_text = settings.PDF_PREFER_TEXT_EXTRACTION
        if text_confidence_threshold is None:
            text_confidence_threshold = settings.PDF_TEXT_CONFIDENCE_THRESHOLD
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            self._thread_pool,
            self.pdf_processor.extract_page_content,
            pdf_data,
            page_num,
            prefer_text,
            text_confidence_threshold
        )
        return result

    # =========================================================================
    # YOLO Wrapper Methods - Delegate to modular functions
    # =========================================================================
    def _step1_6_yolo_signature_detection(self, page_num: int, image_blocks: List[Dict], page) -> List[Dict]:
        """Step 1.6: YOLO Signature Detection on image blocks. Delegates to modular function."""
        return step1_6_yolo_signature_detection(
            self.yolo_detector,
            self.pdf_processor,
            page_num,
            image_blocks,
            page
        )

    def _step1_6_yolo_signature_detection_full_page_from_pil(self, page_num: int, pil_image: Image.Image) -> List[Dict]:
        """Step 1.6: YOLO Signature Detection on full page PIL image. Delegates to modular function."""
        return step1_6_yolo_signature_detection_full_page_from_pil(
            self.yolo_detector,
            page_num,
            pil_image
        )

    def _step1_6_yolo_signature_detection_full_page(self, page_num: int, encoded_image: str) -> List[Dict]:
        """Step 1.6: YOLO Signature Detection on full page base64 image. Delegates to modular function."""
        return step1_6_yolo_signature_detection_full_page(
            self.yolo_detector,
            page_num,
            encoded_image
        )

    # =========================================================================
    # YOLO Face Detection Wrapper Methods - Delegate to modular functions
    # =========================================================================
    def _step1_6_yolo_face_detection(self, page_num: int, image_blocks: List[Dict], page) -> List[Dict]:
        """Step 1.6: YOLO Face Detection on image blocks. Delegates to modular function."""
        return step1_6_yolo_face_detection(
            self.face_detector,
            self.pdf_processor,
            page_num,
            image_blocks,
            page
        )

    def _step1_6_yolo_face_detection_full_page_from_pil(self, page_num: int, pil_image: Image.Image) -> List[Dict]:
        """Step 1.6: YOLO Face Detection on full page PIL image. Delegates to modular function."""
        return step1_6_yolo_face_detection_full_page_from_pil(
            self.face_detector,
            page_num,
            pil_image
        )

    def _step1_6_yolo_face_detection_full_page(self, page_num: int, encoded_image: str) -> List[Dict]:
        """Step 1.6: YOLO Face Detection on full page base64 image. Delegates to modular function."""
        return step1_6_yolo_face_detection_full_page(
            self.face_detector,
            page_num,
            encoded_image
        )

    def _step8_parse_response(self, page_num: int, page_result: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Step 8: Response parsing. Delegates to modular function."""
        return step8_parse_response(
            self.llm_client,
            self.prompt_service,
            page_num,
            page_result,
            context
        )

    def _step9_process_signatures(self, page_num: int, page_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Step 9: Signature processing. Delegates to modular function."""
        return step9_process_signatures(
            self.pdf_processor,
            self.yolo_detector,
            page_num,
            page_data,
            context
        )

    def _process_encoding_and_llm(
        self,
        page_num: int,
        page_image_processed_pil: Image.Image,
        page_image_original_pil: Image.Image,
        pdf_data: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process encoding and LLM call for a single page. Delegates to modular function."""
        return process_encoding_and_llm(
            self.pdf_processor,
            self.llm_client,
            self.prompt_service,
            page_num,
            page_image_processed_pil,
            page_image_original_pil,
            pdf_data,
            context
        )

    # =========================================================================
    # Page Processing Methods - Delegate to modular functions
    # =========================================================================
    def process_page_for_extraction_sync(
        self,
        page_num: int,
        pdf_data: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synchronous version: Process a single page for extraction.
        Delegates to modular function.
        """
        return modular_process_page_for_extraction_sync(
            self.pdf_processor,
            self.llm_client,
            self.prompt_service,
            page_num,
            pdf_data,
            context
        )

    async def process_page_for_template_extraction(
        self,
        page_num: int,
        pdf_data: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a single page for template-guided extraction. Delegates to modular function."""
        thread_pool = context.get("_thread_pool", self._thread_pool)
        return await modular_process_page_for_template_extraction(
            self.pdf_processor,
            self.llm_client,
            self.prompt_service,
            page_num,
            pdf_data,
            context,
            self._convert_page_to_image_async,
            thread_pool
        )

    async def process_page_for_template_matching(
        self,
        page_num: int,
        pdf_data: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a single page for template matching. Delegates to modular function."""
        thread_pool = context.get("_thread_pool", self._thread_pool)
        return await modular_process_page_for_template_matching(
            self.pdf_processor,
            self.llm_client,
            self.prompt_service,
            page_num,
            pdf_data,
            context,
            self._convert_page_to_image_async,
            thread_pool
        )

    # =========================================================================
    # Main Pipeline Method
    # =========================================================================
    async def process_pages_parallel(
        self,
        pdf_data: str,
        total_pages: int,
        process_page_fn: Callable[[int, str, Dict[str, Any]], Dict[str, Any]],
        process_context: Optional[Dict[str, Any]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
        start_page: int = 0,  # Start processing from this page index (0-based)
    ) -> List[Dict[str, Any]]:
        """
        Process multiple PDF pages using multi-stage pipeline with true step-level parallelism.
        
        This method orchestrates the entire pipeline using PipelineCallbackFactory for
        stage completion handling.
        
        Args:
            start_page: Starting page index (0-based). Pages before this are skipped.
        """
        if process_context is None:
            process_context = {}

        effective_max_workers = max_workers if max_workers is not None else (max_threads if max_threads is not None else self.max_workers)
        
        prefer_text = process_context.get("prefer_text", True)
        text_confidence_threshold = process_context.get("text_confidence_threshold", 0.6)
        
        # Calculate pages to process
        pages_to_process = total_pages - start_page
        if pages_to_process <= 0:
            logger.info(f"📄 No pages to process (start_page={start_page}, total_pages={total_pages})")
            return []
        
        if prefer_text:
            logger.info(f"🔤 Text extraction ENABLED (confidence threshold: {text_confidence_threshold:.1%})")
        else:
            logger.info(f"📸 Text extraction DISABLED - using IMAGE conversion directly")

        logger.info(f"🚀 Starting parallel processing: pages {start_page + 1}-{total_pages} ({pages_to_process} pages) with {effective_max_workers} concurrent workers")

        # Create thread pools
        pool1 = ThreadPoolExecutor(max_workers=min(effective_max_workers, 50))
        pool2 = ThreadPoolExecutor(max_workers=min(effective_max_workers, 50))
        pool3 = ThreadPoolExecutor(max_workers=min(effective_max_workers, 100))
        pool3_max_workers = min(effective_max_workers, 100)
        
        try:
            self.llm_client._get_sync_session(pool_connections=1, max_connections=pool3_max_workers)
            logger.info(f"🌐 Configured thread-local HTTP sessions - pool_maxsize: {pool3_max_workers}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to pre-initialize HTTP session: {e}")
            
        pool4 = ThreadPoolExecutor(max_workers=min(effective_max_workers, 50))
        pool_yolo = ThreadPoolExecutor(max_workers=min(effective_max_workers, 20)) if self.yolo_detector.is_enabled() else None

        try:
            # Initialize shared data structures
            page_data: Dict[int, Dict[str, Any]] = {i: {"page_num": i} for i in range(start_page, total_pages)}
            results_dict: Dict[int, Dict[str, Any]] = {}
            completion_counts = {i: 0 for i in range(1, 11)}
            page_retry_counts: Dict[int, int] = {}

            # Store PDF data in context for callbacks
            process_context["_pdf_data"] = pdf_data

            # Create callback factory
            callback_factory = PipelineCallbackFactory(
                pdf_processor=self.pdf_processor,
                llm_client=self.llm_client,
                prompt_service=self.prompt_service,
                yolo_detector=self.yolo_detector,
                face_detector=self.face_detector,
                page_data=page_data,
                results_dict=results_dict,
                completion_counts=completion_counts,
                page_retry_counts=page_retry_counts,
                total_pages=pages_to_process,  # Only count pages we're processing
                process_context=process_context,
                max_retries=1,
                prefer_text=prefer_text,
            )

            # Set pools and step methods on the factory
            callback_factory.set_pools(pool1, pool2, pool3, pool4, pool_yolo)
            callback_factory.set_step_methods(
                step1_6_yolo=self._step1_6_yolo_signature_detection,
                step1_6_yolo_full_pil=self._step1_6_yolo_signature_detection_full_page_from_pil,
                step1_6_yolo_full=self._step1_6_yolo_signature_detection_full_page,
                step8_parse=self._step8_parse_response,
                step9_signatures=self._step9_process_signatures,
                step1_6_face_full_pil=self._step1_6_yolo_face_detection_full_page_from_pil,
                step1_6_face_full=self._step1_6_yolo_face_detection_full_page,
            )

            # Pre-process PDF document (shared across all pages)
            pdf_bytes_shared = self.pdf_processor.step1_1_decode_base64_pdf(pdf_data)
            if not pdf_bytes_shared:
                logger.error("❌ Failed to decode PDF data")
                return [{"error": "Failed to decode PDF data", "page_num": i + 1} for i in range(total_pages)]

            pdf_document_shared = self.pdf_processor.step1_2_open_pdf_document(pdf_bytes_shared)
            if not pdf_document_shared:
                logger.error("❌ Failed to open PDF document")
                return [{"error": "Failed to open PDF document", "page_num": i + 1} for i in range(total_pages)]

            # Store shared PDF document in page_data
            for page_num in range(start_page, total_pages):
                page_data[page_num]["pdf_document"] = pdf_document_shared

            # Start the pipeline
            if prefer_text:
                # Start Stage 1.3 for all pages
                for page_num in range(start_page, total_pages):
                    future = pool1.submit(self.pdf_processor.step1_3_get_specific_page, pdf_document_shared, page_num)
                    callback_factory.stage1_3_futures[future] = page_num
                    future.add_done_callback(callback_factory.on_stage1_3_complete)
            else:
                # Skip text extraction - go directly to Stage 2 (image conversion)
                logger.info(f"⏭️ Skipping text extraction stages for all {pages_to_process} page(s)")
                skip_futures: Dict[Future, int] = {}
                for page_num in range(start_page, total_pages):
                    future = pool1.submit(self.pdf_processor.step1_3_get_specific_page, pdf_document_shared, page_num)
                    skip_futures[future] = page_num
                    future.add_done_callback(lambda f: callback_factory.on_skip_text_get_page_complete(f, skip_futures))

            # Poll for completion
            start_time = time.time()
            timeout = 600  # 10 minutes timeout
            poll_interval = 0.1

            while completion_counts[9] < pages_to_process:
                await asyncio.sleep(poll_interval)
                elapsed = time.time() - start_time
                
                if elapsed > timeout:
                    logger.error(f"❌ Pipeline timeout after {elapsed:.1f}s")
                    for page_num in range(start_page, total_pages):
                        if page_num not in results_dict:
                            results_dict[page_num] = {"error": "Pipeline timeout", "page_num": page_num + 1}
                    break
                
                # Dynamic poll interval
                if elapsed > 30 and poll_interval < 0.5:
                    poll_interval = 0.5
                elif elapsed > 120 and poll_interval < 1.0:
                    poll_interval = 1.0

            logger.info(f"✅ All pages completed: {completion_counts[9]}/{pages_to_process} pages processed in {elapsed:.1f}s")

            # Close shared PDF document
            if pdf_document_shared:
                try:
                    pdf_document_shared.close()
                    logger.debug(f"🔒 Closed shared PDF document")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing shared PDF document: {e}")

            # Sort results by page number (only return pages we processed)
            page_results = [results_dict.get(page_num, {"error": f"Missing result for page {page_num + 1}", "page_num": page_num + 1})
                           for page_num in range(start_page, total_pages)]

            success_count = sum(1 for r in page_results if "error" not in r)
            error_count = pages_to_process - success_count
            logger.info(f"📊 Pipeline complete: {success_count} successful, {error_count} errors out of {pages_to_process} pages")

            return page_results

        finally:
            # Cleanup thread pools
            self._cleanup_thread_pools(pool1, pool2, pool3, pool4, pool_yolo, callback_factory if 'callback_factory' in locals() else None)
            
            # Clear PDF cache
            try:
                self.pdf_processor.clear_pdf_cache()
                logger.debug("✅ PDF cache cleared")
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache: {e}")

            # Clear data structures
            if 'page_data' in locals():
                page_data.clear()
            if 'results_dict' in locals():
                results_dict.clear()

    def _cleanup_thread_pools(
        self,
        pool1: ThreadPoolExecutor,
        pool2: ThreadPoolExecutor,
        pool3: ThreadPoolExecutor,
        pool4: ThreadPoolExecutor,
        pool_yolo: Optional[ThreadPoolExecutor],
        callback_factory: Optional[PipelineCallbackFactory]
    ):
        """Clean up all thread pools and clear future dictionaries."""
        try:
            logger.debug("🧹 Shutting down thread pools...")

            # Shutdown YOLO pool first (if it exists)
            if pool_yolo is not None:
                try:
                    if self.yolo_detector.is_enabled() and callback_factory:
                        yolo_wait_start = time.time()
                        yolo_wait_timeout = 30
                        pending_yolo_count = sum(1 for f in callback_factory.stage1_6_futures.keys() if not f.done())
                        if pending_yolo_count > 0:
                            logger.debug(f"   Waiting for {pending_yolo_count} pending YOLO task(s)...")
                            for yolo_future in list(callback_factory.stage1_6_futures.keys()):
                                if not yolo_future.done():
                                    remaining_time = max(1, yolo_wait_timeout - (time.time() - yolo_wait_start))
                                    if remaining_time <= 0:
                                        break
                                    try:
                                        yolo_future.result(timeout=min(remaining_time, 5))
                                    except Exception:
                                        pass
                                if time.time() - yolo_wait_start > yolo_wait_timeout:
                                    break
                    pool_yolo.shutdown(wait=False)
                    logger.debug("   ✅ YOLO pool shut down")
                except Exception as e:
                    logger.warning(f"   ⚠️ Error shutting down YOLO pool: {e}")

            # Shutdown main thread pools
            for pool_name, pool in [("pool1", pool1), ("pool2", pool2), ("pool3", pool3), ("pool4", pool4)]:
                try:
                    pool.shutdown(wait=True)
                    logger.debug(f"   ✅ {pool_name} shut down")
                except Exception as e:
                    logger.warning(f"   ⚠️ Error shutting down {pool_name}: {e}")

            logger.debug("✅ All thread pools shut down")
        except Exception as e:
            logger.error(f"❌ Critical error shutting down thread pools: {e}")

        # Clear future dictionaries
        if callback_factory:
            try:
                callback_factory.stage1_3_futures.clear()
                callback_factory.stage1_4_futures.clear()
                callback_factory.stage1_5_futures.clear()
                callback_factory.stage1_6_futures.clear()
                callback_factory.stage2_futures.clear()
                callback_factory.stage3_futures.clear()
                callback_factory.stage4_futures.clear()
                callback_factory.stage5_futures.clear()
                callback_factory.stage6_futures.clear()
                callback_factory.stage7_futures.clear()
                callback_factory.stage8_futures.clear()
                callback_factory.stage9_futures.clear()
            except Exception:
                pass
