import React, { useRef, useCallback } from 'react';
import Konva from 'konva';
import { useCanvas } from '@/hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { FloatingToolbar } from './FloatingToolbar';
import { PropertiesPanel } from './PropertiesPanel';
import { toast } from 'sonner';

export const Editor: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    elements,
    selectedId,
    setSelectedId,
    canvasSize,
    backgroundColor,
    setBackgroundColor,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElement,
    getSelectedElement,
    clearSelection,
    exportTemplate,
    importTemplate,
  } = useCanvas();

  const selectedElement = getSelectedElement();

  const handleExportPNG = useCallback(() => {
    if (!stageRef.current) return;

    // Deselect to hide transformer
    clearSelection();

    setTimeout(() => {
      const uri = stageRef.current?.toDataURL({ pixelRatio: 2 });
      if (uri) {
        const link = document.createElement('a');
        link.download = 'event-dp.png';
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Image exported successfully!');
      }
    }, 100);
  }, [clearSelection]);

  const handleSaveTemplate = useCallback(() => {
    const template = exportTemplate();
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'template.json';
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template saved!');
  }, [exportTemplate]);

  const handleImportTemplate = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const template = JSON.parse(event.target?.result as string);
        importTemplate(template);
        toast.success('Template imported!');
      } catch {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importTemplate]);

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

        {/* Background Color Picker */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Background</span>
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

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
        <FloatingToolbar
          onAddElement={addElement}
          onExport={handleExportPNG}
          onSave={handleSaveTemplate}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onMoveUp={() => selectedId && moveElement(selectedId, 'up')}
          onMoveDown={() => selectedId && moveElement(selectedId, 'down')}
          hasSelection={!!selectedId}
          onImport={handleImportTemplate}
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
