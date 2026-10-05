import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { config } from './config';

const COOKIE = 'civicalert_session';
let secretKey;

// Usa SESSION_SECRET se impostata, altrimenti ne genera una e la conserva nella
// cartella dati, così le sessioni sopravvivono ai riavvii senza configurazione.
function getSecret() {
  if (secretKey) return secretKey;
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    const file = path.join(config.dataDir, 'session-secret');
    if (fs.existsSync(file)) {
      secret = fs.readFileSync(file, 'utf-8').trim();
    } else {
      secret = crypto.randomBytes(48).toString('base64url');
      fs.mkdirSync(config.dataDir, { recursive: true });
      fs.writeFileSync(file, secret, { mode: 0o600 });
    }
  }
  secretKey = new TextEncoder().encode(secret);
  return secretKey;
}

export async function createSession(user) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${config.sessionHours}h`)
    .sign(getSecret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionHours * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function readSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
