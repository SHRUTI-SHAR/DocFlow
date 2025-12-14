/**
 * ProcessingLog Component
 * Displays processing log entries for a job
 */

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface ProcessingLogProps {
  logs: LogEntry[];
  isLoading?: boolean;
  autoScroll?: boolean;
}

export const ProcessingLog: React.FC<ProcessingLogProps> = ({
  logs,
  isLoading = false,
  autoScroll = true
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">SUCCESS</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-yellow-500">WARNING</Badge>;
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      default:
        return <Badge variant="outline">INFO</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Processing Log</CardTitle>
          <Badge variant="outline">{logs.length} entries</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full" ref={scrollAreaRef}>
          <div className="space-y-2 pr-4">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No log entries yet
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">{getLogIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getLogBadge(log.level)}
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">
                      {log.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

