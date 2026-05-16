## Sistemas Distribuidos — Coordinación Orientada a Eventos y Aislamiento de Fallos

**Problema:** Los sistemas en producción en alta bancaria, automatización de garantías, sincronización facturación/factura, reporting fiscal y personalización de email transaccional requerían coordinar trabajo entre dominios independientes sin crear acoplamiento frágil, tormentas de reintento o puntos únicos de fallo.

**Enfoque:** Diseñé arquitecturas orientadas a eventos y asíncronas con gestión explícita de estado. Usé orquestación SAGA con máquinas de estado deterministas para flujos bancarios de varios pasos, workers BullMQ/Redis para automatización larga de garantías, Kafka para coordinación entre dominios, SQS/Lambda para sincronización serverless facturación→factura y vistas BFF/cacheadas para reporting fiscal de vendedores sensible a la latencia.

**Manejo de fallos:** Usé reintentos acotados, límites de TTL, dead letter queues, rutas de escalado, comportamiento de fallback y estados de handoff a soporte en lugar de reintentos indefinidos. Diseñé flujos donde la falla parcial era esperada y observable: snapshots de estado, progresión monotónica, manejo idempotente downstream, procesamiento seguro ante duplicados y estados terminales explícitos de fallo.

**Evidencia:** La alta móvil de descubierto en Itaú usó Kafka, Avro, snapshots en Cassandra, Spring State Machine, enrutamiento DLQ y escalado a soporte. La automatización de garantías usó BullMQ, Redis, coordinación en máquina de estados, reintentos y salvaguardas de escalado. La sincronización de facturación en Ageras usó AWS Lambda, SQS, validación de esquemas, claves de idempotencia, reintentos y alarmas CloudWatch. El reporting fiscal en Mercado Libre usó vista BFF asíncrona en caché para reducir la latencia de respuesta de 1–2s a hasta ~200ms.

**Por qué importa:** Demuestra comodidad diseñando sistemas donde la falla parcial, eventos duplicados, respuestas retrasadas y fallos de dependencias externas son restricciones normales de ingeniería — una preocupación de nivel senior/staff en entornos regulados, con integración pesada y críticos para ingresos.

## Ingeniería Nativa en IA — Flujos LLM con Recuperación y por Etapas

**Problema:** Las funcionalidades de producto con IA pueden volverse fácilmente genéricas, excesivamente confiadas o engañosas a menos que se diseñen en torno a calidad de recuperación, riesgo de alucinación, calibración de encaje y límites transparentes de evidencia.

**Enfoque:** Construí un asistente de reclutamiento basado en RAG que evalúa descripciones de puesto contra evidencia del portafolio usando recuperación determinística por similitud coseno sobre chunks de embedding pregenerados, análisis LLM por etapas, UX en streaming, techos explícitos de match score y validación de referencias postgeneración.

**Flujo:** El asistente ejecuta modelado determinista de entrada y un intent gate por LLM antes de recuperación o generación. Luego transmite tres etapas en una única ruta de respuesta: (1) un evaluador de evidencia dentro de marcadores API de `thinking` que clasifica requisitos del puesto como imprescindibles o deseables y la evidencia como directa, adyacente, no evidenciada o contradictoria; (2) un analista de evidencia, también en el bloque thinking, que sintetiza coincidencias de alto señal y ángulos de entrevista sin contradecir al evaluador; y (3) una evaluación orientada al reclutador tras el marcador de cierre del thinking, cuya intensidad de match no puede superar el techo recomendado por el evaluador.

**Salvaguardas de fundamentación:** El evaluador señala dónde la similitud coseno puede inducir lectura errónea, emite orientación de match score con techos rígidos e impide que conceptos vecinos no relacionados se presenten como evidencia fuerte. El handler espera a que termine el stream del evaluador antes de ejecutar análisis downstream, para que los prompts posteriores reciban siempre la tabla de cobertura completa y autoritativa. Tras el pitch para reclutadores, un paso estructurado extrae afirmaciones concretas, genera embeddings y las empareja de nuevo con chunks del portafolio para anexar una sección de Referencias con señalización explícita de baja similitud cuando la evidencia es débil.

**Manejo de encaje privado:** Cuando hay una rúbrica privada de intereses configurada, un paso opcional de alineación de intereses se ejecuta como completado no transmitido en streaming tras el evaluador. Se registra solo en servidor para operadores y no se envía al cliente ni se fusiona en el pitch para reclutadores, manteniendo evidencia pública separada del análisis de preferencias privadas.

**Qué demuestra:** Ingeniería de producto nativa en IA — tratar recuperación, fundamentación, incertidumbre, mitigación de alucinación, calibración de puntuación y latencia de streaming como preocupaciones de arquitectura, no solo de prompt.

## Sistemas de Decisión Orientados a IA — Automatización Inteligente bajo Restricciones

**Problema:** El procesamiento manual de garantías era caro y difícil de escalar, mientras los emails transaccionales necesitaban contenido personalizado en una ruta crítica para ingresos bajo restricciones estrictas de latencia de ~200ms a ~100 RPS.

**Enfoque:** Diseñé sistemas de decisión asistidos por IA que mantuvieron la salida de la IA detrás de límites de ingeniería controlados. La automatización de garantías usó evaluación de imágenes por IA como entrada en un motor determinista de reglas JSON, no como decisor final. La personalización en Klarna usó coincidencia de similitud vectorial sobre comportamiento del cliente, vectores de campañas activas y embeddings de perfiles “Power User” para recuperar bloques elegibles en tiempo real.

**Patrones de fiabilidad:** Usé mecanismos de fallback seguros para que los flujos principales no se bloquearan por salidas de IA no disponibles, coincidencia vectorial lenta, datos ausentes, fallos en sistemas externos o rutas de regla desconocidas. Los flujos de garantía usaron procesamiento asíncrono en cola, reintentos acotados, salvaguardas de escalado y estados de handoff a soporte. La personalización en email transaccional usó fallback a contenido por defecto para mantener fiable la entrega de confirmación de compra.

**Impacto:** Reduje la sobrecarga manual de procesamiento de garantías preservando escalado a soporte en casos inciertos o fallidos. Mejoré el engagement en email transaccional, con CTR de ~1,4 % a ~1,8 % en el contexto de personalización. Establecí patrones reutilizables para automatización asistida por IA donde reglas deterministas, presupuestos de latencia, observabilidad, rutas de fallback y revisión humana deben coexistir.

## Observabilidad y Fiabilidad — Madurez Operativa Orientada a SLO

**Problema:** Las plataformas fintech, bancarias, de e-commerce y soporte al cliente necesitan visibilidad operativa que explique qué ocurrió entre sistemas — no solo dashboards que muestran que algo falló.

**Enfoque:** Instrumenté sistemas con Datadog, Grafana, CloudWatch, New Relic, logs estructurados, trazas distribuidas, dashboards de latencia/error y métricas de negocio personalizadas. Definí y monitoricé SLOs/SLAs de tiempo de respuesta, disponibilidad, comportamiento ante fallos, salud de colas y rutas críticas de integración.

**Patrones operativos:** Usé monitorización de DLQ, reintentos acotados, rutas de escalado, guardia, alertas, trazado de estado de saga, dashboards de salud de colas, telemetría de fallback y herramientas de diagnóstico. Diseñé sistemas para que soporte, SRE e ingeniería pudieran rastrear flujos de extremo a extremo mediante logs, snapshots de estado, dashboards y consultas operativas.

**Evidencia:** La personalización en Klarna usó tracing Datadog, SLOs de latencia/error, telemetría de fallback y ownership de guardia. La orquestación SAGA en Itaú usó logs estructurados de transición, dashboards Grafana, snapshots en Cassandra, monitorización de DLQ y reporting Spark/Redshift. La sincronización de facturación en Ageras usó métricas CloudWatch, dashboards, alarmas, tasas de éxito de invocación, latencia y tendencias de error. Los diagnósticos en PagSeguro agregaron datos de API en un modelo unificado de troubleshooting para equipos de soporte de Nivel 2 y 3.

**Por qué importa:** Muestra ownership de producción más allá de la entrega de funcionalidades: visibilidad de incidentes, contención de fallos, handoffs operativos, soporte y fiabilidad bajo carga.

## Ingeniería de Plataforma Full-Stack — Entrega y Ownership en Múltiples Capas

**Problema:** El trabajo de producto complejo suele atravesar frontend, backend, infraestructura, observabilidad, datos y preocupaciones operativas. El impacto depende de poseer todo el camino, no de optimizar solo una capa.

**Alcance:** Entregué servicios backend en Node.js/TypeScript y Java/Spring, aplicaciones frontend en React y React Native, infraestructura en AWS/Kubernetes/Terraform, pipelines CI/CD, observabilidad y pruebas en fintech, banca, e-commerce, validación farmacéutica, soporte al cliente y dominios de producto asistidos por IA.

**Patrones de entrega:** Ownership del ciclo de vida completo desde descubrimiento y arquitectura hasta implementación, pruebas, despliegue, monitorización e iteración. Usé clean architecture, límites hexagonales, microservicios, flujos event-driven, scaffolds frontend reutilizables, monorepos, bibliotecas UI compartidas, APIs tipadas, pruebas E2E y automatización de despliegue.

**Evidencia:** BKYC en Ageras combinó React Native, web React, servicios backend, integraciones Solaris/terceros, Datadog y onboarding sensible al cumplimiento. Mercado Libre combinó APIs fiscales, dashboards de vendedores, plataformas backoffice, scaffolds reutilizables, monorepos y migración de infraestructura. Five Validation combinó Java/Spring, React, PostgreSQL, AWS, Jenkins, SonarQube, CloudWatch y automatización de flujos regulados.

**Impacto:** Aceleré equipos mediante arquitectura reutilizable, herramientas compartidas, prácticas estandarizadas, documentación y transferencia de conocimiento en contextos que van desde grandes marketplaces y bancos hasta fintechs y startups más pequeñas.

## Arquitectura de Integración — Composición de Servicios y Diseño de Límites

**Problema:** Los productos que integran CRMs, servicios de IA, sistemas bancarios, backbones de eventos, plataformas de datos, notificaciones y flujos de soporte necesitan límites resilientes para que el fallo de una dependencia no propague en cascada el flujo principal del cliente.

**Enfoque:** Usé GraphQL/Apollo Federation para composición de servicios, APIs REST para rutas síncronas de baja latencia, Kafka/SQS/BullMQ para coordinación asíncrona, vistas BFF/cacheadas para rendimiento de read models y límites de adaptadores para aislar sistemas externos de la lógica de negocio central.

**Tradeoffs:** Usé federación o composición cuando importaba la evolución independiente, REST cuando importaban tiempo de respuesta síncrono y simplicidad operativa, comunicación event-driven cuando importaban aislamiento de fallos y consistencia eventual, y vistas BFF/cacheadas cuando la latencia orientada al usuario requería datos precomputados o consolidados.

**Evidencia:** La automatización de garantías integró Salesforce, chatbot, evaluación de imágenes por IA, servicios GraphQL, workers de cola y escalado a soporte. La personalización en Klarna integró feeds de campañas, datos de interacción, embeddings de perfiles similares, endpoints REST y generación de email transaccional. Ageras integró APIs Solaris/terceros para BKYC y SQS/Lambda/REST para sincronización de facturación. Mercado Libre coordinó impuestos, facturación, móvil, UX, producto y reporting fiscal de vendedores mediante límites de servicio y frontend.

**Por qué importa:** Demuestra capacidad para componer sistemas entre límites organizativos y técnicos preservando fiabilidad, desplegabilidad y ownership claro.

## Liderazgo Técnico — Prácticas de Ingeniería e Impacto en Equipos

**Problema:** Los sistemas y equipos en crecimiento necesitan prácticas que escalen: arquitectura compartida, ownership claro, decisiones revisables, herramientas reutilizables, onboarding y alineación cross-funcional.

**Contribuciones:** Estandaricé prácticas mediante scaffolds reutilizables, monorepos, bibliotecas UI compartidas, plantillas de prueba, prácticas de CI/CD, mejoras de observabilidad, documentación, registros de decisión y orientación de arquitectura. Mentoricé ingenieros, integré compañeros, colaboré con producto/UX/SRE/soporte/cumplimiento y traduje trade-offs técnicos a lenguaje accionable para equipos no técnicos.

**Evidencia:** Los scaffolds frontend en Mercado Libre redujeron el bootstrap de nuevos proyectos de días a menos de una hora, y el monorepo aceleró la integración de componentes compartidos de días a horas. El trabajo contractual confidencial usó especificaciones, tickets, talleres, registros de decisión y revisiones de riesgo compartidas para alinear negocio, cliente, infraestructura, seguridad, soporte, producto e ingeniería. Five Validation requirió colaboración directa con liderazgo, elicitación de requisitos, documentación lista para auditoría y controles de release en un entorno regulado.

**Señales de seniority:** Toma de decisiones técnicas a nivel de empresa, influencia cross-funcional, mentoría, pensamiento de plataforma, ownership más allá de la implementación, disciplina documental y efecto multiplicador mediante sistemas reutilizables.

## Ingeniería Asistida por IA — Adopción Pragmática como Práctica de Entrega

**Problema:** El desarrollo asistido por IA puede acelerar la entrega, pero las afirmaciones creíbles exigen separar el uso de herramientas de codificación con IA del ownership de sistemas de IA en producción y de claims de ML no respaldados.

**Práctica:** Construí el sitio de portafolio y el asistente de reclutamiento con herramientas como Cursor y revisión estilo Copilot para scaffolding, refactors, pruebas, iteración de copy y planificación de implementación. Mantuve ownership humano sobre arquitectura, prompts, threat modeling, code review, CI/CD, pruebas, despliegue y comportamiento en producción.

**Distinción en producción:** El asistente de reclutamiento es una funcionalidad de producto nativa en IA con alcance definido usando RAG, generación por etapas evaluador/analista/pitch, UX en streaming, match score con techo y match de referencias post-stream. El trabajo de personalización en Klarna involucró similitud vectorial y embeddings en un contexto de email transaccional crítico para ingresos. La automatización de garantías usó evaluación de imágenes por IA detrás de reglas de negocio deterministas.

**Qué demuestra:** Adopción pragmática de IA como práctica de entrega y capacidad de producto: usar herramientas de IA para aumentar el apalancamiento de ingeniería aplicando pruebas, type safety, observabilidad, disciplina de revisión, fundamentación y fallback.

**Distinción:** La codificación asistida por IA se presenta como señal de productividad y entrega. El trabajo de producto nativo en IA se presenta por separado donde la arquitectura realmente usa recuperación, embeddings, motores de decisión o salidas de modelos de IA.

## Colaboración Cross-Funcional — Entrega Matricial y Remota

**Problema:** Muchos proyectos de alto impacto fallan no porque el código sea difícil, sino porque varios equipos poseen partes distintas del flujo, incentivos, datos, cumplimiento, timing de release y responsabilidades de soporte.

**Práctica:** En entrega contractual remota, actué como puente de ingeniería entre negocio, cliente, infraestructura, seguridad, soporte, producto e ingeniería interna — usando trazabilidad en tickets, especificaciones compartidas, talleres, registros de decisión, planificación conjunta, revisiones de riesgo y puntos de control de integración para mantener stakeholders alineados desde el descubrimiento hasta el lanzamiento.

**A escala:** Entregué iniciativas cross-funcionales involucrando plataforma de datos, incentivos, contenido, marketing, analytics, UX, ingeniería de plataforma, política fiscal, facturación, móvil, backend, equipos regionales de mercado, legal, cumplimiento, SRE, QA, soporte y operaciones. Negocié trade-offs de implementación cuando los equipos tenían metas, cadencias y límites de ownership diferentes.

**Contextos anteriores:** Lideré la migración de la experiencia fiscal e iniciativas de plataforma en Mercado Libre con producto, política, UX, backend, facturación, móvil y equipos regionales. Trabajé con arquitectura bancaria, SRE, operaciones, analistas y cumplimiento en Itaú. Coordiné validación, QA, operaciones de ventas, consultores y stakeholders ejecutivos en Five Validation, incluyendo colaboración directa con liderazgo en requisitos y planificación.

**Por qué importa:** Muestra capacidad para operar en entornos matriciales donde arquitectura técnica, comunicación, secuenciación y confianza entre stakeholders forman parte del sistema de entrega.
