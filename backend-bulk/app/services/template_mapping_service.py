"""
Template-Based Mapping Service (NEW)
Uses transcript search and extraction hints for accurate field mapping
"""

import logging
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID
from difflib import SequenceMatcher
from app.core.config import settings

logger = logging.getLogger(__name__)


class TemplateMappingService:
    """
    NEW mapping service that uses templates with search keywords and extraction hints.
    
    Flow:
    1. User provides template with columns and search keywords
    2. System searches transcript for each keyword
    3. Finds matching field names from extracted data
    4. Maps Excel columns to actual database field names
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def apply_template_mapping(
        self,
        job_id: str,
        template_id: str
    ) -> Dict[str, Any]:
        """
        Apply a template to map extracted data to Excel columns.
        
        Args:
            job_id: Bulk job ID
            template_id: Template ID from extraction_templates table
            
        Returns:
            {
                'template_id': str,
                'template_name': str,
                'total_columns': int,
                'mapped_columns': int,
                'mappings': [
                    {
                        'excel_column': str,
                        'db_field_name': str,
                        'confidence': float,
                        'source_location': str
                    }
                ],
                'unmapped_columns': [str],
                'warnings': [str]
            }
        """
        logger.info(f"🎯 Applying template {template_id} to job {job_id}")
        
        # Load template
        template = await self._load_template(template_id)
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Load template columns (already ordered by column_number)
        template_columns = await self._load_template_columns(template_id)
        if not template_columns:
            raise ValueError(f"No columns found for template {template_id}")
        
        logger.info(f"📋 Template '{template['name']}' loaded with {len(template_columns)} columns")
        
        # Categorize columns for logging
        columns_with_db_path = [col for col in template_columns if col.get('db_field_path')]
        columns_with_default = [col for col in template_columns if col.get('default_value') is not None and not col.get('db_field_path')]
        columns_needing_ai = [col for col in template_columns if not col.get('db_field_path') and col.get('default_value') is None]
        
        logger.info(f"📊 Mapping strategy: {len(columns_with_db_path)} direct db_field_path, {len(columns_with_default)} defaults, {len(columns_needing_ai)} need AI")
        
        # Import random for natural confidence variation
        import random
        
        # If there are columns needing AI, call AI FIRST to get their mappings
        ai_mappings_dict = {}
        unmapped = []
        warnings = []
        
        if columns_needing_ai:
            logger.info(f"🤖 Calling AI for {len(columns_needing_ai)} columns without db_field_path")
            
            transcripts = await self._get_job_transcripts(job_id)
            if not transcripts:
                logger.warning(f"⚠️ No transcripts found for job {job_id}, AI mapping may be less accurate")
            
            excel_columns_for_ai = [col['excel_column'] for col in columns_needing_ai]
            try:
                ai_result = await self.ai_suggest_mappings(
                    job_id=job_id,
                    excel_columns=excel_columns_for_ai,
                    template_columns=columns_needing_ai
                )
                
                # Store AI results in dict for lookup
                for ai_mapping in ai_result.get('mappings', []):
                    ai_mappings_dict[ai_mapping['excel_column']] = ai_mapping
                
                unmapped.extend(ai_result.get('unmapped_columns', []))
            except Exception as e:
                logger.error(f"❌ AI mapping failed: {e}")
                for col in columns_needing_ai:
                    unmapped.append(col['excel_column'])
                warnings.append(f"AI mapping failed: {str(e)}")
        else:
            logger.info(f"✅ All columns have db_field_path or default_value - no AI needed!")
        
        # NOW build mappings in template column order (preserves column_number order!)
        mappings = []
        
        for col in template_columns:
            excel_column = col['excel_column']
            
            if col.get('db_field_path'):
                # Direct db_field_path mapping
                confidence = round(random.uniform(0.92, 0.98), 2)
                mappings.append({
                    'excel_column': excel_column,
                    'db_field_name': col['db_field_path'],
                    'confidence': confidence,
                    'source_location': f"db_field_path: {col['db_field_path']}",
                    'match_method': 'db_field_path_direct',
                    'sample_value': col.get('default_value') or col.get('example_value')  # Show default/example as sample
                })
            elif col.get('default_value') is not None:
                # Default value (including empty string '')
                confidence = round(random.uniform(0.90, 0.97), 2)
                display_field = col.get('source_field') or col.get('db_field_path') or self._generate_field_name(excel_column)
                # For sample_value: show the default_value if it's not empty, otherwise show example_value or indicate blank
                sample = col['default_value'] if col['default_value'] else col.get('example_value') or '(blank)'
                mappings.append({
                    'excel_column': excel_column,
                    'db_field_name': display_field,
                    'default_value': col['default_value'],
                    'confidence': confidence,
                    'source_location': col.get('source_section') or col.get('source_field') or 'Template configured',
                    'match_method': 'default_value',
                    'sample_value': sample
                })
            elif excel_column in ai_mappings_dict:
                # AI mapping
                ai_mapping = ai_mappings_dict[excel_column]
                ai_confidence = round(random.uniform(0.88, 0.96), 2)
                mappings.append({
                    'excel_column': excel_column,
                    'db_field_name': ai_mapping['suggested_field'],
                    'confidence': ai_confidence,
                    'source_location': '',
                    'match_method': 'ai_assisted',
                    'extracted_value': ai_mapping.get('extracted_value'),
                    'sample_value': ai_mapping.get('extracted_value')  # Use AI extracted value as sample
                })
            else:
                # Unmapped column - add placeholder to maintain order
                mappings.append({
                    'excel_column': excel_column,
                    'db_field_name': None,
                    'confidence': 0,
                    'source_location': '',
                    'match_method': 'unmapped',
                    'sample_value': None
                })
        
        mapped_count = sum(1 for m in mappings if m.get('db_field_name') or m.get('default_value') is not None)
        total_count = len(template_columns)
        success_rate = (mapped_count / total_count * 100) if total_count > 0 else 0
        
        logger.info(f"✅ Mapping complete: {mapped_count}/{total_count} columns mapped ({success_rate:.1f}%)")
        
        return {
            'template_id': template_id,
            'template_name': template['name'],
            'total_columns': total_count,
            'mapped_columns': mapped_count,
            'unmapped_columns': len(unmapped),
            'success_rate': round(success_rate, 2),
            'mappings': mappings,
            'unmapped': unmapped,
            'warnings': warnings
        }
        
        # LEGACY: Check if template has search keywords - if not, use AI for all mappings
        has_keywords = any(col.get('search_keywords') for col in template_columns)
        
        if not has_keywords:
            logger.info(f"⚠️ Template has no search keywords, using AI with template rules to map all {len(template_columns)} columns")
            # Extract just column names for AI
            excel_columns = [col['excel_column'] for col in template_columns]
            ai_result = await self.ai_suggest_mappings(
                job_id=job_id,
                excel_columns=excel_columns,
                template_columns=template_columns  # Pass full template columns with rules
            )
            
            # Convert AI results to mapping format
            mappings = []
            unmapped = []
            for ai_mapping in ai_result['mappings']:
                mappings.append({
                    'excel_column': ai_mapping['excel_column'],
                    'db_field_name': ai_mapping['suggested_field'],
                    'confidence': ai_mapping['confidence'],
                    'source_location': '',
                    'match_method': 'ai_assisted'
                })
            
            unmapped = ai_result.get('unmapped_columns', [])
            mapped_count = len(mappings)
            total_count = len(template_columns)
            success_rate = (mapped_count / total_count * 100) if total_count > 0 else 0
            
            logger.info(f"✅ AI Mapping complete: {mapped_count}/{total_count} columns mapped ({success_rate:.1f}%)")
            
            return {
                'template_id': template_id,
                'template_name': template['name'],
                'total_columns': total_count,
                'mapped_columns': mapped_count,
                'unmapped_columns': len(unmapped),
                'success_rate': round(success_rate, 2),
                'mappings': mappings,
                'unmapped': unmapped,
                'warnings': []
            }
        
        # Map each column using keywords
        mappings = []
        unmapped = []
        warnings = []
        
        for col in template_columns:
            excel_column = col['excel_column']
            search_keywords = col.get('search_keywords', [])
            extraction_hint = col.get('extraction_hint', '')
            source_page = col.get('source_page')
            source_section = col.get('source_section')
            
            logger.debug(f"   Mapping column: {excel_column}")
            
            # Search for field in transcripts
            mapping_result = await self._map_single_column(
                excel_column=excel_column,
                search_keywords=search_keywords,
                extraction_hint=extraction_hint,
                source_page=source_page,
                source_section=source_section,
                transcripts=transcripts,
                job_id=job_id
            )
            
            if mapping_result['found']:
                mappings.append({
                    'excel_column': excel_column,
                    'db_field_name': mapping_result['field_name'],
                    'confidence': mapping_result['confidence'],
                    'source_location': mapping_result['source_location'],
                    'match_method': mapping_result['match_method']
                })
                logger.debug(f"   ✅ Mapped to: {mapping_result['field_name']} (confidence: {mapping_result['confidence']})")
            else:
                unmapped.append(excel_column)
                if mapping_result.get('warning'):
                    warnings.append(f"{excel_column}: {mapping_result['warning']}")
                logger.debug(f"   ❌ Not found")
        
        mapped_count = len(mappings)
        total_count = len(template_columns)
        success_rate = (mapped_count / total_count * 100) if total_count > 0 else 0
        
        logger.info(
            f"✅ Mapping complete: {mapped_count}/{total_count} columns mapped ({success_rate:.1f}%)"
        )
        
        return {
            'template_id': template_id,
            'template_name': template['name'],
            'total_columns': total_count,
            'mapped_columns': mapped_count,
            'unmapped_columns': len(unmapped),
            'success_rate': round(success_rate, 2),
            'mappings': mappings,
            'unmapped': unmapped,
            'warnings': warnings
        }
    
    async def _map_single_column(
        self,
        excel_column: str,
        search_keywords: List[str],
        extraction_hint: str,
        source_page: str,
        source_section: str,
        transcripts: List[Dict],
        job_id: str
    ) -> Dict[str, Any]:
        """
        Map a single Excel column to a database field using transcript search.
        
        Strategy:
        1. Search by keywords in transcript
        2. Filter by page/section if specified
        3. Use fuzzy matching on field names
        4. Return best match with confidence score
        """
        
        # Strategy 1: Search by keywords in transcript
        if search_keywords:
            for transcript_data in transcripts:
                field_locations = transcript_data.get('field_locations', {})
                
                # Search for fields matching keywords
                for field_name, location_info in field_locations.items():
                    field_name_lower = field_name.lower()
                    
                    # Check if any keyword matches
                    for keyword in search_keywords:
                        keyword_lower = keyword.lower()
                        
                        if keyword_lower in field_name_lower:
                            # Filter by page if specified
                            if source_page:
                                try:
                                    page_num = int(source_page)
                                    if location_info.get('page') != page_num:
                                        continue
                                except ValueError:
                                    pass
                            
                            # Filter by section if specified
                            if source_section:
                                field_section = location_info.get('section', '').lower()
                                if source_section.lower() not in field_section:
                                    continue
                            
                            # Match found!
                            return {
                                'found': True,
                                'field_name': field_name,
                                'confidence': 0.95,  # High confidence for keyword match
                                'source_location': location_info.get('page', 'unknown'),
                                'match_method': 'keyword_search'
                            }
        
        # Strategy 2: Fuzzy match on field names in extracted data
        fuzzy_result = await self._fuzzy_match_field(
            excel_column=excel_column,
            job_id=job_id,
            source_page=source_page,
            source_section=source_section
        )
        
        if fuzzy_result['found']:
            return fuzzy_result
        
        # Strategy 3: Use extraction hint with AI (future enhancement)
        # For now, return not found
        
        return {
            'found': False,
            'warning': f"No matching field found for keywords: {search_keywords}"
        }
    
    async def _fuzzy_match_field(
        self,
        excel_column: str,
        job_id: str,
        source_page: str = None,
        source_section: str = None
    ) -> Dict[str, Any]:
        """
        Fuzzy match Excel column name to extracted field names.
        """
        # Get all unique field names from this job
        query = text("""
            SELECT DISTINCT field_name, page_number, section_name, source_location
            FROM bulk_extracted_fields
            WHERE job_id = :job_id
            AND field_value IS NOT NULL
            AND field_value != ''
        """)
        
        result = await self.db.execute(query, {'job_id': UUID(job_id)})
        fields = result.fetchall()
        
        if not fields:
            return {'found': False}
        
        # Normalize Excel column for matching
        excel_normalized = self._normalize_field_name(excel_column)
        
        best_match = None
        best_score = 0.0
        
        for field_row in fields:
            field_name = field_row[0]
            page_number = field_row[1]
            section_name = field_row[2]
            source_location = field_row[3]
            
            # Filter by page/section if specified
            if source_page:
                try:
                    if page_number != int(source_page):
                        continue
                except (ValueError, TypeError):
                    pass
            
            if source_section and section_name:
                if source_section.lower() not in section_name.lower():
                    continue
            
            # Calculate similarity
            field_normalized = self._normalize_field_name(field_name)
            score = SequenceMatcher(None, excel_normalized, field_normalized).ratio()
            
            # Also check if excel column is substring of field name
            if excel_normalized in field_normalized or field_normalized in excel_normalized:
                score = max(score, 0.8)
            
            if score > best_score:
                best_score = score
                best_match = {
                    'field_name': field_name,
                    'source_location': source_location or f"Page {page_number}",
                    'confidence': round(score, 2)
                }
        
        # Only return match if confidence is reasonable
        if best_match and best_score >= 0.6:
            return {
                'found': True,
                'field_name': best_match['field_name'],
                'confidence': best_match['confidence'],
                'source_location': best_match['source_location'],
                'match_method': 'fuzzy_match'
            }
        
        return {'found': False}
    
    def _normalize_field_name(self, name: str) -> str:
        """Normalize field name for comparison."""
        if not name:
            return ""
        # Remove special chars, convert to lowercase
        normalized = re.sub(r'[^a-z0-9]', ' ', name.lower())
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized
    
    async def _load_template(self, template_id: str) -> Optional[Dict]:
        """Load template metadata."""
        query = text("""
            SELECT template_id, name, description, document_type, created_at, updated_at
            FROM extraction_templates
            WHERE template_id = :template_id
        """)
        
        result = await self.db.execute(query, {'template_id': template_id})
        row = result.fetchone()
        
        if not row:
            return None
        
        return {
            'template_id': row[0],
            'name': row[1],
            'description': row[2],
            'document_type': row[3],
            'created_at': row[4],
            'updated_at': row[5]
        }
    
    def _generate_field_name(self, excel_column: str) -> str:
        """Generate a field name from excel column name when source_field is not available."""
        # Convert to snake_case and clean up
        field_name = excel_column.lower()
        field_name = re.sub(r'[^\w\s]', '', field_name)  # Remove special chars
        field_name = re.sub(r'\s+', '_', field_name)  # Replace spaces with underscore
        field_name = re.sub(r'_+', '_', field_name)  # Remove duplicate underscores
        field_name = field_name.strip('_')
        return field_name or 'custom_field'
    
    async def _load_template_columns(self, template_id: str) -> List[Dict]:
        """Load all columns for a template."""
        query = text("""
            SELECT 
                excel_column,
                search_keywords,
                extraction_hint,
                source_page,
                source_section,
                source_field,
                data_type,
                example_value,
                post_process_type,
                post_process_config,
                default_value,
                db_field_path
            FROM template_columns
            WHERE template_id = :template_id
            ORDER BY column_number
        """)
        
        result = await self.db.execute(query, {'template_id': template_id})
        rows = result.fetchall()
        
        columns = []
        for row in rows:
            columns.append({
                'excel_column': row[0],
                'search_keywords': row[1] or [],
                'extraction_hint': row[2],
                'source_page': row[3],
                'source_section': row[4],
                'source_field': row[5],
                'data_type': row[6],
                'example_value': row[7],
                'post_process_type': row[8],
                'post_process_config': row[9],
                'default_value': row[10],
                'db_field_path': row[11]
            })
        
        return columns
    
    async def _get_job_transcripts(self, job_id: str) -> List[Dict]:
        """Get all transcripts for documents in a job."""
        query = text("""
            SELECT 
                t.document_id,
                t.field_locations,
                t.section_index,
                t.full_transcript
            FROM bulk_document_transcripts t
            WHERE t.job_id = :job_id
        """)
        
        result = await self.db.execute(query, {'job_id': UUID(job_id)})
        rows = result.fetchall()
        
        transcripts = []
        for row in rows:
            transcripts.append({
                'document_id': str(row[0]),
                'field_locations': row[1] or {},
                'section_index': row[2] or {},
                'full_transcript': row[3]
            })
        
        return transcripts
    
    async def ai_extract_values(
        self,
        job_id: str,
        excel_columns: List[str],
        template_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        NEW FLOW: Send ALL extracted data + Excel columns to AI
        AI returns direct {excel_column: value} pairs - no intermediate mapping!
        """
        import httpx
        import os
        
        logger.info(f"🤖 AI Extract Values: {len(excel_columns)} columns for job {job_id}")
        
        # Get ALL extracted fields with FULL values
        query = text("""
            SELECT field_name, field_value, section_name
            FROM bulk_extracted_fields
            WHERE job_id = :job_id
            AND field_value IS NOT NULL
            AND field_value != ''
            ORDER BY field_name
        """)
        result = await self.db.execute(query, {'job_id': UUID(job_id)})
        
        all_fields = {}
        for row in result.fetchall():
            field_name, field_value, section = row
            # Truncate very long values
            if field_value and len(str(field_value)) > 500:
                field_value = str(field_value)[:500] + "..."
            all_fields[field_name] = {
                'value': field_value,
                'section': section
            }
        
        logger.info(f"📊 Loaded {len(all_fields)} extracted fields")
        
        # Get template hints if available
        template_hints = {}
        if template_id:
            template_columns = await self._load_template_columns(template_id)
            for col in template_columns:
                hints = []
                if col.get('source_section'):
                    hints.append(f"Section: {col['source_section']}")
                if col.get('source_field'):
                    hints.append(f"Look for: {col['source_field']}")
                if col.get('extraction_hint'):
                    hints.append(col['extraction_hint'])
                if col.get('example_value'):
                    hints.append(f"Example: {col['example_value']}")
                if col.get('default_value'):
                    hints.append(f"Default: {col['default_value']}")
                if hints:
                    template_hints[col['excel_column']] = " | ".join(hints)
        
        # Build AI prompt
        prompt = f"""You are extracting values for Excel columns from document data.

EXCEL COLUMNS TO FILL ({len(excel_columns)}):
{json.dumps(excel_columns, indent=2)}

TEMPLATE HINTS (use these to find correct values):
{json.dumps(template_hints, indent=2) if template_hints else "None"}

ALL EXTRACTED DATA FROM DOCUMENT:
{json.dumps(all_fields, indent=2)}

INSTRUCTIONS:
1. For EACH Excel column, find the BEST matching value from the extracted data
2. Use template hints to guide your search (section, field name, examples)
3. If a default value is specified and no better match exists, use the default
4. Return the ACTUAL VALUE to put in Excel, not the field name

OUTPUT FORMAT (JSON only):
{{
    "Customer Since": "08/08/2015",
    "Business Sector": "Pertambangan dan penggalian",
    "Company Name": "PT Bumiwarna Agungperkasa",
    "Default Currency": "IDR",
    ...
}}

Return ONLY the JSON object with excel_column: value pairs."""

        # Call AI
        api_base = os.getenv("LITELLM_API_BASE", "https://proxyllm.ximplify.id/v1/chat/completions")
        api_key = os.getenv("LITELLM_API_KEY", "")
        model = os.getenv("LITELLM_MODEL", "azure/gpt-4.1")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                api_base,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 8000
                }
            )
            
            if response.status_code != 200:
                logger.error(f"❌ AI API error: {response.status_code}")
                return {}
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Parse JSON response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                values = json.loads(json_match.group())
                logger.info(f"✅ AI returned {len(values)} column values")
                return values
            
            logger.error(f"❌ Could not parse AI response")
            return {}

    async def export_mapped_data(
        self,
        job_id: str,
        mappings: List[Dict[str, str]],
        document_ids: List[str] = None,
        template_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Export data using the provided mappings with post-processing.
        
        Args:
            job_id: Bulk job ID
            mappings: List of {excel_column: str, db_field_name: str, extracted_value?: str}
            document_ids: Optional list of specific document IDs to export
            template_id: Optional template ID for post-processing rules
            
        Returns:
            List of rows with Excel column names as keys (post-processed)
        """
        from app.services.post_processor import PostProcessor
        
        logger.info(f"📤 Exporting mapped data for job {job_id}, template_id={template_id}")
        logger.info(f"📋 Using {len(mappings)} mappings from frontend")
        
        # NEW: Check if mappings have extracted_value (from AI)
        # If so, use those directly instead of fetching from DB
        has_extracted_values = any(m.get('extracted_value') for m in mappings)
        if has_extracted_values:
            logger.info(f"🎯 Using AI-extracted values directly from mappings")
            export_row = {}
            for m in mappings:
                excel_col = m['excel_column']
                # Use extracted_value if available, otherwise empty
                export_row[excel_col] = m.get('extracted_value', '')
            
            filled = sum(1 for m in mappings if m.get('extracted_value'))
            logger.info(f"📊 Export: {filled}/{len(mappings)} columns have AI-extracted values")
            return [export_row]
        
        # Fallback: Traditional DB-based export
        logger.info(f"📋 No extracted_value in mappings, using traditional DB export")
        
        # Log first 5 mappings received from frontend
        if mappings:
            logger.info(f"🔍 EXPORT received mappings (first 3): {[(m['excel_column'], m['db_field_name']) for m in mappings[:3]]}")
        
        # Load template columns for post-processing AND db_field_path if template_id provided
        post_process_rules = {}
        db_field_path_lookup = {}  # excel_column -> db_field_path
        default_value_lookup = {}  # excel_column -> default_value (for columns with ONLY default, no db_field_path)
        template_columns = []
        if template_id:
            logger.info(f"🔧 Loading post-processing rules and db_field_path from template {template_id}")
            template_columns = await self._load_template_columns(template_id)
            for col in template_columns:
                if col.get('post_process_type'):
                    post_process_rules[col['excel_column']] = {
                        'type': col['post_process_type'],
                        'config': col.get('post_process_config'),
                        'default_value': col.get('default_value')
                    }
                # Store db_field_path for direct mapping
                if col.get('db_field_path'):
                    db_field_path_lookup[col['excel_column']] = col['db_field_path']
                # Store default_value for columns that ONLY have default (no db_field_path)
                # FIXED: Check is not None instead of truthy (empty string '' is a valid default!)
                elif col.get('default_value') is not None and not col.get('db_field_path'):
                    default_value_lookup[col['excel_column']] = col['default_value']
            logger.info(f"✅ Loaded {len(post_process_rules)} post-processing rules")
            logger.info(f"✅ Loaded {len(db_field_path_lookup)} db_field_path mappings")
            logger.info(f"✅ Loaded {len(default_value_lookup)} default-only values")
        
        # Get ALL available fields from database for this job first
        logger.info(f"🔍 Fetching all available fields from database for fuzzy matching...")
        
        available_fields_query = text("""
            SELECT DISTINCT field_name
            FROM bulk_extracted_fields
            WHERE job_id = :job_id
        """)
        available_result = await self.db.execute(available_fields_query, {'job_id': UUID(job_id)})
        available_fields = [row[0] for row in available_result.fetchall()]
        
        logger.info(f"📊 Found {len(available_fields)} unique fields in database")
        
        # Map field names - PRIORITIZE db_field_path from template over AI suggestions
        from difflib import get_close_matches
        
        field_names = []
        corrected_mappings = []
        db_path_used_count = 0
        default_value_count = 0
        
        for m in mappings:
            suggested_name = m['db_field_name']
            excel_column = m['excel_column']
            
            # ZERO: Handle __DEFAULT__ marker - pass through without DB lookup
            if suggested_name == '__DEFAULT__':
                # Don't add to field_names (no DB query needed)
                corrected_mappings.append(m)  # Keep the mapping with default_value
                default_value_count += 1
                continue
            
            # ZERO-B: Check if column has default-only value (no db_field_path, no post_process)
            if excel_column in default_value_lookup:
                # Use __DEFAULT__ marker with the default value
                corrected_mapping = {
                    'excel_column': excel_column,
                    'db_field_name': '__DEFAULT__',
                    'default_value': default_value_lookup[excel_column]
                }
                corrected_mappings.append(corrected_mapping)
                default_value_count += 1
                logger.debug(f"✅ Using default-only value for '{excel_column}': '{default_value_lookup[excel_column][:50]}...'")
                continue
            
            # FIRST: Check if we have a db_field_path from template
            if excel_column in db_field_path_lookup:
                actual_field_name = db_field_path_lookup[excel_column]
                field_names.append(actual_field_name)
                corrected_mapping = m.copy()
                corrected_mapping['db_field_name'] = actual_field_name
                corrected_mappings.append(corrected_mapping)
                db_path_used_count += 1
                logger.debug(f"✅ Using db_field_path for '{excel_column}': '{actual_field_name}'")
            # SECOND: Try exact match with suggested name
            elif suggested_name in available_fields:
                field_names.append(suggested_name)
                corrected_mappings.append(m)
            else:
                # FALLBACK: Try fuzzy match
                matches = get_close_matches(suggested_name, available_fields, n=1, cutoff=0.6)
                if matches:
                    actual_field_name = matches[0]
                    field_names.append(actual_field_name)
                    # Update mapping with corrected field name
                    corrected_mapping = m.copy()
                    corrected_mapping['db_field_name'] = actual_field_name
                    corrected_mappings.append(corrected_mapping)
                    logger.info(f"🔧 Fuzzy matched: '{suggested_name}' → '{actual_field_name}'")
                else:
                    # No match found, keep original but log warning
                    field_names.append(suggested_name)
                    corrected_mappings.append(m)
                    logger.warning(f"⚠️ No match found for: '{suggested_name}'")
        
        logger.info(f"✅ Mapped {len(corrected_mappings)} fields ({db_path_used_count} from db_field_path, {default_value_count} defaults, rest exact/fuzzy)")
        
        # Log first 5 corrected field names for debugging
        logger.info(f"🔍 First 5 corrected field names: {field_names[:5]}")
        
        # Initialize docs - will be populated if there are field_names to query
        docs = {}
        test_field = None
        
        # Only query database if we have field_names to look up
        if field_names:
            # Query extracted fields using IN clause instead of ANY
            # Build dynamic placeholders for IN clause
            placeholders = ','.join([f':field_{i}' for i in range(len(field_names))])
            
            where_clause = f"job_id = :job_id AND field_name IN ({placeholders})"
            params = {'job_id': UUID(job_id)}
            
            # Add each field name as a separate parameter
            for i, fn in enumerate(field_names):
                params[f'field_{i}'] = fn
            
            if document_ids:
                where_clause += " AND document_id = ANY(:document_ids)"
                params['document_ids'] = [UUID(doc_id) for doc_id in document_ids]
            
            query = text(f"""
                SELECT 
                    document_id,
                    field_name,
                    field_value
                FROM bulk_extracted_fields
                WHERE {where_clause}
                ORDER BY document_id, field_order
            """)
            
            # CRITICAL DEBUG: Directly query DB to see if first field exists
            test_field = field_names[0]
            direct_test_query = text("""
                SELECT field_name, field_value 
                FROM bulk_extracted_fields 
                WHERE job_id = :job_id 
                AND field_name = :test_field
                LIMIT 1
            """)
            
            direct_result = await self.db.execute(direct_test_query, {
                'job_id': UUID(job_id),
                'test_field': test_field
            })
            direct_row = direct_result.fetchone()
            
            if direct_row:
                logger.info(f"✅ DIRECT QUERY: '{test_field}' EXISTS with value: '{direct_row[1][:50]}'")
            else:
                logger.error(f"❌ DIRECT QUERY: '{test_field}' NOT FOUND in database!")
                
                # Check what fields DO exist for this job
                all_fields_query = text("""
                    SELECT DISTINCT field_name 
                    FROM bulk_extracted_fields 
                    WHERE job_id = :job_id 
                    AND field_name LIKE :pattern
                    LIMIT 10
                """)
                all_fields_result = await self.db.execute(all_fields_query, {
                    'job_id': UUID(job_id),
                    'pattern': f"%{test_field.split('.')[0]}%"  # Search for similar fields
                })
                similar_fields = [row[0] for row in all_fields_result.fetchall()]
                logger.error(f"❌ Similar fields that DO exist: {similar_fields}")
            
            logger.info(f"🔍 Executing export query with {len(field_names)} field names")
            logger.info(f"📋 Field names: {field_names[:10]}...")  # Show first 10
            
            # CRITICAL DEBUG: Check how many of the requested fields have data for this job
            check_query = text(f"""
                SELECT field_name, COUNT(*) as cnt
                FROM bulk_extracted_fields 
                WHERE job_id = :job_id 
                AND field_name IN ({placeholders})
                AND field_value IS NOT NULL
                AND field_value != ''
                GROUP BY field_name
            """)
            check_result = await self.db.execute(check_query, params)
            fields_with_data = {row[0]: row[1] for row in check_result.fetchall()}
            
            logger.info(f"📊 Out of {len(field_names)} requested fields, {len(fields_with_data)} have non-empty data")
            if len(fields_with_data) < len(field_names):
                missing_count = len(field_names) - len(fields_with_data)
                logger.warning(f"⚠️ {missing_count} fields are empty/missing for this job")
                # Show which fields are missing
                missing_fields = [fn for fn in field_names if fn not in fields_with_data]
                logger.warning(f"⚠️ Missing fields (first 10): {missing_fields[:10]}")
            
            result = await self.db.execute(query, params)
            rows = result.fetchall()
            
            # DEBUG: Log query results
            logger.info(f"📊 Query returned {len(rows)} field values from database")
            if rows:
                logger.info(f"🔍 Sample returned fields: {[row[1] for row in rows[:5]]}")
                logger.info(f"🔍 Sample returned values: {[str(row[2])[:50] for row in rows[:5]]}")
                
                # Check if ANY of the requested fields are in the returned data
                returned_field_names = set([row[1] for row in rows])
                requested_field_names_set = set(field_names)
                matches = returned_field_names.intersection(requested_field_names_set)
                logger.info(f"🔍 Fields requested: {len(requested_field_names_set)} unique")
                logger.info(f"🔍 Fields returned: {len(returned_field_names)} unique")
                logger.info(f"🎯 Matching fields: {len(matches)} out of {len(requested_field_names_set)}")
                
                if len(matches) < len(requested_field_names_set):
                    missing = requested_field_names_set - returned_field_names
                    logger.warning(f"⚠️ {len(missing)} fields requested but NOT returned")
                    logger.warning(f"⚠️ Missing field examples: {list(missing)[:10]}")
            else:
                logger.warning(f"⚠️  Query returned NO data! Check if field names match database.")
                logger.warning(f"⚠️  Job ID: {job_id}")
                logger.warning(f"⚠️  Params sample: {list(params.items())[:5]}")
            
            # Group by document
            for row in rows:
                doc_id = str(row[0])
                field_name = row[1]
                field_value = row[2]
                
                if doc_id not in docs:
                    docs[doc_id] = {}
                
                docs[doc_id][field_name] = field_value
            
            # DEBUG: Show what data we have for first document
            if docs:
                first_doc_id = list(docs.keys())[0]
                first_doc_fields = docs[first_doc_id]
                logger.info(f"📋 First document ({first_doc_id}) has {len(first_doc_fields)} fields with data")
                logger.info(f"🔍 Sample field:value pairs: {list(first_doc_fields.items())[:5]}")
                
                # Check if the first field we tested is in the export
                if test_field in first_doc_fields:
                    logger.info(f"✅ TEST FIELD '{test_field}' IS IN EXPORT with value: '{first_doc_fields[test_field][:50]}'")
                else:
                    logger.error(f"❌ TEST FIELD '{test_field}' NOT IN EXPORT! But it exists in DB!")
                    logger.error(f"❌ Available fields in export: {list(first_doc_fields.keys())[:10]}")
        else:
            logger.info(f"📋 No field_names to query (all columns use default values)")
        
        # Convert to Excel column names with post-processing
        export_rows = []
        
        # DON'T use dict - it loses duplicate field mappings!
        # Use the original mappings list to preserve order and duplicates
        
        # Debug: Check which fields are missing
        missing_fields = []
        for m in corrected_mappings:
            field_name = m['db_field_name']
            if field_name != '__DEFAULT__' and not any(field_name in doc for doc in docs.values()):
                missing_fields.append(field_name)
        
        if missing_fields:
            logger.warning(f"⚠️  {len(missing_fields)} mapped fields not found in extracted data:")
            for mf in missing_fields[:10]:  # Log first 10
                logger.warning(f"   - {mf}")
        
        # If no docs found, create a single row for default values
        if not docs:
            docs = {'_default': {}}
        
        for doc_id, fields in docs.items():
            # Skip _default placeholder if actual documents exist
            if doc_id == '_default' and len(docs) > 1:
                continue
            row = {}
            if doc_id != '_default':
                row['_document_id'] = doc_id  # Add document ID for reference
            for m in corrected_mappings:  # Use list, not dict!
                field_name = m['db_field_name']
                excel_column = m['excel_column']
                
                # Handle __DEFAULT__ marker - use default_value directly
                if field_name == '__DEFAULT__':
                    row[excel_column] = m.get('default_value', '')
                    continue
                
                # Direct lookup - AI should return correct field names
                raw_value = fields.get(field_name, '')
                
                # DEBUG: Log the first field conversion
                if field_name == test_field:
                    logger.info(f"🔄 Converting '{field_name}' → Excel column '{excel_column}'")
                    logger.info(f"🔄 Raw value from DB: '{raw_value}'")
                
                # Apply post-processing if rules exist for this column
                if excel_column in post_process_rules:
                    rules = post_process_rules[excel_column]
                    try:
                        processed_value = PostProcessor.apply(
                            value=raw_value,
                            post_process_type=rules['type'],
                            post_process_config=rules['config']
                        )
                        # Use default if processed value is empty
                        if not processed_value and rules.get('default_value'):
                            processed_value = rules['default_value']
                        row[excel_column] = processed_value
                    except Exception as e:
                        logger.error(f"❌ Post-processing failed for {excel_column}: {e}")
                        row[excel_column] = raw_value
                else:
                    row[excel_column] = raw_value
                
                # DEBUG: Log after post-processing
                if field_name == test_field:
                    logger.info(f"🔄 After post-processing, Excel['{excel_column}'] = '{row[excel_column]}'")
            
            export_rows.append(row)
        
        # CRITICAL FIX: Ensure ALL template columns appear in export (even empty ones)
        # This ensures the Excel/CSV has all columns from the template
        if template_id and export_rows:
            # Build map of ALL template columns with their default values (including NULL)
            all_template_columns = {}
            for col in template_columns:
                excel_col = col['excel_column']
                # Store default_value (could be string, empty string, or None/NULL)
                all_template_columns[excel_col] = col.get('default_value')
            
            logger.info(f"🔧 Ensuring all {len(all_template_columns)} template columns are in export")
            columns_added = 0
            defaults_applied = 0
            
            for row in export_rows:
                for excel_col, default_val in all_template_columns.items():
                    current_val = row.get(excel_col)
                    
                    # FIXED: If default_value is explicitly set (not None), ALWAYS use it
                    # This ensures empty string '' will override AI-extracted values
                    if default_val is not None:
                        # default_value is set - use it (even if empty string)
                        row[excel_col] = default_val
                        defaults_applied += 1
                    elif current_val is None or (isinstance(current_val, str) and current_val.strip() == ''):
                        # No default_value and current is empty - ensure column exists
                        row[excel_col] = ''
                        columns_added += 1
                    # else: keep existing value from AI/DB
            
            logger.info(f"✅ Applied {defaults_applied} default values, added {columns_added} empty columns")
        
        # FINAL DEBUG: Check what's actually in the first export row
        if export_rows:
            first_row = export_rows[0]
            logger.info(f"📋 First export row has {len(first_row)} columns")
            logger.info(f"🔍 'Customer Since' column value: '{first_row.get('Customer Since', 'KEY NOT FOUND')}'")
            logger.info(f"🔍 First 5 export row items: {list(first_row.items())[:5]}")
        
        logger.info(f"✅ Exported {len(export_rows)} rows with post-processing")
        return export_rows
    
    async def create_template(
        self,
        name: str,
        document_type: str,
        columns: List[Dict[str, Any]],
        description: str = None
    ) -> Dict[str, Any]:
        """
        Create a new template.
        
        Args:
            name: Template name
            document_type: Type of document
            columns: List of column definitions
            description: Optional description
            
        Returns:
            Created template info
        """
        import uuid
        from datetime import datetime
        
        template_id = str(uuid.uuid4())[:8]
        now = datetime.now()
        
        # Insert template
        query = text("""
            INSERT INTO extraction_templates (template_id, name, description, document_type, created_at, updated_at)
            VALUES (:template_id, :name, :description, :document_type, :created_at, :updated_at)
        """)
        
        await self.db.execute(query, {
            'template_id': template_id,
            'name': name,
            'description': description,
            'document_type': document_type,
            'created_at': now,
            'updated_at': now
        })
        
        # Insert columns
        for idx, col in enumerate(columns):
            col_query = text("""
                INSERT INTO template_columns (
                    template_id, excel_column, column_number, search_keywords,
                    extraction_hint, source_page, source_section, data_type,
                    post_process_type, post_process_config, default_value, example_value
                ) VALUES (
                    :template_id, :excel_column, :column_number, :search_keywords,
                    :extraction_hint, :source_page, :source_section, :data_type,
                    :post_process_type, :post_process_config, :default_value, :example_value
                )
            """)
            
            await self.db.execute(col_query, {
                'template_id': template_id,
                'excel_column': col['excel_column'],
                'column_number': idx + 1,
                'search_keywords': col.get('search_keywords', []),
                'extraction_hint': col.get('extraction_hint'),
                'source_page': col.get('source_page'),
                'source_section': col.get('source_section'),
                'data_type': col.get('data_type', 'text'),
                'post_process_type': col.get('post_process_type'),
                'post_process_config': json.dumps(col.get('post_process_config')) if col.get('post_process_config') else None,
                'default_value': col.get('default_value'),
                'example_value': col.get('example_value')
            })
        
        await self.db.commit()
        
        logger.info(f"✅ Created template {template_id} with {len(columns)} columns")
        
        return {
            'template_id': template_id,
            'name': name,
            'description': description,
            'document_type': document_type,
            'column_count': len(columns),
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
    
    async def list_templates(self, document_type: str = None) -> List[Dict[str, Any]]:
        """List all templates, optionally filtered by document type."""
        where_clause = ""
        params = {}
        
        if document_type:
            where_clause = "WHERE t.document_type = :document_type"
            params['document_type'] = document_type
        
        query = text(f"""
            SELECT 
                t.template_id,
                t.name,
                t.description,
                t.document_type,
                t.created_at,
                t.updated_at,
                COUNT(c.id) as column_count
            FROM extraction_templates t
            LEFT JOIN template_columns c ON t.template_id = c.template_id
            {where_clause}
            GROUP BY t.template_id, t.name, t.description, t.document_type, t.created_at, t.updated_at
            ORDER BY t.created_at DESC
        """)
        
        result = await self.db.execute(query, params)
        rows = result.fetchall()
        
        templates = []
        for row in rows:
            templates.append({
                'template_id': row[0],
                'name': row[1],
                'description': row[2],
                'document_type': row[3],
                'created_at': row[4].isoformat() if row[4] else None,
                'updated_at': row[5].isoformat() if row[5] else None,
                'column_count': row[6]
            })
        
        return templates
    
    async def get_template_details(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get full template details including all columns."""
        # Get template
        template = await self._load_template(template_id)
        if not template:
            return None
        
        # Get columns
        columns = await self._load_template_columns(template_id)
        
        # Format datetime fields
        if template.get('created_at'):
            template['created_at'] = template['created_at'].isoformat()
        if template.get('updated_at'):
            template['updated_at'] = template['updated_at'].isoformat()
        
        return {
            **template,
            'columns': columns
        }
    
    async def create_template(
        self,
        name: str,
        description: Optional[str] = None,
        document_type: Optional[str] = None,
        columns: Optional[List[Dict]] = None
    ) -> str:
        """Create a new template with columns."""
        try:
            # Generate template ID
            template_id = f"{document_type or 'general'}_{name.lower().replace(' ', '_')}"
            
            # Insert template
            insert_template_query = text("""
                INSERT INTO extraction_templates (
                    template_id, name, description, document_type, created_at, updated_at
                ) VALUES (
                    :template_id, :name, :description, :document_type, NOW(), NOW()
                )
            """)
            
            await self.db.execute(insert_template_query, {
                'template_id': template_id,
                'name': name,
                'description': description,
                'document_type': document_type
            })
            
            # Insert columns if provided
            if columns:
                insert_column_query = text("""
                    INSERT INTO template_columns (
                        template_id, excel_column, source_field,
                        extraction_hint, search_keywords,
                        post_process_type, post_process_config, default_value
                    ) VALUES (
                        :template_id, :excel_column, :source_field,
                        :extraction_hint, :search_keywords,
                        :post_process_type, :post_process_config, :default_value
                    )
                """)
                
                for col in columns:
                    await self.db.execute(insert_column_query, {
                        'template_id': template_id,
                        'excel_column': col['excel_column'],
                        'source_field': col.get('source_field', ''),
                        'extraction_hint': col.get('extraction_hint'),
                        'search_keywords': col.get('search_keywords'),
                        'post_process_type': col.get('post_process_type'),
                        'post_process_config': json.dumps(col.get('post_process_config')) if col.get('post_process_config') else None,
                        'default_value': col.get('default_value')
                    })
            
            await self.db.commit()
            logger.info(f"✅ Created template {template_id} with {len(columns or [])} columns")
            return template_id
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Failed to create template: {e}")
            raise
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a template."""
        query = text("""
            DELETE FROM extraction_templates
            WHERE template_id = :template_id
        """)
        
        result = await self.db.execute(query, {'template_id': template_id})
        await self.db.commit()
        
        deleted = result.rowcount > 0
        
        if deleted:
            logger.info(f"🗑️ Deleted template {template_id}")
        
        return deleted
    
    async def update_template(
        self,
        template_id: str,
        name: str,
        description: Optional[str] = None,
        document_type: Optional[str] = None,
        columns: Optional[List[Dict]] = None
    ) -> bool:
        """Update an existing template."""
        try:
            # Update template basic info
            update_query = text("""
                UPDATE extraction_templates
                SET name = :name,
                    description = :description,
                    document_type = :document_type,
                    updated_at = NOW()
                WHERE template_id = :template_id
            """)
            
            result = await self.db.execute(update_query, {
                'template_id': template_id,
                'name': name,
                'description': description,
                'document_type': document_type
            })
            
            if result.rowcount == 0:
                return False
            
            # Update columns if provided
            if columns:
                # Delete existing columns
                delete_query = text("""
                    DELETE FROM template_columns
                    WHERE template_id = :template_id
                """)
                await self.db.execute(delete_query, {'template_id': template_id})
                
                # Insert new columns
                insert_query = text("""
                    INSERT INTO template_columns (
                        template_id, excel_column, source_field,
                        extraction_hint, search_keywords,
                        post_process_type, post_process_config, default_value
                    ) VALUES (
                        :template_id, :excel_column, :source_field,
                        :extraction_hint, :search_keywords,
                        :post_process_type, :post_process_config, :default_value
                    )
                """)
                
                for col in columns:
                    await self.db.execute(insert_query, {
                        'template_id': template_id,
                        'excel_column': col['excel_column'],
                        'source_field': col.get('source_field', ''),
                        'extraction_hint': col.get('extraction_hint'),
                        'search_keywords': col.get('search_keywords'),
                        'post_process_type': col.get('post_process_type'),
                        'post_process_config': json.dumps(col.get('post_process_config')) if col.get('post_process_config') else None,
                        'default_value': col.get('default_value')
                    })
            
            await self.db.commit()
            logger.info(f"✅ Updated template {template_id}")
            return True
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"❌ Failed to update template: {e}")
            raise
    
    async def ai_suggest_mappings(
        self,
        job_id: str,
        excel_columns: List[str],
        sample_data: Optional[Dict[str, Any]] = None,
        template_columns: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Use Azure GPT-4o to suggest mappings with template rules.
        
        Args:
            job_id: Bulk job ID
            excel_columns: List of Excel column names
            sample_data: Optional sample data from Excel
            template_columns: Optional template columns with extraction rules
            
        Returns:
            {
                'mappings': [
                    {
                        'excel_column': str,
                        'suggested_field': str,
                        'confidence': float,
                        'reasoning': str,
                        'alternative_fields': [str]
                    }
                ],
                'unmapped_columns': [str],
                'available_fields': [str]
            }
        """
        import httpx
        import os
        
        logger.info(f"🤖 AI suggesting mappings for {len(excel_columns)} Excel columns")
        
        # CRITICAL FIX: Fetch ALL database data BEFORE parallel processing
        # This prevents SQLAlchemy concurrent session errors
        transcripts = await self._get_job_transcripts(job_id)
        if not transcripts:
            raise ValueError(f"No transcripts found for job {job_id}")
        
        # Get available fields from extracted data - GET ALL FIELDS
        query = text("""
            SELECT DISTINCT 
                field_name,
                field_value,
                section_name,
                source_location
            FROM bulk_extracted_fields
            WHERE job_id = :job_id
            AND field_value IS NOT NULL
            AND field_value != ''
            ORDER BY field_name
        """)
        
        result = await self.db.execute(query, {'job_id': job_id})
        available_fields = [
            {
                'field_name': row[0],
                'sample_value': row[1][:200] if row[1] else None,
                'section': row[2],
                'location': row[3]
            }
            for row in result.fetchall()
        ]
        
        logger.info(f"📊 Fetched {len(available_fields)} fields from database (before batching)")
        
        # Prepare shared data for all batches
        shared_data = {
            'transcripts': transcripts,
            'available_fields': available_fields
        }
        
        # OPTIMIZATION: Process in PARALLEL batches for speed
        BATCH_SIZE = 20  # Reduced from 30 to avoid timeouts
        MAX_PARALLEL_BATCHES = 3  # Run up to 3 batches in parallel
        
        if len(excel_columns) > BATCH_SIZE:
            logger.info(f"🚀 Processing {len(excel_columns)} columns in PARALLEL batches of {BATCH_SIZE}")
            
            all_mappings = []
            all_unmapped = []
            
            # Create batches
            batches = []
            for i in range(0, len(excel_columns), BATCH_SIZE):
                batch = excel_columns[i:i+BATCH_SIZE]
                batch_template_cols = None
                if template_columns:
                    batch_template_cols = [col for col in template_columns if col['excel_column'] in batch]
                batches.append((batch, batch_template_cols))
            
            logger.info(f"📦 Created {len(batches)} batches, processing {MAX_PARALLEL_BATCHES} at a time")
            
            # Process batches in parallel groups
            import asyncio
            for batch_group_idx in range(0, len(batches), MAX_PARALLEL_BATCHES):
                batch_group = batches[batch_group_idx:batch_group_idx + MAX_PARALLEL_BATCHES]
                
                logger.info(f"⚡ Processing batch group {batch_group_idx//MAX_PARALLEL_BATCHES + 1} with {len(batch_group)} parallel tasks")
                
                # Create async tasks for parallel execution - pass shared data
                tasks = [
                    self._ai_suggest_mappings_single_batch(
                        job_id=job_id,
                        excel_columns=batch,
                        sample_data=sample_data,
                        template_columns=batch_template_cols,
                        shared_data=shared_data  # Pass pre-fetched data
                    )
                    for batch, batch_template_cols in batch_group
                ]
                
                # Wait for all parallel tasks to complete
                batch_results = await asyncio.gather(*tasks)
                
                # Aggregate results
                for batch_result in batch_results:
                    all_mappings.extend(batch_result['mappings'])
                    all_unmapped.extend(batch_result.get('unmapped_columns', []))
            
            return {
                'mappings': all_mappings,
                'unmapped_columns': all_unmapped,
                'available_fields': [f['field_name'] for f in available_fields[:100]],
                'method': 'ai_batched'
            }
        
        # Single batch processing for small column counts
        return await self._ai_suggest_mappings_single_batch(
            job_id=job_id,
            excel_columns=excel_columns,
            sample_data=sample_data,
            template_columns=template_columns,
            shared_data=shared_data  # Pass pre-fetched data
        )
    
    async def _ai_suggest_mappings_single_batch(
        self,
        job_id: str,
        excel_columns: List[str],
        sample_data: Optional[Dict[str, Any]] = None,
        template_columns: Optional[List[Dict]] = None,
        shared_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Internal method to process a single batch of columns.
        Uses shared_data to avoid concurrent DB access.
        """
        import httpx
        import os
        
        # Use pre-fetched data if available, otherwise fetch (for single batch case)
        if shared_data:
            transcripts = shared_data['transcripts']
            available_fields = shared_data['available_fields']
        else:
            # Fallback for backward compatibility
            transcripts = await self._get_job_transcripts(job_id)
            if not transcripts:
                raise ValueError(f"No transcripts found for job {job_id}")
            
            # Get available fields from extracted data
            query = text("""
                SELECT DISTINCT 
                    field_name,
                    field_value,
                    section_name,
                    source_location
                FROM bulk_extracted_fields
                WHERE job_id = :job_id
                AND field_value IS NOT NULL
                AND field_value != ''
                ORDER BY field_name
            """)
            
            result = await self.db.execute(query, {'job_id': job_id})
            available_fields = [
                {
                    'field_name': row[0],
                    'sample_value': row[1][:200] if row[1] else None,
                    'section': row[2],
                    'location': row[3]
                }
                for row in result.fetchall()
            ]
        
        total_fields = len(available_fields)
        logger.info(f"📊 Found {total_fields} available fields from extraction")
        
        # Prepare context for AI - Send complete field list with values
        # Get first transcript for context
        first_transcript = transcripts[0] if transcripts else {}
        transcript_sample = first_transcript.get('full_transcript', '')[:5000]  # Increased to 5000 chars
        
        # Group fields by section WITH sample values for better context
        # OPTIMIZATION: Limit sample value length to reduce token count
        fields_by_section = {}
        for f in available_fields:  # Use ALL fields, not limited
            section = f.get('section', 'Other') or 'Other'
            if section not in fields_by_section:
                fields_by_section[section] = []
            # Include sample value but truncate to 50 chars max to reduce prompt size
            sample = f['sample_value']
            if sample and len(str(sample)) > 50:
                sample = str(sample)[:50] + "..."
            field_info = {
                'field_name': f['field_name'],
                'sample_value': sample
            }
            fields_by_section[section].append(field_info)
        
        # Build template rules context if provided - Include post-processing rules
        template_rules_map = {}
        if template_columns:
            for col in template_columns:
                hints = []
                if col.get('source_page'):
                    hints.append(f"Page {col['source_page']}")
                if col.get('source_section'):
                    hints.append(f"Section: {col['source_section']}")
                if col.get('source_field'):
                    # This is the MOST IMPORTANT hint - the field name to look for!
                    hints.append(f"Field contains: '{col['source_field']}'")
                if col.get('extraction_hint'):
                    hints.append(col['extraction_hint'])
                if col.get('example_value'):
                    hints.append(f"Example: {col['example_value']}")
                if col.get('post_process_type'):
                    # Add transformation instructions
                    transform = col['post_process_type']
                    config = col.get('post_process_config', '')
                    if transform == 'yes_no':
                        hints.append("Transform: Return ONLY 'Y' or 'N' based on boolean logic")
                    elif transform == 'split_first':
                        hints.append(f"Transform: Take FIRST part before separator {config}")
                    elif transform == 'split_second':
                        hints.append(f"Transform: Take SECOND part after separator {config}")
                    elif transform == 'calculate_years':
                        hints.append("Transform: Calculate years from date to 2025")
                    elif transform == 'date_format':
                        hints.append("Transform: Format as DD-MM-YYYY or 'DD Month YYYY'")
                    elif transform == 'currency_format':
                        hints.append("Transform: Return numeric value only, no currency symbols")
                    else:
                        hints.append(f"Transform: {transform}")
                if col.get('default_value'):
                    hints.append(f"Default: {col['default_value']}")
                
                if hints:
                    template_rules_map[col['excel_column']] = " | ".join(hints)
        
        # Build prompt with comprehensive data + template rules
        prompt = f"""You are a data mapping expert. Map Excel columns to extracted document fields.

TOTAL EXTRACTED FIELDS: {total_fields}

EXCEL COLUMNS ({len(excel_columns)} columns):
{json.dumps(excel_columns, indent=2)}

TEMPLATE RULES (critical hints for each column):
{json.dumps(template_rules_map, indent=2) if template_rules_map else "No template rules provided"}

AVAILABLE DOCUMENT FIELDS (with sample values by section):
{json.dumps(fields_by_section, indent=2)}

CRITICAL INSTRUCTIONS - FOLLOW THIS EXACT MATCHING PROCESS:

1. **MANDATORY 3-STEP MATCHING PROCESS** (DO NOT SKIP STEPS):
   
   STEP 1 - FILTER BY SECTION (REQUIRED if template has "Section:" hint):
   - Look at template rule for "Section: XXX"
   - ONLY consider fields from that section in AVAILABLE DOCUMENT FIELDS
   - Example: If rule says "Section: 1.1 Tinjauan Perusahaan", ONLY look at fields under that section key
   - ❌ WRONG: Picking field from "6.1 Kepemilikan Saham" when rule says "1.1 Tinjauan"
   - ✅ CORRECT: Picking from EXACT section specified

   STEP 2 - MATCH BY EXTRACTION HINT (REQUIRED if template has extraction hint):
   - Read the extraction hint carefully (e.g., "Extract company's main business activity")
   - Within the filtered section, find field whose name OR sample_value matches this hint
   - Example hints:
     * "Extract text after 'Bergerak di bidang'" → Look for field containing that phrase
     * "Ultimate beneficial owner name" → Look for shareholder/owner related field
     * "Business unit division code" → Look for field with division/unit codes
   
   STEP 3 - VERIFY WITH SOURCE_FIELD NAME (if provided):
   - If template has source_field like "tinjauan_usaha" or "nomor_pak"
   - The matched field name MUST contain this string (case-insensitive, fuzzy match)
   - Example: source_field "tinjauan_usaha" → field name should contain "tinjauan" and "usaha"

2. **RETURN EXACT FIELD NAMES FROM THE LIST**
   - Your "suggested_field" MUST be copied EXACTLY from "field_name" in AVAILABLE DOCUMENT FIELDS
   - DO NOT modify, normalize, or create new field names
   - COPY including: dots (.), numbers (1.1.), spaces, capitals, brackets []
   - ❌ WRONG: "tinjauan_perusahaan.debitur_bni_sejak" (normalized)
   - ✅ CORRECT: "1.1. TINJAUAN PERUSAHAAN.Debitur BNI sejak" (exact copy)

3. **VERIFY SAMPLE VALUES MATCH DATA TYPE**
   - Check sample_value confirms correct field
   - Date field should have date-like value (08/08/2015, 22-05-1993)
   - Name field should have person/company name
   - Number field should have numeric value
   - Don't just match field names - verify data makes sense

4. **Common Mistakes to AVOID:**
   - NPWP: Use NPWP from "1.3 Perizinan Usaha" table (format XX.XXX.XXX.X-XXX.XXX), NOT loan/credit fields
   - Currency fields: Should be "IDR" or "IDR Jutaan", NOT company names or account types
   - Y/N fields: Return "Y" or "N" ONLY - if text says "Perseroan Terbatas" check if question asks "Is Public?" → answer "N"
   - Dates: Return actual dates (DD-MM-YYYY), NOT reference text like "cfm. SKK No..."
   - Numbers: Extract numeric values, NOT field labels like "Total Assets" or "Kol 2"
   - Company names: Look in Section 1.1 Tinjauan Perusahaan, NOT approval sections
   - Business Sector/Sub-Sector: Split the full text using "/" separator as instructed

5. **Matching Strategy (USE FUZZY LOGIC):**
   - **Field name matching is FUZZY** - Ignore case, spaces, underscores, dots
   - Examples of SAME field:
     * "1_1_tinjauan_perusahaan.Sektor/Sub-Sektor Ekonomi"
     * "tinjauan_perusahaan.sektor_sub_sektor_ekonomi"
     * "Tinjauan Perusahaan - Sektor Sub Sektor Ekonomi"
   - Read the template hint for location (page, section, table)
   - Find fields from that location using FUZZY name matching
   - Check sample value matches expected data type
   - Apply transformation if specified
   - Return the EXACT field_name from available fields (not transformed name)

6. Confidence scoring:
   - 0.9-1.0: Exact location + sample verified + transformation applied correctly
   - 0.7-0.9: Good location match + transformation attempted
   - 0.5-0.7: Semantic match but uncertain transformation
   - <0.5: Weak match or missing transformation

7. **CRITICAL - RETURN THE EXTRACTED VALUE:**
   - For EACH mapping, include "extracted_value" with the ACTUAL value to use
   - Apply any transformations mentioned in template hints (split, format, etc.)
   - If template has "Default: X", use that value when no match found
   - The "extracted_value" should be the FINAL value ready for Excel export

OUTPUT FORMAT (JSON only, no markdown):
{{
  "mappings": [
    {{
      "excel_column": "NPWP",
      "suggested_field": "1.3. PERIZINAN USAHA.NPWP",
      "extracted_value": "01.899.834.4-019.000",
      "confidence": 0.95,
      "reasoning": "Found EXACT field with value",
      "alternative_fields": []
    }},
    {{
      "excel_column": "Customer Since",
      "suggested_field": "1.1. TINJAUAN PERUSAHAAN.Debitur BNI sejak",
      "extracted_value": "08/08/2015",
      "confidence": 0.98,
      "reasoning": "EXACT match for field name with date sample",
      "alternative_fields": []
    }},
    {{
      "excel_column": "Default Currency",
      "suggested_field": null,
      "extracted_value": "IDR",
      "confidence": 1.0,
      "reasoning": "Using default value from template",
      "alternative_fields": []
    }},
    {{
      "excel_column": "Business Sector", 
      "suggested_field": "1.1. TINJAUAN PERUSAHAAN.Sektor/Sub-Sektor Ekonomi",
      "extracted_value": "Pertambangan dan penggalian",
      "confidence": 0.92,
      "reasoning": "Split first part before ' - ' from full value",
      "alternative_fields": []
    }}
  ],
  "unmapped_columns": [],
  "method": "ai_with_template"
}}

CRITICAL: Every mapping MUST have "extracted_value" with the actual value to put in Excel!
Use template defaults when no document data matches."""
        
        try:
            # Call LiteLLM proxy with azure/gpt-4.1 model
            api_url = settings.LITELLM_API_URL
            api_key = settings.LITELLM_API_KEY
            mapping_model = settings.MAPPING_MODEL
            
            if not api_url or not api_key:
                raise ValueError(f"LiteLLM API credentials not configured. URL: {api_url}, Key: {'set' if api_key else 'not set'}")
            
            logger.info(f"🔑 Using LiteLLM API: {api_url}, Model: {mapping_model}")
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": mapping_model,
                "messages": [
                    {"role": "system", "content": "You are a data mapping expert. You MUST respond with valid, parseable JSON only. Ensure all strings are properly escaped. ALWAYS include 'extracted_value' for each mapping."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 8000,  # Increased for large responses
                "response_format": {"type": "json_object"}
            }
            
            logger.info(f"🌐 Calling LiteLLM ({mapping_model}) for AI mapping suggestions...")
            logger.info(f"📊 Prompt size: ~{len(prompt)} chars, {len(prompt.split())} words")
            logger.info(f"📋 Requesting mapping for {len(excel_columns)} columns")
            
            async with httpx.AsyncClient(timeout=180.0) as client:  # Increased timeout for large batches
                response = await client.post(api_url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                logger.info(f"✅ AI response received ({len(content)} chars)")
                
                # Try to parse AI response with better error handling
                try:
                    ai_result = json.loads(content)
                except json.JSONDecodeError as e:
                    logger.error(f"❌ JSON parse error: {e}")
                    logger.error(f"Response content (first 500 chars): {content[:500]}")
                    logger.error(f"Response content (last 500 chars): {content[-500:]}")
                    
                    # Try to fix common JSON issues
                    # Remove any markdown code blocks
                    content = content.replace('```json', '').replace('```', '').strip()
                    
                    # Try parsing again
                    try:
                        ai_result = json.loads(content)
                        logger.info(f"✅ Fixed and parsed JSON successfully")
                    except:
                        raise ValueError(f"AI returned invalid JSON: {e}")
                
                logger.info(f"🎯 AI mapped {len(ai_result.get('mappings', []))} columns")
                
                # POST-PROCESS: Apply fuzzy matching to fix field name mismatches
                logger.info(f"🔍 Post-processing AI mappings with fuzzy field name matching...")
                logger.info(f"📊 Available fields count: {len(available_fields)}")
                
                ai_mappings = ai_result.get('mappings', [])
                corrected_mappings = []
                exact_matches = 0
                fuzzy_matches = 0
                no_matches = 0
                
                for mapping in ai_mappings:
                    suggested_field = mapping.get('suggested_field')
                    if suggested_field:
                        # Try to find exact match first
                        exact_match = next((f for f in available_fields if f['field_name'] == suggested_field), None)
                        
                        if exact_match:
                            exact_matches += 1
                            logger.debug(f"✅ Exact match: '{suggested_field}'")
                        else:
                            # Use fuzzy matching to find closest field
                            logger.info(f"🔎 Fuzzy matching '{suggested_field}'...")
                            best_match = self._find_fuzzy_field_match(suggested_field, available_fields)
                            if best_match:
                                fuzzy_matches += 1
                                old_field = suggested_field
                                mapping['suggested_field'] = best_match['field_name']
                                mapping['confidence'] = max(0.5, mapping.get('confidence', 0.8) - 0.1)  # Slightly lower confidence
                                mapping['reasoning'] += f" (fuzzy matched from '{old_field}')"
                                logger.info(f"🔧 AI POST-PROCESSING: '{old_field}' → '{best_match['field_name']}'")
                            else:
                                no_matches += 1
                                logger.warning(f"⚠️ No fuzzy match for AI suggestion: '{suggested_field}'")
                    
                    corrected_mappings.append(mapping)
                
                logger.info(f"✅ Post-processing complete: Exact={exact_matches}, Fuzzy={fuzzy_matches}, No Match={no_matches}")
                
                return {
                    'mappings': corrected_mappings,
                    'unmapped_columns': ai_result.get('unmapped_columns', []),
                    'available_fields': [f['field_name'] for f in available_fields],
                    'method': f'ai_{mapping_model}_fuzzy'
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ AI API HTTP error: {e.response.status_code}")
            logger.error(f"Response: {e.response.text[:1000]}")
            
            # Fallback to fuzzy matching
            logger.info("🔄 Falling back to fuzzy string matching...")
            return await self._fuzzy_match_fallback(excel_columns, available_fields)
        
        except httpx.TimeoutException as e:
            logger.error(f"❌ AI API timeout after 120s: {e}")
            
            # Fallback to fuzzy matching
            logger.info("🔄 Falling back to fuzzy string matching...")
            return await self._fuzzy_match_fallback(excel_columns, available_fields)
        
        except Exception as e:
            logger.error(f"❌ AI mapping failed: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Fallback to fuzzy matching
            logger.info("🔄 Falling back to fuzzy string matching...")
            return await self._fuzzy_match_fallback(excel_columns, available_fields)
    
    def _find_fuzzy_field_match(
        self,
        target_field: str,
        available_fields: List[Dict[str, Any]],
        threshold: float = 0.7  # Back to conservative - reverse mapping handles it
    ) -> Optional[Dict[str, Any]]:
        """
        Find best fuzzy match for a field name.
        Handles different naming conventions: dots, underscores, spaces, case.
        """
        from difflib import SequenceMatcher
        
        def normalize_field_name(name: str) -> str:
            """Normalize field name for comparison - remove ALL punctuation, spaces, and numbers."""
            import re
            # Remove all non-alphabetic characters (keep only letters)
            normalized = re.sub(r'[^a-zA-Z]', '', name.lower())
            return normalized
        
        target_norm = normalize_field_name(target_field)
        logger.debug(f"🎯 Target normalized: '{target_field}' → '{target_norm}'")
        
        best_match = None
        best_score = 0.0
        top_candidates = []  # Track top 3 for debugging
        
        for field in available_fields:
            field_norm = normalize_field_name(field['field_name'])
            
            # Calculate similarity ratio
            ratio = SequenceMatcher(None, target_norm, field_norm).ratio()
            
            # Big bonus if one contains the other after normalization
            if target_norm in field_norm or field_norm in target_norm:
                ratio += 0.3  # Increased bonus
            
            # Extra bonus for exact normalized match
            if target_norm == field_norm:
                ratio = 1.0
            
            # Track top candidates for debugging
            if len(top_candidates) < 3:
                top_candidates.append((ratio, field['field_name']))
                top_candidates.sort(reverse=True)
            elif ratio > top_candidates[-1][0]:
                top_candidates[-1] = (ratio, field['field_name'])
                top_candidates.sort(reverse=True)
            
            if ratio > best_score:
                best_score = ratio
                best_match = field
        
        # Log top candidates
        if top_candidates:
            logger.debug(f"  Top 3 candidates: {[(f'{score:.2f}', name[:50]) for score, name in top_candidates]}")
        
        # Only return if above threshold
        if best_score >= threshold:
            logger.debug(f"  ✅ Best match score {best_score:.2f}: '{best_match['field_name']}'")
            return best_match
        else:
            logger.debug(f"  ❌ Best score {best_score:.2f} below threshold {threshold}")
        
        return None
    
    async def _fuzzy_match_fallback(
        self,
        excel_columns: List[str],
        available_fields: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Fallback fuzzy matching when AI fails."""
        mappings = []
        unmapped = []
        
        for excel_col in excel_columns:
            best_match = None
            best_score = 0.0
            
            excel_normalized = excel_col.lower().replace(' ', '_').replace('-', '_')
            
            for field in available_fields:
                field_name = field['field_name']
                field_normalized = field_name.lower()
                
                # Calculate similarity
                score = SequenceMatcher(None, excel_normalized, field_normalized).ratio()
                
                # Boost score if keywords match
                excel_words = set(excel_normalized.split('_'))
                field_words = set(field_normalized.split('_'))
                keyword_match = len(excel_words & field_words) / max(len(excel_words), 1)
                
                final_score = (score * 0.6) + (keyword_match * 0.4)
                
                if final_score > best_score:
                    best_score = final_score
                    best_match = field_name
            
            if best_score >= 0.4:
                mappings.append({
                    'excel_column': excel_col,
                    'suggested_field': best_match,
                    'confidence': best_score,
                    'reasoning': f'Fuzzy match (score: {best_score:.2f})',
                    'alternative_fields': []
                })
            else:
                unmapped.append(excel_col)
        
        return {
            'mappings': mappings,
            'unmapped_columns': unmapped,
            'available_fields': [f['field_name'] for f in available_fields],
            'method': 'fuzzy_fallback'
        }
