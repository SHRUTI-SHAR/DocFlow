import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Annotation, AnnotationType, AnnotationColor, ANNOTATION_COLORS } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface AnnotationLayerProps {
  annotations: Annotation[];
  activeTool: AnnotationType | null;
  activeColor: AnnotationColor;
  selectedAnnotationId: string | null;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationCreate: (annotation: Partial<Annotation>) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string) => void;
  isVisible?: boolean;
  containerRef?: React.RefObject<HTMLElement>;
  scale?: number;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  activeTool,
  activeColor,
  selectedAnnotationId,
  onAnnotationSelect,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  isVisible = true,
  containerRef,
  scale = 1
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  const getRelativeCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  }, [scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool) return;
    
    e.preventDefault();
    const point = getRelativeCoords(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoint(point);

    if (activeTool === 'freehand') {
      setDrawingPoints([point]);
    }
  }, [activeTool, getRelativeCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !activeTool) return;
    
    const point = getRelativeCoords(e);
    setCurrentPoint(point);

    if (activeTool === 'freehand') {
      setDrawingPoints(prev => [...prev, point]);
    }
  }, [isDrawing, activeTool, getRelativeCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !activeTool) {
      setIsDrawing(false);
      return;
    }

    const endPoint = getRelativeCoords(e);
    
    let newAnnotation: Partial<Annotation> = {
      type: activeTool,
      color: activeColor,
      x: startPoint.x,
      y: startPoint.y
    };

    switch (activeTool) {
      case 'box':
      case 'area':
        newAnnotation = {
          ...newAnnotation,
          width: Math.abs(endPoint.x - startPoint.x),
          height: Math.abs(endPoint.y - startPoint.y),
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y)
        };
        break;
      case 'circle':
        const radiusX = Math.abs(endPoint.x - startPoint.x) / 2;
        const radiusY = Math.abs(endPoint.y - startPoint.y) / 2;
        newAnnotation = {
          ...newAnnotation,
          x: Math.min(startPoint.x, endPoint.x) + radiusX,
          y: Math.min(startPoint.y, endPoint.y) + radiusY,
          width: radiusX * 2,
          height: radiusY * 2
        };
        break;
      case 'arrow':
        newAnnotation = {
          ...newAnnotation,
          end_x: endPoint.x,
          end_y: endPoint.y
        };
        break;
      case 'freehand':
        newAnnotation = {
          ...newAnnotation,
          points: drawingPoints
        };
        break;
      case 'pin':
      case 'text':
        // Single point annotations
        break;
    }

    onAnnotationCreate(newAnnotation);
    
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setDrawingPoints([]);
  }, [isDrawing, startPoint, activeTool, activeColor, getRelativeCoords, drawingPoints, onAnnotationCreate]);

  const renderAnnotation = (annotation: Annotation) => {
    const colors = ANNOTATION_COLORS[annotation.color];
    const isSelected = selectedAnnotationId === annotation.id;
    const opacity = annotation.opacity ?? 0.3;

    const commonProps = {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onAnnotationSelect(annotation.id);
      },
      className: cn(
        "cursor-pointer transition-all",
        isSelected && "filter drop-shadow-lg"
      ),
      style: { pointerEvents: 'all' as const }
    };

    switch (annotation.type) {
      case 'highlight':
        return (
          <rect
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width || 100}
            height={annotation.height || 20}
            fill={colors.bg}
            fillOpacity={opacity}
            stroke={isSelected ? colors.border : 'transparent'}
            strokeWidth={2}
            {...commonProps}
          />
        );

      case 'box':
      case 'area':
        return (
          <rect
            key={annotation.id}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width || 100}
            height={annotation.height || 100}
            fill={annotation.type === 'area' ? colors.bg : 'transparent'}
            fillOpacity={annotation.type === 'area' ? opacity : 0}
            stroke={colors.border}
            strokeWidth={annotation.stroke_width || 2}
            strokeDasharray={annotation.type === 'area' ? '5,5' : undefined}
            {...commonProps}
          />
        );

      case 'circle':
        return (
          <ellipse
            key={annotation.id}
            cx={annotation.x}
            cy={annotation.y}
            rx={(annotation.width || 100) / 2}
            ry={(annotation.height || 100) / 2}
            fill="transparent"
            stroke={colors.border}
            strokeWidth={annotation.stroke_width || 2}
            {...commonProps}
          />
        );

      case 'arrow':
        const dx = (annotation.end_x || annotation.x + 100) - annotation.x;
        const dy = (annotation.end_y || annotation.y) - annotation.y;
        const angle = Math.atan2(dy, dx);
        const arrowLength = 10;
        
        return (
          <g key={annotation.id} {...commonProps}>
            <line
              x1={annotation.x}
              y1={annotation.y}
              x2={annotation.end_x || annotation.x + 100}
              y2={annotation.end_y || annotation.y}
              stroke={colors.border}
              strokeWidth={annotation.stroke_width || 2}
            />
            {/* Arrowhead */}
            <polygon
              points={`
                ${annotation.end_x || annotation.x + 100},${annotation.end_y || annotation.y}
                ${(annotation.end_x || annotation.x + 100) - arrowLength * Math.cos(angle - Math.PI / 6)},${(annotation.end_y || annotation.y) - arrowLength * Math.sin(angle - Math.PI / 6)}
                ${(annotation.end_x || annotation.x + 100) - arrowLength * Math.cos(angle + Math.PI / 6)},${(annotation.end_y || annotation.y) - arrowLength * Math.sin(angle + Math.PI / 6)}
              `}
              fill={colors.border}
            />
          </g>
        );

      case 'freehand':
        if (!annotation.points || annotation.points.length < 2) return null;
        const pathData = annotation.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <path
            key={annotation.id}
            d={pathData}
            fill="none"
            stroke={colors.border}
            strokeWidth={annotation.stroke_width || 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...commonProps}
          />
        );

      case 'pin':
        return (
          <g key={annotation.id} {...commonProps}>
            <circle
              cx={annotation.x}
              cy={annotation.y}
              r={12}
              fill={colors.bg}
              stroke={colors.border}
              strokeWidth={2}
            />
            <text
              x={annotation.x}
              y={annotation.y + 4}
              textAnchor="middle"
              fontSize={12}
              fill={colors.text}
            >
              📌
            </text>
          </g>
        );

      case 'text':
        return (
          <g key={annotation.id} {...commonProps}>
            <rect
              x={annotation.x - 4}
              y={annotation.y - 16}
              width={(annotation.text_content?.length || 10) * 8 + 8}
              height={24}
              fill={colors.bg}
              stroke={isSelected ? colors.border : 'transparent'}
              strokeWidth={1}
              rx={4}
            />
            <text
              x={annotation.x}
              y={annotation.y}
              fontSize={annotation.font_size || 14}
              fill={colors.text}
            >
              {annotation.text_content || 'Note'}
            </text>
          </g>
        );

      case 'stamp':
        return (
          <g key={annotation.id} {...commonProps}>
            <rect
              x={annotation.x}
              y={annotation.y}
              width={120}
              height={40}
              fill="transparent"
              stroke={colors.border}
              strokeWidth={3}
              rx={4}
              transform={`rotate(-15, ${annotation.x + 60}, ${annotation.y + 20})`}
            />
            <text
              x={annotation.x + 60}
              y={annotation.y + 26}
              textAnchor="middle"
              fontSize={16}
              fontWeight="bold"
              fill={colors.border}
              transform={`rotate(-15, ${annotation.x + 60}, ${annotation.y + 20})`}
            >
              {annotation.stamp_text || 'STAMP'}
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  const renderDrawingPreview = () => {
    if (!isDrawing || !startPoint || !currentPoint || !activeTool) return null;

    const colors = ANNOTATION_COLORS[activeColor];

    switch (activeTool) {
      case 'box':
      case 'area':
        return (
          <rect
            x={Math.min(startPoint.x, currentPoint.x)}
            y={Math.min(startPoint.y, currentPoint.y)}
            width={Math.abs(currentPoint.x - startPoint.x)}
            height={Math.abs(currentPoint.y - startPoint.y)}
            fill={activeTool === 'area' ? colors.bg : 'transparent'}
            fillOpacity={0.3}
            stroke={colors.border}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        );

      case 'circle':
        const cx = (startPoint.x + currentPoint.x) / 2;
        const cy = (startPoint.y + currentPoint.y) / 2;
        const rx = Math.abs(currentPoint.x - startPoint.x) / 2;
        const ry = Math.abs(currentPoint.y - startPoint.y) / 2;
        return (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="transparent"
            stroke={colors.border}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        );

      case 'arrow':
        return (
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={currentPoint.x}
            y2={currentPoint.y}
            stroke={colors.border}
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        );

      case 'freehand':
        if (drawingPoints.length < 2) return null;
        const pathData = drawingPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <path
            d={pathData}
            fill="none"
            stroke={colors.border}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ 
        cursor: activeTool ? 'crosshair' : 'default',
        pointerEvents: activeTool ? 'all' : 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) {
          setIsDrawing(false);
          setStartPoint(null);
          setCurrentPoint(null);
          setDrawingPoints([]);
        }
      }}
    >
      {/* Existing annotations */}
      <g style={{ pointerEvents: activeTool ? 'none' : 'all' }}>
        {annotations
          .filter(a => !a.is_hidden)
          .sort((a, b) => (a.layer_order || 0) - (b.layer_order || 0))
          .map(renderAnnotation)}
      </g>

      {/* Drawing preview */}
      {renderDrawingPreview()}

      {/* Selection handles */}
      {selectedAnnotationId && !isDrawing && (
        <g>
          {/* Add resize handles for selected annotation */}
        </g>
      )}
    </svg>
  );
};

export default AnnotationLayer;
