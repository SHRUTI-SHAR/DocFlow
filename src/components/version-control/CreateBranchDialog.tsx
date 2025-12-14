import React, { useState } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DocumentVersion, CreateBranchParams } from '@/types/versionControl';

interface CreateBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseVersion: DocumentVersion | null;
  documentId: string;
  onCreateBranch: (params: CreateBranchParams) => Promise<void>;
}

export function CreateBranchDialog({
  open,
  onOpenChange,
  baseVersion,
  documentId,
  onCreateBranch,
}: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!branchName.trim()) {
      setError('Branch name is required');
      return;
    }

    if (!baseVersion?.id) {
      setError('Base version is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      await onCreateBranch({
        document_id: documentId,
        branch_name: branchName.trim(),
        description: description.trim() || undefined,
        base_version_id: baseVersion.id,
      });

      // Reset form
      setBranchName('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setBranchName('');
      setDescription('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Create Branch
          </DialogTitle>
          <DialogDescription>
            Create a new branch from version {baseVersion?.major_version}.{baseVersion?.minor_version}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branch-name">Branch Name</Label>
            <Input
              id="branch-name"
              placeholder="e.g., feature/new-section"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What changes will this branch contain?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {baseVersion && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Base Version</p>
              <p className="font-mono text-sm font-medium">
                v{baseVersion.major_version}.{baseVersion.minor_version}
              </p>
              {baseVersion.change_summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {baseVersion.change_summary}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !branchName.trim()}
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Branch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
