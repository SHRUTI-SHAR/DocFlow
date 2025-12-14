"""
Prompt Service
Handles prompt generation and management for different tasks
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

class PromptService:
    """Service for generating prompts for different document analysis tasks"""
    
    def __init__(self):
        pass

    def get_task_prompt(
        self,
        task: str,
        templates: Optional[List[Dict[str, Any]]] = None, 
        db_templates: Optional[List[Dict[str, Any]]] = None,
        content_type: str = "image",
        document_type: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """Get prompt for a specific task
        
        Args:
            task: Task type
            templates: Optional templates
            db_templates: Optional DB templates
            content_type: "text" or "image" - determines prompt format (default: "image")
            document_type: Type of document (e.g., "bank_statement") for specialized prompts
            context: Optional context dict containing:
                - is_first_page: Whether this is the first page (for bank statements)
                - table_headers: List of table headers from first page
                - page_number: Current page number
        """
        
        # Check for bank statement document type with without_template_extraction
        if document_type and document_type.lower() in ["bank_statement", "bank-statement", "bankstatement", "bank statement"]:
            if task == "without_template_extraction":
                return self._get_bank_statement_extraction_prompt(content_type, context)
        
        if task == "field_detection":
            return self._get_field_detection_prompt()
        elif task == "template_matching":
            return self._get_template_matching_prompt(templates)
        elif task == "db_template_matching":
            return self._get_db_template_matching_prompt(db_templates)
        elif task == "without_template_extraction":
            return self._get_without_template_extraction_prompt(content_type)
        elif task == "form_creation":
            return self.get_form_creation_prompt()
        else:
            raise ValueError(f"Unknown task: {task}")
    
    def get_form_creation_prompt(self) -> Tuple[str, Dict[str, Any]]:
        """Get prompt for form creation task - optimized for creating form structures"""
        prompt = """Analyze this document and create a comprehensive form structure that can be used to collect data similar to what is shown in this document.

TASK: Form Structure Creation for Data Collection
- Create a form structure that mirrors the document's data organization
- Set all field values to null (we're creating a template, not extracting data)
- Preserve the document's natural organization into sections
- Identify appropriate field types (text, number, date, email, phone, select, radio, checkbox, file, textarea, table, signature)
- Return fields with type metadata: {"_type": "field_type", "value": null}

FORM FIELD TYPE DETECTION:
1. **Text Fields**: General text input, names, descriptions, addresses → {"_type": "text", "value": null}
2. **Number Fields**: Quantities, amounts, IDs, codes that are numeric → {"_type": "number", "value": null}
3. **Date Fields**: Any date fields (birth date, expiry date, issue date, etc.) → {"_type": "date", "value": null}
4. **Email Fields**: Email addresses → {"_type": "email", "value": null}
5. **Phone Fields**: Phone numbers, mobile numbers → {"_type": "phone", "value": null}
6. **Select/Dropdown Fields**: When there are limited options or categories → {"_type": "select", "options": ["Option1", "Option2"], "value": null}
7. **Radio Fields**: When user must select one option from a few choices (typically 2-5 options) → {"_type": "radio", "options": ["Option1", "Option2"], "value": null}
8. **Checkbox Fields**: When multiple options can be selected → {"_type": "checkbox", "options": ["Option1", "Option2"], "value": []}
9. **File Upload Fields**: When document mentions "upload", "attach", or shows file icons → {"_type": "file", "value": null}
10. **Textarea Fields**: For longer text inputs or descriptions → {"_type": "textarea", "value": null}
11. **Table Fields**: For tabular data with rows and columns → {"_type": "table", "_columns": ["col1", "col2"], "value": [{"col1": null, "col2": null}]}
12. **Signature Fields**: For signature areas → {"_type": "signature", "bbox": [xmin, ymin, xmax, ymax], "value": null}

ORGANIZATION RULES:
1. **Sections**: Group related fields into logical sections based on document structure
2. **Section Names**: Use clear, descriptive section names (e.g., "Personal Information", "Contact Details", "Job Profile")
3. **Field Labels**: Use clear, human-readable labels that match the document's terminology
4. **Field Order**: Maintain the order of fields as they appear in the document (top to bottom, left to right)

SELECT/RADIO/CHECKBOX OPTIONS:
- Extract options from the document if visible (e.g., gender: Male/Female, status: Active/Inactive)
- For select fields, include all visible options in the "options" array
- For radio fields (typically 2-5 options), include all visible options
- For checkbox fields, include all visible options
- If options are not visible in document, use empty array: "options": []

TABLE HANDLING:
- If you see a table, create a table field with:
  - "_type": "table"
  - "_columns": ["column1", "column2", "column3"] (array of column names)
  - "value": [{"column1": null, "column2": null, "column3": null}] (single row template with null values)

SIGNATURE HANDLING:
- For signature areas, include:
  - "_type": "signature"
  - "bbox": [xmin, ymin, xmax, ymax] (bounding box coordinates if visible)
  - "value": null

EXAMPLE OUTPUT STRUCTURE:
{
    "personal_information": {
        "full_name": {"_type": "text", "value": null},
        "date_of_birth": {"_type": "date", "value": null},
        "gender": {"_type": "select", "options": ["Male", "Female", "Other"], "value": null},
        "email": {"_type": "email", "value": null},
        "phone_number": {"_type": "phone", "value": null},
        "address": {"_type": "textarea", "value": null}
    },
    "job_profile": {
        "position_applying_for": {"_type": "select", "options": ["Manager", "Developer", "Designer"], "value": null},
        "years_of_experience": {"_type": "number", "value": null},
        "current_company": {"_type": "text", "value": null},
        "employment_type": {"_type": "radio", "options": ["Full-time", "Part-time", "Contract"], "value": null},
        "previous_positions": {"_type": "checkbox", "options": ["Position1", "Position2"], "value": []}
    },
    "education_details": {
        "highest_qualification": {"_type": "select", "options": ["High School", "Bachelor", "Master", "PhD"], "value": null},
        "university_name": {"_type": "text", "value": null},
        "graduation_year": {"_type": "number", "value": null},
        "certificates": {"_type": "checkbox", "options": ["Certificate A", "Certificate B"], "value": []}
    },
    "specifications_table": {
        "_type": "table",
        "_columns": ["item", "quantity", "unit_price", "total"],
        "value": [{"item": null, "quantity": null, "unit_price": null, "total": null}]
    },
    "upload_documents": {"_type": "file", "value": null},
    "signatures": [
        {
            "_type": "signature",
            "label": "applicant_signature",
            "bbox": [100, 500, 300, 600],
            "value": null
        }
    ]
}

IMPORTANT RULES:
1. ALWAYS use {"_type": "field_type", "value": null} format for all fields (except tables and signatures which have special formats)
2. Preserve the document's natural organization and section structure
3. Extract field types based on content analysis (not keywords - analyze actual document content)
4. Extract options for select/radio/checkbox fields if visible in document
5. For tables, use {"_type": "table", "_columns": [...], "value": [{...}]} format
6. For signatures, use {"_type": "signature", "bbox": [...], "value": null} format
7. Maintain field order as they appear in the document
8. Use clear, descriptive section and field names
9. For fields where options are not visible, use empty options array: "options": []

Analyze the document and create a comprehensive form structure with appropriate field types and options where visible."""
        
        # Use OpenAI-compatible json_schema format for structured output (faster than json_object)
        # Note: Gemini requires at least one property in schema, so we add a minimal property
        # additionalProperties: True allows any other fields to be added dynamically
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "field_detection_response",
                "strict": False,
                "schema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": True  # Allow dynamic field structure
                }
            }
        }
        return prompt, response_format


    def _get_field_detection_prompt(self) -> Tuple[str, Dict[str, Any]]:
        """Get prompt for field detection task - focus on field structure, not values"""
        prompt = """Analyze this document and identify ALL field structures present on the page.

TASK: Field Structure Detection for Template Creation
- Focus on FIELD STRUCTURE, not field values
- Set all field values to null (we're creating a template, not extracting data)
- Keep the document's NATURAL structure (don't create artificial headings)
- Organize fields hierarchically into sections based on the document's structure

FIELD DETECTION RULES:
1. Identify all form fields, input areas, and data entry points
2. For each field, use null value (not extracting actual data)
3. Organize fields into hierarchical sections based on document structure
4. If document has clear sections/headings, group related fields under those sections
5. If document has no clear sections, use flat structure with individual fields

HIERARCHICAL STRUCTURE:
- Group related fields under section names
- Sections should reflect the document's natural organization
- Nested sections are allowed if the document has sub-sections
- Use clear, descriptive section names based on document headings or context

Example Output JSON structure with hierarchical organization:

If document has clear sections:
{
    "personal_information": {
        "full_name": null,
        "date_of_birth": null,
        "gender": null,
        "nationality": null
    },
    "contact_details": {
        "email": null,
        "phone_number": null,
        "address": null,
        "city": null
    },
    "employment_details": {
        "company_name": null,
        "job_title": null,
        "salary": null,
        "start_date": null
    },
    "invoice_items": [
        {"item": null, "description": null, "quantity": null, "price": null, "total": null}
    ]
}

If document has flat structure (no clear sections):
{
    "invoice_number": null,
    "invoice_date": null,
    "company_name": null,
    "customer_name": null,
    "customer_address": null,
    "customer_email": null,
    "customer_phone": null,
    "subtotal": null,
    "tax_amount": null,
    "total_amount": null,
    "invoice_items": [
        {"item": null, "description": null, "quantity": null, "price": null, "total": null}
    ]
}

IMPORTANT RULES:
1. Preserve the document's natural hierarchical organization
2. Only include fields that are actually present on the page
3. For tables, use array of objects format
4. If document has clear sections/headings, organize fields hierarchically under those sections
5. If document has no clear sections, use flat structure with individual fields at top level
6. Use descriptive section names that match document structure

Analyze the document and return the field structure with hierarchical organization and null values."""
        
        # Use OpenAI-compatible json_schema format for structured output (faster than json_object)
        # Note: Gemini requires at least one property in schema, so we add a minimal property
        # additionalProperties: True allows any other fields to be added dynamically
        response_schema = {
            "type": "object",
            "additionalProperties": True
        }
        
        response_format = {
            "type": "json_object",
            "response_schema": response_schema,
            "enforce_validation": False
        }
        return prompt, response_format

    def _get_template_matching_prompt(self, templates: Optional[List[Dict[str, Any]]], is_database: bool = False) -> Tuple[str, Dict[str, Any]]:
        """Get prompt for template matching (unified for both regular and database templates)"""
        if not templates:
            template_type = "database" if is_database else "regular"
            raise ValueError(f"{template_type}_template_matching requires templates")
        
        # Helper: format fields list regardless of structure (strings or objects)
        def _format_fields(fields: Any) -> str:
            try:
                if not isinstance(fields, list):
                    return ""
                names: List[str] = []
                for item in fields:
                    if isinstance(item, str):
                        names.append(item)
                    elif isinstance(item, dict):
                        label = item.get("label") or item.get("name") or item.get("id")
                        if label is not None:
                            names.append(str(label))
                return ", ".join(names)
            except Exception:
                return ""

        # Format template details based on type
        if is_database:
            template_details = "\n\n".join([
                f"ID: {template.get('id', 'Unknown')}\n"
                f"Name: {template.get('name', 'Unknown')}\n"
                f"Description: {template.get('description', 'No description')}\n"
                f"Fields: {_format_fields(template.get('fields', []))}"
                for template in templates
            ])
            template_type_label = "DATABASE TEMPLATES"
            task_name = "Database Template Matching"
        else:
            template_details = "\n\n".join([
                f"Template: {template.get('name', 'Unknown')}\n"
                f"Description: {template.get('description', 'No description')}\n"
                f"Fields: {_format_fields(template.get('fields', []))}"
                for template in templates
            ])
            template_type_label = "TEMPLATES"
            task_name = "Template Matching"
        
        # Build output format based on type
        if is_database:
            output_format = """{{
  "matched_template_id": "database_template_id",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this template matches"
}}"""
        else:
            output_format = """{{
  "matched_template_id": "template_id",
  "matched_template_name": "template_name", 
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this template matches",
  "alternative_matches": [
    {{
      "template_id": "alternative_id",
      "template_name": "alternative_name",
      "confidence": 0.80
    }}
  ]
}}"""
        
        prompt = f"""You are a document classification expert. Analyze this document and match it to the most appropriate template.

AVAILABLE {template_type_label}:
{template_details}

TASK: {task_name}
Analyze the document structure, content, and layout to determine which template best matches this document.

MATCHING CRITERIA:
1. Document structure and layout
2. Field types and arrangement
3. Content patterns and terminology
4. Overall document purpose and format

OUTPUT FORMAT:
Return a JSON object with your analysis:
{output_format}

CONFIDENCE SCORES:
- 0.9-1.0: Excellent match, very confident
- 0.7-0.9: Good match, confident
- 0.5-0.7: Moderate match, some uncertainty
- 0.3-0.5: Weak match, significant uncertainty
- 0.0-0.3: Poor match, very uncertain

Analyze the document carefully and provide your template matching assessment."""
        
        # Use OpenAI-compatible json_schema format for structured output (faster than json_object)
        # Note: Gemini requires at least one property in schema, so we add a minimal property
        # additionalProperties: True allows any other fields to be added dynamically
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "template_matching_response",
                "strict": False,
                "schema": {
                    "type": "object",
                    "properties": {
                        "matched_template_id": {"type": "string"},
                        "confidence": {"type": "number"},
                        "reasoning": {"type": "string"}
                    },
                    "required": ["matched_template_id", "confidence", "reasoning"],
                    "additionalProperties": False
                }
            }
        }
        return prompt, response_format

    def _get_db_template_matching_prompt(self, db_templates: Optional[List[Dict[str, Any]]]) -> Tuple[str, Dict[str, Any]]:
        """Legacy method - delegates to unified template matching prompt"""
        return self._get_template_matching_prompt(db_templates, is_database=True)

    def _get_without_template_extraction_prompt(self, content_type: str = "image") -> Tuple[str, Dict[str, Any]]:
        """Get prompt for without template extraction
        
        Args:
            content_type: "text" or "image" - determines prompt format
        """
        if content_type == "text":
            # Prompt for text-based extraction (when PyMuPDF extracts text)
            prompt = """Extract ALL data from the text content provided below. The text will appear after "Extracted Text Content:". 

**CRITICAL INSTRUCTIONS:**
1. Read the text content provided below
2. Extract EVERYTHING: text, numbers, dates, names, addresses, tables, lists, headers, footers
3. Organize by natural sections (invoice_header, customer_details, items_table, etc.)
4. If bilingual, keep bilingual
5. DO NOT return only "has_signature" - you MUST extract actual data from the text
6. Include "has_signature": false (text extraction doesn't detect signatures) along with all extracted data

**IMPORTANT - Table of Contents / Index Pages:**
- If this contains a Table of Contents, Index, or similar listing:
  - Extract as an array of objects with "section" and "page" columns
  - REMOVE all dots, dashes, or visual leaders between section names and page numbers
  - Example: "SECTION-I: INFORMATION...............3" → {"section": "SECTION-I: INFORMATION", "page": "3"}

**Table Format (MANDATORY):**
- Rows/columns → array of objects (each object = one row)
- Same keys for all objects
- Use null for empty cells
- Normalize keys: lowercase, underscore
- NEVER include visual formatting like dots (......), dashes (-----), or underscores in values

**Data Types:**
- Tables → array of objects
- Text blocks → strings  
- Form fields → key-value pairs

**Example Output:**
{
  "invoice_header": {"invoice_number": "INV-001", "date": "2024-01-15"},
  "customer_details": {"name": "John Doe", "email": "john@example.com"},
  "items_table": [
    {"description": "Item 1", "quantity": 2, "price": 100},
    {"description": "Item 2", "quantity": 1, "price": 50}
  ],
  "has_signature": false
}

**Example for Table of Contents:**
{
  "table_of_contents": [
    {"section": "SECTION-I: INTRODUCTION", "page": "3"},
    {"section": "SECTION-II: SCOPE OF WORK", "page": "10"}
  ],
  "has_signature": false
}

**REMEMBER:** Extract actual data from the text, not just placeholder fields!"""
        else:
            # Prompt for image-based extraction (scanned PDFs, image documents)
            prompt = """Extract ALL visible data from this document image. Do NOT skip any information. Organize by natural sections. If bilingual, keep bilingual.

**CRITICAL:** Extract text, numbers, dates, names, addresses, tables, lists, headers, footers - EVERYTHING visible on the page.

**IMPORTANT - Table of Contents / Index Pages:**
- If this page contains a Table of Contents, Index, or similar listing with dotted/dashed leaders connecting text to page numbers:
  - Extract as an array of objects with "section" and "page" columns
  - REMOVE all dots, dashes, or leaders between section names and page numbers
  - Example: "SECTION-I: INFORMATION TO BIDDER...............3" should become {"section": "SECTION-I: INFORMATION TO BIDDER", "page": "3"}

**Table Format (MANDATORY):**
- Rows/columns data → array of objects (each object = one row)
- Same keys for all objects (column names)
- Use null for empty cells
- Normalize keys: lowercase, underscore
- NEVER include visual formatting like dots (......), dashes (-----), or underscores (_____) in extracted values

**Data Types:**
- Tables → array of objects
- Text blocks → strings
- Form fields → key-value pairs

**Example for Table of Contents:**
{
  "table_of_contents": [
    {"section": "SECTION-I: INTRODUCTION", "page": "3"},
    {"section": "SECTION-II: SCOPE OF WORK", "page": "10"},
    {"section": "SECTION-III: REQUIREMENTS", "page": "15"}
  ],
  "has_signature": false,
  "has_photo_id": false
}

**Example for Regular Data:**
{
  "section_name": {"field1": "value1", "field2": "value2"},
  "table_data": [
    {"col1": "val1", "col2": "val2"},
    {"col1": "val3", "col2": null}
  ],
  "has_signature": true,
  "has_photo_id": true
}

**REQUIREMENTS:**
- Extract ALL visible data (text, numbers, dates, names, addresses, tables, etc.)
- CLEAN all visual formatting (dots, dashes, underscores used as separators/leaders)
- Do NOT return empty response or only has_signature
- Include "has_signature": true/false to indicate if image contains handwritten signature
- Include "has_photo_id": true/false to indicate if image contains a photo ID or face that should be extracted"""
        
        # Use OpenAI-compatible json_schema format for structured output
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "without_template_extraction_response",
                "strict": False,
                "schema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": True
                }
            }
        }
        return prompt, response_format

    def _get_bank_statement_extraction_prompt(
        self,
        content_type: str = "image",
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """Get specialized prompt for bank statement extraction
        
        Handles multi-page tables by carrying forward headers from first page.
        
        Args:
            content_type: "text" or "image"
            context: Dict containing:
                - table_headers: List of column headers from first page (for continuation pages)
                - is_first_page: Whether this is the first page
                - page_number: Current page number
        """
        is_first_page = context.get("is_first_page", True) if context else True
        table_headers = context.get("table_headers", []) if context else []
        page_number = context.get("page_number", 1) if context else 1
        
        if is_first_page:
            # First page - extract everything including headers
            prompt = """You are extracting data from a BANK STATEMENT. This is page 1 (first page).

**CRITICAL TASK: BANK STATEMENT EXTRACTION - USE EXACT FIELD NAMES FROM PDF**

**1. ACCOUNT HEADER INFORMATION (extract ALL visible fields at top):**
Extract EVERY field visible in the header section. Use the EXACT field names/labels from the PDF.
Common fields include (but extract whatever is shown):
- Customer ID / Cust ID
- Account No / Account Number  
- Account Holder Name
- Account Type
- Account Status
- A/C Open Date
- Branch / Branch Code
- IFSC / RTGS/NEFT IFSC
- MICR
- Nomination status
- Joint Holders
- Address
- Statement Period (From/To dates)

**2. TRANSACTION TABLE - USE EXACT COLUMN NAMES:**
Extract the table headers EXACTLY as they appear in the PDF, then extract all rows.

For example, if PDF shows columns: "Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance"
Then use those EXACT names in your output:
```json
{
  "_table_headers": ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"],
  "transactions": [
    {"Date": "01/11/25", "Narration": "UPI-INDERDEEP...", "Chq./Ref.No.": "0002803...", "Value Dt": "01/11/25", "Withdrawal Amt.": 4000.00, "Deposit Amt.": null, "Closing Balance": 96086.34}
  ]
}
```

**EXAMPLE OUTPUT STRUCTURE:**
```json
{
  "document_type": "bank_statement",
  "page_number": 1,
  "is_first_page": true,
  
  "account_info": {
    "Cust ID": "299462914",
    "Account No": "50100682379616 OTHER",
    "A/C Open Date": "02/11/2024",
    "Account Status": "Regular",
    "RTGS/NEFT IFSC": "HDFC0002030",
    "MICR": "125240302",
    "Branch Code": "2030",
    "Account Type": "SAVINGS A/C - RESIDENT(100)",
    "Nomination": "Registered",
    "Address": "SIRSA 125104, HARYANA INDIA"
  },
  
  "statement_period": {
    "From": "01/11/2025",
    "To": "26/11/2025"
  },
  
  "_table_headers": ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"],
  
  "transactions": [
    {"Date": "01/11/25", "Narration": "UPI-INDERDEEP KOUR-PRABHPREETKOUR@OKAXIS-UBIN0564044-280368033055-UPI", "Chq./Ref.No.": "0002803680033055", "Value Dt": "01/11/25", "Withdrawal Amt.": 4000.00, "Deposit Amt.": null, "Closing Balance": 96086.34}
  ],
  
  "has_signature": false,
  "has_photo_id": false
}
```

**CRITICAL RULES:**
1. Use EXACT column names from PDF (not standardized names)
2. Extract ALL account header fields visible on page
3. Extract EVERY transaction row - skip nothing
4. Keep amounts as numbers
5. Use null for empty cells
6. Keep full narration text - don't truncate
7. Preserve exact date formats as shown
8. Include "_table_headers" field with the column names array
9. Include "has_signature": true/false
10. Include "has_photo_id": true/false to indicate if image contains a photo ID or face that should be extracted"""
        else:
            # Continuation page - use provided headers
            headers_str = ", ".join(f'"{h}"' for h in table_headers) if table_headers else '"Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"'
            num_headers = len(table_headers) if table_headers else 7
            
            # Create a dynamic example row with all columns
            example_row = {}
            for header in (table_headers if table_headers else ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]):
                if "date" in header.lower() or "dt" in header.lower():
                    example_row[header] = "02/11/25"
                elif "narration" in header.lower() or "description" in header.lower() or "particular" in header.lower():
                    example_row[header] = "UPI-PAYMENT-SAMPLE-TRANSACTION"
                elif "ref" in header.lower() or "chq" in header.lower() or "cheque" in header.lower():
                    example_row[header] = "00012345678901"
                elif "withdrawal" in header.lower() or "debit" in header.lower():
                    example_row[header] = 500.00
                elif "deposit" in header.lower() or "credit" in header.lower():
                    example_row[header] = None  # null to show empty cell handling
                elif "balance" in header.lower():
                    example_row[header] = 95586.34
                else:
                    example_row[header] = "value"
            
            example_row_str = json.dumps(example_row, indent=4)
            
            prompt = f"""You are extracting data from a BANK STATEMENT. This is page {page_number} (continuation page).

**CRITICAL: EXTRACT 100% OF ALL DATA ON THIS PAGE - NOTHING SHOULD BE MISSED**

**TRANSACTION TABLE - USE THESE EXACT {num_headers} COLUMNS:**
The table headers from page 1 are: [{headers_str}]

You MUST use these exact column names for every transaction row. Each row must have ALL {num_headers} columns.
Use null for empty cells, but INCLUDE every column.

**EXAMPLE TRANSACTION ROW FORMAT:**
```json
{example_row_str}
```

**EXTRACT EVERYTHING ELSE VISIBLE ON THIS PAGE:**
In addition to transactions, extract ALL other content visible on this page:
- Page number / Page header text
- Any repeated bank name/logo text
- Statement date range if shown
- Running totals or subtotals
- Summary sections (total debits, total credits, etc.)
- Interest credits/charges
- Service charges or fees
- Tax deductions (TDS, etc.)
- Notes, remarks, or messages
- Footer text or disclaimers
- Any other text, numbers, or data visible

**OUTPUT FORMAT:**
```json
{{
  "document_type": "bank_statement",
  "page_number": {page_number},
  "is_continuation": true,
  
  "transactions": [
    {example_row_str}
  ],
  
  "page_summary": {{
    "total_withdrawals": null,
    "total_deposits": null,
    "closing_balance": null
  }},
  
  "other_content": {{
    "notes": null,
    "footer_text": null
  }},
  
  "has_signature": false
}}
```

**CRITICAL RULES:**
1. Use the EXACT column names provided: [{headers_str}]
2. Extract EVERY transaction row - skip nothing
3. Keep amounts as numbers (no currency symbols)
4. Use null for empty cells
5. Keep full narration text - don't truncate
6. If there are summary totals at the bottom, extract them separately
7. Include "has_signature": true/false
8. Include "has_photo_id": true/false to indicate if image contains a photo ID or face that should be extracted
9. Extract ALL other visible content on this page - nothing should be missed"""
        
        # Use OpenAI-compatible json_schema format for structured output
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "bank_statement_extraction_response",
                "strict": False,
                "schema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": True
                }
            }
        }
        
        logger.info(f"📊 Bank statement prompt generated - is_first_page: {is_first_page}, page: {page_number}, headers: {table_headers if table_headers else 'auto-detect'}")
        return prompt, response_format
