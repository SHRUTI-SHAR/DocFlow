import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Key, 
  Plus, 
  Cloud, 
  HardDrive, 
  Database,
  Check,
  X,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { useMigration } from '@/hooks/useMigration';
import { formatDistanceToNow } from 'date-fns';
import type { MigrationCredentials, SourceSystem } from '@/types/migration';

interface CredentialsPanelProps {
  credentials: MigrationCredentials[];
}

export function CredentialsPanel({ credentials }: CredentialsPanelProps) {
  const { saveCredentials } = useMigration();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [newCredential, setNewCredential] = useState<{
    name: string;
    source_system: SourceSystem;
    credentials: Record<string, string>;
  }>({
    name: '',
    source_system: 'google_drive',
    credentials: {}
  });

  const getSourceIcon = (source: SourceSystem) => {
    switch (source) {
      case 'google_drive': return <Cloud className="h-5 w-5 text-blue-500" />;
      case 'onedrive': return <HardDrive className="h-5 w-5 text-sky-500" />;
      case 'filenet': return <Database className="h-5 w-5 text-purple-500" />;
    }
  };

  const handleAddCredential = () => {
    saveCredentials({
      name: newCredential.name,
      source_system: newCredential.source_system,
      credentials: newCredential.credentials
    });
    setShowAddDialog(false);
    setNewCredential({
      name: '',
      source_system: 'google_drive',
      credentials: {}
    });
  };

  const getCredentialFields = (source: SourceSystem) => {
    switch (source) {
      case 'google_drive':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'refresh_token', label: 'Refresh Token', type: 'password' }
        ];
      case 'onedrive':
        return [
          { key: 'client_id', label: 'Application (client) ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
          { key: 'tenant_id', label: 'Directory (tenant) ID', type: 'text' },
          { key: 'refresh_token', label: 'Refresh Token', type: 'password' }
        ];
      case 'filenet':
        return [
          { key: 'server_url', label: 'Server URL', type: 'text' },
          { key: 'username', label: 'Username', type: 'text' },
          { key: 'password', label: 'Password', type: 'password' },
          { key: 'object_store', label: 'Object Store', type: 'text' }
        ];
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Migration Credentials
              </CardTitle>
              <CardDescription>
                Securely store API credentials for source systems
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credentials
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Credentials</DialogTitle>
                  <DialogDescription>
                    Add API credentials for a source system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Credential Name</Label>
                    <Input
                      placeholder="e.g., Production Google Drive"
                      value={newCredential.name}
                      onChange={(e) => setNewCredential({ ...newCredential, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source System</Label>
                    <Select 
                      value={newCredential.source_system} 
                      onValueChange={(v: SourceSystem) => 
                        setNewCredential({ 
                          ...newCredential, 
                          source_system: v,
                          credentials: {}
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_drive">Google Drive</SelectItem>
                        <SelectItem value="onedrive">OneDrive / SharePoint</SelectItem>
                        <SelectItem value="filenet">IBM FileNet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {getCredentialFields(newCredential.source_system).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      <div className="relative">
                        <Input
                          type={field.type === 'password' && !showSecret ? 'password' : 'text'}
                          value={(newCredential.credentials as any)[field.key] || ''}
                          onChange={(e) => setNewCredential({
                            ...newCredential,
                            credentials: {
                              ...newCredential.credentials,
                              [field.key]: e.target.value
                            }
                          })}
                        />
                        {field.type === 'password' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowSecret(!showSecret)}
                          >
                            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Credentials are encrypted and stored securely. Never share your API keys.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddCredential}
                    disabled={!newCredential.name}
                  >
                    Save Credentials
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {credentials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credentials configured</p>
              <p className="text-sm">
                Add credentials to enable migrations from external sources
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {credentials.map((cred) => (
                  <div 
                    key={cred.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    {getSourceIcon(cred.source_system)}
                    <div className="flex-1">
                      <p className="font-medium">{cred.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {cred.source_system.replace('_', ' ')}
                      </p>
                      {cred.last_validated_at && (
                        <p className="text-xs text-muted-foreground">
                          Validated {formatDistanceToNow(new Date(cred.last_validated_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    {cred.is_valid ? (
                      <Badge className="bg-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Invalid
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              Google Drive
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console</li>
              <li>Create a project and enable Drive API</li>
              <li>Create OAuth 2.0 credentials</li>
              <li>Add authorized redirect URIs</li>
              <li>Generate refresh token using OAuth flow</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <HardDrive className="h-4 w-4 text-sky-500" />
              OneDrive / SharePoint
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to Azure Portal &gt; App Registrations</li>
              <li>Create new registration</li>
              <li>Add Microsoft Graph API permissions (Files.Read.All)</li>
              <li>Create client secret</li>
              <li>Generate refresh token using OAuth flow</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-purple-500" />
              IBM FileNet
            </h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Get FileNet Content Engine server URL</li>
              <li>Obtain service account credentials</li>
              <li>Note the Object Store name</li>
              <li>Ensure network connectivity from SimplifyDrive</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
