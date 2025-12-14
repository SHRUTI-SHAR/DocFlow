import React from 'react';
import { EditingConflict, CollaboratorPresence } from '@/types/collaboration';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  GitMerge, 
  Check, 
  X, 
  RefreshCcw,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConflictResolutionPanelProps {
  conflicts: EditingConflict[];
  collaborators: CollaboratorPresence[];
  currentUserId?: string;
  onResolve: (
    conflictId: string, 
    resolution: 'accept_mine' | 'accept_theirs' | 'merge' | 'manual'
  ) => Promise<void>;
  onDismiss?: (conflictId: string) => void;
}

const ConflictResolutionPanel: React.FC<ConflictResolutionPanelProps> = ({
  conflicts,
  collaborators,
  currentUserId,
  onResolve,
  onDismiss,
}) => {
  const activeConflicts = conflicts.filter(c => c.status === 'active');

  if (activeConflicts.length === 0) return null;

  const getCollaborator = (userId: string) => 
    collaborators.find(c => c.user_id === userId);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {activeConflicts.map((conflict, index) => (
        <motion.div
          key={conflict.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[200]"
          style={{ top: `${(index * 160) + 16}px` }}
        >
          <Card className="w-[420px] border-amber-500/50 bg-amber-50/90 dark:bg-amber-950/90 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Edit Conflict Detected
                <Badge variant="outline" className="ml-auto text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(conflict.created_at)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Conflicting users */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Editors:</span>
                <div className="flex -space-x-2">
                  {conflict.user_ids.map((userId) => {
                    const collaborator = getCollaborator(userId);
                    const isMe = userId === currentUserId;
                    return (
                      <div key={userId} className="relative">
                        <Avatar className="h-6 w-6 border-2 border-background">
                          <AvatarImage src={collaborator?.avatar_url} />
                          <AvatarFallback
                            style={{ backgroundColor: collaborator?.color }}
                            className="text-[8px] text-white"
                          >
                            {getInitials(collaborator?.user_name, collaborator?.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        {isMe && (
                          <span className="absolute -bottom-1 -right-1 text-[8px] bg-primary text-primary-foreground rounded-full px-1">
                            You
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Resolution options */}
              <div className="space-y-2">
                <span className="text-xs font-medium">Choose resolution:</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => onResolve(conflict.id, 'accept_mine')}
                  >
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <div className="text-left">
                      <div className="text-xs font-medium">Keep mine</div>
                      <div className="text-[10px] text-muted-foreground">Use your version</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => onResolve(conflict.id, 'accept_theirs')}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2 text-blue-500" />
                    <div className="text-left">
                      <div className="text-xs font-medium">Use theirs</div>
                      <div className="text-[10px] text-muted-foreground">Accept their version</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2 col-span-2"
                    onClick={() => onResolve(conflict.id, 'merge')}
                  >
                    <GitMerge className="h-4 w-4 mr-2 text-purple-500" />
                    <div className="text-left">
                      <div className="text-xs font-medium">Merge changes</div>
                      <div className="text-[10px] text-muted-foreground">
                        Combine both versions automatically
                      </div>
                    </div>
                  </Button>
                </div>
              </div>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => onDismiss(conflict.id)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

export default ConflictResolutionPanel;
