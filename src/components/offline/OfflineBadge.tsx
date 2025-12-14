import React, { useState, useEffect } from 'react';
import { CloudDownload, Cloud, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OfflineBadgeProps {
  documentId: string;
  isOffline: boolean;
  onMakeOffline: () => Promise<boolean>;
  onRemoveOffline: () => Promise<boolean>;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({
  documentId,
  isOffline,
  onMakeOffline,
  onRemoveOffline,
  showLabel = false,
  size = 'sm',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsLoading(true);
    try {
      if (isOffline) {
        await onRemoveOffline();
      } else {
        await onMakeOffline();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLabel) {
    return (
      <Button
        variant={isOffline ? "secondary" : "outline"}
        size={size === 'sm' ? 'sm' : 'default'}
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "gap-2",
          isOffline && "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isOffline ? (
          <Check className="h-4 w-4" />
        ) : (
          <CloudDownload className="h-4 w-4" />
        )}
        {isOffline ? "Available offline" : "Make available offline"}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
              "h-8 w-8",
              isOffline && "text-green-600 dark:text-green-400"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isOffline ? (
              <Cloud className="h-4 w-4" />
            ) : (
              <CloudDownload className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isOffline ? "Available offline" : "Make available offline"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface OfflineStatusBadgeProps {
  isOffline: boolean;
  className?: string;
}

export const OfflineStatusBadge: React.FC<OfflineStatusBadgeProps> = ({
  isOffline,
  className,
}) => {
  if (!isOffline) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
        className
      )}
    >
      <Cloud className="h-3 w-3" />
      Offline
    </Badge>
  );
};
