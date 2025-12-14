import React, { useState } from 'react';
import { 
  FileText, Search, Filter, Clock, Shield, Lock,
  AlertTriangle, CheckCircle, Archive, Trash2, Eye,
  MoreVertical, Calendar, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { RETENTION_STATUS_CONFIG } from '@/types/retention';
import type { RetentionStatus } from '@/types/retention';
import { cn } from '@/lib/utils';

export const DocumentRetentionList: React.FC = () => {
  const { 
    documentStatuses, 
    policies, 
    filter, 
    setFilter,
    disposeDocument,
    grantException,
  } = useRetentionPolicies();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'expiring' | 'created' | 'status'>('expiring');

  const filteredDocs = documentStatuses.filter(doc => {
    const matchesSearch = doc.document_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    switch (sortBy) {
      case 'expiring':
        return new Date(a.retention_end_date).getTime() - new Date(b.retention_end_date).getTime();
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'status':
        return a.current_status.localeCompare(b.current_status);
      default:
        return 0;
    }
  });

  const getRetentionProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'pending_review': return Eye;
      case 'pending_approval': return Clock;
      case 'on_hold': return Lock;
      case 'disposed': return Trash2;
      case 'archived': return Archive;
      default: return FileText;
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select 
          value={filter.status?.join(',') || 'all'} 
          onValueChange={(v) => setFilter({ ...filter, status: v === 'all' ? undefined : [v as RetentionStatus] })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(RETENTION_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="created">Recently Added</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant={filter.expiring_within_days === 30 ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter({ 
            ...filter, 
            expiring_within_days: filter.expiring_within_days === 30 ? undefined : 30 
          })}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Expiring Soon
        </Button>

        <Button 
          variant={filter.on_legal_hold ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter({ 
            ...filter, 
            on_legal_hold: filter.on_legal_hold ? undefined : true 
          })}
        >
          <Lock className="h-4 w-4 mr-2" />
          On Hold
        </Button>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sortedDocs.map((doc) => {
            const policy = policies.find(p => p.id === doc.policy_id);
            const daysRemaining = getDaysRemaining(doc.retention_end_date);
            const progress = getRetentionProgress(doc.retention_start_date, doc.retention_end_date);
            const statusConfig = RETENTION_STATUS_CONFIG[doc.current_status as RetentionStatus];
            const StatusIcon = getStatusIcon(doc.current_status);
            const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
            const isExpired = daysRemaining <= 0;
            const isOnHold = doc.legal_hold_ids?.length > 0;

            return (
              <Card 
                key={doc.id} 
                className={cn(
                  "transition-colors",
                  isExpired && "border-red-500/50 bg-red-500/5",
                  isExpiringSoon && !isExpired && "border-orange-500/50 bg-orange-500/5",
                  isOnHold && "border-purple-500/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={cn("p-2 rounded-lg", statusConfig?.color.replace('bg-', 'bg-') + '/10')}>
                      <StatusIcon className={cn("h-5 w-5", statusConfig?.color.replace('bg-', 'text-'))} />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          Document {doc.document_id.slice(0, 12)}...
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", statusConfig?.color.replace('bg-', 'border-'))}
                        >
                          {statusConfig?.label}
                        </Badge>
                        {isOnHold && (
                          <Badge className="bg-purple-500 text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Legal Hold
                          </Badge>
                        )}
                        {policy && (
                          <Badge variant="secondary" className="text-xs">
                            {policy.name}
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-2",
                              isExpired && "[&>div]:bg-red-500",
                              isExpiringSoon && !isExpired && "[&>div]:bg-orange-500"
                            )}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-medium min-w-[80px] text-right",
                          isExpired && "text-red-500",
                          isExpiringSoon && !isExpired && "text-orange-500"
                        )}>
                          {isExpired ? 'Expired' : `${daysRemaining} days left`}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Start: {new Date(doc.retention_start_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          End: {new Date(doc.retention_end_date).toLocaleDateString()}
                        </span>
                        {doc.exception_reason && (
                          <Badge variant="outline" className="text-xs">
                            Exception granted
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Document
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="h-4 w-4 mr-2" />
                          Change Policy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => grantException(doc.document_id, 'Extended per request', 90)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Extend 90 Days
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => disposeDocument(doc.document_id, 'archive')}
                          disabled={isOnHold}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive Now
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => disposeDocument(doc.document_id, 'delete')}
                          disabled={isOnHold}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Dispose Now
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {sortedDocs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No documents tracked</h3>
              <p className="text-sm">Documents with retention policies will appear here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
