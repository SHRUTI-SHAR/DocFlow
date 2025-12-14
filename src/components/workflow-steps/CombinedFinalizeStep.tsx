import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Workflow, Save, CheckCircle, AlertCircle, Users, Clock, FileDown, Database } from 'lucide-react';
import { DocumentData, WorkflowInstance, WorkflowStage, ExportConfig } from '@/types/workflow';
import { useToast } from "@/hooks/use-toast";

interface CombinedFinalizeStepProps {
  documentData: DocumentData | null;
  workflowInstance: WorkflowInstance | null;
  onComplete: (result: any) => void;
  onError: () => void;
}

export const CombinedFinalizeStep: React.FC<CombinedFinalizeStepProps> = ({
  documentData,
  workflowInstance,
  onComplete,
  onError
}) => {
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [persistStatus, setPersistStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowInstance | null>(workflowInstance);
  const [selectedApprover, setSelectedApprover] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'json',
    includeOriginal: true,
    includeAuditTrail: true
  });
  
  const { toast } = useToast();

  useEffect(() => {
    if (documentData && workflowStatus === 'idle') {
      initializeWorkflow();
    }
  }, [documentData]);

  const initializeWorkflow = async () => {
    if (!documentData) {
      onError();
      return;
    }

    setWorkflowStatus('processing');

    try {
      // Simulate workflow setup
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockWorkflow: WorkflowInstance = {
        id: `wf_${Date.now()}`,
        documentId: documentData.id,
        stages: [
          {
            id: 'stage_1',
            name: 'Document Review',
            type: 'reviewer',
            assignee: 'John Reviewer',
            sla: 24,
            status: 'completed',
            comments: 'Document structure looks good, all fields extracted properly.',
            completedAt: new Date()
          },
          {
            id: 'stage_2',
            name: 'Data Validation',
            type: 'doer',
            assignee: 'Jane Validator',
            sla: 12,
            status: 'completed',
            comments: 'All validation rules passed successfully.',
            completedAt: new Date()
          },
          {
            id: 'stage_3',
            name: 'Final Approval',
            type: 'approver',
            assignee: selectedApprover || 'Manager Smith',
            sla: 48,
            status: 'pending',
            comments: comments
          }
        ],
        currentStage: 2,
        status: 'active',
        createdAt: new Date()
      };

      setCurrentWorkflow(mockWorkflow);
      setWorkflowStatus('completed');

      toast({
        title: "Workflow initialized",
        description: "Document has been routed through the approval workflow.",
      });

    } catch (error) {
      console.error('Workflow initialization failed:', error);
      setWorkflowStatus('error');
      toast({
        title: "Workflow failed",
        description: "Failed to initialize workflow. Please try again.",
        variant: "destructive",
      });
      onError();
    }
  };

  const finalizeApproval = async () => {
    if (!currentWorkflow) return;

    try {
      // Update the final stage
      const updatedWorkflow = {
        ...currentWorkflow,
        stages: currentWorkflow.stages.map((stage, index) => 
          index === currentWorkflow.stages.length - 1 
            ? { 
                ...stage, 
                status: 'completed' as const, 
                assignee: selectedApprover || stage.assignee,
                comments: comments || 'Approved',
                completedAt: new Date() 
              } 
            : stage
        ),
        status: 'completed' as const,
        completedAt: new Date()
      };

      setCurrentWorkflow(updatedWorkflow);
      
      // Proceed to persist step
      persistAndExport(updatedWorkflow);
    } catch (error) {
      console.error('Approval failed:', error);
      setWorkflowStatus('error');
    }
  };

  const persistAndExport = async (workflow: WorkflowInstance) => {
    setPersistStatus('processing');

    try {
      // Simulate data persistence and export
      await new Promise(resolve => setTimeout(resolve, 2500));

      const finalResult = {
        documentData,
        workflow,
        exportConfig,
        processedAt: new Date(),
        status: 'completed',
        summary: {
          totalFields: documentData?.extractedFields.length || 0,
          averageConfidence: documentData?.confidence || 0,
          processingTime: '3.2 minutes',
          workflowStages: workflow.stages.length,
          exportFormat: exportConfig.format
        }
      };

      setPersistStatus('completed');

      toast({
        title: "Document processing completed",
        description: "Document has been successfully processed, approved, and exported.",
      });

      onComplete(finalResult);

    } catch (error) {
      console.error('Persist and export failed:', error);
      setPersistStatus('error');
      toast({
        title: "Export failed",
        description: "Failed to persist and export document. Please try again.",
        variant: "destructive",
      });
      onError();
    }
  };

  const getStatusIcon = (status: typeof workflowStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-warning animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStageStatusBadge = (status: WorkflowStage['status']) => {
    const variants = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      rejected: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]} className={
        status === 'completed' ? 'bg-success text-success-foreground' : ''
      }>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No document data available for finalization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status indicators */}
      <div className="flex justify-center space-x-8">
        <div className="flex items-center space-x-2">
          <Workflow className="w-5 h-5" />
          <span className="text-sm font-medium">Workflow</span>
          {getStatusIcon(workflowStatus)}
          <Badge variant={workflowStatus === 'completed' ? 'default' : 'secondary'}>
            {workflowStatus}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Save className="w-5 h-5" />
          <span className="text-sm font-medium">Persist & Export</span>
          {getStatusIcon(persistStatus)}
          <Badge variant={persistStatus === 'completed' ? 'default' : 'secondary'}>
            {persistStatus}
          </Badge>
        </div>
      </div>

      {workflowStatus === 'processing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Workflow className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Setting up Workflow</h3>
            <p className="text-muted-foreground">
              Routing document through approval process...
            </p>
          </CardContent>
        </Card>
      )}

      {workflowStatus === 'completed' && currentWorkflow && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Approval Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentWorkflow.stages.map((stage, index) => (
              <div key={stage.id} className="flex items-start space-x-4 p-4 rounded-lg border">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{stage.name}</h4>
                    {getStageStatusBadge(stage.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Assignee: {stage.assignee} • SLA: {stage.sla} hours
                  </p>
                  {stage.comments && (
                    <p className="text-sm italic">{stage.comments}</p>
                  )}
                  {stage.completedAt && (
                    <p className="text-xs text-success mt-1">
                      Completed: {stage.completedAt.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {currentWorkflow.status === 'active' && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium">Final Approval Required</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="approver">Select Approver</Label>
                    <Select value={selectedApprover} onValueChange={setSelectedApprover}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose approver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager.smith">Manager Smith</SelectItem>
                        <SelectItem value="director.jones">Director Jones</SelectItem>
                        <SelectItem value="admin.wilson">Admin Wilson</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="comments">Approval Comments</Label>
                    <Textarea
                      id="comments"
                      placeholder="Add any comments..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                <Button onClick={finalizeApproval} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Continue to Export
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {persistStatus === 'processing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Persisting & Exporting</h3>
            <p className="text-muted-foreground">
              Saving document data and preparing export...
            </p>
          </CardContent>
        </Card>
      )}

      {workflowStatus === 'completed' && persistStatus === 'idle' && currentWorkflow?.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Export Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select 
                  value={exportConfig.format} 
                  onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, format: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF Report</SelectItem>
                    <SelectItem value="api">API Integration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="includeOriginal"
                  checked={exportConfig.includeOriginal}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeOriginal: e.target.checked }))}
                />
                <Label htmlFor="includeOriginal" className="text-sm">Include original document</Label>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="includeAuditTrail"
                  checked={exportConfig.includeAuditTrail}
                  onChange={(e) => setExportConfig(prev => ({ ...prev, includeAuditTrail: e.target.checked }))}
                />
                <Label htmlFor="includeAuditTrail" className="text-sm">Include audit trail</Label>
              </div>
            </div>
            <Button onClick={() => persistAndExport(currentWorkflow!)} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Finalize & Export Document
            </Button>
          </CardContent>
        </Card>
      )}

      {persistStatus === 'completed' && (
        <Card className="border-success">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium text-success mb-2">Processing Complete!</h3>
            <p className="text-muted-foreground mb-4">
              Document has been successfully processed through all workflow stages and exported.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Fields Extracted</p>
                <p className="text-muted-foreground">{documentData.extractedFields.length}</p>
              </div>
              <div>
                <p className="font-medium">Confidence</p>
                <p className="text-muted-foreground">{Math.round((documentData.confidence || 0) * 100)}%</p>
              </div>
              <div>
                <p className="font-medium">Workflow Stages</p>
                <p className="text-muted-foreground">{currentWorkflow?.stages.length || 0}</p>
              </div>
              <div>
                <p className="font-medium">Export Format</p>
                <p className="text-muted-foreground">{exportConfig.format.toUpperCase()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(workflowStatus === 'error' || persistStatus === 'error') && (
        <div className="flex justify-center">
          <Button 
            onClick={() => {
              if (workflowStatus === 'error') {
                setWorkflowStatus('idle');
                initializeWorkflow();
              } else {
                setPersistStatus('idle');
                if (currentWorkflow) {
                  persistAndExport(currentWorkflow);
                }
              }
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};