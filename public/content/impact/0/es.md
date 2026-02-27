### Resumen Ejecutivo

Diseñé e implementé un sistema de automatización de garantías impulsado por IA para una marca de consumo, transformando un flujo manual y muy dependiente de soporte en un pipeline de decisión escalable y basado en reglas.

Entregué una arquitectura resiliente y eficiente en costes, capaz de procesar evaluaciones basadas en imágenes y aplicar reglas de negocio dinámicas bajo restricciones estrictas de fiabilidad.

### Impacto y Resultados

- Reducción de la carga manual en el procesamiento de reclamaciones de garantía.
- Mayor cobertura de automatización manteniendo salvaguardas de escalado a soporte.
- Establecimiento de un framework de automatización escalable y de bajo coste adaptable a reglas de negocio en evolución.

### Diagrama de Arquitectura

```mermaid
flowchart LR
    Portal[Web Portal] -->|Submit or Update Claim| Processor[Warranty Claim Processing System]

    subgraph Warranty Claim Processing System
        Workers[Workers]
        Rules[JSON Decision Engine]
    end

    Processor --> Workers
    Workers --> Rules
    Rules --> Workers

    Workers -->|Request Image Evaluation| AI[AI Image Evaluation Service]
    AI -->|Labels and Scores| Workers

    Workers -->|Update Case Status| Portal
```

## Diagrama de Secuencia

```mermaid
sequenceDiagram
    participant Portal as Web Portal
    participant Processor as Claim Processing System
    participant Queue as Internal Job Queue
    participant Worker as Worker
    participant AI as AI Image Service
    participant Rules as JSON Decision Engine
    participant Support as Support Escalation

    Portal->>Processor: Submit / Update Warranty Claim
    Processor->>Queue: Enqueue Claim Job

    Queue->>Worker: Dequeue Job
    Worker->>Portal: Fetch Claim Data + Images

    Worker->>AI: Send Images for Evaluation
    AI-->>Worker: Return Labels / Scores

    Worker->>Rules: Evaluate Business Rules (claim data + AI output)
    Rules-->>Worker: Decision Result

    alt Decision = Auto-Process
        Worker->>Portal: Update Claim Status
        Worker-->>Queue: Acknowledge Job (success)
    else Decision = Escalate or Failure
        loop Retry up to 3 times
            Worker->>Worker: Retry Processing
        end
        Worker->>Support: Send to Manual Review
        Worker-->>Queue: Acknowledge Job (escalated)
    end
```

### Orquestración del Flujo y Fiabilidad

- Implementé procesamiento asíncrono con BullMQ + Redis para alta disponibilidad y tolerancia a fallos.
- Introduje lógica de reintento acotada (3 intentos) con escalado automático a equipos de soporte en casos imprevistos.
- Integré actualizaciones automáticas del estado de casos con sistemas CRM para mantener visibilidad operativa.
- Implementé alertas y monitorización para garantizar la fiabilidad continua del sistema.

### Arquitectura de Decisión y Procesamiento

- Construí un motor de decisión basado en JSON que permite la ingestión y evaluación dinámica de reglas según los resultados de clasificación de imágenes por IA.
- Aseguré comportamiento determinista y extensibilidad mediante fronteras arquitectónicas claras.

### Plataforma y Prácticas de Ingeniería

- Despliegue en AWS con Kubernetes e infraestructura gestionada mediante Terraform y ArgoCD.
- Aplicación de los principios de Clean Architecture para separación de responsabilidades y mantenibilidad a largo plazo.
- Integración de servicios GraphQL (Apollo Federation) en un ecosistema basado en TypeScript.
- Uso de integraciones de modelos de IA (incluidos servicios Google AI) para evaluación de imágenes.
- Mantenimiento de altos estándares de testabilidad y documentación, con flujos de planificación estructurados y actualizaciones automatizadas de documentación.

---

_Compromiso Confidencial con Cliente (Contrato)_

_Los detalles como plazos, métricas e identificadores internos han sido generalizados de acuerdo con acuerdos de confidencialidad._

---

### Tech Stack

TypeScript, Node.js, GraphQL, Apollo Federation, BullMQ, Redis, AWS, Kubernetes, Terraform, ArgoCD, AI Model Integrations, Google AI, Clean Architecture
