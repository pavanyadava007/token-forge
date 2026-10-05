import { defineConfig } from 'vite';

// Library build: ES module, Lit kept external so apps share one copy.
export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'token-forge' },
    rollupOptions: { external: [/^lit/] },
    outDir: 'lib',
  },
});
