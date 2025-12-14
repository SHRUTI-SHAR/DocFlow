import React, { useState } from 'react';
import { 
  Shield, Clock, Archive, Trash2, Eye, Send, 
  AlertTriangle, CheckCircle, Plus
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { 
  COMPLIANCE_FRAMEWORKS, 
  DISPOSITION_ACTIONS, 
  TRIGGER_TYPES,
  type RetentionPolicyTemplate,
  type DispositionAction,
  type TriggerType,
  type ComplianceFramework,
} from '@/types/retention';
import { cn } from '@/lib/utils';

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: RetentionPolicyTemplate[];
}

export const CreatePolicyDialog: React.FC<CreatePolicyDialogProps> = ({
  open,
  onOpenChange,
  templates,
}) => {
  const { createPolicy, createFromTemplate } = useRetentionPolicies();
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [retentionUnit, setRetentionUnit] = useState<'days' | 'months' | 'years'>('years');
  const [dispositionAction, setDispositionAction] = useState<DispositionAction>('review');
  const [triggerType, setTriggerType] = useState<TriggerType>('creation_date');
  const [complianceFramework, setComplianceFramework] = useState<ComplianceFramework | ''>('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [notificationDays, setNotificationDays] = useState(30);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  const getRetentionInDays = () => {
    switch (retentionUnit) {
      case 'years': return retentionDays * 365;
      case 'months': return retentionDays * 30;
      default: return retentionDays;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (activeTab === 'template' && selectedTemplate) {
        await createFromTemplate(selectedTemplate, {
          name: name || undefined,
          description: description || undefined,
        });
      } else {
        await createPolicy({
          name,
          description,
          retention_period_days: getRetentionInDays(),
          disposition_action: dispositionAction,
          trigger_type: triggerType,
          is_active: true,
          priority: 0,
          applies_to_categories: categories,
          applies_to_folders: [],
          compliance_framework: complianceFramework || undefined,
          notification_days_before: notificationDays,
          requires_approval: requiresApproval,
          approval_roles: [],
          metadata: {},
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create policy:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setRetentionDays(365);
    setRetentionUnit('years');
    setDispositionAction('review');
    setTriggerType('creation_date');
    setComplianceFramework('');
    setRequiresApproval(false);
    setNotificationDays(30);
    setCategories([]);
    setSelectedTemplate(null);
  };

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const getDispositionIcon = (action: string) => {
    switch (action) {
      case 'delete': return Trash2;
      case 'archive': return Archive;
      case 'review': return Eye;
      case 'transfer': return Send;
      default: return Eye;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Create Retention Policy
          </DialogTitle>
          <DialogDescription>
            Define how long documents should be retained and what happens after
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">From Template</TabsTrigger>
            <TabsTrigger value="custom">Custom Policy</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="template" className="mt-0">
              <div className="space-y-3">
                {templates.map((template) => {
                  const Icon = getDispositionIcon(template.disposition_action);
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        selectedTemplate === template.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/50"
                      )}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          selectedTemplate === template.id ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="secondary">{template.compliance_framework}</Badge>
                            {template.requires_approval && (
                              <Badge variant="outline" className="text-xs">Approval Required</Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(template.retention_period_days / 365)} years
                            </span>
                            <span className="capitalize">{template.disposition_action}</span>
                          </div>
                        </div>
                        {selectedTemplate === template.id && (
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTemplate && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium">Customize (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs">Custom Name</Label>
                      <Input
                        placeholder="Leave blank to use template name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Custom Description</Label>
                      <Input
                        placeholder="Leave blank to use template description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-0 space-y-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>Policy Name *</Label>
                  <Input
                    placeholder="e.g., Financial Records - 7 Years"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe when this policy should be applied..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Compliance Framework</Label>
                  <Select value={complianceFramework} onValueChange={(v) => setComplianceFramework(v as ComplianceFramework)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select framework (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLIANCE_FRAMEWORKS.map((fw) => (
                        <SelectItem key={fw.value} value={fw.value}>
                          <div>
                            <span className="font-medium">{fw.label}</span>
                            <span className="text-xs text-muted-foreground ml-2">{fw.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Retention Period */}
              <div className="p-4 border rounded-lg">
                <Label className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" />
                  Retention Period
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <Select value={retentionUnit} onValueChange={(v) => setRetentionUnit(v as typeof retentionUnit)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    ({getRetentionInDays()} days total)
                  </span>
                </div>
              </div>

              {/* Trigger & Disposition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Retention Starts From</Label>
                  <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_TYPES.map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Disposition Action</Label>
                  <Select value={dispositionAction} onValueChange={(v) => setDispositionAction(v as DispositionAction)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPOSITION_ACTIONS.map((action) => (
                        <SelectItem key={action.value} value={action.value}>
                          {action.label} - {action.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Categories */}
              <div>
                <Label>Apply to Categories</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  />
                  <Button type="button" variant="outline" onClick={addCategory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {categories.map((cat) => (
                      <Badge 
                        key={cat} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => setCategories(categories.filter(c => c !== cat))}
                      >
                        {cat} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Disposition requires approval before execution
                    </p>
                  </div>
                  <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
                </div>

                <div>
                  <Label>Notification Before Expiry</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      min={0}
                      value={notificationDays}
                      onChange={(e) => setNotificationDays(parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days before</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (activeTab === 'template' ? !selectedTemplate : !name)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Create Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
