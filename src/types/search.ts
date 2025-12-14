// ============= Advanced Search Types =============

export type SearchOperator = 'AND' | 'OR' | 'NOT';

export type SearchFieldType = 
  | 'any'
  | 'title'
  | 'content'
  | 'description'
  | 'tags'
  | 'author'
  | 'comments'
  | 'metadata';

export type DateRangePreset = 
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'custom';

export type FileSizeUnit = 'KB' | 'MB' | 'GB';

export type SortField = 
  | 'relevance'
  | 'date_modified'
  | 'date_created'
  | 'title'
  | 'size'
  | 'type';

export type SortDirection = 'asc' | 'desc';

// Search token types for parsing
export interface SearchToken {
  type: 'term' | 'phrase' | 'operator' | 'field' | 'exclude' | 'wildcard' | 'group';
  value: string;
  field?: SearchFieldType;
  operator?: SearchOperator;
  negated?: boolean;
}

// Parsed search query
export interface ParsedSearchQuery {
  tokens: SearchToken[];
  phrases: string[];
  excludedTerms: string[];
  fieldFilters: Record<SearchFieldType, string[]>;
  hasWildcard: boolean;
  rawQuery: string;
}

// Search filter options
export interface SearchFilters {
  // Date filters
  dateRange?: DateRangePreset;
  customDateStart?: string;
  customDateEnd?: string;
  
  // File type filters
  fileTypes?: string[];
  mimeTypes?: string[];
  
  // Size filters
  minSize?: number;
  maxSize?: number;
  sizeUnit?: FileSizeUnit;
  
  // Location filters
  folderId?: string;
  includeSubfolders?: boolean;
  
  // Status filters
  status?: ('active' | 'archived' | 'draft' | 'locked')[];
  
  // Owner/Author filters
  ownerId?: string;
  sharedWithMe?: boolean;
  
  // Tag filters
  tags?: string[];
  tagMatchMode?: 'all' | 'any';
  
  // Template filters
  templateId?: string;
  hasTemplate?: boolean;
  
  // Version filters
  versionRange?: { min?: number; max?: number };
  
  // Custom metadata filters
  metadata?: Record<string, string | number | boolean>;
}

// Search result item
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  content?: string;
  file_type?: string;
  file_name?: string;
  file_size?: number;
  folder_id?: string;
  folder_path?: string;
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  template_id?: string;
  template_name?: string;
  status?: string;
  version?: number;
  
  // Search-specific fields
  relevanceScore: number;
  matchedFields: string[];
  highlights: SearchHighlight[];
  snippet?: string;
}

// Text highlighting for search results
export interface SearchHighlight {
  field: string;
  fragments: string[];
  matchedTerms: string[];
}

// Search response
export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  query: ParsedSearchQuery;
  filters: SearchFilters;
  executionTimeMs: number;
  facets?: SearchFacets;
  suggestions?: SearchSuggestion[];
}

// Faceted search results
export interface SearchFacets {
  fileTypes: FacetItem[];
  folders: FacetItem[];
  tags: FacetItem[];
  dateRanges: FacetItem[];
  owners: FacetItem[];
  templates: FacetItem[];
  status: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
}

// Search suggestions (autocomplete)
export interface SearchSuggestion {
  type: 'term' | 'phrase' | 'operator' | 'filter' | 'recent' | 'saved';
  value: string;
  label: string;
  description?: string;
  icon?: string;
  score?: number;
}

// Saved search
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  sortField: SortField;
  sortDirection: SortDirection;
  userId: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount?: number;
}

// Recent search
export interface RecentSearch {
  id: string;
  query: string;
  filters?: SearchFilters;
  timestamp: string;
  resultCount: number;
}

// Search history entry
export interface SearchHistoryEntry {
  id: string;
  query: string;
  filters?: SearchFilters;
  resultCount: number;
  clickedResults: string[];
  timestamp: string;
}

// Search operators help
export interface SearchOperatorHelp {
  operator: string;
  syntax: string;
  description: string;
  example: string;
}

export const SEARCH_OPERATORS: SearchOperatorHelp[] = [
  {
    operator: 'AND',
    syntax: 'term1 AND term2',
    description: 'Both terms must be present',
    example: 'invoice AND 2024'
  },
  {
    operator: 'OR',
    syntax: 'term1 OR term2',
    description: 'Either term can be present',
    example: 'contract OR agreement'
  },
  {
    operator: 'NOT',
    syntax: 'term1 NOT term2',
    description: 'First term present, second excluded',
    example: 'report NOT draft'
  },
  {
    operator: '-',
    syntax: '-term',
    description: 'Exclude term from results',
    example: 'budget -2023'
  },
  {
    operator: '"..."',
    syntax: '"exact phrase"',
    description: 'Match exact phrase',
    example: '"quarterly report"'
  },
  {
    operator: '*',
    syntax: 'term*',
    description: 'Wildcard matching',
    example: 'doc*'
  },
  {
    operator: 'title:',
    syntax: 'title:term',
    description: 'Search in title only',
    example: 'title:invoice'
  },
  {
    operator: 'content:',
    syntax: 'content:term',
    description: 'Search in content only',
    example: 'content:signature'
  },
  {
    operator: 'tag:',
    syntax: 'tag:value',
    description: 'Filter by tag',
    example: 'tag:important'
  },
  {
    operator: 'type:',
    syntax: 'type:extension',
    description: 'Filter by file type',
    example: 'type:pdf'
  },
  {
    operator: 'author:',
    syntax: 'author:name',
    description: 'Filter by author',
    example: 'author:john'
  },
  {
    operator: 'before:',
    syntax: 'before:date',
    description: 'Created before date',
    example: 'before:2024-01-01'
  },
  {
    operator: 'after:',
    syntax: 'after:date',
    description: 'Created after date',
    example: 'after:2024-06-01'
  },
  {
    operator: 'size:',
    syntax: 'size:>10MB',
    description: 'Filter by file size',
    example: 'size:>5MB size:<100MB'
  },
  {
    operator: 'in:',
    syntax: 'in:folder',
    description: 'Search in specific folder',
    example: 'in:contracts'
  },
  {
    operator: 'is:',
    syntax: 'is:status',
    description: 'Filter by status',
    example: 'is:archived'
  }
];

// File type categories
export const FILE_TYPE_CATEGORIES: Record<string, { label: string; extensions: string[]; icon: string }> = {
  documents: {
    label: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    icon: 'FileText'
  },
  spreadsheets: {
    label: 'Spreadsheets',
    extensions: ['xls', 'xlsx', 'csv', 'ods'],
    icon: 'Table'
  },
  presentations: {
    label: 'Presentations',
    extensions: ['ppt', 'pptx', 'odp', 'key'],
    icon: 'Presentation'
  },
  images: {
    label: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    icon: 'Image'
  },
  archives: {
    label: 'Archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
    icon: 'Archive'
  },
  code: {
    label: 'Code',
    extensions: ['js', 'ts', 'py', 'java', 'html', 'css', 'json', 'xml'],
    icon: 'Code'
  }
};

// Helper to get file type category
export const getFileTypeCategory = (extension: string): string | null => {
  const ext = extension.toLowerCase().replace('.', '');
  for (const [category, config] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if (config.extensions.includes(ext)) return category;
  }
  return null;
};

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to parse size string
export const parseSizeString = (sizeStr: string): number | null => {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
};
