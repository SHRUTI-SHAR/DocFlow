import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderInput,
  Trash2,
  Tag,
  X,
  CheckSquare,
  Square,
  MoreHorizontal,
  Archive,
  RefreshCw,
  Download,
  Share2,
  Loader2,
  Plus,
} from 'lucide-react';
import { useBulkActions, DocumentTag } from '@/hooks/useBulkActions';

interface BulkActionsToolbarProps {
  documents: { id: string; file_name: string }[];
  folders: { id: string; name: string }[];
  onRefresh?: () => void;
}

export function BulkActionsToolbar({ documents, folders, onRefresh }: BulkActionsToolbarProps) {
  const {
    selectedDocuments,
    tags,
    loading,
    processingAction,
    toggleSelection,
    selectAll,
    clearSelection,
    bulkMove,
    bulkDelete,
    bulkTag,
    createTag,
    fetchTags,
  } = useBulkActions();

  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [showCreateTagDialog, setShowCreateTagDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      clearSelection();
    } else {
      selectAll(documents.map(d => d.id));
    }
  };

  const handleMove = async () => {
    if (selectedFolder) {
      await bulkMove(selectedFolder);
      setShowMoveDialog(false);
      setSelectedFolder('');
      onRefresh?.();
    }
  };

  const handleDelete = async () => {
    await bulkDelete();
    setShowDeleteDialog(false);
    onRefresh?.();
  };

  const handleApplyTags = async () => {
    if (selectedTags.length > 0) {
      await bulkTag(selectedTags);
      setShowTagDialog(false);
      setSelectedTags([]);
      onRefresh?.();
    }
  };

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      await createTag(newTagName.trim(), newTagDescription.trim() || undefined);
      setShowCreateTagDialog(false);
      setNewTagName('');
      setNewTagDescription('');
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  if (selectedDocuments.length === 0) {
    return (
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2"
        >
          <Square className="h-4 w-4" />
          Select All
        </Button>
        <span className="text-sm text-muted-foreground">
          {documents.length} documents
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 border-b bg-primary/5 sticky top-0 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2"
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        
        <Badge variant="secondary" className="font-medium">
          {selectedDocuments.length} selected
        </Badge>

        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoveDialog(true)}
            disabled={loading}
            className="gap-2"
          >
            {processingAction === 'move' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4" />
            )}
            Move
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagDialog(true)}
            disabled={loading}
            className="gap-2"
          >
            {processingAction === 'tag' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Tag className="h-4 w-4" />
            )}
            Tag
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
            className="gap-2 text-destructive hover:text-destructive"
          >
            {processingAction === 'delete' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download as ZIP
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocess with AI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="ml-auto"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedDocuments.length} Document(s)</DialogTitle>
            <DialogDescription>
              Select a destination folder for the selected documents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Destination Folder</Label>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <FolderInput className="h-4 w-4" />
                  {folder.name}
                </div>
              ))}
              {folders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No folders available
                </p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!selectedFolder || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Move Documents
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedDocuments.length} Document(s)?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. These documents will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The following documents will be deleted:
            </p>
            <ScrollArea className="h-[150px] mt-2 border rounded-lg p-2">
              {documents
                .filter(d => selectedDocuments.includes(d.id))
                .map(doc => (
                  <div key={doc.id} className="text-sm py-1">
                    {doc.file_name}
                  </div>
                ))
              }
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Tags to {selectedDocuments.length} Document(s)</DialogTitle>
            <DialogDescription>
              Select tags to apply to the selected documents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Available Tags</Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCreateTagDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Tag
              </Button>
            </div>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => toggleTagSelection(tag.id)}
                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <Checkbox checked={selectedTags.includes(tag.id)} />
                  <Tag className="h-4 w-4" />
                  {tag.name}
                  {tag.description && (
                    <span className="text-xs opacity-70 ml-2">
                      {tag.description}
                    </span>
                  )}
                </div>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tags available. Create one to get started.
                </p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyTags} disabled={selectedTags.length === 0 || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply {selectedTags.length} Tag(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateTagDialog} onOpenChange={setShowCreateTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tag Name</Label>
              <Input
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="e.g., Important, Urgent, Review"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newTagDescription}
                onChange={e => setNewTagDescription(e.target.value)}
                placeholder="Brief description of this tag"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
