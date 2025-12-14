"""
Document Type Detection Service
Detects document type using LLM Vision analysis of first 2 pages
Uses Gemini's native response_schema for guaranteed structured JSON output
"""

import logging
import json
from typing import Optional, Dict, Any, List
import fitz  # PyMuPDF
import base64

logger = logging.getLogger(__name__)


class DocumentTypeDetector:
    """
    Service for detecting document types using LLM Vision.
    Converts first 2 pages to images and sends to LLM for visual analysis.
    Uses Pydantic schema for structured output - Gemini guarantees valid JSON.
    """

    def __init__(self, llm_client=None):
        """
        Initialize detector with LLM client.

        Args:
            llm_client: LLM client for making vision API calls
        """
        self.llm_client = llm_client

    async def detect_type(
        self,
        file_bytes: bytes,
        filename: str = ""
    ) -> Dict[str, Any]:
        """
        Detect document type using LLM Vision model.

        Args:
            file_bytes: PDF or image file content as bytes
            filename: Original filename

        Returns:
            Dict with document_type, confidence, display_name, icon, color
        """
        try:
            logger.info(f"Starting vision-based document type detection for: {filename}")

            if not self.llm_client:
                logger.warning("No LLM client available for document type detection")
                return self._get_type_info("unknown", 0.0)

            # Check if it's an image or PDF
            is_image = self._is_image_file(filename, file_bytes)
            
            if is_image:
                # Single image - send directly
                logger.info(f"Processing image file: {filename}")
                images = [file_bytes]
            else:
                # PDF - convert first 2 pages to images
                logger.info(f"Converting PDF to images: {filename}")
                images = await self._convert_pdf_to_images(file_bytes)
                
                if not images:
                    logger.warning("Could not convert PDF to images")
                    return self._get_type_info("unknown", 0.0)

            # Send images to LLM Vision for type detection
            result = await self._detect_type_from_images(images, filename)
            return result

        except Exception as e:
            logger.error(f"Error detecting document type: {e}")
            return self._get_type_info("unknown", 0.0, error=str(e))

    def _is_image_file(self, filename: str, file_bytes: bytes) -> bool:
        """Check if file is an image based on filename or magic bytes."""
        # Check by filename extension
        if filename:
            ext = filename.lower().split('.')[-1] if '.' in filename else ''
            if ext in {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'}:
                return True
        
        # Check by magic bytes
        if file_bytes[:8].startswith(b'\x89PNG'):
            return True
        if file_bytes[:2] == b'\xff\xd8':  # JPEG
            return True
        if file_bytes[:6] in (b'GIF87a', b'GIF89a'):
            return True
        if len(file_bytes) > 12 and file_bytes[:4] == b'RIFF' and file_bytes[8:12] == b'WEBP':
            return True
        
        return False

    async def _convert_pdf_to_images(self, pdf_bytes: bytes) -> List[bytes]:
        """
        Convert first 2 pages of PDF to images.

        Args:
            pdf_bytes: PDF file content

        Returns:
            List of PNG image bytes for first 2 pages
        """
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            images = []

            # Process only first 2 pages
            pages_to_process = min(2, len(doc))
            
            for page_num in range(pages_to_process):
                page = doc[page_num]
                # Render page to image at 2x scale for better quality
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                # Convert to PNG bytes
                png_bytes = pix.tobytes("png")
                images.append(png_bytes)
                logger.info(f"Converted page {page_num + 1} to image ({len(png_bytes)} bytes)")

            doc.close()
            return images

        except Exception as e:
            logger.error(f"Error converting PDF to images: {e}")
            return []

    async def _detect_type_from_images(self, images: List[bytes], filename: str) -> Dict[str, Any]:
        """
        Detect document type from images using LLM Vision with Pydantic schema.

        Args:
            images: List of image bytes (1 or 2 pages)
            filename: Original filename

        Returns:
            Detection result with confidence
        """
        try:
            # Use first image for detection (usually enough)
            image_bytes = images[0]
            
            # Convert to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Get MIME type
            mime_type = self._get_mime_type(image_bytes)
            
            # Create prompt
            prompt = self._create_prompt(filename, len(images))
            
            # Create image data URL
            image_data = f"data:{mime_type};base64,{base64_image}"
            
            # Call LLM Vision API with document_type_detection task
            # The LLM client will use the native Gemini schema defined in extraction_schemas.py
            response = await self.llm_client.call_api(
                prompt=prompt,
                image_data=image_data,
                response_format={},
                task="document_type_detection",
                document_name=filename
            )

            # Parse response - Gemini's native schema guarantees valid JSON structure
            result = self._parse_response(response)
            logger.info(f"Detected type: {result['document_type']} (confidence: {result['confidence']})")
            return result

        except Exception as e:
            logger.error(f"Vision detection failed: {e}")
            return self._get_type_info("unknown", 0.3)

    def _get_mime_type(self, image_bytes: bytes) -> str:
        """Get MIME type from image bytes."""
        if image_bytes[:8].startswith(b'\x89PNG'):
            return "image/png"
        if image_bytes[:2] == b'\xff\xd8':
            return "image/jpeg"
        if image_bytes[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        if len(image_bytes) > 12 and image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            return "image/webp"
        return "image/png"  # Default for converted PDF pages

    def _create_prompt(self, filename: str, num_pages: int) -> str:
        """Create prompt for document type detection."""
        return f"""Analyze this document image and determine its type.

Filename: {filename}
Pages shown: {num_pages}

Look at the document and identify:
- Official headers, logos, or watermarks
- Document structure and layout  
- Key identifying information or fields
- Document format characteristics

Use a descriptive slug format (lowercase, hyphens) for the document_type field.
Examples: pan-card, aadhaar-card, passport, bank-statement, invoice, salary-slip, form-16
"""

    def _parse_response(self, response: Any) -> Dict[str, Any]:
        """
        Parse LLM response to extract document type.
        
        With Gemini's native response_schema, the response is guaranteed to be
        valid JSON with document_type, confidence, and reason fields.
        """
        try:
            # Handle different response formats from LLM client
            data = None
            
            # If response is already a dict with our expected fields
            if isinstance(response, dict):
                if 'document_type' in response:
                    data = response
                # Check nested structures
                elif 'content' in response:
                    content = response['content']
                    if isinstance(content, str):
                        data = json.loads(content)
                    elif isinstance(content, dict):
                        data = content
                elif 'text' in response:
                    data = json.loads(response['text'])
                elif 'choices' in response and response['choices']:
                    msg_content = response['choices'][0].get('message', {}).get('content', '')
                    if isinstance(msg_content, str):
                        data = json.loads(msg_content)
                    elif isinstance(msg_content, dict):
                        data = msg_content
                # If dict has fields but no document_type, try parsing as JSON string
                elif 'fields' in response and response['fields']:
                    # This is the extraction format - shouldn't happen with proper schema
                    logger.warning("Received extraction format instead of type detection format")
                    return self._get_type_info("unknown", 0.3)
                else:
                    # Try to find document_type in any nested dict
                    data = response
            
            # If response is a string, parse as JSON
            elif isinstance(response, str):
                # Clean markdown code blocks if present
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[-1]  # Remove first line
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                data = json.loads(cleaned.strip())
            
            if data is None:
                logger.error(f"Could not parse response: {type(response)}")
                return self._get_type_info("unknown", 0.3)
            
            # Extract fields from parsed data
            doc_type = data.get("document_type", "unknown")
            confidence = float(data.get("confidence", 0.5))
            
            # Normalize to slug format
            doc_type = doc_type.lower().replace(" ", "-").replace("_", "-")
            
            # Low confidence fallback
            if confidence < 0.3:
                doc_type = "unknown"
                confidence = 0.3
            
            return self._get_type_info(doc_type, confidence)

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Response type: {type(response)}, Response: {str(response)[:500]}")
            return self._get_type_info("unknown", 0.3)

    def _get_type_info(
        self,
        doc_type: str,
        confidence: float,
        error: str = None
    ) -> Dict[str, Any]:
        """Build type information dict."""
        display_name = doc_type.replace("-", " ").title()

        result = {
            "document_type": doc_type,
            "display_name": display_name,
            "icon": "FileText",
            "color": "#6366f1",
            "confidence": confidence,
            "bucket_name": f"{doc_type}-documents"
        }

        if error:
            result["error"] = error

        return result

    def get_all_document_types(self) -> list[Dict[str, Any]]:
        """Returns empty list - types are determined dynamically by LLM."""
        return []
