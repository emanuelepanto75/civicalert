import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { prisma } from '@/lib/db';
import { processPendingDeliveries } from '@/lib/deliveries';
import { resolveLocation } from '@/lib/geocoding';
import { requireUser } from '@/lib/guards';
import { baseUrl, jsonError, zodMessage } from '@/lib/http';
import { MediaError, deleteMedia, saveMedia } from '@/lib/media';
import { reportSchema } from '@/lib/reportInput';
import { sendReceiptEmail } from '@/lib/emails';
import { authenticityFlags, findSameProblem, newReportCode, publicReport, reportsLeftToday } from '@/lib/reports';

export const dynamic = 'force-dynamic';

// Mappa pubblica: segnalazioni recenti, senza dati personali.
export async function GET() {
  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const reports = await prisma.report.findMany({
    // Lo stesso problema segnalato da più cittadini compare una volta sola
    where: { createdAt: { gte: since }, status: { not: 'REJECTED' }, duplicateOfId: null },
    orderBy: { createdAt: 'desc' },
    take: 1000,
    include: { category: true, municipality: true },
  });
  return NextResponse.json({ reports: reports.map((r) => publicReport(r)) });
}

export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonError('Richiesta non valida');
  }
  const parsed = reportSchema.safeParse({
    categoryId: form.get('categoryId'),
    latitude: form.get('latitude'),
    longitude: form.get('longitude'),
    accuracy: form.get('accuracy') || undefined,
    description: form.get('description') || undefined,
  });
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  const input = parsed.data;

  if (input.accuracy != null && input.accuracy > config.maxGpsAccuracyM) {
    return jsonError(
      `Posizione troppo imprecisa (±${Math.round(input.accuracy)} m). Attiva il GPS e riprova all'aperto.`,
      422,
    );
  }
  if ((await reportsLeftToday(user.id)) <= 0) {
    return jsonError(`Hai raggiunto il limite di ${config.maxReportsPerDay} segnalazioni nelle ultime 24 ore.`, 429);
  }
  const category = await prisma.category.findFirst({ where: { id: input.categoryId, isActive: true } });
  if (!category) return jsonError('Categoria non valida');

  // Lo stesso problema segnalato da altri cittadini parte comunque (il Comune
  // vede che non è un caso isolato); lo stesso utente non può ripeterlo.
  const sameProblem = await findSameProblem({ ...input, userId: user.id });
  if (sameProblem?.mine) {
    return jsonError(`Hai già segnalato questo problema (${sameProblem.mine.code}).`, 409, { duplicate: sameProblem.mine.code });
  }

  let media;
  try {
    media = await saveMedia(form.get('media'));
  } catch (err) {
    if (err instanceof MediaError) return jsonError(err.message);
    throw err;
  }

  try {
    const location = await resolveLocation(input.latitude, input.longitude);
    const municipality = location.municipality;
    const { flags, photoGpsDistM } = authenticityFlags({
      exif: media.exif,
      latitude: input.latitude,
      longitude: input.longitude,
      gpsAccuracyM: input.accuracy,
    });
    const pecTo = municipality?.notifyPec ? municipality.pecAddress : null;

    const report = await prisma.report.create({
      data: {
        code: newReportCode(),
        userId: user.id,
        categoryId: category.id,
        description: input.description || null,
        mediaPath: media.relPath,
        mediaType: media.type,
        latitude: input.latitude,
        longitude: input.longitude,
        gpsAccuracyM: input.accuracy ?? null,
        address: location.address,
        municipalityId: municipality?.id ?? null,
        photoTakenAt: media.exif.takenAt ?? null,
        photoGpsDistM,
        authenticity: flags,
        duplicateOfId: sameProblem?.first?.id ?? null,
        deliveries: pecTo ? { create: { channel: 'PEC', recipient: pecTo } } : undefined,
      },
    });

    // Prova a inviare subito la PEC; se il server di posta è lento risponde
    // comunque entro pochi secondi e l'invio prosegue in background.
    if (pecTo) {
      await Promise.race([
        processPendingDeliveries(baseUrl(request)).catch((e) => console.error('[pec]', e)),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
    }

    const saved = await prisma.report.findUnique({
      where: { id: report.id },
      include: { category: true, municipality: true, deliveries: true, user: true },
    });
    const pecStatus = saved.deliveries[0]?.status === 'SENT' ? 'SENT' : pecTo ? 'PENDING' : null;
    sendReceiptEmail({
      report: saved,
      pec: pecStatus,
      sameProblem: (sameProblem?.count ?? 0) + 1,
      siteUrl: baseUrl(request),
    }).catch((e) => console.error('[ricevuta]', e.message));
    return NextResponse.json(
      { report: publicReport(saved, { includeOwner: true, viewerId: user.id }), routed: Boolean(pecTo) },
      { status: 201 },
    );
  } catch (err) {
    await deleteMedia(media.relPath);
    throw err;
  }
}
