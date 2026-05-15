## Sistemas Distribuidos — Coordinación Orientada a Eventos y Aislamiento de Fallos

**Problema:** Sistemas en producción que abarcan enrolamiento bancario, automatización de garantías y personalización de correos transaccionales requerían coordinar trabajo entre dominios backend independientes sin crear acoplamiento frágil ni puntos únicos de fallo.

**Enfoque:** Arquitecturas orientadas a eventos con gestión de estado explícita. Patrones SAGA con máquinas de estado determinísticas para flujos de trabajo de múltiples pasos. Coordinación basada en mensajes (Kafka, BullMQ) evitando acoplamiento estrecho. Workers sin estado para escalabilidad horizontal.

**Manejo de fallos:** Reintentos acotados con escalamiento automático en lugar de reintentos indefinidos. Dead letter queues para casos irresolubles. Procesamiento idempotente y progresión de estado monótona garantizando seguridad sin bloqueo distribuido.

**Por qué importa:** Demuestra comodidad diseñando sistemas donde el fallo parcial es esperado — una preocupación de nivel staff en entornos con alta integración, regulados y críticos para el negocio.

## Ingeniería Nativa en IA — Flujos LLM con Recuperación Fundamentada y por Etapas

**Problema:** Construir funcionalidades de producto impulsadas por IA que sean creíbles y fundamentadas en lugar de genéricas requiere una arquitectura deliberada alrededor del determinismo de recuperación, el riesgo de alucinación y la UX de streaming.

**Enfoque:** Asistente para reclutadores basado en RAG con recuperación determinística por similitud coseno sobre fragmentos con embedding precalculados. **Tres etapas de chat en streaming** en un solo flujo; las dos primeras van dentro de marcadores API de **thinking**: (1) un **evaluador de evidencias** que clasifica cada requisito principal del puesto frente a los extractos recuperados (imprescindible vs deseable; directo/adyacente/sin evidencia/contradictorio), señala dónde la similitud coseno puede inducir a error y emite **guía de puntuación** con **techos** para que conceptos vecinos no justifiquen un encaje fuerte; si hay una **rúbrica de intereses** privada configurada, un paso opcional de **alineación de intereses** como finalización **no transmitida en stream** — **solo registro en servidor** para operadores, no se envía al cliente ni se fusiona con el pitch; (2) un **analista** que sintetiza alineación, coincidencias de alto valor y focos de entrevista **sin contradecer** al evaluador, en el mismo bloque **thinking** tras un separador breve; (3) **después del cierre del thinking**, una **evaluación para reclutadores** cuya intensidad del encaje **no puede superar** el techo recomendado por el evaluador. El handler **espera a que termine el stream del evaluador** antes de intereses (si aplica) y el analista, de modo que los prompts posteriores vean siempre una tabla de cobertura completa y autoritativa. Cuando termina el pitch, una **pasada estructurada** extrae claims concretos, los embebe y los empareja de nuevo con fragmentos del portafolio para añadir una sección de **Referencias** (con avisos explícitos cuando la similitud queda por debajo del umbral). Un **moldeado determinista de la entrada** y un **intent gate** por LLM se ejecutan antes de cualquier recuperación o generación.

**Compromisos:** Recuperación determinística + generación probabilística mantiene la fundamentación permitiendo síntesis. Sin fine-tuning — modelos fundacionales con prompting por etapas, manejo explícito de incertidumbre y un paso de “crítica” antes de la síntesis. El evaluador + analista envueltos en marcadores, evaluación opcional de intereses solo en servidor, y el emparejo de referencias post-stream mantienen la voz final alineada con evidencia comprobable.

**Qué demuestra esto:** Pensamiento de producto nativo en IA — diseñar alrededor de recuperación, fundamentación, mitigación de alucinación, calibración honesta del encaje y latencia de streaming con la misma disciplina de ingeniería que el resto del stack.

## Sistemas de Decisión con IA — Automatización Inteligente Bajo Restricciones

**Problema:** El procesamiento manual de reclamos de garantía era costoso y no escalable. Correos transaccionales críticos para el negocio necesitaban contenido personalizado en tiempo real bajo restricciones extremas de latencia (~200 ms a ~100 RPS).

**Enfoque:** Motores de decisión basados en JSON con integración de modelos de IA para reclamos de garantía — reglas de negocio dinámicas evaluadas contra etiquetas y puntuaciones de imagen generadas por IA. Coincidencia por similitud de embeddings vectoriales en tiempo real para personalización de correos transaccionales bajo restricciones de latencia determinísticas.

**Patrones de confiabilidad:** Mecanismos de fallback seguros garantizando cero interrupción en los flujos principales. Reintentos acotados con salvaguardas de escalamiento. Sincronización asíncrona de datos desde plataformas de datos de clientes para mantener baja la latencia de decisión.

**Impacto:** Redujo la carga de procesamiento manual manteniendo salvaguardas de escalamiento. Mejoró el engagement de correos (CTR de 1.4 % a 1.8 %). Estableció marcos escalables para automatización y personalización impulsadas por IA.

## Observabilidad y Confiabilidad — Madurez Operacional Orientada a SLO

**Problema:** Sistemas en producción en fintech, e-commerce de alto tráfico y banca requieren observabilidad estructurada y niveles de servicio definidos — no solo dashboards de monitoreo.

**Enfoque:** Instrumentación de extremo a extremo con Datadog y Grafana: métricas personalizadas, trazas distribuidas, dashboards de latencia/errores. Definición y monitoreo de SLO/SLA para tiempo de respuesta y disponibilidad. Logging estructurado para trazabilidad de flujos de trabajo y estados de saga.

**Patrones operacionales:** Monitoreo de DLQ para flujos de intervención manual. Rotación de guardia para sistemas críticos de negocio. Estrategias de reintento acotadas previniendo fallos en cascada. Alertas configuradas para confiabilidad continua. Herramientas de diagnóstico construidas para reducir el tiempo de respuesta a incidentes.

**Por qué importa:** Los equipos de operaciones pueden trazar transacciones de extremo a extremo en segundos. Los sistemas mantienen confiabilidad bajo carga a través de contención estructurada de fallos y caminos de escalamiento explícitos.

## Ingeniería de Plataforma Full-Stack — Entrega y Responsabilidad a Través de Capas

**Problema:** Productos complejos requieren ingenieros que puedan ser responsables de problemas de extremo a extremo — backend, frontend, infraestructura y preocupaciones operacionales — en lugar de delegar entre capas.

**Alcance:** Backend en Node.js/TypeScript y Java/Spring. Frontend en React y React Native. Infraestructura en AWS con Kubernetes, Terraform y pipelines de CI/CD. Dominios que abarcan fintech (facturación, productos bancarios), e-commerce de alto tráfico (cumplimiento fiscal en Latinoamérica), marcas de consumo (automatización de garantías) y herramientas internas.

**Patrones de entrega:** Responsabilidad del ciclo de vida completo desde el diseño hasta el despliegue e iteración. Microservicios y micro-frontends para entrega modular. Estandarización de prácticas de ingeniería y documentación. Implementación de pipelines de CI/CD y servicios contenerizados.

**Impacto:** Aceleró equipos a través de prácticas estandarizadas, herramientas compartidas y transferencia de conocimiento en contextos organizacionales desde un marketplace importante hasta fintech más pequeñas.

## Arquitectura de Integración — Composición de Servicios y Diseño de Fronteras

**Problema:** Productos que integran CRMs, servicios de IA, backbones de eventos, plataformas de datos y sistemas de notificación necesitan fronteras de servicio resilientes — los fallos en un punto de integración no deben propagarse en cascada.

**Enfoque:** GraphQL (Apollo Federation) para composición de servicios habilitando evolución independiente. APIs REST para integración síncrona en flujos sensibles a la latencia. Coordinación orientada a eventos vía Kafka para comunicación asíncrona entre dominios. Integración de gestión de casos en Salesforce, evaluación de imágenes por IA, plataformas de datos de clientes y sistemas de notificación multi-mercado.

**Compromisos:** Federation sobre APIs monolíticas para desplegabilidad independiente. Orientación a eventos sobre punto a punto para aislamiento de fallos. Mecanismos de fallback seguros en cada frontera de integración para proteger los flujos principales.

**Por qué importa:** Los sistemas permanecen desplegables y evolucionables de manera independiente. Los fallos de integración se contienen, no se propagan — crítico en entornos con múltiples dependencias externas.

## Liderazgo Técnico — Prácticas de Ingeniería e Impacto en Equipos

**Problema:** Equipos y bases de código en crecimiento necesitan más que contribuciones individuales — necesitan prácticas estandarizadas, herramientas compartidas y cultura de ingeniería.

**Contribuciones:** Implementó decisiones técnicas a nivel de empresa estandarizando prácticas de ingeniería y mejorando la mantenibilidad a largo plazo. Lideró iniciativas de mejora de observabilidad y monitoreo habilitando decisiones basadas en datos. Mentorizó ingenieros y colaboró de manera cross-funcional con producto, UX y SRE. Estableció estándares de documentación y flujos de planificación estructurados.

**Alcance:** Operó en distintos contextos organizacionales — desde un marketplace importante en Latinoamérica y una fintech europea hasta plataformas bancarias y SaaS más pequeñas — demostrando adaptabilidad e influencia de ingeniería consistente.

**Señales de seniority:** Toma de decisiones técnicas a nivel de empresa, influencia cross-funcional, mentoría y efecto multiplicador, custodia de la cultura de ingeniería.

## Ingeniería Asistida por IA — Adopción Pragmática de Herramientas como Práctica de Entrega

**Problema:** La entrega de software moderna se beneficia de herramientas asistidas por IA, pero las afirmaciones de profundidad requieren distinguir entre usar herramientas de IA en la entrega y ser responsable de sistemas de ML en producción.

**Práctica:** El sitio del portafolio y el servicio de reclutador se implementaron con herramientas de codificación asistida por IA (Cursor, asistentes de clase Copilot) para scaffolding, refactors, cobertura de pruebas e iteración de texto. Herramientas de IA integradas en el flujo de trabajo de ingeniería diario como multiplicador de productividad.

**Qué demuestra esto:** Adopción pragmática de IA — tratar a los asistentes de IA como parte del stack de ingeniería, no solo como una novedad. Combinado con el diseño de funcionalidades de producto nativas en IA (el asistente para reclutadores, con evaluación de requisitos en stream antes de la síntesis y puntuación con techos) usando disciplina de ingeniería: pruebas, CI, tipado seguro, observabilidad.

**Distinción:** Esta es una señal de práctica de entrega, no una afirmación de propiedad de ML en producción no relacionado. El asistente para reclutadores demuestra trabajo de producto de IA acotado y fundamentado en evidencia.

## Colaboración cross-funcional — entrega matricial y remota

**Práctica:** En entrega 100% remota, actuó como puente de ingeniería entre negocio, cliente, infraestructura, seguridad, soporte, producto e ingeniería interna — con planificación conjunta, revisiones compartidas de riesgo y puntos de control de integración para mantener funciones diversas alineadas de extremo a extremo.

**A escala:** Entregó mediante iniciativas cross-funcionales con plataforma de datos, incentivos, contenido, marketing, analítica e ingeniería de plataforma — negociando prioridades cuando los socios tenían objetivos y cadencias de release distintos.

**Contextos anteriores:** Lideró programas cross-funcionales de migración cuando cambió la propiedad de la experiencia fiscal — producto, política, UX, backend y equipos regionales con filosofías de implementación distintas. En organizaciones más pequeñas, coordinó validación, QA, operaciones de ventas y stakeholders ejecutivos — incluyendo trabajo directo con el CEO en requisitos y planificación.
