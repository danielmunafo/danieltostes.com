## Motore di Personalizzazione con IA in Tempo Reale per Flussi Email Transazionali

### Sintesi Esecutiva

Ho progettato e guidato l'implementazione di un motore decisionale a bassa latenza basato su vettori che alimenta la personalizzazione guidata dall'IA nei flussi di email transazionali critici per il revenue (es. conferme d'acquisto).

Ho costruito un sistema che trasforma i dati di interazione del cliente in embedding e li confronta con le campagne attive in tempo reale, consentendo la selezione di contenuti contestuali entro vincoli rigorosi di latenza (~200ms a ~100 RPS).

### Impatto e Risultati

- Maggiore engagement con blocchi di contenuto personalizzato, migliorando click-through e conversione nelle email transazionali.
- Istituzione di una base scalabile e a bassa latenza per la personalizzazione con IA su canali aggiuntivi.
- CTR da 1,4% a 1,8% — Per 1 milione di acquisti mensili rappresenta ~3k visite aggiuntive al mese a campagne e annunci aziendali.

![diagram](/content/diagrams/impact-1-it-0.svg)

### Diagramma di Sequenza - Flusso di Personalizzazione con Fallback

![diagram](/content/diagrams/impact-1-it-1.svg)

### Architettura del Motore Decisionale

- Ho progettato e implementato un motore decisionale basato su vettori che esegue il matching di similarità degli embedding in tempo reale rispetto ai vettori delle campagne attive.
- Ho costruito logica di profilazione tra pari utilizzando embedding di "Power User" per guidare le decisioni di raccomandazione sotto vincoli deterministici di latenza.

### Integrazione dei Servizi

- Distribuito come microservizio Node.js/TypeScript containerizzato all'interno della pipeline di email transazionali.
- Endpoint REST esposti per il recupero sincrono dei contenuti durante i flussi di conferma acquisto.
- Meccanismi di fallback sicuri implementati per garantire zero interruzioni alla messaggistica transazionale core.

### Osservabilità, Prestazioni e Affidabilità

- Tracciamento end-to-end e metriche custom di latenza/errore strumentate in Datadog.
- SLO/SLA definiti e monitorati per tempo di risposta e disponibilità.
- Partecipazione al turno di guardia 24/7 per questo sistema critico per il revenue.

---

_Associato a Klarna_

_I dettagli quali tempistiche, metriche e identificatori interni sono stati generalizzati in conformità con gli accordi di riservatezza._

---

### Tech Stack

TypeScript, Node.js, REST APIs, AWS, Datadog, Jest, Vector Search, Embeddings, DDD
