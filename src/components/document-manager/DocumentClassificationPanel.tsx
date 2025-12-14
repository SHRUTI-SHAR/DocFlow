import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Brain,
  Send,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Tag,
  FileText,
  Clock,
  Globe,
  Zap,
  ArrowRight
} from 'lucide-react';
import { DocumentClassificationBadge } from './DocumentClassificationBadge';
import { DocumentClassification, ExternalSystemProcessing } from '@/hooks/useDocumentClassification';
import { cn } from '@/lib/utils';

interface DocumentClassificationPanelProps {
  isClassifying?: boolean;
  isProcessing?: boolean;
  classification?: DocumentClassification | null;
  processing?: ExternalSystemProcessing | null;
  onClassify?: () => void;
  onProcess?: (system: string, action?: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

const EXTERNAL_SYSTEM_NAMES: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  invoice_processing: { name: 'Invoice Processing', icon: <FileText className="h-4 w-4" />, color: 'text-blue-500' },
  reimbursement: { name: 'Expense Reimbursement', icon: <Zap className="h-4 w-4" />, color: 'text-green-500' },
  contract_management: { name: 'Contract Management', icon: <FileText className="h-4 w-4" />, color: 'text-purple-500' },
  identity_verification: { name: 'Identity Verification', icon: <CheckCircle className="h-4 w-4" />, color: 'text-amber-500' },
  financial_analysis: { name: 'Financial Analysis', icon: <Brain className="h-4 w-4" />, color: 'text-emerald-500' },
  tax_processing: { name: 'Tax Processing', icon: <FileText className="h-4 w-4" />, color: 'text-red-500' },
  insurance_processing: { name: 'Insurance Processing', icon: <FileText className="h-4 w-4" />, color: 'text-cyan-500' },
  medical_records: { name: 'Medical Records', icon: <FileText className="h-4 w-4" />, color: 'text-pink-500' },
  hr_recruitment: { name: 'HR & Recruitment', icon: <FileText className="h-4 w-4" />, color: 'text-indigo-500' },
  procurement: { name: 'Procurement', icon: <FileText className="h-4 w-4" />, color: 'text-orange-500' },
  form_processing: { name: 'Form Processing', icon: <FileText className="h-4 w-4" />, color: 'text-teal-500' },
  correspondence: { name: 'Correspondence', icon: <FileText className="h-4 w-4" />, color: 'text-slate-500' },
  report_management: { name: 'Report Management', icon: <FileText className="h-4 w-4" />, color: 'text-violet-500' }
};

export const DocumentClassificationPanel: React.FC<DocumentClassificationPanelProps> = ({
  isClassifying,
  isProcessing,
  classification,
  processing,
  onClassify,
  onProcess,
  onClose,
  compact = false
}) => {
  const systemInfo = classification?.externalSystem 
    ? EXTERNAL_SYSTEM_NAMES[classification.externalSystem] 
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
        {isClassifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Classifying...</span>
          </>
        ) : classification ? (
          <>
            <DocumentClassificationBadge
              category={classification.category}
              categoryName={classification.categoryName}
              confidence={classification.confidence}
              size="sm"
            />
            {classification.externalSystem && !processing && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => onProcess?.(classification.externalSystem!)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3 w-3 mr-1" />
                    Route
                  </>
                )}
              </Button>
            )}
            {processing && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {processing.status}
              </Badge>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={onClassify}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Classify
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Document Classification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Classification Status */}
        {isClassifying && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            </div>
            <div className="text-center">
              <p className="font-medium">Analyzing Document...</p>
              <p className="text-sm text-muted-foreground">
                AI is identifying document type and extracting information
              </p>
            </div>
            <Progress value={65} className="w-48" />
          </div>
        )}

        {/* Classification Result */}
        {classification && !isClassifying && (
          <div className="space-y-4">
            {/* Category Badge */}
            <div className="flex items-center justify-between">
              <DocumentClassificationBadge
                category={classification.category}
                categoryName={classification.categoryName}
                confidence={classification.confidence}
                tags={classification.tags}
                urgency={classification.urgency}
                size="lg"
              />
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(classification.classifiedAt).toLocaleTimeString()}
              </Badge>
            </div>

            {/* Confidence Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Confidence</span>
                <span className="font-medium">{Math.round(classification.confidence * 100)}%</span>
              </div>
              <Progress value={classification.confidence * 100} className="h-2" />
            </div>

            {/* Summary */}
            {classification.summary && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">{classification.summary}</p>
              </div>
            )}

            {/* Language & Urgency */}
            <div className="flex gap-2 flex-wrap">
              {classification.language && (
                <Badge variant="outline" className="text-xs">
                  <Globe className="h-3 w-3 mr-1" />
                  {classification.language}
                </Badge>
              )}
              {classification.urgency && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs',
                    classification.urgency === 'critical' && 'border-red-500 text-red-500',
                    classification.urgency === 'high' && 'border-orange-500 text-orange-500',
                    classification.urgency === 'medium' && 'border-yellow-500 text-yellow-500'
                  )}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {classification.urgency} urgency
                </Badge>
              )}
            </div>

            {/* Tags */}
            {classification.tags && classification.tags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {classification.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Data */}
            {classification.extracted_data && Object.keys(classification.extracted_data).length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Extracted Information</div>
                <ScrollArea className="h-32 border rounded-lg p-2">
                  <div className="space-y-1 text-sm">
                    {Object.entries(classification.extracted_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium truncate max-w-[60%] text-right">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <Separator />

            {/* External System Routing */}
            {classification.externalSystem && systemInfo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ExternalLink className="h-4 w-4" />
                  Route to External System
                </div>
                
                <div className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  processing ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/50'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-background', systemInfo.color)}>
                      {systemInfo.icon}
                    </div>
                    <div>
                      <p className="font-medium">{systemInfo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {classification.categoryDescription}
                      </p>
                    </div>
                  </div>
                  
                  {processing ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {processing.status}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onProcess?.(classification.externalSystem!)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Route Now
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Suggested Actions */}
                {classification.suggested_actions && classification.suggested_actions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Suggested Actions:</div>
                    <div className="space-y-1">
                      {classification.suggested_actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <ArrowRight className="h-3 w-3 text-primary" />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Initial State - No Classification */}
        {!isClassifying && !classification && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="p-4 rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">AI-Powered Classification</p>
              <p className="text-sm text-muted-foreground">
                Automatically identify document type, extract data, and route to the right system
              </p>
            </div>
            <Button onClick={onClassify}>
              <Brain className="h-4 w-4 mr-2" />
              Classify Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
