import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, 'data'),
      '@assets': path.resolve(__dirname, 'assets'),
      '@engine': path.resolve(__dirname, 'src/engine'),
      '@game': path.resolve(__dirname, 'src/game'),
      '@ui': path.resolve(__dirname, 'src/ui')
    }
  },
  test: {
    exclude: ['tests/e2e/**']
  }
});
