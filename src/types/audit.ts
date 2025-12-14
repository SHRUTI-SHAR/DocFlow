// Activity Tracking & Audit Trail Types

export interface AuditEvent {
  id: string;
  document_id?: string;
  folder_id?: string;
  user_id: string;
  action: AuditAction;
  action_category: AuditCategory;
  resource_type: 'document' | 'folder' | 'template' | 'form' | 'user' | 'system';
  resource_name?: string;
  details: AuditDetails;
  metadata: AuditMetadata;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
  // Joined data
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  };
  document?: {
    id: string;
    file_name: string;
    file_type: string;
  };
}

export type AuditAction =
  // Document actions
  | 'document.created'
  | 'document.viewed'
  | 'document.downloaded'
  | 'document.updated'
  | 'document.deleted'
  | 'document.restored'
  | 'document.moved'
  | 'document.copied'
  | 'document.renamed'
  | 'document.shared'
  | 'document.unshared'
  | 'document.locked'
  | 'document.unlocked'
  | 'document.versioned'
  | 'document.version_restored'
  | 'document.commented'
  | 'document.tagged'
  | 'document.untagged'
  | 'document.starred'
  | 'document.unstarred'
  | 'document.archived'
  | 'document.unarchived'
  | 'document.processed'
  | 'document.exported'
  | 'document.printed'
  // Folder actions
  | 'folder.created'
  | 'folder.updated'
  | 'folder.deleted'
  | 'folder.moved'
  | 'folder.shared'
  // Access actions
  | 'access.granted'
  | 'access.revoked'
  | 'access.modified'
  | 'access.requested'
  | 'access.denied'
  // User actions
  | 'user.login'
  | 'user.logout'
  | 'user.session_started'
  | 'user.session_ended'
  | 'user.settings_changed'
  // System actions
  | 'system.backup_created'
  | 'system.retention_applied'
  | 'system.ai_processed'
  | 'system.search_performed';

export type AuditCategory =
  | 'document_management'
  | 'access_control'
  | 'collaboration'
  | 'security'
  | 'system'
  | 'ai_processing'
  | 'export'
  | 'user_activity';

export interface AuditDetails {
  // For document updates
  changes?: Array<{
    field: string;
    old_value?: unknown;
    new_value?: unknown;
  }>;
  // For sharing
  shared_with?: string[];
  permission_level?: string;
  // For version control
  version_number?: number;
  previous_version?: number;
  // For folder operations
  source_folder_id?: string;
  destination_folder_id?: string;
  // For tags
  tag_name?: string;
  tag_id?: string;
  // For comments
  comment_id?: string;
  comment_preview?: string;
  // For search
  search_query?: string;
  results_count?: number;
  // For AI processing
  ai_model?: string;
  processing_time_ms?: number;
  // For exports
  export_format?: string;
  // Generic
  reason?: string;
  notes?: string;
}

export interface AuditMetadata {
  device_type?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  file_size?: number;
  file_type?: string;
  duration_ms?: number;
  is_automated?: boolean;
  trigger_source?: 'user' | 'api' | 'scheduled' | 'webhook';
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  resourceTypes?: AuditEvent['resource_type'][];
  userIds?: string[];
  documentIds?: string[];
  searchQuery?: string;
}

export interface AuditStats {
  total_events: number;
  events_today: number;
  events_this_week: number;
  most_active_documents: Array<{
    document_id: string;
    document_name: string;
    event_count: number;
  }>;
  most_active_users: Array<{
    user_id: string;
    user_name: string;
    event_count: number;
  }>;
  action_breakdown: Record<AuditCategory, number>;
  hourly_activity: Array<{
    hour: number;
    count: number;
  }>;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'document.created': 'Document Created',
  'document.viewed': 'Document Viewed',
  'document.downloaded': 'Document Downloaded',
  'document.updated': 'Document Updated',
  'document.deleted': 'Document Deleted',
  'document.restored': 'Document Restored',
  'document.moved': 'Document Moved',
  'document.copied': 'Document Copied',
  'document.renamed': 'Document Renamed',
  'document.shared': 'Document Shared',
  'document.unshared': 'Sharing Removed',
  'document.locked': 'Document Locked',
  'document.unlocked': 'Document Unlocked',
  'document.versioned': 'New Version Created',
  'document.version_restored': 'Version Restored',
  'document.commented': 'Comment Added',
  'document.tagged': 'Tag Added',
  'document.untagged': 'Tag Removed',
  'document.starred': 'Starred',
  'document.unstarred': 'Unstarred',
  'document.archived': 'Archived',
  'document.unarchived': 'Unarchived',
  'document.processed': 'AI Processed',
  'document.exported': 'Exported',
  'document.printed': 'Printed',
  'folder.created': 'Folder Created',
  'folder.updated': 'Folder Updated',
  'folder.deleted': 'Folder Deleted',
  'folder.moved': 'Folder Moved',
  'folder.shared': 'Folder Shared',
  'access.granted': 'Access Granted',
  'access.revoked': 'Access Revoked',
  'access.modified': 'Access Modified',
  'access.requested': 'Access Requested',
  'access.denied': 'Access Denied',
  'user.login': 'User Login',
  'user.logout': 'User Logout',
  'user.session_started': 'Session Started',
  'user.session_ended': 'Session Ended',
  'user.settings_changed': 'Settings Changed',
  'system.backup_created': 'Backup Created',
  'system.retention_applied': 'Retention Applied',
  'system.ai_processed': 'AI Processing',
  'system.search_performed': 'Search Performed',
};

export const AUDIT_CATEGORY_COLORS: Record<AuditCategory, string> = {
  document_management: '#3B82F6',
  access_control: '#8B5CF6',
  collaboration: '#10B981',
  security: '#EF4444',
  system: '#6B7280',
  ai_processing: '#F59E0B',
  export: '#06B6D4',
  user_activity: '#EC4899',
};

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  document_management: 'Document Management',
  access_control: 'Access Control',
  collaboration: 'Collaboration',
  security: 'Security',
  system: 'System',
  ai_processing: 'AI Processing',
  export: 'Export',
  user_activity: 'User Activity',
};
