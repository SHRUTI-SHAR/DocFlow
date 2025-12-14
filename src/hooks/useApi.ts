import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { handleError, type AppError } from '@/utils/errorHandling';

/**
 * Enhanced API hooks with better error handling and loading states
 */

interface ApiHookOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  retryCount?: number;
  enabled?: boolean;
}

/**
 * Enhanced useQuery hook with standardized error handling
 */
export const useApiQuery = <T>(
  key: any[],
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options?: ApiHookOptions<T> & Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const result = await queryFn();
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.data === null) {
        throw new Error('No data returned from API');
      }
      
      return result.data;
    },
    retry: options?.retryCount ?? 3,
    enabled: options?.enabled ?? true,
    onSuccess: options?.onSuccess,
    onError: (error: Error) => {
      const appError = handleError(error, `Query: ${key.join('.')}`);
      options?.onError?.(appError);
    },
    ...options
  });
};

/**
 * Enhanced useMutation hook with standardized error handling
 */
export const useApiMutation = <TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: Error | null }>,
  options?: ApiHookOptions<TData> & Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const result = await mutationFn(variables);
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.data === null) {
        throw new Error('No data returned from API');
      }
      
      return result.data;
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data);
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error: Error) => {
      const appError = handleError(error, 'Mutation');
      options?.onError?.(appError);
    },
    ...options
  });
};

/**
 * Hook for handling async operations with loading states
 */
export const useAsyncOperation = <T, TArgs extends any[] = []>(
  operation: (...args: TArgs) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: AppError) => void;
    autoReset?: boolean;
    resetDelay?: number;
  }
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(async (...args: TArgs) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await operation(...args);
      setData(result);
      options?.onSuccess?.(result);
      
      if (options?.autoReset) {
        setTimeout(() => {
          setData(null);
          setError(null);
        }, options.resetDelay || 3000);
      }
      
      return result;
    } catch (err) {
      const appError = handleError(err, 'Async Operation');
      setError(appError);
      options?.onError?.(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setData(null);
    setError(null);
  }, []);

  return {
    execute,
    reset,
    isLoading,
    data,
    error,
    isSuccess: data !== null && error === null,
    isError: error !== null
  };
};

/**
 * Hook for polling data at regular intervals
 */
export const usePolling = <T>(
  key: any[],
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  interval: number = 5000,
  options?: {
    enabled?: boolean;
    maxRetries?: number;
    onData?: (data: T) => void;
  }
) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const query = useApiQuery(
    key,
    queryFn,
    {
      refetchInterval: isPolling ? interval : false,
      refetchIntervalInBackground: true,
      enabled: options?.enabled ?? true,
      retry: options?.maxRetries ?? 3,
      onSuccess: (data) => {
        setPollCount(prev => prev + 1);
        options?.onData?.(data);
      }
    }
  );

  const startPolling = useCallback(() => {
    setIsPolling(true);
    setPollCount(0);
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  const resetPollCount = useCallback(() => {
    setPollCount(0);
  }, []);

  return {
    ...query,
    isPolling,
    pollCount,
    startPolling,
    stopPolling,
    resetPollCount
  };
};

/**
 * Hook for handling optimistic updates
 */
export const useOptimisticUpdate = <T>(
  queryKey: any[],
  updateFn: (oldData: T, newData: Partial<T>) => T
) => {
  const queryClient = useQueryClient();

  const performOptimisticUpdate = useCallback(
    (newData: Partial<T>) => {
      // Store the previous value for rollback
      const previousData = queryClient.getQueryData<T>(queryKey);
      
      // Optimistically update the data
      queryClient.setQueryData<T>(queryKey, (old) => {
        return old ? updateFn(old, newData) : undefined;
      });

      return {
        rollback: () => {
          queryClient.setQueryData(queryKey, previousData);
        }
      };
    },
    [queryClient, queryKey, updateFn]
  );

  return { performOptimisticUpdate };
};

/**
 * Hook for handling pagination
 */
export const usePagination = (
  initialPage: number = 1,
  initialPageSize: number = 20
) => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const nextPage = useCallback(() => setPage(prev => prev + 1), []);
  const previousPage = useCallback(() => setPage(prev => Math.max(1, prev - 1)), []);
  const goToPage = useCallback((pageNumber: number) => setPage(Math.max(1, pageNumber)), []);
  const reset = useCallback(() => setPage(initialPage), [initialPage]);
  
  const offset = (page - 1) * pageSize;
  
  return {
    page,
    pageSize,
    offset,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    reset
  };
};

/**
 * Hook for debounced search
 */
export const useDebouncedSearch = (
  searchFn: (query: string) => Promise<any>,
  delay: number = 300
) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  const { execute, data, error } = useAsyncOperation(searchFn);

  useEffect(() => {
    if (debouncedQuery) {
      setIsSearching(true);
      execute(debouncedQuery).finally(() => setIsSearching(false));
    }
  }, [debouncedQuery, execute]);

  return {
    query,
    setQuery,
    debouncedQuery,
    isSearching,
    results: data,
    error,
    clearQuery: () => setQuery('')
  };
};