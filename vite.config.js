import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
});
