import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentSummaryPanel } from './DocumentSummaryPanel';

interface DocumentSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentText: string;
}

export function DocumentSummaryDialog({
  open,
  onOpenChange,
  documentName,
  documentText,
}: DocumentSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] p-0 flex flex-col gap-0">
        <div className="flex-1 overflow-hidden">
          <DocumentSummaryPanel
            documentName={documentName}
            documentText={documentText}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
