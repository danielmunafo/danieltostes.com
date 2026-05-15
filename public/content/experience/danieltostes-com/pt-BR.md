### Plano & escopo

Entregar um **portfólio static-first** (S3 + CloudFront) que ainda suporte um **assistente de recrutamento com IA** sério: recuperar evidências do texto público do portfólio, executar prompts em estágios com guardrails e transmitir resultados na UI—sem servidor web tradicional para o site público.

### O que foi para produção

- **Site**: export estático Next.js, temas claro/escuro MUI, i18n em quatro idiomas, seções parallax, busca gerada no build, Vitest + Playwright, CI com GitHub Actions.
- **Assistente**: chat no browser para uma pequena **AWS Lambda** atrás de Function URL com **streaming de resposta**; embeddings offline como JSON versionado no S3; RAG por cosseno top-K, **input guard** determinístico e **intent gate** por LLM antes da recuperação, rate limit em memória por IP e CORS com allowlist para produção.
- **Formato da resposta**: **três** estágios de chat em stream num único fluxo—primeiro um **avaliador de evidências** (cobertura de requisitos com obrigatório vs desejável, evidência direta/adjacente/não evidenciada/contraditória, alertas de similaridade enganosa e **orientação de pontuação** com tetos para que similaridade vetorial não infle aderência sozinha), depois um **analista** (apenas síntese, no mesmo bloco “thinking”, sem contradizer o avaliador), por fim a **avaliação para o recrutador** (intensidade do match respeita o teto do avaliador). **Marcadores ASCII de “thinking”** envolvem avaliador + analista para a UI separar raciocínio interno da resposta principal; após o fim do stream, **extração estruturada de claims** e reencontro por vetores geram um bloco opcional de **Referências** para citações fundamentadas.
- **Transparência**: notas de arquitetura no repositório, página de termos para recrutadores, UI de revisão de evidências e textos de racional para que trade-offs fiquem auditáveis.

### Fluxo de construção (código gerado por IA)

**O código-fonte da aplicação é 100% gerado por agentes de codificação com IA** (Cursor como harness principal, Copilot no ciclo de revisão). Eu continuo dono de intenção de produto, modelagem de ameaças, desenho de prompts, estratégia de testes, CI/CD e do que entra em produção—no estilo de revisar código entregue por fornecedor, só que o “fornecedor” é o modelo e a IDE é a superfície de integração.

### Pilares técnicos

- Respostas ancoradas na recuperação com referências pós-hoc explícitas; geração em estágios (**avaliador** com cobertura de requisitos + tetos, **analista** em síntese, **pitch** para recrutador) e citações checadas por similaridade.
- Padrões conscientes de segurança para texto não confiável de recrutadores (formatação, classificação de intenção, system prompts rígidos, erros JSON fail-closed antes do streaming).
- Simplicidade operacional: bundle estático no S3/CloudFront; Lambda para inferência; streaming via Vercel AI SDK (streamText e resposta em formato de data stream), com segredos e passos de deploy documentados.

### Arquitetura do assistente

![Arquitetura do assistente de recrutamento: chat no browser, AWS Lambda com guardas e streaming, APIs de chat e embeddings da OpenAI, bucket S3 com JSON de embeddings.](/content/diagrams/recruiter-assistant-architecture.svg)

A UI do portfólio continua sendo entregue como assets estáticos no S3 e na CloudFront; o tráfego do chat em stream segue o caminho da Lambda no diagrama.

### Tech stack

Next.js, React, TypeScript, MUI, OpenAI, Vercel AI SDK, AWS S3, CloudFront, Lambda, Vitest, Playwright, GitHub Actions
