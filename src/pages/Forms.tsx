import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Users, 
  Calendar,
  BarChart3,
  Share2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFormSubmissions } from '@/hooks/useFormSubmissions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Forms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    submissions,
    publicForms,
    loading,
    deleteSubmission,
    deletePublicForm,
    fetchSubmissions,
    fetchPublicForms
  } = useFormSubmissions();

  useEffect(() => {
    if (user) {
      fetchSubmissions();
      fetchPublicForms();
    }
  }, [user]);

  const handleDeleteSubmission = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this form submission?')) {
      await deleteSubmission(id);
    }
  };

  const handleDeletePublicForm = async (id: string) => {
    if (window.confirm('Delete this form? This will remove the form and its public link.')) {
      await deletePublicForm(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Forms Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Manage your form submissions and public forms
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/templates')}>
                <FileText className="mr-2 h-4 w-4" />
                Browse Templates
              </Button>
              <Button variant="hero" onClick={() => navigate('/forms/create')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Form
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="public-forms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="public-forms" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              My Forms
            </TabsTrigger>
            <TabsTrigger value="submissions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Form Responses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public-forms" className="space-y-6">
            {publicForms.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No forms created yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create forms that can be shared with others and collect responses.
                  </p>
                  <Button variant="hero" onClick={() => navigate('/forms/create')}>
                    Create Your First Form
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicForms.map((form) => (
                  <Card key={form.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg truncate" title={form.form_title}>
                            {form.form_title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Created {formatDate(form.created_at)}
                          </CardDescription>
                        </div>
                        <Badge variant={form.is_active ? "default" : "secondary"}>
                          {form.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {form.form_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {form.form_description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{form.submission_count} responses</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {form.requires_auth && (
                            <Badge variant="outline" className="text-xs">
                              Auth Required
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/forms/public/${form.id}/responses`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Responses
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/forms/create/${form.id}`)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {form.public_url_slug && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/forms/public/${form.public_url_slug}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeletePublicForm(form.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
              {submissions.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No form submissions yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start by creating a form from a template or filling out an existing form.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => navigate('/templates')}>
                        Browse Templates
                      </Button>
                      <Button variant="hero" onClick={() => navigate('/forms/create')}>
                        Create New Form
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {submissions.map((submission) => (
                    <Card key={submission.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg truncate" title={submission.form_name}>
                              {submission.form_name}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              Created {formatDate(submission.created_at)}
                            </CardDescription>
                          </div>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{submission.completion_percentage}%</span>
                        </div>
                        
                        {submission.submitted_at && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Submitted {formatDate(submission.submitted_at)}
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/forms/edit/${submission.id}`)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSubmission(submission.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};