import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Lock,
  Building,
  Globe,
  Bell,
  Shield,
  Download,
  Archive,
  Trash2,
  Crown,
  HardDrive,
  FileType,
  Clock,
  UserPlus
} from 'lucide-react';
import type { Workspace, WorkspaceRole } from '@/types/workspace';
import { WORKSPACE_ROLE_INFO, formatStorageSize } from '@/types/workspace';

interface WorkspaceSettingsPanelProps {
  workspace: Workspace;
}

export const WorkspaceSettingsPanel: React.FC<WorkspaceSettingsPanelProps> = ({
  workspace
}) => {
  const [settings, setSettings] = useState(workspace.settings);
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Basic workspace information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Access Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Access & Permissions
          </CardTitle>
          <CardDescription>
            Control who can access and what they can do
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Who can find this workspace
              </p>
            </div>
            <Select defaultValue={workspace.visibility}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="internal">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Internal
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Public
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Allow Member Invitations
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow members to invite others
              </p>
            </div>
            <Switch
              checked={settings.allow_member_invite}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allow_member_invite: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval to Join</Label>
              <p className="text-sm text-muted-foreground">
                New members need admin approval
              </p>
            </div>
            <Switch
              checked={settings.require_approval_for_join}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, require_approval_for_join: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Default Member Role</Label>
              <p className="text-sm text-muted-foreground">
                Role assigned to new members
              </p>
            </div>
            <Select
              value={settings.default_member_role}
              onValueChange={(value) =>
                setSettings({ ...settings, default_member_role: value as WorkspaceRole })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="commenter">Commenter</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Download Restrictions</Label>
              <p className="text-sm text-muted-foreground">
                Who can download documents
              </p>
            </div>
            <Select
              value={settings.download_restrictions || 'none'}
              onValueChange={(value) =>
                setSettings({ ...settings, download_restrictions: value as any })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Everyone</SelectItem>
                <SelectItem value="members_only">Members Only</SelectItem>
                <SelectItem value="admins_only">Admins Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage & Files
          </CardTitle>
          <CardDescription>
            Manage storage limits and file settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage Used</span>
              <span className="text-sm">
                {formatStorageSize(workspace.storage_used || 0)}
                {settings.storage_quota_bytes && (
                  <> / {formatStorageSize(settings.storage_quota_bytes)}</>
                )}
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{
                  width: settings.storage_quota_bytes
                    ? `${((workspace.storage_used || 0) / settings.storage_quota_bytes) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Auto-Versioning
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically create versions on save
              </p>
            </div>
            <Switch
              checked={settings.auto_version_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, auto_version_enabled: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Watermark Documents</Label>
              <p className="text-sm text-muted-foreground">
                Add watermark when downloading
              </p>
            </div>
            <Switch
              checked={settings.watermark_enabled || false}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, watermark_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure workspace notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(settings.notification_preferences).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <Label className="capitalize">
                {key.replace(/_/g, ' ')}
              </Label>
              <Switch
                checked={value}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      [key]: checked
                    }
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect the entire workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Archive Workspace</p>
              <p className="text-sm text-muted-foreground">
                Hide this workspace from the list. Can be restored later.
              </p>
            </div>
            <Button variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <p className="font-medium">Delete Workspace</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this workspace and all its contents.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    workspace "{workspace.name}" and all its documents, folders, and settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Workspace
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {workspace.my_role === 'owner' && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Transfer Ownership</p>
                <p className="text-sm text-muted-foreground">
                  Transfer ownership to another admin.
                </p>
              </div>
              <Button variant="outline">
                <Crown className="w-4 h-4 mr-2" />
                Transfer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
