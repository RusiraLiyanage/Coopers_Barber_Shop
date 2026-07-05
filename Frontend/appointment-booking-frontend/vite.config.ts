import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const guardOnlyDevServer: Plugin = {
  name: 'coopers-guard-only-dev-server',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      if (request.url === '/runtime-config.js') {
        response.statusCode = 200
        response.setHeader('content-type', 'text/javascript')
        response.end(`window.__COOPERS_RUNTIME_CONFIG__ = Object.freeze({
  VITE_API_URL: 'http://localhost:7311',
});
`)
        return
      }

      if (process.env.VITE_ALLOW_DIRECT_ACCESS === 'true') {
        next()
        return
      }

      if (request.headers['x-coopers-guard-proxy'] === 'true') {
        next()
        return
      }

      response.statusCode = 404
      response.end('Frontend is available through the booking guard.')
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), guardOnlyDevServer],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: false,
  },
})
