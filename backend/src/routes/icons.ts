import { Hono } from 'hono';
import { z } from 'zod';
import { getIconsFromFolders } from '../utils/get-icons';


const iconsRoute = new Hono();

// Validamos que todas las rutas sean URLs válidas
const iconsSchema = z.array(z.string().url());

iconsRoute.get('/icons', async (c) => {
  try {
    const relativePaths = await getIconsFromFolders();

    // Transformamos en URLs absolutas válidas para el frontend
    const baseUrl = 'http://localhost:5173/data';
    const icons = relativePaths.map((relPath) => `${baseUrl}/${relPath}`);

    const parsed = iconsSchema.safeParse(icons);
    if (!parsed.success) {
      console.error(parsed.error.format());
      return c.json({ error: 'Invalid icon URL format' }, 400);
    }

    return c.json(parsed.data);
  } catch (err) {
    console.error('Error loading icons:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default iconsRoute;
