import React from 'react';
import { format } from 'date-fns';
import { Clock, Save, Settings, Zap, ZapOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AutoVersioningSettings } from '@/types/versionControl';

interface AutoVersioningControlsProps {
  settings: AutoVersioningSettings | null;
  isEnabled: boolean;
  lastAutoSave: Date | null;
  isSaving: boolean;
  autoVersionCount: number;
  onToggle: () => void;
  onIntervalChange: (seconds: number) => void;
  onTriggerSave: () => void;
}

export function AutoVersioningControls({
  settings,
  isEnabled,
  lastAutoSave,
  isSaving,
  autoVersionCount,
  onToggle,
  onIntervalChange,
  onTriggerSave,
}: AutoVersioningControlsProps) {
  const intervalOptions = [
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
    { value: 600, label: '10 minutes' },
    { value: 900, label: '15 minutes' },
    { value: 1800, label: '30 minutes' },
  ];

  const currentInterval = settings?.interval_seconds || 300;
  const maxVersions = settings?.max_auto_versions || 50;
  const isNearLimit = autoVersionCount >= maxVersions * 0.9;

  return (
    <div className="flex items-center gap-2">
      {/* Status indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors',
              isEnabled 
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-muted text-muted-foreground'
            )}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEnabled ? (
                <>
                  <Zap className="h-3 w-3" />
                  <span>Auto-save on</span>
                </>
              ) : (
                <>
                  <ZapOff className="h-3 w-3" />
                  <span>Auto-save off</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isEnabled ? (
              <div className="space-y-1">
                <p>Auto-saving every {currentInterval / 60} minutes</p>
                {lastAutoSave && (
                  <p className="text-xs opacity-70">
                    Last saved: {format(lastAutoSave, 'HH:mm:ss')}
                  </p>
                )}
                <p className="text-xs opacity-70">
                  {autoVersionCount} / {maxVersions} auto versions
                </p>
              </div>
            ) : (
              <p>Auto-versioning is disabled</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Manual save button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onTriggerSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save now</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Settings popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Auto-versioning</h4>
              <Switch
                checked={isEnabled}
                onCheckedChange={onToggle}
                id="auto-versioning"
              />
            </div>

            {isEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="interval" className="text-xs text-muted-foreground">
                    Save interval
                  </Label>
                  <Select
                    value={String(currentInterval)}
                    onValueChange={(value) => onIntervalChange(Number(value))}
                  >
                    <SelectTrigger id="interval" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {intervalOptions.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Auto versions used</span>
                    <Badge 
                      variant={isNearLimit ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {autoVersionCount} / {maxVersions}
                    </Badge>
                  </div>
                  {isNearLimit && (
                    <p className="text-xs text-destructive mt-1">
                      Approaching auto-version limit
                    </p>
                  )}
                </div>

                {lastAutoSave && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last saved: {format(lastAutoSave, 'MMM d, HH:mm:ss')}
                  </div>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
