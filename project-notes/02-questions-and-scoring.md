# Domande e punteggio — note di progetto

## Struttura del database domande (`questions.js`)

200 domande totali, ognuna come oggetto con questa forma:

```js
{
  text: "...",
  options: ["...", "...", "...", "..."],
  correct: 2,     // indice (0-based) della risposta giusta in options
  level: 1         // 1, 2, o 3 — vedi sotto
}
```

### Distribuzione per livello

| Livello | Quantità | Target | Range indicativo nel file originale |
|---|---|---|---|
| 1 | 100 | Cultura generale, domande controintuitive/mitobustanti | domande 1–100 |
| 2 | 60 | Intermedio — da lettori di storia, non cultura pop | domande 101–160 |
| 3 | 40 | Difficile — da studiosi | domande 161–200 |

Tutte le domande sono state scritte per essere non banali o per smontare un'idea comune (es. miti su Napoleone, sulla Grande Muraglia, sull'incendio della Biblioteca di Alessandria).

## Ordine di presentazione

Le domande vengono mescolate con **Fisher-Yates shuffle** ad ogni avvio del quiz:

```js
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const shuffledQuestions = shuffle([...questions]);
```

Il `[...questions]` crea una copia per non modificare l'array originale importato da `questions.js`.

## Modello di punteggio attuale — asimmetrico, penalizzante sul facile

Implementato in `main.js`, funzione `getPoints(level, correct)`:

- **Risposta corretta**: +1 / +2 / +3 secondo il livello (le domande difficili valgono più punti)
- **Risposta sbagliata**:
  - Livello 1 (facile): **-2** — sbagliare qualcosa di facile costa più caro
  - Livello 2 (medio): -1
  - Livello 3 (difficile): -1

```js
function getPoints(level, correct) {
  if (correct) {
    return level;
  } else {
    if (level === 1) return -2;
    if (level === 2) return -1;
    if (level === 3) return -1;
  }
}
```

Razionale: punisce la superficialità (sbagliare il facile) più di un errore su una domanda davvero ostica, e premia la profondità di conoscenza.

## Idea futura — punteggio dinamico stile Elo (roadmap punto 3)

Discusso ma non implementato. L'idea è che il valore di una domanda non sia fisso per `level`, ma dipenda da **quante volte è stata sbagliata/indovinata dagli altri utenti**:

- Richiede tracciare statistiche aggregate per domanda (es. tabella Supabase `question_stats` con conteggio risposte corrette/sbagliate)
- Una domanda che il 90% delle persone sbaglia vale di più se indovinata
- Più complesso, richiede query aggregate e probabilmente un aggiornamento asincrono dei pesi — da affrontare quando ci sarà una base di utenti reale che genera dati

## Da fare

- [ ] Eventualmente aggiungere un quarto/quinto livello se il pool di domande cresce molto (richiesto: centinaia/migliaia di domande, vedi conversazione originale)
- [ ] Implementare il modello Elo-style quando si avrà traffico utenti sufficiente
- [ ] Collegare la cronologia delle domande già risposte (roadmap punto 4) — serve probabilmente un campo `question_id` univoco per ogni domanda, attualmente le domande sono identificate solo per posizione nell'array, non con un id stabile
