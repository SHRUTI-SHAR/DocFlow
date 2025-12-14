import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, HardDrive, Database, Loader2, Settings, FolderOpen, Shield, Zap } from 'lucide-react';
import type { SourceSystem, MigrationConfig, MigrationCredentials } from '@/types/migration';

interface CreateMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: {
    name: string;
    source_system: SourceSystem;
    config: MigrationConfig;
    credentials_id?: string;
  }) => void;
  credentials: MigrationCredentials[];
  isLoading: boolean;
}

export function CreateMigrationDialog({
  open,
  onOpenChange,
  onSubmit,
  credentials,
  isLoading
}: CreateMigrationDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>('google_drive');
  const [credentialsId, setCredentialsId] = useState<string>('');
  const [config, setConfig] = useState<MigrationConfig>({
    include_subfolders: true,
    include_permissions: true,
    include_versions: false,
    duplicate_policy: 'keep_both',
    concurrency: 5,
    retry_attempts: 3,
    delta_mode: false,
    dry_run: false
  });

  const sourceCredentials = credentials.filter(c => c.source_system === sourceSystem);

  const handleSubmit = () => {
    onSubmit({
      name,
      source_system: sourceSystem,
      config,
      credentials_id: credentialsId || undefined
    });
  };

  const sources = [
    { 
      id: 'google_drive' as SourceSystem, 
      name: 'Google Drive', 
      icon: Cloud,
      color: 'text-blue-500',
      description: 'Migrate from Google Drive including shared drives'
    },
    { 
      id: 'onedrive' as SourceSystem, 
      name: 'OneDrive / SharePoint', 
      icon: HardDrive,
      color: 'text-sky-500',
      description: 'Migrate from Microsoft OneDrive and SharePoint'
    },
    { 
      id: 'filenet' as SourceSystem, 
      name: 'IBM FileNet', 
      icon: Database,
      color: 'text-purple-500',
      description: 'Migrate from IBM FileNet P8'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Migration Job</DialogTitle>
          <DialogDescription>
            Configure a new migration from an external source to SimplifyDrive
          </DialogDescription>
        </DialogHeader>

        <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v))}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="1">1. Source</TabsTrigger>
            <TabsTrigger value="2" disabled={!sourceSystem}>2. Configure</TabsTrigger>
            <TabsTrigger value="3" disabled={!name}>3. Options</TabsTrigger>
          </TabsList>

          <TabsContent value="1" className="space-y-4">
            <div className="grid gap-4">
              {sources.map((source) => (
                <Card 
                  key={source.id}
                  className={`cursor-pointer transition-all ${
                    sourceSystem === source.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSourceSystem(source.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <source.icon className={`h-10 w-10 ${source.color}`} />
                    <div className="flex-1">
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.description}</p>
                    </div>
                    {sourceSystem === source.id && (
                      <div className="h-4 w-4 rounded-full bg-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="2" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Migration Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Q4 2024 Google Drive Migration"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Credentials</Label>
                <Select value={credentialsId} onValueChange={setCredentialsId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select saved credentials" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceCredentials.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No credentials saved for {sourceSystem.replace('_', ' ')}
                      </SelectItem>
                    ) : (
                      sourceCredentials.map(cred => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Configure credentials in the Credentials tab first
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_folder">Source Folder ID (optional)</Label>
                <Input
                  id="source_folder"
                  placeholder="Leave empty for root/entire drive"
                  value={config.source_folder_id || ''}
                  onChange={(e) => setConfig({ ...config, source_folder_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_folder">Target Folder ID (optional)</Label>
                <Input
                  id="target_folder"
                  placeholder="Leave empty for SimplifyDrive root"
                  value={config.target_folder_id || ''}
                  onChange={(e) => setConfig({ ...config, target_folder_id: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="3" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Content Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subfolders">Include subfolders</Label>
                    <Switch
                      id="subfolders"
                      checked={config.include_subfolders}
                      onCheckedChange={(v) => setConfig({ ...config, include_subfolders: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="versions">Include versions</Label>
                    <Switch
                      id="versions"
                      checked={config.include_versions}
                      onCheckedChange={(v) => setConfig({ ...config, include_versions: v })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duplicate handling</Label>
                    <Select 
                      value={config.duplicate_policy} 
                      onValueChange={(v: any) => setConfig({ ...config, duplicate_policy: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep_both">Keep both (add suffix)</SelectItem>
                        <SelectItem value="dedupe_checksum">Dedupe by checksum</SelectItem>
                        <SelectItem value="version_it">Create new version</SelectItem>
                        <SelectItem value="skip">Skip duplicates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Security Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="permissions">Migrate permissions</Label>
                    <Switch
                      id="permissions"
                      checked={config.include_permissions}
                      onCheckedChange={(v) => setConfig({ ...config, include_permissions: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dryrun">Dry run (no changes)</Label>
                    <Switch
                      id="dryrun"
                      checked={config.dry_run}
                      onCheckedChange={(v) => setConfig({ ...config, dry_run: v })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Performance Options */}
              <Card className="col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Concurrency (parallel workers)</Label>
                      <span className="text-sm text-muted-foreground">{config.concurrency}</span>
                    </div>
                    <Slider
                      value={[config.concurrency]}
                      onValueChange={([v]) => setConfig({ ...config, concurrency: v })}
                      min={1}
                      max={20}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher values = faster but may trigger rate limits
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Retry attempts</Label>
                      <span className="text-sm text-muted-foreground">{config.retry_attempts}</span>
                    </div>
                    <Slider
                      value={[config.retry_attempts]}
                      onValueChange={([v]) => setConfig({ ...config, retry_attempts: v })}
                      min={1}
                      max={10}
                      step={1}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="delta">Delta mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Only sync changes since last run
                      </p>
                    </div>
                    <Switch
                      id="delta"
                      checked={config.delta_mode}
                      onCheckedChange={(v) => setConfig({ ...config, delta_mode: v })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !name}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isLoading || !name}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Migration'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
