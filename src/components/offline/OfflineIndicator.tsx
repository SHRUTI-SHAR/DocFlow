import React from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Cloud, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  offlineDocumentCount: number;
  totalOfflineSize: number;
  lastSyncAt: string | null;
  onSync: () => void;
  onClearOfflineData: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  isSyncing,
  pendingSyncCount,
  offlineDocumentCount,
  totalOfflineSize,
  lastSyncAt,
  onSync,
  onClearOfflineData,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Estimate storage quota usage (rough estimate)
  const estimatedQuota = 100 * 1024 * 1024; // 100MB estimated
  const usagePercent = Math.min((totalOfflineSize / estimatedQuota) * 100, 100);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative gap-2 transition-colors",
            !isOnline && "text-destructive",
            isSyncing && "animate-pulse"
          )}
        >
          {isOnline ? (
            isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 text-green-500" />
            )
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          
          {pendingSyncCount > 0 && (
            <Badge 
              variant="secondary" 
              className="h-5 min-w-5 px-1 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400"
            >
              {pendingSyncCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isOnline ? "bg-green-500/10" : "bg-destructive/10"
            )}>
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {isOnline ? "You're online" : "You're offline"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? "All changes sync automatically"
                  : "Changes will sync when connected"
                }
              </p>
            </div>
          </div>

          {/* Sync Status */}
          {pendingSyncCount > 0 && (
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {pendingSyncCount} pending change{pendingSyncCount > 1 ? 's' : ''}
                </span>
                {isOnline && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={onSync}
                    disabled={isSyncing}
                    className="h-7 text-xs"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync now
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Offline Storage Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Offline documents</span>
              <span className="font-medium">{offlineDocumentCount}</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage used</span>
                <span className="font-medium">{formatSize(totalOfflineSize)}</span>
              </div>
              <Progress value={usagePercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                ~{formatSize(estimatedQuota - totalOfflineSize)} available
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last synced</span>
              <span className="font-medium flex items-center gap-1">
                {lastSyncAt && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                {formatLastSync(lastSyncAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onClearOfflineData}
            >
              Clear offline data
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/offline-settings">Settings</a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Manage offline settings
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
