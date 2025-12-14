import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceInvite,
  WorkspaceActivity,
  WorkspaceSettings,
  WorkspaceRole,
  WorkspaceJoinRequest
} from '@/types/workspace';

// Mock data for demonstration - in production, this would come from Supabase
const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Marketing Team',
    description: 'Shared workspace for marketing materials and campaigns',
    icon: 'Briefcase',
    color: '#3B82F6',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: 'private',
    settings: {
      allow_external_sharing: false,
      require_approval_for_join: true,
      default_member_role: 'editor',
      allow_member_invite: true,
      auto_version_enabled: true,
      notification_preferences: {
        new_document: true,
        document_updated: true,
        member_joined: true,
        member_left: true,
        comment_added: true,
        mention: true
      }
    },
    members_count: 8,
    documents_count: 45,
    storage_used: 1024 * 1024 * 250,
    my_role: 'owner'
  },
  {
    id: '2',
    name: 'Engineering',
    description: 'Technical documentation and specs',
    icon: 'Code',
    color: '#10B981',
    created_by: 'user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: 'internal',
    settings: {
      allow_external_sharing: false,
      require_approval_for_join: false,
      default_member_role: 'editor',
      allow_member_invite: true,
      auto_version_enabled: true,
      notification_preferences: {
        new_document: true,
        document_updated: true,
        member_joined: true,
        member_left: false,
        comment_added: true,
        mention: true
      }
    },
    members_count: 15,
    documents_count: 120,
    storage_used: 1024 * 1024 * 890,
    my_role: 'admin'
  },
  {
    id: '3',
    name: 'HR Documents',
    description: 'Human resources policies and employee files',
    icon: 'Users',
    color: '#8B5CF6',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    visibility: 'private',
    settings: {
      allow_external_sharing: false,
      require_approval_for_join: true,
      default_member_role: 'viewer',
      allow_member_invite: false,
      auto_version_enabled: true,
      notification_preferences: {
        new_document: true,
        document_updated: true,
        member_joined: true,
        member_left: true,
        comment_added: false,
        mention: true
      }
    },
    members_count: 5,
    documents_count: 78,
    storage_used: 1024 * 1024 * 450,
    my_role: 'editor'
  }
];

const mockMembers: WorkspaceMember[] = [
  {
    id: 'm1',
    workspace_id: '1',
    user_id: 'user-1',
    role: 'owner',
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(),
    last_active_at: new Date().toISOString(),
    status: 'active',
    user: {
      email: 'john@example.com',
      name: 'John Doe',
      avatar_url: undefined
    }
  },
  {
    id: 'm2',
    workspace_id: '1',
    user_id: 'user-2',
    role: 'admin',
    invited_by: 'user-1',
    invited_at: new Date(Date.now() - 86400000).toISOString(),
    joined_at: new Date(Date.now() - 86400000).toISOString(),
    last_active_at: new Date(Date.now() - 3600000).toISOString(),
    status: 'active',
    user: {
      email: 'jane@example.com',
      name: 'Jane Smith',
      avatar_url: undefined
    }
  },
  {
    id: 'm3',
    workspace_id: '1',
    user_id: 'user-3',
    role: 'editor',
    invited_by: 'user-1',
    invited_at: new Date(Date.now() - 172800000).toISOString(),
    joined_at: new Date(Date.now() - 172800000).toISOString(),
    last_active_at: new Date(Date.now() - 7200000).toISOString(),
    status: 'active',
    user: {
      email: 'bob@example.com',
      name: 'Bob Wilson',
      avatar_url: undefined
    }
  }
];

const mockActivities: WorkspaceActivity[] = [
  {
    id: 'a1',
    workspace_id: '1',
    user_id: 'user-1',
    action: 'document_added',
    resource_type: 'document',
    resource_name: 'Q4 Marketing Plan.pdf',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    user: { name: 'John Doe', email: 'john@example.com' }
  },
  {
    id: 'a2',
    workspace_id: '1',
    user_id: 'user-2',
    action: 'member_joined',
    resource_type: 'member',
    resource_name: 'Sarah Johnson',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user: { name: 'Jane Smith', email: 'jane@example.com' }
  },
  {
    id: 'a3',
    workspace_id: '1',
    user_id: 'user-3',
    action: 'document_updated',
    resource_type: 'document',
    resource_name: 'Brand Guidelines.docx',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    user: { name: 'Bob Wilson', email: 'bob@example.com' }
  }
];

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In production, fetch from Supabase
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 500));
      setWorkspaces(mockWorkspaces);
    } catch (err) {
      setError('Failed to load workspaces');
      toast({
        title: 'Error',
        description: 'Failed to load workspaces',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createWorkspace = useCallback(async (
    data: Partial<Workspace>
  ): Promise<Workspace | null> => {
    try {
      const newWorkspace: Workspace = {
        id: `ws-${Date.now()}`,
        name: data.name || 'New Workspace',
        description: data.description,
        icon: data.icon || 'Folder',
        color: data.color || '#3B82F6',
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: data.visibility || 'private',
        settings: data.settings || {
          allow_external_sharing: false,
          require_approval_for_join: true,
          default_member_role: 'editor',
          allow_member_invite: true,
          auto_version_enabled: true,
          notification_preferences: {
            new_document: true,
            document_updated: true,
            member_joined: true,
            member_left: true,
            comment_added: true,
            mention: true
          }
        },
        members_count: 1,
        documents_count: 0,
        storage_used: 0,
        my_role: 'owner'
      };

      setWorkspaces(prev => [newWorkspace, ...prev]);
      toast({
        title: 'Workspace created',
        description: `"${newWorkspace.name}" has been created successfully`
      });
      return newWorkspace;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create workspace',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const updateWorkspace = useCallback(async (
    id: string,
    data: Partial<Workspace>
  ): Promise<boolean> => {
    try {
      setWorkspaces(prev =>
        prev.map(ws =>
          ws.id === id
            ? { ...ws, ...data, updated_at: new Date().toISOString() }
            : ws
        )
      );
      toast({
        title: 'Workspace updated',
        description: 'Changes saved successfully'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update workspace',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const deleteWorkspace = useCallback(async (id: string): Promise<boolean> => {
    try {
      setWorkspaces(prev => prev.filter(ws => ws.id !== id));
      toast({
        title: 'Workspace deleted',
        description: 'The workspace has been permanently deleted'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete workspace',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const archiveWorkspace = useCallback(async (id: string): Promise<boolean> => {
    try {
      setWorkspaces(prev =>
        prev.map(ws =>
          ws.id === id
            ? { ...ws, is_archived: true, updated_at: new Date().toISOString() }
            : ws
        )
      );
      toast({
        title: 'Workspace archived',
        description: 'The workspace has been archived'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to archive workspace',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    archiveWorkspace
  };
}

export function useWorkspaceMembers(workspaceId: string) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setMembers(mockMembers.filter(m => m.workspace_id === workspaceId));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const inviteMember = useCallback(async (
    email: string,
    role: WorkspaceRole,
    message?: string
  ): Promise<boolean> => {
    try {
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${email}`
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send invitation',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const updateMemberRole = useCallback(async (
    memberId: string,
    newRole: WorkspaceRole
  ): Promise<boolean> => {
    try {
      setMembers(prev =>
        prev.map(m =>
          m.id === memberId ? { ...m, role: newRole } : m
        )
      );
      toast({
        title: 'Role updated',
        description: 'Member role has been updated'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the workspace'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    if (workspaceId) {
      fetchMembers();
    }
  }, [workspaceId, fetchMembers]);

  return {
    members,
    loading,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember
  };
}

export function useWorkspaceActivity(workspaceId: string) {
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setActivities(mockActivities.filter(a => a.workspace_id === workspaceId));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchActivities();
    }
  }, [workspaceId, fetchActivities]);

  return { activities, loading, fetchActivities };
}
