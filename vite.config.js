import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.wiyostb.com.tr',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // CORS headers'ları kaldır
            proxyReq.removeHeader('origin');
          });
        }
      }
    }
  }
})
