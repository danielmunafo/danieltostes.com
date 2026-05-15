### Resumo Executivo

Projetei e entreguei um serviço de orquestração distribuído baseado em SAGA que permite aos clientes aderir ao cheque especial diretamente pelos canais móveis.

A solução coordena múltiplos domínios de backend (autorização, risco, serviços de conta, notificação) garantindo consistência eventual, tolerância a falhas e alta concorrência em ambiente bancário regulado.

### Impacto no Negócio

- Habilitou onboarding do produto cheque especial pelo canal mobile
- Reduziu dependência operacional de agência/contratação manual
- Aumentou adoção de produtos digitais
- Reforçou rastreabilidade e visibilidade operacional
- Contenção de falhas por estratégia de retry estruturado + DLQ

### Visão da Arquitetura

O serviço de orquestração atua como motor de fluxo centralizado, coordenando serviços de domínio de forma assíncrona por fluxos de eventos e persistindo o estado da saga para recuperação e escalabilidade horizontal.

![diagram](/content/diagrams/impact-2-pt-BR-0.svg)

Infraestrutura de suporte:

- Backbone de eventos: Apache Kafka
- Dead Letter Queue (DLQ) para inscrições com falha
- Persistência de estado: Cassandra (snapshots da saga)
- Observabilidade: logging centralizado e dashboards Grafana
- Streaming analítico: Apache Spark
- Relatórios e BI: Amazon Redshift

#### Características da Arquitetura

- Orquestração SAGA orientada a máquina de estados
- Comunicação event-driven entre serviços
- Snapshots persistentes da saga para recuperação após falha
- Instâncias worker stateless para escalabilidade horizontal
- Tratamento idempotente de eventos
- Estratégia de retry limitada com isolamento de falhas
- Observabilidade operacional completa (logs + métricas)

### Modelo da Máquina de Estados

Cada solicitação de contratação é modelada como uma máquina de estados determinística com transições apenas para frente.

#### Estados Principais

- STARTED
- AUTHORIZED
- RISK_APPROVED
- ACCOUNT_UPDATED
- NOTIFIED
- COMPLETED
- FAILED

As transições são orientadas a snapshot e monotônicas: após a saga avançar para um estado mais recente, eventos antigos ou duplicados não podem sobrescrevê-lo.

### Diagrama de Sequência - Contratação em Cheque Especial Event-Driven (Kafka)

![diagram](/content/diagrams/impact-2-pt-BR-1.svg)

### Fluxo de Contratação e Tratamento de Falhas

1. Cliente envia contratação em cheque especial pelo mobile.
2. API dispara nova instância da saga (estado = STARTED).
3. Estado da saga persistido no Cassandra.

4. Etapa de autorização
   - Invocar serviço de autorização
   - Em sucesso → transição para AUTHORIZED
   - Em falha → retry (até 3 tentativas)

5. Avaliação de risco
   - Invocar motor de risco
   - Em aprovação → transição para RISK_APPROVED
   - Em falha → retry (tentativas limitadas)

6. Atualização de conta
   - Atualizar limite de cheque especial
   - Em sucesso → transição para ACCOUNT_UPDATED
   - Em falha → retry (tentativas limitadas)

7. Notificação
   - Enviar mensagem de confirmação
   - Transição para COMPLETED

### Estratégia de Retry e Dead Letter

- Cada etapa suporta até 3 tentativas de retry
- Um TTL global de aproximadamente 5 minutos limita a execução da saga
- Se os retries se esgotarem ou o TTL for excedido:
  - A contratação é encaminhada à Dead Letter Queue (DLQ)
  - O caso segue para uma equipe de suporte dedicada para processamento manual

Esse desenho evita retries indefinidos, protege a estabilidade do sistema e garante que solicitações do cliente não se percam em silêncio.

### Modelo de Idempotência e Concorrência

- Sem locking distribuído no Cassandra
- Workers do orquestrador stateless e horizontalmente escaláveis
- Processamento duplicado não corrompe o estado

Se um sistema downstream já tiver processado uma solicitação:

- O sistema downstream rejeita a operação duplicada
- A máquina de estados ignora eventos desatualizados
- A comparação por snapshot garante apenas transições de avanço

A progressão do estado é monotônica.  
Eventos mais antigos não podem sobrescrever um estado de saga mais avançado.

Isso garante segurança sem introduzir gargalos de coordenação.

### Observabilidade e Transparência Operacional

- Logs estruturados para cada transição da saga
- Agregação centralizada de logs
- Rastros operacionais consultáveis no Grafana
- Monitoramento da DLQ para fluxos de intervenção manual
- Métricas em tempo real para sistemas de analytics e reporting

As equipes operacionais conseguem rastrear qualquer contratação de ponta a ponta em segundos.

### Desenho de Escalabilidade e Resiliência

- Workers orquestradores stateless
- Coordenação distribuída baseada em Kafka
- Persistência do estado da saga em Cassandra
- Capacidade segura de replay e retomada
- Modelo de retry limitado evitando falhas em cascata
- Projetado para alta concorrência em picos de uso mobile

---

_Associado ao Itaú Unibanco_

_Detalhes como prazos, métricas e identificadores internos foram generalizados em conformidade com acordos de confidencialidade._

---

### Tech Stack

Java, Spring Boot, Spring State Machine, Apache Kafka, Cassandra, Apache Spark, Amazon Redshift, Docker, JUnit, Grafana
