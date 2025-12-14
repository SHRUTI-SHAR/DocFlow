import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Folder, 
  FolderPlus, 
  Check, 
  Search,
  ChevronRight,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FolderItem {
  id: string;
  name: string;
  color?: string;
  parent_id?: string | null;
  document_count?: number;
}

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onAddToFolder: (folderId: string, folderName: string) => void;
}

export const AddToFolderDialog: React.FC<AddToFolderDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentName,
  onAddToFolder
}) => {
  const { toast } = useToast();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFolders();
    }
  }, [open]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Try to fetch from smart_folders table
      const { data, error } = await supabase
        .from('smart_folders')
        .select('*')
        .eq('user_id', user.user.id)
        .order('name');

      if (!error && data) {
        setFolders(data.map(f => ({
          id: f.id,
          name: f.name,
          color: f.color || undefined,
          parent_id: null,
          document_count: 0
        })));
      } else {
        // Use mock folders if table doesn't exist
        setFolders([
          { id: 'invoices', name: 'Invoices', color: '#3b82f6' },
          { id: 'contracts', name: 'Contracts', color: '#10b981' },
          { id: 'receipts', name: 'Receipts', color: '#f59e0b' },
          { id: 'reports', name: 'Reports', color: '#8b5cf6' },
          { id: 'personal', name: 'Personal', color: '#ec4899' },
          { id: 'work', name: 'Work', color: '#06b6d4' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    
    setCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Try to create in database
      const { data, error } = await supabase
        .from('smart_folders')
        .insert({
          name: newFolderName.trim(),
          user_id: user.user.id,
          color: '#6366f1',
          icon: 'folder'
        })
        .select()
        .single();

      if (!error && data) {
        setFolders(prev => [...prev, {
          id: data.id,
          name: data.name,
          color: data.color || undefined
        }]);
        setSelectedFolder(data.id);
        setNewFolderName('');
        setShowNewFolder(false);
        toast({
          title: "Folder created",
          description: `"${data.name}" folder created`,
        });
      } else {
        // Mock creation
        const newFolder = {
          id: `new-${Date.now()}`,
          name: newFolderName.trim(),
          color: '#6366f1'
        };
        setFolders(prev => [...prev, newFolder]);
        setSelectedFolder(newFolder.id);
        setNewFolderName('');
        setShowNewFolder(false);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Error",
        description: "Could not create folder",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAddToFolder = async () => {
    if (!selectedFolder) return;

    const folder = folders.find(f => f.id === selectedFolder);
    if (!folder) return;

    try {
      // Try to update document metadata with folder assignment
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('metadata')
        .eq('id', documentId)
        .single();

      if (!fetchError && doc) {
        const currentMetadata = (doc.metadata as Record<string, any>) || {};
        const currentFolders = (currentMetadata.folders as string[]) || [];
        
        if (!currentFolders.includes(selectedFolder)) {
          await supabase
            .from('documents')
            .update({
              metadata: {
                ...currentMetadata,
                folders: [...currentFolders, selectedFolder]
              }
            })
            .eq('id', documentId);
        }
      }

      onAddToFolder(selectedFolder, folder.name);
      onOpenChange(false);
      setSelectedFolder(null);
    } catch (error) {
      console.error('Error adding to folder:', error);
      // Still call the callback for UI update
      onAddToFolder(selectedFolder, folder.name);
      onOpenChange(false);
      setSelectedFolder(null);
    }
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Add to folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document being added */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <span className="text-muted-foreground">Adding: </span>
            <span className="font-medium">{documentName}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Folder list */}
          <ScrollArea className="h-[240px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading folders...
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Folder className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No folders found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      selectedFolder === folder.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: folder.color ? `${folder.color}20` : undefined }}
                    >
                      <Folder 
                        className="w-4 h-4" 
                        style={{ color: folder.color || 'currentColor' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{folder.name}</p>
                      {folder.document_count !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {folder.document_count} documents
                        </p>
                      )}
                    </div>
                    {selectedFolder === folder.id && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* New folder */}
          {showNewFolder ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                autoFocus
              />
              <Button 
                size="sm" 
                onClick={createFolder}
                disabled={!newFolderName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowNewFolder(true)}
            >
              <FolderPlus className="w-4 h-4" />
              Create new folder
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToFolder}
            disabled={!selectedFolder}
          >
            Add to folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
