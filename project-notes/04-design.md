# Stile e design — note di progetto

## Direzione estetica

**"Vecchi archivi di internet"** — esplicitamente non abbellito, niente colori, niente ombre, niente arrotondamenti decorativi. L'obiettivo è il sapore anni '90/primi 2000, non un sito moderno minimalista.

## Decisioni prese

- **Font**: `serif` puro, nessun font-family elaborato — lascia che il browser usi il suo serif di default (tipicamente Times New Roman). Questo da solo dà gran parte del sapore "vecchio internet".
- **Layout**: nessuna sidebar, nessun `<aside>`. Tutto a scorrimento verticale in un unico `<main>`.
- **Allineamento**: tutto a sinistra, **niente centering**. Una decisione esplicita — niente `margin: 0 auto` per centrare il contenuto.
- **Spaziatura**: solo margini e padding essenziali per evitare che gli elementi siano "appiccicati" — non è styling decorativo, è leggibilità minima.
- **Colori**: nessuno definito esplicitamente — si usano i default del browser (link blu, bottoni di sistema, ecc.)
- **Bordi/ombre/arrotondamenti**: assenti per design, coerentemente con l'estetica "vecchio internet"

## CSS attuale (`styles.css`)

```css
body {
  max-width: 600px;
  padding: 1rem;
  font-family: serif;
}

header {
  margin-bottom: 2rem;
}

#score-display {
  margin-bottom: 1.5rem;
}

#question-card {
  margin-bottom: 1.5rem;
}

#question-text {
  margin-bottom: 1rem;
}

#options button {
  display: block;
  margin-bottom: 0.5rem;
}

#feedback-area {
  margin-bottom: 1rem;
}
```

Nota: questo CSS riflette lo stato della conversazione fino alla rimozione del centering. Probabili aggiunte non ancora sincronizzate qui: stili per il banner di storage-notice, per il footer con il link alla privacy policy, e per la pagina `privacy.html` (che attualmente eredita lo stesso `styles.css` senza bisogno di classi aggiuntive, usando semplicemente `h2` e `ul` di base).

## Scelte di markup correlate allo stile

- Uso di `id` invece di `class` per quasi tutti gli elementi, perché ogni elemento è unico nella pagina (non ce ne sono ripetuti dello stesso tipo) — le classi sono riservate a casi con elementi multipli simili (es. `#options button`)
- Nessun framework CSS, nessun preprocessore — coerente con la filosofia "ridotto all'osso" del progetto

## Da fare

- [ ] **Pagina adattabile su schermo piccolo** (roadmap punto 6) — al momento nessuna media query è stata scritta. Da decidere se mantenere lo stesso minimalismo anche su mobile o se serve qualche piccolo accorgimento (es. bottoni delle opzioni più larghi/touch-friendly)
- [ ] Stile del banner `storage-notice.js` — al momento nessun CSS è stato scritto per `#storage-notice`, va deciso se renderlo fisso in basso, con un minimo di contrasto visivo rispetto al resto della pagina (es. un bordo superiore semplice, niente di più)
- [ ] Sincronizzare in questa cartella la versione più recente di `index.html` e `styles.css`, modificati a mano da Alessandra fuori da questa conversazione
