import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { ShapeRenderer } from './ShapeRenderer';

export const CanvasStage = ({
  elements, selectedId, onSelect, onUpdate, canvasSize,
  backgroundColor, backgroundImage, stageRef, userImage, isGeneratorMode = false,
  zoom = 1, isPreview = false,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const [bgImage] = useImage(backgroundImage || '', 'anonymous');

  // Attach transformer to selected node
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode && !isGeneratorMode && !isPreview) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId, isGeneratorMode, isPreview, elements]);

  // Scale-compensated anchor size: appears ~16px regardless of zoom (bigger for mobile touch)
  const anchorSize = Math.max(10, Math.round(16 / zoom));

  return (
    <div className="flex-1 relative flex items-center justify-center overflow-hidden">
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={(e) => e.target === e.target.getStage() && onSelect(null)}
        onTap={(e) => e.target === e.target.getStage() && onSelect(null)}
      >
        <Layer>
          {/* Base canvas surface — click to deselect */}
          <Rect
            width={canvasSize.width}
            height={canvasSize.height}
            fill={backgroundColor || '#000000'}
            perfectDrawEnabled={false}
            onClick={() => onSelect(null)}
            onTap={() => onSelect(null)}
          />

          {bgImage && (
            <KonvaImage
              image={bgImage}
              width={canvasSize.width}
              height={canvasSize.height}
              listening={false}
            />
          )}

          {elements.map((element) => (
            <ShapeRenderer
              key={element.id}
              element={element}
              isSelected={selectedId === element.id}
              onSelect={() => onSelect(element.id)}
              onChange={(updates) => onUpdate(element.id, updates)}
              userImage={userImage}
              isGeneratorMode={isGeneratorMode}
            />
          ))}

          {!isGeneratorMode && !isPreview && (
            <Transformer
              ref={transformerRef}
              anchorSize={anchorSize}
              anchorCornerRadius={3}
              anchorFill="#0842C7"
              anchorStroke="#ffffff"
              anchorStrokeWidth={2}
              borderStroke="#0842C7"
              borderStrokeWidth={1.5}
              borderDash={[4, 4]}
              rotateAnchorOffset={30}
              rotateAnchorCursor="grab"
              padding={6}
              ignoreStroke={true}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) return oldBox;
                return newBox;
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};