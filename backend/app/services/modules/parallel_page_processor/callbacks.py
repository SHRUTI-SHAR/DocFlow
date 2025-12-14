"""
Stage callback functions for the parallel page processing pipeline.

This module contains all the callback functions that are triggered when each
stage of the pipeline completes. The callbacks handle:
- Error handling and logging
- Submitting work to the next stage
- Retry logic for failed stages
- Memory cleanup

These callbacks form a chain: Stage N completion triggers Stage N+1 submission.
"""

import logging
import time
import traceback
from typing import Dict, Any, List, Optional, Callable, TYPE_CHECKING
from concurrent.futures import Future, CancelledError, ThreadPoolExecutor

if TYPE_CHECKING:
    from ..pdf_processor import PDFProcessor
    from ..llm_client import LLMClient
    from ..prompt_service import PromptService
    from ..yolo_signature_detector import YOLOSignatureDetector
    from ..yolo_face_detector import YOLOFaceDetector

logger = logging.getLogger(__name__)


class PipelineCallbackFactory:
    """
    Factory class that creates callback functions for each pipeline stage.
    
    This encapsulates the shared state (page_data, results_dict, futures dicts, pools)
    and provides callback functions that can be attached to futures.
    """
    
    def __init__(
        self,
        pdf_processor: 'PDFProcessor',
        llm_client: 'LLMClient',
        prompt_service: 'PromptService',
        yolo_detector: 'YOLOSignatureDetector',
        face_detector: 'YOLOFaceDetector',
        page_data: Dict[int, Dict[str, Any]],
        results_dict: Dict[int, Dict[str, Any]],
        completion_counts: Dict[int, int],
        page_retry_counts: Dict[int, int],
        total_pages: int,
        process_context: Dict[str, Any],
        max_retries: int = 1,
        prefer_text: bool = True,
    ):
        """
        Initialize the callback factory with shared state.
        
        Args:
            pdf_processor: PDF processor instance
            llm_client: LLM client instance  
            prompt_service: Prompt service instance
            yolo_detector: YOLO signature detector instance
            face_detector: YOLO face detector instance
            page_data: Shared dict storing intermediate page data
            results_dict: Shared dict storing final results
            completion_counts: Dict tracking completion counts per stage
            page_retry_counts: Dict tracking retry attempts per page
            total_pages: Total number of pages being processed
            process_context: Context dict with task info
            max_retries: Maximum retry attempts per page
            prefer_text: Whether to prefer text extraction
        """
        self.pdf_processor = pdf_processor
        self.llm_client = llm_client
        self.prompt_service = prompt_service
        self.yolo_detector = yolo_detector
        self.face_detector = face_detector
        self.page_data = page_data
        self.results_dict = results_dict
        self.completion_counts = completion_counts
        self.page_retry_counts = page_retry_counts
        self.total_pages = total_pages
        self.process_context = process_context
        self.max_retries = max_retries
        self.prefer_text = prefer_text
        
        # Stage future dictionaries (will be set by the pipeline)
        self.stage1_3_futures: Dict[Future, int] = {}
        self.stage1_4_futures: Dict[Future, int] = {}
        self.stage1_5_futures: Dict[Future, int] = {}
        self.stage1_6_futures: Dict[Future, int] = {}
        self.stage1_6_face_futures: Dict[Future, int] = {}  # Face detection futures
        self.stage2_futures: Dict[Future, int] = {}
        self.stage3_futures: Dict[Future, int] = {}
        self.stage4_futures: Dict[Future, int] = {}
        self.stage5_futures: Dict[Future, int] = {}
        self.stage6_futures: Dict[Future, int] = {}
        self.stage7_futures: Dict[Future, int] = {}
        self.stage8_futures: Dict[Future, int] = {}
        self.stage9_futures: Dict[Future, int] = {}
        
        # Thread pools (will be set by the pipeline)
        self.pool1: Optional[ThreadPoolExecutor] = None
        self.pool2: Optional[ThreadPoolExecutor] = None
        self.pool3: Optional[ThreadPoolExecutor] = None
        self.pool4: Optional[ThreadPoolExecutor] = None
        self.pool_yolo: Optional[ThreadPoolExecutor] = None
        
        # Step methods (will be set by the pipeline)
        self._step1_6_yolo_signature_detection: Optional[Callable] = None
        self._step1_6_yolo_signature_detection_full_page_from_pil: Optional[Callable] = None
        self._step1_6_yolo_signature_detection_full_page: Optional[Callable] = None
        self._step1_6_yolo_face_detection_full_page_from_pil: Optional[Callable] = None
        self._step1_6_yolo_face_detection_full_page: Optional[Callable] = None
        self._step8_parse_response: Optional[Callable] = None
        self._step9_process_signatures: Optional[Callable] = None
    
    def set_pools(
        self,
        pool1: ThreadPoolExecutor,
        pool2: ThreadPoolExecutor,
        pool3: ThreadPoolExecutor,
        pool4: ThreadPoolExecutor,
        pool_yolo: Optional[ThreadPoolExecutor] = None
    ):
        """Set the thread pools used by callbacks."""
        self.pool1 = pool1
        self.pool2 = pool2
        self.pool3 = pool3
        self.pool4 = pool4
        self.pool_yolo = pool_yolo
    
    def set_step_methods(
        self,
        step1_6_yolo: Callable,
        step1_6_yolo_full_pil: Callable,
        step1_6_yolo_full: Callable,
        step8_parse: Callable,
        step9_signatures: Callable,
        step1_6_face_full_pil: Optional[Callable] = None,
        step1_6_face_full: Optional[Callable] = None
    ):
        """Set the step method references used by callbacks."""
        self._step1_6_yolo_signature_detection = step1_6_yolo
        self._step1_6_yolo_signature_detection_full_page_from_pil = step1_6_yolo_full_pil
        self._step1_6_yolo_signature_detection_full_page = step1_6_yolo_full
        self._step1_6_yolo_face_detection_full_page_from_pil = step1_6_face_full_pil
        self._step1_6_yolo_face_detection_full_page = step1_6_face_full
        self._step8_parse_response = step8_parse
        self._step9_process_signatures = step9_signatures
    
    # =========================================================================
    # Stage 1.3 Callback: Get Specific Page → Stage 1.4
    # =========================================================================
    def on_stage1_3_complete(self, future: Future):
        """Callback: Move to Stage 1.4 immediately when Stage 1.3 completes"""
        page_num = self.stage1_3_futures[future]
        try:
            page = future.result()
            if not page:
                self.results_dict[page_num] = {"error": f"Step 1.3 failed for page {page_num + 1}", "page_num": page_num + 1}
                return

            self.page_data[page_num]["page"] = page
            logger.debug(f"✅ [Page {page_num + 1}] Step 1.3 (Get Specific Page) complete")

            # Immediately submit to Stage 1.4 (Extract Text Content) - only if prefer_text
            if self.prefer_text:
                stage1_4_future = self.pool1.submit(self.pdf_processor.step1_4_extract_text_content, page)
                self.stage1_4_futures[stage1_4_future] = page_num
                stage1_4_future.add_done_callback(self.on_stage1_4_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 1.3 for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 1.4 Callback: Extract Text Content → Stage 1.5
    # =========================================================================
    def on_stage1_4_complete(self, future: Future):
        """Callback: Move to Stage 1.5 immediately when Stage 1.4 completes"""
        page_num = self.stage1_4_futures[future]
        try:
            text_data = future.result()
            if not text_data:
                self.results_dict[page_num] = {"error": f"Step 1.4 failed for page {page_num + 1}", "page_num": page_num + 1}
                return

            self.page_data[page_num]["text_data"] = text_data
            char_count = len(text_data.get("text", "").strip())
            text_blocks_count = len(text_data.get("text_blocks", []))
            image_blocks = text_data.get("image_blocks", [])
            logger.debug(f"✅ [Page {page_num + 1}] Step 1.4 (Extract Text Content) complete - {char_count} chars, {text_blocks_count} text blocks, {len(image_blocks)} image blocks")

            # Store image blocks for potential YOLO detection
            self.page_data[page_num]["image_blocks"] = image_blocks

            # Immediately submit to Stage 1.5 (Analyze Text Quality)
            stage1_5_future = self.pool1.submit(self.pdf_processor.step1_5_analyze_text_quality, text_data)
            self.stage1_5_futures[stage1_5_future] = page_num
            stage1_5_future.add_done_callback(self.on_stage1_5_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 1.4 for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 1.5 Callback: Analyze Text Quality → Decision Point
    # =========================================================================
    def on_stage1_5_complete(self, future: Future):
        """Callback: Analyze text quality and decide TEXT path or IMAGE path"""
        page_num = self.stage1_5_futures[future]
        try:
            quality_data = future.result()
            if not quality_data:
                self.results_dict[page_num] = {"error": f"Step 1.5 failed for page {page_num + 1}", "page_num": page_num + 1}
                return
            
            text_data = self.page_data[page_num].get("text_data", {})
            confidence = quality_data.get("confidence", 0)
            
            # Check if text extraction succeeded with sufficient confidence
            from app.core.config import settings
            confidence_threshold = settings.PDF_TEXT_CONFIDENCE_THRESHOLD
            
            if confidence >= confidence_threshold:
                # Text extraction succeeded - use text path
                self._handle_text_path(page_num, text_data, quality_data, confidence)
            else:
                # Text extraction failed - fallback to image conversion
                logger.info(f"⚠️ [Page {page_num + 1}] Text extraction confidence too low ({confidence:.2f} < {confidence_threshold:.2f}), falling back to IMAGE conversion")
                self._handle_image_fallback_path(page_num)
        except Exception as e:
            logger.error(f"❌ Error in Step 1.5 for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}
    
    def _handle_text_path(self, page_num: int, text_data: Dict, quality_data: Dict, confidence: float):
        """Handle the TEXT extraction path after quality check passes."""
        self.page_data[page_num]["content_type"] = "text"
        self.page_data[page_num]["text"] = text_data.get("text", "").strip()
        self.page_data[page_num]["text_metadata"] = {
            "char_count": quality_data.get("char_count", 0),
            "word_count": quality_data.get("word_count", 0),
            "confidence": confidence,
            "text_blocks": text_data.get("text_blocks", 0),
            "image_blocks": text_data.get("image_blocks", 0)
        }
        self.completion_counts[1] += 1
        logger.debug(f"✅ [Page {page_num + 1}] Step 1.5 complete - Confidence: {confidence:.2f} ({self.completion_counts[1]}/{self.total_pages})")
        logger.debug(f"📝 [Page {page_num + 1}] Using TEXT path - skipping image conversion")
        
        # For TEXT path: Run YOLO on image blocks (skip for template_matching - not needed)
        task = self.process_context.get("task", "")
        skip_yolo_tasks = ["template_matching", "db_template_matching"]
        
        image_blocks = self.page_data[page_num].get("image_blocks", [])
        if self.yolo_detector.is_enabled() and image_blocks and len(image_blocks) > 0 and task not in skip_yolo_tasks:
            page = self.page_data[page_num].get("page")
            if page and self.pool_yolo:
                stage1_6_future = self.pool_yolo.submit(
                    self._step1_6_yolo_signature_detection,
                    page_num,
                    image_blocks,
                    page
                )
                self.stage1_6_futures[stage1_6_future] = page_num
                stage1_6_future.add_done_callback(self.on_stage1_6_complete)
        
        # Submit to Stage 6 with text
        text_content = self.page_data[page_num]["text"]
        
        def pass_text_through(txt):
            return txt
        
        stage6_future = self.pool1.submit(pass_text_through, text_content)
        self.stage6_futures[stage6_future] = page_num
        logger.debug(f"🔗 [Page {page_num + 1}] Stage 6 future created, adding callback")
        stage6_future.add_done_callback(self.on_stage6_complete_text)
    
    def _handle_image_fallback_path(self, page_num: int):
        """Handle the IMAGE fallback path when text extraction fails."""
        # This method handles the nested fallback callbacks
        pdf_data = self.process_context.get("_pdf_data", "")
        
        # Step 1.7: Decode Base64 PDF Data
        pdf_bytes_future = self.pool1.submit(self.pdf_processor.step1_7_decode_base64_pdf_fallback, pdf_data)
        fallback_futures = {pdf_bytes_future: page_num}
        
        def on_step1_7_complete(fallback_future: Future):
            page_num_fallback = fallback_futures[fallback_future]
            try:
                pdf_bytes = fallback_future.result()
                if not pdf_bytes:
                    self.results_dict[page_num_fallback] = {"error": f"Step 1.7 failed for page {page_num_fallback + 1}", "page_num": page_num_fallback + 1}
                    return
                
                # Step 1.8: Open PDF Document
                pdf_doc_future = self.pool1.submit(self.pdf_processor.step1_8_open_pdf_document_fallback, pdf_bytes)
                fallback_futures[pdf_doc_future] = page_num_fallback
                
                def on_step1_8_complete(doc_future: Future):
                    page_num_doc = fallback_futures[doc_future]
                    try:
                        pdf_document = doc_future.result()
                        if not pdf_document:
                            self.results_dict[page_num_doc] = {"error": f"Step 1.8 failed for page {page_num_doc + 1}", "page_num": page_num_doc + 1}
                            return
                        
                        self.page_data[page_num_doc]["pdf_document"] = pdf_document
                        
                        # Step 1.9: Get Specific Page
                        page_future = self.pool1.submit(self.pdf_processor.step1_9_get_specific_page_fallback, pdf_document, page_num_doc)
                        fallback_futures[page_future] = page_num_doc
                        
                        def on_step1_9_complete(page_future_inner: Future):
                            page_num_page = fallback_futures[page_future_inner]
                            try:
                                page = page_future_inner.result()
                                if not page:
                                    self.results_dict[page_num_page] = {"error": f"Step 1.9 failed for page {page_num_page + 1}", "page_num": page_num_page + 1}
                                    return
                                
                                self.page_data[page_num_page]["page"] = page
                                self.completion_counts[1] += 1
                                logger.debug(f"✅ [Page {page_num_page + 1}] Step 1 (Image conversion fallback) complete ({self.completion_counts[1]}/{self.total_pages})")
                                
                                # Continue with image conversion: Step 1.10 (Render to Pixmap)
                                stage2_future = self.pool1.submit(self.pdf_processor.step1_10_render_page_to_pixmap, page)
                                self.stage2_futures[stage2_future] = page_num_page
                                stage2_future.add_done_callback(self.on_stage2_complete)
                            except Exception as e:
                                logger.error(f"❌ Error in Step 1.9 for page {page_num_page + 1}: {e}")
                                self.results_dict[page_num_page] = {"error": str(e), "page_num": page_num_page + 1}
                        
                        page_future.add_done_callback(on_step1_9_complete)
                    except Exception as e:
                        logger.error(f"❌ Error in Step 1.8 for page {page_num_doc + 1}: {e}")
                        self.results_dict[page_num_doc] = {"error": str(e), "page_num": page_num_doc + 1}
                
                pdf_doc_future.add_done_callback(on_step1_8_complete)
            except Exception as e:
                logger.error(f"❌ Error in Step 1.7 for page {page_num_fallback + 1}: {e}")
                self.results_dict[page_num_fallback] = {"error": str(e), "page_num": page_num_fallback + 1}
        
        pdf_bytes_future.add_done_callback(on_step1_7_complete)

    # =========================================================================
    # Stage 1.6 Callback: YOLO Signature Detection
    # =========================================================================
    def on_stage1_6_complete(self, future: Future):
        """Callback: Store YOLO detection results for merging in Stage 9"""
        page_num = self.stage1_6_futures[future]
        try:
            if future.cancelled():
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection was cancelled")
                self.page_data[page_num]["yolo_signatures"] = []
                return

            yolo_signatures = future.result()
            if yolo_signatures:
                self.page_data[page_num]["yolo_signatures"] = yolo_signatures
                logger.debug(f"✅ [Page {page_num + 1}] YOLO signatures stored: {len(yolo_signatures)}")
            else:
                self.page_data[page_num]["yolo_signatures"] = []
        except CancelledError:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection was cancelled")
            self.page_data[page_num]["yolo_signatures"] = []
        except AttributeError as compat_error:
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ [Page {page_num + 1}] YOLO model compatibility error: {error_msg}")
            else:
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO detection error (AttributeError): {compat_error}")
            self.page_data[page_num]["yolo_signatures"] = []
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e) if str(e) else f"{error_type} (no message)"
            logger.error(f"❌ Error in YOLO detection for page {page_num + 1} ({error_type}): {error_msg}")
            self.page_data[page_num]["yolo_signatures"] = []

    # =========================================================================
    # Stage 1.6 Callback: YOLO Face Detection
    # =========================================================================
    def on_stage1_6_face_complete(self, future: Future):
        """Callback: Store YOLO face detection results for merging in Stage 9"""
        page_num = self.stage1_6_face_futures[future]
        try:
            if future.cancelled():
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face detection was cancelled")
                self.page_data[page_num]["yolo_faces"] = []
                return

            yolo_faces = future.result()
            if yolo_faces:
                self.page_data[page_num]["yolo_faces"] = yolo_faces
                logger.debug(f"✅ [Page {page_num + 1}] YOLO faces stored: {len(yolo_faces)}")
            else:
                self.page_data[page_num]["yolo_faces"] = []
        except CancelledError:
            logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face detection was cancelled")
            self.page_data[page_num]["yolo_faces"] = []
        except AttributeError as compat_error:
            error_msg = str(compat_error)
            if "'Conv' object has no attribute 'bn'" in error_msg or "has no attribute 'bn'" in error_msg:
                logger.error(f"❌ [Page {page_num + 1}] YOLO face model compatibility error: {error_msg}")
            else:
                logger.warning(f"⚠️ [Page {page_num + 1}] YOLO face detection error (AttributeError): {compat_error}")
            self.page_data[page_num]["yolo_faces"] = []
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e) if str(e) else f"{error_type} (no message)"
            logger.error(f"❌ Error in YOLO face detection for page {page_num + 1} ({error_type}): {error_msg}")
            self.page_data[page_num]["yolo_faces"] = []

    # =========================================================================
    # Stage 2 Callback: PDF Rendering → Stage 3
    # =========================================================================
    def on_stage2_complete(self, future: Future):
        """Callback: Move to Stage 3 immediately when Stage 2 completes"""
        page_num = self.stage2_futures[future]
        pix = None
        try:
            pix = future.result()
            if not pix:
                self.results_dict[page_num] = {"error": f"Step 2 failed for page {page_num + 1}", "page_num": page_num + 1}
                return
            
            self.page_data[page_num]["pix"] = pix
            self.completion_counts[2] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 2 (PDF rendering) complete ({self.completion_counts[2]}/{self.total_pages})")
            
            # Immediately submit to Stage 3
            stage3_future = self.pool1.submit(self.pdf_processor.step3_create_pil_image, pix)
            self.stage3_futures[stage3_future] = page_num
            stage3_future.add_done_callback(self.on_stage3_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 2 (PDF rendering) for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 3 Callback: PIL Image Creation → Stage 4
    # =========================================================================
    def on_stage3_complete(self, future: Future):
        """Callback: Move to Stage 4 immediately when Stage 3 completes"""
        page_num = self.stage3_futures[future]
        try:
            img = future.result()
            if not img:
                self.results_dict[page_num] = {"error": f"Step 3 failed for page {page_num + 1}", "page_num": page_num + 1}
                return
            
            self.page_data[page_num]["img"] = img
            self.completion_counts[3] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 3 (PIL image creation) complete ({self.completion_counts[3]}/{self.total_pages})")
            
            # Clean up pixmap
            if "pix" in self.page_data[page_num]:
                try:
                    pix = self.page_data[page_num]["pix"]
                    if hasattr(pix, 'close'):
                        pix.close()
                    del self.page_data[page_num]["pix"]
                except Exception:
                    pass
            
            # Immediately submit to Stage 4 (store original + enhancement - no A4 conversion)
            stage4_future = self.pool1.submit(self.pdf_processor.step4_store_original_and_enhance, img)
            self.stage4_futures[stage4_future] = page_num
            stage4_future.add_done_callback(self.on_stage4_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 3 (PIL image creation) for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 4 Callback: Store Original + Text Enhancement → Stage 6
    # =========================================================================
    def on_stage4_complete(self, future: Future):
        """Callback: Move to Stage 6 immediately when Stage 4 completes (skipping Stage 5)"""
        page_num = self.stage4_futures[future]
        try:
            processed_img, original_img = future.result()
            self.page_data[page_num]["processed_img"] = processed_img
            self.page_data[page_num]["original_img"] = original_img
            self.completion_counts[4] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 4 (Store original + enhancement) complete ({self.completion_counts[4]}/{self.total_pages})")
            
            # Skip Stage 5 - directly submit to Stage 6 (encoding)
            stage6_future = self.pool2.submit(self.pdf_processor._encode_image_simple, processed_img)
            self.stage6_futures[stage6_future] = page_num
            stage6_future.add_done_callback(self.on_stage6_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 4 (Store original + enhancement) for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 6 Callbacks: Encoding → Stage 7
    # =========================================================================
    def on_stage6_complete_text(self, future: Future):
        """Callback: Handle text path - skip encoding, go directly to LLM"""
        logger.debug(f"🔔 Step 6 (Text path) callback triggered")
        try:
            if future not in self.stage6_futures:
                logger.error(f"❌ Step 6 (Text path) callback: Future not found in stage6_futures")
                return
            page_num = self.stage6_futures[future]
            logger.debug(f"🔔 [Page {page_num + 1}] Step 6 (Text path) callback executing")
            
            text = future.result()
            self.page_data[page_num]["encoded_content"] = text
            self.page_data[page_num]["content_type"] = "text"
            self.completion_counts[6] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 6 (Text ready) complete ({self.completion_counts[6]}/{self.total_pages})")
            
            # Submit to Stage 7 (LLM call with text)
            task = self.process_context.get("task")
            document_name = self.process_context.get("document_name", "Unknown")
            templates = self.process_context.get("templates")
            db_templates = self.process_context.get("db_templates")
            document_type = self.process_context.get("document_type")
            is_first_page = self.process_context.get("is_first_page", True)
            table_headers = self.process_context.get("table_headers", [])
            
            # Build prompt context for bank statements
            prompt_context = {
                "is_first_page": is_first_page,
                "table_headers": table_headers,
                "page_number": page_num + 1
            }
            prompt, response_format = self.prompt_service.get_task_prompt(
                task, templates, db_templates, content_type="text",
                document_type=document_type, context=prompt_context
            )
            
            logger.info(f"🚀 [Page {page_num + 1}] Submitting to Step 7 (LLM API call with text)")
            stage7_future = self.pool3.submit(
                self.llm_client.call_api_sync,
                prompt, text, response_format, task,
                f"{document_name} (page {page_num + 1})",
                "text"
            )
            self.stage7_futures[stage7_future] = page_num
            stage7_future.add_done_callback(self.on_stage7_complete)
        except KeyError as e:
            logger.error(f"❌ Error in Step 6 (Text path): Future not found: {e}")
        except Exception as e:
            logger.error(f"❌ Error in Step 6 (Text path): {e}", exc_info=True)
            if 'page_num' in locals():
                self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    def on_stage6_complete(self, future: Future):
        """Callback: Move to Stage 7 immediately when Stage 6 completes (image path)"""
        try:
            if future not in self.stage6_futures:
                logger.error(f"❌ Step 6 (Image path) callback: Future not found")
                return
            page_num = self.stage6_futures[future]
            encoded_image = future.result()
            self.page_data[page_num]["encoded_image"] = encoded_image
            self.page_data[page_num]["content_type"] = "image"
            
            # Clean up processed_img
            if "processed_img" in self.page_data[page_num]:
                try:
                    del self.page_data[page_num]["processed_img"]
                except Exception:
                    pass
            
            self.completion_counts[6] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 6 (Base64 encoding) complete ({self.completion_counts[6]}/{self.total_pages})")
            
            # Submit to Stage 7 (LLM call with image)
            task = self.process_context.get("task")
            document_name = self.process_context.get("document_name", "Unknown")
            templates = self.process_context.get("templates")
            db_templates = self.process_context.get("db_templates")
            document_type = self.process_context.get("document_type")
            is_first_page = self.process_context.get("is_first_page", True)
            table_headers = self.process_context.get("table_headers", [])
            
            # Build prompt context for bank statements
            prompt_context = {
                "is_first_page": is_first_page,
                "table_headers": table_headers,
                "page_number": page_num + 1
            }
            prompt, response_format = self.prompt_service.get_task_prompt(
                task, templates, db_templates, content_type="image",
                document_type=document_type, context=prompt_context
            )
            
            stage7_future = self.pool3.submit(
                self.llm_client.call_api_sync,
                prompt, encoded_image, response_format, task,
                f"{document_name} (page {page_num + 1})",
                "image"
            )
            self.stage7_futures[stage7_future] = page_num
            stage7_future.add_done_callback(self.on_stage7_complete)
        except KeyError as e:
            logger.error(f"❌ Error in Step 6 (Image path): Future not found: {e}")
        except Exception as e:
            logger.error(f"❌ Error in Step 6 (Base64 encoding): {e}", exc_info=True)
            if 'page_num' in locals():
                self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}

    # =========================================================================
    # Stage 7 Callback: LLM API Call → Stage 8
    # =========================================================================
    def on_stage7_complete(self, future: Future):
        """Callback: Move to Stage 8 immediately when Stage 7 completes"""
        page_num = self.stage7_futures[future]
        try:
            page_result = future.result()
            self.page_data[page_num]["llm_result"] = page_result
            self.completion_counts[7] += 1
            
            # Log progress at INFO level for every 5 pages or first/last page
            if self.completion_counts[7] == 1 or self.completion_counts[7] == self.total_pages or self.completion_counts[7] % 5 == 0:
                logger.info(f"📄 LLM extraction progress: {self.completion_counts[7]}/{self.total_pages} pages complete")
            else:
                logger.debug(f"✅ [Page {page_num + 1}] Step 7 (LLM API call) complete ({self.completion_counts[7]}/{self.total_pages})")
            
            # Reset retry count on success
            if page_num in self.page_retry_counts:
                del self.page_retry_counts[page_num]
            
            # Check if IMAGE path and LLM indicated signature presence
            # Skip YOLO for template_matching tasks - not needed
            task = self.process_context.get("task", "")
            skip_yolo_tasks = ["template_matching", "db_template_matching"]
            content_type = self.page_data[page_num].get("content_type", "text")
            if content_type == "image" and self.yolo_detector.is_enabled() and task not in skip_yolo_tasks:
                page_data_parsed = page_result.get("_parsed", {})
                has_signature = page_data_parsed.get("has_signature", False)
                
                if has_signature:
                    logger.debug(f"🔍 [Page {page_num + 1}] LLM indicated signature - running YOLO")
                    original_img = self.page_data[page_num].get("original_img")
                    if original_img and self.pool_yolo:
                        stage1_6_future = self.pool_yolo.submit(
                            self._step1_6_yolo_signature_detection_full_page_from_pil,
                            page_num,
                            original_img
                        )
                        self.stage1_6_futures[stage1_6_future] = page_num
                        stage1_6_future.add_done_callback(self.on_stage1_6_complete)
                        
                        # Don't clean up original_img here - face detection may also need it
                    else:
                        # Fallback to encoded_image
                        encoded_image = self.page_data[page_num].get("encoded_image")
                        if encoded_image and self.pool_yolo:
                            stage1_6_future = self.pool_yolo.submit(
                                self._step1_6_yolo_signature_detection_full_page,
                                page_num,
                                encoded_image
                            )
                            self.stage1_6_futures[stage1_6_future] = page_num
                            stage1_6_future.add_done_callback(self.on_stage1_6_complete)
            
            # Check for face detection (photo ID)
            if content_type == "image" and self.face_detector and self.face_detector.is_enabled() and task not in skip_yolo_tasks:
                page_data_parsed = page_result.get("_parsed", {})
                has_photo_id = page_data_parsed.get("has_photo_id", False)
                
                if has_photo_id:
                    logger.debug(f"📸 [Page {page_num + 1}] LLM indicated photo ID/face - running YOLO face detection")
                    original_img = self.page_data[page_num].get("original_img")
                    if original_img and self.pool_yolo:
                        face_future = self.pool_yolo.submit(
                            self._step1_6_yolo_face_detection_full_page_from_pil,
                            page_num,
                            original_img
                        )
                        self.stage1_6_face_futures[face_future] = page_num
                        face_future.add_done_callback(self.on_stage1_6_face_complete)
                        
                        # Don't clean up original_img here - might be needed for signatures too
                    else:
                        # Fallback to encoded_image
                        encoded_image = self.page_data[page_num].get("encoded_image")
                        if encoded_image and self.pool_yolo:
                            face_future = self.pool_yolo.submit(
                                self._step1_6_yolo_face_detection_full_page,
                                page_num,
                                encoded_image
                            )
                            self.stage1_6_face_futures[face_future] = page_num
                            face_future.add_done_callback(self.on_stage1_6_face_complete)
            
            # Immediately submit to Stage 8 (parsing)
            stage8_future = self.pool4.submit(self._step8_parse_response, page_num, page_result, self.process_context)
            self.stage8_futures[stage8_future] = page_num
            stage8_future.add_done_callback(self.on_stage8_complete)
        except Exception as e:
            self._handle_stage7_retry(page_num, e)

    def _handle_stage7_retry(self, page_num: int, error: Exception):
        """Handle retry logic for Stage 7 failures."""
        retry_count = self.page_retry_counts.get(page_num, 0)
        if retry_count < self.max_retries:
            retry_count += 1
            self.page_retry_counts[page_num] = retry_count
            logger.warning(f"⚠️ [Page {page_num + 1}] Step 7 failed, retrying ({retry_count}/{self.max_retries}): {error}")
            
            task = self.process_context.get("task")
            document_name = self.process_context.get("document_name", "Unknown")
            templates = self.process_context.get("templates")
            db_templates = self.process_context.get("db_templates")
            document_type = self.process_context.get("document_type")
            is_first_page = self.process_context.get("is_first_page", True)
            table_headers = self.process_context.get("table_headers", [])
            
            # Build prompt context for bank statements
            content_type = self.page_data[page_num].get("content_type", "text")
            prompt_context = {
                "is_first_page": is_first_page,
                "table_headers": table_headers,
                "page_number": page_num + 1
            }
            prompt, response_format = self.prompt_service.get_task_prompt(
                task, templates, db_templates, content_type=content_type,
                document_type=document_type, context=prompt_context
            )
            
            if content_type == "text":
                text = self.page_data[page_num].get("text", "")
                stage7_future = self.pool3.submit(
                    self.llm_client.call_api_sync,
                    prompt, text, response_format, task,
                    f"{document_name} (page {page_num + 1})",
                    "text"
                )
            else:
                encoded_image = self.page_data[page_num].get("encoded_image")
                stage7_future = self.pool3.submit(
                    self.llm_client.call_api_sync,
                    prompt, encoded_image, response_format, task,
                    f"{document_name} (page {page_num + 1})",
                    "image"
                )
            self.stage7_futures[stage7_future] = page_num
            stage7_future.add_done_callback(self.on_stage7_complete)
        else:
            logger.error(f"❌ [Page {page_num + 1}] Step 7 failed after {retry_count} retries: {error}")
            self.results_dict[page_num] = {
                "error": str(error),
                "page_num": page_num + 1,
                "retry_count": retry_count,
                "failed_stage": "LLM API call"
            }
            self.completion_counts[9] += 1

    # =========================================================================
    # Stage 8 Callback: Response Parsing → Stage 9
    # =========================================================================
    def on_stage8_complete(self, future: Future):
        """Callback: Move to Stage 9 immediately when Stage 8 completes"""
        page_num = self.stage8_futures[future]
        try:
            parsed_data = future.result()
            self.page_data[page_num].update(parsed_data)
            self.completion_counts[8] += 1
            logger.debug(f"✅ [Page {page_num + 1}] Step 8 (Response parsing) complete ({self.completion_counts[8]}/{self.total_pages})")
            
            # Reset retry count on success
            if page_num in self.page_retry_counts:
                del self.page_retry_counts[page_num]
            
            # Pass stage1_6_futures in context so Stage 9 can wait for YOLO
            context_with_futures = self.process_context.copy()
            context_with_futures["stage1_6_futures"] = self.stage1_6_futures
            context_with_futures["stage1_6_face_futures"] = self.stage1_6_face_futures
            
            # Immediately submit to Stage 9 (signature processing)
            stage9_future = self.pool4.submit(self._step9_process_signatures, page_num, self.page_data[page_num], context_with_futures)
            self.stage9_futures[stage9_future] = page_num
            stage9_future.add_done_callback(self.on_stage9_complete)
        except Exception as e:
            self._handle_stage8_retry(page_num, e)

    def _handle_stage8_retry(self, page_num: int, error: Exception):
        """Handle retry logic for Stage 8 failures."""
        retry_count = self.page_retry_counts.get(page_num, 0)
        if retry_count < self.max_retries:
            retry_count += 1
            self.page_retry_counts[page_num] = retry_count
            logger.warning(f"⚠️ [Page {page_num + 1}] Step 8 failed, retrying ({retry_count}/{self.max_retries}): {error}")
            
            page_result = self.page_data[page_num].get("llm_result")
            if page_result:
                stage8_future = self.pool4.submit(self._step8_parse_response, page_num, page_result, self.process_context)
                self.stage8_futures[stage8_future] = page_num
                stage8_future.add_done_callback(self.on_stage8_complete)
            else:
                logger.error(f"❌ [Page {page_num + 1}] Cannot retry Step 8: LLM result not available")
                self.results_dict[page_num] = {
                    "error": str(error),
                    "page_num": page_num + 1,
                    "retry_count": retry_count,
                    "failed_stage": "Response parsing"
                }
                self.completion_counts[9] += 1
        else:
            logger.error(f"❌ [Page {page_num + 1}] Step 8 failed after {retry_count} retries: {error}")
            self.results_dict[page_num] = {
                "error": str(error),
                "page_num": page_num + 1,
                "retry_count": retry_count,
                "failed_stage": "Response parsing"
            }
            self.completion_counts[9] += 1

    # =========================================================================
    # Stage 9 Callback: Signature Processing → Final Result
    # =========================================================================
    def on_stage9_complete(self, future: Future):
        """Callback: Store final result when Stage 9 completes"""
        page_num = self.stage9_futures[future]
        try:
            final_result = future.result()
            self.results_dict[page_num] = final_result
            self.completion_counts[9] += 1
            
            # Log progress at INFO level for every 5 pages or first/last page
            if self.completion_counts[9] == 1 or self.completion_counts[9] == self.total_pages or self.completion_counts[9] % 5 == 0:
                logger.info(f"✅ Processing progress: {self.completion_counts[9]}/{self.total_pages} pages fully processed")
            else:
                logger.debug(f"✅ [Page {page_num + 1}] Step 9 (Signature processing) complete ({self.completion_counts[9]}/{self.total_pages})")
            
            # Reset retry count on success
            if page_num in self.page_retry_counts:
                del self.page_retry_counts[page_num]
            
            # Clean up all PIL images from page_data
            try:
                if "original_img" in self.page_data[page_num]:
                    del self.page_data[page_num]["original_img"]
                if "processed_img" in self.page_data[page_num]:
                    del self.page_data[page_num]["processed_img"]
                if "img" in self.page_data[page_num]:
                    del self.page_data[page_num]["img"]
                if "img_a4" in self.page_data[page_num]:
                    del self.page_data[page_num]["img_a4"]
            except Exception:
                pass
        except Exception as e:
            self._handle_stage9_retry(page_num, e)

    def _handle_stage9_retry(self, page_num: int, error: Exception):
        """Handle retry logic for Stage 9 failures."""
        retry_count = self.page_retry_counts.get(page_num, 0)
        if retry_count < self.max_retries:
            retry_count += 1
            self.page_retry_counts[page_num] = retry_count
            logger.warning(f"⚠️ [Page {page_num + 1}] Step 9 failed, retrying ({retry_count}/{self.max_retries}): {error}")
            
            context_with_futures = self.process_context.copy()
            context_with_futures["stage1_6_futures"] = self.stage1_6_futures
            stage9_future = self.pool4.submit(self._step9_process_signatures, page_num, self.page_data[page_num], context_with_futures)
            self.stage9_futures[stage9_future] = page_num
            stage9_future.add_done_callback(self.on_stage9_complete)
        else:
            logger.error(f"❌ [Page {page_num + 1}] Step 9 failed after {retry_count} retries: {error}")
            self.results_dict[page_num] = {
                "error": str(error),
                "page_num": page_num + 1,
                "retry_count": retry_count,
                "failed_stage": "Signature processing"
            }
            self.completion_counts[9] += 1

    # =========================================================================
    # Skip-Text Mode Callback
    # =========================================================================
    def on_skip_text_get_page_complete(self, future: Future, skip_futures: Dict[Future, int]):
        """Callback: When page is retrieved in skip-text mode, go directly to Stage 2"""
        page_num = skip_futures[future]
        try:
            page = future.result()
            if not page:
                self.results_dict[page_num] = {"error": f"Step 1.3 failed for page {page_num + 1}", "page_num": page_num + 1}
                return
            
            self.page_data[page_num]["page"] = page
            logger.debug(f"✅ [Page {page_num + 1}] Step 1.3 complete - SKIPPING TEXT, going to IMAGE")
            
            # Jump directly to Stage 2
            stage2_future = self.pool1.submit(self.pdf_processor.step1_10_render_page_to_pixmap, page)
            self.stage2_futures[stage2_future] = page_num
            stage2_future.add_done_callback(self.on_stage2_complete)
        except Exception as e:
            logger.error(f"❌ Error in Step 1.3 for page {page_num + 1}: {e}")
            self.results_dict[page_num] = {"error": str(e), "page_num": page_num + 1}
