import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, Folder, FolderPlus, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentShortcuts } from '@/hooks/useDocumentShortcuts';
import { useToast } from '@/hooks/use-toast';

interface SmartFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CreateShortcutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

export const CreateShortcutDialog: React.FC<CreateShortcutDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentName,
}) => {
  const [folders, setFolders] = useState<SmartFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { createShortcut, hasShortcutInFolder } = useDocumentShortcuts();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchFolders();
      setSelectedFolders([]);
    }
  }, [open]);

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('smart_folders')
        .select('id, name, color, icon')
        .eq('user_id', user.user.id)
        .order('order_index');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setSelectedFolders(prev => {
      if (prev.includes(folderId)) {
        return prev.filter(id => id !== folderId);
      }
      return [...prev, folderId];
    });
  };

  const handleCreateShortcuts = async () => {
    if (selectedFolders.length === 0) {
      toast({
        title: "No folders selected",
        description: "Please select at least one folder",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      let created = 0;
      for (const folderId of selectedFolders) {
        const result = await createShortcut(documentId, folderId);
        if (result) created++;
      }

      if (created > 0) {
        toast({
          title: "Shortcuts created",
          description: `Created ${created} shortcut${created > 1 ? 's' : ''} successfully`,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating shortcuts:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Create Shortcuts
          </DialogTitle>
          <DialogDescription>
            Add shortcuts to "{documentName}" in multiple folders. The original document stays in place.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8">
              <FolderPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No folders available</p>
              <p className="text-sm text-muted-foreground">Create smart folders first to add shortcuts</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {folders.map((folder) => {
                  const hasShortcut = hasShortcutInFolder(documentId, folder.id);
                  const isSelected = selectedFolders.includes(folder.id);

                  return (
                    <div
                      key={folder.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        hasShortcut
                          ? 'bg-muted/50 border-muted cursor-not-allowed opacity-60'
                          : isSelected
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent border-border'
                      }`}
                      onClick={() => !hasShortcut && toggleFolder(folder.id)}
                    >
                      <Checkbox
                        checked={isSelected || hasShortcut}
                        disabled={hasShortcut}
                        onCheckedChange={() => toggleFolder(folder.id)}
                      />
                      
                      <div
                        className="p-2 rounded"
                        style={{
                          backgroundColor: `${folder.color}20`,
                          color: folder.color,
                        }}
                      >
                        <Folder className="h-4 w-4" />
                      </div>
                      
                      <span className="flex-1 font-medium">{folder.name}</span>
                      
                      {hasShortcut && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Already linked
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateShortcuts}
            disabled={selectedFolders.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Create {selectedFolders.length > 0 ? `${selectedFolders.length} ` : ''}Shortcut{selectedFolders.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
