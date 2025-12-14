/**
 * useBulkProcessingWebSocket Hook
 * Manages WebSocket connection for real-time bulk processing updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { BulkJob, BulkJobDocument, ReviewQueueItem } from '@/types/bulk-processing';

interface WebSocketMessage {
  type: 'job_update' | 'document_update' | 'review_queue_update' | 'error' | 'ping' | 'pong';
  data?: any;
  jobId?: string;
  documentId?: string;
}

interface UseBulkProcessingWebSocketOptions {
  jobId?: string; // Job ID to connect to
  enabled?: boolean;
  onJobUpdate?: (job: BulkJob) => void;
  onDocumentUpdate?: (document: BulkJobDocument) => void;
  onReviewQueueUpdate?: (item: ReviewQueueItem) => void;
  onError?: (error: Error) => void;
}

export const useBulkProcessingWebSocket = (options: UseBulkProcessingWebSocketOptions = {}) => {
  const {
    jobId,
    enabled = true,
    onJobUpdate,
    onDocumentUpdate,
    onReviewQueueUpdate,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // Get WebSocket URL from environment or construct from bulk API URL
      let baseUrl: string;
      if (import.meta.env.VITE_BULK_WS_URL) {
        baseUrl = import.meta.env.VITE_BULK_WS_URL;
      } else {
        // Use bulk API URL to construct WebSocket URL
        const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
        if (!bulkApiUrl) throw new Error('VITE_BULK_API_URL is required');
        // Convert http to ws and https to wss
        baseUrl = bulkApiUrl.replace(/^http/, 'ws');
      }
      
      // Connect to job-specific endpoint if jobId provided
      const url = jobId 
        ? `${baseUrl}/ws/bulk-jobs/${jobId}`
        : `${baseUrl}/api/v1/bulk-processing/ws`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      setConnectionStatus('connecting');

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'pong':
              // Heartbeat response
              break;
            case 'job_update':
              if (message.data && onJobUpdate) {
                onJobUpdate(message.data as BulkJob);
              }
              break;
            case 'document_update':
              if (message.data && onDocumentUpdate) {
                onDocumentUpdate(message.data as BulkJobDocument);
              }
              break;
            case 'review_queue_update':
              if (message.data && onReviewQueueUpdate) {
                onReviewQueueUpdate(message.data as ReviewQueueItem);
              }
              break;
            case 'error':
              if (onError) {
                onError(new Error(message.data?.message || 'WebSocket error'));
              }
              break;
            default:
              console.warn('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          if (onError && error instanceof Error) {
            onError(error);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        if (onError) {
          onError(new Error('WebSocket connection error'));
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected');

        // Attempt to reconnect if enabled and not exceeded max attempts
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = reconnectDelay * reconnectAttemptsRef.current;
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // Store interval ID for cleanup
      (ws as any).pingInterval = pingInterval;

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionStatus('error');
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  }, [enabled, onJobUpdate, onDocumentUpdate, onReviewQueueUpdate, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // Clear ping interval
      if ((wsRef.current as any).pingInterval) {
        clearInterval((wsRef.current as any).pingInterval);
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (enabled && jobId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, jobId, connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect
  };
};

