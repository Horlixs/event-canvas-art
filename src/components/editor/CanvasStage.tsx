import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { CanvasElement } from '@/types/editor';
import { ShapeRenderer } from './ShapeRenderer';

interface CanvasStageProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  backgroundImage?: string | null;
  stageRef: React.RefObject<Konva.Stage>;
  userImage?: string;
  isGeneratorMode?: boolean;
}

export const CanvasStage: React.FC<CanvasStageProps> = ({
  elements,
  selectedId,
  onSelect,
  onUpdate,
  canvasSize,
  backgroundColor,
  backgroundImage,
  stageRef,
  userImage,
  isGeneratorMode = false,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [lockAspectRatio, setLockAspectRatio] = React.useState(false);

  // Load background image
  const [bgImage] = useImage(backgroundImage || '', 'anonymous');

  // Calculate scale to fit canvas inside container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const containerWidth = Math.max(1, cw - 80);
      const containerHeight = Math.max(1, ch - 80);
      const scaleX = containerWidth / Math.max(1, canvasSize.width);
      const scaleY = containerHeight / Math.max(1, canvasSize.height);
      const newScale = Math.min(scaleX, scaleY, 1);
      setScale(isFinite(newScale) && newScale > 0 ? newScale : 1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [canvasSize]);

  // Keep transformer attached to selected node
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);

      if (selectedNode && !isGeneratorMode) {
        let targetNode = selectedNode;

        // FIX 1: Cast selectedNode to Konva.Group to access .find()
        if (selectedNode.getType() === 'Group') {
          const groupNode = selectedNode as Konva.Group;
          const rectChild = groupNode.find((node: Konva.Node) => node.name() === 'transformer-target');
          if (rectChild && rectChild.length > 0) {
            targetNode = rectChild[0];
          }
        }
        
        transformerRef.current.nodes([targetNode]);
        
        const element = elements.find(el => el.id === selectedId);
        if (element) {
          const shouldLock = element.type === 'circle' || element.type === 'polygon';
          setLockAspectRatio(shouldLock);
          transformerRef.current.keepRatio(shouldLock);
        }
        
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
        setLockAspectRatio(false);
      }
    }
  }, [selectedId, isGeneratorMode, stageRef, elements]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage() || e.target.name() === 'background') {
        onSelect(null);
      }
    },
    [onSelect]
  );

  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as any;
      
      let groupNode = node;
      let elementId = node.id();
      
      if (node.name() === 'transformer-target') {
        groupNode = node.getParent();
        if (groupNode) {
          elementId = groupNode.id();
        }
      }
      
      const element = elements.find((el) => el.id === elementId);
      if (!element) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      const groupX = groupNode.x();
      const groupY = groupNode.y();
      const groupRotation = groupNode.rotation();
      
      const updates: Record<string, unknown> = {
        x: Math.round(groupX),
        y: Math.round(groupY),
        rotation: Math.round(groupRotation),
      };

      if (element.type === 'rect' || element.type === 'image') {
        const originalWidth = (element as any).width || 100;
        const originalHeight = (element as any).height || 100;
        
        const newW = Math.max(20, Math.round(originalWidth * scaleX));
        const newH = Math.max(20, Math.round(originalHeight * scaleY));
        
        updates.width = newW;
        updates.height = newH;
      } else if (element.type === 'circle' || element.type === 'polygon') {
        const scaleAvg = (scaleX + scaleY) / 2;
        const originalRadius = (element as any).radius || 50;
        updates.radius = Math.max(10, Math.round(originalRadius * scaleAvg));
      } else if (element.type === 'text') {
        const originalWidth = (element as any).width || 200;
        updates.width = Math.max(50, Math.round(originalWidth * scaleX));
      }

      node.scaleX(1);
      node.scaleY(1);
      
      // FIX 2: Changed 'Rect' to 'rect' (lowercase)
      if (element.type === 'rect' || element.type === 'image') {
        const newW = updates.width as number;
        const newH = updates.height as number;
        node.width(newW);
        node.height(newH);
        node.x(-newW / 2);
        node.y(-newH / 2);
      } else if (element.type === 'circle' || element.type === 'polygon') {
        const diameter = (updates.radius as number) * 2;
        node.width(diameter);
        node.height(diameter);
        node.x(-diameter / 2);
        node.y(-diameter / 2);
      }

      onUpdate(elementId, updates as Partial<CanvasElement>);
    },
    [elements, onUpdate]
  );

  const computeBgDrawRect = useCallback(() => {
    if (!bgImage) return null;

    const imgW = (bgImage as HTMLImageElement).naturalWidth || (bgImage as any).width || 0;
    const imgH = (bgImage as HTMLImageElement).naturalHeight || (bgImage as any).height || 0;
    if (!imgW || !imgH) return null;

    const canvasW = canvasSize.width;
    const canvasH = canvasSize.height;

    const imgRatio = imgW / imgH;
    const canvasRatio = canvasW / canvasH;

    let drawW = canvasW;
    let drawH = canvasH;

    if (imgRatio > canvasRatio) {
      const scale = Math.min(1, canvasW / imgW);
      drawW = Math.round(imgW * scale);
      drawH = Math.round(imgH * scale);
    } else {
      const scale = Math.min(1, canvasH / imgH);
      drawW = Math.round(imgW * scale);
      drawH = Math.round(imgH * scale);
    }

    const offsetX = Math.round((canvasW - drawW) / 2);
    const offsetY = Math.round((canvasH - drawH) / 2);

    return { drawW, drawH, offsetX, offsetY, naturalW: imgW, naturalH: imgH };
  }, [bgImage, canvasSize]);

  const bgRect = computeBgDrawRect();

  return (
    <div ref={containerRef} className="canvas-container flex-1 relative">
      <div className="absolute top-4 left-4 text-xs text-muted-foreground font-mono z-40">
        {canvasSize.width} × {canvasSize.height}
      </div>

      <div
        className="shadow-elevated rounded-lg overflow-hidden bg-transparent"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <Stage
          ref={stageRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            <Rect
              name="background"
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill={backgroundColor || '#ffffff'}
            />

            {bgImage && bgRect && (
              <KonvaImage
                name="background-image"
                image={bgImage}
                x={bgRect.offsetX}
                y={bgRect.offsetY}
                width={bgRect.drawW}
                height={bgRect.drawH}
                listening={false}
                opacity={1}
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
                onTransformEnd={handleTransformEnd}
                anchorSize={40}
                anchorCornerRadius={4}
                anchorFill="#6366f1"
                anchorStroke="#ffffff"
                anchorStrokeWidth={2}
                borderStroke="#6366f1"
                borderStrokeWidth={2}
                borderDash={[4, 4]}
                rotateAnchorOffset={40}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
                keepRatio={lockAspectRatio}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  
                  if (lockAspectRatio) {
                    const aspectRatio = oldBox.width / oldBox.height;
                    const newAspectRatio = newBox.width / newBox.height;
                    
                    if (Math.abs(newAspectRatio - aspectRatio) > 0.01) {
                      const widthChange = Math.abs(newBox.width - oldBox.width);
                      const heightChange = Math.abs(newBox.height - oldBox.height);
                      
                      if (widthChange > heightChange) {
                        newBox.height = newBox.width / aspectRatio;
                      } else {
                        newBox.width = newBox.height * aspectRatio;
                      }
                    }
                  }
                  
                  return newBox;
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default CanvasStage;