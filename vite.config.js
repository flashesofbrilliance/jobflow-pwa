import { defineConfig } from 'vite';

// Use relative asset paths so the app loads correctly on GitHub Pages
// when served from the repository root on the gh-pages branch.
export default defineConfig({
  base: './',
});

