import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getTemplateBySlug } from '@/lib/templates';
import { TemplateData } from '@/types/editor';
import { CanvasStage } from '@/components/editor/CanvasStage';
import { Loader2, AlertCircle } from 'lucide-react';

const PublishedDesign = () => {
  const { slug } = useParams();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const stageRef = useRef(null);

  useEffect(() => {
    if (!slug) return;

    getTemplateBySlug(slug).then((data) => {
      setTemplate(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p>Loading design...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-500">
        <AlertCircle className="w-10 h-10 mb-4 text-red-400" />
        <h1 className="text-xl font-bold text-neutral-800">Design Not Found</h1>
        <p>The link is incorrect or the design was deleted.</p>
      </div>
    );
  }

  // Calculate Fit to Screen
  const fitScale = Math.min(
    window.innerWidth / template.width,
    window.innerHeight / template.height
  );

  return (
    <div className="h-screen w-screen bg-neutral-900 flex items-center justify-center overflow-hidden relative">
      {/* Blurred Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: `url(${template.backgroundImage})`, backgroundSize: 'cover' }} />

      {/* The Paper */}
      <div 
        className="shadow-2xl bg-white relative overflow-hidden"
        style={{
          width: template.width,
          height: template.height,
          transform: `scale(${fitScale * 0.9})`,
          backgroundColor: template.backgroundColor,
        }}
      >
        {template.backgroundImage && (
           <img 
             src={template.backgroundImage} 
             alt="bg" 
             className="absolute inset-0 w-full h-full object-cover z-0" 
           />
        )}

        <div className="absolute inset-0 z-10 pointer-events-none">
          <CanvasStage
            elements={template.elements}
            selectedId={null} 
            onSelect={() => {}} 
            onUpdate={() => {}} 
            canvasSize={{ width: template.width, height: template.height }}
            backgroundColor="transparent"
            backgroundImage={null}
            stageRef={stageRef}
          />
        </div>
      </div>
      
      <div className="absolute bottom-4 text-white/40 text-xs font-sans">
          Powered by Draft
      </div>
    </div>
  );
};

export default PublishedDesign;