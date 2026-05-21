import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  envDir: '../', // Load .env from the project root
  resolve: {
    alias: {
      '@supabase/supabase-js': resolve(__dirname, './node_modules/@supabase/supabase-js'),
    },
  },
});
