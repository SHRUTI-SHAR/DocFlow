import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  CollaboratorPresence,
  DocumentActivity,
  DocumentComment,
} from '@/types/collaboration';
import CollaboratorAvatars from './CollaboratorAvatars';
import ActivityFeed from './ActivityFeed';
import CommentsSidebar from './CommentsSidebar';
import { Users, MessageSquare, History, X, Eye } from 'lucide-react';

interface CollaborationPanelProps {
  collaborators: CollaboratorPresence[];
  activities: DocumentActivity[];
  comments: DocumentComment[];
  isConnected: boolean;
  followingUserId?: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  onFollowUser: (userId: string) => void;
  onStopFollowing: () => void;
  onAddComment: (content: string, options?: {
    selectionStart?: number;
    selectionEnd?: number;
    selectionText?: string;
  }) => void;
  onReplyComment: (content: string, parentId: string) => void;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveComment: (commentId: string) => void;
  onReopenComment: (commentId: string) => void;
  onReactComment: (commentId: string, reaction: string) => void;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  collaborators,
  activities,
  comments,
  isConnected,
  followingUserId,
  selectedText,
  selectionRange,
  onFollowUser,
  onStopFollowing,
  onAddComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  onReopenComment,
  onReactComment,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('collaborators');

  const openCommentsCount = comments.filter(c => c.status === 'open').length;
  const followingUser = collaborators.find(c => c.user_id === followingUserId);

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Following indicator */}
      {followingUser && (
        <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded-full">
          <Eye className="h-3 w-3 text-primary" />
          <span className="text-xs">
            Following {followingUser.user_name || followingUser.user_email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={onStopFollowing}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Collaborator avatars */}
      <CollaboratorAvatars
        collaborators={collaborators}
        onFollowUser={onFollowUser}
        followingUserId={followingUserId}
      />

      {/* Comments badge */}
      {openCommentsCount > 0 && (
        <Badge
          variant="secondary"
          className="cursor-pointer"
          onClick={() => {
            setActiveTab('comments');
            setIsOpen(true);
          }}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          {openCommentsCount}
        </Badge>
      )}

      {/* Full panel sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Collaborate
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collaboration
              {isConnected && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  Live
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 h-[calc(100vh-80px)]"
          >
            <TabsList className="grid w-full grid-cols-3 p-1 mx-4 mt-2">
              <TabsTrigger value="collaborators" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                People ({collaborators.length})
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Comments ({openCommentsCount})
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collaborators" className="h-full p-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {collaborators.length} {collaborators.length === 1 ? 'person' : 'people'} viewing
                </h4>
                <div className="space-y-3">
                  {collaborators.map((collaborator) => (
                    <div
                      key={collaborator.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: collaborator.color }}
                        >
                          {collaborator.user_name?.charAt(0) ||
                            collaborator.user_email?.charAt(0) ||
                            '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {collaborator.user_name || collaborator.user_email}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {collaborator.status}
                          </p>
                        </div>
                      </div>
                      {followingUserId !== collaborator.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFollowUser(collaborator.user_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Follow
                        </Button>
                      )}
                      {followingUserId === collaborator.user_id && (
                        <Badge variant="secondary">
                          <Eye className="h-3 w-3 mr-1" />
                          Following
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="h-full">
              <CommentsSidebar
                comments={comments}
                onAddComment={onAddComment}
                onReply={onReplyComment}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                onResolve={onResolveComment}
                onReopen={onReopenComment}
                onReact={onReactComment}
                selectedText={selectedText}
                selectionRange={selectionRange}
              />
            </TabsContent>

            <TabsContent value="activity" className="h-full p-4">
              <ActivityFeed activities={activities} maxHeight="calc(100vh - 200px)" />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CollaborationPanel;
