import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ["react", "react-dom"]
  },
  build: {
    outDir: "dist",
    sourcemap: true
  },
  server: {
    host: "0.0.0.0",
    port: 3000
  }
});
