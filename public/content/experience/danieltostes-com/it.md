### Piano & perimetro

Consegnare un **portfolio static-first** (S3 + CloudFront) che supporti comunque un **assistente recruiting con IA** credibile: recuperare evidenze dal testo pubblico del portfolio, eseguire prompt a stadi con guardrail e streammare risultati nella UI—senza un web server classico per il sito pubblico.

### Cosa è in produzione

- **Sito**: export statico Next.js, temi chiaro/scuro MUI, i18n in quattro lingue, sezioni parallax, ricerca generata a build time, Vitest + Playwright, CI con GitHub Actions.
- **Assistente**: chat nel browser verso una piccola **AWS Lambda** dietro una Function URL con **response streaming**; embedding offline come JSON versionato su S3; RAG top-K con similarità coseno, **input guard** deterministico e **intent gate** LLM prima del retrieval, rate limit in-memory per IP e CORS con allowlist in produzione.
- **Forma della risposta**: **tre** stadi di chat in stream su un unico data stream—prima un **valutatore delle evidenze** (copertura dei requisiti con must-have vs nice-to-have, evidenza diretta/adiacente/non evidenziata/contraddittoria, avvisi su similarità fuorviante e **guida al punteggio** con tetti così la sola similarità vettoriale non gonfia l’aderenza), poi un **analista** (solo sintesi, nello stesso blocco “thinking”, senza contraddire il valutatore), infine la **valutazione per i recruiter** (l’intensità del match rispetta il tetto del valutatore). I **marcatori ASCII “thinking”** racchiudono valutatore + analista per separare il ragionamento interno dalla risposta principale; a stream completato, **estrazione strutturata delle claim** e match vettoriale sui chunk producono un blocco opzionale **References** per citazioni verificabili.
- **Trasparenza**: note di architettura nel repo, pagina termini per i recruiter, UI di revisione evidenze e testi di razionale così i trade-off restano verificabili.

### Flusso di realizzazione (codice generato da IA)

**Il codice sorgente dell’applicazione è generato al 100% da agenti di coding con IA** (Cursor come harness principale, Copilot nel ciclo di revisione). Mantengo ownership di intento prodotto, threat modeling, progettazione dei prompt, strategia di test, CI/CD e di ciò che viene mergiato in produzione—come una revisione di codice “fornito”, solo che il fornitore è il modello e l’IDE è la superficie di integrazione.

### Pilastri tecnici

- Risposte ancorate al retrieval con riferimenti espliciti post-hoc; generazione a stadi (**valutatore** copertura + tetti, **analista** sintesi, **pitch** voce recruiter) e citazioni controllate per similarità.
- Impostazioni security-minded per testo non attendibile (forma dell’input, classificazione intent, system prompt rigidi, errori JSON fail-closed prima dello streaming).
- Semplicità operativa: bundle statico su S3/CloudFront; Lambda per inferenza; streaming tramite Vercel AI SDK (streamText e risposta in formato data stream), con segreti e passi di deploy documentati.

### Architettura dell'assistente

![Architettura dell'assistente per i recruiter: chat nel browser, AWS Lambda con guardrail e streaming, API chat ed embeddings OpenAI, bucket S3 con JSON degli embeddings.](/content/diagrams/recruiter-assistant-architecture.svg)

La UI del portfolio resta servita come asset statici da S3 e CloudFront; il chat in streaming segue il percorso Lambda del diagramma.

### Tech stack

Next.js, React, TypeScript, MUI, OpenAI, Vercel AI SDK, AWS S3, CloudFront, Lambda, Vitest, Playwright, GitHub Actions
