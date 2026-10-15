import { NextResponse } from 'next/server';
import { config } from './config';

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// URL pubblico dell'app, ricavato dalla richiesta (Caddy inoltra Host e protocollo).
export function baseUrl(request) {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

export function zodMessage(error) {
  return error.issues?.[0]?.message || 'Dati non validi';
}
