// src/hooks/useCanvas.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { CanvasElement, ShapeType } from '@/types/editor';

const generateId = () => Math.random().toString(36).substring(2, 11);

const STORAGE_KEY = 'canvas_editor_state';
const MAX_HISTORY = 50;

interface CanvasState {
  elements: CanvasElement[];
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  backgroundImage: string | null;
  templateName: string;
  registrationLink: string;
  eventName: string;
}

function loadSavedState(): CanvasState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.elements)) return parsed as CanvasState;
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveState(state: CanvasState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota exceeded — silently fail */ }
}

export const useCanvas = () => {
  const saved = useRef(loadSavedState());
  const initial = saved.current;

  const [elements, setElements] = useState<CanvasElement[]>(initial?.elements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState(initial?.canvasSize ?? { width: 1080, height: 1080 });
  const [backgroundColor, setBackgroundColor] = useState(initial?.backgroundColor ?? '#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initial?.backgroundImage ?? null);
  const [templateName, setTemplateName] = useState(initial?.templateName ?? 'Untitled Template');
  const [registrationLink, setRegistrationLink] = useState(initial?.registrationLink ?? '');
  const [eventName, setEventName] = useState(initial?.eventName ?? '');

  // ── Undo / Redo ──────────────────────────────────────────────────────
  const historyRef = useRef<CanvasElement[][]>([initial?.elements ?? []]);
  const historyIndexRef = useRef(0);
  const skipRecordRef = useRef(false);

  // Record a snapshot whenever elements change (unless it's from undo/redo)
  useEffect(() => {
    if (skipRecordRef.current) {
      skipRecordRef.current = false;
      return;
    }
    const history = historyRef.current;
    const idx = historyIndexRef.current;

    // If we're not at the end, discard future states
    if (idx < history.length - 1) {
      historyRef.current = history.slice(0, idx + 1);
    }

    // Avoid duplicate snapshots
    const last = historyRef.current[historyRef.current.length - 1];
    if (last === elements) return;

    historyRef.current.push(elements);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, [elements]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    skipRecordRef.current = true;
    setElements(historyRef.current[historyIndexRef.current]);
    setSelectedId(null);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    skipRecordRef.current = true;
    setElements(historyRef.current[historyIndexRef.current]);
    setSelectedId(null);
  }, []);

  // ── Auto-save to localStorage (debounced) ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      saveState({ elements, canvasSize, backgroundColor, backgroundImage, templateName, registrationLink, eventName });
    }, 500);
    return () => clearTimeout(timer);
  }, [elements, canvasSize, backgroundColor, backgroundImage, templateName, registrationLink, eventName]);

  const addElement = useCallback((type: ShapeType) => {
    const baseProps = {
      id: generateId(),
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      rotation: 0,
      isPlaceholder: false,
    };

    let newElement: CanvasElement;

    switch (type) {
      case 'rect':
        newElement = {
          ...baseProps,
          type: 'rect',
          width: 200,
          height: 200,
          cornerRadius: 0,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 0,
        };
        break;
      case 'circle':
        newElement = {
          ...baseProps,
          type: 'circle',
          radius: 100,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 0,
        };
        break;
      case 'polygon':
        newElement = {
          ...baseProps,
          type: 'polygon',
          sides: 6,
          radius: 100,
          fill: '#e5e7eb',
          stroke: '#9ca3af',
          strokeWidth: 0,
        };
        break;
      case 'text':
        newElement = {
          ...baseProps,
          type: 'text',
          text: 'Your Text Here',
          fontSize: 48,
          fontFamily: 'Inter',
          fontStyle: 'normal',
          fontWeight: 400,
          textAlign: 'center',
          fill: '#1f2937',
          stroke: '',
          strokeWidth: 0,
          width: 300,
        } as CanvasElement;
        break;
      default:
        return;
    }

    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  }, [canvasSize]);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } as CanvasElement : el))
    );
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const duplicateElement = useCallback((id: string) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    const newElement: CanvasElement = {
      ...element,
      id: generateId(),
      x: element.x + 20,
      y: element.y + 20,
    } as CanvasElement;

    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  }, [elements]);

  const moveElement = useCallback((id: string, direction: 'up' | 'down') => {
    setElements((prev) => {
      const index = prev.findIndex((el) => el.id === id);
      if (index === -1) return prev;

      const newElements = [...prev];
      const targetIndex = direction === 'up' ? index + 1 : index - 1;

      if (targetIndex < 0 || targetIndex >= newElements.length) return prev;

      [newElements[index], newElements[targetIndex]] = [newElements[targetIndex], newElements[index]];
      return newElements;
    });
  }, []);

  const getSelectedElement = useCallback(() => elements.find((el) => el.id === selectedId) || null, [elements, selectedId]);

  const clearSelection = useCallback(() => setSelectedId(null), []);

  const exportTemplate = useCallback(() => ({
    name: templateName,
    width: canvasSize.width,
    height: canvasSize.height,
    elements,
    backgroundColor,
    backgroundImage,
    registrationLink: registrationLink || undefined,
    eventName: eventName || undefined,
  }), [elements, canvasSize, backgroundColor, backgroundImage, templateName, registrationLink, eventName]);

  const importTemplate = useCallback((template: { elements: CanvasElement[]; backgroundColor?: string; backgroundImage?: string | null; width?: number; height?: number; name?: string; registrationLink?: string; eventName?: string }) => {
    setElements(template.elements);
    if (template.backgroundColor) setBackgroundColor(template.backgroundColor);
    if (template.backgroundImage !== undefined) setBackgroundImage(template.backgroundImage);
    if (template.width && template.height) setCanvasSize({ width: template.width, height: template.height });
    if (template.name) setTemplateName(template.name);
    if (template.registrationLink !== undefined) setRegistrationLink(template.registrationLink || '');
    if (template.eventName !== undefined) setEventName(template.eventName || '');
    setSelectedId(null);
  }, []);

  const clearSavedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    elements,
    selectedId,
    setSelectedId,
    canvasSize,
    setCanvasSize,
    backgroundColor,
    setBackgroundColor,
    backgroundImage,
    setBackgroundImage,
    templateName,
    setTemplateName,
    registrationLink,
    setRegistrationLink,
    eventName,
    setEventName,
    addElement,
    updateElement,
    deleteElement,
    duplicateElement,
    moveElement,
    getSelectedElement,
    clearSelection,
    exportTemplate,
    importTemplate,
    undo,
    redo,
    canUndo,
    canRedo,
    clearSavedState,
  };
};