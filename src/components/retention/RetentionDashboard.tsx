import React, { useState } from 'react';
import { 
  Shield, Clock, AlertTriangle, Archive, Trash2, FileText, 
  Scale, Plus, RefreshCw, Settings, Download, Filter,
  Calendar, CheckCircle, XCircle, Eye, Send, Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { RetentionPolicyList } from './RetentionPolicyList';
import { LegalHoldsList } from './LegalHoldsList';
import { DocumentRetentionList } from './DocumentRetentionList';
import { DispositionQueue } from './DispositionQueue';
import { RetentionAuditLog } from './RetentionAuditLog';
import { CreatePolicyDialog } from './CreatePolicyDialog';
import { CreateLegalHoldDialog } from './CreateLegalHoldDialog';
import { RETENTION_STATUS_CONFIG } from '@/types/retention';
import { cn } from '@/lib/utils';

export const RetentionDashboard: React.FC = () => {
  const {
    policies,
    legalHolds,
    documentStatuses,
    templates,
    auditLogs,
    stats,
    isLoading,
    refresh,
  } = useRetentionPolicies();

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [showCreateHold, setShowCreateHold] = useState(false);

  const statCards = [
    {
      title: 'Active Policies',
      value: stats.active_policies,
      total: stats.total_policies,
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Documents Tracked',
      value: stats.total_documents_tracked,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending Review',
      value: stats.documents_pending_review,
      icon: Eye,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      alert: stats.documents_pending_review > 0,
    },
    {
      title: 'Expiring Soon',
      value: stats.documents_expiring_soon,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      alert: stats.documents_expiring_soon > 0,
    },
    {
      title: 'Legal Holds',
      value: stats.active_legal_holds,
      icon: Scale,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Disposed This Month',
      value: stats.documents_disposed_this_month,
      icon: Archive,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Records Retention
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage document lifecycle, compliance policies, and legal holds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm" onClick={() => setShowCreateHold(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Legal Hold
            </Button>
            <Button size="sm" onClick={() => setShowCreatePolicy(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={cn("relative overflow-hidden", stat.alert && "ring-2 ring-orange-500/50")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.alert && (
                    <AlertTriangle className="h-4 w-4 text-orange-500 animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.total !== undefined && (
                    <Progress 
                      value={(stat.value / stat.total) * 100} 
                      className="h-1 mt-2" 
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6 shrink-0">
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="h-4 w-4" />
              Policies
              <Badge variant="secondary" className="ml-1">{stats.active_policies}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <Clock className="h-4 w-4" />
              Documents
              <Badge variant="secondary" className="ml-1">{stats.total_documents_tracked}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disposition" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Disposition Queue
              {stats.documents_pending_review > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.documents_pending_review}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="holds" className="gap-2">
              <Scale className="h-4 w-4" />
              Legal Holds
              {stats.active_legal_holds > 0 && (
                <Badge className="ml-1 bg-purple-500">{stats.active_legal_holds}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Settings className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="overview" className="h-full m-0 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Expiring Soon */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Documents Expiring Soon
                  </CardTitle>
                  <CardDescription>Documents approaching retention deadline</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {documentStatuses
                      .filter(s => {
                        const daysLeft = Math.ceil((new Date(s.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                        return daysLeft <= 30 && daysLeft > 0 && s.current_status === 'active';
                      })
                      .slice(0, 10)
                      .map((doc) => {
                        const daysLeft = Math.ceil((new Date(doc.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                        return (
                          <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">
                                  Document {doc.document_id.slice(0, 8)}...
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Expires: {new Date(doc.retention_end_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>
                              {daysLeft} days
                            </Badge>
                          </div>
                        );
                      })}
                    {documentStatuses.filter(s => {
                      const daysLeft = Math.ceil((new Date(s.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                      return daysLeft <= 30 && daysLeft > 0;
                    }).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No documents expiring soon</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Active Legal Holds */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-500" />
                    Active Legal Holds
                  </CardTitle>
                  <CardDescription>Documents under litigation hold</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {legalHolds
                      .filter(h => h.status === 'active')
                      .map((hold) => (
                        <div key={hold.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <Lock className="h-4 w-4 text-purple-500" />
                            <div>
                              <p className="text-sm font-medium">{hold.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {hold.document_ids?.length || 0} documents • {hold.custodian_name || 'No custodian'}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-purple-500">Active</Badge>
                        </div>
                      ))}
                    {legalHolds.filter(h => h.status === 'active').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active legal holds</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Disposition Activity
                  </CardTitle>
                  <CardDescription>Latest retention actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {auditLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                        <div className={cn(
                          "p-2 rounded-full",
                          log.action === 'disposed' ? 'bg-red-500/10' :
                          log.action === 'archived' ? 'bg-purple-500/10' :
                          log.action === 'held' ? 'bg-blue-500/10' :
                          'bg-green-500/10'
                        )}>
                          {log.action === 'disposed' ? <Trash2 className="h-4 w-4 text-red-500" /> :
                           log.action === 'archived' ? <Archive className="h-4 w-4 text-purple-500" /> :
                           log.action === 'held' ? <Lock className="h-4 w-4 text-blue-500" /> :
                           <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">{log.action.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">
                            Document {log.document_id.slice(0, 8)}... • {log.reason || 'No reason provided'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleDateString()}
                          </p>
                          {log.certificate_number && (
                            <Badge variant="outline" className="text-xs">
                              {log.certificate_number.slice(0, 15)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No disposition activity yet</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="h-full m-0">
            <RetentionPolicyList 
              policies={policies} 
              templates={templates}
              onCreatePolicy={() => setShowCreatePolicy(true)}
            />
          </TabsContent>

          <TabsContent value="documents" className="h-full m-0">
            <DocumentRetentionList />
          </TabsContent>

          <TabsContent value="disposition" className="h-full m-0">
            <DispositionQueue />
          </TabsContent>

          <TabsContent value="holds" className="h-full m-0">
            <LegalHoldsList 
              holds={legalHolds}
              onCreateHold={() => setShowCreateHold(true)}
            />
          </TabsContent>

          <TabsContent value="audit" className="h-full m-0">
            <RetentionAuditLog logs={auditLogs} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <CreatePolicyDialog 
        open={showCreatePolicy} 
        onOpenChange={setShowCreatePolicy}
        templates={templates}
      />
      <CreateLegalHoldDialog 
        open={showCreateHold} 
        onOpenChange={setShowCreateHold}
      />
    </div>
  );
};
