"""
Pydantic Schemas for LLM Structured Output

Defines strict schemas for Gemini's native structured output feature.
These schemas ensure the LLM returns valid, well-formed JSON every time.
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# BASE MODELS
# ============================================================================

class ExtractedField(BaseModel):
    """A single extracted field with value and optional metadata"""
    value: Optional[str] = Field(None, description="The extracted value")
    confidence: Optional[float] = Field(None, description="Confidence score 0-1")
    
    class Config:
        extra = "allow"  # Allow additional fields


class TableRow(BaseModel):
    """A single row in a table - dynamic columns"""
    
    class Config:
        extra = "allow"  # Allow any column names


# ============================================================================
# EXTRACTION RESPONSES
# ============================================================================

class WithoutTemplateExtractionResponse(BaseModel):
    """Response schema for without_template_extraction task
    
    This is a flexible schema that allows any structure of extracted data.
    The LLM organizes data into sections naturally based on document structure.
    """
    has_signature: bool = Field(False, description="Whether the document contains a signature")
    has_photo_id: bool = Field(False, description="Whether the document contains a photo ID or face")
    
    class Config:
        extra = "allow"  # Allow dynamic sections and fields


class TemplateMatchingResponse(BaseModel):
    """Response schema for template_matching task"""
    matched_template_id: str = Field(..., description="ID of the matched template")
    matched_template_name: Optional[str] = Field(None, description="Name of the matched template")
    confidence: float = Field(..., description="Confidence score 0-1", ge=0, le=1)
    reasoning: str = Field(..., description="Explanation of why this template matches")
    
    class Config:
        extra = "allow"


class FieldDetectionResponse(BaseModel):
    """Response schema for field_detection task
    
    Flexible schema for detecting form fields in documents.
    """
    
    class Config:
        extra = "allow"  # Allow dynamic field structure


class FormCreationResponse(BaseModel):
    """Response schema for form_creation task
    
    Flexible schema for creating form structures.
    """
    
    class Config:
        extra = "allow"  # Allow dynamic field structure


class DocumentTypeDetectionResponse(BaseModel):
    """Response schema for document_type_detection task
    
    Strict schema for detecting document types from images.
    Forces LLM to return properly structured JSON.
    """
    document_type: str = Field(..., description="Document type as a slug (lowercase, hyphens). Examples: pan-card, aadhaar-card, passport, bank-statement, invoice, salary-slip")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0", ge=0.0, le=1.0)
    reason: str = Field(..., description="Brief reason for the classification")


# ============================================================================
# SCHEMA CONVERSION UTILITIES
# ============================================================================

def get_gemini_schema_for_task(task: str) -> Optional[Dict[str, Any]]:
    """Get Gemini-compatible JSON schema for a task
    
    Gemini's response_schema parameter requires a specific format.
    
    IMPORTANT: For dynamic extraction tasks (without_template_extraction, field_detection),
    we return None to disable native schema. This is because:
    1. We can't predefine what fields will be extracted
    2. Native schema restricts output to only defined properties
    3. The LLM needs freedom to extract ANY fields it finds
    
    Native schema is only used for STRUCTURED tasks with known output format
    (template_matching, db_template_matching).
    
    Args:
        task: The extraction task type
        
    Returns:
        JSON schema dict for Gemini's response_schema parameter, or None
    """
    
    if task == "without_template_extraction":
        # DISABLED: Native schema is too restrictive for dynamic extraction
        # The LLM needs to extract ANY fields it finds, not just predefined ones
        # Returning None means we'll use response_mime_type="application/json" only
        # which tells Gemini to return JSON but doesn't restrict the structure
        return None
    
    elif task == "template_matching" or task == "db_template_matching":
        # Strict schema for template matching - we know exactly what fields we need
        return {
            "type": "object",
            "properties": {
                "matched_template_id": {
                    "type": "string",
                    "description": "ID of the matched template"
                },
                "confidence": {
                    "type": "number",
                    "description": "Confidence score between 0 and 1"
                },
                "reasoning": {
                    "type": "string",
                    "description": "Brief explanation of why this template matches"
                }
            },
            "required": ["matched_template_id", "confidence", "reasoning"]
        }
    
    elif task == "field_detection":
        # DISABLED: Dynamic extraction - can't predefine fields
        return None
    
    elif task == "form_creation":
        # DISABLED: Dynamic extraction - can't predefine fields
        return None
    
    elif task == "document_type_detection":
        # Strict schema for document type detection - we know exactly what we need
        return {
            "type": "object",
            "properties": {
                "document_type": {
                    "type": "string",
                    "description": "Document type as a slug (lowercase, hyphens). Examples: pan-card, aadhaar-card, passport, bank-statement, invoice, salary-slip"
                },
                "confidence": {
                    "type": "number",
                    "description": "Confidence score between 0.0 and 1.0"
                },
                "reason": {
                    "type": "string",
                    "description": "Brief reason for the classification"
                }
            },
            "required": ["document_type", "confidence", "reason"]
        }
    
    else:
        # Default: no strict schema, allow any structure
        logger.debug(f"No specific schema defined for task: {task}")
        return None


def pydantic_to_gemini_schema(model_class: type) -> Dict[str, Any]:
    """Convert a Pydantic model to Gemini-compatible JSON schema
    
    Note: Gemini's response_schema has some limitations:
    - No support for $ref or definitions
    - Limited support for complex nested structures
    - Best used with flat or shallow schemas
    
    Args:
        model_class: A Pydantic model class
        
    Returns:
        Gemini-compatible JSON schema dict
    """
    try:
        # Get JSON schema from Pydantic model
        schema = model_class.model_json_schema()
        
        # Remove Pydantic-specific fields that Gemini doesn't understand
        if "$defs" in schema:
            del schema["$defs"]
        if "definitions" in schema:
            del schema["definitions"]
        if "title" in schema:
            del schema["title"]
            
        # Recursively clean properties
        def clean_schema(s: Dict[str, Any]) -> Dict[str, Any]:
            if isinstance(s, dict):
                # Remove unsupported fields
                s.pop("title", None)
                s.pop("default", None)  # Gemini doesn't need defaults
                
                # Recursively clean nested schemas
                if "properties" in s:
                    for key, value in s["properties"].items():
                        s["properties"][key] = clean_schema(value)
                        
                if "items" in s and isinstance(s["items"], dict):
                    s["items"] = clean_schema(s["items"])
                    
                if "additionalProperties" in s and isinstance(s["additionalProperties"], dict):
                    s["additionalProperties"] = clean_schema(s["additionalProperties"])
                    
            return s
        
        return clean_schema(schema)
        
    except Exception as e:
        logger.warning(f"Failed to convert Pydantic model to Gemini schema: {e}")
        return {"type": "object"}


# ============================================================================
# VALIDATION UTILITIES  
# ============================================================================

def validate_extraction_response(data: Dict[str, Any], task: str) -> tuple[bool, List[str]]:
    """Validate an extraction response against expected schema
    
    Args:
        data: The extracted data dict
        task: The extraction task type
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    if task == "without_template_extraction":
        # Must have at least some data (not just has_signature or has_photo_id)
        non_meta_keys = [k for k in data.keys() if not k.startswith('_')]
        if len(non_meta_keys) == 0:
            errors.append("No data extracted")
        elif len(non_meta_keys) == 1 and ("has_signature" in non_meta_keys or "has_photo_id" in non_meta_keys):
            errors.append("Only has_signature or has_photo_id extracted, no actual data")
        elif len(non_meta_keys) == 2 and "has_signature" in non_meta_keys and "has_photo_id" in non_meta_keys:
            errors.append("Only has_signature and has_photo_id extracted, no actual data")
            
    elif task in ["template_matching", "db_template_matching"]:
        required = ["matched_template_id", "confidence", "reasoning"]
        for field in required:
            if field not in data:
                errors.append(f"Missing required field: {field}")
        
        if "confidence" in data:
            conf = data["confidence"]
            if not isinstance(conf, (int, float)) or conf < 0 or conf > 1:
                errors.append(f"Invalid confidence value: {conf}")
    
    return len(errors) == 0, errors


# ============================================================================
# SCHEMA INFO LOGGING
# ============================================================================

def log_schema_usage(task: str, using_native_schema: bool):
    """Log schema usage for debugging"""
    if using_native_schema:
        logger.info(f"📋 Using Gemini native response_schema for task: {task}")
    else:
        logger.debug(f"📋 Using JSON mode without strict schema for task: {task}")
