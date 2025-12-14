/**
 * SourceConfigurationStep Component
 * Step 1 of the bulk processing wizard - Configure source
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderTree, Database, Cloud, ArrowRight, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BulkJobConfig, SourceType, ProcessingModeType } from '@/types/bulk-processing';

interface SourceConfigurationStepProps {
  initialData?: Partial<BulkJobConfig>;
  onComplete: (data: Partial<BulkJobConfig>) => void;
}

export const SourceConfigurationStep: React.FC<SourceConfigurationStepProps> = ({
  initialData,
  onComplete
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialData?.source?.type as SourceType) || 'folder'
  );
  
  const [folderPath, setFolderPath] = useState<string>(
    initialData?.source?.type === 'folder' ? (initialData.source as any).path || '' : ''
  );
  const [fileTypes, setFileTypes] = useState<string[]>(
    initialData?.source?.type === 'folder' ? (initialData.source as any).fileTypes || ['pdf'] : ['pdf']
  );
  const [recursive, setRecursive] = useState<boolean>(
    initialData?.source?.type === 'folder' ? (initialData.source as any).recursive || false : false
  );

  const [processingMode, setProcessingMode] = useState<ProcessingModeType>(
    initialData?.processing?.mode || 'once'
  );
  const [batchSize, setBatchSize] = useState<number>(
    initialData?.processing?.batchSize || 10
  );

  const handleFolderPicker = async () => {
    try {
      // Check if File System Access API is available (Chrome, Edge, Opera)
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker();
        const folderName = directoryHandle.name;
        
        // Try to get full path - File System Access API has limitations
        // We'll try to construct it or get what we can
        let fullPath = folderName;
        
        // Try to get more path information if available
        try {
          // Some browsers expose a path property (non-standard)
          if ((directoryHandle as any).path) {
            fullPath = (directoryHandle as any).path;
          } else {
            // Try to query the directory for path hints
            // Note: This is limited by browser security
            fullPath = folderName;
          }
        } catch (e) {
          // If we can't get path, use folder name
          fullPath = folderName;
        }
        
        // Show message about path limitations
        toast({
          title: 'Folder selected',
          description: `Selected: ${folderName}. Browser security prevents full path access. Please enter the complete server-side path manually (e.g., C:\\Users\\manjul\\...\\${folderName}).`,
          variant: 'default',
        });
        
        // Set folder name - user will need to edit to full path
        setFolderPath(fullPath);
      } else {
        // Fallback: Use file input with webkitdirectory
        fileInputRef.current?.click();
      }
    } catch (error: any) {
      // User cancelled the picker
      if (error.name !== 'AbortError') {
        console.error('Error selecting folder:', error);
        toast({
          title: 'Error',
          description: 'Failed to select folder. Please enter the path manually.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Get the folder path from the first file
      const firstFile = files[0];
      let fullPath = '';
      
      // Method 1: Try to get full path from file object (Chrome/Edge on Windows)
      // The 'path' property is non-standard but works in some browsers
      const filePath = (firstFile as any).path;
      
      if (filePath) {
        // Extract directory path (remove filename)
        const pathParts = filePath.split(/[/\\]/);
        pathParts.pop(); // Remove filename
        // Preserve the original path separator
        const separator = filePath.includes('\\') ? '\\' : '/';
        fullPath = pathParts.join(separator);
        
        // Verify it's an absolute path (starts with drive letter or root)
        if (fullPath && (fullPath.match(/^[A-Z]:\\/) || fullPath.startsWith('/'))) {
          // Valid absolute path - use it directly
          setFolderPath(fullPath);
          toast({
            title: 'Complete path detected',
            description: `Full path: ${fullPath}`,
          });
          // Reset input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }
      
      // Method 1b: Try alternative path properties
      if (!fullPath) {
        // Try other non-standard properties that might contain path info
        const altPath = (firstFile as any).mozFullPath || (firstFile as any).webkitPath;
        if (altPath) {
          const pathParts = altPath.split(/[/\\]/);
          pathParts.pop();
          const separator = altPath.includes('\\') ? '\\' : '/';
          fullPath = pathParts.join(separator);
          
          if (fullPath && (fullPath.match(/^[A-Z]:\\/) || fullPath.startsWith('/'))) {
            setFolderPath(fullPath);
            toast({
              title: 'Complete path detected',
              description: `Full path: ${fullPath}`,
            });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
        }
      }
      // Method 2: Try webkitRelativePath (gives relative path only)
      if (!fullPath && (firstFile as any).webkitRelativePath) {
        const relativePath = (firstFile as any).webkitRelativePath;
        const pathParts = relativePath.split('/');
        pathParts.pop(); // Remove filename
        
        // webkitRelativePath is relative, not absolute
        // We can't get the full path, so show a helpful message
        const relativeFolderPath = pathParts.length > 0 ? pathParts.join('/') : '';
        
        toast({
          title: 'Folder structure detected',
          description: 'Browser security prevents full path access. Please enter the complete server-side path manually (e.g., C:\\Users\\...\\folder or /home/user/.../folder).',
          variant: 'default',
        });
        
        // Don't set a path - user needs to enter full path manually
        // But we could show the folder name as a hint
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      // Method 3: No path information available
      if (!fullPath) {
        toast({
          title: 'Path information not available',
          description: 'Please enter the complete server-side folder path manually (e.g., C:\\Users\\manjul\\Documents\\folder or /home/user/documents/folder).',
          variant: 'default',
        });
        // Don't set a path - let user enter it manually
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
    }
    // Reset input so the same folder can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleNext = () => {
    let sourceConfig;
    
    if (sourceType === 'folder') {
      sourceConfig = {
        type: 'folder' as const,
        path: folderPath,
        fileTypes: fileTypes.length > 0 ? fileTypes : ['pdf'],
        recursive
      };
    } else if (sourceType === 'database') {
      sourceConfig = {
        type: 'database' as const,
        table: '',
        filters: {}
      };
    } else {
      sourceConfig = {
        type: 'cloud' as const,
        provider: 's3' as const,
        bucket: '',
        pathPrefix: ''
      };
    }

    const processingConfig = {
      mode: processingMode,
      batchSize
    };

    onComplete({
      source: sourceConfig,
      processing: processingConfig
    });
  };

  const isFormValid = () => {
    if (sourceType === 'folder') {
      return folderPath.trim().length > 0 && fileTypes.length > 0;
    }
    // TODO: Add validation for database and cloud sources
    return true;
  };

  const availableFileTypes = ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'bmp'];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Source Type</h3>
        <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="folder" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Folder
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </TabsTrigger>
            <TabsTrigger value="cloud" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="folder" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Folder Configuration</CardTitle>
                <CardDescription>
                  Configure the folder path and file types to process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-path">Folder Path</Label>
                  <div className="flex gap-2">
                    <Input
                      id="folder-path"
                      placeholder="/path/to/documents"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFolderPicker}
                      className="flex items-center gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Click "Browse" to select a folder from your device. 
                    <span className="font-medium text-foreground"> Note:</span> Due to browser security, the complete path may not be available. 
                    For server-side bulk processing, you may need to enter the complete server path manually (e.g., <code className="text-xs bg-muted px-1 py-0.5 rounded">C:\Users\manjul\Documents\folder</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">/home/user/documents/folder</code>).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>File Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableFileTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`file-type-${type}`}
                          checked={fileTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFileTypes([...fileTypes, type]);
                            } else {
                              setFileTypes(fileTypes.filter(t => t !== type));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`file-type-${type}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {type.toUpperCase()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recursive"
                    checked={recursive}
                    onCheckedChange={(checked) => setRecursive(checked as boolean)}
                  />
                  <Label
                    htmlFor="recursive"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include subfolders (recursive)
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Configuration</CardTitle>
                <CardDescription>
                  Configure database source (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Database source configuration will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cloud" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Cloud Storage Configuration</CardTitle>
                <CardDescription>
                  Configure cloud storage source (coming soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cloud storage source configuration will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Processing Configuration</h3>
        <Card>
          <CardHeader>
            <CardTitle>Processing Mode</CardTitle>
            <CardDescription>
              Configure how the job should process documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processing-mode">Processing Mode</Label>
              <Select
                value={processingMode}
                onValueChange={(value) => setProcessingMode(value as ProcessingModeType)}
              >
                <SelectTrigger id="processing-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Process Once</SelectItem>
                  <SelectItem value="continuous">Continuous Processing</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {processingMode === 'once' 
                  ? 'Scan source once, process all found documents, then stop automatically'
                  : 'Keep scanning source for new documents until manually stopped'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">Discovery Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min="1"
                max="100"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
              />
              <p className="text-sm text-muted-foreground">
                Number of documents to discover and queue from source per scan cycle. 
                <span className="font-medium"> Note:</span> This controls how many documents are added to the queue at once. 
                The actual processing concurrency is controlled by "Parallel Workers" in the next step.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!isFormValid()}
          size="lg"
        >
          Next: Processing Settings
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

