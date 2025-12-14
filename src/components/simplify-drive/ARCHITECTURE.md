# SimplifyDrive Architecture Deep Dive

## System Design Overview

This document provides an in-depth look at the architecture decisions behind SimplifyDrive, designed to handle enterprise-scale document management.

---

## 1. Layered Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                              │
│  React Components + Tailwind CSS + Shadcn UI                           │
│  ├── SimplifyDrive.tsx (Container)                                     │
│  ├── Feature Components (DocumentsView, FeatureContent, etc.)          │
│  └── UI Components (Cards, Buttons, Dialogs)                           │
├────────────────────────────────────────────────────────────────────────┤
│                         APPLICATION LAYER                               │
│  Custom Hooks + State Management                                        │
│  ├── useDocuments, useDocumentFiltering                                │
│  ├── React Query (Server State)                                        │
│  ├── useLocalStorage (Client Persistence)                              │
│  └── Context Providers (Auth, Theme)                                   │
├────────────────────────────────────────────────────────────────────────┤
│                         DOMAIN LAYER                                    │
│  Business Logic + Rules                                                 │
│  ├── Document Processing Rules                                         │
│  ├── Permission Evaluation                                             │
│  ├── Workflow Engine                                                   │
│  └── Compliance Policies                                               │
├────────────────────────────────────────────────────────────────────────┤
│                         INFRASTRUCTURE LAYER                            │
│  External Services + Data Access                                        │
│  ├── Supabase Client (PostgreSQL, Auth, Storage)                       │
│  ├── Edge Functions (Serverless Compute)                               │
│  ├── Vector Store (pgvector)                                           │
│  └── CDN (Asset Delivery)                                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### Container/Presenter Pattern

```
SimplifyDrive (Container)
├── Manages all state
├── Handles business logic
├── Coordinates child components
│
├── FeatureNavigation (Presenter)
│   └── Pure UI, receives props, emits events
│
├── SimplifyDriveHeader (Presenter)
│   └── Displays stats, search, actions
│
├── DocumentsView (Presenter)
│   └── Renders document grid/list
│
└── FeatureContent (Router)
    └── Dynamically loads feature dashboards
```

### Component Communication

```
                    ┌──────────────────┐
                    │  SimplifyDrive   │
                    │   (Container)    │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│FeatureNavigation│ │SimplifyDriveHdr │ │  DocumentsView  │
│                 │ │                 │ │                 │
│ onFeatureChange │ │ onSearchChange  │ │ onDocumentClick │
│       ↑         │ │ onViewModeChg   │ │       ↑         │
│       │         │ │       ↑         │ │       │         │
└───────┼─────────┘ └───────┼─────────┘ └───────┼─────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                    Props flow down
                    Events bubble up
```

---

## 3. Data Flow Architecture

### Unidirectional Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   User Action                                               │
│       │                                                     │
│       ▼                                                     │
│   Event Handler (in Container)                              │
│       │                                                     │
│       ▼                                                     │
│   State Update (useState/useReducer)                        │
│       │                                                     │
│       ├──────────────────────────────────────┐              │
│       │                                      │              │
│       ▼                                      ▼              │
│   Local State                           Server State        │
│   (UI, filters)                    (React Query/Supabase)   │
│       │                                      │              │
│       └──────────────────────────────────────┘              │
│                          │                                  │
│                          ▼                                  │
│                    Re-render                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Server State Management

```typescript
// Pattern: Custom hook wrapping Supabase
export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      setDocuments(processDocuments(data));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { fetchDocuments(); }, []);
  
  return { documents, loading, refetch: fetchDocuments };
};
```

---

## 4. Feature Module Pattern

Each feature is encapsulated as a self-contained module:

```
src/components/[feature-name]/
├── index.ts                    # Public exports
├── [Feature]Dashboard.tsx      # Main component
├── components/                 # Feature-specific components
│   ├── [Feature]List.tsx
│   ├── [Feature]Form.tsx
│   └── [Feature]Card.tsx
├── hooks/                      # Feature-specific hooks
│   └── use[Feature].ts
├── types/                      # Feature-specific types
│   └── index.ts
└── utils/                      # Feature-specific utilities
    └── [feature]Utils.ts
```

### Feature Registration

Features are registered in `featureTabs.ts` and rendered by `FeatureContent`:

```typescript
// Registration
export const FEATURE_TABS = [
  { id: 'documents', component: 'core', ... },
  { id: 'workflows', component: 'WorkflowDashboard', ... },
];

// Rendering
const FeatureContent: React.FC<Props> = ({ activeFeature }) => {
  switch (activeFeature) {
    case 'workflows':
      return <WorkflowDashboard />;
    // Dynamic import for code splitting
    default:
      return <LazyLoadFeature featureId={activeFeature} />;
  }
};
```

---

## 5. Scalability Patterns

### Pagination Strategy

```typescript
// Cursor-based pagination for large datasets
interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

const fetchPage = async (cursor?: string): Promise<CursorPaginationResult<Document>> => {
  let query = supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  
  if (cursor) {
    query = query.lt('created_at', cursor);
  }
  
  const { data } = await query;
  
  return {
    data,
    nextCursor: data?.[data.length - 1]?.created_at ?? null,
    hasMore: data?.length === PAGE_SIZE
  };
};
```

### Virtual Scrolling

```typescript
// Render only visible items
const VirtualDocumentList: React.FC<Props> = ({ documents }) => {
  const { virtualItems, totalSize, scrollRef } = useVirtualScroll({
    items: documents,
    itemHeight: 80,
    overscan: 5
  });
  
  return (
    <div ref={scrollRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: totalSize }}>
        {virtualItems.map(({ item, style }) => (
          <DocumentRow key={item.id} document={item} style={style} />
        ))}
      </div>
    </div>
  );
};
```

### Optimistic Updates

```typescript
// Update UI immediately, sync with server
const updateDocument = async (id: string, updates: Partial<Document>) => {
  // Optimistic update
  setDocuments(prev => 
    prev.map(d => d.id === id ? { ...d, ...updates } : d)
  );
  
  try {
    await supabase.from('documents').update(updates).eq('id', id);
  } catch (error) {
    // Rollback on failure
    refetch();
    throw error;
  }
};
```

---

## 6. AI Integration Architecture

### Document Processing Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│   Queue     │────▶│  Process    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
            │    OCR      │            │  Classify   │            │   Extract   │
            │  (Vision)   │            │   (ML)      │            │   (NLP)     │
            └─────────────┘            └─────────────┘            └─────────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                               ▼
                                       ┌─────────────┐
                                       │   Index     │
                                       │  (Vector)   │
                                       └─────────────┘
                                               │
                                               ▼
                                       ┌─────────────┐
                                       │  Complete   │
                                       │  (Webhook)  │
                                       └─────────────┘
```

### Vector Search Architecture

```
Query: "contracts expiring next month"
                    │
                    ▼
           ┌─────────────┐
           │  Embedding  │  → Convert to 1536-dim vector
           │   Model     │
           └─────────────┘
                    │
                    ▼
           ┌─────────────┐
           │  pgvector   │  → Similarity search (cosine distance)
           │   Search    │
           └─────────────┘
                    │
                    ▼
           ┌─────────────┐
           │  Rerank     │  → LLM-based relevance scoring
           │  Results    │
           └─────────────┘
                    │
                    ▼
           Return top-k documents
```

---

## 7. Security Architecture

### Row-Level Security (RLS)

```sql
-- Users can only access their own documents
CREATE POLICY "documents_user_isolation"
ON documents FOR ALL
USING (auth.uid() = user_id);

-- Shared documents: check share permissions
CREATE POLICY "documents_shared_access"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_shares ds
    WHERE ds.document_id = documents.id
      AND ds.shared_with = auth.uid()
      AND (ds.expires_at IS NULL OR ds.expires_at > now())
  )
);
```

### API Security

```typescript
// Edge function authentication
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 8. State Machine for Workflows

```
                    ┌─────────────────┐
                    │     Draft       │
                    └────────┬────────┘
                             │ submit
                             ▼
         ┌───────────────────────────────────┐
         │           Pending Review           │
         └───────────────────┬───────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         approve          reject         escalate
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  Approved   │ │  Rejected   │ │  Escalated  │
     └─────────────┘ └─────────────┘ └─────────────┘
              │                              │
              │                              │
              ▼                              ▼
     ┌─────────────┐               ┌─────────────┐
     │  Published  │               │ Higher-Level│
     └─────────────┘               │   Review    │
                                   └─────────────┘
```

---

## 9. Error Handling Strategy

### Error Boundaries

```typescript
// Wrap feature components
<ErrorBoundary fallback={<FeatureErrorFallback />}>
  <FeatureContent activeFeature={activeFeature} />
</ErrorBoundary>
```

### API Error Handling

```typescript
const handleApiError = (error: Error, context: string) => {
  console.error(`[${context}]`, error);
  
  // User-friendly message
  toast({
    title: 'Something went wrong',
    description: getErrorMessage(error),
    variant: 'destructive'
  });
  
  // Error tracking
  trackError(error, { context });
};
```

### Retry Logic

```typescript
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
};
```

---

## 10. Testing Strategy

### Unit Testing (Components)

```typescript
describe('DocumentsView', () => {
  it('renders documents in grid view', () => {
    render(<DocumentsView documents={mockDocuments} viewMode="grid" />);
    expect(screen.getAllByRole('article')).toHaveLength(mockDocuments.length);
  });
  
  it('calls onDocumentClick when document is clicked', () => {
    const onDocumentClick = jest.fn();
    render(<DocumentsView documents={mockDocuments} onDocumentClick={onDocumentClick} />);
    
    fireEvent.click(screen.getByText(mockDocuments[0].file_name));
    expect(onDocumentClick).toHaveBeenCalledWith(mockDocuments[0]);
  });
});
```

### Integration Testing (Hooks)

```typescript
describe('useDocuments', () => {
  it('fetches documents on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDocuments());
    
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.documents).toHaveLength(5);
  });
});
```

### E2E Testing (Playwright)

```typescript
test('user can upload a document', async ({ page }) => {
  await page.goto('/documents');
  
  // Click upload button
  await page.click('button:has-text("Upload")');
  
  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./test-files/sample.pdf');
  
  // Verify upload success
  await expect(page.locator('text=Document uploaded successfully')).toBeVisible();
});
```

---

## 11. Performance Monitoring

### Key Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Document List Render | < 200ms | Performance API |
| Search Response | < 500ms | API timing |

### Monitoring Implementation

```typescript
// Performance tracking hook
const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      trackMetric(`${componentName}_render_time`, duration);
    };
  }, [componentName]);
};
```

---

*This architecture documentation should be updated as the system evolves.*
