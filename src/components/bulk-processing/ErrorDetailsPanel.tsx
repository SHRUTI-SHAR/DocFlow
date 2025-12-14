/**
 * ErrorDetailsPanel Component
 * Displays detailed error information for a failed document
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  X,
  FileText,
  Calendar,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import type { ReviewQueueItem } from '@/types/bulk-processing';

interface ErrorDetailsPanelProps {
  item: ReviewQueueItem | null;
  onRetry?: (documentId: string) => void;
  onResolve?: (documentId: string) => void;
  onClose?: () => void;
}

export const ErrorDetailsPanel: React.FC<ErrorDetailsPanelProps> = ({
  item,
  onRetry,
  onResolve,
  onClose
}) => {
  if (!item) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            Select a document to view error details
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityBadge = (priority: number) => {
    if (priority <= 2) {
      return <Badge variant="destructive">High Priority</Badge>;
    } else if (priority <= 3) {
      return <Badge variant="default" className="bg-yellow-500">Medium Priority</Badge>;
    } else {
      return <Badge variant="outline">Low Priority</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Details
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {getPriorityBadge(item.priority)}
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Document:</span>
            <span className="text-muted-foreground">{item.documentName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Document ID:</span>
            <span className="text-muted-foreground font-mono text-xs">{item.documentId}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Failed:</span>
            <span className="text-muted-foreground">
              {format(new Date(item.failedAt), 'MMM d, yyyy HH:mm:ss')}
            </span>
          </div>
        </div>

        <Separator />

        {/* Error Information */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Error Type</div>
          <Badge variant="outline" className="text-sm">
            {item.errorType}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Error Message</div>
          <ScrollArea className="h-32 w-full border rounded-md p-3 bg-muted/50">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {item.errorMessage}
            </pre>
          </ScrollArea>
        </div>

        {/* Retry Information */}
        <div className="space-y-2">
          <div className="text-sm font-semibold">Retry Information</div>
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <span className="text-sm">Retry Attempts:</span>
            <Badge variant="outline">
              {item.retryCount} / {item.maxRetries}
            </Badge>
          </div>
          {item.retryCount >= item.maxRetries && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Maximum retry attempts reached
            </div>
          )}
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Notes</div>
            <div className="p-3 border rounded-md bg-muted/30 text-sm">
              {item.notes}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {onRetry && item.retryCount < item.maxRetries && (
            <Button
              onClick={() => onRetry(item.documentId)}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Processing
            </Button>
          )}
          {onResolve && (
            <Button
              onClick={() => onResolve(item.documentId)}
              className="w-full"
              variant="outline"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Resolved
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

