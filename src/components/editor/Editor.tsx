import React, { useRef, useCallback, useState, useEffect } from 'react';
import Konva from 'konva';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { 
  ImagePlus, Link as LinkIcon, Copy, Layers, Settings, 
  ZoomIn, ZoomOut, Grid, Eye, Download, Trash2, Check, 
  Undo, Redo, Maximize
} from 'lucide-react';
import { publishTemplate } from '@/lib/templates';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SidebarTab = 'properties' | 'layers';

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the workspace container
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  
  // UI States
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  const [zoom, setZoom] = useState(1);
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

  // --- Zoom & Fit Logic ---

  // Calculate the "Fit to Screen" zoom level
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    
    const padding = 64; // Spacing around the canvas
    const { clientWidth, clientHeight } = containerRef.current;
    
    // Calculate ratios
    const widthRatio = (clientWidth - padding) / canvasSize.width;
    const heightRatio = (clientHeight - padding) / canvasSize.height;
    
    // Use the smaller ratio to ensure it fits entirely
    const newZoom = Math.min(widthRatio, heightRatio, 1); // Cap at 1 (100%) so small canvases don't explode
    
    setZoom(Number(newZoom.toFixed(2))); // Clean number
  }, [canvasSize]);

  // Auto-fit on load
  useEffect(() => {
    fitToScreen();
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, [fitToScreen]);

  const handleZoom = (delta: number) => {
    setZoom(prev => {
        const newZoom = prev + delta;
        return Math.min(Math.max(0.1, newZoom), 3); // Clamp between 10% and 300%
    });
  };

  // --- Export/Publish Logic ---

  const handleDownload = () => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = 'campaign-design.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image exported successfully");
  };

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) {
      toast.error('Canvas is empty. Add elements first.');
      return;
    }
    setIsPublishing(true);
    try {
      const template = exportTemplate();
      const result = await publishTemplate(template);
      if (result) {
        const url = `${window.location.origin}/dp/${result.slug}`;
        setPublishedUrl(url);
        toast.success('Campaign published!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to publish. Try again.');
    } finally {
      setIsPublishing(false);
    }
  }, [elements, exportTemplate]);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBackgroundImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      if (e.key === 'Delete' || e.key === 'Backspace') selectedId && deleteElement(selectedId);
      if (e.key === 'Escape') { clearSelection(); setIsPreview(false); setPublishedUrl(null); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); selectedId && duplicateElement(selectedId); }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); fitToScreen(); } // CMD+0 to Reset Zoom
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteElement, duplicateElement, clearSelection, fitToScreen]);

  // Auto-switch tabs
  useEffect(() => {
    if (selectedId) setActiveTab('properties');
  }, [selectedId]);

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 overflow-hidden font-sans">
      
      {/* --- HEADER --- */}
      <header className="h-14 px-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">DP</div>
            <div>
              <h1 className="text-sm font-bold leading-none">Campaign Editor</h1>
              <span className="text-[10px] text-muted-foreground">Draft mode</span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-2" />
          
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Undo coming soon")}><Undo className="w-4 h-4" /></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Redo coming soon")}><Redo className="w-4 h-4" /></Button>
             <Button 
                variant={showGrid ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Grid"
             >
                <Grid className="w-4 h-4" />
             </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden md:flex gap-2 h-8" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button 
            variant={isPreview ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 gap-2" 
            onClick={() => {
                if (!isPreview) fitToScreen(); // Auto fit when entering preview
                setIsPreview(!isPreview);
            }}
          >
            <Eye className="w-3.5 h-3.5" /> <span className="hidden md:inline">Preview</span>
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} size="sm" className="h-8 px-4 gap-2">
            <Check className="w-3.5 h-3.5" /> 
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CENTER: Canvas Area (The "Desk") */}
        <div 
            ref={containerRef}
            className="flex-1 relative bg-neutral-100 dark:bg-black/50 flex items-center justify-center overflow-hidden"
        >
            
            {/* Dot Pattern Background (Static Desk Texture) */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20"
                style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />

            {/* The "Artboard" (Moves and Zooms) */}
            {/* We specifically set dimensions here to match the canvas size exactly, then scale the parent */}
            <div 
                className="relative transition-transform duration-200 ease-out origin-center shadow-2xl ring-1 ring-black/5"
                style={{ 
                    width: canvasSize.width,
                    height: canvasSize.height,
                    transform: `scale(${zoom})`,
                }}
            >
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
                
                {/* Visual indicator of canvas bounds */}
                <div className="absolute inset-0 border border-neutral-300 pointer-events-none" />
            </div>

            {/* Zoom Controls (Floating on Desk) */}
            {!isPreview && (
                <div className="absolute bottom-6 right-6 flex items-center gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 rounded-lg shadow-xl z-50">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(-0.1)}><ZoomOut className="w-3.5 h-3.5" /></Button>
                    <span className="text-xs font-mono w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(0.1)}><ZoomIn className="w-3.5 h-3.5" /></Button>
                    <div className="w-px h-4 bg-neutral-200 mx-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitToScreen} title="Fit to Screen"><Maximize className="w-3.5 h-3.5" /></Button>
                </div>
            )}
        </div>

        {/* RIGHT: Sidebar (Tabs) */}
        {!isPreview && (
          <div className="w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-20 shadow-xl shrink-0">
            {/* Tabs Switcher */}
            <div className="flex p-2 border-b border-neutral-200 dark:border-neutral-800">
                <button 
                    onClick={() => setActiveTab('properties')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all",
                        activeTab === 'properties' ? "bg-neutral-100 dark:bg-neutral-800 text-foreground" : "text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    )}
                >
                    <Settings className="w-3.5 h-3.5" /> Properties
                </button>
                <button 
                    onClick={() => setActiveTab('layers')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all",
                        activeTab === 'layers' ? "bg-neutral-100 dark:bg-neutral-800 text-foreground" : "text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    )}
                >
                    <Layers className="w-3.5 h-3.5" /> Layers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'properties' ? (
                    <>
                        {!selectedId ? (
                            <div className="space-y-6">
                                {/* Global Canvas Settings */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">Background Color</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {['#ffffff', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setBackgroundColor(c)}
                                                className={cn("w-full aspect-square rounded-full border shadow-sm transition-transform hover:scale-110", backgroundColor === c && "ring-2 ring-primary ring-offset-2")}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <div className="relative w-full aspect-square rounded-full border bg-gradient-to-br from-gray-100 to-gray-400 overflow-hidden">
                                            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setBackgroundColor(e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">Background Image</label>
                                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-[10px] text-red-500 hover:underline">Remove</button>}
                                    </div>
                                    <div 
                                        onClick={() => bgImageInputRef.current?.click()}
                                        className="h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors relative overflow-hidden group"
                                    >
                                        {backgroundImage ? (
                                            <img src={backgroundImage} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" alt="bg" />
                                        ) : (
                                            <>
                                                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Click to upload</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <PropertiesPanel
                                element={selectedElement}
                                onUpdate={(updates) => selectedId && updateElement(selectedId, updates)}
                                onClose={clearSelection}
                            />
                        )}
                    </>
                ) : (
                    // Layers List
                    <div className="space-y-2">
                        {elements.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No layers added yet.</p>}
                        {[...elements].reverse().map((el) => (
                            <div 
                                key={el.id}
                                onClick={() => setSelectedId(el.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer group transition-all",
                                    selectedId === el.id ? "bg-primary/5 border-primary/20" : "bg-white dark:bg-neutral-800 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                )}
                            >
                                <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-neutral-900 border flex items-center justify-center text-muted-foreground">
                                    {el.type === 'text' && "T"}
                                    {el.type === 'image' && <ImagePlus className="w-3 h-3" />}
                                    {el.type === 'shape' && <div className="w-3 h-3 bg-current rounded-sm" />}
                                </div>
                                <span className="text-xs font-medium flex-1 truncate">
                                    {el.type === 'text' ? (el.content || "Text Layer") : `${el.type} layer`}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500">
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

      {/* --- PUBLISHED SUCCESS MODAL --- */}
      <AnimatePresence>
        {publishedUrl && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPublishedUrl(null)}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl m-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-green-500 p-6 flex flex-col items-center text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">Published Successfully!</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Share Link</label>
                        <div className="flex gap-2">
                            <input type="text" value={publishedUrl} readOnly className="flex-1 text-sm bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg border-none focus:ring-2 ring-green-500" />
                            <Button onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success("Copied!"); }} size="sm">
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => setPublishedUrl(null)}>Close</Button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FLOATING TOOLBAR (Bottom) --- */}
      {!isPreview && (
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
      )}

      {/* Hidden File Input */}
      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
    </div>
  );
};