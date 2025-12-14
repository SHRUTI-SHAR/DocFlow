import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentComment, REACTION_EMOJIS } from '@/types/collaboration';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  MoreHorizontal,
  Reply,
  Trash2,
  Edit,
  RotateCcw,
  Smile,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CommentThreadProps {
  comment: DocumentComment;
  onReply: (content: string, parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onReopen: (commentId: string) => void;
  onReact: (commentId: string, reaction: string) => void;
  depth?: number;
}

const CommentThread: React.FC<CommentThreadProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
  onReact,
  depth = 0,
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);

  const isOwner = user?.id === comment.user_id;
  const isResolved = comment.status === 'resolved';

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(replyContent, comment.id);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const handleEdit = () => {
    if (editContent.trim()) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  const getInitials = (comment: DocumentComment) => {
    if (comment.user?.name) {
      return comment.user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return comment.user?.email?.charAt(0).toUpperCase() || '?';
  };

  // Group reactions by emoji
  const groupedReactions = comment.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.reaction]) {
      acc[reaction.reaction] = [];
    }
    acc[reaction.reaction].push(reaction.user_id);
    return acc;
  }, {} as Record<string, string[]>) || {};

  return (
    <div
      className={`${depth > 0 ? 'ml-6 pl-4 border-l-2 border-muted' : ''} ${
        isResolved ? 'opacity-60' : ''
      }`}
    >
      <div className="group relative bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        {/* Selection highlight indicator */}
        {comment.selection_text && (
          <div className="mb-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs italic border-l-2 border-yellow-500">
            "{comment.selection_text}"
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.user?.avatar_url} />
            <AvatarFallback className="text-xs">
              {getInitials(comment)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {comment.user?.name || comment.user?.email || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {isResolved && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(groupedReactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(comment.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                      userIds.includes(user?.id || '')
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{userIds.length}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isResolved && depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Smile className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="flex flex-wrap gap-1 p-2 w-fit">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact(comment.id, emoji)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {depth === 0 && (
                isResolved ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onReopen(comment.id)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reopen
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-600"
                    onClick={() => onResolve(comment.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )
              )}

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-2 ml-11">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="min-h-[60px] text-sm"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleReply}>Reply</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              onReopen={onReopen}
              onReact={onReact}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
