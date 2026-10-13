import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, zodMessage } from '@/lib/http';
import { requireAdminApi } from '@/lib/office';
import { setApprovalRequired } from '@/lib/settings';

const schema = z.object({ approvalRequired: z.boolean() });

// Impostazioni della piattaforma (solo amministratore).
export async function PATCH(request) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError(zodMessage(parsed.error));
  await setApprovalRequired(parsed.data.approvalRequired);
  return NextResponse.json({ ok: true });
}
