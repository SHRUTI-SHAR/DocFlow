import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CursorPaginationOptions {
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount?: number;
}

export function useCursorPagination<T extends { id: string; created_at: string }>(
  tableName: string,
  userIdColumn: string = 'uploaded_by',
  options: CursorPaginationOptions = {}
) {
  const { pageSize = 50, sortBy = 'created_at', sortOrder = 'desc' } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  const cursorRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // Generate cursor from item
  const getCursor = useCallback((item: T): string => {
    const date = new Date(item.created_at);
    return `${date.toISOString()}_${item.id}`;
  }, []);

  // Parse cursor into components
  const parseCursor = useCallback((cursor: string): { timestamp: string; id: string } | null => {
    const match = cursor.match(/^(.+)_([a-f0-9-]+)$/);
    if (!match) return null;
    return { timestamp: match[1], id: match[2] };
  }, []);

  // Fetch count (cached, not on every request)
  const fetchCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await (supabase
        .from(tableName as any)
        .select('id', { count: 'exact', head: true })
        .eq(userIdColumn, user.id) as any);

      if (error) throw error;
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching count:', err);
    }
  }, [tableName, userIdColumn]);

  // Main fetch function with cursor support
  const fetchPage = useCallback(async (cursor: string | null = null, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        isInitialLoadRef.current = true;
      }
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = (supabase
        .from(tableName as any)
        .select('*')
        .eq(userIdColumn, user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(pageSize + 1) as any); // Fetch one extra to check if there's more

      // Apply cursor filter for pagination
      if (cursor) {
        const parsed = parseCursor(cursor);
        if (parsed) {
          if (sortOrder === 'desc') {
            query = query.or(`${sortBy}.lt.${parsed.timestamp},and(${sortBy}.eq.${parsed.timestamp},id.lt.${parsed.id})`) as any;
          } else {
            query = query.or(`${sortBy}.gt.${parsed.timestamp},and(${sortBy}.eq.${parsed.timestamp},id.gt.${parsed.id})`) as any;
          }
        }
      }

      const { data, error: queryError } = await (query as any);

      if (queryError) throw queryError;

      const results = data || [];
      const hasMoreResults = results.length > pageSize;
      const pageData = hasMoreResults ? results.slice(0, pageSize) : results;

      // Update cursor for next page
      if (pageData.length > 0) {
        const lastItem = pageData[pageData.length - 1];
        cursorRef.current = getCursor(lastItem as T);
      }

      setHasMore(hasMoreResults);

      if (append) {
        setItems(prev => [...prev, ...(pageData as T[])]);
      } else {
        setItems(pageData as T[]);
        // Only fetch count on initial load
        if (isInitialLoadRef.current) {
          fetchCount();
          isInitialLoadRef.current = false;
        }
      }

      return {
        data: pageData as T[],
        hasMore: hasMoreResults,
        nextCursor: cursorRef.current,
      };
    } catch (err) {
      setError(err as Error);
      console.error('Pagination error:', err);
      return { data: [], hasMore: false, nextCursor: null };
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tableName, userIdColumn, sortBy, sortOrder, pageSize, getCursor, parseCursor, fetchCount]);

  // Load initial page
  const loadInitial = useCallback(() => {
    cursorRef.current = null;
    return fetchPage(null, false);
  }, [fetchPage]);

  // Load next page
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return Promise.resolve({ data: [], hasMore: false, nextCursor: null });
    return fetchPage(cursorRef.current, true);
  }, [fetchPage, hasMore, loadingMore]);

  // Reset and reload
  const refresh = useCallback(() => {
    cursorRef.current = null;
    setItems([]);
    setHasMore(true);
    return loadInitial();
  }, [loadInitial]);

  // Prepend new item (optimistic update for uploads)
  const prependItem = useCallback((item: T) => {
    setItems(prev => [item, ...prev]);
    setTotalCount(prev => prev + 1);
  }, []);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

  // Update item
  const updateItem = useCallback((itemId: string, updates: Partial<T>) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    totalCount,
    loadInitial,
    loadMore,
    refresh,
    prependItem,
    removeItem,
    updateItem,
  };
}
