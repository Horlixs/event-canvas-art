import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages
import Homepage from "@/pages/HomePage";
import Index from "./pages/Index"; // The Creator/Editor
import { GeneratorPage } from "@/pages/GeneratorPage"; // Import your Generator component
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-center" />

          <Routes>
            <Route path="/" element={<Homepage />} />
            
            {/* Create New Designs */}
            <Route path="/create" element={<Index />} />
            
            {/* View & Customize Published Designs */}
            {/* This is where the magic happens: /dp/abc-123 loads the Generator */}
            <Route path="/dp/:slug" element={<GeneratorPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;