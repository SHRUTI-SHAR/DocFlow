# Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the SimplifyAI DocFlow application, including usage examples, props interfaces, and best practices.

## Component Categories

### 1. UI Components (`src/components/ui/`)
Base components from shadcn/ui library, customized for our design system.

### 2. Feature Components (`src/components/`)
Application-specific components that implement business logic.

### 3. Page Components (`src/pages/`)
Route-level components that compose the application pages.

---

## Core UI Components

### Button Component

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}
```

**Usage:**
```tsx
import { Button } from "@/components/ui/button";

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="outline" size="lg">
  Large Outline Button
</Button>

// With icons
<Button variant="ghost" size="icon">
  <Download className="h-4 w-4" />
</Button>
```

### Card Component

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}
```

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Document Analysis</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Processing results will appear here...</p>
  </CardContent>
</Card>
```

### Dialog Component

```typescript
interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}
```

**Usage:**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <p>Are you sure you want to proceed?</p>
  </DialogContent>
</Dialog>
```

---

## Feature Components

### DocumentUpload Component

**Location:** `src/components/DocumentUpload.tsx`

**Purpose:** Handles document file uploads with drag-and-drop functionality, file validation, and progress tracking.

```typescript
interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
import { DocumentUpload } from "@/components/DocumentUpload";

<DocumentUpload
  onFileSelect={(file) => console.log('File selected:', file)}
  acceptedTypes={['application/pdf', 'image/*']}
  maxSize={10 * 1024 * 1024} // 10MB
  multiple={false}
/>
```

**Features:**
- Drag and drop interface
- File type validation
- Size limit enforcement
- Progress indication
- Error handling and user feedback

### TemplateEditor Component

**Location:** `src/components/TemplateEditor.tsx`

**Purpose:** Visual editor for creating and modifying document templates with field positioning and configuration.

```typescript
interface TemplateEditorProps {
  template?: Template;
  onSave: (template: Template) => void;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

interface Template {
  id: string;
  name: string;
  description?: string;
  fields: TemplateField[];
  image?: string;
  created_at: string;
  updated_at: string;
}
```

**Usage:**
```tsx
import { TemplateEditor } from "@/components/TemplateEditor";

<TemplateEditor
  template={existingTemplate}
  mode="edit"
  onSave={(template) => saveTemplate(template)}
  onCancel={() => setEditingMode(false)}
/>
```

**Features:**
- Visual field positioning
- Field type configuration
- Template preview
- Validation rules setup
- Save/cancel operations

### FormDesigner Component

**Location:** `src/components/FormDesigner.tsx`

**Purpose:** Drag-and-drop form builder for creating dynamic forms based on document templates.

```typescript
interface FormDesignerProps {
  initialForm?: FormSchema;
  onSave: (form: FormSchema) => void;
  onPreview: (form: FormSchema) => void;
  template?: Template;
}

interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
}
```

**Usage:**
```tsx
import { FormDesigner } from "@/components/FormDesigner";

<FormDesigner
  template={documentTemplate}
  onSave={(form) => handleFormSave(form)}
  onPreview={(form) => showFormPreview(form)}
/>
```

**Features:**
- Component palette
- Drag-and-drop interface
- Field property editor
- Form validation setup
- Real-time preview

### DocumentProcessingWorkflow Component

**Location:** `src/components/DocumentProcessingWorkflow.tsx`

**Purpose:** Orchestrates the complete document processing pipeline with step-by-step progress tracking.

```typescript
interface DocumentProcessingWorkflowProps {
  onComplete?: (result: ProcessingResult) => void;
}

interface ProcessingStep {
  key: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  icon: React.ComponentType;
}
```

**Usage:**
```tsx
import { DocumentProcessingWorkflow } from "@/components/DocumentProcessingWorkflow";

<DocumentProcessingWorkflow
  onComplete={(result) => {
    console.log('Processing completed:', result);
    navigate('/documents');
  }}
/>
```

**Features:**
- Step progress tracking
- Error handling and recovery
- Real-time status updates
- Result processing and storage

---

## Navigation Components

### Navigation Component

**Location:** `src/components/Navigation.tsx`

**Purpose:** Main application navigation with responsive design and authentication integration.

```typescript
interface NavigationProps {
  className?: string;
}
```

**Usage:**
```tsx
import { Navigation } from "@/components/Navigation";

// Used in App.tsx for all protected routes
<ProtectedRoute>
  <Navigation />
  <PageContent />
</ProtectedRoute>
```

**Features:**
- Responsive mobile navigation
- User authentication status
- Active route highlighting
- Logo and branding
- Logout functionality

---

## Workflow Components

### WorkflowStep Component

**Location:** `src/components/workflow-steps/WorkflowStep.tsx`

**Purpose:** Base component for individual workflow steps with consistent styling and behavior.

```typescript
interface WorkflowStepProps {
  title: string;
  description: string;
  icon: React.ComponentType;
  status: StepStatus;
  onNext?: () => void;
  onPrevious?: () => void;
  children: React.ReactNode;
}
```

### CombinedCaptureStep Component

**Location:** `src/components/workflow-steps/CombinedCaptureStep.tsx`

**Purpose:** Handles document capture through upload or camera with validation and preprocessing.

```typescript
interface CombinedCaptureStepProps {
  onCapture: (file: File, extractedText?: string) => void;
  onProgress: (progress: number, stage: string) => void;
}
```

---

## Document Manager Components

### DocumentGrid Component

**Location:** `src/components/document-manager/DocumentGrid.tsx`

**Purpose:** Grid layout for displaying documents with thumbnails, metadata, and actions.

```typescript
interface DocumentGridProps {
  documents: Document[];
  onSelect: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onMove: (documentId: string, folderId: string) => void;
  selectedIds: string[];
}
```

### SmartSearch Component

**Location:** `src/components/document-manager/SmartSearch.tsx`

**Purpose:** AI-powered semantic search for documents with filtering and sorting capabilities.

```typescript
interface SmartSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onResults: (results: SearchResult[]) => void;
  placeholder?: string;
}
```

---

## Form Components

### DynamicFormRenderer Component

**Location:** `src/components/DynamicFormRenderer.tsx`

**Purpose:** Renders forms dynamically from JSON schema with validation and submission handling.

```typescript
interface DynamicFormRendererProps {
  schema: FormSchema;
  onSubmit: (data: FormData) => void;
  initialData?: Partial<FormData>;
  readOnly?: boolean;
}
```

**Usage:**
```tsx
import { DynamicFormRenderer } from "@/components/DynamicFormRenderer";

<DynamicFormRenderer
  schema={formSchema}
  onSubmit={(data) => handleSubmission(data)}
  initialData={existingData}
  readOnly={false}
/>
```

---

## Best Practices

### Component Creation Guidelines

1. **Single Responsibility Principle**
   - Each component should have one clear purpose
   - Break down complex components into smaller, focused ones

2. **Props Interface Design**
   ```typescript
   // Good: Clear, typed interface
   interface ComponentProps {
     data: DataType;
     onAction: (id: string) => void;
     variant?: 'primary' | 'secondary';
   }
   
   // Avoid: Unclear or any types
   interface ComponentProps {
     props: any;
     callback: Function;
   }
   ```

3. **Error Boundaries**
   ```tsx
   // Wrap complex components with error boundaries
   <ErrorBoundary fallback={<ErrorFallback />}>
     <ComplexComponent />
   </ErrorBoundary>
   ```

### Performance Optimization

1. **Memoization**
   ```tsx
   // Memoize expensive calculations
   const expensiveValue = useMemo(() => 
     heavyCalculation(data), [data]
   );
   
   // Memoize callbacks
   const handleClick = useCallback((id: string) => {
     onAction(id);
   }, [onAction]);
   ```

2. **Code Splitting**
   ```tsx
   // Lazy load heavy components
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   
   <Suspense fallback={<Spinner />}>
     <HeavyComponent />
   </Suspense>
   ```

### Accessibility Guidelines

1. **Semantic HTML**
   ```tsx
   // Use proper HTML elements
   <button onClick={handleClick}>Submit</button>
   // Instead of
   <div onClick={handleClick}>Submit</div>
   ```

2. **ARIA Labels**
   ```tsx
   <button 
     aria-label="Delete document"
     onClick={() => onDelete(doc.id)}
   >
     <Trash className="h-4 w-4" />
   </button>
   ```

3. **Keyboard Navigation**
   ```tsx
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' || e.key === ' ') {
       handleClick();
     }
   };
   ```

### Testing Components

```tsx
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentUpload } from '../DocumentUpload';

describe('DocumentUpload', () => {
  it('should call onFileSelect when file is dropped', async () => {
    const mockOnFileSelect = jest.fn();
    render(<DocumentUpload onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText(/drag and drop/i);
    
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    
    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });
});
```