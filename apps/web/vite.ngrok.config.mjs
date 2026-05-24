import react from '@vitejs/plugin-react';
import path from 'node:path';

export default {
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(process.cwd(), './src') },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://[::1]:4000',
        changeOrigin: true,
      },
    },
  },
};
