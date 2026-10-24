import { z } from 'zod';

const coord = (min, max) => z.coerce.number().refine((n) => n >= min && n <= max, { error: 'Posizione GPS non valida' });

export const locationSchema = z.object({
  categoryId: z.string().uuid({ error: 'Seleziona una categoria' }),
  latitude: coord(-90, 90),
  longitude: coord(-180, 180),
  accuracy: z.coerce.number().nonnegative().optional(),
});

export const reportSchema = locationSchema.extend({
  description: z.string().trim().max(1000, { error: 'Descrizione troppo lunga (max 1000 caratteri)' }).optional(),
});
