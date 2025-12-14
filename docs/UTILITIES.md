# Utility Functions Documentation

This document provides comprehensive information about utility functions available throughout the application.

## Error Handling Utilities (`src/utils/errorHandling.ts`)

### Error Types
```typescript
type ErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR' 
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';
```

### Core Functions

#### createAppError
Creates standardized application errors.

```typescript
const error = createAppError('VALIDATION_ERROR', 'Invalid input', {
  code: 'INVALID_EMAIL',
  context: { field: 'email', value: 'invalid-email' }
});
```

#### handleSupabaseError
Handles Supabase-specific errors and converts them to AppErrors.

```typescript
const appError = handleSupabaseError(supabaseError);
```

#### handleError
Generic error handler with toast notifications.

```typescript
const appError = handleError(error, 'Document Upload');
```

#### withRetry
Retry wrapper for async operations with exponential backoff.

```typescript
const result = await withRetry(
  () => apiCall(),
  3, // max retries
  1000 // initial delay
);
```

## Validation Utilities (`src/utils/validation.ts`)

### Schema Validation

#### Common Schemas
```typescript
// Email validation
const email = emailSchema.parse('user@example.com');

// File validation
const file = fileSchema.parse(uploadedFile);

// Form data validation
const formData = formDataSchema.parse(userInput);
```

#### Custom Validators
```typescript
// Custom validation rules
const isValidPhoneNumber = (phone: string): boolean => {
  return phoneRegex.test(phone);
};

const validateDocumentType = (file: File): ValidationResult => {
  return {
    isValid: allowedTypes.includes(file.type),
    errors: file.type in allowedTypes ? [] : ['Invalid file type']
  };
};
```

## Performance Utilities (`src/utils/performance.ts`)

### Function Utilities

#### debounce
Limits function execution rate.

```typescript
const debouncedSearch = debounce(searchFunction, 300);
```

#### throttle
Ensures function is called at most once per period.

```typescript
const throttledScroll = throttle(onScroll, 100);
```

#### memoize
Caches function results for expensive calculations.

```typescript
const memoizedCalculation = memoize(expensiveFunction);
```

### Component Utilities

#### createLazyComponent
Creates lazy-loaded components.

```typescript
const LazyComponent = createLazyComponent(
  () => import('./HeavyComponent')
);
```

#### Performance Monitoring
```typescript
// Measure performance
PerformanceMonitor.start('api-call');
await apiCall();
const duration = PerformanceMonitor.end('api-call');

// Measure with wrapper
const result = await PerformanceMonitor.measureAsync('fetch-data', fetchData);
```

### Image Optimization
```typescript
const optimizedBlob = await optimizeImage(
  file, 
  1920, // max width
  0.8   // quality
);
```

## Formatting Utilities (`src/utils/formatters.ts`)

### File and Data Formatting

#### formatFileSize
```typescript
formatFileSize(1024); // "1 KB"
formatFileSize(1048576); // "1 MB"
```

#### formatDate
```typescript
formatDate(new Date(), { year: 'numeric', month: 'short' });
formatRelativeTime(pastDate); // "2 hours ago"
```

#### formatCurrency
```typescript
formatCurrency(29.99, 'USD'); // "$29.99"
formatPercentage(0.75); // "75.0%"
```

### Text Formatting

#### Text Manipulation
```typescript
truncateText("Long text here", 20); // "Long text here..."
toTitleCase("hello world"); // "Hello World"
camelToTitle("firstName"); // "First Name"
```

#### Masking and Privacy
```typescript
maskString("1234567890", 2, 2); // "12******90"
getInitials("John Doe Smith", 2); // "JD"
```

## Helper Utilities (`src/utils/helpers.ts`)

### Object Manipulation

#### Deep Operations
```typescript
const cloned = deepClone(originalObject);
const merged = deepMerge(target, source1, source2);
const isEqual = isEqual(obj1, obj2);
```

#### Property Access
```typescript
const value = getNestedProperty(obj, 'user.profile.name', 'Default');
setNestedProperty(obj, 'settings.theme.color', 'blue');
```

#### Object Filtering
```typescript
const filtered = pick(user, ['name', 'email']);
const remaining = omit(user, ['password', 'secret']);
const clean = cleanObject(data); // removes null/undefined
```

### Array Utilities

#### Array Manipulation
```typescript
const grouped = groupBy(users, 'department');
const uniqueUsers = unique(users, 'id');
const sorted = sortBy(products, 'price', 'name');
const chunks = chunk(largeArray, 10);
```

### Async Utilities

#### Retry and Delay
```typescript
const result = await retry(
  () => unstableApiCall(),
  3, // max attempts
  1000 // base delay
);

await sleep(2000); // Wait 2 seconds
```

#### Function Composition
```typescript
const processData = pipe(
  validateInput,
  transformData,
  formatOutput
);

const result = processData(inputData);
```

## Best Practices

### Error Handling
Always use the centralized error handling system:

```typescript
// ✅ Good
try {
  const result = await apiCall();
  return { data: result, error: null };
} catch (error) {
  return { data: null, error: handleSupabaseError(error) };
}

// ❌ Bad
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error(error);
  throw error;
}
```

### Performance
Use appropriate performance utilities:

```typescript
// ✅ Good - Debounce search input
const debouncedSearch = useDebouncedCallback(performSearch, 300);

// ✅ Good - Memoize expensive calculations
const expensiveResult = useMemo(() => 
  memoizedCalculation(data), [data]
);

// ✅ Good - Lazy load heavy components
const HeavyChart = createLazyComponent(() => import('./HeavyChart'));
```

### Validation
Always validate user input:

```typescript
// ✅ Good
const validatedData = formDataSchema.parse(userInput);

// ✅ Good
const validation = validateDocumentType(file);
if (!validation.isValid) {
  showErrors(validation.errors);
  return;
}
```

### Formatting
Use consistent formatting throughout the app:

```typescript
// ✅ Good
const displayDate = formatRelativeTime(createdAt);
const displaySize = formatFileSize(fileSize);
const displayPrice = formatCurrency(price, 'USD');

// ❌ Bad
const displayDate = new Date(createdAt).toLocaleDateString();
```

## Testing Utilities

### Testing Helpers
```typescript
// Mock performance monitoring in tests
jest.mock('@/utils/performance', () => ({
  PerformanceMonitor: {
    start: jest.fn(),
    end: jest.fn(() => 100),
    measure: jest.fn((label, fn) => fn()),
  }
}));

// Test error handling
it('should handle errors correctly', () => {
  const error = createAppError('VALIDATION_ERROR', 'Test error');
  expect(error.type).toBe('VALIDATION_ERROR');
  expect(error.message).toBe('Test error');
});
```