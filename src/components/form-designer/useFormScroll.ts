import { useEffect, useRef } from 'react';

interface UseFormScrollOptions {
  isEditMode: boolean;
  formId?: string;
  loading: boolean;
}

export const useFormScroll = ({ isEditMode, formId, loading }: UseFormScrollOptions) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isEditMode || !formId) return;
    
    const storageKey = `editForm_${formId}_state`;
    
    const saveState = () => {
      // Use window scroll position instead of container scroll
      const scrollPosition = window.scrollY;
      const state = {
        scrollPosition,
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    };

    const handleBeforeUnload = () => {
      saveState();
    };

    const handleScroll = () => {
      // Debounce scroll saving
      clearTimeout((window as any).__scrollSaveTimeout);
      (window as any).__scrollSaveTimeout = setTimeout(saveState, 500);
    };

    const intervalId = setInterval(saveState, 5000); // Less frequent saves

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('scroll', handleScroll);
      if ((window as any).__scrollSaveTimeout) {
        clearTimeout((window as any).__scrollSaveTimeout);
      }
    };
  }, [isEditMode, formId]);

  useEffect(() => {
    if (!isEditMode || !formId || loading) return;
    
    const storageKey = `editForm_${formId}_state`;
    
    // Only restore scroll position once when content is loaded
    // Use window scrolling instead of container scrolling
    const restoreScrollPosition = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const state = JSON.parse(saved);
          // Only restore if saved within last hour to avoid stale positions
          if (state.timestamp && Date.now() - state.timestamp < 3600000) {
            if (state.scrollPosition && typeof state.scrollPosition === 'number' && state.scrollPosition > 0) {
              // Use window.scrollTo for smooth restoration
              window.scrollTo({
                top: state.scrollPosition,
                behavior: 'auto'
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('Failed to restore scroll position:', e);
      }
    };

    // Restore after a delay to ensure content is rendered
    // Try multiple times as content loads
    const timeout1 = setTimeout(restoreScrollPosition, 100);
    const timeout2 = setTimeout(restoreScrollPosition, 300);
    const timeout3 = setTimeout(restoreScrollPosition, 500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
    // Only run once when loading completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, loading]);

  return scrollContainerRef;
};

