import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
  },
  assetsInclude: ['**/*.jams'], // handle .jams files as static assets
});
