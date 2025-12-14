import { useRef, useCallback, useEffect } from 'react';

export interface InfiniteScrollOptions {
  threshold?: number; // Distance from bottom to trigger load (px)
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  loading: boolean,
  options: InfiniteScrollOptions = {}
) {
  const { threshold = 200, rootMargin = '0px', enabled = true } = options;
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreCallbackRef = useRef(onLoadMore);

  // Keep callback ref updated
  useEffect(() => {
    loadMoreCallbackRef.current = onLoadMore;
  }, [onLoadMore]);

  // Setup intersection observer
  const setupObserver = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node || !enabled || !hasMore || loading) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          loadMoreCallbackRef.current();
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0,
      }
    );

    observerRef.current.observe(node);
    loadMoreRef.current = node;
  }, [enabled, hasMore, loading, threshold]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Reconnect when dependencies change
  useEffect(() => {
    if (loadMoreRef.current) {
      setupObserver(loadMoreRef.current);
    }
  }, [setupObserver, hasMore, loading]);

  return {
    loadMoreRef: setupObserver,
    isNearBottom: false, // Could add scroll position tracking if needed
  };
}

// Hook for scroll position tracking
export function useScrollPosition(containerRef: React.RefObject<HTMLElement>) {
  const getScrollPosition = useCallback(() => {
    if (!containerRef.current) return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return { scrollTop, scrollHeight, clientHeight };
  }, [containerRef]);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [containerRef]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ 
        top: containerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }, [containerRef]);

  const isAtBottom = useCallback((threshold: number = 100) => {
    const { scrollTop, scrollHeight, clientHeight } = getScrollPosition();
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [getScrollPosition]);

  const isAtTop = useCallback((threshold: number = 100) => {
    const { scrollTop } = getScrollPosition();
    return scrollTop < threshold;
  }, [getScrollPosition]);

  return {
    getScrollPosition,
    scrollToTop,
    scrollToBottom,
    isAtBottom,
    isAtTop,
  };
}
