import React, { useState } from 'react';
import { 
  Clock, Search, Filter, Download, FileText,
  Trash2, Archive, Lock, Unlock, RefreshCw, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DispositionAuditLog } from '@/types/retention';
import { cn } from '@/lib/utils';

interface RetentionAuditLogProps {
  logs: DispositionAuditLog[];
}

export const RetentionAuditLog: React.FC<RetentionAuditLogProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('30d');

  const getFilteredLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.document_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Date filter
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(log => new Date(log.created_at) >= cutoff);
    }

    return filtered;
  };

  const filteredLogs = getFilteredLogs();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'disposed': return Trash2;
      case 'archived': return Archive;
      case 'held': return Lock;
      case 'released': return Unlock;
      case 'extended': return RefreshCw;
      case 'exception_granted': return CheckCircle;
      default: return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'disposed': return 'text-red-500 bg-red-500/10';
      case 'archived': return 'text-purple-500 bg-purple-500/10';
      case 'held': return 'text-blue-500 bg-blue-500/10';
      case 'released': return 'text-green-500 bg-green-500/10';
      case 'extended': return 'text-orange-500 bg-orange-500/10';
      case 'exception_granted': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Action', 'Document ID', 'Previous Status', 'New Status', 'Reason', 'Certificate'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.action,
        log.document_id,
        log.previous_status || '',
        log.new_status || '',
        log.reason || '',
        log.certificate_number || '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retention-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document ID, reason, or certificate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="held">Held</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="extended">Extended</SelectItem>
            <SelectItem value="exception_granted">Exception Granted</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === 'all' ? 'All Time' : range}
            </Button>
          ))}
        </div>

        <Button variant="outline" onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <Badge variant="secondary">
          {filteredLogs.length} records
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-red-500" />
            {filteredLogs.filter(l => l.action === 'disposed').length} disposed
          </span>
          <span className="flex items-center gap-1">
            <Archive className="h-3 w-3 text-purple-500" />
            {filteredLogs.filter(l => l.action === 'archived').length} archived
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-blue-500" />
            {filteredLogs.filter(l => l.action === 'held').length} held
          </span>
        </div>
      </div>

      {/* Log List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.action);
            const colorClasses = getActionColor(log.action);

            return (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", colorClasses.split(' ')[1])}>
                      <ActionIcon className={cn("h-5 w-5", colorClasses.split(' ')[0])} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                        <Badge variant="outline">
                          {log.document_id.slice(0, 12)}...
                        </Badge>
                        {log.certificate_number && (
                          <Badge variant="secondary" className="text-xs">
                            {log.certificate_number}
                          </Badge>
                        )}
                      </div>

                      {log.reason && (
                        <p className="text-sm text-muted-foreground mb-2">{log.reason}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.previous_status && log.new_status && (
                          <span>
                            {log.previous_status} → {log.new_status}
                          </span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No audit records</h3>
              <p className="text-sm">Disposition activities will be logged here</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
