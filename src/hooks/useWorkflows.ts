import { useState, useCallback } from 'react';
import {
  Workflow,
  WorkflowInstance,
  WorkflowStep,
  EscalationRule,
  WorkflowStats,
  WorkflowStatus,
  StepType,
  Priority,
  StepInstance,
  EscalationActionConfig
} from '@/types/workflow';
import { toast } from 'sonner';

// Extended types for mock data that include UI-specific fields
interface ExtendedWorkflow extends Workflow {
  run_count?: number;
  last_run_at?: string;
  trigger?: { type: string; conditions?: any[] };
  color?: string;
}

interface ExtendedEscalationRule extends EscalationRule {
  trigger_after_hours?: number;
  repeat_every_hours?: number;
  max_escalations?: number;
  notification_settings?: any;
}

interface ExtendedWorkflowInstance extends WorkflowInstance {
  workflow?: ExtendedWorkflow;
  document_name?: string;
  started_by?: string;
  started_at?: string;
  current_step_id?: string;
  escalation_count?: number;
  step_instances?: ExtendedStepInstance[];
  priority?: Priority;
}

interface ExtendedStepInstance extends StepInstance {
  step?: any;
  due_at?: string;
  escalation_history?: any[];
}

// Mock data
const mockWorkflows: ExtendedWorkflow[] = [
  {
    id: 'wf-1',
    name: 'Document Approval',
    description: 'Standard document approval workflow with manager review',
    category: 'approval',
    color: '#22C55E',
    version: 1,
    status: 'active',
    trigger_type: 'document_upload',
    trigger_config: {},
    steps: [
      {
        id: 'step-1',
        name: 'Manager Review',
        type: 'approval',
        order: 1,
        config: { approval_type: 'single' as const },
        assignees: [{ type: 'user', value: 'manager' }],
        sla_hours: 48,
        escalation_rules: []
      },
      {
        id: 'step-2',
        name: 'Department Head Approval',
        type: 'approval',
        order: 2,
        config: { approval_type: 'all', require_comment: true },
        assignees: [{ type: 'role', value: 'dept-head' }],
        sla_hours: 72,
        escalation_rules: []
      }
    ],
    created_by: 'user-1',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    is_template: false,
    tags: ['approval', 'documents'],
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
    },
    stats: { total_runs: 45, completed_runs: 42, avg_completion_time: 36, success_rate: 93 },
    run_count: 45,
    trigger: { type: 'document_upload' }
  },
  {
    id: 'wf-2',
    name: 'Contract Review',
    description: 'Legal contract review and signature workflow',
    category: 'legal',
    color: '#A855F7',
    version: 2,
    status: 'active',
    trigger_type: 'manual',
    trigger_config: {},
    steps: [
      {
        id: 'step-1',
        name: 'Legal Review',
        type: 'review',
        order: 1,
        config: {},
        assignees: [{ type: 'group', value: 'legal-team' }],
        sla_hours: 120,
        escalation_rules: []
      }
    ],
    created_by: 'user-1',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    is_template: false,
    tags: ['legal', 'contracts'],
    sla_settings: {
      enabled: true,
      total_workflow_hours: 168,
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
    },
    stats: { total_runs: 23, completed_runs: 20, avg_completion_time: 72, success_rate: 87 },
    run_count: 23,
    trigger: { type: 'manual' }
  },
  {
    id: 'wf-3',
    name: 'Invoice Processing',
    description: 'Automated invoice validation and payment approval',
    category: 'finance',
    color: '#F59E0B',
    version: 1,
    status: 'draft',
    trigger_type: 'document_upload',
    trigger_config: {},
    steps: [],
    created_by: 'user-1',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    is_template: false,
    tags: ['finance', 'invoices'],
    sla_settings: {
      enabled: false,
      total_workflow_hours: 48,
      warning_threshold_percent: 75,
      critical_threshold_percent: 90,
      business_hours_only: false,
      business_hours: { start: '09:00', end: '17:00', timezone: 'UTC', exclude_weekends: false }
    },
    notification_settings: {
      on_start: true,
      on_step_complete: false,
      on_complete: true,
      on_reject: true,
      on_escalation: true,
      on_sla_warning: true,
      channels: ['email'],
      digest_enabled: false,
      digest_frequency: 'daily'
    },
    stats: { total_runs: 0, completed_runs: 0, avg_completion_time: 0, success_rate: 0 },
    run_count: 0,
    trigger: { type: 'document_upload' }
  }
];

const mockEscalationRules: ExtendedEscalationRule[] = [
  {
    id: 'esc-1',
    name: 'Standard Escalation',
    description: 'Escalate after 24 hours of inactivity',
    is_active: true,
    is_global: false,
    priority: 'medium',
    conditions: [{ type: 'time_elapsed', threshold_hours: 24 }],
    actions: [
      { action: 'notify', delay_hours: 0, message_template: 'Reminder: Pending approval requires your attention' },
      { action: 'escalate_manager', delay_hours: 12 }
    ],
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trigger_count: 15,
    trigger_after_hours: 24,
    repeat_every_hours: 12,
    max_escalations: 3
  },
  {
    id: 'esc-2',
    name: 'Urgent Escalation',
    description: 'Aggressive escalation for high-priority items',
    is_active: true,
    is_global: false,
    priority: 'high',
    conditions: [{ type: 'time_elapsed', threshold_hours: 8 }],
    actions: [
      { action: 'notify', delay_hours: 0, notify_users: ['admin'] },
      { action: 'escalate_manager', delay_hours: 4 }
    ],
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trigger_count: 8,
    trigger_after_hours: 8,
    repeat_every_hours: 4,
    max_escalations: 5
  },
  {
    id: 'esc-3',
    name: 'Auto-Approve Fallback',
    description: 'Auto-approve after multiple failed escalations',
    is_active: true,
    is_global: false,
    priority: 'low',
    conditions: [{ type: 'time_elapsed', threshold_hours: 72 }],
    actions: [
      { action: 'auto_approve', delay_hours: 0, message_template: 'Auto-approved due to timeout' }
    ],
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trigger_count: 3,
    trigger_after_hours: 72,
    max_escalations: 1
  }
];

const mockInstances: ExtendedWorkflowInstance[] = [
  {
    id: 'inst-1',
    documentId: 'doc-1',
    stages: [],
    currentStage: 0,
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    workflow_id: 'wf-1',
    workflow: mockWorkflows[0],
    document_name: 'Q4 Budget Proposal.pdf',
    started_by: 'John Doe',
    started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    current_step_id: 'step-1',
    priority: 'high',
    escalation_count: 0,
    step_instances: [
      {
        id: 'si-1',
        step_id: 'step-1',
        step_name: 'Manager Review',
        status: 'in_progress',
        assigned_to: 'Jane Smith',
        started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        is_overdue: false,
        escalation_level: 0,
        step: mockWorkflows[0].steps[0],
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        escalation_history: []
      }
    ]
  },
  {
    id: 'inst-2',
    documentId: 'doc-2',
    stages: [],
    currentStage: 0,
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    workflow_id: 'wf-1',
    workflow: mockWorkflows[0],
    document_name: 'Marketing Campaign Brief.docx',
    started_by: 'Mike Johnson',
    started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    current_step_id: 'step-1',
    priority: 'medium',
    escalation_count: 1,
    step_instances: [
      {
        id: 'si-2',
        step_id: 'step-1',
        step_name: 'Manager Review',
        status: 'in_progress',
        assigned_to: 'Sarah Wilson',
        started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        is_overdue: true,
        escalation_level: 1,
        step: mockWorkflows[0].steps[0],
        due_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        escalation_history: [
          {
            id: 'eh-1',
            rule_id: 'esc-1',
            rule_name: 'Standard Escalation',
            triggered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            action_taken: 'notify'
          }
        ]
      }
    ]
  }
];

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState<ExtendedWorkflow[]>(mockWorkflows);
  const [instances, setInstances] = useState<ExtendedWorkflowInstance[]>(mockInstances);
  const [escalationRules, setEscalationRules] = useState<ExtendedEscalationRule[]>(mockEscalationRules);
  const [isLoading, setIsLoading] = useState(false);
  const [stats] = useState<WorkflowStats & { draft_workflows?: number; sla_compliance_rate?: number; overdue_steps?: number; completed_this_month?: number; average_completion_time_hours?: number }>({
    total_workflows: 3,
    active_workflows: 2,
    draft_workflows: 1,
    running_instances: 2,
    completed_today: 5,
    pending_approvals: 5,
    overdue_tasks: 1,
    avg_completion_time: 36,
    escalation_rate: 12,
    sla_compliance_rate: 94,
    overdue_steps: 1,
    completed_this_month: 28,
    average_completion_time_hours: 36
  });

  const fetchWorkflows = useCallback(async (status?: WorkflowStatus) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (status) {
        setWorkflows(mockWorkflows.filter(w => w.status === status));
      } else {
        setWorkflows(mockWorkflows);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (workflow: any) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newWorkflow: ExtendedWorkflow = {
        ...workflow,
        id: `wf-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        run_count: 0,
        stats: { total_runs: 0, completed_runs: 0, avg_completion_time: 0, success_rate: 0 }
      };
      setWorkflows(prev => [...prev, newWorkflow]);
      toast.success('Workflow created successfully');
      return newWorkflow;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<ExtendedWorkflow>) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
      ));
      toast.success('Workflow updated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success('Workflow deleted');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'active' });
    toast.success('Workflow activated');
  }, [updateWorkflow]);

  const pauseWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'paused' });
    toast.success('Workflow paused');
  }, [updateWorkflow]);

  const startWorkflowInstance = useCallback(async (workflowId: string, documentId: string, priority: Priority = 'medium') => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) throw new Error('Workflow not found');

      const instance: ExtendedWorkflowInstance = {
        id: `inst-${Date.now()}`,
        documentId,
        stages: [],
        currentStage: 0,
        status: 'active',
        createdAt: new Date(),
        workflow_id: workflowId,
        workflow,
        started_by: 'Current User',
        started_at: new Date().toISOString(),
        current_step_id: workflow.steps[0]?.id,
        priority,
        escalation_count: 0,
        step_instances: workflow.steps.map(step => ({
          id: `si-${Date.now()}-${step.id}`,
          step_id: step.id,
          step_name: step.name,
          status: step.order === 1 ? 'in_progress' : 'pending',
          assigned_to: '',
          is_overdue: false,
          escalation_level: 0,
          step,
          escalation_history: []
        }))
      };

      setInstances(prev => [...prev, instance]);
      setWorkflows(prev => prev.map(w =>
        w.id === workflowId ? { ...w, run_count: (w.run_count || 0) + 1, last_run_at: new Date().toISOString() } : w
      ));
      toast.success('Workflow started');
      return instance;
    } finally {
      setIsLoading(false);
    }
  }, [workflows]);

  const approveStep = useCallback(async (instanceId: string, stepId: string, comment?: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setInstances(prev => prev.map(inst => {
        if (inst.id !== instanceId) return inst;
        const stepInstances = inst.step_instances || [];
        const currentIndex = stepInstances.findIndex(s => s.step_id === stepId);
        
        const updatedSteps = stepInstances.map((si, index) => {
          if (si.step_id === stepId) {
            return { ...si, status: 'completed' as const, completed_at: new Date().toISOString() };
          }
          if (index === currentIndex + 1) {
            return { ...si, status: 'in_progress' as const, started_at: new Date().toISOString() };
          }
          return si;
        });

        const nextStepIndex = currentIndex + 1;
        const isCompleted = nextStepIndex >= stepInstances.length;

        return {
          ...inst,
          step_instances: updatedSteps,
          status: isCompleted ? 'completed' : 'active',
          completedAt: isCompleted ? new Date() : undefined
        };
      }));
      toast.success('Step approved');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectStep = useCallback(async (instanceId: string, stepId: string, reason: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setInstances(prev => prev.map(inst => {
        if (inst.id !== instanceId) return inst;
        return {
          ...inst,
          status: 'rejected',
          step_instances: (inst.step_instances || []).map(si =>
            si.step_id === stepId
              ? { ...si, status: 'rejected' as const, comments: reason }
              : si
          )
        };
      }));
      toast.success('Step rejected');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createEscalationRule = useCallback(async (rule: any) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newRule: ExtendedEscalationRule = {
        id: `esc-${Date.now()}`,
        name: rule.name,
        description: rule.description,
        is_active: rule.is_active,
        is_global: false,
        priority: rule.priority,
        conditions: [{ type: 'time_elapsed', threshold_hours: rule.trigger_after_hours }],
        actions: rule.actions || [],
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        trigger_count: 0,
        trigger_after_hours: rule.trigger_after_hours,
        repeat_every_hours: rule.repeat_every_hours,
        max_escalations: rule.max_escalations
      };
      setEscalationRules(prev => [...prev, newRule]);
      toast.success('Escalation rule created');
      return newRule;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEscalationRule = useCallback(async (id: string, updates: Partial<ExtendedEscalationRule>) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setEscalationRules(prev => prev.map(r =>
        r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
      ));
      toast.success('Escalation rule updated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteEscalationRule = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setEscalationRules(prev => prev.filter(r => r.id !== id));
      toast.success('Escalation rule deleted');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    workflows,
    instances,
    escalationRules,
    stats,
    isLoading,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
    startWorkflowInstance,
    approveStep,
    rejectStep,
    createEscalationRule,
    updateEscalationRule,
    deleteEscalationRule
  };
};
