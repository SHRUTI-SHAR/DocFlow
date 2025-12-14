# Testing Guide

## Overview

SimplifyAI DocFlow follows a comprehensive testing strategy that includes unit tests, integration tests, and end-to-end tests to ensure reliability and maintainability.

## Testing Stack

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing utilities
- **MSW (Mock Service Worker)** - API mocking
- **Playwright** - End-to-end testing
- **Testing Library User Event** - User interaction simulation

## Test Structure

```
src/
├── __tests__/           # Global test utilities and setup
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx  # Component tests
│   └── __tests__/       # Component test utilities
├── hooks/
│   ├── useAuth.tsx
│   └── useAuth.test.tsx # Hook tests
├── services/
│   ├── api.ts
│   └── api.test.ts     # Service tests
└── utils/
    ├── validation.ts
    └── validation.test.ts # Utility tests
```

## Testing Guidelines

### 1. Test Organization

```typescript
// Group related tests using describe blocks
describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with correct text', () => {
      // Test implementation
    });
    
    it('should apply correct variant classes', () => {
      // Test implementation
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      // Test implementation
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      // Test implementation
    });
  });
});
```

### 2. Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentUpload } from '../DocumentUpload';

describe('DocumentUpload Component', () => {
  const mockOnFileSelect = jest.fn();
  
  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('should handle file drop', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByTestId('dropzone');
    
    await user.upload(dropzone, file);
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  it('should show error for invalid file type', async () => {
    render(<DocumentUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/upload/i);
    
    await userEvent.upload(input, file);
    
    expect(screen.getByText(/file type not supported/i)).toBeInTheDocument();
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});
```

### 3. Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentUpload } from '../useDocumentUpload';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDocumentUpload Hook', () => {
  it('should handle successful upload', async () => {
    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    });
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadedFile).toEqual(file);
  });

  it('should handle upload error', async () => {
    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    });
    
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    
    await act(async () => {
      try {
        await result.current.uploadFile(invalidFile);
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.uploadedFile).toBeNull();
  });
});
```

### 4. Service Testing

```typescript
import { documentService } from '../api';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('DocumentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get documents successfully', async () => {
    const mockDocuments = [
      { id: '1', name: 'Doc 1', file_path: '/path/1' },
      { id: '2', name: 'Doc 2', file_path: '/path/2' },
    ];

    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: mockDocuments,
        error: null,
      }),
    });

    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    require('@/integrations/supabase/client').supabase.from = mockFrom;

    const result = await documentService.getDocuments();

    expect(result.data).toEqual(mockDocuments);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('documents');
  });

  it('should handle service errors', async () => {
    const mockError = new Error('Database connection failed');
    
    const mockSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        data: null,
        error: mockError,
      }),
    });

    require('@/integrations/supabase/client').supabase.from.mockReturnValue({
      select: mockSelect,
    });

    const result = await documentService.getDocuments();

    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});
```

### 5. Integration Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DocumentManager } from '../DocumentManager';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Document Manager Integration', () => {
  it('should load and display documents', async () => {
    renderWithProviders(<DocumentManager />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check if documents are displayed
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should handle document search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DocumentManager />);

    const searchInput = screen.getByPlaceholderText(/search documents/i);
    await user.type(searchInput, 'test document');

    await waitFor(() => {
      expect(screen.getByDisplayValue('test document')).toBeInTheDocument();
    });
  });
});
```

## Test Utilities

### 1. Custom Render Function

```typescript
// src/__tests__/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialEntries = ['/'],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
```

### 2. Mock Data Factories

```typescript
// src/__tests__/factories.ts
import { faker } from '@faker-js/faker';
import type { Document, Template, Form } from '@/types';

export const createMockDocument = (overrides?: Partial<Document>): Document => ({
  id: faker.string.uuid(),
  name: faker.system.fileName(),
  file_path: faker.system.filePath(),
  file_size: faker.number.int({ min: 1000, max: 1000000 }),
  mime_type: faker.helpers.arrayElement(['application/pdf', 'image/jpeg', 'image/png']),
  user_id: faker.string.uuid(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  folder_id: null,
  tags: [],
  ...overrides,
});

export const createMockTemplate = (overrides?: Partial<Template>): Template => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Template',
  description: faker.lorem.sentence(),
  fields: [],
  usage_count: faker.number.int({ min: 0, max: 100 }),
  created_by: faker.string.uuid(),
  is_public: faker.datatype.boolean(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

export const createMockForm = (overrides?: Partial<Form>): Form => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  schema: { fields: [] },
  is_public: true,
  slug: faker.lorem.slug(),
  user_id: faker.string.uuid(),
  created_at: faker.date.recent().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});
```

### 3. API Mocking with MSW

```typescript
// src/__tests__/mocks/handlers.ts
import { rest } from 'msw';
import { createMockDocument, createMockTemplate } from '../factories';

export const handlers = [
  // Documents
  rest.get('/documents', (req, res, ctx) => {
    return res(
      ctx.json({
        data: Array.from({ length: 5 }, () => createMockDocument()),
        error: null,
      })
    );
  }),

  rest.post('/documents', (req, res, ctx) => {
    return res(
      ctx.json({
        data: createMockDocument(),
        error: null,
      })
    );
  }),

  // Templates
  rest.get('/templates', (req, res, ctx) => {
    return res(
      ctx.json({
        data: Array.from({ length: 3 }, () => createMockTemplate()),
        error: null,
      })
    );
  }),

  // Error scenarios
  rest.get('/error-endpoint', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ message: 'Internal server error' })
    );
  }),
];

// src/__tests__/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## Running Tests

### Development Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- DocumentUpload.test.tsx

# Run tests with coverage
npm run test:coverage

# Run tests for changed files only
npm run test:changed
```

### Continuous Integration
```bash
# Run all tests with coverage in CI
npm run test:ci

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

## Best Practices

### 1. Test Naming
```typescript
// Good: Descriptive test names
it('should display error message when file upload fails')
it('should disable submit button when form is invalid')
it('should navigate to dashboard after successful login')

// Avoid: Vague test names
it('should work')
it('handles error')
it('renders correctly')
```

### 2. Arrange-Act-Assert Pattern
```typescript
it('should add document to recent items when uploaded', () => {
  // Arrange
  const mockDocument = createMockDocument();
  const { result } = renderHook(() => useRecentItems('documents'));
  
  // Act
  act(() => {
    result.current.addRecentItem(mockDocument);
  });
  
  // Assert
  expect(result.current.recentItems).toContain(mockDocument);
});
```

### 3. Test Isolation
```typescript
describe('DocumentService', () => {
  beforeEach(() => {
    // Reset mocks and state before each test
    jest.clearAllMocks();
    cleanup();
  });
  
  afterEach(() => {
    // Clean up after each test
    jest.restoreAllMocks();
  });
});
```

### 4. Avoid Implementation Details
```typescript
// Good: Test behavior, not implementation
it('should show success message when form is submitted', async () => {
  render(<ContactForm />);
  
  await userEvent.type(screen.getByLabelText(/name/i), 'John Doe');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});

// Avoid: Testing internal state
it('should set isSubmitting to true when submitting', () => {
  const { result } = renderHook(() => useFormState());
  
  act(() => {
    result.current.setIsSubmitting(true);
  });
  
  expect(result.current.isSubmitting).toBe(true);
});
```

### 5. Accessibility Testing
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const { container } = render(<DocumentUpload onFileSelect={jest.fn()} />);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});
```

## Coverage Goals

- **Unit Tests**: 90%+ coverage for utilities, hooks, and services
- **Integration Tests**: 70%+ coverage for component interactions
- **E2E Tests**: Critical user journeys and business flows

## Debugging Tests

### 1. Visual Debugging
```typescript
import { screen } from '@testing-library/react';

it('should debug test', () => {
  render(<MyComponent />);
  
  // Print current DOM
  screen.debug();
  
  // Print specific element
  screen.debug(screen.getByRole('button'));
});
```

### 2. Jest Debugging
```bash
# Debug specific test
npm test -- --debug DocumentUpload.test.tsx

# Run test with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand DocumentUpload.test.tsx
```

### 3. Test Data Inspection
```typescript
it('should inspect test data', () => {
  const mockData = createMockDocument();
  
  console.log('Test data:', JSON.stringify(mockData, null, 2));
  
  // Your test logic
});
```