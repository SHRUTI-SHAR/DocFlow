/**
 * Bulk Processing API Service
 * Handles all API calls to the backend-bulk service
 */

import type {
  BulkJob,
  BulkJobDocument,
  BulkJobCreateRequest,
  BulkJobUpdateRequest,
  BulkStatistics,
  ReviewQueueItem
} from '@/types/bulk-processing';

// Get bulk API URL from environment or use default
const getBulkApiUrl = (): string => {
  const url = import.meta.env.VITE_BULK_API_URL;
  if (!url) throw new Error('VITE_BULK_API_URL environment variable is required');
  return url;
};

// Get WebSocket URL from environment or construct from API URL
const getWebSocketUrl = (): string => {
  if (import.meta.env.VITE_BULK_WS_URL) {
    return import.meta.env.VITE_BULK_WS_URL;
  }
  const apiUrl = getBulkApiUrl();
  // Convert http to ws and https to wss
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  return `${wsUrl}/api/v1/bulk-processing/ws`;
};

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as { detail?: string | any; message?: string };
    // Handle FastAPI validation errors
    if (Array.isArray(errorData.detail)) {
      const validationErrors = errorData.detail.map((err: any) => 
        `${err.loc?.join('.') || 'field'}: ${err.msg}`
      ).join(', ');
      throw new Error(validationErrors);
    }
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// Helper function to get auth headers
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add user ID as auth token (from Supabase user)
  if (typeof window !== 'undefined') {
    // Try to get from localStorage first (set on login)
    let userId = window.localStorage.getItem('user_id');
    
    // If not in localStorage, try to get from Supabase session
    if (!userId) {
      const sessionStr = window.localStorage.getItem('sb-osxqecqvjunhgfbevafk-auth-token');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          userId = session?.user?.id;
          if (userId) {
            // Cache it for next time
            window.localStorage.setItem('user_id', userId);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    
    if (userId) {
      headers['Authorization'] = `Bearer ${userId}`;
    }
  }
  
  return headers;
}

/**
 * Jobs API
 */
export const bulkJobsApi = {
  /**
   * Get all bulk jobs
   */
  async getJobs(params?: { status?: string; limit?: number; offset?: number }): Promise<BulkJob[]> {
    const apiUrl = getBulkApiUrl();
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = `${apiUrl}/api/v1/bulk-jobs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ jobs: BulkJob[]; total: number }>(response);
    return data.jobs; // Extract jobs array from response
  },

  /**
   * Get a single bulk job by ID
   */
  async getJob(jobId: string): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Create a new bulk job
   */
  async createJob(jobData: BulkJobCreateRequest): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Update a bulk job
   */
  async updateJob(jobId: string, jobData: BulkJobUpdateRequest): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Delete a bulk job
   */
  async deleteJob(jobId: string): Promise<void> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { detail?: string; message?: string };
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
  },

  /**
   * Start a bulk job
   */
  async startJob(jobId: string): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Pause a bulk job
   */
  async pauseJob(jobId: string): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Resume a bulk job
   */
  async resumeJob(jobId: string): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/resume`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJob>(response);
  },

  /**
   * Stop a bulk job
   */
  async stopJob(jobId: string): Promise<BulkJob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/stop`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJob>(response);
  },
};

/**
 * Documents API
 */
export const bulkDocumentsApi = {
  /**
   * Get documents for a job
   */
  async getJobDocuments(jobId: string, params?: { status?: string; limit?: number; offset?: number }): Promise<BulkJobDocument[]> {
    const apiUrl = getBulkApiUrl();
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = `${apiUrl}/api/v1/bulk-jobs/${jobId}/documents${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ documents: BulkJobDocument[]; total: number } | BulkJobDocument[]>(response);
    // Handle both array and object response formats
    if (Array.isArray(data)) {
      return data;
    }
    return data.documents || [];
  },

  /**
   * Get a single document
   */
  async getDocument(jobId: string, documentId: string): Promise<BulkJobDocument> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJobDocument>(response);
  },

  /**
   * Retry a failed document
   */
  async retryDocument(jobId: string, documentId: string): Promise<BulkJobDocument> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<BulkJobDocument>(response);
  },

  /**
   * Get extracted fields for a document (paginated)
   */
  async getDocumentFields(jobId: string, documentId: string, params?: { 
    page?: number; 
    group?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ fields: any[]; total: number; page_numbers: number[] }> {
    const apiUrl = getBulkApiUrl();
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.group) queryParams.append('group', params.group);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = `${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/fields${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ fields: any[]; total: number; page_numbers: number[] }>(response);
  },

  /**
   * Get extracted fields grouped by page
   */
  async getDocumentFieldsGrouped(jobId: string, documentId: string): Promise<{ 
    pages: Record<number, any[]>; 
    total_fields: number;
    page_count: number;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/fields/grouped`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ pages: Record<number, any[]>; total_fields: number; page_count: number }>(response);
  },

  /**
   * Get field statistics for a document
   */
  async getDocumentFieldStats(jobId: string, documentId: string): Promise<{
    total_fields: number;
    fields_by_type: Record<string, number>;
    fields_by_group: Record<string, number>;
    needs_review_count: number;
    average_confidence: number;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/fields/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  /**
   * Get document transcript
   * Returns the human-readable text that the LLM sees during extraction and mapping
   */
  async getDocumentTranscript(jobId: string, documentId: string): Promise<{
    success: boolean;
    document_id: string;
    job_id: string;
    full_transcript: string;
    page_transcripts: Array<{ page: number; transcript: string }>;
    section_index: Record<string, any>;
    field_locations: Record<string, any>;
    total_pages: number;
    total_sections: number;
    generation_time_ms: number;
    created_at: string;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/transcript`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  /**
   * Update a specific field
   */
  async updateField(jobId: string, documentId: string, fieldId: string, updates: {
    field_value?: string;
    validation_status?: string;
    notes?: string;
  }): Promise<any> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/fields/${fieldId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<any>(response);
  },

  /**
   * Export single document data
   */
  async exportDocument(jobId: string, documentId: string): Promise<any> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/documents/${documentId}/export`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },
};

/**
 * Review Queue API
 */
export const reviewQueueApi = {
  /**
   * Get review queue items
   */
  async getReviewQueue(params?: { status?: string; limit?: number; offset?: number }): Promise<ReviewQueueItem[]> {
    const apiUrl = getBulkApiUrl();
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const url = `${apiUrl}/api/v1/review-queue${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<{ items: ReviewQueueItem[]; total: number; skip: number; limit: number }>(response);
    return result.items;
  },

  /**
   * Retry a document from review queue
   */
  async retryItem(itemId: string): Promise<ReviewQueueItem> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/review-queue/${itemId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<ReviewQueueItem>(response);
  },

  /**
   * Mark item as resolved
   */
  async resolveItem(itemId: string, notes?: string): Promise<ReviewQueueItem> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/review-queue/${itemId}/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes }),
    });
    return handleResponse<ReviewQueueItem>(response);
  },
};

/**
 * Statistics API
 * Note: Statistics endpoint may not be implemented yet in backend.
 * This will calculate basic stats from jobs list as fallback.
 */
export const bulkStatisticsApi = {
  /**
   * Get bulk processing statistics
   * Falls back to calculating from jobs if endpoint doesn't exist
   */
  async getStatistics(): Promise<BulkStatistics> {
    const apiUrl = getBulkApiUrl();
    try {
      const response = await fetch(`${apiUrl}/api/v1/bulk-statistics`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        return handleResponse<BulkStatistics>(response);
      }
    } catch (error) {
      // Endpoint may not exist yet, calculate from jobs
      console.warn('Statistics endpoint not available, calculating from jobs:', error);
    }
    
    // Fallback: Calculate statistics from jobs
    const jobs = await bulkJobsApi.getJobs();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const todayJobs = jobs.filter(job => new Date(job.createdAt) >= today);
    const weekJobs = jobs.filter(job => new Date(job.createdAt) >= weekAgo);
    const monthJobs = jobs.filter(job => new Date(job.createdAt) >= monthAgo);
    
    const totalProcessedToday = todayJobs.reduce((sum, job) => sum + job.processedDocuments, 0);
    const totalProcessedWeek = weekJobs.reduce((sum, job) => sum + job.processedDocuments, 0);
    const totalProcessedMonth = monthJobs.reduce((sum, job) => sum + job.processedDocuments, 0);
    
    const totalProcessed = jobs.reduce((sum, job) => sum + job.processedDocuments, 0);
    const totalFailed = jobs.reduce((sum, job) => sum + job.failedDocuments, 0);
    const total = totalProcessed + totalFailed;
    const successRate = total > 0 ? (totalProcessed / total) * 100 : 0;
    
    // Get review queue count
    let reviewQueueCount = 0;
    try {
      const reviewItems = await reviewQueueApi.getReviewQueue();
      reviewQueueCount = reviewItems.length;
    } catch (error) {
      // Ignore if review queue endpoint fails
    }
    
    return {
      totalProcessedToday,
      totalProcessedWeek,
      totalProcessedMonth,
      successRate,
      averageProcessingTime: 0, // Would need document-level data to calculate
      documentsInReviewQueue: reviewQueueCount
    };
  },
};

/**
 * Upload API
 */
export const bulkUploadApi = {
  /**
   * Upload PDF files
   */
  async uploadFiles(files: File[]): Promise<{ files: Array<{ filename: string; path: string; size: number }> }> {
    const apiUrl = getBulkApiUrl();
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await fetch(`${apiUrl}/api/v1/upload-files`, {
      method: 'POST',
      // Don't set Content-Type header - browser will set it with boundary
      body: formData,
    });
    return handleResponse<{ files: Array<{ filename: string; path: string; size: number }> }>(response);
  },

  /**
   * Create job with uploaded files
   */
  async createJobWithFiles(request: { 
    jobName: string; 
    files: Array<{ path: string; filename: string }>; 
    documentType?: 'general' | 'bank_statement' | 'identity_document';
  }): Promise<{ job: BulkJob }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/create-job-with-files`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<{ job: BulkJob }>(response);
  },

  /**
   * Create test job (no file upload needed)
   */
  async createTestJob(): Promise<{ job: BulkJob; document: BulkJobDocument }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/test-job`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ job: BulkJob; document: BulkJobDocument }>(response);
  },
};

/**
 * Export API
 */
export const bulkExportApi = {
  /**
   * Export job data to CSV
   */
  async exportToCsv(jobId: string): Promise<Blob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/export/csv?job_id=${jobId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { detail?: string; message?: string };
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Export job data to Excel (pivoted format - fields as columns)
   */
  async exportToExcelPivoted(jobId: string): Promise<Blob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/export/excel?job_id=${jobId}&format=pivoted`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { detail?: string; message?: string };
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Export job data to Excel (summary format - document statistics)
   */
  async exportToExcelSummary(jobId: string): Promise<Blob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/export/excel?job_id=${jobId}&format=summary`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { detail?: string; message?: string };
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.blob();
  },

  /**
   * Preview export data (first 10 rows)
   */
  async previewExport(jobId: string, limit: number = 10): Promise<any[]> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/export/preview?job_id=${jobId}&limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(response);
  },

  /**
   * Download a blob as a file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

// ==================== Mapping API ====================

export const bulkMappingApi = {
  /**
   * Upload Excel template and parse headers
   */
  async uploadTemplate(jobId: string, file: File, sheetName?: string): Promise<{
    columns: string[];
    sheet_name: string;
    row_count: number;
    all_sheets: string[];
  }> {
    const apiUrl = getBulkApiUrl();
    const formData = new FormData();
    formData.append('file', file);
    
    // For FormData, don't set Content-Type - let browser set it with boundary
    const headers: Record<string, string> = {};
    const authHeaders = getAuthHeaders();
    if (authHeaders['Authorization']) {
      headers['Authorization'] = authHeaders['Authorization'];
    }
    
    // Add sheet_name as query parameter if provided
    let url = `${apiUrl}/api/v1/bulk-jobs/${jobId}/upload-template`;
    if (sheetName) {
      url += `?sheet_name=${encodeURIComponent(sheetName)}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    return handleResponse<{ columns: string[]; sheet_name: string; row_count: number; all_sheets: string[] }>(response);
  },

  /**
   * Get AI-suggested field mappings
   */
  async suggestMapping(jobId: string, excelColumns: string[], templateId?: string): Promise<{
    mappings: Array<{
      excel_column: string;
      suggested_field: string | null;
      confidence: number;
      sample_value: string | null;
      alternative_fields: string[];
    }>;
    available_fields: Array<{
      field_name: string;
      field_label: string | null;
      field_type: string;
      field_group: string | null;
      sample_value: string | null;
      occurrence_count: number;
    }>;
    existing_template: string | null;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/suggest-mapping`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        excel_columns: excelColumns,
        template_id: templateId || null
      }),
    });
    return handleResponse<any>(response);
  },

  /**
   * Preview export data
   */
  async previewExport(jobId: string, request: {
    mappings: Record<string, string | null>;
    limit?: number;
    template_id?: string;  // Template ID for post-processing transformations
  }): Promise<{
    columns: string[];
    rows: Array<{
      document_id: string;
      document_name: string;
      values: Record<string, string | null>;
    }>;
    total_documents: number;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/export-preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<any>(response);
  },

  /**
   * Export data as Excel/CSV
   */
  async exportData(jobId: string, request: {
    mappings: Record<string, string | null>;
    format: 'xlsx' | 'csv';
    save_template?: boolean;
    template_name?: string;
    template_description?: string;
    template_id?: string;  // Template ID for post-processing transformations
    document_ids?: string[];
    expand_arrays?: boolean;  // DATA-DRIVEN ROWS - expand array fields into multiple rows
  }): Promise<Blob> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/bulk-jobs/${jobId}/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(error.detail || 'Export failed');
    }
    
    return response.blob();
  },

  /**
   * List saved mapping templates
   */
  async listTemplates(skip = 0, limit = 50): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string | null;
      excel_columns: string[];
      field_mappings: Record<string, string | null>;
      usage_count: number;
      created_at: string;
    }>;
    total: number;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/mapping-templates?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    excel_columns: string[];
    field_mappings: Record<string, string | null>;
    usage_count: number;
    created_at: string;
  }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/mapping-templates/${templateId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },

  /**
   * Create a new mapping template
   */
  async createTemplate(request: {
    name: string;
    description?: string;
    excel_columns: string[];
    field_mappings: Record<string, string | null>;
    document_type?: string;
  }): Promise<{ id: string; name: string }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/mapping-templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return handleResponse<any>(response);
  },

  /**
   * Delete a mapping template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean }> {
    const apiUrl = getBulkApiUrl();
    const response = await fetch(`${apiUrl}/api/v1/mapping-templates/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(response);
  },
};

/**
 * Export WebSocket URL getter
 */
export const getBulkWebSocketUrl = getWebSocketUrl;

/**
 * Export API URL getter
 */
export const getBulkApiBaseUrl = getBulkApiUrl;

