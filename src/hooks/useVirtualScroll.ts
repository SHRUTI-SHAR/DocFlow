import { useState, useCallback, useRef, useEffect } from 'react';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string;
}

export interface VirtualScrollOptions {
  itemHeight: number;
  overscan?: number; // Number of items to render outside viewport
  containerHeight?: number;
}

export function useVirtualScroll<T extends { id: string }>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, overscan = 5 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(options.containerHeight || 600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Generate virtual items
  const virtualItems: VirtualItem[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (items[i]) {
      virtualItems.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
        key: items[i].id,
      });
    }
  }

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Measure container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const container = containerRef.current;
    if (!container) return;

    let top = index * itemHeight;
    
    if (align === 'center') {
      top = top - containerHeight / 2 + itemHeight / 2;
    } else if (align === 'end') {
      top = top - containerHeight + itemHeight;
    }

    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [itemHeight, containerHeight]);

  // Get item at position
  const getItemAtPosition = useCallback((y: number): T | null => {
    const index = Math.floor((scrollTop + y) / itemHeight);
    return items[index] || null;
  }, [scrollTop, itemHeight, items]);

  return {
    containerRef,
    virtualItems,
    totalHeight,
    scrollTop,
    containerHeight,
    handleScroll,
    scrollToIndex,
    getItemAtPosition,
    visibleRange: { start: startIndex, end: endIndex },
    isScrolling: false, // Could add debounced scrolling state
  };
}

// Simplified list virtualization component helper
export function calculateVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
): { startIndex: number; endIndex: number; offsetY: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}
