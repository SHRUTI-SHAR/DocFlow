import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Archive,
  Database,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  HardDrive,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useStorageAnalytics } from '@/hooks/useStorageAnalytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  'PDF Documents': FileText,
  'Word Documents': FileText,
  'Excel Spreadsheets': FileSpreadsheet,
  'PowerPoint': FileSpreadsheet,
  'JPEG Images': FileImage,
  'PNG Images': FileImage,
  'GIF Images': FileImage,
  'Video Files': FileVideo,
  'Archives': Archive,
  'Other Files': File
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

export function StorageAnalyticsPanel() {
  const { analytics, quota, loading, formatBytes, refetch } = useStorageAnalytics();

  const getUsageStatus = () => {
    if (!analytics || !quota) return { status: 'normal', color: 'text-green-500', bg: 'bg-green-500' };
    
    if (analytics.usagePercent >= quota.critical_threshold_percent) {
      return { status: 'critical', color: 'text-red-500', bg: 'bg-red-500' };
    }
    if (analytics.usagePercent >= quota.warning_threshold_percent) {
      return { status: 'warning', color: 'text-amber-500', bg: 'bg-amber-500' };
    }
    return { status: 'normal', color: 'text-green-500', bg: 'bg-green-500' };
  };

  const usageStatus = getUsageStatus();

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
          <h2 className="text-2xl font-bold text-foreground">Storage Analytics</h2>
          <p className="text-muted-foreground">Monitor your storage usage and optimize space</p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Usage Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Main Usage Display */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${usageStatus.bg}/10`}>
                  <HardDrive className={`h-6 w-6 ${usageStatus.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Storage Usage</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(analytics?.currentUsage || 0)} of {formatBytes(analytics?.quota || 0)} used
                  </p>
                </div>
              </div>
              <Progress 
                value={analytics?.usagePercent || 0} 
                className="h-3"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">
                  {(analytics?.usagePercent || 0).toFixed(1)}% used
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatBytes((analytics?.quota || 0) - (analytics?.currentUsage || 0))} remaining
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-3">
              {usageStatus.status === 'critical' && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Critical
                </Badge>
              )}
              {usageStatus.status === 'warning' && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Warning
                </Badge>
              )}
              {usageStatus.status === 'normal' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Healthy
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Size</p>
                <p className="text-2xl font-bold text-foreground">{formatBytes(analytics?.currentUsage || 0)}</p>
              </div>
              <Database className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold text-foreground">{analytics?.documentCount || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Folders</p>
                <p className="text-2xl font-bold text-foreground">{analytics?.folderCount || 0}</p>
              </div>
              <Folder className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. File Size</p>
                <p className="text-2xl font-bold text-foreground">
                  {analytics?.documentCount 
                    ? formatBytes(Math.round((analytics?.currentUsage || 0) / analytics.documentCount))
                    : '0 B'
                  }
                </p>
              </div>
              <File className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Storage by File Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Storage by File Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {analytics?.byFileType && analytics.byFileType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.byFileType}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="bytes"
                      nameKey="type"
                    >
                      {analytics.byFileType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => formatBytes(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No file data available
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {analytics?.byFileType?.slice(0, 6).map((item, index) => (
                <div key={item.type} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{item.type}</span>
                  <span className="text-foreground font-medium ml-auto">{formatBytes(item.bytes)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Storage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Storage Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {analytics?.trend && analytics.trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trend}>
                    <defs>
                      <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={d => format(new Date(d), 'MMM d')}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={v => formatBytes(v)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={d => format(new Date(d), 'MMMM d, yyyy')}
                      formatter={(value: number) => [formatBytes(value), 'Storage']}
                    />
                    <Area
                      type="monotone"
                      dataKey="bytes"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorStorage)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Not enough data for trend analysis
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Largest Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5 text-primary" />
              Largest Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {analytics?.largestFiles?.map((file, index) => {
                  const FileIcon = FILE_TYPE_ICONS[file.type] || File;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
                    >
                      <div className="p-2 rounded-lg bg-muted">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.type}</p>
                      </div>
                      <Badge variant="outline">{formatBytes(file.size)}</Badge>
                    </div>
                  );
                })}

                {(!analytics?.largestFiles || analytics.largestFiles.length === 0) && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    No files found
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Storage by Folder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              Storage by Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {analytics?.byFolder && analytics.byFolder.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.byFolder} layout="vertical">
                    <XAxis 
                      type="number" 
                      tickFormatter={v => formatBytes(v)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="folderName" 
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={name => name.length > 12 ? name.slice(0, 12) + '...' : name}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatBytes(value), 'Size']}
                    />
                    <Bar 
                      dataKey="bytes" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No folder data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}