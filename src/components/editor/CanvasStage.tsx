import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import { CanvasElement } from '@/types/editor';
import { ShapeRenderer } from './ShapeRenderer';

interface CanvasStageProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
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
  stageRef,
  userImage,
  isGeneratorMode = false,
}) => {
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  // Calculate scale to fit canvas in container
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 80;
        const containerHeight = containerRef.current.clientHeight - 80;
        const scaleX = containerWidth / canvasSize.width;
        const scaleY = containerHeight / canvasSize.height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [canvasSize]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && stageRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      
      if (selectedNode && !isGeneratorMode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer()?.batchDraw();
      } else {
        transformerRef.current.nodes([]);
      }
    }
  }, [selectedId, isGeneratorMode, stageRef]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on empty space, deselect
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      onSelect(null);
    }
  }, [onSelect]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    const id = node.id();
    const element = elements.find((el) => el.id === id);
    
    if (!element) return;

    const updates: Record<string, unknown> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };

    if (element.type === 'rect') {
      updates.width = Math.max(10, node.width() * node.scaleX());
      updates.height = Math.max(10, node.height() * node.scaleY());
    } else if (element.type === 'circle' || element.type === 'polygon') {
      const scaleAvg = (node.scaleX() + node.scaleY()) / 2;
      updates.radius = Math.max(10, (element as { radius: number }).radius * scaleAvg);
    }

    node.scaleX(1);
    node.scaleY(1);
    
    onUpdate(id, updates as Partial<CanvasElement>);
  }, [elements, onUpdate]);

  return (
    <div 
      ref={containerRef}
      className="canvas-container flex-1 relative"
    >
      {/* Canvas Size Indicator */}
      <div className="absolute top-4 left-4 text-xs text-muted-foreground font-mono">
        {canvasSize.width} × {canvasSize.height}
      </div>

      <div 
        className="shadow-elevated rounded-lg overflow-hidden"
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
            {/* Background */}
            <Rect
              name="background"
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill={backgroundColor}
            />

            {/* Elements */}
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

            {/* Transformer */}
            {!isGeneratorMode && (
              <Transformer
                ref={transformerRef}
                onTransformEnd={handleTransformEnd}
                boundBoxFunc={(oldBox, newBox) => {
                  // Limit minimum size
                  if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                  }
                  return newBox;
                }}
                anchorSize={8}
                anchorCornerRadius={4}
                anchorFill="#6366f1"
                anchorStroke="#ffffff"
                anchorStrokeWidth={2}
                borderStroke="#6366f1"
                borderStrokeWidth={1}
                rotateAnchorOffset={30}
                enabledAnchors={[
                  'top-left',
                  'top-right',
                  'bottom-left',
                  'bottom-right',
                ]}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
