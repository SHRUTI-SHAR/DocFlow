import { supabase } from '@/integrations/supabase/client';
import { handleSupabaseError } from '@/utils/errorHandling';

/**
 * Simplified API service to avoid type conflicts
 */
export const api = {
  async getDocuments() {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) throw handleSupabaseError(error);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getTemplates() {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (error) throw handleSupabaseError(error);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async analyzeDocument(documentData: string, task: string) {
    try {
      const fastApiUrl = (import.meta as any).env.VITE_FASTAPI_URL;
      if (!fastApiUrl) throw new Error('VITE_FASTAPI_URL is required');
      const resp = await fetch(`${fastApiUrl}/api/v1/analyze-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentData, task })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
};