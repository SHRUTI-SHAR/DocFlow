import React, { useRef, useEffect } from 'react';
import { WatermarkSettings, useWatermark } from '@/hooks/useWatermark';

interface WatermarkPreviewProps {
  settings: Partial<WatermarkSettings>;
  width?: number;
  height?: number;
  className?: string;
}

export function WatermarkPreview({
  settings,
  width = 400,
  height = 300,
  className = '',
}: WatermarkPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { applyWatermarkToCanvas } = useWatermark();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw sample document content
    ctx.fillStyle = '#f0f0f0';
    for (let y = 40; y < height - 20; y += 20) {
      const lineWidth = Math.random() * 100 + 200;
      ctx.fillRect(20, y, lineWidth, 10);
    }

    // Draw header
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(20, 15, 150, 15);

    // Apply watermark if settings exist
    if (settings.text_content || settings.watermark_type === 'text') {
      const fullSettings: WatermarkSettings = {
        id: '',
        document_id: null,
        user_id: '',
        name: 'Preview',
        is_default: false,
        watermark_type: settings.watermark_type || 'text',
        text_content: settings.text_content || 'CONFIDENTIAL',
        font_family: settings.font_family || 'Arial',
        font_size: settings.font_size || 48,
        text_color: settings.text_color || '#00000033',
        rotation: settings.rotation ?? -45,
        opacity: settings.opacity ?? 0.3,
        position: settings.position || 'center',
        image_url: settings.image_url || null,
        include_date: settings.include_date || false,
        include_username: settings.include_username || false,
        created_at: '',
        updated_at: '',
      };

      applyWatermarkToCanvas(ctx, canvas, fullSettings, 'User');
    }
  }, [settings, width, height, applyWatermarkToCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border rounded-lg shadow-sm ${className}`}
    />
  );
}
