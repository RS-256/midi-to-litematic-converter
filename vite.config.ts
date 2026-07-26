import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  // GitHub Pages project site: served from rs256.net/midi-to-litematic-converter/.
  base: "/midi-to-litematic-converter/",
});
