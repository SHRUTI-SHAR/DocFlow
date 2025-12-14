import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Clock, User, CheckCircle, XCircle, MessageSquare, Play, Loader2, Plus } from 'lucide-react';
import { DocumentData, WorkflowInstance, WorkflowStage } from '@/types/workflow';

interface WorkflowStepProps {
  documentData: DocumentData | null;
  workflowInstance: WorkflowInstance | null;
  onComplete: (instance: WorkflowInstance) => void;
  onError: (error: string) => void;
}

export const WorkflowStep: React.FC<WorkflowStepProps> = ({ 
  documentData, 
  workflowInstance, 
  onComplete, 
  onError 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newStage, setNewStage] = useState({
    name: '',
    type: 'doer' as 'doer' | 'reviewer' | 'approver',
    assignee: '',
    sla: 24
  });
  const [stages, setStages] = useState<Omit<WorkflowStage, 'id' | 'status' | 'completedAt'>[]>([
    { name: 'Initial Review', type: 'doer', assignee: 'john.doe@company.com', sla: 24 },
    { name: 'Quality Check', type: 'reviewer', assignee: 'jane.smith@company.com', sla: 12 },
    { name: 'Final Approval', type: 'approver', assignee: 'manager@company.com', sla: 48 }
  ]);
  const [comments, setComments] = useState('');

  const addStage = () => {
    if (!newStage.name || !newStage.assignee) return;
    
    setStages(prev => [...prev, { ...newStage }]);
    setNewStage({ name: '', type: 'doer', assignee: '', sla: 24 });
  };

  const removeStage = (index: number) => {
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const startWorkflow = async () => {
    if (!documentData || stages.length === 0) return;
    
    setIsCreating(true);
    try {
      // Simulate workflow creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const workflowStages: WorkflowStage[] = stages.map((stage, index) => ({
        id: `stage-${index}`,
        ...stage,
        status: index === 0 ? 'in_progress' : 'pending',
        completedAt: undefined
      }));

      const instance: WorkflowInstance = {
        id: crypto.randomUUID(),
        documentId: documentData.id,
        stages: workflowStages,
        currentStage: 0,
        status: 'active',
        createdAt: new Date(),
      };

      onComplete(instance);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Workflow creation failed');
    } finally {
      setIsCreating(false);
    }
  };

  const getStageIcon = (type: WorkflowStage['type']) => {
    switch (type) {
      case 'doer': return <User className="w-4 h-4" />;
      case 'reviewer': return <CheckCircle className="w-4 h-4" />;
      case 'approver': return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: WorkflowStage['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_progress': return 'default';
      case 'completed': return 'default';
      case 'rejected': return 'destructive';
    }
  };

  if (!documentData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No document data available. Please complete previous steps first.</p>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Creating workflow instance...</p>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Setting up approval stages</p>
          <p>• Assigning tasks to users</p>
          <p>• Configuring SLA timers</p>
        </div>
      </div>
    );
  }

  // If workflow exists, show progress
  if (workflowInstance) {
    const currentStage = workflowInstance.stages[workflowInstance.currentStage];
    const progress = ((workflowInstance.currentStage + 1) / workflowInstance.stages.length) * 100;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Workflow In Progress</h3>
          <p className="text-muted-foreground">
            Document is being processed through the approval workflow
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Workflow Progress
              <Badge variant={workflowInstance.status === 'active' ? 'default' : 'secondary'}>
                {workflowInstance.status}
              </Badge>
            </CardTitle>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Stage {workflowInstance.currentStage + 1} of {workflowInstance.stages.length}: {currentStage.name}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workflowInstance.stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    index === workflowInstance.currentStage ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      stage.status === 'completed' ? 'bg-success text-success-foreground' :
                      stage.status === 'in_progress' ? 'bg-primary text-primary-foreground' :
                      stage.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {stage.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : stage.status === 'rejected' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        getStageIcon(stage.type)
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{stage.name}</h4>
                      <p className="text-sm text-muted-foreground">{stage.assignee}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusColor(stage.status)} className={
                      stage.status === 'completed' ? 'bg-success text-success-foreground' : ''
                    }>
                      {stage.status.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      SLA: {stage.sla}h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Stage: {currentStage.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback>{currentStage.assignee.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{currentStage.assignee}</p>
                  <p className="text-sm text-muted-foreground">{currentStage.type}</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  This stage requires {currentStage.type} action from {currentStage.assignee}.
                  SLA: {currentStage.sla} hours from assignment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Configure Approval Workflow</h3>
        <p className="text-muted-foreground">
          Set up the stages for document review and approval
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Stages</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure the approval process with assignees and SLAs
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Stages */}
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStageIcon(stage.type)}
                    <div>
                      <p className="font-medium">{stage.name}</p>
                      <p className="text-sm text-muted-foreground">{stage.assignee}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{stage.sla}h SLA</Badge>
                    <Button 
                      onClick={() => removeStage(index)}
                      size="sm" 
                      variant="ghost"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Stage */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Add New Stage</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Stage Name</Label>
                  <Input
                    value={newStage.name}
                    onChange={(e) => setNewStage(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Legal Review"
                  />
                </div>
                <div>
                  <Label className="text-sm">Type</Label>
                  <Select
                    value={newStage.type}
                    onValueChange={(value: any) => setNewStage(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doer">Doer</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="approver">Approver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Assignee Email</Label>
                  <Input
                    value={newStage.assignee}
                    onChange={(e) => setNewStage(prev => ({ ...prev, assignee: e.target.value }))}
                    placeholder="user@company.com"
                  />
                </div>
                <div>
                  <Label className="text-sm">SLA (hours)</Label>
                  <Input
                    type="number"
                    value={newStage.sla}
                    onChange={(e) => setNewStage(prev => ({ ...prev, sla: parseInt(e.target.value) }))}
                    placeholder="24"
                  />
                </div>
              </div>
              <Button onClick={addStage} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Document: {documentData.filename}</h4>
                <p className="text-sm text-muted-foreground">
                  Total stages: {stages.length} • 
                  Estimated completion: {stages.reduce((acc, stage) => acc + stage.sla, 0)} hours
                </p>
              </div>

              <div className="space-y-3">
                {stages.map((stage, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{stage.name}</p>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{stage.sla}h SLA</span>
                        <span>•</span>
                        <span>{stage.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label>Initial Comments (Optional)</Label>
                <Textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any initial notes or instructions for the workflow..."
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Start Workflow */}
      <div className="flex justify-center">
        <Button 
          onClick={startWorkflow} 
          size="lg"
          disabled={stages.length === 0}
        >
          <Play className="w-4 h-4 mr-2" />
          Start Workflow
        </Button>
      </div>
    </div>
  );
};
