/**
 * ConnectionStatus Component
 * Shows backend connection status (WebSocket and API health)
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Wifi, WifiOff, Database, Server, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { getBulkApiBaseUrl } from '@/services/bulkProcessingApi';

interface ConnectionStatusProps {
  isWebSocketConnected: boolean;
  webSocketStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isWebSocketConnected,
  webSocketStatus,
  compact = false
}) => {
  const [apiHealth, setApiHealth] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');
  const [redisHealth, setRedisHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const apiUrl = getBulkApiBaseUrl();
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setApiHealth('healthy');
        // Check if response includes Redis status
        if (data.redis) {
          setRedisHealth(data.redis === 'healthy' ? 'healthy' : 'unhealthy');
        }
      } else {
        setApiHealth('unhealthy');
      }
    } catch (error) {
      setApiHealth('unhealthy');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={isWebSocketConnected ? 'default' : 'secondary'} className="gap-1">
          {isWebSocketConnected ? (
            <>
              <Activity className="h-3 w-3 text-green-500 animate-pulse" />
              Live
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              Polling
            </>
          )}
        </Badge>
        
        <Badge variant={apiHealth === 'healthy' ? 'outline' : 'destructive'} className="gap-1">
          {apiHealth === 'healthy' ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              API
            </>
          ) : apiHealth === 'checking' ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              API
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" />
              API Down
            </>
          )}
        </Badge>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Connection Status</h3>
          
          <div className="space-y-2">
            {/* WebSocket Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isWebSocketConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">WebSocket</span>
              </div>
              <Badge variant={
                webSocketStatus === 'connected' ? 'default' :
                webSocketStatus === 'connecting' ? 'secondary' :
                webSocketStatus === 'error' ? 'destructive' :
                'outline'
              }>
                {webSocketStatus}
              </Badge>
            </div>

            {/* API Health */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                <span className="text-sm">API Server</span>
              </div>
              <Badge variant={
                apiHealth === 'healthy' ? 'default' :
                apiHealth === 'checking' ? 'secondary' :
                'destructive'
              }>
                {apiHealth === 'checking' ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : null}
                {apiHealth}
              </Badge>
            </div>

            {/* Redis Status (if available) */}
            {redisHealth !== 'unknown' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">Redis</span>
                </div>
                <Badge variant={redisHealth === 'healthy' ? 'default' : 'destructive'}>
                  {redisHealth}
                </Badge>
              </div>
            )}
          </div>

          {/* Status Description */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {isWebSocketConnected ? (
                <>Real-time updates active via WebSocket</>
              ) : webSocketStatus === 'connecting' ? (
                <>Connecting to real-time updates...</>
              ) : (
                <>Using polling for updates (WebSocket unavailable)</>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
