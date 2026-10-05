import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { resolveLocation } from '@/lib/geocoding';
import { requireUser } from '@/lib/guards';
import { jsonError, zodMessage } from '@/lib/http';
import { locationSchema } from '@/lib/reportInput';
import { findDuplicate, reportsLeftToday } from '@/lib/reports';

// Anteprima prima dell'invio: indirizzo, comune/PEC, duplicati, limite giornaliero.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const parsed = locationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { categoryId, latitude, longitude, accuracy } = parsed.data;

  const [location, duplicate, left] = await Promise.all([
    resolveLocation(latitude, longitude),
    findDuplicate({ categoryId, latitude, longitude }),
    reportsLeftToday(user.id),
  ]);
  const m = location.municipality;

  return NextResponse.json({
    address: location.address,
    geocodingError: location.error || null,
    municipality: m ? { name: m.name, province: m.provinceCode, pec: m.notifyPec ? m.pecAddress : null } : null,
    duplicate: duplicate && {
      code: duplicate.code,
      distance: Math.round(duplicate.distance),
      mine: duplicate.userId === user.id,
    },
    reportsLeft: left,
    accuracyTooLow: accuracy != null && accuracy > config.maxGpsAccuracyM,
  });
}
