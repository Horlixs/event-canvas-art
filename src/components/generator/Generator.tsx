import React, { useRef, useCallback, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Group } from 'react-konva';
import { 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  Type
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { CanvasElement, TemplateData, TextElement } from '@/types/editor';
import { toast } from 'sonner';
import { getTemplateBySlug } from '@/lib/templates';
import useImage from 'use-image';
import { ImageCropper } from './ImageCropper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- HELPER: Background Image ---
const BackgroundImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src);
  
  if (!image) return null;
  
  const imgElement = image as HTMLImageElement;
  const imgWidth = imgElement.naturalWidth || 1;
  const imgHeight = imgElement.naturalHeight || 1;
  const ratio = Math.max(width / imgWidth, height / imgHeight);
  
  return (
    <KonvaImage 
      image={image} 
      width={imgWidth * ratio}
      height={imgHeight * ratio}
      x={(width - imgWidth * ratio) / 2}
      y={(height - imgHeight * ratio) / 2}
    />
  );
};

// --- HELPER: Shape with User Image Support ---
const URLImageShape: React.FC<{ 
  element: CanvasElement; 
  src?: string; 
  children?: React.ReactNode 
}> = ({ element, src, children }) => {
  const [image] = useImage(src || '', 'anonymous');

  const fillProps = useMemo(() => {
    // 1. Safely get fallback fill
    const fallbackFill = 'fill' in element ? element.fill : undefined;

    if (!image || !src) return { fill: fallbackFill };

    // 2. Safely calculate dimensions based on shape type
    let shapeWidth = 0;
    let shapeHeight = 0;

    if (element.type === 'circle' || element.type === 'polygon') {
        shapeWidth = element.radius * 2;
        shapeHeight = element.radius * 2;
    } else if (element.type === 'rect' || element.type === 'image') {
        shapeWidth = element.width;
        shapeHeight = element.height;
    }

    const imgWidth = image.width;
    const imgHeight = image.height;

    // Calculate scale to cover the shape area (Object-fit: cover)
    const scale = Math.max(shapeWidth / imgWidth, shapeHeight / imgHeight);

    // Center the pattern
    const offsetX = (imgWidth * scale - shapeWidth) / 2;
    const offsetY = (imgHeight * scale - shapeHeight) / 2;

    return {
      fillPatternImage: image,
      fillPatternScaleX: scale,
      fillPatternScaleY: scale,
      fillPatternOffsetX: offsetX / scale,
      fillPatternOffsetY: offsetY / scale,
    };
  }, [image, src, element]);

  // Extract props common to all shapes
  const { id, x, y, rotation, opacity, isPlaceholder } = element;
  
  const commonProps = {
    id, x, y, rotation, opacity,
    listening: isPlaceholder,
    ...fillProps
  };

  if (element.type === 'rect') {
    return (
      <Group>
        {children}
        <Rect
          {...commonProps}
          width={element.width}
          height={element.height}
          cornerRadius={element.cornerRadius}
          x={element.x - element.width / 2}
          y={element.y - element.height / 2}
        />
      </Group>
    );
  }

  if (element.type === 'circle') {
    return (
      <Group>
        {children}
        <Circle {...commonProps} radius={element.radius} />
      </Group>
    );
  }

  if (element.type === 'polygon') {
    const points = Array.from({ length: element.sides || 3 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / (element.sides || 3) - Math.PI / 2;
      return [
        element.x + element.radius * Math.cos(angle),
        element.y + element.radius * Math.sin(angle),
      ];
    }).flat();

    return (
      <Group>
        {children}
        <Line 
          points={points} 
          closed 
          {...commonProps}
          fill={src ? undefined : element.fill} 
        />
      </Group>
    );
  }

  if (element.type === 'image') {
      return (
        <Group>
             <Rect 
                {...commonProps}
                width={element.width}
                height={element.height}
                x={element.x - element.width / 2}
                y={element.y - element.height / 2}
             />
        </Group>
      )
  }

  return null;
};

// --- HELPER: Main Shape Renderer ---
const RenderShape: React.FC<{ element: CanvasElement; userImage?: string }> = ({ element, userImage }) => {
  if (element.type === 'text') {
    // TEXT RENDERING:
    // We strictly follow the styles set by the creator (align, weight, font).
    // The user can only change the content (element.text).
    return (
      <Text
        x={element.x}
        y={element.y}
        offsetX={element.width / 2}
        offsetY={element.fontSize / 2}
        
        text={element.text}
        width={element.width}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fontStyle={element.fontStyle}
        fontWeight={element.fontWeight} // Respects creator's choice
        fill={element.fill}
        
        align={element.textAlign || 'center'} // Respects creator's choice
        verticalAlign="middle"
      />
    );
  }

  // Render non-text shapes strokes
  const strokes = (
    <>
      {element.strokes?.map((s, i) => {
        const commonProps = { key: i, fill: s.color, listening: false };
        if(element.type === 'rect') {
            return <Rect {...commonProps} x={element.x - element.width/2 - s.width/2} y={element.y - element.height/2 - s.width/2} width={element.width + s.width} height={element.height + s.width} />
        }
        if(element.type === 'circle') {
            return <Circle {...commonProps} x={element.x} y={element.y} radius={element.radius + s.width/2} />
        }
        return null;
      })}
    </>
  );

  return <URLImageShape element={element} src={userImage} children={strokes} />;
};

export const Generator: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [currentCroppingId, setCurrentCroppingId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // 1. Load Template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!slug) return setError('No template specified'), setIsLoading(false);
      try {
        const data = await getTemplateBySlug(slug);
        if (data) {
            setTemplate(data);
            setElements(data.elements);
        } else {
            setError('Template not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [slug]);

  // 2. Dynamic Google Font Loader
  useEffect(() => {
    if (!elements.length) return;

    const fontFamilies = new Set<string>();
    elements.forEach(el => {
      if (el.type === 'text' && el.fontFamily) {
        fontFamilies.add(el.fontFamily);
      }
    });

    if (fontFamilies.size === 0) {
      setFontsLoaded(true);
      return;
    }

    // Load fonts (Regular 400 and Bold 700)
    const familiesQuery = Array.from(fontFamilies)
      .map(font => `family=${font.replace(/\s+/g, '+')}:wght@400;700`)
      .join('&');
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${familiesQuery}&display=swap`;
    link.rel = 'stylesheet';
    
    link.onload = () => {
       document.fonts.ready.then(() => {
         setFontsLoaded(true); 
         if(stageRef.current) stageRef.current.batchDraw(); 
       });
    };
    
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [elements]);

  // 3. Robust Scaling
  useLayoutEffect(() => {
    if (!template || !containerRef.current) return;
    const updateScale = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 32; 
        const scaleX = (width - padding) / template.width;
        const scaleY = (height - padding) / template.height;
        setScale(Math.max(0.1, Math.min(scaleX, scaleY, 1)));
    };
    
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [template]);

  const placeholderElements = useMemo(() => elements.filter((el) => el.isPlaceholder), [elements]);
  const textElements = useMemo(() => elements.filter((el) => el.type === 'text') as TextElement[], [elements]);

  const getPlaceholderAspectRatio = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return 1;
    if (el.type === 'circle') return 1;
    if ('width' in el && 'height' in el) return el.width / el.height;
    return 1;
  }, [elements]);

  // Update text content only
  const handleTextChange = useCallback((id: string, newText: string) => {
    setElements((prev) => prev.map((el) => 
        (el.id === id && el.type === 'text') ? { ...el, text: newText } : el
    ));
  }, []);

  const handleUploadClick = useCallback((id: string) => {
    setCurrentCroppingId(id);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
        fileInputRef.current.click();
    }
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCroppingId) return;
    const reader = new FileReader();
    reader.onload = (event) => setImageToCrop(event.target?.result as string);
    reader.readAsDataURL(file);
  }, [currentCroppingId]);

  const handleCropComplete = useCallback((croppedImageUrl: string) => {
    if (!currentCroppingId) return;
    setUserImages((prev) => ({ ...prev, [currentCroppingId]: croppedImageUrl }));
    setImageToCrop(null);
    setCurrentCroppingId(null);
    toast.success('Photo applied!');
  }, [currentCroppingId]);

  const handleDownload = useCallback(() => {
    if (!stageRef.current) return;
    try {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      const link = document.createElement('a');
      link.download = `design-${slug || 'dp'}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Could not generate image.');
    }
  }, [slug]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>;
  if (error || !template) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  const isDownloadDisabled = placeholderElements.length > 0 && placeholderElements.some((el) => !userImages[el.id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* Header */}
      <header className="h-14 shrink-0 px-4 md:px-8 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Link to="/"><ChevronLeft className="w-4 h-4" /></Link>
          </Button>
          <h1 className="text-sm font-semibold">DP Generator</h1>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Canvas Area */}
        <main className="flex-1 relative bg-slate-100 dark:bg-black/40 overflow-hidden order-1 lg:order-2 h-[50vh] lg:h-auto border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#888_1px,transparent_0)] [background-size:20px_20px]" />

          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center p-4">
            <div 
              className="relative shadow-xl ring-1 ring-black/10 bg-white"
              style={{
                width: template.width,
                height: template.height,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <Stage ref={stageRef} width={template.width} height={template.height}>
                <Layer>
                  <Rect width={template.width} height={template.height} fill={template.backgroundColor} />
                  {template.backgroundImage && (
                    <BackgroundImage src={template.backgroundImage} width={template.width} height={template.height} />
                  )}
                  {fontsLoaded && elements.map((el) => (
                    <RenderShape
                      key={el.id}
                      element={el}
                      userImage={el.isPlaceholder ? userImages[el.id] : undefined}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          </div>
        </main>

        {/* Sidebar Controls */}
        <aside className="w-full lg:w-[360px] bg-white dark:bg-slate-950 flex flex-col order-2 lg:order-1 h-[50vh] lg:h-auto z-10 shadow-xl lg:shadow-none">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            
            {/* Photos Section */}
            {placeholderElements.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Photos</h3>
                <div className="space-y-3">
                  {placeholderElements.map((el) => {
                    const filled = !!userImages[el.id];
                    return (
                      <button
                        key={el.id}
                        onClick={() => handleUploadClick(el.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2 rounded-xl border-2 border-dashed transition-all",
                          filled 
                            ? "border-green-500/20 bg-green-50/50 dark:bg-green-900/10" 
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-900"
                        )}
                      >
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {filled ? (
                            <img src={userImages[el.id]} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{filled ? "Change Photo" : "Upload Photo"}</p>
                          <p className="text-xs text-slate-500">Tap to select</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Text Section (Input only, no style controls) */}
            {textElements.length > 0 && (
              <section className="space-y-4">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Type className="w-3 h-3" /> Text
                 </h3>
                 <div className="space-y-4">
                    {textElements.map((el, i) => (
                        <div key={el.id}>
                            <label className="text-xs font-medium block mb-1.5 text-slate-600">Line {i + 1}</label>
                            <input 
                                value={el.text}
                                onChange={(e) => handleTextChange(el.id, e.target.value)}
                                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
                                placeholder="Type here..."
                            />
                        </div>
                    ))}
                 </div>
              </section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
            <Button 
                onClick={handleDownload} 
                disabled={isDownloadDisabled}
                className="w-full rounded-full h-12 text-base font-medium shadow-lg shadow-blue-500/20"
            >
                <Download className="w-5 h-5 mr-2" />
                Download Image
            </Button>
          </div>
        </aside>

      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <AnimatePresence>
        {imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspectRatio={currentCroppingId ? getPlaceholderAspectRatio(currentCroppingId) : 1}
            onCropComplete={handleCropComplete}
            onCancel={() => setImageToCrop(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};