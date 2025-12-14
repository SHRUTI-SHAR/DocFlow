import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Settings,
  Users,
  FileText,
  FolderOpen,
  Activity,
  Upload,
  UserPlus,
  MoreHorizontal,
  Crown,
  Shield,
  Edit,
  Eye,
  MessageSquare,
  Clock,
  HardDrive,
  Lock,
  Building,
  Globe,
  Trash2,
  Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useWorkspaceMembers, useWorkspaceActivity } from '@/hooks/useWorkspaces';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/types/workspace';
import { formatStorageSize, WORKSPACE_ROLE_INFO, hasWorkspaceRole } from '@/types/workspace';
import { WorkspaceMembersPanel } from './WorkspaceMembersPanel';
import { WorkspaceSettingsPanel } from './WorkspaceSettingsPanel';
import * as Icons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceDetailProps {
  workspace: Workspace;
  onBack: () => void;
}

export const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({
  workspace,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState('documents');
  const { members, loading: membersLoading, inviteMember, updateMemberRole, removeMember } = useWorkspaceMembers(workspace.id);
  const { activities, loading: activitiesLoading } = useWorkspaceActivity(workspace.id);

  const canManageMembers = workspace.my_role && hasWorkspaceRole(workspace.my_role, 'admin');
  const canUpload = workspace.my_role && hasWorkspaceRole(workspace.my_role, 'editor');
  const canManageSettings = workspace.my_role && hasWorkspaceRole(workspace.my_role, 'admin');

  const storagePercentUsed = workspace.settings.storage_quota_bytes
    ? ((workspace.storage_used || 0) / workspace.settings.storage_quota_bytes) * 100
    : 0;

  const DynamicIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Icons.Folder>) => {
    const IconComponent = (Icons as any)[name] || Icons.Folder;
    return <IconComponent {...props} />;
  };

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3" />;
      case 'admin': return <Shield className="w-3 h-3" />;
      case 'editor': return <Edit className="w-3 h-3" />;
      case 'commenter': return <MessageSquare className="w-3 h-3" />;
      case 'viewer': return <Eye className="w-3 h-3" />;
    }
  };

  const getVisibilityIcon = (visibility: Workspace['visibility']) => {
    switch (visibility) {
      case 'private': return <Lock className="w-4 h-4" />;
      case 'internal': return <Building className="w-4 h-4" />;
      case 'public': return <Globe className="w-4 h-4" />;
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('document')) return <FileText className="w-4 h-4" />;
    if (action.includes('member')) return <Users className="w-4 h-4" />;
    if (action.includes('folder')) return <FolderOpen className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const formatActivityMessage = (activity: typeof activities[0]) => {
    const userName = activity.user?.name || 'Someone';
    switch (activity.action) {
      case 'document_added':
        return <><strong>{userName}</strong> added <strong>{activity.resource_name}</strong></>;
      case 'document_updated':
        return <><strong>{userName}</strong> updated <strong>{activity.resource_name}</strong></>;
      case 'document_removed':
        return <><strong>{userName}</strong> removed <strong>{activity.resource_name}</strong></>;
      case 'member_joined':
        return <><strong>{activity.resource_name}</strong> joined the workspace</>;
      case 'member_left':
        return <><strong>{activity.resource_name}</strong> left the workspace</>;
      case 'member_invited':
        return <><strong>{userName}</strong> invited <strong>{activity.resource_name}</strong></>;
      case 'folder_created':
        return <><strong>{userName}</strong> created folder <strong>{activity.resource_name}</strong></>;
      default:
        return <><strong>{userName}</strong> performed an action</>;
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${workspace.color}20` }}
            >
              <DynamicIcon 
                name={workspace.icon || 'Folder'} 
                className="w-6 h-6"
                style={{ color: workspace.color }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{workspace.name}</h1>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getVisibilityIcon(workspace.visibility)}
                  {workspace.visibility.charAt(0).toUpperCase() + workspace.visibility.slice(1)}
                </Badge>
                {workspace.my_role && (
                  <Badge className="flex items-center gap-1">
                    {getRoleIcon(workspace.my_role)}
                    {WORKSPACE_ROLE_INFO[workspace.my_role].label}
                  </Badge>
                )}
              </div>
              {workspace.description && (
                <p className="text-muted-foreground mt-1">{workspace.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canUpload && (
                <Button className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
              )}
              {canManageMembers && (
                <Button variant="outline" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Invite
                </Button>
              )}
              {canManageSettings && (
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold">{workspace.documents_count || 0}</p>
                  </div>
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold">{workspace.members_count || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">{formatStorageSize(workspace.storage_used || 0)}</p>
                  </div>
                  <HardDrive className="w-8 h-8 text-muted-foreground/50" />
                </div>
                {workspace.settings.storage_quota_bytes && (
                  <Progress value={storagePercentUsed} className="h-1 mt-2" />
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Now</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex -space-x-2">
                        {members.slice(0, 3).map((member) => (
                          <Avatar key={member.id} className="w-8 h-8 border-2 border-background">
                            <AvatarImage src={member.user?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {member.user?.name?.charAt(0) || member.user?.email?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {members.length > 3 && (
                        <span className="text-sm text-muted-foreground">
                          +{members.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
              <Badge variant="secondary" className="ml-1 text-xs">
                {workspace.members_count || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            {canManageSettings && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="documents" className="mt-0">
            <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg bg-muted/20">
              <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload documents to share with your team
              </p>
              {canUpload && (
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <WorkspaceMembersPanel
              members={members}
              loading={membersLoading}
              canManage={canManageMembers || false}
              currentUserRole={workspace.my_role || 'viewer'}
              onInvite={inviteMember}
              onUpdateRole={updateMemberRole}
              onRemove={removeMember}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No activity yet</div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              {formatActivityMessage(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageSettings && (
            <TabsContent value="settings" className="mt-0">
              <WorkspaceSettingsPanel workspace={workspace} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};
