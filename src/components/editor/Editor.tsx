import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Konva from 'konva';
import { Link } from 'react-router-dom';
import { useCanvas } from '@/hooks/useCanvas';
import { useAuth } from '@/hooks/useAuth';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { AuthModal } from '@/components/AuthModal';
import { toast } from 'sonner';
import { 
  ImagePlus, Layers, ZoomIn, ZoomOut, 
  Grid, Eye, Check, Maximize, 
  Trash2, ChevronLeft, MousePointer2, PanelRight,
  Upload, Sparkles, Loader2, Pencil, Link2
} from 'lucide-react';
import { publishTemplate, updateTemplateSlug } from '@/lib/templates';
import { compressImage } from '@/lib/imageUtils';
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
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);
  const [customSlug, setCustomSlug] = useState('');
  const [savedCustomSlug, setSavedCustomSlug] = useState<string | null>(null);
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugSaving, setSlugSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  const [showGrid, setShowGrid] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { user } = useAuth();

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
    templateName, setTemplateName,
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
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.code === 'Space' && !e.repeat && !inInput) { e.preventDefault(); setIsSpacePressed(true); }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId && !inInput) deleteElement(selectedId);
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

  const pendingPublishRef = useRef(false);

  const doPublish = useCallback(async (userId: string) => {
    setIsPublishing(true);
    try {
      const result = await publishTemplate(exportTemplate(), userId);
      if (result) {
        setOriginalSlug(result.slug);
        setPublishedSlug(result.slug);
        setCustomSlug('');
        setSavedCustomSlug(null);
        setPublishedUrl(`${window.location.origin}/dp/${result.slug}`);
        toast.success('Published successfully!');
      } else {
        toast.error('Publish failed. Please try again.');
      }
    } catch { toast.error('Publish failed. Please try again.'); } 
    finally { setIsPublishing(false); }
  }, [exportTemplate]);

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) return toast.error('Canvas is empty. Add elements first.');
    if (!user) {
      pendingPublishRef.current = true;
      setShowAuthModal(true);
      return;
    }
    doPublish(user.id);
  }, [elements, user, doPublish]);

  // Auto-publish after successful login
  useEffect(() => {
    if (user && pendingPublishRef.current) {
      pendingPublishRef.current = false;
      setShowAuthModal(false);
      doPublish(user.id);
    }
  }, [user, doPublish]);

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
          <div className="min-w-0 hidden sm:flex items-center gap-1.5 group">
            {isEditingName ? (
              <input
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingName(false); }}
                className="text-[12px] font-semibold leading-tight bg-transparent border-b border-blue-500 outline-none px-0.5 py-0 max-w-[160px]"
                maxLength={60}
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="text-[12px] font-semibold leading-tight truncate block max-w-[160px] hover:text-blue-500 transition-colors text-left"
              >
                {templateName}
              </button>
            )}
            {!isEditingName && (
              <Pencil size={11} className="text-[#86868b]/0 group-hover:text-[#86868b]/60 transition-colors shrink-0 cursor-pointer" onClick={() => setIsEditingName(true)} />
            )}
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
                backgroundImage={backgroundImage} stageRef={stageRef} userImage={null} zoom={camera.z}
              />
            </div>
          </div>

          {/* EMPTY STATE — Upload prompt when canvas is blank */}
          {!backgroundImage && elements.length === 0 && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => bgImageInputRef.current?.click()}
                className="pointer-events-auto group flex flex-col items-center gap-5 p-10 md:p-14 rounded-3xl bg-white/70 dark:bg-[#000000] backdrop-blur-2xl border-2 border-dashed border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071e3]/40 dark:hover:border-[#0071e3]/40 transition-all duration-300 shadow-xl cursor-pointer active:scale-[0.98] max-w-[90vw]"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#86868b]/15 flex items-center justify-center group-hover:bg-[#86868b]/25 transition-colors">
                  <Upload size={28} className="text-[#000000] dark:text-[#ffffff]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-[15px] md:text-[17px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Upload your frame</p>
                  <p className="text-[12px] md:text-[13px] text-[#86868b] max-w-[240px] leading-relaxed">
                    Start by uploading the base image for your DP template
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#86868b]/60 mt-1">PNG, JPG up to 10MB</span>
              </motion.button>
            </div>
          )}

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

      <input ref={bgImageInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          setUploadProgress(0);
          const { dataUrl, width, height } = await compressImage(file, {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 0.85,
            onProgress: (pct) => setUploadProgress(pct),
          });
          setCanvasSize({ width, height });
          setBackgroundImage(dataUrl);
          setTimeout(fitToScreen, 100);
        } catch (err) {
          console.error('Image processing failed:', err);
          toast.error('Failed to process image. Try a smaller file.');
        } finally {
          setUploadProgress(null);
        }
      }} />

      {/* UPLOAD PROGRESS OVERLAY */}
      <AnimatePresence>
        {uploadProgress !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-8 max-w-xs w-full shadow-2xl border border-black/5 dark:border-white/10 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#0071e3]/10 flex items-center justify-center mx-auto">
                <Loader2 size={28} className="text-[#0071e3] animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Processing Image</h3>
                <p className="text-[#86868b] text-[12px] mt-1">Optimizing for best quality…</p>
              </div>
              <div className="space-y-2">
                <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0071e3] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#86868b]">{Math.round(uploadProgress)}%</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PUBLISH SUCCESS MODAL */}
      <AnimatePresence>
        {publishedUrl && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xl p-0 sm:p-4" 
            onClick={() => { setPublishedUrl(null); setIsEditingSlug(false); }}
          >
            <motion.div 
              initial={{ y: 60, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 400 }}
              className="bg-white dark:bg-[#1c1c1e] w-full sm:max-w-[440px] sm:rounded-[28px] rounded-t-[28px] shadow-2xl border-t sm:border border-black/5 dark:border-white/[0.08] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Success banner */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-400/5 to-transparent dark:from-emerald-500/[0.06] dark:via-green-400/[0.03]" />
                <div className="relative px-7 pt-8 pb-6 text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.15 }}
                    className="w-[52px] h-[52px] bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-[16px] flex items-center justify-center mx-auto shadow-xl shadow-green-500/25 dark:shadow-green-500/15"
                  >
                    <Check size={26} strokeWidth={3} />
                  </motion.div>
                  <h2 className="text-[20px] font-bold tracking-tight mt-4">You're Live!</h2>
                  <p className="text-[13px] text-[#86868b] mt-1 leading-relaxed">Your template is published and ready to share</p>
                </div>
              </div>

              <div className="px-7 pb-7 space-y-4">
                {/* Original URL — always visible */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Original Link
                  </label>
                  <div className="flex bg-[#f5f5f7] dark:bg-white/[0.04] rounded-2xl items-center border border-black/[0.04] dark:border-white/[0.06] overflow-hidden transition-all focus-within:border-[#0071e3]/30 focus-within:ring-2 focus-within:ring-[#0071e3]/10">
                    <input 
                      value={`${window.location.origin}/dp/${originalSlug}`} 
                      readOnly 
                      className="bg-transparent flex-1 pl-4 pr-2 py-3 text-[13px] font-medium outline-none truncate text-[#1d1d1f] dark:text-[#f5f5f7]" 
                      onFocus={(e) => e.target.select()}
                    />
                    <Button 
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/dp/${originalSlug}`); toast.success("Link copied!"); }} 
                      className="bg-[#0071e3] hover:bg-[#0077ed] rounded-xl h-9 px-4 text-[11px] font-bold text-white shrink-0 mr-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Custom URL — shown after saving */}
                <AnimatePresence>
                  {savedCustomSlug && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#0071e3] flex items-center gap-1.5">
                        <Link2 size={10} />
                        Custom Link
                      </label>
                      <div className="flex bg-[#0071e3]/[0.03] dark:bg-[#0071e3]/[0.06] rounded-2xl items-center border border-[#0071e3]/15 dark:border-[#0071e3]/20 overflow-hidden transition-all focus-within:border-[#0071e3]/30 focus-within:ring-2 focus-within:ring-[#0071e3]/10">
                        <input 
                          value={`${window.location.origin}/dp/${savedCustomSlug}`} 
                          readOnly 
                          className="bg-transparent flex-1 pl-4 pr-2 py-3 text-[13px] font-medium outline-none truncate text-[#0071e3] dark:text-[#2997ff]" 
                          onFocus={(e) => e.target.select()}
                        />
                        <Button 
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/dp/${savedCustomSlug}`); toast.success("Custom link copied!"); }} 
                          className="bg-[#0071e3] hover:bg-[#0077ed] rounded-xl h-9 px-4 text-[11px] font-bold text-white shrink-0 mr-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all"
                        >
                          Copy
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-black/[0.05] dark:bg-white/[0.05]" />
                  <span className="text-[10px] font-semibold text-[#86868b]/60 uppercase tracking-wider">{savedCustomSlug ? 'edit' : 'add'}</span>
                  <div className="flex-1 h-px bg-black/[0.05] dark:bg-white/[0.05]" />
                </div>

                {/* Custom slug editor */}
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsEditingSlug(!isEditingSlug)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]",
                      isEditingSlug 
                        ? "border-[#0071e3]/20 bg-[#0071e3]/[0.03] dark:bg-[#0071e3]/[0.06]" 
                        : "border-black/[0.04] dark:border-white/[0.06] bg-[#f5f5f7] dark:bg-white/[0.04] hover:border-[#0071e3]/20"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                      isEditingSlug ? "bg-[#0071e3]/10 text-[#0071e3]" : "bg-black/[0.04] dark:bg-white/[0.06] text-[#86868b]"
                    )}>
                      <Link2 size={16} />
                    </div>
                    <div className="text-left flex-1">
                      <p className={cn("text-[13px] font-semibold", isEditingSlug ? "text-[#0071e3]" : "")}>
                        {savedCustomSlug ? 'Change Custom URL' : 'Customize URL'}
                      </p>
                      <p className="text-[11px] text-[#86868b]">
                        {savedCustomSlug ? 'Update your branded link' : 'Make it memorable & branded'}
                      </p>
                    </div>
                    <Pencil size={14} className={cn("transition-colors", isEditingSlug ? "text-[#0071e3]" : "text-[#86868b]/40")} />
                  </button>
                  
                  <AnimatePresence>
                    {isEditingSlug && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 pt-1">
                          <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[#f5f5f7] dark:bg-white/[0.04] overflow-hidden transition-all focus-within:border-[#0071e3]/30 focus-within:ring-2 focus-within:ring-[#0071e3]/10">
                            <div className="flex items-center px-4 pt-2">
                              <span className="text-[10px] font-semibold text-[#86868b] select-none uppercase tracking-wider">URL Preview</span>
                            </div>
                            <div className="flex items-center px-4 pb-3 pt-1">
                              <span className="text-[12px] text-[#86868b] shrink-0 select-none font-medium">/dp/</span>
                              <input
                                autoFocus
                                value={customSlug}
                                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))}
                                className="bg-transparent flex-1 text-[14px] font-bold outline-none min-w-0 text-[#1d1d1f] dark:text-[#f5f5f7]"
                                placeholder="my-event-2026"
                                maxLength={30}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] text-[#86868b] leading-relaxed">
                              {customSlug.length < 3 
                                ? <span className="text-amber-500">Min 3 characters</span> 
                                : customSlug === savedCustomSlug 
                                  ? <span>Current custom URL</span>
                                  : <span className="text-emerald-500">{customSlug.length}/30 — looks good!</span>
                              }
                            </p>
                            <Button
                              disabled={slugSaving || customSlug === savedCustomSlug || customSlug.length < 3}
                              onClick={async () => {
                                if (!user || !originalSlug) return;
                                setSlugSaving(true);
                                const result = await updateTemplateSlug(originalSlug, customSlug, user.id);
                                if (result) {
                                  setSavedCustomSlug(result.custom_slug);
                                  toast.success('Custom URL saved!');
                                  setIsEditingSlug(false);
                                } else {
                                  toast.error('That URL is taken. Try another.');
                                }
                                setSlugSaving(false);
                              }}
                              className="h-9 bg-[#0071e3] hover:bg-[#0077ed] rounded-xl px-5 text-[12px] font-bold text-white shadow-sm shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-40"
                            >
                              {slugSaving ? <Loader2 size={14} className="animate-spin" /> : savedCustomSlug ? 'Update' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Both links info */}
                {savedCustomSlug && (
                  <p className="text-[10px] text-[#86868b] text-center leading-relaxed">
                    Both links are active — share either one
                  </p>
                )}

                {/* Done button */}
                <button 
                  onClick={() => { setPublishedUrl(null); setIsEditingSlug(false); }}
                  className="w-full py-3 text-[13px] font-semibold text-[#86868b] hover:text-[#ffffff] dark:hover:text-[#f5f5f7] transition-colors active:scale-[0.98] rounded-2xl hover:bg-black dark:hover:bg-white"
                >
                  Done
                </button>
              </div>

              {/* Safe area padding for mobile */}
              <div className="safe-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUTH MODAL */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Sign in to publish your template"
      />
    </div>
  );
};

export default Editor;