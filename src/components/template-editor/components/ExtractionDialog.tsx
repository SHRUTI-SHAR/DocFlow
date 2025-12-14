import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExtractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractionText: string | null;
}

export const ExtractionDialog = ({
  open,
  onOpenChange,
  extractionText,
}: ExtractionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OCR Result</DialogTitle>
          <DialogDescription>Extracted text from the current document.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-auto rounded border border-border bg-muted/30 p-3">
          <pre className="text-sm whitespace-pre-wrap break-words">{extractionText || 'No text found.'}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

