"""
Configuration constants for ParallelPageProcessor.

Contains all configurable parameters for thread pools, timeouts, and retry logic.
"""

# =============================================================================
# Retry Configuration
# =============================================================================
MAX_RETRIES = 1  # Number of retries for failed operations

# =============================================================================
# Thread Pool Sizes (for concurrent operations)
# =============================================================================
CONVERSION_POOL_SIZE = 50   # PDF page to image conversion
ENCODING_POOL_SIZE = 50     # Image encoding to base64
LLM_POOL_SIZE = 100         # LLM API calls (I/O bound)
SIGNATURE_POOL_SIZE = 50    # Signature processing
YOLO_POOL_SIZE = 20         # YOLO inference (GPU/CPU intensive)

# =============================================================================
# Timeout Configuration (in seconds)
# =============================================================================
MAX_TIMEOUT = 300           # Maximum total operation timeout
POLL_INTERVAL = 0.1         # Interval for checking future completion
YOLO_TIMEOUT = 30           # Timeout for individual YOLO detection
YOLO_BATCH_TIMEOUT = 60     # Timeout for batch YOLO detection

# =============================================================================
# Image Configuration
# =============================================================================
DEFAULT_IMAGE_WIDTH = 2480
DEFAULT_IMAGE_HEIGHT = 3508
JPEG_QUALITY = 85

# =============================================================================
# Text Extraction Configuration
# =============================================================================
TEXT_CONFIDENCE_THRESHOLD = 0.6  # Minimum confidence for text extraction
MIN_TEXT_LENGTH = 10             # Minimum characters for valid text

# =============================================================================
# Logging
# =============================================================================
import logging
logger = logging.getLogger(__name__)
