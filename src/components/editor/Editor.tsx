import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import Konva from 'konva';
import { Link } from 'react-router-dom';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { 
  ImagePlus, Layers, Settings, ZoomIn, ZoomOut, 
  Grid, Eye, Download, Check, Undo, Redo, Maximize, 
  Trash2, ChevronLeft, Share2, MousePointer2
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

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('properties');
  const [showGrid, setShowGrid] = useState(true);
  const [isPreview, setIsPreview] = useState(false);

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
    const padding = 120;
    const { clientWidth, clientHeight } = viewportRef.current;
    const newZoom = Math.min((clientWidth - padding) / canvasSize.width, (clientHeight - padding) / canvasSize.height, 1);
    setCamera({ 
      x: (clientWidth - (canvasSize.width * newZoom)) / 2, 
      y: (clientHeight - (canvasSize.height * newZoom)) / 2, 
      z: newZoom 
    });
  }, [canvasSize]);

  useEffect(() => { setTimeout(fitToScreen, 100); }, [fitToScreen]);

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

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) return toast.error('Canvas is empty.');
    setIsPublishing(true);
    try {
      const result = await publishTemplate({
        id: crypto.randomUUID(),
        slug: `dp-${Math.random().toString(36).substring(7)}`,
        ...exportTemplate()
      });
      if (result) {
        setPublishedUrl(`${window.location.origin}/dp/${result.slug}`);
        toast.success('Campaign live!');
      }
    } catch { toast.error('Publish failed.'); } 
    finally { setIsPublishing(false); }
  }, [elements, exportTemplate]);

  return (
    <div className="h-screen flex flex-col bg-[#fbfbfb] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-blue-500/30 font-sans tracking-tight overflow-hidden transition-colors duration-500">
      
      {/* 1. TOP NAVIGATION BAR */}
      <header className="h-12 px-4 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between z-[100]">
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:opacity-60 transition-opacity">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Creative Suite</h1>
            <span className="text-[12px] font-semibold leading-tight">Untitled_Campaign_01</span>
          </div>
          <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08]" />
          <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><Undo size={14}/></Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md"><Redo size={14}/></Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/[0.03] dark:bg-white/[0.03] rounded-full p-0.5">
            <Button 
              variant="ghost" 
              className={cn("h-7 rounded-full text-[11px] px-3 gap-2", !isPreview && "bg-white dark:bg-[#2c2c2e] shadow-sm")}
              onClick={() => setIsPreview(false)}
            >
              <MousePointer2 size={12} /> Design
            </Button>
            <Button 
              variant="ghost" 
              className={cn("h-7 rounded-full text-[11px] px-3 gap-2", isPreview && "bg-white dark:bg-[#2c2c2e] shadow-sm")}
              onClick={() => setIsPreview(true)}
            >
              <Eye size={12} /> Preview
            </Button>
          </div>
          <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08]" />
          <Button 
            onClick={handlePublish} 
            disabled={isPublishing} 
            className="h-8 bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] px-4 rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 2. INFINITE WORKSPACE */}
        <div 
          ref={viewportRef}
          className="flex-1 relative bg-[#efeff4] dark:bg-[#080808] overflow-hidden"
          style={{ cursor: isSpacePressed ? 'grabbing' : 'default' }}
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
        >
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.1]" 
                 style={{ backgroundImage: `radial-gradient(#000 0.5px, transparent 0.5px)`, backgroundSize: '32px 32px' }} />
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
              className="relative shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)]"
              style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor }}
            >
              {backgroundImage && <img src={backgroundImage} className="absolute inset-0 w-full h-full object-cover pointer-events-none" alt="bg" />}
              <CanvasStage
                elements={elements} selectedId={selectedId} onSelect={setSelectedId}
                onUpdate={updateElement} canvasSize={canvasSize} backgroundColor={backgroundColor}
                backgroundImage={backgroundImage} stageRef={stageRef}
              />
            </div>
          </div>

          {/* 3. FLOATING HUD TOOLS */}
          <div className="absolute bottom-6 left-6 flex items-center gap-1 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl border border-black/[0.05] dark:border-white/[0.05] p-1.5 rounded-full shadow-2xl z-50">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCamera({...camera, z: camera.z - 0.1})}><ZoomOut size={14} /></Button>
            <span className="text-[10px] font-bold w-12 text-center opacity-60 tabular-nums">{Math.round(camera.z * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCamera({...camera, z: camera.z + 0.1})}><ZoomIn size={14} /></Button>
            <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08] mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={fitToScreen}><Maximize size={14} /></Button>
            <div className="w-px h-4 bg-black/[0.08] dark:bg-white/[0.08] mx-1" />
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-full", showGrid && "text-blue-500")} onClick={() => setShowGrid(!showGrid)}><Grid size={14} /></Button>
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
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

        {/* 4. PROFESSIONAL SIDEBAR */}
        <div className="w-[300px] bg-white dark:bg-[#111] border-l border-black/[0.05] dark:border-white/[0.05] flex flex-col z-[60]">
          <div className="flex p-1 bg-black/[0.03] dark:bg-white/[0.03] m-3 rounded-lg">
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

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === 'properties' ? (
              !selectedId ? (
                <div className="space-y-10 px-2 py-4">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Artboard Properties</h3>
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-[10px] opacity-40 font-semibold uppercase tracking-wider">Width</span>
                            <div className="bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-lg text-xs font-mono">{canvasSize.width}px</div>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[10px] opacity-40 font-semibold uppercase tracking-wider">Height</span>
                            <div className="bg-black/[0.03] dark:bg-white/[0.03] px-3 py-2 rounded-lg text-xs font-mono">{canvasSize.height}px</div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <span className="text-[10px] opacity-40 font-semibold uppercase tracking-wider">Background Fill</span>
                          <div className="grid grid-cols-6 gap-2">
                            {['#ffffff', '#000000', '#f4f4f4', '#0071e3', '#32d74b', '#ff453a'].map(c => (
                              <button key={c} onClick={() => setBackgroundColor(c)} className="w-full aspect-square rounded-full border border-black/[0.05] dark:border-white/[0.1] transition-transform hover:scale-110 active:scale-90" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Media Assets</h3>
                    <div 
                      onClick={() => bgImageInputRef.current?.click()} 
                      className="group h-32 rounded-2xl border-2 border-dashed border-black/[0.05] dark:border-white/[0.05] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all"
                    >
                      <ImagePlus size={20} className="opacity-20 group-hover:opacity-100 group-hover:text-blue-500 transition-all" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Upload Base Frame</span>
                    </div>
                  </div>
                </div>
              ) : (
                <PropertiesPanel element={selectedElement!} onUpdate={(updates) => updateElement(selectedId, updates)} onClose={clearSelection} />
              )
            ) : (
              <div className="space-y-1 px-2">
                {reversedElements.map((el) => (
                  <div 
                    key={el.id} 
                    onClick={() => setSelectedId(el.id)}
                    className={cn("group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer", 
                    selectedId === el.id ? "bg-blue-500/[0.06] border-blue-500/20 shadow-sm" : "border-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]")}
                  >
                    <div className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-[10px] font-bold opacity-60">
                       {el.type.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-semibold flex-1 truncate">{el.type === 'text' ? (el as any).text : el.type}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

      {/* 5. PUBLISH SUCCESS MODAL */}
      <AnimatePresence>
        {publishedUrl && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={() => setPublishedUrl(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1c1c1e] p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full mx-4 border border-black/5 dark:border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-[#0071e3] text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
                  <Check size={40} strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Campaign Live</h2>
                  <p className="text-[#86868b] text-[13px] mt-2">Share this link with your community.</p>
                </div>
                <div className="flex bg-black/[0.03] dark:bg-white/[0.05] p-1.5 rounded-2xl items-center gap-2 border border-black/[0.05] dark:border-white/[0.05]">
                  <input value={publishedUrl} readOnly className="bg-transparent flex-1 px-4 text-[12px] font-medium outline-none truncate" />
                  <Button onClick={() => { navigator.clipboard.writeText(publishedUrl); toast.success("Copied to clipboard"); }} className="bg-blue-500 hover:bg-blue-600 rounded-xl h-9 px-4 text-[11px] font-bold">
                    Copy
                  </Button>
                </div>
                <Button variant="ghost" className="w-full text-[#86868b] text-[12px] font-semibold" onClick={() => setPublishedUrl(null)}>Close Window</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Editor;