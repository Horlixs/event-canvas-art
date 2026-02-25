import React from "react";
import { X, SlidersHorizontal, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ControlRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-30 w-24 shrink-0">{label}</span>
    <div className="flex-1 flex justify-end">{children}</div>
  </div>
);

const ObsidianInput = ({ value, onChange, unit }) => (
  <div className="relative flex items-center bg-black/[0.03] dark:bg-white/[0.04] rounded border border-black/[0.05] dark:border-white/[0.05] px-2 py-1 focus-within:ring-1 ring-blue-500/50 transition-all">
    <input 
      className="bg-transparent border-none text-[11px] font-mono w-14 text-right outline-none text-[#1d1d1f] dark:text-[#f5f5f7]" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
    {unit && <span className="text-[8px] opacity-20 ml-1 font-bold uppercase tracking-tighter">{unit}</span>}
  </div>
);

export const PropertiesPanel = ({ element, onUpdate, onClose }) => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#000] animate-in slide-in-from-right duration-500 ease-out">
      {/* Precision Header */}
      <div className="flex items-center justify-between h-14 px-5 border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-80">Inspector</h3>
        </div>
        <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-12 custom-scrollbar">
        {/* Layout Matrix */}
        <section className="space-y-6">
          <h4 className="text-[9px] font-bold opacity-20 uppercase tracking-[0.3em]">Matrix</h4>
          <div className="grid grid-cols-1 gap-2">
            <ControlRow label="X-Axis"><ObsidianInput value={Math.round(element.x)} onChange={(x) => onUpdate({x: Number(x)})} unit="px"/></ControlRow>
            <ControlRow label="Y-Axis"><ObsidianInput value={Math.round(element.y)} onChange={(y) => onUpdate({y: Number(y)})} unit="px"/></ControlRow>
            <ControlRow label="Rotation"><ObsidianInput value={element.rotation} onChange={(r) => onUpdate({rotation: Number(r)})} unit="°"/></ControlRow>
          </div>
        </section>

        {/* Visual Engine */}
        <section className="space-y-6 pt-6 border-t border-black/[0.05] dark:border-white/[0.05]">
          <h4 className="text-[9px] font-bold opacity-20 uppercase tracking-[0.3em]">Appearance</h4>
          <div className="space-y-6">
            <div className="space-y-3">
               <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest opacity-40">
                  <span>Opacity</span>
                  <span className="font-mono">{Math.round((element.opacity ?? 1) * 100)}%</span>
               </div>
               <input 
                  type="range" className="w-full accent-blue-500 h-[2px] bg-black/[0.05] dark:bg-white/[0.05] appearance-none cursor-pointer"
                  min="0" max="1" step="0.01" value={element.opacity ?? 1} 
                  onChange={e => onUpdate({opacity: Number(e.target.value)})} 
               />
            </div>
            
            <ControlRow label="Hex Fill">
               <div className="flex items-center gap-3 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded border border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-[10px] font-mono uppercase opacity-40 px-2">{element.fill}</span>
                  <div className="w-5 h-5 rounded-sm overflow-hidden relative border border-white/10">
                    <input type="color" className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer bg-transparent" value={element.fill} onChange={e => onUpdate({fill: e.target.value})} />
                  </div>
               </div>
            </ControlRow>
          </div>
        </section>

        {/* Functional States */}
        <section className="space-y-6 pt-6 border-t border-black/[0.05] dark:border-white/[0.05]">
           <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/[0.03] border border-blue-500/10">
              <div className="space-y-1">
                 <p className="text-[11px] font-bold tracking-tight">Placeholder Mode</p>
                 <p className="text-[9px] opacity-40 uppercase tracking-tighter">Enable user uploads</p>
              </div>
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded-full accent-blue-500"
                checked={element.isPlaceholder} 
                onChange={e => onUpdate({isPlaceholder: e.target.checked})} 
              />
           </div>
        </section>
      </div>
    </div>
  );
};