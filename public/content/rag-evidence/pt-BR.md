## Sistemas Distribuídos — Coordenação Orientada a Eventos e Isolamento de Falhas

**Problema:** Sistemas em produção abrangendo cadastro bancário, automação de garantias e personalização de e-mails transacionais exigiam coordenar trabalho entre domínios de backend independentes sem criar acoplamento frágil ou pontos únicos de falha.

**Abordagem:** Arquiteturas orientadas a eventos com gerenciamento explícito de estado. Padrões SAGA com máquinas de estado determinísticas para fluxos de múltiplas etapas. Coordenação baseada em mensagens (Kafka, BullMQ) prevenindo acoplamento forte. Workers stateless para escalabilidade horizontal.

**Tratamento de falhas:** Retentativas limitadas com escalação automática em vez de retentativas indefinidas. Dead letter queues para casos irresolvíveis. Processamento idempotente e progressão monotônica de estado garantindo segurança sem lock distribuído.

**Por que importa:** Demonstra conforto projetando sistemas onde falha parcial é esperada — uma preocupação de nível staff em ambientes com integração pesada, regulados e críticos para receita.

## Engenharia Nativa em IA — Fluxos LLM em Estágios com Fundamentação por Recuperação

**Problema:** Construir funcionalidades de produto alimentadas por IA que sejam críveis e fundamentadas, em vez de genéricas, exige arquitetura deliberada em torno de determinismo na recuperação, risco de alucinação e UX de streaming.

**Abordagem:** Assistente de recrutador baseado em RAG com recuperação determinística por similaridade de cosseno sobre chunks de embedding pré-gerados. **Três estágios de chat em stream** no mesmo fluxo; os dois primeiros ficam dentro de marcadores API de **thinking**: (1) um **avaliador de evidências** que classifica cada requisito principal da vaga contra os trechos recuperados (obrigatório vs desejável; direto/adjacente/não evidenciado/contraditório), sinaliza onde a similaridade do cosseno pode induzir leitura errada e emite **orientação de pontuação** com **tetos** para que conceitos vizinhos não justifiquem um match forte; com uma **rubrica de interesses** privada configurada, um passo opcional de **alinhamento de interesses** como conclusão **fora do stream** — **apenas log no servidor** para operadores, não enviado ao cliente nem fundido ao pitch; (2) um **analista** que sintetiza alinhamento, correspondências de alto sinal e ângulos de entrevista **sem contradizer** o avaliador, no mesmo bloco **thinking** após um separador curto; (3) **após o fechamento do thinking**, uma **avaliação para o recrutador** cuja intensidade do match **não pode ultrapassar** o teto recomendado pelo avaliador. O handler **espera o stream do avaliador terminar** antes de interesses (se houver) e o analista, para que os prompts downstream vejam sempre uma tabela de cobertura completa e autoritativa. Depois que o pitch termina, uma **passagem estruturada** extrai claims concretas, gera embeddings e faz match de volta aos chunks do portfolio para anexar uma seção de **Referências** (com sinalização explícita quando a similaridade fica abaixo do limiar). **Modelagem determinística da entrada** e um **intent gate** por LLM rodam antes de qualquer recuperação ou geração.

**Tradeoffs:** Recuperação determinística + geração probabilística mantém a fundamentação enquanto permite síntese. Sem fine-tuning — modelos fundacionais com prompting em estágios, tratamento explícito de incerteza e uma passagem de “crítica” antes da síntese. O avaliador + analista encapsulados por marcadores, avaliação opcional de interesses só no servidor, e o match de referências pós-stream mantêm a voz final alinhada a evidências verificáveis.

**O que isso demonstra:** Pensamento de produto nativo em IA — projetar em torno de recuperação, fundamentação, mitigação de alucinação, calibração honesta de aderência e latência de streaming com a mesma disciplina de engenharia do restante do stack.

## Sistemas de Decisão Orientados a IA — Automação Inteligente Sob Restrições

**Problema:** Processamento manual de sinistros de garantia era caro e não escalável. E-mails transacionais críticos para receita precisavam de conteúdo personalizado em tempo real sob restrições extremas de latência (~200 ms a ~100 RPS).

**Abordagem:** Motores de decisão baseados em JSON com integração de modelos de IA para sinistros de garantia — regras de negócio dinâmicas avaliadas contra rótulos e scores de imagem gerados por IA. Correspondência de similaridade por embeddings vetoriais em tempo real para personalização de e-mails transacionais sob restrições determinísticas de latência.

**Padrões de confiabilidade:** Mecanismos de fallback seguros garantindo zero interrupção dos fluxos principais. Retentativas limitadas com salvaguardas de escalação. Sincronização assíncrona de dados de plataformas de dados de clientes para manter a latência de decisão baixa.

**Impacto:** Reduziu o overhead de processamento manual mantendo salvaguardas de escalação. Melhorou o engajamento de e-mail (CTR de 1,4 % para 1,8 %). Estabeleceu frameworks escaláveis para automação e personalização alimentadas por IA.

## Observabilidade e Confiabilidade — Maturidade Operacional Orientada a SLO

**Problema:** Sistemas em produção em fintech, e-commerce de alto tráfego e bancos exigem observabilidade estruturada e níveis de serviço definidos — não apenas dashboards de monitoramento.

**Abordagem:** Instrumentação ponta a ponta com Datadog e Grafana: métricas customizadas, traces distribuídos, dashboards de latência/erro. Definição e monitoramento de SLO/SLA para tempo de resposta e disponibilidade. Logging estruturado para rastreamento de estado de workflows e sagas.

**Padrões operacionais:** Monitoramento de DLQ para fluxos de intervenção manual. Rotação de plantão para sistemas críticos de receita. Estratégias de retentativa limitada prevenindo falhas em cascata. Alertas configurados para confiabilidade contínua. Ferramentas de diagnóstico construídas para reduzir o tempo de resposta a incidentes.

**Por que importa:** Times operacionais conseguem rastrear transações ponta a ponta em segundos. Sistemas mantêm confiabilidade sob carga por meio de contenção estruturada de falhas e caminhos explícitos de escalação.

## Engenharia de Plataforma Full-Stack — Entrega e Propriedade Entre Camadas

**Problema:** Produtos complexos exigem engenheiros capazes de assumir problemas de ponta a ponta — backend, frontend, infraestrutura e preocupações operacionais — em vez de transferir responsabilidade entre camadas.

**Escopo:** Backend em Node.js/TypeScript e Java/Spring. Frontend em React e React Native. Infraestrutura na AWS com Kubernetes, Terraform e pipelines de CI/CD. Domínios abrangendo fintech (faturamento, produtos bancários), e-commerce de alto tráfego (conformidade fiscal na América Latina), marcas de consumo (automação de garantias) e ferramentas internas.

**Padrões de entrega:** Propriedade de ciclo completo do design ao rollout e iteração. Microsserviços e micro-frontends para entrega modular. Padronização de práticas de engenharia e documentação. Implementação de pipelines de CI/CD e serviços conteinerizados.

**Impacto:** Acelerou times por meio de práticas padronizadas, ferramentas compartilhadas e transferência de conhecimento entre contextos organizacionais, de grande marketplace a fintech menor.

## Arquitetura de Integração — Composição de Serviços e Design de Fronteiras

**Problema:** Produtos que integram CRMs, serviços de IA, backbones de eventos, plataformas de dados e sistemas de notificação precisam de fronteiras de serviço resilientes — falhas em um ponto de integração não devem se propagar em cascata.

**Abordagem:** GraphQL (Apollo Federation) para composição de serviços permitindo evolução independente. APIs REST para integração síncrona em fluxos sensíveis a latência. Coordenação orientada a eventos via Kafka para comunicação assíncrona entre domínios. Integração de gestão de casos Salesforce, avaliação de imagens por IA, plataformas de dados de clientes e sistemas de notificação multi-mercado.

**Tradeoffs:** Federation ao invés de APIs monolíticas para implantação independente. Orientação a eventos ao invés de ponto a ponto para isolamento de falhas. Mecanismos de fallback seguros em cada fronteira de integração para proteger os fluxos principais.

**Por que importa:** Sistemas permanecem independentemente implantáveis e evoluíveis. Falhas de integração são contidas, não propagadas em cascata — crítico em ambientes com múltiplas dependências externas.

## Liderança Técnica — Práticas de Engenharia e Impacto em Times

**Problema:** Times e bases de código em crescimento precisam de mais do que contribuições individuais — precisam de práticas padronizadas, ferramentas compartilhadas e cultura de engenharia.

**Contribuições:** Implementou decisões técnicas em nível de empresa padronizando práticas de engenharia e melhorando a manutenibilidade de longo prazo. Liderou iniciativas de melhoria de observabilidade e monitoramento possibilitando decisões orientadas a dados. Mentorou engenheiros e colaborou de forma multifuncional com produto, UX e SRE. Estabeleceu padrões de documentação e fluxos de planejamento estruturados.

**Escopo:** Atuou em diversos contextos organizacionais — de um grande marketplace latino-americano e uma fintech europeia a plataformas bancárias e SaaS menores — demonstrando adaptabilidade e influência de engenharia consistente.

**Sinais de senioridade:** Tomada de decisão técnica em nível de empresa, influência multifuncional, efeito multiplicador e mentoria, stewardship de cultura de engenharia.

## Engenharia Assistida por IA — Adoção Pragmática de Ferramentas como Prática de Entrega

**Problema:** A entrega moderna de software se beneficia de ferramentas assistidas por IA, mas afirmações de profundidade exigem distinguir entre usar ferramentas de IA na entrega e ter propriedade de sistemas de ML em produção.

**Prática:** Site do portfólio e serviço do recrutador implementados com ferramentas de codificação assistida por IA (Cursor, assistentes no estilo Copilot) para scaffolding, refatorações, cobertura de testes e iteração de texto. Ferramentas de IA integradas ao fluxo diário de engenharia como multiplicador de produtividade.

**O que isso demonstra:** Adoção pragmática de IA — tratando assistentes de IA como parte do stack de engenharia, não apenas uma novidade. Combinado com o design de funcionalidades de produto nativas em IA (o assistente de recrutador, com avaliação de requisitos em stream antes da síntese e pontuação com tetos) usando disciplina de engenharia: testes, CI, type safety, observabilidade.

**Distinção:** Este é um sinal de prática de entrega, não uma alegação de propriedade de ML em produção não relacionada. O assistente de recrutador demonstra trabalho de produto de IA com escopo definido e fundamentado em evidências.

## Colaboração multifuncional — entrega matricial e remota

**Prática:** Em entrega 100% remota, atuou como ponte de engenharia entre negócios, cliente, infraestrutura, segurança, suporte, produto e engenharia interna — conduzindo planejamento conjunto, revisões compartilhadas de risco e checkpoints de integração para manter funções diversas alinhadas ponta a ponta.

**Em escala:** Entregou por meio de iniciativas multifuncionais envolvendo plataforma de dados, incentivos, conteúdo, marketing, analytics e engenharia de plataforma — negociando prioridades quando parceiros tinham metas e cadências de release diferentes.

**Contextos anteriores:** Liderou programas multifuncionais de migração quando a propriedade da experiência fiscal mudou — produto, política, UX, backend e times regionais com filosofias de implementação distintas. Em empresas menores, coordenou validação, QA, operações de vendas e stakeholders executivos — incluindo trabalho direto com o CEO em requisitos e planejamento.
