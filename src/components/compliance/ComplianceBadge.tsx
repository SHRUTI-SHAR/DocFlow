import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  Heart,
  CreditCard,
  Building2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Key,
  Download,
  Globe
} from 'lucide-react';
import {
  ComplianceLabel,
  ComplianceFramework,
  COMPLIANCE_FRAMEWORKS,
  DATA_CLASSIFICATION_CONFIG
} from '@/types/compliance';

interface ComplianceBadgeProps {
  label: ComplianceLabel;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showRequirements?: boolean;
}

const frameworkIcons: Record<ComplianceFramework, React.ReactNode> = {
  GDPR: <Shield className="h-3 w-3" />,
  HIPAA: <Heart className="h-3 w-3" />,
  SOX: <Building2 className="h-3 w-3" />,
  PCI_DSS: <CreditCard className="h-3 w-3" />,
  CCPA: <Shield className="h-3 w-3" />,
  FERPA: <Shield className="h-3 w-3" />,
  ISO_27001: <Lock className="h-3 w-3" />,
  NIST: <Shield className="h-3 w-3" />,
  SOC2: <CheckCircle2 className="h-3 w-3" />,
  CUSTOM: <Shield className="h-3 w-3" />
};

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  label,
  size = 'md',
  showTooltip = true,
  showRequirements = false
}) => {
  const frameworkConfig = COMPLIANCE_FRAMEWORKS[label.framework];
  const classificationConfig = DATA_CLASSIFICATION_CONFIG[label.data_classification];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const requirements = [];
  if (label.encryption_required) requirements.push('Encryption');
  if (label.download_restricted) requirements.push('Download Restricted');
  if (label.sharing_restricted) requirements.push('Sharing Restricted');

  const badge = (
    <Badge
      className={`${sizeClasses[size]} text-white cursor-default`}
      style={{ backgroundColor: label.color }}
    >
      <span className="flex items-center gap-1">
        {frameworkIcons[label.framework]}
        <span>{label.code}</span>
      </span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div>
              <p className="font-semibold">{label.name}</p>
              <p className="text-xs text-muted-foreground">{frameworkConfig.fullName}</p>
            </div>
            <p className="text-xs">{label.description}</p>
            <div className="flex gap-2">
              <Badge variant="outline" className={`text-xs ${classificationConfig.color}`}>
                {classificationConfig.label}
              </Badge>
            </div>
            {showRequirements && requirements.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Requirements:</p>
                <div className="flex flex-wrap gap-1">
                  {requirements.map((req, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Multi-badge component for documents with multiple labels
interface ComplianceBadgesProps {
  labels: ComplianceLabel[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const ComplianceBadges: React.FC<ComplianceBadgesProps> = ({
  labels,
  max = 3,
  size = 'sm'
}) => {
  const visibleLabels = labels.slice(0, max);
  const hiddenCount = labels.length - max;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleLabels.map((label) => (
        <ComplianceBadge key={label.id} label={label} size={size} />
      ))}
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs">
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {labels.slice(max).map((label) => (
                  <div key={label.id} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-xs">{label.name}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
