import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

const iconSchema = z.array(z.string().url());

export const GET: RequestHandler = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/icons');

    if (!response.ok) {
      console.error('Backend error:', response.statusText);
      return new Response('Failed to fetch icons from backend', { status: 502 });
    }

    const data = await response.json();

    const parsed = iconSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Invalid icon format from backend:', parsed.error.format());
      return new Response('Invalid icon data format', { status: 500 });
    }

    return new Response(JSON.stringify(parsed.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Fetch error:', err);
    return new Response('Internal error', { status: 500 });
  }
};

