import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Settings, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react';
import { slugify } from '@/utils/helpers';

interface PublicForm {
  id: string;
  form_title: string;
  form_description: string;
  form_config: any;
  created_at: string;
}

export default function CreateApplication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [customSlug, setCustomSlug] = useState('');
  const [slugValidation, setSlugValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
  }>({ isValid: true, isChecking: false, message: '' });
  const slugInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchForms();
    }
  }, [user]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('public_forms')
        .select('id, form_title, form_description, form_config, created_at')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reserved paths that cannot be used as slugs
  const RESERVED_PATHS = [
    'new', 'edit', 'create', 'delete', 'admin', 'api', 'auth', 'public',
    'applications', 'forms', 'templates', 'documents', 'history', 'upload',
    'workflows', 'settings', 'profile', 'dashboard', 'home'
  ];

  // Validate slug format
  const validateSlugFormat = (slug: string): { isValid: boolean; message: string } => {
    if (!slug.trim()) {
      return { isValid: false, message: 'URL path cannot be empty' };
    }
    
    if (slug.length < 3) {
      return { isValid: false, message: 'URL path must be at least 3 characters' };
    }
    
    if (slug.length > 50) {
      return { isValid: false, message: 'URL path must be less than 50 characters' };
    }
    
    // Check for valid URL-safe characters only
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { isValid: false, message: 'URL path can only contain lowercase letters, numbers, and hyphens' };
    }
    
    // Check for reserved paths
    if (RESERVED_PATHS.includes(slug.toLowerCase())) {
      return { isValid: false, message: 'This URL path is reserved and cannot be used' };
    }
    
    // Check for consecutive hyphens
    if (slug.includes('--')) {
      return { isValid: false, message: 'URL path cannot contain consecutive hyphens' };
    }
    
    // Check for leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { isValid: false, message: 'URL path cannot start or end with a hyphen' };
    }
    
    return { isValid: true, message: '' };
  };

  // Check slug uniqueness (debounced)
  const checkSlugUniqueness = useCallback(async (slug: string) => {
    if (!slug.trim() || !user?.id) {
      setSlugValidation({ isValid: true, isChecking: false, message: '' });
      return;
    }

    const formatValidation = validateSlugFormat(slug);
    if (!formatValidation.isValid) {
      setSlugValidation({ isValid: false, isChecking: false, message: formatValidation.message });
      return;
    }

    setSlugValidation({ isValid: true, isChecking: true, message: 'Checking availability...' });

    try {
      // Check if slug exists for any application
      const { data, error } = await supabase
        .from('applications')
        .select('id, slug')
        .eq('slug', slug)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
        throw error;
      }

      // If slug exists, it's taken
      if (data) {
        setSlugValidation({
          isValid: false,
          isChecking: false,
          message: 'This URL path is already in use by another application'
        });
      } else {
        setSlugValidation({
          isValid: true,
          isChecking: false,
          message: 'URL path is available'
        });
      }
    } catch (error) {
      console.error('Error checking slug uniqueness:', error);
      setSlugValidation({
        isValid: false,
        isChecking: false,
        message: 'Error checking availability'
      });
    }
  }, [user?.id]);

  // Debounce slug validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customSlug) {
        checkSlugUniqueness(customSlug);
      } else {
        setSlugValidation({ isValid: true, isChecking: false, message: '' });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [customSlug, checkSlugUniqueness]);

  // Handle slug input change with auto-formatting
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let value = input.value;
    const originalCursorPosition = input.selectionStart ?? value.length;
    
    // Convert spaces to hyphens FIRST before any other processing
    const hadSpace = value.includes(' ');
    if (hadSpace) {
      value = value.replace(/\s+/g, '-');
    }
    
    // Apply other slug formatting: lowercase, remove invalid chars, etc.
    let formatted = value
      .toLowerCase()
      .replace(/[^\w-]/g, '') // Remove anything that's not word char or hyphen (spaces already converted)
      .replace(/--+/g, '-'); // Replace multiple hyphens with single hyphen
    
    // Only remove leading/trailing hyphens if they weren't just converted from spaces
    // Check if cursor is at the end and we just converted a trailing space
    const cursorAtEnd = originalCursorPosition >= input.value.length;
    const hadTrailingSpace = hadSpace && cursorAtEnd && input.value.trimEnd().length < input.value.length;
    
    if (!hadTrailingSpace) {
      formatted = formatted.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens only if not from space
    } else {
      // Keep trailing hyphen if it was from a space, but remove leading
      formatted = formatted.replace(/^-+/, ''); // Remove only leading hyphens
    }
    
    // Calculate new cursor position
    let newCursorPos = originalCursorPosition;
    if (hadSpace) {
      const spacesBeforeCursor = (input.value.slice(0, originalCursorPosition).match(/\s/g) || []).length;
      newCursorPos = originalCursorPosition + spacesBeforeCursor;
    }
    
    // Adjust for removed characters
    const beforeCursorOriginal = value.slice(0, newCursorPos);
    const beforeCursorFormatted = formatted.slice(0, newCursorPos);
    const removedBeforeCursor = beforeCursorOriginal.length - beforeCursorFormatted.length;
    newCursorPos = Math.max(0, Math.min(newCursorPos - removedBeforeCursor, formatted.length));
    
    setCustomSlug(formatted);
    
    // Restore cursor position after state update
    setTimeout(() => {
      if (slugInputRef.current) {
        slugInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Get public URL
  const getPublicUrl = () => {
    const baseUrl = window.location.origin;
    const slug = customSlug.trim() || 'your-app-slug';
    return `${baseUrl}/applications/public/${slug}`;
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(getPublicUrl());
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

  const handleSave = async () => {
    if (!appName.trim() || selectedForms.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide an application name and select at least one form',
        variant: 'destructive',
      });
      return;
    }

    // Validate slug if provided
    if (customSlug.trim()) {
      const formatValidation = validateSlugFormat(customSlug.trim());
      if (!formatValidation.isValid) {
        toast({
          title: 'Validation Error',
          description: formatValidation.message,
          variant: 'destructive',
        });
        return;
      }

      // Check uniqueness one more time before saving
      if (slugValidation.isChecking) {
        toast({
          title: 'Please wait',
          description: 'Checking URL availability...',
          variant: 'destructive',
        });
        return;
      }

      if (!slugValidation.isValid) {
        toast({
          title: 'Validation Error',
          description: slugValidation.message || 'Invalid URL path',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const insertData: any = {
        name: appName,
        display_name: appName,
        description: appDescription,
        forms: selectedForms,
        is_active: isActive,
        user_id: user?.id,
        app_config: {
          theme: 'default',
          layout: 'standard',
          navigation: 'sidebar'
        }
      };

      // Add slug if provided
      if (customSlug.trim()) {
        insertData.slug = customSlug.trim();
      }

      const { data, error } = await supabase
        .from('applications')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application created successfully',
      });

      navigate('/applications');
    } catch (error: any) {
      console.error('Error creating application:', error);
      
      // Handle unique constraint violation
      if (error?.code === '23505' || error?.message?.includes('unique')) {
        toast({
          title: 'Error',
          description: 'This URL path is already in use. Please choose a different one.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to create application',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Application</h1>
            <p className="text-muted-foreground">Create a new multi-form application</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/applications')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Application Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Application Name</label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Enter application name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Describe your application"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Custom URL Path</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      ref={slugInputRef}
                      value={customSlug}
                      onChange={handleSlugChange}
                      placeholder="my-custom-app"
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      className={`pr-10 ${
                        customSlug && !slugValidation.isValid
                          ? 'border-destructive'
                          : customSlug && slugValidation.isValid && !slugValidation.isChecking
                          ? 'border-green-500'
                          : ''
                      }`}
                    />
                    {customSlug && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugValidation.isChecking ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : slugValidation.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>
                  {customSlug && (
                    <div className="space-y-1">
                      <p className={`text-xs ${
                        slugValidation.isValid ? 'text-green-600' : 'text-destructive'
                      }`}>
                        {slugValidation.message}
                      </p>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <span className="text-xs text-muted-foreground flex-1 truncate">
                          {getPublicUrl()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleCopyUrl}
                          title="Copy URL"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(getPublicUrl(), '_blank')}
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use auto-generated URL. Only lowercase letters, numbers, and hyphens allowed.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-active"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <label htmlFor="is-active" className="text-sm font-medium">
                  Active Application
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Form Selection Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Select Forms</CardTitle>
              <CardDescription>
                Choose which forms to include in this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {forms.map((form) => (
                  <div key={form.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={form.id}
                      checked={selectedForms.includes(form.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedForms([...selectedForms, form.id]);
                        } else {
                          setSelectedForms(selectedForms.filter(id => id !== form.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <label htmlFor={form.id} className="text-sm font-medium cursor-pointer">
                        {form.form_title}
                      </label>
                      {form.form_description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {form.form_description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {(form.form_config?.fields || []).length} fields
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {forms.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No forms available. Create some forms first.
                  </p>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedForms.length} form{selectedForms.length !== 1 ? 's' : ''} selected
                </p>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Creating...' : 'Create Application'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

