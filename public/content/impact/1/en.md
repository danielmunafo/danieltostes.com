## Real-Time AI Personalization Engine for Transactional Email Flows

### Executive Summary

Designed and led the implementation of a low-latency, vector-based decision engine powering AI-driven personalization inside revenue-critical transactional email flows (e.g., purchase confirmations).

Built a system that transforms customer interaction data into embeddings and matches them against live campaigns in real time, enabling contextual content selection within strict latency constraints (~200ms at ~100 RPS).

### Impact & Results

- Increased engagement with personalized content blocks, improving click-through and conversion in transactional emails.
- Established a scalable, low-latency foundation for AI-powered personalization across additional channels.
- CTR from 1.4% to 1.8% - For 1m monthly purchases it represents ~3k additional month traffic to campaigns and company ads

![diagram](/content/diagrams/impact-1-en-0.svg)

### Sequence Diagram - Personalization Flow with Fallback

![diagram](/content/diagrams/impact-1-en-1.svg)

### Decision Engine Architecture

- Designed and implemented a vector-based decision engine performing real-time embedding similarity matching against active campaign vectors.
- Built peer-based profiling logic using “Power User” embeddings to drive recommendation decisions under deterministic latency constraints.

### Service Integration

- Deployed as a containerized Node.js/TypeScript microservice within the transactional email pipeline.
- Exposed REST endpoints for synchronous content retrieval during purchase-confirmation flows.
- Implemented safe fallback mechanisms to ensure zero disruption to core transactional messaging.

### Observability, Performance & Reliability

- Instrumented end-to-end tracing and custom latency/error metrics in Datadog.
- Defined and monitored SLOs/SLAs for response time and availability.
- Participated in 24/7 on-call rotation for this revenue-critical system.

---

_Associated with Klarna_

_Details such as specific timelines, metrics, and internal identifiers have been generalized in accordance with confidentiality agreements._

---

### Tech Stack

TypeScript, Node.js, REST APIs, AWS, Datadog, Jest, Vector Search, Embeddings, DDD
