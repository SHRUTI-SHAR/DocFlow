import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Brain,
  FileText,
  Tag,
  Clock,
  Star,
  Sparkles,
  Settings,
  Save
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface CustomizeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrganizationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold?: number;
  keywords?: string[];
  autoActions?: string[];
}

export const CustomizeRulesModal: React.FC<CustomizeRulesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [rules, setRules] = useState<OrganizationRule[]>([
    {
      id: 'importance',
      name: 'Importance Detection',
      description: 'Automatically identify and flag important documents',
      enabled: true,
      threshold: 75,
      autoActions: ['star', 'priority_folder']
    },
    {
      id: 'content_type',
      name: 'Content Type Classification',
      description: 'Automatically categorize documents by content type',
      enabled: true,
      keywords: ['contract', 'invoice', 'report', 'legal', 'financial']
    },
    {
      id: 'duplicate_detection',
      name: 'Duplicate Detection',
      description: 'Find and flag potential duplicate documents',
      enabled: true,
      threshold: 85
    },
    {
      id: 'auto_tagging',
      name: 'Smart Auto-Tagging',
      description: 'Automatically generate relevant tags for documents',
      enabled: true,
      threshold: 60
    },
    {
      id: 'expiry_tracking',
      name: 'Expiry Date Tracking',
      description: 'Detect and track documents with expiration dates',
      enabled: false,
      autoActions: ['reminder', 'priority_folder']
    }
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    aiConfidenceThreshold: 70,
    autoOrganizeFrequency: 'daily',
    smartFolderUpdates: true,
    tagSuggestions: true,
    duplicateWarnings: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const updateRule = (id: string, updates: Partial<OrganizationRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const addKeywordToRule = (ruleId: string, keyword: string) => {
    if (!keyword.trim()) return;
    
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { 
            ...rule, 
            keywords: [...(rule.keywords || []), keyword.trim()]
          }
        : rule
    ));
  };

  const removeKeywordFromRule = (ruleId: string, keyword: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { 
            ...rule, 
            keywords: rule.keywords?.filter(k => k !== keyword)
          }
        : rule
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Simulate saving to backend/localStorage
      localStorage.setItem('ai_organization_rules', JSON.stringify({
        rules,
        globalSettings,
        lastUpdated: new Date().toISOString()
      }));

      toast({
        title: "Rules Updated",
        description: "AI organization rules have been saved successfully",
      });

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save organization rules",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    // Reset to default rules
    setRules([
      {
        id: 'importance',
        name: 'Importance Detection',
        description: 'Automatically identify and flag important documents',
        enabled: true,
        threshold: 75,
        autoActions: ['star', 'priority_folder']
      },
      {
        id: 'content_type',
        name: 'Content Type Classification',
        description: 'Automatically categorize documents by content type',
        enabled: true,
        keywords: ['contract', 'invoice', 'report', 'legal', 'financial']
      },
      {
        id: 'duplicate_detection',
        name: 'Duplicate Detection',
        description: 'Find and flag potential duplicate documents',
        enabled: true,
        threshold: 85
      },
      {
        id: 'auto_tagging',
        name: 'Smart Auto-Tagging',
        description: 'Automatically generate relevant tags for documents',
        enabled: true,
        threshold: 60
      },
      {
        id: 'expiry_tracking',
        name: 'Expiry Date Tracking',
        description: 'Detect and track documents with expiration dates',
        enabled: false,
        autoActions: ['reminder', 'priority_folder']
      }
    ]);

    setGlobalSettings({
      aiConfidenceThreshold: 70,
      autoOrganizeFrequency: 'daily',
      smartFolderUpdates: true,
      tagSuggestions: true,
      duplicateWarnings: true
    });

    toast({
      title: "Rules Reset",
      description: "Organization rules have been reset to defaults",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customize AI Organization Rules
          </DialogTitle>
          <DialogDescription>
            Configure how AI automatically organizes and categorizes your documents.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rules">Organization Rules</TabsTrigger>
            <TabsTrigger value="settings">Global Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-4">
            <div className="space-y-4">
              {rules.map(rule => (
                <Card key={rule.id} className={rule.enabled ? 'border-primary/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {rule.id === 'importance' && <Star className="w-4 h-4 text-yellow-500" />}
                        {rule.id === 'content_type' && <FileText className="w-4 h-4 text-blue-500" />}
                        {rule.id === 'duplicate_detection' && <Brain className="w-4 h-4 text-purple-500" />}
                        {rule.id === 'auto_tagging' && <Tag className="w-4 h-4 text-green-500" />}
                        {rule.id === 'expiry_tracking' && <Clock className="w-4 h-4 text-orange-500" />}
                        {rule.name}
                      </CardTitle>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </CardHeader>

                  {rule.enabled && (
                    <CardContent className="space-y-4">
                      {rule.threshold !== undefined && (
                        <div>
                          <Label className="text-sm font-medium">
                            Confidence Threshold: {rule.threshold}%
                          </Label>
                          <Slider
                            value={[rule.threshold]}
                            onValueChange={([value]) => updateRule(rule.id, { threshold: value })}
                            max={100}
                            min={0}
                            step={5}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Higher values = more precise, lower values = more inclusive
                          </p>
                        </div>
                      )}

                      {rule.keywords !== undefined && (
                        <div>
                          <Label className="text-sm font-medium">Keywords</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {rule.keywords.map(keyword => (
                              <Badge
                                key={keyword}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeKeywordFromRule(rule.id, keyword)}
                              >
                                {keyword} ×
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Add keyword..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addKeywordToRule(rule.id, (e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {rule.autoActions && (
                        <div>
                          <Label className="text-sm font-medium">Auto Actions</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {rule.autoActions.map(action => (
                              <Badge key={action} variant="outline">
                                {action.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Global AI Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">
                    Global AI Confidence Threshold: {globalSettings.aiConfidenceThreshold}%
                  </Label>
                  <Slider
                    value={[globalSettings.aiConfidenceThreshold]}
                    onValueChange={([value]) => setGlobalSettings(prev => ({ ...prev, aiConfidenceThreshold: value }))}
                    max={100}
                    min={0}
                    step={5}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum confidence required for AI actions across all rules
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Smart Folder Auto-Updates</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically update smart folder contents when documents are added
                      </p>
                    </div>
                    <Switch
                      checked={globalSettings.smartFolderUpdates}
                      onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, smartFolderUpdates: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Tag Suggestions</Label>
                      <p className="text-xs text-muted-foreground">
                        Show AI-generated tag suggestions when viewing documents
                      </p>
                    </div>
                    <Switch
                      checked={globalSettings.tagSuggestions}
                      onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, tagSuggestions: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Duplicate Warnings</Label>
                      <p className="text-xs text-muted-foreground">
                        Warn when uploading potentially duplicate documents
                      </p>
                    </div>
                    <Switch
                      checked={globalSettings.duplicateWarnings}
                      onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, duplicateWarnings: checked }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};