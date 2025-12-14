import fitz  # PyMuPDF
import base64
import io
import cv2
import numpy as np
import asyncio
import hashlib
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, List, Dict, Tuple, Any
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """
    PDF processing service using PyMuPDF for converting PDF pages to images
    Optimized for page-by-page processing to avoid hallucination
    """
    
    def __init__(self):
        # PDF processing settings optimized for high accuracy and minimal hallucination
        # Scaling: 8x (576 DPI), A4 size, grayscale + adaptive thresholding, PNG format for lossless quality
        self._last_debug_image = None  # Legacy - kept for backward compatibility
        self._debug_images_by_page: Dict[int, str] = {}  # Store debug images per page number
        # PDF document cache to avoid reopening for each page
        self._pdf_cache: Dict[str, fitz.Document] = {}
        self._pdf_bytes_cache: Dict[str, bytes] = {}
    
    def get_pdf_page_count(self, pdf_data: str) -> int:
        """
        Get the total number of pages in a PDF
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            
        Returns:
            Number of pages in the PDF
        """
        try:
            base64_data = self.extract_base64_from_data_url(pdf_data)
            pdf_bytes = base64.b64decode(base64_data)
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            page_count = len(pdf_document)
            pdf_document.close()
            return page_count
        except Exception as e:
            logger.error(f"Error getting PDF page count: {e}")
            return 0
    
    def step1_1_decode_base64_pdf(self, pdf_data: str) -> Optional[bytes]:
        """
        Step 1.1: Decode Base64 PDF Data
        Returns: PDF bytes or None
        """
        try:
            base64_data = self.extract_base64_from_data_url(pdf_data)
            pdf_bytes = base64.b64decode(base64_data)
            logger.debug(f"📄 Step 1.1: Base64 PDF data decoded ({len(pdf_bytes)} bytes)")
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error in Step 1.1 (Decode Base64 PDF): {e}")
            return None
    
    def step1_2_open_pdf_document(self, pdf_bytes: bytes) -> Optional[fitz.Document]:
        """
        Step 1.2: Open PDF Document
        Returns: PDF document or None
        """
        try:
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            if not pdf_document:
                raise ValueError("Failed to open PDF document")
            logger.debug(f"📄 Step 1.2: PDF document opened ({len(pdf_document)} pages)")
            return pdf_document
        except Exception as e:
            logger.error(f"Error in Step 1.2 (Open PDF Document): {e}")
            return None
    
    def step1_3_get_specific_page(self, pdf_document: fitz.Document, page_number: int) -> Optional[fitz.Page]:
        """
        Step 1.3: Get Specific Page
        Returns: PDF page or None
        """
        try:
            total_pages = len(pdf_document)
            if page_number >= total_pages:
                logger.warning(f"Page {page_number} requested but PDF only has {total_pages} pages")
                return None
            page = pdf_document[page_number]
            logger.debug(f"📄 Step 1.3: Page {page_number + 1} extracted from PDF")
            return page
        except Exception as e:
            logger.error(f"Error in Step 1.3 (Get Specific Page): {e}")
            return None
    
    def step1_4_extract_text_content(self, page: fitz.Page) -> Optional[Dict[str, Any]]:
        """
        Step 1.4: Extract Text Content
        Returns: Dictionary with text, blocks, text_blocks, image_blocks or None
        """
        try:
            text = page.get_text("text")  # Plain text
            blocks = page.get_text("dict")["blocks"]  # Structured text with positions
            
            # Count actual text blocks (not images)
            text_blocks = [b for b in blocks if b.get("type") == 0]  # type 0 = text block
            image_blocks = [b for b in blocks if b.get("type") == 1]  # type 1 = image block
            
            logger.debug(f"📝 Step 1.4: Text extracted - {len(text.strip())} chars, {len(text_blocks)} text blocks, {len(image_blocks)} image blocks")
            
            return {
                "text": text,
                "blocks": blocks,
                "text_blocks": text_blocks,
                "image_blocks": image_blocks
            }
        except Exception as e:
            logger.error(f"Error in Step 1.4 (Extract Text Content): {e}")
            return None
    
    def step1_5_analyze_text_quality(self, text_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Step 1.5: Analyze Text Quality
        Returns: Dictionary with metrics and confidence score
        """
        try:
            text = text_data["text"]
            text_blocks = text_data["text_blocks"]
            image_blocks = text_data["image_blocks"]
            
            # Calculate metrics
            char_count = len(text.strip())
            word_count = len(text.split())
            text_blocks_count = len(text_blocks)
            image_blocks_count = len(image_blocks)
            
            # Determine if text is selectable and of good quality
            is_selectable = False
            confidence = 0.0
            factor_details = {}
            
            if char_count > 50:
                # Check word/char ratio (typical English: ~0.15-0.20)
                word_char_ratio = word_count / char_count if char_count > 0 else 0
                
                # FAST PATH: Minimum viable text - if substantial text with no images, give high confidence
                if char_count > 200 and image_blocks_count == 0 and text_blocks_count > 0:
                    confidence = 0.75  # High confidence for text-heavy pages with no images
                    is_selectable = True
                    factor_details = {
                        "fast_path": "text_heavy_no_images",
                        "reason": f"Substantial text ({char_count} chars) with no images"
                    }
                    logger.debug(f"📊 Step 1.5: Fast path applied - {factor_details['reason']}")
                else:
                    # Calculate confidence based on multiple factors with gradual scoring
                    text_quality_score = 0.0
                    
                    # Factor 1: Character count (max 0.3) - Gradual/proportional scoring
                    if char_count >= 500:
                        char_score = 0.3
                    elif char_count >= 200:
                        # Gradual: 200 = 0.2, 500 = 0.3 (linear interpolation)
                        char_score = 0.2 + (char_count - 200) / 300 * 0.1
                    elif char_count >= 50:
                        # Gradual: 50 = 0.1, 200 = 0.2 (linear interpolation)
                        char_score = 0.1 + (char_count - 50) / 150 * 0.1
                    else:
                        char_score = 0.0
                    text_quality_score += char_score
                    factor_details["char_count"] = f"{char_score:.2f} (chars: {char_count})"
                    
                    # Factor 2: Text blocks presence (max 0.3) - Gradual scoring
                    if text_blocks_count >= 10:
                        blocks_score = 0.3
                    elif text_blocks_count >= 5:
                        # Gradual: 5 = 0.2, 10 = 0.3 (linear interpolation)
                        blocks_score = 0.2 + (text_blocks_count - 5) / 5 * 0.1
                    elif text_blocks_count > 0:
                        # Gradual: 1 = 0.1, 5 = 0.2 (linear interpolation)
                        blocks_score = 0.1 + (text_blocks_count - 1) / 4 * 0.1
                    else:
                        blocks_score = 0.0
                    text_quality_score += blocks_score
                    factor_details["text_blocks"] = f"{blocks_score:.2f} (blocks: {text_blocks_count})"
                    
                    # Factor 3: Word/char ratio (max 0.2) - Expanded range with gradual scoring
                    if 0.08 <= word_char_ratio <= 0.30:
                        # Ideal range expanded: 0.08-0.30 (was 0.10-0.25)
                        if 0.10 <= word_char_ratio <= 0.25:
                            ratio_score = 0.2  # Perfect range
                        else:
                            # Gradual falloff at edges: 0.08-0.10 or 0.25-0.30
                            if word_char_ratio < 0.10:
                                ratio_score = 0.1 + (word_char_ratio - 0.08) / 0.02 * 0.1
                            else:  # word_char_ratio > 0.25
                                ratio_score = 0.2 - (word_char_ratio - 0.25) / 0.05 * 0.1
                    elif 0.05 <= word_char_ratio <= 0.35:
                        # Acceptable range: give partial score
                        ratio_score = 0.1
                    else:
                        ratio_score = 0.0
                    text_quality_score += ratio_score
                    factor_details["word_char_ratio"] = f"{ratio_score:.2f} (ratio: {word_char_ratio:.3f})"
                    
                    # Factor 4: Text vs Image blocks ratio (max 0.2)
                    if image_blocks_count == 0:
                        text_image_score = 0.2  # No images = full score
                    elif text_blocks_count > image_blocks_count * 2:
                        text_image_score = 0.2  # Text dominates
                    elif text_blocks_count > image_blocks_count * 1.5:
                        # Gradual: 1.5x = 0.15, 2x = 0.2
                        ratio = text_blocks_count / image_blocks_count
                        text_image_score = 0.15 + (ratio - 1.5) / 0.5 * 0.05
                    elif text_blocks_count > image_blocks_count:
                        # Gradual: 1x = 0.1, 1.5x = 0.15
                        ratio = text_blocks_count / image_blocks_count
                        text_image_score = 0.1 + (ratio - 1.0) / 0.5 * 0.05
                    else:
                        text_image_score = 0.0
                    text_quality_score += text_image_score
                    factor_details["text_vs_image"] = f"{text_image_score:.2f} (text: {text_blocks_count}, image: {image_blocks_count})"
                    
                    # Bonus 1: Text density bonus - substantial text with no images
                    density_bonus = 0.0
                    if char_count > 300 and image_blocks_count == 0:
                        density_bonus = 0.15
                        factor_details["density_bonus"] = f"+0.15 (text-heavy, no images)"
                    elif char_count > 500 and text_blocks_count > image_blocks_count * 3:
                        density_bonus = 0.10
                        factor_details["density_bonus"] = f"+0.10 (high text density)"
                    text_quality_score += density_bonus
                    
                    # Bonus 2: Text block density - reward dense text blocks
                    if text_blocks_count > 0:
                        chars_per_block = char_count / text_blocks_count
                        if chars_per_block > 100:  # Dense blocks (lots of text per block)
                            block_density_bonus = min(0.05, (chars_per_block - 100) / 200 * 0.05)
                            text_quality_score += block_density_bonus
                            factor_details["block_density_bonus"] = f"+{block_density_bonus:.2f} (dense blocks: {chars_per_block:.1f} chars/block)"
                    
                    # Cap at 1.0
                    confidence = min(1.0, text_quality_score)
                    is_selectable = confidence >= 0.5  # Threshold for "good enough" text
                    
                    # Log detailed factor breakdown
                    logger.debug(f"📊 Step 1.5: Confidence breakdown - Total: {confidence:.2f}")
                    for factor, detail in factor_details.items():
                        logger.debug(f"   - {factor}: {detail}")
            
            logger.info(f"📊 Step 1.5: Text quality analyzed - Confidence: {confidence:.2f}, Selectable: {is_selectable}, Chars: {char_count}, Words: {word_count}, Text blocks: {text_blocks_count}, Image blocks: {image_blocks_count}")
            
            return {
                "char_count": char_count,
                "word_count": word_count,
                "confidence": confidence,
                "is_selectable": is_selectable,
                "text_blocks_count": text_blocks_count,
                "image_blocks_count": image_blocks_count,
                "factor_details": factor_details
            }
        except Exception as e:
            logger.error(f"Error in Step 1.5 (Analyze Text Quality): {e}")
            return {"confidence": 0.0, "is_selectable": False}
    
    def extract_text_from_page(self, pdf_data: str, page_number: int = 0) -> Optional[Dict[str, Any]]:
        """
        Extract text from a single PDF page and check if it's selectable/readable
        Uses granular steps for detailed logging
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            page_number: Page number to extract text from (0-indexed)
            
        Returns:
            Dictionary with:
                - text: Extracted text content
                - is_selectable: Whether the text is selectable (not scanned image)
                - char_count: Number of characters extracted
                - word_count: Number of words extracted
                - confidence: Confidence score (0-1) of text quality
        """
        try:
            # Step 1.1: Decode Base64 PDF Data
            pdf_bytes = self.step1_1_decode_base64_pdf(pdf_data)
            if not pdf_bytes:
                return None
            
            # Step 1.2: Open PDF Document
            pdf_document = self.step1_2_open_pdf_document(pdf_bytes)
            if not pdf_document:
                return None
            
            # Step 1.3: Get Specific Page
            page = self.step1_3_get_specific_page(pdf_document, page_number)
            if not page:
                pdf_document.close()
                return None
            
            # Step 1.4: Extract Text Content
            text_data = self.step1_4_extract_text_content(page)
            if not text_data:
                pdf_document.close()
                return None
            
            # Step 1.5: Analyze Text Quality
            quality_data = self.step1_5_analyze_text_quality(text_data)
            
            pdf_document.close()
            
            result = {
                "text": text_data["text"].strip(),
                "is_selectable": quality_data["is_selectable"],
                "char_count": quality_data["char_count"],
                "word_count": quality_data["word_count"],
                "confidence": quality_data["confidence"],
                "text_blocks": quality_data["text_blocks_count"],
                "image_blocks": quality_data["image_blocks_count"],
                "page_number": page_number + 1  # 1-indexed for display
            }
            
            logger.info(f"📝 Text extraction from page {page_number + 1}:")
            logger.info(f"   Characters: {result['char_count']}, Words: {result['word_count']}")
            logger.info(f"   Text blocks: {result['text_blocks']}, Image blocks: {result['image_blocks']}")
            logger.info(f"   Confidence: {result['confidence']:.2f}, Selectable: {result['is_selectable']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF page {page_number}: {e}")
            return None
    
    def is_pdf_data(self, document_data: str) -> bool:
        """
        Check if the document data is a PDF
        """
        try:
            # Check if it's a data URL with PDF content
            if document_data.startswith("data:application/pdf"):
                return True
            
            # Check if it's base64 PDF data
            if document_data.startswith("data:application/pdf;base64,"):
                return True
                
            # Try to decode and check PDF header
            if document_data.startswith("data:application/pdf;base64,"):
                base64_data = document_data.split("base64,")[1]
                decoded_data = base64.b64decode(base64_data)
                return decoded_data.startswith(b'%PDF')
                
            return False
        except Exception as e:
            logger.error(f"Error checking PDF data: {e}")
            return False
    
    def extract_base64_from_data_url(self, data_url: str) -> str:
        """
        Extract base64 data from data URL
        """
        try:
            if "base64," in data_url:
                return data_url.split("base64,")[1]
            return data_url
        except Exception as e:
            logger.error(f"Error extracting base64 data: {e}")
            raise ValueError("Invalid data URL format")
    
    def extract_page_content(
        self, 
        pdf_data: str, 
        page_number: int = 0,
        prefer_text: bool = True,
        text_confidence_threshold: float = 0.6
    ) -> Optional[Dict[str, Any]]:
        """
        Intelligently extract content from a PDF page - uses text if available, 
        otherwise falls back to image conversion
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            page_number: Page number to extract (0-indexed)
            prefer_text: Whether to prefer text extraction over image conversion
            text_confidence_threshold: Minimum confidence (0-1) to use text extraction
            
        Returns:
            Dictionary with:
                - content_type: "text" or "image"
                - text: Extracted text (if content_type is "text")
                - processed: Processed image data URL (if content_type is "image")
                - original: Original image data URL (if content_type is "image")
                - metadata: Additional information about the extraction
        """
        try:
            metadata = {
                "page_number": page_number + 1,
                "extraction_method": None,
                "confidence": 0.0
            }
            
            # Try text extraction first if preferred
            if prefer_text:
                text_data = self.extract_text_from_page(pdf_data, page_number)
                
                if text_data and text_data["is_selectable"] and text_data["confidence"] >= text_confidence_threshold:
                    logger.info(f"✅ Using TEXT extraction for page {page_number + 1} (confidence: {text_data['confidence']:.2f})")
                    metadata["extraction_method"] = "text"
                    metadata["confidence"] = text_data["confidence"]
                    metadata["char_count"] = text_data["char_count"]
                    metadata["word_count"] = text_data["word_count"]
                    
                    return {
                        "content_type": "text",
                        "text": text_data["text"],
                        "metadata": metadata
                    }
                else:
                    if text_data:
                        logger.info(f"⚠️ Text quality insufficient (confidence: {text_data['confidence']:.2f}), falling back to IMAGE conversion")
                    else:
                        logger.info(f"⚠️ Text extraction failed, falling back to IMAGE conversion")
            
            # Fall back to image conversion
            logger.info(f"🖼️ Using IMAGE conversion for page {page_number + 1}")
            image_data = self.convert_pdf_page_to_image(pdf_data, page_number)
            
            if image_data:
                # Convert PIL Images to base64 data URLs
                processed_img = image_data.get("processed")
                original_img = image_data.get("original")
                
                if processed_img and original_img:
                    processed_base64 = self._encode_image_simple(processed_img)
                    original_base64 = self._encode_image_simple(original_img)
                    
                    metadata["extraction_method"] = "image"
                    metadata["confidence"] = 1.0  # Image conversion is always reliable
                    
                    return {
                        "content_type": "image",
                        "processed": processed_base64,
                        "original": original_base64,
                        "metadata": metadata
                    }
            else:
                logger.error(f"❌ Failed to extract content from page {page_number + 1}")
                return None
                
        except Exception as e:
            logger.error(f"Error extracting page content: {e}")
            return None
    
    def _get_cached_pdf_document(self, pdf_data: str) -> Tuple[fitz.Document, bytes]:
        """
        Get or create cached PDF document to avoid reopening for each page
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            
        Returns:
            Tuple of (PDF document, PDF bytes)
        """
        base64_data = self.extract_base64_from_data_url(pdf_data)
        pdf_bytes = base64.b64decode(base64_data)
        
        # Create hash for caching (use first 16 bytes + size for faster hashing)
        pdf_hash = hashlib.md5(pdf_bytes).hexdigest()
        
        if pdf_hash not in self._pdf_cache:
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            if not pdf_document:
                raise ValueError("Failed to open PDF document")
            self._pdf_cache[pdf_hash] = pdf_document
            self._pdf_bytes_cache[pdf_hash] = pdf_bytes
            logger.debug(f"📄 Cached PDF document (hash: {pdf_hash[:8]}..., pages: {len(pdf_document)})")
        
        return self._pdf_cache[pdf_hash], self._pdf_bytes_cache[pdf_hash]
    
    def step1_get_pdf_page(self, pdf_data: str, page_number: int) -> Optional[Tuple[fitz.Document, fitz.Page]]:
        """
        Step 1: PDF caching & page extraction
        Returns: (pdf_document, page) tuple or None
        """
        try:
            pdf_document, pdf_bytes = self._get_cached_pdf_document(pdf_data)
            total_pages = len(pdf_document)
            
            if page_number >= total_pages:
                logger.warning(f"Page {page_number} requested but PDF only has {total_pages} pages")
                return None
            
            page = pdf_document[page_number]
            logger.debug(f"📄 [Page {page_number + 1}] Step 1: PDF page extracted")
            return (pdf_document, page)
        except Exception as e:
            logger.error(f"Error in Step 1 for page {page_number + 1}: {e}")
            return None
    
    def step1_7_decode_base64_pdf_fallback(self, pdf_data: str) -> Optional[bytes]:
        """
        Step 1.7 (Fallback): Decode Base64 PDF Data
        Returns: PDF bytes or None
        """
        try:
            base64_data = self.extract_base64_from_data_url(pdf_data)
            pdf_bytes = base64.b64decode(base64_data)
            logger.debug(f"📄 Step 1.7 (Fallback): Base64 PDF data decoded ({len(pdf_bytes)} bytes)")
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error in Step 1.7 (Decode Base64 PDF - Fallback): {e}")
            return None
    
    def step1_8_open_pdf_document_fallback(self, pdf_bytes: bytes) -> Optional[fitz.Document]:
        """
        Step 1.8 (Fallback): Open PDF Document
        Returns: PDF document or None
        """
        try:
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            if not pdf_document:
                raise ValueError("Failed to open PDF document")
            logger.debug(f"📄 Step 1.8 (Fallback): PDF document opened ({len(pdf_document)} pages)")
            return pdf_document
        except Exception as e:
            logger.error(f"Error in Step 1.8 (Open PDF Document - Fallback): {e}")
            return None
    
    def step1_9_get_specific_page_fallback(self, pdf_document: fitz.Document, page_number: int) -> Optional[fitz.Page]:
        """
        Step 1.9 (Fallback): Get Specific Page
        Returns: PDF page or None
        """
        try:
            total_pages = len(pdf_document)
            if page_number >= total_pages:
                logger.warning(f"Page {page_number} requested but PDF only has {total_pages} pages")
                return None
            page = pdf_document[page_number]
            logger.debug(f"📄 Step 1.9 (Fallback): Page {page_number + 1} extracted from PDF")
            return page
        except Exception as e:
            logger.error(f"Error in Step 1.9 (Get Specific Page - Fallback): {e}")
            return None
    
    def step1_10_render_page_to_pixmap(self, page: fitz.Page) -> Optional[fitz.Pixmap]:
        """
        Step 1.10 (Fallback): Render Page to Pixmap (5x scaling = 576 DPI)
        Returns: Pixmap or None
        """
        try:
            mat = fitz.Matrix(5, 5)  # 5x scaling (576 DPI)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            logger.debug(f"🖼️ Step 1.10 (Fallback): Page rendered to pixmap ({pix.width}x{pix.height})")
            return pix
        except Exception as e:
            logger.error(f"Error in Step 1.10 (Render Page to Pixmap): {e}")
            return None

    
    def step1_11_convert_pixmap_to_pil(self, pix: fitz.Pixmap) -> Optional[Image.Image]:
        """
        Step 1.11 (Fallback): Convert Pixmap to PIL Image
        Returns: PIL Image or None
        """
        try:
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            logger.debug(f"🖼️ Step 1.11 (Fallback): Pixmap converted to PIL Image ({img.size[0]}x{img.size[1]}, mode: {img.mode})")
            return img
        except Exception as e:
            logger.error(f"Error in Step 1.11 (Convert Pixmap to PIL): {e}")
            return None
    
    def step1_12_convert_to_rgb_mode(self, img: Image.Image) -> Image.Image:
        """
        Step 1.12 (Fallback): Convert to RGB Mode
        Returns: PIL Image in RGB mode
        """
        try:
            if img.mode != 'RGB':
                img = img.convert('RGB')
                logger.debug(f"🖼️ Step 1.12 (Fallback): Image converted to RGB mode")
            else:
                logger.debug(f"🖼️ Step 1.12 (Fallback): Image already in RGB mode")
            return img
        except Exception as e:
            logger.error(f"Error in Step 1.12 (Convert to RGB Mode): {e}")
            return img
    
    def step2_render_pdf_page(self, page: fitz.Page) -> Optional[fitz.Pixmap]:
        """
        Step 2: PDF rendering (3x scaling) - Legacy method, uses step1_10 internally
        Returns: Pixmap or None
        """
        return self.step1_10_render_page_to_pixmap(page)
    
    def step3_create_pil_image(self, pix: fitz.Pixmap) -> Optional[Image.Image]:
        """
        Step 3: PIL image creation - Legacy method, uses step1_11 and step1_12 internally
        Returns: PIL Image or None
        """
        try:
            img = self.step1_11_convert_pixmap_to_pil(pix)
            if img:
                img = self.step1_12_convert_to_rgb_mode(img)
            return img
        except Exception as e:
            logger.error(f"Error in Step 3: {e}")
            return None
    
    def step1_13_resize_to_a4_size(self, img: Image.Image) -> Image.Image:
        """
        Step 1.13 (Fallback): Resize to A4 Size (2480x3508 pixels at 300 DPI)
        Returns: A4-sized PIL Image
        """
        try:
            img = self._convert_to_a4_size_fast(img)
            logger.debug(f"📐 Step 1.13 (Fallback): Image resized to A4 size (2480x3508)")
            return img
        except Exception as e:
            logger.warning(f"Error in Step 1.13 (Resize to A4 Size), using original: {e}")
            return img
    
    def step1_14_store_original_image_copy(self, img: Image.Image) -> Image.Image:
        """
        Step 1.14 (Fallback): Store Original Image Copy
        Returns: Copy of original image for signature cropping
        """
        try:
            original_copy = img.copy()
            logger.debug(f"💾 Step 1.14 (Fallback): Original image copy stored")
            return original_copy
        except Exception as e:
            logger.error(f"Error in Step 1.14 (Store Original Image Copy): {e}")
            return img.copy()
            
    def step1_15_apply_text_enhancement(self, img: Image.Image) -> Image.Image:
        """
        Step 1.15 (Fallback): Apply Text Enhancement (grayscale + adaptive thresholding)
        Returns: Processed PIL Image
        """
        try:
            processed_img = self._apply_text_enhancement(img)
            logger.debug(f"✨ Step 1.15 (Fallback): Text enhancement applied (grayscale + adaptive thresholding)")
            return processed_img
        except Exception as e:
            logger.warning(f"Error in Step 1.15 (Apply Text Enhancement), using original: {e}")
            return img
    
    def step4_convert_to_a4(self, img: Image.Image) -> Image.Image:
        """
        Step 4: A4 size conversion - Legacy method, uses step1_13 internally
        Returns: A4-sized PIL Image
        """
        return self.step1_13_resize_to_a4_size(img)
    
    def step5_apply_text_enhancement(self, img: Image.Image) -> Tuple[Image.Image, Image.Image]:
        """
        Step 5: Text enhancement - Legacy method, uses step1_14 and step1_15 internally
        Returns: (processed_img, original_img) tuple
        """
        try:
            original_img = self.step1_14_store_original_image_copy(img)
            processed_img = self.step1_15_apply_text_enhancement(img)
            return (processed_img, original_img)
        except Exception as e:
            logger.warning(f"Error in Step 5, using original: {e}")
            return (img, img.copy())
    
    def convert_pdf_page_to_image(
        self, 
        pdf_data: str, 
        page_number: int = 0
    ) -> Optional[Dict[str, Image.Image]]:
        """
        Convert a single PDF page to image (used for page-by-page processing)
        Uses cached PDF document to avoid reopening for each page.
        This is a convenience method that calls all steps sequentially.
        For pipeline processing, use the individual step methods.
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            page_number: Page number to convert (0-indexed)
            
        Returns:
            Dictionary with "processed" and "original" PIL Images, or None if conversion fails
        """
        try:
            # Step 1: Get PDF page
            step1_result = self.step1_get_pdf_page(pdf_data, page_number)
            if not step1_result:
                return None
            pdf_document, page = step1_result
            
            # Step 2: Render PDF page
            pix = self.step2_render_pdf_page(page)
            if not pix:
                return None
            
            # Step 3: Create PIL image
            img = self.step3_create_pil_image(pix)
            if not img:
                return None
            
            # Step 4: Convert to A4
            img = self.step4_convert_to_a4(img)
            
            # Step 5: Apply text enhancement
            processed_img, original_img = self.step5_apply_text_enhancement(img)
            
            logger.info(f"✅ Page {page_number + 1} converted: {processed_img.width}x{processed_img.height}")
            
            return {
                "processed": processed_img,
                "original": original_img
            }
            
        except Exception as e:
            logger.error(f"Error converting PDF page {page_number} to image: {e}")
            return None
    
    # Fully removed: combined image logic; this method intentionally does not exist anymore.
    
    def _convert_to_a4_size(self, image: Image.Image) -> Image.Image:
        """
        Convert image to A4 size (2480x3508 pixels at 300 DPI)
        Maintains aspect ratio and centers the content
        """
        try:
            # A4 size at 300 DPI: 2480x3508 pixels
            a4_width = 2480
            a4_height = 3508
            
            # Create a white A4 background
            a4_image = Image.new('RGB', (a4_width, a4_height), 'white')
            
            # Calculate scaling to fit image within A4 while maintaining aspect ratio
            img_width, img_height = image.size
            scale_width = a4_width / img_width
            scale_height = a4_height / img_height
            scale = min(scale_width, scale_height)  # Use smaller scale to fit entirely
            
            # Resize image maintaining aspect ratio
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Calculate position to center the image on A4
            x_offset = (a4_width - new_width) // 2
            y_offset = (a4_height - new_height) // 2
            
            # Paste the resized image onto the A4 background
            a4_image.paste(resized_image, (x_offset, y_offset))
            
            logger.info(f"Converted to A4 size: {img_width}x{img_height} -> {a4_width}x{a4_height}")
            return a4_image
            
        except Exception as e:
            logger.warning(f"Failed to convert to A4 size, using original: {e}")
            return image
    
    def _convert_to_a4_size_fast(self, image: Image.Image) -> Image.Image:
        """
        Convert image to A4 size (2480x3508 pixels at 300 DPI) - optimized version
        Uses faster BILINEAR resampling instead of LANCZOS for ~30% speed improvement
        Maintains aspect ratio and centers the content
        """
        try:
            # A4 size at 300 DPI: 2480x3508 pixels
            a4_width = 2480
            a4_height = 3508
            
            # Create a white A4 background
            a4_image = Image.new('RGB', (a4_width, a4_height), 'white')
            
            # Calculate scaling to fit image within A4 while maintaining aspect ratio
            img_width, img_height = image.size
            scale_width = a4_width / img_width
            scale_height = a4_height / img_height
            scale = min(scale_width, scale_height)  # Use smaller scale to fit entirely
            
            # Resize image maintaining aspect ratio - use BILINEAR for faster processing
            new_width = int(img_width * scale)
            new_height = int(img_height * scale)
            resized_image = image.resize((new_width, new_height), Image.Resampling.BILINEAR)
            
            # Calculate position to center the image on A4
            x_offset = (a4_width - new_width) // 2
            y_offset = (a4_height - new_height) // 2
            
            # Paste the resized image onto the A4 background
            a4_image.paste(resized_image, (x_offset, y_offset))
            
            logger.debug(f"Converted to A4 size (fast): {img_width}x{img_height} -> {a4_width}x{a4_height}")
            return a4_image
            
        except Exception as e:
            logger.warning(f"Failed to convert to A4 size (fast), using original: {e}")
            return image

    def _apply_text_enhancement(self, image: Image.Image) -> Image.Image:
        """
        Apply grayscale conversion and adaptive thresholding for better text clarity
        Optimized for speed while maintaining quality
        """
        try:
            # Convert PIL Image to OpenCV format
            img_array = np.array(image)
            
            # Convert to grayscale (8-bit) - optimized path
            if len(img_array.shape) == 3:
                # Use faster conversion for RGB images
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Apply adaptive thresholding with optimized parameters
            # Using slightly larger block size (37 instead of 35) for faster processing
            # while maintaining good text clarity
            thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 37, 11
            )
            
            # Convert back to PIL Image - use faster conversion
            enhanced_image = Image.fromarray(thresh, mode='L').convert('RGB')
            
            logger.debug("Applied grayscale conversion and adaptive thresholding for text enhancement")
            return enhanced_image
            
        except Exception as e:
            logger.warning(f"Failed to apply text enhancement, using original: {e}")
            return image

    # Watermark removal logic removed as per user request
    
    def _encode_image_simple(self, image: Image.Image) -> str:
        """
        Optimized image encoding - uses JPEG for faster encoding while maintaining good quality
        JPEG encoding is ~3-5x faster than PNG and produces smaller files
        Uses quality=90 for excellent text clarity with significant speed improvement
        """
        buf = io.BytesIO()
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        
        # Use JPEG with quality 90 for faster encoding (~3-5x faster than PNG)
        # Quality 90 provides excellent text clarity while being much faster
        # For grayscale/thresholded images, JPEG works well and is significantly faster
        image.save(buf, format="JPEG", quality=90, optimize=False)
        img_bytes = buf.getvalue()
        img_base64 = base64.b64encode(img_bytes).decode("utf-8")
        logger.debug(f"Encoded image: {len(img_bytes)} bytes in JPEG format (quality=90)")
        return f"data:image/jpeg;base64,{img_base64}"

    async def convert_pdf_to_images(self, pdf_data: str) -> List[str]:
        """
        Convert all pages of a PDF to images (parallel version)
        Uses cached PDF document for improved performance
        
        Args:
            pdf_data: Base64 encoded PDF data or data URL
            
        Returns:
            List of base64 encoded image data URLs
        """
        try:
            from ..core.config import settings
            
            # Get page count first
            page_count = self.get_pdf_page_count(pdf_data)
            if page_count == 0:
                logger.warning("PDF has no pages")
                return []
            
            logger.info(f"Converting PDF with {page_count} pages to images (parallel)")
            
            # Use thread pool executor for parallel conversion
            max_workers = settings.PDF_PROCESSING_MAX_WORKERS
            thread_pool = ThreadPoolExecutor(max_workers=max_workers)
            
            # CRITICAL FIX #1: Wrap in try-finally to ensure thread pool shutdown
            try:
                loop = asyncio.get_event_loop()
                
                async def convert_page_async(page_num: int) -> Optional[str]:
                    """Convert a single page asynchronously and encode to base64"""
                    try:
                        # Convert PDF page to PIL Image (in thread pool)
                        # Use submit() + wrap_future() for better event loop integration
                        from concurrent.futures import Future
                        future: Future = thread_pool.submit(
                            self.convert_pdf_page_to_image,
                            pdf_data,
                            page_num
                        )
                        image_data = await asyncio.wrap_future(future)
                        if image_data and isinstance(image_data, dict):
                            processed_image_pil = image_data.get("processed")
                            if processed_image_pil:
                                # Encode to base64 in async context (not blocking thread pool)
                                processed_image_base64 = self._encode_image_simple(processed_image_pil)
                                
                                # CRITICAL FIX #6: Delete PIL image after encoding to free memory
                                try:
                                    del processed_image_pil
                                except Exception:
                                    pass
                                
                                logger.debug(f"Converted and encoded page {page_num + 1}/{page_count}")
                                return processed_image_base64
                    except Exception as e:
                        logger.warning(f"Failed to convert page {page_num + 1}: {e}")
                    return None
                
                # Convert all pages in parallel
                tasks = [convert_page_async(page_num) for page_num in range(page_count)]
                results = await asyncio.gather(*tasks)
                
                # Filter out None results and maintain order
                images = [img for img in results if img is not None]
                
                logger.info(f"Successfully converted {len(images)} pages to images")
                return images
                
            finally:
                # CRITICAL FIX #1: Always shutdown thread pool, even on errors
                try:
                    thread_pool.shutdown(wait=True)
                    logger.debug("✅ Thread pool shut down in convert_pdf_to_images")
                except Exception as e:
                    logger.warning(f"⚠️ Error shutting down thread pool: {e}")
                
                # CRITICAL FIX #2: Always clear PDF cache, even on errors
                try:
                    self.clear_pdf_cache()
                except Exception as e:
                    logger.warning(f"⚠️ Error clearing PDF cache: {e}")
            
        except Exception as e:
            logger.error(f"Error converting PDF to images: {e}")
            return []

    def convert_signature_coordinates(
        self,
        bbox: List[int],
        llm_width: int,
        llm_height: int,
        actual_width: int,
        actual_height: int
    ) -> List[int]:
        """
        Convert signature bbox coordinates from LLM size to actual image size
        
        Args:
            bbox: Original bbox [xmin, ymin, xmax, ymax] from LLM
            llm_width, llm_height: Image dimensions that LLM processed
            actual_width, actual_height: Actual image dimensions
            
        Returns:
            Converted bbox coordinates [xmin, ymin, xmax, ymax]
        """
        # CENTRALIZED FINE-TUNING PARAMETERS - Change these values to adjust signature detection
        extra_scale_x = 0.8  # Horizontal scaling - keep wide for full signature width
        extra_scale_y = 1.12  # Vertical scaling - increased to capture more vertical flourish
        offset_x = 0          # Horizontal offset - signature appears centered
        offset_y = 0         # Vertical offset - reduced to center better on the line
        if len(bbox) != 4:
            logger.error(f"Invalid bbox format: {bbox}. Expected [xmin, ymin, xmax, ymax]")
            return bbox
            
        # Calculate scaling factors with higher precision
        scale_x = actual_width / llm_width
        scale_y = actual_height / llm_height
        
        # Use consistent scaling if factors are very close (within 1%)
        if abs(scale_x - scale_y) / max(scale_x, scale_y) < 0.01:
            avg_scale = (scale_x + scale_y) / 2
            scale_x = scale_y = avg_scale
            logger.info(f"   Using consistent scale factor: {avg_scale:.6f}")
        
        logger.info(f"🔍 FINE-TUNING DEBUG:")
        logger.info(f"   Original bbox: {bbox}")
        logger.info(f"   LLM image size: {llm_width}x{llm_height}")
        logger.info(f"   Actual image size: {actual_width}x{actual_height}")
        logger.info(f"   Base scale factors: x={scale_x:.3f}, y={scale_y:.3f}")
        
        # Calculate intermediate values
        scaled_xmin = bbox[0] * scale_x
        scaled_ymin = bbox[1] * scale_y
        scaled_xmax = bbox[2] * scale_x
        scaled_ymax = bbox[3] * scale_y
        
        logger.info(f"   After base scaling: [{scaled_xmin:.1f}, {scaled_ymin:.1f}, {scaled_xmax:.1f}, {scaled_ymax:.1f}]")
        
        # Apply extra scaling and offset
        final_xmin = round(scaled_xmin * extra_scale_x + offset_x)
        final_ymin = round(scaled_ymin * extra_scale_y + offset_y)
        final_xmax = round(scaled_xmax * extra_scale_x + offset_x)
        final_ymax = round(scaled_ymax * extra_scale_y + offset_y)
        
        converted_bbox = [final_xmin, final_ymin, final_xmax, final_ymax]
        
        logger.info(f"   Extra scaling: {extra_scale_x}x, {extra_scale_y}x")
        logger.info(f"   Position offset: x={offset_x}, y={offset_y}")
        logger.info(f"   Final bbox: {converted_bbox}")
        logger.info(f"   Size change: {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} -> {final_xmax-final_xmin}x{final_ymax-final_ymin}")
        
        return converted_bbox

    def crop_signature_from_image(
        self, 
        page_image_data: str, 
        bbox: List[int],
        create_debug_image: bool = False
    ) -> Optional[str]:
        """
        Crop signature from page image using bounding box coordinates
        
        Args:
            page_image_data: Base64 encoded image data URL of the page
            bbox: Bounding box [xmin, ymin, xmax, ymax] in pixels
            create_debug_image: If True, also creates a debug image with bbox drawn
            
        Returns:
            Base64 encoded cropped signature image data URL or None if cropping fails
        """
        try:
            # Extract base64 data from data URL
            if page_image_data.startswith("data:image/"):
                base64_data = page_image_data.split("base64,")[1]
            else:
                base64_data = page_image_data
                
            # Decode image
            img_bytes = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(img_bytes))
            
            # Validate bbox
            if len(bbox) != 4:
                logger.error(f"Invalid bbox format: {bbox}. Expected [xmin, ymin, xmax, ymax]")
                return None
                
            xmin, ymin, xmax, ymax = bbox
            
            # Validate coordinates
            if xmin >= xmax or ymin >= ymax:
                logger.error(f"Invalid bbox coordinates: {bbox}. xmax must be > xmin, ymax must be > ymin")
                return None
                
            if xmin < 0 or ymin < 0 or xmax > img.width or ymax > img.height:
                logger.warning(f"🔍 CLIPPING DETECTED:")
                logger.warning(f"   Input bbox: {bbox}")
                logger.warning(f"   Image dimensions: {img.width}x{img.height}")
                logger.warning(f"   Bbox extends beyond boundaries!")
                
                # Clip to image boundaries with some safety margin
                original_xmin, original_ymin, original_xmax, original_ymax = xmin, ymin, xmax, ymax
                xmin = max(0, min(xmin, img.width - 1))
                ymin = max(0, min(ymin, img.height - 1))
                xmax = min(xmax, img.width)
                ymax = min(ymax, img.height)
                
                logger.warning(f"   Clipped bbox: [{xmin}, {ymin}, {xmax}, {ymax}]")
                logger.warning(f"   Size reduction: {original_xmax-original_xmin}x{original_ymax-original_ymin} -> {xmax-xmin}x{ymax-ymin}")
                
                # Ensure minimum bbox size after clipping
                if xmax - xmin < 10 or ymax - ymin < 10:
                    logger.warning(f"Bbox too small after clipping: [{xmin}, {ymin}, {xmax}, {ymax}]")
                    return None
            
            # Crop the signature region using PIL's native format (left, top, right, bottom)
            signature_img = img.crop((xmin, ymin, xmax, ymax))
            
            # Debug logging
            logger.info(f"🔍 Cropping signature from original image:")
            logger.info(f"   Original image size: {img.width}x{img.height}")
            logger.info(f"   Bbox [xmin, ymin, xmax, ymax]: [{xmin}, {ymin}, {xmax}, {ymax}]")
            logger.info(f"   Cropped region: ({xmin}, {ymin}) to ({xmax}, {ymax})")
            logger.info(f"   Cropped image size: {signature_img.width}x{signature_img.height}")
            logger.info(f"   Cropped image mode: {signature_img.mode}")
            
            # Add some padding around the signature for better visibility
            padding = 25
            width, height = signature_img.width, signature_img.height
            padded_width = width + (2 * padding)
            padded_height = height + (2 * padding)
            
            # Create a white background with padding
            padded_img = Image.new('RGB', (padded_width, padded_height), 'white')
            padded_img.paste(signature_img, (padding, padding))
            
            logger.info(f"   Final padded image size: {padded_img.width}x{padded_img.height}")
            logger.info(f"   Final padded image mode: {padded_img.mode}")
            
            # Encode as high-quality PNG
            buf = io.BytesIO()
            padded_img.save(buf, format="PNG", optimize=True)
            img_bytes = buf.getvalue()
            img_base64 = base64.b64encode(img_bytes).decode("utf-8")
            
            logger.info(f"✅ Cropped signature: {width}x{height} -> {padded_width}x{padded_height} ({len(img_bytes)} bytes)")
            
            # Create debug image with bbox drawn if requested
            if create_debug_image:
                debug_img = img.copy()
                self._draw_bbox_on_image(debug_img, bbox)
                debug_data_url = self._encode_image_simple(debug_img)
                logger.debug(f"🔍 Created debug image with bbox drawn")
                # Store debug image globally for access (temporary solution)
                self._last_debug_image = debug_data_url
            
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            logger.error(f"Error cropping signature from image: {e}")
            return None

    def _draw_bbox_on_image(self, image: Image.Image, bbox: List[int]) -> None:
        """
        Draw a red rectangle around the bbox on the image for debugging
        
        Args:
            image: PIL Image to draw on
            bbox: Bounding box [xmin, ymin, xmax, ymax] in pixels
        """
        try:
            from PIL import ImageDraw
            
            if len(bbox) != 4:
                logger.warning(f"Invalid bbox format: {bbox}")
                return
                
            xmin, ymin, xmax, ymax = bbox
            
            # Create a drawing context
            draw = ImageDraw.Draw(image)
            
            # Draw a red rectangle around the bbox
            # Use a thick line for visibility
            draw.rectangle([xmin, ymin, xmax, ymax], outline="red", width=5)
            
            # Add a label
            draw.text((xmin, ymin - 25), "Signature Bbox", fill="red")
            
            logger.debug(f"🔍 Drew bbox rectangle: ({xmin}, {ymin}) to ({xmax}, {ymax})")
            
        except Exception as e:
            logger.error(f"Error drawing bbox on image: {e}")

    def get_last_debug_image(self) -> Optional[str]:
        """
        Get the last created debug image with bbox drawn
        
        Returns:
            Base64 encoded debug image data URL or None if no debug image was created
        """
        return self._last_debug_image
    
    def get_debug_images_by_page(self) -> Dict[int, str]:
        """
        Get all debug images organized by page number
        
        Returns:
            Dictionary mapping page numbers (1-indexed) to debug image data URLs
        """
        return self._debug_images_by_page.copy()
    
    def clear_debug_images(self):
        """Clear all stored debug images (useful between document processing runs)"""
        self._last_debug_image = None
        self._debug_images_by_page.clear()
    
    def clear_pdf_cache(self):
        """
        Clear PDF document cache (call after processing complete)
        This closes all cached PDF documents and frees memory
        """
        for pdf_hash, pdf_document in self._pdf_cache.items():
            try:
                pdf_document.close()
                logger.debug(f"🔒 Closed cached PDF document (hash: {pdf_hash[:8]}...)")
            except Exception as e:
                logger.warning(f"⚠️ Error closing PDF document (hash: {pdf_hash[:8]}...): {e}")
        
        self._pdf_cache.clear()
        self._pdf_bytes_cache.clear()
        logger.debug("🧹 Cleared PDF document cache")

    def _create_debug_image_with_all_bboxes(self, page_image_data: str, signatures: List[dict]):
        """
        Create a debug image with all signature bboxes drawn on it
        
        Args:
            page_image_data: Base64 encoded image data URL of the page
            signatures: List of signature objects with bbox coordinates
        """
        try:
            # Extract base64 data from data URL
            if page_image_data.startswith("data:image/"):
                base64_data = page_image_data.split("base64,")[1]
            else:
                base64_data = page_image_data
                
            # Decode image
            img_bytes = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(img_bytes))
            
            # Draw all bboxes on the image
            for i, signature in enumerate(signatures):
                bbox = signature.get('bbox', [])
                if len(bbox) == 4:
                    self._draw_bbox_on_image(img, bbox)
                    logger.debug(f"🔍 Drew bbox {i+1}/{len(signatures)}: {signature.get('label', 'unknown')}")
            
            # Encode the debug image
            debug_data_url = self._encode_image_simple(img)
            self._last_debug_image = debug_data_url  # Legacy - keep for backward compatibility
            logger.debug(f"🔍 Created debug image with {len(signatures)} bboxes drawn")
            
        except Exception as e:
            logger.error(f"Error creating debug image with all bboxes: {e}")

    def crop_signatures_from_page(
        self, 
        page_image_data: str, 
        signatures: List[dict],
        create_debug_image: bool = True,
        page_number: Optional[int] = None
    ) -> List[dict]:
        """
        Crop all signatures from a page image
        
        Args:
            page_image_data: Base64 encoded image data URL of the page
            signatures: List of signature objects with bbox coordinates
            create_debug_image: If True, creates a debug image with bbox drawn
            page_number: Optional page number (1-indexed) to store debug image by page
            
        Returns:
            List of signature objects with cropped image_base64 added
        """
        try:
            cropped_signatures = []
            
            # Create debug image with all bboxes if requested
            if create_debug_image and signatures:
                self._create_debug_image_with_all_bboxes(page_image_data, signatures)
                # Store debug image per page if page_number is provided
                if page_number is not None and self._last_debug_image:
                    self._debug_images_by_page[page_number] = self._last_debug_image
                    logger.debug(f"✅ Stored debug image for page {page_number}")
            
            for signature in signatures:
                if 'bbox' not in signature:
                    logger.warning(f"Signature missing bbox: {signature}")
                    cropped_signatures.append(signature)
                    continue
                
                # Crop the signature (without creating individual debug images)
                cropped_image = self.crop_signature_from_image(page_image_data, signature['bbox'], create_debug_image=False)
                
                # Create new signature object with cropped image
                cropped_signature = signature.copy()
                if cropped_image:
                    cropped_signature['image_base64'] = cropped_image
                    logger.info(f"✅ Added cropped signature: {signature.get('label', 'unknown')}")
                else:
                    logger.warning(f"⚠️ Failed to crop signature: {signature.get('label', 'unknown')}")
                
                cropped_signatures.append(cropped_signature)
            
            return cropped_signatures
            
        except Exception as e:
            logger.error(f"Error cropping signatures from page: {e}")
            return signatures  # Return original signatures if cropping fails
    
    def extract_image_blocks_data(self, page: fitz.Page, image_blocks: List[Dict]) -> List[Dict[str, Any]]:
        """
        Extract actual image data from PyMuPDF image blocks
        
        Args:
            page: PyMuPDF page object
            image_blocks: List of image blocks from page.get_text("dict")["blocks"]
        
        Returns:
            List of dicts with image data and block metadata
            Format: [{"image": PIL.Image, "block_bbox": [x0, y0, x1, y1], "block_index": int, "transform": matrix}, ...]
        """
        extracted_blocks = []
        
        for idx, block in enumerate(image_blocks):
            if block.get("type") != 1:  # Only process image blocks (type 1)
                continue
            
            try:
                # Get image rectangle on page
                bbox = block.get("bbox", [])  # [x0, y0, x1, y1]
                
                if len(bbox) != 4:
                    logger.warning(f"Invalid bbox format for image block {idx}: {bbox}")
                    continue
                
                # Extract image from page at this location
                image_rect = fitz.Rect(bbox)
                
                # Get pixmap for this region
                pix = page.get_pixmap(clip=image_rect, matrix=fitz.Identity)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                
                # Get transform matrix if block is rotated/scaled
                transform = block.get("transform", None)
                
                extracted_blocks.append({
                    "image": image,
                    "block_bbox": bbox,  # [x0, y0, x1, y1] on page
                    "block_index": idx,
                    "transform": transform
                })
                
                logger.debug(f"📸 Extracted image block {idx}: size={image.size}, bbox={bbox}")
                
            except Exception as e:
                logger.warning(f"⚠️ Failed to extract image block {idx}: {e}")
                continue
        
        logger.info(f"✅ Extracted {len(extracted_blocks)} image blocks from page")
        return extracted_blocks
    
    def map_block_bbox_to_page_coords(
        self, 
        yolo_bbox: List[float],  # [xmin, ymin, xmax, ymax] relative to image block
        block_data: Dict[str, Any]  # From extract_image_blocks_data
    ) -> List[int]:
        """
        Map YOLO bbox (within image block) to page coordinates
        
        Args:
            yolo_bbox: Bbox from YOLO [xmin, ymin, xmax, ymax] in image block pixels
            block_data: Block data with block_bbox and transform
        
        Returns:
            Page coordinates [xmin, ymin, xmax, ymax]
        """
        try:
            block_bbox = block_data["block_bbox"]  # [x0, y0, x1, y1] on page
            if len(block_bbox) != 4:
                logger.error(f"Invalid block_bbox format: {block_bbox}")
                return []
            
            block_x0, block_y0 = block_bbox[0], block_bbox[1]
            
            # YOLO bbox is relative to image block, add block offset
            page_xmin = int(block_x0 + yolo_bbox[0])
            page_ymin = int(block_y0 + yolo_bbox[1])
            page_xmax = int(block_x0 + yolo_bbox[2])
            page_ymax = int(block_y0 + yolo_bbox[3])
            
            # Apply transform if block is rotated/scaled (if needed)
            transform = block_data.get("transform")
            if transform and len(transform) == 6:
                # Transform matrix: [a, b, c, d, e, f]
                # For simple translation/scale, we can handle it
                # For rotation, would need more complex math
                # For now, assume no rotation (most common case)
                pass
            
            return [page_xmin, page_ymin, page_xmax, page_ymax]
            
        except Exception as e:
            logger.error(f"❌ Error mapping bbox to page coordinates: {e}")
            return []


