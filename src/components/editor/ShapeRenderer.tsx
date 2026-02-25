import React, { useRef } from 'react';
import { Group, Rect, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

export const ShapeRenderer: React.FC<any> = ({
  element, isSelected, onSelect, onChange, userImage, isGeneratorMode = false,
}) => {
  const imageSrc = element.placeholderImage || userImage || '';
  const [image] = useImage(imageSrc, 'anonymous');
  const hasImage = !!image && (element.isPlaceholder || !!userImage);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={!isGeneratorMode}
      onClick={onSelect}
      opacity={element.opacity ?? 1}
    >
      {/* 1. Industrial Placeholder HUD (Visual when empty) */}
      {element.isPlaceholder && !hasImage && (
        <Group opacity={0.15}>
          <Rect
            width={element.width || element.radius * 2}
            height={element.height || element.radius * 2}
            offsetX={(element.width || element.radius * 2) / 2}
            offsetY={(element.height || element.radius * 2) / 2}
            fill="#fff"
            stroke="#fff"
            strokeWidth={1}
            dash={[4, 4]}
          />
        </Group>
      )}

      {/* 2. Shape Logic with Perfect-Draw Anti-Aliasing */}
      {element.type === 'rect' && (
        <Rect
          width={element.width}
          height={element.height}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          fill={hasImage ? 'transparent' : element.fill}
          cornerRadius={element.cornerRadius || 0}
          perfectDrawEnabled={true}
        />
      )}

      {element.type === 'circle' && (
        <Circle
          radius={element.radius}
          fill={hasImage ? 'transparent' : element.fill}
          perfectDrawEnabled={true}
        />
      )}

      {element.type === 'text' && (
        <Text
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily || 'Inter'}
          fill={element.fill}
          align={element.textAlign || 'center'}
          width={element.width}
          offsetX={element.width / 2}
          fontStyle={`${element.fontWeight} ${element.fontStyle}`}
        />
      )}

      {/* 3. High-Fidelity Image Masking */}
      {hasImage && image && (
        <Group 
          clipFunc={(ctx) => {
            ctx.beginPath();
            if (element.type === 'rect') ctx.rect(-element.width/2, -element.height/2, element.width, element.height);
            else if (element.type === 'circle') ctx.arc(0, 0, element.radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
          }}
        >
          <KonvaImage
            image={image}
            width={element.width || element.radius * 2}
            height={element.height || element.radius * 2}
            x={-(element.width || element.radius * 2) / 2}
            y={-(element.height || element.radius * 2) / 2}
            scaleX={element.imageScale || 1}
            scaleY={element.imageScale || 1}
          />
        </Group>
      )}
    </Group>
  );
};