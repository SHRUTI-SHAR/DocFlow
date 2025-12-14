import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Activity,
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Shield,
  Clock,
  User,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useComplianceLabels } from '@/hooks/useComplianceLabels';
import { ComplianceAuditEntry } from '@/types/compliance';
import { format } from 'date-fns';

const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  applied: { label: 'Applied', icon: <Shield className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  removed: { label: 'Removed', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  updated: { label: 'Updated', icon: <RefreshCw className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  reviewed: { label: 'Reviewed', icon: <Eye className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  acknowledged: { label: 'Acknowledged', icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  violation: { label: 'Violation', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
};

export const ComplianceAuditLog: React.FC = () => {
  const { auditEntries, labels, isLoading } = useComplianceLabels();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '24h' | '7d' | '30d'>('all');

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.performed_by.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const entryDate = new Date(entry.performed_at);
      const now = new Date();
      const diffHours = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
      
      if (dateRange === '24h') matchesDate = diffHours <= 24;
      else if (dateRange === '7d') matchesDate = diffHours <= 168;
      else if (dateRange === '30d') matchesDate = diffHours <= 720;
    }
    
    return matchesSearch && matchesAction && matchesDate;
  });

  const getLabel = (labelId: string) => labels.find(l => l.id === labelId);

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Action', 'Performed By', 'Details', 'Document ID', 'Label'].join(','),
      ...filteredEntries.map(entry => [
        format(new Date(entry.performed_at), 'yyyy-MM-dd HH:mm:ss'),
        entry.action,
        entry.performed_by,
        `"${entry.details.replace(/"/g, '""')}"`,
        entry.document_id,
        getLabel(entry.label_id)?.name || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Compliance Audit Log
            </CardTitle>
            <CardDescription>
              Track all compliance-related activities and changes
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportAuditLog}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(actionConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    {config.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Entries */}
        <ScrollArea className="h-[500px]">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No audit entries found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-4">
                {filteredEntries.map((entry, index) => {
                  const config = actionConfig[entry.action];
                  const label = getLabel(entry.label_id);

                  return (
                    <div key={entry.id} className="relative flex gap-4 pl-12">
                      {/* Timeline dot */}
                      <div className={`absolute left-3 h-5 w-5 rounded-full border-2 border-background ${config?.bgColor || 'bg-muted'} flex items-center justify-center`}>
                        <span className={config?.color}>{config?.icon}</span>
                      </div>

                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`${config?.bgColor} ${config?.color}`}>
                                {config?.label}
                              </Badge>
                              {label && (
                                <Badge variant="secondary" className="text-xs">
                                  {label.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{entry.details}</p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.performed_at), 'MMM d, HH:mm')}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {entry.performed_by}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {entry.document_id}
                          </span>
                          {entry.ip_address && (
                            <span>IP: {entry.ip_address}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
