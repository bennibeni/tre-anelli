# Tre Anelli

Un gioco sugli omomorfismi orientati. Lo schema è formato da tre esagoni (13 nodi, 15 archi) con frecce
orientate a caso; il giocatore lo colora un nodo alla volta con i sei colori di un piccolo torneo, A₆.

Next.js (App Router) · React 19.

## Regole

- Si parte da un nodo qualsiasi; ogni nuovo nodo deve essere collegato a uno già colorato.
- Per ogni freccia **u → v** tra nodi colorati, nel torneo deve esserci la freccia **colore(u) → colore(v)**:
  la colorazione è un omomorfismo orientato dallo schema al torneo.
- In ogni schema si possono usare al massimo **k** colori diversi, dove k è il minimo numero di colori di A₆
  con cui quello schema si può colorare (quasi sempre 4, a volte 3 o 5).
- Le mosse non si annullano: se un nodo resta senza colori possibili, la partita è persa.
- Unico aiuto: con un nodo selezionato, i colori non ammessi sono disattivati.

Ogni partita è sempre risolvibile: con A₆ ogni orientamento della griglia esagonale ammette una colorazione
(A. Lozano, [_The Oriented Chromatic Number of the Hexagonal Grid is 6_](https://arxiv.org/abs/2007.13111),
Teorema 1), e k è scelto in modo che una soluzione con k colori esista sempre.

## Avvio

```bash
npm install
npm run dev          # http://localhost:3000
```

## Comandi

| Comando                       | Cosa fa                                              |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | server di sviluppo                                   |
| `npm run build` / `npm start` | build di produzione e avvio                          |
| `npm run lint`                | ESLint (regole Next.js)                              |
| `npm test`                    | test unitari (Vitest): logica del gioco e torneo A₆  |

Il progetto si pubblica su Vercel senza configurazione aggiuntiva.

## Struttura

```
app/
  layout.js                  metadati e lingua
  page.js                    monta il gioco e il collegamento a tutti i progetti
  globals.css                stili di pagina
  icon.svg                   icona
game/
  TreAnelliGame.jsx          il gioco: schema, tavolozza, torneo e spiegazioni
  A6TournamentVisualizer.jsx disegno interattivo del torneo A₆
  gameLogic.js               logica pura: griglia, colori ammessi, limite k, completabilità
  tournament.js              i sei colori e i 15 archi del torneo A₆
tests/unit/
  gameLogic.test.js          risolvibilità, limite k, frontiera, coerenza dei controlli
  tournament.test.js         il torneo e la sua Proprietà 1
```

Il pannello nascosto «Quanto è difficile questo schema?» (simulazioni automatiche) si riattiva impostando
`SHOW_ANALYSIS = true` in `game/TreAnelliGame.jsx`.

## Fonti

- A. Lozano, [The Oriented Chromatic Number of the Hexagonal Grid is 6](https://arxiv.org/abs/2007.13111)
- H. Bielak, _The oriented chromatic number of some grids_, Annales UMCS Informatica AI 5 (2006)
- Wikipedia: [Graph homomorphism](https://en.wikipedia.org/wiki/Graph_homomorphism),
  [Oriented coloring](https://en.wikipedia.org/wiki/Oriented_coloring)
