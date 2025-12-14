"""
Parallel page processor package.
Contains modularized components for parallel PDF page processing.

Module Structure:
- config: Configuration constants (thread pools, timeouts, retries)
- async_utils: Async helper functions for image conversion and content extraction
- yolo_helpers: YOLO signature detection helper functions
- yolo_face_helpers: YOLO face/photo detection helper functions
- pipeline_stages: Step 8, 9, and encoding/LLM processing stages
- callbacks: Pipeline callback factory for stage completion handling
- page_methods: Per-page processing methods for extraction and template matching

Usage:
    from .parallel_page_processor import (
        config,
        step1_6_yolo_signature_detection,
        step1_6_yolo_face_detection,
        step8_parse_response,
        step9_process_signatures,
        PipelineCallbackFactory,
        process_page_for_extraction_sync,
    )
    
    # Main class is in parallel_processor.py:
    from .parallel_processor import ParallelPageProcessor
"""

from . import config
from .async_utils import (
    convert_page_to_image_async,
    extract_page_content_async,
)
from .yolo_helpers import (
    step1_6_yolo_signature_detection,
    step1_6_yolo_signature_detection_full_page,
    step1_6_yolo_signature_detection_full_page_from_pil,
)
from .yolo_face_helpers import (
    step1_6_yolo_face_detection,
    step1_6_yolo_face_detection_full_page,
    step1_6_yolo_face_detection_full_page_from_pil,
)
from .pipeline_stages import (
    step8_parse_response,
    step9_process_signatures,
    process_encoding_and_llm,
)
from .callbacks import PipelineCallbackFactory
from .page_methods import (
    process_page_for_extraction_sync,
    process_page_for_template_extraction,
    process_page_for_template_matching,
)

__all__ = [
    # Config module
    "config",
    # Async utilities
    "convert_page_to_image_async",
    "extract_page_content_async",
    # YOLO signature helpers
    "step1_6_yolo_signature_detection",
    "step1_6_yolo_signature_detection_full_page",
    "step1_6_yolo_signature_detection_full_page_from_pil",
    # YOLO face/photo helpers
    "step1_6_yolo_face_detection",
    "step1_6_yolo_face_detection_full_page",
    "step1_6_yolo_face_detection_full_page_from_pil",
    # Pipeline stages
    "step8_parse_response",
    "step9_process_signatures",
    "process_encoding_and_llm",
    # Callbacks
    "PipelineCallbackFactory",
    # Page methods
    "process_page_for_extraction_sync",
    "process_page_for_template_extraction",
    "process_page_for_template_matching",
]
