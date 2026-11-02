# CLAUDE.md

## Filosofia di codice
- Fai la soluzione più semplice che soddisfa il requisito attuale. Niente funzionalità "per il futuro".
- Non introdurre un'interfaccia se esiste una sola implementazione.
- Non usare design pattern (Factory, Builder, Strategy, Visitor...) a meno che
  io non lo chieda o che il codice duplicato in 3+ punti lo giustifichi chiaramente.
- Preferisci metodi semplici e classi concrete a gerarchie e generics elaborati.
- Non aggiungere layer, moduli o package nuovi senza chiedermelo.
- Non aggiungere dipendenze nuove senza chiedermelo.
- Segui lo stile e le convenzioni del codice già presente, anche se non è quello che sceglieresti.
- Modifica solo ciò che serve per il task: niente refactoring "già che ci sono".
- Niente gestione di errori o casi limite che non possono verificarsi.
- Se il task richiede più di ~3 file nuovi, fermati e proponi prima il piano.

## Java
- Usa le feature del linguaggio (record, stream semplici, Optional dove ha senso) ma senza eccessi.
- Evita reflection, AOP custom, annotation custom e generics complessi.
- Preferisci la soluzione già offerta dallo stack in uso (es. Spring) a un'astrazione costruita a mano.
