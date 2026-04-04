import React, { useRef, useCallback, useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Stage, Layer, Rect, Circle, Line, Text, Image as KonvaImage, Group } from 'react-konva';
import { 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  Type,
  Share2,
  Check,
  Camera,
  ChevronUp,
  Sparkles,
  Link2,
  ExternalLink,
  PartyPopper,
  X,
  CalendarCheck
} from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { CanvasElement, TemplateData, TextElement } from '@/types/editor';
import { toast } from 'sonner';
import { getTemplateBySlug } from '@/lib/templates';
import { incrementTemplateStat } from '@/lib/templates';
import useImage from 'use-image';
import { ImageCropper } from './ImageCropper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { wrapText } from '@/lib/textUtils';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/AuthModal';
import { useGeneratorState } from '@/hooks/useGeneratorState';

// --- HELPER: Background Image ---
const BackgroundImage: React.FC<{ src: string; width: number; height: number }> = ({ src, width, height }) => {
  const [image] = useImage(src);
  
  if (!image) return null;
  
  const imgElement = image as HTMLImageElement;
  const imgWidth = imgElement.naturalWidth || 1;
  const imgHeight = imgElement.naturalHeight || 1;
  const ratio = Math.max(width / imgWidth, height / imgHeight);
  
  return (
    <KonvaImage 
      image={image} 
      width={imgWidth * ratio}
      height={imgHeight * ratio}
      x={(width - imgWidth * ratio) / 2}
      y={(height - imgHeight * ratio) / 2}
    />
  );
};

// --- HELPER: Shape with User Image Support ---
const URLImageShape: React.FC<{ 
  element: CanvasElement; 
  src?: string; 
  children?: React.ReactNode 
}> = ({ element, src, children }) => {
  const [image] = useImage(src || '', 'anonymous');

  const patternFill = useMemo(() => {
    if (!image || !src) return null;

    let sw = 0, sh = 0;
    if (element.type === 'circle' || element.type === 'polygon') {
      sw = element.radius * 2;
      sh = element.radius * 2;
    } else if ('width' in element && 'height' in element) {
      sw = element.width;
      sh = element.height;
    }
    if (sw === 0 || sh === 0) return null;

    const scale = Math.max(sw / image.width, sh / image.height);
    const ox = (image.width * scale - sw) / 2;
    const oy = (image.height * scale - sh) / 2;

    return {
      fillPatternImage: image,
      fillPatternScaleX: scale,
      fillPatternScaleY: scale,
      fillPatternOffsetX: ox / scale,
      fillPatternOffsetY: oy / scale,
    };
  }, [image, src, element]);

  const shapeFill: any = patternFill || { fill: 'fill' in element ? (element as any).fill : undefined };

  const shapeStroke: any = {
    stroke: element.stroke || '',
    strokeWidth: element.strokeWidth || 0,
  };

  return (
    <Group x={element.x} y={element.y} rotation={element.rotation} opacity={element.opacity ?? 1}>
      {children}
      {element.type === 'rect' && (
        <Rect
          width={element.width}
          height={element.height}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          cornerRadius={element.cornerRadius}
          listening={element.isPlaceholder}
          {...shapeFill}
          {...shapeStroke}
        />
      )}
      {element.type === 'circle' && (
        <Circle
          radius={element.radius}
          listening={element.isPlaceholder}
          {...shapeFill}
          {...shapeStroke}
        />
      )}
      {element.type === 'polygon' && (() => {
        const sides = (element as any).sides || 6;
        const r = element.radius;
        const points: number[] = [];
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          points.push(r * Math.cos(angle), r * Math.sin(angle));
        }
        return <Line points={points} closed listening={element.isPlaceholder} {...shapeFill} {...shapeStroke} />;
      })()}
      {element.type === 'image' && (
        <Rect
          width={element.width}
          height={element.height}
          offsetX={element.width / 2}
          offsetY={element.height / 2}
          listening={element.isPlaceholder}
          {...shapeFill}
        />
      )}
    </Group>
  );
};

// --- HELPER: Watermark Text ---
const WatermarkText: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const fontSize = Math.max(8, Math.round(width * 0.018));
  const padding = Math.round(width * 0.024);
  const text = 'Made with Dummmy.me';
  const estimatedWidth = Math.round(text.length * fontSize * 0.55);
  return (
    <Text
      text={text}
      fontSize={fontSize}
      fontFamily="Inter, Arial, sans-serif"
      fontStyle="600"
      fill="rgba(255,255,255,0.88)"
      x={width - estimatedWidth - padding}
      y={height - fontSize - padding}
      opacity={0.85}
      shadowColor="rgba(0,0,0,0.4)"
      shadowBlur={4}
      shadowOffsetX={1}
      shadowOffsetY={1}
      listening={false}
    />
  );
};

// --- HELPER: Main Shape Renderer ---
const RenderShape: React.FC<{ element: CanvasElement; userImage?: string }> = ({ element, userImage }) => {
  if (element.type === 'text') {
    return (
      <Group
        x={element.x}
        y={element.y}
        rotation={element.rotation}
        opacity={element.opacity ?? 1}
      >
        <Text
          text={wrapText(
            element.text,
            element.width,
            element.fontSize,
            element.fontFamily,
            element.fontWeight || 400,
            element.fontStyle || 'normal',
          )}
          width={element.width}
          offsetX={element.width / 2}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={`${element.fontWeight || 400} ${element.fontStyle || 'normal'}`}
          fill={element.fill}
          stroke={element.stroke || ''}
          strokeWidth={element.strokeWidth || 0}
          align={element.textAlign || 'center'}
          wrap="none"
        />
      </Group>
    );
  }

  const strokes = (
    <>
      {element.strokes?.map((s, i) => {
        if (element.type === 'rect') {
          return (
            <Rect
              key={i}
              width={element.width + s.width}
              height={element.height + s.width}
              offsetX={(element.width + s.width) / 2}
              offsetY={(element.height + s.width) / 2}
              fill={s.color}
              listening={false}
            />
          );
        }
        if (element.type === 'circle') return <Circle key={i} radius={element.radius + s.width / 2} fill={s.color} listening={false} />;
        return null;
      })}
    </>
  );

  return <URLImageShape element={element} src={userImage}>{strokes}</URLImageShape>;
};

// --- LOADING SKELETON ---
const GeneratorSkeleton: React.FC = () => (
  <div className="h-[100dvh] flex flex-col bg-[#fafafa] dark:bg-[#000]">
    <div className="h-12 border-b border-black/5 dark:border-white/5 flex items-center px-4 gap-3">
      <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 animate-pulse" />
      <div className="w-32 h-4 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
    </div>
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Loading your design</p>
          <p className="text-xs text-[#86868b]">Setting things up...</p>
        </div>
      </div>
    </div>
  </div>
);

// --- ERROR STATE ---
const BrokenCanvasIllustration: React.FC = () => (
  <svg viewBox="0 0 280 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[280px]">
    {/* Easel legs */}
    <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <line x1="90" y1="160" x2="70" y2="210" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#c7c7cc] dark:text-[#48484a]" />
      <line x1="190" y1="160" x2="210" y2="210" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#c7c7cc] dark:text-[#48484a]" />
      <line x1="140" y1="160" x2="140" y2="205" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-[#c7c7cc] dark:text-[#48484a]" />
    </motion.g>
    {/* Canvas frame */}
    <motion.rect
      x="65" y="30" width="150" height="130" rx="6"
      className="fill-[#f5f5f7] dark:fill-[#1c1c1e] stroke-[#d1d1d6] dark:stroke-[#3a3a3c]"
      strokeWidth="2.5"
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.1 }}
    />
    {/* Crack lines on canvas */}
    <motion.path
      d="M120 55 L145 80 L130 95 L155 120 L140 140"
      className="stroke-[#ff3b30] dark:stroke-[#ff453a]"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.6 }}
      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
    />
    <motion.path
      d="M145 80 L165 70"
      className="stroke-[#ff3b30] dark:stroke-[#ff453a]"
      strokeWidth="1.5" strokeLinecap="round" fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.4 }}
      transition={{ duration: 0.4, delay: 0.9 }}
    />
    <motion.path
      d="M130 95 L108 100"
      className="stroke-[#ff3b30] dark:stroke-[#ff453a]"
      strokeWidth="1.5" strokeLinecap="round" fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.4 }}
      transition={{ duration: 0.4, delay: 1.0 }}
    />
    {/* Question mark */}
    <motion.text
      x="140" y="105" textAnchor="middle"
      className="fill-[#aeaeb2] dark:fill-[#636366]"
      fontSize="40" fontWeight="800" fontFamily="system-ui"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 0.3, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
    >?</motion.text>
    {/* Floating pieces (broken fragments) */}
    <motion.rect
      x="195" y="45" width="18" height="14" rx="2"
      className="fill-[#d1d1d6] dark:fill-[#3a3a3c]"
      initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
      animate={{ opacity: 0.5, x: 8, y: -6, rotate: 15 }}
      transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
    />
    <motion.rect
      x="55" y="130" width="14" height="10" rx="2"
      className="fill-[#d1d1d6] dark:fill-[#3a3a3c]"
      initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
      animate={{ opacity: 0.4, x: -8, y: 6, rotate: -12 }}
      transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
    />
    {/* Small dots for debris effect */}
    <motion.circle cx="220" cy="55" r="3" className="fill-[#aeaeb2] dark:fill-[#636366]"
      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.3, scale: 1 }} transition={{ delay: 0.8 }}
    />
    <motion.circle cx="48" cy="125" r="2" className="fill-[#aeaeb2] dark:fill-[#636366]"
      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.25, scale: 1 }} transition={{ delay: 0.9 }}
    />
    <motion.circle cx="230" cy="70" r="2" className="fill-[#aeaeb2] dark:fill-[#636366]"
      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.2, scale: 1 }} transition={{ delay: 1.0 }}
    />
  </svg>
);

const GeneratorError: React.FC<{ error: string }> = ({ error }) => (
  <div className="h-[100dvh] flex flex-col bg-[#fafafa] dark:bg-[#000]">
    {/* Nav bar */}
    <div className="h-12 border-b border-black/5 dark:border-white/5 flex items-center px-4 gap-3">
      <Link to="/" className="flex items-center gap-2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors">
        <ChevronLeft size={18} />
        <span className="text-sm font-medium">Back</span>
      </Link>
    </div>
    <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm w-full text-center space-y-2"
      >
        {/* Illustration */}
        <div className="flex justify-center">
          <BrokenCanvasIllustration />
        </div>

        {/* Text content */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-[22px] sm:text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            Template Not Found
          </h1>
          <p className="text-[14px] text-[#86868b] leading-relaxed max-w-[280px] mx-auto">
            {error === 'Template not found' 
              ? "This template may have been removed or the link might be incorrect." 
              : error || "Something went wrong loading this template."}
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3 pt-4"
        >
          <Link to="/">
            <Button className="bg-[#0842C7] hover:bg-[#0953D7] text-white rounded-full h-11 px-7 text-[14px] font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
              Go Home
            </Button>
          </Link>
          <button 
            onClick={() => window.location.reload()}
            className="text-[13px] font-medium text-[#86868b] hover:text-[#0842C7] transition-colors"
          >
            Try again
          </button>
        </motion.div>
      </motion.div>
    </div>
  </div>
);

export const Generator: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [userImages, setUserImages] = useState<Record<string, string>>({});
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [currentCroppingId, setCurrentCroppingId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);

  // State persistence hooks
  const { getSavedGeneratorPath, clearSavedGeneratorPath } = useGeneratorState();

  // Restore user images from sessionStorage on mount
  useEffect(() => {
    try {
      const savedUserImages = sessionStorage.getItem(`generator_images_${slug}`);
      if (savedUserImages) {
        setUserImages(JSON.parse(savedUserImages));
      }
    } catch (e) {
      console.error('Failed to restore user images:', e);
    }
  }, [slug]);

  // Save user images to sessionStorage whenever they change
  useEffect(() => {
    if (Object.keys(userImages).length > 0) {
      try {
        sessionStorage.setItem(`generator_images_${slug}`, JSON.stringify(userImages));
      } catch (e) {
        console.error('Failed to save user images:', e);
      }
    }
  }, [userImages, slug]);

  // 1. Load Template
  useEffect(() => {
    const loadTemplate = async () => {
      if (!slug) return setError('No template specified'), setIsLoading(false);
      try {
        const data = await getTemplateBySlug(slug);
        if (data) {
            setTemplate(data);
            setElements(data.elements);
            // Track view
            incrementTemplateStat(slug, 'views').catch(() => {});
        } else {
            setError('Template not found');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load template');
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplate();
  }, [slug]);

  // 2. Dynamic Google Font Loader — loads exact weights used in template
  useEffect(() => {
    if (!elements.length) return;
    const fontMap = new Map<string, Set<number>>();
    elements.forEach(el => {
      if (el.type === 'text' && el.fontFamily) {
        if (!fontMap.has(el.fontFamily)) fontMap.set(el.fontFamily, new Set());
        fontMap.get(el.fontFamily)!.add(Number(el.fontWeight) || 400);
      }
    });
    if (fontMap.size === 0) { setFontsLoaded(true); return; }
    const familiesQuery = Array.from(fontMap.entries())
      .map(([font, weights]) => {
        const ws = Array.from(weights).sort((a, b) => a - b).join(';');
        return `family=${font.replace(/\s+/g, '+')}:wght@${ws}`;
      })
      .join('&');
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${familiesQuery}&display=swap`;
    link.rel = 'stylesheet';
    link.onload = () => {
       document.fonts.ready.then(() => {
         setFontsLoaded(true); 
         if(stageRef.current) stageRef.current.batchDraw(); 
       });
    };
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, [elements]);

  // 3. Robust Scaling
  useLayoutEffect(() => {
    if (!template || !containerRef.current) return;
    const updateScale = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 48; 
        const scaleX = (width - padding) / template.width;
        const scaleY = (height - padding) / template.height;
        setScale(Math.max(0.1, Math.min(scaleX, scaleY, 1)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [template]);

  const placeholderElements = useMemo(() => elements.filter((el) => el.isPlaceholder), [elements]);
  const textElements = useMemo(() => elements.filter((el) => el.type === 'text') as TextElement[], [elements]);
  const totalSteps = placeholderElements.length + (textElements.length > 0 ? 1 : 0);
  const completedSteps = placeholderElements.filter(el => !!userImages[el.id]).length + (textElements.length > 0 && textElements.some(el => el.text !== 'Your Text Here') ? 1 : 0);

  const getPlaceholderAspectRatio = useCallback((id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return 1;
    if (el.type === 'circle') return 1;
    if ('width' in el && 'height' in el) return el.width / el.height;
    return 1;
  }, [elements]);

  const handleTextChange = useCallback((id: string, newText: string) => {
    setElements((prev) => prev.map((el) => 
        (el.id === id && el.type === 'text') ? { ...el, text: newText } : el
    ));
  }, []);

  const handleUploadClick = useCallback((id: string) => {
    setCurrentCroppingId(id);
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
        fileInputRef.current.click();
    }
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCroppingId) return;
    const reader = new FileReader();
    reader.onload = (event) => setImageToCrop(event.target?.result as string);
    reader.readAsDataURL(file);
  }, [currentCroppingId]);

  const handleCropComplete = useCallback((croppedImageUrl: string) => {
    if (!currentCroppingId) return;
    setUserImages((prev) => ({ ...prev, [currentCroppingId]: croppedImageUrl }));
    setImageToCrop(null);
    setCurrentCroppingId(null);
    toast.success('Photo applied!');
  }, [currentCroppingId]);

  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingDownloadRef = useRef(false);
  const [dummmyLogo] = useImage('/favicon.ico');

  // When user signs in via auth modal, auto-trigger download
  useEffect(() => {
    if (user && pendingDownloadRef.current) {
      pendingDownloadRef.current = false;
      setShowAuthModal(false);
      // Small delay to let modal close
      setTimeout(() => performDownload(), 300);
    }
  }, [user]);

  const SITE_NAME = 'Dummmy';
  const SITE_URL = window.location.origin;

  const performDownload = useCallback(async () => {
    if (!stageRef.current) return;
    try {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

      // Build smart filename
      const tplName = (template?.name || 'design').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-');

      // Check if there's a user-entered name in text fields
      const nameTextEl = elements.find(
        (el) => el.type === 'text' && (el as TextElement).text && (el as TextElement).text !== 'Your Text Here'
      ) as TextElement | undefined;

      let fileNameParts: string[];
      if (nameTextEl) {
        const firstName = nameTextEl.text.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
        fileNameParts = [tplName, firstName, SITE_NAME];
      } else {
        fileNameParts = [tplName, SITE_URL.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.]/g, ''), SITE_NAME];
      }

      const fileName = fileNameParts.filter(Boolean).join('_') + '.png';

      const link = document.createElement('a');
      link.download = fileName;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image saved to your device!');
      
      // Track download
      if (slug) incrementTemplateStat(slug, 'downloads').catch(() => {});

      // Show registration popup if a registration link exists
      if (template?.registrationLink) {
        setTimeout(() => setShowRegistrationPopup(true), 600);
      }
    } catch (e) {
      console.error(e);
      toast.error('Could not generate image.');
    }
  }, [slug, template, elements]);

  const handleDownload = useCallback(() => {
    if (!user) {
      pendingDownloadRef.current = true;
      setShowAuthModal(true);
      return;
    }
    performDownload();
  }, [user, performDownload]);

  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: template?.name || 'Check out this template', url: shareUrl });
        if (slug) incrementTemplateStat(slug, 'shares').catch(() => {});
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      if (slug) incrementTemplateStat(slug, 'shares').catch(() => {});
    }
  }, [template, slug]);

  if (isLoading) return <GeneratorSkeleton />;
  if (error || !template) return <GeneratorError error={error || 'Template not found'} />;

  const FOOTER_HEIGHT = 80;
  const CANVAS_HEIGHT = template.height + FOOTER_HEIGHT;

  const isDownloadDisabled = placeholderElements.length > 0 && placeholderElements.some((el) => !userImages[el.id]);
  const hasControls = placeholderElements.length > 0 || textElements.length > 0;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans tracking-tight transition-colors duration-300">
      
      {/* HEADER - Compact & Functional */}
      <header className="h-12 shrink-0 px-3 md:px-6 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between z-30 safe-top">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="shrink-0 p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95">
            <ChevronLeft size={18} className="text-[#86868b]" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold truncate">{template.name || 'Untitled Template'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleShare}
            className="h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {/* CANVAS AREA - Takes most space on mobile */}
        <main 
          className={cn(
            "relative bg-[#efeff4] dark:bg-[#080808] overflow-hidden order-1 transition-all duration-300",
            hasControls ? "flex-1 lg:flex-1" : "flex-1",
          )}
        >
          {/* Subtle dot grid */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" 
               style={{ backgroundImage: `radial-gradient(#000 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

          <div ref={containerRef} className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
            <div 
              className="relative"
              style={{
                width: template.width,
                height: CANVAS_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Canvas shadow */}
              <div className="absolute -inset-1 rounded-lg bg-black/[0.08] dark:bg-black/30 blur-xl" />
              <div className="relative bg-white overflow-hidden shadow-2xl" style={{ width: template.width, height: CANVAS_HEIGHT }}>
                <Stage ref={stageRef} width={template.width} height={CANVAS_HEIGHT}>
                  <Layer>

                    {/* Top: original design (keeps y=0) */}
                    <Group x={0} y={0}>
                      <Rect width={template.width} height={template.height} fill={template.backgroundColor} />

                      {template.backgroundImage && (
                        <BackgroundImage src={template.backgroundImage} width={template.width} height={template.height} />
                      )}

                      {fontsLoaded && elements.map((el) => (
                        <RenderShape
                          key={el.id}
                          element={el}
                          userImage={el.isPlaceholder ? userImages[el.id] : undefined}
                        />
                      ))}
                    </Group>

                    {/* Footer area inside same Layer */}
                    <Rect x={0} y={template.height} width={template.width} height={FOOTER_HEIGHT} fill="#ffffff" />
                    <Line points={[0, template.height, template.width, template.height]} stroke="#e5e5e5" strokeWidth={1} />

                    {/* Watermark content (right-aligned) */}
                    {(() => {
                      const text1 = 'Made with';
                      const text2 = 'Dummmy.me';
                      const fontSize = 14;
                      const padding = Math.round(template.width * 0.05);
                      const gap = 6;
                      const estText1Width = Math.round(text1.length * fontSize * 0.5);
                      const estText2Width = Math.round(text2.length * fontSize * 0.5);
                      const logoHeight = 44;
                      const logoWidth = dummmyLogo ? Math.round((dummmyLogo.width / dummmyLogo.height) * logoHeight) : 0;
                      const totalWidth = estText1Width + gap + logoWidth + gap + estText2Width;
                      let x = template.width - totalWidth - padding;
                      const centerY = template.height + FOOTER_HEIGHT / 2;

                      return (
                        <>
                          <Text
                            text={text1}
                            fontSize={fontSize}
                            fontFamily="Inter, Arial, sans-serif"
                            fill="#888"
                            x={x}
                            y={centerY}
                            offsetY={fontSize / 2}
                            listening={false}
                          />
                          {dummmyLogo && (
                            <>
                              <KonvaImage
                                image={dummmyLogo}
                                x={x + estText1Width + gap}
                                y={centerY - logoHeight / 2}
                                width={logoWidth}
                                height={logoHeight}
                                listening={false}
                              />
                              <Text
                                text={text2}
                                fontSize={fontSize}
                                fontFamily="Inter, Arial, sans-serif"
                                fontStyle="700"
                                fill="#1d1d1f"
                                x={x + estText1Width + gap + logoWidth + gap}
                                y={centerY}
                                offsetY={fontSize / 2}
                                listening={false}
                              />
                            </>
                          )}
                        </>
                      );
                    })()}

                  </Layer>
                </Stage>
              </div>
            </div>
          </div>
        </main>

        {/* CONTROLS PANEL - Bottom sheet on mobile, sidebar on desktop */}
        {hasControls && (
          <>
            {/* Mobile: Bottom Sheet */}
            <div className="lg:hidden order-2 flex flex-col bg-white dark:bg-[#111] border-t border-black/[0.05] dark:border-white/[0.05] z-20 safe-bottom">
              {/* Drag handle & toggle */}
              <button 
                onClick={() => setShowControls(!showControls)}
                className="w-full flex flex-col items-center py-2 active:bg-black/[0.02] dark:active:bg-white/[0.02]"
              >
                <div className="w-8 h-1 rounded-full bg-black/10 dark:bg-white/10 mb-1" />
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#86868b]">
                  <span>Customize</span>
                  {totalSteps > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                      {completedSteps}/{totalSteps}
                    </span>
                  )}
                  <ChevronUp size={12} className={cn("transition-transform", !showControls && "rotate-180")} />
                </div>
              </button>

              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="max-h-[40vh] overflow-y-auto overscroll-contain px-4 pb-3 space-y-4">
                      <ControlContent 
                        placeholderElements={placeholderElements}
                        textElements={textElements}
                        userImages={userImages}
                        onUploadClick={handleUploadClick}
                        onTextChange={handleTextChange}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons - always visible */}
              <div className="px-4 pb-4 pt-2 flex gap-2">
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloadDisabled}
                  className="flex-1 h-12 bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-black rounded-2xl text-[14px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 shadow-lg"
                >
                  <Download className="w-[18px] h-[18px] mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Desktop: Sidebar */}
            <aside className="hidden lg:flex w-[380px] bg-white dark:bg-[#111] border-l border-black/[0.05] dark:border-white/[0.05] flex-col order-2 z-10">
              {/* Sidebar header */}
              <div className="h-14 px-6 flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-500" />
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#86868b]">Customize</h2>
                </div>
                {totalSteps > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.05] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-blue-500 transition-all duration-500" 
                        style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }} 
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[#86868b] tabular-nums">{completedSteps}/{totalSteps}</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <ControlContent 
                  placeholderElements={placeholderElements}
                  textElements={textElements}
                  userImages={userImages}
                  onUploadClick={handleUploadClick}
                  onTextChange={handleTextChange}
                />
              </div>

              {/* Desktop footer actions */}
              <div className="p-5 border-t border-black/[0.05] dark:border-white/[0.05] space-y-2.5">
                <Button 
                  onClick={handleDownload} 
                  disabled={isDownloadDisabled}
                  className="w-full h-12 bg-[#0842C7] hover:bg-[#0953D7] text-white rounded-2xl text-[14px] font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:shadow-none"
                >
                  <Download className="w-[18px] h-[18px] mr-2" />
                  Download Image
                </Button>
                <button 
                  onClick={handleShare}
                  className="w-full h-10 rounded-xl text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all flex items-center justify-center gap-2"
                >
                  <Link2 size={14} />
                  Share this design
                </button>
              </div>
            </aside>
          </>
        )}

        {/* No controls state - just download/share FAB */}
        {!hasControls && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 safe-bottom">
            <Button 
              onClick={handleDownload}
              className="h-12 px-6 bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-black rounded-2xl text-[14px] font-semibold shadow-2xl active:scale-95 transition-all"
            >
              <Download className="w-[18px] h-[18px] mr-2" />
              Download
            </Button>
            <button 
              onClick={handleShare}
              className="h-12 w-12 rounded-2xl bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-xl shadow-2xl flex items-center justify-center active:scale-95 transition-all border border-black/5 dark:border-white/5"
            >
              <Share2 size={18} />
            </button>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <AnimatePresence>
        {imageToCrop && (
          <ImageCropper
            imageSrc={imageToCrop}
            aspectRatio={currentCroppingId ? getPlaceholderAspectRatio(currentCroppingId) : 1}
            onCropComplete={handleCropComplete}
            onCancel={() => setImageToCrop(null)}
          />
        )}
      </AnimatePresence>

      {/* AUTH MODAL — gate downloads behind sign-in */}
      <AuthModal
        open={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          pendingDownloadRef.current = false;
        }}
        onAuthSuccess={() => {
          // The user successfully authenticated, trigger download if pending
          if (pendingDownloadRef.current) {
            pendingDownloadRef.current = false;
            setTimeout(() => performDownload(), 300);
          }
        }}
        message="Sign in to download your design"
      />

      {/* REGISTRATION / EVENT POPUP — shown after download */}
      <AnimatePresence>
        {showRegistrationPopup && template?.registrationLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xl p-0 sm:p-4"
            onClick={() => setShowRegistrationPopup(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white dark:bg-[#1c1c1e] w-full sm:max-w-[420px] sm:rounded-[28px] rounded-t-[28px] shadow-2xl border-t sm:border border-black/5 dark:border-white/[0.08] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative header gradient */}
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-pink-500/10 dark:from-blue-500/10 dark:via-purple-500/[0.06] dark:to-pink-500/[0.06]" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(0,113,227,0.15), transparent 50%), radial-gradient(circle at 70% 80%, rgba(168,85,247,0.1), transparent 50%)' }} />
                
                {/* Close button */}
                <button
                  onClick={() => setShowRegistrationPopup(false)}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 transition-all active:scale-90"
                >
                  <X size={16} className="text-[#86868b]" />
                </button>

                <div className="relative px-7 pt-10 pb-6 text-center">
                  {/* Animated party icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.15 }}
                    className="w-[64px] h-[64px] bg-[black] text-white rounded-[20px] flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25 dark:shadow-blue-500/15 mb-5"
                  >
                    <PartyPopper size={30} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <h2 className="text-[22px] font-bold tracking-tight mb-2">
                      That's great! 🎉
                    </h2>
                    <p className="text-[14px] text-[#86868b] leading-relaxed max-w-[300px] mx-auto">
                      Your DP has been saved. Don't forget to register for <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">{template.eventName || template.name}</span>!
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Event info card */}
              <div className="px-7 pb-7 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 rounded-2xl bg-[#f5f5f7] dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CalendarCheck size={18} className="text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868b] mb-1">Event</p>
                      <p className="text-[15px] font-bold tracking-tight truncate">{template.name}</p>
                    </div>
                  </div>
                </motion.div>

                {/* CTA Button */}
                <motion.a
                  href={template.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="flex items-center justify-center gap-2.5 w-full h-[52px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl text-[15px] font-semibold shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all group"
                >
                  <span>Register Now</span>
                  <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </motion.a>

                {/* Share + dismiss */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="flex items-center justify-between pt-1"
                >
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: template.name, url: window.location.href });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('Link copied!');
                      }
                    }}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#86868b] hover:text-blue-500 transition-colors"
                  >
                    <Share2 size={13} />
                    Share with friends
                  </button>
                  <button
                    onClick={() => setShowRegistrationPopup(false)}
                    className="text-[12px] font-medium text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                  >
                    Maybe later
                  </button>
                </motion.div>
              </div>

              <div className="safe-bottom" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Extracted shared control content ---
const ControlContent: React.FC<{
  placeholderElements: CanvasElement[];
  textElements: TextElement[];
  userImages: Record<string, string>;
  onUploadClick: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
}> = ({ placeholderElements, textElements, userImages, onUploadClick, onTextChange }) => (
  <>
    {/* Photo uploads */}
    {placeholderElements.length > 0 && (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera size={13} className="text-[#86868b]" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">
            {placeholderElements.length === 1 ? 'Your Photo' : 'Your Photos'}
          </h3>
        </div>
        <div className="space-y-2">
          {placeholderElements.map((el, index) => {
            const filled = !!userImages[el.id];
            return (
              <button
                key={el.id}
                onClick={() => onUploadClick(el.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                  filled 
                    ? "border-green-500/20 bg-green-500/[0.04]" 
                    : "border-black/[0.06] dark:border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/[0.02]"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center shrink-0 transition-colors",
                  filled ? "bg-green-500/10" : "bg-black/[0.03] dark:bg-white/[0.05]"
                )}>
                  {filled ? (
                    <img src={userImages[el.id]} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#86868b]" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">
                    {filled ? 'Change Photo' : (el.name || `Upload Photo${placeholderElements.length > 1 ? ` ${index + 1}` : ''}`)}
                  </p>
                  <p className="text-[11px] text-[#86868b]">
                    {filled ? (el.name || 'Tap to replace') : 'Tap to select from gallery'}
                  </p>
                </div>
                {filled && (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>
    )}

    {/* Text inputs */}
    {textElements.length > 0 && (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Type size={13} className="text-[#86868b]" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#86868b]">Text</h3>
        </div>
        <div className="space-y-2.5">
          {textElements.map((el, i) => (
            <div key={el.id}>
              <label className="text-[11px] font-medium text-[#86868b] block mb-1.5">
                {el.name || (textElements.length === 1 ? 'Your Name' : `Line ${i + 1}`)}
              </label>
              <input 
                value={el.text}
                onChange={(e) => onTextChange(el.id, e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.02] dark:bg-white/[0.03] text-[14px] font-medium outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-[#86868b]/50"
                placeholder="Type here..."
              />
            </div>
          ))}
        </div>
      </section>
    )}
  </>
);