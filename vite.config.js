import { defineConfig } from 'vite';

export default defineConfig({
  base: '/apprepository/playalong3/',
  build: {
    sourcemap: true,
  },
  assetsInclude: ['**/*.jams'], // handle .jams files as static assets
});
