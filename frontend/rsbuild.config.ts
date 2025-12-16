import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/index.tsx',
    },
  },
  output: {
    distPath: {
      root: './dist',
    },
    assetPrefix: '/',
  },
  html: {
    template: './public/index.html',
    title: '销售人效分析',
  },
  tools: {
    postcss: {
      postcssOptions: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
  },
});
