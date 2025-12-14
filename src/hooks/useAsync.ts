import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface AsyncActions<T> {
  execute: () => Promise<T>;
  reset: () => void;
  cancel: () => void;
}

/**
 * Hook for handling async operations with loading states
 */
export const useAsync = <T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = false
): AsyncState<T> & AsyncActions<T> => {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  const cancelRef = useRef<boolean>(false);

  const execute = useCallback(async (): Promise<T> => {
    setState({
      data: null,
      error: null,
      isLoading: true,
      isSuccess: false,
      isError: false,
    });

    try {
      const result = await asyncFunction();
      
      if (!cancelRef.current) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
        });
      }
      
      return result;
    } catch (error) {
      if (!cancelRef.current) {
        setState({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          isSuccess: false,
          isError: true,
        });
      }
      throw error;
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel,
  };
};