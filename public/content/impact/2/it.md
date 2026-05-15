### Sintesi Esecutiva

Ho progettato e fornito un servizio di orchestrazione distribuito basato su SAGA che consente ai clienti di aderire allo scoperto ("Cheque Especial") direttamente tramite canali mobile.

La soluzione coordina più domini backend (autorizzazione, rischio, servizi conto, notifica) garantendo consistenza eventuale, tolleranza ai guasti e alta concorrenza in un ambiente bancario regolamentato.

### Impatto sul Business

- Abilitato onboarding del prodotto scoperto tramite canale mobile
- Ridotta dipendenza operativa da filiale/iscrizione manuale
- Aumentata adozione di prodotti digitali
- Rafforzata tracciabilità e visibilità operativa
- Contenimento dei guasti tramite strategia di retry strutturato + DLQ

### Panoramica dell'Architettura

Il servizio di orchestrazione opera come motore di flusso centralizzato, coordinando i servizi di dominio in modo asincrono tramite flussi di eventi e persistendo lo stato della saga per recupero e scalabilità orizzontale.

![diagram](/content/diagrams/impact-2-it-0.svg)

Infrastruttura di supporto:

- Backbone eventi: Apache Kafka
- Dead Letter Queue (DLQ) per iscrizioni fallite
- Persistenza stato: Cassandra (snapshot della saga)
- Osservabilità: logging centralizzato e dashboard Grafana
- Streaming analitico: Apache Spark
- Reporting e BI: Amazon Redshift

#### Caratteristiche architetturali

- Orchestrazione SAGA guidata da macchina a stati
- Comunicazione event-driven tra servizi
- Snapshot persistenti della saga per recupero dopo guasto
- Istanze worker stateless per scalabilità orizzontale
- Gestione idempotente degli eventi
- Strategia di retry limitata con isolamento dei guasti
- Piena osservabilità operativa (log + metriche)

### Modello della Macchina a Stati

Ogni richiesta di iscrizione è modellata come una macchina a stati deterministica con transizioni solo in avanti.

#### Stati principali

- STARTED
- AUTHORIZED
- RISK_APPROVED
- ACCOUNT_UPDATED
- NOTIFIED
- COMPLETED
- FAILED

Le transizioni sono guidate da snapshot e monotone: una volta che la saga avanza a uno stato più recente, eventi più vecchi o duplicati non possono sovrascriverlo.

### Diagramma di Sequenza - Iscrizione Scoperto Event-Driven (Kafka)

![diagram](/content/diagrams/impact-2-it-1.svg)

### Flusso di Iscrizione e Gestione dei Guasti

1. Il cliente invia iscrizione allo scoperto tramite mobile.
2. L'API avvia una nuova istanza della saga (stato = STARTED).
3. Lo stato della saga è persistito in Cassandra.

4. Passo di autorizzazione
   - Invocare il servizio di autorizzazione
   - In caso di successo → transizione a AUTHORIZED
   - In caso di fallimento → retry (fino a 3 tentativi)

5. Valutazione del rischio
   - Invocare il motore di rischio
   - In caso di approvazione → transizione a RISK_APPROVED
   - In caso di fallimento → retry (tentativi limitati)

6. Aggiornamento conto
   - Aggiornare il limite di scoperto
   - In caso di successo → transizione a ACCOUNT_UPDATED
   - In caso di fallimento → retry (tentativi limitati)

7. Notifica
   - Inviare messaggio di conferma
   - Transizione a COMPLETED

### Strategia di Retry e Dead Letter

- Ogni passo supporta fino a 3 tentativi di retry
- Un TTL globale di circa 5 minuti delimita l'esecuzione della saga
- Se i retry si esauriscono o il TTL viene superato:
  - L'iscrizione viene instradata alla Dead Letter Queue (DLQ)
  - Il caso viene inoltrato a un team di supporto dedicato per elaborazione manuale

Questo design evita retry indefiniti, protegge la stabilità del sistema e assicura che le richieste del cliente non vadano perse in silenzio.

### Modello di Idempotenza e Concorrenza

- Nessun locking distribuito su Cassandra
- I worker dell'orchestratore sono stateless e scalabili orizzontalmente
- L'elaborazione duplicata non corrompe lo stato

Se un sistema downstream ha già elaborato una richiesta:

- Il sistema downstream rifiuta l'operazione duplicata
- La macchina a stati ignora gli eventi obsoleti
- Il confronto tramite snapshot assicura solo transizioni in avanti

La progressione dello stato è monotona.  
Eventi più vecchi non possono sovrascrivere uno stato di saga più avanzato.

Questo garantisce sicurezza senza introdurre colli di bottiglia di coordinamento.

### Osservabilità e Trasparenza Operativa

- Log strutturati per ogni transizione della saga
- Aggregazione centralizzata dei log
- Traccia operativa interrogabile in Grafana
- Monitoraggio della DLQ per flussi di intervento manuale
- Metriche in tempo reale per sistemi di analytics e reporting

I team operativi possono tracciare qualsiasi iscrizione end-to-end in pochi secondi.

### Design di Scalabilità e Resilienza

- Worker orchestratori stateless
- Coordinamento distribuito basato su Kafka
- Persistenza dello stato della saga su Cassandra
- Capacità sicura di replay e ripresa
- Modello di retry limitato che previene guasti a cascata
- Progettato per alta concorrenza durante picchi di utilizzo mobile

---

_Associato a Itaú Unibanco_

_Dettagli quali tempistiche, metriche e identificatori interni sono stati generalizzati in conformità con accordi di riservatezza._

---

### Tech Stack

Java, Spring Boot, Spring State Machine, Apache Kafka, Cassandra, Apache Spark, Amazon Redshift, Docker, JUnit, Grafana
