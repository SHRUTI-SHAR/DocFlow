/**
 * GoogleDriveFolderBrowser Component
 * Browse and select folders from Google Drive
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, File, ChevronRight, Loader2, Search, RefreshCw } from 'lucide-react';

interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  modifiedTime?: string;
}

interface GoogleDriveFolderBrowserProps {
  accessToken: string;
  onSelectFolder: (folderId: string, folderName: string) => void;
  onSelectFile?: (fileId: string, fileName: string) => void;
  selectedFolderId?: string;
  selectedFileId?: string;
  showFiles?: boolean; // Option to show files alongside folders
  allowFileSelection?: boolean; // Allow selecting individual files
}

export const GoogleDriveFolderBrowser: React.FC<GoogleDriveFolderBrowserProps> = ({
  accessToken,
  onSelectFolder,
  onSelectFile,
  selectedFolderId,
  selectedFileId,
  showFiles = true,
  allowFileSelection = true
}) => {
  const [folders, setFolders] = useState<GoogleDriveItem[]>([]);
  const [files, setFiles] = useState<GoogleDriveItem[]>([]);
  const [currentPath, setCurrentPath] = useState<GoogleDriveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string>('');

  const loadFolders = async (parentId?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const folderQuery = parentId 
        ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      console.log('Loading folders with query:', folderQuery);
      
      const folderResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name,mimeType,parents,modifiedTime)&orderBy=name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      console.log('Folder response status:', folderResponse.status);
      
      if (!folderResponse.ok) {
        const errorData = await folderResponse.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error?.message || 'Failed to load folders');
      }

      const folderData = await folderResponse.json();
      console.log('Folders loaded:', folderData.files);
      setFolders(folderData.files || []);

      // Load files if showFiles is true
      if (showFiles) {
        const fileQuery = parentId 
          ? `'${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`
          : `'root' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`;

        const fileResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id,name,mimeType,parents,size,modifiedTime)&orderBy=name`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          console.log('Files loaded:', fileData.files);
          setFiles(fileData.files || []);
        }
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const searchFolders = async () => {
    if (!searchQuery.trim()) {
      loadFolders();
      return;
    }

    setIsLoading(true);
    try {
      const query = `name contains '${searchQuery}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents)&orderBy=name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search folders');
      }

      const data = await response.json();
      setFolders(data.files || []);
    } catch (error) {
      console.error('Error searching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: GoogleDriveItem) => {
    setCurrentPath([...currentPath, folder]);
    loadFolders(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    
    if (index === -1) {
      loadFolders(); // Root
    } else {
      loadFolders(newPath[index].id);
    }
  };

  const handleSelectFolder = (folder: GoogleDriveItem) => {
    onSelectFolder(folder.id, folder.name);
  };

  useEffect(() => {
    if (accessToken) {
      loadFolders();
    }
  }, [accessToken]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchFolders()}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={searchFolders}
          disabled={isLoading}
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            setSearchQuery('');
            loadFolders(currentPath[currentPath.length - 1]?.id);
          }}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => handleBreadcrumbClick(-1)}
        >
          My Drive
        </Button>
        {currentPath.map((folder, index) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="h-4 w-4" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleBreadcrumbClick(index)}
            >
              {folder.name}
            </Button>
          </React.Fragment>
        ))}
      </div>

      {/* Folder List */}
      <ScrollArea className="h-[300px] border rounded-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
            <p className="text-sm font-medium mb-2">Error loading folders</p>
            <p className="text-xs text-center">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => loadFolders(currentPath[currentPath.length - 1]?.id)}
            >
              Retry
            </Button>
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No folders or files found</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Folders */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  selectedFolderId === folder.id 
                    ? 'bg-primary/10 border-primary shadow-sm' 
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
              >
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => handleFolderClick(folder)}
                  title="Open folder to view contents"
                >
                  <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <Button
                  variant={selectedFolderId === folder.id ? 'default' : 'secondary'}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectFolder(folder);
                  }}
                  title="Select this folder for processing"
                >
                  {selectedFolderId === folder.id ? '✓ Selected' : 'Select'}
                </Button>
              </div>
            ))}
            
            {/* Files */}
            {showFiles && files.length > 0 && (
              <>
                {folders.length > 0 && <div className="h-px bg-border my-2" />}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      allowFileSelection && selectedFileId === file.id
                        ? 'bg-primary/10 border-primary shadow-sm border cursor-pointer'
                        : allowFileSelection
                        ? 'border border-transparent hover:border-primary/50 hover:bg-accent cursor-pointer'
                        : 'text-muted-foreground'
                    }`}
                    onClick={() => allowFileSelection && onSelectFile?.(file.id, file.name)}
                  >
                    <File className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.size && (
                        <span className="text-xs text-muted-foreground">
                          {(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
                      {allowFileSelection && selectedFileId === file.id && (
                        <span className="text-xs font-medium text-primary">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* File count info */}
      {!isLoading && !error && (
        <div className="text-xs text-muted-foreground">
          {folders.length} folder{folders.length !== 1 ? 's' : ''}
          {showFiles && files.length > 0 && `, ${files.length} file${files.length !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Select Root Option */}
      <div 
        className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors cursor-pointer ${
          selectedFolderId === '' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:border-primary/50 hover:bg-accent'
        }`}
        onClick={() => onSelectFolder('', 'Entire Drive')}
      >
        <div className="flex items-center gap-3">
          <Folder className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium">Entire Drive (All Files)</p>
            <p className="text-xs text-muted-foreground">Process all files in your drive</p>
          </div>
        </div>
        <Button
          variant={selectedFolderId === '' ? 'default' : 'secondary'}
          size="sm"
          className="pointer-events-none"
        >
          {selectedFolderId === '' ? '✓ Selected' : 'Select'}
        </Button>
      </div>
    </div>
  );
};
