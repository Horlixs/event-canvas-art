export type ShapeType = 'rect' | 'circle' | 'polygon' | 'text';

export interface BaseElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  rotation: number;
  isPlaceholder: boolean;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  sides: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: 'normal' | 'italic';
  fontWeight: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  width: number;
}

export type CanvasElement = RectElement | CircleElement | PolygonElement | TextElement;

export interface TemplateData {
  name: string;
  width: number;
  height: number;
  elements: CanvasElement[];
  backgroundColor: string;
  backgroundImage?: string | null;
}

export type EditorMode = 'editor' | 'generator';
