Hard score caps (apply the strictest that matches; state which in "Score caps applied"):

- If the role is primarily ML model validation or auditing and there is no **direct** evidence of ML model validation (hands-on validation of trained ML models), cap the recommended match strength at **5** (do not exceed 5).
- If the role is primarily AI governance or compliance and there is no **direct** evidence of governance/compliance work (e.g. EU AI Act implementation, audit certification workflows), cap at **6** (do not exceed 6).
- If the role is primarily data science or model training and there is no **direct** evidence of data science / training / offline evaluation ownership, cap at **5** (do not exceed 5).
- If the role is primarily people management and there is no **direct** evidence of people management scope, cap at **6** (do not exceed 6).
- If the role is primarily a specific technology or domain and only **adjacent** evidence exists, do not recommend above **6** unless other critical requirements are strongly evidenced with **direct** evidence.
- **Principal / staff full-stack role with a role-defining expert legacy stack band:** When the JD expects **senior end-to-end web/platform ownership** **and** names a **distinct expert-level production stack band** (e.g. PHP + Symfony or equivalent; **expert** daily Linux; Ansible-style automation alongside Terraform/Docker) as **must-haves**, and that **stack band** is **Not evidenced** (similar keywords or generic Linux mentions are **not** enough for **Direct**), cap recommended match strength at **7** (do **not** exceed **7**) until **Direct** production-ownership excerpts exist for that band. Strong **Direct** evidence in other stacks (TypeScript, Java, Node, etc.) **does not** lift above **7** under this cap. When broad ownership in excerpts is weaker (mostly **Adjacent**), scores may be lower per the general rubric — but do **not** collapse to **3-5** solely because this stack band is missing when **general senior full-stack/platform ownership** is strongly **Direct** (that collapse pattern is for **single-primary-language** roles; see next cap).
- **Single-primary-stack backend / language-centric role:** When **most** hands-on implementation is expected in **one** primary language/runtime (e.g. Staff Backend Engineer — Go) and production ownership in **that** stack is **Not evidenced** or only **Adjacent**, cap recommended match strength at **5** (do **not** exceed **5**).
- **Single role-defining hard gate (general):** When the JD marks one requirement as **required**, **mandatory**, **essential**, **must-have**, **non-negotiable**, or clearly **role-defining**, and that row is **Not evidenced** or only **Adjacent** — including spoken language fluency, a **named primary production language / framework / platform** needed for day-one delivery, or a specialist domain gate — cap at **6** (do **not** exceed **6**) unless the JD clearly signals flexibility (optional, "nice to have", "or equivalent", "willing to consider", etc.). Strong adjacent senior engineering in other stacks **does not** lift above this cap.
- **Two or more role-defining hard gates:** When **two or more** such gates are **Not evidenced** or only **Adjacent** (count each distinct gate separately — e.g. required German fluency **and** production Golang are **two** gates), cap at **5** (do **not** exceed **5**). Transferable senior backend/platform evidence **does not** lift above this cap.
- **Spoken-language hard gate + another missing gate:** When spoken language fluency is mandatory with **no** JD flexibility and is **Not evidenced** or only **Adjacent**, **and** at least one other role-defining hard gate (e.g. primary production stack) is also **Not evidenced** or only **Adjacent**, cap at **4** (do **not** exceed **4**).
- **Non-language practical constraints are soft:** Treat work authorization / visa / employment eligibility, location / timezone / hybrid / onsite / travel, and employment type as negotiable practical constraints. Keep them as separate requirement rows when stated, but do **not** classify them as hard gates, do **not** apply hard score caps solely because they are missing, and frame gaps as soft early-validation points.
- **JD tenure / years thresholds:** When the JD states explicit minimum years (e.g. 15+ years hands-on, 12+ years in a language) and excerpts **do not** support them, call this out in **Reason** and evidence-confidence narrative as a portfolio-evidence gap; do **not** treat the threshold as met by inference or by overlapping seniority in other stacks.

Gap severity (use when reasoning about the recommended score; name the dominant severities in **Reason** when helpful):

- **Major**: missing or only **adjacent** evidence for a **core must-have** that defines role viability (e.g. production Go ownership for a Go-centric Staff Backend role; **required spoken language fluency** when the JD marks it mandatory; hands-on ML model validation / SHAP / LIME / fairness work for an AI model validator role when that is the job’s core; **production ownership in a JD-named expert legacy stack band** when that band is central to the role — e.g. PHP/Symfony for a role that markets that band as expert-level). Do **not** downgrade these to moderate validation points when they are true role-defining hard gates.
- **Moderate**: important validation slice not directly evidenced while a **broader** capability may still be **direct** (e.g. IdP/IAM architecture for a broad full-stack platform role; explicit build-vs-buy platform strategy; a **named** workflow engine when orchestration patterns are **direct**; **web security fundamentals as owned scope** (auth, authorization, data protection, secure coding) when the JD emphasizes them but excerpts only show security-aware engineering without clear ownership; negotiable practical constraints such as authorization, location/timezone/hybrid/onsite/travel, or employment type).
- **Minor**: narrow wording, unstated example, or **nice-to-have** detail not explicit in excerpts while the **parent capability** is **direct** (e.g. “dashboards” not named when frontend or internal tooling is **direct**).

Evidence-gap wording (important for downstream recruiter-facing copy):

- This evaluator is strict, but it evaluates **retrieved portfolio evidence**, not the candidate's real-world ability.
- Phrase missing items as evidence gaps: prefer **"not found in the retrieved portfolio evidence"**, **"not shown in excerpts"**, **"not explicitly evidenced"**, or **"needs early validation"**.
- Avoid verdict-like wording in **Reason**, **Evidence confidence reason**, and table notes: **"unproven"**, **"failed to demonstrate"**, **"lacks"**, **"deficient"**, **"not credible"**, **"not qualified"**, or **"wrong role"**.
- Keep **Not evidenced** classifications when justified, but explain them as missing excerpt support, not as proof the candidate cannot do the work.

Positive-match calibration (after hard caps — avoid over-penalizing strong fits):

- If **most core must-have** rows are **Direct** and remaining gaps are only **Moderate** or **Minor** (no **Major** gap on a core must-have), recommended match strength should normally be **at least 8/10**. **Minor** gaps, unstated examples, or **nice-to-have** rows must **not** on their own pull the score to **7** or below.
- **Exception — stack band vs general role shape:** If a **role-defining expert stack band** row is **Not evidenced** / only **Adjacent** while unrelated stacks show strong **Direct** platform ownership, **do not** apply the "raise to at least **8/10**" rule above. Keep scores consistent with the **Principal / staff full-stack + legacy stack band** cap (**≤7**) or other firing caps. **Nice-to-have** requirements must **not** dominate the numeric score or read as decisive blockers when core must-haves are strongly **Direct**.

Scoring rubric for the recommended integer **1-10** (after caps):

- **10**: Near-perfect **direct** evidence across core **and** important secondary must-haves; at most trivial gaps.
- **9**: Very strong **direct** evidence on core; remaining gaps are **minor** or trivial on secondary / nice-to-haves.
- **8**: Strong fit; **direct** on most core must-haves; **moderate** validation points and/or a few **minor** gaps remain (still no **major** core gap).
- **7**: (a) Several important must-haves are **adjacent** only, or one **meaningful** core must-have is **not evidenced** / only **adjacent**, but the role remains plausible; or (b) **dual-lens** principal/staff **full-stack** roles: **general senior full-stack/platform ownership** is strongly **direct**, but a **role-defining expert legacy stack band** from the JD is **not evidenced** — often **7** when ownership breadth is strong (use **6** if broader ownership is thinner). **Not** for "minor-only" gap sets on strong platform roles when **no** role-defining stack band is missing.
- **5-6**: Mostly **adjacent** fit, or several core requirements **not evidenced**.
- **3-4**: Weak fit; most core responsibilities not evidenced despite overlapping keywords.
- **1-2**: Little meaningful overlap.

Semantic similarity is not qualification correctness: do not treat related concepts as direct evidence. Examples (non-exhaustive):

- Building AI-enabled applications ≠ validating ML models.
- Using LLMs or RAG ≠ model auditing or fairness testing.
- Regulated fintech engineering ≠ AI governance auditing or EU AI Act compliance work.
- Software testing ≠ bias/fairness/robustness evaluation of ML models.
- Observability/reliability ≠ model explainability (SHAP/LIME).
- Integrating AI APIs ≠ training, certifying, or auditing models.

Stricter **Direct** vs **Adjacent** (when in doubt, choose Adjacent):

- For human skills like communication, stakeholder alignment, leadership, mentoring, business alignment, and end-to-end ownership, **Direct** evidence does not require a certification-style sentence. Practical senior-engineering examples can be **Direct** when excerpts explicitly describe the behavior in context.
- Written/oral English communication can be **Direct** when excerpts explicitly mention English-language tickets, specifications, RFC-style write-ups, architecture notes, stakeholder reporting, workshops, brainstorming sessions, technical walkthroughs, mentoring, or remote cross-team alignment.
- End-to-end ownership can be **Direct** when excerpts explicitly mention owning discovery, requirements, architecture, implementation, rollout, production validation, operations, observability, stakeholder alignment, or feedback loops across one initiative.
- Business alignment / product judgment can be **Direct** when excerpts explicitly mention business objectives, KPIs, operational metrics, support outcomes, revenue-critical flows, experimentation trade-offs, product strategy, stakeholder reporting, or translating technical trade-offs for non-engineering teams.
- Technical leadership can be **Direct** when excerpts explicitly mention leading initiatives, standardizing practices, mentoring, onboarding, architecture guidance, reusable scaffolds, shared libraries, CI/CD standards, decision logs, cross-team workshops, or platform/team enablement.
- Hands-on execution of X is **not** automatic **Direct** evidence of **leading** X organizationally unless excerpts explicitly show leadership/scope of authority, such as led initiatives, owned architecture/delivery, stakeholder alignment, standards, mentoring, rollout ownership, or team enablement.
- Personal AI-assisted coding (e.g. Cursor/Copilot) is **Adjacent** for company-wide AI enablement, AI strategy, or org-wide platform mandates unless excerpts explicitly show that scope.
- Writing design notes or specs is **Direct** for design documentation but **Adjacent** for formal RFC governance, review boards, or mandated design processes unless excerpts explicitly say so.
- Standardizing observability or documentation is **Adjacent** for owning shared internal frameworks/libraries/tooling unless excerpts explicitly describe building/releasing those artifacts for broad reuse.
- Architecture or backend depth in one stack (e.g. TypeScript/Java) is **Adjacent** for another stack (e.g. Go) unless Go (or the target stack) is explicitly evidenced in production ownership terms.
- State machines / generic workflow orchestration patterns are **Adjacent** to **named** workflow engines (Temporal, Zeebe, Camunda, etc.) unless those tools are explicitly named in excerpts with production ownership.
- Security- or compliance-aware engineering is **Adjacent** to **IAM / policy-driven system ownership** unless IAM/policy ownership is explicitly evidenced.
- Security- or compliance-aware engineering is **Adjacent** to **owned web security fundamentals** (auth, authorization, data protection, secure coding as explicit owned scope) unless excerpts clearly show Daniel owning those decisions end to end.
- AI-assisted or AI-native delivery on real engineering workflows (design, code, tests, CI, retrieval/staged LLM patterns) can be **Direct** for AI-native SDLC; treat as **Adjacent** for organization-wide AI strategy unless excerpts show org-wide or mandated team rollout.
- Platform reliability is **Direct** when observability, SLOs, CI/CD, runbooks, incident response, or release safety are explicitly evidenced in excerpts.
