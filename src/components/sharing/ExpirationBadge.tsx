import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, Check, X, Infinity } from 'lucide-react';
import { format, differenceInHours, differenceInDays, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface ExpirationBadgeProps {
  expiresAt: string | Date | null | undefined;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const ExpirationBadge: React.FC<ExpirationBadgeProps> = ({
  expiresAt,
  showIcon = true,
  className,
  size = 'sm'
}) => {
  if (!expiresAt) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1 text-muted-foreground",
          size === 'sm' ? 'text-xs' : 'text-sm',
          className
        )}
      >
        {showIcon && <Infinity className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
        Never expires
      </Badge>
    );
  }

  const expDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const isExpired = isPast(expDate);
  const hoursRemaining = differenceInHours(expDate, now);
  const daysRemaining = differenceInDays(expDate, now);

  const getExpirationText = () => {
    if (isExpired) return 'Expired';
    if (hoursRemaining < 1) return 'Expires soon';
    if (hoursRemaining < 24) return `${hoursRemaining}h left`;
    if (daysRemaining < 30) return `${daysRemaining}d left`;
    return format(expDate, 'MMM d');
  };

  const getVariant = (): 'destructive' | 'secondary' | 'outline' | 'default' => {
    if (isExpired) return 'destructive';
    if (hoursRemaining < 24) return 'destructive';
    if (daysRemaining < 7) return 'secondary';
    return 'outline';
  };

  const getIcon = () => {
    if (isExpired) return X;
    if (hoursRemaining < 24) return AlertTriangle;
    return Clock;
  };

  const Icon = getIcon();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={getVariant()} 
            className={cn(
              "gap-1",
              size === 'sm' ? 'text-xs' : 'text-sm',
              isExpired && 'opacity-75',
              className
            )}
          >
            {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
            {getExpirationText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isExpired 
              ? `Expired on ${format(expDate, 'PPp')}`
              : `Expires on ${format(expDate, 'PPp')}`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ExpirationCountdownProps {
  expiresAt: string | Date | null | undefined;
  className?: string;
}

export const ExpirationCountdown: React.FC<ExpirationCountdownProps> = ({
  expiresAt,
  className
}) => {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('Never');
      return;
    }

    const expDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;

    const updateCountdown = () => {
      const now = new Date();
      const diff = expDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const expDate = expiresAt ? (typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt) : null;
  const isExpired = expDate && isPast(expDate);
  const isUrgent = expDate && !isExpired && differenceInHours(expDate, new Date()) < 24;

  return (
    <div className={cn(
      "flex items-center gap-2 font-mono text-sm",
      isExpired && "text-destructive",
      isUrgent && !isExpired && "text-amber-600 dark:text-amber-400",
      className
    )}>
      <Clock className="w-4 h-4" />
      <span>{timeLeft}</span>
    </div>
  );
};
