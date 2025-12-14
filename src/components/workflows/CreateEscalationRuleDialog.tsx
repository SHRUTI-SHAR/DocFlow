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
import { Switch } from '@/components/ui/switch';
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
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Trash2,
  Bell,
  UserPlus,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import {
  Priority,
  EscalationAction,
  PRIORITY_CONFIG,
  ESCALATION_ACTION_CONFIG
} from '@/types/workflow';

interface CreateEscalationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionIcons: Record<EscalationAction, React.ReactNode> = {
  notify: <Bell className="h-4 w-4" />,
  reassign: <UserPlus className="h-4 w-4" />,
  escalate_manager: <ArrowUpRight className="h-4 w-4" />,
  auto_approve: <CheckCircle className="h-4 w-4" />,
  auto_reject: <XCircle className="h-4 w-4" />,
  pause_workflow: <PauseCircle className="h-4 w-4" />
};

export const CreateEscalationRuleDialog: React.FC<CreateEscalationRuleDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { createEscalationRule, isLoading } = useWorkflows();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    priority: 'medium' as Priority,
    trigger_after_hours: 24,
    repeat_every_hours: 12,
    max_escalations: 3,
    actions: [] as { action: EscalationAction; delay_hours: number }[],
    notify_assignee: true,
    notify_escalation_target: true,
    notify_workflow_owner: true
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    await createEscalationRule({
      name: formData.name,
      description: formData.description,
      is_active: formData.is_active,
      priority: formData.priority,
      trigger_after_hours: formData.trigger_after_hours,
      repeat_every_hours: formData.repeat_every_hours,
      max_escalations: formData.max_escalations,
      actions: formData.actions
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      priority: 'medium',
      trigger_after_hours: 24,
      repeat_every_hours: 12,
      max_escalations: 3,
      actions: [],
      notify_assignee: true,
      notify_escalation_target: true,
      notify_workflow_owner: true
    });
  };

  const addAction = (action: EscalationAction) => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { action, delay_hours: 0 }]
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Create Escalation Rule
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — 
            {step === 1 && ' Basic Settings'}
            {step === 2 && ' Timing & Actions'}
            {step === 3 && ' Review & Create'}
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
          {/* Step 1: Basic Settings */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Escalation"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="When should this rule trigger..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label>Priority Level</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][])
                    .map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: key }))}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          formData.priority === key
                            ? `border-primary ${config.color}`
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium text-sm">
                          {config.label}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-muted-foreground">Enable this rule immediately</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          )}

          {/* Step 2: Timing & Actions */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timing
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trigger">Trigger After (hours)</Label>
                    <Input
                      id="trigger"
                      type="number"
                      value={formData.trigger_after_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, trigger_after_hours: parseInt(e.target.value) || 24 }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="repeat">Repeat Every (hours)</Label>
                    <Input
                      id="repeat"
                      type="number"
                      value={formData.repeat_every_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, repeat_every_hours: parseInt(e.target.value) || 12 }))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="max">Max Escalations</Label>
                  <Input
                    id="max"
                    type="number"
                    value={formData.max_escalations}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_escalations: parseInt(e.target.value) || 3 }))}
                    className="mt-1 w-32"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Actions
                  </h4>
                  <Select onValueChange={(v) => addAction(v as EscalationAction)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Add action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ESCALATION_ACTION_CONFIG) as [EscalationAction, typeof ESCALATION_ACTION_CONFIG[EscalationAction]][])
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {actionIcons[key]}
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.actions.length === 0 ? (
                  <div className="p-6 border-2 border-dashed rounded-lg text-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Add actions to execute when this rule triggers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.actions.map((action, index) => {
                      const config = ESCALATION_ACTION_CONFIG[action.action];
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="h-6 w-6 p-0 justify-center">
                              {index + 1}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {actionIcons[action.action]}
                              <span className="font-medium text-sm">{config.label}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Assignee</span>
                    <Switch
                      checked={formData.notify_assignee}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_assignee: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Escalation Target</span>
                    <Switch
                      checked={formData.notify_escalation_target}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_escalation_target: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Workflow Owner</span>
                    <Switch
                      checked={formData.notify_workflow_owner}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_workflow_owner: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${PRIORITY_CONFIG[formData.priority].color}`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{formData.name || 'Untitled Rule'}</h3>
                    <Badge className={PRIORITY_CONFIG[formData.priority].color}>
                      {PRIORITY_CONFIG[formData.priority].label} Priority
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {formData.description || 'No description'}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Triggers after {formData.trigger_after_hours} hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Repeats every {formData.repeat_every_hours} hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span>Max {formData.max_escalations} escalations</span>
                  </div>
                </div>

                {formData.actions.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Actions ({formData.actions.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.actions.map((action, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {actionIcons[action.action]}
                          {ESCALATION_ACTION_CONFIG[action.action].label}
                        </Badge>
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
                Create Rule
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
