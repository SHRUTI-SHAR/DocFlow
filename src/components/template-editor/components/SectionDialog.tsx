import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newSectionName: string;
  onSectionNameChange: (name: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export const SectionDialog = ({
  open,
  onOpenChange,
  newSectionName,
  onSectionNameChange,
  onAdd,
  onCancel,
}: SectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Section</DialogTitle>
          <DialogDescription>
            Create a new section to organize your fields
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="section-name">Section Name</Label>
            <Input
              id="section-name"
              value={newSectionName}
              onChange={(e) => onSectionNameChange(e.target.value)}
              placeholder="e.g., Personal Information"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSectionName.trim()) {
                  onAdd();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={onAdd}
              disabled={!newSectionName.trim()}
            >
              Add Section
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

