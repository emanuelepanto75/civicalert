import { config } from './config';
import { prisma } from './db';

// Impostazioni modificabili dalla dashboard; se mai salvate valgono i default del .env.
const APPROVAL_KEY = 'approval_required';

/** Le nuove segnalazioni aspettano l'approvazione dell'amministratore prima della PEC? */
export async function approvalRequired() {
  const row = await prisma.setting.findUnique({ where: { key: APPROVAL_KEY } });
  return row ? row.value === 'true' : config.approvalRequired;
}

export async function setApprovalRequired(enabled) {
  const value = String(Boolean(enabled));
  await prisma.setting.upsert({
    where: { key: APPROVAL_KEY },
    create: { key: APPROVAL_KEY, value },
    update: { value },
  });
}
