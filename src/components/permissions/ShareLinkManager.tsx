import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Link, Copy, Plus, MoreVertical, Trash2, 
  Lock, Calendar, Users, ExternalLink, Check,
  Eye, Edit, Settings
} from 'lucide-react';
import { ShareLink, PermissionLevel } from '@/types/permissions';
import { PermissionSelector } from './PermissionSelector';
import { PermissionBadge } from './PermissionBadge';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ShareLinkManagerProps {
  links: ShareLink[];
  onCreateLink: (params: CreateLinkParams) => Promise<ShareLink | null>;
  onRevokeLink: (linkId: string) => Promise<boolean>;
  onUpdateLink: (linkId: string, params: Partial<ShareLink>) => Promise<boolean>;
  baseUrl?: string;
  canManage?: boolean;
}

interface CreateLinkParams {
  level: PermissionLevel;
  expiresAt?: string;
  passwordProtected?: boolean;
  password?: string;
  maxUses?: number;
  allowedEmails?: string[];
  requireEmail?: boolean;
}

export const ShareLinkManager: React.FC<ShareLinkManagerProps> = ({
  links,
  onCreateLink,
  onRevokeLink,
  onUpdateLink,
  baseUrl = window.location.origin,
  canManage = true
}) => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Create form state
  const [newLevel, setNewLevel] = useState<PermissionLevel>('viewer');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDays, setExpiryDays] = useState(7);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState(10);
  const [requireEmail, setRequireEmail] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    
    const params: CreateLinkParams = {
      level: newLevel,
      passwordProtected: hasPassword,
      password: hasPassword ? password : undefined,
      maxUses: hasMaxUses ? maxUses : undefined,
      expiresAt: hasExpiry 
        ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      requireEmail
    };

    const link = await onCreateLink(params);
    
    if (link) {
      setCreateDialogOpen(false);
      resetForm();
    }
    
    setIsCreating(false);
  };

  const resetForm = () => {
    setNewLevel('viewer');
    setHasExpiry(false);
    setExpiryDays(7);
    setHasPassword(false);
    setPassword('');
    setHasMaxUses(false);
    setMaxUses(10);
    setRequireEmail(false);
  };

  const copyLink = async (link: ShareLink) => {
    const url = `${baseUrl}/share/${link.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard'
    });
  };

  const getLinkStatus = (link: ShareLink) => {
    if (!link.is_active) return { label: 'Revoked', color: 'destructive' };
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { label: 'Expired', color: 'secondary' };
    }
    if (link.max_uses && link.use_count >= link.max_uses) {
      return { label: 'Limit reached', color: 'secondary' };
    }
    return { label: 'Active', color: 'default' };
  };

  const activeLinks = links.filter(l => l.is_active);
  const inactiveLinks = links.filter(l => !l.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link className="h-5 w-5" />
            Share Links
          </CardTitle>
          <CardDescription>
            Create and manage shareable links
          </CardDescription>
        </div>
        
        {canManage && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Share Link</DialogTitle>
                <DialogDescription>
                  Generate a link to share this resource with others
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <PermissionSelector
                    value={newLevel}
                    onChange={setNewLevel}
                    maxLevel="editor"
                    excludeLevels={['none', 'owner', 'admin']}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Set Expiration</Label>
                    <p className="text-xs text-muted-foreground">
                      Link will expire after set time
                    </p>
                  </div>
                  <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
                </div>
                
                {hasExpiry && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      type="number"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(parseInt(e.target.value) || 1)}
                      min={1}
                      max={365}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password Protected
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Require password to access
                    </p>
                  </div>
                  <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
                </div>
                
                {hasPassword && (
                  <div className="pl-4">
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Limit Uses
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Maximum number of times link can be used
                    </p>
                  </div>
                  <Switch checked={hasMaxUses} onCheckedChange={setHasMaxUses} />
                </div>
                
                {hasMaxUses && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                      min={1}
                      max={1000}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">uses</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Users must enter email to access
                    </p>
                  </div>
                  <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[400px]">
          {activeLinks.length === 0 && inactiveLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No share links created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLinks.map((link) => {
                const status = getLinkStatus(link);
                
                return (
                  <div 
                    key={link.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <PermissionBadge level={link.permission_level} size="sm" />
                        <Badge variant={status.color as any} className="text-xs">
                          {status.label}
                        </Badge>
                        {link.password_protected && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-4">
                          <span>
                            Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                          </span>
                          {link.use_count > 0 && (
                            <span>
                              {link.use_count} {link.max_uses ? `/ ${link.max_uses}` : ''} uses
                            </span>
                          )}
                        </div>
                        {link.expires_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(link)}
                        className="h-8 w-8"
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`${baseUrl}/share/${link.token}`, '_blank')}
                        className="h-8 w-8"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => onRevokeLink(link.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Revoke Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })}

              {inactiveLinks.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <p className="text-xs text-muted-foreground mb-2">Inactive Links</p>
                  {inactiveLinks.map((link) => (
                    <div 
                      key={link.id}
                      className="flex items-center gap-3 p-3 border rounded-lg opacity-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <PermissionBadge level={link.permission_level} size="sm" />
                          <Badge variant="secondary" className="text-xs">Revoked</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
