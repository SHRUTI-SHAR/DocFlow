import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Search,
  Grid,
  List,
  Users,
  FolderOpen,
  HardDrive,
  Settings,
  MoreHorizontal,
  Star,
  StarOff,
  Archive,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  Building,
  Clock,
  FileText,
  TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import type { Workspace, WorkspaceRole } from '@/types/workspace';
import { formatStorageSize, WORKSPACE_ROLE_INFO } from '@/types/workspace';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';
import { WorkspaceDetail } from './WorkspaceDetail';
import * as Icons from 'lucide-react';

interface WorkspaceDashboardProps {
  onNavigateToWorkspace?: (workspaceId: string) => void;
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  onNavigateToWorkspace
}) => {
  const { workspaces, loading, createWorkspace, deleteWorkspace, archiveWorkspace } = useWorkspaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const filteredWorkspaces = workspaces.filter(ws => {
    const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ws.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'favorites') return matchesSearch && favorites.has(ws.id);
    if (activeTab === 'owned') return matchesSearch && ws.my_role === 'owner';
    if (activeTab === 'shared') return matchesSearch && ws.my_role !== 'owner';
    if (activeTab === 'archived') return matchesSearch && ws.is_archived;
    return matchesSearch && !ws.is_archived;
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getVisibilityIcon = (visibility: Workspace['visibility']) => {
    switch (visibility) {
      case 'private': return <Lock className="w-3 h-3" />;
      case 'internal': return <Building className="w-3 h-3" />;
      case 'public': return <Globe className="w-3 h-3" />;
    }
  };

  const getVisibilityLabel = (visibility: Workspace['visibility']) => {
    switch (visibility) {
      case 'private': return 'Private';
      case 'internal': return 'Internal';
      case 'public': return 'Public';
    }
  };

  const getRoleBadgeVariant = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const DynamicIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Icons.Folder>) => {
    const IconComponent = (Icons as any)[name] || Icons.Folder;
    return <IconComponent {...props} />;
  };

  const WorkspaceCard = ({ workspace }: { workspace: Workspace }) => (
    <Card 
      className="group hover:shadow-lg transition-all cursor-pointer border-border/50 hover:border-primary/30"
      onClick={() => setSelectedWorkspace(workspace)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${workspace.color}20` }}
            >
              <DynamicIcon 
                name={workspace.icon || 'Folder'} 
                className="w-5 h-5"
                style={{ color: workspace.color }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{workspace.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  {getVisibilityIcon(workspace.visibility)}
                  {getVisibilityLabel(workspace.visibility)}
                </Badge>
                {workspace.my_role && (
                  <Badge variant={getRoleBadgeVariant(workspace.my_role)} className="text-xs">
                    {WORKSPACE_ROLE_INFO[workspace.my_role].label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(workspace.id);
              }}
            >
              {favorites.has(workspace.id) ? (
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedWorkspace(workspace)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => archiveWorkspace(workspace.id)}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                {workspace.my_role === 'owner' && (
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => deleteWorkspace(workspace.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {workspace.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {workspace.description}
          </p>
        )}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{workspace.members_count || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span>{workspace.documents_count || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span>{formatStorageSize(workspace.storage_used || 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const WorkspaceListItem = ({ workspace }: { workspace: Workspace }) => (
    <div 
      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
      onClick={() => setSelectedWorkspace(workspace)}
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${workspace.color}20` }}
      >
        <DynamicIcon 
          name={workspace.icon || 'Folder'} 
          className="w-5 h-5"
          style={{ color: workspace.color }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{workspace.name}</h3>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            {getVisibilityIcon(workspace.visibility)}
            {getVisibilityLabel(workspace.visibility)}
          </Badge>
          {workspace.my_role && (
            <Badge variant={getRoleBadgeVariant(workspace.my_role)} className="text-xs">
              {WORKSPACE_ROLE_INFO[workspace.my_role].label}
            </Badge>
          )}
        </div>
        {workspace.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {workspace.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{workspace.members_count || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>{workspace.documents_count || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          <span>{formatStorageSize(workspace.storage_used || 0)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(workspace.id);
          }}
        >
          {favorites.has(workspace.id) ? (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedWorkspace(workspace)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => archiveWorkspace(workspace.id)}>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
            {workspace.my_role === 'owner' && (
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => deleteWorkspace(workspace.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  if (selectedWorkspace) {
    return (
      <WorkspaceDetail 
        workspace={selectedWorkspace}
        onBack={() => setSelectedWorkspace(null)}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Team Workspaces</h1>
                <p className="text-muted-foreground">Collaborate with your team on shared documents</p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Workspace
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{workspaces.length}</p>
                    <p className="text-sm text-muted-foreground">Total Workspaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {workspaces.reduce((sum, ws) => sum + (ws.members_count || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {workspaces.reduce((sum, ws) => sum + (ws.documents_count || 0), 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Documents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <HardDrive className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatStorageSize(workspaces.reduce((sum, ws) => sum + (ws.storage_used || 0), 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Workspaces</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="owned">Owned by Me</TabsTrigger>
            <TabsTrigger value="shared">Shared with Me</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading workspaces...</div>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FolderOpen className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workspaces found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Create your first workspace to start collaborating'}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workspace
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWorkspaces.map((workspace) => (
                  <WorkspaceListItem key={workspace.id} workspace={workspace} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateWorkspaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateWorkspace={createWorkspace}
      />
    </div>
  );
};
