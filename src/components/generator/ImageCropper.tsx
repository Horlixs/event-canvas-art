import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion } from 'framer-motion';
import { Check, X, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  aspectRatio,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImageUrl = canvas.toDataURL('image/png', 1.0);
    onCropComplete(croppedImageUrl);
  }, [completedCrop, onCropComplete]);

  const handleReset = useCallback(() => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  }, [aspectRatio]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-[#1c1c1e] rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-lg max-h-[90dvh] overflow-hidden flex flex-col border border-black/5 dark:border-white/10"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">Crop Photo</h2>
            <p className="text-[12px] text-[#86868b] mt-0.5">Adjust to fit the placeholder</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95"
          >
            <X size={18} className="text-[#86868b]" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#f5f5f7] dark:bg-[#080808] min-h-[200px]">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspectRatio}
            className="max-h-[50dvh]"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[50dvh] max-w-full object-contain"
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between shrink-0 safe-bottom">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleCropComplete}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <Check size={14} />
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
