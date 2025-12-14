import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, Building, Globe, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import type { Workspace, WorkspaceSettings } from '@/types/workspace';
import { WORKSPACE_COLORS, WORKSPACE_ICONS } from '@/types/workspace';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkspace: (data: Partial<Workspace>) => Promise<Workspace | null>;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  open,
  onOpenChange,
  onCreateWorkspace
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Folder');
  const [selectedColor, setSelectedColor] = useState(WORKSPACE_COLORS[0]);
  const [visibility, setVisibility] = useState<'private' | 'internal' | 'public'>('private');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const workspace = await onCreateWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
        visibility,
        settings: {
          allow_external_sharing: visibility === 'public',
          require_approval_for_join: visibility === 'private',
          default_member_role: 'editor',
          allow_member_invite: true,
          auto_version_enabled: true,
          notification_preferences: {
            new_document: true,
            document_updated: true,
            member_joined: true,
            member_left: true,
            comment_added: true,
            mention: true
          }
        }
      });

      if (workspace) {
        onOpenChange(false);
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setDescription('');
    setSelectedIcon('Folder');
    setSelectedColor(WORKSPACE_COLORS[0]);
    setVisibility('private');
  };

  const DynamicIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Icons.Folder>) => {
    const IconComponent = (Icons as any)[name] || Icons.Folder;
    return <IconComponent {...props} />;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Set up your workspace name and description'}
            {step === 2 && 'Choose an icon and color for your workspace'}
            {step === 3 && 'Set the visibility and access settings'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Marketing Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What is this workspace for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Icon</Label>
              <ScrollArea className="h-[160px] border rounded-lg p-3">
                <div className="grid grid-cols-8 gap-2">
                  {WORKSPACE_ICONS.map((iconName) => (
                    <Button
                      key={iconName}
                      variant={selectedIcon === iconName ? 'default' : 'ghost'}
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setSelectedIcon(iconName)}
                    >
                      <DynamicIcon name={iconName} className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {WORKSPACE_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  <DynamicIcon 
                    name={selectedIcon} 
                    className="w-6 h-6"
                    style={{ color: selectedColor }}
                  />
                </div>
                <div>
                  <p className="font-medium">{name || 'Workspace Name'}</p>
                  <p className="text-sm text-muted-foreground">
                    {description || 'Workspace description'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Label>Visibility</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)}>
              <div 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  visibility === 'private' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
                onClick={() => setVisibility('private')}
              >
                <RadioGroupItem value="private" id="private" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <Label htmlFor="private" className="font-medium cursor-pointer">Private</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only invited members can access this workspace
                  </p>
                </div>
              </div>

              <div 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  visibility === 'internal' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
                onClick={() => setVisibility('internal')}
              >
                <RadioGroupItem value="internal" id="internal" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <Label htmlFor="internal" className="font-medium cursor-pointer">Internal</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Anyone in your organization can find and request access
                  </p>
                </div>
              </div>

              <div 
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  visibility === 'public' ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                }`}
                onClick={() => setVisibility('public')}
              >
                <RadioGroupItem value="public" id="public" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <Label htmlFor="public" className="font-medium cursor-pointer">Public</Label>
                    <Badge variant="secondary" className="text-xs">Pro</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Anyone with the link can view documents
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !name.trim()}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Workspace'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
