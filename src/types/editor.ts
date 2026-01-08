export type ShapeType = 'rect' | 'circle' | 'polygon' | 'text' | 'image';
export type StrokePosition = 'inside' | 'center' | 'outside';

export interface StrokeLayer {
  color: string;
  width: number;
  position: StrokePosition;
}

export interface BaseElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  isPlaceholder: boolean;
  strokes?: StrokeLayer[]; // works for all shapes
  // Image placeholder data
  placeholderImage?: string; // Base64 or URL of uploaded image
  imageOffsetX?: number; // Image position within shape
  imageOffsetY?: number;
  imageScale?: number; // Image zoom within shape (default: 1)
}

export interface ImageElement extends BaseElement {
  type: "image";
  width: number;
  height: number;
  src: string;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius: number;
  fill: string;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill: string;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  sides: number;
  radius: number;
  fill: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: 'normal' | 'italic';
  fontWeight: number;
  fill: string;
  width: number;
}

export type CanvasElement =
  | RectElement
  | CircleElement
  | PolygonElement
  | TextElement
  | ImageElement; // ← FIXED