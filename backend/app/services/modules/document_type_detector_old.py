"""
Document Type Detection Service
Detects document type using LLM vision analysis
Sends image directly to vision model for analysis
"""

import logging
import asyncio
import json
import base64
from typing import Optional, Dict, Any
import re

logger = logging.getLogger(__name__)


class DocumentTypeDetector:
    """
    Service for detecting document types using LLM vision.
    Sends image directly to vision model for analysis.
    Runs independently from extraction for parallel processing.
    """

    def __init__(self, llm_client=None):
        """
        Initialize detector with optional LLM client.

        Args:
            llm_client: LLM client with vision capabilities
        """
        self.llm_client = llm_client

    async def detect_type(
        self,
        image_bytes: bytes,
        filename: str = ""
    ) -> Dict[str, Any]:
        """
        Detect document type from image using LLM vision.

        Args:
            image_bytes: Image file content as bytes
            filename: Original filename (helps with detection)

        Returns:
            Dict with document_type, confidence, display_name, icon, color
        """
        try:
            logger.info(f"Starting LLM vision-based document type detection for: {filename}")

            # Use LLM vision for detection
            if self.llm_client:
                vision_result = await self._vision_based_detection(image_bytes, filename)
                return vision_result
            else:
                logger.warning("No LLM client available for document type detection")
                return self._get_type_info("unknown", 0.0)

        except Exception as e:
            logger.error(f"Error detecting document type: {e}")
            return self._get_type_info("unknown", 0.0, error=str(e))

    async def _vision_based_detection(self, image_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Use LLM vision model for document type detection.

        Args:
            image_bytes: Image content as bytes
            filename: Original filename

        Returns:
            Detection result with confidence
        """
        try:
            # Convert image to base64 for LLM
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')

            # Create prompt for vision analysis
            prompt = self._create_vision_prompt(filename)

            # Call LLM with vision capabilities
            response = await self.llm_client.generate_text_with_image(
                prompt=prompt,
                image_b64=image_b64,
                max_tokens=500,
                temperature=0.1  # Low temperature for consistent results
            )

            # Parse response
            result = self._parse_llm_response(response)
            return result

        except Exception as e:
            logger.error(f"Vision detection failed: {e}")
            return self._get_type_info("unknown", 0.3)

    def _create_vision_prompt(self, filename: str) -> str:
        """Create prompt for LLM vision document type detection."""
        return f"""Analyze this document image and determine its type based on its visual appearance, layout, and content.

Filename: {filename}

Please examine the image and identify what type of document this is by looking at:
- Official document headers, logos, or watermarks
- Document layout and structure
- Key identifying visual elements or sections
- Document format and visual characteristics
- Any text you can read that indicates the document type

Common document types include: PAN card, Aadhaar card, passport, driving license, bank statement, invoice, salary slip, form 16, voter ID, birth certificate, electricity bill, rental agreement, insurance policy, marksheet, etc.

Respond with ONLY a JSON object (no markdown, no explanation):
{{"document_type": "<descriptive-type-slug>", "confidence": <0.0-1.0>, "reason": "<brief reason>"}}

Use a descriptive slug format (lowercase, hyphens) for the document_type field.
"""

    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response to extract document type."""
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```\w*\n?', '', cleaned)
                cleaned = re.sub(r'\n?```$', '', cleaned)

            # Parse JSON
            data = json.loads(cleaned)
            doc_type = data.get("document_type", "unknown")
            confidence = float(data.get("confidence", 0.5))

            # Normalize document type to slug format
            doc_type = doc_type.lower().replace(" ", "-").replace("_", "-")

            # If confidence is low, mark as unknown
            if confidence < 0.3:
                doc_type = "unknown"
                confidence = 0.3

            return self._get_type_info(doc_type, confidence)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return self._get_type_info("unknown", 0.3)

    def _get_type_info(
        self,
        doc_type: str,
        confidence: float,
        error: str = None
    ) -> Dict[str, Any]:
        """
        Get full type information for a document type.

        Args:
            doc_type: Document type slug
            confidence: Detection confidence (0.0-1.0)
            error: Optional error message

        Returns:
            Complete type information dict
        """
        # Generate display name from slug
        display_name = doc_type.replace("-", " ").title()

        # Use default styling for all document types
        result = {
            "document_type": doc_type,
            "display_name": display_name,
            "icon": "FileText",
            "color": "#6366f1",
            "confidence": confidence,
            "bucket_name": "documents"  # All documents use single bucket
        }

        if error:
            result["error"] = error

        return result

    def get_all_document_types(self) -> list[Dict[str, Any]]:
        """Get list of all known document types. (Now returns empty list for pure LLM-based detection)"""
        return []

    async def _extract_first_two_pages(self, pdf_bytes: bytes) -> str:
        """
        Extract text content from first 2 pages of PDF.

        Args:
            pdf_bytes: PDF file content

        Returns:
            Combined text from first 2 pages
        """
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_content = []

            # Process only first 2 pages
            pages_to_process = min(2, len(doc))

            for page_num in range(pages_to_process):
                page = doc[page_num]
                text = page.get_text("text")
                if text.strip():
                    text_content.append(f"--- Page {page_num + 1} ---\n{text}")

            doc.close()
            return "\n\n".join(text_content)

        except Exception as e:
            logger.error(f"Error extracting pages: {e}")
            return ""

    async def _llm_based_detection(self, text: str, filename: str) -> Dict[str, Any]:
        """
        Use LLM for accurate document type detection.

        Args:
            text: Extracted text content
            filename: Original filename

        Returns:
            Detection result with confidence
        """
        try:
            # Create prompt for document type detection
            prompt = self._create_detection_prompt(text, filename)

            # Call LLM
            response = await self.llm_client.generate_text(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1  # Low temperature for consistent results
            )

            # Parse response
            result = self._parse_llm_response(response)
            return result

        except Exception as e:
            logger.error(f"LLM detection failed: {e}")
            return self._get_type_info("unknown", 0.3)

    def _create_detection_prompt(self, text: str, filename: str) -> str:
        """Create prompt for LLM document type detection."""
        return f"""Analyze this document and determine its type based on its content and structure.

Filename: {filename}

Document Content (first 2 pages):
{text[:3000]}  # Limit text to avoid token limits

Please analyze the document content and determine what type of document this is. Look for:
- Official document headers, logos, or watermarks
- Document purpose and content structure
- Key identifying information or fields
- Document format and layout characteristics

Respond with ONLY a JSON object (no markdown, no explanation):
{{"document_type": "<descriptive-type-slug>", "confidence": <0.0-1.0>, "reason": "<brief reason>"}}

Use a descriptive slug format (lowercase, hyphens) for the document_type field.
"""

    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response to extract document type."""
        try:
            # Clean response - remove markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r'^```\w*\n?', '', cleaned)
                cleaned = re.sub(r'\n?```$', '', cleaned)

            # Parse JSON
            data = json.loads(cleaned)
            doc_type = data.get("document_type", "unknown")
            confidence = float(data.get("confidence", 0.5))

            # Normalize document type to slug format
            doc_type = doc_type.lower().replace(" ", "-").replace("_", "-")

            # If confidence is low, mark as unknown
            if confidence < 0.3:
                doc_type = "unknown"
                confidence = 0.3

            return self._get_type_info(doc_type, confidence)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return self._get_type_info("unknown", 0.3)

    def _get_type_info(
        self,
        doc_type: str,
        confidence: float,
        error: str = None
    ) -> Dict[str, Any]:
        """
        Get full type information for a document type.

        Args:
            doc_type: Document type slug
            confidence: Detection confidence (0.0-1.0)
            error: Optional error message

        Returns:
            Complete type information dict
        """
        # Generate display name from slug
        display_name = doc_type.replace("-", " ").title()

        # Use default styling for all document types
        result = {
            "document_type": doc_type,
            "display_name": display_name,
            "icon": "FileText",
            "color": "#6366f1",
            "confidence": confidence,
            "bucket_name": "documents"  # All documents use single bucket
        }

        if error:
            result["error"] = error

        return result

    def get_all_document_types(self) -> list[Dict[str, Any]]:
        """Get list of all known document types. (Now returns empty list for pure LLM-based detection)"""
        return []
