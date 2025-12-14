import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Droplets,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Loader2,
  Type,
  Image,
} from 'lucide-react';
import { useWatermark, WatermarkSettings, WatermarkPosition, WatermarkType } from '@/hooks/useWatermark';
import { WatermarkPreview } from './WatermarkPreview';

const positionOptions: { value: WatermarkPosition; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'tile', label: 'Tile (Repeat)' },
];

const fontOptions = [
  'Arial',
  'Times New Roman',
  'Helvetica',
  'Georgia',
  'Courier New',
  'Verdana',
];

export function WatermarkEditor() {
  const { watermarks, defaultWatermark, isLoading, createWatermark, updateWatermark, deleteWatermark } = useWatermark();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWatermark, setEditingWatermark] = useState<WatermarkSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    watermark_type: 'text' as WatermarkType,
    text_content: 'CONFIDENTIAL',
    font_family: 'Arial',
    font_size: 48,
    text_color: '#00000033',
    rotation: -45,
    opacity: 0.3,
    position: 'center' as WatermarkPosition,
    include_date: false,
    include_username: false,
    is_default: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      watermark_type: 'text',
      text_content: 'CONFIDENTIAL',
      font_family: 'Arial',
      font_size: 48,
      text_color: '#00000033',
      rotation: -45,
      opacity: 0.3,
      position: 'center',
      include_date: false,
      include_username: false,
      is_default: false,
    });
    setEditingWatermark(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (wm: WatermarkSettings) => {
    setFormData({
      name: wm.name,
      watermark_type: wm.watermark_type,
      text_content: wm.text_content || 'CONFIDENTIAL',
      font_family: wm.font_family,
      font_size: wm.font_size,
      text_color: wm.text_color,
      rotation: wm.rotation,
      opacity: wm.opacity,
      position: wm.position,
      include_date: wm.include_date,
      include_username: wm.include_username,
      is_default: wm.is_default,
    });
    setEditingWatermark(wm);
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingWatermark) {
        await updateWatermark(editingWatermark.id, {
          ...formData,
          image_url: null,
          document_id: null,
        });
      } else {
        await createWatermark({
          ...formData,
          image_url: null,
          document_id: null,
        });
      }
      setShowCreateDialog(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Document Watermarks
              </CardTitle>
              <CardDescription>
                Create and manage watermarks to protect your documents
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Watermark
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {watermarks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No watermarks created</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Create watermarks to add text or images to your documents for branding or security purposes.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Watermark
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watermarks.map((wm) => (
                  <Card key={wm.id} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{wm.name}</h4>
                            {wm.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {wm.watermark_type === 'text' ? `"${wm.text_content}"` : 'Image watermark'}
                            {' • '}{wm.position}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(wm)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!wm.is_default && (
                              <DropdownMenuItem onClick={() => updateWatermark(wm.id, { is_default: true })}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteWatermark(wm.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <WatermarkPreview
                        settings={wm}
                        width={250}
                        height={180}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWatermark ? 'Edit Watermark' : 'Create Watermark'}
            </DialogTitle>
            <DialogDescription>
              Configure watermark settings and preview
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Confidential Draft"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_content">Watermark Text</Label>
                  <Input
                    id="text_content"
                    placeholder="CONFIDENTIAL"
                    value={formData.text_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, font_family: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map(font => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, position: v as WatermarkPosition }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map(pos => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Size: {formData.font_size}px</Label>
                  <Slider
                    value={[formData.font_size]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, font_size: v }))}
                    min={12}
                    max={120}
                    step={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rotation: {formData.rotation}°</Label>
                  <Slider
                    value={[formData.rotation]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, rotation: v }))}
                    min={-90}
                    max={90}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Opacity: {Math.round(formData.opacity * 100)}%</Label>
                  <Slider
                    value={[formData.opacity]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, opacity: v }))}
                    min={0.05}
                    max={1}
                    step={0.05}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color.slice(0, 7)}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        text_color: e.target.value + Math.round(formData.opacity * 255).toString(16).padStart(2, '0')
                      }))}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                      placeholder="#00000033"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Include Date</Label>
                    <Switch
                      checked={formData.include_date}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_date: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include Username</Label>
                    <Switch
                      checked={formData.include_username}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_username: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Set as Default</Label>
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <WatermarkPreview
                  settings={formData}
                  width={300}
                  height={400}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingWatermark ? (
                  'Save Changes'
                ) : (
                  'Create Watermark'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
