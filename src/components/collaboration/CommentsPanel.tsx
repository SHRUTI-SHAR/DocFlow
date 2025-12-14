import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare, CheckCircle, Circle, MoreVertical,
  Trash2, RefreshCw, AtSign, Flag
} from 'lucide-react';
import { EnhancedComment, CommentFilter, CommentSortOption } from '@/types/annotations';
import { EnhancedCommentThread } from './EnhancedCommentThread';
import { CommentFilterBar } from './CommentFilterBar';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  documentId: string;
  userId?: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  onCommentClick?: (comment: EnhancedComment) => void;
  className?: string;
  collaborators?: Array<{ id: string; name?: string; email?: string; avatar_url?: string }>;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  documentId,
  userId,
  selectedText,
  selectionRange,
  onCommentClick,
  className,
  collaborators = []
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved' | 'mentions'>('all');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [comments, setComments] = useState<EnhancedComment[]>([]);
  const [filter, setFilter] = useState<CommentFilter>({});
  const [sortOption, setSortOption] = useState<CommentSortOption>({ field: 'created_at', direction: 'desc' });
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [isLoading] = useState(false);

  // Computed stats
  const stats = useMemo(() => ({
    total: comments.length,
    open: comments.filter(c => c.status === 'open').length,
    resolved: comments.filter(c => c.status === 'resolved').length,
    myMentions: userId ? comments.filter(c => c.mentions?.some(m => m.user_id === userId)).length : 0,
    assignedToMe: userId ? comments.filter(c => c.assigned_to === userId).length : 0,
  }), [comments, userId]);

  // Filtered comments
  const filteredComments = useMemo(() => {
    let result = [...comments];
    if (filter.status?.length) result = result.filter(c => filter.status!.includes(c.status));
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      result = result.filter(c => c.content.toLowerCase().includes(q));
    }
    return result;
  }, [comments, filter]);

  // Stub functions - would connect to real backend
  const refresh = useCallback(() => console.log('Refresh comments'), []);
  const resolveAll = useCallback(() => console.log('Resolve all'), []);
  const deleteResolved = useCallback(() => console.log('Delete resolved'), []);

  const handleAddComment = async () => {
    if (!newCommentContent.trim()) return;
    
    setIsAddingComment(true);
    // Would call addComment here
    console.log('Add comment:', newCommentContent, selectedText);
    setNewCommentContent('');
    setIsAddingComment(false);
  };

  // Comment action handlers
  const replyToComment = (commentId: string, content: string) => {
    console.log('Reply to comment:', commentId, content);
  };

  const editComment = (commentId: string, content: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, content } : c
    ));
  };

  const deleteComment = (commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const resolveComment = (commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, status: 'resolved' as const } : c
    ));
  };

  const reopenComment = (commentId: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, status: 'open' as const } : c
    ));
  };

  const addReaction = (commentId: string, emoji: string) => {
    console.log('Add reaction:', commentId, emoji);
  };

  const removeReaction = (commentId: string, emoji: string) => {
    console.log('Remove reaction:', commentId, emoji);
  };

  const assignComment = (commentId: string, usrId: string | null) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, assigned_to: usrId } : c
    ));
  };

  const setCommentPriority = (commentId: string, p: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, priority: p as 'low' | 'medium' | 'high' | 'urgent' } : c
    ));
  };

  const addLabel = (commentId: string, label: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, labels: [...(c.labels || []), label] } : c
    ));
  };

  const removeLabel = (commentId: string, label: string) => {
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, labels: (c.labels || []).filter(l => l !== label) } : c
    ));
  };

  // Filter comments by tab
  const getTabComments = () => {
    switch (activeTab) {
      case 'open':
        return filteredComments.filter(c => c.status === 'open');
      case 'resolved':
        return filteredComments.filter(c => c.status === 'resolved');
      case 'mentions':
        return filteredComments.filter(c => c.mentions?.some(m => m.user_id === userId));
      default:
        return filteredComments;
    }
  };

  const tabComments = getTabComments();

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={refresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resolveAll}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve all
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={deleteResolved}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete resolved
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1 text-blue-500">
            <Circle className="h-3 w-3 fill-current" />
            <span>{stats.open} open</span>
          </div>
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-3 w-3" />
            <span>{stats.resolved} resolved</span>
          </div>
          {stats.myMentions > 0 && (
            <div className="flex items-center gap-1 text-orange-500">
              <AtSign className="h-3 w-3" />
              <span>{stats.myMentions} mentions</span>
            </div>
          )}
        </div>
      </div>

      {/* New comment input */}
      <div className="p-4 border-b shrink-0">
        {selectedText && (
          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
            <span className="text-xs text-muted-foreground block mb-1">Commenting on:</span>
            <p className="italic line-clamp-2">"{selectedText}"</p>
          </div>
        )}
        <Textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder={selectedText ? "Add a comment about this selection..." : "Add a comment..."}
          className="min-h-[80px] resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <AtSign className="h-3 w-3 mr-1" />
              Mention
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Flag className="h-3 w-3 mr-1" />
              Priority
            </Button>
          </div>
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!newCommentContent.trim() || isAddingComment}
          >
            {isAddingComment ? 'Adding...' : 'Comment'}
          </Button>
        </div>
      </div>

      {/* Tabs and filters */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              Open ({stats.open})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Resolved
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs">
              Mentions
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2 shrink-0">
          <CommentFilterBar
            filter={filter}
            onFilterChange={setFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
            stats={stats}
          />
        </div>

        {/* Comments list */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading comments...</p>
              </div>
            ) : tabComments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Start a conversation</p>
              </div>
            ) : (
              tabComments.map((comment) => (
                <EnhancedCommentThread
                  key={comment.id}
                  comment={comment}
                  onReply={(content) => replyToComment(comment.id, content)}
                  onEdit={(content) => editComment(comment.id, content)}
                  onDelete={() => deleteComment(comment.id)}
                  onResolve={() => resolveComment(comment.id)}
                  onReopen={() => reopenComment(comment.id)}
                  onReact={(emoji) => addReaction(comment.id, emoji)}
                  onRemoveReaction={(emoji) => removeReaction(comment.id, emoji)}
                  onAssign={(userId) => assignComment(comment.id, userId)}
                  onSetPriority={(priority) => setCommentPriority(comment.id, priority)}
                  onAddLabel={(label) => addLabel(comment.id, label)}
                  onRemoveLabel={(label) => removeLabel(comment.id, label)}
                  currentUserId={userId}
                  collaborators={collaborators}
                  isActive={activeCommentId === comment.id}
                  onClick={() => {
                    setActiveCommentId(comment.id);
                    onCommentClick?.(comment);
                  }}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default CommentsPanel;
