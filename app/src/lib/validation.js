import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, { error: 'La password deve avere almeno 8 caratteri' })
  .max(128, { error: 'Password troppo lunga' });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Indirizzo email non valido' }));

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, { error: 'Inserisci il nome' }).max(80),
  lastName: z.string().trim().min(1, { error: 'Inserisci il cognome' }).max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{6,20}$/, { error: 'Numero di telefono non valido' }),
  password: passwordSchema,
  privacy: z.literal(true, { error: "Devi accettare l'informativa privacy" }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Inserisci la password' }),
});
