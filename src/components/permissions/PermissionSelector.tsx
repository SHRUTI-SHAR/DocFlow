import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Ban, Eye, MessageSquare, GitPullRequest, 
  Edit, Settings, Crown 
} from 'lucide-react';
import { 
  PermissionLevel, 
  PERMISSION_LEVEL_INFO, 
  PERMISSION_HIERARCHY 
} from '@/types/permissions';
import { cn } from '@/lib/utils';

interface PermissionSelectorProps {
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
  maxLevel?: PermissionLevel;
  excludeLevels?: PermissionLevel[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
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

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  value,
  onChange,
  maxLevel = 'owner',
  excludeLevels = [],
  disabled = false,
  size = 'md',
  className
}) => {
  const maxIndex = PERMISSION_HIERARCHY.indexOf(maxLevel);
  
  const availableLevels = PERMISSION_HIERARCHY.filter((level, index) => {
    if (excludeLevels.includes(level)) return false;
    if (index > maxIndex) return false;
    return true;
  });

  return (
    <Select 
      value={value} 
      onValueChange={(v) => onChange(v as PermissionLevel)}
      disabled={disabled}
    >
      <SelectTrigger 
        className={cn(
          size === 'sm' && 'h-8 text-sm',
          size === 'lg' && 'h-12 text-lg',
          className
        )}
      >
        <SelectValue>
          <div className="flex items-center gap-2">
            {React.createElement(ICONS[value], { className: 'h-4 w-4' })}
            <span>{PERMISSION_LEVEL_INFO[value].label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableLevels.map((level) => {
          const info = PERMISSION_LEVEL_INFO[level];
          const Icon = ICONS[level];
          
          return (
            <SelectItem key={level} value={level}>
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  'h-4 w-4',
                  level === 'owner' && 'text-primary',
                  level === 'admin' && 'text-chart-5',
                  level === 'editor' && 'text-chart-4',
                  level === 'contributor' && 'text-chart-3',
                  level === 'commenter' && 'text-chart-2',
                  level === 'viewer' && 'text-chart-1',
                  level === 'none' && 'text-muted-foreground'
                )} />
                <div className="flex flex-col">
                  <span className="font-medium">{info.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {info.description}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
