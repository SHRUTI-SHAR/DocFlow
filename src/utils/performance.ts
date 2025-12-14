/**
 * Performance optimization utilities
 */

/**
 * Debounce function to limit the rate of function execution
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to ensure function is called at most once per specified period
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * Memoization utility for expensive calculations
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Performance measurement utility
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  
  static start(label: string): void {
    this.marks.set(label, performance.now());
  }
  
  static end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No performance mark found for "${label}"`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.marks.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static measure<T>(label: string, func: () => T): T {
    this.start(label);
    const result = func();
    this.end(label);
    return result;
  }
  
  static async measureAsync<T>(label: string, func: () => Promise<T>): Promise<T> {
    this.start(label);
    const result = await func();
    this.end(label);
    return result;
  }
}

/**
 * Simple lazy loading utility for components
 */
export const createLazyComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>
) => {
  return React.lazy(importFunc);
};

/**
 * Image optimization utilities
 */
export const optimizeImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateOptimalDimensions(
        img.width,
        img.height,
        maxWidth
      );
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw and compress image
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calculate optimal dimensions for image resizing
 */
const calculateOptimalDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } => {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalHeight / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * aspectRatio)
  };
};

/**
 * Intersection Observer utility for lazy loading
 */
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
};

/**
 * Virtual scrolling utility for large lists
 */
export class VirtualScroller {
  private itemHeight: number;
  private containerHeight: number;
  private scrollTop: number = 0;
  
  constructor(itemHeight: number, containerHeight: number) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }
  
  getVisibleRange(totalItems: number): { start: number; end: number } {
    const itemsPerScreen = Math.ceil(this.containerHeight / this.itemHeight);
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + itemsPerScreen + 2, totalItems); // Add buffer
    
    return { start: Math.max(0, start - 2), end }; // Add buffer at start too
  }
  
  updateScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }
  
  getTotalHeight(itemCount: number): number {
    return itemCount * this.itemHeight;
  }
  
  getItemOffset(index: number): number {
    return index * this.itemHeight;
  }
}

/**
 * Memory management utilities
 */
export const cleanupResources = (...resources: ((() => void) | undefined)[]): void => {
  resources.forEach(cleanup => {
    try {
      cleanup?.();
    } catch (error) {
      console.warn('Error during resource cleanup:', error);
    }
  });
};

/**
 * Batch processing utility to avoid blocking the main thread
 */
export const processBatch = async <T, R>(
  items: T[],
  processor: (item: T) => R | Promise<R>,
  batchSize: number = 10,
  delay: number = 0
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // Allow other tasks to run
    if (delay > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};

// Import React for lazy component utility
import React from 'react';