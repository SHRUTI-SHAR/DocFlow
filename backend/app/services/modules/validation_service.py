"""
Validation Service
Handles all validation logic for extracted fields
"""

import json
import logging
from typing import Dict, Any, List, Optional
from .llm_client import LLMClient

logger = logging.getLogger(__name__)

class ValidationService:
    """Service for validating extracted fields using LLM"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def validate_fields_with_llm_page_by_page(
        self, 
        fields_data: Dict[str, Any], 
        page_images: List[str], 
        skip_if_already_validated: bool = True
    ) -> Dict[str, Any]:
        """
        Validate fields page by page using LLM.
        """
        try:
            logger.info("🔍 Starting page-by-page field validation...")
            
            # Check if already validated
            if skip_if_already_validated and fields_data.get("validated"):
                logger.info("✅ Fields already validated, skipping validation")
                return fields_data
            
            fields = fields_data.get("fields", [])
            if not fields:
                logger.warning("No fields to validate")
                return fields_data
            
            # Group fields by page
            fields_by_page = {}
            for field in fields:
                page_num = field.get("page", 1)
                if page_num not in fields_by_page:
                    fields_by_page[page_num] = []
                fields_by_page[page_num].append(field)
            
            validated_fields = []
            total_validation_changes = 0
            
            # Validate each page
            for page_num, page_fields in fields_by_page.items():
                logger.info(f"🔍 Validating page {page_num} with {len(page_fields)} fields...")
                
                # Get corresponding page image
                page_image = None
                if page_num <= len(page_images):
                    page_image = page_images[page_num - 1]
                else:
                    logger.warning(f"No image available for page {page_num}, using first page image")
                    page_image = page_images[0] if page_images else None
                
                if not page_image:
                    logger.warning(f"No page image available for validation, keeping original fields")
                    validated_fields.extend(page_fields)
                    continue
                
                # Validate fields for this page
                page_validated_result = await self._validate_fields_for_page(
                    page_fields, page_image, page_num
                )
                
                if page_validated_result:
                    validated_fields.extend(page_validated_result["fields"])
                    total_validation_changes += page_validated_result.get("changes_made", 0)
                    logger.info(f"✅ Page {page_num} validation completed: {page_validated_result.get('changes_made', 0)} changes made")
                else:
                    logger.warning(f"⚠️ Page {page_num} validation failed, keeping original fields")
                    validated_fields.extend(page_fields)
            
            # Update result
            result = fields_data.copy()
            result["fields"] = validated_fields
            result["validated"] = True
            result["validation_changes"] = total_validation_changes
            
            logger.info(f"✅ Page-by-page validation completed: {total_validation_changes} total changes made")
            return result
            
        except Exception as e:
            logger.error(f"Error in page-by-page validation: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return fields_data

    async def validate_fields_with_llm(
        self, 
        fields_data: Dict[str, Any], 
        page_images: List[str], 
        skip_if_already_validated: bool = True
    ) -> Dict[str, Any]:
        """
        Legacy method - delegates to page-by-page validation for consistency.
        """
        return await self.validate_fields_with_llm_page_by_page(
            fields_data, page_images, skip_if_already_validated
        )

    async def _validate_fields_for_page(
        self, 
        page_fields: List[Dict[str, Any]], 
        page_image: str, 
        page_num: int
    ) -> Optional[Dict[str, Any]]:
        """Validate fields for a specific page"""
        try:
            # Create validation prompt for this page
            validation_prompt = self._create_validation_prompt(page_fields)
            
            # Make API call
            result = await self.llm_client.call_api(
                validation_prompt, 
                page_image, 
                {"type": "json_object"},
                "validation",
                document_name=f"Page {page_num} Validation"
            )
            
            # Process result
            validated_data = self.llm_client.process_api_result(result, "validation")
            
            if validated_data and validated_data.get("fields"):
                # Add page number back to fields
                for field in validated_data["fields"]:
                    field["page"] = page_num
                
                # Count changes
                changes_made = self._count_validation_changes(page_fields, validated_data["fields"])
                validated_data["changes_made"] = changes_made
                
                return validated_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error validating fields for page {page_num}: {e}")
            return None

    def _create_validation_prompt(self, fields: List[Dict[str, Any]]) -> str:
        """Create validation prompt for fields"""
        fields_text = "\n".join([
            f"- {field.get('label', 'Unknown')}: {field.get('value', 'N/A')}"
            for field in fields
        ])
        
        return f"""You are a document validation expert. Review the extracted field data and correct any errors.

EXTRACTED FIELDS TO VALIDATE:
{fields_text}

VALIDATION INSTRUCTIONS:
1. Carefully compare the extracted field values with what you can see in the document image
2. Look for common OCR errors:
   - Digit confusion (0 vs O, 1 vs l, 5 vs S, etc.)
   - Character confusion (rn vs m, cl vs d, etc.)
   - Missing or extra characters
   - Incorrect spacing or punctuation
3. Pay special attention to:
   - Numbers (registration numbers, phone numbers, dates)
   - Names (proper capitalization, spelling)
   - Addresses (complete and accurate)
   - Any structured data (tables, forms)

CORRECTION RULES:
- Only correct obvious errors - don't change correct data
- Maintain the exact same field structure
- For numbers: ensure digit accuracy (common OCR errors: 0↔O, 1↔l, 5↔S, 8↔B)
- For names: proper capitalization, correct spelling
- For addresses: ensure completeness and accuracy
- If uncertain, keep the original value

OUTPUT FORMAT:
Return a JSON array of objects with the corrected fields. Each field should have:
- "id": original field ID
- "label": field name
- "type": field type
- "value": corrected field value
- "confidence": confidence score (0.0-1.0)

Example:
[
  {{
    "id": "1",
    "label": "applicant_name",
    "type": "text",
    "value": "CORRECTED_NAME",
    "confidence": 0.95
  }},
  {{
    "id": "2",
    "label": "registration_number",
    "type": "text",
    "value": "CORRECTED_NUMBER",
    "confidence": 0.90
  }}
]

Return ONLY the corrected JSON array."""

    def _count_validation_changes(self, original_fields: List[Dict[str, Any]], validated_fields: List[Dict[str, Any]]) -> int:
        """Count how many fields were changed during validation"""
        changes = 0
        
        # Create lookup for original fields
        original_lookup = {field.get("id"): field.get("value", "") for field in original_fields}
        
        # Count changes
        for field in validated_fields:
            field_id = field.get("id")
            new_value = field.get("value", "")
            original_value = original_lookup.get(field_id, "")
            
            if new_value != original_value:
                changes += 1
                logger.info(f"🔄 Field changed: {field.get('label', field_id)} - '{original_value}' → '{new_value}'")
        
        return changes

    async def validate_raw_json(
        self, 
        raw_json: Dict[str, Any], 
        converted_images: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Validate raw JSON directly without field array conversion
        """
        try:
            logger.info("🔍 Starting validation for raw JSON...")
            
            if not raw_json:
                logger.warning("No data to validate")
                return None
            
            # Create validation prompt for raw JSON
            validation_prompt = f"""You are a document validation expert. Review the extracted data and correct any errors.

EXTRACTED DATA TO VALIDATE:
{json.dumps(raw_json, indent=2)}

CONVERTED IMAGES:
{len(converted_images)} pages of the document for reference.

VALIDATION INSTRUCTIONS:
1. Carefully compare the extracted data with what you can see in the images
2. Look for common OCR errors:
   - Digit confusion (0 vs O, 1 vs l, 5 vs S, etc.)
   - Character confusion (rn vs m, cl vs d, etc.)
   - Missing or extra characters
   - Incorrect spacing or punctuation
3. Pay special attention to:
   - Numbers (registration numbers, phone numbers, dates)
   - Names (proper capitalization, spelling)
   - Addresses (complete and accurate)
   - Any structured data (tables, forms)

CORRECTION RULES:
- Only correct obvious errors - don't change correct data
- Maintain the exact same JSON structure
- For numbers: ensure digit accuracy (common OCR errors: 0↔O, 1↔l, 5↔S, 8↔B)
- For names: proper capitalization, correct spelling
- For addresses: ensure completeness and accuracy
- If uncertain, keep the original value

Return the corrected JSON in the same structure as the input."""

            # Use first image for validation
            validation_image = converted_images[0] if converted_images else None
            if not validation_image:
                logger.warning("No converted images available for validation")
                return None
            
            # Make validation API call
            result = await self.llm_client.call_api(
                validation_prompt, 
                validation_image, 
                {"type": "json_object"},
                "validation",
                document_name="Validation Check"
            )
            
            # Process validation result - result is already processed by call_api
            validated_data = result
            
            if validated_data and isinstance(validated_data, dict):
                logger.info("✅ Raw JSON validation completed successfully")
                return validated_data
            else:
                logger.warning("⚠️ Validation returned no data")
                return None
                
        except Exception as e:
            logger.error(f"Validation error: {e}")
            logger.error(f"Validation error type: {type(e).__name__}")
            import traceback
            logger.error(f"Validation traceback: {traceback.format_exc()}")
            return None

    async def validate_extracted_fields_without_template(
        self, 
        extraction_result: Dict[str, Any], 
        converted_images: List[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Validate extracted fields from without_template_extraction task.
        Uses LLM to review and correct the extracted data.
        """
        try:
            logger.info("🔍 Starting validation for without_template_extraction...")
            
            # Get the fields from extraction result
            extracted_fields = extraction_result.get("fields", [])
            if not extracted_fields:
                logger.warning("No fields to validate")
                return None
            
            # Convert fields back to simple JSON structure for validation
            simple_structure = {}
            for field in extracted_fields:
                field_label = field.get("label", "")
                field_value = field.get("value", "")
                
                # Try to parse JSON values back to objects
                try:
                    if isinstance(field_value, str) and field_value.startswith('{'):
                        parsed_value = json.loads(field_value)
                    else:
                        parsed_value = field_value
                except json.JSONDecodeError:
                    parsed_value = field_value
                
                simple_structure[field_label] = parsed_value
            
            # Create validation prompt
            validation_prompt = f"""You are a document validation expert. Review the extracted data and correct any errors.

EXTRACTED DATA TO VALIDATE:
{json.dumps(simple_structure, indent=2)}

CONVERTED IMAGES:
{len(converted_images)} pages of the document for reference.

VALIDATION INSTRUCTIONS:
1. Carefully compare the extracted data with what you can see in the images
2. Look for common OCR errors:
   - Digit confusion (0 vs O, 1 vs l, 5 vs S, etc.)
   - Character confusion (rn vs m, cl vs d, etc.)
   - Missing or extra characters
   - Incorrect spacing or punctuation
3. Pay special attention to:
   - Numbers (registration numbers, phone numbers, dates)
   - Names (proper capitalization, spelling)
   - Addresses (complete and accurate)
   - Any structured data (tables, forms)

CORRECTION RULES:
- Only correct obvious errors - don't change correct data
- Maintain the exact same JSON structure
- For numbers: ensure digit accuracy (common OCR errors: 0↔O, 1↔l, 5↔S, 8↔B)
- For names: proper capitalization, correct spelling
- For addresses: ensure completeness and accuracy
- If uncertain, keep the original value

OUTPUT FORMAT:
Return the corrected data in the exact same JSON structure. Only change values that are clearly incorrect.

Example:
{{
    "document_info": {{
        "board_name": "CORRECTED_BOARD_NAME",
        "document_title": "CORRECTED_TITLE"
    }},
    "personal_details": {{
        "applicant_name": "CORRECTED_NAME",
        "mobile_number": "CORRECTED_NUMBER"
    }}
}}

Return ONLY the corrected JSON structure."""

            # Use the first image for validation (or combine multiple if needed)
            validation_image = converted_images[0] if converted_images else None
            
            if not validation_image:
                logger.warning("No converted images available for validation")
                return None
            
            # Make validation API call
            result = await self.llm_client.call_api(
                validation_prompt, 
                validation_image, 
                {"type": "json_object"},
                "validation",
                document_name="Validation Check"
            )
            
            # Process validation result - result is already processed by call_api
            validated_data = result
            
            if validated_data and isinstance(validated_data, dict):
                # Convert back to fields array format for consistency
                fields = []
                field_id_counter = 1
                
                for key, value in validated_data.items():
                    fields.append({
                        "id": str(field_id_counter),
                        "label": key,
                        "type": "text",
                        "value": json.dumps(value) if isinstance(value, (dict, list)) else str(value),
                        "confidence": 0.9  # Higher confidence after validation
                    })
                    field_id_counter += 1
                
                logger.info(f"✅ Validation completed successfully: {len(fields)} fields validated")
                return {"fields": fields}
            else:
                logger.warning("Validation result is empty or invalid")
                return None
                
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            logger.error(f"Validation error type: {type(e).__name__}")
            import traceback
            logger.error(f"Validation traceback: {traceback.format_exc()}")
            return None
