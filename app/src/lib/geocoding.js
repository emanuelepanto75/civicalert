import { config } from './config';
import { prisma } from './db';
import { nameKey } from './normalize.mjs';

// Nominatim accetta al massimo 1 richiesta al secondo: serializziamo le chiamate
// e teniamo in cache i risultati (le coordinate sono arrotondate a ~10 m).
const cache = new Map();
let queue = Promise.resolve();
let lastCall = 0;

function throttled(fn) {
  const run = queue.then(async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function nominatimReverse(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key);

  const url = new URL('/reverse', config.nominatimUrl);
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    'accept-language': 'it',
    ...(config.nominatimEmail && { email: config.nominatimEmail }),
  });

  const data = await throttled(async () => {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CivicAlert/0.1 (segnalazioni civiche)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    return res.json();
  });

  if (cache.size > 2000) cache.clear();
  cache.set(key, data);
  return data;
}

// Abbina la risposta di Nominatim a un comune del database. In Italia il comune
// può trovarsi in city/town/village/municipality (village a volte è una frazione),
// quindi si provano tutti i candidati, filtrando per sigla di provincia.
async function matchMunicipality(address) {
  const provinceCode = (address['ISO3166-2-lvl6'] || '').replace(/^IT-/, '') || null;
  const candidates = [address.city, address.town, address.municipality, address.village]
    .filter(Boolean)
    .map(nameKey);

  for (const key of [...new Set(candidates)]) {
    const found = await prisma.municipality.findMany({ where: { nameKey: key, isActive: true } });
    const match =
      (provinceCode && found.find((m) => m.provinceCode === provinceCode)) ||
      (found.length === 1 ? found[0] : null);
    if (match) return match;
  }
  return null;
}

/**
 * Coordinate GPS -> indirizzo leggibile + comune competente.
 * Non lancia mai: se il servizio non risponde restituisce comune null
 * (la segnalazione viene comunque salvata, RF-23).
 */
export async function resolveLocation(lat, lon) {
  try {
    const data = await nominatimReverse(lat, lon);
    const a = data.address || {};
    if (a.country_code !== 'it') return { address: data.display_name || null, municipality: null };

    const municipality = await matchMunicipality(a);
    const street = [a.road || a.pedestrian || a.square, a.house_number].filter(Boolean).join(' ');
    const place = municipality?.name || a.city || a.town || a.village;
    const address = [street, place].filter(Boolean).join(', ') || data.display_name || null;
    return { address, municipality };
  } catch (err) {
    console.error('[geocoding]', err.message);
    return { address: null, municipality: null, error: 'Servizio indirizzi non raggiungibile' };
  }
}
