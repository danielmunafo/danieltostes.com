## Sistemi Distribuiti — Coordinazione Event-Driven e Isolamento dei Fallimenti

**Problema:** I sistemi in produzione in adesione bancaria, automazione garanzie, sincronizzazione fatturazione/fattura, reporting fiscale e personalizzazione email transazionali richiedevano di coordinare lavoro tra domini indipendenti senza creare accoppiamento fragile, tempeste di retry o single point of failure.

**Approccio:** Ho progettato architetture event-driven e asincrone con gestione esplicita dello stato. Ho usato orchestrazione SAGA con macchine a stati deterministiche per flussi bancari multi-step, worker BullMQ/Redis per automazione garanzie di lunga durata, Kafka per coordinazione cross-domain, SQS/Lambda per sincronizzazione serverless fatturazione→fattura e viste BFF/cachate per reporting fiscale venditori sensibile alla latenza.

**Gestione fallimenti:** Ho usato retry limitati, limiti TTL, dead letter queue, percorsi di escalation, comportamento di fallback e stati di handoff al supporto invece di retry indefiniti. Ho progettato flussi in cui il fallimento parziale era atteso e osservabile: snapshot di stato, progressione monotona, gestione idempotente downstream, processing sicuro contro duplicati e stati terminali espliciti di fallimento.

**Evidenza:** L'adesione mobile allo scoperto in Itaú ha usato Kafka, Avro, snapshot Cassandra, Spring State Machine, routing DLQ ed escalation al supporto. L'automazione garanzie ha usato BullMQ, Redis, coordinamento a macchina a stati, retry e salvaguardie di escalation. La sync fatturazione in Ageras ha usato AWS Lambda, SQS, validazione schema, chiavi di idempotenza, retry e allarmi CloudWatch. Il reporting fiscale in Mercado Libre ha usato una vista BFF asincrona in cache per ridurre la latenza di risposta da 1–2s a fino a ~200ms.

**Perché conta:** Dimostra comfort nel progettare sistemi in cui fallimento parziale, eventi duplicati, risposte ritardate e fallimenti di dipendenze esterne sono vincoli ingegneristici normali — una preoccupazione senior/staff in ambienti regolamentati, integration-heavy e critici per i ricavi.

## Ingegneria Nativa IA — Flussi LLM con Retrieval e a Stadi

**Problema:** Le funzionalità di prodotto basate su IA possono facilmente diventare generiche, eccessivamente confidenti o fuorvianti se non sono progettate attorno a qualità del retrieval, rischio di allucinazione, calibrazione del fit e confini trasparenti dell'evidenza.

**Approccio:** Ho costruito un assistente recruiter basato su RAG che valuta job description contro evidenze del portfolio usando retrieval deterministico per similarità coseno su chunk di embedding pre-costruiti, analisi LLM a stadi, UX in streaming, tetti espliciti di match score e validazione referenze post-generazione.

**Flusso:** L'assistente esegue shaping deterministico dell'input e un intent gate LLM prima di retrieval o generazione. Poi trasmette tre stadi in un unico percorso di risposta: (1) un valutatore di evidenze dentro marcatori API `thinking` che classifica i requisiti del ruolo come must-have o nice-to-have e l'evidenza come diretta, adiacente, non evidenziata o contraddittoria; (2) un analista di evidenze, anch'esso nel blocco thinking, che sintetizza match ad alto segnale e angoli di colloquio senza contraddire il valutatore; e (3) una valutazione rivolta al recruiter dopo il marcatore di chiusura del thinking, la cui intensità di match non può superare il tetto raccomandato dal valutatore.

**Salvaguardie di grounding:** Il valutatore segnala dove la similarità coseno può indurre in errore, emette guidance di match score con tetti rigidi e impedisce che concetti vicini non correlati vengano presentati come evidenza forte. L'handler attende la fine dello stream del valutatore prima di eseguire analisi downstream, così i prompt successivi ricevono sempre la tabella di copertura completa e autorevole. Dopo il pitch per recruiter, un passaggio strutturato estrae affermazioni concrete, genera embedding e le abbina ai chunk del portfolio per appendere una sezione Referenze con segnalazione esplicita di bassa similarità quando l'evidenza è debole.

**Gestione fit privato:** Quando è configurata una rubrica privata di interessi, un passo opzionale di allineamento interessi gira come completamento non in stream dopo il valutatore. È loggato solo lato server per gli operatori e non viene inviato al client né fuso nel pitch recruiter, mantenendo evidenza pubblica separata dall'analisi di preferenze private.

**Cosa dimostra:** Ingegneria di prodotto nativa IA — trattare retrieval, grounding, incertezza, mitigazione allucinazioni, calibrazione del punteggio e latenza di streaming come preoccupazioni architetturali, non solo di prompt.

## Sistemi Decisionali Guidati dall'IA — Automazione Intelligente sotto Vincoli

**Problema:** Il processing manuale delle garanzie era costoso e difficile da scalare, mentre le email transazionali richiedevano contenuti personalizzati in un percorso critico per i ricavi sotto vincoli rigorosi di latenza di ~200ms a ~100 RPS.

**Approccio:** Ho progettato sistemi decisionali assistiti dall'IA che hanno mantenuto l'output IA dietro confini ingegneristici controllati. L'automazione garanzie ha usato valutazione immagini IA come input in un motore deterministico di regole JSON invece che come decisore finale. La personalizzazione Klarna ha usato matching di similarità vettoriale su comportamento cliente, vettori campagne live ed embedding profili “Power User” per recuperare blocchi eleggibili in tempo reale.

**Pattern di affidabilità:** Ho usato meccanismi di fallback sicuri così i flussi core non fossero bloccati da output IA non disponibili, matching vettoriale lento, dati mancanti, fallimenti di sistemi esterni o percorsi di regola sconosciuti. I flussi garanzie hanno usato processing asincrono su coda, retry limitati, salvaguardie di escalation e stati di handoff al supporto. La personalizzazione email transazionale ha usato fallback a contenuto predefinito per mantenere affidabile la consegna di conferma acquisto.

**Impatto:** Ho ridotto il carico manuale di processing garanzie preservando escalation al supporto per casi incerti o falliti. Ho migliorato l'engagement email transazionale, con CTR da ~1,4% a ~1,8% nel contesto di personalizzazione. Ho stabilito pattern riutilizzabili per automazione assistita dall'IA in cui regole deterministiche, budget di latenza, osservabilità, percorsi di fallback e revisione umana devono coesistere.

## Osservabilità e Affidabilità — Maturità Operativa Guidata da SLO

**Problema:** Piattaforme fintech, bancarie, e-commerce e customer support necessitano visibilità operativa che spieghi cosa è successo tra i sistemi — non solo dashboard che mostrano che qualcosa è rotto.

**Approccio:** Ho strumentato sistemi con Datadog, Grafana, CloudWatch, New Relic, log strutturati, trace distribuite, dashboard latenza/errore e metriche di business custom. Ho definito e monitorato SLO/SLA su tempo di risposta, disponibilità, comportamento in fallimento, salute code e percorsi critici di integrazione.

**Pattern operativi:** Ho usato monitoraggio DLQ, retry limitati, percorsi di escalation, turni on-call, alerting, tracing stato saga, dashboard salute code, telemetria fallback e strumenti diagnostici. Ho progettato sistemi così supporto, SRE e ingegneria potessero tracciare flussi end-to-end tramite log, snapshot di stato, dashboard e query operative.

**Evidenza:** La personalizzazione Klarna ha usato tracing Datadog, SLO latenza/errore, telemetria fallback e ownership on-call. L'orchestrazione SAGA Itaú ha usato log strutturati di transizione, dashboard Grafana, snapshot Cassandra, monitoraggio DLQ e reporting Spark/Redshift. La sync fatturazione Ageras ha usato metriche CloudWatch, dashboard, allarmi, tassi di successo invocazione, latenza e trend errori. Le diagnostiche PagSeguro hanno aggregato dati API in un modello unificato di troubleshooting per team supporto Livello 2 e 3.

**Perché conta:** Mostra ownership di produzione oltre la delivery di feature: visibilità incidenti, contenimento fallimenti, handoff operativi, supportabilità e affidabilità sotto carico.

## Platform Engineering Full-Stack — Delivery e Ownership Cross-Layer

**Problema:** Il lavoro di prodotto complesso spesso attraversa frontend, backend, infrastruttura, osservabilità, dati e preoccupazioni operative. L'impatto dipende dall'ownership dell'intero percorso, non dall'ottimizzare un solo layer.

**Ambito:** Ho consegnato servizi backend in Node.js/TypeScript e Java/Spring, applicazioni frontend in React e React Native, infrastruttura su AWS/Kubernetes/Terraform, pipeline CI/CD, osservabilità e test in fintech, banking, e-commerce, validazione farmaceutica, customer support e domini prodotto assistiti dall'IA.

**Pattern di delivery:** Ownership del ciclo di vita completo dalla discovery e architettura a implementazione, test, rollout, monitoraggio e iterazione. Ho usato clean architecture, confini esagonali, microservizi, flussi event-driven, scaffold frontend riutilizzabili, monorepo, librerie UI condivise, API tipizzate, test E2E e automazione deploy.

**Evidenza:** BKYC Ageras ha combinato React Native, web React, servizi backend, integrazioni Solaris/terze parti, Datadog e onboarding sensibile alla compliance. Mercado Libre ha combinato API fiscali, dashboard venditori, piattaforme backoffice, scaffold riutilizzabili, monorepo e migrazione infrastruttura. Five Validation ha combinato Java/Spring, React, PostgreSQL, AWS, Jenkins, SonarQube, CloudWatch e automazione flussi regolamentati.

**Impatto:** Ho accelerato team tramite architettura riutilizzabile, tooling condiviso, pratiche standardizzate, documentazione e knowledge transfer in contesti che vanno da grandi marketplace e banche a fintech e startup più piccole.

## Architettura di Integrazione — Composizione Servizi e Design dei Confini

**Problema:** I prodotti che integrano CRM, servizi IA, sistemi bancari, event backbone, data platform, notifiche e flussi di supporto necessitano confini resilienti così il fallimento di una dipendenza non propaghi in cascata il flusso core del cliente.

**Approccio:** Ho usato GraphQL/Apollo Federation per composizione servizi, API REST per percorsi sincroni a bassa latenza, Kafka/SQS/BullMQ per coordinazione asincrona, viste BFF/cachate per performance dei read model e confini adapter per isolare sistemi esterni dalla logica di business core.

**Tradeoff:** Ho usato federation o composizione quando contava l'evoluzione indipendente, REST quando contavano tempo di risposta sincrono e semplicità operativa, comunicazione event-driven quando contavano isolamento fallimenti e consistenza eventuale, e viste BFF/cachate quando la latenza user-facing richiedeva dati precomputati o consolidati.

**Evidenza:** L'automazione garanzie ha integrato Salesforce, chatbot, valutazione immagini IA, servizi GraphQL, worker di coda ed escalation supporto. La personalizzazione Klarna ha integrato feed campagne, dati interazione cliente, embedding profili peer, endpoint REST e generazione email transazionale. Ageras ha integrato API Solaris/terze parti per BKYC e SQS/Lambda/REST per sync fatturazione. Mercado Libre ha coordinato tasse, billing, mobile, UX, prodotto e reporting fiscale venditori tramite confini servizio e frontend.

**Perché conta:** Dimostra capacità di comporre sistemi oltre confini organizzativi e tecnici preservando affidabilità, deployabilità e ownership chiara.

## Leadership Tecnica — Pratiche di Ingegneria e Impatto sui Team

**Problema:** Sistemi e team in crescita necessitano pratiche che scalino: architettura condivisa, ownership chiara, decisioni revisionabili, tooling riutilizzabile, onboarding e allineamento cross-funzionale.

**Contributi:** Ho standardizzato pratiche tramite scaffold riutilizzabili, monorepo, librerie UI condivise, template di test, pratiche CI/CD, miglioramenti osservabilità, documentazione, log decisionali e guida architetturale. Ho fatto mentoring, onboarding, collaborato con prodotto/UX/SRE/supporto/compliance e tradotto trade-off tecnici in linguaggio azionabile per team non tecnici.

**Evidenza:** Gli scaffold frontend Mercado Libre hanno ridotto il bootstrap di nuovi progetti da giorni a meno di un'ora, e il monorepo ha accelerato l'integrazione componenti condivisi da giorni a ore. Il lavoro contrattuale riservato ha usato specifiche, ticket, workshop, log decisionali e revisioni condivise del rischio per allineare business, cliente, infrastruttura, sicurezza, supporto, prodotto e ingegneria. Five Validation ha richiesto collaborazione diretta con leadership, elicitation requisiti, documentazione audit-ready e controlli release in ambiente regolamentato.

**Segnali di seniority:** Decision-making tecnico a livello aziendale, influenza cross-funzionale, mentoring, platform thinking, ownership oltre l'implementazione, disciplina documentale ed effetto moltiplicatore tramite sistemi riutilizzabili.

## Ingegneria Assistita dall'IA — Adozione Pragmatica come Pratica di Delivery

**Problema:** Lo sviluppo assistito dall'IA può accelerare la delivery, ma affermazioni credibili richiedono di separare l'uso di tool di coding IA dall'ownership di sistemi IA in produzione e da claim ML non supportati.

**Pratica:** Ho costruito il sito portfolio e l'assistente recruiter con tool come Cursor e revisione stile Copilot per scaffolding, refactor, test, iterazione copy e pianificazione implementazione. Ho mantenuto ownership umana su architettura, prompt, threat modeling, code review, CI/CD, test, deploy e comportamento in produzione.

**Distinzione in produzione:** L'assistente recruiter è una feature prodotto nativa IA con scope definito usando RAG, generazione a stadi valutatore/analista/pitch, UX in streaming, match score con tetto e match referenze post-stream. Il lavoro personalizzazione Klarna ha coinvolto similarità vettoriale ed embedding in contesto email transazionale critico per i ricavi. L'automazione garanzie ha usato valutazione immagini IA dietro regole di business deterministiche.

**Cosa dimostra:** Adozione pragmatica dell'IA come pratica di delivery e capacità di prodotto: usare tool IA per aumentare la leva ingegneristica applicando test, type safety, osservabilità, disciplina di review, grounding e fallback.

**Distinzione:** Il coding assistito dall'IA è presentato come segnale di produttività e delivery. Il lavoro prodotto nativo IA è presentato separatamente dove l'architettura usa realmente retrieval, embedding, motori decisionali o output di modelli IA.

## Collaborazione Cross-Funzionale — Delivery Matriciale e Remota

**Problema:** Molti progetti ad alto impatto falliscono non perché il codice è difficile, ma perché più team possiedono parti diverse del flusso, incentivi, dati, compliance, timing di release e responsabilità di supporto.

**Pratica:** In delivery contrattuale remote-first, ho fatto da ponte di ingegneria tra business, cliente, infrastruttura, sicurezza, supporto, prodotto e ingegneria interna — usando tracciabilità su ticket, specifiche condivise, workshop, log decisionali, pianificazione congiunta, revisioni del rischio e checkpoint di integrazione per tenere gli stakeholder allineati dalla discovery al lancio.

**A scala:** Ho consegnato iniziative cross-funzionali coinvolgendo data platform, incentivi, contenuti, marketing, analytics, UX, platform engineering, policy fiscale, billing, mobile, backend, team regionali di mercato, legal, compliance, SRE, QA, supporto e operations. Ho negoziato trade-off di implementazione quando i team avevano obiettivi, cadenze e confini di ownership diversi.

**Contesti precedenti:** Ho guidato migrazione tax experience e iniziative di piattaforma in Mercado Libre con prodotto, policy, UX, backend, billing, mobile e team regionali. Ho lavorato con architettura bancaria, SRE, operations, analisti e compliance in Itaú. Ho coordinato validazione, QA, sales operations, consulenti e stakeholder executive in Five Validation, inclusa collaborazione diretta con leadership su requisiti e pianificazione.

**Perché conta:** Mostra capacità di operare in ambienti matriciali in cui architettura tecnica, comunicazione, sequencing e fiducia tra stakeholder fanno parte del sistema di delivery.
