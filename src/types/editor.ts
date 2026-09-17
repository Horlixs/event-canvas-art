// src/types/editor.ts

export type ShapeType = 'rect' | 'circle' | 'polygon' | 'text' | 'image';
export type StrokePosition = 'inside' | 'center' | 'outside';

export interface StrokeLayer {
  color: string;
  width: number;
  position: StrokePosition;
}

export interface BaseElement {
  id: string;
  name?: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  opacity?: number;
  isPlaceholder: boolean;
  stroke?: string;
  strokeWidth?: number;
  strokePosition?: StrokePosition; // 'inside' | 'center' | 'outside'
  strokes?: StrokeLayer[];
  
  // Image placeholder data
  placeholderImage?: string; 
  imageOffsetX?: number; 
  imageOffsetY?: number;
  imageScale?: number; 
}

export interface ImageElement extends BaseElement {
  type: "image";
  width: number;
  height: number;
  src: string;
}

export interface CornerRadii {
  tl: number; // top-left
  tr: number; // top-right
  br: number; // bottom-right
  bl: number; // bottom-left
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius: number;         // uniform – used when cornerRadii is absent
  cornerRadii?: CornerRadii;    // per-corner override; takes precedence over cornerRadius
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
  fontWeight: string | number; // e.g., '400', '700', 'bold'
  textDecoration?: 'none' | 'underline' | 'line-through' | 'underline line-through';
  textAlign: 'left' | 'center' | 'right';
  fill: string;
  width: number;
}

// 1. MUST DEFINE THIS UNION TYPE
export type CanvasElement = 
  | RectElement 
  | CircleElement 
  | PolygonElement 
  | TextElement 
  | ImageElement;

export interface TemplateData {
  id: string;
  slug: string;
  custom_slug?: string | null;
  name: string;
  isPrivate?: boolean;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  registrationLink?: string;
  eventName?: string;
  // 2. USE THE UNION TYPE HERE (Not HTMLCanvasElement)
  elements: CanvasElement[]; 
  thumbnail?: string;
}