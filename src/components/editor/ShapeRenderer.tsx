import React, { useRef, useEffect } from 'react';
import { Group, Rect, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { CanvasElement } from '@/types/editor';
import useImage from 'use-image';

interface ShapeRendererProps {
  element: CanvasElement;
  isSelected?: boolean;
  onSelect?: () => void;
  onChange?: (updates: Partial<CanvasElement>) => void;
  userImage?: string;
  isGeneratorMode?: boolean;
}

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  userImage,
  isGeneratorMode = false,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  
  // Use placeholderImage if available, otherwise fall back to userImage (for generator mode)
  const imageSrc = element.placeholderImage || userImage || '';
  const [image] = useImage(imageSrc, 'anonymous');
  
  const hasImage = !!image && (element.isPlaceholder || !!userImage);
  const imageOffsetX = element.imageOffsetX || 0;
  const imageOffsetY = element.imageOffsetY || 0;
  const imageScale = element.imageScale || 1;

  // Handle image drag within shape
  const handleImageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (!onChange || !imageRef.current) return;
    
    const node = imageRef.current;
    const newOffsetX = node.x();
    const newOffsetY = node.y();
    
    onChange({
      imageOffsetX: newOffsetX,
      imageOffsetY: newOffsetY,
    });
  };

  // Handle image wheel zoom
  const handleImageWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!onChange || !imageRef.current) return;
    e.evt.preventDefault();
    
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, imageScale * delta));
    
    onChange({ imageScale: newScale });
  };

  // Create clipping function based on shape type
  const createClipFunc = (ctx: Konva.Context) => {
    switch (element.type) {
      case 'rect': {
        const rectEl = element as any;
        const cornerRadius = rectEl.cornerRadius || 0;
        const width = rectEl.width;
        const height = rectEl.height;
        
        ctx.beginPath();
        if (cornerRadius > 0) {
          ctx.roundRect(-width / 2, -height / 2, width, height, cornerRadius);
        } else {
          ctx.rect(-width / 2, -height / 2, width, height);
        }
        ctx.clip();
        break;
      }
      case 'circle': {
        const circleEl = element as any;
        const radius = circleEl.radius || 0;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();
        break;
      }
      case 'polygon': {
        const polyEl = element as any;
        const sides = polyEl.sides || 3;
        const radius = polyEl.radius || 0;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.clip();
        break;
      }
    }
  };

  // Render strokes (behind the shape)
  const renderStrokes = () => {
    if (!element.strokes || element.strokes.length === 0) return null;

    return element.strokes.map((s, i) => {
      switch (element.type) {
        case 'rect': {
          const rectEl = element as any;
          return (
            <Rect
              key={`stroke-${i}`}
              x={-rectEl.width / 2 - s.width / 2}
              y={-rectEl.height / 2 - s.width / 2}
              width={rectEl.width + s.width}
              height={rectEl.height + s.width}
              fill={s.color}
              listening={false}
            />
          );
        }
        case 'circle': {
          const circleEl = element as any;
          return (
            <Circle
              key={`stroke-${i}`}
              x={0}
              y={0}
              radius={(circleEl.radius || 0) + s.width / 2}
              fill={s.color}
              listening={false}
            />
          );
        }
        case 'polygon': {
          const polyEl = element as any;
          const sides = polyEl.sides || 3;
          const radius = (polyEl.radius || 0) + s.width / 2;
          const points = Array.from({ length: sides }, (_, idx) => {
            const angle = (Math.PI * 2 * idx) / sides - Math.PI / 2;
            return [
              radius * Math.cos(angle),
              radius * Math.sin(angle),
            ];
          }).flat();
          return (
            <Line
              key={`stroke-${i}`}
              points={points}
              closed
              fill={s.color}
              listening={false}
            />
          );
        }
        default:
          return null;
      }
    });
  };

  // Render the main shape container
  const renderShape = () => {
    switch (element.type) {
      case 'rect': {
        const rectEl = element as any;
        return (
          <Rect
            x={-rectEl.width / 2}
            y={-rectEl.height / 2}
            width={rectEl.width}
            height={rectEl.height}
            cornerRadius={rectEl.cornerRadius || 0}
            fill={hasImage ? 'transparent' : rectEl.fill}
            stroke={rectEl.stroke}
            strokeWidth={rectEl.strokeWidth || 0}
            listening={!isGeneratorMode}
            onClick={onSelect}
            onTap={onSelect}
          />
        );
      }
      case 'circle': {
        const circleEl = element as any;
        return (
          <Circle
            x={0}
            y={0}
            radius={circleEl.radius}
            fill={hasImage ? 'transparent' : circleEl.fill}
            stroke={circleEl.stroke}
            strokeWidth={circleEl.strokeWidth || 0}
            listening={!isGeneratorMode}
            onClick={onSelect}
            onTap={onSelect}
          />
        );
      }
      case 'polygon': {
        const polyEl = element as any;
        const sides = polyEl.sides || 3;
        const radius = polyEl.radius || 0;
        const points = Array.from({ length: sides }, (_, i) => {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          return [
            radius * Math.cos(angle),
            radius * Math.sin(angle),
          ];
        }).flat();
        return (
          <Line
            points={points}
            closed
            fill={hasImage ? 'transparent' : polyEl.fill}
            stroke={polyEl.stroke}
            strokeWidth={polyEl.strokeWidth || 0}
            listening={!isGeneratorMode}
            onClick={onSelect}
            onTap={onSelect}
          />
        );
      }
      case 'text': {
        const textEl = element as any;
        return (
          <Text
            x={-textEl.width / 2}
            y={-textEl.fontSize / 2}
            text={textEl.text}
            fontSize={textEl.fontSize}
            fontFamily={textEl.fontFamily}
            fontStyle={textEl.fontStyle}
            fontWeight={textEl.fontWeight}
            fill={textEl.fill}
            width={textEl.width}
            align="center"
            verticalAlign="middle"
            listening={!isGeneratorMode}
            onClick={onSelect}
            onTap={onSelect}
          />
        );
      }
      default:
        return null;
    }
  };

  // Render image inside shape (only for placeholders with images)
  const renderImage = () => {
    if (!hasImage || !image) return null;

    // Calculate image dimensions to fill shape
    let imageWidth = 0;
    let imageHeight = 0;
    
    switch (element.type) {
      case 'rect': {
        const rectEl = element as any;
        imageWidth = rectEl.width;
        imageHeight = rectEl.height;
        break;
      }
      case 'circle': {
        const circleEl = element as any;
        const diameter = (circleEl.radius || 0) * 2;
        imageWidth = diameter;
        imageHeight = diameter;
        break;
      }
      case 'polygon': {
        const polyEl = element as any;
        const diameter = (polyEl.radius || 0) * 2;
        imageWidth = diameter;
        imageHeight = diameter;
        break;
      }
      default:
        return null;
    }

    return (
      <KonvaImage
        ref={imageRef}
        image={image}
        x={imageOffsetX}
        y={imageOffsetY}
        width={imageWidth * imageScale}
        height={imageHeight * imageScale}
        draggable={!isGeneratorMode && isSelected}
        onDragEnd={handleImageDragEnd}
        onWheel={handleImageWheel}
        listening={!isGeneratorMode && isSelected}
      />
    );
  };

  // For text elements, render directly without grouping
  if (element.type === 'text') {
    return (
      <Group
        ref={groupRef}
        id={element.id}
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        draggable={!isGeneratorMode}
        onClick={onSelect}
        onTap={onSelect}
      >
        {renderStrokes()}
        {renderShape()}
      </Group>
    );
  }

  // Calculate bounding box for the shape (for Transformer)
  const getBoundingBox = () => {
    switch (element.type) {
      case 'rect': {
        const rectEl = element as any;
        return {
          width: rectEl.width,
          height: rectEl.height,
          x: -rectEl.width / 2,
          y: -rectEl.height / 2,
        };
      }
      case 'circle': {
        const circleEl = element as any;
        const diameter = (circleEl.radius || 0) * 2;
        return {
          width: diameter,
          height: diameter,
          x: -diameter / 2,
          y: -diameter / 2,
        };
      }
      case 'polygon': {
        const polyEl = element as any;
        const diameter = (polyEl.radius || 0) * 2;
        return {
          width: diameter,
          height: diameter,
          x: -diameter / 2,
          y: -diameter / 2,
        };
      }
      default:
        return { width: 100, height: 100, x: -50, y: -50 };
    }
  };

  const bbox = getBoundingBox();

  // For shape elements with image placeholders, use clipping
  return (
    <Group
      ref={groupRef}
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={!isGeneratorMode}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Invisible rect for Transformer to use for sizing - must be first child */}
      <Rect
        name="transformer-target"
        x={bbox.x}
        y={bbox.y}
        width={bbox.width}
        height={bbox.height}
        fill="transparent"
        listening={false}
        perfectDrawEnabled={false}
        hitStrokeWidth={0}
      />
      
      {/* Strokes rendered behind */}
      {renderStrokes()}
      
      {/* Clipped group for image + shape */}
      <Group clipFunc={createClipFunc}>
        {/* Image inside (if present) */}
        {renderImage()}
        
        {/* Shape container (transparent if has image) */}
        {renderShape()}
      </Group>
      
      {/* Placeholder indicator when no image */}
      {element.isPlaceholder && !hasImage && (
        <Group opacity={0.4}>
          <Rect
            x={bbox.x}
            y={bbox.y}
            width={bbox.width}
            height={bbox.height}
            fill="#f3f4f6"
            stroke="#9ca3af"
            strokeWidth={2}
            dash={[8, 4]}
            listening={false}
          />
          <Text
            x={0}
            y={0}
            text="📷 Click to upload"
            fontSize={14}
            fontFamily="Inter"
            fill="#6b7280"
            align="center"
            verticalAlign="middle"
            offsetX={50}
            offsetY={7}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
};
