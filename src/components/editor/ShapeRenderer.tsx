import React from 'react';
import { Group, Rect, Circle, Line, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { wrapText } from '@/lib/textUtils';

/**
 * Stroke position rendering strategy:
 *
 *  center  – standard Konva behaviour; stroke straddles the shape edge.
 *
 *  inside  – The shape is wrapped in a clipFunc that matches its own bounds.
 *            The strokeWidth is doubled so that the half which would normally
 *            render outside the edge is clipped away, leaving only the inner
 *            half visible. Net visual stroke width == original strokeWidth.
 *
 *  outside – Two shapes are layered:
 *            1. A slightly-larger solid shape (fill = stroke colour) drawn first.
 *            2. The original fill shape drawn on top with no stroke.
 *            The gap between their edges equals the stroke width.
 */

/**
 * Draw a rounded-rectangle clip path centred at (0,0).
 * Handles both a uniform cornerRadius and per-corner cornerRadii.
 */
function clipRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cornerRadius: number,
  cornerRadii?: { tl: number; tr: number; br: number; bl: number },
) {
  const tl = Math.min(cornerRadii ? cornerRadii.tl : cornerRadius, w / 2, h / 2);
  const tr = Math.min(cornerRadii ? cornerRadii.tr : cornerRadius, w / 2, h / 2);
  const br = Math.min(cornerRadii ? cornerRadii.br : cornerRadius, w / 2, h / 2);
  const bl = Math.min(cornerRadii ? cornerRadii.bl : cornerRadius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + tl, -h / 2);
  ctx.lineTo(w / 2 - tr, -h / 2);
  ctx.arcTo(w / 2, -h / 2, w / 2, -h / 2 + tr, tr);
  ctx.lineTo(w / 2, h / 2 - br);
  ctx.arcTo(w / 2, h / 2, w / 2 - br, h / 2, br);
  ctx.lineTo(-w / 2 + bl, h / 2);
  ctx.arcTo(-w / 2, h / 2, -w / 2, h / 2 - bl, bl);
  ctx.lineTo(-w / 2, -h / 2 + tl);
  ctx.arcTo(-w / 2, -h / 2, -w / 2 + tl, -h / 2, tl);
  ctx.closePath();
}

export const ShapeRenderer: React.FC<any> = ({
  element, isSelected, onSelect, onChange, userImage, isGeneratorMode = false,
}) => {
  const imageSrc = element.placeholderImage || userImage || '';
  const [image] = useImage(imageSrc, 'anonymous');
  const hasImage = !!image && (element.isPlaceholder || !!userImage);

  const strokePos = (element.strokePosition || 'center') as 'inside' | 'center' | 'outside';
  const sw = element.strokeWidth || 0;
  const strokeColor = element.stroke || '';

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (isGeneratorMode) return;
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    if (isGeneratorMode) return;
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
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

  // ── Rect stroke renderers ─────────────────────────────────────────────────
  const renderRect = () => {
    const w = element.width;
    const h = element.height;
    const fill = hasImage ? 'transparent' : element.fill;
    const hasStroke = sw > 0 && strokeColor;

    // Resolve corner radius: per-corner array takes precedence over uniform value
    const crRadii = element.cornerRadii;
    // Konva accepts cornerRadius as number or [TL, TR, BR, BL]
    const cr: number | number[] = crRadii
      ? [crRadii.tl, crRadii.tr, crRadii.br, crRadii.bl]
      : (element.cornerRadius || 0);

    // For outside stroke we need scalar max to expand the outer rect corners
    const crMax = crRadii
      ? Math.max(crRadii.tl, crRadii.tr, crRadii.br, crRadii.bl)
      : (element.cornerRadius || 0);

    // Helper: build clip path accounting for per-corner radii
    const doClip = (ctx: CanvasRenderingContext2D) => {
      if (crMax > 0 || crRadii) {
        clipRoundedRectPath(ctx, w, h, crMax, crRadii || undefined);
      } else {
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.closePath();
      }
    };

    if (strokePos === 'inside' && hasStroke) {
      return (
        <Group clipFunc={(ctx: CanvasRenderingContext2D) => doClip(ctx)}>
          <Rect
            width={w} height={h}
            offsetX={w / 2} offsetY={h / 2}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={sw * 2}
            cornerRadius={cr}
            perfectDrawEnabled={true}
          />
        </Group>
      );
    }

    if (strokePos === 'outside' && hasStroke) {
      const ow = w + sw * 2;
      const oh = h + sw * 2;
      // Outer corners expanded by sw
      const outerCr: number | number[] = crRadii
        ? [crRadii.tl + sw, crRadii.tr + sw, crRadii.br + sw, crRadii.bl + sw].map(v => Math.max(0, v)) as number[]
        : Math.max(0, crMax + sw);
      return (
        <>
          <Rect
            width={ow} height={oh}
            offsetX={ow / 2} offsetY={oh / 2}
            fill={strokeColor}
            cornerRadius={outerCr}
            listening={false}
            perfectDrawEnabled={true}
          />
          <Rect
            width={w} height={h}
            offsetX={w / 2} offsetY={h / 2}
            fill={fill}
            cornerRadius={cr}
            perfectDrawEnabled={true}
          />
        </>
      );
    }

    // Center (default)
    return (
      <Rect
        width={w} height={h}
        offsetX={w / 2} offsetY={h / 2}
        fill={fill}
        stroke={strokeColor}
        strokeWidth={sw}
        cornerRadius={cr}
        perfectDrawEnabled={true}
      />
    );
  };

  // ── Circle stroke renderers ───────────────────────────────────────────────
  const renderCircle = () => {
    const r = element.radius;
    const fill = hasImage ? 'transparent' : element.fill;
    const hasStroke = sw > 0 && strokeColor;

    if (strokePos === 'inside' && hasStroke) {
      return (
        <Group
          clipFunc={(ctx: CanvasRenderingContext2D) => {
            ctx.arc(0, 0, r, 0, Math.PI * 2);
          }}
        >
          <Circle radius={r} fill={fill} stroke={strokeColor} strokeWidth={sw * 2} perfectDrawEnabled={true} />
        </Group>
      );
    }

    if (strokePos === 'outside' && hasStroke) {
      return (
        <>
          <Circle radius={r + sw} fill={strokeColor} listening={false} perfectDrawEnabled={true} />
          <Circle radius={r} fill={fill} perfectDrawEnabled={true} />
        </>
      );
    }

    return (
      <Circle radius={r} fill={fill} stroke={strokeColor} strokeWidth={sw} perfectDrawEnabled={true} />
    );
  };

  // ── Polygon stroke renderers ──────────────────────────────────────────────
  const renderPolygon = () => {
    const sides = element.sides || 6;
    const r = element.radius;
    const fill = hasImage ? 'transparent' : element.fill;
    const hasStroke = sw > 0 && strokeColor;

    const makePoints = (radius: number) => {
      const pts: number[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        pts.push(radius * Math.cos(angle), radius * Math.sin(angle));
      }
      return pts;
    };

    if (strokePos === 'inside' && hasStroke) {
      const pts = makePoints(r);
      return (
        <Group
          clipFunc={(ctx: CanvasRenderingContext2D) => {
            const cp = makePoints(r);
            ctx.beginPath();
            ctx.moveTo(cp[0], cp[1]);
            for (let i = 2; i < cp.length; i += 2) ctx.lineTo(cp[i], cp[i + 1]);
            ctx.closePath();
          }}
        >
          <Line points={pts} closed fill={fill} stroke={strokeColor} strokeWidth={sw * 2} perfectDrawEnabled={true} />
        </Group>
      );
    }

    if (strokePos === 'outside' && hasStroke) {
      return (
        <>
          <Line points={makePoints(r + sw)} closed fill={strokeColor} listening={false} perfectDrawEnabled={true} />
          <Line points={makePoints(r)} closed fill={fill} perfectDrawEnabled={true} />
        </>
      );
    }

    return (
      <Line points={makePoints(r)} closed fill={fill} stroke={strokeColor} strokeWidth={sw} perfectDrawEnabled={true} />
    );
  };

  // ── Text stroke renderers ─────────────────────────────────────────────────
  const renderText = () => {
    const hasStroke = sw > 0 && strokeColor;

    const sharedProps = {
      text: wrapText(
        element.text,
        element.width,
        element.fontSize,
        element.fontFamily || 'Inter',
        element.fontWeight || 400,
        element.fontStyle || 'normal',
      ),
      fontSize: element.fontSize,
      fontFamily: element.fontFamily || 'Inter',
      fontStyle: `${element.fontWeight || 400} ${element.fontStyle || 'normal'}` as any,
      textDecoration: element.textDecoration && element.textDecoration !== 'none' ? element.textDecoration : '' as any,
      align: (element.textAlign || 'center') as any,
      width: element.width,
      offsetX: element.width / 2,
      wrap: 'none' as const,
    };

    if (strokePos === 'outside' && hasStroke) {
      // Behind: stroke-only node (double width) below, fill-only node on top
      // Fill covers the inner half of the doubled stroke → only outer halo shows
      return (
        <>
          <Text
            {...sharedProps}
            fill=""
            stroke={strokeColor}
            strokeWidth={sw * 2}
            perfectDrawEnabled={true}
          />
          <Text
            {...sharedProps}
            fill={element.fill}
            stroke=""
            strokeWidth={0}
            perfectDrawEnabled={true}
          />
        </>
      );
    }

    if (strokePos === 'inside' && hasStroke) {
      // Front: fill-only node below, stroke-only node (double width) on top
      // Stroke renders over the fill; inner half sits on fill, outer half extends beyond glyph edge
      return (
        <>
          <Text
            {...sharedProps}
            fill={element.fill}
            stroke=""
            strokeWidth={0}
            perfectDrawEnabled={true}
          />
          <Text
            {...sharedProps}
            fill=""
            stroke={strokeColor}
            strokeWidth={sw * 2}
            perfectDrawEnabled={true}
          />
        </>
      );
    }

    // Center (default) — single node
    return (
      <Text
        {...sharedProps}
        fill={element.fill}
        stroke={strokeColor}
        strokeWidth={sw}
        perfectDrawEnabled={true}
      />
    );
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

      {element.type === 'rect' && renderRect()}
      {element.type === 'circle' && renderCircle()}
      {element.type === 'polygon' && renderPolygon()}
      {element.type === 'text' && renderText()}

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

      {/* Image masking — clips the KonvaImage to the exact shape boundary */}
      {hasImage && image && (
        <Group
          clipFunc={(ctx: any) => {
            if (element.type === 'rect') {
              const cr: number = element.cornerRadius || 0;
              const crR = element.cornerRadii;
              if (cr > 0 || crR) {
                // Rounded clip that matches cornerRadius / cornerRadii exactly
                clipRoundedRectPath(ctx, element.width, element.height, cr, crR);
              } else {
                ctx.beginPath();
                ctx.rect(-element.width / 2, -element.height / 2, element.width, element.height);
                ctx.closePath();
              }
            } else if (element.type === 'circle') {
              ctx.beginPath();
              ctx.arc(0, 0, element.radius, 0, Math.PI * 2);
              ctx.closePath();
            } else if (element.type === 'polygon') {
              const sides = element.sides || 6;
              ctx.beginPath();
              for (let i = 0; i < sides; i++) {
                const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
                const px = element.radius * Math.cos(angle);
                const py = element.radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
            }
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