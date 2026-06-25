# Compliance — note di progetto

## Stato attuale

- **Privacy Policy**: scritta e convertita in `docs/privacy.html`, linkata dal footer di `index.html` con `<a href="docs/privacy.html">Privacy Policy</a>`.
- **Cookie/storage notice**: creato `storage-notice.js` — banner informativo (non un vero cookie wall) che avvisa l'utente che il sito usa solo storage tecnico necessario al login. Si chiude con un bottone "Ok, got it" e non si ripresenta più (salva un flag in `localStorage`).
- Caricamento consigliato in `index.html`, subito dopo la libreria Supabase e prima di `auth.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="storage-notice.js"></script>
<script src="questions.js"></script>
<script src="auth.js"></script>
<script src="main.js"></script>
```

## Ragionamento legale (sintesi)

- Il sito raccoglie: email, username, punteggi. Niente tracking, niente analytics, niente terze parti pubblicitarie.
- Supabase Auth usa `localStorage` (non cookie veri) per la sessione di login.
- Lo storage strettamente necessario al funzionamento del servizio richiesto dall'utente (mantenere la sessione di login) **non richiede consenso preventivo opt-in** secondo le linee guida GDPR/ePrivacy — va solo dichiarato. Da qui la scelta di un banner informativo invece di un cookie wall con Accetta/Rifiuta.

## Contenuto della Privacy Policy (riassunto)

- Titolare: progetto personale, contatto a.trevisan@proton.me
- Dati raccolti: email, username, punteggi quiz
- Finalità: accesso account, salvataggio progressi
- Sub-processor: Supabase (GDPR compliant)
- Conservazione: fino a cancellazione account
- Diritti utente: accesso, rettifica, cancellazione (self-service da profilo), opposizione
- Aggiornamenti: notificati via email o avviso sul sito

## Account page (`account.html` / `account.js`)

Implementata la gestione account lato utente, collegata da `index.html` (link "Account" visibile solo se loggato) e da `privacy.html` (il link per l'eliminazione account punta qui):

- **Cambio password**: richiede la vecchia password, verificata con un re-login silenzioso (`signInWithPassword`) prima di chiamare `updateUser({ password })`.
- **Reset password via email**: `resetPasswordForEmail`, poi flusso di recovery gestito nella stessa pagina (`isRecoveryMode()` legge `type=recovery` dall'hash dell'URL e mostra la sezione `#recovery-section`).
- **Cancellazione account**: bottone con conferma a due passaggi, poi chiamata POST a una Supabase Edge Function (`delete-account`) con il token di sessione nell'header `Authorization`. La Edge Function è stata scritta e deployata (vedi `03-technical.md` per i dettagli) — usa la `service_role` key lato server per cancellare l'utente da `auth.users` e la riga in `profiles`.

Questo soddisfa quanto promesso nella Privacy Policy ("puoi fare questo direttamente dal tuo profilo").

## Da fare

- [ ] Verificare in quale regione è ospitato il progetto Supabase (Settings → General) e se serve specificarlo nella privacy policy (EU vs USA influisce sulle clausole di trasferimento dati).
- [ ] Decidere se serve un Data Processing Agreement (DPA) formale con Supabase (di solito disponibile nelle loro impostazioni org/billing) — utile da avere anche per un progetto hobbistico se cresce.
- [ ] Rivalutare la compliance quando si introdurrà la classifica utenti (punto 5 della roadmap): username pubblici vanno bene per privacy, ma verificare di non esporre altri dati nella vista classifica.
