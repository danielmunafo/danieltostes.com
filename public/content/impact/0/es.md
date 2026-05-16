### Resumen Ejecutivo

Diseñé y entregué una plataforma de automatización de reclamaciones de garantía impulsada por IA para un flujo de e-commerce orientado al consumidor, sustituyendo un proceso manual y dependiente de soporte por un pipeline de decisión escalable que coordina evaluación de imágenes con IA, reglas de negocio deterministas, actualizaciones de CRM, automatización de chatbot y rutas de escalado humano.

El sistema se construyó en torno a un motor de decisión basado en JSON y workers asíncronos, de modo que las reglas de negocio pudieran evolucionar sin exigir cambios arriesgados en producción en el flujo central de orquestación. En lugar de tratar la salida de la IA como decisión final, la plataforma usa el análisis de imágenes por IA como una entrada en una capa de reglas controlada, manteniendo decisiones explicables, auditables y seguras para escalar cuando la confianza o la cobertura de reglas es insuficiente.

### Impacto y Resultados

- Reduje la sobrecarga manual en el procesamiento de garantías al automatizar rutas de decisión repetibles, preservando el escalado a soporte en casos inciertos, fallidos o excepcionales.
- Aumenté la cobertura de automatización mediante reglas de negocio dinámicas, permitiendo nuevos escenarios de reclamación y políticas operativas sin interrumpir toda la plataforma.
- Mejoré la fiabilidad operativa con procesamiento asíncrono, reintentos acotados, recuperación basada en colas y estados explícitos de fallo para flujos largos de garantía.
- Conecté ingeniería, negocio, soporte, infraestructura, seguridad y producto mediante trazabilidad en tickets, especificaciones compartidas, registros de decisión y puntos de control de integración.
- Establecí un marco reutilizable de automatización para flujos de soporte asistidos por IA en los que reglas deterministas, actualizaciones en sistemas externos y revisión humana deben coexistir con seguridad.

### Diagrama de Arquitectura

![diagram](/content/diagrams/impact-0-es-0.svg)

## Diagrama de Secuencia

![diagram](/content/diagrams/impact-0-es-1.svg)

### Orquestación de Flujo y Fiabilidad

- Arquitecté procesamiento asíncrono con BullMQ y workers Redis para desacoplar la evaluación prolongada de reclamaciones de las interacciones orientadas al usuario y a sistemas externos.
- Modelé el ciclo de vida de la reclamación como un flujo en máquina de estados multifase, coordinando evaluación con IA, ejecución de reglas, actualizaciones de CRM, handoffs de chatbot, reintentos y estados de escalado.
- Introduje lógica de reintento acotada con escalado automático a equipos de soporte cuando fallaban sistemas externos, la evaluación con IA era inconclusa o el motor de decisión alcanzaba una ruta desconocida.
- Diseñé recuperación basada en colas y salvaguardas de procesamiento idempotente para que trabajos duplicados, retrasados o parcialmente fallidos pudieran gestionarse sin corromper el estado de la reclamación.
- Integré alertas, monitorización y visibilidad operativa sobre salud de colas, fallos de workers, agotamiento de reintentos y errores de integraciones externas.

### Arquitectura de Decisión y Procesamiento

- Construí un motor de decisión basado en JSON que evalúa salidas estructuradas de clasificación de imágenes por IA frente a reglas de negocio configurables.
- Mantuve la salida del modelo de IA detrás de límites deterministas de reglas, de modo que las decisiones de garantía siguieran siendo explicables, probables y revisables por negocio y soporte.
- Diseñé el motor de reglas para soportar escenarios de negocio en evolución sin forzar cambios de alto riesgo en orquestación, colas o código de integración.
- Integré actualizaciones de estado de casos en Salesforce para que los equipos de soporte siguieran el progreso, los resultados automatizados y los motivos de escalado en los flujos operativos existentes.
- Conecté la automatización del chatbot al flujo de garantía para que los clientes recibieran pasos guiados mientras la plataforma seguía procesando de forma asíncrona en segundo plano.

### Plataforma y Prácticas de Ingeniería

- Apliqué límites de Clean Architecture para separar orquestación, evaluación de reglas, adaptadores externos, workers de cola, servicios GraphQL e infraestructura.
- Integré servicios GraphQL con Apollo Federation en un ecosistema TypeScript y Node.js.
- Desplegué en AWS con Kubernetes, con infraestructura y entrega gestionadas mediante Terraform y ArgoCD.
- Definí y mantuve cobertura E2E para recorridos críticos de garantía, incluyendo rutas de automatización exitosas, escenarios de reintento, flujos de escalado y fallos de integraciones externas.
- Usé flujos de planificación estructurados, documentación asistida por IA revisada por humanos y registros de decisión para mantener visibles las decisiones de implementación entre ingeniería y stakeholders no técnicos.

---

_Engagement con Cliente Confidencial (Contrato)_

_Los detalles como cronogramas específicos, métricas, identificadores de marca, nombres de proveedores y nombres internos de sistemas se han generalizado de acuerdo con acuerdos de confidencialidad._

---

### Stack Tecnológico

TypeScript, Node.js, GraphQL, Apollo Federation, BullMQ, Redis, AWS, Kubernetes, Terraform, ArgoCD, Integración Salesforce, Automatización de Chatbot, Integraciones de Modelos de IA, Evaluación de Imágenes, Clean Architecture, Pruebas E2E
