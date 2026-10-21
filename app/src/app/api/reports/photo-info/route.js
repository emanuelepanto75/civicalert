import { NextResponse } from 'next/server';
import { resolveLocation } from '@/lib/geocoding';
import { requireUser } from '@/lib/guards';
import { jsonError } from '@/lib/http';
import { photoInfo } from '@/lib/media';

// Posizione e ora dello scatto della foto scelta, con l'indirizzo, per proporre
// al cittadino la posizione del luogo dove l'ha scattata. La foto non viene salvata.
export async function POST(request) {
  const { error } = await requireUser();
  if (error) return error;
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Richiesta non valida');
  }
  const info = await photoInfo(form.get('media'));
  if (info.lat == null || info.lon == null) return NextResponse.json({ gps: false, takenAt: info.takenAt || null });
  const location = await resolveLocation(info.lat, info.lon);
  return NextResponse.json({
    gps: true,
    latitude: info.lat,
    longitude: info.lon,
    takenAt: info.takenAt || null,
    address: location.address,
    municipality: location.municipality?.name || null,
  });
}
