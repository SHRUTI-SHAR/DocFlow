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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Folder,
  Briefcase,
  Receipt,
  Award,
  User,
  FileText,
  Star,
  Clock,
  Heart,
  Shield,
  Zap,
  Target
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
}

const iconOptions = [
  { value: 'Folder', icon: Folder, label: 'Folder' },
  { value: 'Briefcase', icon: Briefcase, label: 'Briefcase' },
  { value: 'Receipt', icon: Receipt, label: 'Receipt' },
  { value: 'Award', icon: Award, label: 'Award' },
  { value: 'User', icon: User, label: 'User' },
  { value: 'FileText', icon: FileText, label: 'Document' },
  { value: 'Star', icon: Star, label: 'Star' },
  { value: 'Clock', icon: Clock, label: 'Clock' },
  { value: 'Heart', icon: Heart, label: 'Heart' },
  { value: 'Shield', icon: Shield, label: 'Shield' },
  { value: 'Zap', icon: Zap, label: 'Zap' },
  { value: 'Target', icon: Target, label: 'Target' }
];

const colorOptions = [
  '#dc2626', // red
  '#ea580c', // orange
  '#d97706', // amber
  '#65a30d', // lime
  '#059669', // emerald
  '#0891b2', // cyan
  '#2563eb', // blue
  '#7c3aed', // violet
  '#c026d3', // fuchsia
  '#dc2626'  // pink
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onFolderCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2563eb',
    icon: 'Folder',
    isSmart: false,
    smartCriteria: {
      contentTypes: [] as string[],
      importanceScore: 0,
      daysOld: 0,
      keywords: [] as string[]
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const { toast } = useToast();

  const contentTypeOptions = [
    'contract', 'agreement', 'legal', 'invoice', 'receipt', 'financial',
    'report', 'presentation', 'spreadsheet', 'image', 'pdf', 'personal',
    'business', 'medical', 'insurance', 'tax', 'certificate'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a folder name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      let aiCriteria = null;
      if (formData.isSmart) {
        aiCriteria = {
          content_type: formData.smartCriteria.contentTypes,
          importance_score: formData.smartCriteria.importanceScore > 0 
            ? { min: formData.smartCriteria.importanceScore / 100 }
            : null,
          days_old: formData.smartCriteria.daysOld > 0 
            ? formData.smartCriteria.daysOld
            : null,
          keywords: formData.smartCriteria.keywords
        };
      }

      const { data, error } = await supabase
        .from('smart_folders')
        .insert({
          user_id: user.user.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          icon: formData.icon,
          is_smart: formData.isSmart,
          ai_criteria: aiCriteria,
          document_count: 0
        })
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Folder Created",
        description: `${formData.name} has been created successfully`,
      });

      // If it's a smart folder, trigger organization of existing documents
      if (formData.isSmart && data && data[0]) {
        try {
          const fastApiUrl = (import.meta as any).env.VITE_FASTAPI_URL;
          if (!fastApiUrl) throw new Error('VITE_FASTAPI_URL is required');
          const organizeResponse = await fetch(`${fastApiUrl}/api/v1/organize-existing-documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId: data[0].id })
          });

          if (organizeResponse.ok) {
            const organizeResult = await organizeResponse.json();
            toast({
              title: "Smart Folder Active",
              description: `Organized ${organizeResult.documentsAdded} existing documents into "${formData.name}"`,
            });
          } else {
            console.warn('Failed to organize existing documents, but folder was created');
          }
        } catch (error) {
          console.warn('Failed to organize existing documents:', error);
          toast({
            title: "Smart Folder Created",
            description: "Folder created but organization of existing documents failed",
            variant: "destructive",
          });
        }
      }

      onFolderCreated();
      onClose();
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        color: '#2563eb',
        icon: 'Folder',
        isSmart: false,
        smartCriteria: {
          contentTypes: [],
          importanceScore: 0,
          daysOld: 0,
          keywords: []
        }
      });

    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.smartCriteria.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        smartCriteria: {
          ...prev.smartCriteria,
          keywords: [...prev.smartCriteria.keywords, keywordInput.trim()]
        }
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      smartCriteria: {
        ...prev.smartCriteria,
        keywords: prev.smartCriteria.keywords.filter(k => k !== keyword)
      }
    }));
  };

  const toggleContentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      smartCriteria: {
        ...prev.smartCriteria,
        contentTypes: prev.smartCriteria.contentTypes.includes(type)
          ? prev.smartCriteria.contentTypes.filter(t => t !== type)
          : [...prev.smartCriteria.contentTypes, type]
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a regular folder or an AI-powered smart folder that automatically organizes documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Folder Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter folder name"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(option => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color</Label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-primary' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Smart Folder Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Smart Folder</div>
              <div className="text-sm text-muted-foreground">
                Automatically organize documents using AI criteria
              </div>
            </div>
            <Switch
              checked={formData.isSmart}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSmart: checked }))}
            />
          </div>

          {/* Smart Criteria */}
          {formData.isSmart && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium">AI Organization Criteria</h4>
              
              {/* Content Types */}
              <div>
                <Label>Document Types</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {contentTypeOptions.map(type => (
                    <Badge
                      key={type}
                      variant={formData.smartCriteria.contentTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer justify-center py-2"
                      onClick={() => toggleContentType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Importance Score */}
              <div>
                <Label>Minimum Importance Score (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.smartCriteria.importanceScore}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    smartCriteria: {
                      ...prev.smartCriteria,
                      importanceScore: parseInt(e.target.value) || 0
                    }
                  }))}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Documents with AI importance score above this threshold
                </p>
              </div>

              {/* Days Old */}
              <div>
                <Label>Maximum Age (Days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.smartCriteria.daysOld}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    smartCriteria: {
                      ...prev.smartCriteria,
                      daysOld: parseInt(e.target.value) || 0
                    }
                  }))}
                  placeholder="0 (no limit)"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only include documents newer than this (0 = no limit)
                </p>
              </div>

              {/* Keywords */}
              <div>
                <Label>Keywords</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.smartCriteria.keywords.map(keyword => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Documents containing these keywords in content or filename
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};