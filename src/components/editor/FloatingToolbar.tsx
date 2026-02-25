import React from 'react';
import { motion } from 'framer-motion';
import { 
  Square, Circle, Hexagon, Type, 
  Share2, Trash2, Copy, ChevronUp, ChevronDown 
} from 'lucide-react';
import { ShapeType } from '@/types/editor';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  onAddElement: (type: ShapeType) => void;
  onPublish: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  hasSelection: boolean;
  isPublishing?: boolean;
}

const ToolButton = ({ icon, label, onClick, disabled = false, className = "" }: any) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={cn(
      "p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-black/[0.04] dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-all disabled:opacity-20 disabled:cursor-not-allowed",
      className
    )}
    onClick={onClick}
    disabled={disabled}
    title={label}
  >
    {icon}
  </motion.button>
);

const Divider = () => <div className="w-px h-6 bg-black/[0.08] dark:bg-white/[0.08] mx-1" />;

export const FloatingToolbar: React.FC<FloatingToolbarProps> = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-3xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black/[0.05] dark:border-white/[0.05]"
    >
      <div className="flex items-center">
        <ToolButton icon={<Square size={19} strokeWidth={2.5}/>} label="Square" onClick={() => props.onAddElement('rect')} />
        <ToolButton icon={<Circle size={19} strokeWidth={2.5}/>} label="Circle" onClick={() => props.onAddElement('circle')} />
        <ToolButton icon={<Hexagon size={19} strokeWidth={2.5}/>} label="Polygon" onClick={() => props.onAddElement('polygon')} />
        <ToolButton icon={<Type size={19} strokeWidth={2.5}/>} label="Text" onClick={() => props.onAddElement('text')} />
      </div>

      <Divider />

      <div className="flex items-center">
        <ToolButton icon={<Copy size={18}/>} label="Duplicate" onClick={props.onDuplicate} disabled={!props.hasSelection} />
        <ToolButton icon={<ChevronUp size={18}/>} label="Move Up" onClick={props.onMoveUp} disabled={!props.hasSelection} />
        <ToolButton icon={<ChevronDown size={18}/>} label="Move Down" onClick={props.onMoveDown} disabled={!props.hasSelection} />
      </div>

      <Divider />

      <ToolButton 
        icon={<Trash2 size={18}/>} 
        label="Delete" 
        onClick={props.onDelete} 
        disabled={!props.hasSelection}
        className="hover:text-red-500 hover:bg-red-500/10" 
      />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={props.onPublish}
        disabled={props.isPublishing}
        className="ml-2 h-10 px-5 flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50"
      >
        <Share2 size={16} strokeWidth={3} />
        <span className="font-bold text-[12px]">Publish</span>
      </motion.button>
    </motion.div>
  );
};