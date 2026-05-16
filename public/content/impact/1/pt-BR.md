## Motor de Personalização com IA em Tempo Real para Fluxos de Email Transacional

### Resumo Executivo

Projetei e liderei a implementação de um motor de decisão vetorial de baixa latência para personalização com IA em fluxos de email transacional críticos para receita, incluindo experiências de confirmação de compra em que a recuperação de conteúdo nunca pode interromper a mensagem transacional principal.

A plataforma transformava sinais de interação do cliente em embeddings, comparava-os com vetores de campanhas ativas e de perfis semelhantes e retornava blocos de conteúdo personalizados de forma síncrona dentro de uma janela de resposta rigorosa de ~200 ms a ~100 RPS. Em vez de tratar a personalização como uma tabela estática de regras, o sistema usava correspondência por similaridade e embeddings de perfis “Power User” para selecionar campanhas mais alinhadas ao comportamento de cada cliente.

O serviço foi construído como um microsserviço containerizado em Node.js/TypeScript exposto por APIs REST e integrado ao pipeline de email transacional da Klarna, com comportamento de fallback seguro, observabilidade no Datadog, monitoramento de SLO e ownership de plantão para proteger comunicação de alto volume com clientes.

### Impacto e Resultados

- Aumentei o engajamento com blocos de conteúdo personalizados em emails transacionais, melhorando CTR de campanhas e oportunidades de conversão downstream.
- Melhorei o CTR de ~1,4% para ~1,8%; com 1M de compras mensais, isso representa cerca de 4.000 cliques adicionais por mês, ou ~3.000 cliques incrementais após considerar a linha de base anterior, dependendo das premissas de atribuição.
- Estabeleci uma base escalável e de baixa latência para personalização com IA, extensível além de fluxos de confirmação de compra para canais transacionais e de lifecycle adicionais.
- Habilitei seleção de campanhas mais adaptativa ao comparar embeddings de comportamento do cliente com vetores de campanhas ativas em vez de depender apenas de regras estáticas de segmentação.
- Protegi a confiabilidade do email transacional com caminhos de fallback determinísticos, para que personalização lenta, indisponível ou com falha nunca bloqueasse a mensagem principal de confirmação de compra.

![diagram](/content/diagrams/impact-1-pt-BR-0.svg)

### Diagrama de Sequência — Fluxo de Personalização com Fallback

![diagram](/content/diagrams/impact-1-pt-BR-1.svg)

### Arquitetura do Motor de Decisão

- Projetei e implementei um motor de decisão vetorial que realizava correspondência de similaridade de embeddings em tempo real entre perfis de interação do cliente, vetores de campanhas ativas e sinais de recomendação baseados em pares.
- Construí a lógica de perfis “Power User” representando comportamento de alto desempenho como embeddings e correspondendo clientes semelhantes a campanhas com engajamento esperado mais forte.
- Mantive o caminho de decisão de personalização limitado por restrições de latência, garantindo que a lógica de recomendação pudesse rodar de forma síncrona na geração de email de confirmação de compra sem degradar o pipeline de comunicação com o cliente.
- Projetei a correspondência de campanhas como uma camada de decisão no nível de serviço, em vez de embutir regras de negócio diretamente nos templates de email, facilitando testes, evolução, observabilidade e reutilização.
- Suportei feeds de campanhas ao vivo e restrições de elegibilidade para que o motor retornasse apenas blocos de conteúdo válidos e atualmente ativos em cada requisição.

### Integração de Serviço

- Implantei o motor como microsserviço containerizado em Node.js/TypeScript integrado à plataforma de email transacional.
- Expus endpoints REST para recuperação síncrona de conteúdo durante fluxos de confirmação de compra, retornando blocos personalizados quando confiança, elegibilidade e restrições de latência eram atendidas.
- Integrei dados de interação do cliente, metadados de campanhas e embeddings de perfis semelhantes em um único fluxo de decisão em runtime.
- Implementei mecanismos de fallback seguros para que dados ausentes, feeds indisponíveis, correspondência vetorial lenta ou erros de serviço retornassem conteúdo padrão em vez de interromper a entrega transacional.
- Colaborei com plataforma de dados, incentivos, conteúdo, marketing, analytics e engenharia de plataforma para alinhar requisitos de campanha, disponibilidade de dados, objetivos de experimentação e restrições operacionais.

### Observabilidade, Performance e Confiabilidade

- Instrumentei tracing ponta a ponta, histogramas de latência, métricas de taxa de erro e métricas de negócio customizadas no Datadog para monitorar qualidade de recomendação e saúde do sistema.
- Defini e monitorei SLOs/SLAs de tempo de resposta, disponibilidade e comportamento em falha em um caminho crítico de geração de email para receita.
- Participei de plantão 24/7, com ownership operacional para incidentes que afetassem personalização, recuperação de campanhas ou integração com email transacional.
- Usei telemetria de fallback para distinguir comportamento saudável de conteúdo padrão de falhas de personalização que exigiam ação de engenharia.
- Adicionei testes automatizados sobre comportamento de decisão, contratos REST, cenários de fallback e limites de integração para reduzir risco de regressão na entrega de campanhas.

### Contexto de Produto e Negócio

- O motor operava dentro de fluxos de email transacional, em que a personalização precisava melhorar engajamento sem criar risco para comunicação obrigatória com o cliente.
- O desenho equilibrou experimentação, performance de campanhas, relevância para o usuário e confiabilidade ao separar decisões de recomendação do caminho principal de entrega de email.
- A arquitetura criou um padrão reutilizável para futuros casos de personalização assistida por IA: coletar sinais comportamentais, representá-los como embeddings, correspondê-los a conteúdo elegível, retornar o melhor candidato dentro de um orçamento rigoroso de latência e fazer fallback com segurança quando confiança ou disponibilidade forem insuficientes.

---

_Associado à Klarna_

_Detalhes como cronogramas específicos, métricas e identificadores internos foram generalizados em conformidade com acordos de confidencialidade._

---

### Stack Tecnológica

TypeScript, Node.js, REST APIs, AWS, Microsserviços Containerizados, Datadog, Jest, Busca Vetorial, Embeddings, Correspondência por Similaridade, Sistemas de Recomendação, Email Transacional, DDD
