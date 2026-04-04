import { Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FloatingThemeButton } from "@/components/FloatingThemeButton";

// Pages
import Homepage from "@/pages/HomePage";
import Index from "./pages/Index"; // The Creator/Editor
import { GeneratorPage } from "@/pages/GeneratorPage"; // Import your Generator component
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import Explore from "@/pages/Explore";
import TemplateDetail from "@/pages/TemplateDetail";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="bottom-center" />
            <FloatingThemeButton />

            <Routes>
              <Route path="/" element={<Homepage />} />
              
              {/* Auth Pages */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Create New Designs */}
              <Route path="/create" element={<Index />} />
              <Route path="/edit/:slug" element={<Index />} />

              {/* User Dashboard */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Admin Dashboard */}
              <Route path="/admin" element={<AdminDashboard />} />

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
    </ThemeProvider>
  );
};

export default App;