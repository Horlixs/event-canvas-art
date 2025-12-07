import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Konva from 'konva';
import { Stage, Layer, Rect, Image as KonvaImage } from 'react-konva';
import { Download, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { CanvasElement, TemplateData } from '@/types/editor';
import { ShapeRenderer } from '../editor/ShapeRenderer';
import { toast } from 'sonner';
import { getTemplateBySlug } from '@/lib/templates';
import useImage from 'use-image';
import { ImageCropper } from './ImageCropper';

const BackgroundImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src);
  if (!image) return null;
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />;
};

export const Generator: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load template from slug
  useEffect(() => {
    const loadTemplate = async () => {
      if (!slug) {
        setError('No template specified');
        setIsLoading(false);
        return;
      }

      try {
        const data = await getTemplateBySlug(slug);
        if (data) {
          setTemplate(data);
          setElements(data.elements);
        } else {
          setError('Template not found');
        }
      } catch (err) {
        console.error('Error loading template:', err);
        setError('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [slug]);

  // Get text elements for editing
  const textElements = elements.filter((el) => el.type === 'text');

  // Calculate placeholder aspect ratio
  const placeholderAspectRatio = useMemo(() => {
    const placeholder = elements.find((el) => el.isPlaceholder);
    if (!placeholder) return 1;
    
    if (placeholder.type === 'rect') {
      return placeholder.width / placeholder.height;
    } else if (placeholder.type === 'circle' || placeholder.type === 'polygon') {
      return 1; // Circle and polygon are square aspect ratio
    }
    return 1;
  }, [elements]);

  const updateTextElement = useCallback((id: string, text: string) => {
    setElements((prev) => 
      prev.map((el) => el.id === id ? { ...el, text } : el)
    );
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // Open cropper instead of directly setting image
      setImageToCrop(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleCropComplete = useCallback((croppedImageUrl: string) => {
    setUserImage(croppedImageUrl);
    setImageToCrop(null);
    toast.success('Photo cropped and applied!');
  }, []);

  const handleCropCancel = useCallback(() => {
    setImageToCrop(null);
  }, []);

  const handleDownload = useCallback(() => {
    if (!stageRef.current) return;

    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'my-event-dp.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!template || !containerRef.current) return;

    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40;
        const containerHeight = containerRef.current.clientHeight - 40;
        const scaleX = containerWidth / template.width;
        const scaleY = containerHeight / template.height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template]);

  const hasPlaceholder = elements.some((el) => el.isPlaceholder);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-canvas-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Template Not Found</h1>
          <p className="text-muted-foreground">
            This template link may be invalid or the template has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas-bg">
      {/* Header */}
      <header className="h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DP</span>
          </div>
          <div className="text-center">
            <h1 className="font-semibold text-sm">{template?.name || 'Generate Your DP'}</h1>
            <p className="text-xs text-muted-foreground">Upload your photo & download</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className="lg:w-80 p-6 bg-background border-b lg:border-b-0 lg:border-r border-border space-y-6">
          {/* Photo Upload */}
          {hasPlaceholder && (
            <div className="space-y-3">
              <h3 className="label-subtle">1. Upload Your Photo</h3>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full p-4 rounded-2xl border-2 border-dashed transition-colors ${
                  userImage 
                    ? 'border-primary/30 bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                }`}
              >
                {userImage ? (
                  <div className="relative">
                    <img 
                      src={userImage} 
                      alt="Your photo" 
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserImage(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={24} strokeWidth={1.5} className="text-muted-foreground" />
                    <span className="text-sm font-medium">Upload Your Photo</span>
                    <span className="text-xs text-muted-foreground">JPG, PNG up to 10MB</span>
                  </div>
                )}
              </motion.button>
            </div>
          )}

          {/* Text Editing */}
          {textElements.length > 0 && (
            <div className="space-y-3">
              <h3 className="label-subtle">{hasPlaceholder ? '2.' : '1.'} Edit Text</h3>
              {textElements.map((el, index) => (
                <div key={el.id} className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Text {textElements.length > 1 ? index + 1 : ''}
                  </label>
                  <input
                    type="text"
                    value={(el as { text: string }).text}
                    onChange={(e) => updateTextElement(el.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter your text..."
                  />
                </div>
              ))}
            </div>
          )}

          {/* Download Button */}
          <AnimatePresence>
            {template && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h3 className="label-subtle">{hasPlaceholder ? (textElements.length > 0 ? '3.' : '2.') : (textElements.length > 0 ? '2.' : '1.')} Download</h3>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  disabled={hasPlaceholder && !userImage}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Download size={18} strokeWidth={1.5} />
                  Download DP
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center p-6 canvas-container">
          {template && (
            <div
              className="shadow-elevated rounded-lg overflow-hidden"
              style={{
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
                  {/* Background Color */}
                  <Rect
                    x={0}
                    y={0}
                    width={template.width}
                    height={template.height}
                    fill={template.backgroundColor}
                  />

                  {/* Background Image */}
                  {template.backgroundImage && (
                    <BackgroundImage
                      src={template.backgroundImage}
                      width={template.width}
                      height={template.height}
                    />
                  )}

                  {/* Elements */}
                  {elements.map((element: CanvasElement) => (
                    <ShapeRenderer
                      key={element.id}
                      element={element}
                      isSelected={false}
                      onSelect={() => {}}
                      onChange={() => {}}
                      userImage={userImage || undefined}
                      isGeneratorMode={true}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}
        </div>
      </div>

      {/* Hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspectRatio={placeholderAspectRatio}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
