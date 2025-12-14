import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Trash2,
  GripVertical,
  GitBranch,
  GitMerge,
  ChevronDown,
  ChevronRight,
  Play,
  CheckCircle,
  Eye,
  Bell,
  Zap,
  Plug,
  ClipboardList,
  ArrowRight,
  Settings,
  Copy,
  MoreHorizontal,
  Save,
  X
} from 'lucide-react';
import { StepType, STEP_TYPE_CONFIG, WorkflowStep, StepCondition } from '@/types/workflow';

interface WorkflowNode {
  id: string;
  type: StepType;
  name: string;
  config: any;
  conditions?: StepCondition[];
  branches?: WorkflowNode[][];
  position: { x: number; y: number };
}

interface VisualWorkflowBuilderProps {
  initialNodes?: WorkflowNode[];
  onSave?: (nodes: WorkflowNode[]) => void;
  readOnly?: boolean;
}

export const VisualWorkflowBuilder: React.FC<VisualWorkflowBuilderProps> = ({
  initialNodes = [],
  onSave,
  readOnly = false
}) => {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes.length > 0 ? initialNodes : [
    { id: '1', type: 'task', name: 'Start', config: {}, position: { x: 0, y: 0 } }
  ]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const stepIcons: Record<StepType, React.ComponentType<{ className?: string }>> = {
    approval: CheckCircle,
    review: Eye,
    task: ClipboardList,
    notification: Bell,
    condition: GitBranch,
    parallel: GitMerge,
    integration: Plug
  };

  const addNode = (type: StepType, afterNodeId?: string) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: STEP_TYPE_CONFIG[type].label,
      config: {},
      position: { x: 0, y: 0 }
    };

    if (type === 'parallel') {
      newNode.branches = [[], []];
    }

    if (type === 'condition') {
      newNode.conditions = [
        { field: '', operator: 'equals', value: '', next_step_id: '' }
      ];
      newNode.branches = [[], []];
    }

    if (afterNodeId) {
      const index = nodes.findIndex(n => n.id === afterNodeId);
      const newNodes = [...nodes];
      newNodes.splice(index + 1, 0, newNode);
      setNodes(newNodes);
    } else {
      setNodes([...nodes, newNode]);
    }
  };

  const removeNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const addBranch = (nodeId: string) => {
    setNodes(nodes.map(n => {
      if (n.id === nodeId && n.branches) {
        return { ...n, branches: [...n.branches, []] };
      }
      return n;
    }));
  };

  const addNodeToBranch = (parentId: string, branchIndex: number, type: StepType) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      name: STEP_TYPE_CONFIG[type].label,
      config: {},
      position: { x: 0, y: 0 }
    };

    setNodes(nodes.map(n => {
      if (n.id === parentId && n.branches) {
        const newBranches = [...n.branches];
        newBranches[branchIndex] = [...newBranches[branchIndex], newNode];
        return { ...n, branches: newBranches };
      }
      return n;
    }));
  };

  const renderNodeCard = (node: WorkflowNode, inBranch = false) => {
    const Icon = stepIcons[node.type];
    const config = STEP_TYPE_CONFIG[node.type];

    return (
      <div 
        key={node.id}
        className={`relative group ${inBranch ? '' : ''}`}
        onClick={() => !readOnly && setSelectedNode(node)}
      >
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedNode?.id === node.id ? 'ring-2 ring-primary' : ''
          } ${node.type === 'condition' || node.type === 'parallel' ? 'border-dashed border-2' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {!readOnly && (
                <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <div className={`p-2 rounded-lg ${
                node.type === 'approval' ? 'bg-green-500/10 text-green-500' :
                node.type === 'review' ? 'bg-blue-500/10 text-blue-500' :
                node.type === 'condition' ? 'bg-purple-500/10 text-purple-500' :
                node.type === 'parallel' ? 'bg-orange-500/10 text-orange-500' :
                node.type === 'notification' ? 'bg-yellow-500/10 text-yellow-500' :
                node.type === 'integration' ? 'bg-pink-500/10 text-pink-500' :
                'bg-muted text-muted-foreground'
              }`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{node.name}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
                
                {node.conditions && node.conditions.length > 0 && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {node.conditions.length} condition{node.conditions.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {!readOnly && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                      setIsNodeDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Render branches for parallel/condition nodes */}
        {(node.type === 'parallel' || node.type === 'condition') && node.branches && (
          <div className="mt-4 ml-8 pl-4 border-l-2 border-dashed border-muted-foreground/30">
            <div className="flex gap-4 flex-wrap">
              {node.branches.map((branch, branchIndex) => (
                <div key={branchIndex} className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {node.type === 'condition' 
                        ? (branchIndex === 0 ? 'If True' : branchIndex === node.branches!.length - 1 ? 'Else' : `Else If ${branchIndex}`)
                        : `Branch ${branchIndex + 1}`
                      }
                    </Badge>
                    {node.type === 'condition' && branchIndex < node.branches!.length - 1 && node.conditions?.[branchIndex] && (
                      <span className="text-xs text-muted-foreground truncate">
                        {node.conditions[branchIndex].field} {node.conditions[branchIndex].operator} {node.conditions[branchIndex].value}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {branch.map(branchNode => renderNodeCard(branchNode, true))}
                    
                    {!readOnly && (
                      <AddStepButton 
                        onAdd={(type) => addNodeToBranch(node.id, branchIndex, type)}
                        compact
                      />
                    )}
                  </div>
                </div>
              ))}
              
              {!readOnly && node.type === 'parallel' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="self-start"
                  onClick={() => addBranch(node.id)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Branch
                </Button>
              )}
            </div>

            {/* Merge point indicator */}
            <div className="flex items-center gap-2 mt-4">
              <GitMerge className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {node.type === 'parallel' ? 'All branches complete to continue' : 'Merge point'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <div className="flex-1 p-6 overflow-auto bg-muted/20">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Start indicator */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
              <Play className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-green-600">Workflow Start</span>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
          </div>

          {/* Nodes */}
          <div className="space-y-4">
            {nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                {renderNodeCard(node)}
                
                {index < nodes.length - 1 && (
                  <div className="flex justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Add step button */}
          {!readOnly && (
            <>
              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
              </div>
              <AddStepButton onAdd={(type) => addNode(type)} />
            </>
          )}

          {/* End indicator */}
          <div className="flex justify-center mt-8">
            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
          </div>
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Workflow Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && !readOnly && (
        <div className="w-80 border-l bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Step Properties</h3>
            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Step Name</Label>
                <Input
                  value={selectedNode.name}
                  onChange={(e) => updateNode(selectedNode.id, { name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Step Type</Label>
                <Select
                  value={selectedNode.type}
                  onValueChange={(v) => updateNode(selectedNode.id, { type: v as StepType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STEP_TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedNode.type === 'approval' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Approval Type</Label>
                    <Select
                      value={selectedNode.config.approval_type || 'single'}
                      onValueChange={(v) => updateNode(selectedNode.id, { 
                        config: { ...selectedNode.config, approval_type: v }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Approver</SelectItem>
                        <SelectItem value="all">All Must Approve</SelectItem>
                        <SelectItem value="majority">Majority Approval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Require Comment</Label>
                    <Switch
                      checked={selectedNode.config.require_comment || false}
                      onCheckedChange={(v) => updateNode(selectedNode.id, { 
                        config: { ...selectedNode.config, require_comment: v }
                      })}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Conditions</Label>
                    {selectedNode.conditions?.map((condition, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-2">
                          <Input
                            placeholder="Field name"
                            value={condition.field}
                            onChange={(e) => {
                              const newConditions = [...(selectedNode.conditions || [])];
                              newConditions[index] = { ...condition, field: e.target.value };
                              updateNode(selectedNode.id, { conditions: newConditions });
                            }}
                          />
                          <Select
                            value={condition.operator}
                            onValueChange={(v) => {
                              const newConditions = [...(selectedNode.conditions || [])];
                              newConditions[index] = { ...condition, operator: v };
                              updateNode(selectedNode.id, { conditions: newConditions });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="not_equals">Not Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater_than">Greater Than</SelectItem>
                              <SelectItem value="less_than">Less Than</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Value"
                            value={condition.value}
                            onChange={(e) => {
                              const newConditions = [...(selectedNode.conditions || [])];
                              newConditions[index] = { ...condition, value: e.target.value };
                              updateNode(selectedNode.id, { conditions: newConditions });
                            }}
                          />
                        </div>
                      </Card>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const newConditions = [...(selectedNode.conditions || []), 
                          { field: '', operator: 'equals', value: '' }
                        ];
                        const newBranches = [...(selectedNode.branches || []), []];
                        updateNode(selectedNode.id, { conditions: newConditions, branches: newBranches });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Condition
                    </Button>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>SLA (hours)</Label>
                <Input
                  type="number"
                  value={selectedNode.config.sla_hours || 24}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    config: { ...selectedNode.config, sla_hours: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={selectedNode.config.assignee_type || 'user'}
                  onValueChange={(v) => updateNode(selectedNode.id, { 
                    config: { ...selectedNode.config, assignee_type: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Specific User</SelectItem>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="dynamic">Dynamic (from document)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>

          <div className="mt-4 pt-4 border-t">
            <Button className="w-full" onClick={() => onSave?.(nodes)}>
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface AddStepButtonProps {
  onAdd: (type: StepType) => void;
  compact?: boolean;
}

const AddStepButton: React.FC<AddStepButtonProps> = ({ onAdd, compact }) => {
  const [isOpen, setIsOpen] = useState(false);

  const stepTypes: StepType[] = ['task', 'approval', 'review', 'notification', 'condition', 'parallel', 'integration'];

  if (compact) {
    return (
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full border-dashed border-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>

        {isOpen && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-10 p-2">
            <div className="grid grid-cols-2 gap-1">
              {stepTypes.map(type => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs"
                  onClick={() => {
                    onAdd(type);
                    setIsOpen(false);
                  }}
                >
                  {STEP_TYPE_CONFIG[type].label}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2">
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-2">
          {stepTypes.map(type => {
            const config = STEP_TYPE_CONFIG[type];
            return (
              <Button
                key={type}
                variant="ghost"
                className="flex flex-col h-auto py-3 hover:bg-primary/5"
                onClick={() => onAdd(type)}
              >
                <div className={`p-2 rounded-lg mb-2 ${
                  type === 'approval' ? 'bg-green-500/10' :
                  type === 'review' ? 'bg-blue-500/10' :
                  type === 'condition' ? 'bg-purple-500/10' :
                  type === 'parallel' ? 'bg-orange-500/10' :
                  type === 'notification' ? 'bg-yellow-500/10' :
                  type === 'integration' ? 'bg-pink-500/10' :
                  'bg-muted'
                }`}>
                  {type === 'approval' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {type === 'review' && <Eye className="h-5 w-5 text-blue-500" />}
                  {type === 'task' && <ClipboardList className="h-5 w-5" />}
                  {type === 'notification' && <Bell className="h-5 w-5 text-yellow-500" />}
                  {type === 'condition' && <GitBranch className="h-5 w-5 text-purple-500" />}
                  {type === 'parallel' && <GitMerge className="h-5 w-5 text-orange-500" />}
                  {type === 'integration' && <Plug className="h-5 w-5 text-pink-500" />}
                </div>
                <span className="text-xs">{config.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VisualWorkflowBuilder;
