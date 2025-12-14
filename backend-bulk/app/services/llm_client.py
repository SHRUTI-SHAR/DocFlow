"""
LLM Client Service
Handles all interactions with LLM APIs through LiteLLM
"""

import json
import logging
import httpx
import requests
import os
import asyncio
import time
import re
import threading
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
from dotenv import load_dotenv
from ..core.config import settings

logger = logging.getLogger(__name__)

# LiteLLM's JSONSchemaValidationError (if using strict validation)
try:
    from litellm import JSONSchemaValidationError
except ImportError:
    # Fallback if litellm not installed or old version
    class JSONSchemaValidationError(Exception):
        def __init__(self, message, raw_response=None):
            super().__init__(message)
            self.raw_response = raw_response

class LLMClient:
    """Client for making requests to LLM APIs through LiteLLM or Direct Gemini"""
    
    def __init__(self):
        env_vars = self._load_env()
        
        # Check for direct Gemini API first
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "")
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        
        # Use Gemini direct if configured
        if self.provider == "gemini" and self.gemini_api_key:
            self.is_google_ai_direct = True
            self.litellm_api_key = self.gemini_api_key  # For compatibility
            logger.info("🚀 Using DIRECT Gemini API")
        elif self.gemini_api_key.startswith("AIza"):
            # Fallback: detect by key format
            self.is_google_ai_direct = True
            self.litellm_api_key = self.gemini_api_key
            logger.info("🚀 Using DIRECT Gemini API (detected by key format)")
        else:
            # Use LiteLLM
            if not env_vars["LITELLM_API_URL"] or not env_vars["LITELLM_API_KEY"]:
                raise RuntimeError("Missing LITELLM_API_URL or LITELLM_API_KEY in backend/.env")
            
            self.is_google_ai_direct = False
            self.litellm_api_url = env_vars["LITELLM_API_URL"]
            self.litellm_api_key = env_vars["LITELLM_API_KEY"]
            self.litellm_header_name = env_vars["LITELLM_HEADER_NAME"]
            self.litellm_auth_scheme = env_vars["LITELLM_AUTH_SCHEME"]
            logger.info("🔧 Using LiteLLM provider")
        
        # Model configuration
        self.extraction_model = os.getenv("EXTRACTION_MODEL", "gemini-2.0-flash")
        
        # HTTP client with connection pooling (lazy initialization)
        self._http_client: Optional[httpx.AsyncClient] = None
        
        # Thread-local storage for HTTP sessions (each thread gets its own session)
        # This prevents thread contention when multiple threads make concurrent requests
        self._thread_local = threading.local()
        
        # Global session for backward compatibility (used when thread-local not needed)
        self._sync_session: Optional[requests.Session] = None
        self._current_pool_maxsize: Optional[int] = None
        
        # LangSmith tracing configuration (check after loading env)
        langsmith_tracing_env = os.getenv("LANGSMITH_TRACING", "false").lower()
        self.langsmith_enabled = langsmith_tracing_env == "true"
        
        # Import LangSmith only if tracing is enabled
        self.traceable = None
        if self.langsmith_enabled:
            try:
                from langsmith import traceable
                self.traceable = traceable
                
                # Check for required LangSmith environment variables
                langchain_api_key = os.getenv("LANGCHAIN_API_KEY") or os.getenv("LANGSMITH_API_KEY")
                langchain_tracing_v2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower()
                langchain_project = os.getenv("LANGCHAIN_PROJECT") or os.getenv("LANGSMITH_PROJECT")
                
                if not langchain_api_key:
                    logger.warning("⚠️ LangSmith tracing enabled but LANGCHAIN_API_KEY or LANGSMITH_API_KEY not set. Traces may not be sent.")
                    self.langsmith_enabled = False
                elif langchain_tracing_v2 != "true":
                    logger.warning("⚠️ LangSmith tracing enabled but LANGCHAIN_TRACING_V2 not set to 'true'. Setting it now.")
                    os.environ["LANGCHAIN_TRACING_V2"] = "true"
                
                if langchain_project:
                    logger.info(f"📊 LangSmith tracing enabled - Project: {langchain_project}")
                else:
                    logger.info("📊 LangSmith tracing enabled (no project name set)")
            except ImportError:
                logger.warning("⚠️ LangSmith not installed. Install with: pip install langsmith")
                self.langsmith_enabled = False
                logger.info("📊 LangSmith tracing disabled (package not installed)")
        else:
            logger.info("📊 LangSmith tracing disabled (set LANGSMITH_TRACING=true to enable)")
        
        logger.info(f"🤖 LLM Client initialized - Model: {self.extraction_model}")

    def _load_env(self):
        """Load environment variables from backend-bulk/.env file"""
        # Go up 3 levels from services/ to reach backend-bulk/
        # backend-bulk/app/services/llm_client.py -> backend-bulk/
        backend_bulk_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_file_path = os.path.join(backend_bulk_dir, ".env")
        load_dotenv(env_file_path)
        
        return {
            "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY", ""),
            "LLM_PROVIDER": os.getenv("LLM_PROVIDER", "gemini"),
            "LITELLM_API_URL": os.getenv("LITELLM_API_URL", ""),
            "LITELLM_API_KEY": os.getenv("LITELLM_API_KEY", ""),
            "LITELLM_HEADER_NAME": os.getenv("LITELLM_HEADER_NAME", "Authorization"),
            "LITELLM_AUTH_SCHEME": os.getenv("LITELLM_AUTH_SCHEME", "Bearer")
        }
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """
        Get or create HTTP client with connection pooling
        Reuses connections to reduce latency and improve performance
        
        Thread-safe initialization to prevent race conditions during parallel processing
        
        Returns:
            Reusable httpx.AsyncClient instance
        """
        if self._http_client is None:
            # Use a lock to prevent multiple coroutines from creating clients simultaneously
            if not hasattr(self, '_client_lock'):
                self._client_lock = asyncio.Lock()
            
            async with self._client_lock:
                # Double-check after acquiring lock (common pattern for lazy initialization)
                if self._http_client is None:
                    limits = httpx.Limits(
                        max_keepalive_connections=20,
                        max_connections=100,
                        keepalive_expiry=30.0
                    )
                    self._http_client = httpx.AsyncClient(
                        timeout=120.0,
                        limits=limits
                    )
                    logger.debug("🌐 Created HTTP client with connection pooling")
        return self._http_client
    
    async def close(self):
        """
        Close HTTP client (call on shutdown or when done processing)
        This should be called to properly clean up connections
        """
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
            logger.debug("🔌 Closed HTTP client")


    
    def _prepare_request_body(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """
        Prepare request body for LiteLLM API
        
        Args:
            content_type: "text" or "image" - determines how to handle the input data
        """
        # LiteLLM/OpenRouter handles response format conversion internally
        return self._prepare_litellm_request_body(prompt, image_data, response_format, document_name, content_type)
    
    def _prepare_litellm_request_body(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """Prepare request body for LiteLLM API using chat/completions format (supports images and text)"""
        # Use the same model from EXTRACTION_MODEL for both text and image requests
        model = self.extraction_model
        
        # Prepare content array
        if content_type == "text":
            # For text input, include the extracted text in the prompt
            text_content = image_data if image_data else ""  # image_data contains text when content_type is "text"
            # Build full prompt with document name if provided
            if document_name:
                full_prompt = f"Document: {document_name}\n\n{prompt}\n\nExtracted Text Content:\n{text_content}"
            else:
                full_prompt = f"{prompt}\n\nExtracted Text Content:\n{text_content}"
            
            content = [
                {
                    "type": "text",
                    "text": full_prompt
                }
            ]
        else:
            # For image input, use the standard format
            prompt_text = prompt
            if document_name:
                prompt_text = f"Document: {document_name}\n\n{prompt}"
            
            content = [
                {
                    "type": "text",
                    "text": prompt_text
                }
            ]
        
        # Add image only if image_data is provided, not empty, and content_type is "image"
        # When content_type is "text", image_data contains the extracted text (already included in prompt)
        if content_type == "image" and image_data and image_data.strip():
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": image_data
                }
            })
        
        # Always use chat/completions format for vision support
        request_body = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ],
            # Increased max_tokens to accommodate reasoning tokens + response (Gemini 2.5 Pro uses ~7-8K for reasoning)
            "max_tokens": 32000,
            "temperature": 0.1,
            "response_format": response_format
        }
        
        return request_body

    def _prepare_google_ai_request(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """Prepare request body for Google AI native API (generativelanguage.googleapis.com)"""
        # Build prompt text
        if content_type == "text":
            text_content = image_data if image_data else ""
            if document_name:
                full_prompt = f"Document: {document_name}\n\n{prompt}\n\nExtracted Text Content:\n{text_content}"
            else:
                full_prompt = f"{prompt}\n\nExtracted Text Content:\n{text_content}"
        else:
            full_prompt = f"Document: {document_name}\n\n{prompt}" if document_name else prompt
        
        # Build parts array for Google AI format
        parts = [{"text": full_prompt}]
        
        # Add image if provided (Google AI uses inline_data format)
        if content_type == "image" and image_data and image_data.strip():
            # Extract base64 data and mime type from data URL
            if image_data.startswith("data:"):
                # Parse data URL: data:image/png;base64,<base64_data>
                header, base64_data = image_data.split(",", 1)
                mime_type = header.split(":")[1].split(";")[0]
            else:
                # Assume it's raw base64 PNG
                base64_data = image_data
                mime_type = "image/png"
            
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64_data
                }
            })
        
        # Google AI native request format
        request_body = {
            "contents": [
                {
                    "parts": parts
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 32000,
                "responseMimeType": "application/json"
            }
        }
        
        return request_body
    
    def _call_google_ai_sync(self, request_body: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Make synchronous call to Google AI native API"""
        # Extract model name from extraction_model (e.g., "gemini/gemini-2.5-flash" -> "gemini-2.5-flash")
        model_name = self.extraction_model.split("/")[-1] if "/" in self.extraction_model else self.extraction_model
        
        # Build Google AI URL - use gemini_api_key
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.gemini_api_key}"
        
        session = self._get_sync_session()
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                logger.debug(f"🌐 Making Google AI API call (attempt {attempt + 1}/{max_retries})")
                logger.debug(f"🔍 Model: {model_name}")
                
                request_submit_time = time.time()
                response = session.post(
                    api_url,
                    json=request_body,
                    headers={"Content-Type": "application/json"},
                    timeout=90
                )
                request_complete_time = time.time()
                
                http_duration = request_complete_time - request_submit_time
                logger.info(f"⏱️ Google AI HTTP duration: {http_duration:.2f}s, Status: {response.status_code}")
                
                if response.status_code == 200:
                    google_response = response.json()
                    # Convert Google AI response to OpenAI-compatible format
                    return self._convert_google_ai_response(google_response)
                else:
                    error_text = response.text
                    logger.error(f"❌ Google AI API error {response.status_code}: {error_text}")
                    raise Exception(f"Google AI API Error: {response.status_code} - {error_text}")
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                last_exception = e
                wait_time = 2 ** attempt
                logger.warning(f"⚠️ Network error on attempt {attempt + 1}: {e}, retrying in {wait_time}s...")
                time.sleep(wait_time)
                continue
            except Exception as e:
                if not isinstance(e, (requests.exceptions.Timeout, requests.exceptions.ConnectionError)):
                    raise e
                last_exception = e
        
        raise last_exception or Exception("All retries failed for Google AI API")
    
    def _convert_google_ai_response(self, google_response: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Google AI response format to OpenAI-compatible format"""
        try:
            # Extract content from Google AI response
            candidates = google_response.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates in Google AI response")
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            text = parts[0].get("text", "") if parts else ""
            
            # Get usage info
            usage_metadata = google_response.get("usageMetadata", {})
            
            # Convert to OpenAI-compatible format
            return {
                "choices": [
                    {
                        "message": {
                            "content": text,
                            "role": "assistant"
                        },
                        "finish_reason": candidates[0].get("finishReason", "stop").lower()
                    }
                ],
                "usage": {
                    "prompt_tokens": usage_metadata.get("promptTokenCount", 0),
                    "completion_tokens": usage_metadata.get("candidatesTokenCount", 0),
                    "total_tokens": usage_metadata.get("totalTokenCount", 0)
                },
                "model": self.extraction_model
            }
        except Exception as e:
            logger.error(f"Error converting Google AI response: {e}")
            logger.debug(f"Raw response: {json.dumps(google_response, indent=2)[:1000]}")
            raise

    async def _call_api_with_retry(self, request_body: Dict[str, Any], api_url: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Call LLM API with retry logic for network issues
        Uses connection pooling for improved performance
        """
        last_exception = None
        client = await self._get_http_client()  # Reuse HTTP client with connection pooling
        
        # Prepare headers for LiteLLM
        headers = {
            "Content-Type": "application/json",
            self.litellm_header_name: f"{self.litellm_auth_scheme} {self.litellm_api_key}"
        }
        provider_name = "LiteLLM"
        
        for attempt in range(max_retries):
            try:
                logger.debug(f"🌐 Making {provider_name} API call (attempt {attempt + 1}/{max_retries}) to {api_url}")
                
                # Model logging only (request body keys removed to reduce log size)
                if "model" in request_body:
                    logger.debug(f"🔍 Model: {request_body.get('model')}")
                    
                    # Fix: Add timeout to async HTTP calls to prevent blocking
                    response = await client.post(
                        api_url,
                        json=request_body,
                        headers=headers,
                        timeout=90.0  # 90 second timeout per request
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.debug(f"✅ {provider_name} API call successful on endpoint: {api_url}")
                        return result
                    else:
                        error_msg = f"API call failed with status {response.status_code}: {response.text}"
                        logger.error(f"❌ {error_msg}")
                        # Return a more user-friendly error instead of raising HTTPException
                        raise Exception(f"LLM API Error: {response.status_code} - {response.text}")
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, 
                   httpx.ConnectError, httpx.RemoteProtocolError) as e:
                last_exception = e
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"⚠️ Network error on attempt {attempt + 1}: {e}")
                logger.debug(f"⏳ Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                logger.error(f"❌ Error type: {type(e).__name__}")
                # If it's not a network error, don't retry
                if not isinstance(e, (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, httpx.ConnectError, httpx.RemoteProtocolError)):
                    raise e
                last_exception = e
        
        # If all retries failed, raise the last exception
        logger.error(f"❌ All retries failed for endpoint: {api_url}")
        raise last_exception or Exception(f"All retries failed for endpoint: {api_url}")

    async def call_api(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                      task: str, document_name: Optional[str] = None) -> Dict[str, Any]:
        """Make API call to LLM provider through LiteLLM using vision-capable endpoint with optional LangSmith monitoring"""
        start_time = time.time()
        
        # Determine which model will be used
        model_to_use = self.extraction_model
        
        # Extract page number from document_name if present (format: "Document.pdf (page X)")
        page_number = None
        trace_name = f"llm_call_{task}"
        if document_name:
            # Look for pattern like "(page 5)" or "(page 1)" in document_name
            page_match = re.search(r'\(page\s+(\d+)\)', document_name, re.IGNORECASE)
            if page_match:
                page_number = int(page_match.group(1))
                trace_name = f"llm_call_{task}_page_{page_number}"
        
        # Execute the call (LangSmith tracing is now inside _execute_call, wrapping only the HTTP request)
        return await self._execute_call(prompt, image_data, response_format, task, document_name, start_time, model_to_use, page_number, trace_name)
    
    async def _execute_call(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                           task: str, document_name: Optional[str],
                           start_time: float, model_to_use: str, page_number: Optional[int] = None, trace_name: Optional[str] = None) -> Dict[str, Any]:
        """Execute the actual LLM API call"""
        try:
            # Determine API URL for LiteLLM
            base_url = self.litellm_api_url.rstrip('/')
            # Check if URL already contains the endpoint to avoid doubling
            if base_url.endswith('/v1/chat/completions'):
                api_url = base_url
            else:
                api_url = f"{base_url}/v1/chat/completions"
            
            logger.debug(f"🔍 Using LiteLLM endpoint: {api_url}")
            
            # Prepare request body (provider-specific format) - NOT included in LangSmith timing
            request_body = self._prepare_request_body(prompt, image_data, response_format, document_name)
            
            # Wrap only the HTTP request with LangSmith tracing (pure LLM response time)
            if self.langsmith_enabled and self.traceable:
                metadata = {
                    "task": task,
                    "model": model_to_use,
                    "document_name": document_name or "unknown",
                    "has_image": bool(image_data)
                }
                if page_number is not None:
                    metadata["page_number"] = page_number
                
                tags = [task, model_to_use]
                if page_number is not None:
                    tags.append(f"page_{page_number}")
                
                @self.traceable(
                    name=trace_name or f"llm_call_{task}",
                    run_type="llm",
                    tags=tags,
                    metadata=metadata
                )
                async def _traced_http_call():
                    # This traces ONLY the HTTP request/response time
                    return await self._call_api_with_retry(request_body, api_url)
                
                result = await _traced_http_call()
            else:
                # No LangSmith tracing - just make the call
                result = await self._call_api_with_retry(request_body, api_url)
            
            # Process the result to normalize the structure
            # This is NOT included in LangSmith timing
            processed_result = self.process_api_result(result, task)
            
            # Calculate duration (total time including prep and processing)
            duration = time.time() - start_time
            
            # Log timing information
            logger.info(f"⏱️ LLM call completed - Task: {task}, Model: {model_to_use}, Duration: {duration:.2f}s")
            
            # Add timing info to result if it's a dict
            if isinstance(processed_result, dict):
                processed_result["_timing"] = {
                    "start_time": start_time,
                    "end_time": time.time(),
                    "duration_seconds": duration
                }
            
            return processed_result
        except Exception as e:
            logger.error(f"❌ Error in LLM API call: {e}")
            raise
    
    def _get_sync_session(self, pool_connections: int = 1, max_connections: Optional[int] = None) -> requests.Session:
        """
        Get or create synchronous HTTP session with connection pooling
        Uses thread-local storage to ensure each thread gets its own session
        This prevents thread contention and allows true parallelism
        
        Thread-safe for use in ThreadPoolExecutor - each thread gets its own session
        
        Args:
            pool_connections: Number of connection pools (default: 1 for single host)
            max_connections: Maximum number of concurrent connections per pool (default: 20, or matches worker count)
        """
        # Use thread-local storage to ensure each thread has its own session
        # This prevents thread contention when multiple threads make concurrent requests
        if not hasattr(self._thread_local, 'session') or self._thread_local.session is None:
            # Determine pool_maxsize
            if max_connections is not None:
                pool_maxsize = max_connections
            elif self._current_pool_maxsize is not None:
                pool_maxsize = self._current_pool_maxsize
            else:
                pool_maxsize = 20  # Default
            
            # Create new session for this thread with connection pooling
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=pool_connections,  # Number of connection pools (typically 1 per unique host)
                pool_maxsize=pool_maxsize,  # Max connections per pool (allows true parallelism)
                max_retries=3
            )
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            
            # Store session in thread-local storage
            self._thread_local.session = session
            self._thread_local.pool_maxsize = pool_maxsize
            
            logger.debug(f"🌐 Created thread-local HTTP session (thread: {threading.current_thread().name}) - pool_connections: {pool_connections}, pool_maxsize: {pool_maxsize}")
        
        # If max_connections is provided and larger than current, recreate session
        elif max_connections is not None and max_connections > self._thread_local.pool_maxsize:
            # CRITICAL FIX #3: Close existing session before creating new one
            if self._thread_local.session:
                try:
                    self._thread_local.session.close()
                    logger.debug(f"🔒 Closed existing thread-local HTTP session before recreation")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing existing session: {e}")
            
            # Create new session with larger pool size
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=pool_connections,
                pool_maxsize=max_connections,
                max_retries=3
            )
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            
            self._thread_local.session = session
            self._thread_local.pool_maxsize = max_connections
            
            logger.debug(f"🔄 Recreated thread-local HTTP session with larger pool size: {max_connections} (was: {self._thread_local.pool_maxsize})")
        
        # Store global pool_maxsize for reference (used when creating new thread-local sessions)
        if max_connections is not None:
            self._current_pool_maxsize = max_connections
        
        return self._thread_local.session
    
    def _cleanup_thread_session(self):
        """
        CRITICAL FIX #3: Clean up thread-local HTTP session
        Call this after processing completes to prevent memory leaks
        """
        if hasattr(self._thread_local, 'session') and self._thread_local.session is not None:
            try:
                self._thread_local.session.close()
                self._thread_local.session = None
                logger.debug(f"🔒 Cleaned up thread-local HTTP session")
            except Exception as e:
                logger.warning(f"⚠️ Error cleaning up thread session: {e}")
    
    def _call_api_with_retry_sync(self, request_body: Dict[str, Any], api_url: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Synchronous version: Call LLM API with retry logic for network issues
        Uses connection pooling for improved performance
        Thread-safe for use in ThreadPoolExecutor
        """
        last_exception = None
        session = self._get_sync_session()
        
        # Prepare headers for LiteLLM
        headers = {
            "Content-Type": "application/json",
            self.litellm_header_name: f"{self.litellm_auth_scheme} {self.litellm_api_key}"
        }
        provider_name = "LiteLLM"
        
        for attempt in range(max_retries):
            try:
                attempt_start = time.time()
                logger.debug(f"🌐 Making {provider_name} API call (attempt {attempt + 1}/{max_retries}) to {api_url}")
                
                # Model logging only (request body keys removed to reduce log size)
                if "model" in request_body:
                    logger.debug(f"🔍 Model: {request_body.get('model')}")
                
                # Log request size for debugging
                request_size = len(str(request_body))
                logger.debug(f"📦 Request size: {request_size} bytes")
                
                # Measure HTTP request/response time with accurate timing
                # Note: response.elapsed is the accurate measure from requests library
                # It measures from when the HTTP request actually starts (socket connection) to when headers are received
                request_submit_time = time.time()
                response = session.post(
                    api_url,
                    json=request_body,
                    headers=headers,
                    timeout=90  # Fix: Reduced to 90s per request to prevent blocking (with retries, total can be up to 270s)
                )
                request_complete_time = time.time()
                
                # Use response.elapsed as the accurate HTTP request time (from requests library)
                # This measures from when HTTP request actually starts to when headers are received
                if hasattr(response, 'elapsed') and response.elapsed:
                    ttfb = response.elapsed.total_seconds()
                    # Total HTTP duration includes TTFB + response body transfer
                    http_duration = (request_complete_time - request_submit_time)
                    response_transfer_time = http_duration - ttfb
                else:
                    # Fallback if elapsed is not available
                    http_duration = request_complete_time - request_submit_time
                    ttfb = http_duration
                    response_transfer_time = 0.0
                
                # Log detailed timing breakdown with accurate measurements
                logger.info(f"⏱️ HTTP Request Timing Breakdown:")
                logger.info(f"   📤 Request submitted: {request_submit_time:.3f}s")
                logger.info(f"   📥 Response completed: {request_complete_time:.3f}s")
                logger.info(f"   ⚡ Time-to-First-Byte (TTFB): {ttfb:.3f}s (proxy/LLM processing time)")
                if response_transfer_time > 0:
                    logger.info(f"   📡 Response transfer time: {response_transfer_time:.3f}s")
                logger.info(f"   🌐 Total HTTP duration: {http_duration:.3f}s")
                logger.info(f"   📊 Response status: {response.status_code}")
                logger.info(f"   📏 Response size: {len(response.content)} bytes")
                
                # Check if TTFB is unusually high (indicates network/proxy delay)
                if ttfb > 10.0:
                    logger.warning(f"⚠️ Very High TTFB detected ({ttfb:.2f}s) - proxy/LLM is very slow or overloaded")
                elif ttfb > 5.0:
                    logger.warning(f"⚠️ High TTFB detected ({ttfb:.2f}s) - possible network/proxy latency issue")
                elif ttfb > 2.0:
                    logger.debug(f"ℹ️ Moderate TTFB ({ttfb:.2f}s) - network latency may be affecting performance")
                
                if response.status_code == 200:
                    # Measure response parsing time
                    parse_start = time.time()
                    result = response.json()
                    parse_time = time.time() - parse_start
                    logger.debug(f"✅ {provider_name} API call successful on endpoint: {api_url}")
                    logger.debug(f"   🔄 JSON parsing took: {parse_time*1000:.1f}ms")
                    
                    # Log total attempt time
                    attempt_duration = time.time() - attempt_start
                    logger.debug(f"   ⏱️ Total attempt duration: {attempt_duration:.3f}s")
                    
                    return result
                else:
                    error_msg = f"API call failed with status {response.status_code}: {response.text}"
                    logger.error(f"❌ {error_msg}")
                    raise Exception(f"LLM API Error: {response.status_code} - {response.text}")
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, 
                   requests.exceptions.RequestException) as e:
                last_exception = e
                wait_time = 2 ** attempt  # Exponential backoff
                error_type = type(e).__name__
                logger.warning(f"⚠️ Network error on attempt {attempt + 1} ({error_type}): {e}")
                logger.debug(f"⏳ Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                logger.error(f"❌ Error type: {type(e).__name__}")
                # If it's not a network error, don't retry
                if not isinstance(e, (requests.exceptions.Timeout, requests.exceptions.ConnectionError, 
                                    requests.exceptions.RequestException)):
                    raise e
                last_exception = e
        
        # If all retries failed, raise the last exception
        logger.error(f"❌ All retries failed for endpoint: {api_url}")
        raise last_exception or Exception(f"All retries failed for endpoint: {api_url}")
    
    def call_api_sync(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                     task: str, document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """
        Synchronous version: Make API call to LLM provider through LiteLLM
        Thread-safe for use in ThreadPoolExecutor
        """
        start_time = time.time()
        
        # Use the same model from EXTRACTION_MODEL for both text and image requests
        model_to_use = self.extraction_model
        
        # Extract page number from document_name if present (format: "Document.pdf (page X)")
        page_number = None
        trace_name = f"llm_call_{task}"
        if document_name:
            # Look for pattern like "(page 5)" or "(page 1)" in document_name
            page_match = re.search(r'\(page\s+(\d+)\)', document_name, re.IGNORECASE)
            if page_match:
                page_number = int(page_match.group(1))
                trace_name = f"llm_call_{task}_page_{page_number}"
        
        # Execute the call (LangSmith tracing is now inside _execute_call_sync, wrapping only the HTTP request)
        return self._execute_call_sync(prompt, image_data, response_format, task, document_name, start_time, model_to_use, content_type, page_number, trace_name)
    
    def _execute_call_sync(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                           task: str, document_name: Optional[str],
                           start_time: float, model_to_use: str, content_type: str, page_number: Optional[int] = None, trace_name: Optional[str] = None) -> Dict[str, Any]:
        """Execute the actual synchronous LLM API call"""
        try:
            # Prepare request body
            prep_start = time.time()
            
            # Use Google AI direct API if detected
            if self.is_google_ai_direct:
                logger.debug(f"🔍 Using Google AI direct API")
                logger.debug(f"🤖 Using model: {model_to_use} (content_type: {content_type})")
                
                request_body = self._prepare_google_ai_request(prompt, image_data, response_format, document_name, content_type)
                prep_time = time.time() - prep_start
                logger.debug(f"📝 Request body preparation took: {prep_time*1000:.1f}ms")
                
                # Call Google AI directly
                result = self._call_google_ai_sync(request_body)
            else:
                # Use LiteLLM/OpenAI-compatible API
                base_url = self.litellm_api_url.rstrip('/')
                if base_url.endswith('/v1/chat/completions'):
                    api_url = base_url
                else:
                    api_url = f"{base_url}/v1/chat/completions"
                
                logger.debug(f"🔍 Using LiteLLM endpoint: {api_url}")
                logger.debug(f"🤖 Using model: {model_to_use} (content_type: {content_type})")
                
                request_body = self._prepare_request_body(prompt, image_data, response_format, document_name, content_type)
                prep_time = time.time() - prep_start
                logger.debug(f"📝 Request body preparation took: {prep_time*1000:.1f}ms")
                
                # Wrap only the HTTP request with LangSmith tracing (pure LLM response time)
                if self.langsmith_enabled and self.traceable:
                    metadata = {
                        "task": task,
                        "model": model_to_use,
                        "document_name": document_name or "unknown",
                        "has_image": bool(image_data),
                        "content_type": content_type
                    }
                    if page_number is not None:
                        metadata["page_number"] = page_number
                    
                    tags = [task, model_to_use, "sync"]
                    if page_number is not None:
                        tags.append(f"page_{page_number}")
                    
                    @self.traceable(
                        name=trace_name or f"llm_call_{task}",
                        run_type="llm",
                        tags=tags,
                        metadata=metadata
                    )
                    def _traced_http_call_sync():
                        return self._call_api_with_retry_sync(request_body, api_url)
                    
                    result = _traced_http_call_sync()
                else:
                    result = self._call_api_with_retry_sync(request_body, api_url)
            
            # Process the result to normalize the structure
            # This is NOT included in LangSmith timing
            parse_start = time.time()
            processed_result = self.process_api_result(result, task)
            parse_time = time.time() - parse_start
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log comprehensive timing information
            logger.info(f"⏱️ LLM call completed - Task: {task}, Model: {model_to_use}, Duration: {duration:.2f}s")
            logger.debug(f"   📝 Request prep: {prep_time*1000:.1f}ms | 🔄 Response parse: {parse_time*1000:.1f}ms")
            
            # Add timing info to result if it's a dict
            if isinstance(processed_result, dict):
                processed_result["_timing"] = {
                    "start_time": start_time,
                    "end_time": time.time(),
                    "duration_seconds": duration
                }
            
            return processed_result
        except Exception as e:
            logger.error(f"❌ Error in LLM API call: {e}")
            raise

    def process_api_result(self, result: Dict[str, Any], task: str) -> Dict[str, Any]:
        """Process API result and handle JSON parsing"""
        try:
            # Handle different response formats
            choices = result.get("choices", [])
            if not choices:
                logger.error("❌ No choices in LLM response")
                raise ValueError("No choices in LLM response")
            
            choice = choices[0]
            
            # Check finish_reason to detect token limit or other issues
            finish_reason = choice.get("finish_reason")
            usage = result.get("usage", {})
            completion_tokens_details = usage.get("completion_tokens_details", {})
            reasoning_tokens = completion_tokens_details.get("reasoning_tokens", 0)
            text_tokens = completion_tokens_details.get("text_tokens", 0)
            
            # Detect token limit issues (especially for Gemini models with reasoning)
            if finish_reason == "length":
                if reasoning_tokens > 0 and text_tokens == 0:
                    # Model used all tokens for reasoning without producing output
                    logger.error(f"❌ Token limit exceeded - Model used {reasoning_tokens} reasoning tokens with 0 text tokens")
                    logger.error(f"🔍 This usually means the prompt is too complex or the page content is too large")
                    logger.error(f"🔍 Usage: {json.dumps(usage, indent=2)}")
                    raise ValueError(f"Token limit exceeded: Model used all {reasoning_tokens} reasoning tokens without producing output. The page may be too complex or the prompt too long.")
                else:
                    # Response was truncated but we got some output
                    logger.warning(f"⚠️ Response truncated (finish_reason: length) - Total tokens: {usage.get('total_tokens', 0)}")
            
            # Try chat completions format first (message.content), then completions format (text)
            content = choice.get("message", {}).get("content", "") or choice.get("text", "")
            
            if not content:
                logger.error("❌ Empty response from LLM")
                logger.error(f"🔍 Finish reason: {finish_reason}")
                logger.error(f"🔍 Usage: {json.dumps(usage, indent=2)}")
                logger.error(f"🔍 Full response structure: {json.dumps(result, indent=2)}")
                raise ValueError("Empty response from LLM")
            
            # Log response length only (full content removed to reduce log size)
            logger.debug(f"📊 LLM response length: {len(content)} characters for task '{task}'")
            
            # Fix: Log actual response content if it's suspiciously short (likely empty or minimal response)
            if len(content) < 100:
                logger.debug(f"🔍 LLM response content (short response): {content[:500]}")
            
            # Check if response is suspiciously short (likely only has_signature or empty)
            if task == "without_template_extraction" and len(content) < 500:
                logger.warning(f"⚠️ Suspiciously short LLM response for {task} - may not contain extracted data")
            
            # Fix: Sanitize invalid Unicode escape sequences before JSON parsing
            # LLM sometimes returns invalid escapes like \u2026 (ellipsis) which breaks JSON parsing
            sanitized_content = self._sanitize_json_content(content)
            
            try:
                parsed_result = json.loads(sanitized_content)
                logger.debug(f"✅ Successfully parsed JSON response for task: {task}")
                
                # Check if only has_signature (no actual data extracted)
                if task == "without_template_extraction" and isinstance(parsed_result, dict):
                    parsed_keys = list(parsed_result.keys())
                    non_meta_keys = [k for k in parsed_keys if not k.startswith('_')]
                    if len(non_meta_keys) <= 1 and 'has_signature' in non_meta_keys:
                        logger.warning(f"⚠️ Parsed result may only contain 'has_signature' - keys: {parsed_keys}")
                    elif len(non_meta_keys) == 0:
                        logger.warning(f"⚠️ Parsed result has no data keys - only metadata keys: {parsed_keys}")
                
                # Normalize structure so frontend always receives {"fields": [...]} when appropriate
                normalized_result = self._normalize_result_structure(parsed_result, task)
                logger.debug(f"🔄 Normalized result structure keys: {list(normalized_result.keys()) if isinstance(normalized_result, dict) else 'N/A'}")
                # Attach parsed simple JSON so callers can run validation BEFORE normalization if needed
                if isinstance(normalized_result, dict):
                    normalized_result["_parsed"] = parsed_result
                    # Include usage information for token tracking
                    normalized_result["usage"] = result.get("usage", {})
                return normalized_result
                
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ JSON parse failed, attempting to extract JSON from markdown: {e}")
                logger.debug(f"🔍 JSON error details: {str(e)}")
                
                # Try to extract JSON from markdown code blocks
                extracted_json = self._extract_json_from_markdown(content)
                if extracted_json:
                    try:
                        # Fix: Sanitize extracted JSON as well
                        sanitized_extracted = self._sanitize_json_content(extracted_json)
                        parsed_result = json.loads(sanitized_extracted)
                        logger.info("✅ Successfully extracted and parsed JSON from markdown")
                        normalized_result = self._normalize_result_structure(parsed_result, task)
                        if isinstance(normalized_result, dict):
                            normalized_result["_parsed"] = parsed_result
                            # Include usage information for token tracking
                            normalized_result["usage"] = result.get("usage", {})
                        return normalized_result
                    except json.JSONDecodeError as e2:
                        logger.error(f"❌ Failed to parse extracted JSON: {e2}")
                        logger.debug(f"🔍 Extracted JSON (first 500 chars): {extracted_json[:500]}")
                        logger.debug(f"🔍 Extracted JSON (last 500 chars): {extracted_json[-500:]}")
                
                # Try one more time with more aggressive sanitization
                # This handles edge cases where the normal sanitization didn't catch all issues
                try:
                    logger.debug("🔄 Attempting aggressive JSON repair...")
                    # Apply sanitization multiple times to catch nested issues
                    aggressive_sanitized = self._sanitize_json_content(content)
                    # Try parsing - if it still fails, the issue is likely structural, not just escaping
                    parsed_result = json.loads(aggressive_sanitized)
                    logger.info("✅ Successfully parsed JSON after aggressive repair")
                    normalized_result = self._normalize_result_structure(parsed_result, task)
                    if isinstance(normalized_result, dict):
                        normalized_result["_parsed"] = parsed_result
                        normalized_result["usage"] = result.get("usage", {})
                    return normalized_result
                except json.JSONDecodeError as e3:
                    logger.error(f"❌ Aggressive repair also failed: {e3}")
                    
                    # Try to complete truncated JSON
                    try:
                        logger.debug("🔄 Attempting to complete truncated JSON...")
                        completed_json = self._complete_truncated_json(aggressive_sanitized)
                        parsed_result = json.loads(completed_json)
                        logger.info("✅ Successfully parsed JSON after completing truncated response")
                        normalized_result = self._normalize_result_structure(parsed_result, task)
                        if isinstance(normalized_result, dict):
                            normalized_result["_parsed"] = parsed_result
                            normalized_result["usage"] = result.get("usage", {})
                            normalized_result["_truncated"] = True  # Mark as truncated
                        return normalized_result
                    except Exception as e4:
                        logger.error(f"❌ Truncation repair also failed: {e4}")
                
                logger.error(f"❌ Failed to parse JSON response: {e}")
                logger.error(f"Raw AI response (first 500 chars): {content[:500]}")
                logger.error(f"Raw AI response (last 500 chars): {content[-500:]}")
                
                # For RAG tasks, return the raw text response instead of failing
                if task in ["rag_question_answering", "document_summarization"]:
                    logger.info(f"✅ Returning raw text response for RAG task: {task}")
                    return {
                        "success": True,
                        "result": content,
                        "raw_response": content,
                        "model": result.get("model", "unknown"),
                        "usage": result.get("usage", {})
                    }
                
                raise ValueError(f"Failed to parse JSON response from AI: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error processing API result: {e}")
            raise

    def _sanitize_json_content(self, content: str) -> str:
        """
        Fix: Sanitize JSON content to handle invalid Unicode escape sequences, newlines in strings,
        and trailing commas that Gemini sometimes produces.
        """
        import re
        try:
            # Step 1: Handle invalid Unicode escape sequences
            def decode_unicode_escape(match):
                """Decode Unicode escape sequence to actual character"""
                hex_code = match.group(1)
                try:
                    char_code = int(hex_code, 16)
                    char = chr(char_code)
                    return char
                except (ValueError, OverflowError):
                    return ' '
            
            # Replace all \uXXXX patterns with their actual Unicode characters
            sanitized = re.sub(r'\\u([0-9a-fA-F]{4})', decode_unicode_escape, content)
            
            # Step 2: Fix newlines inside JSON string keys/values (common Gemini issue)
            # This handles cases like: "Wallet\nShare" → "Wallet Share"
            def repair_string_newlines(text):
                """Repair unescaped newlines and other control characters in JSON string values"""
                result = []
                i = 0
                in_string = False
                escape_next = False
                
                while i < len(text):
                    char = text[i]
                    
                    if escape_next:
                        result.append(char)
                        escape_next = False
                    elif char == '\\':
                        result.append(char)
                        escape_next = True
                    elif char == '"':
                        backslash_count = 0
                        j = i - 1
                        while j >= 0 and text[j] == '\\':
                            backslash_count += 1
                            j -= 1
                        
                        if backslash_count % 2 == 0:
                            in_string = not in_string
                        result.append(char)
                    elif in_string:
                        # Inside a string - handle control characters
                        if char == '\n':
                            # Replace newline with space (for keys) or escaped newline (for values)
                            result.append(' ')  # Use space instead of \\n for cleaner output
                        elif char == '\r':
                            result.append(' ')
                        elif char == '\t':
                            result.append(' ')
                        elif ord(char) < 32:
                            hex_code = format(ord(char), '04x')
                            result.append(f'\\u{hex_code}')
                        else:
                            result.append(char)
                    else:
                        result.append(char)
                    
                    i += 1
                
                return ''.join(result)
            
            sanitized = repair_string_newlines(sanitized)
            
            # Step 3: Remove trailing commas before ] or } (common JSON error)
            # Pattern: comma followed by optional whitespace and then ] or }
            sanitized = re.sub(r',(\s*[}\]])', r'\1', sanitized)
            
            # Step 4: Fix unquoted property names (rare but happens)
            # This is a simple heuristic - look for patterns like { key: "value" }
            # and convert to { "key": "value" }
            def fix_unquoted_keys(text):
                """Fix unquoted property names in JSON"""
                # Match pattern: { key: or , key: where key is unquoted
                # Be careful not to break already valid JSON
                result = []
                i = 0
                while i < len(text):
                    # Look for patterns like {key: or ,key: where key is an identifier
                    if text[i] in '{,' and i + 1 < len(text):
                        # Skip whitespace
                        j = i + 1
                        while j < len(text) and text[j] in ' \t\n\r':
                            j += 1
                        
                        # Check if next char is a letter (unquoted key) or quote (already quoted)
                        if j < len(text) and text[j].isalpha():
                            # This might be an unquoted key - find the end
                            key_start = j
                            while j < len(text) and (text[j].isalnum() or text[j] in '_-'):
                                j += 1
                            
                            # Skip whitespace after key
                            key_end = j
                            while j < len(text) and text[j] in ' \t\n\r':
                                j += 1
                            
                            # Check if followed by colon (confirms it's a key)
                            if j < len(text) and text[j] == ':':
                                # It's an unquoted key - quote it
                                key = text[key_start:key_end]
                                result.append(text[i])
                                result.append(text[i+1:key_start])
                                result.append(f'"{key}"')
                                i = key_end
                                continue
                    
                    result.append(text[i])
                    i += 1
                
                return ''.join(result)
            
            # Only apply unquoted key fix if we detect potential issues
            if re.search(r'[{,]\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:', sanitized):
                # Check if it's actually unquoted (not already quoted)
                if not re.search(r'[{,]\s*"[^"]+"\s*:', sanitized):
                    sanitized = fix_unquoted_keys(sanitized)
            
            return sanitized
        except Exception as e:
            logger.warning(f"⚠️ Error sanitizing JSON content: {e}, using original content")
            return content
    
    def _extract_json_from_markdown(self, text: str) -> Optional[str]:
        """Extract JSON from markdown code blocks like ```json ... ```"""
        try:
            # Look for ```json ... ``` pattern
            import re
            pattern = r'```json\s*\n?(.*?)\n?```'
            match = re.search(pattern, text, re.DOTALL)
            if match:
                return match.group(1).strip()
            
            # Fallback: look for any ``` ... ``` and try to parse as JSON
            pattern = r'```\s*\n?(.*?)\n?```'
            match = re.search(pattern, text, re.DOTALL)
            if match:
                content = match.group(1).strip()
                # Try to parse to validate it's JSON
                json.loads(content)
                return content
            
            return None
        except Exception as e:
            logger.error(f"Error extracting JSON from markdown: {e}")
            return None

    def _complete_truncated_json(self, content: str) -> str:
        """
        Attempt to complete truncated JSON by closing open strings, arrays, and objects.
        This handles cases where the LLM response was cut off mid-response.
        """
        try:
            # Remove any trailing incomplete data after the last complete value
            content = content.rstrip()
            
            # Track open brackets and quotes
            stack = []
            in_string = False
            escape_next = False
            last_valid_pos = 0
            
            for i, char in enumerate(content):
                if escape_next:
                    escape_next = False
                    continue
                
                if char == '\\' and in_string:
                    escape_next = True
                    continue
                
                if char == '"' and not escape_next:
                    if in_string:
                        in_string = False
                        last_valid_pos = i + 1
                    else:
                        in_string = True
                    continue
                
                if not in_string:
                    if char == '{':
                        stack.append('}')
                    elif char == '[':
                        stack.append(']')
                    elif char == '}':
                        if stack and stack[-1] == '}':
                            stack.pop()
                            last_valid_pos = i + 1
                    elif char == ']':
                        if stack and stack[-1] == ']':
                            stack.pop()
                            last_valid_pos = i + 1
                    elif char == ',':
                        last_valid_pos = i + 1
            
            # If we're in a string, close it
            if in_string:
                # Find the last complete key-value and truncate there
                # Look for the last comma or opening brace before the unclosed string
                truncate_pos = content.rfind(',', 0, last_valid_pos)
                if truncate_pos > 0:
                    content = content[:truncate_pos]
                else:
                    # Just close the string
                    content = content + '"'
            
            # Close any remaining open brackets
            closing = ''.join(reversed(stack))
            result = content.rstrip().rstrip(',') + closing
            
            # Validate the result parses
            json.loads(result)
            logger.info(f"✅ Completed truncated JSON by adding: {closing}")
            return result
            
        except json.JSONDecodeError:
            # If still invalid, try more aggressive truncation
            # Find the last complete key-value pair
            try:
                # Try truncating at each comma from the end until we get valid JSON
                for i in range(len(content) - 1, 0, -1):
                    if content[i] == ',':
                        attempt = content[:i].rstrip()
                        # Count open braces to know how many to close
                        open_braces = attempt.count('{') - attempt.count('}')
                        open_brackets = attempt.count('[') - attempt.count(']')
                        closing = '}' * open_braces + ']' * open_brackets
                        try:
                            result = attempt + closing
                            json.loads(result)
                            logger.info(f"✅ Completed truncated JSON by truncating at position {i}")
                            return result
                        except:
                            continue
            except:
                pass
            raise

    def _normalize_result_structure(self, parsed_result: Any, task: str) -> Dict[str, Any]:
        """Convert various model outputs into a consistent structure based on task type"""
        try:
            # For field_detection and form_creation, preserve hierarchical structure
            if task in ["field_detection", "form_creation"] and isinstance(parsed_result, dict):
                # If the model already returned a fields array, keep it; otherwise return empty fields
                fields = parsed_result.get("fields") if isinstance(parsed_result.get("fields"), list) else []
                return {"fields": fields, "hierarchical_data": parsed_result}
            
            # For without_template_extraction and template_guided_extraction, preserve the simple JSON structure (hierarchical_data only)
            elif task in ["without_template_extraction", "template_guided_extraction"] and isinstance(parsed_result, dict):
                logger.debug(f"🎯 Preserving simple JSON structure for {task}")
                # IMPORTANT: Preserve key order from LLM response (Python 3.7+ dicts preserve insertion order)
                # Add key order metadata to preserve section/field order if not present
                ordered_keys = [key for key in parsed_result.keys() if not key.startswith('_')]
                
                # Fix: Log warning if LLM only returned has_signature (no actual data extracted)
                if len(ordered_keys) <= 1 and 'has_signature' in ordered_keys:
                    logger.warning(f"⚠️ LLM response contains only 'has_signature' field - no data extracted! Parsed result keys: {list(parsed_result.keys())}")
                    logger.debug(f"   Full parsed result: {json.dumps(parsed_result, indent=2)[:500]}")
                
                if ordered_keys and '_keyOrder' not in parsed_result:
                    parsed_result['_keyOrder'] = ordered_keys
                
                logger.debug(f"🔄 Preserved hierarchical_data with {len(ordered_keys)} sections (order preserved)")
                
                # Log only top-level keys to reduce log size
                logger.debug(f"📋 [LLM Response] {task} response structure keys: {list(parsed_result.keys()) if isinstance(parsed_result, dict) else 'N/A'}")
                
                # Return only hierarchical_data - no fields array conversion
                return {"hierarchical_data": parsed_result}
            
            # Handle other task types
            if isinstance(parsed_result, dict):
                if "fields" in parsed_result:
                    # Already in correct format
                    return parsed_result
                else:
                    # Convert dict to fields format
                    fields = []
                    for idx, (key, value) in enumerate(parsed_result.items(), start=1):
                        fields.append({
                            "id": str(idx),
                            "label": key,
                            "type": "text",
                            "value": value,
                            "confidence": 0.85
                        })
                    return {"fields": fields}
            
            elif isinstance(parsed_result, list):
                # List of fields
                return {"fields": parsed_result}
            
            else:
                # Single value or unexpected format
                return {"fields": [{"id": "1", "label": "result", "type": "text", "value": str(parsed_result), "confidence": 0.85}]}
                
        except Exception as e:
            logger.error(f"Error normalizing result structure: {e}")
            return {"fields": []}