import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { resolveLocation } from '@/lib/geocoding';
import { requireUser } from '@/lib/guards';
import { jsonError, zodMessage } from '@/lib/http';
import { locationSchema } from '@/lib/reportInput';
import { findSameProblem, reportsLeftToday } from '@/lib/reports';

// Anteprima prima dell'invio: indirizzo, comune/PEC, duplicati, limite giornaliero.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const parsed = locationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const { categoryId, latitude, longitude, accuracy } = parsed.data;

  const [location, sameProblem, left] = await Promise.all([
    resolveLocation(latitude, longitude),
    findSameProblem({ categoryId, latitude, longitude, userId: user.id }),
    reportsLeftToday(user.id),
  ]);
  const m = location.municipality;

  return NextResponse.json({
    address: location.address,
    geocodingError: location.error || null,
    municipality: m ? { name: m.name, province: m.provinceCode, pec: m.notifyPec ? m.pecAddress : null } : null,
    // Già segnalato da me: invio bloccato. Già segnalato da altri: si invia comunque.
    duplicate: sameProblem?.mine ? { code: sameProblem.mine.code, mine: true } : null,
    sameProblem: sameProblem && !sameProblem.mine
      ? {
          code: sameProblem.first.code,
          count: sameProblem.count,
          since: sameProblem.first.createdAt,
          distance: Math.round(sameProblem.nearest.distance),
        }
      : null,
    reportsLeft: left,
    accuracyTooLow: accuracy != null && accuracy > config.maxGpsAccuracyM,
  });
}
