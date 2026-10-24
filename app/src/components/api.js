// Piccolo helper fetch per i componenti client: lancia un Error con il
// messaggio restituito dall'API (già in italiano).
export async function api(url, { body, method, ...options } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method: method || (body ? 'POST' : 'GET'),
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body && !isForm ? JSON.stringify(body) : body,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Errore ${res.status}`);
    Object.assign(error, data, { status: res.status });
    throw error;
  }
  return data;
}
