import React, { useRef, useCallback, useState } from 'react';
import Konva from 'konva';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';
import { ImagePlus, X, Link as LinkIcon, Copy } from 'lucide-react';
import { publishTemplate } from '@/lib/templates';
import { motion, AnimatePresence } from 'framer-motion';

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

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

  const handlePublish = useCallback(async () => {
    if (elements.length === 0) {
      toast.error('Add some elements before publishing');
      return;
    }

    setIsPublishing(true);
    try {
      const template = exportTemplate();
      const result = await publishTemplate(template);
      
      if (result) {
        const url = `${window.location.origin}/dp/${result.slug}`;
        setPublishedUrl(url);
        toast.success('Template published! Share the link with users.');
      } else {
        toast.error('Failed to publish template');
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Failed to publish template');
    } finally {
      setIsPublishing(false);
    }
  }, [elements, exportTemplate]);

  const handleCopyUrl = useCallback(() => {
    if (publishedUrl) {
      navigator.clipboard.writeText(publishedUrl);
      toast.success('Link copied to clipboard!');
    }
  }, [publishedUrl]);

  const handleBackgroundImageUpload = useCallback(() => {
    bgImageInputRef.current?.click();
  }, []);

  const handleBackgroundImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string);
      toast.success('Background image added!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [setBackgroundImage]);

  const handleRemoveBackgroundImage = useCallback(() => {
    setBackgroundImage(null);
    toast.success('Background image removed');
  }, [setBackgroundImage]);

  const handleDelete = useCallback(() => {
    if (selectedId) {
      deleteElement(selectedId);
      toast.success('Element deleted');
    }
  }, [selectedId, deleteElement]);

  const handleDuplicate = useCallback(() => {
    if (selectedId) {
      duplicateElement(selectedId);
      toast.success('Element duplicated');
    }
  }, [selectedId, duplicateElement]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          handleDelete();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedId) {
          handleDuplicate();
        }
      }
      if (e.key === 'Escape') {
        clearSelection();
        setPublishedUrl(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDelete, handleDuplicate, clearSelection]);

  return (
    <div className="h-screen flex flex-col bg-canvas-bg overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DP</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Event DP Generator</h1>
            <p className="text-xs text-muted-foreground">Template Editor</p>
          </div>
        </div>

        {/* Background Controls */}
        <div className="ml-auto flex items-center gap-4">
          {/* Background Color */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color</span>
            <div
              className="w-8 h-8 rounded-lg border border-border cursor-pointer overflow-hidden shadow-subtle"
              style={{ backgroundColor }}
            >
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Background Image */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Image</span>
            {backgroundImage ? (
              <div className="flex items-center gap-1">
                <div 
                  className="w-8 h-8 rounded-lg border border-border overflow-hidden shadow-subtle bg-cover bg-center"
                  style={{ backgroundImage: `url(${backgroundImage})` }}
                />
                <button
                  onClick={handleRemoveBackgroundImage}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleBackgroundImageUpload}
                className="w-8 h-8 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Canvas */}
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

        {/* Properties Panel */}
        <PropertiesPanel
          element={selectedElement}
          onUpdate={(updates) => {
            if (selectedId) {
              updateElement(selectedId, updates);
            }
          }}
          onClose={clearSelection}
        />
      </div>

      {/* Published URL Modal */}
      <AnimatePresence>
        {publishedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setPublishedUrl(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-background border border-border rounded-2xl p-6 shadow-elevated max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">Template Published!</h2>
                  <p className="text-sm text-muted-foreground">Share this link with users</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl border border-border">
                <input
                  type="text"
                  value={publishedUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                />
                <button
                  onClick={handleCopyUrl}
                  className="p-2 rounded-lg hover:bg-background transition-colors"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                Users can visit this link to upload their photo and download the DP.
              </p>

              <button
                onClick={() => setPublishedUrl(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
        <FloatingToolbar
          onAddElement={addElement}
          onPublish={handlePublish}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onMoveUp={() => selectedId && moveElement(selectedId, 'up')}
          onMoveDown={() => selectedId && moveElement(selectedId, 'down')}
          hasSelection={!!selectedId}
          isPublishing={isPublishing}
        />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={bgImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackgroundImageChange}
        className="hidden"
      />
    </div>
  );
};
