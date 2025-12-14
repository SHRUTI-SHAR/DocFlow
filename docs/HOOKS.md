# Custom Hooks Documentation

This document provides a comprehensive guide to all custom React hooks available in the application.

## Core Hooks

### useAuth
Authentication hook that provides user state and auth methods.

```typescript
const { user, isLoading, signIn, signOut, signUp } = useAuth();
```

**Returns:**
- `user`: Current user object or null
- `isLoading`: Boolean indicating auth state loading
- `signIn(email, password)`: Sign in method
- `signOut()`: Sign out method
- `signUp(email, password, userData)`: Sign up method

### useLocalStorage
Enhanced localStorage hook with TypeScript support and error handling.

```typescript
const [value, setValue, removeValue] = useLocalStorage('key', defaultValue);
```

**Parameters:**
- `key`: Storage key string
- `initialValue`: Default value if key doesn't exist
- `options`: Optional serializer and error handler

**Specialized Variants:**
- `useUserPreferences()`: Manages user preference settings
- `useRecentItems(key, maxItems)`: Manages recent items list
- `useFormDraft(formId)`: Manages form draft state
- `usePersistedState(key, initialState)`: Persists component state

## API Hooks

### useApiQuery
Enhanced React Query wrapper with standardized error handling.

```typescript
const { data, isLoading, error } = useApiQuery(
  ['key'],
  () => apiCall(),
  { onSuccess, onError, retryCount }
);
```

### useApiMutation
Enhanced mutation hook with error handling.

```typescript
const { mutate, isLoading, error } = useApiMutation(
  (variables) => apiCall(variables),
  { onSuccess, onError }
);
```

### useAsyncOperation
Hook for handling async operations with loading states.

```typescript
const { execute, isLoading, data, error, reset } = useAsyncOperation(
  async (params) => someAsyncOperation(params),
  { onSuccess, onError, autoReset }
);
```

### usePolling
Hook for polling data at regular intervals.

```typescript
const { 
  data, 
  isPolling, 
  startPolling, 
  stopPolling 
} = usePolling(['key'], queryFn, 5000);
```

## Utility Hooks

### useDebounce
Debounces a value to prevent excessive API calls or renders.

```typescript
const debouncedValue = useDebounce(searchTerm, 300);
const debouncedCallback = useDebouncedCallback(onSearch, 300);
```

### useAsync
Handles async operations with comprehensive state management.

```typescript
const { 
  data, 
  error, 
  isLoading, 
  execute, 
  reset, 
  cancel 
} = useAsync(() => fetchData(), true);
```

### useToggle
Simple boolean state management with utility methods.

```typescript
const [isOpen, { toggle, setTrue, setFalse }] = useToggle(false);
```

### usePrevious
Returns the previous value of a variable.

```typescript
const previousValue = usePrevious(currentValue);
const hasChanged = useChanged(currentValue);
```

## Document Processing Hooks

### useDocumentProcessing
Comprehensive document processing workflow management.

```typescript
const {
  currentStep,
  processedData,
  isProcessing,
  processDocument,
  resetWorkflow
} = useDocumentProcessing();
```

### useEnhancedTemplateMatching
Enhanced template matching with semantic analysis and learning capabilities.

```typescript
const {
  findEnhancedMatches,
  getBestMatch,
  getMatchQuality,
  hasGoodMatch,
  isMatching
} = useEnhancedTemplateMatching();
```

### useFileUpload
File upload with progress tracking and validation.

```typescript
const {
  uploadFile,
  uploadProgress,
  isUploading,
  error
} = useFileUpload({
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['pdf', 'jpg', 'png']
});
```

## Form Hooks

### useFormSubmissions
Manage form submissions and responses.

```typescript
const {
  submissions,
  isLoading,
  submitForm,
  updateSubmission
} = useFormSubmissions(formId);
```

## Best Practices

### Hook Composition
Combine multiple hooks for complex functionality:

```typescript
const useDocumentManager = (documentId: string) => {
  const { data: document, isLoading } = useApiQuery(['document', documentId], fetchDocument);
  const [isEditing, { toggle: toggleEdit }] = useToggle(false);
  const debouncedSave = useDebouncedCallback(saveDocument, 1000);
  
  return {
    document,
    isLoading,
    isEditing,
    toggleEdit,
    debouncedSave
  };
};
```

### Error Handling
Always handle errors in custom hooks:

```typescript
const useDataFetcher = (url: string) => {
  const { execute, data, error, isLoading } = useAsyncOperation(
    () => fetch(url).then(res => res.json()),
    {
      onError: (error) => {
        console.error('Failed to fetch data:', error);
        // Additional error handling
      }
    }
  );
  
  return { data, error, isLoading, refetch: execute };
};
```

### Performance Optimization
Use memoization and debouncing for expensive operations:

```typescript
const useExpensiveComputation = (data: any[]) => {
  const debouncedData = useDebounce(data, 300);
  
  const result = useMemo(() => {
    if (!debouncedData.length) return [];
    return performExpensiveComputation(debouncedData);
  }, [debouncedData]);
  
  return result;
};
```

## Testing Hooks

Use React Testing Library's `renderHook` utility:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

test('useToggle should toggle value', () => {
  const { result } = renderHook(() => useToggle(false));
  
  expect(result.current[0]).toBe(false);
  
  act(() => {
    result.current[1].toggle();
  });
  
  expect(result.current[0]).toBe(true);
});
```