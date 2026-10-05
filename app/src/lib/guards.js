import { getCurrentUser } from './auth';
import { jsonError } from './http';

// Per le API che richiedono un cittadino autenticato con email confermata.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError('Accedi per continuare', 401) };
  if (!user.emailVerifiedAt) return { error: jsonError('Conferma prima il tuo indirizzo email', 403) };
  return { user };
}
