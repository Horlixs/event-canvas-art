import React, { useState, useRef, useEffect } from "react";
import { X, ChevronDown, Check, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Link2, Unlink2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "./ColorPicker";

// ── Font data with available weights per family ──────────────────────────
const FONT_DATA: Record<string, { weights: number[]; labels: Record<number, string> }> = {
  'Inter': {
    weights: [300, 400, 500, 600, 700, 800, 900],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  },
  'Roboto': {
    weights: [300, 400, 500, 700, 900],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 700: 'Bold', 900: 'Black' },
  },
  'Montserrat': {
    weights: [300, 400, 500, 600, 700, 800, 900],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  },
  'Poppins': {
    weights: [300, 400, 500, 600, 700, 800, 900],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  },
  'Open Sans': {
    weights: [300, 400, 500, 600, 700, 800],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' },
  },
  'Lato': {
    weights: [300, 400, 700, 900],
    labels: { 300: 'Light', 400: 'Regular', 700: 'Bold', 900: 'Black' },
  },
  'Oswald': {
    weights: [300, 400, 500, 600, 700],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' },
  },
  'Playfair Display': {
    weights: [400, 500, 600, 700, 800, 900],
    labels: { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  },
  'Raleway': {
    weights: [300, 400, 500, 600, 700, 800, 900],
    labels: { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' },
  },
  'Bebas Neue': {
    weights: [400],
    labels: { 400: 'Regular' },
  },
    'Ojuju': {
    weights: [200, 300, 400, 500, 600, 700, 800],
    labels: { 200: 'Light', 300: 'Regular', 400: 'Medium', 500: 'SemiBold', 600: 'Bold', 700: 'ExtraBold', 800: 'Black'},
  },
  'Lobster': {
    weights: [400],
    labels: { 400: 'Regular' },
  },
  'Pacifico': {
    weights: [400],
    labels: { 400: 'Regular' },
  },
  'Dancing Script': {
    weights: [400, 500, 600, 700],
    labels: { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' },
  },
};

const FONT_FAMILIES = Object.keys(FONT_DATA);

// ── Primitives ───────────────────────────────────────────────────────────
const ControlRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b] w-20 shrink-0">{label}</span>
    <div className="flex-1 flex justify-end">{children}</div>
  </div>
);

const CompactInput = ({ value, onChange, unit, className }: { value: any; onChange: (v: string) => void; unit?: string; className?: string }) => (
  <div className={`relative flex items-center bg-black/[0.03] dark:bg-white/[0.04] rounded-lg border border-black/[0.04] dark:border-white/[0.04] px-3 py-1.5 focus-within:ring-2 ring-blue-500/30 transition-all ${className || ''}`}>
    <input
      className="bg-transparent border-none text-[12px] font-mono w-14 text-right outline-none text-[#1d1d1f] dark:text-[#f5f5f7]"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
    {unit && <span className="text-[9px] text-[#86868b]/60 ml-1 font-medium">{unit}</span>}
  </div>
);

// ── Corner Radius Control ────────────────────────────────────────────────
// Small inline input with a corner label for the 2×2 grid
const CornerInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-[8px] font-bold uppercase tracking-wider text-[#86868b]/70">{label}</span>
    <div className="relative flex items-center bg-black/[0.03] dark:bg-white/[0.04] rounded-lg border border-black/[0.04] dark:border-white/[0.04] px-2 py-1.5 focus-within:ring-2 ring-blue-500/30 transition-all w-full">
      <input
        className="bg-transparent border-none text-[11px] font-mono w-full text-center outline-none text-[#1d1d1f] dark:text-[#f5f5f7]"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  </div>
);

const CornerRadiusControl = ({ element, onUpdate }: { element: any; onUpdate: (updates: any) => void }) => {
  const radii = element.cornerRadii;
  const isIndividual = !!radii;

  const handleUnlink = () => {
    // Switch to individual – seed all four from current uniform value
    const r = element.cornerRadius || 0;
    onUpdate({ cornerRadii: { tl: r, tr: r, br: r, bl: r } });
  };

  const handleLink = () => {
    // Switch back to uniform – use the max of all four values
    const max = Math.max(radii.tl, radii.tr, radii.br, radii.bl);
    onUpdate({ cornerRadii: undefined, cornerRadius: max });
  };

  const updateCorner = (key: string, val: string) =>
    onUpdate({ cornerRadii: { ...radii, [key]: Math.max(0, Number(val)) } });

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">Corners</span>
        <button
          onClick={isIndividual ? handleLink : handleUnlink}
          title={isIndividual ? 'Link corners (uniform)' : 'Unlink corners (individual)'}
          className={`p-1.5 rounded-md border transition-all ${
            isIndividual
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-500'
              : 'border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
          }`}
        >
          {isIndividual ? <Unlink2 size={11} /> : <Link2 size={11} />}
        </button>
      </div>

      {isIndividual ? (
        /* 2×2 grid — corners visually match their position on the shape */
        <div className="grid grid-cols-2 gap-1.5">
          <CornerInput label="TL" value={radii.tl} onChange={v => updateCorner('tl', v)} />
          <CornerInput label="TR" value={radii.tr} onChange={v => updateCorner('tr', v)} />
          <CornerInput label="BL" value={radii.bl} onChange={v => updateCorner('bl', v)} />
          <CornerInput label="BR" value={radii.br} onChange={v => updateCorner('br', v)} />
        </div>
      ) : (
        /* Single uniform value */
        <div className="flex justify-end">
          <CompactInput
            value={element.cornerRadius ?? 0}
            onChange={r => onUpdate({ cornerRadius: Math.max(0, Number(r)) })}
            unit="px"
          />
        </div>
      )}
    </div>
  );
};

// ── Custom Font Family Dropdown ──────────────────────────────────────────
const FontFamilyDropdown = ({ value, onChange }: { value: string; onChange: (font: string) => void }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full px-3 py-2.5 rounded-lg border bg-black/[0.02] dark:bg-white/[0.03] text-[13px] text-left flex items-center justify-between gap-2 transition-all",
          open ? "border-blue-500/40 ring-2 ring-blue-500/20" : "border-black/[0.06] dark:border-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.12]",
        )}
      >
        <span className="truncate text-[#1d1d1f] dark:text-[#f5f5f7]" style={{ fontFamily: value }}>{value}</span>
        <ChevronDown size={12} className={cn("text-[#86868b] transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-2xl z-[100] max-h-[220px] overflow-y-auto py-1 scrollbar-thin">
          {FONT_FAMILIES.map(font => (
            <button
              key={font}
              onClick={() => { onChange(font); setOpen(false); }}
              className={cn(
                "w-full px-3 py-2 text-left text-[13px] flex items-center justify-between gap-2 transition-colors",
                value === font
                  ? "bg-blue-500/[0.08] text-blue-600 dark:text-blue-400"
                  : "text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              )}
            >
              <span style={{ fontFamily: font, fontWeight: 400 }} className="truncate">{font}</span>
              {value === font && <Check size={14} className="text-blue-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Panel ───────────────────────────────────────────────────────────
export const PropertiesPanel = ({ element, onUpdate, onClose }: any) => {
  const fontData = element.type === 'text' ? FONT_DATA[element.fontFamily] || FONT_DATA['Inter'] : null;
  const currentWeight = Number(element.fontWeight) || 400;

  const handleFontChange = (newFont: string) => {
    const data = FONT_DATA[newFont];
    const updates: any = { fontFamily: newFont };
    if (data && !data.weights.includes(currentWeight)) {
      const nearest = data.weights.reduce((prev, curr) =>
        Math.abs(curr - currentWeight) < Math.abs(prev - currentWeight) ? curr : prev
      );
      updates.fontWeight = nearest;
    }
    onUpdate(updates);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <input
            value={element.name || ''}
            onChange={(e) => onUpdate({ name: e.target.value || undefined } as any)}
            placeholder={element.type === 'text' ? (element as any).text || element.type : element.type}
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1d1d1f] dark:text-[#f5f5f7] bg-transparent outline-none min-w-0 flex-1 placeholder:text-[#86868b]/50 border-b border-transparent focus:border-blue-500/40 transition-colors py-0.5"
            maxLength={40}
          />
        </div>
        <button onClick={onClose} className="p-1 rounded-md text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 shrink-0 ml-2">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 overscroll-contain scrollbar-thin">
        {/* Position */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Position</h4>
          <div className="space-y-0.5">
            <ControlRow label="X"><CompactInput value={Math.round(element.x)} onChange={(x) => onUpdate({ x: Number(x) })} unit="px" /></ControlRow>
            <ControlRow label="Y"><CompactInput value={Math.round(element.y)} onChange={(y) => onUpdate({ y: Number(y) })} unit="px" /></ControlRow>
            <ControlRow label="Rotation"><CompactInput value={element.rotation} onChange={(r) => onUpdate({ rotation: Number(r) })} unit="°" /></ControlRow>
          </div>
        </section>

        {/* Size */}
        {'width' in element && (
          <section className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Size</h4>
            <div className="space-y-0.5">
              <ControlRow label="Width"><CompactInput value={Math.round(element.width)} onChange={(w) => onUpdate({ width: Number(w) })} unit="px" /></ControlRow>
              {'height' in element && <ControlRow label="Height"><CompactInput value={Math.round(element.height)} onChange={(h) => onUpdate({ height: Number(h) })} unit="px" /></ControlRow>}
            </div>
          </section>
        )}
        {'radius' in element && (
          <section className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Size</h4>
            <ControlRow label="Radius"><CompactInput value={Math.round(element.radius)} onChange={(r) => onUpdate({ radius: Number(r) })} unit="px" /></ControlRow>
          </section>
        )}

        {/* Appearance */}
        <section className="space-y-3 pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Appearance</h4>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-medium text-[#86868b]">Opacity</span>
              <span className="text-[10px] font-mono text-[#86868b] tabular-nums">{Math.round((element.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              className="w-full accent-blue-500 h-1 bg-black/[0.05] dark:bg-white/[0.05] appearance-none rounded-full cursor-pointer"
              min="0" max="1" step="0.01" value={element.opacity ?? 1}
              onChange={e => onUpdate({ opacity: Number(e.target.value) })}
            />
          </div>

          {/* Fill color */}
          {'fill' in element && (
            <ControlRow label="Fill">
              <ColorPicker value={element.fill} onChange={(color) => onUpdate({ fill: color })} />
            </ControlRow>
          )}

          {/* Corner radius */}
          {'cornerRadius' in element && (
            <div className="py-1">
              <CornerRadiusControl element={element} onUpdate={onUpdate} />
            </div>
          )}

            {/* Stroke */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Stroke</h4>
            <ControlRow label="Color">
              <ColorPicker value={element.stroke || '#000000'} onChange={(color) => onUpdate({ stroke: color })} />
            </ControlRow>
            <ControlRow label="Width"><CompactInput value={element.strokeWidth ?? 0} onChange={(w) => onUpdate({ strokeWidth: Number(w) })} unit="px" /></ControlRow>

            {/* Stroke Position */}
            {(element.strokeWidth > 0 && element.stroke) && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium text-[#86868b] block">Position</span>
                <div className="flex rounded-lg overflow-hidden border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]">
                  {(['inside', 'center', 'outside'] as const).map((pos, i) => (
                    <button
                      key={pos}
                      onClick={() => onUpdate({ strokePosition: pos })}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-semibold capitalize transition-all",
                        i !== 0 && "border-l border-black/[0.06] dark:border-white/[0.06]",
                        (element.strokePosition || 'center') === pos
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                      )}
                    >
                      {pos === 'inside' ? 'Front' : pos === 'center' ? 'Center' : 'Behind'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(element.strokeWidth > 0 && element.stroke) && (
              <button
                onClick={() => onUpdate({ stroke: '', strokeWidth: 0 })}
                className="text-[10px] font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                Remove stroke
              </button>
            )}
          </div>
        </section>

        {/* Typography */}
        {element.type === 'text' && (
          <section className="space-y-3 pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Typography</h4>
            <div className="space-y-3">
              {/* Content */}
              <div>
                <span className="text-[10px] font-medium text-[#86868b] block mb-1.5">Content</span>
                <input
                  value={element.text}
                  onChange={e => onUpdate({ text: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] text-[13px] outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Font size */}
              <ControlRow label="Size"><CompactInput value={element.fontSize} onChange={(s) => onUpdate({ fontSize: Number(s) })} unit="px" /></ControlRow>

              {/* Font family — custom dropdown */}
              <div>
                <span className="text-[10px] font-medium text-[#86868b] block mb-1.5">Font Family</span>
                <FontFamilyDropdown value={element.fontFamily} onChange={handleFontChange} />
              </div>

              {/* Font weight */}
              {fontData && fontData.weights.length > 1 && (
                <div>
                  <span className="text-[10px] font-medium text-[#86868b] block mb-1.5">Weight</span>
                  <div className="flex flex-wrap gap-1">
                    {fontData.weights.map(w => (
                      <button
                        key={w}
                        onClick={() => onUpdate({ fontWeight: w })}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all border",
                          currentWeight === w
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "border-black/[0.04] dark:border-white/[0.04] text-[#86868b] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                        )}
                        style={{ fontFamily: element.fontFamily, fontWeight: w }}
                      >
                        {fontData.labels[w]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Font style toggles: Italic, Underline, Strikethrough */}
              <div>
                <span className="text-[10px] font-medium text-[#86868b] block mb-1.5">Style</span>
                <div className="flex gap-1">
                  <button
                    id="btn-italic"
                    onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    title="Italic"
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md border text-[12px] font-semibold transition-all",
                      element.fontStyle === 'italic'
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        : "border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    id="btn-underline"
                    onClick={() => {
                      const cur = element.textDecoration || 'none';
                      const hasU = cur.includes('underline');
                      const hasS = cur.includes('line-through');
                      const next = hasU
                        ? (hasS ? 'line-through' : 'none')
                        : (hasS ? 'underline line-through' : 'underline');
                      onUpdate({ textDecoration: next });
                    }}
                    title="Underline"
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md border text-[12px] font-semibold transition-all",
                      (element.textDecoration || '').includes('underline')
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        : "border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <Underline size={13} />
                  </button>
                  <button
                    id="btn-strikethrough"
                    onClick={() => {
                      const cur = element.textDecoration || 'none';
                      const hasU = cur.includes('underline');
                      const hasS = cur.includes('line-through');
                      const next = hasS
                        ? (hasU ? 'underline' : 'none')
                        : (hasU ? 'underline line-through' : 'line-through');
                      onUpdate({ textDecoration: next });
                    }}
                    title="Strikethrough"
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-md border text-[12px] font-semibold transition-all",
                      (element.textDecoration || '').includes('line-through')
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        : "border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <Strikethrough size={13} />
                  </button>
                </div>
              </div>

              {/* Alignment */}
              <div>
                <span className="text-[10px] font-medium text-[#86868b] block mb-1.5">Align</span>
                <div className="flex gap-1">
                  {([
                    { val: 'left', Icon: AlignLeft },
                    { val: 'center', Icon: AlignCenter },
                    { val: 'right', Icon: AlignRight },
                  ] as const).map(({ val, Icon }) => (
                    <button
                      key={val}
                      onClick={() => onUpdate({ textAlign: val })}
                      title={val.charAt(0).toUpperCase() + val.slice(1)}
                      className={cn(
                        "flex-1 flex items-center justify-center py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all",
                        (element.textAlign || 'center') === val
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                          : "border-black/[0.06] dark:border-white/[0.06] text-[#86868b] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      )}
                    >
                      <Icon size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Placeholder toggle */}
        <section className="pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
          <button
            onClick={() => onUpdate({ isPlaceholder: !element.isPlaceholder })}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98]",
              element.isPlaceholder
                ? "bg-blue-500/[0.06] border-blue-500/20"
                : "bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.04] dark:border-white/[0.04]"
            )}
          >
            <div className="text-left">
              <p className="text-[12px] font-semibold">Placeholder</p>
              <p className="text-[10px] text-[#86868b]">Users can upload their photo here</p>
            </div>
            <div className={cn(
              "w-10 h-6 rounded-full transition-all flex items-center px-0.5",
              element.isPlaceholder ? "bg-blue-500" : "bg-black/10 dark:bg-white/10"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                element.isPlaceholder ? "translate-x-4" : "translate-x-0"
              )} />
            </div>
          </button>
        </section>
      </div>
    </div>
  );
};