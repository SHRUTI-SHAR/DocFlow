import React, { useState } from 'react';
import { 
  Download, 
  Printer, 
  Copy, 
  Shield, 
  Droplets, 
  Lock,
  Eye,
  Clock,
  Users,
  Mail,
  Globe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface DocumentRestrictions {
  allowDownload: boolean;
  allowPrint: boolean;
  allowCopy: boolean;
  allowScreenshot: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  watermarkPosition: 'center' | 'diagonal' | 'tiled' | 'footer';
  watermarkOpacity: number;
  restrictedHours: boolean;
  allowedStartHour: number;
  allowedEndHour: number;
  restrictedDomains: string[];
  allowedIpRanges: string[];
  maxViewDuration: number | null;
  viewOnlyMode: boolean;
  blurOnInactivity: boolean;
  requireAuth: boolean;
  trackAllActions: boolean;
}

interface DocumentRestrictionsPanelProps {
  restrictions: DocumentRestrictions;
  onChange: (restrictions: DocumentRestrictions) => void;
  compact?: boolean;
}

const defaultRestrictions: DocumentRestrictions = {
  allowDownload: true,
  allowPrint: true,
  allowCopy: true,
  allowScreenshot: true,
  watermarkEnabled: false,
  watermarkText: '',
  watermarkPosition: 'diagonal',
  watermarkOpacity: 30,
  restrictedHours: false,
  allowedStartHour: 9,
  allowedEndHour: 17,
  restrictedDomains: [],
  allowedIpRanges: [],
  maxViewDuration: null,
  viewOnlyMode: false,
  blurOnInactivity: false,
  requireAuth: false,
  trackAllActions: true
};

export const DocumentRestrictionsPanel: React.FC<DocumentRestrictionsPanelProps> = ({
  restrictions = defaultRestrictions,
  onChange,
  compact = false
}) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [ipInput, setIpInput] = useState('');

  const updateRestriction = <K extends keyof DocumentRestrictions>(
    key: K, 
    value: DocumentRestrictions[K]
  ) => {
    onChange({ ...restrictions, [key]: value });
  };

  const addDomain = () => {
    if (domainInput.trim() && !restrictions.restrictedDomains.includes(domainInput.trim())) {
      updateRestriction('restrictedDomains', [...restrictions.restrictedDomains, domainInput.trim()]);
      setDomainInput('');
    }
  };

  const removeDomain = (domain: string) => {
    updateRestriction('restrictedDomains', restrictions.restrictedDomains.filter(d => d !== domain));
  };

  const addIpRange = () => {
    if (ipInput.trim() && !restrictions.allowedIpRanges.includes(ipInput.trim())) {
      updateRestriction('allowedIpRanges', [...restrictions.allowedIpRanges, ipInput.trim()]);
      setIpInput('');
    }
  };

  const removeIpRange = (ip: string) => {
    updateRestriction('allowedIpRanges', restrictions.allowedIpRanges.filter(i => i !== ip));
  };

  const getSecurityLevel = (): { level: string; color: string; description: string } => {
    let score = 0;
    if (!restrictions.allowDownload) score += 2;
    if (!restrictions.allowPrint) score += 2;
    if (!restrictions.allowCopy) score += 1;
    if (restrictions.watermarkEnabled) score += 2;
    if (restrictions.requireAuth) score += 2;
    if (restrictions.restrictedHours) score += 1;
    if (restrictions.blurOnInactivity) score += 1;
    if (restrictions.allowedIpRanges.length > 0) score += 2;

    if (score >= 8) return { level: 'Maximum', color: 'text-red-500', description: 'Highly restricted access' };
    if (score >= 5) return { level: 'High', color: 'text-orange-500', description: 'Strong protections enabled' };
    if (score >= 2) return { level: 'Medium', color: 'text-yellow-500', description: 'Basic protections enabled' };
    return { level: 'Low', color: 'text-green-500', description: 'Minimal restrictions' };
  };

  const security = getSecurityLevel();

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Document Restrictions</span>
          </div>
          <Badge variant="outline" className={security.color}>
            {security.level} Security
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <RestrictionToggle
            icon={Download}
            label="Download"
            enabled={restrictions.allowDownload}
            onChange={(v) => updateRestriction('allowDownload', v)}
            compact
          />
          <RestrictionToggle
            icon={Printer}
            label="Print"
            enabled={restrictions.allowPrint}
            onChange={(v) => updateRestriction('allowPrint', v)}
            compact
          />
          <RestrictionToggle
            icon={Copy}
            label="Copy Text"
            enabled={restrictions.allowCopy}
            onChange={(v) => updateRestriction('allowCopy', v)}
            compact
          />
          <RestrictionToggle
            icon={Droplets}
            label="Watermark"
            enabled={restrictions.watermarkEnabled}
            onChange={(v) => updateRestriction('watermarkEnabled', v)}
            inverted
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Level Indicator */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-background ${security.color}`}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{security.level} Security</p>
            <p className="text-sm text-muted-foreground">{security.description}</p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Security level is calculated based on enabled restrictions. More restrictions = higher security.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Core Restrictions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Core Restrictions
        </h4>
        
        <div className="grid gap-3">
          <RestrictionToggle
            icon={Download}
            label="Allow Download"
            description="Recipients can download a copy of the document"
            enabled={restrictions.allowDownload}
            onChange={(v) => updateRestriction('allowDownload', v)}
          />
          
          <RestrictionToggle
            icon={Printer}
            label="Allow Print"
            description="Recipients can print the document"
            enabled={restrictions.allowPrint}
            onChange={(v) => updateRestriction('allowPrint', v)}
          />
          
          <RestrictionToggle
            icon={Copy}
            label="Allow Copy Text"
            description="Recipients can select and copy text content"
            enabled={restrictions.allowCopy}
            onChange={(v) => updateRestriction('allowCopy', v)}
          />

          <RestrictionToggle
            icon={Eye}
            label="View-Only Mode"
            description="Disable all interactions, display only"
            enabled={restrictions.viewOnlyMode}
            onChange={(v) => updateRestriction('viewOnlyMode', v)}
            inverted
          />
        </div>
      </div>

      <Separator />

      {/* Watermark Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            Watermark Protection
          </h4>
          <Switch
            checked={restrictions.watermarkEnabled}
            onCheckedChange={(v) => updateRestriction('watermarkEnabled', v)}
          />
        </div>

        {restrictions.watermarkEnabled && (
          <div className="space-y-4 pl-6 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label>Watermark Text</Label>
              <Input
                placeholder="e.g., CONFIDENTIAL - {email} - {date}"
                value={restrictions.watermarkText}
                onChange={(e) => updateRestriction('watermarkText', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{email}'}, {'{name}'}, {'{date}'}, {'{time}'} as dynamic placeholders
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={restrictions.watermarkPosition}
                  onValueChange={(v) => updateRestriction('watermarkPosition', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="diagonal">Diagonal</SelectItem>
                    <SelectItem value="tiled">Tiled</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Opacity ({restrictions.watermarkOpacity}%)</Label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={restrictions.watermarkOpacity}
                  onChange={(e) => updateRestriction('watermarkOpacity', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {/* Watermark Preview */}
            <div className="relative h-24 rounded-lg bg-muted/50 border overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className={`text-lg font-medium ${
                    restrictions.watermarkPosition === 'diagonal' ? 'rotate-[-30deg]' : ''
                  }`}
                  style={{ opacity: restrictions.watermarkOpacity / 100 }}
                >
                  {restrictions.watermarkText || 'CONFIDENTIAL'}
                </div>
              </div>
              <div className="absolute bottom-1 right-2 text-xs text-muted-foreground">Preview</div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Advanced Restrictions */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Advanced Restrictions
            </span>
            {advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Time-Based Access */}
          <div className="space-y-3">
            <RestrictionToggle
              icon={Clock}
              label="Time-Based Access"
              description="Only allow access during specific hours"
              enabled={restrictions.restrictedHours}
              onChange={(v) => updateRestriction('restrictedHours', v)}
              inverted
            />
            
            {restrictions.restrictedHours && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label>Start Hour</Label>
                  <Select
                    value={restrictions.allowedStartHour.toString()}
                    onValueChange={(v) => updateRestriction('allowedStartHour', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Hour</Label>
                  <Select
                    value={restrictions.allowedEndHour.toString()}
                    onValueChange={(v) => updateRestriction('allowedEndHour', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i.toString().padStart(2, '0')}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* IP Restrictions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              IP Address Allowlist
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 192.168.1.0/24"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIpRange()}
              />
              <Button variant="outline" onClick={addIpRange}>Add</Button>
            </div>
            {restrictions.allowedIpRanges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {restrictions.allowedIpRanges.map((ip) => (
                  <Badge 
                    key={ip} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeIpRange(ip)}
                  >
                    {ip} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Blur on Inactivity */}
          <RestrictionToggle
            icon={Eye}
            label="Blur on Inactivity"
            description="Blur content after 30 seconds of inactivity"
            enabled={restrictions.blurOnInactivity}
            onChange={(v) => updateRestriction('blurOnInactivity', v)}
            inverted
          />

          {/* Require Authentication */}
          <RestrictionToggle
            icon={Users}
            label="Require Authentication"
            description="Viewers must sign in to access"
            enabled={restrictions.requireAuth}
            onChange={(v) => updateRestriction('requireAuth', v)}
            inverted
          />

          {/* Track All Actions */}
          <RestrictionToggle
            icon={Eye}
            label="Track All Actions"
            description="Log all viewer interactions for audit"
            enabled={restrictions.trackAllActions}
            onChange={(v) => updateRestriction('trackAllActions', v)}
            inverted
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface RestrictionToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  inverted?: boolean;
  compact?: boolean;
}

const RestrictionToggle: React.FC<RestrictionToggleProps> = ({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  inverted = false,
  compact = false
}) => {
  const isSecure = inverted ? enabled : !enabled;
  
  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
          isSecure ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'
        }`}
        onClick={() => onChange(!enabled)}
      >
        <Icon className={`h-4 w-4 ${isSecure ? 'text-red-500' : 'text-muted-foreground'}`} />
        <span className={`text-sm flex-1 ${isSecure ? 'line-through text-muted-foreground' : ''}`}>
          {label}
        </span>
        <Switch checked={enabled} onCheckedChange={onChange} className="scale-75" />
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        isSecure ? 'border-orange-500/30 bg-orange-500/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${isSecure ? 'text-orange-500' : 'text-muted-foreground'}`} />
        <div>
          <p className={`text-sm font-medium ${isSecure && !inverted ? 'line-through text-muted-foreground' : ''}`}>
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
};

export default DocumentRestrictionsPanel;
