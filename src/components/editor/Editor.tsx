import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Konva from 'konva';
import { Link } from 'react-router-dom';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { 
  ImagePlus, Layers, ZoomIn, ZoomOut, 
  Grid, Eye, Check, Maximize, 
  Trash2, ChevronLeft, MousePointer2, PanelRight,
  Upload, Sparkles
} from 'lucide-react';
import { publishTemplate } from '@/lib/templates';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CanvasElement, TemplateData } from '@/types/editor';

type SidebarTab = 'properties' | 'layers';

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  const [showGrid, setShowGrid] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const {
    elements, selectedId, setSelectedId, canvasSize, setCanvasSize,
    backgroundColor, setBackgroundColor, backgroundImage, setBackgroundImage,
    addElement, updateElement, deleteElement, duplicateElement,
    moveElement, getSelectedElement, clearSelection, exportTemplate,
  } = useCanvas();

  const selectedElement = getSelectedElement();
  const reversedElements = useMemo(() => [...elements].reverse(), [elements]);

  const fitToScreen = useCallback(() => {
    if (!viewportRef.current) return;
    const padding = isMobile ? 60 : 120;
    const { clientWidth, clientHeight } = viewportRef.current;
    const newZoom = Math.min((clientWidth - padding) / canvasSize.width, (clientHeight - padding) / canvasSize.height, 1);
    setCamera({ 
      x: (clientWidth - (canvasSize.width * newZoom)) / 2, 
      y: (clientHeight - (canvasSize.height * newZoom)) / 2, 
      z: newZoom 
    });
  }, [canvasSize, isMobile]);

  useEffect(() => { setTimeout(fitToScreen, 100); }, [fitToScreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setIsSpacePressed(true); }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && !(e.target instanceof HTMLInputElement)) deleteElement(selectedId);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [selectedId, deleteElement]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.min(Math.max(camera.z + delta, 0.05), 5);
      setCamera(prev => ({ ...prev, z: newZoom }));
    } else {
      setCamera(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // Touch handlers for mobile pan/pinch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1) {
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scaleDelta = dist / lastTouchDist.current;
      const center = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      
      setCamera(prev => {
        const newZ = Math.min(Math.max(prev.z * scaleDelta, 0.05), 5);
        const panX = lastTouchCenter.current ? center.x - lastTouchCenter.current.x : 0;
        const panY = lastTouchCenter.current ? center.y - lastTouchCenter.current.y : 0;
        return { x: prev.x + panX, y: prev.y + panY, z: newZ };
      });

      lastTouchDist.current = dist;
      lastTouchCenter.current = center;
    } else if (e.touches.length === 1 && !isPanning) {
      // Single finger pan (only when on void area)
      const target = e.target as HTMLElement;
      if (target.id === 'void' || target.closest('#void')) {
        const dx = e.touches[0].clientX - lastMousePos.current.x;
        const dy = e.touches[0].clientY - lastMousePos.current.y;
        setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }
  }, [isPanning]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchCenter.current = null;
  }, []);

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) return toast.error('Canvas is empty. Add elements first.');
    setIsPublishing(true);
    try {
      const result = await publishTemplate({
        id: crypto.randomUUID(),
        slug: `dp-${Math.random().toString(36).substring(7)}`,
        ...exportTemplate()
      });
      if (result) {
        setPublishedUrl(`${window.location.origin}/dp/${result.slug}`);
        toast.success('Published successfully!');
      }
    } catch { toast.error('Publish failed. Please try again.'); } 
    finally { setIsPublishing(false); }
  }, [elements, exportTemplate]);

  // Open sidebar on selection (mobile)
  useEffect(() => {
    if (isMobile && selectedId) setSidebarOpen(true);
  }, [selectedId, isMobile]);

  const showSidebar = isMobile ? sidebarOpen : true;

  return (
    <div className="h-[100dvh] flex flex-col bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-blue-500/30 font-sans tracking-tight overflow-hidden transition-colors duration-300">
      
      {/* TOP NAVIGATION BAR */}
      <header className="h-12 px-3 md:px-4 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between z-[100] safe-top shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Link to="/" className="shrink-0 p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95">
            <ChevronLeft size={18} className="text-[#86868b]" />
          </Link>
          <div className="min-w-0 hidden sm:block">
            <span className="text-[12px] font-semibold leading-tight truncate block">Untitled Campaign</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Design / Preview toggle */}
          <div className="flex items-center bg-black/[0.03] dark:bg-white/[0.03] rounded-full p-0.5">
            <button 
              className={cn("h-7 rounded-full text-[11px] px-2.5 md:px-3 flex items-center gap-1.5 font-medium transition-all", !isPreview && "bg-white dark:bg-[#2c2c2e] shadow-sm")}
              onClick={() => setIsPreview(false)}
            >
              <MousePointer2 size={12} />
              <span className="hidden sm:inline">Design</span>
            </button>
            <button 
              className={cn("h-7 rounded-full text-[11px] px-2.5 md:px-3 flex items-center gap-1.5 font-medium transition-all", isPreview && "bg-white dark:bg-[#2c2c2e] shadow-sm")}
              onClick={() => setIsPreview(true)}
            >
              <Eye size={12} />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Mobile sidebar toggle */}
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all active:scale-95",
                sidebarOpen ? "bg-blue-500/10 text-blue-500" : "hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              <PanelRight size={16} />
            </button>
          )}

          <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08] hidden md:block" />
          
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing} 
            className="h-8 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[11px] md:text-[12px] px-3 md:px-4 rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* INFINITE WORKSPACE */}
        <div 
          ref={viewportRef}
          className="flex-1 relative bg-[#efeff4] dark:bg-[#080808] overflow-hidden"
          style={{ cursor: isSpacePressed ? 'grabbing' : 'default', touchAction: 'none' }}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (e.button === 1 || isSpacePressed) setIsPanning(true);
            if ((e.target as HTMLElement).id === "void") clearSelection();
          }}
          onMouseMove={(e) => {
            if (isPanning) setCamera(p => ({ ...p, x: p.x + (e.clientX - lastMousePos.current.x), y: p.y + (e.clientY - lastMousePos.current.y) }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
          }}
          onMouseUp={() => setIsPanning(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
                 style={{ backgroundImage: `radial-gradient(#000 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />
          )}

          <div 
            id="void"
            style={{
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
            className="absolute top-0 left-0"
          >
            <div 
              className="relative shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]"
              style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor }}
            >
              {backgroundImage && <img src={backgroundImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="bg" />}
              <CanvasStage
                elements={elements} selectedId={selectedId} onSelect={setSelectedId}
                onUpdate={updateElement} canvasSize={canvasSize} backgroundColor={backgroundColor}
                backgroundImage={backgroundImage} stageRef={stageRef} zoom={camera.z}
              />
            </div>
          </div>

          {/* ZOOM HUD - Bottom left (hidden on mobile when toolbar overlaps) */}
          <div className="absolute bottom-6 left-3 md:left-6 hidden md:flex items-center gap-1 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl border border-black/[0.05] dark:border-white/[0.05] p-1 rounded-full shadow-2xl z-50">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setCamera({...camera, z: Math.max(camera.z - 0.1, 0.05)})}><ZoomOut size={13} /></Button>
            <span className="text-[10px] font-bold w-10 text-center opacity-60 tabular-nums">{Math.round(camera.z * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setCamera({...camera, z: Math.min(camera.z + 0.1, 5)})}><ZoomIn size={13} /></Button>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={fitToScreen}><Maximize size={13} /></Button>
            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08] mx-0.5" />
            <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", showGrid && "text-blue-500")} onClick={() => setShowGrid(!showGrid)}><Grid size={13} /></Button>
          </div>

          {/* FLOATING TOOLBAR - Center bottom */}
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 safe-bottom">
            <FloatingToolbar
              onAddElement={addElement} hasSelection={!!selectedId}
              onPublish={handlePublish}
              onDelete={() => selectedId && deleteElement(selectedId)}
              onDuplicate={() => selectedId && duplicateElement(selectedId)}
              onMoveUp={() => selectedId && moveElement(selectedId, 'up')}
              onMoveDown={() => selectedId && moveElement(selectedId, 'down')}
            />
          </div>
        </div>

        {/* SIDEBAR - Slide in on mobile, fixed on desktop */}
        <AnimatePresence>
          {showSidebar && (
            <>
              {/* Mobile overlay */}
              {isMobile && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/20 z-[55] lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              
              <motion.div 
                initial={isMobile ? { x: 300 } : false}
                animate={{ x: 0 }}
                exit={isMobile ? { x: 300 } : undefined}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={cn(
                  "bg-white dark:bg-[#111] border-l border-black/[0.05] dark:border-white/[0.05] flex flex-col z-[60]",
                  isMobile 
                    ? "absolute right-0 top-0 bottom-0 w-[85vw] max-w-[340px] shadow-2xl" 
                    : "w-[300px]"
                )}
              >
                {/* Tab switcher */}
                <div className="flex p-1 bg-black/[0.03] dark:bg-white/[0.03] m-3 rounded-lg shrink-0">
                  <button 
                    onClick={() => setActiveTab('properties')} 
                    className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", 
                    activeTab === 'properties' ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-blue-500" : "opacity-40 hover:opacity-100")}
                  >
                    Inspect
                  </button>
                  <button 
                    onClick={() => setActiveTab('layers')} 
                    className={cn("flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all", 
                    activeTab === 'layers' ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-blue-500" : "opacity-40 hover:opacity-100")}
                  >
                    Layers
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 overscroll-contain">
                  {activeTab === 'properties' ? (
                    !selectedId ? (
                      <div className="space-y-8 px-1 py-2">
                        {/* Canvas info */}
                        <div className="space-y-4">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Artboard</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-[#86868b] font-medium">Width</span>
                              <div className="bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-xl text-[12px] font-mono">{canvasSize.width}px</div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-[#86868b] font-medium">Height</span>
                              <div className="bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-xl text-[12px] font-mono">{canvasSize.height}px</div>
                            </div>
                          </div>
                        </div>

                        {/* Background fill */}
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Background</h3>
                          <div className="grid grid-cols-6 gap-2">
                            {['#ffffff', '#000000', '#f4f4f4', '#0071e3', '#32d74b', '#ff453a'].map(c => (
                              <button 
                                key={c} 
                                onClick={() => setBackgroundColor(c)} 
                                className={cn(
                                  "w-full aspect-square rounded-full border-2 transition-all hover:scale-110 active:scale-90",
                                  backgroundColor === c ? "border-blue-500 ring-2 ring-blue-500/20" : "border-black/[0.05] dark:border-white/[0.1]"
                                )} 
                                style={{ backgroundColor: c }} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-[#86868b]">Custom</span>
                            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-black/[0.05] dark:border-white/[0.1]">
                              <input type="color" className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer bg-transparent" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} />
                            </div>
                            <span className="text-[11px] font-mono text-[#86868b] uppercase">{backgroundColor}</span>
                          </div>
                        </div>

                        {/* Upload frame */}
                        <div className="space-y-3">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Frame Image</h3>
                          <button 
                            onClick={() => bgImageInputRef.current?.click()} 
                            className="group w-full h-28 rounded-2xl border-2 border-dashed border-black/[0.06] dark:border-white/[0.06] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all active:scale-[0.98]"
                          >
                            {backgroundImage ? (
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                                  <img src={backgroundImage} alt="Frame" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-left">
                                  <p className="text-[12px] font-semibold">Change Frame</p>
                                  <p className="text-[10px] text-[#86868b]">Tap to replace</p>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload size={20} className="text-[#86868b] group-hover:text-blue-500 transition-colors" />
                                <span className="text-[11px] font-semibold text-[#86868b]">Upload Base Frame</span>
                                <span className="text-[9px] text-[#86868b]/60">PNG, JPG up to 10MB</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Empty state guide */}
                        {elements.length === 0 && !backgroundImage && (
                          <div className="mt-4 p-4 rounded-2xl bg-blue-500/[0.04] border border-blue-500/10">
                            <div className="flex items-start gap-3">
                              <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <p className="text-[12px] font-semibold">Getting started</p>
                                <p className="text-[11px] text-[#86868b] leading-relaxed">
                                  Upload a frame image, then add shapes from the toolbar below. Mark shapes as placeholders so users can insert their photos.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <PropertiesPanel element={selectedElement!} onUpdate={(updates) => updateElement(selectedId, updates)} onClose={clearSelection} />
                    )
                  ) : (
                    <div className="space-y-1 px-1">
                      {elements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <Layers size={24} className="text-[#86868b]/30 mb-3" />
                          <p className="text-[12px] font-medium text-[#86868b]">No layers yet</p>
                          <p className="text-[10px] text-[#86868b]/60 mt-1">Add elements from the toolbar</p>
                        </div>
                      ) : (
                        reversedElements.map((el) => (
                          <div 
                            key={el.id} 
                            onClick={() => setSelectedId(el.id)}
                            className={cn("group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.98]", 
                            selectedId === el.id ? "bg-blue-500/[0.06] border-blue-500/20 shadow-sm" : "border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]")}
                          >
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold",
                              selectedId === el.id ? "bg-blue-500/10 text-blue-500" : "bg-black/[0.05] dark:bg-white/[0.05] opacity-60"
                            )}>
                              {el.type.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-semibold flex-1 truncate">{el.type === 'text' ? (el as any).text : el.type}</span>
                            {el.isPlaceholder && (
                              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500">PH</span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                setCanvasSize({ width: img.width, height: img.height });
                setBackgroundImage(ev.target?.result as string);
                setTimeout(fitToScreen, 100);
            };
            img.src = ev.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
      }} />

      {/* PUBLISH SUCCESS MODAL */}
      <AnimatePresence>
        {publishedUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" 
            onClick={() => setPublishedUrl(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1c1c1e] p-8 md:p-10 rounded-3xl shadow-2xl max-w-sm w-full border border-black/5 dark:border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-5">
                <div className="w-16 h-16 bg-green-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                  <Check size={32} strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Published!</h2>
                  <p className="text-[#86868b] text-[13px] mt-1.5">Share this link with your community.</p>
                </div>
                <div className="flex bg-black/[0.03] dark:bg-white/[0.05] p-1.5 rounded-xl items-center gap-2 border border-black/[0.05] dark:border-white/[0.05]">
                  <input value={publishedUrl} readOnly className="bg-transparent flex-1 px-3 text-[12px] font-medium outline-none truncate" />
                  <Button 
                    onClick={() => { navigator.clipboard.writeText(publishedUrl!); toast.success("Copied!"); }} 
                    className="bg-[#0071e3] hover:bg-[#0077ed] rounded-xl h-9 px-4 text-[11px] font-bold text-white shrink-0"
                  >
                    Copy
                  </Button>
                </div>
                <Button variant="ghost" className="w-full text-[#86868b] text-[12px] font-semibold" onClick={() => setPublishedUrl(null)}>Done</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Editor;