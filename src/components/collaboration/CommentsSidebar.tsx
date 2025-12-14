import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DocumentComment } from '@/types/collaboration';
import CommentThread from './CommentThread';
import { MessageSquare, CheckCircle, MessageCircle } from 'lucide-react';

interface CommentsSidebarProps {
  comments: DocumentComment[];
  onAddComment: (content: string, options?: {
    selectionStart?: number;
    selectionEnd?: number;
    selectionText?: string;
  }) => void;
  onReply: (content: string, parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string) => void;
  onReopen: (commentId: string) => void;
  onReact: (commentId: string, reaction: string) => void;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  comments,
  onAddComment,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
  onReact,
  selectedText,
  selectionRange,
}) => {
  const [newCommentContent, setNewCommentContent] = useState('');
  const [activeTab, setActiveTab] = useState('open');

  const openComments = comments.filter(c => c.status === 'open');
  const resolvedComments = comments.filter(c => c.status === 'resolved');

  const handleAddComment = () => {
    if (newCommentContent.trim()) {
      onAddComment(newCommentContent, {
        selectionStart: selectionRange?.start,
        selectionEnd: selectionRange?.end,
        selectionText: selectedText,
      });
      setNewCommentContent('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {openComments.length} open
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {resolvedComments.length} resolved
            </Badge>
          </div>
        </div>
      </div>

      {/* New comment input */}
      <div className="p-4 border-b">
        {selectedText && (
          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
            <span className="text-xs text-muted-foreground">Commenting on:</span>
            <p className="italic mt-1">"{selectedText.slice(0, 100)}{selectedText.length > 100 && '...'}"</p>
          </div>
        )}
        <Textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder={selectedText ? "Add a comment about this selection..." : "Add a comment..."}
          className="min-h-[80px] resize-none"
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={!newCommentContent.trim()}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
          <TabsTrigger value="open" className="text-xs">
            Open ({openComments.length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="text-xs">
            Resolved ({resolvedComments.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="open" className="p-4 space-y-4 mt-0">
            {openComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No open comments</p>
                <p className="text-xs">Start a conversation</p>
              </div>
            ) : (
              openComments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResolve={onResolve}
                  onReopen={onReopen}
                  onReact={onReact}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="p-4 space-y-4 mt-0">
            {resolvedComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No resolved comments</p>
                <p className="text-xs">Resolved threads appear here</p>
              </div>
            ) : (
              resolvedComments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResolve={onResolve}
                  onReopen={onReopen}
                  onReact={onReact}
                />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default CommentsSidebar;
