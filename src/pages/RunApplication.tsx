import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { slugify } from '@/utils/helpers';

interface ApplicationRow {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  forms: any;
  app_config: any;
  slug?: string;
}

interface PublicFormRow {
  id: string;
  form_title: string;
  form_description: string | null;
  public_url_slug: string | null;
}

const IFRAME_MIN_HEIGHT = 720;

const getIframeHeight = (isPublic = false) => {
  const viewport = typeof window !== 'undefined' ? window.innerHeight : IFRAME_MIN_HEIGHT;
  const header = isPublic ? 80 : 220; // Less space needed for public route (just tabs)
  return Math.max(IFRAME_MIN_HEIGHT, viewport - header);
};

const RunApplication: React.FC = () => {
  const { identifier, formSlug } = useParams<{ identifier: string; formSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Check if this is the public route (no AppLayout wrapper)
  const isPublicRoute = location.pathname.includes('/applications/public/');

  const [app, setApp] = useState<ApplicationRow | null>(null);
  const [forms, setForms] = useState<PublicFormRow[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const hasInitializedFromUrl = useRef(false);

  // Ensure scrollbars are enabled when this page mounts (especially for public route)
  useEffect(() => {
    const restoreOverflow = () => {
      try {
        document.body.style.overflow = '';
        document.body.style.overflowY = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.overflowY = '';
      } catch {}
    };
    restoreOverflow();
    const id = setTimeout(restoreOverflow, 50);
    return () => {
      clearTimeout(id);
      restoreOverflow();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!identifier) {
        if (!isPublicRoute) {
          navigate('/applications');
        }
        return;
      }
      
      // For public route, don't require authentication
      if (isPublicRoute && !user?.id) {
        // Allow public access - load without user filter
      } else if (!isPublicRoute && !user?.id) {
        navigate('/applications');
        return;
      }
      
      try {
        // 1) Load application - try by slug first, then by ID
        // Check if identifier is a UUID (36 chars with hyphens) or a slug
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        let query = supabase
          .from('applications')
          .select('id, name, display_name, description, forms, app_config, slug');
        
        if (isUUID) {
          query = query.eq('id', identifier);
        } else {
          query = query.eq('slug', identifier);
        }
        
        // Only filter by user_id if authenticated and not public route
        if (!isPublicRoute && user?.id) {
          query = query.eq('user_id', user.id);
        }
        
        const { data: appData, error: appErr } = await query.maybeSingle();

        if (appErr || !appData) {
          throw appErr || new Error('Application not found');
        }
        setApp(appData as ApplicationRow);

        // 2) Load associated forms
        const formIds = Array.isArray(appData.forms) ? appData.forms : [];
        if (formIds.length === 0) {
          toast({ title: 'No forms', description: 'This application has no forms added.', variant: 'destructive' });
          return;
        }

        const { data: formsData, error: formsErr } = await supabase
          .from('public_forms')
          .select('id, form_title, form_description, public_url_slug')
          .in('id', formIds);

        if (formsErr) throw formsErr;
        setForms((formsData || []) as PublicFormRow[]);
        
        // Initialize active tab from URL (only on first load)
        if (!hasInitializedFromUrl.current && formsData && formsData.length > 0) {
          let initialIndex = 0;
          
          // Priority 1: Form slug from URL path
          if (formSlug) {
            const formIndex = formsData.findIndex((f: PublicFormRow) => {
              const formSlugValue = f.public_url_slug || slugify(f.form_title);
              return formSlugValue === formSlug;
            });
            if (formIndex >= 0) {
              initialIndex = formIndex;
            }
          }
          // Priority 2: Tab query param (backward compatibility)
          else {
            const tabParam = Number(searchParams.get('tab'));
            if (!Number.isNaN(tabParam) && tabParam >= 0 && tabParam < formsData.length) {
              initialIndex = tabParam;
            }
          }
          
          setActiveIndex(initialIndex);
          hasInitializedFromUrl.current = true;
          
          // If no form slug in URL and this is a public route, redirect to first form's slug
          if (isPublicRoute && !formSlug && formsData.length > 0) {
            const firstForm = formsData[initialIndex];
            const formSlugValue = firstForm.public_url_slug || slugify(firstForm.form_title);
            const appSlug = appData.slug || identifier;
            navigate(`/applications/public/${appSlug}/${formSlugValue}`, { replace: true });
          }
        }
      } catch (e: any) {
        console.error('Run application error:', e);
        toast({ title: 'Error', description: e?.message || 'Failed to load application', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [identifier, formSlug, user?.id, navigate, toast, isPublicRoute, searchParams]);

  // Helper function to get form slug (from public_url_slug or generated from title)
  const getFormSlug = useCallback((form: PublicFormRow): string => {
    return form.public_url_slug || slugify(form.form_title);
  }, []);

  const iframeSrc = useMemo(() => {
    if (!forms || forms.length === 0) return '';
    const f = forms[Math.min(activeIndex, forms.length - 1)];
    const slugOrId = f.public_url_slug || f.id;
    return `/forms/public/${slugOrId}`;
  }, [forms, activeIndex]);

  // Sync URL when user manually changes tabs (use form slug instead of tab index)
  // Only for public routes, and only if we're not already on the correct URL
  useEffect(() => {
    if (
      isPublicRoute &&
      hasInitializedFromUrl.current &&
      activeIndex !== null &&
      forms.length > 0 &&
      app
    ) {
      const activeForm = forms[activeIndex];
      if (activeForm) {
        const formSlugValue = getFormSlug(activeForm);
        const appSlug = app.slug || identifier;
        const expectedPath = `/applications/public/${appSlug}/${formSlugValue}`;
        
        // Only navigate if we're not already on the correct path
        if (location.pathname !== expectedPath) {
          navigate(expectedPath, { replace: true });
        }
      }
    }
  }, [activeIndex, forms, app, identifier, navigate, location.pathname, getFormSlug, isPublicRoute]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!app || forms.length === 0) {
    if (isPublicRoute) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-muted-foreground">Application not available</p>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Application not available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>No forms available to run.</div>
              <Button onClick={() => navigate('/applications')}>Back to Applications</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Public route: Show only form panel and tabs
  if (isPublicRoute) {
    return (
      <div className="min-h-dvh overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto p-4">
          {/* Form Preview Panel with Tabs Inside */}
          <div className="border rounded-md overflow-hidden bg-background shadow-lg">
            {/* Tabs inside the panel */}
            <div className="flex items-center gap-2 p-4 border-b bg-muted/50 overflow-x-auto">
              {forms.map((f, idx) => (
                <Button
                  key={f.id}
                  variant={idx === activeIndex ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setActiveIndex(idx);
                    // Navigate to form slug URL
                    if (app) {
                      const formSlugValue = getFormSlug(f);
                      const appSlug = app.slug || identifier;
                      navigate(`/applications/public/${appSlug}/${formSlugValue}`, { replace: true });
                    }
                  }}
                >
                  {f.form_title}
                </Button>
              ))}
            </div>

            {/* Iframe container */}
            {iframeSrc ? (
              <iframe
                title={forms[activeIndex]?.form_title || 'Form'}
                src={iframeSrc}
                style={{ width: '100%', height: `${getIframeHeight(true)}px`, border: '0' }}
              />
            ) : (
              <div className="p-6">No form selected.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Protected route: Show full page with header and controls
  return (
    <div className="min-h-dvh overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{app.display_name || app.name}</h1>
          {app.description && <p className="text-muted-foreground mt-1">{app.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/applications')}>Back</Button>
          <Button
            variant="outline"
            onClick={() => {
              if (app && forms.length > 0) {
                const activeForm = forms[activeIndex];
                const formSlugValue = getFormSlug(activeForm);
                const appSlug = app.slug || identifier;
                window.open(`/applications/public/${appSlug}/${formSlugValue}`, '_blank');
              }
            }}
          >
            Open application in new tab
          </Button>
        </div>
      </div>

      {/* Form Preview Panel with Tabs Inside */}
      <div className="border rounded-md overflow-hidden bg-background">
        {/* Tabs inside the panel */}
        <div className="flex items-center gap-2 p-4 border-b bg-muted/50 overflow-x-auto">
          {forms.map((f, idx) => (
            <Button
              key={f.id}
              variant={idx === activeIndex ? 'default' : 'secondary'}
              size="sm"
              onClick={() => {
                setActiveIndex(idx);
                // In protected route, just update state (no navigation)
                // Navigation to public route only happens when clicking "Open in new tab"
              }}
            >
              {f.form_title}
            </Button>
          ))}
        </div>

        {/* Iframe container */}
        {iframeSrc ? (
          <iframe
            title={forms[activeIndex]?.form_title || 'Form'}
            src={iframeSrc}
            style={{ width: '100%', height: `${getIframeHeight(false)}px`, border: '0' }}
          />
        ) : (
          <div className="p-6">No form selected.</div>
        )}
      </div>
      </div>
    </div>
  );
};

export default RunApplication;
