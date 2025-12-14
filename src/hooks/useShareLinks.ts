import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { 
  EnhancedShareLink, 
  CreateShareLinkParams, 
  ShareLinkAnalytics,
  ShareLinkAccess 
} from '@/types/shareLink';

// Mock data for demonstration
const mockLinks: EnhancedShareLink[] = [
  {
    id: '1',
    resource_type: 'document',
    resource_id: 'doc-1',
    resource_name: 'Q4 Report.pdf',
    token: 'abc123xyz',
    short_code: 'q4rep',
    permission: 'view',
    allow_download: false,
    allow_print: false,
    allow_copy: false,
    password_protected: false,
    require_email: true,
    require_name: false,
    max_uses: 100,
    use_count: 45,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notify_on_access: true,
    track_views: true,
    watermark_enabled: false,
    name: 'External Stakeholders',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    last_accessed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    analytics: {
      total_views: 45,
      unique_visitors: 28,
      download_count: 0,
      avg_view_duration_seconds: 180,
      views_by_date: [
        { date: '2024-01-08', views: 12 },
        { date: '2024-01-09', views: 18 },
        { date: '2024-01-10', views: 15 }
      ],
      views_by_country: [
        { country: 'United States', views: 25 },
        { country: 'United Kingdom', views: 12 },
        { country: 'Germany', views: 8 }
      ],
      views_by_device: [
        { device: 'Desktop', views: 32 },
        { device: 'Mobile', views: 10 },
        { device: 'Tablet', views: 3 }
      ],
      recent_accesses: []
    }
  },
  {
    id: '2',
    resource_type: 'document',
    resource_id: 'doc-2',
    resource_name: 'Brand Guidelines.docx',
    token: 'def456uvw',
    permission: 'download',
    allow_download: true,
    allow_print: true,
    allow_copy: true,
    password_protected: true,
    require_email: false,
    require_name: false,
    use_count: 12,
    notify_on_access: false,
    track_views: true,
    watermark_enabled: true,
    watermark_text: 'CONFIDENTIAL',
    name: 'Partner Access',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true
  }
];

export function useShareLinks(resourceId?: string, resourceType?: string) {
  const [links, setLinks] = useState<EnhancedShareLink[]>(
    resourceId ? mockLinks.filter(l => l.resource_id === resourceId) : mockLinks
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createLink = useCallback(async (params: CreateShareLinkParams): Promise<EnhancedShareLink | null> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newLink: EnhancedShareLink = {
        id: `link-${Date.now()}`,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        resource_name: params.resource_name,
        token: Math.random().toString(36).substring(2, 12),
        short_code: Math.random().toString(36).substring(2, 7),
        permission: params.permission,
        allow_download: params.allow_download ?? params.permission === 'download',
        allow_print: params.allow_print ?? false,
        allow_copy: params.allow_copy ?? false,
        password_protected: !!params.password,
        require_email: params.require_email ?? false,
        require_name: params.require_name ?? false,
        allowed_emails: params.allowed_emails,
        allowed_domains: params.allowed_domains,
        max_uses: params.max_uses,
        use_count: 0,
        expires_at: params.expires_in_hours 
          ? new Date(Date.now() + params.expires_in_hours * 60 * 60 * 1000).toISOString()
          : undefined,
        notify_on_access: params.notify_on_access ?? false,
        track_views: true,
        watermark_enabled: params.watermark_enabled ?? false,
        watermark_text: params.watermark_text,
        name: params.name,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };

      setLinks(prev => [newLink, ...prev]);
      toast({
        title: 'Link created',
        description: 'Share link has been created successfully'
      });
      return newLink;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateLink = useCallback(async (
    linkId: string, 
    updates: Partial<EnhancedShareLink>
  ): Promise<boolean> => {
    try {
      setLinks(prev => prev.map(link => 
        link.id === linkId 
          ? { ...link, ...updates, updated_at: new Date().toISOString() }
          : link
      ));
      toast({
        title: 'Link updated',
        description: 'Share link settings have been updated'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const revokeLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      setLinks(prev => prev.map(link => 
        link.id === linkId 
          ? { ...link, is_active: false, updated_at: new Date().toISOString() }
          : link
      ));
      toast({
        title: 'Link revoked',
        description: 'Share link has been disabled'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to revoke share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const deleteLink = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      setLinks(prev => prev.filter(link => link.id !== linkId));
      toast({
        title: 'Link deleted',
        description: 'Share link has been permanently deleted'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const duplicateLink = useCallback(async (linkId: string): Promise<EnhancedShareLink | null> => {
    const original = links.find(l => l.id === linkId);
    if (!original) return null;

    const duplicate: EnhancedShareLink = {
      ...original,
      id: `link-${Date.now()}`,
      token: Math.random().toString(36).substring(2, 12),
      short_code: Math.random().toString(36).substring(2, 7),
      name: original.name ? `${original.name} (copy)` : 'Copy',
      use_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed_at: undefined,
      analytics: undefined
    };

    setLinks(prev => [duplicate, ...prev]);
    toast({
      title: 'Link duplicated',
      description: 'A copy of the share link has been created'
    });
    return duplicate;
  }, [links, toast]);

  return {
    links,
    loading,
    createLink,
    updateLink,
    revokeLink,
    deleteLink,
    duplicateLink
  };
}
