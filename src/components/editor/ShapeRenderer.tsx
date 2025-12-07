import React from 'react';
import { Rect, Circle, RegularPolygon, Text, Group, Line } from 'react-konva';
import { CanvasElement } from '@/types/editor';
import useImage from 'use-image';
import Konva from 'konva';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

interface ShapeRendererProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<CanvasElement>) => void;
  userImage?: string;
  isGeneratorMode?: boolean;
}

const PlaceholderIcon: React.FC<{ x: number; y: number; size: number }> = ({ x, y, size }) => {
  const iconSize = Math.min(size * 0.3, 60);
  const strokeWidth = 2;
  
  return (
    <Group x={x} y={y}>
      {/* Upload arrow icon */}
      <Line
        points={[0, iconSize * 0.3, 0, -iconSize * 0.3]}
        stroke="#9ca3af"
        strokeWidth={strokeWidth}
        lineCap="round"
      />
      <Line
        points={[-iconSize * 0.2, -iconSize * 0.1, 0, -iconSize * 0.3, iconSize * 0.2, -iconSize * 0.1]}
        stroke="#9ca3af"
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
      {/* Base line */}
      <Line
        points={[-iconSize * 0.3, iconSize * 0.4, iconSize * 0.3, iconSize * 0.4]}
        stroke="#9ca3af"
        strokeWidth={strokeWidth}
        lineCap="round"
      />
    </Group>
  );
};

export const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  element,
  isSelected,
  onSelect,
  onChange,
  userImage,
  isGeneratorMode = false,
}) => {
  const [image] = useImage(userImage || '', 'anonymous');

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const commonProps = {
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    draggable: !isGeneratorMode,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: handleDragEnd,
  };



  // Placeholder icons are rendered separately in a different layer to not interfere with transforms
  const showPlaceholderIcon = element.isPlaceholder && !isGeneratorMode;

  switch (element.type) {
    case 'rect': {
      const shouldUseImage = element.isPlaceholder && isGeneratorMode && image;
      
      // Calculate scale to cover the shape
      const scaleX = shouldUseImage ? element.width / image.width : 1;
      const scaleY = shouldUseImage ? element.height / image.height : 1;
      
      // The pattern is drawn from (0,0) of the shape's local coordinates
      // Since we use offset, the shape's local (0,0) is at its center
      // We need to shift the pattern so the image center aligns with shape center
      const patternOffsetX = shouldUseImage ? (image.width * scaleX) / 2 : 0;
      const patternOffsetY = shouldUseImage ? (image.height * scaleY) / 2 : 0;
      
      return (
        <>
          <Rect
            {...commonProps}
            width={element.width}
            height={element.height}
            offsetX={element.width / 2}
            offsetY={element.height / 2}
            cornerRadius={element.cornerRadius}
            fill={shouldUseImage ? undefined : element.fill}
            fillPatternImage={shouldUseImage ? image : undefined}
            fillPatternScaleX={scaleX}
            fillPatternScaleY={scaleY}
            fillPatternOffsetX={patternOffsetX}
            fillPatternOffsetY={patternOffsetY}
            stroke={element.isPlaceholder && !isGeneratorMode ? '#6366f1' : element.stroke}
            strokeWidth={element.isPlaceholder && !isGeneratorMode ? 2 : element.strokeWidth}
            dash={element.isPlaceholder && !isGeneratorMode ? [10, 5] : undefined}
            name="element"
            id={element.id}
          />
          {showPlaceholderIcon && (
            <PlaceholderIcon x={element.x} y={element.y} size={Math.min(element.width, element.height)} />
          )}
        </>
      );
    }

    case 'circle': {
      const shouldUseImage = element.isPlaceholder && isGeneratorMode && image;
      const diameter = element.radius * 2;
      const scaleX = shouldUseImage ? diameter / image.width : 1;
      const scaleY = shouldUseImage ? diameter / image.height : 1;
      
      // Center the pattern within the circle
      const patternOffsetX = shouldUseImage ? (image.width * scaleX) / 2 : 0;
      const patternOffsetY = shouldUseImage ? (image.height * scaleY) / 2 : 0;
      
      return (
        <>
          <Circle
            {...commonProps}
            radius={element.radius}
            fill={shouldUseImage ? undefined : element.fill}
            fillPatternImage={shouldUseImage ? image : undefined}
            fillPatternScaleX={scaleX}
            fillPatternScaleY={scaleY}
            fillPatternOffsetX={patternOffsetX}
            fillPatternOffsetY={patternOffsetY}
            stroke={element.isPlaceholder && !isGeneratorMode ? '#6366f1' : element.stroke}
            strokeWidth={element.isPlaceholder && !isGeneratorMode ? 2 : element.strokeWidth}
            dash={element.isPlaceholder && !isGeneratorMode ? [10, 5] : undefined}
            name="element"
            id={element.id}
          />
          {showPlaceholderIcon && (
            <PlaceholderIcon x={element.x} y={element.y} size={diameter} />
          )}
        </>
      );
    }

    case 'polygon': {
      const shouldUseImage = element.isPlaceholder && isGeneratorMode && image;
      const diameter = element.radius * 2;
      const scaleX = shouldUseImage ? diameter / image.width : 1;
      const scaleY = shouldUseImage ? diameter / image.height : 1;
      
      // Center the pattern within the polygon
      const patternOffsetX = shouldUseImage ? (image.width * scaleX) / 2 : 0;
      const patternOffsetY = shouldUseImage ? (image.height * scaleY) / 2 : 0;
      
      return (
        <>
          <RegularPolygon
            {...commonProps}
            sides={element.sides}
            radius={element.radius}
            fill={shouldUseImage ? undefined : element.fill}
            fillPatternImage={shouldUseImage ? image : undefined}
            fillPatternScaleX={scaleX}
            fillPatternScaleY={scaleY}
            fillPatternOffsetX={patternOffsetX}
            fillPatternOffsetY={patternOffsetY}
            stroke={element.isPlaceholder && !isGeneratorMode ? '#6366f1' : element.stroke}
            strokeWidth={element.isPlaceholder && !isGeneratorMode ? 2 : element.strokeWidth}
            dash={element.isPlaceholder && !isGeneratorMode ? [10, 5] : undefined}
            name="element"
            id={element.id}
          />
          {showPlaceholderIcon && (
            <PlaceholderIcon x={element.x} y={element.y} size={diameter} />
          )}
        </>
      );
    }

    case 'text': {
      // Konva uses combined fontStyle string: "italic bold" or just "bold" or "italic" or "normal"
      const fontStyleStr = element.fontStyle === 'italic' ? 'italic' : '';
      const fontWeightStr = element.fontWeight >= 700 ? 'bold' : element.fontWeight <= 300 ? '300' : '';
      const combinedStyle = [fontStyleStr, fontWeightStr].filter(Boolean).join(' ') || 'normal';
      
      return (
        <Text
          {...commonProps}
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={combinedStyle}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          width={element.width}
          wrap="word"
          name="element"
          id={element.id}
        />
      );
    }

    default:
      return null;
  }
};
