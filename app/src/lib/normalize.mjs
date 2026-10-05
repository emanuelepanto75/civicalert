// Normalizza il nome di un comune per confrontare i dati ISTAT con OpenStreetMap.
// "Reggio di Calabria" e "Reggio Calabria" -> "reggio calabria"
// "Bolzano/Bozen" e "Bolzano - Bozen"     -> "bolzano"
const STOPWORDS = new Set(['di', 'de', 'del', 'della', 'dei', 'd']);

export function nameKey(name) {
  return String(name || '')
    .split(/\/| - /)[0]
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w))
    .join(' ');
}
