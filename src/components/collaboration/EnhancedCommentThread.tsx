import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, format } from 'date-fns';
import {
  CheckCircle, MoreHorizontal, Reply, Trash2, Edit,
  RotateCcw, Smile, User, Flag, Tag, AlertTriangle,
  ChevronUp, ChevronDown, Minus, Equal, AtSign, Paperclip,
  Clock, X
} from 'lucide-react';
import { EnhancedComment, REACTION_EMOJIS, PRIORITY_CONFIG } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface EnhancedCommentThreadProps {
  comment: EnhancedComment;
  onReply: (content: string) => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  onAssign?: (userId: string | null) => void;
  onSetPriority?: (priority: 'low' | 'medium' | 'high' | 'urgent' | null) => void;
  onAddLabel?: (label: string) => void;
  onRemoveLabel?: (label: string) => void;
  currentUserId?: string;
  collaborators?: Array<{ id: string; name?: string; email?: string; avatar_url?: string }>;
  availableLabels?: Array<{ id: string; name: string; color: string }>;
  isActive?: boolean;
  onClick?: () => void;
  depth?: number;
}

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  low: <Minus className="h-3 w-3" />,
  medium: <Equal className="h-3 w-3" />,
  high: <ChevronUp className="h-3 w-3" />,
  urgent: <AlertTriangle className="h-3 w-3" />,
};

export const EnhancedCommentThread: React.FC<EnhancedCommentThreadProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
  onReact,
  onRemoveReaction,
  onAssign,
  onSetPriority,
  onAddLabel,
  onRemoveLabel,
  currentUserId,
  collaborators = [],
  availableLabels = [],
  isActive = false,
  onClick,
  depth = 0
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [editContent, setEditContent] = useState(comment.content);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const isOwner = currentUserId === comment.user_id;
  const isResolved = comment.status === 'resolved';
  const hasReplies = comment.replies && comment.replies.length > 0;
  const visibleReplies = showAllReplies ? comment.replies : comment.replies?.slice(0, 2);

  const handleReply = () => {
    if (replyContent.trim()) {
      onReply(replyContent);
      setReplyContent('');
      setIsReplying(false);
    }
  };

  const handleEdit = () => {
    if (editContent.trim()) {
      onEdit(editContent);
      setIsEditing(false);
    }
  };

  const getInitials = (user?: { name?: string; email?: string }) => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || '?';
  };

  // Group reactions by emoji
  const groupedReactions = comment.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.user_id);
    return acc;
  }, {} as Record<string, string[]>) || {};

  const priorityConfig = comment.priority ? PRIORITY_CONFIG[comment.priority] : null;

  return (
    <div
      data-comment-id={comment.id}
      className={cn(
        "group relative transition-all",
        depth > 0 && "ml-6 pl-4 border-l-2 border-muted",
        isResolved && "opacity-60",
        isActive && "ring-2 ring-primary rounded-lg"
      )}
      onClick={onClick}
    >
      <div className="bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        {/* Selected text highlight */}
        {comment.selected_text && (
          <div className="mb-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs italic border-l-2 border-yellow-500 line-clamp-2">
            "{comment.selected_text}"
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.user?.avatar_url} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(comment.user)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* User info and badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {comment.user?.name || comment.user?.email || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_edited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {isResolved && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 h-5">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
              {priorityConfig && (
                <Badge variant="outline" className={cn("text-xs h-5", priorityConfig.color)}>
                  {PRIORITY_ICONS[comment.priority!]}
                  <span className="ml-1">{priorityConfig.label}</span>
                </Badge>
              )}
              {comment.assigned_to && (
                <Badge variant="secondary" className="text-xs h-5">
                  <User className="h-3 w-3 mr-1" />
                  Assigned
                </Badge>
              )}
              {comment.due_date && (
                <Badge variant="outline" className="text-xs h-5">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(comment.due_date), 'MMM d')}
                </Badge>
              )}
            </div>

            {/* Labels */}
            {comment.labels && comment.labels.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {comment.labels.map((label) => (
                  <Badge 
                    key={label} 
                    variant="outline" 
                    className="text-xs h-5 gap-1"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {label}
                    {onRemoveLabel && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveLabel(label);
                        }}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}

            {/* Content */}
            {isEditing ? (
              <div className="mt-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
            )}

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {comment.attachments.length} attachment(s)
                </span>
              </div>
            )}

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(groupedReactions).map(([emoji, userIds]) => {
                  const hasReacted = userIds.includes(currentUserId || '');
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        hasReacted ? onRemoveReaction(emoji) : onReact(emoji);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                        hasReacted
                          ? "bg-primary/20 text-primary"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <span>{emoji}</span>
                      <span>{userIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isResolved && depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsReplying(!isReplying);
                  }}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}

              {/* Reaction picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Smile className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReact(emoji)}
                        className="p-1.5 hover:bg-muted rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Resolve/Reopen */}
              {depth === 0 && (
                isResolved ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopen();
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reopen
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolve();
                    }}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )
              )}

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isOwner && (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Priority submenu */}
                  {onSetPriority && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Flag className="h-4 w-4 mr-2" />
                        Set Priority
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => onSetPriority(key as any)}
                            className={cn(config.color)}
                          >
                            {PRIORITY_ICONS[key]}
                            <span className="ml-2">{config.label}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onSetPriority(null)}>
                          Clear priority
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {/* Assign submenu */}
                  {onAssign && collaborators.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <User className="h-4 w-4 mr-2" />
                        Assign to
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {collaborators.map((user) => (
                          <DropdownMenuItem
                            key={user.id}
                            onClick={() => onAssign(user.id)}
                          >
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            {user.name || user.email}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onAssign(null)}>
                          Unassign
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {/* Labels */}
                  {onAddLabel && availableLabels.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Tag className="h-4 w-4 mr-2" />
                        Add Label
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {availableLabels.map((label) => (
                          <DropdownMenuItem
                            key={label.id}
                            onClick={() => onAddLabel(label.name)}
                          >
                            <div 
                              className="h-3 w-3 rounded-full mr-2"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Replies */}
      {hasReplies && (
        <div className="mt-2 space-y-2">
          {visibleReplies?.map((reply) => (
            <EnhancedCommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              onReopen={onReopen}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
          
          {comment.replies && comment.replies.length > 2 && !showAllReplies && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-6 text-xs"
              onClick={() => setShowAllReplies(true)}
            >
              Show {comment.replies.length - 2} more replies
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedCommentThread;
