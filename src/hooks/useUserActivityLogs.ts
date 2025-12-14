import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityStats {
  totalActivities: number;
  byType: Record<string, number>;
  byAction: Record<string, number>;
  byDay: { date: string; count: number }[];
  recentActivity: ActivityLog[];
  mostActiveHours: { hour: number; count: number }[];
}

export function useUserActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (options?: {
    limit?: number;
    entityType?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(100);
      }

      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType);
      }

      if (options?.action) {
        query = query.eq('action', options.action);
      }

      if (options?.fromDate) {
        query = query.gte('created_at', options.fromDate.toISOString());
      }

      if (options?.toDate) {
        query = query.lte('created_at', options.toDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data || []).map(log => ({
        ...log,
        metadata: typeof log.metadata === 'object' ? log.metadata : {}
      })) as ActivityLog[]);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const activities = (data || []) as ActivityLog[];
      
      // Calculate stats
      const byType: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      const byDayMap: Record<string, number> = {};
      const byHour: Record<number, number> = {};

      activities.forEach(activity => {
        // By type
        const type = activity.entity_type || 'other';
        byType[type] = (byType[type] || 0) + 1;

        // By action
        byAction[activity.action] = (byAction[activity.action] || 0) + 1;

        // By day
        const day = activity.created_at.split('T')[0];
        byDayMap[day] = (byDayMap[day] || 0) + 1;

        // By hour
        const hour = new Date(activity.created_at).getHours();
        byHour[hour] = (byHour[hour] || 0) + 1;
      });

      const byDay = Object.entries(byDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const mostActiveHours = Object.entries(byHour)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalActivities: activities.length,
        byType,
        byAction,
        byDay,
        recentActivity: activities.slice(0, 10),
        mostActiveHours
      });
    } catch (error) {
      console.error('Error calculating activity stats:', error);
    }
  }, []);

  const logActivity = async (
    activityType: string,
    action: string,
    options?: {
      entityType?: string;
      entityId?: string;
      entityName?: string;
      metadata?: Record<string, unknown>;
    }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_activity_logs')
        .insert([{
          user_id: user.id,
          activity_type: activityType,
          action,
          entity_type: options?.entityType,
          entity_id: options?.entityId,
          entity_name: options?.entityName,
          metadata: options?.metadata || {},
          user_agent: navigator.userAgent,
          session_id: sessionStorage.getItem('session_id') || crypto.randomUUID()
        }] as any);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    calculateStats();
  }, [calculateStats]);

  return {
    logs,
    stats,
    loading,
    fetchLogs,
    logActivity,
    calculateStats,
    refetch: () => {
      fetchLogs();
      calculateStats();
    }
  };
}