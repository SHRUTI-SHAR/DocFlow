import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";
import { useNavigate } from 'react-router-dom';

interface ProcessingHistoryItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  document_type: string;
  status: string;
  error_message?: string;
  fields_count: number;
  confidence: number;
  processed_at: string;
  updated_at: string;
  storage_url?: string;
  has_analysis_result: boolean;
}

interface BulkJob {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  totalDocuments: number;
  processedDocuments: number;
  failedDocuments: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface ProcessingStatistics {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  success_rate: number;
}

interface ProcessingHistoryResponse {
  success: boolean;
  total: number;
  statistics: ProcessingStatistics;
  history: ProcessingHistoryItem[];
}

export const ProcessingHistory: React.FC = () => {
  const [history, setHistory] = useState<ProcessingHistoryItem[]>([]);
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [statistics, setStatistics] = useState<ProcessingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'single' | 'bulk'>('single');
  const [selectedDocument, setSelectedDocument] = useState<ProcessingHistoryItem | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (viewMode === 'single') {
      fetchProcessingHistory();
    } else {
      fetchBulkJobs();
    }
  }, [statusFilter, viewMode]);

  const fetchProcessingHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to view processing history",
          variant: "destructive"
        });
        return;
      }

      const url = `${API_BASE_URL}/api/v1/processing-history/${user.id}${
        statusFilter !== 'all' ? `?status_filter=${statusFilter}` : ''
      }`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch processing history');
      }

      const data: ProcessingHistoryResponse = await response.json();
      
      setHistory(data.history || []);
      setStatistics(data.statistics || null);

    } catch (error) {
      console.error('Error fetching processing history:', error);
      toast({
        title: "Error",
        description: "Failed to load processing history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkJobs = async () => {
    setIsLoading(true);
    try {
      const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
      if (!bulkApiUrl) {
        throw new Error('VITE_BULK_API_URL not configured');
      }
      const url = `${bulkApiUrl}/api/v1/bulk-jobs${
        statusFilter !== 'all' ? `?status_filter=${statusFilter}` : ''
      }`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch bulk jobs');
      }

      const data = await response.json();
      setBulkJobs(data.jobs || []);

      // Calculate statistics for bulk jobs
      const completed = data.jobs.filter((j: BulkJob) => j.status === 'completed').length;
      const failed = data.jobs.filter((j: BulkJob) => j.status === 'failed').length;
      const running = data.jobs.filter((j: BulkJob) => j.status === 'running').length;
      const total = data.jobs.length;

      setStatistics({
        total,
        completed,
        failed,
        processing: running,
        success_rate: total > 0 ? (completed / total) * 100 : 0
      });

    } catch (error) {
      console.error('Error fetching bulk jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load bulk processing jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      failed: { label: 'Failed', variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      error: { label: 'Error', variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      processing: { label: 'Processing', variant: 'secondary' as const, icon: Clock, color: 'text-blue-600' },
      running: { label: 'Running', variant: 'secondary' as const, icon: Clock, color: 'text-blue-600' },
      pending: { label: 'Pending', variant: 'outline' as const, icon: Clock, color: 'text-gray-600' },
      paused: { label: 'Paused', variant: 'outline' as const, icon: AlertCircle, color: 'text-yellow-600' },
      stopped: { label: 'Stopped', variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-600' },
      unknown: { label: 'Unknown', variant: 'outline' as const, icon: AlertTriangle, color: 'text-gray-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDocument = (doc: ProcessingHistoryItem) => {
    if (doc.storage_url) {
      window.open(doc.storage_url, '_blank');
    } else {
      toast({
        title: "Document unavailable",
        description: "Storage URL not available for this document",
        variant: "destructive"
      });
    }
  };

  const handleDownloadDocument = async (doc: ProcessingHistoryItem) => {
    if (!doc.storage_url) {
      toast({
        title: "Download failed",
        description: "Storage URL not available",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(doc.storage_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the document",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                </div>
                <FileText className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.failed}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{statistics.success_rate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
              <Progress value={statistics.success_rate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Document Processing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {viewMode === 'single' ? (
                <>
                  <FileText className="w-5 h-5" />
                  Document Processing History
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5" />
                  Bulk Processing Jobs
                </>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'single' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('single')}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Single
                </Button>
                <Button
                  variant={viewMode === 'bulk' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('bulk')}
                  className="gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Bulk
                </Button>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  {viewMode === 'bulk' && (
                    <>
                      <SelectItem value="running">Running</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'single' ? fetchProcessingHistory : fetchBulkJobs}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {viewMode === 'single' 
              ? 'View all your document processing requests with detailed status and results'
              : 'View all your bulk processing jobs with batch status and progress'}
          </p>
        </CardHeader>

        <CardContent>
          {viewMode === 'single' ? (
            history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No processing history found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {statusFilter !== 'all' 
                    ? 'Try changing the filter or upload some documents to get started'
                    : 'Upload some documents to get started'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{doc.file_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </span>
                            {doc.error_message && (
                              <span className="text-xs text-red-600 mt-1">
                                {doc.error_message}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {doc.document_type.replace('-', ' ').replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell>
                          {doc.has_analysis_result ? (
                            <span className="text-sm">{doc.fields_count} fields</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.confidence > 0 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{Math.round(doc.confidence * 100)}%</span>
                              <Progress value={doc.confidence * 100} className="w-16 h-2" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(doc.processed_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {doc.storage_url && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocument(doc)}
                                  title="View document"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(doc)}
                                  title="Download document"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            bulkJobs.length === 0 ? (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No bulk processing jobs found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {statusFilter !== 'all' 
                    ? 'Try changing the filter or create a bulk processing job'
                    : 'Create a bulk processing job to get started'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkJobs.map((job) => (
                      <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/bulk-processing/${job.id}`)}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{job.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ID: {job.id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {job.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={job.totalDocuments > 0 ? (job.processedDocuments / job.totalDocuments) * 100 : 0} 
                              className="w-24 h-2" 
                            />
                            <span className="text-sm text-muted-foreground">
                              {job.totalDocuments > 0 ? Math.round((job.processedDocuments / job.totalDocuments) * 100) : 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="text-green-600">{job.processedDocuments} completed</span>
                            {job.failedDocuments > 0 && (
                              <span className="text-red-600">{job.failedDocuments} failed</span>
                            )}
                            <span className="text-muted-foreground">of {job.totalDocuments} total</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(job.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/bulk-processing/${job.id}`);
                            }}
                            title="View job details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
