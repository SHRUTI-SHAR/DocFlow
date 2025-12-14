import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Image } from 'lucide-react';
import { DocumentComparisonView } from './DocumentComparisonView';
import { VisualDocumentComparison } from './VisualDocumentComparison';
import type { VersionComparison } from '@/types/versionControl';

interface DocumentComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: VersionComparison | null;
  onGenerateAISummary?: () => Promise<void>;
  isGeneratingAI?: boolean;
  baseDocumentUrl?: string;
  compareDocumentUrl?: string;
}

export function DocumentComparisonDialog({
  open,
  onOpenChange,
  comparison,
  onGenerateAISummary,
  isGeneratingAI,
  baseDocumentUrl,
  compareDocumentUrl,
}: DocumentComparisonDialogProps) {
  const [activeTab, setActiveTab] = useState<'data' | 'visual'>('data');
  
  const hasVisualComparison = baseDocumentUrl && compareDocumentUrl;

  if (!comparison) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Document Comparison</DialogTitle>
            {hasVisualComparison && (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'data' | 'visual')}>
                <TabsList>
                  <TabsTrigger value="data" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Data Diff
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="gap-2">
                    <Image className="h-4 w-4" />
                    Visual
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {activeTab === 'data' ? (
            <DocumentComparisonView
              comparison={comparison}
              onClose={() => onOpenChange(false)}
              onGenerateAISummary={onGenerateAISummary}
              isGeneratingAI={isGeneratingAI}
              baseDocumentUrl={baseDocumentUrl}
              compareDocumentUrl={compareDocumentUrl}
            />
          ) : hasVisualComparison ? (
            <VisualDocumentComparison
              baseDocumentUrl={baseDocumentUrl}
              compareDocumentUrl={compareDocumentUrl}
              baseLabel={`v${comparison.baseVersion.major_version}.${comparison.baseVersion.minor_version}`}
              compareLabel={`v${comparison.compareVersion.major_version}.${comparison.compareVersion.minor_version}`}
              onClose={() => onOpenChange(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
