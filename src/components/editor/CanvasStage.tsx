import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { ShapeRenderer } from './ShapeRenderer';

export const CanvasStage = ({
  elements, selectedId, onSelect, onUpdate, canvasSize,
  backgroundColor, backgroundImage, stageRef, userImage, isGeneratorMode = false,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const [bgImage] = useImage(backgroundImage || '', 'anonymous');

  // Apple-Standard Precision Transformer
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedId}`);
      if (selectedNode && !isGeneratorMode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId, isGeneratorMode, elements]);

  return (
    <div className="flex-1 relative flex items-center justify-center bg-[#080808] overflow-hidden">
      {/* Precision HUD Overlay */}
      <div className="absolute top-6 left-6 z-50 pointer-events-none">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/20">
          Artboard Surface: {canvasSize.width}px × {canvasSize.height}px
        </span>
      </div>

      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_50_100px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.target === e.target.getStage() && onSelect(null)}
      >
        <Layer>
          {/* Base Industrial Surface */}
          <Rect
            width={canvasSize.width}
            height={canvasSize.height}
            fill={backgroundColor || '#000000'}
            perfectDrawEnabled={false}
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

          {!isGeneratorMode && (
            <Transformer
              ref={transformerRef}
              anchorSize={7}
              anchorCornerRadius={10}
              anchorFill="#0071e3"
              anchorStroke="#ffffff"
              anchorStrokeWidth={1.5}
              borderStroke="#0071e3"
              borderStrokeWidth={1}
              rotateAnchorOffset={25}
              padding={4}
              ignoreStroke={true}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};