"""
AI Mapping Service - Use Gemini to suggest field mappings

IMPROVED FOR BNI POC:
- Multi-level fuzzy matching for field names
- Better handling of Indonesian field names
- Smart aggregation of array/table fields
- Field name normalization across documents
"""

import logging
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from difflib import SequenceMatcher

from app.models.database import BulkExtractedField, BulkJobDocument, MappingTemplate
from app.models.mapping_schemas import (
    MappingSuggestion, 
    AvailableField, 
    SuggestMappingResponse
)
from app.core.config import settings

logger = logging.getLogger(__name__)

# ============== FIELD NAME MAPPING UTILITIES ==============

# Indonesian to English field name mappings for better AI matching
INDONESIAN_FIELD_MAPPINGS = {
    # Company Info
    "nama debitur": ["fullname", "customer_name", "debtor_name", "company_name"],
    "nama perusahaan": ["fullname", "company_name"],
    "cif": ["customerid", "customer_id", "cif_number"],
    "alamat": ["address", "current_address"],
    "kantor pusat": ["head_office", "hq_address", "address"],
    "sektor ekonomi": ["industry", "sector", "industry_code"],
    "sub sektor": ["sub_sector", "industry_desc"],
    "key person": ["key_person", "contact_person", "pic"],
    "jenis badan usaha": ["legal_form", "entity_type", "company_type"],
    "tahun berdiri": ["year_established", "founding_year"],
    "jumlah pegawai": ["employee_count", "total_employees", "staff_count"],
    "pendapatan tahunan": ["annual_revenue", "total_sales", "revenue"],
    "group usaha": ["business_group", "parent_company", "group_name"],
    
    # Facility Info
    "jenis fasilitas": ["facility_type", "product_type", "loan_type"],
    "plafond": ["limit", "credit_limit", "facility_limit", "approved_limit"],
    "outstanding": ["outstanding", "balance", "current_balance"],
    "jangka waktu": ["tenor", "duration", "term"],
    "tanggal efektif": ["effective_date", "start_date"],
    "tanggal jatuh tempo": ["maturity_date", "due_date", "expiry_date"],
    "suku bunga": ["interest_rate", "rate"],
    "tujuan kredit": ["purpose", "credit_purpose", "loan_purpose"],
    "mata uang": ["currency", "currency_iso"],
    
    # Legal Info
    "akta pendirian": ["deed_of_establishment", "founding_deed"],
    "npwp": ["tax_id", "npwp", "tax_number"],
    "nib": ["business_id", "nib", "registration_number"],
    "siup": ["trade_license", "siup"],
    
    # Collateral
    "agunan": ["collateral", "security", "guarantee"],
    "nilai agunan": ["collateral_value", "security_value"],
    "jenis agunan": ["collateral_type", "security_type"],
}

def normalize_field_name(name: str) -> str:
    """
    Normalize field name for fuzzy matching.
    Handles different naming conventions across documents.
    """
    if not name:
        return ""
    # Remove numeric prefixes like 1_1_, 1_2_, 10_1_, etc.
    normalized = re.sub(r'^\d+_\d+_', '', name)
    # Remove array indices like [0], [1], etc.
    normalized = re.sub(r'\[\d+\]', '', normalized)
    # Replace underscores, dots with spaces
    normalized = re.sub(r'[_\.\-/]', ' ', normalized)
    # Remove extra whitespace and special chars
    normalized = re.sub(r'\s+', ' ', normalized)
    # Lowercase and strip
    normalized = normalized.lower().strip()
    return normalized

def extract_key_part(name: str) -> str:
    """Extract the most significant part of the field name (usually after last dot)"""
    if not name:
        return ""
    # Get part after last dot or slash
    parts = re.split(r'[\./]', name)
    key = parts[-1] if parts else name
    # Clean it - remove array indices and special chars
    key = re.sub(r'\[\d+\]', '', key)
    key = re.sub(r'[_\-]', ' ', key)
    return ' '.join(key.lower().split())

def get_keywords(name: str) -> set:
    """Extract meaningful keywords from field name"""
    if not name:
        return set()
    # Normalize
    clean = re.sub(r'[\[\]\d_\.\-/]', ' ', name.lower())
    words = set(clean.split())
    # Remove common filler words
    fillers = {'table', 'data', 'field', 'value', 'text', 'info', 'section', 'content', 'details', 'item', 'row'}
    return words - fillers

def get_indonesian_equivalents(name: str) -> List[str]:
    """Get English equivalents for Indonesian field names"""
    name_lower = normalize_field_name(name)
    equivalents = []
    
    for indo_term, english_terms in INDONESIAN_FIELD_MAPPINGS.items():
        if indo_term in name_lower:
            equivalents.extend(english_terms)
    
    return equivalents


class MappingService:
    """Service for AI-powered field mapping suggestions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_available_fields(self, job_id: str) -> List[AvailableField]:
        """
        Get all unique fields from a job's extracted data
        
        Returns list of fields with sample values
        """
        job_uuid = UUID(job_id)
        
        # Query unique field names with sample values
        query = select(
            BulkExtractedField.field_name,
            BulkExtractedField.field_label,
            BulkExtractedField.field_type,
            BulkExtractedField.field_group,
            BulkExtractedField.field_value,
            func.count(BulkExtractedField.id).label('occurrence_count')
        ).where(
            BulkExtractedField.job_id == job_uuid
        ).group_by(
            BulkExtractedField.field_name,
            BulkExtractedField.field_label,
            BulkExtractedField.field_type,
            BulkExtractedField.field_group,
            BulkExtractedField.field_value
        ).order_by(
            BulkExtractedField.field_name
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Deduplicate by field_name, keeping first sample value
        fields_map: Dict[str, AvailableField] = {}
        
        for row in rows:
            field_name = row.field_name
            if field_name not in fields_map:
                # Keep longer sample value for better AI understanding
                sample = row.field_value
                if sample and len(sample) > 300:
                    sample = sample[:300] + "..."
                
                fields_map[field_name] = AvailableField(
                    field_name=field_name,
                    field_label=row.field_label,
                    field_type=row.field_type or "text",
                    field_group=row.field_group,
                    sample_value=sample,
                    occurrence_count=row.occurrence_count
                )
            else:
                # Add to occurrence count
                fields_map[field_name].occurrence_count += row.occurrence_count
        
        logger.info(f"📊 Found {len(fields_map)} unique fields for job {job_id}")
        
        return list(fields_map.values())
    
    async def suggest_mappings(
        self,
        job_id: str,
        excel_columns: List[str],
        template_id: Optional[str] = None
    ) -> SuggestMappingResponse:
        """
        Use AI to suggest mappings between Excel columns and extracted fields.
        OPTIMIZED: Batches large column lists to reduce token usage.
        """
        # Check for existing template first
        if template_id:
            template = await self._get_template(template_id)
            if template:
                return await self._apply_template(template, excel_columns, job_id)
        
        # Get available fields
        available_fields = await self.get_available_fields(job_id)
        
        if not available_fields:
            logger.warning(f"No fields found for job {job_id}")
            return SuggestMappingResponse(
                mappings=[MappingSuggestion(excel_column=col, confidence=0) for col in excel_columns],
                available_fields=[],
                existing_template=None
            )
        
        # Try to find matching existing template
        existing_template = await self._find_matching_template(excel_columns)
        
        # BATCH PROCESSING for large column counts
        # OPTIMIZED: Larger batch size (100) and filtered fields for faster processing
        BATCH_SIZE = 100  # Increased from 50 for fewer AI calls
        all_mappings = []
        
        # Filter available fields to most relevant ones to reduce AI processing time
        filtered_fields = self._get_priority_fields(available_fields)
        logger.info(f"🎯 Filtered {len(available_fields)} fields down to {len(filtered_fields)} priority fields")
        
        if len(excel_columns) > BATCH_SIZE:
            num_batches = (len(excel_columns) + BATCH_SIZE - 1) // BATCH_SIZE
            logger.info(f"📦 Batching {len(excel_columns)} columns into {num_batches} batches of {BATCH_SIZE}")
            
            for i in range(0, len(excel_columns), BATCH_SIZE):
                batch = excel_columns[i:i + BATCH_SIZE]
                batch_num = i // BATCH_SIZE + 1
                logger.info(f"  🔄 Processing batch {batch_num}/{num_batches}: columns {i + 1}-{min(i + BATCH_SIZE, len(excel_columns))}")
                
                batch_mappings = await self._ai_suggest_mappings(batch, filtered_fields, None)
                all_mappings.extend(batch_mappings)
        else:
            # Even for small column counts, use filtered fields for speed
            all_mappings = await self._ai_suggest_mappings(excel_columns, filtered_fields, None)
        
        return SuggestMappingResponse(
            mappings=all_mappings,
            available_fields=available_fields,
            existing_template=str(existing_template.id) if existing_template else None
        )
    
    async def _get_full_documents_data(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get FULL extracted data from ALL documents in the job.
        This gives the AI complete context to understand the document structure.
        """
        job_uuid = UUID(job_id)
        
        # Get all completed documents
        doc_query = select(BulkJobDocument).where(
            BulkJobDocument.job_id == job_uuid,
            BulkJobDocument.status == "completed"
        ).limit(5)  # Limit to 5 docs to avoid token overflow
        
        doc_result = await self.db.execute(doc_query)
        documents = doc_result.scalars().all()
        
        all_docs_data = []
        
        for doc in documents:
            # Get all fields for this document
            fields_query = select(BulkExtractedField).where(
                BulkExtractedField.document_id == doc.id
            ).order_by(BulkExtractedField.field_group, BulkExtractedField.field_name)
            
            fields_result = await self.db.execute(fields_query)
            fields = fields_result.scalars().all()
            
            # Organize by group - prioritize non-table fields
            doc_data = {
                "document_name": doc.filename,
                "groups": {}
            }
            
            for field in fields:
                # Skip empty values - they don't help AI understand
                if not field.field_value or field.field_value.strip() == "":
                    continue
                
                group = field.field_group or "ungrouped"
                if group not in doc_data["groups"]:
                    doc_data["groups"][group] = []
                
                # Include full value (truncate very long ones)
                value = field.field_value.strip()
                if len(value) > 300:
                    value = value[:300] + "..."
                
                doc_data["groups"][group].append({
                    "field_name": field.field_name,
                    "value": value
                })
            
            all_docs_data.append(doc_data)
        
        logger.info(f"📄 Fetched full data from {len(all_docs_data)} documents for AI mapping")
        return all_docs_data
    
    def _get_priority_fields(self, available_fields: List[AvailableField]) -> List[AvailableField]:
        """
        Get priority fields for mapping - fields that are most likely to be useful.
        OPTIMIZED: Aggressive filtering to reduce AI processing time.
        Prioritize: non-table fields, fields with values, commonly used field patterns
        """
        priority_fields = []
        array_fields = []
        table_fields = []
        
        # Keywords that indicate high-priority fields for banking/credit documents
        priority_keywords = [
            'nama', 'name', 'alamat', 'address', 'cif', 'customer', 'debitur', 'debtor',
            'fasilitas', 'facility', 'limit', 'plafond', 'jenis', 'type', 'tenor',
            'bunga', 'interest', 'rate', 'agunan', 'collateral', 'jaminan', 'security',
            'pemegang', 'shareholder', 'saham', 'share', 'company', 'perusahaan',
            'npwp', 'ktp', 'telepon', 'phone', 'email', 'tanggal', 'date', 'tujuan', 'purpose'
        ]
        
        for f in available_fields:
            # Skip fields without values
            if not f.sample_value or f.sample_value.strip() == "":
                continue
            
            field_lower = f.field_name.lower()
            
            # Separate by type
            if f.field_name.startswith("tables["):
                table_fields.append(f)
            elif "[" in f.field_name:
                # Array field - check if high priority
                is_priority = any(kw in field_lower for kw in priority_keywords)
                if is_priority:
                    array_fields.insert(0, f)  # High priority array at front
                else:
                    array_fields.append(f)
            else:
                # Non-array field - check priority
                is_priority = any(kw in field_lower for kw in priority_keywords)
                if is_priority:
                    priority_fields.insert(0, f)  # High priority at front
                else:
                    priority_fields.append(f)
        
        # Return: High priority fields first, then arrays (for shareholders/facilities), then tables
        # LIMIT: 300 priority + 150 array + 50 table = 500 max (reduced from 700)
        result = priority_fields[:300] + array_fields[:150] + table_fields[:50]
        logger.info(f"🎯 Priority fields: {len(priority_fields[:300])} base + {len(array_fields[:150])} arrays + {len(table_fields[:50])} tables = {len(result)} total")
        return result
    
    async def _ai_suggest_mappings(
        self,
        excel_columns: List[str],
        available_fields: List[AvailableField],
        full_documents_data: List[Dict[str, Any]] = None
    ) -> List[MappingSuggestion]:
        """
        Use LiteLLM to suggest field mappings.
        IMPROVED: Better prompt with context about field naming patterns.
        """
        try:
            import httpx
            
            # Build compact field list - OPTIMIZED for speed
            # Just list field names without samples (samples already filtered to priority fields)
            field_groups = {}
            for f in available_fields:
                # Extract group from field name (part before first dot or bracket)
                import re
                match = re.match(r'^([a-zA-Z0-9_]+)', f.field_name)
                group = match.group(1) if match else "other"
                
                if group not in field_groups:
                    field_groups[group] = []
                
                # OPTIMIZED: Shorter sample, only 30 chars
                sample = ""
                if f.sample_value:
                    sample = f.sample_value[:30].replace("\n", " ").replace("\r", "").strip()
                
                field_groups[group].append(f"{f.field_name}={sample}" if sample else f.field_name)
            
            # Build organized field list - LIMIT to 50 per group
            field_lines = []
            for group, fields in sorted(field_groups.items()):
                field_lines.append(f"[{group}]")
                field_lines.extend(fields[:50])  # Reduced from 100 to 50 per group
            
            fields_data = "\n".join(field_lines)
            
            logger.info(f"🔍 Sending {len(available_fields)} fields in {len(field_groups)} groups to AI")
            
            # OPTIMIZED: Compact prompt for faster processing
            prompt = f"""Map Excel columns to document fields. Banking credit proposals (Indonesian).
Ignore field prefixes (1_1_, 1_2_). Array fields [0],[1] = multiple entries.

EXCEL COLUMNS ({len(excel_columns)}):
{json.dumps(excel_columns)}

AVAILABLE FIELDS:
{fields_data}

RULES:
- suggested_field = EXACT field name from above OR null
- Match semantically (Nama=Name, Alamat=Address, Fasilitas=Facility, Plafond=Limit)
- confidence: 0.95=exact, 0.8=strong, 0.6=partial, 0=none

OUTPUT JSON only:
[{{"excel_column":"Col","suggested_field":"field_or_null","confidence":0.8}}]"""

            # Determine which API to use
            import os
            provider = os.getenv("LLM_PROVIDER", "gemini").lower()
            gemini_api_key = os.getenv("GEMINI_API_KEY", "")
            model_name = os.getenv("EXTRACTION_MODEL", "gemini-2.0-flash")
            
            logger.info(f"🤖 Calling AI ({provider}) model {model_name} for {len(excel_columns)} columns...")
            
            async with httpx.AsyncClient(timeout=180.0) as client:
                if provider == "gemini" and gemini_api_key:
                    # Direct Gemini API call
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
                    
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "maxOutputTokens": 8192,
                            "responseMimeType": "application/json"
                        }
                    }
                    
                    response = await client.post(url, json=payload)
                    
                    if response.status_code != 200:
                        logger.error(f"❌ Gemini API error {response.status_code}: {response.text}")
                    
                    response.raise_for_status()
                    gemini_result = response.json()
                    
                    # Extract response text
                    response_text = ""
                    if "candidates" in gemini_result and gemini_result["candidates"]:
                        candidate = gemini_result["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            response_text = candidate["content"]["parts"][0].get("text", "")
                else:
                    # LiteLLM proxy call
                    base_url = settings.LITELLM_API_URL.rstrip('/')
                    if base_url.endswith('/chat/completions'):
                        base_url = base_url[:-len('/chat/completions')]
                    if base_url.endswith('/v1'):
                        base_url = base_url[:-3]
                    
                    response = await client.post(
                        f"{base_url}/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.LITELLM_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_name,
                            "messages": [{"role": "user", "content": prompt}],
                            "temperature": 0.1,
                            "max_tokens": 8000
                        }
                    )
                    
                    if response.status_code != 200:
                        logger.error(f"❌ LiteLLM API error {response.status_code}: {response.text}")
                    
                    response.raise_for_status()
                    result = response.json()
                    response_text = result["choices"][0]["message"]["content"].strip()
            
            logger.info(f"✅ AI response received, parsing mappings...")
            
            # Parse JSON from response
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            
            # Clean any trailing content after JSON
            try:
                ai_mappings = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON array
                import re
                json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
                if json_match:
                    ai_mappings = json.loads(json_match.group())
                else:
                    raise
            
            # Convert to MappingSuggestion objects
            mappings = []
            field_names = {f.field_name for f in available_fields}
            field_samples = {f.field_name: f.sample_value for f in available_fields}
            
            for ai_map in ai_mappings:
                excel_col = ai_map.get("excel_column", "")
                suggested = ai_map.get("suggested_field")
                confidence = ai_map.get("confidence", 0)
                
                # Validate suggested field exists
                if suggested and suggested not in field_names:
                    # Try case-insensitive match
                    field_names_lower = {f.lower(): f for f in field_names}
                    if suggested.lower() in field_names_lower:
                        suggested = field_names_lower[suggested.lower()]
                    else:
                        logger.warning(f"⚠️ AI suggested field '{suggested}' not found for column '{excel_col}'")
                        suggested = None
                        confidence = 0
                
                sample_value = field_samples.get(suggested) if suggested else None
                
                # Find alternative fields
                alternatives = self._find_alternatives(excel_col, available_fields, suggested)
                
                mappings.append(MappingSuggestion(
                    excel_column=excel_col,
                    suggested_field=suggested,
                    confidence=confidence,
                    sample_value=sample_value,
                    alternative_fields=alternatives
                ))
            
            # Add any columns that weren't in AI response
            mapped_columns = {m.excel_column for m in mappings}
            for col in excel_columns:
                if col not in mapped_columns:
                    mappings.append(MappingSuggestion(
                        excel_column=col,
                        suggested_field=None,
                        confidence=0,
                        sample_value=None,
                        alternative_fields=self._find_alternatives(col, available_fields, None)
                    ))
            
            # Count successful mappings
            successful = sum(1 for m in mappings if m.suggested_field is not None)
            logger.info(f"✨ AI mapped {successful}/{len(excel_columns)} columns successfully")
            return mappings
            
        except Exception as e:
            logger.error(f"❌ AI mapping failed: {e}", exc_info=True)
            # Fallback: return empty suggestions
            return [
                MappingSuggestion(
                    excel_column=col,
                    suggested_field=None,
                    confidence=0,
                    sample_value=None,
                    alternative_fields=[]
                )
                for col in excel_columns
            ]
    
    def _find_alternatives(
        self,
        excel_column: str,
        available_fields: List[AvailableField],
        exclude: Optional[str] = None
    ) -> List[str]:
        """
        Find alternative field matches based on semantic similarity.
        IMPROVED: Better scoring with keyword, similarity, and Indonesian mapping.
        """
        # Normalize the excel column name
        col_lower = excel_column.lower()
        col_clean = re.sub(r'[_\-\.\[\]]', ' ', col_lower)
        col_words = set(col_clean.split())
        col_normalized = normalize_field_name(excel_column)
        col_key = extract_key_part(excel_column)
        col_indo_equiv = get_indonesian_equivalents(excel_column)
        
        # Remove common prefixes like CA_, pii_, etc.
        col_stripped = re.sub(r'^(ca_|pii_|ca)', '', col_lower)
        
        scored_fields = []
        for field in available_fields:
            if field.field_name == exclude:
                continue
            
            # Skip fields without values
            if not field.sample_value or field.sample_value.strip() == "":
                continue
            
            field_lower = field.field_name.lower()
            field_clean = re.sub(r'[_\-\.\[\]\d]', ' ', field_lower)
            field_words = set(field_clean.split())
            field_normalized = normalize_field_name(field.field_name)
            field_key = extract_key_part(field.field_name)
            
            # Score 1: Word overlap
            overlap = len(col_words & field_words)
            word_score = overlap / max(len(col_words), 1)
            
            # Score 2: Substring match
            substring_score = 0
            if col_stripped in field_lower or field_lower in col_stripped:
                substring_score = 0.5
            
            # Score 3: Sequence similarity
            sequence_score = SequenceMatcher(None, col_normalized, field_normalized).ratio()
            
            # Score 4: Key part match
            key_score = 0
            if col_key and field_key:
                if col_key == field_key:
                    key_score = 0.8
                elif col_key in field_key or field_key in col_key:
                    key_score = 0.5
            
            # Score 5: Indonesian equivalents
            indo_score = 0
            if col_indo_equiv:
                for equiv in col_indo_equiv:
                    if equiv in field_normalized:
                        indo_score = 0.6
                        break
            
            # Combined score with weights
            total_score = (
                word_score * 0.25 + 
                substring_score * 0.15 + 
                sequence_score * 0.25 + 
                key_score * 0.2 + 
                indo_score * 0.15
            )
            
            if total_score > 0.15:  # Minimum threshold
                scored_fields.append((field.field_name, total_score))
        
        # Sort by score and return top 5
        scored_fields.sort(key=lambda x: x[1], reverse=True)
        return [f[0] for f in scored_fields[:5]]
    
    async def _get_template(self, template_id: str) -> Optional[MappingTemplate]:
        """Get a mapping template by ID"""
        try:
            template_uuid = UUID(template_id)
            query = select(MappingTemplate).where(MappingTemplate.id == template_uuid)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception:
            return None
    
    async def _find_matching_template(
        self,
        excel_columns: List[str]
    ) -> Optional[MappingTemplate]:
        """Find an existing template that matches the Excel columns"""
        # Look for templates with similar columns
        query = select(MappingTemplate).order_by(MappingTemplate.usage_count.desc())
        result = await self.db.execute(query)
        templates = result.scalars().all()
        
        for template in templates:
            template_cols = set(template.excel_columns)
            input_cols = set(excel_columns)
            
            # Check if columns match (80% overlap)
            overlap = len(template_cols & input_cols)
            if overlap >= len(input_cols) * 0.8:
                logger.info(f"Found matching template: {template.name}")
                return template
        
        return None
    
    async def _apply_template(
        self,
        template: MappingTemplate,
        excel_columns: List[str],
        job_id: str
    ) -> SuggestMappingResponse:
        """Apply an existing template's mappings"""
        available_fields = await self.get_available_fields(job_id)
        field_samples = {f.field_name: f.sample_value for f in available_fields}
        
        mappings = []
        for col in excel_columns:
            suggested = template.field_mappings.get(col)
            
            mappings.append(MappingSuggestion(
                excel_column=col,
                suggested_field=suggested,
                confidence=0.95 if suggested else 0,  # High confidence for template matches
                sample_value=field_samples.get(suggested) if suggested else None,
                alternative_fields=[]
            ))
        
        # Increment usage count
        template.usage_count += 1
        await self.db.commit()
        
        return SuggestMappingResponse(
            mappings=mappings,
            available_fields=available_fields,
            existing_template=str(template.id)
        )
    
    async def get_export_data(
        self,
        job_id: str,
        mappings: Dict[str, Optional[str]],
        document_ids: Optional[List[str]] = None,
        expand_arrays: bool = True,  # DEFAULT TRUE - Auto-expand based on mapped array fields
        array_field_pattern: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get data for export based on mappings - SMART ROW EXPANSION.
        
        KEY FEATURE: DATA-DRIVEN ROW EXPANSION
        - If mapping includes array fields like "shareholders[*].name", creates rows per array item
        - Non-array fields (like company name) are repeated across all rows
        - Automatically detects array fields from the mapping
        
        Example:
        - Mapping: {"Company": "tinjauan.nama", "Shareholder": "shareholders[*].nama"}
        - Document has 5 shareholders
        - Result: 5 rows, each with same Company name but different Shareholder
        
        Args:
            job_id: Job ID
            mappings: Dict of {excel_column: field_name}
            document_ids: Optional list of specific document IDs
            expand_arrays: If True (default), expand array fields into multiple rows
            array_field_pattern: Optional pattern to specify which array to expand
            
        Returns:
            List of rows, each row is {excel_column: value, ...}
        """
        from sqlalchemy import or_, text
        
        job_uuid = UUID(job_id)
        
        # Get documents
        doc_query = select(BulkJobDocument).where(
            BulkJobDocument.job_id == job_uuid
        ).where(
            (BulkJobDocument.status == "completed") | 
            (BulkJobDocument.total_fields_extracted > 0)
        )
        
        if document_ids:
            doc_uuids = [UUID(d) for d in document_ids]
            doc_query = doc_query.where(BulkJobDocument.id.in_(doc_uuids))
        
        doc_result = await self.db.execute(doc_query)
        documents = doc_result.scalars().all()
        
        # Get field names we need
        field_names = [f for f in mappings.values() if f]
        
        # SMART DETECTION: Find which mapped fields are arrays
        # If any mapped field has [0], [1], etc., we should expand
        array_mappings = {}  # excel_col -> base_pattern
        single_mappings = {}  # excel_col -> field_name
        
        for excel_col, field_name in mappings.items():
            if not field_name:
                continue
            # Check if this mapping refers to an array field
            if re.search(r'\[\d+\]', field_name):
                # Extract base pattern (everything before [N])
                base = re.sub(r'\[\d+\]', '[*]', field_name)
                array_mappings[excel_col] = (base, field_name)
            else:
                single_mappings[excel_col] = field_name
        
        has_array_mappings = len(array_mappings) > 0
        logger.info(f"🔍 SMART export for {len(documents)} docs, {len(field_names)} fields")
        logger.info(f"  📊 Array mappings: {len(array_mappings)}, Single mappings: {len(single_mappings)}")
        
        # IMPORTANT: Only expand if we have explicit array mappings!
        # Otherwise we get duplicate rows with same data
        if not has_array_mappings:
            expand_arrays = False
            logger.info(f"  ⚠️ No array fields in mapping - disabling expansion (1 row per document)")
        
        rows = []
        
        for doc in documents:
            logger.info(f"📄 Processing '{doc.filename}'...")
            
            # FETCH ALL FIELDS for this document
            fields_query = select(
                BulkExtractedField.field_name,
                BulkExtractedField.field_value
            ).where(
                BulkExtractedField.document_id == doc.id,
                BulkExtractedField.field_value.isnot(None),
                BulkExtractedField.field_value != ''
            )
            
            fields_result = await self.db.execute(fields_query)
            field_rows = fields_result.all()
            
            # Build lookup dict
            all_field_values = {r[0]: r[1] for r in field_rows}
            logger.info(f"  Fetched {len(all_field_values)} fields")
            
            # Build normalized lookup for matching
            normalized_lookup = {}  # normalized_name -> (original_name, value)
            key_lookup = {}  # key_part -> [(original_name, value), ...]
            
            # SMART ARRAY DETECTION: Group array fields by base pattern and index
            # e.g., "shareholders.table[0].Nama" -> base="shareholders.table", index=0, suffix="Nama"
            array_data = {}  # base_pattern -> {index_int -> {suffix -> value}}
            
            for fn, fv in all_field_values.items():
                norm = normalize_field_name(fn)
                key = extract_key_part(fn)
                
                if norm:
                    normalized_lookup[norm] = (fn, fv)
                if key and len(key) > 3:
                    if key not in key_lookup:
                        key_lookup[key] = []
                    key_lookup[key].append((fn, fv))
                
                # Parse array fields: pattern[N].suffix or pattern.table[N].suffix
                array_match = re.search(r'^(.+?)\[(\d+)\]\.(.+)$', fn)
                if array_match:
                    base = array_match.group(1)  # e.g., "shareholders.table"
                    index = int(array_match.group(2))  # e.g., 0, 1, 2
                    suffix = array_match.group(3)  # e.g., "Nama"
                    
                    if base not in array_data:
                        array_data[base] = {}
                    if index not in array_data[base]:
                        array_data[base][index] = {}
                    array_data[base][index][suffix] = fv
            
            def find_value(field_name: str) -> str:
                """Find value using multi-level matching"""
                if not field_name:
                    return ""
                
                # Level 1: Exact match
                if field_name in all_field_values:
                    return all_field_values[field_name]
                
                # Level 2: Normalized match
                target_norm = normalize_field_name(field_name)
                if target_norm in normalized_lookup:
                    return normalized_lookup[target_norm][1]
                
                # Level 3: Key part match (first match)
                target_key = extract_key_part(field_name)
                if target_key and target_key in key_lookup:
                    return key_lookup[target_key][0][1]
                
                # Level 4: Partial match - look for fields ending with same suffix
                suffix = field_name.split('.')[-1] if '.' in field_name else field_name
                for fn, fv in all_field_values.items():
                    if fn.endswith(suffix):
                        return fv
                
                return ""
            
            # SMART EXPANSION: If any mapping points to an array field, expand based on it
            if expand_arrays and has_array_mappings and array_data:
                # Find which array to expand based on the mapping
                # Use the first array field mapping's base pattern
                expand_base = None
                expand_mapping_col = None
                
                for excel_col, (base_pattern, original_field) in array_mappings.items():
                    # base_pattern is like "shareholders.table[*].Nama"
                    # We need to find the actual base in array_data
                    for actual_base in array_data.keys():
                        # Match if the base is similar
                        base_norm = normalize_field_name(actual_base)
                        pattern_norm = normalize_field_name(base_pattern.split('[')[0])
                        
                        if base_norm == pattern_norm or actual_base in base_pattern or pattern_norm in base_norm:
                            expand_base = actual_base
                            expand_mapping_col = excel_col
                            break
                    if expand_base:
                        break
                
                if expand_base and expand_base in array_data:
                    entries = array_data[expand_base]
                    logger.info(f"  🔄 EXPANDING based on '{expand_base}' with {len(entries)} items")
                    
                    # Get values for non-array fields (common data)
                    common_data = {}
                    for excel_col, field_name in single_mappings.items():
                        common_data[excel_col] = find_value(field_name)
                    
                    # Create a row for EACH array entry
                    for idx in sorted(entries.keys()):
                        entry = entries[idx]
                        
                        row = {
                            "_document_id": str(doc.id),
                            "_document_name": doc.filename,
                            "_row_index": idx + 1,
                        }
                        
                        # Add common (non-array) data
                        row.update(common_data)
                        
                        # Add array field data for this index
                        for excel_col, (base_pattern, original_field) in array_mappings.items():
                            # Extract the suffix from the mapping
                            suffix_match = re.search(r'\[\d+\]\.(.+)$', original_field)
                            if suffix_match:
                                suffix = suffix_match.group(1)
                                
                                # First check if this suffix exists in current entry
                                if suffix in entry:
                                    row[excel_col] = entry[suffix]
                                else:
                                    # Try to find in other arrays at same index
                                    found = False
                                    for other_base, other_entries in array_data.items():
                                        if idx in other_entries and suffix in other_entries[idx]:
                                            row[excel_col] = other_entries[idx][suffix]
                                            found = True
                                            break
                                    if not found:
                                        row[excel_col] = ""
                            else:
                                row[excel_col] = ""
                        
                        # Fill any unmapped columns
                        for excel_col in mappings.keys():
                            if excel_col not in row:
                                row[excel_col] = ""
                        
                        rows.append(row)
                    
                    continue  # Skip normal single-row processing for this document
            
            # NORMAL MODE: One row per document (no array expansion)
            row = {
                "_document_id": str(doc.id),
                "_document_name": doc.filename
            }
            
            matched_count = 0
            
            for excel_col, field_name in mappings.items():
                value = find_value(field_name) if field_name else ""
                row[excel_col] = value
                if value:
                    matched_count += 1
            
            logger.info(f"  ✅ Matched {matched_count}/{len(field_names)} fields")
            rows.append(row)
        
        logger.info(f"📊 Prepared {len(rows)} rows for export from job {job_id}")
        return rows
    
    async def save_template(
        self,
        user_id: Optional[str],
        name: str,
        description: Optional[str],
        excel_columns: List[str],
        field_mappings: Dict[str, Optional[str]],
        document_type: Optional[str] = None,
        sample_file_name: Optional[str] = None
    ) -> MappingTemplate:
        """Save a new mapping template"""
        template = MappingTemplate(
            user_id=UUID(user_id) if user_id else None,
            name=name,
            description=description,
            document_type=document_type,
            excel_columns=excel_columns,
            field_mappings=field_mappings,
            sample_file_name=sample_file_name
        )
        
        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)
        
        logger.info(f"💾 Saved mapping template: {name}")
        
        return template
    
    async def list_templates(
        self,
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[List[MappingTemplate], int]:
        """List mapping templates"""
        query = select(MappingTemplate)
        
        if user_id:
            query = query.where(MappingTemplate.user_id == UUID(user_id))
        
        # Count total
        count_query = select(func.count()).select_from(MappingTemplate)
        if user_id:
            count_query = count_query.where(MappingTemplate.user_id == UUID(user_id))
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0
        
        # Get paginated results
        query = query.order_by(MappingTemplate.usage_count.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        templates = result.scalars().all()
        
        return templates, total
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a mapping template"""
        try:
            template_uuid = UUID(template_id)
            query = select(MappingTemplate).where(MappingTemplate.id == template_uuid)
            result = await self.db.execute(query)
            template = result.scalar_one_or_none()
            
            if template:
                await self.db.delete(template)
                await self.db.commit()
                logger.info(f"🗑️ Deleted template: {template_id}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"❌ Failed to delete template: {e}")
            return False
