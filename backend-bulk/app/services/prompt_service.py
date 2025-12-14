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
            document_type: Optional document type hint ('bank_statement', 'identity_document', etc.)
            context: Optional context data (e.g., table headers from previous pages)
        """
        
        if task == "field_detection":
            return self._get_field_detection_prompt()
        elif task == "template_matching":
            return self._get_template_matching_prompt(templates)
        elif task == "db_template_matching":
            return self._get_db_template_matching_prompt(db_templates)
        elif task == "without_template_extraction":
            # For bank statements, use specialized extraction
            if document_type == "bank_statement":
                return self._get_bank_statement_extraction_prompt(content_type, context)
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
        """Get prompt for without template extraction - 100% GRANULAR extraction
        
        Args:
            content_type: "text" or "image" - determines prompt format
        """
        if content_type == "text":
            # Prompt for text-based extraction (when PyMuPDF extracts text)
            prompt = """Extract 100% of ALL data from the text content provided below. The text will appear after "Extracted Text Content:". 

**CRITICAL - EXTRACT EVERYTHING:**
1. EVERY word, number, symbol, punctuation mark (including periods, commas, colons)
2. ALL text: headers, footers, titles, subtitles, captions, labels
3. ALL numbers: amounts, dates, IDs, codes, quantities, percentages
4. ALL tables: every single cell, every row, every column
5. ALL lists: bullet points, numbered items
6. ALL names, addresses, emails, phone numbers
7. ALL metadata: document numbers, reference codes, timestamps
8. Empty fields should be null, but still include them
9. Include whitespace-only or single-character fields

**LANGUAGE RULE - CRITICAL:**
- Use field names in the SAME LANGUAGE as the document
- English document → English field names (e.g., "name", "date_of_birth", "address")
- Hindi document → English field names with Hindi context
- Indonesian document → Indonesian field names (e.g., "nama", "tanggal_lahir", "alamat")
- DO NOT translate field names to a different language

**NOTHING SHOULD BE SKIPPED - NOT EVEN A FULL STOP**

**Table Format (MANDATORY):**
- Rows/columns → array of objects (each object = one row)
- Same keys for all objects
- Use null for empty cells (don't skip them!)
- Normalize keys: lowercase, underscore

**Data Types:**
- Tables → array of objects
- Text blocks → strings  
- Form fields → key-value pairs
- Single values → include them as-is

**Example Output:**
{
  "invoice_header": {"invoice_number": "INV-001", "date": "2024-01-15", "period_mark": "."},
  "customer_details": {"name": "John Doe", "email": "john@example.com", "suffix": ","},
  "items_table": [
    {"description": "Item 1", "quantity": 2, "price": 100, "total": 200},
    {"description": "Item 2", "quantity": 1, "price": 50, "total": 50}
  ],
  "totals": {"subtotal": 250, "tax": 25, "grand_total": 275},
  "footer_text": "Thank you for your business.",
  "has_signature": false
}

**REMEMBER:** Extract 100% of data - every character, every number, every symbol!

**JSON FORMAT RULES (CRITICAL):**
- ALL property names MUST be in double quotes: "name" not name
- NO newlines or line breaks inside property names or string values
- NO trailing commas before ] or }
- Use space instead of newline for multi-line text: "Wallet Share" not "Wallet\\nShare"
- Return ONLY valid JSON - no markdown code blocks"""
        else:
            # Prompt for image-based extraction (scanned PDFs, image documents)
            prompt = """You are extracting data from a document image. Extract 100% of ALL visible content with PERFECT accuracy.

**STEP 1: DETECT DOCUMENT TYPE**
First, identify the document type:
- **Identity Documents**: Aadhaar Card, PAN Card, Passport, Driving License, Voter ID
- **Financial Documents**: Bank Statement, Invoice, Receipt, Tax Returns
- **Business Documents**: Memorandum, Agreement, Contract, Letter
- **Other**: Forms, Certificates, Reports

**LANGUAGE RULE - CRITICAL:**
- Use field names in the SAME LANGUAGE as the document
- English document → English field names (name, date_of_birth, address)
- Hindi/Indian document → English field names (standard for Indian docs)
- Indonesian document → Indonesian field names (nama, tanggal, alamat)
- Mixed language → Use the PRIMARY language of field labels

**IDENTITY DOCUMENT EXTRACTION (Aadhaar, PAN, Passport, DL):**

For **Aadhaar Card**:
```json
{
  "document_type": "aadhaar_card",
  "aadhaar_number": "1234 5678 9012",
  "name": "JOHN DOE",
  "date_of_birth": "01/01/1990",
  "gender": "Male",
  "address": "123 Main Street, City, State - 123456",
  "issue_date": null,
  "qr_code_present": true
}
```

For **PAN Card**:
```json
{
  "document_type": "pan_card",
  "pan_number": "ABCDE1234F",
  "name": "JOHN DOE",
  "father_name": "FATHER NAME",
  "date_of_birth": "01/01/1990",
  "signature_present": true
}
```

For **Passport**:
```json
{
  "document_type": "passport",
  "passport_number": "A1234567",
  "surname": "DOE",
  "given_names": "JOHN",
  "nationality": "INDIAN",
  "date_of_birth": "01/01/1990",
  "sex": "M",
  "place_of_birth": "CITY",
  "date_of_issue": "01/01/2020",
  "date_of_expiry": "31/12/2030",
  "place_of_issue": "CITY",
  "mrz_line_1": "P<INDDOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<",
  "mrz_line_2": "A12345678IND9001011M3012315<<<<<<<<<<<<<<0"
}
```

For **Driving License**:
```json
{
  "document_type": "driving_license",
  "license_number": "DL-1234567890",
  "name": "JOHN DOE",
  "son_daughter_wife_of": "FATHER NAME",
  "date_of_birth": "01/01/1990",
  "blood_group": "O+",
  "address": "123 Main Street, City",
  "date_of_issue": "01/01/2020",
  "validity_non_transport": "01/01/2040",
  "validity_transport": null,
  "vehicle_class": ["LMV", "MCWG"],
  "photo_present": true
}
```

For **Bank Statement**:
```json
{
  "document_type": "bank_statement",
  "bank_name": "HDFC Bank",
  "account_number": "1234567890",
  "account_holder": "JOHN DOE",
  "account_type": "Savings",
  "branch": "Main Branch",
  "ifsc_code": "HDFC0001234",
  "statement_period": {"from": "01/01/2024", "to": "31/01/2024"},
  "opening_balance": 10000.00,
  "closing_balance": 15000.00,
  "transactions": [
    {"date": "02/01/2024", "description": "NEFT Credit", "debit": null, "credit": 5000.00, "balance": 15000.00},
    {"date": "05/01/2024", "description": "ATM Withdrawal", "debit": 2000.00, "credit": null, "balance": 13000.00}
  ]
}
```

**GENERAL DOCUMENT EXTRACTION:**

1. **DOCUMENT HEADER/METADATA:**
   - Logo text, document type, reference numbers
   - Use field names matching document language

2. **BODY TEXT - EVERY PARAGRAPH:**
   - Extract ALL text exactly as written
   - Keep original language
   - Include bullet points, numbered items

3. **TABLES - EVERY CELL:**
   - Extract as array of objects (one object per row)
   - Include ALL columns, ALL rows
   - Use exact column names from header (in document's language)
   - Empty cells = null

4. **SIGNATURE/APPROVAL SECTIONS:**
   - Extract all signatory fields
   - Include names, titles, checkmarks, initials

5. **AMOUNTS & NUMBERS:**
   - Keep exact format as shown in document
   - Preserve date formats exactly

**CRITICAL REQUIREMENTS:**
- Extract 100% of visible text - NOTHING SKIPPED
- Field names MUST be in document's language
- Keep exact number/date formats
- Include ALL table rows including totals
- Empty/unclear fields = null (don't omit them)
- Always include "document_type" field at top level

**JSON FORMAT RULES (CRITICAL):**
- ALL property names MUST be in double quotes: "name" not name
- NO newlines or line breaks inside property names or string values
- NO trailing commas before ] or }
- Use space instead of newline for multi-line text in values
- If a table header has multiple lines, join them with space: "Wallet Share" not "Wallet\\nShare"
- Return ONLY valid JSON - no markdown code blocks, no explanations"""
        
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
  ]
}
```

**CRITICAL RULES:**
1. Use EXACT column names from PDF (not standardized names)
2. Extract ALL account header fields visible on page
3. Extract EVERY transaction row - skip nothing
4. Keep amounts as numbers
5. Use null for empty cells
6. Keep full narration text - don't truncate
7. Preserve exact date formats as shown"""
        else:
            # Continuation page - use provided headers
            headers_str = ", ".join(f'"{h}"' for h in table_headers) if table_headers else '"Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"'
            num_headers = len(table_headers) if table_headers else 7
            
            # Create a dynamic example row with all columns
            example_row = {}
            for header in (table_headers if table_headers else ["Date", "Narration", "Chq./Ref.No.", "Value Dt", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]):
                if "date" in header.lower() or "dt" in header.lower():
                    example_row[header] = "02/11/25"
                elif "narration" in header.lower() or "description" in header.lower():
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

**TRANSACTION TABLE - USE ALL {num_headers} COLUMNS:**
The table headers from page 1 are: [{headers_str}]
- Extract ALL transaction rows with ALL {num_headers} columns
- Use null for empty cells, but INCLUDE every column

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

**OUTPUT FORMAT - INCLUDE EVERYTHING:**
```json
{{
  "document_type": "bank_statement",
  "page_number": {page_number},
  "is_continuation": true,
  
  "page_header": {{
    "bank_name": "HDFC BANK",
    "page_text": "Page No.: {page_number}"
  }},
  
  "transactions": [
    {example_row_str},
    ...all transaction rows with ALL {num_headers} columns...
  ],
  
  "page_summary": {{
    "total_withdrawals": null,
    "total_deposits": null,
    "closing_balance": null
  }},
  
  "charges_and_interest": [
    {{"description": "MONTHLY INTEREST CREDIT", "amount": 396.00, "date": "02/11/25"}},
    {{"description": "SERVICE CHARGE", "amount": -100.00, "date": "02/11/25"}}
  ],
  
  "footer_text": "Any footer text or disclaimers shown",
  
  "other_content": {{
    "any_other_visible_text": "value",
    "any_other_numbers": 12345
  }}
}}
```

**CRITICAL RULES - 100% EXTRACTION:**
1. **TRANSACTIONS**: Every row MUST have ALL {num_headers} columns: [{headers_str}]
2. **ALL TEXT**: Extract every piece of text visible on the page
3. **ALL NUMBERS**: Extract every number, amount, date, reference
4. **SUMMARIES**: If there are totals, subtotals, or summaries - extract them
5. **CHARGES**: Interest, fees, TDS - extract separately if shown
6. **FOOTER**: Any text at bottom of page
7. **NOTHING SKIPPED**: If you can see it on the page, it must be in the output

**AMOUNTS**: Keep as numbers (4000.00 not "4000.00")
**EMPTY CELLS**: Use null (not missing keys)
**FULL TEXT**: Don't truncate narrations or descriptions"""

        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": "bank_statement_extraction_response",
                "strict": False,
                "schema": {
                    "type": "object",
                    "properties": {
                        "document_type": {"type": "string"},
                        "page_number": {"type": "integer"},
                        "is_first_page": {"type": "boolean"},
                        "transactions": {
                            "type": "array",
                            "items": {"type": "object"}
                        },
                        "_table_headers": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "additionalProperties": True
                }
            }
        }
        return prompt, response_format
