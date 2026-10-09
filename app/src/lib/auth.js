import { prisma } from './db';
import { readSession } from './session';

// Utente della sessione corrente, ricaricato dal DB (così ban e cambi di ruolo
// hanno effetto subito). Restituisce null se non autenticato.
export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isBanned) return null;
  return user;
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

// Operatori comunali (con un Comune assegnato) e amministratori.
export function isStaff(user) {
  return user?.role === 'ADMIN' || (user?.role === 'OPERATOR' && Boolean(user.municipalityId));
}
