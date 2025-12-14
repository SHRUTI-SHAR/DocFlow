// Records Retention Policy Types

export type DispositionAction = 'delete' | 'archive' | 'review' | 'transfer';
export type TriggerType = 'creation_date' | 'last_modified' | 'custom_date' | 'event_based';
export type ComplianceFramework = 'GDPR' | 'HIPAA' | 'SOX' | 'PCI-DSS' | 'TAX' | 'HR' | 'LEGAL' | 'BUSINESS' | 'CUSTOM';
export type RetentionStatus = 'active' | 'pending_review' | 'pending_approval' | 'on_hold' | 'disposed' | 'archived';
export type LegalHoldStatus = 'active' | 'released' | 'expired';
export type AuditAction = 'disposed' | 'archived' | 'transferred' | 'extended' | 'held' | 'released' | 'exception_granted';

export interface RetentionPolicy {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  retention_period_days: number;
  disposition_action: DispositionAction;
  trigger_type: TriggerType;
  trigger_event?: string;
  is_active: boolean;
  priority: number;
  applies_to_categories: string[];
  applies_to_folders: string[];
  compliance_framework?: ComplianceFramework;
  notification_days_before: number;
  requires_approval: boolean;
  approval_roles: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LegalHold {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  hold_reason: string;
  matter_id?: string;
  custodian_name?: string;
  custodian_email?: string;
  start_date: string;
  end_date?: string;
  status: LegalHoldStatus;
  document_ids: string[];
  folder_ids: string[];
  search_criteria?: Record<string, unknown>;
  notes?: string;
  created_by?: string;
  released_by?: string;
  released_at?: string;
  release_reason?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentRetentionStatus {
  id: string;
  document_id: string;
  user_id: string;
  policy_id?: string;
  retention_start_date: string;
  retention_end_date: string;
  current_status: RetentionStatus;
  legal_hold_ids: string[];
  disposition_action?: DispositionAction;
  disposition_date?: string;
  disposition_approved_by?: string;
  disposition_notes?: string;
  exception_reason?: string;
  exception_approved_by?: string;
  exception_end_date?: string;
  notification_sent: boolean;
  last_review_date?: string;
  next_review_date?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  policy?: RetentionPolicy;
}

export interface DispositionAuditLog {
  id: string;
  document_id: string;
  user_id: string;
  action: AuditAction;
  action_by: string;
  policy_id?: string;
  legal_hold_id?: string;
  previous_status?: string;
  new_status?: string;
  reason?: string;
  document_metadata?: Record<string, unknown>;
  certificate_number?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface RetentionPolicyTemplate {
  id: string;
  name: string;
  description?: string;
  compliance_framework: ComplianceFramework;
  retention_period_days: number;
  disposition_action: DispositionAction;
  trigger_type: TriggerType;
  requires_approval: boolean;
  category_suggestions: string[];
  is_system_template: boolean;
  created_at: string;
}

export interface RetentionStats {
  total_policies: number;
  active_policies: number;
  total_documents_tracked: number;
  documents_pending_review: number;
  documents_pending_approval: number;
  documents_on_hold: number;
  documents_expiring_soon: number;
  active_legal_holds: number;
  documents_disposed_this_month: number;
}

export interface RetentionFilter {
  status?: RetentionStatus[];
  policy_id?: string;
  compliance_framework?: ComplianceFramework;
  expiring_within_days?: number;
  on_legal_hold?: boolean;
}

export const COMPLIANCE_FRAMEWORKS: { value: ComplianceFramework; label: string; description: string }[] = [
  { value: 'GDPR', label: 'GDPR', description: 'General Data Protection Regulation (EU)' },
  { value: 'HIPAA', label: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
  { value: 'SOX', label: 'SOX', description: 'Sarbanes-Oxley Act' },
  { value: 'PCI-DSS', label: 'PCI-DSS', description: 'Payment Card Industry Data Security Standard' },
  { value: 'TAX', label: 'Tax Compliance', description: 'Tax record retention requirements' },
  { value: 'HR', label: 'HR/Employment', description: 'Employment and HR records' },
  { value: 'LEGAL', label: 'Legal/Contracts', description: 'Legal documents and contracts' },
  { value: 'BUSINESS', label: 'Business', description: 'General business records' },
  { value: 'CUSTOM', label: 'Custom', description: 'Custom retention policy' },
];

export const DISPOSITION_ACTIONS: { value: DispositionAction; label: string; description: string; icon: string }[] = [
  { value: 'delete', label: 'Delete', description: 'Permanently remove the document', icon: 'Trash2' },
  { value: 'archive', label: 'Archive', description: 'Move to long-term archive storage', icon: 'Archive' },
  { value: 'review', label: 'Review', description: 'Require manual review before action', icon: 'Eye' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer to another system or owner', icon: 'Send' },
];

export const TRIGGER_TYPES: { value: TriggerType; label: string; description: string }[] = [
  { value: 'creation_date', label: 'Creation Date', description: 'Retention period starts from document creation' },
  { value: 'last_modified', label: 'Last Modified', description: 'Retention period starts from last modification' },
  { value: 'custom_date', label: 'Custom Date Field', description: 'Use a custom date field as trigger' },
  { value: 'event_based', label: 'Event Based', description: 'Trigger based on specific events' },
];

export const RETENTION_STATUS_CONFIG: Record<RetentionStatus, { label: string; color: string; description: string }> = {
  active: { label: 'Active', color: 'bg-green-500', description: 'Document is within retention period' },
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500', description: 'Awaiting manual review' },
  pending_approval: { label: 'Pending Approval', color: 'bg-orange-500', description: 'Awaiting disposition approval' },
  on_hold: { label: 'On Hold', color: 'bg-blue-500', description: 'Under legal hold' },
  disposed: { label: 'Disposed', color: 'bg-gray-500', description: 'Document has been disposed' },
  archived: { label: 'Archived', color: 'bg-purple-500', description: 'Document has been archived' },
};
