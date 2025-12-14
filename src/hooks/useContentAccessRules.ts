import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContentAccessRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_types?: string[];
  name_patterns?: string[];
  content_keywords?: string[];
  metadata_conditions?: Record<string, any>;
  folder_ids?: string[];
  tag_ids?: string[];
  size_min_bytes?: number;
  size_max_bytes?: number;
  auto_apply_permission?: 'owner' | 'editor' | 'commenter' | 'viewer' | 'none';
  auto_share_with?: string[];
  auto_share_permission?: 'view' | 'comment' | 'download' | 'edit';
  auto_apply_tags?: string[];
  auto_move_to_folder?: string;
  require_approval?: boolean;
  approval_users?: string[];
  restrict_download?: boolean;
  restrict_print?: boolean;
  restrict_share?: boolean;
  restrict_external_share?: boolean;
  watermark_required?: boolean;
  notify_on_match?: boolean;
  notify_users?: string[];
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface RuleApplication {
  id: string;
  rule_id: string;
  document_id: string;
  matched_criteria: Record<string, any>;
  actions_applied: Record<string, any>;
  applied_by?: string;
  created_at: string;
}

export interface CreateRuleParams {
  name: string;
  description?: string;
  file_types?: string[];
  name_patterns?: string[];
  content_keywords?: string[];
  folder_ids?: string[];
  size_min_bytes?: number;
  size_max_bytes?: number;
  auto_apply_permission?: ContentAccessRule['auto_apply_permission'];
  auto_apply_tags?: string[];
  auto_move_to_folder?: string;
  restrict_download?: boolean;
  restrict_print?: boolean;
  restrict_share?: boolean;
  restrict_external_share?: boolean;
  watermark_required?: boolean;
  notify_on_match?: boolean;
  is_active?: boolean;
  priority?: number;
}

export function useContentAccessRules() {
  const [rules, setRules] = useState<ContentAccessRule[]>([]);
  const [applications, setApplications] = useState<RuleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('content_access_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true }) as any);

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching content access rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApplications = useCallback(async (ruleId?: string) => {
    try {
      let query = supabase
        .from('content_rule_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (ruleId) {
        query = query.eq('rule_id', ruleId) as any;
      }

      const { data, error } = await (query as any);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching rule applications:', error);
    }
  }, []);

  const createRule = useCallback(async (params: CreateRuleParams): Promise<ContentAccessRule | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('content_access_rules')
        .insert({
          user_id: user.id,
          ...params,
          is_active: params.is_active ?? true,
          priority: params.priority ?? 100,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;

      toast({
        title: "Rule created",
        description: `Content access rule "${params.name}" created successfully.`,
      });

      await fetchRules();
      return data as ContentAccessRule;
    } catch (error: any) {
      toast({
        title: "Error creating rule",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [toast, fetchRules]);

  const updateRule = useCallback(async (ruleId: string, updates: Partial<ContentAccessRule>) => {
    try {
      const { error } = await (supabase
        .from('content_access_rules')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', ruleId) as any);

      if (error) throw error;

      toast({
        title: "Rule updated",
        description: "Content access rule has been updated.",
      });

      await fetchRules();
    } catch (error: any) {
      toast({
        title: "Error updating rule",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchRules]);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const { error } = await (supabase
        .from('content_access_rules')
        .delete()
        .eq('id', ruleId) as any);

      if (error) throw error;

      toast({
        title: "Rule deleted",
        description: "Content access rule has been removed.",
      });

      await fetchRules();
    } catch (error: any) {
      toast({
        title: "Error deleting rule",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchRules]);

  const toggleRule = useCallback(async (ruleId: string, isActive: boolean) => {
    await updateRule(ruleId, { is_active: isActive });
  }, [updateRule]);

  const reorderRules = useCallback(async (ruleIds: string[]) => {
    try {
      const updates = ruleIds.map((id, index) => ({
        id,
        priority: index + 1,
      }));

      for (const update of updates) {
        await (supabase
          .from('content_access_rules')
          .update({ priority: update.priority } as any)
          .eq('id', update.id) as any);
      }

      await fetchRules();
    } catch (error: any) {
      toast({
        title: "Error reordering rules",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchRules]);

  const evaluateDocument = useCallback(async (documentId: string, documentData: {
    name?: string;
    file_type?: string;
    file_size?: number;
    folder_id?: string;
    tags?: string[];
    content?: string;
  }): Promise<ContentAccessRule[]> => {
    const matchedRules: ContentAccessRule[] = [];

    for (const rule of rules) {
      if (!rule.is_active) continue;

      let matched = false;

      // Check file types
      if (rule.file_types?.length && documentData.file_type) {
        matched = rule.file_types.some(t => 
          documentData.file_type?.toLowerCase().includes(t.toLowerCase())
        );
      }

      // Check name patterns
      if (rule.name_patterns?.length && documentData.name) {
        matched = matched || rule.name_patterns.some(pattern => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(documentData.name || '');
        });
      }

      // Check content keywords
      if (rule.content_keywords?.length && documentData.content) {
        matched = matched || rule.content_keywords.some(keyword => 
          documentData.content?.toLowerCase().includes(keyword.toLowerCase())
        );
      }

      // Check folder
      if (rule.folder_ids?.length && documentData.folder_id) {
        matched = matched || rule.folder_ids.includes(documentData.folder_id);
      }

      // Check size range
      if (documentData.file_size !== undefined) {
        const sizeMatch = 
          (!rule.size_min_bytes || documentData.file_size >= rule.size_min_bytes) &&
          (!rule.size_max_bytes || documentData.file_size <= rule.size_max_bytes);
        
        if (rule.size_min_bytes || rule.size_max_bytes) {
          matched = matched || sizeMatch;
        }
      }

      if (matched) {
        matchedRules.push(rule);
      }
    }

    return matchedRules.sort((a, b) => a.priority - b.priority);
  }, [rules]);

  const getRuleStats = useCallback(() => {
    const active = rules.filter(r => r.is_active).length;
    const withRestrictions = rules.filter(r => 
      r.restrict_download || r.restrict_print || r.restrict_share
    ).length;
    const withAutoActions = rules.filter(r => 
      r.auto_move_to_folder || r.auto_apply_tags?.length
    ).length;

    return { total: rules.length, active, withRestrictions, withAutoActions };
  }, [rules]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return {
    rules,
    applications,
    loading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,
    fetchApplications,
    evaluateDocument,
    getRuleStats,
    refetch: fetchRules,
  };
}
