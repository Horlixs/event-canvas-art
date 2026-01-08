// src/hooks/useCanvas.ts
import { useState, useCallback, useEffect } from 'react';
import { CanvasElement, ShapeType } from '@/types/editor';

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useCanvas = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1080, height: 1080 }); // <-- expose setter
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // --- Auto adjust canvas size when backgroundImage changes (optional) ---
  useEffect(() => {
    if (!backgroundImage) return;
    // You can keep this effect or rely on caller to set size.
    const img = new Image();
    img.src = backgroundImage;
    img.onload = () => {
      // If the image is different size than canvas, update canvas size optionally:
      // setCanvasSize({ width: img.width, height: img.height });
      // I leave commented: Editor now explicitly calls setCanvasSize on upload.
    };
  }, [backgroundImage]);

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
          text: 'Your Text Here', // use `text` field (matches Editor expectations below)
          fontSize: 48,
          fontFamily: 'Inter',
          fontStyle: 'normal',
          fontWeight: 400,
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
    name: 'Untitled Template',
    width: canvasSize.width,
    height: canvasSize.height,
    elements,
    backgroundColor,
    backgroundImage,
  }), [elements, canvasSize, backgroundColor, backgroundImage]);

  const importTemplate = useCallback((template: { elements: CanvasElement[]; backgroundColor?: string; backgroundImage?: string | null }) => {
    setElements(template.elements);
    if (template.backgroundColor) setBackgroundColor(template.backgroundColor);
    if (template.backgroundImage !== undefined) setBackgroundImage(template.backgroundImage);
    setSelectedId(null);
  }, []);

  return {
    elements,
    selectedId,
    setSelectedId,
    canvasSize,
    setCanvasSize, // <-- expose setter so Editor can change canvas size on BG upload
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
    importTemplate,
  };
};