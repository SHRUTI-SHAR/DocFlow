"""
Form Creation Service
Handles AI-powered form creation from documents using LLM
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from ..pdf_processor import PDFProcessor
from .llm_client import LLMClient
from .prompt_service import PromptService

logger = logging.getLogger(__name__)

class FormCreationService:
    """Service for AI-powered form creation from documents"""
    
    def __init__(self, llm_client: LLMClient, prompt_service: PromptService):
        self.pdf_processor = PDFProcessor()
        self.llm_client = llm_client
        self.prompt_service = prompt_service
        
    def _is_pdf_document(self, document_data: str) -> bool:
        """Check if document is a PDF"""
        return document_data.startswith("data:application/pdf") or document_data.startswith("data:application/octet-stream")
    
    async def create_form_from_document(
        self,
        document_data: str,
        document_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create form structure from a document (PDF or image) using AI
        
        Args:
            document_data: Base64-encoded document (PDF or image)
            document_name: Optional document name for logging
            
        Returns:
            Dictionary containing form structure with hierarchical_data, fields, sections, and tables
        """
        try:
            logger.info(f"🚀 Starting form creation from document: {document_name or 'unnamed'}")
            
            is_pdf = self._is_pdf_document(document_data)
            
            if is_pdf:
                logger.info("📄 Processing PDF document for form creation")
                result = await self._process_pdf_for_form(document_data, document_name)
            else:
                logger.info("🖼️ Processing image document for form creation")
                result = await self._process_image_for_form(document_data, document_name)
            
            logger.info("✅ Form creation completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error in form creation: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def _process_pdf_for_form(
        self,
        pdf_data: str,
        document_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process PDF document for form creation"""
        try:
            # Convert PDF to images (using existing PDF processing logic)
            converted_images = await self.pdf_processor.convert_pdf_to_images(pdf_data)
            
            if not converted_images:
                raise ValueError("Failed to convert PDF to images")
            
            logger.info(f"📄 Converted PDF to {len(converted_images)} images")
            
            # Get form creation prompt
            prompt, response_format = self.prompt_service.get_form_creation_prompt()
            
            # Prepare request body with all images
            request_body = self.llm_client._prepare_request_body(
                prompt, converted_images[0], response_format, document_name
            )
            
            # Add additional pages if present
            if len(converted_images) > 1:
                additional_images = []
                for img in converted_images[1:]:
                    additional_images.append({
                        "type": "image_url",
                        "image_url": {
                            "url": img  # Image already has correct data URL format from _encode_image_simple
                        }
                    })
                
                # Insert additional images before the prompt text
                request_body["messages"][0]["content"][1:1] = additional_images
            
            # Call LLM API
            base_url = self.llm_client.litellm_api_url.rstrip('/')
            api_url = f"{base_url}/v1/chat/completions"
            result = await self.llm_client._call_api_with_retry(request_body, api_url)
            
            # Process the result to extract hierarchical structure
            processed_result = self.llm_client.process_api_result(result, "form_creation")
            
            # Extract hierarchical_data from processed result
            # For form_creation task, the result should be the hierarchical structure itself
            hierarchical_data = processed_result.get("hierarchical_data") or processed_result.get("result") or processed_result.get("_parsed") or {}
            
            if not hierarchical_data and isinstance(processed_result, dict):
                # If the entire result is the hierarchical structure, use it directly
                hierarchical_data = {k: v for k, v in processed_result.items() 
                                   if k not in ["fields", "sections", "tables", "signatures", "_parsed"]}
            
            if not hierarchical_data:
                logger.warning("⚠️ No hierarchical_data in LLM response, using empty structure")
                hierarchical_data = {}
            
            # Structure the response
            response = {
                "success": True,
                "hierarchical_data": hierarchical_data,
                "fields": processed_result.get("fields", []),
                "sections": processed_result.get("sections", []),
                "tables": processed_result.get("tables", []),
                "signatures": processed_result.get("signatures", []),
                "message": "Form created successfully from document"
            }
            
            logger.info(f"✅ Form created with {len(response.get('fields', []))} fields")
            return response
            
        except Exception as e:
            logger.error(f"Error processing PDF for form creation: {e}")
            raise
    
    async def _process_image_for_form(
        self,
        image_data: str,
        document_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Process image document for form creation"""
        try:
            # Get form creation prompt
            prompt, response_format = self.prompt_service.get_form_creation_prompt()
            
            # Call LLM API directly with image
            result = await self.llm_client.call_api(
                prompt,
                image_data,
                response_format,
                "form_creation",
                document_name
            )
            
            # Extract hierarchical_data from result
            # For form_creation task, the result should be the hierarchical structure itself
            hierarchical_data = result.get("hierarchical_data") or result.get("result") or result.get("_parsed") or {}
            
            if not hierarchical_data and isinstance(result, dict):
                # If the entire result is the hierarchical structure, use it directly
                hierarchical_data = {k: v for k, v in result.items() 
                                   if k not in ["fields", "sections", "tables", "signatures", "_parsed"]}
            
            if not hierarchical_data:
                logger.warning("⚠️ No hierarchical_data in LLM response, using empty structure")
                hierarchical_data = {}
            
            # Structure the response
            response = {
                "success": True,
                "hierarchical_data": hierarchical_data,
                "fields": result.get("fields", []),
                "sections": result.get("sections", []),
                "tables": result.get("tables", []),
                "signatures": result.get("signatures", []),
                "message": "Form created successfully from document"
            }
            
            logger.info(f"✅ Form created with {len(response.get('fields', []))} fields")
            return response
            
        except Exception as e:
            logger.error(f"Error processing image for form creation: {e}")
            raise

