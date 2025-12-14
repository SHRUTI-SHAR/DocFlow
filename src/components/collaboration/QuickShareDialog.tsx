import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CollaboratorPresence, 
  CollaborationPermission, 
  PERMISSION_LEVELS 
} from '@/types/collaboration';
import { 
  Share2, 
  Copy, 
  Check, 
  X, 
  UserPlus, 
  Link2, 
  Mail,
  Crown,
  Settings,
  Edit,
  MessageSquare,
  Eye,
  Trash2,
} from 'lucide-react';

interface QuickShareDialogProps {
  documentId: string;
  documentName?: string;
  collaborators: CollaboratorPresence[];
  currentUserId?: string;
  onInvite: (email: string, permission: CollaborationPermission) => Promise<void>;
  onRemoveCollaborator?: (userId: string) => Promise<void>;
  onChangePermission?: (userId: string, permission: CollaborationPermission) => Promise<void>;
  children?: React.ReactNode;
}

const PermissionIcon: React.FC<{ permission: CollaborationPermission }> = ({ permission }) => {
  switch (permission) {
    case 'owner':
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 'admin':
      return <Settings className="h-4 w-4 text-blue-500" />;
    case 'editor':
      return <Edit className="h-4 w-4 text-green-500" />;
    case 'commenter':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'viewer':
      return <Eye className="h-4 w-4 text-gray-500" />;
    default:
      return null;
  }
};

const QuickShareDialog: React.FC<QuickShareDialogProps> = ({
  documentId,
  documentName = 'Document',
  collaborators,
  currentUserId,
  onInvite,
  onRemoveCollaborator,
  onChangePermission,
  children,
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<CollaborationPermission>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareUrl = `${window.location.origin}/documents/${documentId}`;

  const handleInvite = async () => {
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      await onInvite(email, permission);
      toast({
        title: 'Invitation sent',
        description: `${email} has been invited as ${PERMISSION_LEVELS[permission].label}`,
      });
      setEmail('');
    } catch (error) {
      toast({
        title: 'Failed to send invitation',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: 'Link copied',
        description: 'Share link has been copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!onRemoveCollaborator) return;
    try {
      await onRemoveCollaborator(userId);
      toast({
        title: 'Collaborator removed',
        description: 'Access has been revoked',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{documentName}"
          </DialogTitle>
          <DialogDescription>
            Invite collaborators to view or edit this document
          </DialogDescription>
        </DialogHeader>

        {/* Quick link copy */}
        <div className="flex gap-2">
          <Input
            value={shareUrl}
            readOnly
            className="text-sm bg-muted"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyLink}
          >
            {linkCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <Separator />

        {/* Invite by email */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Add people</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
              <Select
                value={permission}
                onValueChange={(v) => setPermission(v as CollaborationPermission)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERMISSION_LEVELS)
                    .filter(([key]) => key !== 'owner')
                    .map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <PermissionIcon permission={key as CollaborationPermission} />
                          {value.label}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!email.trim() || isInviting}
            >
              {isInviting ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Current collaborators */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            People with access ({collaborators.length})
          </Label>
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.user_id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={collaborator.avatar_url} />
                      <AvatarFallback
                        style={{ backgroundColor: collaborator.color }}
                        className="text-white text-xs"
                      >
                        {getInitials(collaborator.user_name, collaborator.user_email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {collaborator.user_name || collaborator.user_email}
                        {collaborator.user_id === currentUserId && (
                          <span className="text-muted-foreground ml-1">(You)</span>
                        )}
                      </p>
                      {collaborator.user_name && collaborator.user_email && (
                        <p className="text-xs text-muted-foreground">
                          {collaborator.user_email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onChangePermission && collaborator.user_id !== currentUserId ? (
                      <Select
                        defaultValue="editor"
                        onValueChange={(v) => 
                          onChangePermission(collaborator.user_id, v as CollaborationPermission)
                        }
                      >
                        <SelectTrigger className="w-[110px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PERMISSION_LEVELS)
                            .filter(([key]) => key !== 'owner')
                            .map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                <span className="text-xs">{value.label}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Owner
                      </Badge>
                    )}
                    {onRemoveCollaborator && collaborator.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(collaborator.user_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickShareDialog;
