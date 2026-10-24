import { NextResponse } from 'next/server';

// Errori avvenuti nel browser dei cittadini: finiscono nel registro del server
// (docker compose logs app | findstr errore-browser) per capire cosa è successo.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').slice(0, n);
  console.error(
    '[errore-browser]',
    JSON.stringify({
      pagina: clip(body.path, 200),
      messaggio: clip(body.message, 500),
      digest: clip(body.digest, 40),
      stack: clip(body.stack, 1200),
      browser: clip(request.headers.get('user-agent'), 300),
    }),
  );
  return NextResponse.json({ ok: true });
}
