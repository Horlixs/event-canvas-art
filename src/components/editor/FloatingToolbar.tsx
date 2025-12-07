import React from 'react';
import { motion } from 'framer-motion';
import { 
  Square, 
  Circle, 
  Hexagon, 
  Type, 
  Share2,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ShapeType } from '@/types/editor';
import { cn } from '@/lib/utils'; // Assuming you have this, if not, standard template literals work too

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

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string; // Allow custom styles
  isActive?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  disabled = false,
  className,
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "p-2.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        className
      )}
      onClick={onClick}
      disabled={disabled}
      title={label}
      type="button"
    >
      {icon}
    </motion.button>
  );
};

const Divider = () => (
  <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1" />
);

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onAddElement,
  onPublish,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  hasSelection,
  isPublishing = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-1 p-2 bg-white dark:bg-neutral-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-200 dark:border-neutral-800"
    >
      {/* --- Section 1: Shape Tools --- */}
      <div className="flex items-center gap-1 px-1">
        <ToolButton
          icon={<Square size={18} strokeWidth={2} />}
          label="Add Rectangle"
          onClick={() => onAddElement('rect')}
        />
        <ToolButton
          icon={<Circle size={18} strokeWidth={2} />}
          label="Add Circle"
          onClick={() => onAddElement('circle')}
        />
        <ToolButton
          icon={<Hexagon size={18} strokeWidth={2} />}
          label="Add Polygon"
          onClick={() => onAddElement('polygon')}
        />
        <ToolButton
          icon={<Type size={18} strokeWidth={2} />}
          label="Add Text"
          onClick={() => onAddElement('text')}
        />
      </div>

      <Divider />

      {/* --- Section 2: Manipulation Tools --- */}
      <div className="flex items-center gap-1 px-1">
        <ToolButton
          icon={<Copy size={18} strokeWidth={2} />}
          label="Duplicate"
          onClick={() => onDuplicate?.()}
          disabled={!hasSelection}
        />
        <ToolButton
          icon={<ChevronUp size={18} strokeWidth={2} />}
          label="Move Forward"
          onClick={() => onMoveUp?.()}
          disabled={!hasSelection}
        />
        <ToolButton
          icon={<ChevronDown size={18} strokeWidth={2} />}
          label="Move Backward"
          onClick={() => onMoveDown?.()}
          disabled={!hasSelection}
        />
      </div>

      <Divider />

      {/* --- Section 3: Delete --- */}
      <div className="flex items-center gap-1 px-1">
        <ToolButton
          icon={<Trash2 size={18} strokeWidth={2} />}
          label="Delete"
          onClick={() => onDelete?.()}
          className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          disabled={!hasSelection}
        />
      </div>

      <Divider />

      {/* --- Section 4: Publish --- */}
      <div className="pl-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPublish}
          disabled={isPublishing}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-primary hover:bg-slate-900 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Publish & Share"
        >
          <Share2 size={18} strokeWidth={2} />
        </motion.button>
      </div>
    </motion.div>
  );
};