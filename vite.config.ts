import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

// Vite plugin to build for Obsidian
function obsidianPlugin(): Plugin {
  return {
    name: 'obsidian-plugin',
    enforce: 'pre',
    config: () => ({
      build: {
        lib: {
          entry: resolve(__dirname, 'src/main.ts'),
          name: 'ObsidianTimeline',
          formats: ['cjs'],
          fileName: () => 'main.js',
        },
        outDir: '.',
        emptyOutDir: false,
        rollupOptions: {
          external: ['obsidian', 'electron', ...builtinModules],
          output: {
            entryFileNames: 'main.js',
            exports: 'default',
          },
        },
        minify: false,
        target: 'es2020',
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
    }),
  };
}

const builtinModules = [
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'module',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
];

export default defineConfig({
  plugins: [
    react(),
    obsidianPlugin(),
  ],
});
