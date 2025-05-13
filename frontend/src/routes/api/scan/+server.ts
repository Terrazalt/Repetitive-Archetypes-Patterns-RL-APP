
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    // 1) grab the multipart form data
    const formData = await request.formData();
    if (!formData.has('image')) {
      return new Response('Missing “image” field', { status: 400 });
    }

    // 2) forward it to your Python/FastAPI service
    const backendRes = await fetch('http://127.0.0.1:8000/yolo/detect', {
      method: 'POST',
      body: formData
    });

    if (!backendRes.ok) {
      console.error('Backend error:', backendRes.statusText);
      return new Response('Failed to process image', { status: 502 });
    }

    // 3) pull out the binary and stream it back
    const contentType = backendRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await backendRes.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': contentType }
    });
  } catch (err) {
    console.error('Fetch error:', err);
    return new Response('Internal server error', { status: 500 });
  }
};

