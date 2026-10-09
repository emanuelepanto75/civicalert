const jwt = require('jsonwebtoken');

/**
 * Middleware: verifica il token JWT nell'header Authorization.
 * Aggiunge req.user con i dati dell'utente se il token è valido.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token di autenticazione mancante.' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessione scaduta. Effettua nuovamente il login.' });
    }
    return res.status(401).json({ error: 'Token non valido.' });
  }
}

/**
 * Middleware: verifica che l'utente abbia il ruolo richiesto.
 * Da usare DOPO requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accesso non autorizzato.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
