// ============= Shared Drives / Team Workspaces Types =============

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'commenter' | 'viewer';

export const WORKSPACE_ROLE_HIERARCHY: WorkspaceRole[] = [
  'viewer', 'commenter', 'editor', 'admin', 'owner'
];

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  cover_image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  is_archived?: boolean;
  visibility: 'private' | 'internal' | 'public';
  settings: WorkspaceSettings;
  stats?: WorkspaceStats;
  members_count?: number;
  documents_count?: number;
  storage_used?: number;
  my_role?: WorkspaceRole;
}

export interface WorkspaceSettings {
  allow_external_sharing: boolean;
  require_approval_for_join: boolean;
  default_member_role: WorkspaceRole;
  allow_member_invite: boolean;
  storage_quota_bytes?: number;
  max_file_size_bytes?: number;
  allowed_file_types?: string[];
  auto_version_enabled: boolean;
  retention_policy_id?: string;
  watermark_enabled?: boolean;
  download_restrictions?: 'none' | 'members_only' | 'admins_only';
  notification_preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  new_document: boolean;
  document_updated: boolean;
  member_joined: boolean;
  member_left: boolean;
  comment_added: boolean;
  mention: boolean;
}

export interface WorkspaceStats {
  total_documents: number;
  total_folders: number;
  total_storage_bytes: number;
  storage_quota_bytes: number;
  storage_percent_used: number;
  active_members: number;
  documents_this_week: number;
  documents_this_month: number;
  most_active_users: { user_id: string; activity_count: number }[];
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  last_active_at?: string;
  status: 'pending' | 'active' | 'suspended';
  notification_preferences?: NotificationPreferences;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
  inviter?: {
    email?: string;
    name?: string;
  };
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  accepted_at?: string;
  message?: string;
  workspace?: {
    name: string;
    icon?: string;
    color?: string;
  };
  inviter?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface WorkspaceFolder {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  path?: string;
}

export interface WorkspaceDocument {
  id: string;
  workspace_id: string;
  folder_id?: string;
  document_id: string;
  added_by: string;
  added_at: string;
  document?: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
    updated_at: string;
  };
}

export interface WorkspaceActivity {
  id: string;
  workspace_id: string;
  user_id: string;
  action: WorkspaceActivityAction;
  resource_type: 'workspace' | 'document' | 'folder' | 'member';
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

export type WorkspaceActivityAction =
  | 'workspace_created'
  | 'workspace_updated'
  | 'workspace_archived'
  | 'workspace_restored'
  | 'member_invited'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'member_role_changed'
  | 'document_added'
  | 'document_removed'
  | 'document_updated'
  | 'document_moved'
  | 'folder_created'
  | 'folder_deleted'
  | 'folder_renamed'
  | 'settings_changed';

export interface WorkspaceJoinRequest {
  id: string;
  workspace_id: string;
  user_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user?: {
    email?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface WorkspaceRoleInfo {
  role: WorkspaceRole;
  label: string;
  description: string;
  icon: string;
  color: string;
  permissions: WorkspacePermission[];
}

export type WorkspacePermission =
  | 'view_workspace'
  | 'view_documents'
  | 'download_documents'
  | 'add_documents'
  | 'edit_documents'
  | 'delete_documents'
  | 'create_folders'
  | 'delete_folders'
  | 'add_comments'
  | 'manage_members'
  | 'invite_members'
  | 'remove_members'
  | 'change_member_roles'
  | 'manage_settings'
  | 'archive_workspace'
  | 'delete_workspace'
  | 'transfer_ownership';

export const WORKSPACE_ROLE_INFO: Record<WorkspaceRole, WorkspaceRoleInfo> = {
  viewer: {
    role: 'viewer',
    label: 'Viewer',
    description: 'Can view and download documents',
    icon: 'Eye',
    color: 'hsl(var(--chart-1))',
    permissions: ['view_workspace', 'view_documents', 'download_documents']
  },
  commenter: {
    role: 'commenter',
    label: 'Commenter',
    description: 'Can view, download, and comment on documents',
    icon: 'MessageSquare',
    color: 'hsl(var(--chart-2))',
    permissions: ['view_workspace', 'view_documents', 'download_documents', 'add_comments']
  },
  editor: {
    role: 'editor',
    label: 'Editor',
    description: 'Can add, edit, and organize documents',
    icon: 'Edit',
    color: 'hsl(var(--chart-3))',
    permissions: [
      'view_workspace', 'view_documents', 'download_documents', 'add_comments',
      'add_documents', 'edit_documents', 'create_folders'
    ]
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Can manage members and workspace settings',
    icon: 'Settings',
    color: 'hsl(var(--chart-4))',
    permissions: [
      'view_workspace', 'view_documents', 'download_documents', 'add_comments',
      'add_documents', 'edit_documents', 'delete_documents', 'create_folders', 'delete_folders',
      'manage_members', 'invite_members', 'remove_members', 'change_member_roles', 'manage_settings'
    ]
  },
  owner: {
    role: 'owner',
    label: 'Owner',
    description: 'Full control including deletion and transfer',
    icon: 'Crown',
    color: 'hsl(var(--primary))',
    permissions: [
      'view_workspace', 'view_documents', 'download_documents', 'add_comments',
      'add_documents', 'edit_documents', 'delete_documents', 'create_folders', 'delete_folders',
      'manage_members', 'invite_members', 'remove_members', 'change_member_roles', 'manage_settings',
      'archive_workspace', 'delete_workspace', 'transfer_ownership'
    ]
  }
};

// Helper functions
export const hasWorkspaceRole = (
  userRole: WorkspaceRole,
  requiredRole: WorkspaceRole
): boolean => {
  const userRank = WORKSPACE_ROLE_HIERARCHY.indexOf(userRole);
  const requiredRank = WORKSPACE_ROLE_HIERARCHY.indexOf(requiredRole);
  return userRank >= requiredRank;
};

export const hasWorkspacePermission = (
  userRole: WorkspaceRole,
  permission: WorkspacePermission
): boolean => {
  return WORKSPACE_ROLE_INFO[userRole]?.permissions.includes(permission) || false;
};

export const formatStorageSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Workspace color presets
export const WORKSPACE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

// Workspace icon presets
export const WORKSPACE_ICONS = [
  'Folder', 'FolderOpen', 'Building', 'Building2', 'Briefcase',
  'Users', 'UserCircle', 'Globe', 'Lock', 'Shield',
  'Star', 'Heart', 'Bookmark', 'Flag', 'Zap',
  'Code', 'Database', 'FileText', 'Image', 'Video'
];
