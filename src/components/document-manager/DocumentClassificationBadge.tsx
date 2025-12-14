import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FileText, 
  Receipt, 
  FileSignature, 
  CreditCard, 
  Building2, 
  FileSpreadsheet,
  Stethoscope,
  UserCircle,
  ShoppingCart,
  ClipboardList,
  Mail,
  BarChart3,
  HelpCircle,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentClassificationBadgeProps {
  category?: string;
  categoryName?: string;
  confidence?: number;
  tags?: string[];
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  invoice: FileText,
  receipt: Receipt,
  contract: FileSignature,
  identity: CreditCard,
  financial_statement: Building2,
  tax_document: FileSpreadsheet,
  insurance: Building2,
  medical: Stethoscope,
  resume: UserCircle,
  purchase_order: ShoppingCart,
  form: ClipboardList,
  letter: Mail,
  report: BarChart3,
  unknown: HelpCircle
};

const CATEGORY_COLORS: Record<string, string> = {
  invoice: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  receipt: 'bg-green-500/10 text-green-600 border-green-500/20',
  contract: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  identity: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  financial_statement: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  tax_document: 'bg-red-500/10 text-red-600 border-red-500/20',
  insurance: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  medical: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  resume: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  purchase_order: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  form: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  letter: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  report: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  unknown: 'bg-muted text-muted-foreground border-border'
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

export const DocumentClassificationBadge: React.FC<DocumentClassificationBadgeProps> = ({
  category = 'unknown',
  categoryName,
  confidence,
  tags = [],
  urgency,
  showConfidence = true,
  size = 'md',
  className
}) => {
  const Icon = CATEGORY_ICONS[category] || HelpCircle;
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.unknown;
  const displayName = categoryName || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1.5', className)}>
            <Badge 
              variant="outline" 
              className={cn(
                'flex items-center gap-1.5 border font-medium',
                colorClass,
                sizeClasses[size]
              )}
            >
              <Icon className={iconSizes[size]} />
              <span>{displayName}</span>
              {showConfidence && confidence !== undefined && (
                <span className="opacity-70">
                  {Math.round(confidence * 100)}%
                </span>
              )}
              {urgency && urgency !== 'low' && (
                <span className={cn('w-2 h-2 rounded-full', URGENCY_COLORS[urgency])} />
              )}
            </Badge>
            {category !== 'unknown' && (
              <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {displayName}
              {confidence !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(confidence * 100)}% confident
                </Badge>
              )}
            </div>
            {urgency && (
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="h-3 w-3" />
                Urgency: <span className="capitalize">{urgency}</span>
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 5).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
