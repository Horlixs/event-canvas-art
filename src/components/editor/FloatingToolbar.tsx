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

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
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
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        // Increased padding (p-3) and base size for better visibility
        "p-3 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent",
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
  <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 mx-1.5" />
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      // Added shadow-xl and backdrop-blur for a more 'substantial' feel
      className="flex items-center gap-1 p-2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-neutral-200/50 dark:border-neutral-800/50"
    >
      {/* --- Section 1: Shape Tools --- */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon={<Square size={22} strokeWidth={2} />}
          label="Add Rectangle"
          onClick={() => onAddElement('rect')}
        />
        <ToolButton
          icon={<Circle size={22} strokeWidth={2} />}
          label="Add Circle"
          onClick={() => onAddElement('circle')}
        />
        <ToolButton
          icon={<Hexagon size={22} strokeWidth={2} />}
          label="Add Polygon"
          onClick={() => onAddElement('polygon')}
        />
        <ToolButton
          icon={<Type size={22} strokeWidth={2} />}
          label="Add Text"
          onClick={() => onAddElement('text')}
        />
      </div>

      <Divider />

      {/* --- Section 2: Manipulation Tools --- */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon={<Copy size={22} strokeWidth={2} />}
          label="Duplicate"
          onClick={() => onDuplicate?.()}
          disabled={!hasSelection}
        />
        <ToolButton
          icon={<ChevronUp size={22} strokeWidth={2} />}
          label="Move Forward"
          onClick={() => onMoveUp?.()}
          disabled={!hasSelection}
        />
        <ToolButton
          icon={<ChevronDown size={22} strokeWidth={2} />}
          label="Move Backward"
          onClick={() => onMoveDown?.()}
          disabled={!hasSelection}
        />
      </div>

      <Divider />

      {/* --- Section 3: Delete --- */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon={<Trash2 size={22} strokeWidth={2} />}
          label="Delete"
          onClick={() => onDelete?.()}
          className="hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30"
          disabled={!hasSelection}
        />
      </div>

      <Divider />

      {/* --- Section 4: Publish --- */}
      <div className="pl-1 pr-1">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPublish}
          disabled={isPublishing}
          // Made this button larger and more prominent
          className="h-12 px-6 flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/80 text-white shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none"
          title="Publish Campaign"
        >
          <Share2 size={20} strokeWidth={2.5} />
          <span className="font-semibold text-sm">Publish</span>
        </motion.button>
      </div>
    </motion.div>
  );
};