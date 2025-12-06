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
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false 
}) => {
  const variants = {
    default: 'toolbar-btn',
    danger: 'toolbar-btn hover:bg-destructive/10 hover:text-destructive',
    primary: 'toolbar-btn-active',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`${variants[variant]} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {icon}
    </motion.button>
  );
};

const Divider = () => (
  <div className="w-px h-6 bg-border mx-1" />
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
      className="floating-toolbar"
    >
      {/* Shape Tools */}
      <ToolButton
        icon={<Square size={18} strokeWidth={1.5} />}
        label="Add Rectangle"
        onClick={() => onAddElement('rect')}
      />
      <ToolButton
        icon={<Circle size={18} strokeWidth={1.5} />}
        label="Add Circle"
        onClick={() => onAddElement('circle')}
      />
      <ToolButton
        icon={<Hexagon size={18} strokeWidth={1.5} />}
        label="Add Polygon"
        onClick={() => onAddElement('polygon')}
      />
      <ToolButton
        icon={<Type size={18} strokeWidth={1.5} />}
        label="Add Text"
        onClick={() => onAddElement('text')}
      />

      <Divider />

      {/* Selection Tools */}
      <ToolButton
        icon={<Copy size={18} strokeWidth={1.5} />}
        label="Duplicate"
        onClick={() => onDuplicate?.()}
        disabled={!hasSelection}
      />
      <ToolButton
        icon={<ChevronUp size={18} strokeWidth={1.5} />}
        label="Move Forward"
        onClick={() => onMoveUp?.()}
        disabled={!hasSelection}
      />
      <ToolButton
        icon={<ChevronDown size={18} strokeWidth={1.5} />}
        label="Move Backward"
        onClick={() => onMoveDown?.()}
        disabled={!hasSelection}
      />
      <ToolButton
        icon={<Trash2 size={18} strokeWidth={1.5} />}
        label="Delete"
        onClick={() => onDelete?.()}
        variant="danger"
        disabled={!hasSelection}
      />

      <Divider />

      {/* Publish */}
      <ToolButton
        icon={<Share2 size={18} strokeWidth={1.5} />}
        label="Publish & Get Link"
        onClick={onPublish}
        variant="primary"
        disabled={isPublishing}
      />
    </motion.div>
  );
};
