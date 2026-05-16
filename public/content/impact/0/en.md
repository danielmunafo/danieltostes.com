### Executive Summary

Designed and delivered an AI-driven warranty claim automation platform for a consumer e-commerce workflow, replacing a support-heavy manual process with a scalable decision pipeline that coordinates AI image evaluation, deterministic business rules, CRM updates, chatbot automation, and human escalation paths.

The system was built around a JSON-based decision engine and asynchronous workers so business rules could evolve without requiring risky production changes in the core orchestration flow. Instead of treating AI output as the final decision, the platform uses AI image analysis as one input into a controlled rules layer, keeping decisions explainable, auditable, and safe to escalate when confidence or rule coverage is insufficient.

### Impact & Results

- Reduced manual warranty claim processing overhead by automating repeatable decision paths while preserving support escalation for uncertain, failed, or exceptional cases.
- Increased automation coverage through dynamic business rules, allowing new claim scenarios and operational policies to be added without disrupting the full platform.
- Improved operational reliability with asynchronous processing, bounded retries, queue-based recovery, and explicit failure states for long-running warranty flows.
- Connected engineering, business, support, infrastructure, security, and product stakeholders through ticket-backed traceability, shared specifications, decision logs, and integration checkpoints.
- Established a reusable automation framework for AI-assisted support workflows where deterministic rules, external system updates, and human review need to coexist safely.

### Architecture Diagram

![diagram](/content/diagrams/impact-0-en-0.svg)

## Sequence Diagram

![diagram](/content/diagrams/impact-0-en-1.svg)

### Workflow Orchestration & Reliability

- Architected asynchronous processing around BullMQ and Redis workers to decouple long-running claim evaluation from user-facing and external-system interactions.
- Modeled the claim lifecycle as a multi-phase state-machine workflow, coordinating AI evaluation, rule execution, CRM updates, chatbot handoffs, retries, and escalation states.
- Introduced bounded retry logic with automatic escalation to support teams when external systems failed, AI evaluation was inconclusive, or the decision engine reached an unknown path.
- Designed queue-based recovery and idempotent processing safeguards so duplicate, delayed, or partially failed jobs could be handled without corrupting claim state.
- Integrated alerting, monitoring, and operational visibility around queue health, worker failures, retry exhaustion, and external integration errors.

### Decision & Processing Architecture

- Built a JSON-based decision engine that evaluates structured AI image-classification outputs against configurable business rules.
- Kept AI model output behind deterministic rule boundaries so warranty decisions remained explainable, testable, and reviewable by business and support teams.
- Designed the rule engine to support evolving business scenarios without forcing high-risk changes to orchestration, queueing, or integration code.
- Integrated Salesforce case status updates so support teams could track claim progress, automated outcomes, and escalation reasons inside existing operational workflows.
- Connected chatbot automation to the warranty flow so customers could receive guided next steps while the platform continued processing asynchronously in the background.

### Platform & Engineering Practices

- Applied Clean Architecture boundaries to separate orchestration, rule evaluation, external adapters, queue workers, GraphQL services, and infrastructure concerns.
- Integrated GraphQL services using Apollo Federation within a TypeScript and Node.js ecosystem.
- Deployed on AWS using Kubernetes, with infrastructure and delivery managed through Terraform and ArgoCD.
- Defined and maintained E2E coverage for business-critical warranty journeys, including successful automation paths, retry scenarios, escalation flows, and external integration failures.
- Used structured planning workflows, human-reviewed AI-assisted documentation, and decision logs to keep implementation choices visible across engineering and non-engineering stakeholders.

---

_Confidential Client Engagement (Contract)_

_Details such as specific timelines, metrics, brand identifiers, vendor names, and internal system names have been generalized in accordance with confidentiality agreements._

---

### Tech Stack

TypeScript, Node.js, GraphQL, Apollo Federation, BullMQ, Redis, AWS, Kubernetes, Terraform, ArgoCD, Salesforce Integration, Chatbot Automation, AI Model Integrations, Image Evaluation, Clean Architecture, E2E Testing
