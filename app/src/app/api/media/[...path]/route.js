import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config } from '@/lib/config';
import { jsonError } from '@/lib/http';

const TYPES = { '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };

export async function GET(request, { params }) {
  const { path: parts } = await params;
  const root = path.resolve(config.uploadDir);
  const file = path.resolve(root, ...parts);
  if (!file.startsWith(root + path.sep) || !TYPES[path.extname(file)]) return jsonError('Non trovato', 404);

  let stat;
  try {
    stat = await fs.promises.stat(file);
  } catch {
    return jsonError('Non trovato', 404);
  }
  const headers = {
    'Content-Type': TYPES[path.extname(file)],
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  };

  // Supporto Range: Safari lo richiede per riprodurre i video.
  const range = request.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? Math.min(parseInt(range[2], 10), stat.size - 1) : stat.size - 1;
    if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
    return new Response(Readable.toWeb(fs.createReadStream(file, { start, end })), {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)), {
    headers: { ...headers, 'Content-Length': String(stat.size) },
  });
}
