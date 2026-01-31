import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronDown, ImageIcon, 
  AlignLeft, AlignCenter, AlignRight, 
  Bold, Italic, Type 
} from "lucide-react";
import { CanvasElement } from "@/types/editor";
import { cn } from "@/lib/utils";

/* ---------------------- FONT LIST ---------------------- */
const GOOGLE_FONTS = [
  "Inter", "Roboto", "Oswald", "Lobster", "Montserrat",
  "Poppins", "Playfair Display", "Raleway", "Open Sans",
  "Lato", "Source Sans 3", "Bebas Neue", "Dancing Script", "Pacifico"
];

/* ---------------------- COLLAPSIBLE SECTION ---------------------- */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-slate-200 dark:border-white/10">
      <button
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
        <ChevronDown
          size={16}
          className={`transition-transform text-slate-400 dark:text-slate-500 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------------------- MINI INPUT COMPONENTS ---------------------- */
const NumberInput = ({ label, value, onChange, min = 0, max }: any) => (
  <div>
    <span className="label-subtle">{label}</span>
    <input
      type="number"
      className="input-minimal w-full mt-1"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

const Slider = ({ label, value, min, max, step = 1, onChange }: any) => (
  <div>
    <div className="flex items-center justify-between">
      <span className="label-subtle">{label}</span>
      <span className="text-xs text-slate-500">{value}</span>
    </div>
    <input
      type="range"
      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

const ColorInput = ({ label, value, onChange }: any) => (
  <div>
    <span className="label-subtle">{label}</span>
    <div className="flex gap-2 mt-1 items-center">
      <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700">
        <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 m-0 cursor-pointer border-none"
        />
      </div>
      <input
        type="text"
        className="input-minimal flex-1 uppercase"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

/* ---------------------- MAIN PANEL ---------------------- */
export const PropertiesPanel = ({ element, onUpdate, onClose }: { element: CanvasElement, onUpdate: (attrs: Partial<CanvasElement>) => void, onClose: () => void }) => {
  if (!element) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full overflow-hidden flex flex-col bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-slate-200 dark:bg-slate-800">
                {element.type === 'text' ? <Type size={14}/> : <ImageIcon size={14}/>}
            </span>
            <h3 className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{element.type}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* POSITION */}
          <Section title="Position">
            <div className="grid grid-cols-2 gap-3">
                <NumberInput label="X" value={Math.round(element.x)} onChange={(x: number) => onUpdate({ x })} />
                <NumberInput label="Y" value={Math.round(element.y)} onChange={(y: number) => onUpdate({ y })} />
            </div>
            <div className="mt-4">
                <Slider label="Rotation" min={0} max={360} value={element.rotation} onChange={(rotation: number) => onUpdate({ rotation })} />
            </div>
          </Section>

          {/* SIZE - RECT */}
          {element.type === "rect" && (
            <Section title="Size">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <NumberInput label="Width" min={10} value={element.width} onChange={(width: number) => onUpdate({ width })} />
                <NumberInput label="Height" min={10} value={element.height} onChange={(height: number) => onUpdate({ height })} />
              </div>
              <Slider
                label="Corner Radius"
                min={0}
                max={Math.min(element.width, element.height) / 2}
                value={element.cornerRadius}
                onChange={(cornerRadius: number) => onUpdate({ cornerRadius })}
              />
            </Section>
          )}

          {/* SIZE - CIRCLE */}
          {element.type === "circle" && (
            <Section title="Size">
              <Slider label="Radius" min={10} max={400} value={element.radius} onChange={(radius: number) => onUpdate({ radius })} />
            </Section>
          )}

          {/* POLYGON */}
          {element.type === "polygon" && (
            <Section title="Polygon">
              <Slider label="Sides" min={3} max={12} value={element.sides} onChange={(sides: number) => onUpdate({ sides })} />
              <Slider label="Radius" min={10} max={400} value={element.radius} onChange={(radius: number) => onUpdate({ radius })} />
            </Section>
          )}

          {/* TEXT CONTROLS - UPDATED */}
          {element.type === "text" && (
            <Section title="Text Content">
              <textarea
                className="input-minimal w-full h-24 p-2 text-sm resize-none"
                value={element.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Enter text here..."
              />

              {/* Font Family */}
              <div>
                <span className="label-subtle">Font Family</span>
                <select
                  className="select-minimal w-full mt-1"
                  value={element.fontFamily}
                  onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                >
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              {/* Style Controls Row */}
              <div className="grid grid-cols-2 gap-3">
                  {/* Weight & Style */}
                  <div>
                    <span className="label-subtle">Style</span>
                    <div className="flex items-center gap-1 mt-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => onUpdate({ fontWeight: element.fontWeight === 700 || element.fontWeight === 'bold' ? 400 : 700 })}
                            className={cn(
                                "flex-1 p-1.5 rounded flex justify-center transition-colors",
                                element.fontWeight === 700 || element.fontWeight === 'bold' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="Bold"
                        >
                            <Bold size={16} />
                        </button>
                        <button 
                            onClick={() => onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })}
                            className={cn(
                                "flex-1 p-1.5 rounded flex justify-center transition-colors",
                                element.fontStyle === 'italic' ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"
                            )}
                            title="Italic"
                        >
                            <Italic size={16} />
                        </button>
                    </div>
                  </div>

                  {/* Alignment */}
                  <div>
                    <span className="label-subtle">Align</span>
                    <div className="flex items-center gap-1 mt-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-800">
                        {([
                            { val: 'left', Icon: AlignLeft },
                            { val: 'center', Icon: AlignCenter },
                            { val: 'right', Icon: AlignRight }
                        ] as const).map(({ val, Icon }) => (
                            <button
                                key={val}
                                onClick={() => onUpdate({ textAlign: val })}
                                className={cn(
                                    "flex-1 p-1.5 rounded flex justify-center transition-colors",
                                    (element.textAlign || 'center') === val ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <Icon size={16} />
                            </button>
                        ))}
                    </div>
                  </div>
              </div>

              <div className="pt-2">
                 <Slider label="Font Size" min={12} max={200} value={element.fontSize} onChange={(fontSize: number) => onUpdate({ fontSize })} />
              </div>
              <div className="pt-2">
                 <Slider label="Maximum Width" min={50} max={800} value={element.width} onChange={(width: number) => onUpdate({ width })} />
              </div>
            </Section>
          )}

          {/* APPEARANCE (Common for all) */}
{/* APPEARANCE */}
<Section title="Appearance">
              <div className="space-y-4">
                {/* Opacity Slider */}
                <Slider 
                    label="Opacity" 
                    min={0} 
                    max={1} 
                    step={0.05} 
                    value={element.opacity ?? 1} 
                    onChange={(opacity: number) => onUpdate({ opacity })} 
                />

                {/* Fill Color - Check ensures element is not an image before accessing .fill */}
                {element.type !== 'image' && (
                    <ColorInput
                        label="Fill Color"
                        value={element.fill}
                        // We cast to 'any' here because partial updates to unions can be strict in TS
                        onChange={(fill: string) => onUpdate({ fill } as any)}
                    />
                )}

                {/* Stroke Controls - Only for Shapes (Rect/Circle/Polygon) */}
                {(element.type === 'rect' || element.type === 'circle' || element.type === 'polygon') && (
                    <>
                        <ColorInput
                            label="Stroke Color"
                            value={element.strokes?.[0]?.color} 
                            onChange={(color: string) => {
                                const current = element.strokes?.[0];
                                const newStroke = { 
                                    color, 
                                    width: current?.width || 2, 
                                    position: current?.position || 'center' 
                                };
                                onUpdate({ strokes: [newStroke as any] });
                            }}
                        />

                        {element.strokes && element.strokes.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <Slider 
                                    label="Stroke Width" 
                                    min={0} 
                                    max={50} 
                                    value={element.strokes[0].width} 
                                    onChange={(width: number) => {
                                        const newStrokes = [...element.strokes!];
                                        newStrokes[0] = { ...newStrokes[0], width };
                                        onUpdate({ strokes: newStrokes });
                                    }}
                                />
                                
                                <div>
                                    <span className="label-subtle">Stroke Position</span>
                                    <select
                                        value={element.strokes[0].position || "center"}
                                        onChange={(e) => {
                                            const newStrokes = [...element.strokes!];
                                            newStrokes[0] = { ...newStrokes[0], position: e.target.value as any };
                                            onUpdate({ strokes: newStrokes });
                                        }}
                                        className="select-minimal w-full mt-1"
                                    >
                                        <option value="inside">Inside</option>
                                        <option value="center">Center</option>
                                        <option value="outside">Outside</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </>
                )}
              </div>
          </Section>

          {/* PHOTO PLACEHOLDER */}
          {element.type !== "text" && (
            <Section title="Interaction">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={element.isPlaceholder}
                  onChange={(e) => onUpdate({ isPlaceholder: e.target.checked })}
                />
                <div className="flex-1">
                    <span className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon size={14} className="text-primary" />
                        User Upload Area
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">Allow users to insert their photo here</p>
                </div>
              </label>
              
              {element.isPlaceholder && (
                <div className="mt-4 space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        <strong>Preview Image:</strong> Upload a temporary image to test how it looks. This won't be saved in the final template.
                    </p>
                  </div>
                  {element.placeholderImage ? (
                    <div className="relative group">
                      <img 
                        src={element.placeholderImage} 
                        alt="Placeholder" 
                        className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100"
                      />
                      <button
                        onClick={() => onUpdate({ placeholderImage: undefined, imageOffsetX: 0, imageOffsetY: 0, imageScale: 1 })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                      <ImageIcon size={24} className="text-slate-400 mb-2" />
                      <span className="text-xs text-slate-500">Click to upload preview</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const src = ev.target?.result as string;
                            onUpdate({ placeholderImage: src, imageOffsetX: 0, imageOffsetY: 0, imageScale: 1 });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </Section>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};