/**
 * JobCard Component
 * Displays a single bulk processing job with progress and status
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  Square,
  Eye,
  MoreVertical,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { BulkJob } from '@/types/bulk-processing';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: BulkJob;
  onViewDetails: (jobId: string) => void;
  onPause?: (jobId: string) => void;
  onResume?: (jobId: string) => void;
  onStop?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  onViewDetails,
  onPause,
  onResume,
  onStop,
  onDelete
}) => {
  const getStatusBadge = () => {
    switch (job.status) {
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-500">
            <div className="w-2 h-2 bg-white rounded-full mr-1.5 animate-pulse" />
            Processing
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary">
            <Pause className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      case 'stopped':
        return (
          <Badge variant="outline">
            <Square className="w-3 h-3 mr-1" />
            Stopped
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getTimeInfo = () => {
    if (job.status === 'running' && job.startedAt) {
      return `Started ${formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}`;
    }
    if (job.status === 'completed' && job.completedAt) {
      return `Completed ${formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}`;
    }
    if (job.createdAt) {
      return `Created ${formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}`;
    }
    return '';
  };

  const formatSourceType = (): string => {
    // Backend-bulk returns source_type directly, not nested in config
    const sourceType = (job as any).source_type || job.config?.source?.type;
    switch (sourceType) {
      case 'folder':
        return 'Folder';
      case 'database':
        return 'Database';
      case 'cloud':
        return 'Cloud Storage';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{job.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{formatSourceType()}</span>
              <span>•</span>
              <span>{getTimeInfo()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(job.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {job.status === 'running' && onPause && (
                  <DropdownMenuItem onClick={() => onPause(job.id)}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </DropdownMenuItem>
                )}
                {job.status === 'paused' && onResume && (
                  <DropdownMenuItem onClick={() => onResume(job.id)}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </DropdownMenuItem>
                )}
                {(job.status === 'running' || job.status === 'paused') && onStop && (
                  <DropdownMenuItem onClick={() => onStop(job.id)}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(job.id)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        {(job.status === 'running' || job.status === 'paused') && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {job.processedDocuments || 0} / {job.totalDocuments || 0} documents
              </span>
            </div>
            <Progress value={job.progress || 0} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{(job.progress || 0).toFixed(1)}% complete</span>
              {job.estimatedCompletionTime && (
                <span>Est. {job.estimatedCompletionTime}</span>
              )}
            </div>
          </div>
        )}

        {/* Completed Status */}
        {job.status === 'completed' && (
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Processed:</span>
                <span className="ml-2 font-medium text-green-600">
                  {job.processedDocuments} / {job.totalDocuments}
                </span>
              </div>
              {job.failedDocuments > 0 && (
                <div>
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {job.failedDocuments}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Failed Status */}
        {job.status === 'failed' && (
          <div className="text-sm text-destructive mb-4">
            Job failed. Check details for more information.
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(job.id)}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
          {job.status === 'running' && onPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPause(job.id)}
            >
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {job.status === 'paused' && onResume && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onResume(job.id)}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

