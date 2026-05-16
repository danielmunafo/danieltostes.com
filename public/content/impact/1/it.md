## Motore di Personalizzazione IA in Tempo Reale per Flussi Email Transazionali

### Sintesi Esecutiva

Ho progettato e guidato l'implementazione di un motore decisionale vettoriale a bassa latenza per personalizzazione guidata dall'IA all'interno di flussi email transazionali critici per i ricavi, incluse esperienze di conferma acquisto in cui il recupero dei contenuti non deve mai interrompere il messaggio transazionale principale.

La piattaforma trasformava i segnali di interazione del cliente in embedding, li confrontava con vettori di campagne attive e profili simili, e restituiva blocchi di contenuto personalizzati in modo sincrono entro una finestra di risposta rigorosa di ~200 ms a ~100 RPS. Invece di trattare la personalizzazione come una tabella statica di regole, il sistema usava matching per similarità ed embedding di profili “Power User” per selezionare campagne più allineate al comportamento di ciascun cliente.

Il servizio è stato costruito come microservizio containerizzato Node.js/TypeScript esposto tramite API REST e integrato nella pipeline email transazionale di Klarna, con comportamento di fallback sicuro, osservabilità Datadog, monitoraggio SLO e ownership on-call per proteggere la comunicazione ad alto volume con i clienti.

### Impatto e Risultati

- Ho aumentato l'engagement con blocchi di contenuto personalizzati nelle email transazionali, migliorando CTR delle campagne e opportunità di conversione a valle.
- Ho migliorato il CTR da ~1,4% a ~1,8%; con 1M di acquisti mensili, ciò rappresenta circa 4.000 clic aggiuntivi al mese, o ~3.000 clic incrementali considerando la baseline precedente, a seconda delle ipotesi di attribuzione.
- Ho stabilito una base scalabile e a bassa latenza per personalizzazione con IA, estendibile oltre i flussi di conferma acquisto verso canali transazionali e di lifecycle aggiuntivi.
- Ho abilitato una selezione campagne più adattiva confrontando embedding comportamentali del cliente con vettori di campagne attive invece di affidarsi solo a regole statiche di segmentazione.
- Ho protetto l'affidabilità dell'email transazionale con percorsi di fallback deterministici, così personalizzazione lenta, non disponibile o fallita non bloccasse mai il messaggio principale di conferma acquisto.

![diagram](/content/diagrams/impact-1-it-0.svg)

### Diagramma di Sequenza — Flusso di Personalizzazione con Fallback

![diagram](/content/diagrams/impact-1-it-1.svg)

### Architettura del Motore Decisionale

- Ho progettato e implementato un motore decisionale vettoriale che eseguiva matching di similarità degli embedding in tempo reale tra profili di interazione del cliente, vettori di campagne attive e segnali di raccomandazione basati su peer.
- Ho costruito la logica dei profili “Power User” rappresentando comportamenti ad alte prestazioni come embedding e abbinando clienti simili a campagne con engagement atteso più forte.
- Ho mantenuto il percorso decisionale di personalizzazione vincolato da limiti di latenza, assicurando che la logica di raccomandazione potesse girare in modo sincrono nella generazione email di conferma acquisto senza degradare la pipeline di comunicazione con il cliente.
- Ho progettato il matching delle campagne come layer decisionale a livello di servizio, invece di incorporare logica di business direttamente nei template email, facilitando test, evoluzione, osservabilità e riuso.
- Ho supportato feed di campagne live e vincoli di eleggibilità così il motore restituisse solo blocchi di contenuto validi e attualmente attivi per ogni richiesta.

### Integrazione del Servizio

- Ho deployato il motore come microservizio containerizzato Node.js/TypeScript integrato con la piattaforma email transazionale.
- Ho esposto endpoint REST per recupero sincrono dei contenuti durante i flussi di conferma acquisto, restituendo blocchi personalizzati quando erano soddisfatti confidenza, eleggibilità e vincoli di latenza.
- Ho integrato dati di interazione del cliente, metadati campagne ed embedding di profili simili in un unico flusso decisionale runtime.
- Ho implementato meccanismi di fallback sicuri così dati mancanti, feed non disponibili, matching vettoriale lento o errori di servizio restituissero contenuto predefinito invece di interrompere la consegna transazionale.
- Ho collaborato con data platform, incentivi, contenuti, marketing, analytics e platform engineering per allineare requisiti campagna, disponibilità dati, obiettivi di sperimentazione e vincoli operativi.

### Osservabilità, Performance e Affidabilità

- Ho strumentato tracing end-to-end, istogrammi di latenza, metriche di error rate e metriche di business custom in Datadog per monitorare qualità delle raccomandazioni e salute del sistema.
- Ho definito e monitorato SLO/SLA su tempo di risposta, disponibilità e comportamento in caso di fallimento in un percorso critico di generazione email per i ricavi.
- Ho partecipato a turni on-call 24/7, con ownership operativa per incidenti che colpissero personalizzazione, recupero campagne o integrazione email transazionale.
- Ho usato telemetria di fallback per distinguere comportamento sano di contenuto predefinito da fallimenti di personalizzazione che richiedevano azione di ingegneria.
- Ho aggiunto test automatizzati su comportamento decisionale, contratti REST, scenari di fallback e confini di integrazione per ridurre il rischio di regressione nella consegna campagne.

### Contesto di Prodotto e Business

- Il motore operava all'interno di flussi email transazionali, dove la personalizzazione doveva migliorare l'engagement senza creare rischio per la comunicazione obbligatoria con il cliente.
- Il design bilanciava sperimentazione, performance campagne, rilevanza per l'utente e affidabilità separando le decisioni di raccomandazione dal percorso principale di consegna email.
- L'architettura ha creato un pattern riutilizzabile per futuri casi di personalizzazione assistita dall'IA: raccogliere segnali comportamentali, rappresentarli come embedding, abbinarli a contenuti eleggibili, restituire il miglior candidato entro un budget rigoroso di latenza e fare fallback in sicurezza quando confidenza o disponibilità fossero insufficienti.

---

_Associato a Klarna_

_Dettagli come tempistiche specifiche, metriche e identificatori interni sono stati generalizzati in conformità con accordi di riservatezza._

---

### Stack Tecnologico

TypeScript, Node.js, REST APIs, AWS, Microservizi Containerizzati, Datadog, Jest, Ricerca Vettoriale, Embedding, Matching per Similarità, Sistemi di Raccomandazione, Email Transazionale, DDD
