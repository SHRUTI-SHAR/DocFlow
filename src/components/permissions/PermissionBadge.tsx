import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Ban, Eye, MessageSquare, GitPullRequest, 
  Edit, Settings, Crown 
} from 'lucide-react';
import { PermissionLevel, PERMISSION_LEVEL_INFO } from '@/types/permissions';
import { cn } from '@/lib/utils';

interface PermissionBadgeProps {
  level: PermissionLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const ICONS: Record<PermissionLevel, React.ComponentType<{ className?: string }>> = {
  none: Ban,
  viewer: Eye,
  commenter: MessageSquare,
  contributor: GitPullRequest,
  editor: Edit,
  admin: Settings,
  owner: Crown
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5'
};

const ICON_SIZE = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

export const PermissionBadge: React.FC<PermissionBadgeProps> = ({
  level,
  size = 'md',
  showIcon = true,
  className
}) => {
  const info = PERMISSION_LEVEL_INFO[level];
  const Icon = ICONS[level];

  const getVariant = () => {
    switch (level) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'editor': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Badge 
      variant={getVariant()}
      className={cn(
        SIZE_CLASSES[size],
        'inline-flex items-center gap-1 font-medium',
        level === 'owner' && 'bg-primary text-primary-foreground',
        level === 'admin' && 'bg-chart-5/20 text-chart-5 border-chart-5',
        level === 'editor' && 'bg-chart-4/20 text-chart-4 border-chart-4',
        level === 'contributor' && 'bg-chart-3/20 text-chart-3 border-chart-3',
        level === 'commenter' && 'bg-chart-2/20 text-chart-2 border-chart-2',
        level === 'viewer' && 'bg-chart-1/20 text-chart-1 border-chart-1',
        level === 'none' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {showIcon && <Icon className={ICON_SIZE[size]} />}
      {info.label}
    </Badge>
  );
};
