/**
 * CloudSourceConfig Component
 * Configuration UI for Google Drive and OneDrive sources
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Cloud, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GoogleDriveSourceConfig, OneDriveSourceConfig } from '@/types/bulk-processing';

interface CloudSourceConfigProps {
  sourceType: 'google_drive' | 'onedrive';
  config: Partial<GoogleDriveSourceConfig | OneDriveSourceConfig>;
  onChange: (config: Partial<GoogleDriveSourceConfig | OneDriveSourceConfig>) => void;
}

export const CloudSourceConfig: React.FC<CloudSourceConfigProps> = ({
  sourceType,
  config,
  onChange
}) => {
  const [authMethod, setAuthMethod] = useState<'json' | 'file' | 'token'>(
    sourceType === 'google_drive' 
      ? (config.credentialsJson ? 'json' : config.credentialsFile ? 'file' : 'token')
      : (config.clientSecret ? 'client_secret' : 'token')
  );

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
              Configure your Google Drive connection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Authentication Method */}
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <RadioGroup 
                value={authMethod} 
                onValueChange={(value) => setAuthMethod(value as any)}
                className="grid gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="auth-json" />
                  <Label htmlFor="auth-json" className="font-normal">
                    Service Account (JSON String)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="file" id="auth-file" />
                  <Label htmlFor="auth-file" className="font-normal">
                    Service Account (File Path)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="token" id="auth-token" />
                  <Label htmlFor="auth-token" className="font-normal">
                    OAuth Token (File Path)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Credentials JSON */}
            {authMethod === 'json' && (
              <div className="space-y-2">
                <Label htmlFor="credentials-json" className="flex items-center gap-2">
                  Service Account JSON
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Paste the entire JSON content from your service account key file
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Textarea
                  id="credentials-json"
                  placeholder='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
                  value={gdConfig.credentialsJson || ''}
                  onChange={(e) => onChange({ 
                    ...config, 
                    credentialsJson: e.target.value,
                    credentialsFile: undefined,
                    tokenFile: undefined
                  })}
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>
            )}

            {/* Credentials File Path */}
            {authMethod === 'file' && (
              <div className="space-y-2">
                <Label htmlFor="credentials-file" className="flex items-center gap-2">
                  Service Account File Path
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Full path to your service account JSON key file on the server
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="credentials-file"
                  placeholder="/path/to/service-account-key.json"
                  value={gdConfig.credentialsFile || ''}
                  onChange={(e) => onChange({ 
                    ...config, 
                    credentialsFile: e.target.value,
                    credentialsJson: undefined,
                    tokenFile: undefined
                  })}
                />
              </div>
            )}

            {/* Token File Path */}
            {authMethod === 'token' && (
              <div className="space-y-2">
                <Label htmlFor="token-file" className="flex items-center gap-2">
                  OAuth Token File Path
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          Full path to your OAuth token file on the server
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="token-file"
                  placeholder="/path/to/token.json"
                  value={gdConfig.tokenFile || ''}
                  onChange={(e) => onChange({ 
                    ...config, 
                    tokenFile: e.target.value,
                    credentialsJson: undefined,
                    credentialsFile: undefined
                  })}
                />
              </div>
            )}

            {/* Folder ID */}
            <div className="space-y-2">
              <Label htmlFor="folder-id" className="flex items-center gap-2">
                Folder ID (Optional)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Find this in the Google Drive URL after /folders/<br/>
                        Leave empty to search entire drive
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="folder-id"
                placeholder="1a2b3c4d5e6f7g8h9i (leave empty for entire drive)"
                value={gdConfig.folderId || ''}
                onChange={(e) => onChange({ ...config, folderId: e.target.value })}
              />
            </div>

            {/* Shared Drive ID */}
            <div className="space-y-2">
              <Label htmlFor="shared-drive-id" className="flex items-center gap-2">
                Shared/Team Drive ID (Optional)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Required only if accessing files in a shared/team drive
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="shared-drive-id"
                placeholder="0AExampleSharedDriveId"
                value={gdConfig.sharedDriveId || ''}
                onChange={(e) => onChange({ ...config, sharedDriveId: e.target.value })}
              />
            </div>

            {/* File Types */}
            <div className="space-y-2">
              <Label htmlFor="file-types">File Types (MIME types)</Label>
              <Input
                id="file-types"
                placeholder="application/pdf, image/jpeg, image/png"
                value={(gdConfig.fileTypes || []).join(', ')}
                onChange={(e) => onChange({ 
                  ...config, 
                  fileTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated MIME types. Default: PDF, JPEG, PNG
              </p>
            </div>

            {/* Recursive */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Search Subfolders</Label>
                <p className="text-xs text-muted-foreground">
                  Include files from all nested folders
                </p>
              </div>
              <Switch
                checked={gdConfig.recursive ?? true}
                onCheckedChange={(checked) => onChange({ ...config, recursive: checked })}
              />
            </div>
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
            OneDrive / SharePoint Configuration
          </CardTitle>
          <CardDescription>
            Configure your Microsoft OneDrive or SharePoint connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="client-id" className="flex items-center gap-2">
              Client ID *
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Application (client) ID from Azure AD app registration
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="client-id"
              placeholder="12345678-1234-1234-1234-123456789abc"
              value={odConfig.clientId || ''}
              onChange={(e) => onChange({ ...config, clientId: e.target.value })}
              required
            />
          </div>

          {/* Tenant ID */}
          <div className="space-y-2">
            <Label htmlFor="tenant-id" className="flex items-center gap-2">
              Tenant ID *
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Directory (tenant) ID from Azure AD
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="tenant-id"
              placeholder="87654321-4321-4321-4321-abcdefghijkl"
              value={odConfig.tenantId || ''}
              onChange={(e) => onChange({ ...config, tenantId: e.target.value })}
              required
            />
          </div>

          {/* Authentication Method */}
          <div className="space-y-2">
            <Label>Authentication Method</Label>
            <RadioGroup 
              value={authMethod} 
              onValueChange={(value) => setAuthMethod(value as any)}
              className="grid gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="client_secret" id="auth-client-secret" />
                <Label htmlFor="auth-client-secret" className="font-normal">
                  Client Secret (Application)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="token" id="auth-token-od" />
                <Label htmlFor="auth-token-od" className="font-normal">
                  Token File (User Access)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Client Secret */}
          {authMethod === 'client_secret' && (
            <div className="space-y-2">
              <Label htmlFor="client-secret" className="flex items-center gap-2">
                Client Secret *
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Client secret value from Azure AD app registration
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="client-secret"
                type="password"
                placeholder="Your client secret"
                value={odConfig.clientSecret || ''}
                onChange={(e) => onChange({ 
                  ...config, 
                  clientSecret: e.target.value,
                  tokenFile: undefined
                })}
              />
            </div>
          )}

          {/* Token File */}
          {authMethod === 'token' && (
            <div className="space-y-2">
              <Label htmlFor="token-file-od" className="flex items-center gap-2">
                Token File Path *
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Full path to saved access token file on the server
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="token-file-od"
                placeholder="/path/to/onedrive_token.json"
                value={odConfig.tokenFile || ''}
                onChange={(e) => onChange({ 
                  ...config, 
                  tokenFile: e.target.value,
                  clientSecret: undefined
                })}
              />
            </div>
          )}

          {/* Folder Path */}
          <div className="space-y-2">
            <Label htmlFor="folder-path" className="flex items-center gap-2">
              Folder Path (Optional)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Path like /Documents/Invoices<br/>
                      Leave empty to search entire drive root
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="folder-path"
              placeholder="/Documents/Invoices (leave empty for root)"
              value={odConfig.folderPath || ''}
              onChange={(e) => onChange({ ...config, folderPath: e.target.value })}
            />
          </div>

          {/* Site ID */}
          <div className="space-y-2">
            <Label htmlFor="site-id" className="flex items-center gap-2">
              SharePoint Site ID (Optional)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Required only for accessing SharePoint sites
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="site-id"
              placeholder="your-site-id"
              value={odConfig.siteId || ''}
              onChange={(e) => onChange({ ...config, siteId: e.target.value })}
            />
          </div>

          {/* Drive ID */}
          <div className="space-y-2">
            <Label htmlFor="drive-id" className="flex items-center gap-2">
              Drive ID (Optional)
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Specific drive ID if not using default user drive
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="drive-id"
              placeholder="drive-id"
              value={odConfig.driveId || ''}
              onChange={(e) => onChange({ ...config, driveId: e.target.value })}
            />
          </div>

          {/* File Types */}
          <div className="space-y-2">
            <Label htmlFor="file-types-od">File Types (Extensions)</Label>
            <Input
              id="file-types-od"
              placeholder=".pdf, .jpg, .png"
              value={(odConfig.fileTypes || []).join(', ')}
              onChange={(e) => onChange({ 
                ...config, 
                fileTypes: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated file extensions. Default: .pdf, .jpg, .png
            </p>
          </div>

          {/* Recursive */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Search Subfolders</Label>
              <p className="text-xs text-muted-foreground">
                Include files from all nested folders
              </p>
            </div>
            <Switch
              checked={odConfig.recursive ?? true}
              onCheckedChange={(checked) => onChange({ ...config, recursive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-2">Need Help?</h4>
          <p className="text-xs text-muted-foreground mb-2">
            To set up Azure AD authentication:
          </p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Go to Azure Portal → Azure Active Directory</li>
            <li>Register a new application</li>
            <li>Add API permission: Files.Read.All</li>
            <li>Create a client secret</li>
            <li>Copy Client ID, Tenant ID, and Secret</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
