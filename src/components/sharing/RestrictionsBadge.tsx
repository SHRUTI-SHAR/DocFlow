import React from 'react';
import { 
  Shield, 
  Download, 
  Printer, 
  Copy, 
  Droplets,
  Lock,
  ShieldCheck,
  ShieldAlert,
  ShieldX
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentRestrictions } from './DocumentRestrictionsPanel';

interface RestrictionsBadgeProps {
  restrictions?: Partial<DocumentRestrictions>;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RestrictionsBadge: React.FC<RestrictionsBadgeProps> = ({
  restrictions,
  showDetails = false,
  size = 'md'
}) => {
  if (!restrictions) {
    return null;
  }

  const {
    allowDownload = true,
    allowPrint = true,
    allowCopy = true,
    watermarkEnabled = false,
    viewOnlyMode = false,
    requireAuth = false
  } = restrictions;

  // Calculate restriction level
  let restrictionCount = 0;
  if (!allowDownload) restrictionCount++;
  if (!allowPrint) restrictionCount++;
  if (!allowCopy) restrictionCount++;
  if (watermarkEnabled) restrictionCount++;
  if (viewOnlyMode) restrictionCount++;
  if (requireAuth) restrictionCount++;

  if (restrictionCount === 0) {
    return null;
  }

  const getSecurityLevel = () => {
    if (viewOnlyMode || restrictionCount >= 4) {
      return { 
        icon: ShieldX, 
        label: 'High Security', 
        color: 'bg-red-500/10 text-red-600 border-red-500/30',
        iconColor: 'text-red-500'
      };
    }
    if (restrictionCount >= 2) {
      return { 
        icon: ShieldAlert, 
        label: 'Protected', 
        color: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
        iconColor: 'text-orange-500'
      };
    }
    return { 
      icon: ShieldCheck, 
      label: 'Limited', 
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      iconColor: 'text-yellow-500'
    };
  };

  const security = getSecurityLevel();
  const Icon = security.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  const restrictionsList = [];
  if (!allowDownload) restrictionsList.push({ icon: Download, label: 'No Download', blocked: true });
  if (!allowPrint) restrictionsList.push({ icon: Printer, label: 'No Print', blocked: true });
  if (!allowCopy) restrictionsList.push({ icon: Copy, label: 'No Copy', blocked: true });
  if (watermarkEnabled) restrictionsList.push({ icon: Droplets, label: 'Watermarked', blocked: false });
  if (viewOnlyMode) restrictionsList.push({ icon: Lock, label: 'View Only', blocked: true });
  if (requireAuth) restrictionsList.push({ icon: Shield, label: 'Auth Required', blocked: false });

  if (showDetails) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {restrictionsList.map(({ icon: ItemIcon, label, blocked }) => (
          <Badge 
            key={label}
            variant="outline" 
            className={`${sizeClasses[size]} ${
              blocked 
                ? 'bg-red-500/10 text-red-600 border-red-500/30' 
                : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
            }`}
          >
            <ItemIcon className={`${iconSizes[size]} mr-1`} />
            {label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${sizeClasses[size]} ${security.color} cursor-help`}
          >
            <Icon className={`${iconSizes[size]} mr-1`} />
            {security.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium text-sm">Document Restrictions</p>
            <div className="space-y-1">
              {restrictionsList.map(({ icon: ItemIcon, label, blocked }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <ItemIcon className={`h-3 w-3 ${blocked ? 'text-red-500' : 'text-orange-500'}`} />
                  <span className={blocked ? 'text-red-400' : 'text-orange-400'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Compact icon-only version for document lists
export const RestrictionsIcon: React.FC<{
  restrictions?: Partial<DocumentRestrictions>;
  className?: string;
}> = ({ restrictions, className = '' }) => {
  if (!restrictions) return null;

  const {
    allowDownload = true,
    allowPrint = true,
    allowCopy = true,
    watermarkEnabled = false,
    viewOnlyMode = false
  } = restrictions;

  let restrictionCount = 0;
  if (!allowDownload) restrictionCount++;
  if (!allowPrint) restrictionCount++;
  if (!allowCopy) restrictionCount++;
  if (watermarkEnabled) restrictionCount++;
  if (viewOnlyMode) restrictionCount++;

  if (restrictionCount === 0) return null;

  const IconComponent = viewOnlyMode || restrictionCount >= 3 
    ? ShieldX 
    : restrictionCount >= 2 
      ? ShieldAlert 
      : Shield;

  const colorClass = viewOnlyMode || restrictionCount >= 3 
    ? 'text-red-500' 
    : restrictionCount >= 2 
      ? 'text-orange-500' 
      : 'text-yellow-500';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <IconComponent className={`h-4 w-4 ${colorClass} ${className}`} />
        </TooltipTrigger>
        <TooltipContent>
          {restrictionCount} restriction{restrictionCount > 1 ? 's' : ''} applied
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RestrictionsBadge;
