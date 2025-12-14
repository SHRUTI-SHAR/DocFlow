import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  CollaboratorPresence,
  CollaborationSession,
  DocumentActivity,
  DocumentOperation,
  FollowSession,
  CursorPosition,
  Selection,
  Viewport,
  getCollaboratorColor,
  ActivityActionType,
  OperationType,
  OperationData,
} from '@/types/collaboration';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseCollaborationOptions {
  documentId: string;
  onOperationReceived?: (operation: DocumentOperation) => void;
  onCollaboratorJoined?: (collaborator: CollaboratorPresence) => void;
  onCollaboratorLeft?: (collaborator: CollaboratorPresence) => void;
}

export const useCollaboration = ({
  documentId,
  onOperationReceived,
  onCollaboratorJoined,
  onCollaboratorLeft,
}: UseCollaborationOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [activities, setActivities] = useState<DocumentActivity[]>([]);
  const [operations, setOperations] = useState<DocumentOperation[]>([]);
  const [followSessions, setFollowSessions] = useState<FollowSession[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Generate a unique color for this user based on their position
  const getUserColor = useCallback(() => {
    if (!user) return getCollaboratorColor(0);
    const collaboratorIndex = collaborators.findIndex(c => c.user_id === user.id);
    return getCollaboratorColor(collaboratorIndex >= 0 ? collaboratorIndex : collaborators.length);
  }, [user, collaborators]);

  // Join collaboration session
  const joinSession = useCallback(async () => {
    if (!user || !documentId) return;

    try {
      const color = getUserColor();
      
      // Upsert presence
      const { error: presenceError } = await supabase
        .from('document_presence')
        .upsert({
          document_id: documentId,
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          status: 'viewing',
          color,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'document_id,user_id'
        });

      if (presenceError) throw presenceError;

      // Create collaboration session
      const { data: session, error: sessionError } = await supabase
        .from('collaboration_sessions')
        .insert({
          document_id: documentId,
          user_id: user.id,
          color,
          is_active: true,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      sessionIdRef.current = session.id;

      // Log activity
      await logActivity('collaborator_joined', {});

      setIsConnected(true);
    } catch (error) {
      console.error('Error joining session:', error);
    }
  }, [user, documentId, getUserColor]);

  // Leave collaboration session
  const leaveSession = useCallback(async () => {
    if (!user || !documentId) return;

    try {
      // Remove presence
      await supabase
        .from('document_presence')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', user.id);

      // Deactivate session
      if (sessionIdRef.current) {
        await supabase
          .from('collaboration_sessions')
          .update({ is_active: false })
          .eq('id', sessionIdRef.current);
      }

      // Log activity
      await logActivity('collaborator_left', {});

      setIsConnected(false);
    } catch (error) {
      console.error('Error leaving session:', error);
    }
  }, [user, documentId]);

  // Update cursor position
  const updateCursor = useCallback(async (position: CursorPosition) => {
    if (!user || !documentId) return;

    try {
      await supabase
        .from('document_presence')
        .update({
          cursor_x: position.x,
          cursor_y: position.y,
          status: 'editing',
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating cursor:', error);
    }
  }, [user, documentId]);

  // Update selection
  const updateSelection = useCallback(async (selection: Selection) => {
    if (!user || !documentId) return;

    try {
      await supabase
        .from('document_presence')
        .update({
          selection_start: selection.start,
          selection_end: selection.end,
          status: 'editing',
          last_seen: new Date().toISOString(),
        })
        .eq('document_id', documentId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating selection:', error);
    }
  }, [user, documentId]);

  // Log activity
  const logActivity = useCallback(async (
    actionType: ActivityActionType,
    details: Record<string, unknown>,
    fieldId?: string,
    oldValue?: unknown,
    newValue?: unknown
  ) => {
    if (!user || !documentId) return;

    try {
      await (supabase
        .from('document_activity')
        .insert({
          document_id: documentId,
          user_id: user.id,
          action_type: actionType,
          action_details: details,
          field_id: fieldId,
          old_value: oldValue ? JSON.stringify(oldValue) : null,
          new_value: newValue ? JSON.stringify(newValue) : null,
        } as any));
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user, documentId]);

  // Submit operation (for operational transform)
  const submitOperation = useCallback(async (
    operationType: OperationType,
    operationData: OperationData
  ) => {
    if (!user || !documentId) return;

    try {
      const { data, error } = await (supabase
        .from('document_operations')
        .insert({
          document_id: documentId,
          user_id: user.id,
          operation_type: operationType,
          operation_data: operationData,
          version_number: currentVersion + 1,
          parent_version: currentVersion,
        } as any)
        .select()
        .single());

      if (error) throw error;

      setCurrentVersion(data.version_number);
      return data;
    } catch (error) {
      console.error('Error submitting operation:', error);
    }
  }, [user, documentId, currentVersion]);

  // Start following another user
  const startFollowing = useCallback(async (leaderUserId: string) => {
    if (!user || !documentId) return;

    try {
      const { error } = await supabase
        .from('follow_sessions')
        .insert({
          document_id: documentId,
          follower_user_id: user.id,
          leader_user_id: leaderUserId,
          is_active: true,
        });

      if (error) throw error;

      await logActivity('follow_started', { leader_user_id: leaderUserId });

      toast({
        title: 'Following mode enabled',
        description: 'Your view will sync with the selected collaborator',
      });
    } catch (error) {
      console.error('Error starting follow:', error);
    }
  }, [user, documentId, logActivity, toast]);

  // Stop following
  const stopFollowing = useCallback(async () => {
    if (!user || !documentId) return;

    try {
      await supabase
        .from('follow_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('document_id', documentId)
        .eq('follower_user_id', user.id)
        .eq('is_active', true);

      await logActivity('follow_ended', {});
    } catch (error) {
      console.error('Error stopping follow:', error);
    }
  }, [user, documentId, logActivity]);

  // Get who I'm following
  const getFollowingUser = useCallback(() => {
    const activeFollow = followSessions.find(
      fs => fs.follower_user_id === user?.id && fs.is_active
    );
    if (!activeFollow) return null;
    return collaborators.find(c => c.user_id === activeFollow.leader_user_id);
  }, [followSessions, user, collaborators]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!documentId) return;

    try {
      // Fetch collaborators
      const { data: presenceData } = await supabase
        .from('document_presence')
        .select('*')
        .eq('document_id', documentId)
        .gte('last_seen', new Date(Date.now() - 2 * 60 * 1000).toISOString());

      if (presenceData) {
        setCollaborators(presenceData as CollaboratorPresence[]);
      }

      // Fetch recent activities
      const { data: activityData } = await supabase
        .from('document_activity')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activityData) {
        setActivities(activityData as DocumentActivity[]);
      }

      // Fetch operations for OT
      const { data: operationsData } = await supabase
        .from('document_operations')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
        .limit(100);

      if (operationsData) {
        setOperations(operationsData as DocumentOperation[]);
        if (operationsData.length > 0) {
          setCurrentVersion(operationsData[0].version_number);
        }
      }

      // Fetch follow sessions
      const { data: followData } = await supabase
        .from('follow_sessions')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_active', true);

      if (followData) {
        setFollowSessions(followData as FollowSession[]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, [documentId]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!documentId || !user) return;

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel(`presence-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_presence',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newPresence = payload.new as CollaboratorPresence;
            setCollaborators(prev => {
              const existing = prev.findIndex(c => c.user_id === newPresence.user_id);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = newPresence;
                return updated;
              }
              if (payload.eventType === 'INSERT') {
                onCollaboratorJoined?.(newPresence);
              }
              return [...prev, newPresence];
            });
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as CollaboratorPresence;
            setCollaborators(prev => prev.filter(c => c.user_id !== deleted.user_id));
            onCollaboratorLeft?.(deleted);
          }
        }
      )
      .subscribe();

    presenceChannelRef.current = presenceChannel;

    // Subscribe to activity changes
    const activityChannel = supabase
      .channel(`activity-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_activity',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const newActivity = payload.new as DocumentActivity;
          setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    // Subscribe to operations for OT
    const operationsChannel = supabase
      .channel(`operations-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'document_operations',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const newOperation = payload.new as DocumentOperation;
          if (newOperation.user_id !== user.id) {
            setOperations(prev => [newOperation, ...prev.slice(0, 99)]);
            setCurrentVersion(newOperation.version_number);
            onOperationReceived?.(newOperation);
          }
        }
      )
      .subscribe();

    channelRef.current = operationsChannel;

    // Fetch initial data and join session
    fetchInitialData().then(() => joinSession());

    // Setup heartbeat
    heartbeatIntervalRef.current = setInterval(async () => {
      if (user && documentId) {
        await supabase
          .from('document_presence')
          .update({ last_seen: new Date().toISOString() })
          .eq('document_id', documentId)
          .eq('user_id', user.id);
      }
    }, 30000); // 30 second heartbeat

    return () => {
      presenceChannel.unsubscribe();
      activityChannel.unsubscribe();
      operationsChannel.unsubscribe();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      leaveSession();
    };
  }, [documentId, user]);

  return {
    collaborators,
    activities,
    operations,
    followSessions,
    isConnected,
    currentVersion,
    updateCursor,
    updateSelection,
    logActivity,
    submitOperation,
    startFollowing,
    stopFollowing,
    getFollowingUser,
    getUserColor,
  };
};
