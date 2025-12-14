import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  GitBranch,
  Zap,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface WorkflowMetrics {
  workflow_id: string;
  workflow_name: string;
  total_runs: number;
  completed: number;
  rejected: number;
  in_progress: number;
  avg_completion_hours: number;
  sla_compliance: number;
  escalation_rate: number;
  bottleneck_steps: string[];
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const WorkflowAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');

  // Mock data - would come from database
  const overviewMetrics = {
    totalWorkflows: 12,
    activeInstances: 47,
    completedToday: 23,
    avgCompletionTime: 4.2,
    slaCompliance: 94.5,
    escalationRate: 8.2,
    parallelBranches: 156,
    conditionEvaluations: 892
  };

  const trendData = [
    { date: 'Mon', completed: 45, started: 52, rejected: 3 },
    { date: 'Tue', completed: 52, started: 48, rejected: 2 },
    { date: 'Wed', completed: 38, started: 55, rejected: 5 },
    { date: 'Thu', completed: 61, started: 58, rejected: 4 },
    { date: 'Fri', completed: 55, started: 62, rejected: 3 },
    { date: 'Sat', completed: 18, started: 15, rejected: 1 },
    { date: 'Sun', completed: 12, started: 10, rejected: 0 }
  ];

  const stepPerformance = [
    { step: 'Document Review', avgTime: 2.1, count: 234, sla: 98 },
    { step: 'Manager Approval', avgTime: 4.5, count: 189, sla: 87 },
    { step: 'Legal Review', avgTime: 8.2, count: 67, sla: 72 },
    { step: 'Finance Check', avgTime: 1.8, count: 156, sla: 96 },
    { step: 'Final Sign-off', avgTime: 0.8, count: 145, sla: 99 }
  ];

  const branchMetrics = [
    { name: 'Standard Path', value: 65 },
    { name: 'Fast Track', value: 20 },
    { name: 'Extended Review', value: 10 },
    { name: 'Exception Path', value: 5 }
  ];

  const bottlenecks = [
    { step: 'Legal Review', workflow: 'Contract Approval', avgDelay: 4.2, instances: 12, severity: 'critical' },
    { step: 'Manager Approval', workflow: 'Expense Report', avgDelay: 2.1, instances: 8, severity: 'warning' },
    { step: 'VP Sign-off', workflow: 'Budget Approval', avgDelay: 1.5, instances: 5, severity: 'info' }
  ];

  const userPerformance = [
    { user: 'Sarah M.', tasksCompleted: 89, avgTime: 1.2, onTime: 98 },
    { user: 'John D.', tasksCompleted: 76, avgTime: 1.8, onTime: 94 },
    { user: 'Emily R.', tasksCompleted: 64, avgTime: 2.1, onTime: 91 },
    { user: 'Michael K.', tasksCompleted: 52, avgTime: 2.8, onTime: 85 },
    { user: 'Lisa P.', tasksCompleted: 45, avgTime: 1.5, onTime: 96 }
  ];

  const conditionStats = [
    { condition: 'Amount > $10,000', triggered: 234, truePath: 78, falsePath: 156 },
    { condition: 'Department = Finance', triggered: 189, truePath: 45, falsePath: 144 },
    { condition: 'Priority = Critical', triggered: 67, truePath: 67, falsePath: 0 },
    { condition: 'Auto-approved', triggered: 312, truePath: 298, falsePath: 14 }
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-48">
              <GitBranch className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              <SelectItem value="doc-approval">Document Approval</SelectItem>
              <SelectItem value="invoice">Invoice Processing</SelectItem>
              <SelectItem value="contract">Contract Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <MetricCard
          title="Active Instances"
          value={overviewMetrics.activeInstances}
          icon={Activity}
          trend={12}
          color="blue"
        />
        <MetricCard
          title="Completed Today"
          value={overviewMetrics.completedToday}
          icon={CheckCircle}
          trend={8}
          color="green"
        />
        <MetricCard
          title="Avg. Time (hrs)"
          value={overviewMetrics.avgCompletionTime}
          icon={Clock}
          trend={-5}
          color="purple"
        />
        <MetricCard
          title="SLA Compliance"
          value={`${overviewMetrics.slaCompliance}%`}
          icon={Target}
          trend={2}
          color="emerald"
        />
        <MetricCard
          title="Escalation Rate"
          value={`${overviewMetrics.escalationRate}%`}
          icon={AlertTriangle}
          trend={-3}
          color="orange"
        />
        <MetricCard
          title="Parallel Branches"
          value={overviewMetrics.parallelBranches}
          icon={GitBranch}
          color="indigo"
        />
        <MetricCard
          title="Conditions"
          value={overviewMetrics.conditionEvaluations}
          icon={Zap}
          color="amber"
        />
        <MetricCard
          title="Total Workflows"
          value={overviewMetrics.totalWorkflows}
          icon={GitBranch}
          color="slate"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Workflow Execution Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="1" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.6}
                  name="Completed"
                />
                <Area 
                  type="monotone" 
                  dataKey="started" 
                  stackId="2" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.6}
                  name="Started"
                />
                <Area 
                  type="monotone" 
                  dataKey="rejected" 
                  stackId="3" 
                  stroke="hsl(var(--chart-5))" 
                  fill="hsl(var(--chart-5))" 
                  fillOpacity={0.6}
                  name="Rejected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Path Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={branchMetrics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {branchMetrics.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Step Performance & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Step Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stepPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="step" type="category" width={120} className="text-xs" />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="avgTime" fill="hsl(var(--chart-1))" name="Avg Time (hrs)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottleneck Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Bottleneck Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {bottlenecks.map((bottleneck, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      bottleneck.severity === 'critical' 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : bottleneck.severity === 'warning'
                          ? 'border-orange-500/50 bg-orange-500/5'
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{bottleneck.step}</p>
                        <p className="text-sm text-muted-foreground">{bottleneck.workflow}</p>
                      </div>
                      <Badge variant={
                        bottleneck.severity === 'critical' ? 'destructive' : 
                        bottleneck.severity === 'warning' ? 'secondary' : 'outline'
                      }>
                        {bottleneck.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        +{bottleneck.avgDelay}h delay
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {bottleneck.instances} affected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Logic & User Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Condition Evaluations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Condition Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conditionStats.map((condition, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{condition.condition}</span>
                    <span className="text-xs text-muted-foreground">{condition.triggered} evaluations</span>
                  </div>
                  <div className="flex gap-1 h-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="bg-green-500 rounded-l-full"
                            style={{ width: `${(condition.truePath / condition.triggered) * 100}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>True: {condition.truePath}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            className="bg-muted rounded-r-full"
                            style={{ width: `${(condition.falsePath / condition.triggered) * 100}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>False: {condition.falsePath}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userPerformance.map((user, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.user}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.tasksCompleted} tasks • {user.avgTime}h avg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${user.onTime >= 95 ? 'text-green-600' : user.onTime >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {user.onTime}%
                    </p>
                    <p className="text-xs text-muted-foreground">on-time</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-orange-500/10 text-orange-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    amber: 'bg-amber-500/10 text-amber-500',
    slate: 'bg-slate-500/10 text-slate-500'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className={`h-8 w-8 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          {trend !== undefined && (
            <span className={`flex items-center text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowAnalyticsDashboard;
