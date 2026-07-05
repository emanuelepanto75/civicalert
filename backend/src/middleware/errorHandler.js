/**
 * Middleware di gestione errori globale.
 * Cattura tutti gli errori non gestiti dalle route.
 */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message || err);

  // Errori Prisma comuni
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Dato già esistente (duplicato).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Elemento non trovato.' });
  }

  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Errore interno del server.';

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
