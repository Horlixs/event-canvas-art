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
    whileTap={{ scale: 0.9 }}
    className={cn(
      "p-2 md:p-2.5 rounded-xl text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-all disabled:opacity-20 disabled:cursor-not-allowed active:bg-black/[0.06] dark:active:bg-white/[0.1]",
      className
    )}
    onClick={onClick}
    disabled={disabled}
    title={label}
  >
    {icon}
  </motion.button>
);

const Divider = () => <div className="w-px h-5 bg-black/[0.06] dark:bg-white/[0.06] mx-0.5" />;

export const FloatingToolbar: React.FC<FloatingToolbarProps> = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-0.5 md:gap-1 p-1 md:p-1.5 bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-black/[0.05] dark:border-white/[0.05]"
    >
      <div className="flex items-center">
        <ToolButton icon={<Square size={17} strokeWidth={2}/>} label="Square" onClick={() => props.onAddElement('rect')} />
        <ToolButton icon={<Circle size={17} strokeWidth={2}/>} label="Circle" onClick={() => props.onAddElement('circle')} />
        <ToolButton icon={<Hexagon size={17} strokeWidth={2}/>} label="Polygon" onClick={() => props.onAddElement('polygon')} />
        <ToolButton icon={<Type size={17} strokeWidth={2}/>} label="Text" onClick={() => props.onAddElement('text')} />
      </div>

      {props.hasSelection && (
        <>
          <Divider />
          <div className="flex items-center">
            <ToolButton icon={<Copy size={15}/>} label="Duplicate" onClick={props.onDuplicate} disabled={!props.hasSelection} />
            <ToolButton icon={<ChevronUp size={15}/>} label="Move Up" onClick={props.onMoveUp} disabled={!props.hasSelection} />
            <ToolButton icon={<ChevronDown size={15}/>} label="Move Down" onClick={props.onMoveDown} disabled={!props.hasSelection} />
            <Divider />
            <ToolButton 
              icon={<Trash2 size={15}/>} 
              label="Delete" 
              onClick={props.onDelete} 
              disabled={!props.hasSelection}
              className="hover:text-red-500 hover:bg-red-500/10 active:bg-red-500/15" 
            />
          </div>
        </>
      )}
    </motion.div>
  );
};