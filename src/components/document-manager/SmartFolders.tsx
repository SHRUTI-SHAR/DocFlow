import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, 
  FolderOpen, 
  Plus, 
  Brain, 
  Star, 
  Clock, 
  FileText,
  Briefcase,
  Receipt,
  Award,
  User,
  MoreHorizontal,
  Settings,
  Sparkles,
  Trash2,
  Image,
  Video,
  Music,
  File,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateFolderModal } from './CreateFolderModal';
import { CustomizeRulesModal } from './CustomizeRulesModal';

interface SmartFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  is_smart: boolean;
  document_count: number;
  ai_criteria: any;
  order_index: number;
}

interface SmartFoldersProps {
  onFolderSelect: (folderId: string) => void;
  selectedFolder: string;
}

const iconMap: { [key: string]: React.ReactNode } = {
  'Folder': <Folder className="w-4 h-4" />,
  'Briefcase': <Briefcase className="w-4 h-4" />,
  'Receipt': <Receipt className="w-4 h-4" />,
  'Award': <Award className="w-4 h-4" />,
  'User': <User className="w-4 h-4" />,
  'FileText': <FileText className="w-4 h-4" />,
  'Star': <Star className="w-4 h-4" />,
  'Clock': <Clock className="w-4 h-4" />,
};

export const SmartFolders: React.FC<SmartFoldersProps> = ({
  onFolderSelect,
  selectedFolder
}) => {
  const [folders, setFolders] = useState<SmartFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSmartFolders();
  }, []);

  const fetchSmartFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('smart_folders')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        // If table doesn't exist, just set empty folders
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setFolders([]);
          return;
        }
        console.error('Error fetching folders:', error);
        return;
      }

      setFolders(data || []);
    } catch (error) {
      console.error('Error:', error);
      // Don't show error toast if table doesn't exist yet
      if (error instanceof Error && !error.message?.includes('does not exist')) {
        toast({
          title: "Error",
          description: "Failed to load smart folders",
          variant: "destructive",
        });
      }
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const moveFolderUp = async (folderId: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex <= 0) return; // Can't move up if it's already first

    const currentFolder = folders[folderIndex];
    const previousFolder = folders[folderIndex - 1];

    try {
      // Swap order_index values
      await Promise.all([
        supabase
          .from('smart_folders')
          .update({ order_index: previousFolder.order_index })
          .eq('id', currentFolder.id),
        supabase
          .from('smart_folders')
          .update({ order_index: currentFolder.order_index })
          .eq('id', previousFolder.id)
      ]);

      // Refresh folders list
      fetchSmartFolders();
      
      toast({
        title: "Folder moved",
        description: `${currentFolder.name} moved up`,
      });
    } catch (error) {
      console.error('Error moving folder up:', error);
      toast({
        title: "Error",
        description: "Failed to move folder up",
        variant: "destructive",
      });
    }
  };

  const moveFolderDown = async (folderId: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex >= folders.length - 1) return; // Can't move down if it's already last

    const currentFolder = folders[folderIndex];
    const nextFolder = folders[folderIndex + 1];

    try {
      // Swap order_index values
      await Promise.all([
        supabase
          .from('smart_folders')
          .update({ order_index: nextFolder.order_index })
          .eq('id', currentFolder.id),
        supabase
          .from('smart_folders')
          .update({ order_index: currentFolder.order_index })
          .eq('id', nextFolder.id)
      ]);

      // Refresh folders list
      fetchSmartFolders();
      
      toast({
        title: "Folder moved",
        description: `${currentFolder.name} moved down`,
      });
    } catch (error) {
      console.error('Error moving folder down:', error);
      toast({
        title: "Error",
        description: "Failed to move folder down",
        variant: "destructive",
      });
    }
  };

  const createDefaultFolders = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const defaultFolders = [
        {
          user_id: user.user.id,
          name: 'Important Documents',
          description: 'AI-identified high importance documents',
          color: '#dc2626',
          icon: 'Star',
          is_smart: true,
          ai_criteria: { importance_score: { min: 0.8 } },
          order_index: 1
        },
        {
          user_id: user.user.id,
          name: 'Recent Uploads',
          description: 'Documents uploaded in the last 7 days',
          color: '#2563eb',
          icon: 'Clock',
          is_smart: true,
          ai_criteria: { created_at: { days: 7 } },
          order_index: 2
        },
        {
          user_id: user.user.id,
          name: 'Contracts',
          description: 'Legal contracts and agreements',
          color: '#059669',
          icon: 'Briefcase',
          is_smart: true,
          ai_criteria: { content_type: ['contract', 'agreement', 'legal'] },
          order_index: 3
        },
        {
          user_id: user.user.id,
          name: 'Financial Documents',
          description: 'Invoices, receipts, and financial records',
          color: '#7c3aed',
          icon: 'Receipt',
          is_smart: true,
          ai_criteria: { content_type: ['invoice', 'receipt', 'financial'] },
          order_index: 4
        }
      ];

      const { error } = await supabase
        .from('smart_folders')
        .insert(defaultFolders);

      if (error) {
        console.error('Error creating default folders:', error);
        return;
      }

      toast({
        title: "Smart Folders Created",
        description: "AI-powered folders have been set up for you",
      });

      fetchSmartFolders();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Smart Folders
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      // All Documents
      <Button
        variant={selectedFolder === 'all' ? 'default' : 'ghost'}
        className="w-full justify-start h-auto p-3"
        onClick={() => onFolderSelect('all')}
      >
        <div className="flex items-center gap-3">
          <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded">
            <Folder className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left">
            <div className="font-medium">All Documents</div>
            <div className="text-xs text-muted-foreground">View all documents</div>
          </div>
        </div>
      </Button>

      {/* Browse Files by Media */}
      <Button
        variant={selectedFolder === 'media-browser' ? 'default' : 'ghost'}
        className="w-full justify-start h-auto p-3"
        onClick={() => onFolderSelect('media-browser')}
      >
        <div className="flex items-center gap-3">
          <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded">
            <Image className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            <div className="font-medium">Browse Files by Media</div>
            <div className="text-xs text-muted-foreground">Filter by file type</div>
          </div>
        </div>
      </Button>

      {folders.length === 0 ? (
        <Card className="p-4 text-center border-dashed">
          <div className="space-y-3">
            <Sparkles className="w-8 h-8 text-muted-foreground mx-auto" />
            <div>
              <p className="font-medium">No Smart Folders Yet</p>
              <p className="text-sm text-muted-foreground">
                Let AI organize your documents automatically
              </p>
            </div>
            <Button onClick={createDefaultFolders} size="sm">
              Create Smart Folders
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {folders.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                  onClick={() => moveFolderUp(folder.id)}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                  onClick={() => moveFolderDown(folder.id)}
                  disabled={index === folders.length - 1}
                  title="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant={selectedFolder === folder.id ? 'default' : 'ghost'}
                className="w-full justify-start h-auto p-3 flex-1"
                onClick={() => onFolderSelect(folder.id)}
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
                        <Brain className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {folder.document_count} documents
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {folder.document_count}
                  </Badge>
                </div>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Recycle Bin */}
      <Button
        variant={selectedFolder === 'recycle-bin' ? 'default' : 'ghost'}
        className="w-full justify-start h-auto p-3"
        onClick={() => onFolderSelect('recycle-bin')}
      >
        <div className="flex items-center gap-3">
          <div className="p-1 bg-red-100 dark:bg-red-900 rounded">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-left">
            <div className="font-medium">Recycle Bin</div>
            <div className="text-xs text-muted-foreground">Deleted documents</div>
          </div>
        </div>
      </Button>

      {/* AI Organization Status */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">AI Organization</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Documents are automatically organized based on content, type, and importance.
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowCustomizeModal(true)}>
            <Settings className="w-3 h-3 mr-1" />
            Customize Rules
          </Button>
        </CardContent>
      </Card>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onFolderCreated={fetchSmartFolders}
      />

      {/* Customize Rules Modal */}
      <CustomizeRulesModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
      />
    </div>
  );
};