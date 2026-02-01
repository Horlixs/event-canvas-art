import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // 1. Force the base path to absolute root (Fixes 404s on deep links)
  base: "/", 
  
  server: {
    host: "::",
    port: 5173,
  },
  
  // 2. Ensure the build targets modern browsers but is compatible
  build: {
    target: "esnext",
    outDir: "dist",
  },

  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));