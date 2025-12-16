import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, Brain, Loader2, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MoveToFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  onMoved?: () => void;
}

interface SmartFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  is_smart: boolean;
  document_count: number;
}

export const MoveToFolderDialog: React.FC<MoveToFolderDialogProps> = ({
  isOpen,
  onClose,
  documentId,
  documentName,
  onMoved
}) => {
  const [folders, setFolders] = useState<SmartFolder[]>([]);
  const [currentFolders, setCurrentFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      fetchCurrentFolders();
    }
  }, [isOpen, documentId]);

  const fetchFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('smart_folders')
        .select('*')
        .eq('user_id', user.user.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('document_shortcuts')
        .select('folder_id')
        .eq('document_id', documentId);

      if (error) throw error;
      setCurrentFolders(data?.map(d => d.folder_id) || []);
    } catch (error) {
      console.error('Error fetching current folders:', error);
    }
  };

  const handleToggleFolder = async (folderId: string) => {
    setMoving(true);
    try {
      const isInFolder = currentFolders.includes(folderId);

      if (isInFolder) {
        // Remove from folder
        const { error } = await supabase
          .from('document_shortcuts')
          .delete()
          .eq('document_id', documentId)
          .eq('folder_id', folderId);

        if (error) throw error;

        setCurrentFolders(prev => prev.filter(id => id !== folderId));
        
        // Update document count
        await updateFolderCount(folderId, -1);
        
        toast({
          title: "Removed from Folder",
          description: `${documentName} removed from folder`,
        });
      } else {
        // Add to folder
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error('Not authenticated');

        const { error } = await supabase
          .from('document_shortcuts')
          .insert({
            document_id: documentId,
            folder_id: folderId,
            user_id: user.user.id
          });

        if (error) throw error;

        setCurrentFolders(prev => [...prev, folderId]);
        
        // Update document count
        await updateFolderCount(folderId, 1);
        
        toast({
          title: "Added to Folder",
          description: `${documentName} added to folder`,
        });
      }

      onMoved?.();
    } catch (error) {
      console.error('Error toggling folder:', error);
      toast({
        title: "Error",
        description: "Failed to update folder",
        variant: "destructive",
      });
    } finally {
      setMoving(false);
    }
  };

  const updateFolderCount = async (folderId: string, change: number) => {
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      await supabase
        .from('smart_folders')
        .update({ 
          document_count: Math.max(0, folder.document_count + change) 
        })
        .eq('id', folderId);
    } catch (error) {
      console.error('Error updating folder count:', error);
    }
  };

  const iconMap: { [key: string]: React.ReactNode } = {
    'Folder': <Folder className="w-4 h-4" />,
    'FileText': <Folder className="w-4 h-4" />,
    'Briefcase': <Folder className="w-4 h-4" />,
    'Star': <Folder className="w-4 h-4" />,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Select folders to add "{documentName}" to. You can add documents to multiple folders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No folders yet</p>
              <p className="text-sm">Create a folder first to organize your documents</p>
            </div>
          ) : (
            folders.map(folder => {
              const isInFolder = currentFolders.includes(folder.id);
              return (
                <Button
                  key={folder.id}
                  variant={isInFolder ? "default" : "outline"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => handleToggleFolder(folder.id)}
                  disabled={moving}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div 
                      className="p-1 rounded"
                      style={{ 
                        backgroundColor: `${folder.color}20`,
                        color: folder.color 
                      }}
                    >
                      {iconMap[folder.icon] || <Folder className="w-4 h-4" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {folder.name}
                        {folder.is_smart && (
                          <Brain className="w-3 h-3" />
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        {folder.description || `${folder.document_count} documents`}
                      </div>
                    </div>
                    {isInFolder && (
                      <Check className="w-5 h-5 flex-shrink-0" />
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
