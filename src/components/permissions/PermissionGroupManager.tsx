import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Users, Plus, MoreVertical, Trash2, 
  ChevronDown, UserPlus, Crown, Settings,
  Pencil
} from 'lucide-react';
import { PermissionGroup, GroupMember } from '@/types/permissions';
import { cn } from '@/lib/utils';

interface PermissionGroupManagerProps {
  groups: PermissionGroup[];
  onCreateGroup: (name: string, description?: string) => Promise<PermissionGroup | null>;
  onDeleteGroup: (groupId: string) => Promise<boolean>;
  onAddMember: (groupId: string, userId: string, role?: 'member' | 'manager') => Promise<boolean>;
  onRemoveMember: (groupId: string, userId: string) => Promise<boolean>;
  onLoadMembers?: (groupId: string) => Promise<GroupMember[]>;
  canManage?: boolean;
}

export const PermissionGroupManager: React.FC<PermissionGroupManagerProps> = ({
  groups,
  onCreateGroup,
  onDeleteGroup,
  onAddMember,
  onRemoveMember,
  onLoadMembers,
  canManage = true
}) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    
    setIsCreating(true);
    const group = await onCreateGroup(newName.trim(), newDescription.trim() || undefined);
    
    if (group) {
      setCreateDialogOpen(false);
      setNewName('');
      setNewDescription('');
    }
    
    setIsCreating(false);
  };

  const toggleGroup = async (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      
      // Load members if not already loaded
      if (!groupMembers[groupId] && onLoadMembers) {
        const members = await onLoadMembers(groupId);
        setGroupMembers(prev => ({ ...prev, [groupId]: members }));
      }
    }
    
    setExpandedGroups(newExpanded);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="text-xs"><Crown className="h-3 w-3 mr-1" /> Owner</Badge>;
      case 'manager':
        return <Badge variant="secondary" className="text-xs"><Settings className="h-3 w-3 mr-1" /> Manager</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Permission Groups
          </CardTitle>
          <CardDescription>
            Organize users into groups for easier permission management
          </CardDescription>
        </div>
        
        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Permission Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize users with similar permissions
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Marketing Team"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Brief description of this group"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={isCreating || !newName.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[500px]">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No groups created yet</p>
              {canManage && (
                <p className="text-xs mt-1">Create a group to organize users</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const members = groupMembers[group.id] || [];
                
                return (
                  <Collapsible 
                    key={group.id}
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(group.id)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-3 p-3 hover:bg-muted/30">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            "bg-primary/10 text-primary"
                          )}>
                            <Users className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{group.name}</span>
                              {group.is_default && (
                                <Badge variant="outline" className="text-xs">Default</Badge>
                              )}
                            </div>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">
                                {group.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {group.member_count || members.length} members
                            </Badge>
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )} />
                          </div>

                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setAddMemberDialogOpen(group.id)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add Member
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Group
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onDeleteGroup(group.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Group
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <Separator />
                        <div className="p-3 space-y-2">
                          {members.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No members in this group
                            </p>
                          ) : (
                            members.map((member) => (
                              <div 
                                key={member.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30"
                              >
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.user?.avatar_url} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(member.user?.name, member.user?.email)}
                                  </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">
                                      {member.user?.name || member.user?.email}
                                    </span>
                                    {getRoleBadge(member.role)}
                                  </div>
                                  {member.user?.name && member.user?.email && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {member.user.email}
                                    </p>
                                  )}
                                </div>

                                {canManage && member.role !== 'owner' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onRemoveMember(group.id, member.user_id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))
                          )}

                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => setAddMemberDialogOpen(group.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Member
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Add Member Dialog */}
        <Dialog 
          open={!!addMemberDialogOpen} 
          onOpenChange={(open) => !open && setAddMemberDialogOpen(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Group Member</DialogTitle>
              <DialogDescription>
                Add a user to this group by their email address
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMemberDialogOpen(null)}>
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (addMemberDialogOpen && newMemberEmail) {
                    // Note: In real implementation, you'd look up user by email
                    await onAddMember(addMemberDialogOpen, newMemberEmail);
                    setAddMemberDialogOpen(null);
                    setNewMemberEmail('');
                  }
                }}
                disabled={!newMemberEmail}
              >
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
