import React, { useRef, useCallback, useState, useEffect } from 'react';
import Konva from 'konva';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { 
  ImagePlus, Copy, Layers, Settings, 
  ZoomIn, ZoomOut, Grid, Eye, Download, Check, 
  Undo, Redo, Maximize, Trash2, MousePointer2
} from 'lucide-react';
import { publishTemplate } from '@/lib/templates';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SidebarTab = 'properties' | 'layers';

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CAMERA STATE ---
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Refs for drag logic
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

  // --- BOUNDARY LOGIC (Prevent getting lost) ---
  const clampCamera = (x: number, y: number, z: number) => {
    if (!viewportRef.current) return { x, y };

    const vpW = viewportRef.current.clientWidth;
    const vpH = viewportRef.current.clientHeight;
    const artW = canvasSize.width * z;
    const artH = canvasSize.height * z;

    // Margins: How much of the canvas must remain visible? (e.g., 100px)
    const margin = 100;

    // Calculate Limits
    // The right edge of canvas (x + artW) cannot be less than margin
    // The left edge of canvas (x) cannot be greater than viewport width - margin
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

  // Initial fit
  useEffect(() => {
    setTimeout(fitToScreen, 100);
  }, [fitToScreen]);

  // --- MOUSE WHEEL LOGIC (Zoom vs Scroll) ---
  const handleWheel = (e: React.WheelEvent) => {
    // 1. ZOOMING (Ctrl + Wheel OR Pinch)
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(camera.z + delta, 0.1), 5);

        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Zoom towards mouse pointer
        const worldX = (mouseX - camera.x) / camera.z;
        const worldY = (mouseY - camera.y) / camera.z;

        let newCameraX = mouseX - worldX * newZoom;
        let newCameraY = mouseY - worldY * newZoom;

        // Apply Clamping
        const clamped = clampCamera(newCameraX, newCameraY, newZoom);
        setCamera({ x: clamped.x, y: clamped.y, z: newZoom });
    } 
    // 2. PANNING (Regular Scroll)
    else {
        // e.deltaX handles Shift+Wheel horizontal scrolling automatically in most browsers
        // e.deltaY handles vertical
        const newX = camera.x - e.deltaX; 
        const newY = camera.y - e.deltaY;

        // Apply Clamping
        const clamped = clampCamera(newX, newY, camera.z);
        setCamera(prev => ({ ...prev, x: clamped.x, y: clamped.y }));
    }
  };

  // --- DRAG / PAN LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger Pan if Space is held OR Middle Mouse Button
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault(); // Stop text selection
      return;
    }
    
    // If clicking on the "Void" (gray area), deselect
    if ((e.target as HTMLElement).id === "infinite-void-click-area") {
        clearSelection();
    }
    
    // Otherwise, we let the event pass through to Konva elements
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      const newX = camera.x + deltaX;
      const newY = camera.y + deltaY;

      const clamped = clampCamera(newX, newY, camera.z);
      
      setCamera(prev => ({ 
          ...prev, 
          x: clamped.x, 
          y: clamped.y 
      }));
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // --- KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      if (e.code === 'Space' && !isSpacePressed) {
          setIsSpacePressed(true); 
          e.preventDefault(); // Prevent page scroll on space
      }
      
      // Standard shortcuts
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

  // Update tab when selection changes
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
      const template = exportTemplate();
      const result = await publishTemplate(template);
      if (result) {
        setPublishedUrl(`${window.location.origin}/dp/${result.slug}`);
        toast.success('Campaign published!');
      }
    } catch { toast.error('Failed to publish.'); } 
    finally { setIsPublishing(false); }
  }, [elements, exportTemplate]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setBackgroundImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <header className="h-16 px-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">DP</div>
            <div>
              <h1 className="text-sm font-bold leading-none">Draft</h1>
              <span className="text-[10px] text-muted-foreground">Editing mode</span>
            </div>
          </div>
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2" />
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8"><Undo className="w-4 h-4" /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8"><Redo className="w-4 h-4" /></Button>
             <Button variant={showGrid ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setShowGrid(!showGrid)}>
                <Grid className="w-4 h-4" />
             </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:flex gap-2 h-8" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant={isPreview ? "secondary" : "ghost"} size="sm" className="h-8 gap-2" onClick={() => setIsPreview(!isPreview)}>
            <Eye className="w-3.5 h-3.5" /> <span className="hidden md:inline">Preview</span>
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} size="sm" className="h-8 px-4 gap-2">
            <Check className="w-3.5 h-3.5" /> {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* CENTER: Infinite Canvas Viewport */}
        <div 
            ref={viewportRef}
            className="flex-1 relative bg-neutral-100 dark:bg-black/50 overflow-hidden"
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
                {/* 1. Background Grid (Purely Visual) */}
                <div 
                   className="absolute pointer-events-none opacity-20 dark:opacity-20"
                   style={{
                       left: -10000, top: -10000, right: -10000, bottom: -10000, // Massive background
                       backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)',
                       backgroundSize: '40px 40px'
                   }} 
                />

                {/* 2. The Void Click Area (Invisible helper to catch clicks outside artboard) */}
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
                    // Stop panning events from propagating when interacting with canvas
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
                        backgroundColor={backgroundColor}     // pass real background color
                        backgroundImage={backgroundImage}     // pass uploaded image
                        stageRef={stageRef}
                      
                    />
                </div>
            </div>

            {/* HUD / Info Overlay */}
            {!isPreview && (
                <>
                    <div className="absolute top-4 left-4 pointer-events-none text-[10px] text-muted-foreground z-40 bg-white/50 dark:bg-black/50 p-2 rounded backdrop-blur-sm">
                        {Math.round(camera.z * 100)}% | Scroll to Pan | Ctrl+Scroll to Zoom
                    </div>

                    <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 rounded-lg shadow-xl z-50">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const newZ = Math.max(camera.z - 0.1, 0.1);
                            setCamera({...camera, z: newZ});
                        }}><ZoomOut className="w-3.5 h-3.5" /></Button>
                        <span className="text-xs font-mono w-10 text-center select-none">{Math.round(camera.z * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const newZ = Math.min(camera.z + 0.1, 5);
                            setCamera({...camera, z: newZ});
                        }}><ZoomIn className="w-3.5 h-3.5" /></Button>
                        <div className="w-px h-4 bg-neutral-200 mx-1" />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitToScreen}><Maximize className="w-3.5 h-3.5" /></Button>
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
          <div className="w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-20 shadow-xl shrink-0">
            <div className="flex p-2 border-b border-neutral-200 dark:border-neutral-800">
                <button onClick={() => setActiveTab('properties')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all", activeTab === 'properties' ? "bg-neutral-100 dark:bg-neutral-800 text-foreground" : "text-muted-foreground")}>
                    <Settings className="w-3.5 h-3.5" /> Properties
                </button>
                <button onClick={() => setActiveTab('layers')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all", activeTab === 'layers' ? "bg-neutral-100 dark:bg-neutral-800 text-foreground" : "text-muted-foreground")}>
                    <Layers className="w-3.5 h-3.5" /> Layers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'properties' ? (
                    <>
                        {!selectedId ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Background</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'].map(c => (
                                            <button key={c} onClick={() => setBackgroundColor(c)} className={cn("w-full aspect-square rounded-full border", backgroundColor === c && "ring-2 ring-primary")} style={{ backgroundColor: c }} />
                                        ))}
                                        <div className="relative w-full aspect-square rounded-full border bg-gradient-to-br from-gray-100 to-gray-400 overflow-hidden">
                                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBackgroundColor(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Image</label>
                                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-[10px] text-red-500 hover:underline">Remove</button>}
                                    </div>
                                    <div onClick={() => bgImageInputRef.current?.click()} className="h-32 border-2 border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary">
                                        {backgroundImage ? (
                                            <img src={backgroundImage} className="w-full h-full object-cover rounded-lg opacity-50" alt="bg" />
                                        ) : (
                                            <> <ImagePlus className="w-6 h-6 text-muted-foreground" /> <span className="text-xs text-muted-foreground">Upload</span> </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <PropertiesPanel element={selectedElement} onUpdate={(updates) => selectedId && updateElement(selectedId, updates)} onClose={clearSelection} />
                        )}
                    </>
                ) : (
                    <div className="space-y-2">
                        {elements.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No layers.</p>}
                        {[...elements].reverse().map((el) => (
                            <div key={el.id} onClick={() => setSelectedId(el.id)} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", selectedId === el.id ? "bg-primary/5 border-primary/20" : "bg-white border-transparent")}>
                                <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center text-muted-foreground">
                                    {el.type === 'text' && "T"} {el.type === 'image' && <ImagePlus className="w-3 h-3" />} {el.type === 'shape' && <div className="w-3 h-3 bg-current rounded-sm" />}
                                </div>
                                <span className="text-xs font-medium flex-1 truncate">{el.type === 'text' ? el.content : el.type}</span>
                                <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Inputs */}
      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />

      {/* Published Modal (Optimized) */}
      <AnimatePresence>
        {publishedUrl && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPublishedUrl(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full m-4" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-green-100 p-3 rounded-full"><Check className="w-8 h-8 text-green-600" /></div>
                    <h2 className="text-xl font-bold">Published!</h2>
                    <div className="flex w-full gap-2">
                        <input value={publishedUrl} readOnly className="flex-1 bg-neutral-100 px-3 py-2 rounded text-sm" />
                        <Button onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success("Copied!"); }}><Copy className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => setPublishedUrl(null)}>Close</Button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};