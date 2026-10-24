/**
 * Servizio di reverse geocoding tramite Nominatim (OpenStreetMap).
 * Converte coordinate GPS in indirizzo e comune.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT    = 'CivicAlert/1.0 (segnalazioni@civicalert.it)';

/**
 * Dato un punto GPS restituisce:
 * {
 *   indirizzo: "Via Roma 10, Milano, Lombardia",
 *   comune: "Milano",
 *   provincia: "Milano",
 *   regione: "Lombardia",
 *   istatCode: null,   // non fornito da Nominatim, va abbinato dal DB
 *   raw: { ... }       // risposta completa Nominatim
 * }
 */
async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&accept-language=it&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'it',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim errore HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Nominatim: ${data.error}`);
  }

  const addr = data.address || {};

  // Nome comune: prova nell'ordine city → town → village → municipality
  const comune =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    null;

  // Indirizzo leggibile
  const parti = [
    addr.road,
    addr.house_number,
    comune,
    addr.state,
  ].filter(Boolean);

  return {
    indirizzo : parti.join(', '),
    comune    : comune,
    provincia : addr.county || addr.state_district || null,
    regione   : addr.state || null,
    cap       : addr.postcode || null,
    raw       : data,
  };
}

module.exports = { reverseGeocode };
