import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { TemplateField } from '@/types/template';

export interface FormSubmission {
  id: string;
  user_id: string;
  template_id?: string | null;
  form_data: Record<string, any>;
  status: 'draft' | 'submitted' | 'processing' | 'completed';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  form_name: string;
  completion_percentage: number;
}

export interface PublicForm {
  id: string;
  user_id: string;   
  template_id?: string | null;
  form_config: {
    fields: TemplateField[];
    theme?: any;
    settings?: any;
  };
  is_active: boolean;
  requires_auth: boolean;
  allow_multiple_submissions: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
  form_title: string;
  form_description?: string | null;
  public_url_slug?: string | null;
  success_message: string;
}

export const useFormSubmissions = () => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [publicForms, setPublicForms] = useState<PublicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSubmissions = async () => {
    if (!user?.id) {
      setSubmissions([]);
      return;
    }

    try {
      // Fetch from both form_submissions and public_form_submissions tables
      const [formSubmissionsResult, publicFormSubmissionsResult] = await Promise.all([
        // Regular form submissions - filter by user_id
        supabase
          .from('form_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        
        // Public form submissions
        supabase
          .from('public_form_submissions')
          .select(`
            id,
            form_data,
            submitted_at,
            public_forms!inner(
              id,
              form_title,
              user_id
            )
          `)
          .eq('public_forms.user_id', user?.id)
          .order('submitted_at', { ascending: false })
      ]);

      if (formSubmissionsResult.error) throw formSubmissionsResult.error;
      if (publicFormSubmissionsResult.error) throw publicFormSubmissionsResult.error;

      // Combine both types of submissions
      const regularSubmissions: FormSubmission[] = (formSubmissionsResult.data || []).map(item => ({
        ...item,
        form_data: item.form_data as Record<string, any>,
        status: item.status as FormSubmission['status'],
        completion_percentage: item.completion_percentage || 0,
      }));

      const publicSubmissions: FormSubmission[] = (publicFormSubmissionsResult.data || []).map(item => ({
        id: item.id,
        form_name: item.public_forms.form_title,
        form_data: item.form_data as Record<string, any>,
        status: 'submitted' as FormSubmission['status'],
        completion_percentage: 100, // Public forms are always 100% when submitted
        submitted_at: item.submitted_at,
        created_at: item.submitted_at,
        updated_at: item.submitted_at,
        user_id: item.public_forms.user_id,
        template_id: item.public_forms.id,
      }));

      // Combine and sort by date
      const allSubmissions = [...regularSubmissions, ...publicSubmissions]
        .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
      
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load form submissions",
        variant: "destructive",
      });
    }
  };

  const fetchPublicForms = async () => {
    if (!user?.id) {
      setPublicForms([]);
      return;
    }

    try {
      const { data: formsData, error: formsError } = await supabase
        .from('public_forms')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (formsError) throw formsError;

      // Get actual submission counts for each form
      const formIds = (formsData || []).map(f => f.id);
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('public_form_submissions')
        .select('public_form_id')
        .in('public_form_id', formIds);

      if (submissionsError) {
        console.error('Error fetching submission counts:', submissionsError);
      }

      // Count submissions per form
      const submissionCounts = new Map<string, number>();
      (submissionsData || []).forEach((sub: any) => {
        const count = submissionCounts.get(sub.public_form_id) || 0;
        submissionCounts.set(sub.public_form_id, count + 1);
      });
      
      const typedPublicForms: PublicForm[] = (formsData || []).map(item => ({
        ...item,
        form_config: item.form_config as unknown as PublicForm['form_config'],
        // Use actual count from database instead of stored submission_count
        submission_count: submissionCounts.get(item.id) || 0,
      }));
      
      setPublicForms(typedPublicForms);
    } catch (error) {
      console.error('Error fetching public forms:', error);
      toast({
        title: "Error",
        description: "Failed to load public forms",
        variant: "destructive",
      });
    }
  };

  const deletePublicForm = async (id: string) => {
    try {
      const { error } = await supabase
        .from('public_forms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPublicForms(prev => prev.filter(f => f.id !== id));

      toast({
        title: 'Success',
        description: 'Form deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting public form:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const createSubmission = async (formData: {
    template_id?: string;
    form_name: string;
    form_data: Record<string, any>;
    status?: 'draft' | 'submitted';
  }) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .insert([{
          user_id: user.id,
          template_id: formData.template_id || null,
          form_name: formData.form_name,
          form_data: formData.form_data,
          status: formData.status || 'draft',
          completion_percentage: calculateCompletionPercentage(formData.form_data),
          ...(formData.status === 'submitted' && { submitted_at: new Date().toISOString() })
        }])
        .select()
        .single();

      if (error) throw error;
      
      const typedSubmission: FormSubmission = {
        ...data,
        form_data: data.form_data as Record<string, any>,
        status: data.status as FormSubmission['status'],
        completion_percentage: data.completion_percentage || 0,
      };
      
      setSubmissions(prev => [typedSubmission, ...prev]);
      
      toast({
        title: "Success",
        description: `Form ${formData.status === 'submitted' ? 'submitted' : 'saved'} successfully`,
      });
      
      return typedSubmission;
    } catch (error) {
      console.error('Error creating submission:', error);
      toast({
        title: "Error",
        description: "Failed to save form submission",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSubmission = async (id: string, updates: Partial<FormSubmission>) => {
    try {
      const updateData = {
        ...updates,
        completion_percentage: updates.form_data ? 
          calculateCompletionPercentage(updates.form_data) : undefined,
        ...(updates.status === 'submitted' && !updates.submitted_at && { 
          submitted_at: new Date().toISOString() 
        })
      };

      const { data, error } = await supabase
        .from('form_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const typedSubmission: FormSubmission = {
        ...data,
        form_data: data.form_data as Record<string, any>,  
        status: data.status as FormSubmission['status'],
        completion_percentage: data.completion_percentage || 0,
      };
      
      setSubmissions(prev => prev.map(sub => sub.id === id ? typedSubmission : sub));
      
      toast({
        title: "Success",
        description: "Form updated successfully",
      });
      
      return typedSubmission;
    } catch (error) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",   
        description: "Failed to update form submission",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSubmission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('form_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      
      toast({
        title: "Success",
        description: "Form submission deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: "Failed to delete form submission",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPublicForm = async (formData: {
    template_id?: string;
    form_title: string;
    form_description?: string;
    form_config: any;
    requires_auth?: boolean;
    allow_multiple_submissions?: boolean;
    public_url_slug?: string;
    success_message?: string;
  }) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('public_forms')
        .insert([{
          user_id: user.id,
          template_id: formData.template_id || null,
          form_title: formData.form_title,
          form_description: formData.form_description || null,
          form_config: formData.form_config,
          requires_auth: formData.requires_auth || false,
          allow_multiple_submissions: formData.allow_multiple_submissions !== false,
          public_url_slug: formData.public_url_slug || null,
          success_message: formData.success_message || 'Thank you for your submission!'
        }])
        .select()
        .single();

      if (error) throw error;
      
      const typedPublicForm: PublicForm = {
        ...data,
        form_config: data.form_config as unknown as PublicForm['form_config'],
      };
      
      setPublicForms(prev => [typedPublicForm, ...prev]);
      
      toast({
        title: "Success",
        description: "Public form created successfully",
      });
      
      return typedPublicForm;
    } catch (error) {
      console.error('Error creating public form:', error);
      toast({
        title: "Error",
        description: "Failed to create public form",
        variant: "destructive",
      });
      throw error;
    }
  };

  const calculateCompletionPercentage = (formData: Record<string, any>): number => {
    const values = Object.values(formData);
    if (values.length === 0) return 0;
    
    const filledFields = values.filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;
    
    return Math.round((filledFields / values.length) * 100);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      await Promise.all([
        fetchSubmissions(),
        fetchPublicForms()
      ]);
      setLoading(false);
    };

    loadData();
  }, [user?.id]);

  return {
    submissions,
    publicForms,
    loading,
    createSubmission,
    updateSubmission,
    deleteSubmission,
    deletePublicForm,
    createPublicForm,
    fetchSubmissions,
    fetchPublicForms,
  };
};