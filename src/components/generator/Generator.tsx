import React, { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Konva from 'konva';
import { Stage, Layer, Rect } from 'react-konva';
import { Upload, Download, X, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CanvasElement, TemplateData } from '@/types/editor';
import { ShapeRenderer } from '../editor/ShapeRenderer';
import { toast } from 'sonner';

export const Generator: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const handleTemplateUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as TemplateData;
        setTemplate(data);
        toast.success('Template loaded!');
      } catch {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUserImage(event.target?.result as string);
      toast.success('Photo uploaded!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  React.useEffect(() => {
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

  const hasPlaceholder = template?.elements.some((el) => el.isPlaceholder);

  return (
    <div className="min-h-screen bg-canvas-bg">
      {/* Header */}
      <header className="h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-6">
        <Link 
          to="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
          <span className="text-sm">Back to Editor</span>
        </Link>

        <div className="flex items-center gap-3 mx-auto">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DP</span>
          </div>
          <div className="text-center">
            <h1 className="font-semibold text-sm">Generate Your DP</h1>
            <p className="text-xs text-muted-foreground">Upload template & photo</p>
          </div>
        </div>

        <div className="w-[120px]" />
      </header>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <div className="lg:w-80 p-6 bg-background border-b lg:border-b-0 lg:border-r border-border space-y-6">
          {/* Template Upload */}
          <div className="space-y-3">
            <h3 className="label-subtle">1. Load Template</h3>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => templateInputRef.current?.click()}
              className={`w-full p-4 rounded-2xl border-2 border-dashed transition-colors ${
                template 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} strokeWidth={1.5} className={template ? 'text-primary' : 'text-muted-foreground'} />
                <span className="text-sm font-medium">
                  {template ? template.name || 'Template Loaded' : 'Upload Template JSON'}
                </span>
                {template && (
                  <span className="text-xs text-muted-foreground">
                    {template.width} × {template.height}
                  </span>
                )}
              </div>
            </motion.button>
          </div>

          {/* Photo Upload */}
          <AnimatePresence>
            {template && hasPlaceholder && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h3 className="label-subtle">2. Upload Your Photo</h3>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Download Button */}
          <AnimatePresence>
            {template && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h3 className="label-subtle">{hasPlaceholder ? '3.' : '2.'} Download</h3>
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
          {template ? (
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
                  {/* Background */}
                  <Rect
                    x={0}
                    y={0}
                    width={template.width}
                    height={template.height}
                    fill={template.backgroundColor}
                  />

                  {/* Elements */}
                  {template.elements.map((element: CanvasElement) => (
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
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Upload size={32} strokeWidth={1.5} className="text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No Template Loaded</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Upload a template JSON file to get started. Create templates in the Editor mode.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={templateInputRef}
        type="file"
        accept=".json"
        onChange={handleTemplateUpload}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};
