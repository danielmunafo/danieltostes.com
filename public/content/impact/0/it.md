### Sintesi Esecutiva

Ho progettato e consegnato una piattaforma di automazione delle richieste di garanzia guidata dall'IA per un flusso e-commerce consumer, sostituendo un processo manuale e dipendente dal supporto con una pipeline decisionale scalabile che coordina valutazione immagini con IA, regole di business deterministiche, aggiornamenti CRM, automazione chatbot e percorsi di escalation umana.

Il sistema è stato costruito attorno a un motore decisionale basato su JSON e worker asincroni, così le regole di business potessero evolvere senza richiedere modifiche rischiose in produzione nel flusso centrale di orchestrazione. Invece di trattare l'output dell'IA come decisione finale, la piattaforma usa l'analisi immagini con IA come un input in uno strato di regole controllato, mantenendo decisioni spiegabili, verificabili e sicure da escalare quando la confidenza o la copertura delle regole è insufficiente.

### Impatto e Risultati

- Ho ridotto il carico manuale nel processing delle garanzie automatizzando percorsi decisionali ripetibili, preservando l'escalation al supporto per casi incerti, falliti o eccezionali.
- Ho aumentato la copertura di automazione con regole di business dinamiche, consentendo nuovi scenari di reclamo e policy operative senza interrompere l'intera piattaforma.
- Ho migliorato l'affidabilità operativa con elaborazione asincrona, retry limitati, recupero basato su code e stati di fallimento espliciti per flussi di garanzia di lunga durata.
- Ho collegato ingegneria, business, supporto, infrastruttura, sicurezza e prodotto tramite tracciabilità su ticket, specifiche condivise, log delle decisioni e checkpoint di integrazione.
- Ho stabilito un framework riutilizzabile di automazione per flussi di supporto assistiti dall'IA in cui regole deterministiche, aggiornamenti su sistemi esterni e revisione umana devono coesistere in sicurezza.

### Diagramma di Architettura

![diagram](/content/diagrams/impact-0-it-0.svg)

## Diagramma di Sequenza

![diagram](/content/diagrams/impact-0-it-1.svg)

### Orchestrazione del Flusso e Affidabilità

- Ho architettato l'elaborazione asincrona con BullMQ e worker Redis per disaccoppiare la valutazione prolungata delle richieste dalle interazioni user-facing e con sistemi esterni.
- Ho modellato il ciclo di vita della richiesta come un flusso a macchina a stati multifase, coordinando valutazione IA, esecuzione regole, aggiornamenti CRM, handoff chatbot, retry e stati di escalation.
- Ho introdotto logica di retry limitata con escalation automatica ai team di supporto quando fallivano sistemi esterni, la valutazione IA era inconclusiva o il motore decisionale raggiungeva un percorso sconosciuto.
- Ho progettato recupero basato su code e salvaguardie di processing idempotente così job duplicati, ritardati o parzialmente falliti potessero essere gestiti senza corrompere lo stato della richiesta.
- Ho integrato alerting, monitoraggio e visibilità operativa su salute delle code, fallimenti dei worker, esaurimento retry ed errori di integrazioni esterne.

### Architettura Decisionale e di Processing

- Ho costruito un motore decisionale basato su JSON che valuta output strutturati di classificazione immagini IA contro regole di business configurabili.
- Ho mantenuto l'output del modello IA dietro confini deterministici di regole, così le decisioni di garanzia restassero spiegabili, testabili e revisionabili da business e supporto.
- Ho progettato il motore di regole per supportare scenari di business in evoluzione senza forzare modifiche ad alto rischio in orchestrazione, code o codice di integrazione.
- Ho integrato aggiornamenti di stato dei casi Salesforce così i team di supporto potessero seguire progresso, esiti automatizzati e motivi di escalation nei flussi operativi esistenti.
- Ho collegato l'automazione chatbot al flusso di garanzia così i clienti ricevessero passi guidati mentre la piattaforma continuava a processare in modo asincrono in background.

### Piattaforma e Pratiche di Ingegneria

- Ho applicato confini Clean Architecture per separare orchestrazione, valutazione regole, adapter esterni, worker di coda, servizi GraphQL e infrastruttura.
- Ho integrato servizi GraphQL con Apollo Federation in un ecosistema TypeScript e Node.js.
- Ho deployato su AWS con Kubernetes, con infrastruttura e delivery gestite tramite Terraform e ArgoCD.
- Ho definito e mantenuto copertura E2E per journey critici di garanzia, inclusi percorsi di automazione riusciti, scenari di retry, flussi di escalation e fallimenti di integrazioni esterne.
- Ho usato flussi di pianificazione strutturati, documentazione assistita dall'IA revisionata da persone e log delle decisioni per mantenere visibili le scelte di implementazione tra ingegneria e stakeholder non tecnici.

---

_Engagement con Cliente Riservato (Contratto)_

_Dettagli come tempistiche specifiche, metriche, identificatori di brand, nomi di vendor e nomi interni di sistemi sono stati generalizzati in conformità con accordi di riservatezza._

---

### Stack Tecnologico

TypeScript, Node.js, GraphQL, Apollo Federation, BullMQ, Redis, AWS, Kubernetes, Terraform, ArgoCD, Integrazione Salesforce, Automazione Chatbot, Integrazioni Modelli IA, Valutazione Immagini, Clean Architecture, Test E2E
