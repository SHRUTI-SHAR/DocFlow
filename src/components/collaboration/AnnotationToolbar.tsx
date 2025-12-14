import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Highlighter, Underline, Strikethrough, Square, Circle,
  ArrowRight, Pencil, Type, Stamp, MapPin, Scan,
  Palette, ChevronDown, Undo, Redo, Trash2, Eye, EyeOff,
  Layers, MousePointer
} from 'lucide-react';
import { 
  AnnotationType, 
  AnnotationColor, 
  ANNOTATION_COLORS,
  ANNOTATION_TOOLS,
  STAMP_TYPES,
  StampType
} from '@/types/annotations';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  activeColor: AnnotationColor;
  onToolChange: (tool: AnnotationType | null) => void;
  onColorChange: (color: AnnotationColor) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAll?: () => void;
  onToggleVisibility?: () => void;
  annotationsVisible?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedStamp?: StampType;
  onStampChange?: (stamp: StampType) => void;
  compact?: boolean;
}

const TOOL_ICONS: Record<AnnotationType, React.ReactNode> = {
  highlight: <Highlighter className="h-4 w-4" />,
  underline: <Underline className="h-4 w-4" />,
  strikethrough: <Strikethrough className="h-4 w-4" />,
  box: <Square className="h-4 w-4" />,
  circle: <Circle className="h-4 w-4" />,
  arrow: <ArrowRight className="h-4 w-4" />,
  freehand: <Pencil className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  stamp: <Stamp className="h-4 w-4" />,
  pin: <MapPin className="h-4 w-4" />,
  area: <Scan className="h-4 w-4" />,
};

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeTool,
  activeColor,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onClearAll,
  onToggleVisibility,
  annotationsVisible = true,
  canUndo = false,
  canRedo = false,
  selectedStamp = 'approved',
  onStampChange,
  compact = false
}) => {
  const textTools: AnnotationType[] = ['highlight', 'underline', 'strikethrough'];
  const shapeTools: AnnotationType[] = ['box', 'circle', 'arrow', 'freehand'];
  const markerTools: AnnotationType[] = ['text', 'stamp', 'pin', 'area'];

  const renderToolButton = (type: AnnotationType) => {
    const tool = ANNOTATION_TOOLS.find(t => t.type === type);
    if (!tool) return null;

    const isActive = activeTool === type;

    return (
      <TooltipProvider key={type}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={isActive}
              onPressedChange={() => onToolChange(isActive ? null : type)}
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                isActive && "bg-primary text-primary-foreground"
              )}
            >
              {TOOL_ICONS[type]}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{tool.label}</p>
            {tool.shortcut && (
              <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">{tool.shortcut}</kbd>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={cn(
      "flex items-center gap-1 p-1 bg-background border rounded-lg shadow-sm",
      compact && "p-0.5"
    )}>
      {/* Selection tool */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              pressed={activeTool === null}
              onPressedChange={() => onToolChange(null)}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <MousePointer className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Select</p>
            <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">V</kbd>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text annotation tools */}
      <div className="flex items-center gap-0.5">
        {textTools.map(renderToolButton)}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Shape tools */}
      <div className="flex items-center gap-0.5">
        {shapeTools.map(renderToolButton)}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Marker tools */}
      <div className="flex items-center gap-0.5">
        {markerTools.map(renderToolButton)}
      </div>

      {/* Stamp type selector */}
      {activeTool === 'stamp' && onStampChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              {STAMP_TYPES[selectedStamp].label}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(STAMP_TYPES).map(([key, { label, color }]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onStampChange(key as StampType)}
                className="gap-2"
              >
                <div 
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: ANNOTATION_COLORS[color].border }}
                />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <div 
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: ANNOTATION_COLORS[activeColor].bg }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {(Object.keys(ANNOTATION_COLORS) as AnnotationColor[]).map((color) => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                  activeColor === color && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ 
                  backgroundColor: ANNOTATION_COLORS[color].bg,
                  borderColor: ANNOTATION_COLORS[color].border
                }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Undo</p>
              <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">⌘Z</kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Redo</p>
              <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-xs">⌘⇧Z</kbd>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Visibility toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onToggleVisibility}
            >
              {annotationsVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{annotationsVisible ? 'Hide annotations' : 'Show annotations'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Clear all */}
      {onClearAll && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={onClearAll}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Clear all annotations</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default AnnotationToolbar;
