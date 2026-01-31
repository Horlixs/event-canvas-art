import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Konva from 'konva';
import { Link } from 'react-router-dom';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { 
  ImagePlus, Copy, Layers, Settings, 
  ZoomIn, ZoomOut, Grid, Eye, Download, Check, 
  Undo, Redo, Maximize, Trash2
} from 'lucide-react';
import { publishTemplate } from '@/lib/templates';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
// IMPORTS: Ensure all sub-types are imported from your types file
import { 
  CanvasElement, 
  TextElement, 
  ImageElement, 
  RectElement, 
  CircleElement, 
  PolygonElement, 
  TemplateData 
} from '@/types/editor';

type SidebarTab = 'properties' | 'layers';

// --- TYPE GUARDS ---
const isTextElement = (el: CanvasElement): el is TextElement => el.type === 'text';
const isImageElement = (el: CanvasElement): el is ImageElement => el.type === 'image';
const isShapeElement = (el: CanvasElement): el is (RectElement | CircleElement | PolygonElement) => 
  ['rect', 'circle', 'polygon'].includes(el.type);

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CAMERA STATE ---
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // --- UI STATE ---
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  const [showGrid, setShowGrid] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

  const {
    elements,
    selectedId,
    setSelectedId,
    canvasSize,
    setCanvasSize,
    backgroundColor,
    setBackgroundColor,
    backgroundImage,
    setBackgroundImage,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElement,
    getSelectedElement,
    clearSelection,
    exportTemplate,
  } = useCanvas();

  const selectedElement = getSelectedElement();

  // Memoize reversed elements for Layers panel performance
  const reversedElements = useMemo(() => [...elements].reverse(), [elements]);

  // --- BOUNDARY LOGIC ---
  const clampCamera = (x: number, y: number, z: number) => {
    if (!viewportRef.current) return { x, y };

    const vpW = viewportRef.current.clientWidth;
    const vpH = viewportRef.current.clientHeight;
    const artW = canvasSize.width * z;
    const artH = canvasSize.height * z;
    const margin = 100;

    const minX = margin - artW; 
    const maxX = vpW - margin;
    const minY = margin - artH;
    const maxY = vpH - margin;

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  // --- FIT TO SCREEN ---
  const fitToScreen = useCallback(() => {
    if (!viewportRef.current) return;
    
    const padding = 60;
    const { clientWidth, clientHeight } = viewportRef.current;
    
    const widthRatio = (clientWidth - padding) / canvasSize.width;
    const heightRatio = (clientHeight - padding) / canvasSize.height;
    const newZoom = Math.min(widthRatio, heightRatio, 1);

    const newX = (clientWidth - (canvasSize.width * newZoom)) / 2;
    const newY = (clientHeight - (canvasSize.height * newZoom)) / 2;

    setCamera({ x: newX, y: newY, z: newZoom });
  }, [canvasSize]);

  useEffect(() => {
    setTimeout(fitToScreen, 100);
  }, [fitToScreen]);

  // --- MOUSE WHEEL LOGIC ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(camera.z + delta, 0.1), 5);

        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - camera.x) / camera.z;
        const worldY = (mouseY - camera.y) / camera.z;

        let newCameraX = mouseX - worldX * newZoom;
        let newCameraY = mouseY - worldY * newZoom;

        const clamped = clampCamera(newCameraX, newCameraY, newZoom);
        setCamera({ x: clamped.x, y: clamped.y, z: newZoom });
    } else {
        const newX = camera.x - e.deltaX; 
        const newY = camera.y - e.deltaY;
        const clamped = clampCamera(newX, newY, camera.z);
        setCamera(prev => ({ ...prev, x: clamped.x, y: clamped.y }));
    }
  };

  // --- MOUSE EVENTS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault(); 
      return;
    }
    
    if ((e.target as HTMLElement).id === "infinite-void-click-area") {
        clearSelection();
    }
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      const newX = camera.x + deltaX;
      const newY = camera.y + deltaY;

      const clamped = clampCamera(newX, newY, camera.z);
      
      setCamera(prev => ({ ...prev, x: clamped.x, y: clamped.y }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // --- KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;

      if (e.code === 'Space' && !isSpacePressed) {
          setIsSpacePressed(true); 
          e.preventDefault(); 
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') selectedId && deleteElement(selectedId);
      if (e.key === 'Escape') { clearSelection(); setIsPreview(false); setPublishedUrl(null); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); selectedId && duplicateElement(selectedId); }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); fitToScreen(); }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            setIsSpacePressed(false);
            setIsPanning(false);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, deleteElement, duplicateElement, clearSelection, fitToScreen, isSpacePressed]);

  useEffect(() => {
    if (selectedId) setActiveTab('properties');
  }, [selectedId]);

  // --- ACTIONS ---
  const handleDownload = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'design.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image exported");
  };

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) { toast.error('Canvas is empty.'); return; }
    setIsPublishing(true);
    try {
      const baseTemplate = exportTemplate();
      
      // Ensure ID and Slug are present
      const finalTemplate: TemplateData = {
        id: crypto.randomUUID(),
        slug: `design-${Date.now()}`,
        ...baseTemplate,
      };

      const result = await publishTemplate(finalTemplate);
      if (result) {
        setPublishedUrl(`${window.location.origin}/dp/${result.slug}`);
        toast.success('Campaign published!');
      }
    } catch { toast.error('Failed to publish.'); } 
    finally { setIsPublishing(false); }
  }, [elements, exportTemplate]);

  // THIS IS THE FUNCTION THAT WAS MISSING
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setCanvasSize({ width: img.width, height: img.height });
        setBackgroundImage(src);
        setTimeout(() => fitToScreen(), 50);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };
  
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <header className="h-16 px-6 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">DP</div>
            <div>
              <h1 className="text-sm font-bold leading-none text-slate-900 dark:text-white">Editor</h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Design mode</span>
            </div>
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-white/10 mx-2" />
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"><Undo className="w-4 h-4" /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"><Redo className="w-4 h-4" /></Button>
             <Button variant={showGrid ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setShowGrid(!showGrid)}>
                <Grid className="w-4 h-4" />
             </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:flex gap-2 h-10 rounded-sm border-slate-200 dark:border-slate-800" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant={isPreview ? "secondary" : "ghost"} size="sm" className="h-10 gap-2 rounded-sm" onClick={() => setIsPreview(!isPreview)}>
            <Eye className="w-3.5 h-3.5" /> <span className="hidden md:inline">Preview</span>
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} size="sm" className="h-10 px-4 gap-2 rounded-sm shadow-lg shadow-primary/20">
            <Check className="w-3.5 h-3.5" /> {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CENTER: Infinite Canvas Viewport */}
        <div 
            ref={viewportRef}
            className="flex-1 relative bg-slate-50 dark:bg-black/50 overflow-hidden transition-colors duration-300"
            style={{ 
                cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default' 
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* The Infinite World Wrapper */}
            <div 
                style={{
                    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
                    transformOrigin: '0 0',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0, 
                    left: 0,
                    willChange: 'transform',
                }}
            >
                {/* 1. Background Grid */}
                <div 
                   className="absolute pointer-events-none opacity-20 dark:opacity-20"
                   style={{
                       left: -10000, top: -10000, right: -10000, bottom: -10000, 
                       backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                       backgroundSize: '40px 40px'
                   }} 
                />

                {/* 2. The Void Click Area */}
                <div 
                    id="infinite-void-click-area"
                    style={{
                        position: 'absolute',
                        left: -10000, top: -10000, right: -10000, bottom: -10000,
                        zIndex: 0
                    }}
                />

                {/* 3. The Physical Artboard */}
                <div 
                    className="relative shadow-2xl ring-1 ring-black/5 bg-white transition-shadow"
                    style={{ 
                        width: canvasSize.width,
                        height: canvasSize.height,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        backgroundColor: backgroundColor,
                        zIndex: 10
                    }}
                    onMouseDown={(e) => !isSpacePressed && e.stopPropagation()} 
                >
                    {backgroundImage && (
                        <div className="absolute inset-0 z-0 pointer-events-none select-none">
                            <img src={backgroundImage} alt="bg" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <CanvasStage
                        elements={elements}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onUpdate={updateElement}
                        canvasSize={canvasSize}
                        backgroundColor={backgroundColor}
                        backgroundImage={backgroundImage}
                        stageRef={stageRef}
                    />
                </div>
            </div>

            {/* HUD / Info Overlay */}
            {!isPreview && (
                <>
                    <div className="absolute top-4 left-4 pointer-events-none text-[12px] text-slate-500 dark:text-slate-400 z-40 bg-white/70 dark:bg-black/70 p-2 rounded-sm backdrop-blur-sm border border-slate-100 dark:border-white/10 shadow-xl">
                        {Math.round(camera.z * 100)}% | Scroll to Pan | Ctrl+Scroll to Zoom
                    </div>

                    <div className="absolute bottom-8 right-6 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-white/10 p-2 rounded-lg shadow-xl z-50">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const newZ = Math.max(camera.z - 0.02, 0.02);
                            setCamera({...camera, z: newZ});
                        }}><ZoomOut className="w-3.5 h-3.5" /></Button>
                        <span className="text-xs font-mono w-10 text-center select-none text-slate-600 dark:text-slate-300">{Math.round(camera.z * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            const newZ = Math.min(camera.z + 0.02, 5);
                            setCamera({...camera, z: newZ});
                        }}><ZoomIn className="w-3.5 h-3.5" /></Button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fitToScreen}><Maximize className="w-3.5 h-3.5" /></Button>
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
                        <FloatingToolbar
                            onAddElement={addElement}
                            onPublish={handlePublish}
                            onDelete={() => selectedId && deleteElement(selectedId)}
                            onDuplicate={() => selectedId && duplicateElement(selectedId)}
                            onMoveUp={() => selectedId && moveElement(selectedId, 'up')}
                            onMoveDown={() => selectedId && moveElement(selectedId, 'down')}
                            hasSelection={!!selectedId}
                            isPublishing={isPublishing}
                        />
                    </div>
                </>
            )}
        </div>

        {/* RIGHT: Sidebar */}
        {!isPreview && (
          <div className="w-80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl border-l border-slate-200 dark:border-white/10 flex flex-col z-20 shadow-xl shrink-0">
            <div className="flex p-2 border-b border-slate-200 dark:border-white/10">
                <button onClick={() => setActiveTab('properties')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-sm transition-all", activeTab === 'properties' ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>
                    <Settings className="w-3.5 h-6" /> Properties
                </button>
                <button onClick={() => setActiveTab('layers')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-sm transition-all", activeTab === 'layers' ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>
                    <Layers className="w-3.5 h-6" /> Layers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'properties' ? (
                    <>
                        {!selectedId ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Background</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'].map(c => (
                                            <button key={c} onClick={() => setBackgroundColor(c)} className={cn("w-full aspect-square rounded-full border-2 transition-all", backgroundColor === c ? "ring-2 ring-primary ring-offset-2" : "border-slate-200 dark:border-slate-800")} style={{ backgroundColor: c }} />
                                        ))}
                                        <div className="relative w-full aspect-square rounded-full border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-100 to-slate-400 overflow-hidden">
                                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBackgroundColor(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Image</label>
                                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-[10px] text-red-500 hover:underline">Remove</button>}
                                    </div>
                                    <div onClick={() => bgImageInputRef.current?.click()} className="h-32 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors">
                                        {backgroundImage ? (
                                            <img src={backgroundImage} className="w-full h-full object-cover rounded-lg opacity-50" alt="bg" />
                                        ) : (
                                            <> <ImagePlus className="w-6 h-6 text-slate-400 dark:text-slate-500" /> <span className="text-xs text-slate-500 dark:text-slate-400">Upload</span> </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <PropertiesPanel element={selectedElement!} onUpdate={(updates) => selectedId && updateElement(selectedId, updates)} onClose={clearSelection} />
                        )}
                    </>
                ) : (
                    <div className="space-y-2">
                        {reversedElements.length === 0 && <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-8">No layers.</p>}
                        {reversedElements.map((el) => (
                          <div
                            key={el.id}
                            onClick={() => setSelectedId(el.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              selectedId === el.id ? "bg-primary/5 border-primary/20 dark:bg-primary/10" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                              {isTextElement(el) && "T"}
                              {isImageElement(el) && <ImagePlus className="w-3 h-3" />}
                              {isShapeElement(el) && <div className="w-3 h-3 bg-current rounded-sm" />}
                            </div>

                            <span className="text-xs font-medium flex-1 truncate text-slate-900 dark:text-white">
                              {isTextElement(el) ? (el.text || "Text Layer") : isImageElement(el) ? "Image" : "Layer"}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteElement(el.id);
                              }}
                              className="p-1 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />

      {/* Published Modal */}
      <AnimatePresence>
        {publishedUrl && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPublishedUrl(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl max-w-md w-full m-4 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full"><Check className="w-8 h-8 text-green-600 dark:text-green-400" /></div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Published!</h2>
                    <div className="flex w-full gap-2">
                        <input value={publishedUrl} readOnly className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                        <Button onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success("Copied!"); }} className="rounded-lg"><Copy className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="outline" className="w-full rounded-lg border-slate-200 dark:border-slate-800" onClick={() => setPublishedUrl(null)}>Close</Button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};