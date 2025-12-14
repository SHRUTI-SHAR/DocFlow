/**
 * CloudSourceConfigSimple Component
 * Simple OAuth-based configuration for Google Drive and OneDrive
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Cloud, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { oauthService } from '@/services/oauthService';
import { GoogleDriveFolderBrowser } from './GoogleDriveFolderBrowser';
import type { GoogleDriveSourceConfig, OneDriveSourceConfig } from '@/types/bulk-processing';

interface CloudSourceConfigSimpleProps {
  sourceType: 'google_drive' | 'onedrive';
  config: Partial<GoogleDriveSourceConfig | OneDriveSourceConfig>;
  onChange: (config: Partial<GoogleDriveSourceConfig | OneDriveSourceConfig>) => void;
}

export const CloudSourceConfigSimple: React.FC<CloudSourceConfigSimpleProps> = ({
  sourceType,
  config,
  onChange
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [selectedFolderName, setSelectedFolderName] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const { toast } = useToast();

  // Check for saved tokens on mount
  React.useEffect(() => {
    const savedToken = localStorage.getItem(`${sourceType}_access_token`);
    const savedRefreshToken = localStorage.getItem(`${sourceType}_refresh_token`);
    
    if (savedToken) {
      setIsAuthenticated(true);
      
      // Restore token in config
      if (sourceType === 'google_drive') {
        onChange({
          ...config,
          accessToken: savedToken,
          refreshToken: savedRefreshToken || undefined
        } as any);
      } else {
        onChange({
          ...config,
          accessToken: savedToken
        } as any);
      }
    }
  }, [sourceType]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    
    try {
      const result = await oauthService.authenticate(sourceType);
      
      if (result.success) {
        setIsAuthenticated(true);
        
        // Save tokens to localStorage
        if (result.accessToken) {
          localStorage.setItem(`${sourceType}_access_token`, result.accessToken);
        }
        if (result.refreshToken) {
          localStorage.setItem(`${sourceType}_refresh_token`, result.refreshToken);
        }
        
        // Store access token in config to send to backend
        if (sourceType === 'google_drive') {
          onChange({
            ...config,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          } as any);
        } else {
          onChange({
            ...config,
            accessToken: result.accessToken
          } as any);
        }
        
        toast({ 
          title: `Successfully connected to ${sourceType === 'google_drive' ? 'Google Drive' : 'OneDrive'}!` 
        });
      }
    } catch (error) {
      console.error('OAuth failed:', error);
      toast({
        title: 'Authentication failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (sourceType === 'google_drive') {
    const gdConfig = config as Partial<GoogleDriveSourceConfig>;
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Google Drive Configuration
            </CardTitle>
            <CardDescription>
              Connect your Google Drive account to access files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sign In Button */}
            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                  <Button
                    onClick={handleSignIn}
                    disabled={isAuthenticating}
                    size="lg"
                    className="gap-2"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  You'll be able to select specific folders after signing in
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connected Status */}
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      Connected to Google Drive
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      You can now access your files
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAuthenticated(false);
                      localStorage.removeItem(`${sourceType}_access_token`);
                      localStorage.removeItem(`${sourceType}_refresh_token`);
                    }}
                  >
                    Change
                  </Button>
                </div>

                {/* Folder/File Selection */}
                <div className="space-y-2">
                  <Label>Select Folder or File</Label>
                  <GoogleDriveFolderBrowser
                    accessToken={gdConfig.accessToken || ''}
                    onSelectFolder={(folderId, folderName) => {
                      onChange({ ...config, folderId, fileId: undefined, fileName: undefined });
                      setSelectedFolderName(folderName);
                      setSelectedFileName('');
                      toast({ 
                        title: 'Folder selected', 
                        description: folderName || 'Entire Drive' 
                      });
                    }}
                    onSelectFile={(fileId, fileName) => {
                      onChange({ ...config, fileId, fileName, folderId: undefined });
                      setSelectedFileName(fileName);
                      setSelectedFolderName('');
                      toast({ 
                        title: 'File selected', 
                        description: fileName 
                      });
                    }}
                    selectedFolderId={gdConfig.folderId}
                    selectedFileId={gdConfig.fileId}
                    showFiles={true}
                    allowFileSelection={true}
                  />
                  {selectedFolderName && (
                    <p className="text-sm text-muted-foreground">
                      Selected folder: <span className="font-medium">{selectedFolderName}</span>
                    </p>
                  )}
                  {selectedFileName && (
                    <p className="text-sm text-muted-foreground">
                      Selected file: <span className="font-medium">{selectedFileName}</span>
                    </p>
                  )}
                </div>

                {/* File Types */}
                <div className="space-y-2">
                  <Label>File Types</Label>
                  <div className="flex gap-2">
                    {['PDF', 'Images', 'Documents'].map((type) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Recursive Search */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Include Subfolders</Label>
                    <p className="text-xs text-muted-foreground">
                      Search in all nested folders
                    </p>
                  </div>
                  <Switch
                    checked={gdConfig.recursive ?? true}
                    onCheckedChange={(checked) => onChange({ ...config, recursive: checked })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // OneDrive Configuration
  const odConfig = config as Partial<OneDriveSourceConfig>;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive Configuration
          </CardTitle>
          <CardDescription>
            Connect your Microsoft OneDrive account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                <Button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  size="lg"
                  className="gap-2"
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M24 12.3l-7.2 4.8V7.5L24 12.3zm-7.2-2.4v8.4L8.4 23V13.8L0 9l5.4-3.6L8.4 7.2l8.4 2.7zm-9 8.1l6.6-4.5L8.4 9v9zM5.4 9L0 12.3l8.4 5.4v-9l-3-1.8z"/>
                      </svg>
                      Sign in with Microsoft
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Access your OneDrive and SharePoint files
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Connected Status */}
              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Connected to OneDrive
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Ready to access your files
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAuthenticated(false)}
                >
                  Change
                </Button>
              </div>

              {/* Folder Path */}
              <div className="space-y-2">
                <Label htmlFor="folder-path">
                  Folder Path (Optional)
                </Label>
                <Input
                  id="folder-path"
                  placeholder="/Documents/Invoices"
                  value={odConfig.folderPath || ''}
                  onChange={(e) => onChange({ ...config, folderPath: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to search entire drive
                </p>
              </div>

              {/* File Types */}
              <div className="space-y-2">
                <Label>File Types</Label>
                <div className="flex gap-2">
                  {['PDF', 'Images', 'Documents'].map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recursive Search */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Subfolders</Label>
                  <p className="text-xs text-muted-foreground">
                    Search in all nested folders
                  </p>
                </div>
                <Switch
                  checked={odConfig.recursive ?? true}
                  onCheckedChange={(checked) => onChange({ ...config, recursive: checked })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
