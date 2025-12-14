import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AutoVersioningSettings, CreateVersionParams } from '@/types/versionControl';

interface UseAutoVersioningOptions {
  documentId: string;
  onAutoSave: (params: CreateVersionParams) => Promise<void>;
  getContent: () => Record<string, unknown>;
}

export function useAutoVersioning({ 
  documentId, 
  onAutoSave,
  getContent 
}: UseAutoVersioningOptions) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutoVersioningSettings | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoVersionCount, setAutoVersionCount] = useState(0);
  
  const lastContentRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch auto-versioning settings
  const fetchSettings = useCallback(async () => {
    if (!user?.id) return;

    try {
      // First try document-specific settings
      let { data, error } = await supabase
        .from('auto_versioning_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('document_id', documentId)
        .maybeSingle();

      if (error) throw error;

      // Fall back to user's global settings
      if (!data) {
        const { data: globalData, error: globalError } = await supabase
          .from('auto_versioning_settings')
          .select('*')
          .eq('user_id', user.id)
          .is('document_id', null)
          .maybeSingle();

        if (globalError) throw globalError;
        data = globalData;
      }

      if (data) {
        setSettings(data as AutoVersioningSettings);
        setIsEnabled(data.is_enabled);
      } else {
        // Create default settings
        const defaultSettings: Partial<AutoVersioningSettings> = {
          user_id: user.id,
          document_id: documentId,
          is_enabled: true,
          interval_seconds: 300, // 5 minutes
          max_auto_versions: 50,
        };

        const { data: newData, error: insertError } = await (supabase
          .from('auto_versioning_settings')
          .insert(defaultSettings as any)
          .select()
          .single());

        if (insertError) throw insertError;

        setSettings(newData as AutoVersioningSettings);
        setIsEnabled(true);
      }
    } catch (err) {
      console.error('Error fetching auto-versioning settings:', err);
    }
  }, [user?.id, documentId]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<AutoVersioningSettings>) => {
    if (!settings?.id) return;

    const { data, error } = await supabase
      .from('auto_versioning_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .select()
      .single();

    if (error) throw error;

    setSettings(data as AutoVersioningSettings);
    if (updates.is_enabled !== undefined) {
      setIsEnabled(updates.is_enabled);
    }
  }, [settings?.id]);

  // Toggle auto-versioning
  const toggleAutoVersioning = useCallback(async () => {
    await updateSettings({ is_enabled: !isEnabled });
  }, [isEnabled, updateSettings]);

  // Set interval
  const setAutoSaveInterval = useCallback(async (seconds: number) => {
    await updateSettings({ interval_seconds: seconds });
  }, [updateSettings]);

  // Perform auto-save
  const performAutoSave = useCallback(async () => {
    if (!isEnabled || isSaving) return;

    const currentContent = getContent();
    const contentString = JSON.stringify(currentContent);

    // Only save if content has changed
    if (contentString === lastContentRef.current) return;

    // Check max auto versions limit
    if (settings?.max_auto_versions && autoVersionCount >= settings.max_auto_versions) {
      console.log('Max auto versions reached');
      return;
    }

    try {
      setIsSaving(true);
      
      await onAutoSave({
        document_id: documentId,
        content: currentContent,
        change_summary: 'Auto-saved version',
        change_type: 'auto',
      });

      lastContentRef.current = contentString;
      setLastAutoSave(new Date());
      setAutoVersionCount(prev => prev + 1);
    } catch (err) {
      console.error('Auto-save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isEnabled, isSaving, getContent, settings?.max_auto_versions, autoVersionCount, onAutoSave, documentId]);

  // Initialize content reference
  useEffect(() => {
    lastContentRef.current = JSON.stringify(getContent());
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Set up auto-save interval
  useEffect(() => {
    if (!isEnabled || !settings?.interval_seconds) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      performAutoSave();
    }, settings.interval_seconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, settings?.interval_seconds, performAutoSave]);

  // Count existing auto versions
  useEffect(() => {
    const countAutoVersions = async () => {
      if (!documentId) return;

      const { count, error } = await supabase
        .from('document_versions')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('change_type', 'auto');

      if (!error && count !== null) {
        setAutoVersionCount(count);
      }
    };

    countAutoVersions();
  }, [documentId]);

  return {
    settings,
    isEnabled,
    lastAutoSave,
    isSaving,
    autoVersionCount,
    toggleAutoVersioning,
    setAutoSaveInterval,
    updateSettings,
    triggerAutoSave: performAutoSave,
  };
}
