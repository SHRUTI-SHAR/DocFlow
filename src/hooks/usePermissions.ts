import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  PermissionLevel,
  ResourceType,
  PermissionAction,
  ResourcePermission,
  PermissionGroup,
  GroupMember,
  ShareLink,
  PermissionRequest,
  EffectivePermission,
  PermissionAuditEntry,
  BulkPermissionOperation,
  PERMISSION_MATRIX,
  PERMISSION_HIERARCHY,
  canPerformAction,
  getHighestPermission
} from '@/types/permissions';

interface UsePermissionsOptions {
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
}

interface UsePermissionsReturn {
  // State
  permissions: ResourcePermission[];
  groups: PermissionGroup[];
  shareLinks: ShareLink[];
  requests: PermissionRequest[];
  effectivePermission: EffectivePermission | null;
  auditLog: PermissionAuditEntry[];
  isLoading: boolean;
  error: string | null;
  
  // Permission checks
  hasPermission: (level: PermissionLevel) => boolean;
  canPerform: (action: PermissionAction) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  
  // Permission management
  grantPermission: (params: GrantPermissionParams) => Promise<boolean>;
  revokePermission: (permissionId: string) => Promise<boolean>;
  updatePermission: (permissionId: string, level: PermissionLevel) => Promise<boolean>;
  bulkUpdatePermissions: (operation: BulkPermissionOperation) => Promise<boolean>;
  
  // Group management
  createGroup: (name: string, description?: string) => Promise<PermissionGroup | null>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  addGroupMember: (groupId: string, userId: string, role?: 'member' | 'manager') => Promise<boolean>;
  removeGroupMember: (groupId: string, userId: string) => Promise<boolean>;
  
  // Share links
  createShareLink: (params: CreateShareLinkParams) => Promise<ShareLink | null>;
  revokeShareLink: (linkId: string) => Promise<boolean>;
  updateShareLink: (linkId: string, params: Partial<ShareLink>) => Promise<boolean>;
  
  // Access requests
  requestAccess: (level: PermissionLevel, message?: string) => Promise<boolean>;
  approveRequest: (requestId: string, notes?: string) => Promise<boolean>;
  denyRequest: (requestId: string, notes?: string) => Promise<boolean>;
  
  // Ownership
  transferOwnership: (newOwnerId: string) => Promise<boolean>;
  
  // Refresh
  refresh: () => Promise<void>;
}

interface GrantPermissionParams {
  granteeType: 'user' | 'group';
  granteeId: string;
  level: PermissionLevel;
  expiresAt?: string;
  customActions?: PermissionAction[];
  deniedActions?: PermissionAction[];
  notes?: string;
}

interface CreateShareLinkParams {
  level: PermissionLevel;
  expiresAt?: string;
  passwordProtected?: boolean;
  password?: string;
  maxUses?: number;
  allowedEmails?: string[];
  requireEmail?: boolean;
}

export const usePermissions = ({
  resourceType,
  resourceId,
  userId
}: UsePermissionsOptions): UsePermissionsReturn => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<ResourcePermission[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [effectivePermission, setEffectivePermission] = useState<EffectivePermission | null>(null);
  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute effective permission from all sources
  const computeEffectivePermission = useCallback((
    directPerms: ResourcePermission[],
    userGroups: string[]
  ): EffectivePermission | null => {
    if (!userId) return null;

    const sources: EffectivePermission['sources'] = [];
    const levels: PermissionLevel[] = [];

    // Check direct permissions
    const directPerm = directPerms.find(
      p => p.grantee_type === 'user' && p.grantee_id === userId
    );
    if (directPerm) {
      sources.push({
        type: 'direct',
        permission_level: directPerm.permission_level
      });
      levels.push(directPerm.permission_level);
    }

    // Check group permissions
    for (const groupId of userGroups) {
      const groupPerm = directPerms.find(
        p => p.grantee_type === 'group' && p.grantee_id === groupId
      );
      if (groupPerm) {
        const group = groups.find(g => g.id === groupId);
        sources.push({
          type: 'group',
          source_id: groupId,
          source_name: group?.name,
          permission_level: groupPerm.permission_level
        });
        levels.push(groupPerm.permission_level);
      }
    }

    // Check public access
    const publicPerm = directPerms.find(p => p.grantee_type === 'public');
    if (publicPerm) {
      sources.push({
        type: 'public',
        permission_level: publicPerm.permission_level
      });
      levels.push(publicPerm.permission_level);
    }

    // Check inherited permissions
    const inheritedPerm = directPerms.find(p => p.is_inherited);
    if (inheritedPerm) {
      sources.push({
        type: 'inherited',
        source_id: inheritedPerm.inherited_from,
        permission_level: inheritedPerm.permission_level
      });
      levels.push(inheritedPerm.permission_level);
    }

    if (levels.length === 0) {
      return {
        resource_type: resourceType,
        resource_id: resourceId,
        user_id: userId,
        permission_level: 'none',
        allowed_actions: [],
        denied_actions: [],
        sources: [],
        is_owner: false,
        has_admin_access: false
      };
    }

    const highestLevel = getHighestPermission(levels);
    const allowedActions = PERMISSION_MATRIX[highestLevel] || [];
    
    // Collect custom and denied actions from all sources
    const customActions = new Set<PermissionAction>();
    const deniedActions = new Set<PermissionAction>();
    
    directPerms.forEach(p => {
      p.custom_actions?.forEach(a => customActions.add(a));
      p.denied_actions?.forEach(a => deniedActions.add(a));
    });

    const finalAllowed = [...new Set([...allowedActions, ...customActions])];
    const finalDenied = [...deniedActions];

    return {
      resource_type: resourceType,
      resource_id: resourceId,
      user_id: userId,
      permission_level: highestLevel,
      allowed_actions: finalAllowed.filter(a => !finalDenied.includes(a)),
      denied_actions: finalDenied,
      sources,
      is_owner: highestLevel === 'owner',
      has_admin_access: PERMISSION_HIERARCHY.indexOf(highestLevel) >= PERMISSION_HIERARCHY.indexOf('admin')
    };
  }, [userId, resourceType, resourceId, groups]);

  // Fetch all permission data
  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch resource permissions
      // @ts-ignore - Table may not exist yet
      const { data: permsData } = await (supabase as any)
        .from('resource_permissions')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

      if (permsData) {
        setPermissions(permsData as unknown as ResourcePermission[]);
      }

      // Fetch groups
      // @ts-ignore - Table may not exist yet
      const { data: groupsData } = await (supabase as any)
        .from('permission_groups')
        .select('*');

      if (groupsData) {
        setGroups(groupsData as unknown as PermissionGroup[]);
      }

      // Fetch share links
      // @ts-ignore - Table may not exist yet
      const { data: linksData } = await (supabase as any)
        .from('share_links')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('is_active', true);

      if (linksData) {
        setShareLinks(linksData as unknown as ShareLink[]);
      }

      // Fetch pending requests
      // @ts-ignore - Table may not exist yet
      const { data: requestsData } = await (supabase as any)
        .from('permission_requests')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('status', 'pending');

      if (requestsData) {
        setRequests(requestsData as unknown as PermissionRequest[]);
      }

      // Fetch user's groups
      let userGroups: string[] = [];
      if (userId) {
        // @ts-ignore - Table may not exist yet
        const { data: memberData } = await (supabase as any)
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);

        if (memberData) {
          userGroups = memberData.map((m: any) => m.group_id);
        }
      }

      // Compute effective permission
      const effective = computeEffectivePermission(
        permsData as unknown as ResourcePermission[] || [],
        userGroups
      );
      setEffectivePermission(effective);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [resourceType, resourceId, userId, computeEffectivePermission]);

  // Permission checks
  const hasPermissionLevel = useCallback((level: PermissionLevel): boolean => {
    if (!effectivePermission) return false;
    const userRank = PERMISSION_HIERARCHY.indexOf(effectivePermission.permission_level);
    const requiredRank = PERMISSION_HIERARCHY.indexOf(level);
    return userRank >= requiredRank;
  }, [effectivePermission]);

  const canPerform = useCallback((action: PermissionAction): boolean => {
    if (!effectivePermission) return false;
    return canPerformAction(
      effectivePermission.permission_level,
      action,
      effectivePermission.allowed_actions,
      effectivePermission.denied_actions
    );
  }, [effectivePermission]);

  // Grant permission
  const grantPermission = useCallback(async (params: GrantPermissionParams): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const newPermission: Partial<ResourcePermission> = {
        resource_type: resourceType,
        resource_id: resourceId,
        grantee_type: params.granteeType,
        grantee_id: params.granteeId,
        permission_level: params.level,
        granted_by: userData.user.id,
        granted_at: new Date().toISOString(),
        expires_at: params.expiresAt,
        custom_actions: params.customActions,
        denied_actions: params.deniedActions,
        notes: params.notes
      };

      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('resource_permissions')
        .upsert(newPermission);

      if (error) throw error;

      toast({
        title: 'Permission granted',
        description: `${params.level} access granted successfully`
      });

      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [resourceType, resourceId, toast, fetchPermissions]);

  // Revoke permission
  const revokePermission = useCallback(async (permissionId: string): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('resource_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: 'Permission revoked',
        description: 'Access has been removed'
      });

      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Update permission
  const updatePermission = useCallback(async (
    permissionId: string,
    level: PermissionLevel
  ): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('resource_permissions')
        .update({ permission_level: level })
        .eq('id', permissionId);

      if (error) throw error;

      toast({
        title: 'Permission updated',
        description: `Access level changed to ${level}`
      });

      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Bulk update permissions
  const bulkUpdatePermissions = useCallback(async (
    operation: BulkPermissionOperation
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      for (const resourceId of operation.resource_ids) {
        for (const granteeId of operation.grantee_ids) {
          if (operation.operation === 'revoke') {
            // @ts-ignore - Table may not exist yet
            await (supabase as any)
              .from('resource_permissions')
              .delete()
              .eq('resource_type', operation.resource_type)
              .eq('resource_id', resourceId)
              .eq('grantee_id', granteeId);
          } else {
            // @ts-ignore - Table may not exist yet
            await (supabase as any)
              .from('resource_permissions')
              .upsert({
                resource_type: operation.resource_type,
                resource_id: resourceId,
                grantee_type: operation.grantee_type,
                grantee_id: granteeId,
                permission_level: operation.permission_level,
                granted_by: userData.user.id,
                granted_at: new Date().toISOString()
              });
          }
        }
      }

      toast({
        title: 'Bulk update complete',
        description: `Updated permissions for ${operation.resource_ids.length} resources`
      });

      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Create group
  const createGroup = useCallback(async (
    name: string,
    description?: string
  ): Promise<PermissionGroup | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // @ts-ignore - Table may not exist yet
      const { data, error } = await (supabase as any)
        .from('permission_groups')
        .insert({ name, description, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Group created', description: `${name} group created successfully` });
      await fetchPermissions();
      return data as unknown as PermissionGroup;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [toast, fetchPermissions]);

  // Delete group
  const deleteGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('permission_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      toast({ title: 'Group deleted', description: 'Group has been removed' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Add group member
  const addGroupMember = useCallback(async (
    groupId: string,
    memberId: string,
    role: 'member' | 'manager' = 'member'
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('group_members')
        .insert({ group_id: groupId, user_id: memberId, role, added_by: userData.user.id });

      if (error) throw error;
      toast({ title: 'Member added', description: 'User added to group' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Remove group member
  const removeGroupMember = useCallback(async (groupId: string, memberId: string): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', memberId);

      if (error) throw error;
      toast({ title: 'Member removed', description: 'User removed from group' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Create share link
  const createShareLink = useCallback(async (
    params: CreateShareLinkParams
  ): Promise<ShareLink | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const token = crypto.randomUUID();

      const linkData = {
        resource_type: resourceType,
        resource_id: resourceId,
        token,
        permission_level: params.level,
        created_by: userData.user.id,
        expires_at: params.expiresAt,
        password_protected: params.passwordProtected || false,
        max_uses: params.maxUses,
        allowed_emails: params.allowedEmails,
        require_email: params.requireEmail || false,
        is_active: true,
        use_count: 0
      };

      // @ts-ignore - Table may not exist yet
      const { data, error } = await (supabase as any)
        .from('share_links')
        .insert(linkData)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Link created', description: 'Share link generated successfully' });
      await fetchPermissions();
      return data as unknown as ShareLink;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  }, [resourceType, resourceId, toast, fetchPermissions]);

  // Revoke share link
  const revokeShareLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('share_links')
        .update({ is_active: false })
        .eq('id', linkId);

      if (error) throw error;
      toast({ title: 'Link revoked', description: 'Share link has been disabled' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Update share link
  const updateShareLink = useCallback(async (linkId: string, params: Partial<ShareLink>): Promise<boolean> => {
    try {
      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('share_links')
        .update(params)
        .eq('id', linkId);

      if (error) throw error;
      toast({ title: 'Link updated', description: 'Share link settings saved' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Request access
  const requestAccess = useCallback(async (level: PermissionLevel, message?: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('permission_requests')
        .insert({
          resource_type: resourceType,
          resource_id: resourceId,
          requester_id: userData.user.id,
          requested_level: level,
          message,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) throw error;
      toast({ title: 'Request sent', description: 'Access request submitted for review' });
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [resourceType, resourceId, toast]);

  // Approve request
  const approveRequest = useCallback(async (requestId: string, notes?: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // @ts-ignore - Table may not exist yet
      const { data: request } = await (supabase as any)
        .from('permission_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // @ts-ignore - Table may not exist yet
      await (supabase as any)
        .from('permission_requests')
        .update({ status: 'approved', reviewed_by: userData.user.id, reviewed_at: new Date().toISOString(), review_notes: notes })
        .eq('id', requestId);

      await grantPermission({ granteeType: 'user', granteeId: request.requester_id, level: request.requested_level });
      toast({ title: 'Request approved', description: 'Access has been granted' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast, grantPermission, fetchPermissions]);

  // Deny request
  const denyRequest = useCallback(async (requestId: string, notes?: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // @ts-ignore - Table may not exist yet
      const { error } = await (supabase as any)
        .from('permission_requests')
        .update({ status: 'denied', reviewed_by: userData.user.id, reviewed_at: new Date().toISOString(), review_notes: notes })
        .eq('id', requestId);

      if (error) throw error;
      toast({ title: 'Request denied', description: 'Access request has been declined' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [toast, fetchPermissions]);

  // Transfer ownership
  const transferOwnership = useCallback(async (newOwnerId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      // @ts-ignore - Table may not exist yet
      await (supabase as any)
        .from('resource_permissions')
        .delete()
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('permission_level', 'owner');

      await grantPermission({ granteeType: 'user', granteeId: newOwnerId, level: 'owner' });
      await grantPermission({ granteeType: 'user', granteeId: userData.user.id, level: 'admin' });

      toast({ title: 'Ownership transferred', description: 'You are now an admin of this resource' });
      await fetchPermissions();
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return false;
    }
  }, [resourceType, resourceId, toast, grantPermission, fetchPermissions]);

  // Initial fetch
  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    // State
    permissions,
    groups,
    shareLinks,
    requests,
    effectivePermission,
    auditLog,
    isLoading,
    error,
    
    // Permission checks
    hasPermission: hasPermissionLevel,
    canPerform,
    isOwner: effectivePermission?.is_owner || false,
    isAdmin: effectivePermission?.has_admin_access || false,
    
    // Permission management
    grantPermission,
    revokePermission,
    updatePermission,
    bulkUpdatePermissions,
    
    // Group management
    createGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    
    // Share links
    createShareLink,
    revokeShareLink,
    updateShareLink,
    
    // Access requests
    requestAccess,
    approveRequest,
    denyRequest,
    
    // Ownership
    transferOwnership,
    
    // Refresh
    refresh: fetchPermissions
  };
};
