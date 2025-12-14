import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  FileText,
  HardDrive
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import type { MigrationJob, MigrationMetrics, MigrationAuditLog } from '@/types/migration';

interface MigrationMetricsPanelProps {
  job?: MigrationJob;
  metrics: MigrationMetrics[];
  auditLogs: MigrationAuditLog[];
}

export function MigrationMetricsPanel({ job, metrics, auditLogs }: MigrationMetricsPanelProps) {
  const latestMetric = metrics[0];

  const formatBytes = (bytes?: number | bigint) => {
    if (!bytes) return '0 B/s';
    const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;
    if (numBytes < 1024) return `${numBytes} B/s`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB/s`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const chartData = [...metrics].reverse().map((m, i) => ({
    time: i,
    filesPerMin: Number(m.files_per_minute) || 0,
    bytesPerSec: Number(m.bytes_per_second) || 0,
    errors: m.error_count || 0,
    throttles: m.api_throttle_count || 0
  }));

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'job_started': return <Activity className="h-4 w-4 text-green-500" />;
      case 'job_completed': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'item_failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'throttle_detected': return <Zap className="h-4 w-4 text-yellow-500" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!job) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a migration job to view metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Real-time Stats */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Performance
          </CardTitle>
          <CardDescription>Real-time migration throughput</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">
                {Number(latestMetric?.files_per_minute || 0).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Files/min</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <HardDrive className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">
                {formatBytes(latestMetric?.bytes_per_second)}
              </p>
              <p className="text-xs text-muted-foreground">Transfer Rate</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{latestMetric?.api_throttle_count || 0}</p>
              <p className="text-xs text-muted-foreground">Throttles</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{latestMetric?.error_count || 0}</p>
              <p className="text-xs text-muted-foreground">Errors</p>
            </div>
          </div>

          {/* Throughput Chart */}
          {chartData.length > 1 && (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" tick={false} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="filesPerMin" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3}
                    name="Files/min"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stage Distribution */}
          {latestMetric?.stage_counts && (
            <div>
              <p className="text-sm font-medium mb-2">Pipeline Stage Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(latestMetric.stage_counts as Record<string, number>).map(([stage, count]) => (
                  <Badge key={stage} variant="outline">
                    {stage}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity yet</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50">
                    {getEventIcon(log.event_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {log.event_type.replace(/_/g, ' ')}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600 truncate">{log.error_message}</p>
                      )}
                      {log.source_item_id && (
                        <p className="text-xs text-muted-foreground truncate">
                          Item: {log.source_item_id}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
