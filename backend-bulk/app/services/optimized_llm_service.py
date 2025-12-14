"""
Optimized LLM Service for Bulk Processing
Handles batched page processing and parallel API calls
Supports both Direct Gemini API and LiteLLM
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional
import httpx
import os
from ..core.config import settings

logger = logging.getLogger(__name__)

# Gemini API endpoint
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class OptimizedLLMService:
    """
    Streamlined LLM client optimized for bulk processing
    
    Key optimizations:
    - Batch 5 pages per API call (reduces 60 calls to 12)
    - Process all batches concurrently (unlimited Gemini API)
    - Connection pooling for HTTP requests
    - Target: < 18 seconds for 60-page PDF
    
    Supports:
    - Direct Gemini API (faster, recommended)
    - LiteLLM proxy (fallback)
    """
    
    def __init__(self):
        # Determine which provider to use
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.litellm_api_url = os.getenv("LITELLM_API_URL", "")
        self.litellm_api_key = os.getenv("LITELLM_API_KEY", "")
        self.extraction_model = os.getenv("EXTRACTION_MODEL", "gemini-2.0-flash")
        
        # Validate configuration
        if self.provider == "gemini":
            if not self.gemini_api_key:
                raise RuntimeError("Missing GEMINI_API_KEY for Gemini provider")
            logger.info(f"🚀 Using DIRECT Gemini API - Model: {self.extraction_model}")
        else:
            if not self.litellm_api_url or not self.litellm_api_key:
                raise RuntimeError("Missing LITELLM_API_URL or LITELLM_API_KEY")
            logger.info(f"🔄 Using LiteLLM proxy - Model: {self.extraction_model}")
        
        # HTTP client with connection pooling
        self.http_client = httpx.AsyncClient(
            timeout=120.0,  # 2 minutes timeout for large batches
            limits=httpx.Limits(
                max_keepalive_connections=50,
                max_connections=100,
                keepalive_expiry=30.0
            )
        )
        
        # Batching configuration
        self.batch_size = 5  # Pages per API call
        
        logger.info(f"🤖 OptimizedLLMService initialized - Provider: {self.provider}")
    
    async def close(self):
        """Close HTTP client on shutdown"""
        await self.http_client.aclose()
        logger.info("OptimizedLLMService HTTP client closed")
    
    async def extract_fields_batched(
        self,
        images: List[str],
        template_config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract fields from all pages using batched parallel processing
        
        Args:
            images: List of base64-encoded page images
            template_config: Optional template configuration
            
        Returns:
            List of extracted fields with metadata
            
        Performance:
            60 pages / 5 per batch = 12 API calls
            All 12 calls run concurrently
            Target time: < 18 seconds
        """
        if not images:
            logger.warning("No images provided for extraction")
            return []
        
        start_time = time.time()
        total_pages = len(images)
        
        logger.info(f"📄 Processing {total_pages} pages in batches of {self.batch_size}")
        
        # Group pages into batches
        batches = [
            images[i:i + self.batch_size]
            for i in range(0, total_pages, self.batch_size)
        ]
        
        num_batches = len(batches)
        logger.info(f"🔄 Created {num_batches} batches for parallel processing")
        
        # Process all batches concurrently (unlimited API!)
        tasks = [
            self._process_page_batch(
                batch_images=batch,
                start_page=i * self.batch_size + 1,
                batch_num=i + 1,
                total_batches=num_batches,
                template_config=template_config
            )
            for i, batch in enumerate(batches)
        ]
        
        # Wait for all batches to complete
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Flatten results and handle errors
        all_fields = []
        failed_batches = 0
        
        for i, result in enumerate(batch_results):
            if isinstance(result, Exception):
                logger.error(f"❌ Batch {i + 1} failed: {result}")
                failed_batches += 1
            else:
                all_fields.extend(result)
        
        elapsed = time.time() - start_time
        
        logger.info(
            f"✅ Extracted {len(all_fields)} fields from {total_pages} pages "
            f"in {elapsed:.2f}s ({num_batches} batches, {failed_batches} failed)"
        )
        
        return all_fields
    
    async def _process_page_batch(
        self,
        batch_images: List[str],
        start_page: int,
        batch_num: int,
        total_batches: int,
        template_config: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Process a batch of 5 pages in one LLM API call
        
        Args:
            batch_images: List of 1-5 base64-encoded images
            start_page: Starting page number (1-indexed)
            batch_num: Batch number for logging
            total_batches: Total number of batches
            template_config: Optional template configuration
            
        Returns:
            List of extracted fields from this batch
        """
        batch_start = time.time()
        num_pages = len(batch_images)
        
        logger.debug(f"🔄 Processing batch {batch_num}/{total_batches} (pages {start_page}-{start_page + num_pages - 1})")
        
        try:
            # Build prompt
            if template_config:
                prompt = self._build_template_prompt(batch_images, template_config)
            else:
                prompt = self._build_generic_prompt(batch_images)
            
            # Call LLM API
            response = await self._call_llm_api(prompt, batch_images)
            
            # Parse response
            fields = self._parse_llm_response(response, start_page, num_pages)
            
            elapsed = time.time() - batch_start
            logger.debug(
                f"✅ Batch {batch_num}/{total_batches} complete: "
                f"{len(fields)} fields in {elapsed:.2f}s"
            )
            
            return fields
            
        except Exception as e:
            logger.error(f"❌ Batch {batch_num}/{total_batches} failed: {e}")
            raise
    
    async def _call_llm_api(
        self,
        prompt: str,
        images: List[str]
    ) -> Dict[str, Any]:
        """
        Make API request to LLM (Gemini direct or LiteLLM)
        
        Args:
            prompt: Text prompt
            images: List of base64-encoded images
            
        Returns:
            API response dictionary
        """
        if self.provider == "gemini":
            return await self._call_gemini_direct(prompt, images)
        else:
            return await self._call_litellm(prompt, images)
    
    async def _call_gemini_direct(
        self,
        prompt: str,
        images: List[str]
    ) -> Dict[str, Any]:
        """
        Call Gemini API directly (faster, no proxy)
        """
        # Build content parts
        parts = [{"text": prompt}]
        
        for image_b64 in images:
            parts.append({
                "inline_data": {
                    "mime_type": "image/png",
                    "data": image_b64
                }
            })
        
        # Gemini API payload
        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json"
            }
        }
        
        # Make request to Gemini API
        url = f"{GEMINI_API_URL}/{self.extraction_model}:generateContent?key={self.gemini_api_key}"
        
        response = await self.http_client.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        response.raise_for_status()
        gemini_response = response.json()
        
        # Convert Gemini response to OpenAI-like format for compatibility
        content = ""
        if "candidates" in gemini_response and gemini_response["candidates"]:
            candidate = gemini_response["candidates"][0]
            if "content" in candidate and "parts" in candidate["content"]:
                content = candidate["content"]["parts"][0].get("text", "")
        
        return {
            "choices": [{"message": {"content": content}}],
            "usage": {
                "total_tokens": gemini_response.get("usageMetadata", {}).get("totalTokenCount", 0)
            }
        }
    
    async def _call_litellm(
        self,
        prompt: str,
        images: List[str]
    ) -> Dict[str, Any]:
        """
        Call LiteLLM proxy (fallback)
        """
        # Build messages with images
        content = [{"type": "text", "text": prompt}]
        
        for image_b64 in images:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{image_b64}"
                }
            })
        
        # API request payload
        payload = {
            "model": self.extraction_model,
            "messages": [{"role": "user", "content": content}],
            "response_format": {"type": "json_object"},
            "temperature": 0.0,
            "max_tokens": 16000  # Increased to prevent truncation on complex pages
        }
        
        # Make HTTP request
        response = await self.http_client.post(
            f"{self.litellm_api_url}/chat/completions",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.litellm_api_key}",
                "Content-Type": "application/json"
            }
        )
        
        response.raise_for_status()
        return response.json()
    
    def _parse_llm_response(
        self,
        response: Dict[str, Any],
        start_page: int,
        num_pages: int
    ) -> List[Dict[str, Any]]:
        """
        Parse LLM API response into field list
        
        Args:
            response: Raw API response
            start_page: Starting page number
            num_pages: Number of pages in this batch
            
        Returns:
            List of field dictionaries
        """
        try:
            # Extract content from response
            content = response["choices"][0]["message"]["content"]
            
            # Parse JSON
            import json
            data = json.loads(content)
            
            # Get fields array
            fields = data.get("fields", [])
            
            # Add metadata to each field
            tokens_used = response.get("usage", {}).get("total_tokens", 0)
            tokens_per_field = tokens_used // max(len(fields), 1)
            
            for i, field in enumerate(fields):
                # Add page number if not present
                if "page" not in field:
                    # Estimate page based on field position
                    field["page"] = start_page + (i % num_pages)
                
                # Add token usage
                field["tokens_used"] = tokens_per_field
                
                # Add model version
                field["model_version"] = self.extraction_model
            
            return fields
            
        except (KeyError, json.JSONDecodeError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.debug(f"Response: {response}")
            return []
    
    def _build_generic_prompt(self, images: List[str]) -> str:
        """
        Build prompt for generic document extraction
        
        Args:
            images: List of base64-encoded images
            
        Returns:
            Prompt string
        """
        num_pages = len(images)
        
        return f"""Extract all data fields from these {num_pages} document page(s).

For each field found, provide:
1. label: The field name (e.g., "company_name", "loan_amount")
2. value: The extracted value
3. type: Field type ("text", "number", "date", "signature", "boolean")
4. confidence: Your confidence score (0.0 to 1.0)

Return as JSON in this format:
{{
  "fields": [
    {{
      "label": "company_name",
      "value": "ABC Corporation",
      "type": "text",
      "confidence": 0.95
    }},
    ...
  ]
}}

Extract ALL fields you can find. Be thorough."""
    
    def _build_template_prompt(
        self,
        images: List[str],
        template_config: Dict[str, Any]
    ) -> str:
        """
        Build prompt for template-guided extraction
        
        Args:
            images: List of base64-encoded images
            template_config: Template configuration
            
        Returns:
            Prompt string
        """
        num_pages = len(images)
        template_name = template_config.get("name", "Unknown")
        fields_to_extract = template_config.get("fields", [])
        
        # Build field list
        field_descriptions = []
        for field in fields_to_extract:
            field_descriptions.append(
                f"- {field['name']} ({field.get('type', 'text')}): {field.get('description', 'No description')}"
            )
        
        fields_text = "\n".join(field_descriptions)
        
        return f"""Extract data from these {num_pages} page(s) of a {template_name}.

Required fields to extract:
{fields_text}

For each field, provide:
1. label: The field name from the list above
2. value: The extracted value
3. type: Field type
4. confidence: Your confidence score (0.0 to 1.0)

Return as JSON:
{{
  "fields": [
    {{
      "label": "field_name",
      "value": "extracted_value",
      "type": "text",
      "confidence": 0.95
    }},
    ...
  ]
}}

Extract ALL fields listed above."""


# Global instance (singleton pattern)
_llm_service: Optional[OptimizedLLMService] = None


async def get_llm_service() -> OptimizedLLMService:
    """
    Get or create the global OptimizedLLMService instance
    
    Usage in workers:
        service = await get_llm_service()
        fields = await service.extract_fields_batched(images)
    """
    global _llm_service
    
    if _llm_service is None:
        _llm_service = OptimizedLLMService()
    
    return _llm_service


async def shutdown_llm_service():
    """
    Close HTTP client on application shutdown
    """
    global _llm_service
    
    if _llm_service:
        await _llm_service.close()
        _llm_service = None
        logger.info("OptimizedLLMService shutdown complete")
