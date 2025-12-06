import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImageIcon } from 'lucide-react';
import { CanvasElement } from '@/types/editor';

interface PropertiesPanelProps {
  element: CanvasElement | null;
  onUpdate: (updates: Partial<CanvasElement>) => void;
  onClose: () => void;
}

const GOOGLE_FONTS = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Oswald', value: 'Oswald' },
  { name: 'Lobster', value: 'Lobster' },
];

const ColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="label-subtle">{label}</span>
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg border border-border cursor-pointer overflow-hidden"
        style={{ backgroundColor: value || 'transparent' }}
      >
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="transparent"
        className="input-minimal w-24 text-xs"
      />
    </div>
  </div>
);

const SliderInput: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step = 1, onChange, unit = '' }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="label-subtle">{label}</span>
      <span className="text-sm text-muted-foreground">{value}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:w-4
        [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-primary
        [&::-webkit-slider-thumb]:shadow-md
        [&::-webkit-slider-thumb]:cursor-grab
        [&::-webkit-slider-thumb]:active:cursor-grabbing"
    />
  </div>
);

const NumberInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, min, max }) => (
  <div className="flex items-center justify-between">
    <span className="label-subtle">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="input-minimal w-20 text-right"
    />
  </div>
);

const Toggle: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}> = ({ label, description, checked, onChange, icon }) => (
  <div 
    className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
    onClick={() => onChange(!checked)}
  >
    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
      checked ? 'bg-primary border-primary' : 'border-border'
    }`}>
      {checked && (
        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  </div>
);

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  onUpdate,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {element && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-4 top-4 bottom-4 w-80 glass-panel overflow-hidden flex flex-col z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-medium text-sm capitalize">{element.type} Properties</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Position */}
            <div className="panel-section space-y-3">
              <h4 className="label-subtle">Position</h4>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  label="X"
                  value={Math.round(element.x)}
                  onChange={(x) => onUpdate({ x })}
                />
                <NumberInput
                  label="Y"
                  value={Math.round(element.y)}
                  onChange={(y) => onUpdate({ y })}
                />
              </div>
              <SliderInput
                label="Rotation"
                value={element.rotation}
                min={0}
                max={360}
                onChange={(rotation) => onUpdate({ rotation })}
                unit="°"
              />
            </div>

            {/* Size (for shapes) */}
            {element.type === 'rect' && (
              <div className="panel-section space-y-3">
                <h4 className="label-subtle">Size</h4>
                <NumberInput
                  label="Width"
                  value={element.width}
                  onChange={(width) => onUpdate({ width })}
                  min={10}
                />
                <NumberInput
                  label="Height"
                  value={element.height}
                  onChange={(height) => onUpdate({ height })}
                  min={10}
                />
                <SliderInput
                  label="Corner Radius"
                  value={element.cornerRadius}
                  min={0}
                  max={Math.min(element.width, element.height) / 2}
                  onChange={(cornerRadius) => onUpdate({ cornerRadius })}
                  unit="px"
                />
              </div>
            )}

            {element.type === 'circle' && (
              <div className="panel-section space-y-3">
                <h4 className="label-subtle">Size</h4>
                <SliderInput
                  label="Radius"
                  value={element.radius}
                  min={10}
                  max={500}
                  onChange={(radius) => onUpdate({ radius })}
                  unit="px"
                />
              </div>
            )}

            {element.type === 'polygon' && (
              <div className="panel-section space-y-3">
                <h4 className="label-subtle">Shape</h4>
                <SliderInput
                  label="Sides"
                  value={element.sides}
                  min={3}
                  max={12}
                  onChange={(sides) => onUpdate({ sides })}
                />
                <SliderInput
                  label="Radius"
                  value={element.radius}
                  min={10}
                  max={500}
                  onChange={(radius) => onUpdate({ radius })}
                  unit="px"
                />
              </div>
            )}

            {/* Text Properties */}
            {element.type === 'text' && (
              <div className="panel-section space-y-3">
                <h4 className="label-subtle">Text</h4>
                <textarea
                  value={element.text}
                  onChange={(e) => onUpdate({ text: e.target.value })}
                  className="input-minimal w-full resize-none h-20"
                  placeholder="Enter text..."
                />
                <div className="space-y-2">
                  <span className="label-subtle">Font Family</span>
                  <select
                    value={element.fontFamily}
                    onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    className="select-minimal w-full"
                  >
                    {GOOGLE_FONTS.map((font) => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                </div>
                <SliderInput
                  label="Font Size"
                  value={element.fontSize}
                  min={12}
                  max={200}
                  onChange={(fontSize) => onUpdate({ fontSize })}
                  unit="px"
                />
              </div>
            )}

            {/* Colors */}
            <div className="panel-section space-y-3">
              <h4 className="label-subtle">Appearance</h4>
              <ColorInput
                label="Fill"
                value={element.fill}
                onChange={(fill) => onUpdate({ fill })}
              />
              <ColorInput
                label="Stroke"
                value={element.stroke}
                onChange={(stroke) => onUpdate({ stroke })}
              />
              {element.stroke && (
                <SliderInput
                  label="Stroke Width"
                  value={element.strokeWidth}
                  min={0}
                  max={20}
                  onChange={(strokeWidth) => onUpdate({ strokeWidth })}
                  unit="px"
                />
              )}
            </div>

            {/* Placeholder Toggle (for shapes only) */}
            {element.type !== 'text' && (
              <div className="panel-section">
                <Toggle
                  label="Photo Placeholder"
                  description="User's photo will fill this shape"
                  checked={element.isPlaceholder}
                  onChange={(isPlaceholder) => onUpdate({ isPlaceholder })}
                  icon={<ImageIcon size={14} className="text-primary" />}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
