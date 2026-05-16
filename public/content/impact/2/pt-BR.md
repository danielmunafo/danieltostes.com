### Resumo Executivo

Projetei e entreguei um serviço de orquestração distribuído baseado em SAGA que permitiu aos clientes contratar o produto de cheque especial (“Cheque Especial”) diretamente pelos canais mobile, substituindo um caminho de adesão mais dependente de agência/manual por um fluxo digital orientado a eventos.

O serviço coordenou múltiplos domínios bancários — incluindo autorização, avaliação de risco, atualização de conta e notificação ao cliente — preservando consistência eventual, recuperabilidade operacional e auditabilidade em um ambiente financeiro regulado. Cada adesão foi modelada como um fluxo determinístico em máquina de estados, com snapshots de estado persistidos no Cassandra e coordenação assíncrona entre domínios via Kafka.

O objetivo não era apenas expor uma nova funcionalidade mobile de adesão, mas criar uma camada de orquestração resiliente capaz de sobreviver a falhas parciais, eventos duplicados, retentativas downstream e handoffs manuais de suporte sem perder silenciosamente solicitações de clientes.

### Impacto de Negócio

- Habilitei um novo canal mobile para adesão ao cheque especial, expandindo o acesso além de fluxos em agência/manual ou assistidos por suporte.
- Reduzi a dependência operacional de adesão manual e intervenção de backoffice em jornadas padrão de clientes.
- Melhorei a adoção digital do produto ao permitir que clientes elegíveis concluíssem a contratação de cheque especial diretamente no app mobile.
- Reforcei a auditabilidade ao persistir snapshots de estado da saga e tornar cada transição do fluxo rastreável.
- Melhorei a confiabilidade ao isolar adesões com falha ou timeout por meio de retentativas limitadas, limites de TTL, roteamento para DLQ e escalonamento para suporte.
- Criei um padrão reutilizável de orquestração para fluxos bancários de longa duração que exigem consistência eventual entre múltiplos domínios backend.

### Visão Geral da Arquitetura

O serviço de orquestração operava como um motor de fluxo centralizado responsável por coordenar serviços de domínio de forma assíncrona. Requisições mobile entravam pelo caminho de aplicação/BFF e disparavam uma nova instância de saga; o orquestrador avançava o fluxo publicando e consumindo eventos Kafka, persistindo snapshots de progresso e aplicando transições de estado determinísticas.

![diagram](/content/diagrams/impact-2-pt-BR-0.svg)

Infraestrutura de Suporte:

- Backbone de Eventos: Apache Kafka
- Governança de Schema: Avro + Confluent Schema Registry
- Dead Letter Queue (DLQ): fluxos de adesão com falha ou expirados
- Persistência de Estado: snapshots de saga no Cassandra
- Observabilidade: logs centralizados, dashboards Grafana, consultas operacionais
- Streaming Analítico: Apache Spark
- Reporting & BI: Amazon Redshift

#### Características Arquiteturais

- Orquestração SAGA orientada a máquina de estados para fluxos financeiros de longa duração
- Comunicação orientada a eventos entre o orquestrador e domínios bancários downstream
- Snapshots persistentes de saga permitindo recuperação, replay e investigação manual
- Workers orquestradores stateless para escalabilidade horizontal
- Tratamento idempotente via garantias downstream e progressão monotônica do estado da saga
- Estratégia de retentativa limitada com isolamento de falhas baseado em TTL
- Caminho de escalonamento via DLQ para equipes de suporte quando o processamento automatizado não podia concluir com segurança
- Observabilidade operacional completa por logs, métricas, dashboards e histórico de estado consultável

### Modelo de Máquina de Estados

Cada solicitação de adesão foi modelada como uma máquina de estados determinística com transições apenas para frente. O orquestrador persistia snapshots após transições relevantes para que o fluxo pudesse ser retomado com segurança após reinícios de processo, eventos duplicados ou atrasos downstream.

#### Estados Principais

- STARTED
- AUTHORIZED
- RISK_APPROVED
- ACCOUNT_UPDATED
- NOTIFIED
- COMPLETED
- FAILED

As transições de estado eram monotônicas: uma vez que a saga avançava para um estado mais novo, eventos obsoletos ou duplicados não podiam retrocedê-la nem sobrescrever o snapshot mais avançado.

### Diagrama de Sequência — Adesão a Cheque Especial Orientada a Eventos (Kafka)

![diagram](/content/diagrams/impact-2-pt-BR-1.svg)

### Fluxo de Adesão e Tratamento de Falhas

1. O cliente envia uma solicitação de adesão ao cheque especial pelo app mobile.
2. O mobile chama a camada BFF/API, que cria ou dispara uma nova instância de saga.
3. O orquestrador persiste o estado inicial da saga no Cassandra.

4. Etapa de Autorização
   - Solicita autorização ao domínio de autorização.
   - Em sucesso, transiciona para `AUTHORIZED` e persiste um novo snapshot.
   - Em falha transitória, retenta dentro de limites definidos.

5. Avaliação de Risco
   - Solicita avaliação de elegibilidade/risco ao domínio de risco.
   - Em aprovação, transiciona para `RISK_APPROVED`.
   - Em falha ou resposta indisponível, retenta apenas enquanto o fluxo permanece dentro do orçamento de execução.

6. Atualização de Conta
   - Solicita atualização de conta/limite de cheque especial ao domínio de contas.
   - Em sucesso, transiciona para `ACCOUNT_UPDATED`.
   - Em estado duplicado ou já processado downstream, trata a resposta conforme o snapshot atual da saga e evita corromper o fluxo.

7. Notificação
   - Envia confirmação ou comunicação final ao cliente.
   - Transiciona para `NOTIFIED` e depois `COMPLETED` quando o fluxo atinge o estado terminal de sucesso.

### Estratégia de Retentativa e Dead Letter

- Cada etapa crítica suportava retentativas limitadas, comumente até 3 tentativas.
- Um time-to-live (TTL) global de aproximadamente 5 minutos limitava a execução completa da saga.
- Se as retentativas se esgotassem, o TTL fosse excedido ou o fluxo atingisse um estado que não pudesse ser resolvido automaticamente com segurança:
  - A adesão era roteada para uma Dead Letter Queue (DLQ).
  - O estado final e snapshots relevantes permaneciam disponíveis para investigação.
  - Uma equipe dedicada de suporte podia processar ou reconciliar o caso manualmente.

Esse desenho evitava retentativas indefinidas e protegia sistemas downstream de tempestades de retry, garantindo que solicitações de clientes nunca fossem perdidas silenciosamente.

### Modelo de Idempotência e Concorrência

O orquestrador foi projetado para escalar horizontalmente sem depender de locks distribuídos no Cassandra. A segurança vinha da combinação de idempotência downstream, regras de máquina de estados e comparação de snapshots.

- Workers orquestradores eram stateless e escaláveis horizontalmente.
- Mensagens duplicadas ou execução repetida de etapas podiam ocorrer em condições normais de sistemas distribuídos.
- Sistemas downstream eram esperados para rejeitar ou tratar com segurança operações duplicadas já processadas.
- O orquestrador avaliava respostas contra o snapshot atual da saga antes de aplicar qualquer transição.
- Eventos obsoletos, respostas atrasadas ou callbacks duplicados não podiam sobrescrever um estado mais avançado.

Se um sistema downstream já tivesse processado uma requisição, a resposta duplicada não corrompia a saga. O orquestrador ignorava o evento obsoleto ou o interpretava no contexto do snapshot persistido mais recente.

A progressão de estado era monotônica. Eventos mais antigos não podiam sobrescrever um estado de saga mais avançado, o que proporcionava segurança sem introduzir gargalos de coordenação.

### Observabilidade e Transparência Operacional

- Logs estruturados para cada transição de saga, tentativa de retentativa, requisição downstream, estado de falha e evento de roteamento para DLQ.
- Agregação centralizada de logs e dashboards Grafana para investigação operacional.
- Snapshots de saga consultáveis no Cassandra para reconstruir o histórico de adesão.
- Monitoramento de DLQ para fluxos de intervenção manual.
- Métricas de taxa de sucesso, volume de retentativas, latência por etapa, taxa de timeout e concentração de falhas por domínio downstream.
- Streaming analítico para Apache Spark e Amazon Redshift para suportar reporting e visibilidade de negócio.

Equipes operacionais podiam rastrear uma adesão ponta a ponta usando logs, snapshots de estado e contexto de DLQ, reduzindo ambiguidade quando intervenção de suporte era necessária.

### Desenho de Escalabilidade e Resiliência

- Workers orquestradores stateless suportavam escalonamento horizontal em picos de uso mobile.
- Kafka fornecia coordenação orientada a eventos e capacidade de replay entre domínios.
- Snapshots de saga no Cassandra permitiam recuperação após quedas de processo, reinícios de deploy ou respostas downstream atrasadas.
- Schemas Avro e Confluent Schema Registry ajudavam a manter contratos de eventos type-safe e retrocompatíveis.
- Retentativas limitadas e limites de TTL evitavam falhas em cascata e execução indefinida de fluxos.
- Roteamento para DLQ convertia falhas de automação não resolvidas em trabalho operacional explícito em vez de inconsistência oculta de dados.

---

_Associado ao Itaú Unibanco_

_Detalhes como cronogramas específicos, métricas e identificadores internos foram generalizados em conformidade com acordos de confidencialidade._

---

### Stack Tecnológica

Java, Spring Boot, Spring State Machine, Apache Kafka, Avro, Confluent Schema Registry, Cassandra, Apache Spark, Amazon Redshift, Docker, JUnit, Grafana
