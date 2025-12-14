import { useRef, useEffect } from 'react';

/**
 * Hook that returns the previous value of a variable
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

/**
 * Hook that compares current value with previous value
 */
export const useChanged = <T>(value: T): boolean => {
  const previous = usePrevious(value);
  return previous !== value;
};