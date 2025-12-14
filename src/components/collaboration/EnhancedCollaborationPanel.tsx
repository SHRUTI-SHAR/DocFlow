import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CollaboratorPresence,
  DocumentActivity,
  DocumentComment,
  EditingConflict,
  TypingIndicator as TypingIndicatorType,
  CollaborationNotification,
} from '@/types/collaboration';
import CollaboratorAvatars from './CollaboratorAvatars';
import ActivityFeed from './ActivityFeed';
import CommentsSidebar from './CommentsSidebar';
import QuickShareDialog from './QuickShareDialog';
import CollaborationNotifications from './CollaborationNotifications';
import TypingIndicator from './TypingIndicator';
import { 
  Users, 
  MessageSquare, 
  History, 
  X, 
  Eye, 
  Wifi,
  WifiOff,
  Share2,
  Bell,
  Settings,
  Video,
  Phone,
} from 'lucide-react';

interface EnhancedCollaborationPanelProps {
  documentId: string;
  documentName?: string;
  collaborators: CollaboratorPresence[];
  activities: DocumentActivity[];
  comments: DocumentComment[];
  typingIndicators: TypingIndicatorType[];
  notifications: CollaborationNotification[];
  conflicts: EditingConflict[];
  isConnected: boolean;
  followingUserId?: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  currentUserId?: string;
  // Callbacks
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
  onInvite: (email: string, permission: any) => Promise<void>;
  onRemoveCollaborator?: (userId: string) => Promise<void>;
  onChangePermission?: (userId: string, permission: any) => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onDeleteNotification: (notificationId: string) => void;
}

const EnhancedCollaborationPanel: React.FC<EnhancedCollaborationPanelProps> = ({
  documentId,
  documentName,
  collaborators,
  activities,
  comments,
  typingIndicators,
  notifications,
  conflicts,
  isConnected,
  followingUserId,
  selectedText,
  selectionRange,
  currentUserId,
  onFollowUser,
  onStopFollowing,
  onAddComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  onReopenComment,
  onReactComment,
  onInvite,
  onRemoveCollaborator,
  onChangePermission,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDeleteNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('collaborators');
  const [showCursors, setShowCursors] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const openCommentsCount = comments.filter(c => c.status === 'open').length;
  const followingUser = collaborators.find(c => c.user_id === followingUserId);
  const unreadNotifications = notifications.filter(n => !n.read).length;
  const activeConflicts = conflicts.filter(c => c.status === 'active').length;

  return (
    <div className="flex items-center gap-2">
      {/* Connection status indicator */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50">
        {isConnected ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Offline</span>
          </>
        )}
      </div>

      {/* Typing indicator */}
      {typingIndicators.length > 0 && (
        <TypingIndicator
          indicators={typingIndicators}
          collaborators={collaborators}
          variant="minimal"
        />
      )}

      {/* Following indicator */}
      {followingUser && (
        <div 
          className="flex items-center gap-2 px-2 py-1 rounded-full text-white text-xs"
          style={{ backgroundColor: followingUser.color }}
        >
          <Eye className="h-3 w-3" />
          <span className="max-w-[80px] truncate">
            {followingUser.user_name || 'User'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 hover:bg-white/20"
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
        maxVisible={5}
      />

      {/* Conflicts indicator */}
      {activeConflicts > 0 && (
        <Badge variant="destructive" className="animate-pulse">
          {activeConflicts} conflict{activeConflicts > 1 ? 's' : ''}
        </Badge>
      )}

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

      {/* Notifications */}
      <CollaborationNotifications
        notifications={notifications}
        onMarkAsRead={onMarkNotificationRead}
        onMarkAllAsRead={onMarkAllNotificationsRead}
        onDelete={onDeleteNotification}
      />

      {/* Quick share */}
      <QuickShareDialog
        documentId={documentId}
        documentName={documentName}
        collaborators={collaborators}
        currentUserId={currentUserId}
        onInvite={onInvite}
        onRemoveCollaborator={onRemoveCollaborator}
        onChangePermission={onChangePermission}
      />

      {/* Full collaboration panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Collaborate
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Collaboration
                {isConnected && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                    <Wifi className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Start call">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Start video">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 h-[calc(100vh-80px)]"
          >
            <TabsList className="grid w-full grid-cols-4 p-1 mx-4 mt-2">
              <TabsTrigger value="collaborators" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                People
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs relative">
                <MessageSquare className="h-3 w-3 mr-1" />
                Chat
                {openCommentsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {openCommentsCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="collaborators" className="h-full p-4">
              <div className="space-y-4">
                {/* Online now */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Online now ({collaborators.filter(c => c.status !== 'idle').length})
                  </h4>
                  <div className="space-y-2">
                    {collaborators
                      .filter(c => c.status !== 'idle')
                      .map((collaborator) => (
                        <div
                          key={collaborator.user_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div
                                className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                                style={{ backgroundColor: collaborator.color }}
                              >
                                {collaborator.user_name?.charAt(0) ||
                                  collaborator.user_email?.charAt(0) ||
                                  '?'}
                              </div>
                              {collaborator.status === 'typing' && (
                                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                                  <span className="flex gap-0.5">
                                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce delay-100" />
                                    <span className="h-1 w-1 rounded-full bg-primary animate-bounce delay-200" />
                                  </span>
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {collaborator.user_name || collaborator.user_email}
                                {collaborator.user_id === currentUserId && (
                                  <span className="text-muted-foreground ml-1">(You)</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                {collaborator.status === 'typing' ? (
                                  <>Typing...</>
                                ) : collaborator.active_field_id ? (
                                  <>Editing field</>
                                ) : (
                                  collaborator.status
                                )}
                              </p>
                            </div>
                          </div>
                          {collaborator.user_id !== currentUserId && (
                            <Button
                              variant={followingUserId === collaborator.user_id ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => 
                                followingUserId === collaborator.user_id 
                                  ? onStopFollowing() 
                                  : onFollowUser(collaborator.user_id)
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {followingUserId === collaborator.user_id ? 'Following' : 'Follow'}
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Idle users */}
                {collaborators.filter(c => c.status === 'idle').length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">
                      Idle ({collaborators.filter(c => c.status === 'idle').length})
                    </h4>
                    <div className="space-y-2 opacity-60">
                      {collaborators
                        .filter(c => c.status === 'idle')
                        .map((collaborator) => (
                          <div
                            key={collaborator.user_id}
                            className="flex items-center gap-3 p-2 rounded-lg"
                          >
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                              style={{ backgroundColor: collaborator.color }}
                            >
                              {collaborator.user_name?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm">
                              {collaborator.user_name || collaborator.user_email}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
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

            <TabsContent value="settings" className="h-full p-4">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-4">Collaboration Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Show cursors</Label>
                        <p className="text-xs text-muted-foreground">
                          See where others are pointing
                        </p>
                      </div>
                      <Switch
                        checked={showCursors}
                        onCheckedChange={setShowCursors}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sound notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Play sounds for mentions and comments
                        </p>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EnhancedCollaborationPanel;
