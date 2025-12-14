import { useState, useEffect, useCallback } from 'react';

/**
 * Enhanced localStorage hook with TypeScript support and error handling
 */

type SerializableValue = string | number | boolean | object | null;

interface UseLocalStorageOptions<T> {
  serializer?: {
    parse: (value: string) => T;
    stringify: (value: T) => string;
  };
  onError?: (error: Error) => void;
}

export const useLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
) => {
  const serializer = options?.serializer || {
    parse: JSON.parse,
    stringify: JSON.stringify
  };

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const item = window.localStorage.getItem(key);
      
      if (item === null) {
        return initialValue;
      }

      return serializer.parse(item);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        if (valueToStore === null || valueToStore === undefined) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, serializer.stringify(valueToStore));
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [key, storedValue, serializer, options]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [key, initialValue, options]);

  // Listen for changes to this key from other tabs/windows
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(serializer.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error);
          options?.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, serializer, options]);

  return [storedValue, setValue, removeValue] as const;
};

/**
 * Hook for managing user preferences in localStorage
 */
export const useUserPreferences = () => {
  const [preferences, setPreferences, removePreferences] = useLocalStorage(
    'user_preferences',
    {
      theme: 'system' as 'light' | 'dark' | 'system',
      language: 'en',
      notifications: true,
      autoSave: true,
      defaultView: 'grid' as 'grid' | 'list',
      pageSize: 20,
      pdfProcessingMaxWorkers: 10,  // Number of parallel async workers for LLM API calls (I/O-bound)
      pdfProcessingMaxThreads: 10,   // Number of parallel threads for PDF conversion (CPU-bound)
      yoloSignatureEnabled: true     // Enable/disable YOLO signature detection
    }
  );

  const updatePreference = useCallback(<K extends keyof typeof preferences>(
    key: K,
    value: typeof preferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, [setPreferences]);

  const updatePreferences = useCallback((updates: Partial<typeof preferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    removePreferences();
  }, [removePreferences]);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences
  };
};

/**
 * Hook for managing recent items list
 */
export const useRecentItems = <T extends { id: string; name: string; timestamp?: number }>(
  key: string,
  maxItems: number = 10
) => {
  const [recentItems, setRecentItems] = useLocalStorage<T[]>(key, []);

  const addRecentItem = useCallback((item: T) => {
    const itemWithTimestamp = {
      ...item,
      timestamp: Date.now()
    };

    setRecentItems(prev => {
      // Remove existing item if it exists
      const filtered = prev.filter(existing => existing.id !== item.id);
      // Add new item to the beginning
      const updated = [itemWithTimestamp, ...filtered];
      // Limit to maxItems
      return updated.slice(0, maxItems);
    });
  }, [setRecentItems, maxItems]);

  const removeRecentItem = useCallback((id: string) => {
    setRecentItems(prev => prev.filter(item => item.id !== id));
  }, [setRecentItems]);

  const clearRecentItems = useCallback(() => {
    setRecentItems([]);
  }, [setRecentItems]);

  return {
    recentItems,
    addRecentItem,
    removeRecentItem,
    clearRecentItems
  };
};

/**
 * Hook for managing form drafts
 */
export const useFormDraft = (formId: string) => {
  const draftKey = `form_draft_${formId}`;
  const [draft, setDraft, removeDraft] = useLocalStorage<Record<string, any> | null>(
    draftKey,
    null
  );

  const saveDraft = useCallback((formData: Record<string, any>) => {
    const draftData = {
      ...formData,
      lastSaved: new Date().toISOString(),
      formId
    };
    setDraft(draftData);
  }, [setDraft, formId]);

  const clearDraft = useCallback(() => {
    removeDraft();
  }, [removeDraft]);

  const hasDraft = draft !== null;
  const draftAge = draft?.lastSaved 
    ? Date.now() - new Date(draft.lastSaved).getTime()
    : 0;

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft,
    draftAge,
    isStale: draftAge > 24 * 60 * 60 * 1000 // 24 hours
  };
};

/**
 * Hook for persisting application state
 */
export const usePersistedState = <T>(key: string, initialState: T) => {
  const [state, setState] = useLocalStorage(key, initialState);

  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => ({
      ...prev,
      ...updates
    }));
  }, [setState]);

  const resetState = useCallback(() => {
    setState(initialState);
  }, [setState, initialState]);

  return {
    state,
    setState,
    updateState,
    resetState
  };
};