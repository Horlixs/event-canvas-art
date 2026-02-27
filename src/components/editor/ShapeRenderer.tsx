import React from 'react';
import { Group, Rect, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

export const ShapeRenderer: React.FC<any> = ({
  element, isSelected, onSelect, onChange, userImage, isGeneratorMode = false,
}) => {
  const imageSrc = element.placeholderImage || userImage || '';
  const [image] = useImage(imageSrc, 'anonymous');
  const hasImage = !!image && (element.isPlaceholder || !!userImage);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isGeneratorMode) return;
    onChange({
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    if (isGeneratorMode) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale — apply it to actual dimensions instead
    node.scaleX(1);
    node.scaleY(1);

    const updates: Record<string, any> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };

    if (element.type === 'rect' || element.type === 'image') {
      updates.width = Math.max(10, Math.round(element.width * scaleX));
      updates.height = Math.max(10, Math.round(element.height * scaleY));
    } else if (element.type === 'circle' || element.type === 'polygon') {
      updates.radius = Math.max(5, Math.round(element.radius * Math.max(Math.abs(scaleX), Math.abs(scaleY))));
    } else if (element.type === 'text') {
      updates.width = Math.max(20, Math.round(element.width * scaleX));
      updates.fontSize = Math.max(8, Math.round(element.fontSize * scaleY));
    }

    onChange(updates);
  };

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      draggable={!isGeneratorMode}
      onClick={onSelect}
      onTap={onSelect}
      opacity={element.opacity ?? 1}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/* Placeholder indicator (dashed outline when empty) */}
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

      {/* Shape rendering */}
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

      {element.type === 'polygon' && (() => {
        const sides = element.sides || 6;
        const r = element.radius;
        const points: number[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          points.push(r * Math.cos(angle), r * Math.sin(angle));
        }
        return (
          <Line
            points={points}
            closed
            fill={hasImage ? 'transparent' : element.fill}
            perfectDrawEnabled={true}
          />
        );
      })()}

      {element.type === 'text' && (
        <Text
          text={element.text}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily || 'Inter'}
          fill={element.fill}
          align={element.textAlign || 'center'}
          width={element.width}
          offsetX={element.width / 2}
          fontStyle={`${element.fontWeight || 400} ${element.fontStyle || 'normal'}`}
        />
      )}

      {element.type === 'image' && (
        <Rect
          width={element.width}
          height={element.height}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          fill={hasImage ? 'transparent' : '#e5e7eb'}
          perfectDrawEnabled={true}
        />
      )}

      {/* Image masking */}
      {hasImage && image && (
        <Group
          clipFunc={(ctx: any) => {
            ctx.beginPath();
            if (element.type === 'rect') {
              ctx.rect(-element.width / 2, -element.height / 2, element.width, element.height);
            } else if (element.type === 'circle') {
              ctx.arc(0, 0, element.radius, 0, Math.PI * 2);
            } else if (element.type === 'polygon') {
              const sides = element.sides || 6;
              for (let i = 0; i < sides; i++) {
                const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
                const px = element.radius * Math.cos(angle);
                const py = element.radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
            }
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