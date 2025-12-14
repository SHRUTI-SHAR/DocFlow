# API Documentation

## Overview

SimplifyAI DocFlow uses Supabase as its primary backend infrastructure, providing PostgreSQL database, authentication, storage, and edge functions for document processing.

## Authentication

All API requests (except public endpoints) require authentication using Supabase JWT tokens.

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting Authentication Token
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data: { session }, error } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Database APIs

### Documents

#### Get User Documents
```typescript
const { data: documents, error } = await supabase
  .from('documents')
  .select(`
    *,
    folders (
      id,
      name,
      color
    )
  `)
  .order('created_at', { ascending: false });
```

#### Create Document
```typescript
const { data: document, error } = await supabase
  .from('documents')
  .insert({
    name: 'Document Name',
    file_path: 'path/to/file',
    file_size: 1024,
    mime_type: 'application/pdf',
    folder_id: 'folder-uuid'
  })
  .select()
  .single();
```

#### Update Document
```typescript
const { data: document, error } = await supabase
  .from('documents')
  .update({
    name: 'Updated Name',
    tags: ['tag1', 'tag2'],
    folder_id: 'new-folder-uuid'
  })
  .eq('id', documentId)
  .select()
  .single();
```

#### Delete Document
```typescript
const { error } = await supabase
  .from('documents')
  .delete()
  .eq('id', documentId);
```

### Templates

#### Get Templates
```typescript
const { data: templates, error } = await supabase
  .from('templates')
  .select('*')
  .order('usage_count', { ascending: false });
```

#### Create Template
```typescript
const { data: template, error } = await supabase
  .from('templates')
  .insert({
    name: 'Template Name',
    description: 'Template description',
    fields: [
      {
        name: 'field_name',
        type: 'text',
        x: 100,
        y: 200,
        width: 150,
        height: 30
      }
    ],
    sample_image_url: 'path/to/image'
  })
  .select()
  .single();
```

### Forms

#### Get Forms
```typescript
const { data: forms, error } = await supabase
  .from('forms')
  .select('*')
  .order('created_at', { ascending: false });
```

#### Create Form
```typescript
const { data: form, error } = await supabase
  .from('forms')
  .insert({
    title: 'Form Title',
    description: 'Form description',
    schema: {
      fields: [
        {
          id: 'field1',
          type: 'text',
          label: 'Field Label',
          required: true
        }
      ]
    },
    is_public: true
  })
  .select()
  .single();
```

#### Submit Form Response
```typescript
const { data: submission, error } = await supabase
  .from('form_submissions')
  .insert({
    form_id: formId,
    data: {
      field1: 'value1',
      field2: 'value2'
    },
    submitted_at: new Date().toISOString()
  })
  .select()
  .single();
```

---

## Edge Functions

### Document Analysis

**Endpoint:** `/functions/v1/analyze-document`

**Purpose:** Performs OCR, field detection, and template matching on uploaded documents.

#### Request
```typescript
const { data, error } = await supabase.functions.invoke('analyze-document', {
  body: {
    documentData: base64String,
    task: 'ocr' | 'field_detection' | 'template_matching',
    documentName: 'document.pdf',
    enhancedTemplates: [] // Optional template data
  }
});
```

#### Response
```typescript
interface AnalysisResult {
  success: boolean;
  task: string;
  extracted_text?: string;
  fields?: DetectedField[];
  template_matches?: TemplateMatch[];
  confidence?: number;
  processing_time?: number;
  error?: string;
}
```

#### Example Usage
```typescript
import { supabase } from '@/integrations/supabase/client';

const analyzeDocument = async (file: File) => {
  // Convert file to base64
  const base64 = await fileToBase64(file);
  
  // Call edge function
  const { data, error } = await supabase.functions.invoke('analyze-document', {
    body: {
      documentData: base64,
      task: 'ocr',
      documentName: file.name
    }
  });
  
  if (error) {
    console.error('Analysis failed:', error);
    return null;
  }
  
  return data;
};
```

### Generate Embeddings

**Endpoint:** `/functions/v1/generate-embeddings`

**Purpose:** Creates vector embeddings for semantic search functionality.

#### Request
```typescript
const { data, error } = await supabase.functions.invoke('generate-embeddings', {
  body: {
    documentId: 'doc-uuid',
    content: 'document text content',
    metadata: {
      title: 'Document Title',
      tags: ['tag1', 'tag2']
    }
  }
});
```

#### Response
```typescript
interface EmbeddingResult {
  success: boolean;
  documentId: string;
  embeddingId?: string;
  error?: string;
}
```

### Semantic Search

**Endpoint:** `/functions/v1/semantic-search`

**Purpose:** Performs AI-powered semantic search across documents.

#### Request
```typescript
const { data, error } = await supabase.functions.invoke('semantic-search', {
  body: {
    query: 'search query text',
    filters: {
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      },
      tags: ['important', 'contracts'],
      folders: ['folder-uuid']
    },
    limit: 20,
    threshold: 0.7
  }
});
```

#### Response
```typescript
interface SearchResult {
  success: boolean;
  results: Array<{
    id: string;
    name: string;
    content_preview: string;
    similarity_score: number;
    metadata: {
      created_at: string;
      tags: string[];
      folder_name?: string;
    };
  }>;
  total_count: number;
  query_time: number;
}
```

### Form Generation

**Endpoint:** `/functions/v1/generate-form-app`

**Purpose:** Generates dynamic forms based on document templates or analysis results.

#### Request
```typescript
const { data, error } = await supabase.functions.invoke('generate-form-app', {
  body: {
    templateId?: 'template-uuid',
    analysisResult?: {
      fields: DetectedField[],
      confidence: number
    },
    formConfig: {
      title: 'Generated Form',
      includeValidation: true,
      styling: 'modern'
    }
  }
});
```

#### Response
```typescript
interface FormGenerationResult {
  success: boolean;
  form: {
    id: string;
    title: string;
    schema: FormSchema;
    public_url: string;
  };
  error?: string;
}
```

---

## Storage APIs

### File Upload

#### Upload Document
```typescript
const uploadDocument = async (file: File, folder = 'documents') => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
};
```

#### Get File URL
```typescript
const getFileUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};
```

#### Delete File
```typescript
const deleteFile = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('documents')
    .remove([filePath]);
    
  if (error) throw error;
};
```

---

## Real-time Subscriptions

### Document Changes
```typescript
const subscribeToDocuments = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('document-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};
```

### Processing Updates
```typescript
const subscribeToProcessing = (documentId: string, callback: (payload: any) => void) => {
  return supabase
    .channel('processing-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'processing_jobs',
        filter: `document_id=eq.${documentId}`
      },
      callback
    )
    .subscribe();
};
```

---

## Error Handling

### Standard Error Response
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}
```

### Common Error Codes
- `PGRST116` - Row not found
- `23505` - Unique constraint violation
- `42501` - Insufficient privilege
- `23503` - Foreign key constraint violation

### Error Handling Pattern
```typescript
const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  switch (error.code) {
    case 'PGRST116':
      return 'Resource not found';
    case '23505':
      return 'This item already exists';
    case '42501':
      return 'You don\'t have permission for this action';
    default:
      return 'An unexpected error occurred';
  }
};
```

---

## Rate Limiting

### Supabase Limits
- **Database operations**: 500 requests per minute per API key
- **Storage operations**: 200 requests per minute per API key  
- **Edge functions**: 100 requests per minute per function
- **Real-time connections**: 100 concurrent connections per project

### Best Practices
1. Implement client-side caching
2. Use batch operations when possible
3. Implement retry logic with exponential backoff
4. Cache frequently accessed data

---

## Security

### Row Level Security Policies

#### Documents Table
```sql
-- Users can only access their own documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);
```

#### Templates Table
```sql
-- Templates are shared across users but owned by creators
CREATE POLICY "Anyone can view templates" ON templates
  FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update templates" ON templates
  FOR UPDATE USING (auth.uid() = created_by);
```

### API Key Management
- Use environment variables for API keys
- Rotate keys regularly
- Use different keys for different environments
- Monitor API key usage

### Data Validation
```typescript
// Validate input data before API calls
const validateDocument = (doc: any): doc is Document => {
  return (
    typeof doc.name === 'string' &&
    typeof doc.file_path === 'string' &&
    typeof doc.mime_type === 'string' &&
    doc.name.length > 0
  );
};
```