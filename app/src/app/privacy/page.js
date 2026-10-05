export const metadata = { title: 'Privacy – CivicAlert' };

// Testo provvisorio: da far rivedere prima della messa in produzione.
export default function PrivacyPage() {
  return (
    <div className="page">
      <h1>Informativa privacy</h1>
      <div className="alert warn">Bozza provvisoria per la fase di test, da completare prima del lancio pubblico.</div>
      <div className="card">
        <div className="card-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
          <p><strong>Quali dati raccogliamo.</strong> Nome, cognome, email, telefono, e per ogni segnalazione:
            foto o video, posizione GPS, categoria, descrizione, data e ora.</p>
          <p><strong>Perché.</strong> Per inoltrare la segnalazione al Comune competente tramite PEC e permetterti
            di seguirne lo stato. I tuoi dati di contatto sono inviati solo al Comune destinatario.</p>
          <p><strong>Cosa è pubblico.</strong> Sulla mappa pubblica compaiono solo categoria, posizione, foto,
            descrizione e stato: mai nome, email o telefono del segnalante.</p>
          <p><strong>Dove sono conservati.</strong> Su un server situato in Italia, gestito dal titolare del servizio.</p>
          <p><strong>I tuoi diritti.</strong> Puoi chiedere accesso, rettifica o cancellazione dei tuoi dati
            scrivendo al titolare del trattamento.</p>
        </div>
      </div>
    </div>
  );
}
