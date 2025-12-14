import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Link,
  Copy,
  Check,
  Eye,
  Download,
  Edit,
  MessageSquare,
  Lock,
  Clock,
  Users,
  Mail,
  Globe,
  Shield,
  QrCode,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  X,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { 
  CreateShareLinkParams, 
  ShareLinkPermission,
  EnhancedShareLink 
} from '@/types/shareLink';
import { 
  SHARE_LINK_PERMISSION_INFO, 
  EXPIRATION_OPTIONS,
  generateShareUrl,
  generateQRCodeUrl
} from '@/types/shareLink';

interface QuickShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceType: 'document' | 'folder' | 'workspace' | 'form';
  resourceId: string;
  resourceName: string;
  onCreateLink: (params: CreateShareLinkParams) => Promise<EnhancedShareLink | null>;
}

export const QuickShareDialog: React.FC<QuickShareDialogProps> = ({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  resourceName,
  onCreateLink
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('quick');
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<EnhancedShareLink | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Quick share state
  const [permission, setPermission] = useState<ShareLinkPermission>('view');
  const [expiration, setExpiration] = useState<number>(168); // 7 days default
  
  // Advanced settings
  const [linkName, setLinkName] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [requireEmail, setRequireEmail] = useState(false);
  const [requireName, setRequireName] = useState(false);
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [maxUses, setMaxUses] = useState(100);
  const [allowDownload, setAllowDownload] = useState(false);
  const [allowPrint, setAllowPrint] = useState(false);
  const [allowCopy, setAllowCopy] = useState(true);
  const [notifyOnAccess, setNotifyOnAccess] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    try {
      const params: CreateShareLinkParams = {
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
        permission,
        name: linkName || undefined,
        allow_download: allowDownload || permission === 'download',
        allow_print: allowPrint,
        allow_copy: allowCopy,
        password: hasPassword ? password : undefined,
        require_email: requireEmail,
        require_name: requireName,
        allowed_emails: allowedEmails.length > 0 ? allowedEmails : undefined,
        allowed_domains: allowedDomains.length > 0 ? allowedDomains : undefined,
        max_uses: hasMaxUses ? maxUses : undefined,
        expires_in_hours: expiration > 0 ? expiration : undefined,
        notify_on_access: notifyOnAccess,
        watermark_enabled: watermarkEnabled,
        watermark_text: watermarkEnabled ? watermarkText : undefined
      };

      const link = await onCreateLink(params);
      if (link) {
        setCreatedLink(link);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    const url = generateShareUrl(createdLink.token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied!',
      description: 'Share link copied to clipboard'
    });
  };

  const resetForm = () => {
    setCreatedLink(null);
    setPermission('view');
    setExpiration(168);
    setLinkName('');
    setHasPassword(false);
    setPassword('');
    setRequireEmail(false);
    setRequireName(false);
    setHasMaxUses(false);
    setMaxUses(100);
    setAllowDownload(false);
    setAllowPrint(false);
    setAllowCopy(true);
    setNotifyOnAccess(false);
    setWatermarkEnabled(false);
    setWatermarkText('');
    setAllowedDomains([]);
    setAllowedEmails([]);
    setActiveTab('quick');
  };

  const addDomain = () => {
    if (newDomain && !allowedDomains.includes(newDomain)) {
      setAllowedDomains([...allowedDomains, newDomain]);
      setNewDomain('');
    }
  };

  const addEmail = () => {
    if (newEmail && !allowedEmails.includes(newEmail)) {
      setAllowedEmails([...allowedEmails, newEmail]);
      setNewEmail('');
    }
  };

  const getPermissionIcon = (perm: ShareLinkPermission) => {
    switch (perm) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'download': return <Download className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
    }
  };

  // Success state - show created link
  if (createdLink) {
    const shareUrl = generateShareUrl(createdLink.token);
    const qrUrl = generateQRCodeUrl(shareUrl, 150);

    return (
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              Link Created!
            </DialogTitle>
            <DialogDescription>
              Your share link is ready. Copy and share it with others.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Link URL */}
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button onClick={copyLink} className="shrink-0">
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* QR Code & Info */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <img 
                  src={qrUrl} 
                  alt="QR Code" 
                  className="w-[120px] h-[120px] rounded-lg border"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  {getPermissionIcon(createdLink.permission)}
                  <span className="font-medium">
                    {SHARE_LINK_PERMISSION_INFO[createdLink.permission].label}
                  </span>
                </div>
                {createdLink.expires_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Expires {new Date(createdLink.expires_at).toLocaleDateString()}
                  </div>
                )}
                {createdLink.password_protected && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Password protected
                  </div>
                )}
                {createdLink.max_uses && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    Limited to {createdLink.max_uses} uses
                  </div>
                )}
                {createdLink.require_email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    Email required
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Link
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setCreatedLink(null)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Another
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Share "{resourceName}"
          </DialogTitle>
          <DialogDescription>
            Create a shareable link with customizable permissions and security
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Quick Share
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] pr-4">
            <TabsContent value="quick" className="space-y-6 mt-4">
              {/* Permission Selection */}
              <div className="space-y-3">
                <Label>Who can access this link?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SHARE_LINK_PERMISSION_INFO) as ShareLinkPermission[]).map((perm) => (
                    <button
                      key={perm}
                      onClick={() => setPermission(perm)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        permission === perm 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        permission === perm ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {getPermissionIcon(perm)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {SHARE_LINK_PERMISSION_INFO[perm].label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {SHARE_LINK_PERMISSION_INFO[perm].description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-3">
                <Label>Link expiration</Label>
                <Select 
                  value={expiration.toString()} 
                  onValueChange={(v) => setExpiration(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.hours} value={opt.hours.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password Protection
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Require a password to access
                    </p>
                  </div>
                  <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
                </div>
                {hasPassword && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Require Email
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Collect visitor email before access
                    </p>
                  </div>
                  <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-4">
              {/* Link Name */}
              <div className="space-y-2">
                <Label>Link Name (optional)</Label>
                <Input
                  placeholder="e.g., External Partners, Client Review"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Help identify this link in your dashboard
                </p>
              </div>

              <Separator />

              {/* Security Options */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Protection</Label>
                    <p className="text-xs text-muted-foreground">Require password to access</p>
                  </div>
                  <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
                </div>
                {hasPassword && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email</Label>
                    <p className="text-xs text-muted-foreground">Collect email before access</p>
                  </div>
                  <Switch checked={requireEmail} onCheckedChange={setRequireEmail} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Name</Label>
                    <p className="text-xs text-muted-foreground">Collect name before access</p>
                  </div>
                  <Switch checked={requireName} onCheckedChange={setRequireName} />
                </div>
              </div>

              <Separator />

              {/* Access Restrictions */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Access Restrictions
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Limit Uses</Label>
                    <p className="text-xs text-muted-foreground">Maximum access count</p>
                  </div>
                  <Switch checked={hasMaxUses} onCheckedChange={setHasMaxUses} />
                </div>
                {hasMaxUses && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">uses</span>
                  </div>
                )}

                {/* Domain Whitelist */}
                <div className="space-y-2">
                  <Label>Allowed Email Domains</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., company.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                    />
                    <Button variant="outline" onClick={addDomain}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {allowedDomains.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allowedDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="gap-1">
                          @{domain}
                          <button onClick={() => setAllowedDomains(allowedDomains.filter(d => d !== domain))}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Email Whitelist */}
                <div className="space-y-2">
                  <Label>Allowed Emails</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="e.g., partner@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                    />
                    <Button variant="outline" onClick={addEmail}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {allowedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {allowedEmails.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          {email}
                          <button onClick={() => setAllowedEmails(allowedEmails.filter(e => e !== email))}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Content Controls */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Content Controls
                </h4>

                <div className="flex items-center justify-between">
                  <Label>Allow Download</Label>
                  <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Allow Print</Label>
                  <Switch checked={allowPrint} onCheckedChange={setAllowPrint} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Allow Copy Text</Label>
                  <Switch checked={allowCopy} onCheckedChange={setAllowCopy} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Watermark</Label>
                    <p className="text-xs text-muted-foreground">Add visible watermark</p>
                  </div>
                  <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
                </div>
                {watermarkEnabled && (
                  <Input
                    placeholder="e.g., CONFIDENTIAL"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                  />
                )}
              </div>

              <Separator />

              {/* Notifications */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Notifications
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notify on Access</Label>
                    <p className="text-xs text-muted-foreground">Get notified when link is used</p>
                  </div>
                  <Switch checked={notifyOnAccess} onCheckedChange={setNotifyOnAccess} />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || (hasPassword && !password)}>
            {creating ? 'Creating...' : 'Create Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
