import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  FileText,
  Mail,
  Play,
  Plus,
  Settings,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  FileSpreadsheet,
  History
} from 'lucide-react';
import { useScheduledReports, ScheduledReport, ReportRun } from '@/hooks/useScheduledReports';
import { formatDistanceToNow, format } from 'date-fns';

const REPORT_TYPES = [
  { value: 'activity', label: 'User Activity Report', icon: BarChart3 },
  { value: 'storage', label: 'Storage Usage Report', icon: FileSpreadsheet },
  { value: 'documents', label: 'Document Summary', icon: FileText },
  { value: 'compliance', label: 'Compliance Report', icon: CheckCircle },
  { value: 'custom', label: 'Custom Report', icon: Settings }
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export function ScheduledReportsPanel() {
  const { reports, runs, loading, createReport, updateReport, deleteReport, runReportNow, fetchReportRuns } = useScheduledReports();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'activity' as const,
    schedule_type: 'weekly' as const,
    schedule_day: 1,
    schedule_time: '09:00',
    recipients: '',
    format: 'pdf' as const,
    is_active: true
  });

  const handleCreate = async () => {
    await createReport({
      ...formData,
      recipients: formData.recipients.split(',').map(e => e.trim()).filter(Boolean),
      filters: {},
      next_run_at: null
    });
    setIsCreateOpen(false);
    setFormData({
      name: '',
      description: '',
      report_type: 'activity',
      schedule_type: 'weekly',
      schedule_day: 1,
      schedule_time: '09:00',
      recipients: '',
      format: 'pdf',
      is_active: true
    });
  };

  const handleViewHistory = async (report: ScheduledReport) => {
    setSelectedReport(report);
    await fetchReportRuns(report.id);
  };

  const getStatusBadge = (run: ReportRun) => {
    switch (run.status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Scheduled Reports</h2>
          <p className="text-muted-foreground">Automate report generation and delivery</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Scheduled Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Weekly Activity Summary"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this report..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select
                    value={formData.report_type}
                    onValueChange={v => setFormData(prev => ({ ...prev, report_type: v as typeof formData.report_type }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={v => setFormData(prev => ({ ...prev, format: v as typeof formData.format }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={v => setFormData(prev => ({ ...prev, schedule_type: v as typeof formData.schedule_type }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.schedule_type === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={String(formData.schedule_day)}
                      onValueChange={v => setFormData(prev => ({ ...prev, schedule_day: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {['monthly', 'quarterly'].includes(formData.schedule_type) && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={formData.schedule_day}
                      onChange={e => setFormData(prev => ({ ...prev, schedule_day: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.schedule_time}
                  onChange={e => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipients (comma-separated emails)</Label>
                <Input
                  value={formData.recipients}
                  onChange={e => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
                  placeholder="user@example.com, admin@example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!formData.name}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map(report => {
          const typeInfo = REPORT_TYPES.find(t => t.value === report.report_type);
          const TypeIcon = typeInfo?.icon || FileText;

          return (
            <Card key={report.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{typeInfo?.label}</p>
                    </div>
                  </div>
                  <Switch
                    checked={report.is_active}
                    onCheckedChange={checked => updateReport(report.id, { is_active: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{report.schedule_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{report.schedule_time.slice(0, 5)}</span>
                  </div>
                  <Badge variant="outline" className="uppercase text-xs">
                    {report.format}
                  </Badge>
                </div>

                {report.recipients.length > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{report.recipients.length} recipient{report.recipients.length > 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {report.last_run_at ? (
                    <span>Last run: {formatDistanceToNow(new Date(report.last_run_at), { addSuffix: true })}</span>
                  ) : (
                    <span>Never run</span>
                  )}
                  {report.next_run_at && report.is_active && (
                    <span className="ml-2">• Next: {format(new Date(report.next_run_at), 'MMM d, h:mm a')}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => runReportNow(report.id)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Run Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewHistory(report)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteReport(report.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {reports.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Scheduled Reports</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create automated reports to be generated and delivered on your schedule.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Schedule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report History Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report History: {selectedReport?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {runs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No report runs yet
                </div>
              ) : (
                runs.map(run => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusBadge(run)}
                      <div>
                        <p className="text-sm font-medium">
                          {run.started_at ? format(new Date(run.started_at), 'MMM d, yyyy h:mm a') : 'Scheduled'}
                        </p>
                        {run.record_count !== null && (
                          <p className="text-xs text-muted-foreground">
                            {run.record_count} records • {formatFileSize(run.file_size)}
                          </p>
                        )}
                        {run.error_message && (
                          <p className="text-xs text-destructive">{run.error_message}</p>
                        )}
                      </div>
                    </div>
                    {run.status === 'completed' && run.file_url && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}