import React, { useRef, useEffect, useCallback, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Color conversion helpers ──────────────────────────────────────────

function hexToHSV(hex: string): { h: number; s: number; v: number } {
  let r = 0, g = 0, b = 0;
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const s = max === 0 ? 0 : d / max;
  return { h: h * 360, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const hh = h / 60;
  const c = v * s;
  const x = c * (1 - Math.abs(hh % 2 - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
  else if (hh >= 1 && hh < 2) { r = x; g = c; b = 0; }
  else if (hh >= 2 && hh < 3) { r = 0; g = c; b = x; }
  else if (hh >= 3 && hh < 4) { r = 0; g = x; b = c; }
  else if (hh >= 4 && hh < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

function isValidHex(hex: string): boolean {
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

function normalizeHex(hex: string): string {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  return `#${clean.toLowerCase()}`;
}

// ── Saturation/Brightness panel ─────────────────────────────────────

const SatBrightPanel: React.FC<{
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (s: number, v: number) => void;
}> = ({ hue, saturation, brightness, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const WIDTH = 256;
  const HEIGHT = 180;

  // Draw the gradient
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Base hue fill
    ctx.fillStyle = hueToHex(hue);
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // White gradient left → right
    const whiteGrad = ctx.createLinearGradient(0, 0, WIDTH, 0);
    whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
    whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Black gradient top → bottom
    const blackGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }, [hue]);

  const handlePointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, WIDTH));
    const y = Math.max(0, Math.min(e.clientY - rect.top, HEIGHT));
    const s = x / WIDTH;
    const v = 1 - y / HEIGHT;
    onChange(s, v);
  }, [onChange]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e);
  }, [handlePointer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    handlePointer(e);
  }, [handlePointer]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const cursorX = saturation * WIDTH;
  const cursorY = (1 - brightness) * HEIGHT;

  return (
    <div
      ref={containerRef}
      className="relative cursor-crosshair rounded-lg overflow-hidden"
      style={{ width: WIDTH, height: HEIGHT }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block w-full h-full" />
      {/* Picker cursor */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: cursorX - 8,
          top: cursorY - 8,
          width: 16,
          height: 16,
        }}
      >
        <div className="w-full h-full rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_8px_rgba(0,0,0,0.3)]" />
      </div>
    </div>
  );
};

// ── Hue Slider ──────────────────────────────────────────────────────

const HueSlider: React.FC<{
  hue: number;
  onChange: (h: number) => void;
}> = ({ hue, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const WIDTH = 256;

  const handlePointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, WIDTH));
    onChange((x / WIDTH) * 360);
  }, [onChange]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e);
  }, [handlePointer]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    handlePointer(e);
  }, [handlePointer]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const cursorX = (hue / 360) * WIDTH;

  return (
    <div
      ref={containerRef}
      className="relative cursor-pointer rounded-full h-3"
      style={{
        width: WIDTH,
        background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: cursorX - 7 }}
      >
        <div className="w-[14px] h-[14px] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.15),0_1px_4px_rgba(0,0,0,0.3)]"
          style={{ backgroundColor: hueToHex(hue) }}
        />
      </div>
    </div>
  );
};

// ── Preset swatches ────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ffffff", "#f3f4f6", "#d1d5db", "#9ca3af", "#6b7280", "#374151", "#1f2937", "#000000",
  "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b",
  "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412",
  "#fde047", "#facc15", "#eab308", "#ca8a04", "#a16207", "#854d0e",
  "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534",
  "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1", "#075985",
  "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6",
  "#f9a8d4", "#f472b6", "#ec4899", "#db2777", "#be185d", "#9d174d",
];

// ── Main ColorPicker Component ──────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState(value);
  const hsv = hexToHSV(value);
  const [hue, setHue] = useState(hsv.h);
  const [saturation, setSaturation] = useState(hsv.s);
  const [brightness, setBrightness] = useState(hsv.v);

  // Sync internal state when value prop changes externally
  useEffect(() => {
    const newHsv = hexToHSV(value);
    setHue(newHsv.h);
    setSaturation(newHsv.s);
    setBrightness(newHsv.v);
    setHexInput(value);
  }, [value]);

  const handleSatBrightChange = useCallback((s: number, v: number) => {
    setSaturation(s);
    setBrightness(v);
    const newHex = hsvToHex(hue, s, v);
    setHexInput(newHex);
    onChange(newHex);
  }, [hue, onChange]);

  const handleHueChange = useCallback((h: number) => {
    setHue(h);
    const newHex = hsvToHex(h, saturation, brightness);
    setHexInput(newHex);
    onChange(newHex);
  }, [saturation, brightness, onChange]);

  const handleHexInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setHexInput(val);
    if (!val.startsWith("#")) val = "#" + val;
    if (isValidHex(val)) {
      const normalized = normalizeHex(val);
      const newHsv = hexToHSV(normalized);
      setHue(newHsv.h);
      setSaturation(newHsv.s);
      setBrightness(newHsv.v);
      onChange(normalized);
    }
  }, [onChange]);

  const handleHexInputBlur = useCallback(() => {
    // Normalize on blur
    let val = hexInput;
    if (!val.startsWith("#")) val = "#" + val;
    if (isValidHex(val)) {
      const normalized = normalizeHex(val);
      setHexInput(normalized);
      onChange(normalized);
    } else {
      setHexInput(value);
    }
  }, [hexInput, value, onChange]);

  const handleHexKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleHexInputBlur();
    }
  }, [handleHexInputBlur]);

  const handleEyeDropper = useCallback(async () => {
    if (!("EyeDropper" in window)) {
      return;
    }
    try {
      // @ts-ignore — EyeDropper API
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        const hex = result.sRGBHex.toLowerCase();
        const newHsv = hexToHSV(hex);
        setHue(newHsv.h);
        setSaturation(newHsv.s);
        setBrightness(newHsv.v);
        setHexInput(hex);
        onChange(hex);
      }
    } catch {
      // User cancelled
    }
  }, [onChange]);

  const handlePresetClick = useCallback((color: string) => {
    const newHsv = hexToHSV(color);
    setHue(newHsv.h);
    setSaturation(newHsv.s);
    setBrightness(newHsv.v);
    setHexInput(color);
    onChange(color);
  }, [onChange]);

  const currentColor = hsvToHex(hue, saturation, brightness);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 bg-black/[0.03] dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors cursor-pointer",
            className,
          )}
        >
          <div
            className="w-5 h-5 rounded-md border border-black/10 dark:border-white/10 flex-shrink-0"
            style={{ backgroundColor: value }}
          />
          <span className="text-[11px] font-mono uppercase text-[#86868b]">{value}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="left"
        sideOffset={8}
        className="w-auto p-0 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1c1c1e] shadow-2xl z-[100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 space-y-3" style={{ width: 280 }}>
          {/* Saturation / Brightness gradient */}
          <SatBrightPanel
            hue={hue}
            saturation={saturation}
            brightness={brightness}
            onChange={handleSatBrightChange}
          />

          {/* Hue slider */}
          <div className="px-1">
            <HueSlider hue={hue} onChange={handleHueChange} />
          </div>

          {/* Hex input + eyedropper + preview */}
          <div className="flex items-center gap-2 px-1">
            {/* Eyedropper */}
            {"EyeDropper" in window && (
              <button
                onClick={handleEyeDropper}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-[#86868b] hover:text-foreground"
                title="Pick color from screen"
              >
                <Pipette className="w-4 h-4" />
              </button>
            )}

            {/* Hex field */}
            <div className="flex items-center flex-1 h-8 rounded-lg border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.03] dark:bg-white/[0.04] overflow-hidden">
              <span className="text-[11px] text-[#86868b] pl-2.5 select-none">#</span>
              <input
                type="text"
                className="flex-1 bg-transparent text-[12px] font-mono uppercase outline-none px-1 h-full text-foreground"
                value={hexInput.replace("#", "")}
                onChange={handleHexInputChange}
                onBlur={handleHexInputBlur}
                onKeyDown={handleHexKeyDown}
                maxLength={6}
                spellCheck={false}
              />
            </div>

            {/* Current color preview */}
            <div
              className="w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 flex-shrink-0"
              style={{ backgroundColor: currentColor }}
            />
          </div>

          {/* Preset swatches */}
          <div className="px-1 pt-1">
            <p className="text-[10px] font-medium text-[#86868b] uppercase tracking-wider mb-2">Swatches</p>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handlePresetClick(c)}
                  className={cn(
                    "w-full aspect-square rounded-md border transition-all hover:scale-110 active:scale-90",
                    value.toLowerCase() === c
                      ? "border-blue-500 ring-2 ring-blue-500/30"
                      : "border-black/[0.06] dark:border-white/[0.08]",
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
