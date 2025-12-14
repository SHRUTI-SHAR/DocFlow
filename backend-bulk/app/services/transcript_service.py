"""
Transcript Generation Service
Generates human-readable transcripts from extracted document data
"""

import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class TranscriptService:
    """
    Service for generating searchable transcripts from extracted document data.
    
    Transcript format:
    - Human-readable text representation of all extracted data
    - Includes page numbers, section names, and field locations
    - Optimized for keyword search during template mapping
    """
    
    def __init__(self):
        pass
    
    def generate_transcript(
        self,
        extracted_pages: List[Dict[str, Any]],
        document_name: str
    ) -> Dict[str, Any]:
        """
        Generate complete transcript from extracted page data.
        
        Args:
            extracted_pages: List of page extraction results
            document_name: Name of the document
            
        Returns:
            {
                'full_transcript': str,
                'page_transcripts': list,
                'section_index': dict,
                'field_locations': dict,
                'total_pages': int,
                'total_sections': int
            }
        """
        start_time = datetime.now()
        
        transcript_lines = []
        page_transcripts = []
        section_index = {}  # {section_name: {page: int, fields: [field_names]}}
        field_locations = {}  # {field_name: {page: int, section: str, context: str}}
        
        total_sections = 0
        current_section = None
        
        transcript_lines.append(f"=== DOCUMENT: {document_name} ===\n")
        
        for page_data in extracted_pages:
            page_num = page_data.get('page_number', 0)
            
            if 'error' in page_data:
                # Skip failed pages
                logger.warning(f"Skipping page {page_num} due to error: {page_data.get('error')}")
                continue
            
            hierarchical_data = page_data.get('hierarchical_data', {})
            if not hierarchical_data or not isinstance(hierarchical_data, dict):
                continue
            
            # Generate page transcript
            page_transcript_lines = []
            page_transcript_lines.append(f"\n--- PAGE {page_num} ---\n")
            
            # Process hierarchical data
            page_fields = self._process_hierarchical_data(
                data=hierarchical_data,
                page_num=page_num,
                transcript_lines=page_transcript_lines,
                section_index=section_index,
                field_locations=field_locations,
                prefix=""
            )
            
            total_sections += len(page_fields.get('sections', []))
            
            # Store page transcript
            page_transcript_text = ''.join(page_transcript_lines)
            page_transcripts.append({
                'page': page_num,
                'transcript': page_transcript_text
            })
            
            transcript_lines.extend(page_transcript_lines)
        
        # Combine full transcript
        full_transcript = ''.join(transcript_lines)
        
        generation_time = (datetime.now() - start_time).total_seconds() * 1000
        
        logger.info(
            f"📝 Generated transcript for {document_name}: "
            f"{len(extracted_pages)} pages, {total_sections} sections, "
            f"{len(field_locations)} fields in {generation_time:.0f}ms"
        )
        
        return {
            'full_transcript': full_transcript,
            'page_transcripts': page_transcripts,
            'section_index': section_index,
            'field_locations': field_locations,
            'total_pages': len(extracted_pages),
            'total_sections': total_sections,
            'generation_time_ms': int(generation_time)
        }
    
    def _process_hierarchical_data(
        self,
        data: Any,
        page_num: int,
        transcript_lines: List[str],
        section_index: Dict,
        field_locations: Dict,
        prefix: str = "",
        current_section: str = None
    ) -> Dict[str, Any]:
        """
        Recursively process hierarchical data and generate transcript.
        
        Returns:
            {
                'sections': [section_names],
                'field_count': int
            }
        """
        sections_found = []
        field_count = 0
        
        if data is None:
            return {'sections': sections_found, 'field_count': 0}
        
        if isinstance(data, dict):
            # Check for special metadata keys
            if '_type' in data:
                # Typed field - handle specially
                field_type = data.get('_type')
                field_value = data.get('value')
                
                if field_type == 'table' and isinstance(field_value, list):
                    # Table data
                    section_name = current_section or prefix or 'table'
                    transcript_lines.append(f"\n  Table: {prefix}\n")
                    
                    for idx, row in enumerate(field_value):
                        if isinstance(row, dict):
                            row_text = "    " + ", ".join([f"{k}={v}" for k, v in row.items() if v])
                            transcript_lines.append(row_text + "\n")
                    
                    field_count += len(field_value)
                else:
                    # Regular typed field
                    field_name = prefix if prefix else 'value'
                    value_str = str(field_value) if field_value is not None else ''
                    
                    if value_str:
                        transcript_lines.append(f"  {field_name}: {value_str}\n")
                        
                        # Store field location
                        field_locations[field_name] = {
                            'page': page_num,
                            'section': current_section or 'unknown',
                            'context': value_str[:100]  # First 100 chars as context
                        }
                        field_count += 1
                
                return {'sections': sections_found, 'field_count': field_count}
            
            # Regular dictionary - process each key
            for key, value in data.items():
                # Skip metadata keys
                if key.startswith('_'):
                    continue
                
                # Determine if this is a new section (top-level keys are usually sections)
                is_section = not prefix and not key.startswith('[')
                new_prefix = f"{prefix}.{key}" if prefix else key
                
                if is_section:
                    # New section found
                    section_name = key
                    current_section = section_name
                    sections_found.append(section_name)
                    
                    # Format section name nicely
                    formatted_section = section_name.replace('_', ' ').title()
                    transcript_lines.append(f"\n[{formatted_section}]\n")
                    
                    # Add to section index
                    if section_name not in section_index:
                        section_index[section_name] = {
                            'pages': [],
                            'fields': []
                        }
                    
                    if page_num not in section_index[section_name]['pages']:
                        section_index[section_name]['pages'].append(page_num)
                
                # Recurse into value
                result = self._process_hierarchical_data(
                    data=value,
                    page_num=page_num,
                    transcript_lines=transcript_lines,
                    section_index=section_index,
                    field_locations=field_locations,
                    prefix=new_prefix,
                    current_section=current_section
                )
                
                sections_found.extend(result['sections'])
                field_count += result['field_count']
                
                # Add field to section index
                if is_section and current_section and current_section in section_index:
                    section_index[current_section]['fields'].append(new_prefix)
        
        elif isinstance(data, list):
            # Array - process each item
            if len(data) == 0:
                return {'sections': sections_found, 'field_count': 0}
            
            # Check if this is a table (list of dicts with same keys)
            if all(isinstance(item, dict) for item in data):
                # Treat as table
                transcript_lines.append(f"\n  Table: {prefix} ({len(data)} rows)\n")
                
                for idx, row in enumerate(data):
                    row_prefix = f"{prefix}[{idx}]"
                    result = self._process_hierarchical_data(
                        data=row,
                        page_num=page_num,
                        transcript_lines=transcript_lines,
                        section_index=section_index,
                        field_locations=field_locations,
                        prefix=row_prefix,
                        current_section=current_section
                    )
                    field_count += result['field_count']
            else:
                # Simple list
                for idx, item in enumerate(data):
                    item_prefix = f"{prefix}[{idx}]"
                    result = self._process_hierarchical_data(
                        data=item,
                        page_num=page_num,
                        transcript_lines=transcript_lines,
                        section_index=section_index,
                        field_locations=field_locations,
                        prefix=item_prefix,
                        current_section=current_section
                    )
                    field_count += result['field_count']
        
        else:
            # Primitive value (string, number, bool)
            field_name = prefix if prefix else 'value'
            value_str = str(data) if data is not None else ''
            
            if value_str:
                # Add to transcript
                transcript_lines.append(f"  {field_name}: {value_str}\n")
                
                # Store field location
                field_locations[field_name] = {
                    'page': page_num,
                    'section': current_section or 'unknown',
                    'context': value_str[:100]
                }
                
                field_count += 1
        
        return {'sections': sections_found, 'field_count': field_count}
    
    def generate_field_metadata(
        self,
        field_name: str,
        field_value: Any,
        page_num: int,
        section_name: str = None
    ) -> Dict[str, str]:
        """
        Generate metadata for a single field (for storing with extracted_fields).
        
        Returns:
            {
                'section_name': str,
                'source_location': str,
                'extraction_context': str
            }
        """
        # Format source location
        if section_name:
            source_location = f"Page {page_num}, Section: {section_name}"
        else:
            source_location = f"Page {page_num}"
        
        # Extract context (first 200 chars of value)
        value_str = str(field_value) if field_value is not None else ''
        extraction_context = value_str[:200] if value_str else None
        
        return {
            'section_name': section_name or 'unknown',
            'source_location': source_location,
            'extraction_context': extraction_context
        }
