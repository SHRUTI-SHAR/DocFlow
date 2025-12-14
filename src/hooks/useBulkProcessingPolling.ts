/**
 * useBulkProcessingPolling Hook
 * Polling fallback for real-time updates when WebSocket is unavailable
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { BulkJob, BulkJobDocument, ReviewQueueItem } from '@/types/bulk-processing';

interface UseBulkProcessingPollingOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onJobUpdate?: (jobs: BulkJob[]) => void;
  onDocumentUpdate?: (documents: BulkJobDocument[]) => void;
  onReviewQueueUpdate?: (items: ReviewQueueItem[]) => void;
  onError?: (error: Error) => void;
  jobId?: string; // Optional: poll specific job
}

export const useBulkProcessingPolling = (options: UseBulkProcessingPollingOptions = {}) => {
  const {
    enabled = false,
    interval = 5000, // Default 5 seconds
    onJobUpdate,
    onDocumentUpdate,
    onReviewQueueUpdate,
    onError,
    jobId
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const poll = useCallback(async () => {
    if (!enabled) return;

    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Get bulk API base URL
      const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
      if (!bulkApiUrl) throw new Error('VITE_BULK_API_URL is required');

      // Poll jobs
      if (onJobUpdate) {
        const jobsResponse = await fetch(`${bulkApiUrl}/api/v1/bulk-jobs`, { signal });
        if (jobsResponse.ok) {
          const jobs: BulkJob[] = await jobsResponse.json();
          onJobUpdate(jobs);
        }
      }

      // Poll documents for specific job
      if (onDocumentUpdate && jobId) {
        const documentsResponse = await fetch(`${bulkApiUrl}/api/v1/bulk-jobs/${jobId}/documents`, { signal });
        if (documentsResponse.ok) {
          const documents: BulkJobDocument[] = await documentsResponse.json();
          onDocumentUpdate(documents);
        }
      }

      // Poll review queue
      if (onReviewQueueUpdate) {
        const reviewResponse = await fetch(`${bulkApiUrl}/api/v1/review-queue`, { signal });
        if (reviewResponse.ok) {
          const data = await reviewResponse.json();
          const items: ReviewQueueItem[] = data.items || [];
          onReviewQueueUpdate(items);
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      console.error('Polling error:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [enabled, onJobUpdate, onDocumentUpdate, onReviewQueueUpdate, onError, jobId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Poll immediately
    poll();

    // Then poll at interval
    intervalRef.current = setInterval(() => {
      poll();
    }, interval);

    setIsPolling(true);
  }, [poll, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  return {
    isPolling,
    startPolling,
    stopPolling
  };
};

