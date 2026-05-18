## Sistemas Distribuídos — Coordenação Orientada a Eventos e Isolamento de Falhas

**Problema:** Sistemas em produção em cadastro bancário, automação de garantias, sincronização faturamento/nota fiscal, relatórios fiscais e personalização de email transacional exigiam coordenar trabalho entre domínios independentes sem criar acoplamento frágil, tempestades de retentativa ou pontos únicos de falha.

**Abordagem:** Projetei arquiteturas orientadas a eventos e assíncronas com gerenciamento explícito de estado. Usei orquestração SAGA com máquinas de estado determinísticas para fluxos bancários de múltiplas etapas, workers BullMQ/Redis para automação longa de garantias, Kafka para coordenação entre domínios, SQS/Lambda para sincronização serverless faturamento→nota fiscal e views BFF/cacheadas para relatórios fiscais de vendedores sensíveis à latência.

**Tratamento de falhas:** Usei retentativas limitadas, limites de TTL, dead letter queues, caminhos de escalonamento, comportamento de fallback e estados de handoff para suporte em vez de retentativas indefinidas. Projetei fluxos em que falha parcial era esperada e observável: snapshots de estado, progressão monotônica, tratamento idempotente downstream, processamento seguro contra duplicatas e estados terminais explícitos de falha.

**Evidência:** Adesão mobile a cheque especial no Itaú usou Kafka, Avro, snapshots no Cassandra, Spring State Machine, roteamento DLQ e escalonamento para suporte. Automação de garantias usou BullMQ, Redis, coordenação em máquina de estados, retentativas e salvaguardas de escalonamento. Sincronização de faturamento na Ageras usou AWS Lambda, SQS, validação de schema, chaves de idempotência, retentativas e alarmes CloudWatch. Relatórios fiscais no Mercado Livre usaram view BFF assíncrona em cache para reduzir latência de resposta de 1–2s para até ~200ms.

**Por que importa:** Demonstra conforto ao projetar sistemas em que falha parcial, eventos duplicados, respostas atrasadas e falhas de dependências externas são restrições normais de engenharia — uma preocupação de nível sênior/staff em ambientes regulados, com integração pesada e críticos para receita.

## Engenharia Nativa em IA — Fluxos LLM com Recuperação e em Estágios

**Problema:** Funcionalidades de produto com IA podem facilmente se tornar genéricas, excessivamente confiantes ou enganosas, a menos que sejam projetadas em torno de qualidade de recuperação, risco de alucinação, calibração de aderência e limites transparentes de evidência.

**Abordagem:** Construí um assistente de recrutador baseado em RAG que avalia descrições de vaga contra evidências do portfólio usando recuperação determinística por similaridade de cosseno sobre chunks de embedding pré-gerados, análise LLM em estágios, UX em stream, tetos explícitos de match score e validação de referências pós-geração.

**Fluxo:** O assistente executa modelagem determinística da entrada e um intent gate por LLM antes de recuperação ou geração. Em seguida transmite três estágios em um único caminho de resposta: (1) um avaliador de evidências dentro de marcadores API de `thinking` que classifica requisitos da vaga como obrigatórios ou desejáveis e evidências como diretas, adjacentes, não evidenciadas ou contraditórias; (2) um analista de evidências, também no bloco thinking, que sintetiza correspondências de alto sinal e ângulos de entrevista sem contradizer o avaliador; e (3) uma avaliação voltada ao recrutador após o marcador de fechamento do thinking, cuja intensidade de match não pode exceder o teto recomendado pelo avaliador.

**Salvaguardas de fundamentação:** O avaliador sinaliza onde a similaridade de cosseno pode induzir leitura errada, emite orientação de match score com tetos rígidos e impede que conceitos vizinhos não relacionados sejam apresentados como evidência forte. O handler aguarda o stream do avaliador terminar antes de executar análises downstream, para que prompts posteriores recebam sempre a tabela de cobertura completa e autoritativa. Após o pitch para recrutadores, uma passagem estruturada extrai afirmações concretas, gera embeddings e faz match de volta aos chunks do portfólio para anexar uma seção de Referências com sinalização explícita de baixa similaridade quando a evidência é fraca.

**Tratamento de aderência privada:** Quando uma rubrica privada de interesses está configurada, um passo opcional de alinhamento de interesses roda como conclusão não transmitida em stream após o avaliador. É registrado apenas no servidor para operadores e não é enviado ao cliente nem fundido ao pitch para recrutadores, mantendo evidência pública separada da análise de preferências privadas.

**O que isso demonstra:** Engenharia de produto nativa em IA — tratar recuperação, fundamentação, incerteza, mitigação de alucinação, calibração de score e latência de streaming como preocupações de arquitetura, não apenas de prompt.

## Sistemas de Decisão Orientados a IA — Automação Inteligente Sob Restrições

**Problema:** Processamento manual de garantias era caro e difícil de escalar, enquanto emails transacionais precisavam de conteúdo personalizado em um caminho crítico para receita sob restrições rigorosas de latência de ~200ms a ~100 RPS.

**Abordagem:** Projetei sistemas de decisão assistidos por IA que mantiveram a saída da IA atrás de limites de engenharia controlados. Automação de garantias usou avaliação de imagens por IA como entrada em um motor determinístico de regras JSON, em vez de decisor final. Personalização na Klarna usou correspondência de similaridade vetorial sobre comportamento do cliente, vetores de campanhas ativas e embeddings de perfis “Power User” para recuperar blocos elegíveis em tempo real.

**Padrões de confiabilidade:** Usei mecanismos de fallback seguros para que fluxos principais não fossem bloqueados por saídas de IA indisponíveis, matching vetorial lento, dados ausentes, falhas em sistemas externos ou caminhos de regra desconhecidos. Fluxos de garantia usaram processamento assíncrono em fila, retentativas limitadas, salvaguardas de escalonamento e estados de handoff para suporte. Personalização em email transacional usou fallback para conteúdo padrão para manter a entrega de confirmação de compra confiável.

**Impacto:** Reduzi sobrecarga manual de processamento de garantias preservando escalonamento para suporte em casos incertos ou com falha. Melhorei engajamento em email transacional, com CTR de ~1,4% para ~1,8% no contexto de personalização. Estabeleci padrões reutilizáveis para automação assistida por IA em que regras determinísticas, orçamentos de latência, observabilidade, caminhos de fallback e revisão humana precisam coexistir.

## Observabilidade e Confiabilidade — Maturidade Operacional Orientada a SLO

**Problema:** Plataformas fintech, bancárias, de e-commerce e suporte ao cliente precisam de visibilidade operacional que explique o que aconteceu entre sistemas — não apenas dashboards que mostram que algo quebrou.

**Abordagem:** Instrumentei sistemas com Datadog, Grafana, CloudWatch, New Relic, logs estruturados, traces distribuídos, dashboards de latência/erro e métricas de negócio customizadas. Defini e monitorei SLOs/SLAs de tempo de resposta, disponibilidade, comportamento em falha, saúde de filas e caminhos críticos de integração.

**Padrões operacionais:** Usei monitoramento de DLQ, retentativas limitadas, caminhos de escalonamento, plantão, alertas, rastreamento de estado de saga, dashboards de saúde de filas, telemetria de fallback e ferramentas de diagnóstico. Projetei sistemas para que suporte, SRE e engenharia pudessem rastrear fluxos ponta a ponta por logs, snapshots de estado, dashboards e consultas operacionais.

**Evidência:** Personalização na Klarna usou tracing Datadog, SLOs de latência/erro, telemetria de fallback e ownership de plantão. Orquestração SAGA no Itaú usou logs estruturados de transição, dashboards Grafana, snapshots no Cassandra, monitoramento de DLQ e reporting Spark/Redshift. Sincronização de faturamento na Ageras usou métricas CloudWatch, dashboards, alarmes, taxas de sucesso de invocação, latência e tendências de erro. Diagnósticos no PagSeguro agregaram dados de API em um modelo unificado de troubleshooting para equipes de suporte Nível 2 e 3.

**Por que importa:** Mostra ownership de produção além da entrega de features: visibilidade de incidentes, contenção de falhas, handoffs operacionais, suportabilidade e confiabilidade sob carga.

## Engenharia de Plataforma Full-Stack — Entrega e Ownership em Múltiplas Camadas

**Problema:** Trabalho de produto complexo frequentemente corta frontend, backend, infraestrutura, observabilidade, dados e preocupações operacionais. O impacto depende de ownership do caminho inteiro, não de otimizar apenas uma camada.

**Escopo:** Entreguei serviços backend em Node.js/TypeScript e Java/Spring, aplicações frontend em React e React Native, infraestrutura em AWS/Kubernetes/Terraform, pipelines CI/CD, observabilidade e testes em fintech, bancário, e-commerce, validação farmacêutica, suporte ao cliente e domínios de produto assistidos por IA.

**Padrões de entrega:** Ownership de ciclo de vida completo da descoberta e arquitetura à implementação, testes, rollout, monitoramento e iteração. Usei clean architecture, limites hexagonais, microsserviços, fluxos event-driven, scaffolds frontend reutilizáveis, monorepos, bibliotecas UI compartilhadas, APIs tipadas, testes E2E e automação de deploy.

**Evidência:** BKYC na Ageras combinou React Native, web React, serviços backend, integrações Solaris/terceiros, Datadog e onboarding sensível a compliance. Mercado Livre combinou APIs fiscais, dashboards de vendedores, plataformas backoffice, scaffolds reutilizáveis, monorepos e migração de infraestrutura. Five Validation combinou Java/Spring, React, PostgreSQL, AWS, Jenkins, SonarQube, CloudWatch e automação de fluxos regulados.

**Impacto:** Acelerei times por arquitetura reutilizável, ferramentas compartilhadas, práticas padronizadas, documentação e transferência de conhecimento em contextos que vão de grandes marketplaces e bancos a fintechs e startups menores.

## Arquitetura de Integração — Composição de Serviços e Desenho de Limites

**Problema:** Produtos que integram CRMs, serviços de IA, sistemas bancários, backbones de eventos, plataformas de dados, notificações e fluxos de suporte precisam de limites resilientes para que falha de uma dependência não propague em cascata no fluxo principal do cliente.

**Abordagem:** Usei GraphQL/Apollo Federation para composição de serviços, APIs REST para caminhos síncronos de baixa latência, Kafka/SQS/BullMQ para coordenação assíncrona, views BFF/cacheadas para performance de read models e limites de adaptadores para isolar sistemas externos da lógica de negócio central.

**Tradeoffs:** Usei federação ou composição quando evolução independente importava, REST quando tempo de resposta síncrono e simplicidade operacional importavam, comunicação event-driven quando isolamento de falhas e consistência eventual importavam, e views BFF/cacheadas quando latência voltada ao usuário exigia dados pré-computados ou consolidados.

**Evidência:** Automação de garantias integrou Salesforce, chatbot, avaliação de imagens por IA, serviços GraphQL, workers de fila e escalonamento para suporte. Personalização na Klarna integrou feeds de campanhas, dados de interação, embeddings de perfis semelhantes, endpoints REST e geração de email transacional. Ageras integrou APIs Solaris/terceiros para BKYC e SQS/Lambda/REST para sincronização de faturamento. Mercado Livre coordenou impostos, faturamento, mobile, UX, produto e reporting fiscal de vendedores por limites de serviço e frontend.

**Por que importa:** Demonstra capacidade de compor sistemas entre limites organizacionais e técnicos preservando confiabilidade, deployabilidade e ownership claro.

## Liderança Técnica — Práticas de Engenharia e Impacto em Times

**Problema:** Sistemas e times em crescimento precisam de práticas que escalem: arquitetura compartilhada, ownership claro, decisões revisáveis, ferramentas reutilizáveis, onboarding e alinhamento cross-funcional.

**Contribuições:** Padronizei práticas por scaffolds reutilizáveis, monorepos, bibliotecas UI compartilhadas, templates de teste, práticas de CI/CD, melhorias de observabilidade, documentação, logs de decisão e orientação de arquitetura. Mentorei engenheiros, integrei colegas, colaborei com produto/UX/SRE/suporte/compliance e traduzi trade-offs técnicos para linguagem acionável por times não técnicos.

**Evidência:** Scaffolds frontend no Mercado Livre reduziram bootstrap de novos projetos de dias para menos de uma hora, e o monorepo acelerou integração de componentes compartilhados de dias para horas. Trabalho contratual confidencial usou specs, tickets, workshops, logs de decisão e revisões de risco compartilhadas para alinhar negócio, cliente, infraestrutura, segurança, suporte, produto e engenharia. Five Validation exigiu colaboração direta com liderança, elicitação de requisitos, documentação pronta para auditoria e controles de release em ambiente regulado.

**Sinais de senioridade:** Tomada de decisão técnica em nível de empresa, influência cross-funcional, mentoria, pensamento de plataforma, ownership além da implementação, disciplina de documentação e efeito multiplicador por sistemas reutilizáveis.

## Engenharia Assistida por IA — Adoção Pragmática como Prática de Entrega

**Problema:** Desenvolvimento assistido por IA pode acelerar entrega, mas afirmações críveis exigem separar uso de ferramentas de codificação com IA de ownership de sistemas de IA em produção e de claims de ML não suportados.

**Prática:** Construí o site de portfólio e o assistente de recrutador com ferramentas como Cursor e revisão estilo Copilot para scaffolding, refactors, testes, iteração de copy e planejamento de implementação. Mantive ownership humano sobre arquitetura, prompts, threat modeling, code review, CI/CD, testes, deploy e comportamento em produção.

**Distinção em produção:** O assistente de recrutador é uma funcionalidade de produto nativa em IA com escopo definido usando RAG, geração em estágios avaliador/analista/pitch, UX em stream, match score com teto e match de referências pós-stream. O trabalho de personalização na Klarna envolveu similaridade vetorial e embeddings em contexto de email transacional crítico para receita. Automação de garantias usou avaliação de imagens por IA atrás de regras de negócio determinísticas.

**O que isso demonstra:** Adoção pragmática de IA como prática de entrega e capacidade de produto: usar ferramentas de IA para aumentar alavancagem de engenharia aplicando testes, type safety, observabilidade, disciplina de revisão, fundamentação e fallback.

**Distinção:** Codificação assistida por IA é apresentada como sinal de produtividade e entrega. Trabalho de produto nativo em IA é apresentado separadamente onde a arquitetura realmente usa recuperação, embeddings, motores de decisão ou saídas de modelos de IA.

## Colaboração Cross-Funcional — Entrega Matricial e Remota

**Problema:** Muitos projetos de alto impacto falham não porque o código é difícil, mas porque múltiplos times possuem partes diferentes do fluxo, incentivos, dados, compliance, timing de release e responsabilidades de suporte.

**Prática:** Em entrega contratual remota, atuei como ponte de engenharia entre negócio, cliente, infraestrutura, segurança, suporte, produto e engenharia interna — usando rastreabilidade em tickets, especificações compartilhadas, workshops, logs de decisão, planejamento conjunto, revisões de risco e checkpoints de integração para manter stakeholders alinhados da descoberta ao lançamento.

**Em escala:** Entreguei iniciativas cross-funcionais envolvendo plataforma de dados, incentivos, conteúdo, marketing, analytics, UX, engenharia de plataforma, política fiscal, faturamento, mobile, backend, times regionais de mercado, jurídico, compliance, SRE, QA, suporte e operações. Negociei trade-offs de implementação quando times tinham metas, cadências e limites de ownership diferentes.

**Contextos anteriores:** Liderei migração da experiência fiscal e iniciativas de plataforma no Mercado Livre com produto, política, UX, backend, faturamento, mobile e times regionais. Trabalhei com arquitetura bancária, SRE, operações, analistas e compliance no Itaú. Coordenei validação, QA, operações de vendas, consultores e stakeholders executivos na Five Validation, incluindo colaboração direta com liderança em requisitos e planejamento.

**Por que importa:** Mostra capacidade de operar em ambientes matriciais em que arquitetura técnica, comunicação, sequenciamento e confiança entre stakeholders fazem parte do sistema de entrega.
