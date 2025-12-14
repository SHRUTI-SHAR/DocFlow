import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DynamicFormRenderer } from '@/components/DynamicFormRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FormSubmission {
  id: string;
  form_name: string;
  form_data: any;
  status: string;
  completion_percentage: number;
  template_id: string;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  fields: any[];
}

export const EditForm = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && submissionId) {
      fetchSubmission();
    }
  }, [user, submissionId]);

  const fetchSubmission = async () => {
    try {
      // Get form submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', user?.id)
        .single();

      if (submissionError) {
        console.error('Error fetching submission:', submissionError);
        toast({
          title: "Form not found",
          description: "The form you're trying to edit doesn't exist or you don't have permission.",
          variant: "destructive",
        });
        navigate('/forms');
        return;
      }

      setSubmission(submissionData);

      // If there's a template_id, fetch the template to get field definitions
      if (submissionData.template_id) {
        const { data: templateData } = await supabase
          .from('public_forms')
          .select('form_config')
          .eq('id', submissionData.template_id)
          .single();

        if (templateData) {
          setTemplate({
            id: submissionData.template_id,
            fields: (templateData.form_config as any)?.fields || []
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "There was an error loading the form.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!submission) return;

    try {
      const completionPercentage = Math.round(
        (Object.values(formData).filter(v => v !== null && v !== undefined && v !== '').length / 
         Object.keys(formData).length) * 100
      );

      const { error } = await supabase
        .from('form_submissions')
        .update({
          form_data: formData,
          completion_percentage: completionPercentage,
          status: completionPercentage === 100 ? 'completed' : 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Form updated successfully!",
        description: "Your changes have been saved.",
      });

      navigate('/forms');
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: "Update failed",
        description: "There was an error updating your form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    navigate('/forms');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Form Not Found</CardTitle>
            <CardDescription>
              The form you're trying to edit doesn't exist or you don't have permission to access it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/forms')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Edit Form</h1>
              <p className="text-muted-foreground mt-1">
                {submission.form_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Form Data</CardTitle>
            <CardDescription>
              Make changes to your form submission below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DynamicFormRenderer
              fields={template?.fields || []}
              initialData={submission.form_data}
              formTitle={submission.form_name}
              formDescription="Make changes to your form submission below."
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};