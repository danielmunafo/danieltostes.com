## Motor de Personalización con IA en Tiempo Real para Flujos de Email Transaccional

### Resumen Ejecutivo

Diseñé y lideré la implementación de un motor de decisión de baja latencia basado en vectores que impulsa la personalización con IA en flujos de email transaccionales críticos para ingresos (p. ej. confirmaciones de compra).

Construí un sistema que transforma datos de interacción del cliente en embeddings y los compara con campañas activas en tiempo real, permitiendo la selección de contenido contextual dentro de restricciones estrictas de latencia (~200ms a ~100 RPS).

### Impacto y Resultados

- Mayor engagement con bloques de contenido personalizado, mejorando clics y conversión en emails transaccionales.
- Establecimiento de una base escalable y de baja latencia para personalización con IA en canales adicionales.
- CTR de 1,4% a 1,8% — Para 1 millón de compras mensuales representa ~3k visitas adicionales al mes a campañas y anuncios de la empresa.

```mermaid
flowchart LR
    CP[Communication Platform] --> MS[Marketing Service]

    MS --> DE[Decision Engine]

    DE -->|Match Campaign| MS

    CDP[(Customer Data Platform)]
    CDP -->|Async Data Sync| DE

    MS --> CP
```

### Diagrama de Secuencia – Flujo de Personalización con Fallback

```mermaid
sequenceDiagram
    participant CP as Communication Platform
    participant MS as Marketing Service
    participant DE as Decision Engine
    participant CDP as Customer Data Platform

    CP->>MS: Request Transactional Email Content

    MS->>DE: Request Personalized Block (active campaigns)

    Note over CDP,DE: Customer embeddings synced asynchronously

    DE->>DE: Evaluate embeddings vs campaign vectors

    alt Match Found
        DE-->>MS: Return Personalized Content
    else No Match
        DE-->>MS: Return No-Match
        MS->>MS: Select Fallback Block
    end

    MS-->>CP: Final Email Payload
```

### Arquitectura del Motor de Decisión

- Diseñé e implementé un motor de decisión basado en vectores que realiza correspondencia de similitud de embeddings en tiempo real con vectores de campañas activas.
- Construí lógica de perfilado entre pares usando embeddings de "Power User" para orientar decisiones de recomendación bajo restricciones deterministas de latencia.

### Integración de Servicios

- Desplegado como microservicio Node.js/TypeScript containerizado dentro del pipeline de email transaccional.
- Endpoints REST expuestos para recuperación síncrona de contenido durante flujos de confirmación de compra.
- Mecanismos de fallback seguros implementados para garantizar cero disrupción en la mensajería transaccional principal.

### Observabilidad, Rendimiento y Fiabilidad

- Trazado de extremo a extremo y métricas personalizadas de latencia/error instrumentadas en Datadog.
- SLOs/SLAs definidos y monitorizados para tiempo de respuesta y disponibilidad.
- Participación en guardia 24/7 para este sistema crítico de ingresos.

---

_Asociado con Klarna_

_Los detalles como plazos, métricas e identificadores internos han sido generalizados de acuerdo con acuerdos de confidencialidad._

---

### Tech Stack

TypeScript, Node.js, REST APIs, AWS, Datadog, Jest, Vector Search, Embeddings, DDD
