### Executive Summary

Designed and delivered a distributed SAGA-based orchestration service enabling customers to subscribe to overdraft ("Cheque Especial") directly through mobile channels.

The solution coordinates multiple backend domains (authorization, risk, account services, notification) while guaranteeing eventual consistency, fault tolerance, and high concurrency in a regulated banking environment.

### Business Impact

- Enabled mobile channel onboarding for overdraft product
- Reduced operational dependency on branch/manual enrollment
- Increased digital product adoption
- Strengthened auditability and operational visibility
- Contained failure scenarios through structured retry + DLQ strategy

### Architecture Overview

The orchestration service operates as a centralized workflow engine coordinating domain services asynchronously through event streams while persisting saga state for recoverability and horizontal scalability.

![diagram](/content/diagrams/impact-2-en-0.svg)

Supporting Infrastructure:

- Event Backbone: Apache Kafka
- Dead Letter Queue (DLQ) for failed enrollments
- State Persistence: Cassandra (Saga snapshots)
- Observability: Centralized logging + Grafana dashboards
- Analytics Streaming: Apache Spark
- Reporting & BI: Amazon Redshift

#### Architectural Characteristics

- State-machine-driven SAGA orchestration
- Event-driven communication between services
- Persistent saga snapshots enabling crash recovery
- Stateless worker instances for horizontal scalability
- Idempotent event handling
- Bounded retry strategy with failure isolation
- Full operational observability (logs + metrics)

### State Machine Model

Each enrollment request is modeled as a deterministic state machine with forward-only transitions.

#### Core States

- STARTED
- AUTHORIZED
- RISK_APPROVED
- ACCOUNT_UPDATED
- NOTIFIED
- COMPLETED
- FAILED

State transitions are snapshot-driven and monotonic: once a saga advances to a newer state, older or duplicated events cannot override it.

### Sequence Diagram - Event-Driven Overdraft Enrollment (Kafka-Based)

![diagram](/content/diagrams/impact-2-en-1.svg)

### Enrollment Flow & Failure Handling

1. Customer submits overdraft enrollment via mobile.
2. API triggers new saga instance (state = STARTED).
3. Saga state persisted to Cassandra.

4. Authorization Step
   - Invoke Authorization Service
   - On success → transition to AUTHORIZED
   - On failure → retry (up to 3 attempts)

5. Risk Assessment
   - Invoke Risk Engine
   - On approval → transition to RISK_APPROVED
   - On failure → retry (bounded attempts)

6. Account Update
   - Update overdraft limit
   - On success → transition to ACCOUNT_UPDATED
   - On failure → retry (bounded attempts)

7. Notification
   - Send confirmation message
   - Transition to COMPLETED

### Retry & Dead Letter Strategy

- Each step supports up to 3 retry attempts
- A global time-to-live (TTL) of approximately 5 minutes bounds saga execution
- If retries are exhausted or TTL exceeded:
  - The enrollment is routed to a Dead Letter Queue (DLQ)
  - The case is forwarded to a dedicated support team for manual processing

This design avoids indefinite retries and protects system stability while ensuring customer requests are never silently lost.

### Idempotency & Concurrency Model

- No distributed locking on Cassandra
- Orchestrator workers are stateless and horizontally scalable
- Duplicate processing does not corrupt state

If a downstream system has already processed a request:

- The downstream system rejects the duplicate operation
- The state machine ignores outdated events
- Snapshot comparison ensures only forward-progress transitions are applied

State progression is monotonic.  
Older events cannot override a more advanced saga state.

This guarantees safety without introducing coordination bottlenecks.

### Observability & Operational Transparency

- Structured logs for every saga transition
- Centralized log aggregation
- Queryable operational traces in Grafana
- DLQ monitoring for manual intervention workflows
- Real-time metrics feeding analytics and reporting systems

Operational teams can trace any enrollment end-to-end within seconds.

### Scalability & Resilience Design

- Stateless orchestrator workers
- Kafka-based distributed coordination
- Cassandra-backed saga state persistence
- Safe replay and resume capability
- Bounded retry model preventing cascading failures
- Designed to support high concurrency during peak mobile usage

---

_Associated with Itaú Unibanco_

_Details such as specific timelines, metrics, and internal identifiers have been generalized in accordance with confidentiality agreements._

---

### Tech Stack

Java, Spring Boot, Spring State Machine, Apache Kafka, Cassandra, Apache Spark, Amazon Redshift, Docker, JUnit, Grafana
