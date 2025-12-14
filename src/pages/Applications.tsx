import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Play, Edit3, Trash2, FolderOpen, Grid, List, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Application {
  id: string;
  name: string;
  display_name: string;
  description: string;
  user_id: string;
  forms: any;
  app_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slug?: string;
}

interface PublicForm {
  id: string;
  form_title: string;
  form_description: string;
  form_config: any;
  created_at: string;
}

export default function Applications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchApplications = useCallback(async () => {
    if (!user?.id) {
      console.error('User not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('id, name, display_name, description, user_id, forms, app_config, is_active, created_at, updated_at, slug')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching applications:', error);
        throw error;
      }
      
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      const errorMessage = error?.message || 'Failed to fetch applications';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const fetchForms = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('public_forms')
        .select('id, form_title, form_description, form_config, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching forms:', error);
        throw error;
      }
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchApplications();
      fetchForms();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchApplications, fetchForms]);

  const handleEdit = (app: Application) => {
    navigate(`/applications/${app.id}/edit`);
  };

  const handleRun = async (app: Application) => {
    // Navigate to multi-form runner page using slug if available, fallback to ID
    const identifier = app.slug || app.id;
    navigate(`/applications/${identifier}/run`);
  };

  const handleDelete = async (appId: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', appId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application deleted successfully',
      });
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    }
  };

  const handleCopyUrl = async (app: Application) => {
    try {
      const baseUrl = window.location.origin;
      const identifier = app.slug || app.id;
      const url = `${baseUrl}/applications/public/${identifier}`;
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Copied!',
        description: 'Application URL copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy URL',
        variant: 'destructive',
      });
    }
  };

  const getFormTitle = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    return form?.form_title || 'Unknown Form';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {applications.map((app) => (
        <Card key={app.id} className="group hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{app.display_name || app.name}</CardTitle>
                {app.description && (
                  <CardDescription className="mt-1">
                    {app.description}
                  </CardDescription>
                )}
              </div>
              <Badge variant={app.is_active ? "default" : "secondary"}>
                {app.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Forms ({Array.isArray(app.forms) ? app.forms.length : 0})
                </p>
                <div className="space-y-1">
                  {Array.isArray(app.forms) && app.forms.slice(0, 3).map((formId: string) => (
                    <div key={formId} className="text-sm bg-muted px-2 py-1 rounded">
                      {getFormTitle(formId)}
                    </div>
                  ))}
                  {Array.isArray(app.forms) && app.forms.length > 3 && (
                    <div className="text-sm text-muted-foreground">
                      +{app.forms.length - 3} more forms
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyUrl(app)}
                    title="Copy Application URL"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(app)}
                    title="Edit Application"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRun(app)}
                    title="Run Application"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(app.id)}
                  className="text-destructive hover:text-destructive"
                  title="Delete Application"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {applications.map((app) => (
        <Card key={app.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{app.display_name || app.name}</h3>
                    {app.description && (
                      <p className="text-muted-foreground mt-1">{app.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge variant={app.is_active ? "default" : "secondary"}>
                        {app.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {Array.isArray(app.forms) ? app.forms.length : 0} forms
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Created {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyUrl(app)}
                  title="Copy Application URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(app)}
                  title="Edit Application"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRun(app)}
                  title="Run Application"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(app.id)}
                  className="text-destructive hover:text-destructive"
                  title="Delete Application"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Applications</h1>
            <p className="text-muted-foreground">Create multi-form applications and download as executable code</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="px-3"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate('/applications/create')}>
              <Plus className="mr-2 h-4 w-4" />
              New Application
            </Button>
          </div>
        </div>

        {applications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first application by combining multiple forms
              </p>
              <Button onClick={() => navigate('/applications/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          viewMode === 'card' ? renderCardView() : renderListView()
        )}
      </div>
    </div>
  );
}