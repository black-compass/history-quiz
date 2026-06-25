# Parte tecnica — note di progetto

## Stack

- HTML + CSS + JavaScript vanilla, nessun framework
- Backend: **Supabase** (Auth + Postgres) — piano gratuito
- Hosting: **GitHub Pages**, repo pubblico

## Struttura dei file

```
history-quiz/
├── index.html          (root del repo)
├── styles.css
├── main.js             (logica quiz: domande, punteggio, rendering)
├── auth.js             (login, registrazione, sessione, salvataggio punteggio)
├── account.html        (pagina gestione account: password, reset, cancellazione)
├── account.js          (logica della pagina account)
├── questions.js        (database domande, caricato come variabile globale `questions`)
├── storage-notice.js   (banner informativo storage/cookie)
├── supabase/
│   └── functions/
│       └── delete-account/
│           └── index.ts   (Edge Function per la cancellazione account, deployata)
└── docs/
    └── privacy.html
```

Ordine di caricamento degli script in `index.html` (importante, perché ogni file dipende dal precedente):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="storage-notice.js"></script>
<script src="questions.js"></script>
<script src="auth.js"></script>
<script src="main.js"></script>
```

## Supabase — setup

- Progetto: **History Quiz**, ID `qjqcakgyxnzinavyjyvt`
- URL progetto: `https://qjqcakgyxnzinavyjyvt.supabase.co`
- ⚠️ **Il piano free pausa il progetto dopo 7 giorni di inattività.** Va riattivato manualmente dal dashboard se serve (link diretto nell'email di notifica). Restaurabile entro 90 giorni dalla pausa, dopo i dati sono scaricabili ma il progetto non è più ripristinabile. Con traffico reale post-deployment il problema dovrebbe sparire da solo.
- Tabella `profiles`:

```sql
create table profiles (
  id uuid references auth.users on delete cascade,
  username text,
  score integer default 0,
  questions_answered integer default 0,
  primary key (id)
);

alter table profiles enable row level security;

create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

- Chiave usata nel codice frontend: **anon public** (sicura da esporre, protetta dalle RLS policy sopra). **Mai** usare la `service_role secret` nel frontend.
- Provider email/password abilitato in Authentication → Providers.

## Flusso di autenticazione (`auth.js`)

- `signUp()` — crea utente via `sb.auth.signUp()`, poi inserisce una riga in `profiles`
- `signIn()` — login via `sb.auth.signInWithPassword()`, carica il profilo esistente e ripristina `score`
- `signOut()` — termina sessione, torna alla landing page
- `playAsGuest()` — bypassa Supabase, gioca senza salvare nulla (`currentUser = null`)
- `startQuiz()` — punto unico che mostra la sezione quiz e chiama `renderQuestion()` per inizializzare la prima domanda — **importante**: questa è la funzione che fa davvero partire il quiz, va chiamata da ogni singolo percorso (signup, login, guest, sessione ripristinata)
- `saveScore()` — chiamata da `main.js` dopo ogni risposta; no-op se `currentUser` è null (guest)
- `sb.auth.getSession()` — al caricamento della pagina, ripristina automaticamente la sessione se l'utente era già loggato in precedenza (solo se `startQuiz` esiste come funzione — `account.html` non la definisce, quindi su quella pagina questo controllo viene saltato)

## Pagina Account (`account.html` / `account.js`)

Riusa l'istanza `sb` e la variabile `currentUser` già definite in `auth.js` (caricato prima di `account.js`).

- `initAccountPage()` — punto di ingresso, chiamato a fine file. Distingue due modalità leggendo l'hash dell'URL:
  - **Modalità normale**: richiede sessione attiva (`sb.auth.getSession()`), altrimenti redirect a `index.html`. Mostra `#account-main-section`.
  - **Modalità recovery**: se l'hash contiene `type=recovery` (link cliccato dall'email di reset), mostra `#recovery-section` invece della pagina normale.
- `changePassword()` — verifica la vecchia password con un re-login silenzioso (`signInWithPassword`), poi `sb.auth.updateUser({ password: newPassword })`.
- `sendResetEmail()` / `setNewPasswordFromRecovery()` — flusso "password scordata": invia email con `resetPasswordForEmail`, poi l'utente clicca il link e finisce di nuovo su `account.html` ma in modalità recovery, dove imposta la nuova password.
- `showDeleteConfirm()` / `hideDeleteConfirm()` / `deleteAccount()` — conferma a due passaggi, poi POST a `DELETE_ACCOUNT_FUNCTION_URL` con il token di sessione (`sessionData.session.access_token`) nell'header `Authorization: Bearer ...`.

### Edge Function `delete-account` — scritta e deployata

Il frontend chiama `https://qjqcakgyxnzinavyjyvt.supabase.co/functions/v1/delete-account`. La funzione vive in `supabase/functions/delete-account/index.ts` ed è stata deployata con `supabase functions deploy delete-account`.

Perché serve una Edge Function e non si può fare direttamente dal frontend: cancellare un utente da Supabase Auth richiede la chiave **service_role** (privilegi di admin), che **non deve mai finire nel codice frontend** — chiunque potrebbe leggerla e cancellare account a piacere. La Edge Function gira lato server, quindi può usare la service_role in sicurezza.

Cosa fa, in breve:
1. Legge il token dall'header `Authorization` e verifica l'utente con `supabase.auth.getUser(token)`.
2. Cancella la riga corrispondente in `profiles` (oltre all'`on delete cascade` già presente nello schema della tabella, fatto qui in modo esplicito).
3. Cancella l'utente da `auth.users` con `supabase.auth.admin.deleteUser(userId)`, usando un client Supabase creato con la **service_role key** (mai quella anon).
4. Risponde con status 200 in caso di successo, o un JSON `{ error: "..." }` con status >= 400 in caso di fallimento — esattamente il formato che `account.js` si aspetta.

**Setup ambiente della funzione** — nota per il futuro, perché non è ovvio: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono fornite automaticamente da Supabase a ogni Edge Function, **non vanno impostate a mano** (la CLI blocca esplicitamente i secrets con prefisso `SUPABASE_`). L'unico secret impostato manualmente è la anon key, sotto il nome `PROJECT_ANON_KEY` (per evitare il prefisso riservato):
```bash
supabase secrets set PROJECT_ANON_KEY=<anon key del progetto>
```

## Bug risolti durante lo sviluppo (utile da ricordare)

1. **`startQuiz()` definita due volte in `auth.js`** — la prima versione (senza `renderQuestion()`) sovrascriveva silenziosamente la seconda essendo dichiarata prima. Risolto tenendo solo la versione che chiama `renderQuestion()`.
2. **`questions[currentIndex]` invece di `shuffledQuestions[currentIndex]`** in `answer()` — bug introdotto dopo l'aggiunta dello shuffle, perché non tutte le occorrenze erano state aggiornate.
3. **File aperto da `file://` invece che da un server locale** — il browser blocca le richieste verso Supabase per motivi di sicurezza sulle origini. Soluzione: `python3 -m http.server 8000` dalla cartella del progetto, poi `http://localhost:8000`.
4. **Errore 422 su signup** — causato da una anon key copiata male (carattere mancante). Risolto ricopiando la chiave da Settings → API.
5. **Anon key vs Service key** — chiarito che nel frontend va sempre e solo la **anon public**, mai la secret.

## Deployment

- Repo: `black-compass/history-quiz` su GitHub
- URL live: **https://black-compass.github.io/history-quiz/**
- Attivato da Settings → Pages del repository, branch `main`

## Da fare

- [ ] `index.html` e `styles.css` aggiornati a mano da Alessandra non sono ancora stati riportati in questa cartella di progetto — sincronizzare quando si fa il prossimo giro di modifiche
- [ ] Verificare se serve gestire un caso di "sessione scaduta" (token Supabase espirato) in modo più esplicito per l'utente
- [ ] Valutare se servono indici o policy aggiuntive su `profiles` quando si introdurrà la classifica pubblica (roadmap punto 5) — al momento le RLS permettono solo a ciascun utente di leggere/scrivere il proprio profilo, una classifica pubblica richiederà una policy di lettura più permissiva (es. solo su `username` e `score`, non su altri campi)
