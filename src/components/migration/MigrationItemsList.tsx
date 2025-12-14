import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Folder, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  Search,
  Filter,
  Download,
  Upload,
  Shield,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { MigrationItem, MigrationJob, MigrationItemStatus } from '@/types/migration';

interface MigrationItemsListProps {
  items: MigrationItem[];
  isLoading: boolean;
  job: MigrationJob;
}

export function MigrationItemsList({ items, isLoading, job }: MigrationItemsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MigrationItemStatus | 'all'>('all');

  const filteredItems = items.filter(item => {
    const matchesSearch = item.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source_path?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: MigrationItemStatus) => {
    switch (status) {
      case 'pending':
      case 'discovered':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'indexing':
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />;
      case 'applying_permissions':
        return <Shield className="h-4 w-4 text-orange-500 animate-pulse" />;
      case 'verifying':
        return <Eye className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: MigrationItemStatus) => {
    const variants: Record<MigrationItemStatus, string> = {
      pending: 'secondary',
      discovered: 'secondary',
      downloading: 'default',
      uploading: 'default',
      indexing: 'default',
      applying_permissions: 'default',
      verifying: 'default',
      completed: 'default',
      failed: 'destructive',
      skipped: 'outline'
    };

    const colors: Record<MigrationItemStatus, string> = {
      pending: '',
      discovered: '',
      downloading: 'bg-blue-500',
      uploading: 'bg-blue-500',
      indexing: 'bg-purple-500',
      applying_permissions: 'bg-orange-500',
      verifying: 'bg-yellow-500',
      completed: 'bg-green-500',
      failed: '',
      skipped: ''
    };

    return (
      <Badge 
        variant={variants[status] as any}
        className={cn("text-xs", colors[status])}
      >
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Calculate stage distribution
  const stageStats = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stage Progress Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(stageStats).map(([status, count]) => (
          <Badge 
            key={status} 
            variant="outline"
            className={cn(
              "cursor-pointer",
              statusFilter === status && "ring-2 ring-primary"
            )}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as MigrationItemStatus)}
          >
            {getStatusIcon(status as MigrationItemStatus)}
            <span className="ml-1">{status.replace('_', ' ')}: {count}</span>
          </Badge>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="discovered">Discovered</SelectItem>
            <SelectItem value="downloading">Downloading</SelectItem>
            <SelectItem value="uploading">Uploading</SelectItem>
            <SelectItem value="indexing">Indexing</SelectItem>
            <SelectItem value="applying_permissions">Permissions</SelectItem>
            <SelectItem value="verifying">Verifying</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {items.length === 0 ? (
                <p>No items discovered yet</p>
              ) : (
                <p>No items match your filters</p>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  item.status === 'failed' && "border-red-200 bg-red-50 dark:bg-red-950/20",
                  item.status === 'completed' && "border-green-200 bg-green-50 dark:bg-green-950/20"
                )}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {item.item_type === 'folder' ? (
                    <Folder className="h-5 w-5 text-blue-500" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.source_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.source_path || 'Root'}
                  </p>
                  {item.last_error && (
                    <p className="text-xs text-red-600 mt-1 truncate">
                      {item.last_error}
                    </p>
                  )}
                </div>

                {/* Size */}
                <div className="text-xs text-muted-foreground text-right">
                  {formatBytes(item.source_size)}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  {getStatusBadge(item.status)}
                </div>

                {/* Attempts */}
                {item.attempt_count > 1 && (
                  <Badge variant="outline" className="text-xs">
                    Attempt {item.attempt_count}
                  </Badge>
                )}

                {/* Checksum verified */}
                {item.checksum_verified && (
                  <span title="Checksum verified">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer stats */}
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>Showing {filteredItems.length} of {items.length} items</span>
        <span>
          {formatBytes(items.reduce((sum, i) => sum + (i.source_size || 0), 0))} total
        </span>
      </div>
    </div>
  );
}
