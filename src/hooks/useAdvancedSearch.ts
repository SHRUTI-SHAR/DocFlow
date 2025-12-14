import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import {
  SearchToken,
  ParsedSearchQuery,
  SearchFilters,
  SearchResult,
  SearchResponse,
  SearchSuggestion,
  SavedSearch,
  RecentSearch,
  SortField,
  SortDirection,
  SearchFieldType,
  SEARCH_OPERATORS,
  parseSizeString
} from '@/types/search';

interface UseAdvancedSearchOptions {
  pageSize?: number;
  debounceMs?: number;
  enableSuggestions?: boolean;
  enableHistory?: boolean;
}

interface UseAdvancedSearchReturn {
  // State
  query: string;
  parsedQuery: ParsedSearchQuery | null;
  filters: SearchFilters;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  page: number;
  hasMore: boolean;
  executionTimeMs: number;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  
  // History
  recentSearches: RecentSearch[];
  savedSearches: SavedSearch[];
  
  // Sorting
  sortField: SortField;
  sortDirection: SortDirection;
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  setSortField: (field: SortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  
  // Suggestions
  selectSuggestion: (suggestion: SearchSuggestion) => void;
  hideSuggestions: () => void;
  
  // Saved searches
  saveSearch: (name: string) => Promise<SavedSearch | null>;
  deleteSavedSearch: (id: string) => Promise<boolean>;
  loadSavedSearch: (search: SavedSearch) => void;
  
  // History
  clearHistory: () => Promise<void>;
  
  // Helpers
  getOperatorHelp: () => typeof SEARCH_OPERATORS;
  highlightMatches: (text: string, terms: string[]) => string;
}

// Parse search query into tokens
const parseSearchQuery = (query: string): ParsedSearchQuery => {
  const tokens: SearchToken[] = [];
  const phrases: string[] = [];
  const excludedTerms: string[] = [];
  const fieldFilters: Record<SearchFieldType, string[]> = {
    any: [],
    title: [],
    content: [],
    description: [],
    tags: [],
    author: [],
    comments: [],
    metadata: []
  };
  let hasWildcard = false;

  // Match quoted phrases
  const phraseRegex = /"([^"]+)"/g;
  let phraseMatch;
  while ((phraseMatch = phraseRegex.exec(query)) !== null) {
    phrases.push(phraseMatch[1]);
    tokens.push({ type: 'phrase', value: phraseMatch[1] });
  }

  // Remove quoted phrases for further processing
  let remainingQuery = query.replace(phraseRegex, ' ');

  // Match field-specific searches
  const fieldRegex = /(title|content|tag|type|author|in|is|before|after|size):([^\s]+)/gi;
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(remainingQuery)) !== null) {
    const field = fieldMatch[1].toLowerCase();
    const value = fieldMatch[2];
    
    tokens.push({ type: 'field', value, field: field as SearchFieldType });
    
    if (field === 'title') fieldFilters.title.push(value);
    else if (field === 'content') fieldFilters.content.push(value);
    else if (field === 'tag') fieldFilters.tags.push(value);
    else if (field === 'author') fieldFilters.author.push(value);
  }
  remainingQuery = remainingQuery.replace(fieldRegex, ' ');

  // Match excluded terms
  const excludeRegex = /-(\w+)/g;
  let excludeMatch;
  while ((excludeMatch = excludeRegex.exec(remainingQuery)) !== null) {
    excludedTerms.push(excludeMatch[1]);
    tokens.push({ type: 'exclude', value: excludeMatch[1], negated: true });
  }
  remainingQuery = remainingQuery.replace(excludeRegex, ' ');

  // Match operators
  const operatorRegex = /\b(AND|OR|NOT)\b/gi;
  let operatorMatch;
  while ((operatorMatch = operatorRegex.exec(remainingQuery)) !== null) {
    tokens.push({ 
      type: 'operator', 
      value: operatorMatch[1].toUpperCase(),
      operator: operatorMatch[1].toUpperCase() as 'AND' | 'OR' | 'NOT'
    });
  }
  remainingQuery = remainingQuery.replace(operatorRegex, ' ');

  // Match wildcards
  if (remainingQuery.includes('*')) {
    hasWildcard = true;
  }

  // Match remaining terms
  const terms = remainingQuery.split(/\s+/).filter(t => t.length > 0);
  terms.forEach(term => {
    if (term.includes('*')) {
      tokens.push({ type: 'wildcard', value: term });
    } else {
      tokens.push({ type: 'term', value: term });
    }
  });

  return {
    tokens,
    phrases,
    excludedTerms,
    fieldFilters,
    hasWildcard,
    rawQuery: query
  };
};

export const useAdvancedSearch = (options: UseAdvancedSearchOptions = {}): UseAdvancedSearchReturn => {
  const { 
    pageSize = 20, 
    debounceMs = 300,
    enableSuggestions = true,
    enableHistory = true 
  } = options;
  
  const { toast } = useToast();

  // Core state
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // History
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Parse the query
  const parsedQuery = useMemo(() => {
    if (!query.trim()) return null;
    return parseSearchQuery(query);
  }, [query]);

  // Has more pages
  const hasMore = useMemo(() => {
    return page * pageSize < totalCount;
  }, [page, pageSize, totalCount]);

  // Generate suggestions based on input
  const generateSuggestions = useCallback(async (input: string) => {
    if (!enableSuggestions || input.length < 2) {
      setSuggestions([]);
      return;
    }

    const newSuggestions: SearchSuggestion[] = [];

    // Add operator suggestions
    SEARCH_OPERATORS.forEach(op => {
      if (op.operator.toLowerCase().includes(input.toLowerCase()) ||
          op.syntax.toLowerCase().includes(input.toLowerCase())) {
        newSuggestions.push({
          type: 'operator',
          value: op.syntax,
          label: op.operator,
          description: op.description,
          icon: 'Command'
        });
      }
    });

    // Add recent searches
    recentSearches.slice(0, 3).forEach(recent => {
      if (recent.query.toLowerCase().includes(input.toLowerCase())) {
        newSuggestions.push({
          type: 'recent',
          value: recent.query,
          label: recent.query,
          description: `${recent.resultCount} results`,
          icon: 'Clock'
        });
      }
    });

    // Add saved searches
    savedSearches.slice(0, 3).forEach(saved => {
      if (saved.name.toLowerCase().includes(input.toLowerCase()) ||
          saved.query.toLowerCase().includes(input.toLowerCase())) {
        newSuggestions.push({
          type: 'saved',
          value: saved.query,
          label: saved.name,
          description: saved.query,
          icon: 'Bookmark'
        });
      }
    });

    setSuggestions(newSuggestions.slice(0, 10));
    setShowSuggestions(newSuggestions.length > 0);
  }, [enableSuggestions, recentSearches, savedSearches]);

  // Update filter helper
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K, 
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Main search function
  const search = useCallback(async (resetPage = true) => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    const startTime = performance.now();

    if (resetPage) setPage(1);

    try {
      const currentPage = resetPage ? 1 : page;
      const parsed = parseSearchQuery(query);
      
      // Build the search query for Supabase
      // @ts-ignore - Table may not exist yet
      let searchQuery = (supabase as any)
        .from('documents')
        .select('*', { count: 'exact' });

      // Apply text search
      if (query.trim()) {
        // Use full-text search if available, otherwise ilike
        const searchTerms = parsed.tokens
          .filter(t => t.type === 'term' || t.type === 'phrase')
          .map(t => t.value);
        
        if (searchTerms.length > 0) {
          const searchPattern = `%${searchTerms.join('%')}%`;
          searchQuery = searchQuery.or(
            `title.ilike.${searchPattern},description.ilike.${searchPattern},extracted_text.ilike.${searchPattern}`
          );
        }

        // Apply exclusions
        parsed.excludedTerms.forEach(term => {
          searchQuery = searchQuery
            .not('title', 'ilike', `%${term}%`)
            .not('description', 'ilike', `%${term}%`);
        });
      }

      // Apply filters
      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date | null = null;

        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
          case 'last_7_days':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'last_30_days':
            startDate = new Date(now.setDate(now.getDate() - 30));
            break;
          case 'last_90_days':
            startDate = new Date(now.setDate(now.getDate() - 90));
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'custom':
            if (filters.customDateStart) {
              searchQuery = searchQuery.gte('created_at', filters.customDateStart);
            }
            if (filters.customDateEnd) {
              searchQuery = searchQuery.lte('created_at', filters.customDateEnd);
            }
            break;
        }

        if (startDate && filters.dateRange !== 'custom') {
          searchQuery = searchQuery.gte('created_at', startDate.toISOString());
        }
      }

      if (filters.fileTypes && filters.fileTypes.length > 0) {
        searchQuery = searchQuery.in('file_type', filters.fileTypes);
      }

      if (filters.folderId) {
        searchQuery = searchQuery.eq('folder_id', filters.folderId);
      }

      if (filters.status && filters.status.length > 0) {
        searchQuery = searchQuery.in('processing_status', filters.status);
      }

      if (filters.ownerId) {
        searchQuery = searchQuery.eq('user_id', filters.ownerId);
      }

      if (filters.minSize) {
        searchQuery = searchQuery.gte('file_size', filters.minSize);
      }

      if (filters.maxSize) {
        searchQuery = searchQuery.lte('file_size', filters.maxSize);
      }

      // Apply sorting
      const sortColumn = sortField === 'relevance' ? 'updated_at' : 
                         sortField === 'date_modified' ? 'updated_at' :
                         sortField === 'date_created' ? 'created_at' :
                         sortField === 'size' ? 'file_size' :
                         sortField === 'type' ? 'file_type' : 'title';
      
      searchQuery = searchQuery.order(sortColumn, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      searchQuery = searchQuery.range(from, to);

      const { data, error: searchError, count } = await searchQuery;

      if (searchError) throw searchError;

      // Transform results
      const transformedResults: SearchResult[] = (data || []).map((doc: any, index: number) => ({
        id: doc.id,
        title: doc.title || doc.file_name || 'Untitled',
        description: doc.description,
        content: doc.extracted_text?.substring(0, 500),
        file_type: doc.file_type,
        file_name: doc.file_name,
        file_size: doc.file_size,
        folder_id: doc.folder_id,
        owner_id: doc.user_id,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        status: doc.processing_status,
        relevanceScore: 100 - index, // Simple relevance based on order
        matchedFields: [],
        highlights: [],
        snippet: doc.extracted_text?.substring(0, 200)
      }));

      setResults(resetPage ? transformedResults : [...results, ...transformedResults]);
      setTotalCount(count || 0);
      setExecutionTimeMs(Math.round(performance.now() - startTime));

      // Save to history
      if (enableHistory && query.trim()) {
        const historyEntry: RecentSearch = {
          id: crypto.randomUUID(),
          query: query,
          filters: filters,
          timestamp: new Date().toISOString(),
          resultCount: count || 0
        };
        setRecentSearches(prev => [historyEntry, ...prev.slice(0, 9)]);
      }

    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Search Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, page, pageSize, sortField, sortDirection, enableHistory, toast, results]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setPage(prev => prev + 1);
    await search(false);
  }, [hasMore, isLoading, search]);

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'saved') {
      const saved = savedSearches.find(s => s.query === suggestion.value);
      if (saved) {
        setQuery(saved.query);
        setFilters(saved.filters);
        setSortField(saved.sortField);
        setSortDirection(saved.sortDirection);
      }
    } else {
      setQuery(suggestion.value);
    }
    setShowSuggestions(false);
  }, [savedSearches]);

  // Hide suggestions
  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  // Save current search
  const saveSearch = useCallback(async (name: string): Promise<SavedSearch | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const newSearch: SavedSearch = {
        id: crypto.randomUUID(),
        name,
        query,
        filters,
        sortField,
        sortDirection,
        userId: userData.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        useCount: 0
      };

      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('saved_searches')
        .insert(newSearch);

      if (error) throw error;

      setSavedSearches(prev => [newSearch, ...prev]);
      toast({
        title: 'Search saved',
        description: `"${name}" has been saved`
      });

      return newSearch;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return null;
    }
  }, [query, filters, sortField, sortDirection, toast]);

  // Delete saved search
  const deleteSavedSearch = useCallback(async (id: string): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(s => s.id !== id));
      toast({
        title: 'Search deleted',
        description: 'Saved search has been removed'
      });

      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  // Load a saved search
  const loadSavedSearch = useCallback((search: SavedSearch) => {
    setQuery(search.query);
    setFilters(search.filters);
    setSortField(search.sortField);
    setSortDirection(search.sortDirection);
  }, []);

  // Clear history
  const clearHistory = useCallback(async () => {
    setRecentSearches([]);
    toast({
      title: 'History cleared',
      description: 'Search history has been cleared'
    });
  }, [toast]);

  // Get operator help
  const getOperatorHelp = useCallback(() => SEARCH_OPERATORS, []);

  // Highlight matched terms in text
  const highlightMatches = useCallback((text: string, terms: string[]): string => {
    if (!terms.length) return text;
    
    let result = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    });
    
    return result;
  }, []);

  // Auto-search on debounced query change
  useEffect(() => {
    if (debouncedQuery) {
      search();
    }
  }, [debouncedQuery]);

  // Generate suggestions on query change
  useEffect(() => {
    generateSuggestions(query);
  }, [query, generateSuggestions]);

  // Load saved searches on mount
  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        // @ts-ignore - Table may not exist yet
        const { data } = await (supabase as any)
          .from('saved_searches')
          .select('*')
          .eq('userId', userData.user.id)
          .order('updatedAt', { ascending: false });

        if (data) {
          setSavedSearches(data as SavedSearch[]);
        }
      } catch (err) {
        // Table might not exist yet
      }
    };

    loadSavedSearches();
  }, []);

  return {
    // State
    query,
    parsedQuery,
    filters,
    results,
    isLoading,
    error,
    totalCount,
    page,
    hasMore,
    executionTimeMs,
    
    // Suggestions
    suggestions,
    showSuggestions,
    
    // History
    recentSearches,
    savedSearches,
    
    // Sorting
    sortField,
    sortDirection,
    
    // Actions
    setQuery,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    loadMore,
    setSortField,
    setSortDirection,
    
    // Suggestions
    selectSuggestion,
    hideSuggestions,
    
    // Saved searches
    saveSearch,
    deleteSavedSearch,
    loadSavedSearch,
    
    // History
    clearHistory,
    
    // Helpers
    getOperatorHelp,
    highlightMatches
  };
};
