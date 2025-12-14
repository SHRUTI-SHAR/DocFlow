import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Hand,
  Upload,
  Calendar,
  FileText,
  Webhook,
  CheckCircle2,
  Eye,
  ClipboardList,
  Bell
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import {
  TriggerType,
  StepType,
  TRIGGER_TYPE_CONFIG,
  STEP_TYPE_CONFIG,
  WORKFLOW_TEMPLATES
} from '@/types/workflow';

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORKFLOW_COLORS = [
  '#22C55E', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  manual: <Hand className="h-4 w-4" />,
  document_upload: <Upload className="h-4 w-4" />,
  form_submission: <FileText className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  api_webhook: <Webhook className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />
};

const stepIcons: Record<StepType, React.ReactNode> = {
  approval: <CheckCircle2 className="h-4 w-4" />,
  review: <Eye className="h-4 w-4" />,
  task: <ClipboardList className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  parallel: <GitBranch className="h-4 w-4" />,
  integration: <Webhook className="h-4 w-4" />
};

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { createWorkflow, isLoading } = useWorkflows();
  const [step, setStep] = useState(1);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'approval',
    color: WORKFLOW_COLORS[0],
    trigger_type: 'manual' as TriggerType,
    steps: [] as { name: string; type: StepType; sla_hours: number }[]
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    await createWorkflow({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      color: formData.color,
      version: 1,
      status: 'draft',
      trigger_type: formData.trigger_type,
      trigger_config: {},
      steps: formData.steps.map((s, i) => ({
        id: `step-${i + 1}`,
        name: s.name,
        type: s.type,
        order: i + 1,
        config: {},
        assignees: [],
        sla_hours: s.sla_hours,
        escalation_rules: []
      })),
      created_by: 'current-user',
      is_template: false,
      tags: [formData.category],
      sla_settings: {
        enabled: true,
        total_workflow_hours: 120,
        warning_threshold_percent: 75,
        critical_threshold_percent: 90,
        business_hours_only: true,
        business_hours: { start: '09:00', end: '17:00', timezone: 'UTC', exclude_weekends: true }
      },
      notification_settings: {
        on_start: true,
        on_step_complete: true,
        on_complete: true,
        on_reject: true,
        on_escalation: true,
        on_sla_warning: true,
        channels: ['email', 'in_app'],
        digest_enabled: false,
        digest_frequency: 'daily'
      }
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setUseTemplate(false);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: 'approval',
      color: WORKFLOW_COLORS[0],
      trigger_type: 'manual',
      steps: []
    });
  };

  const addStep = (type: StepType) => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          name: `${STEP_TYPE_CONFIG[type].label} Step`,
          type,
          sla_hours: 48
        }
      ]
    }));
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, updates: Partial<{ name: string; type: StepType; sla_hours: number }>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, ...updates } : s)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Create Workflow
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — 
            {step === 1 && ' Choose a starting point'}
            {step === 2 && ' Basic Information'}
            {step === 3 && ' Define Steps'}
            {step === 4 && ' Review & Create'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step 1: Template or Blank */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUseTemplate(false)}
                  className={`p-6 rounded-lg border text-left transition-all ${
                    !useTemplate ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Plus className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">Blank Workflow</h3>
                  <p className="text-sm text-muted-foreground">
                    Start from scratch and define your own steps
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUseTemplate(true)}
                  className={`p-6 rounded-lg border text-left transition-all ${
                    useTemplate ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <GitBranch className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">Use Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-built workflow template
                  </p>
                </button>
              </div>

              {useTemplate && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {WORKFLOW_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(template.name);
                        setFormData(prev => ({
                          ...prev,
                          name: template.name,
                          description: template.description,
                          category: template.category
                        }));
                      }}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedTemplate === template.name
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-primary text-primary-foreground">
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Document Approval"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Workflow Color</Label>
                <div className="flex gap-2 mt-2">
                  {WORKFLOW_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Trigger Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(Object.entries(TRIGGER_TYPE_CONFIG) as [TriggerType, typeof TRIGGER_TYPE_CONFIG[TriggerType]][])
                    .slice(0, 4)
                    .map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, trigger_type: key }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.trigger_type === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {triggerIcons[key]}
                          <span className="font-medium text-sm">{config.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.description}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Define Steps */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Workflow Steps</Label>
                <Select onValueChange={(v) => addStep(v as StepType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add step..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STEP_TYPE_CONFIG) as [StepType, typeof STEP_TYPE_CONFIG[StepType]][])
                      .slice(0, 5)
                      .map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            {stepIcons[key]}
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.steps.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center">
                  <GitBranch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No steps added yet. Add steps to define your workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.steps.map((s, index) => {
                    const stepConfig = STEP_TYPE_CONFIG[s.type];
                    return (
                      <div key={index} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {stepIcons[s.type]}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <Input
                                value={s.name}
                                onChange={(e) => updateStep(index, { name: e.target.value })}
                                placeholder="Step name"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStep(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">SLA (hours):</Label>
                                <Input
                                  type="number"
                                  value={s.sla_hours}
                                  onChange={(e) => updateStep(index, { sla_hours: parseInt(e.target.value) || 48 })}
                                  className="w-20 h-8"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    <GitBranch className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{formData.name || 'Untitled Workflow'}</h3>
                    <p className="text-sm text-muted-foreground">{formData.steps.length} steps</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {formData.description || 'No description'}
                </p>

                <div className="flex gap-2 mb-4">
                  <Badge>{TRIGGER_TYPE_CONFIG[formData.trigger_type].label}</Badge>
                  <Badge variant="outline">{formData.category}</Badge>
                </div>

                {formData.steps.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Workflow Steps:</p>
                    <div className="space-y-2">
                      {formData.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="h-5 w-5 p-0 justify-center">
                            {i + 1}
                          </Badge>
                          {stepIcons[s.type]}
                          <span>{s.name}</span>
                          <span className="text-muted-foreground ml-auto">
                            {s.sla_hours}h SLA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={isLoading || !formData.name}>
                <Check className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
