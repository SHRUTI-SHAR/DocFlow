// ============= Granular Permission System Types =============

// 7-Level Permission Hierarchy (from most restrictive to least)
export type PermissionLevel = 
  | 'none'        // No access
  | 'viewer'      // Read-only access
  | 'commenter'   // Can view and add comments
  | 'contributor' // Can view, comment, and suggest edits
  | 'editor'      // Can edit content
  | 'admin'       // Can manage permissions and settings
  | 'owner';      // Full control including deletion and transfer

// Permission hierarchy order (higher index = more permissions)
export const PERMISSION_HIERARCHY: PermissionLevel[] = [
  'none', 'viewer', 'commenter', 'contributor', 'editor', 'admin', 'owner'
];

// Resource types that can have permissions
export type ResourceType = 
  | 'document'
  | 'folder'
  | 'template'
  | 'workflow'
  | 'form'
  | 'workspace';

// Granular permission actions
export type PermissionAction =
  // View permissions
  | 'view'
  | 'view_metadata'
  | 'view_history'
  | 'view_comments'
  | 'view_permissions'
  // Comment permissions
  | 'add_comment'
  | 'edit_own_comment'
  | 'delete_own_comment'
  | 'resolve_comment'
  // Content permissions
  | 'suggest_edit'
  | 'edit'
  | 'create_version'
  | 'restore_version'
  | 'delete_version'
  // File permissions
  | 'download'
  | 'print'
  | 'export'
  | 'copy'
  // Sharing permissions
  | 'share_view'
  | 'share_edit'
  | 'share_admin'
  | 'create_link'
  | 'manage_link'
  // Management permissions
  | 'manage_permissions'
  | 'manage_settings'
  | 'lock'
  | 'unlock'
  | 'archive'
  | 'unarchive'
  | 'move'
  | 'rename'
  | 'delete'
  | 'transfer_ownership';

// Permission matrix - what each level can do
export const PERMISSION_MATRIX: Record<PermissionLevel, PermissionAction[]> = {
  none: [],
  viewer: [
    'view', 'view_metadata', 'view_history', 'view_comments',
    'download'
  ],
  commenter: [
    'view', 'view_metadata', 'view_history', 'view_comments',
    'download',
    'add_comment', 'edit_own_comment', 'delete_own_comment'
  ],
  contributor: [
    'view', 'view_metadata', 'view_history', 'view_comments',
    'download', 'print', 'export', 'copy',
    'add_comment', 'edit_own_comment', 'delete_own_comment',
    'suggest_edit'
  ],
  editor: [
    'view', 'view_metadata', 'view_history', 'view_comments',
    'download', 'print', 'export', 'copy',
    'add_comment', 'edit_own_comment', 'delete_own_comment', 'resolve_comment',
    'suggest_edit', 'edit', 'create_version', 'restore_version',
    'share_view', 'create_link',
    'rename'
  ],
  admin: [
    'view', 'view_metadata', 'view_history', 'view_comments', 'view_permissions',
    'download', 'print', 'export', 'copy',
    'add_comment', 'edit_own_comment', 'delete_own_comment', 'resolve_comment',
    'suggest_edit', 'edit', 'create_version', 'restore_version', 'delete_version',
    'share_view', 'share_edit', 'share_admin', 'create_link', 'manage_link',
    'manage_permissions', 'manage_settings',
    'lock', 'unlock', 'archive', 'unarchive', 'move', 'rename'
  ],
  owner: [
    'view', 'view_metadata', 'view_history', 'view_comments', 'view_permissions',
    'download', 'print', 'export', 'copy',
    'add_comment', 'edit_own_comment', 'delete_own_comment', 'resolve_comment',
    'suggest_edit', 'edit', 'create_version', 'restore_version', 'delete_version',
    'share_view', 'share_edit', 'share_admin', 'create_link', 'manage_link',
    'manage_permissions', 'manage_settings',
    'lock', 'unlock', 'archive', 'unarchive', 'move', 'rename',
    'delete', 'transfer_ownership'
  ]
};

// Permission Level metadata
export interface PermissionLevelInfo {
  level: PermissionLevel;
  label: string;
  description: string;
  icon: string;
  color: string;
  rank: number;
}

export const PERMISSION_LEVEL_INFO: Record<PermissionLevel, PermissionLevelInfo> = {
  none: {
    level: 'none',
    label: 'No Access',
    description: 'Cannot access this resource',
    icon: 'Ban',
    color: 'hsl(var(--muted))',
    rank: 0
  },
  viewer: {
    level: 'viewer',
    label: 'Viewer',
    description: 'Can view and download',
    icon: 'Eye',
    color: 'hsl(var(--chart-1))',
    rank: 1
  },
  commenter: {
    level: 'commenter',
    label: 'Commenter',
    description: 'Can view and add comments',
    icon: 'MessageSquare',
    color: 'hsl(var(--chart-2))',
    rank: 2
  },
  contributor: {
    level: 'contributor',
    label: 'Contributor',
    description: 'Can suggest edits for review',
    icon: 'GitPullRequest',
    color: 'hsl(var(--chart-3))',
    rank: 3
  },
  editor: {
    level: 'editor',
    label: 'Editor',
    description: 'Can directly edit content',
    icon: 'Edit',
    color: 'hsl(var(--chart-4))',
    rank: 4
  },
  admin: {
    level: 'admin',
    label: 'Admin',
    description: 'Can manage permissions and settings',
    icon: 'Settings',
    color: 'hsl(var(--chart-5))',
    rank: 5
  },
  owner: {
    level: 'owner',
    label: 'Owner',
    description: 'Full control including deletion',
    icon: 'Crown',
    color: 'hsl(var(--primary))',
    rank: 6
  }
};

// Resource Permission - individual permission grant
export interface ResourcePermission {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  // Can be user or group
  grantee_type: 'user' | 'group' | 'public' | 'anyone_with_link';
  grantee_id?: string; // null for public/link
  permission_level: PermissionLevel;
  // Granular overrides
  custom_actions?: PermissionAction[];
  denied_actions?: PermissionAction[];
  // Metadata
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_inherited?: boolean;
  inherited_from?: string;
  // Conditions
  conditions?: PermissionCondition[];
  notes?: string;
}

// Permission conditions for conditional access
export interface PermissionCondition {
  type: 'time_range' | 'ip_range' | 'location' | 'device' | 'mfa_required';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'between';
  value: string | string[] | Record<string, unknown>;
}

// Permission Group - for team-based permissions
export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  workspace_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  is_default?: boolean;
}

// Group membership
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'manager' | 'owner';
  added_by: string;
  added_at: string;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

// Permission inheritance settings
export interface InheritanceSettings {
  resource_type: ResourceType;
  resource_id: string;
  inherit_from_parent: boolean;
  override_children: boolean;
  propagate_to_children: boolean;
}

// Share link for public/link sharing
export interface ShareLink {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  token: string;
  permission_level: PermissionLevel;
  created_by: string;
  created_at: string;
  expires_at?: string;
  password_protected: boolean;
  password_hash?: string;
  max_uses?: number;
  use_count: number;
  last_used_at?: string;
  is_active: boolean;
  allowed_emails?: string[];
  require_email?: boolean;
  conditions?: PermissionCondition[];
}

// Permission request for access requests
export interface PermissionRequest {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  requester_id: string;
  requested_level: PermissionLevel;
  message?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  expires_at: string;
  requester?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

// Permission audit log entry
export interface PermissionAuditEntry {
  id: string;
  resource_type: ResourceType;
  resource_id: string;
  action: PermissionAuditAction;
  actor_id: string;
  target_id?: string;
  old_level?: PermissionLevel;
  new_level?: PermissionLevel;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type PermissionAuditAction =
  | 'permission_granted'
  | 'permission_revoked'
  | 'permission_changed'
  | 'group_created'
  | 'group_deleted'
  | 'group_member_added'
  | 'group_member_removed'
  | 'link_created'
  | 'link_revoked'
  | 'link_used'
  | 'request_created'
  | 'request_approved'
  | 'request_denied'
  | 'inheritance_changed'
  | 'ownership_transferred';

// Effective permission - computed from all sources
export interface EffectivePermission {
  resource_type: ResourceType;
  resource_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  allowed_actions: PermissionAction[];
  denied_actions: PermissionAction[];
  sources: PermissionSource[];
  is_owner: boolean;
  has_admin_access: boolean;
  expires_at?: string;
}

export interface PermissionSource {
  type: 'direct' | 'group' | 'inherited' | 'public' | 'link';
  source_id?: string;
  source_name?: string;
  permission_level: PermissionLevel;
}

// Bulk permission operation
export interface BulkPermissionOperation {
  operation: 'grant' | 'revoke' | 'change';
  resource_ids: string[];
  resource_type: ResourceType;
  grantee_type: 'user' | 'group';
  grantee_ids: string[];
  permission_level?: PermissionLevel;
}

// Permission template for quick setup
export interface PermissionTemplate {
  id: string;
  name: string;
  description?: string;
  permissions: Array<{
    role: string;
    level: PermissionLevel;
    custom_actions?: PermissionAction[];
  }>;
  is_default?: boolean;
  workspace_id?: string;
  created_by: string;
  created_at: string;
}

// Helper functions
export const hasPermission = (
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean => {
  const userRank = PERMISSION_HIERARCHY.indexOf(userLevel);
  const requiredRank = PERMISSION_HIERARCHY.indexOf(requiredLevel);
  return userRank >= requiredRank;
};

export const canPerformAction = (
  userLevel: PermissionLevel,
  action: PermissionAction,
  customActions?: PermissionAction[],
  deniedActions?: PermissionAction[]
): boolean => {
  // Check denied first
  if (deniedActions?.includes(action)) return false;
  // Check custom actions override
  if (customActions?.includes(action)) return true;
  // Check permission matrix
  return PERMISSION_MATRIX[userLevel]?.includes(action) || false;
};

export const getHighestPermission = (levels: PermissionLevel[]): PermissionLevel => {
  let highest: PermissionLevel = 'none';
  let highestRank = 0;
  
  for (const level of levels) {
    const rank = PERMISSION_HIERARCHY.indexOf(level);
    if (rank > highestRank) {
      highestRank = rank;
      highest = level;
    }
  }
  
  return highest;
};

export const getPermissionDifference = (
  oldLevel: PermissionLevel,
  newLevel: PermissionLevel
): 'upgrade' | 'downgrade' | 'same' => {
  const oldRank = PERMISSION_HIERARCHY.indexOf(oldLevel);
  const newRank = PERMISSION_HIERARCHY.indexOf(newLevel);
  
  if (newRank > oldRank) return 'upgrade';
  if (newRank < oldRank) return 'downgrade';
  return 'same';
};
