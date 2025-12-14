# Development Guide

## Getting Started

### Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js** (18.x or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Package manager
- **Git** - Version control
- **VS Code** (recommended) - Code editor with extensions

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode", 
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json"
  ]
}
```

### Initial Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd simplifyai-docflow
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

3. **Configure Environment Variables**
```env
# Required Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional Backend Configuration
VITE_DOCUMENT_ANALYSIS_BACKEND=supabase
VITE_FASTAPI_URL=http://localhost:8000
VITE_MAX_PAYLOAD_SIZE=10000000

# Development Settings
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

4. **Start Development Server**
```bash
npm run dev
```

---

## Project Structure Deep Dive

### Frontend Architecture

```
src/
├── components/              # Reusable UI components
│   ├── ui/                 # Base shadcn/ui components
│   │   ├── button.tsx      # Button component with variants
│   │   ├── card.tsx        # Card layout components
│   │   ├── dialog.tsx      # Modal dialog components
│   │   └── ...             # Other UI primitives
│   ├── document/           # Document-specific components
│   │   ├── DocumentUploadArea.tsx
│   │   └── TemplateMatchCard.tsx
│   ├── form-designer/      # Form builder components
│   │   ├── ComponentPalette.tsx
│   │   ├── FormCanvas.tsx
│   │   └── FieldProperties.tsx
│   ├── workflow-steps/     # Processing workflow steps
│   │   ├── CaptureStep.tsx
│   │   ├── ProcessStep.tsx
│   │   └── FinalizeStep.tsx
│   └── document-manager/   # Document management features
│       ├── DocumentGrid.tsx
│       ├── SmartSearch.tsx
│       └── SmartFolders.tsx
├── pages/                  # Route-level page components
│   ├── Index.tsx           # Dashboard/home page
│   ├── Upload.tsx          # Document upload page
│   ├── Templates.tsx       # Template management
│   ├── Forms.tsx           # Form management
│   └── Auth.tsx            # Authentication page
├── hooks/                  # Custom React hooks
│   ├── useAuth.tsx         # Authentication hook
│   ├── useDocumentAnalysis.ts
│   ├── useEnhancedTemplateMatching.ts
│   └── useFileUpload.ts
├── services/               # Business logic and API calls
│   ├── documentAnalysis.ts # AI document processing
│   ├── enhancedTemplateMatching.ts # Enhanced template recognition
│   ├── fileProcessing.ts   # File handling utilities
│   └── backendConfig.ts    # Backend configuration
├── contexts/               # React context providers
│   └── DocumentProcessingContext.tsx
├── types/                  # TypeScript type definitions
│   ├── document.ts         # Document-related types
│   ├── template.ts         # Template types
│   └── workflow.ts         # Workflow types
├── lib/                    # Utility functions
│   └── utils.ts            # Common utilities
├── assets/                 # Static assets
│   └── simplify-logo.png   # Brand assets
└── integrations/           # Third-party integrations
    └── supabase/           # Supabase configuration
        ├── client.ts       # Supabase client setup
        └── types.ts        # Generated database types
```

### Backend Structure (Supabase)

```
supabase/
├── migrations/             # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_templates.sql
│   └── ...
├── functions/              # Edge functions
│   ├── analyze-document/   # Document analysis function
│   ├── generate-embeddings/ # Vector embedding generation
│   ├── semantic-search/    # AI-powered search
│   └── organize-documents/ # Smart organization
└── config.toml            # Supabase configuration
```

---

## Development Workflow

### Git Workflow

We follow a feature branch workflow with conventional commits:

```bash
# Create feature branch
git checkout -b feature/document-upload-improvements
git checkout -b fix/template-matching-bug  
git checkout -b refactor/component-structure

# Make changes and commit
git add .
git commit -m "feat: add drag-and-drop document upload"
git commit -m "fix: resolve template matching confidence calculation"
git commit -m "refactor: extract reusable form components"

# Push and create PR
git push origin feature/document-upload-improvements
```

### Conventional Commit Types

- `feat:` - New features
- `fix:` - Bug fixes  
- `docs:` - Documentation changes
- `style:` - Code formatting (not affecting logic)
- `refactor:` - Code refactoring
- `test:` - Adding or modifying tests
- `chore:` - Maintenance tasks

### Code Review Process

1. **Create Pull Request**
   - Clear title and description
   - Link related issues
   - Include screenshots for UI changes

2. **Review Checklist**
   - Code follows style guidelines
   - Tests are included and passing
   - No console.log statements in production code
   - TypeScript types are properly defined
   - Accessibility considerations met

3. **Approval and Merge**
   - At least one approval required
   - All CI checks passing
   - Squash and merge for clean history

---

## Coding Standards

### TypeScript Guidelines

1. **Strict Type Checking**
```typescript
// Good: Proper interface definition
interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
}

// Avoid: Any types
interface ComponentProps {
  data: any; // ❌ Avoid 'any'
  callback: Function; // ❌ Use specific function types
}
```

2. **Enum Usage**
```typescript
// Good: Use enums for constants
enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Good: Use union types for simple options
type ButtonVariant = 'primary' | 'secondary' | 'outline';
```

3. **Generic Types**
```typescript
// Good: Reusable generic interfaces
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

// Usage
const documentResponse: ApiResponse<Document[]> = await fetchDocuments();
```

### React Component Guidelines

1. **Component Structure**
```typescript
// Good: Proper component structure
interface ComponentProps {
  // Props interface first
}

export const Component: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  // Hooks at the top
  const [state, setState] = useState();
  const customHook = useCustomHook();
  
  // Event handlers
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);
  
  // Early returns for loading/error states
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage />;
  
  // Main render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

2. **Props Destructuring**
```typescript
// Good: Destructure props in function signature
export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'medium', 
  children,
  onClick,
  ...rest 
}) => {
  // Component logic
};

// Avoid: Accessing props.property throughout component
export const Button: React.FC<ButtonProps> = (props) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

3. **Event Handler Naming**
```typescript
// Good: Consistent event handler naming
const handleSubmit = () => {};
const handleInputChange = () => {};
const handleFileSelect = () => {};

// Avoid: Inconsistent naming
const submit = () => {};
const onChange = () => {};
const fileSelected = () => {};
```

### Styling Guidelines

1. **Tailwind Class Organization**
```tsx
// Good: Organized class names
<div className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing  
  "p-4 mx-2 mb-4",
  // Styling
  "bg-white rounded-lg shadow-md",
  // States
  "hover:shadow-lg transition-shadow",
  // Responsive
  "md:p-6 lg:mx-4"
)}>
```

2. **Design System Usage**
```tsx
// Good: Use design system tokens
<Button variant="primary" size="lg">
  Submit
</Button>

// Avoid: Direct Tailwind classes for styled components
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Submit
</button>
```

---

## Testing Strategy

### Testing Structure
```
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx     # Component tests
│   └── __tests__/          # Additional test files
├── hooks/
│   ├── useAuth.tsx
│   └── useAuth.test.tsx    # Hook tests
├── services/
│   ├── api.ts
│   └── api.test.ts         # Service tests
└── utils/
    ├── helpers.ts
    └── helpers.test.ts     # Utility tests
```

### Unit Testing

```typescript
// Component testing example
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    render(<Button variant="outline">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useDocumentUpload } from '../useDocumentUpload';

describe('useDocumentUpload Hook', () => {
  it('should handle file upload', async () => {
    const { result } = renderHook(() => useDocumentUpload());
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.uploadProgress).toBe(100);
    expect(result.current.uploadedFile).toEqual(file);
  });
});
```

### Integration Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentManager } from '../DocumentManager';

describe('Document Manager Integration', () => {
  it('should load and display documents', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DocumentManager />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test Button.test.tsx

# Run tests with coverage
npm test -- --coverage

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

---

## Performance Optimization

### Code Splitting

```typescript
// Route-level code splitting
import { lazy, Suspense } from 'react';

const DocumentManager = lazy(() => import('../pages/DocumentManager'));
const TemplateEditor = lazy(() => import('../components/TemplateEditor'));

// Usage with suspense
<Suspense fallback={<PageSpinner />}>
  <DocumentManager />
</Suspense>
```

### React Performance

```typescript
// Memoize expensive calculations
const expensiveCalculation = useMemo(() => {
  return heavyProcessing(data);
}, [data]);

// Memoize callbacks to prevent re-renders
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);

// Memoize components that don't need frequent updates
const MemoizedComponent = memo(({ data }: Props) => {
  return <div>{data.title}</div>;
});
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npm run analyze

# Check for duplicate dependencies
npm ls --depth=0

# Audit dependencies for security issues
npm audit
```

---

## Debugging

### Development Tools

1. **React Developer Tools**
   - Install browser extension
   - Inspect component tree and props
   - Profile component performance

2. **VS Code Debugging**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug React App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

3. **Browser Console Debugging**
```typescript
// Development-only logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
  console.table(arrayData);
  console.time('Operation');
  // ... operation ...
  console.timeEnd('Operation');
}
```

### Error Boundaries

```typescript
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
```

### Common Issues and Solutions

1. **Authentication Issues**
```typescript
// Debug auth state
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event);
      console.log('Session:', session);
    }
  );
  return () => subscription.unsubscribe();
}, []);
```

2. **Performance Issues**
```typescript
// Profile component renders
useEffect(() => {
  console.log('Component rendered:', performance.now());
});

// Check for unnecessary re-renders
const whyDidYouRender = (name: string, props: any, prevProps: any) => {
  if (import.meta.env.DEV) {
    Object.keys(props).forEach(key => {
      if (props[key] !== prevProps[key]) {
        console.log(`${name} re-rendered because ${key} changed:`, {
          from: prevProps[key],
          to: props[key]
        });
      }
    });
  }
};
```

---

## Deployment

### Build Process

```bash
# Production build
npm run build

# Preview production build locally
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

### Environment Specific Builds

```bash
# Development build
npm run build:dev

# Staging build  
npm run build:staging

# Production build
npm run build:prod
```

### Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Storage buckets configured
- [ ] Authentication settings updated
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled
- [ ] SSL certificates valid
- [ ] Domain redirects configured

---

## Troubleshooting

### Common Development Issues

1. **Module Resolution Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript path mapping in tsconfig.json
```

2. **Supabase Connection Issues**
```typescript
// Verify Supabase configuration
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test connection
const testConnection = async () => {
  const { data, error } = await supabase.from('documents').select('count');
  console.log('Connection test:', { data, error });
};
```

3. **Build Issues**
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Clear TypeScript cache  
rm -rf node_modules/.cache

# Rebuild from scratch
npm run clean && npm install && npm run build
```

### Getting Help

1. **Internal Documentation** - Check `/docs` folder
2. **Code Comments** - Look for JSDoc comments in components
3. **Git History** - Check commit messages for context
4. **Team Communication** - Ask in development channels
5. **Issue Tracking** - Create GitHub issues for bugs