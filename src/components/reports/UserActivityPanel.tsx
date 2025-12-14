import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Clock,
  Download,
  Eye,
  FileText,
  Folder,
  Loader2,
  MousePointerClick,
  PieChart,
  RefreshCw,
  Share,
  TrendingUp,
  Upload,
  User,
  Trash2,
  Edit
} from 'lucide-react';
import { useUserActivityLogs, ActivityLog } from '@/hooks/useUserActivityLogs';
import { formatDistanceToNow, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const ACTION_ICONS: Record<string, React.ElementType> = {
  view: Eye,
  create: Upload,
  update: Edit,
  delete: Trash2,
  download: Download,
  share: Share,
  upload: Upload,
  default: MousePointerClick
};

const ACTION_COLORS: Record<string, string> = {
  view: 'text-blue-400',
  create: 'text-green-400',
  update: 'text-amber-400',
  delete: 'text-red-400',
  download: 'text-purple-400',
  share: 'text-cyan-400',
  upload: 'text-emerald-400',
  default: 'text-muted-foreground'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export function UserActivityPanel() {
  const { logs, stats, loading, fetchLogs, refetch } = useUserActivityLogs();
  const [timeRange, setTimeRange] = useState('7d');
  const [entityFilter, setEntityFilter] = useState('all');

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    const fromDate = new Date();
    switch (range) {
      case '24h':
        fromDate.setHours(fromDate.getHours() - 24);
        break;
      case '7d':
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(fromDate.getDate() - 30);
        break;
      case '90d':
        fromDate.setDate(fromDate.getDate() - 90);
        break;
    }
    fetchLogs({ fromDate });
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || ACTION_ICONS.default;
    const colorClass = ACTION_COLORS[action] || ACTION_COLORS.default;
    return <Icon className={`h-4 w-4 ${colorClass}`} />;
  };

  const formatActivityMessage = (log: ActivityLog) => {
    const entityName = log.entity_name || log.entity_type || 'item';
    switch (log.action) {
      case 'view':
        return `Viewed ${entityName}`;
      case 'create':
        return `Created ${entityName}`;
      case 'update':
        return `Updated ${entityName}`;
      case 'delete':
        return `Deleted ${entityName}`;
      case 'download':
        return `Downloaded ${entityName}`;
      case 'share':
        return `Shared ${entityName}`;
      case 'upload':
        return `Uploaded ${entityName}`;
      default:
        return `${log.action} ${entityName}`;
    }
  };

  // Prepare chart data
  const actionChartData = stats?.byAction
    ? Object.entries(stats.byAction).map(([action, count]) => ({ name: action, value: count }))
    : [];

  const typeChartData = stats?.byType
    ? Object.entries(stats.byType).map(([type, count]) => ({ name: type, value: count }))
    : [];

  const trendChartData = stats?.byDay || [];

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
          <h2 className="text-2xl font-bold text-foreground">User Activity</h2>
          <p className="text-muted-foreground">Track and analyze your document activities</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalActivities || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents Viewed</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byAction?.view || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items Created</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byAction?.create || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Upload className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="text-3xl font-bold text-foreground">{stats?.byAction?.download || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Download className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={d => format(new Date(d), 'MMM d')}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelFormatter={d => format(new Date(d), 'MMMM d, yyyy')}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No activity data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity by Action */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              By Action Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {actionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={actionChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {actionChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No activity data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="folder">Folders</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs
                .filter(log => entityFilter === 'all' || log.entity_type === entityFilter)
                .map(log => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="p-2 rounded-full bg-muted">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatActivityMessage(log)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {log.entity_type && (
                          <Badge variant="outline" className="text-xs">
                            {log.entity_type}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mb-4 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}