"""
Generic Post-Processing Service
Applies template-defined transformations to extracted field values
"""

import json
import re
import logging
from typing import Any, Optional, Dict
from datetime import datetime

logger = logging.getLogger(__name__)


class PostProcessor:
    """
    Generic post-processor that applies transformations based on template rules.
    Fully template-driven - no hardcoded logic for specific documents.
    """
    
    @staticmethod
    def apply(
        value: Any,
        post_process_type: Optional[str],
        post_process_config: Optional[str] = None
    ) -> Any:
        """
        Apply post-processing transformation to a value.
        
        Args:
            value: Raw extracted value
            post_process_type: Type of transformation (yes_no, split_first, etc.)
            post_process_config: JSON config string with transformation parameters
            
        Returns:
            Transformed value
        """
        if not post_process_type or value is None:
            return value
        
        try:
            # Parse config if provided
            config = {}
            if post_process_config:
                # Handle both dict (from JSONB column) and string (from JSON field)
                if isinstance(post_process_config, dict):
                    config = post_process_config
                elif isinstance(post_process_config, str):
                    try:
                        config = json.loads(post_process_config)
                    except json.JSONDecodeError:
                        logger.warning(f"Invalid post_process_config JSON: {post_process_config}")
            
            # Apply transformation based on type
            if post_process_type == "yes_no":
                return PostProcessor._transform_yes_no(value, config)
            
            elif post_process_type == "split_first":
                return PostProcessor._transform_split_first(value, config)
            
            elif post_process_type == "split_second":
                return PostProcessor._transform_split_second(value, config)
            
            elif post_process_type == "date_format":
                return PostProcessor._transform_date_format(value, config)
            
            elif post_process_type == "calculate_years":
                return PostProcessor._transform_calculate_years(value, config)
            
            elif post_process_type == "calculate_years_from_date":
                return PostProcessor._transform_calculate_years_from_date(value, config)
            
            elif post_process_type == "currency_format":
                return PostProcessor._transform_currency_format(value, config)
            
            elif post_process_type == "extract_regex":
                return PostProcessor._transform_extract_regex(value, config)
            
            elif post_process_type == "lookup":
                return PostProcessor._transform_lookup(value, config)
            
            elif post_process_type == "extract_nik_dob":
                return PostProcessor._transform_extract_nik_dob(value, config)
            
            elif post_process_type == "derived_from_segment":
                return PostProcessor._transform_derived_from_segment(value, config)
            
            elif post_process_type == "remove_chars":
                return PostProcessor._transform_remove_chars(value, config)
            
            elif post_process_type == "extract_province":
                return PostProcessor._transform_extract_province(value, config)
            
            elif post_process_type == "extract_city":
                return PostProcessor._transform_extract_city(value, config)
            
            elif post_process_type == "default_value":
                return PostProcessor._transform_default_value(value, config)
            
            elif post_process_type == "extract_keyword":
                return PostProcessor._transform_extract_keyword(value, config)
            
            elif post_process_type == "convert_date_format":
                return PostProcessor._transform_convert_date_format(value, config)
            
            elif post_process_type == "boolean_yes_no":
                return PostProcessor._transform_boolean_yes_no(value, config)
            
            elif post_process_type == "strip_currency_unit":
                return PostProcessor._transform_strip_currency_unit(value, config)
            
            elif post_process_type == "normalize_npwp":
                return PostProcessor._transform_normalize_npwp(value, config)
            
            elif post_process_type == "handle_empty_dash":
                return PostProcessor._transform_handle_empty_dash(value, config)
            
            elif post_process_type == "extract_reference_number":
                return PostProcessor._transform_extract_reference_number(value, config)
            
            elif post_process_type == "extract_number":
                return PostProcessor._transform_extract_number(value, config)
            
            elif post_process_type == "remove_prefix":
                return PostProcessor._transform_remove_prefix(value, config)
            
            elif post_process_type == "remove_suffix":
                return PostProcessor._transform_remove_suffix(value, config)
            
            else:
                logger.warning(f"Unknown post_process_type: {post_process_type}")
                return value
        
        except Exception as e:
            logger.error(f"Error applying post-processing ({post_process_type}): {e}")
            return value
    
    @staticmethod
    def _transform_yes_no(value: Any, config: Dict) -> str:
        """
        Convert value to Y/N based on keyword matching.
        
        Config:
            true_keywords: List of keywords that indicate "Y"
            false_keywords: List of keywords that indicate "N"
            default: Default value if no match (default: "N")
        """
        value_str = str(value).lower().strip()
        
        # Empty or dash means N
        if not value_str or value_str == '-' or value_str == 'none':
            return config.get('default', 'N')
        
        true_keywords = config.get('true_keywords', [])
        false_keywords = config.get('false_keywords', [])
        
        # Check for false keywords FIRST (more specific, like "tidak tersangkut")
        for keyword in false_keywords:
            if keyword.lower() in value_str:
                return "N"
        
        # Then check for true keywords
        for keyword in true_keywords:
            if keyword.lower() in value_str:
                return "Y"
        
        # Default based on common patterns (but check negative patterns first!)
        # Check negative patterns first (more specific)
        if any(word in value_str for word in ['tidak tersangkut', 'tidak ada', 'belum', 'lancar', 'private', 'tertutup', 'green', 'bahwa debitur']):
            return "N"
        # Then check positive patterns
        if any(word in value_str for word in ['yes', 'ya', 'ada', 'tersangkut', 'tbk', 'public', 'high', 'red']):
            return "Y"
        
        return config.get('default', 'N')  # Default to N if uncertain
    
    @staticmethod
    def _transform_split_first(value: Any, config: Dict) -> str:
        """
        Split value by separator and return first part.
        
        Config:
            separator: Character to split by (default: "/")
        """
        separator = config.get('separator', '/')
        value_str = str(value)
        parts = value_str.split(separator)
        return parts[0].strip() if parts else value_str
    
    @staticmethod
    def _transform_split_second(value: Any, config: Dict) -> str:
        """
        Split value by separator and return second part.
        
        Config:
            separator: Character to split by (default: "/")
        """
        separator = config.get('separator', '/')
        value_str = str(value)
        parts = value_str.split(separator)
        return parts[1].strip() if len(parts) > 1 else value_str
    
    @staticmethod
    def _transform_date_format(value: Any, config: Dict) -> str:
        """
        Parse and reformat date to standard format.
        Tries multiple common date formats.
        """
        value_str = str(value).strip()
        
        if not value_str or value_str == '-':
            return ""
        
        # Already in correct format
        if re.match(r'\d{2}-\d{2}-\d{4}', value_str):
            return value_str
        
        # Try parsing various formats
        date_formats = [
            '%d-%m-%Y',
            '%d/%m/%Y',
            '%Y-%m-%d',
            '%d %B %Y',
            '%d %b %Y',
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(value_str, fmt)
                return dt.strftime('%d-%m-%Y')
            except ValueError:
                continue
        
        # If can't parse, return as-is
        return value_str
    
    @staticmethod
    def _transform_calculate_years(value: Any, config: Dict) -> str:
        """
        Calculate years from a date to current year or specified year.
        
        Config:
            to: Target year or "now" (default: "now")
            from_field: If provided, indicates this is a field reference
        """
        value_str = str(value).strip()
        
        if not value_str or value_str == '-':
            return ""
        
        # Extract year from value
        year_match = re.search(r'\b(19|20)\d{2}\b', value_str)
        if not year_match:
            return value_str
        
        from_year = int(year_match.group(0))
        to_year = config.get('base_year', datetime.now().year)
        
        if config.get('to') == 'now':
            to_year = datetime.now().year
        
        years = to_year - from_year
        return f"{years} years" if years != 1 else "1 year"
    
    @staticmethod
    def _transform_calculate_years_from_date(value: Any, config: Dict) -> str:
        """
        Calculate years from date to base year.
        
        Config:
            base_year: Year to calculate to (default: current year)
        """
        return PostProcessor._transform_calculate_years(value, config)
    
    @staticmethod
    def _transform_currency_format(value: Any, config: Dict) -> str:
        """
        Extract numeric value from currency/number field.
        Removes currency symbols, text, and formats properly.
        """
        value_str = str(value)
        
        # Extract all numbers (including decimals)
        numbers = re.findall(r'\d+[,.]?\d*', value_str)
        if not numbers:
            return value_str
        
        # Join and clean
        number_str = ''.join(numbers)
        number_str = number_str.replace(',', '.')
        
        try:
            # Format with thousand separators
            num = float(number_str)
            if num.is_integer():
                return f"{int(num):,}".replace(',', '.')
            else:
                return f"{num:,.3f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        except ValueError:
            return value_str
    
    @staticmethod
    def _transform_extract_regex(value: Any, config: Dict) -> str:
        """
        Extract value using regex pattern.
        
        Config:
            pattern: Regex pattern with capture group
            last: If true, get last match (default: first match)
        """
        value_str = str(value)
        pattern = config.get('pattern')
        
        if not pattern:
            return value_str
        
        matches = re.findall(pattern, value_str)
        if not matches:
            return value_str
        
        if config.get('last'):
            return matches[-1] if matches else value_str
        
        return matches[0] if matches else value_str
    
    @staticmethod
    def _transform_lookup(value: Any, config: Dict) -> str:
        """
        Lookup value in mapping table.
        
        Config:
            lookup_map: Dict of value mappings
            default: Default value if not found
        """
        value_str = str(value).strip()
        
        # Direct lookup
        if value_str in config:
            return config[value_str]
        
        # Case-insensitive lookup
        for key, val in config.items():
            if key.lower() in value_str.lower():
                return val
        
        # Default
        return config.get('default', value_str)
    
    @staticmethod
    def _transform_extract_nik_dob(value: Any, config: Dict) -> str:
        """
        Extract date of birth from NIK (Indonesian ID number).
        
        NIK format: PPPPPPDDMMYYXXXX
        Where DDMMYY is the date of birth
        
        Config:
            format: Output date format (default: DD-MM-YYYY)
            nik_position: Position range for date extraction
        """
        value_str = str(value).strip()
        
        # NIK is 16 digits
        if len(value_str) != 16 or not value_str.isdigit():
            return ""
        
        try:
            # Extract DDMMYY from positions 6-12
            day = int(value_str[6:8])
            month = int(value_str[8:10])
            year = int(value_str[10:12])
            
            # Adjust day for female (40+ added to day)
            if day > 40:
                day -= 40
            
            # Determine century
            current_year = datetime.now().year % 100
            if year > current_year:
                year += 1900
            else:
                year += 2000
            
            return f"{day:02d}-{month:02d}-{year}"
        except (ValueError, IndexError):
            return ""
    
    @staticmethod
    def _transform_derived_from_segment(value: Any, config: Dict) -> str:
        """
        Derive value based on customer segment field.
        Used for fields that depend on other field values.
        
        For now, returns empty - needs context from other fields
        """
        # This would need access to other fields in the row
        # For now, return as-is
        return str(value) if value else ""
    
    @staticmethod
    def _transform_remove_chars(value: Any, config: Dict) -> str:
        """
        Remove specified characters from value.
        
        Config:
            chars_to_remove: String of characters to remove
        """
        if not value:
            return ""
        
        value_str = str(value)
        chars_to_remove = config.get('chars_to_remove', '')
        
        for char in chars_to_remove:
            value_str = value_str.replace(char, '')
        
        return value_str.strip()
    
    @staticmethod
    def _transform_extract_province(value: Any, config: Dict) -> str:
        """
        Extract province from full address.
        
        Config:
            pattern: Regex pattern to extract province (default: looks after "Prov.")
            default: Default value if not found
        """
        if not value:
            return config.get('default', '')
        
        value_str = str(value)
        pattern = config.get('pattern', r'Prov\.?\s*([^,\n]+)')
        
        try:
            match = re.search(pattern, value_str, re.IGNORECASE)
            if match:
                return match.group(1).strip()
            
            # Fallback: check for common province names
            provinces = ['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 
                        'Banten', 'Bali', 'Sumatera Utara', 'Kepulauan Bangka Belitung']
            for prov in provinces:
                if prov.lower() in value_str.lower():
                    return prov
            
            return config.get('default', '')
        except Exception as e:
            logger.error(f"Error extracting province: {e}")
            return config.get('default', '')
    
    @staticmethod
    def _transform_extract_city(value: Any, config: Dict) -> str:
        """
        Extract city from full address.
        
        Config:
            pattern: Regex pattern to extract city (default: looks before "Prov")
            default: Default value if not found
        """
        if not value:
            return config.get('default', '')
        
        value_str = str(value)
        pattern = config.get('pattern', r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+Prov')
        
        try:
            match = re.search(pattern, value_str)
            if match:
                return match.group(1).strip()
            
            # Fallback: check for common city names
            cities = ['Jakarta Selatan', 'Jakarta Pusat', 'Jakarta Utara', 'Jakarta Timur',
                     'Jakarta Barat', 'Bandung', 'Surabaya', 'Semarang', 'Medan']
            for city in cities:
                if city.lower() in value_str.lower():
                    return city
            
            return config.get('default', '')
        except Exception as e:
            logger.error(f"Error extracting city: {e}")
            return config.get('default', '')
    
    @staticmethod
    def _transform_default_value(value: Any, config: Dict) -> str:
        """
        Return a default value regardless of input.
        
        Config:
            value: The default value to return
        """
        return config.get('value', '')
    
    @staticmethod
    def _transform_extract_keyword(value: Any, config: Dict) -> str:
        """
        Extract key words/phrases from longer text.
        
        Config:
            max_words: Maximum number of words to extract (default: 3)
            delimiter: Word delimiter (default: space)
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        max_words = config.get('max_words', 3)
        
        # Split by delimiter and take first N words
        words = value_str.split()
        return ' '.join(words[:max_words]) if len(words) > max_words else value_str
    
    @staticmethod
    def _transform_remove_chars(value: Any, config: Dict) -> str:
        """
        Remove specific characters from a value.
        
        Config:
            chars: String of characters to remove (e.g., ".,-")
            replace_with: String to replace with (default: "")
        """
        value_str = str(value)
        chars_to_remove = config.get('chars', '')
        replace_with = config.get('replace_with', '')
        
        for char in chars_to_remove:
            value_str = value_str.replace(char, replace_with)
        
        return value_str.strip()
    
    @staticmethod
    def _transform_convert_date_format(value: Any, config: Dict) -> str:
        """
        Convert date format from DD-MM-YYYY to DD/MM/YYYY or other formats.
        
        Config:
            from_format: Input date format (default: "DD-MM-YYYY")
            to_format: Output date format (default: "DD/MM/YYYY")
        """
        if not value or value == '-':
            return ''
        
        value_str = str(value).strip()
        from_format = config.get('from_format', 'DD-MM-YYYY')
        to_format = config.get('to_format', 'DD/MM/YYYY')
        
        # Simple replacement for common cases
        if from_format == 'DD-MM-YYYY' and to_format == 'DD/MM/YYYY':
            # Replace hyphens with slashes
            return value_str.replace('-', '/')
        
        return value_str
    
    @staticmethod
    def _transform_boolean_yes_no(value: Any, config: Dict) -> str:
        """
        Convert Y/N to Yes/No format.
        
        Config:
            empty_value: What to return for empty values (default: "No")
        """
        if not value:
            return config.get('empty_value', 'No')
        
        value_str = str(value).strip().upper()
        
        if value_str in ['Y', 'YES', 'YA', 'TRUE', '1']:
            return 'Yes'
        elif value_str in ['N', 'NO', 'TIDAK', 'FALSE', '0', '-']:
            return 'No'
        
        return config.get('empty_value', 'No')
    
    @staticmethod
    def _transform_strip_currency_unit(value: Any, config: Dict) -> str:
        """
        Remove currency unit suffixes like 'Jutaan', 'Juta', 'Ribuan', etc.
        
        Config:
            units: List of unit suffixes to remove (default: common Indonesian units)
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        units = config.get('units', ['Jutaan', 'Juta', 'Ribuan', 'Ribu', 'Miliar', 'Milyar'])
        
        for unit in units:
            value_str = value_str.replace(f' {unit}', '').replace(unit, '')
        
        return value_str.strip()
    
    @staticmethod
    def _transform_normalize_npwp(value: Any, config: Dict) -> str:
        """
        Normalize NPWP format - remove hyphens and format as numeric.
        
        Config:
            output_format: "numeric" (remove hyphens) or "formatted" (add hyphens)
            add_decimal: Whether to add .0 at end (default: True for Excel compatibility)
        """
        if not value or value == '-':
            return ''
        
        value_str = str(value).strip()
        output_format = config.get('output_format', 'numeric')
        add_decimal = config.get('add_decimal', True)
        
        # Remove all hyphens and dots
        clean_value = value_str.replace('-', '').replace('.', '')
        
        if output_format == 'numeric':
            # Just numbers
            if add_decimal:
                return f"{clean_value}.0"
            return clean_value
        
        return value_str
    
    @staticmethod
    def _transform_handle_empty_dash(value: Any, config: Dict) -> str:
        """
        Convert dash (-) to empty string for empty fields.
        
        Config:
            dash_chars: Characters to treat as empty (default: ["-", "–", "—"])
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        dash_chars = config.get('dash_chars', ['-', '–', '—', 'n/a', 'N/A'])
        
        if value_str in dash_chars:
            return ''
        
        return value_str
    
    @staticmethod
    def _transform_extract_reference_number(value: Any, config: Dict) -> str:
        """
        Extract reference number like "Surat No. XXX" from text.
        
        Config:
            pattern: Regex pattern to match (default: Surat No. pattern)
            return_group: Which regex group to return (default: 0 for full match)
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        pattern = config.get('pattern', r'Surat No\.\s*[\w\d/\-]+')
        return_group = config.get('return_group', 0)
        
        match = re.search(pattern, value_str, re.IGNORECASE)
        if match:
            return match.group(return_group)
        
        return value_str
    
    @staticmethod
    def _transform_extract_number(value: Any, config: Dict) -> str:
        """
        Extract only numeric part from text, removing words like "years", "months", etc.
        
        Config:
            pattern: Custom regex pattern (default: extracts first number)
        
        Example: "32 years" → "32"
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        
        # Use custom pattern if provided
        pattern = config.get('pattern', r'(\d+(?:\.\d+)?)')
        
        match = re.search(pattern, value_str)
        if match:
            return match.group(1)
        
        return value_str
    
    @staticmethod
    def _transform_remove_prefix(value: Any, config: Dict) -> str:
        """
        Remove specified prefix from value.
        
        Config:
            prefix: Prefix to remove (e.g., "SEGMEN ")
            case_sensitive: Whether matching is case sensitive (default: False)
        
        Example: "SEGMEN COMMERCIAL" → "COMMERCIAL"
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        prefix = config.get('prefix', '')
        case_sensitive = config.get('case_sensitive', False)
        
        if not prefix:
            return value_str
        
        if case_sensitive:
            if value_str.startswith(prefix):
                return value_str[len(prefix):].strip()
        else:
            if value_str.lower().startswith(prefix.lower()):
                return value_str[len(prefix):].strip()
        
        return value_str
    
    @staticmethod
    def _transform_remove_suffix(value: Any, config: Dict) -> str:
        """
        Remove specified suffix from value.
        
        Config:
            suffix: Suffix to remove (e.g., " years")
            case_sensitive: Whether matching is case sensitive (default: False)
        
        Example: "32 years" → "32"
        """
        if not value:
            return ''
        
        value_str = str(value).strip()
        suffix = config.get('suffix', '')
        case_sensitive = config.get('case_sensitive', False)
        
        if not suffix:
            return value_str
        
        if case_sensitive:
            if value_str.endswith(suffix):
                return value_str[:-len(suffix)].strip()
        else:
            if value_str.lower().endswith(suffix.lower()):
                return value_str[:-len(suffix)].strip()
        
        return value_str

