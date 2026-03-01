import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";

// Pages
import Homepage from "@/pages/HomePage";
import Index from "./pages/Index"; // The Creator/Editor
import { GeneratorPage } from "@/pages/GeneratorPage"; // Import your Generator component
import Dashboard from "@/pages/Dashboard";
import Explore from "@/pages/Explore";
import TemplateDetail from "@/pages/TemplateDetail";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-center" />

          <Routes>
            <Route path="/" element={<Homepage />} />
            
            {/* Auth Pages */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Create New Designs */}
            <Route path="/create" element={<Index />} />
            <Route path="/edit/:slug" element={<Index />} />

            {/* User Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Explore all templates */}
            <Route path="/explore" element={<Explore />} />
            
            {/* View & Customize Published Designs */}
            <Route path="/dp/:slug" element={<GeneratorPage />} />

            {/* Template Detail / Analytics Page */}
            <Route path="/template/:slug" element={<TemplateDetail />} />

            <Route path="*" element={<NotFound />} />
          </Routes>

      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;