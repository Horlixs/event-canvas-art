import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import { Download, X, Image as ImageIcon, Loader2, AlertCircle, ChevronLeft, Upload, Type } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { CanvasElement, TemplateData } from '@/types/editor';
import { toast } from 'sonner';
import { getTemplateBySlug } from '@/lib/templates';
import useImage from 'use-image';
import { ImageCropper } from './ImageCropper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- HELPERS ---
const BackgroundImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src);
  if (!image) return null;
  
  // Calculate fit dimensions to maintain aspect ratio
  const imgElement = image as HTMLImageElement;
  const imgNaturalWidth = imgElement.naturalWidth || imgElement.width || 1;
  const imgNaturalHeight = imgElement.naturalHeight || imgElement.height || 1;
  
  const imgRatio = imgNaturalWidth / imgNaturalHeight;
  const canvasRatio = width / height;
  
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;
  
  // Fit image inside canvas while preserving aspect ratio
  if (imgRatio > canvasRatio) {
    // Image is wider - fit by width
    drawWidth = width;
    drawHeight = width / imgRatio;
    offsetY = (height - drawHeight) / 2;
  } else {
    // Image is taller - fit by height
    drawHeight = height;
    drawWidth = height * imgRatio;
    offsetX = (width - drawWidth) / 2;
  }
  
  return (
    <KonvaImage 
      image={image} 
      x={offsetX} 
      y={offsetY} 
      width={drawWidth} 
      height={drawHeight} 
    />
  );
};

// Render shapes with strokes support
const RenderShape: React.FC<{ element: CanvasElement; userImage?: string }> = ({ element, userImage }) => {
  switch (element.type) {
    case 'rect':
      return (
        <>
          {element.strokes?.map((s, i) => (
            <Rect
              key={i}
              x={element.x - element.width / 2 - s.width / 2}
              y={element.y - element.height / 2 - s.width / 2}
              width={element.width + s.width}
              height={element.height + s.width}
              fill={s.color}
            />
          ))}
          <Rect
            x={element.x - element.width / 2}
            y={element.y - element.height / 2}
            width={element.width}
            height={element.height}
            fill={userImage ? undefined : element.fill}
            fillPatternImage={userImage ? new window.Image() : undefined}
          />
        </>
      );
    case 'circle':
      return (
        <>
          {element.strokes?.map((s, i) => (
            <Circle
              key={i}
              x={element.x}
              y={element.y}
              radius={element.radius + s.width / 2}
              fill={s.color}
            />
          ))}
          <Circle
            x={element.x}
            y={element.y}
            radius={element.radius}
            fill={element.fill}
          />
        </>
      );
    case 'polygon':
      const points = Array.from({ length: element.sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / element.sides - Math.PI / 2;
        return [
          element.x + element.radius * Math.cos(angle),
          element.y + element.radius * Math.sin(angle),
        ];
      }).flat();
      return (
        <>
          {element.strokes?.map((s, i) => (
            <Line key={i} points={points} closed fill={s.color} />
          ))}
          <Line points={points} closed fill={element.fill} />
        </>
      );
    case 'text':
      return <Text x={element.x - element.width / 2} y={element.y - element.fontSize / 2} text={element.text} fontSize={element.fontSize} fontFamily={element.fontFamily} fontStyle={element.fontStyle} fontWeight={element.fontWeight} fill={element.fill} width={element.width} />;
    default:
      return null;
  }
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

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!slug) return setError('No template specified'), setIsLoading(false);
      try {
        const data = await getTemplateBySlug(slug);
        if (data) setTemplate(data), setElements(data.elements);
        else setError('Template not found');
      } catch (err) {
        console.error(err);
        setError('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [slug]);

  // Scaling - ensure canvas fits within viewport
  useEffect(() => {
    if (!template || !containerRef.current) return;
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      
      // Get actual container dimensions
      const containerRect = container.getBoundingClientRect();
      const availableWidth = containerRect.width;
      const availableHeight = containerRect.height;
      
      // Account for padding (p-4 md:p-8 = 16px mobile, 32px desktop)
      const padding = window.innerWidth >= 768 ? 64 : 32;
      const maxWidth = Math.max(1, availableWidth - padding);
      const maxHeight = Math.max(1, availableHeight - padding);
      
      // Calculate scale to fit both dimensions
      const scaleX = maxWidth / template.width;
      const scaleY = maxHeight / template.height;
      
      // Use the smaller scale to ensure it fits, but cap at 1 (don't scale up)
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(Math.max(0.1, newScale)); // Ensure minimum scale
    };
    
    updateScale();
    const timeout = setTimeout(updateScale, 100);
    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateScale);
    };
  }, [template]);

  const placeholderElements = useMemo(() => elements.filter((el) => el.isPlaceholder), [elements]);
  const textElements = useMemo(() => elements.filter((el) => el.type === 'text'), [elements]);

  const getPlaceholderAspectRatio = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return 1;
    if ('width' in el && 'height' in el) return el.width / el.height;
    return 1;
  }, [elements]);

  const updateTextElement = useCallback((id: string, text: string) => {
    setElements((prev) => prev.map((el) => el.id === id ? { ...el, text } : el));
  }, []);

  const handleUploadClick = useCallback((id: string) => {
    setCurrentCroppingId(id);
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCroppingId) return;
    const reader = new FileReader();
    reader.onload = (event) => setImageToCrop(event.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
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
      const uri = stageRef.current.toDataURL({ pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `design-${slug}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Could not generate image.');
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Loader2 className="animate-spin w-8 h-8 text-primary mb-3" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading campaign…</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4">
        <div className="flex flex-col items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-8 max-w-sm text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <h1 className="text-lg font-semibold">We couldn&apos;t load this DP</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error || 'Something went wrong.'}</p>
          <Button asChild className="mt-2 rounded-full px-6">
            <Link to="/">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Go back home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isDownloadDisabled = placeholderElements.length > 0 && placeholderElements.some((el) => !userImages[el.id]);

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-14 px-4 md:px-8 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Link to="/">
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              DP generator
            </p>
            <h1 className="text-sm font-semibold leading-tight">
              Personalize &amp; download
            </h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live preview
        </div>
      </header>

      {/* Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl px-4 md:px-6 py-4 flex flex-col gap-6 overflow-y-auto">
          {/* Upload photos */}
          {placeholderElements.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Photos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your photo into each frame below. You&apos;ll see changes on the right instantly.
              </p>
              <div className="space-y-3">
                {placeholderElements.map((el) => {
                  const filled = !!userImages[el.id];
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => handleUploadClick(el.id)}
                      className={cn(
                        "w-full rounded-xl border-2 border-dashed flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        filled
                          ? "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/70"
                          : "border-slate-300 dark:border-slate-700 hover:border-primary/70 hover:bg-slate-50/80 dark:hover:bg-slate-900/70"
                      )}
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {filled ? (
                          <img
                            src={userImages[el.id]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {filled ? "Change photo" : "Upload photo"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          PNG or JPG • Fits this frame
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Text controls */}
          {textElements.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Type className="w-3 h-3" />
                Text
              </h3>
              <div className="space-y-2">
                {textElements.map((el, index) => (
                  <div key={el.id} className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Line {index + 1}
                    </label>
                    <input
                      type="text"
                      value={el.text}
                      onChange={(e) => updateTextElement(el.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60"
                      placeholder="Type here…"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Download */}
          <section className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handleDownload}
              disabled={isDownloadDisabled}
              className="w-full rounded-full h-10 text-sm font-semibold shadow-md shadow-primary/20"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloadDisabled ? "Complete steps first" : "Download DP"}
            </Button>
            {isDownloadDisabled && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Upload a photo for every frame before downloading.
              </p>
            )}
          </section>
        </aside>

        {/* Canvas Preview */}
        <main className="flex-1 relative bg-slate-100 dark:bg-black/70 overflow-hidden min-h-0">
          {/* subtle grid background */}
          <div className="absolute inset-0 opacity-40 dark:opacity-30 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#cbd5f5_1px,transparent_0)] [background-size:22px_22px]" />

          <div
            ref={containerRef}
            className="absolute inset-0 flex items-center justify-center p-4 md:p-8"
          >
            {template && (
              <div 
                className="relative shadow-2xl ring-1 ring-black/5 rounded-2xl overflow-hidden bg-white"
                style={{
                  width: template.width,
                  height: template.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
              >
                <Stage 
                  ref={stageRef} 
                  width={template.width} 
                  height={template.height}
                >
                  <Layer>
                    <Rect
                      x={0}
                      y={0}
                      width={template.width}
                      height={template.height}
                      fill={template.backgroundColor}
                    />
                    {template.backgroundImage && (
                      <BackgroundImage
                        src={template.backgroundImage}
                        width={template.width}
                        height={template.height}
                      />
                    )}
                    {elements.map((el) => (
                      <RenderShape
                        key={el.id}
                        element={el}
                        userImage={el.isPlaceholder ? userImages[el.id] : undefined}
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Cropper */}
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