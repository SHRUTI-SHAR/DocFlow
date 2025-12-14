import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
import * as fabric from "fabric";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
// Configure pdf.js worker (Vite will resolve the URL)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(GlobalWorkerOptions as any).workerSrc = pdfWorker;
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, ZoomIn, ZoomOut, RotateCcw, Grid3X3, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TemplateField } from "@/types/template";

interface DocumentTemplateCanvasProps {
  fields: TemplateField[];
  selectedField: TemplateField | null;
  onFieldSelect: (field: TemplateField | null) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<TemplateField>) => void;
  onAddField: () => void;
  documentImage?: string;
  onDocumentUpload?: (file: File) => void;
}

export const DocumentTemplateCanvas = ({
  fields,
  selectedField,
  onFieldSelect,
  onFieldUpdate,
  onAddField,
  documentImage,
  onDocumentUpload,
}: DocumentTemplateCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [allPagesRendered, setAllPagesRendered] = useState(false);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  // Use props directly instead of local state
  const { toast } = useToast();

  // Grid removed - canvas is only for viewing documents

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) {
      const timer = setTimeout(() => {
        if (canvasRef.current) {
          initializeCanvas();
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    initializeCanvas();
    
    function initializeCanvas() {
    const canvas = new FabricCanvas(canvasRef.current, {
      width: (canvasRef.current.offsetWidth || 800) * zoom,
      height: 600 * zoom,
      backgroundColor: "#f8f9fa",
      selection: true,
    });

    // Canvas is now only for viewing documents, no field editing
      
      // Set the canvas state after everything is ready
    setFabricCanvas(canvas);

      // Handle window resize
      const handleResize = () => {
        if (canvasRef.current) {
          const newWidth = (canvasRef.current.offsetWidth || 800) * zoom;
          const newHeight = 600 * zoom;
          canvas.setWidth(newWidth);
          canvas.setHeight(newHeight);
          canvas.renderAll();
        }
      };

      window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
    }
  }, []);


  // Update canvas size when zoom changes (but don't clear content)
  useEffect(() => {
    if (fabricCanvas && canvasRef.current && !allPagesRendered) {
      const baseWidth = 800;
      const baseHeight = 600;
      
      const newWidth = baseWidth * zoom;
      const newHeight = baseHeight * zoom;
      fabricCanvas.setWidth(newWidth);
      fabricCanvas.setHeight(newHeight);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, zoom]);

  // Update container size when all pages are rendered
  useEffect(() => {
    if (allPagesRendered && fabricCanvas && canvasRef.current) {
      const container = canvasRef.current?.parentElement?.parentElement;
      if (container) {
        const canvasWidth = fabricCanvas.width || 800;
        const canvasHeight = fabricCanvas.height || 600;
        container.style.width = `${canvasWidth}px`;
        container.style.height = `${canvasHeight}px`;
        container.style.minWidth = `${canvasWidth}px`;
        container.style.minHeight = `${canvasHeight}px`;
        container.style.maxWidth = 'none';
        container.style.maxHeight = 'none';
        
        // Also update the inner container
        const innerContainer = canvasRef.current?.parentElement;
        if (innerContainer) {
          innerContainer.style.width = `${canvasWidth}px`;
          innerContainer.style.height = `${canvasHeight}px`;
          innerContainer.style.minWidth = `${canvasWidth}px`;
          innerContainer.style.minHeight = `${canvasHeight}px`;
          innerContainer.style.maxWidth = 'none';
          innerContainer.style.maxHeight = 'none';
        }
      }
    }
  }, [allPagesRendered, fabricCanvas]);


  // Load document image
  useEffect(() => {
    if (!fabricCanvas || !documentImage) {
      setDocumentLoaded(false);
      return;
    }

    // Helper to add an image to the canvas as background
    const addImageToCanvas = (img: FabricImage) => {
      console.log('Image loaded successfully:', img.width, img.height);

      // Clear canvas before adding new image
      fabricCanvas.clear();

      // Scale image to fit canvas
      const canvasWidth = fabricCanvas.width || 800;
      const canvasHeight = fabricCanvas.height || 600;
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;

      const scaleX = canvasWidth / imgWidth;
      const scaleY = canvasHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: (canvasWidth - imgWidth * scale) / 2,
        top: (canvasHeight - imgHeight * scale) / 2,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        moveCursor: 'default'
      });

      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();
      setDocumentLoaded(true);

      toast({
        title: "Document loaded",
        description: "Document is ready for viewing"
      });
    };

    const loadDocument = async () => {
      console.log('Loading document image:', documentImage);
      try {
        const lower = documentImage.toLowerCase();
        let imgSrc = documentImage;

        if (lower.endsWith('.pdf') || lower.startsWith('data:application/pdf')) {
          // Load PDF document and render all pages
          try {
            let arrayBuffer: ArrayBuffer;
            if (documentImage.startsWith('data:application/pdf')) {
              const base64 = documentImage.split(',')[1];
              const binary = atob(base64);
              const len = binary.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
              arrayBuffer = bytes.buffer;
            } else {
              const resp = await fetch(documentImage, { mode: 'cors' });
              if (!resp.ok) throw new Error(`Failed to fetch PDF: ${resp.status}`);
              arrayBuffer = await resp.arrayBuffer();
            }

            const loadingTask = getDocument({ data: arrayBuffer, worker: null } as any);
            const pdf = await loadingTask.promise as any;
            setPdfDocument(pdf);
            setTotalPages(pdf.numPages);
            
            // Render all pages vertically
            await renderAllPages(pdf);
            return; // Exit early for PDFs, don't try to load as regular image
          } catch (pdfErr) {
            console.error('Error rendering PDF:', pdfErr);
            throw pdfErr;
          }
        }

        // Handle regular images (non-PDF)
        FabricImage.fromURL(imgSrc, { crossOrigin: 'anonymous' })
          .then((img) => addImageToCanvas(img))
          .catch((error) => {
            console.error('Error loading document image:', error);
            setDocumentLoaded(false);
            toast({
              title: "Failed to load document",
              description: "Please check the file format and try again",
              variant: "destructive"
            });
          });
      } catch (error) {
        console.error('Error preparing document:', error);
        setDocumentLoaded(false);
        toast({
          title: "Failed to load document",
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: "destructive"
        });
      }
    };

    // Kick off async load
    loadDocument();
  }, [fabricCanvas, documentImage]);

  // Render all PDF pages vertically
  const renderAllPages = async (pdf: any) => {
    if (!pdf || !fabricCanvas) {
      console.log('renderAllPages: Missing pdf or fabricCanvas', { pdf: !!pdf, fabricCanvas: !!fabricCanvas });
      return;
    }

    try {
      console.log('Starting to render PDF pages...', { numPages: pdf.numPages });
      setIsRenderingPdf(true);
      setAllPagesRendered(false);
      
      // Clear existing content
      fabricCanvas.clear();
      
      let currentY = 0;
      const pageSpacing = 20;
      const scale = 1.5; // Good balance of quality and performance
      
      // Calculate total height and get the maximum width needed for all pages
      let totalHeight = 0;
      let maxWidth = 0;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        totalHeight += viewport.height + pageSpacing;
        maxWidth = Math.max(maxWidth, viewport.width);
      }
      
      // Add some padding to ensure the full document is visible
      const padding = 20;
      const canvasWidth = (maxWidth + padding) * zoom;
      const canvasHeight = totalHeight * zoom;
      
      // Set Fabric.js canvas dimensions
      fabricCanvas.setWidth(canvasWidth);
      fabricCanvas.setHeight(canvasHeight);
      
      // Update the container size to match the canvas
      const container = canvasRef.current?.parentElement?.parentElement;
      if (container) {
        container.style.width = `${canvasWidth}px`;
        container.style.height = `${canvasHeight}px`;
        container.style.minWidth = `${canvasWidth}px`;
        container.style.minHeight = `${canvasHeight}px`;
        container.style.maxWidth = 'none';
        container.style.maxHeight = 'none';
      }
      
      // Render all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Rendering page ${pageNum} of ${pdf.numPages}`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: scale });
        
        // Create canvas for this page
        const pageCanvas = document.createElement('canvas');
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) continue;
        
        pageCanvas.width = viewport.width;
        pageCanvas.height = viewport.height;
        
        // Render page to canvas
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        // Convert to image
        const imgSrc = pageCanvas.toDataURL('image/jpeg', 0.9);
        
        // Add to Fabric.js canvas using simpler approach
        try {
          // Create a new Image element and load it
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          const fabricImg = await new Promise<FabricImage>((resolve, reject) => {
            img.onload = () => {
              const fabricImage = new FabricImage(img, {
                left: 0,
                top: currentY,
                selectable: false,
                evented: false
              });
              resolve(fabricImage);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imgSrc;
          });
          
          fabricImg.set({
            left: 0,
            top: currentY,
            selectable: false,
            evented: false
          });
          
          fabricCanvas.add(fabricImg);
          fabricCanvas.renderAll();
          
          currentY += viewport.height + pageSpacing;
          
            if (pageNum === pdf.numPages) {
              setAllPagesRendered(true);
              setDocumentLoaded(true);
              setIsRenderingPdf(false);
              
              toast({
                title: "PDF loaded",
                description: `Rendered ${pdf.numPages} pages successfully`
              });
            }
        } catch (imgError) {
          console.error(`Error creating Fabric image for page ${pageNum}:`, imgError);
          
          // Fallback: render directly to the main canvas element
          console.log(`Using fallback rendering for page ${pageNum}`);
          try {
            const canvasElement = canvasRef.current;
            if (canvasElement) {
              const canvasCtx = canvasElement.getContext('2d');
              if (canvasCtx) {
                        // Set canvas size to accommodate all pages with padding
                        const totalHeight = currentY + viewport.height + pageSpacing;
                        const padding = 20;
                        canvasElement.width = Math.max(canvasElement.width, viewport.width + padding);
                        canvasElement.height = Math.max(canvasElement.height, totalHeight);
                
                // Draw the page
                canvasCtx.drawImage(pageCanvas, 0, currentY);
                currentY += viewport.height + pageSpacing;
                
                if (pageNum === pdf.numPages) {
                  setAllPagesRendered(true);
                  setDocumentLoaded(true);
                  setIsRenderingPdf(false);
                  
                  toast({
                    title: "PDF loaded (fallback)",
                    description: `Rendered ${pdf.numPages} pages using fallback method`
                  });
                }
              }
            }
          } catch (fallbackError) {
            console.error(`Fallback rendering also failed for page ${pageNum}:`, fallbackError);
          }
        }
      }
      
    } catch (error) {
      console.error('Error rendering PDF pages:', error);
      setDocumentLoaded(false);
      toast({
        title: "PDF loading failed",
        description: "Failed to render PDF pages",
        variant: "destructive"
      });
    }
  };

  // Canvas is now only for viewing documents, no field boxes

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onDocumentUpload) {
      onDocumentUpload(file);
    }
    // Always reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.2, 0.3);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleResetZoom = () => {
    if (!fabricCanvas) return;
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    fabricCanvas.setZoom(1);
    fabricCanvas.renderAll();
  };

  // Pan functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newOffset = {
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      };
      setPanOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY;
      if (delta < 0) {
        const newZoom = Math.min(zoom * 1.1, 3);
        setZoom(newZoom);
        if (fabricCanvas) {
          fabricCanvas.setZoom(newZoom);
          fabricCanvas.renderAll();
        }
      } else {
        const newZoom = Math.max(zoom / 1.1, 0.3);
        setZoom(newZoom);
        if (fabricCanvas) {
          fabricCanvas.setZoom(newZoom);
          fabricCanvas.renderAll();
        }
      }
    }
  };

  const addFieldAtPosition = () => {
    // Allow adding fields even if no document is loaded
    onAddField();
  };

  return (
    <div className="space-y-4">
              {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          <Badge variant="secondary">
            {fields.length} fields
          </Badge>
          {documentLoaded && (
            <Badge variant="outline" className="text-green-600">
              Document Ready
            </Badge>
          )}
          {pdfDocument && totalPages > 1 && (
            <Badge variant="outline">
              {totalPages} pages
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom} title="Reset Zoom">
            <RotateCcw className="h-4 w-4" />
          </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Badge variant="outline">
            {Math.round(zoom * 100)}%
          </Badge>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1 border-l pl-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={addFieldAtPosition}
              title="Add New Field"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="bg-card border border-border rounded-lg p-4 relative">
        <div 
          className="border-2 border-dashed border-border rounded-lg overflow-auto w-full h-[600px] relative"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#d1d5db #f9fafb'
          }}
        >
          <div 
            className="relative"
            style={{
              width: '100%',
              minWidth: '100%',
              minHeight: '100%',
              height: '100%'
            }}
          >
            <canvas 
              ref={canvasRef} 
              className={`block ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ 
                width: `${800 * zoom}px`,
                minHeight: `${600 * zoom}px`,
                imageRendering: 'high-quality',
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                position: 'absolute',
                top: 0,
                left: 0
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            />
          </div>
        </div>
        
        {!documentLoaded && !documentImage && fields.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Upload a document to start creating templates</p>
              <p className="text-sm">Supports PDF, images (JPG, PNG), and other document formats</p>
            </div>
          </div>
        )}
        
        {documentImage && !documentLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="font-medium">Loading document...</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};