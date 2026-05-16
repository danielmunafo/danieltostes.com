## Motor de Personalización con IA en Tiempo Real para Flujos de Email Transaccional

### Resumen Ejecutivo

Diseñé y lideré la implementación de un motor de decisión vectorial de baja latencia para personalización con IA dentro de flujos de email transaccional críticos para ingresos, incluidas experiencias de confirmación de compra en las que la recuperación de contenido nunca debe interrumpir el mensaje transaccional principal.

La plataforma transformaba señales de interacción del cliente en embeddings, los comparaba con vectores de campañas activas y perfiles similares, y devolvía bloques de contenido personalizados de forma síncrona dentro de una ventana de respuesta estricta de ~200 ms a ~100 RPS. En lugar de tratar la personalización como una tabla estática de reglas, el sistema usó coincidencia por similitud y embeddings de perfiles “Power User” para seleccionar campañas más alineadas con el comportamiento de cada cliente.

El servicio se construyó como un microservicio containerizado en Node.js/TypeScript expuesto mediante APIs REST e integrado en el pipeline de email transaccional de Klarna, con comportamiento de fallback seguro, observabilidad en Datadog, monitorización de SLO y ownership de guardia para proteger la comunicación de alto volumen con clientes.

### Impacto y Resultados

- Aumenté el engagement con bloques de contenido personalizados en emails transaccionales, mejorando el CTR de campañas y las oportunidades de conversión posteriores.
- Mejoré el CTR de ~1,4 % a ~1,8 %; con 1M de compras mensuales, eso representa unas 4.000 clics adicionales al mes, o ~3.000 clics incrementales tras considerar la línea base anterior, según las premisas de atribución.
- Establecí una base escalable y de baja latencia para personalización con IA, extensible más allá de flujos de confirmación de compra hacia canales transaccionales y de lifecycle adicionales.
- Habilité una selección de campañas más adaptativa al comparar embeddings de comportamiento del cliente con vectores de campañas activas en lugar de depender solo de reglas estáticas de segmentación.
- Protegí la fiabilidad del email transaccional con rutas de fallback deterministas, de modo que personalización lenta, no disponible o fallida nunca bloqueara el mensaje principal de confirmación de compra.

![diagram](/content/diagrams/impact-1-es-0.svg)

### Diagrama de Secuencia — Flujo de Personalización con Fallback

![diagram](/content/diagrams/impact-1-es-1.svg)

### Arquitectura del Motor de Decisión

- Diseñé e implementé un motor de decisión vectorial que realizaba coincidencia de similitud de embeddings en tiempo real entre perfiles de interacción del cliente, vectores de campañas activas y señales de recomendación basadas en pares.
- Construí la lógica de perfiles “Power User” representando comportamiento de alto rendimiento como embeddings y emparejando clientes similares con campañas de mayor engagement esperado.
- Mantuve el camino de decisión de personalización acotado por restricciones de latencia, asegurando que la lógica de recomendación pudiera ejecutarse de forma síncrona en la generación de email de confirmación de compra sin degradar el pipeline de comunicación con el cliente.
- Diseñé la coincidencia de campañas como una capa de decisión a nivel de servicio, en lugar de incrustar lógica de negocio directamente en plantillas de email, facilitando pruebas, evolución, observabilidad y reutilización.
- Soporté feeds de campañas en vivo y restricciones de elegibilidad para que el motor devolviera solo bloques de contenido válidos y actualmente activos en cada solicitud.

### Integración del Servicio

- Desplegué el motor como microservicio containerizado en Node.js/TypeScript integrado con la plataforma de email transaccional.
- Expuse endpoints REST para recuperación síncrona de contenido durante flujos de confirmación de compra, devolviendo bloques personalizados cuando se cumplían confianza, elegibilidad y restricciones de latencia.
- Integré datos de interacción del cliente, metadatos de campañas y embeddings de perfiles similares en un único flujo de decisión en runtime.
- Implementé mecanismos de fallback seguros para que datos ausentes, feeds no disponibles, coincidencia vectorial lenta o errores de servicio devolvieran contenido por defecto en lugar de interrumpir la entrega transaccional.
- Colaboré con plataforma de datos, incentivos, contenido, marketing, analytics e ingeniería de plataforma para alinear requisitos de campaña, disponibilidad de datos, objetivos de experimentación y restricciones operativas.

### Observabilidad, Rendimiento y Fiabilidad

- Instrumenté tracing de extremo a extremo, histogramas de latencia, métricas de tasa de error y métricas de negocio personalizadas en Datadog para monitorizar calidad de recomendación y salud del sistema.
- Definí y monitoricé SLOs/SLAs de tiempo de respuesta, disponibilidad y comportamiento ante fallos en una ruta crítica de generación de email para ingresos.
- Participé en guardia 24/7, con ownership operativo de incidentes que afectaran personalización, recuperación de campañas o integración con email transaccional.
- Usé telemetría de fallback para distinguir comportamiento sano de contenido por defecto de fallos de personalización que requerían acción de ingeniería.
- Añadí pruebas automatizadas sobre comportamiento de decisión, contratos REST, escenarios de fallback y límites de integración para reducir riesgo de regresión en la entrega de campañas.

### Contexto de Producto y Negocio

- El motor operaba dentro de flujos de email transaccional, donde la personalización debía mejorar el engagement sin crear riesgo para la comunicación obligatoria con el cliente.
- El diseño equilibró experimentación, rendimiento de campañas, relevancia para el usuario y fiabilidad al separar decisiones de recomendación de la ruta principal de entrega de email.
- La arquitectura creó un patrón reutilizable para futuros casos de personalización asistida por IA: recopilar señales comportamentales, representarlas como embeddings, emparejarlas con contenido elegible, devolver el mejor candidato bajo un presupuesto estricto de latencia y hacer fallback con seguridad cuando la confianza o la disponibilidad fueran insuficientes.

---

_Asociado a Klarna_

_Los detalles como cronogramas específicos, métricas e identificadores internos se han generalizado de acuerdo con acuerdos de confidencialidad._

---

### Stack Tecnológico

TypeScript, Node.js, REST APIs, AWS, Microservicios Containerizados, Datadog, Jest, Búsqueda Vectorial, Embeddings, Coincidencia por Similitud, Sistemas de Recomendación, Email Transaccional, DDD
