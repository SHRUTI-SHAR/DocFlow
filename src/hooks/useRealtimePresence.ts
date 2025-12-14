import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  CollaboratorPresence, 
  TypingIndicator, 
  ActiveEdit,
  getCollaboratorColor 
} from '@/types/collaboration';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';

interface UseRealtimePresenceOptions {
  documentId: string;
  onUserJoined?: (user: CollaboratorPresence) => void;
  onUserLeft?: (user: CollaboratorPresence) => void;
}

export const useRealtimePresence = ({
  documentId,
  onUserJoined,
  onUserLeft,
}: UseRealtimePresenceOptions) => {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [activeEdits, setActiveEdits] = useState<ActiveEdit[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const myColorRef = useRef<string>(getCollaboratorColor(Math.floor(Math.random() * 10)));

  // Track current user's state
  const trackPresence = useCallback(async (state: Partial<CollaboratorPresence>) => {
    if (!channelRef.current || !user) return;
    
    await channelRef.current.track({
      user_id: user.id,
      user_email: user.email,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
      color: myColorRef.current,
      last_seen: new Date().toISOString(),
      ...state,
    });
  }, [user]);

  // Update cursor position
  const updateCursor = useCallback((x: number, y: number, elementId?: string, fieldId?: string) => {
    trackPresence({
      cursor_x: x,
      cursor_y: y,
      status: 'editing',
      active_field_id: fieldId,
    });
  }, [trackPresence]);

  // Update selection
  const updateSelection = useCallback((start: number, end: number, fieldId?: string) => {
    trackPresence({
      selection_start: start,
      selection_end: end,
      active_field_id: fieldId,
      status: 'editing',
    });
  }, [trackPresence]);

  // Start typing indicator
  const startTyping = useCallback((fieldId?: string) => {
    trackPresence({
      status: 'typing',
      active_field_id: fieldId,
      typing_indicator: fieldId || 'general',
    });

    // Clear existing timeout for this field
    const timeoutKey = fieldId || 'general';
    const existingTimeout = typingTimeoutRef.current.get(timeoutKey);
    if (existingTimeout) clearTimeout(existingTimeout);

    // Auto-stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);
    typingTimeoutRef.current.set(timeoutKey, timeout);
  }, [trackPresence]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    trackPresence({
      status: 'editing',
      typing_indicator: undefined,
    });
  }, [trackPresence]);

  // Start active edit on a field
  const startEditingField = useCallback((fieldId: string) => {
    trackPresence({
      active_field_id: fieldId,
      status: 'editing',
    });
  }, [trackPresence]);

  // Stop active edit
  const stopEditingField = useCallback(() => {
    trackPresence({
      active_field_id: undefined,
      status: 'viewing',
    });
  }, [trackPresence]);

  // Set idle status
  const setIdle = useCallback(() => {
    trackPresence({ status: 'idle' });
  }, [trackPresence]);

  // Process presence state
  const processPresenceState = useCallback((state: RealtimePresenceState<CollaboratorPresence>) => {
    const users: CollaboratorPresence[] = [];
    const typing: TypingIndicator[] = [];
    const edits: ActiveEdit[] = [];

    Object.entries(state).forEach(([key, presences]) => {
      presences.forEach((presence: any) => {
        const userPresence: CollaboratorPresence = {
          id: key,
          document_id: documentId,
          user_id: presence.user_id,
          user_email: presence.user_email,
          user_name: presence.user_name,
          avatar_url: presence.avatar_url,
          status: presence.status || 'viewing',
          cursor_x: presence.cursor_x,
          cursor_y: presence.cursor_y,
          selection_start: presence.selection_start,
          selection_end: presence.selection_end,
          active_field_id: presence.active_field_id,
          typing_indicator: presence.typing_indicator,
          color: presence.color || getCollaboratorColor(users.length),
          last_seen: presence.last_seen || new Date().toISOString(),
        };
        
        users.push(userPresence);

        // Track typing indicators
        if (presence.status === 'typing' && presence.user_id !== user?.id) {
          typing.push({
            user_id: presence.user_id,
            user_name: presence.user_name,
            field_id: presence.typing_indicator,
            started_at: new Date().toISOString(),
          });
        }

        // Track active edits
        if (presence.active_field_id && presence.status === 'editing' && presence.user_id !== user?.id) {
          edits.push({
            user_id: presence.user_id,
            user_name: presence.user_name,
            user_color: presence.color,
            field_id: presence.active_field_id,
            started_at: new Date().toISOString(),
          });
        }
      });
    });

    setCollaborators(users);
    setTypingIndicators(typing);
    setActiveEdits(edits);
  }, [documentId, user?.id]);

  // Setup presence channel
  useEffect(() => {
    if (!documentId || !user) return;

    const channel = supabase.channel(`presence-${documentId}`, {
      config: {
        presence: { key: user.id },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CollaboratorPresence>();
        processPresenceState(state);
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        if (newPresences[0] && (newPresences[0] as any).user_id !== user.id) {
          onUserJoined?.(newPresences[0] as unknown as CollaboratorPresence);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        if (leftPresences[0]) {
          onUserLeft?.(leftPresences[0] as unknown as CollaboratorPresence);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track initial presence
          await trackPresence({ status: 'viewing' });
          setIsConnected(true);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
      channel.unsubscribe();
    };
  }, [documentId, user, processPresenceState, trackPresence, onUserJoined, onUserLeft]);

  // Heartbeat to maintain presence
  useEffect(() => {
    if (!isConnected) return;

    const heartbeat = setInterval(() => {
      trackPresence({ last_seen: new Date().toISOString() });
    }, 15000);

    return () => clearInterval(heartbeat);
  }, [isConnected, trackPresence]);

  // Check if a field is being edited by someone else
  const isFieldBeingEdited = useCallback((fieldId: string): ActiveEdit | undefined => {
    return activeEdits.find(edit => edit.field_id === fieldId);
  }, [activeEdits]);

  // Get users editing a specific field
  const getUsersEditingField = useCallback((fieldId: string): CollaboratorPresence[] => {
    return collaborators.filter(
      c => c.active_field_id === fieldId && c.user_id !== user?.id
    );
  }, [collaborators, user?.id]);

  return {
    collaborators,
    typingIndicators,
    activeEdits,
    isConnected,
    myColor: myColorRef.current,
    updateCursor,
    updateSelection,
    startTyping,
    stopTyping,
    startEditingField,
    stopEditingField,
    setIdle,
    isFieldBeingEdited,
    getUsersEditingField,
  };
};
