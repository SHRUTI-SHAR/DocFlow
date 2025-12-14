/**
 * ManualReviewQueue Component
 * Displays and manages documents that need manual review
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorDetailsPanel } from './ErrorDetailsPanel';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBulkProcessingUpdates } from '@/hooks/useBulkProcessingUpdates';
import { Wifi, WifiOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReviewQueueItem } from '@/types/bulk-processing';
import { formatDistanceToNow } from 'date-fns';

interface ManualReviewQueueProps {
  onBack?: () => void;
}

// Mock data - will be replaced with API calls
const mockReviewItems: ReviewQueueItem[] = [
  {
    id: 'review1',
    documentId: 'doc1',
    jobId: 'job1',
    documentName: 'invoice_001.pdf',
    errorType: 'LLM API Error',
    errorMessage: 'LLM API returned empty response after 3 retry attempts. The model may have hit rate limits or content filters.',
    retryCount: 3,
    maxRetries: 3,
    failedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    priority: 2,
    notes: 'High-value invoice, needs manual review'
  },
  {
    id: 'review2',
    documentId: 'doc2',
    jobId: 'job1',
    documentName: 'invoice_002.pdf',
    errorType: 'JSON Parsing Error',
    errorMessage: 'Failed to parse LLM response: Unexpected token in JSON at position 245. The response may contain unescaped characters.',
    retryCount: 3,
    maxRetries: 3,
    failedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    priority: 3
  },
  {
    id: 'review3',
    documentId: 'doc3',
    jobId: 'job2',
    documentName: 'receipt_001.pdf',
    errorType: 'Timeout Error',
    errorMessage: 'Processing timeout after 60 seconds. The document may be too complex or the LLM is taking too long to respond.',
    retryCount: 2,
    maxRetries: 3,
    failedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    priority: 1
  }
];

export const ManualReviewQueue: React.FC<ManualReviewQueueProps> = ({
  onBack
}) => {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Real-time updates for review queue
  const {
    isConnected,
    isWebSocket,
    isPolling
  } = useBulkProcessingUpdates({
    enabled: true,
    onReviewQueueItemsUpdate: (updatedItems) => {
      setItems(updatedItems);
    },
    onReviewQueueUpdate: (updatedItem) => {
      setItems(prev => {
        const existing = prev.find(item => item.id === updatedItem.id);
        if (existing) {
          return prev.map(item => item.id === updatedItem.id ? updatedItem : item);
        } else {
          return [...prev, updatedItem];
        }
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
    }
  });

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  // Remove manual refresh interval since we have real-time updates

  const fetchReviewQueue = async () => {
    setIsLoading(true);
    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      const queueItems = await reviewQueueApi.getReviewQueue();
      setItems(queueItems);
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch review queue',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.documentName.toLowerCase().includes(query) ||
          item.documentId.toLowerCase().includes(query) ||
          item.errorType.toLowerCase().includes(query)
      );
    }

    // Apply error type filter
    if (errorTypeFilter !== 'all') {
      filtered = filtered.filter((item) => item.errorType === errorTypeFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      const priority = parseInt(priorityFilter);
      filtered = filtered.filter((item) => item.priority === priority);
    }

    // Sort by failed date (descending - latest first)
    return filtered.sort((a, b) => {
      return new Date(b.failedAt).getTime() - new Date(a.failedAt).getTime();
    });
  }, [items, searchQuery, errorTypeFilter, priorityFilter]);

  const errorTypes = useMemo(() => {
    const types = new Set(items.map(item => item.errorType));
    return Array.from(types);
  }, [items]);

  const handleSelectItem = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleRetry = async (itemId: string) => {
    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      await reviewQueueApi.retryItem(itemId);
      toast({
        title: 'Success',
        description: 'Document retry initiated'
      });
      // Remove from queue if successful
      setItems(items.filter(item => item.id !== itemId));
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Failed to retry document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to retry document',
        variant: 'destructive'
      });
    }
  };

  const handleResolve = async (itemId: string, notes?: string) => {
    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      await reviewQueueApi.resolveItem(itemId, notes);
      toast({
        title: 'Success',
        description: 'Document marked as resolved'
      });
      setItems(items.filter(item => item.id !== itemId));
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Failed to resolve document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resolve document',
        variant: 'destructive'
      });
    }
  };

  const handleBulkRetry = async () => {
    if (selectedItems.size === 0) return;

    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      const selectedItemIds = Array.from(selectedItems);
      
      await Promise.all(selectedItemIds.map(itemId => 
        reviewQueueApi.retryItem(itemId)
      ));

      toast({
        title: 'Success',
        description: `${selectedItems.size} document(s) retry initiated`
      });
      setItems(items.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to retry selected documents:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to retry selected documents',
        variant: 'destructive'
      });
    }
  };

  const handleBulkResolve = async () => {
    if (selectedItems.size === 0) return;

    try {
      const { reviewQueueApi } = await import('@/services/bulkProcessingApi');
      const selectedItemIds = Array.from(selectedItems);
      
      await Promise.all(selectedItemIds.map(itemId => 
        reviewQueueApi.resolveItem(itemId)
      ));

      toast({
        title: 'Success',
        description: `${selectedItems.size} document(s) marked as resolved`
      });
      setItems(items.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to resolve selected documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve selected documents',
        variant: 'destructive'
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      // TODO: API call for bulk delete
      // await Promise.all(Array.from(selectedItems).map(id => 
      //   fetch(`/api/v1/manual-review-queue/${id}`, { method: 'DELETE' })
      // ));

      toast({
        title: 'Success',
        description: `${selectedItems.size} document(s) deleted`
      });
      setItems(items.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setSelectedItem(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete selected documents',
        variant: 'destructive'
      });
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 2) {
      return <Badge variant="destructive">High</Badge>;
    } else if (priority <= 3) {
      return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
    } else {
      return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold">Manual Review Queue</h1>
                <p className="text-muted-foreground mt-1">
                  Review and manage documents that failed processing
                </p>
              </div>
              {isConnected && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {isWebSocket ? (
                    <>
                      <Wifi className="h-3 w-3 text-green-500" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-yellow-500" />
                      <span>Polling</span>
                    </>
                  )}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={fetchReviewQueue}
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Review Queue Table */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documents Needing Review ({filteredItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by document name, ID, or error type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Error Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Error Types</SelectItem>
                      {errorTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="1">High Priority</SelectItem>
                      <SelectItem value="2">Medium-High</SelectItem>
                      <SelectItem value="3">Medium</SelectItem>
                      <SelectItem value="4">Low-Medium</SelectItem>
                      <SelectItem value="5">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Actions Bar */}
                {selectedItems.size > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedItems.size} document(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkRetry}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry Selected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkResolve}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Resolved
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Checkbox
                            checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Error Type</TableHead>
                        <TableHead>Retries</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {items.length === 0
                              ? 'No documents in review queue'
                              : 'No documents match your filters'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item) => (
                          <TableRow
                            key={item.id}
                            className={selectedItem?.id === item.id ? 'bg-muted' : ''}
                            onClick={() => setSelectedItem(item)}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedItems.has(item.id)}
                                onCheckedChange={(checked) => {
                                  handleSelectItem(item.id, checked as boolean);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.jobName || 'N/A'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.documentName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.errorType}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className={item.retryCount >= item.maxRetries ? 'text-destructive' : ''}>
                                {item.retryCount} / {item.maxRetries}
                              </span>
                            </TableCell>
                            <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(item.failedAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Retry processing"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetry(item.id);
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Remove from queue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResolve(item.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Details Panel */}
          <div className="lg:col-span-1">
            <ErrorDetailsPanel
              item={selectedItem}
              onRetry={handleRetry}
              onResolve={handleResolve}
              onClose={() => setSelectedItem(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

