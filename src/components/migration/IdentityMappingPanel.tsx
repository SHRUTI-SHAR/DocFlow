import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Users, 
  User, 
  UserPlus, 
  Check, 
  X, 
  AlertCircle,
  Upload,
  Download
} from 'lucide-react';
import { useMigration } from '@/hooks/useMigration';
import type { IdentityMapping, SourceSystem } from '@/types/migration';

interface IdentityMappingPanelProps {
  mappings: IdentityMapping[];
}

export function IdentityMappingPanel({ mappings }: IdentityMappingPanelProps) {
  const { saveIdentityMapping } = useMigration();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({
    source_system: 'google_drive' as SourceSystem,
    source_principal_id: '',
    source_principal_type: 'user' as 'user' | 'group' | 'domain' | 'anyone',
    source_email: '',
    source_display_name: '',
    target_user_id: '',
    role_mapping: {},
    fallback_action: 'owner_only' as 'owner_only' | 'skip' | 'report'
  });

  const groupedMappings = mappings.reduce((acc, m) => {
    if (!acc[m.source_system]) acc[m.source_system] = [];
    acc[m.source_system].push(m);
    return acc;
  }, {} as Record<string, IdentityMapping[]>);

  const handleAddMapping = async () => {
    const { data: userData } = await (await import('@/integrations/supabase/client')).supabase.auth.getUser();
    if (!userData.user) return;

    saveIdentityMapping({
      user_id: userData.user.id,
      ...newMapping,
      is_verified: false
    });
    setShowAddDialog(false);
    setNewMapping({
      source_system: 'google_drive',
      source_principal_id: '',
      source_principal_type: 'user',
      source_email: '',
      source_display_name: '',
      target_user_id: '',
      role_mapping: {},
      fallback_action: 'owner_only'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Identity Mappings
              </CardTitle>
              <CardDescription>
                Map users and groups from source systems to SimplifyDrive
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Identity Mapping</DialogTitle>
                    <DialogDescription>
                      Map a user or group from a source system to SimplifyDrive
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source System</Label>
                        <Select 
                          value={newMapping.source_system} 
                          onValueChange={(v: SourceSystem) => 
                            setNewMapping({ ...newMapping, source_system: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google_drive">Google Drive</SelectItem>
                            <SelectItem value="onedrive">OneDrive</SelectItem>
                            <SelectItem value="filenet">FileNet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Principal Type</Label>
                        <Select 
                          value={newMapping.source_principal_type} 
                          onValueChange={(v: any) => 
                            setNewMapping({ ...newMapping, source_principal_type: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="group">Group</SelectItem>
                            <SelectItem value="domain">Domain</SelectItem>
                            <SelectItem value="anyone">Anyone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Source Email</Label>
                      <Input
                        type="email"
                        placeholder="user@source-domain.com"
                        value={newMapping.source_email}
                        onChange={(e) => setNewMapping({ 
                          ...newMapping, 
                          source_email: e.target.value,
                          source_principal_id: e.target.value
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Source Display Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={newMapping.source_display_name}
                        onChange={(e) => setNewMapping({ ...newMapping, source_display_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target User ID (SimplifyDrive)</Label>
                      <Input
                        placeholder="UUID of SimplifyDrive user"
                        value={newMapping.target_user_id}
                        onChange={(e) => setNewMapping({ ...newMapping, target_user_id: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use fallback action
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Fallback Action</Label>
                      <Select 
                        value={newMapping.fallback_action} 
                        onValueChange={(v: any) => 
                          setNewMapping({ ...newMapping, fallback_action: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner_only">Owner only (restrict access)</SelectItem>
                          <SelectItem value="skip">Skip permission</SelectItem>
                          <SelectItem value="report">Report for review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMapping}>
                      Add Mapping
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedMappings).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No identity mappings configured</p>
              <p className="text-sm">
                Add mappings to ensure permissions are correctly applied during migration
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMappings).map(([system, systemMappings]) => (
                <div key={system}>
                  <h3 className="font-semibold mb-3 capitalize">
                    {system.replace('_', ' ')}
                  </h3>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {systemMappings.map((mapping) => (
                        <div 
                          key={mapping.id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {mapping.source_display_name || mapping.source_email || mapping.source_principal_id}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {mapping.source_email}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {mapping.source_principal_type}
                          </Badge>
                          {mapping.is_verified ? (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {mapping.fallback_action.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
