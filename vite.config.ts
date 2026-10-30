import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENWEATHER_API_KEY) {
    process.env.OPENWEATHER_API_KEY = env.OPENWEATHER_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-api-handler',
        configureServer(server) {
          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (!req.url?.startsWith('/api/')) return next();
            const parsedUrl = new URL(req.url, 'http://localhost');
            const endpoint = parsedUrl.pathname.replace(/^\/api\//, '').replace(/\.js$/, '');

            try {
              let handlerModule;
              if (endpoint === 'weather') {
                handlerModule = await import('./api/weather.js');
              } else if (endpoint === 'geocode') {
                handlerModule = await import('./api/geocode.js');
              } else if (endpoint === 'tile') {
                handlerModule = await import('./api/tile.js');
              } else {
                return next();
              }

              req.query = Object.fromEntries(parsedUrl.searchParams.entries());
              res.status = (code: number) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data: any) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
              };
              res.send = (buf: any) => {
                res.end(buf);
                return res;
              };

              await handlerModule.default(req, res);
            } catch (err) {
              console.error('API Error:', err);
              next(err);
            }
          });
        },
      },
    ],
  };
});

