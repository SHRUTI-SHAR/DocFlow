import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Layers,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Download,
  Blend,
  SplitSquareHorizontal,
  Diff,
  Grid3X3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface VisualDocumentComparisonProps {
  baseDocumentUrl: string;
  compareDocumentUrl: string;
  baseLabel?: string;
  compareLabel?: string;
  onClose: () => void;
}

type ViewMode = 'side-by-side' | 'overlay' | 'slider' | 'difference' | 'onion';

export function VisualDocumentComparison({
  baseDocumentUrl,
  compareDocumentUrl,
  baseLabel = 'Base Version',
  compareLabel = 'Compare Version',
  onClose,
}: VisualDocumentComparisonProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [zoom, setZoom] = useState([100]);
  const [rotation, setRotation] = useState(0);
  const [sliderPosition, setSliderPosition] = useState([50]);
  const [overlayOpacity, setOverlayOpacity] = useState([50]);
  const [syncScroll, setSyncScroll] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [baseLoaded, setBaseLoaded] = useState(false);
  const [compareLoaded, setCompareLoaded] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoom(prev => [Math.min(prev[0] + 10, 300)]);
      } else if (e.key === '-') {
        setZoom(prev => [Math.max(prev[0] - 10, 25)]);
      } else if (e.key === '0') {
        setZoom([100]);
        setPosition({ x: 0, y: 0 });
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation(prev => (prev + 90) % 360);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  // Synchronized scrolling
  useEffect(() => {
    if (!syncScroll || viewMode !== 'side-by-side') return;

    const handleScroll = (source: 'base' | 'compare') => (e: Event) => {
      const sourceEl = e.target as HTMLDivElement;
      const targetEl = source === 'base' ? compareRef.current : baseRef.current;
      
      if (targetEl) {
        targetEl.scrollTop = sourceEl.scrollTop;
        targetEl.scrollLeft = sourceEl.scrollLeft;
      }
    };

    const baseEl = baseRef.current;
    const compareEl = compareRef.current;

    if (baseEl && compareEl) {
      baseEl.addEventListener('scroll', handleScroll('base'));
      compareEl.addEventListener('scroll', handleScroll('compare'));
      
      return () => {
        baseEl.removeEventListener('scroll', handleScroll('base'));
        compareEl.removeEventListener('scroll', handleScroll('compare'));
      };
    }
  }, [syncScroll, viewMode]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && zoom[0] > 100) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom([100]);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const imageStyle = {
    transform: `scale(${zoom[0] / 100}) rotate(${rotation}deg) translate(${position.x / (zoom[0] / 100)}px, ${position.y / (zoom[0] / 100)}px)`,
    cursor: isDragging ? 'grabbing' : zoom[0] > 100 ? 'grab' : 'default',
  };

  const renderImage = (url: string, label: string, onLoad: () => void) => (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: 'linear-gradient(to right, hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary) / 0.1) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      )}
      <img
        src={url}
        alt={label}
        className="max-w-full max-h-full object-contain transition-transform duration-200"
        style={imageStyle}
        onLoad={onLoad}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-background border rounded-lg overflow-hidden',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-full'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Diff className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Visual Comparison</h3>
            <p className="text-xs text-muted-foreground">Compare document visually</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-4 flex-wrap">
        {/* View mode selector */}
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="View mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="side-by-side">
              <div className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-4 w-4" />
                Side by Side
              </div>
            </SelectItem>
            <SelectItem value="overlay">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Overlay
              </div>
            </SelectItem>
            <SelectItem value="slider">
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4" />
                Slider
              </div>
            </SelectItem>
            <SelectItem value="onion">
              <div className="flex items-center gap-2">
                <Blend className="h-4 w-4" />
                Onion Skin
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(prev => [Math.max(prev[0] - 10, 25)])}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (-)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Slider
            value={zoom}
            onValueChange={setZoom}
            min={25}
            max={300}
            step={5}
            className="w-24"
          />
          
          <span className="text-xs text-muted-foreground w-12">{zoom[0]}%</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(prev => [Math.min(prev[0] + 10, 300)])}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (+)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Rotation */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate (R)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8"
                onClick={resetView}
              >
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View (0)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border" />

        {/* Options */}
        {viewMode === 'side-by-side' && (
          <div className="flex items-center gap-2">
            <Switch
              id="sync-scroll"
              checked={syncScroll}
              onCheckedChange={setSyncScroll}
              className="scale-75"
            />
            <Label htmlFor="sync-scroll" className="text-xs cursor-pointer">Sync Scroll</Label>
          </div>
        )}

        {(viewMode === 'overlay' || viewMode === 'onion') && (
          <div className="flex items-center gap-2">
            <Label className="text-xs">Opacity:</Label>
            <Slider
              value={overlayOpacity}
              onValueChange={setOverlayOpacity}
              min={0}
              max={100}
              step={5}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground w-8">{overlayOpacity[0]}%</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Switch
            id="show-grid"
            checked={showGrid}
            onCheckedChange={setShowGrid}
            className="scale-75"
          />
          <Label htmlFor="show-grid" className="text-xs cursor-pointer flex items-center gap-1">
            <Grid3X3 className="h-3 w-3" />
            Grid
          </Label>
        </div>
      </div>

      {/* Comparison area */}
      <div className="flex-1 overflow-hidden bg-muted/20">
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 h-full divide-x divide-border">
            <div className="flex flex-col h-full">
              <div className="p-2 text-center bg-red-500/10 border-b border-red-500/20">
                <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-500/30">
                  {baseLabel}
                </Badge>
              </div>
              <div 
                ref={baseRef}
                className="flex-1 overflow-auto p-4"
              >
                {renderImage(baseDocumentUrl, baseLabel, () => setBaseLoaded(true))}
              </div>
            </div>
            <div className="flex flex-col h-full">
              <div className="p-2 text-center bg-emerald-500/10 border-b border-emerald-500/20">
                <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {compareLabel}
                </Badge>
              </div>
              <div 
                ref={compareRef}
                className="flex-1 overflow-auto p-4"
              >
                {renderImage(compareDocumentUrl, compareLabel, () => setCompareLoaded(true))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="relative h-full flex items-center justify-center p-4">
            <div className="relative">
              <img
                src={baseDocumentUrl}
                alt={baseLabel}
                className="max-w-full max-h-full object-contain"
                style={imageStyle}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                draggable={false}
              />
              <img
                src={compareDocumentUrl}
                alt={compareLabel}
                className="absolute inset-0 max-w-full max-h-full object-contain"
                style={{
                  ...imageStyle,
                  opacity: overlayOpacity[0] / 100,
                }}
                draggable={false}
              />
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                Base: 100%
              </Badge>
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                Compare: {overlayOpacity[0]}%
              </Badge>
            </div>
          </div>
        )}

        {viewMode === 'slider' && (
          <div className="relative h-full flex items-center justify-center p-4 overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Base image (full) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={compareDocumentUrl}
                  alt={compareLabel}
                  className="max-w-full max-h-full object-contain"
                  style={imageStyle}
                  draggable={false}
                />
              </div>
              
              {/* Compare image (clipped) */}
              <div 
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition[0]}% 0 0)` }}
              >
                <img
                  src={baseDocumentUrl}
                  alt={baseLabel}
                  className="max-w-full max-h-full object-contain"
                  style={imageStyle}
                  draggable={false}
                />
              </div>
              
              {/* Slider handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize z-20"
                style={{ left: `${sliderPosition[0]}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <ChevronLeft className="h-3 w-3 text-primary-foreground" />
                  <ChevronRight className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              
              {/* Labels */}
              <div className="absolute top-4 left-4">
                <Badge variant="outline" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30">
                  {baseLabel}
                </Badge>
              </div>
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {compareLabel}
                </Badge>
              </div>
            </div>
            
            {/* Slider control */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 px-4 py-2 bg-background/80 backdrop-blur-sm rounded-lg border">
              <Slider
                value={sliderPosition}
                onValueChange={setSliderPosition}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
        )}

        {viewMode === 'onion' && (
          <div className="relative h-full flex items-center justify-center p-4">
            <div className="relative">
              <img
                src={baseDocumentUrl}
                alt={baseLabel}
                className="max-w-full max-h-full object-contain"
                style={{
                  ...imageStyle,
                  opacity: 1 - (overlayOpacity[0] / 100),
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                draggable={false}
              />
              <img
                src={compareDocumentUrl}
                alt={compareLabel}
                className="absolute inset-0 max-w-full max-h-full object-contain mix-blend-difference"
                style={{
                  ...imageStyle,
                  opacity: overlayOpacity[0] / 100,
                }}
                draggable={false}
              />
            </div>
            <div className="absolute bottom-4 left-4">
              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                Onion Skin: {overlayOpacity[0]}%
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">+</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] ml-0.5">-</kbd>
            <span className="ml-1">Zoom</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">R</kbd>
            <span className="ml-1">Rotate</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">0</kbd>
            <span className="ml-1">Reset</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd>
            <span className="ml-1">Close</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>Rotation: {rotation}°</span>
          <span>•</span>
          <span>Drag to pan when zoomed</span>
        </div>
      </div>
    </div>
  );
}
