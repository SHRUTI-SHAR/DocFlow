import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Link, 
  Send, 
  Settings, 
  Users, 
  Pencil, 
  Eye, 
  X,
  Check,
  Copy,
  Globe,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentUrl: string;
  onShare: (emails: string[], permission: string, message: string) => Promise<void>;
}

interface SharedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'view' | 'edit';
}

export const ShareDocumentDialog: React.FC<ShareDocumentDialogProps> = ({
  open,
  onOpenChange,
  documentName,
  documentUrl,
  onShare
}) => {
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [addedEmails, setAddedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkAccess, setLinkAccess] = useState<'restricted' | 'anyone'>('restricted');
  
  // Mock shared users - in real app, fetch from database
  const [sharedUsers] = useState<SharedUser[]>([
    { id: '1', email: 'deep@simplifyai.id', name: 'Deep Bhau', permission: 'edit' },
  ]);

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim()) {
      e.preventDefault();
      const email = emailInput.trim().toLowerCase();
      
      // Simple email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        return;
      }
      
      if (!addedEmails.includes(email)) {
        setAddedEmails([...addedEmails, email]);
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setAddedEmails(addedEmails.filter(e => e !== email));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(documentUrl);
      toast({
        title: "Link copied",
        description: "Document link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleSend = async () => {
    if (addedEmails.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onShare(addedEmails, permission, message);
      toast({
        title: "Shared successfully",
        description: `Document shared with ${addedEmails.length} people`,
      });
      setAddedEmails([]);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share the document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const truncatedName = documentName.length > 30 
    ? `${documentName.substring(0, 15)}...${documentName.substring(documentName.length - 12)}`
    : documentName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Share "{truncatedName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Email Input with Permission Dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Add a name, group, or email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleAddEmail}
                className="pl-10 pr-4"
              />
            </div>
            <Select value={permission} onValueChange={(v: 'view' | 'edit') => setPermission(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Can view
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    Can edit
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Added Emails */}
          {addedEmails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {addedEmails.map(email => (
                <Badge 
                  key={email} 
                  variant="secondary"
                  className="flex items-center gap-1 pl-2 pr-1 py-1"
                >
                  {email}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveEmail(email)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Message Input */}
          <Textarea
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          {/* Currently Shared With */}
          {sharedUsers.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Shared with</p>
              <div className="space-y-2">
                {sharedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.permission === 'edit' ? 'Can edit' : 'Can view'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {/* Shared Users Avatars */}
            <div className="flex -space-x-2">
              {sharedUsers.slice(0, 3).map(user => (
                <Avatar key={user.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {sharedUsers.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{sharedUsers.length - 3}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Copy Link Button */}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <Link className="w-4 h-4" />
              Copy link
            </Button>
            
            {/* Link Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLinkAccess('restricted')}>
                  <Lock className="w-4 h-4 mr-2" />
                  Restricted
                  {linkAccess === 'restricted' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLinkAccess('anyone')}>
                  <Globe className="w-4 h-4 mr-2" />
                  Anyone with the link
                  {linkAccess === 'anyone' && <Check className="w-4 h-4 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Send Button */}
            <Button 
              onClick={handleSend}
              disabled={addedEmails.length === 0 || loading}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
