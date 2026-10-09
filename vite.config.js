import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevMiddleware() {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && (req.url.startsWith('/api/tracker') || req.url === '/api/tracker')) {
          try {
            const { default: handler } = await import('./api/tracker.js');
            await handler(req, res);
          } catch (err) {
            console.error('[API Dev Server Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all environment variables (including server secrets) into process.env for the dev API
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiDevMiddleware(),
    ],
    optimizeDeps: {
      // Exclude lucide-react from pre-bundling (its icon files are .js not .mjs)
      exclude: ['lucide-react'],
      // Ensure react-is is included (peer dep for recharts)
      include: ['react-is'],
    },
    build: {
      chunkSizeWarningLimit: 800,
    },
  };
})
