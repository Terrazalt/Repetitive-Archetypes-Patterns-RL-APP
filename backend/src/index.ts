import { Hono } from 'hono';
import iconsRoute from './routes/icons';

const app = new Hono();

app.route('/api', iconsRoute); // Esto te deja disponible /api/icons

Bun.serve({
  fetch: app.fetch,
  port: 3001
});

