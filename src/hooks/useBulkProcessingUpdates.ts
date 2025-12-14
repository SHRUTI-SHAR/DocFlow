/**
 * useBulkProcessingUpdates Hook
 * Combined WebSocket + Polling for real-time updates with automatic fallback
 */

import { useEffect, useState, useCallback } from 'react';
import { useBulkProcessingWebSocket } from './useBulkProcessingWebSocket';
import { useBulkProcessingPolling } from './useBulkProcessingPolling';
import type { BulkJob, BulkJobDocument, ReviewQueueItem } from '@/types/bulk-processing';

interface UseBulkProcessingUpdatesOptions {
  enabled?: boolean;
  pollingInterval?: number;
  jobId?: string;
  onJobUpdate?: (job: BulkJob) => void;
  onJobsUpdate?: (jobs: BulkJob[]) => void;
  onDocumentUpdate?: (document: BulkJobDocument) => void;
  onDocumentsUpdate?: (documents: BulkJobDocument[]) => void;
  onReviewQueueUpdate?: (item: ReviewQueueItem) => void;
  onReviewQueueItemsUpdate?: (items: ReviewQueueItem[]) => void;
  onError?: (error: Error) => void;
}

export const useBulkProcessingUpdates = (options: UseBulkProcessingUpdatesOptions = {}) => {
  const {
    enabled = true,
    pollingInterval = 5000,
    jobId,
    onJobUpdate,
    onJobsUpdate,
    onDocumentUpdate,
    onDocumentsUpdate,
    onReviewQueueUpdate,
    onReviewQueueItemsUpdate,
    onError
  } = options;

  const [updateMethod, setUpdateMethod] = useState<'websocket' | 'polling'>('websocket');
  const [wsConnectionFailed, setWsConnectionFailed] = useState(false);

  // WebSocket handlers
  const handleJobUpdate = useCallback((job: BulkJob) => {
    if (onJobUpdate) {
      onJobUpdate(job);
    }
  }, [onJobUpdate]);

  const handleDocumentUpdate = useCallback((document: BulkJobDocument) => {
    if (onDocumentUpdate) {
      onDocumentUpdate(document);
    }
  }, [onDocumentUpdate]);

  const handleReviewQueueUpdate = useCallback((item: ReviewQueueItem) => {
    if (onReviewQueueUpdate) {
      onReviewQueueUpdate(item);
    }
  }, [onReviewQueueUpdate]);

  const handleWsError = useCallback((error: Error) => {
    console.warn('WebSocket error, falling back to polling:', error);
    setWsConnectionFailed(true);
    setUpdateMethod('polling');
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // Polling handlers
  const handleJobsUpdate = useCallback((jobs: BulkJob[]) => {
    if (onJobsUpdate) {
      onJobsUpdate(jobs);
    }
    // Also trigger individual job updates if handler exists
    if (onJobUpdate && jobId) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        onJobUpdate(job);
      }
    }
  }, [onJobsUpdate, onJobUpdate, jobId]);

  const handleDocumentsUpdate = useCallback((documents: BulkJobDocument[]) => {
    if (onDocumentsUpdate) {
      onDocumentsUpdate(documents);
    }
  }, [onDocumentsUpdate]);

  const handleReviewQueueItemsUpdate = useCallback((items: ReviewQueueItem[]) => {
    if (onReviewQueueItemsUpdate) {
      onReviewQueueItemsUpdate(items);
    }
  }, [onReviewQueueItemsUpdate]);

  const handlePollingError = useCallback((error: Error) => {
    if (onError) {
      onError(error);
    }
  }, [onError]);

  // WebSocket hook
  const {
    isConnected: isWsConnected,
    connectionStatus: wsStatus,
    connect: connectWs,
    disconnect: disconnectWs
  } = useBulkProcessingWebSocket({
    enabled: enabled && updateMethod === 'websocket' && !wsConnectionFailed,
    onJobUpdate: handleJobUpdate,
    onDocumentUpdate: handleDocumentUpdate,
    onReviewQueueUpdate: handleReviewQueueUpdate,
    onError: handleWsError
  });

  // Polling hook
  const {
    isPolling,
    startPolling,
    stopPolling
  } = useBulkProcessingPolling({
    enabled: enabled && (updateMethod === 'polling' || wsConnectionFailed),
    interval: pollingInterval,
    jobId,
    onJobUpdate: handleJobsUpdate,
    onDocumentUpdate: handleDocumentsUpdate,
    onReviewQueueUpdate: handleReviewQueueItemsUpdate,
    onError: handlePollingError
  });

  // Auto-switch to polling if WebSocket fails
  useEffect(() => {
    if (wsConnectionFailed && updateMethod === 'websocket') {
      setUpdateMethod('polling');
      disconnectWs();
      startPolling();
    }
  }, [wsConnectionFailed, updateMethod, disconnectWs, startPolling]);

  // Try to reconnect WebSocket after some time if it failed
  useEffect(() => {
    if (wsConnectionFailed && updateMethod === 'polling') {
      const reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        setWsConnectionFailed(false);
        setUpdateMethod('websocket');
      }, 60000); // Try again after 60 seconds

      return () => clearTimeout(reconnectTimer);
    }
  }, [wsConnectionFailed, updateMethod]);

  // Manual method switching
  const switchToPolling = useCallback(() => {
    setUpdateMethod('polling');
    setWsConnectionFailed(true);
    disconnectWs();
    startPolling();
  }, [disconnectWs, startPolling]);

  const switchToWebSocket = useCallback(() => {
    setUpdateMethod('websocket');
    setWsConnectionFailed(false);
    stopPolling();
    connectWs();
  }, [stopPolling, connectWs]);

  return {
    updateMethod,
    isConnected: updateMethod === 'websocket' ? isWsConnected : isPolling,
    connectionStatus: updateMethod === 'websocket' ? wsStatus : (isPolling ? 'connected' : 'disconnected'),
    switchToPolling,
    switchToWebSocket,
    isWebSocket: updateMethod === 'websocket',
    isPolling: updateMethod === 'polling'
  };
};

