import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { FieldRenderer } from './FieldRenderer.tsx';
import type { TemplateField } from '@/types/template';

interface HierarchicalSection {
  id: string;
  name: string;
  order: number;
  fields: TemplateField[];
  subsections?: HierarchicalSection[];
}

interface SectionManagerProps {
  section: HierarchicalSection;
  isExpanded: boolean;
  onToggleExpanded: (sectionId: string) => void;
  onEditSection: (sectionId: string, newName: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddField: (sectionId: string) => void;
  onEditField: (field: TemplateField) => void;
  onDeleteField: (fieldId: string) => void;
  onEditFieldName: (sectionId: string, fieldId: string, newName: string) => void;
  onReorderFields?: (sectionId: string, fieldId: string, newIndex: number) => void;
  onReorderSection?: (sectionId: string, newIndex: number) => void;
}

// Helper to format section names - removes page suffixes for display
const formatSectionName = (sectionName: string): string => {
  // Remove page number suffixes (e.g., "_page_1", " Page 1", etc.)
  const cleaned = sectionName
    .replace(/_page_\d+$/i, '') // Remove "_page_1" at the end
    .replace(/[_\s]page\s*\d+$/i, '') // Remove " page 1" or "_page1" at the end
    .replace(/\s+page\s+\d+$/i, ''); // Remove " Page 1" at the end
  
  return cleaned
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

export const SectionManager: React.FC<SectionManagerProps> = ({
  section,
  isExpanded,
  onToggleExpanded,
  onEditSection,
  onDeleteSection,
  onAddField,
  onEditField,
  onDeleteField,
  onEditFieldName,
  onReorderFields,
  onReorderSection
}) => {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editName, setEditName] = React.useState(formatSectionName(section.name));
  const [draggedFieldId, setDraggedFieldId] = React.useState<string | null>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll during drag
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!draggedFieldId) return;
      
      const scrollThreshold = 100; // Distance from edge to start scrolling
      const scrollSpeed = 10; // Pixels per frame
      const viewportHeight = window.innerHeight;
      const scrollContainer = document.querySelector('.h-dvh') || window;
      
      const mouseY = e.clientY;
      const scrollAmount = viewportHeight * 0.05; // 5% of viewport height
      
      // Clear any existing interval
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      
      // Check if near top edge
      if (mouseY < scrollThreshold) {
        const scrollFn = () => {
          const currentScrollY = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
          const newScrollY = Math.max(0, currentScrollY - scrollSpeed);
          if (scrollContainer === window) {
            window.scrollTo({ top: newScrollY, behavior: 'auto' });
          } else {
            (scrollContainer as HTMLElement).scrollTop = newScrollY;
          }
          if (e.clientY < scrollThreshold && newScrollY > 0) {
            scrollIntervalRef.current = requestAnimationFrame(scrollFn);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scrollFn);
      }
      // Check if near bottom edge
      else if (mouseY > viewportHeight - scrollThreshold) {
        const scrollFn = () => {
          const scrollContainerElement = scrollContainer === window ? document.documentElement : (scrollContainer as HTMLElement);
          const scrollHeight = scrollContainerElement.scrollHeight;
          const scrollTop = scrollContainer === window ? window.scrollY : (scrollContainer as HTMLElement).scrollTop;
          const clientHeight = scrollContainer === window ? window.innerHeight : (scrollContainer as HTMLElement).clientHeight;
          const maxScroll = scrollHeight - clientHeight;
          const newScrollY = Math.min(maxScroll, scrollTop + scrollSpeed);
          
          if (scrollContainer === window) {
            window.scrollTo({ top: newScrollY, behavior: 'auto' });
          } else {
            (scrollContainer as HTMLElement).scrollTop = newScrollY;
          }
          if (e.clientY > viewportHeight - scrollThreshold && newScrollY < maxScroll) {
            scrollIntervalRef.current = requestAnimationFrame(scrollFn);
          }
        };
        scrollIntervalRef.current = requestAnimationFrame(scrollFn);
      }
    };
    
    const handleDragEnd = () => {
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
    
    if (draggedFieldId) {
      document.addEventListener('dragover', handleDragOver);
      document.addEventListener('dragend', handleDragEnd);
    }
    
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, [draggedFieldId]);

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    if (!draggedFieldId || draggedFieldId === targetFieldId || !onReorderFields) return;

    const fieldIndex = section.fields.findIndex(field => field.id === targetFieldId);
    if (fieldIndex !== -1) {
      onReorderFields(section.id, draggedFieldId, fieldIndex);
    }
    setDraggedFieldId(null);
    // Clear scroll interval
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleSectionDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', section.id);
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onEditSection(section.id, editName.trim());
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(section.name);
    setIsEditingName(false);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpanded(section.id)}>
      <div className="border rounded-lg" ref={containerRef}>
        <CollapsibleTrigger asChild>
          <div 
            className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer"
            draggable={!!onReorderSection}
            onDragStart={handleSectionDragStart}
            onDragEnd={() => {
              if (scrollIntervalRef.current) {
                cancelAnimationFrame(scrollIntervalRef.current);
                scrollIntervalRef.current = null;
              }
            }}
          >
            <div className="flex items-center gap-3">
              {onReorderSection && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="h-8 w-48"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{formatSectionName(section.name)}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {section.fields.length} fields
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditingName && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddField(section.id);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSection(section.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 overflow-hidden">
            {section.fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No fields in this section yet.</p>
                <p className="text-xs mt-1">Click the + button above to add a field.</p>
              </div>
            ) : (
              section.fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable={!!onReorderFields}
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, field.id)}
                  className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 ${
                    draggedFieldId === field.id ? 'opacity-50' : ''
                  }`}
                >
                  {onReorderFields && (
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <FieldRenderer
                      field={field}
                      onEdit={onEditField}
                      onDelete={onDeleteField}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
