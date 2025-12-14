import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield, Users, Link, KeyRound, History,
  UserPlus, Search, MoreVertical, Trash2,
  Crown, Settings, Edit, Eye, MessageSquare,
  GitPullRequest, ArrowRightLeft
} from 'lucide-react';
import { 
  ResourcePermission, 
  PermissionLevel, 
  PermissionGroup,
  ShareLink,
  PermissionRequest,
  PERMISSION_LEVEL_INFO
} from '@/types/permissions';
import { PermissionBadge } from './PermissionBadge';
import { PermissionSelector } from './PermissionSelector';
import { PermissionMatrix } from './PermissionMatrix';
import { ShareLinkManager } from './ShareLinkManager';
import { PermissionGroupManager } from './PermissionGroupManager';
import { AccessRequestPanel } from './AccessRequestPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface PermissionsDashboardProps {
  resourceType: 'document' | 'folder' | 'template' | 'workflow' | 'form' | 'workspace';
  resourceId: string;
  resourceName?: string;
  userId?: string;
}

export const PermissionsDashboard: React.FC<PermissionsDashboardProps> = ({
  resourceType,
  resourceId,
  resourceName,
  userId
}) => {
  const [activeTab, setActiveTab] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevel, setInviteLevel] = useState<PermissionLevel>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');

  const {
    permissions,
    groups,
    shareLinks,
    requests,
    effectivePermission,
    isLoading,
    isOwner,
    isAdmin,
    grantPermission,
    revokePermission,
    updatePermission,
    createGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    createShareLink,
    revokeShareLink,
    updateShareLink,
    requestAccess,
    approveRequest,
    denyRequest,
    transferOwnership,
    refresh
  } = usePermissions({
    resourceType,
    resourceId,
    userId
  });

  const canManage = isOwner || isAdmin;

  const handleInvite = async () => {
    setIsInviting(true);
    // In real implementation, look up user by email
    await grantPermission({
      granteeType: 'user',
      granteeId: inviteEmail, // This would be the actual user ID
      level: inviteLevel
    });
    setInviteDialogOpen(false);
    setInviteEmail('');
    setInviteLevel('viewer');
    setIsInviting(false);
  };

  const handleTransferOwnership = async () => {
    // In real implementation, look up user by email
    await transferOwnership(transferEmail);
    setTransferDialogOpen(false);
    setTransferEmail('');
  };

  const getInitials = (email?: string) => {
    if (email) return email[0].toUpperCase();
    return '?';
  };

  // Filter permissions by search
  const filteredPermissions = permissions.filter(p => {
    if (!searchQuery) return true;
    return p.grantee_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const userPermissions = filteredPermissions.filter(p => p.grantee_type === 'user');
  const groupPermissions = filteredPermissions.filter(p => p.grantee_type === 'group');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permissions
          </h2>
          {resourceName && (
            <p className="text-muted-foreground">{resourceName}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Your access */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Your access:</span>
            <PermissionBadge level={effectivePermission?.permission_level || 'none'} />
          </div>

          {canManage && (
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite People
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite People</DialogTitle>
                  <DialogDescription>
                    Add people to access this {resourceType}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permission Level</label>
                    <PermissionSelector
                      value={inviteLevel}
                      onChange={setInviteLevel}
                      maxLevel={isOwner ? 'admin' : 'editor'}
                      excludeLevels={['none', 'owner']}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                    {isInviting ? 'Inviting...' : 'Send Invite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="people" className="gap-2">
            <Users className="h-4 w-4" />
            People
            {userPermissions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{userPermissions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link className="h-4 w-4" />
            Links
            {shareLinks.length > 0 && (
              <Badge variant="secondary" className="ml-1">{shareLinks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <KeyRound className="h-4 w-4" />
            Requests
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {requests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Settings className="h-4 w-4" />
            Matrix
          </TabsTrigger>
        </TabsList>

        {/* People Tab */}
        <TabsContent value="people" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                {userPermissions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No people have access yet</p>
                    {canManage && (
                      <Button 
                        variant="link" 
                        onClick={() => setInviteDialogOpen(true)}
                        className="mt-2"
                      >
                        Invite someone
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {userPermissions.map((perm) => (
                      <div 
                        key={perm.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/30"
                      >
                        <Avatar>
                          <AvatarFallback>{getInitials(perm.grantee_id)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{perm.grantee_id}</p>
                          {perm.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(perm.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {canManage && perm.permission_level !== 'owner' ? (
                            <PermissionSelector
                              value={perm.permission_level}
                              onChange={(level) => updatePermission(perm.id, level)}
                              maxLevel={isOwner ? 'admin' : 'editor'}
                              excludeLevels={['none', 'owner']}
                              size="sm"
                            />
                          ) : (
                            <PermissionBadge level={perm.permission_level} />
                          )}

                          {canManage && perm.permission_level !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => revokePermission(perm.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Transfer Ownership */}
          {isOwner && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer Ownership
                </CardTitle>
                <CardDescription>
                  Transfer ownership to another user. You will become an admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="text-amber-600 border-amber-500/50">
                      Transfer Ownership
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Transfer Ownership</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. The new owner will have full control.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <Input
                        type="email"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        placeholder="New owner's email"
                      />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleTransferOwnership}
                        disabled={!transferEmail}
                      >
                        Transfer Ownership
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups">
          <PermissionGroupManager
            groups={groups}
            onCreateGroup={createGroup}
            onDeleteGroup={deleteGroup}
            onAddMember={addGroupMember}
            onRemoveMember={removeGroupMember}
            canManage={canManage}
          />
        </TabsContent>

        {/* Links Tab */}
        <TabsContent value="links">
          <ShareLinkManager
            links={shareLinks}
            onCreateLink={createShareLink}
            onRevokeLink={revokeShareLink}
            onUpdateLink={updateShareLink}
            canManage={canManage}
          />
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <AccessRequestPanel
            requests={requests}
            onApprove={approveRequest}
            onDeny={denyRequest}
            onRequestAccess={!canManage ? requestAccess : undefined}
            currentLevel={effectivePermission?.permission_level}
            canManage={canManage}
            showRequestForm={!canManage && effectivePermission?.permission_level !== 'owner'}
          />
        </TabsContent>

        {/* Matrix Tab */}
        <TabsContent value="matrix">
          <PermissionMatrix
            selectedLevel={effectivePermission?.permission_level}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
