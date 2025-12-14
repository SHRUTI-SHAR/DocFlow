import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScheduledReport {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  report_type: 'activity' | 'storage' | 'documents' | 'compliance' | 'custom';
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_day: number | null;
  schedule_time: string;
  recipients: string[];
  filters: Record<string, unknown>;
  format: 'pdf' | 'excel' | 'csv';
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportRun {
  id: string;
  report_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  file_url: string | null;
  file_size: number | null;
  record_count: number | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useScheduledReports() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports((data || []).map(r => ({
        ...r,
        recipients: Array.isArray(r.recipients) ? r.recipients : [],
        filters: typeof r.filters === 'object' ? r.filters : {}
      })) as ScheduledReport[]);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportRuns = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_report_runs')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRuns((data || []).map(r => ({
        ...r,
        metadata: typeof r.metadata === 'object' ? r.metadata : {}
      })) as ReportRun[]);
    } catch (error) {
      console.error('Error fetching report runs:', error);
    }
  };

  const createReport = async (report: Omit<ScheduledReport, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_run_at' | 'run_count'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const nextRun = calculateNextRun(report.schedule_type, report.schedule_day, report.schedule_time);

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert([{
          user_id: user.id,
          name: report.name,
          description: report.description,
          report_type: report.report_type,
          schedule_type: report.schedule_type,
          schedule_day: report.schedule_day,
          schedule_time: report.schedule_time,
          recipients: report.recipients,
          filters: report.filters,
          format: report.format,
          is_active: report.is_active,
          next_run_at: nextRun
        }] as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Report scheduled",
        description: `${report.name} has been scheduled successfully.`
      });

      await fetchReports();
      return data;
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      toast({
        title: "Error",
        description: "Failed to create scheduled report.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateReport = async (id: string, updates: Partial<ScheduledReport>) => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      
      if (updates.schedule_type || updates.schedule_day !== undefined || updates.schedule_time) {
        const report = reports.find(r => r.id === id);
        if (report) {
          updateData.next_run_at = calculateNextRun(
            updates.schedule_type || report.schedule_type,
            updates.schedule_day ?? report.schedule_day,
            updates.schedule_time || report.schedule_time
          );
        }
      }

      const { error } = await supabase
        .from('scheduled_reports')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Report updated",
        description: "Scheduled report has been updated."
      });

      await fetchReports();
    } catch (error) {
      console.error('Error updating scheduled report:', error);
      toast({
        title: "Error",
        description: "Failed to update scheduled report.",
        variant: "destructive"
      });
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Report deleted",
        description: "Scheduled report has been deleted."
      });

      await fetchReports();
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      toast({
        title: "Error",
        description: "Failed to delete scheduled report.",
        variant: "destructive"
      });
    }
  };

  const runReportNow = async (reportId: string) => {
    try {
      const { data, error } = await supabase
        .from('scheduled_report_runs')
        .insert({
          report_id: reportId,
          status: 'running',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate report generation
      setTimeout(async () => {
        await supabase
          .from('scheduled_report_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            record_count: Math.floor(Math.random() * 100) + 10,
            file_size: Math.floor(Math.random() * 1000000) + 50000
          })
          .eq('id', data.id);

        await supabase
          .from('scheduled_reports')
          .update({
            last_run_at: new Date().toISOString(),
            run_count: reports.find(r => r.id === reportId)?.run_count ?? 0 + 1
          })
          .eq('id', reportId);

        await fetchReports();
        await fetchReportRuns(reportId);
      }, 2000);

      toast({
        title: "Report running",
        description: "Generating report now..."
      });

      return data;
    } catch (error) {
      console.error('Error running report:', error);
      toast({
        title: "Error",
        description: "Failed to run report.",
        variant: "destructive"
      });
    }
  };

  const calculateNextRun = (scheduleType: string, scheduleDay: number | null, scheduleTime: string): string => {
    const now = new Date();
    const [hours, minutes] = scheduleTime.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (scheduleType) {
      case 'daily':
        break;
      case 'weekly':
        const dayOfWeek = scheduleDay ?? 1;
        const daysUntilNext = (dayOfWeek - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntilNext);
        break;
      case 'monthly':
        const dayOfMonth = scheduleDay ?? 1;
        next.setDate(dayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
      case 'quarterly':
        const quarterDay = scheduleDay ?? 1;
        next.setDate(quarterDay);
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        next.setMonth(nextQuarterMonth);
        break;
    }

    return next.toISOString();
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    runs,
    loading,
    createReport,
    updateReport,
    deleteReport,
    runReportNow,
    fetchReportRuns,
    refetch: fetchReports
  };
}