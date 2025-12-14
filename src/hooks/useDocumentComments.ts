import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DocumentComment,
  CommentReaction,
  AnchorPosition,
} from '@/types/collaboration';
import { useToast } from '@/hooks/use-toast';

interface UseDocumentCommentsOptions {
  documentId: string;
}

export const useDocumentComments = ({ documentId }: UseDocumentCommentsOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!documentId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          comment_reactions (*)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threads
      const commentsMap = new Map<string, DocumentComment>();
      const rootComments: DocumentComment[] = [];

      data?.forEach((comment: any) => {
        const formattedComment: DocumentComment = {
          ...comment,
          reactions: comment.comment_reactions || [],
          replies: [],
        };
        commentsMap.set(comment.id, formattedComment);
      });

      commentsMap.forEach((comment) => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Add comment
  const addComment = useCallback(async (
    content: string,
    options?: {
      parentCommentId?: string;
      selectionStart?: number;
      selectionEnd?: number;
      selectionText?: string;
      anchorPosition?: AnchorPosition;
    }
  ) => {
    if (!user || !documentId) return;

    try {
      const { data, error } = await (supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          comment: content,
          parent_comment_id: options?.parentCommentId,
          selection_start: options?.selectionStart,
          selection_end: options?.selectionEnd,
          selection_text: options?.selectionText,
          anchor_position: options?.anchorPosition,
          status: 'open',
        } as any)
        .select()
        .single());

      if (error) throw error;

      // Log activity
      await (supabase
        .from('document_activity')
        .insert({
          document_id: documentId,
          user_id: user.id,
          action_type: options?.parentCommentId ? 'comment_replied' : 'comment_added',
          action_details: { comment_id: data.id },
        } as any));

      await fetchComments();

      toast({
        title: 'Comment added',
        description: 'Your comment has been posted',
      });

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
  }, [user, documentId, fetchComments, toast]);

  // Update comment
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('document_comments')
        .update({
          comment: content,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', commentId)
        .eq('user_id', user.id));

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  }, [user, fetchComments, toast]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchComments();

      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  }, [user, fetchComments, toast]);

  // Resolve comment
  const resolveComment = useCallback(async (commentId: string) => {
    if (!user || !documentId) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', commentId);

      if (error) throw error;

      // Log activity
      await supabase
        .from('document_activity')
        .insert({
          document_id: documentId,
          user_id: user.id,
          action_type: 'comment_resolved',
          action_details: { comment_id: commentId },
        });

      await fetchComments();

      toast({
        title: 'Comment resolved',
        description: 'The comment thread has been marked as resolved',
      });
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  }, [user, documentId, fetchComments, toast]);

  // Reopen comment
  const reopenComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .update({
          status: 'open',
          resolved_at: null,
          resolved_by: null,
        })
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error reopening comment:', error);
    }
  }, [user, fetchComments]);

  // Add reaction
  const addReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comment_reactions')
        .upsert({
          comment_id: commentId,
          user_id: user.id,
          reaction,
        }, {
          onConflict: 'comment_id,user_id,reaction'
        });

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [user, fetchComments]);

  // Remove reaction
  const removeReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [user, fetchComments]);

  // Toggle reaction
  const toggleReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user) return;

    const comment = findComment(comments, commentId);
    const hasReaction = comment?.reactions?.some(
      r => r.user_id === user.id && r.reaction === reaction
    );

    if (hasReaction) {
      await removeReaction(commentId, reaction);
    } else {
      await addReaction(commentId, reaction);
    }
  }, [user, comments, addReaction, removeReaction]);

  // Helper to find a comment in the tree
  const findComment = (
    comments: DocumentComment[],
    commentId: string
  ): DocumentComment | undefined => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, commentId);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Get open comments count
  const getOpenCommentsCount = useCallback(() => {
    return comments.filter(c => c.status === 'open').length;
  }, [comments]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!documentId) return;

    fetchComments();

    const channel = supabase
      .channel(`comments-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_comments',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [documentId, fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    reopenComment,
    toggleReaction,
    getOpenCommentsCount,
    refetch: fetchComments,
  };
};
