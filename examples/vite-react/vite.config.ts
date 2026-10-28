import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lib = (p: string) => resolve(here, '../../packages/deract/src', p);

// Aliases point at the library source so `pnpm dev` works without a build of
// packages/deract. TypeScript resolves the same files through tsconfig `paths`.
// The example's package.json still lists `@atlis/deract: workspace:*`, so a
// real dist build would be a drop-in swap; piece 8 verifies the exports map.
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^@atlis\/deract\/playground$/, replacement: lib('playground/index.ts') },
      { find: /^@atlis\/deract\/styles\.css$/, replacement: lib('styles.css') },
      { find: /^@atlis\/deract\/fonts\.css$/, replacement: lib('fonts.css') },
      { find: /^@atlis\/deract$/, replacement: lib('index.ts') },
    ],
  },
});