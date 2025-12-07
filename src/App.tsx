import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages
import Homepage from "@/pages/HomePage";
import GeneratorPage from "@/pages/GeneratorPage";
import Index from "./pages/Index";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-center" />

        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="create" element={<Index />} />
            <Route path="/generator" element={<GeneratorPage />} />

            {/* dynamic DP pattern coming later */}
            {/* <Route path="/dp/:slug" element={<DPViewer />} /> */}

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>

      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;