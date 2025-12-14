import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Edit,
  Eye,
  MessageSquare,
  Clock,
  Trash2,
  Mail,
  Search,
  Check,
  X
} from 'lucide-react';
import type { WorkspaceMember, WorkspaceRole } from '@/types/workspace';
import { WORKSPACE_ROLE_INFO, hasWorkspaceRole } from '@/types/workspace';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceMembersPanelProps {
  members: WorkspaceMember[];
  loading: boolean;
  canManage: boolean;
  currentUserRole: WorkspaceRole;
  onInvite: (email: string, role: WorkspaceRole, message?: string) => Promise<boolean>;
  onUpdateRole: (memberId: string, newRole: WorkspaceRole) => Promise<boolean>;
  onRemove: (memberId: string) => Promise<boolean>;
}

export const WorkspaceMembersPanel: React.FC<WorkspaceMembersPanelProps> = ({
  members,
  loading,
  canManage,
  currentUserRole,
  onInvite,
  onUpdateRole,
  onRemove
}) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('editor');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = members.filter(member =>
    member.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMembers = {
    owners: filteredMembers.filter(m => m.role === 'owner'),
    admins: filteredMembers.filter(m => m.role === 'admin'),
    editors: filteredMembers.filter(m => m.role === 'editor'),
    commenters: filteredMembers.filter(m => m.role === 'commenter'),
    viewers: filteredMembers.filter(m => m.role === 'viewer'),
    pending: filteredMembers.filter(m => m.status === 'pending')
  };

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-amber-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'editor': return <Edit className="w-4 h-4 text-green-500" />;
      case 'commenter': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const canModifyMember = (memberRole: WorkspaceRole) => {
    if (!canManage) return false;
    if (currentUserRole === 'owner') return memberRole !== 'owner';
    if (currentUserRole === 'admin') return memberRole !== 'owner' && memberRole !== 'admin';
    return false;
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const success = await onInvite(inviteEmail.trim(), inviteRole, inviteMessage.trim() || undefined);
      if (success) {
        setShowInviteDialog(false);
        setInviteEmail('');
        setInviteRole('editor');
        setInviteMessage('');
      }
    } finally {
      setInviting(false);
    }
  };

  const MemberRow = ({ member }: { member: WorkspaceMember }) => (
    <div className="flex items-center gap-4 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
      <Avatar className="w-10 h-10">
        <AvatarImage src={member.user?.avatar_url} />
        <AvatarFallback>
          {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">
            {member.user?.name || member.user?.email || 'Unknown'}
          </p>
          {member.status === 'pending' && (
            <Badge variant="outline" className="text-xs">Pending</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {member.user?.email}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {getRoleIcon(member.role)}
        <span className="text-sm">{WORKSPACE_ROLE_INFO[member.role].label}</span>
      </div>
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {member.last_active_at
          ? formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })
          : 'Never'}
      </div>
      {canModifyMember(member.role) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'admin')}>
              <Shield className="w-4 h-4 mr-2" />
              Make Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'editor')}>
              <Edit className="w-4 h-4 mr-2" />
              Make Editor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'commenter')}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Make Commenter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'viewer')}>
              <Eye className="w-4 h-4 mr-2" />
              Make Viewer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => onRemove(member.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  const MemberGroup = ({ title, members, icon }: { title: string; members: WorkspaceMember[]; icon: React.ReactNode }) => {
    if (members.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 px-4">
          {icon}
          <h3 className="font-medium text-sm text-muted-foreground">
            {title} ({members.length})
          </h3>
        </div>
        <div className="border rounded-lg">
          {members.map(member => (
            <MemberRow key={member.id} member={member} />
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading members...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {canManage && (
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      <ScrollArea className="h-[500px]">
        <MemberGroup 
          title="Owners" 
          members={groupedMembers.owners} 
          icon={<Crown className="w-4 h-4 text-amber-500" />} 
        />
        <MemberGroup 
          title="Admins" 
          members={groupedMembers.admins} 
          icon={<Shield className="w-4 h-4 text-blue-500" />} 
        />
        <MemberGroup 
          title="Editors" 
          members={groupedMembers.editors} 
          icon={<Edit className="w-4 h-4 text-green-500" />} 
        />
        <MemberGroup 
          title="Commenters" 
          members={groupedMembers.commenters} 
          icon={<MessageSquare className="w-4 h-4 text-purple-500" />} 
        />
        <MemberGroup 
          title="Viewers" 
          members={groupedMembers.viewers} 
          icon={<Eye className="w-4 h-4 text-muted-foreground" />} 
        />
        {groupedMembers.pending.length > 0 && (
          <MemberGroup 
            title="Pending Invitations" 
            members={groupedMembers.pending} 
            icon={<Mail className="w-4 h-4 text-muted-foreground" />} 
          />
        )}
      </ScrollArea>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentUserRole === 'owner' && (
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  )}
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-green-500" />
                      <span>Editor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="commenter">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                      <span>Commenter</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span>Viewer</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {WORKSPACE_ROLE_INFO[inviteRole].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (optional)</Label>
              <Input
                id="message"
                placeholder="Add a personal note to your invitation"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
