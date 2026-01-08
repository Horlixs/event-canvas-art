import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ImageIcon } from "lucide-react";
import { CanvasElement } from "@/types/editor";

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
const TextInput = ({ label, value, onChange }: any) => (
  <div>
    <span className="label-subtle">{label}</span>
    <input
      className="input-minimal w-full mt-1"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

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
      <span className="text-xs">{value}</span>
    </div>
    <input
      type="range"
      className="w-full"
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
      <input
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-sm border cursor-pointer"
      />
      <input
        type="text"
        className="input-minimal w-24"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

/* ---------------------- MAIN PANEL ---------------------- */
export const PropertiesPanel = ({ element, onUpdate, onClose }: any) => {
  if (!element) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-sm height-10 font-semibold capitalize text-slate-900 dark:text-white">{element.type} Properties</h3>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* POSITION */}
          <Section title="Position">
            <NumberInput label="X" value={Math.round(element.x)} onChange={(x) => onUpdate({ x })} />
            <NumberInput label="Y" value={Math.round(element.y)} onChange={(y) => onUpdate({ y })} />
            <Slider label="Rotation" min={0} max={360} value={element.rotation} onChange={(rotation) => onUpdate({ rotation })} />
          </Section>

          {/* SIZE - RECT */}
          {element.type === "rect" && (
            <Section title="Size">
              <NumberInput label="Width" min={10} value={element.width} onChange={(width) => onUpdate({ width })} />
              <NumberInput label="Height" min={10} value={element.height} onChange={(height) => onUpdate({ height })} />
              <Slider
                label="Corner Radius"
                min={0}
                max={Math.min(element.width, element.height) / 2}
                value={element.cornerRadius}
                onChange={(cornerRadius) => onUpdate({ cornerRadius })}
              />
            </Section>
          )}

          {/* SIZE - CIRCLE */}
          {element.type === "circle" && (
            <Section title="Size">
              <Slider label="Radius" min={10} max={400} value={element.radius} onChange={(radius) => onUpdate({ radius })} />
            </Section>
          )}

          {/* POLYGON */}
          {element.type === "polygon" && (
            <Section title="Polygon">
              <Slider label="Sides" min={3} max={12} value={element.sides} onChange={(sides) => onUpdate({ sides })} />
              <Slider label="Radius" min={10} max={400} value={element.radius} onChange={(radius) => onUpdate({ radius })} />
            </Section>
          )}

          {/* TEXT */}
          {element.type === "text" && (
            <Section title="Text">
              <textarea
                className="input-minimal w-full h-20"
                value={element.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
              />

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

              <Slider label="Font Size" min={12} max={200} value={element.fontSize} onChange={(fontSize) => onUpdate({ fontSize })} />
              <Slider label="Max Width" min={50} max={700} value={element.width} onChange={(width) => onUpdate({ width })} />
            </Section>
          )}

          {/* APPEARANCE */}
{/* Colors + Stroke Controls */}
<div className="panel-section space-y-4">
  <h4 className="label-subtle">Appearance</h4>

  {/* Fill */}
  <ColorInput
    label="Fill"
    value={element.fill}
    onChange={(fill) => onUpdate({ fill })}
  />

  {/* Stroke */}
  <ColorInput
    label="Stroke"
    value={element.stroke}
    onChange={(stroke) => onUpdate({ stroke })}
  />

  {/* Stroke Width + Manual Input */}
  {element.stroke && (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label-subtle">Stroke Width</span>
        <span className="text-sm text-muted-foreground">
          {element.strokeWidth}px
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={50}
          value={element.strokeWidth}
          onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
          className="input-minimal w-20 text-right"
        />

        <input
          type="range"
          min={0}
          max={50}
          value={element.strokeWidth}
          onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })}
          className="flex-1 h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary"
        />
      </div>
    </div>
  )}

  {/* Stroke Position Selector */}
  {element.stroke && (
    <div className="space-y-2">
      <label className="label-subtle">Stroke Position</label>
      <select
        value={element.strokePosition || "center"}
        onChange={(e) => onUpdate({ strokePosition: e.target.value })}
        className="select-minimal w-full"
      >
        <option value="inside">Inside</option>
        <option value="center">Center</option>
        <option value="outside">Outside</option>
      </select>
    </div>
  )}
</div>

          {/* PHOTO PLACEHOLDER */}
          {element.type !== "text" && (
            <Section title="Photo Placeholder">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={element.isPlaceholder}
                  onChange={(e) => onUpdate({ isPlaceholder: e.target.checked })}
                />
                <ImageIcon size={14} className="text-primary" />
                <span className="text-sm">Enable Placeholder</span>
              </label>
              
              {element.isPlaceholder && (
                <div className="space-y-3">
                  {element.placeholderImage ? (
                    <div className="relative">
                      <img 
                        src={element.placeholderImage} 
                        alt="Placeholder" 
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <button
                        onClick={() => onUpdate({ placeholderImage: undefined, imageOffsetX: 0, imageOffsetY: 0, imageScale: 1 })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <ImageIcon size={24} className="text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Click to upload image</span>
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
                  
                  {element.placeholderImage && (
                    <div className="space-y-2">
                      <Slider
                        label="Image Zoom"
                        min={0.5}
                        max={3}
                        step={0.1}
                        value={element.imageScale || 1}
                        onChange={(imageScale) => onUpdate({ imageScale })}
                      />
                      <div className="text-xs text-muted-foreground">
                        Tip: Drag the image inside the shape to reposition it
                      </div>
                    </div>
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
