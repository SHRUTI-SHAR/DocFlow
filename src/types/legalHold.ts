// ============= Enhanced Legal Hold Types =============

export type LegalHoldStatus = 'draft' | 'pending_approval' | 'active' | 'released' | 'expired';
export type CustodianStatus = 'pending' | 'acknowledged' | 'reminded' | 'escalated' | 'released';
export type HoldScope = 'specific_documents' | 'folder' | 'search_criteria' | 'custodian_content' | 'date_range';
export type NotificationType = 'hold_notice' | 'reminder' | 'release_notice' | 'escalation' | 'acknowledgment_request';

export interface EnhancedLegalHold {
  id: string;
  name: string;
  description?: string;
  
  // Matter Information
  matter_id: string;
  matter_name: string;
  matter_type: 'litigation' | 'investigation' | 'regulatory' | 'audit' | 'other';
  case_number?: string;
  court_name?: string;
  opposing_party?: string;
  
  // Hold Details
  hold_reason: string;
  scope: HoldScope;
  scope_details: HoldScopeDetails;
  
  // Dates
  issue_date: string;
  effective_date: string;
  anticipated_end_date?: string;
  released_date?: string;
  
  // Status
  status: LegalHoldStatus;
  requires_acknowledgment: boolean;
  acknowledgment_deadline_days: number;
  
  // Custodians
  custodians: LegalHoldCustodian[];
  
  // Protected Content
  document_count: number;
  folder_count: number;
  total_size_bytes: number;
  
  // Notifications
  send_reminders: boolean;
  reminder_frequency_days: number;
  escalation_enabled: boolean;
  escalation_after_days: number;
  escalation_contacts: string[];
  
  // Legal Team
  issuing_attorney?: string;
  legal_team_emails: string[];
  
  // Audit
  created_by: string;
  created_at: string;
  updated_at: string;
  released_by?: string;
  release_reason?: string;
  release_approved_by?: string;
  
  // Notes & Attachments
  internal_notes?: string;
  hold_notice_template_id?: string;
  attachments: LegalHoldAttachment[];
  
  // Stats
  stats?: LegalHoldStats;
}

export interface HoldScopeDetails {
  document_ids?: string[];
  folder_ids?: string[];
  search_query?: string;
  date_range?: {
    start: string;
    end: string;
  };
  file_types?: string[];
  keywords?: string[];
  custodian_ids?: string[];
}

export interface LegalHoldCustodian {
  id: string;
  hold_id: string;
  user_id?: string;
  name: string;
  email: string;
  department?: string;
  title?: string;
  status: CustodianStatus;
  acknowledged_at?: string;
  last_reminded_at?: string;
  reminder_count: number;
  escalated_at?: string;
  released_at?: string;
  notes?: string;
  document_count?: number;
  added_at: string;
  added_by: string;
}

export interface LegalHoldNotification {
  id: string;
  hold_id: string;
  custodian_id?: string;
  type: NotificationType;
  subject: string;
  body: string;
  sent_at: string;
  sent_by: string;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
}

export interface LegalHoldAuditEntry {
  id: string;
  hold_id: string;
  action: LegalHoldAuditAction;
  actor_id: string;
  actor_name?: string;
  target_type?: 'hold' | 'custodian' | 'document' | 'notification';
  target_id?: string;
  target_name?: string;
  old_value?: string;
  new_value?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export type LegalHoldAuditAction =
  | 'hold_created'
  | 'hold_issued'
  | 'hold_modified'
  | 'hold_released'
  | 'hold_expired'
  | 'custodian_added'
  | 'custodian_removed'
  | 'custodian_acknowledged'
  | 'custodian_reminded'
  | 'custodian_escalated'
  | 'document_added'
  | 'document_removed'
  | 'notification_sent'
  | 'scope_modified'
  | 'note_added';

export interface LegalHoldAttachment {
  id: string;
  hold_id: string;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface LegalHoldStats {
  total_custodians: number;
  acknowledged_custodians: number;
  pending_custodians: number;
  escalated_custodians: number;
  total_documents: number;
  total_size_bytes: number;
  notifications_sent: number;
  days_active: number;
}

export interface LegalHoldTemplate {
  id: string;
  name: string;
  type: 'hold_notice' | 'reminder' | 'release_notice' | 'escalation';
  subject: string;
  body: string;
  variables: string[];
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface CreateLegalHoldParams {
  name: string;
  matter_id: string;
  matter_name: string;
  matter_type: EnhancedLegalHold['matter_type'];
  hold_reason: string;
  scope: HoldScope;
  scope_details: HoldScopeDetails;
  custodian_emails?: string[];
  requires_acknowledgment?: boolean;
  acknowledgment_deadline_days?: number;
  send_reminders?: boolean;
  reminder_frequency_days?: number;
  escalation_enabled?: boolean;
  escalation_after_days?: number;
  escalation_contacts?: string[];
  legal_team_emails?: string[];
  effective_date?: string;
  anticipated_end_date?: string;
  internal_notes?: string;
}

// Status configuration
export const LEGAL_HOLD_STATUS_CONFIG: Record<LegalHoldStatus, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Hold is being prepared'
  },
  pending_approval: {
    label: 'Pending Approval',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    description: 'Awaiting legal approval'
  },
  active: {
    label: 'Active',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Hold is in effect'
  },
  released: {
    label: 'Released',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Hold has been lifted'
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Hold has expired'
  }
};

export const CUSTODIAN_STATUS_CONFIG: Record<CustodianStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  acknowledged: {
    label: 'Acknowledged',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  reminded: {
    label: 'Reminded',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  escalated: {
    label: 'Escalated',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  },
  released: {
    label: 'Released',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  }
};

export const MATTER_TYPES: { value: EnhancedLegalHold['matter_type']; label: string; icon: string }[] = [
  { value: 'litigation', label: 'Litigation', icon: 'Scale' },
  { value: 'investigation', label: 'Investigation', icon: 'Search' },
  { value: 'regulatory', label: 'Regulatory Inquiry', icon: 'Shield' },
  { value: 'audit', label: 'Audit', icon: 'ClipboardCheck' },
  { value: 'other', label: 'Other', icon: 'FileText' }
];

export const HOLD_SCOPE_OPTIONS: { value: HoldScope; label: string; description: string; icon: string }[] = [
  { value: 'specific_documents', label: 'Specific Documents', description: 'Select individual documents', icon: 'FileText' },
  { value: 'folder', label: 'Folders', description: 'Entire folder contents', icon: 'Folder' },
  { value: 'search_criteria', label: 'Search Criteria', description: 'Documents matching search', icon: 'Search' },
  { value: 'custodian_content', label: 'Custodian Content', description: 'All content by custodians', icon: 'User' },
  { value: 'date_range', label: 'Date Range', description: 'Documents within date range', icon: 'Calendar' }
];
