# SimplifyDrive AI Integration Guide

> Complete guide to AI-powered features in SimplifyDrive.

---

## Overview

SimplifyDrive leverages AI throughout the document lifecycle to automate tedious tasks, extract insights, and enhance productivity.

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Capabilities                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Document   │  │   Content    │  │   Smart      │           │
│  │  Processing  │  │  Generation  │  │   Search     │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                 │                 │                    │
│         ▼                 ▼                 ▼                    │
│  • OCR Extraction   • Summaries      • Semantic Search          │
│  • Classification   • Key Points     • Similarity Match         │
│  • Auto-Tagging     • Action Items   • Natural Language         │
│  • Entity Extract   • Translations   • Question Answering       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Document Processing Pipeline

### Automatic Processing Flow

When a document is uploaded, it goes through an AI-powered processing pipeline:

```
Upload → Queue → OCR → Classify → Extract → Tag → Index → Complete
```

### 1.1 OCR & Text Extraction

Extracts text from images, PDFs, and scanned documents.

**Supported Formats:**
- PDF (text & scanned)
- Images (PNG, JPG, TIFF)
- Microsoft Office (DOCX, XLSX, PPTX)
- Scanned documents

**Configuration:**

```typescript
interface OCROptions {
  language?: string[];        // ['en', 'es', 'fr']
  enhanceScanned?: boolean;   // Image preprocessing
  detectTables?: boolean;     // Table structure detection
  preserveLayout?: boolean;   // Maintain document layout
}
```

**Usage:**

```typescript
const { data, error } = await supabase.functions.invoke('process-document', {
  body: {
    documentId,
    options: {
      extractText: true,
      ocrOptions: {
        language: ['en'],
        enhanceScanned: true,
        detectTables: true,
      }
    }
  }
});
```

### 1.2 Document Classification

Automatically classifies documents into categories.

**Built-in Categories:**

| Category | Examples |
|----------|----------|
| `invoice` | Bills, invoices, receipts |
| `contract` | Legal agreements, NDAs |
| `report` | Business reports, analyses |
| `correspondence` | Emails, letters, memos |
| `form` | Application forms, surveys |
| `presentation` | Slides, pitch decks |
| `financial` | Statements, tax documents |
| `legal` | Court documents, filings |
| `hr` | Resumes, policies |
| `technical` | Specifications, manuals |

**Custom Categories:**

```typescript
// Define custom classification rules
const customRules = {
  categories: [
    {
      name: 'purchase_order',
      keywords: ['PO#', 'purchase order', 'vendor'],
      patterns: [/PO-\d{6}/],
    },
    {
      name: 'shipping_document',
      keywords: ['bill of lading', 'tracking', 'shipment'],
    }
  ]
};

await supabase.functions.invoke('configure-classifier', {
  body: { rules: customRules }
});
```

### 1.3 Entity Extraction

Extracts structured data from documents.

**Extracted Entities:**

| Entity Type | Examples |
|-------------|----------|
| `dates` | Due dates, expiry dates |
| `amounts` | Prices, totals, quantities |
| `people` | Names, titles |
| `organizations` | Company names |
| `addresses` | Physical addresses |
| `emails` | Email addresses |
| `phones` | Phone numbers |
| `references` | Invoice #, PO #, Case # |

**Usage:**

```typescript
const { data } = await supabase.functions.invoke('extract-entities', {
  body: { documentId }
});

// Response
{
  entities: {
    dates: [
      { value: '2024-12-31', type: 'due_date', confidence: 0.95 }
    ],
    amounts: [
      { value: 1500.00, currency: 'USD', type: 'total', confidence: 0.92 }
    ],
    organizations: [
      { value: 'Acme Corp', type: 'vendor', confidence: 0.88 }
    ]
  }
}
```

### 1.4 Auto-Tagging

Automatically suggests relevant tags based on content.

```typescript
const { data } = await supabase.functions.invoke('suggest-tags', {
  body: {
    documentId,
    maxTags: 5,
    minConfidence: 0.7,
    existingTags: true,  // Use existing tag vocabulary
  }
});

// Response
{
  suggestedTags: [
    { name: 'contract', confidence: 0.95, isExisting: true },
    { name: 'legal', confidence: 0.88, isExisting: true },
    { name: 'NDA', confidence: 0.82, isExisting: false },
  ]
}
```

---

## 2. AI Summaries

### Summary Types

| Type | Description | Use Case |
|------|-------------|----------|
| `executive` | Brief overview (1-2 paragraphs) | Quick scanning |
| `detailed` | Comprehensive summary | Deep understanding |
| `key_points` | Bullet points | Quick reference |
| `action_items` | Tasks & deadlines | Follow-up tracking |
| `comparison` | Compare multiple docs | Decision making |

### Generate Summary

```typescript
import { useDocumentSummary } from '@/hooks/useDocumentSummary';

const { generateSummary, loading } = useDocumentSummary(documentId);

// Generate executive summary
const summary = await generateSummary({
  type: 'executive',
  language: 'en',
  maxLength: 300,
});

// Generate key points
const keyPoints = await generateSummary({
  type: 'key_points',
  maxPoints: 5,
});

// Generate action items
const actions = await generateSummary({
  type: 'action_items',
  includeDueDates: true,
});
```

### Multi-Language Support

Summaries can be generated in multiple languages:

```typescript
const summary = await generateSummary({
  type: 'executive',
  language: 'es',  // Spanish
});

// Supported languages:
// en, es, fr, de, it, pt, nl, ru, zh, ja, ko, ar
```

### Summary UI Component

```typescript
import { DocumentSummaryDialog } from '@/components/document-summary';

<DocumentSummaryDialog
  document={document}
  open={showSummary}
  onClose={() => setShowSummary(false)}
/>
```

---

## 3. Semantic Search

### How It Works

1. **Indexing**: Documents are converted to vector embeddings (1536 dimensions)
2. **Query**: User query is converted to the same vector space
3. **Search**: Cosine similarity finds most relevant documents
4. **Rerank**: LLM reranks results for relevance

### Vector Embeddings

```sql
-- Documents are indexed with embeddings
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents,
  embedding vector(1536),
  chunk_index INTEGER,
  chunk_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Similarity search index
CREATE INDEX idx_embeddings_vector 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Search API

```typescript
const searchDocuments = async (query: string) => {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: {
      query,
      limit: 10,
      threshold: 0.7,      // Minimum similarity score
      rerank: true,        // Enable LLM reranking
      filters: {
        documentTypes: ['contract', 'invoice'],
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        }
      }
    }
  });

  return data.results;
};
```

### Natural Language Queries

The search understands natural language:

| Query | Interpretation |
|-------|----------------|
| "contracts expiring next month" | Date-aware contract search |
| "invoices over $10,000" | Amount-filtered search |
| "documents from Acme Corp" | Organization filter |
| "similar to this contract" | Similarity search |

### Search UI Integration

```typescript
import { SmartSearch } from '@/components/document-manager/SmartSearch';

<SmartSearch
  onSearch={handleSearch}
  onResultClick={handleDocumentClick}
  placeholder="Search documents naturally..."
  enableFilters={true}
/>
```

---

## 4. Smart Folders

### Automatic Organization

Smart folders automatically organize documents based on AI classification:

```typescript
interface SmartFolder {
  name: string;
  rules: SmartRule[];
  matchMode: 'all' | 'any';
}

interface SmartRule {
  field: 'document_type' | 'tags' | 'content' | 'date' | 'sender';
  operator: 'equals' | 'contains' | 'matches' | 'before' | 'after';
  value: string | string[] | Date;
}
```

### Create Smart Folder

```typescript
const createSmartFolder = async () => {
  await supabase.from('smart_folders').insert({
    name: 'Contracts Expiring Soon',
    is_smart: true,
    rules: [
      { field: 'document_type', operator: 'equals', value: 'contract' },
      { field: 'metadata.expiry_date', operator: 'before', value: '30d' }
    ],
    match_mode: 'all'
  });
};
```

### System Smart Folders

Pre-configured smart folders:

| Folder | Rule |
|--------|------|
| 📄 Recent | Created in last 7 days |
| ⭐ Important | Importance score > 0.8 |
| 📧 Correspondence | Type = email, letter |
| 💰 Financial | Type = invoice, receipt, statement |
| ⚖️ Legal | Type = contract, legal |
| 🔄 Processing | Status = pending, processing |

---

## 5. AI Recommendations

### Recommendation Types

| Type | Description |
|------|-------------|
| `related_documents` | Similar content |
| `suggested_tags` | Tags to add |
| `sharing_suggestions` | Who might need access |
| `action_reminders` | Follow-up actions |
| `organization_tips` | Filing suggestions |

### Get Recommendations

```typescript
const { data } = await supabase.functions.invoke('get-recommendations', {
  body: {
    documentId,
    types: ['related_documents', 'action_reminders'],
    limit: 5,
  }
});

// Response
{
  recommendations: [
    {
      type: 'related_documents',
      items: [
        { documentId: '...', name: 'Related Contract', similarity: 0.89 }
      ]
    },
    {
      type: 'action_reminders',
      items: [
        { action: 'Review before expiry', dueDate: '2024-12-31' }
      ]
    }
  ]
}
```

### UI Component

```typescript
import { AIRecommendations } from '@/components/document-manager/AIRecommendations';

<AIRecommendations
  documentId={documentId}
  onRecommendationClick={handleAction}
/>
```

---

## 6. Document Comparison

### AI-Powered Diff

Compare documents with AI-generated insights:

```typescript
const { data } = await supabase.functions.invoke('compare-documents', {
  body: {
    documentIds: [doc1Id, doc2Id],
    options: {
      highlightChanges: true,
      generateSummary: true,
      detectSemanticChanges: true,
    }
  }
});

// Response
{
  comparison: {
    addedSections: [...],
    removedSections: [...],
    modifiedSections: [...],
    semanticChanges: [
      { type: 'term_change', description: 'Payment terms changed from 30 to 45 days' }
    ],
    summary: 'Key differences: ...'
  }
}
```

### Version Comparison UI

```typescript
import { ComparisonDashboard } from '@/components/document-comparison';

<ComparisonDashboard
  documents={documents}
  onCompare={handleCompare}
/>
```

---

## 7. Question Answering (Q&A)

Ask questions about document content:

```typescript
const { data } = await supabase.functions.invoke('document-qa', {
  body: {
    documentId,  // or documentIds for multi-doc Q&A
    question: 'What is the payment deadline?',
    options: {
      citeSources: true,
      confidence: true,
    }
  }
});

// Response
{
  answer: 'The payment deadline is December 31, 2024.',
  confidence: 0.94,
  sources: [
    { page: 2, paragraph: 3, text: '...payment due by December 31, 2024...' }
  ]
}
```

---

## 8. Configuration

### AI Settings

```typescript
// User AI preferences
interface AISettings {
  enableAutoTagging: boolean;
  enableAutoSummaries: boolean;
  enableSmartFolders: boolean;
  enableRecommendations: boolean;
  summaryLanguage: string;
  confidenceThreshold: number;
}

// Update settings
const updateAISettings = async (settings: Partial<AISettings>) => {
  await supabase
    .from('user_preferences')
    .update({ ai_settings: settings })
    .eq('user_id', userId);
};
```

### Processing Priorities

```typescript
// Document processing priority
type ProcessingPriority = 'high' | 'normal' | 'low' | 'batch';

// Set priority
await supabase.functions.invoke('set-processing-priority', {
  body: {
    documentId,
    priority: 'high',
  }
});
```

---

## 9. RAG Integration

### Enabling RAG for Documents

Documents can optionally be indexed for RAG (Retrieval-Augmented Generation):

```typescript
// During upload
const uploadWithRAG = async (file: File, enableRAG: boolean) => {
  const doc = await uploadDocument(file);
  
  if (enableRAG) {
    await supabase.functions.invoke('index-for-rag', {
      body: { documentId: doc.id }
    });
  }
};
```

### Querying with RAG

```typescript
const ragQuery = async (question: string) => {
  const { data } = await supabase.functions.invoke('rag-query', {
    body: {
      question,
      maxSources: 5,
      includeMetadata: true,
    }
  });
  
  return {
    answer: data.answer,
    sources: data.sources,
    confidence: data.confidence,
  };
};
```

---

## 10. Performance Considerations

### Caching

AI results are cached to reduce costs and latency:

```typescript
// Summary caching
{
  cacheKey: `summary:${documentId}:${type}:${language}`,
  ttl: 86400,  // 24 hours
  invalidateOn: ['document_updated', 'content_changed']
}
```

### Rate Limiting

| Operation | Rate Limit |
|-----------|------------|
| OCR Processing | 10/minute |
| Summary Generation | 30/minute |
| Semantic Search | 100/minute |
| Q&A Queries | 20/minute |

### Cost Optimization

```typescript
// Batch processing for cost efficiency
const batchProcess = async (documentIds: string[]) => {
  await supabase.functions.invoke('batch-process', {
    body: {
      documentIds,
      operations: ['extract', 'classify', 'tag'],
      priority: 'batch',  // Lower cost, slower processing
    }
  });
};
```

---

## 11. Monitoring & Analytics

### AI Usage Metrics

```typescript
const getAIMetrics = async (dateRange: DateRange) => {
  const { data } = await supabase
    .from('ai_usage_metrics')
    .select('*')
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end);
  
  return {
    totalOperations: data.length,
    byType: groupBy(data, 'operation_type'),
    avgLatency: average(data, 'latency_ms'),
    successRate: calculateSuccessRate(data),
  };
};
```

### Error Handling

```typescript
try {
  const result = await generateSummary(documentId);
} catch (error) {
  if (error.code === 'AI_RATE_LIMITED') {
    // Retry with exponential backoff
  } else if (error.code === 'AI_CONTENT_TOO_LONG') {
    // Split document and process in chunks
  } else if (error.code === 'AI_UNSUPPORTED_FORMAT') {
    // Fall back to basic extraction
  }
}
```

---

*AI Integration Guide v1.0.0 | Last Updated: December 2024*
