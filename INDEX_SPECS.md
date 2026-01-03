# /meta/INDEX_SPECS.md
**Repo:** All U Moves – Suite Clínica (PWA offline)  
**Idioma:** es-CL | **TZ:** America/Santiago :contentReference[oaicite:0]{index=0}  
**Base obligatoria:** `/specs/00_universal_template.spec.txt` (SPEC_VERSION 1.4) :contentReference[oaicite:1]{index=1}  
**Propósito de este archivo:** índice maestro (navegación + gobernanza + estándar de construcción) para TODA la biblioteca de módulos.

---

## 0) REGLAS NO-NEGOCIABLES

### 0.1 Gobernanza (prioridad de decisión)
Cuando haya conflicto entre requisitos, aplicar en este orden:
1) **SEGURIDAD** (red flags, stop rules, consentimiento, derivación)  
2) **CONSISTENCIA DE DATOS** (método de medición, comparabilidad, auditoría, defaults)  
3) **UX** (colapsables, smart expand, velocidad) :contentReference[oaicite:2]{index=2}  

### 0.2 Motor “resiliente” (no se rompe por datos faltantes)
- El motor **debe correr aunque falten campos**, usando defaults y marcando badges de datos insuficientes/incompleto. :contentReference[oaicite:3]{index=3}  
- **Nunca** tratar `NO_EVALUADO` como “No”. Es “unknown”. :contentReference[oaicite:4]{index=4}  
- Si un cálculo no aplica (método no comparable / valores ausentes) → mostrar `NO_APLICA`, **no** “0”. :contentReference[oaicite:5]{index=5}  

### 0.3 Reglas de medición (sin goniómetro/dinamómetro siempre)
- El sistema **NO exige grados** si el método es observacional/funcional; para reevaluación importa más la **consistencia del método** que la precisión absoluta. :contentReference[oaicite:6]{index=6}  
- Si el clínico marca “limitado por dolor”, **no** asumir rigidez estructural: ajustar irritabilidad/plan. :contentReference[oaicite:7]{index=7}  

### 0.4 Quick vs Full (mínimos y bloqueo por seguridad/calidad)
- Quick: 5–10 min; Full: 25–35 min (multi-zona) :contentReference[oaicite:8]{index=8}  
- Si faltan mínimos Quick → badge `DATOS_INSUFICIENTES` y **bloquear Top 3** (para evitar decisiones engañosas). :contentReference[oaicite:9]{index=9}  
- STOP RULES durante examen (dolor ≥8/10, neuro progresivo, síncope/disnea/dolor torácico, PF: sangrado anormal/fiebre/dolor pélvico agudo severo, etc.). :contentReference[oaicite:10]{index=10}  

### 0.5 REGLAS DE EVIDENCIA (OBLIGATORIO)
**Solo usar:**  
- CPG/Guías clínicas  
- Consensos internacionales  
- Revisiones sistemáticas / meta-análisis  
- RCTs  
- Estudios diagnósticos con **LR** o equivalente  

**Prohibido:**  
- blogs, páginas comerciales, “opinión clínica” sin respaldo, teorías desactualizadas  

**Si un test/clasificación no tiene LR o respaldo fuerte:**  
- marcar **EVIDENCIA LIMITADA**  
- ponderación BAJA (y jamás como “core decision-maker”)

**Cada módulo debe incluir lista de fuentes (mínimo 15, ideal 25+) con:** año + tipo + por qué importa.

---

## 1) Arquitectura de repositorio (carpetas canónicas)

> Objetivo: que cualquier persona pueda navegar, construir y auditar la biblioteca sin “tribal knowledge”.

### 1.1 Estructura recomendada
- `/meta/`
  - `INDEX_SPECS.md` (este archivo)
  - `ROADMAP.md` (opcional: milestones con fechas)
  - `GLOSSARY.md` (diccionario clínico-técnico)
- `/specs/`
  - `00_universal_template.spec.txt` (base) :contentReference[oaicite:11]{index=11}  
  - `/pf/` (piso pélvico)
  - `/msk/` (musculoesquelético)
  - `/sport/` (kine deportiva / RTS / prevención)
  - `/training/` (entrenamiento guiado por objetivos)
- `/evidence/` (solo evidencia de alta calidad)
  - `/anchors/` (CPG/consensos “pilares” por dominio)
  - `/modules/` (bibliografía específica por módulo, 15–25+)
  - `/diagnostic_LR/` (tablas LR, precisión diagnóstica por test/regla)
- `/data/`
  - `/modules/` (data.js declarativos por módulo: tests, KPIs, PROMs, reglas)
  - `/shared/` (catálogos globales: comorbilidades, meds, red flags globales)
- `/exports/`
  - `/templates/` (SOAP, plan paciente, entrenador, etc.) :contentReference[oaicite:12]{index=12}  
- `/qa/`
  - `checklists/`
  - `fixtures/` (casos sintéticos para testear motor)
  - `snapshots/` (golden exports)

---

## 2) Convenciones de naming (archivos, módulos, IDs)

### 2.1 Convención de nombres de módulo (MODULE_ID)
**Formato:** `{dominio}_{region}_{condicion}_{subtipo}`  
- dominio: `pf | msk | sport | training`
- region: `pelvis | spine | shoulder | elbow | wrist | hand | hip | knee | ankle | foot | global`
- condicion: `ui | pop | pelvic_pain | pfp | oa | las | achilles | rcrsp | let | acl | rts | running | strength | endurance | hyrox | ...`
- subtipo (si aplica): `sui | mui | uui | postpartum | prevention | acute | chronic | ...`

**Ejemplos**
- `pf_pelvis_ui_sui`  
- `msk_knee_pfp`  
- `msk_ankle_las_cai`  
- `sport_knee_acl_rehab`  
- `training_global_strength_foundations`

### 2.2 Convención de rutas de spec
**Formato:**  
`/specs/{dominio}/{MODULE_ID}/{MODULE_ID}.spec.txt`

**Ejemplo:**  
`/specs/msk/msk_knee_pfp/msk_knee_pfp.spec.txt`

### 2.3 Versionado de specs (semver)
- `SPEC_VERSION` del template base: 1.4 :contentReference[oaicite:13]{index=13}  
- Cada módulo define: `MODULE_SPEC_VERSION: MAJOR.MINOR.PATCH`
  - **MAJOR**: rompe compatibilidad (IDs, estructura exportable, scoring)
  - **MINOR**: agrega features sin romper (nuevos tests, KPIs, nuevas ramas)
  - **PATCH**: fixes (typos, evidencia, copy, pesos)

### 2.4 IDs internos (estables, “never rename”)
> Regla: **si un ID sale en exportables o se usa en scoring, se considera API estable.**

**Prefijos recomendados**
- `mod__{MODULE_ID}`
- `sec__{slug}` (secciones)
- `fld__{slug}` (campos)
- `tst__{slug}` (tests)
- `kpi__{slug}` (KPIs)
- `prom__{slug}` (PROMs)
- `rf__{slug}` (red flags)
- `hx__{slug}` (hipótesis)
- `dx__{slug}` (disfunciones)
- `badge__{slug}`

**Slugs**
- lowercase, snake_case
- sin tildes, sin ñ (usar `n`)
- máximo 48 chars
- semánticos (no “field1”)

### 2.5 IDs para Findings (motor de scoring)
El template ya define que el scoring mapea “Findings” → hipótesis/disfunciones con pesos por evidencia. :contentReference[oaicite:14]{index=14}  

**Formato recomendado**
- `F_{MODULE_ID}__{categoria}__{slug}`
  - categoría: `hx | dx | rf | test | prom | kpi | mech | psych`
- Ejemplo: `F_msk_knee_pfp__test__pain_squat_repro`

### 2.6 Reglas de “Measurement Method”
Usar el enum universal (observacional/funcional/goniómetro/inclinómetro/app/cinta/dinamómetro/isométrico-tiempo/reps-RPE) y **siempre** registrar confidence (baja/media/alta). :contentReference[oaicite:15]{index=15}  

---

## 3) Estándar “Definition of Done” (DoD) universal por módulo

> Cada módulo se considera “DONE” solo si cumple TODO lo siguiente.

### 3.1 DoD – mínimo técnico (estructura)
1) Existe spec en ruta canónica `/specs/{dominio}/{MODULE_ID}/{MODULE_ID}.spec.txt`  
2) Spec compila (validación de esquema): sin claves faltantes obligatorias  
3) IDs estables: `MODULE_ID`, `Findings`, `Tests`, `KPIs`, `PROMs` no colisionan con otros módulos  
4) Motor no se rompe con datos faltantes (defaults + badges) :contentReference[oaicite:16]{index=16}  
5) Exportables mínimos implementados (SOAP + plan paciente) :contentReference[oaicite:17]{index=17}  
6) Privacidad aplicada por clase de dato (PII/PHI/SENSITIVE_PF) :contentReference[oaicite:18]{index=18}  

### 3.2 DoD – mínimo clínico (seguridad y decisión)
1) Red flags globales + específicas del módulo  
2) STOP RULES del módulo (y link a STOP RULES universales) :contentReference[oaicite:19]{index=19}  
3) Quick mode: cumple mínimos obligatorios; si no, bloquea Top 3 :contentReference[oaicite:20]{index=20}  
4) Full mode: incluye ROM/Fuerza/Tests/PROM/KPIs según aplique :contentReference[oaicite:21]{index=21}  
5) Scoring implementado con:
   - pesos por evidencia (alta/media/baja) :contentReference[oaicite:22]{index=22}  
   - penalización por refutación
   - “contradiction penalty” si 2+ refutaciones fuertes :contentReference[oaicite:23]{index=23}  
6) Top 3 + empates + “Next Best Test” (1–3 acciones) :contentReference[oaicite:24]{index=24}  

### 3.3 DoD – planes y seguimiento
1) Plan **A/B/C** (bullets claros)
2) “Qué NO hacer hoy” (1–3)
3) Criterios de progreso/retroceso (checklist)
4) Reevaluación: fecha/hito + KPIs + método sugerido (consistencia) :contentReference[oaicite:25]{index=25}  

### 3.4 DoD – evidencia (OBLIGATORIO)
1) Archivo `/evidence/modules/{MODULE_ID}.md` con:
   - **15–25+** fuentes de alta calidad (año, tipo, por qué importa)
   - sección “diagnóstico” con estudios LR (si aplica)
   - sección “intervención” con CPG/SR/RCT
2) Cada test/cluster usado para decisión debe tener:
   - LR o equivalente → OK
   - si no tiene → marcar **EVIDENCIA LIMITADA** y **no** usar como pilar decisional

### 3.5 DoD – QA (calidad y regresión)
1) Checklist QA completada (ver §10)  
2) 10+ casos sintéticos (fixtures) con outputs esperados:
   - caso típico leve, moderado, severo
   - caso “red flags”
   - caso “datos incompletos”
3) Exportables pasan snapshot test (no cambian sin bump MAJOR)

---

## 4) Orden recomendado de construcción (roadmap por fases)

> Regla estratégica: **PF primero**, luego MSK core, luego deportiva, luego entrenamiento (porque PF exige privacidad + consentimiento + red flags particulares y define disciplina de seguridad desde el inicio).

### Fase 0 — Fundaciones (ya cubiertas por template)
- Intake global multi-rama (MSK/PF/Deportiva) :contentReference[oaicite:26]{index=26}  
- Gobernanza + resiliencia del motor :contentReference[oaicite:27]{index=27}  
- Measurement method + consistencia sin gonio/dinamómetro :contentReference[oaicite:28]{index=28}  
- Scoring engine: pesos, completeness factor, tie rules :contentReference[oaicite:29]{index=29}  

### Fase 1 — PF Core (alto impacto, alta sensibilidad de datos)
1) `pf_pelvis_ui_core` (triage UI: SUI/UUI/MUI, red flags, plan base)  
2) `pf_pelvis_pop_core` (prolapso: screening + conservative options)  
3) `pf_pelvis_pelvic_pain_core` (dolor pélvico: stop rules + derivación)  
4) `pf_pelvis_postpartum_return` (postparto: carga, síntomas, retorno gradual)

### Fase 2 — MSK Core (volumen de casos)
1) Spine:
   - `msk_spine_lbp_sciatica`  
   - `msk_spine_neck_pain`  
2) Lower limb:
   - `msk_knee_pfp`  
   - `msk_knee_oa`  
   - `msk_ankle_las_cai`  
   - `msk_ankle_achilles_midportion`  
   - `msk_hip_oa`  
3) Upper limb:
   - `msk_shoulder_rcrsp_rc_tendinopathy`  
   - `msk_elbow_let`  

### Fase 3 — Deportiva (RTS, prevención, performance)
1) `sport_knee_acl_rehab` (ACLR rehab + RTS continuum)  
2) `sport_knee_acl_prevention` (programas prevención)  
3) `sport_hip_groin_doha` (taxonomy Doha + cargas)  
4) `sport_running_load_management` (retorno a correr, KPIs)  

### Fase 4 — Entrenamiento (planes orientados a objetivos)
1) `training_global_strength_foundations`  
2) `training_global_endurance_foundations`  
3) `training_hyrox_30_45`  
4) `training_return_to_sport_strength_power`  

### Fase 5 — Expansión (especialidades y nichos)
- Mano/muñeca, pie, cefalea cervicogénica, tendinopatías específicas, etc.  
- Módulos “combo” (por ejemplo PF + running postpartum)

---

## 5) Catálogo maestro de módulos planificados (con entregables por dominio)

> Cada módulo abajo debe terminar con: Quick/Full, red flags, scoring, plan A/B/C, exportables, QA.

### 5.1 Piso Pélvico (PF)

#### PF-01 — `pf_pelvis_ui_core`
**Scope:** UI femenina (SUI/UUI/MUI), triage, conservative care, adherencia PFMT.  
**Dependencias:** privacidad SENSITIVE_PF + consentimiento ampliado :contentReference[oaicite:30]{index=30}  
**Quick (mínimos):**
- consentimientos completos
- red flags PF (sangrado anormal, fiebre, dolor pélvico agudo severo, etc.) :contentReference[oaicite:31]{index=31}  
- síntoma y patrón (esfuerzo/urgencia, triggers)
- 1 KPI mínimo: episodios/semana, pad use, “bothersome scale”
**Full:**
- PROM: ICIQ (según disponibilidad), diario miccional, etc.
- evaluación PFMT (si el módulo permite: método + confidence)
**Scoring:**
- hipótesis: `SUI_probable`, `UUI_probable`, `MUI_probable`
- disfunciones: control motor, fuerza/endurance PF, irritabilidad/hipersensibilidad
**Plan A/B/C:**
- A: PFMT + educación + hábitos (base)
- B: PFMT + bladder training (si urgencia)
- C: derivación uro/gine (si red flags/fracaso)
**Exportables:** SOAP + Plan paciente + Resumen a médico (sin datos sensibles por defecto) :contentReference[oaicite:32]{index=32}  
**Evidencia ancla:** NG123 (NICE), Cochrane PFMT, EAU 2024.

#### PF-02 — `pf_pelvis_pop_core`
**Scope:** prolapso (síntomas, funcionalidad, conservative options, pesarios/derivación).  
**Notas:** POP-Q es clínico médico; si se usa → documentar como “externo” y no inventar.  
**Quick:** triage síntomas (pesadez/bulto), impacto, red flags.  
**Full:** cuestionario específico si disponible, examen básico si corresponde.  
**Plan A/B/C:** educación + PFMT + pesario/derivación según severidad.  
**Evidencia ancla:** NICE NG123; guías POP (2023) y/o consultas IUGA.

#### PF-03 — `pf_pelvis_pelvic_pain_core`
**Scope:** dolor pélvico (nociceptivo/neuropático/nociplástico) + safety stop rules.  
**Motor:** usar mecanismo dolor (I1) y miedo/evitación (I2) del template :contentReference[oaicite:33]{index=33}  
**Quick:** banderas rojas + patrón + factores sueño/estrés.  
**Full:** screen neuro + sexualidad “prefiero no responder” (si se incluye).  
**EVIDENCIA LIMITADA:** clusters inespecíficos sin LR (marcar).

#### PF-04 — `pf_pelvis_postpartum_return`
**Scope:** postparto (retorno a actividad, carga, síntomas PF, progresión).  
**Quick:** screening contraindicaciones ejercicio + red flags PF.  
**Full:** plan de progresión por fases + KPIs (tolerancia a caminar, RPE, síntomas post-esfuerzo).  
**Evidencia ancla:** ACOG 2020; NG123 (para síntomas UI/POP), SR PFMT.

---

### 5.2 MSK (Musculoesquelético)

#### MSK-01 — `msk_spine_lbp_sciatica`
**Scope:** lumbalgia + ciática (triage, manejo no invasivo, educación, ejercicio, derivación).  
**Quick:** red flags espinales + dolor patrón + función + 1 medida objetiva funcional.  
**Full:** screen neuro, PROM (p.ej., ODI/RMDQ si se implementa), KPIs.  
**Evidencia ancla:** NICE NG59. :contentReference[oaicite:34]{index=34}  

#### MSK-02 — `msk_spine_neck_pain`
**Scope:** dolor cervical (movilidad/función), banderas rojas, intervención basada en CPG.  
**Evidencia ancla:** JOSPT Neck Pain CPG 2017. :contentReference[oaicite:35]{index=35}  

#### MSK-03 — `msk_knee_pfp`
**Scope:** dolor patelofemoral (diagnóstico clínico, load management, ejercicio).  
**Diagnóstico (ancla):** reproducción de dolor retropatelar/peripatelar en squat como test clínico. :contentReference[oaicite:36]{index=36}  
**Evidencia ancla:** JOSPT PFP CPG 2019. :contentReference[oaicite:37]{index=37}  

#### MSK-04 — `msk_knee_oa`
**Scope:** OA rodilla (educación + ejercicio + peso + opciones adyuvantes).  
**Evidencia ancla:** NICE NG226; OARSI 2019; AAOS 2021. :contentReference[oaicite:38]{index=38}  

#### MSK-05 — `msk_ankle_las_cai`
**Scope:** esguince lateral agudo + inestabilidad crónica (CAI).  
**Reglas diagnósticas (si trauma agudo):** Ottawa Ankle Rules (LR / reducción radiografías). :contentReference[oaicite:39]{index=39}  
**Evidencia ancla:** JOSPT LAS/CAI CPG 2021. :contentReference[oaicite:40]{index=40}  

#### MSK-06 — `msk_ankle_achilles_midportion`
**Scope:** tendinopatía aquilea (midportion), educación + carga progresiva.  
**Evidencia ancla:** JOSPT Achilles tendinopathy CPG 2024. :contentReference[oaicite:41]{index=41}  

#### MSK-07 — `msk_hip_oa`
**Scope:** OA cadera (educación + ejercicio + manejo).  
**Evidencia ancla:** JOSPT Hip OA CPG 2025 (revisión). :contentReference[oaicite:42]{index=42}  

#### MSK-08 — `msk_shoulder_rcrsp_rc_tendinopathy`
**Scope:** rotator cuff tendinopathy / RCRSP (sin full-thickness tears como core).  
**Evidencia ancla:** JOSPT Rotator Cuff Tendinopathy CPG 2025. :contentReference[oaicite:43]{index=43}  

#### MSK-09 — `msk_elbow_let`
**Scope:** lateral elbow tendinopathy (LET), cargas, educación, ejercicio.  
**Evidencia ancla:** JOSPT LET CPG 2022. :contentReference[oaicite:44]{index=44}  

---

### 5.3 Deportiva (Sport / RTS / prevención)

#### SPORT-01 — `sport_knee_acl_rehab`
**Scope:** rehab post ACLR + criterios RTS (continuum).  
**Evidencia ancla:** Aspetar ACLR rehab guideline 2023; Panther RTS consensus. :contentReference[oaicite:45]{index=45}  

#### SPORT-02 — `sport_knee_acl_prevention`
**Scope:** prevención lesiones rodilla/ACL con programas de ejercicio multicomponente.  
**Evidencia ancla:** JOSPT 2023 prevention guideline. :contentReference[oaicite:46]{index=46}  

#### SPORT-03 — `sport_hip_groin_doha`
**Scope:** clasificación dolor inguinal en atletas (Doha) + manejo por cargas.  
**Evidencia ancla:** Doha agreement BJSM 2015. :contentReference[oaicite:47]{index=47}  

#### SPORT-04 — `sport_running_load_management`
**Scope:** retorno a correr, monitorización síntomas, KPIs (tiempo, dolor 24h, RPE).  
**Evidencia:** usar SR/consensos de carga/lesión + guías específicas cuando existan (evitar “opinión de blog”).  
**Nota:** si no hay CPG directa para “return to running postpartum”, declarar brecha y usar ACOG + SR PFMT + principios de progresión con evidencia (marcando límites).

---

### 5.4 Entrenamiento (Training orientado a objetivos)
> Regla: training no puede contradecir seguridad clínica ni PF/MSK. Si hay conflicto → gobernanza.

#### TRAIN-01 — `training_global_strength_foundations`
**Scope:** fuerza general (base) con variantes por dolor/irritabilidad.  
**Métricas:** reps/RPE/tiempo/volumen, no depende de goniómetro. :contentReference[oaicite:48]{index=48}  

#### TRAIN-02 — `training_global_endurance_foundations`
**Scope:** endurance base (zonas por RPE/FC si disponible), progresión.  

#### TRAIN-03 — `training_hyrox_30_45`
**Scope:** sesiones tipo HYROX (sin burpees si se configura), con sustituciones seguras.  
**Regla:** si aparece badge de red flag MSK/PF → bloquear y derivar a módulo clínico.

#### TRAIN-04 — `training_return_to_sport_strength_power`
**Scope:** fuerza-potencia (plyos, saltos, COD) con criterios mínimos (dolor, control, simetría si aplica).  
**Evidencia:** cuando sea RTS post-ACLR, se rige por SPORT-01.

---

## 6) Plantilla de contenido que TODO módulo debe incluir (macro-esqueleto)

> Cada `{MODULE_ID}.spec.txt` debe seguir la lógica del universal template, pero con “rellenos” específicos.

### 6.1 Encabezado
- `MODULE_ID`
- `MODULE_NAME`
- `DOMAIN`
- `TARGET_USERS`
- `QUICK_TIME_TARGET` / `FULL_TIME_TARGET`
- `CLINICAL_SCOPE` + exclusiones
- `EVIDENCE_POLICY_REF` (link interno a `/meta/INDEX_SPECS.md#0.5-reglas-de-evidencia-obligatorio`)

### 6.2 Sección SEGURIDAD
- red flags específicas
- stop rules específicas (y link a universales) :contentReference[oaicite:49]{index=49}  
- derivaciones sugeridas (a quién, cuándo, qué decir)

### 6.3 Sección MEDICIÓN / TESTS / PROMs / KPIs
- medición con `MEASUREMENT_METHOD` + `MEASUREMENT_CONFIDENCE` :contentReference[oaicite:50]{index=50}  
- ROM (si no medido → RAPIDO_NLN + limiter + quality + response) :contentReference[oaicite:51]{index=51}  
- tests: con evidencia (ALTA/MEDIA/BAJA) y LR cuando exista
- KPIs 3–6 (mínimo) :contentReference[oaicite:52]{index=52}  

### 6.4 Sección SCORING
- hipótesis H1..Hn (basadas en CPG/consenso) :contentReference[oaicite:53]{index=53}  
- reglas mapping (Finding → suma/resta) :contentReference[oaicite:54]{index=54}  
- completeness factor adaptado (sin gonio/dinamómetro) :contentReference[oaicite:55]{index=55}  
- tie rule + next best test :contentReference[oaicite:56]{index=56}  

### 6.5 Sección RECOMENDACIONES AUTOMÁTICAS
- next steps evaluación
- qué NO hacer hoy
- plan A/B/C
- criterios progreso/retroceso
- reevaluación (hito + KPIs + método consistente) :contentReference[oaicite:57]{index=57}  

### 6.6 Sección EXPORTABLES
- SOAP (mínimo) :contentReference[oaicite:58]{index=58}  
- Plan paciente
- Informe a entrenador/nutri (sin SENSITIVE_PF por defecto) :contentReference[oaicite:59]{index=59}  

### 6.7 Sección EVIDENCIA (en spec y en /evidence/modules/)
- bibliografía 15–25+
- mapa: diagnóstico / intervención / pronóstico / dosificación
- “EVIDENCIA LIMITADA” explícita para tests sin LR

---

## 7) Etiquetado de evidencia (para motor, UI y auditoría)

### 7.1 Tags
- `EVIDENCIA_ALTA` → CPG robusta, SR/MA alta calidad, RCTs consistentes
- `EVIDENCIA_MEDIA` → SR heterogénea, RCTs mixtos, consenso fuerte con soporte
- `EVIDENCIA_BAJA` → evidencia indirecta/limitada, baja calidad, o LR desconocido

El template ya define pesos sugeridos:
- ALTA +3 | MEDIA +2 | BAJA o LR_DESCONOCIDO +1 :contentReference[oaicite:60]{index=60}  

### 7.2 Regla de oro para diagnóstico
- Si un test no tiene LR sólido o precisión diagnóstica aceptable → **no** puede ser “pilar” del algoritmo (solo apoyo contextual) y debe figurar como **EVIDENCIA LIMITADA**.

### 7.3 Regla de transparencia (“Explainability”)
El output debe mostrar:
- Top 3 hallazgos a favor
- Top 1–3 hallazgos en contra
- Qué falta para subir certeza :contentReference[oaicite:61]{index=61}  

---

## 8) Checklists QA (mínimo obligatorio por módulo)

### 8.1 QA Técnica
- [ ] spec valida contra esquema
- [ ] IDs únicos y estables
- [ ] Quick minima correctamente bloquean Top 3 si faltan :contentReference[oaicite:62]{index=62}  
- [ ] `NO_APLICA` usado cuando corresponde :contentReference[oaicite:63]{index=63}  
- [ ] exports pasan snapshot

### 8.2 QA Clínica (seguridad)
- [ ] red flags globales + específicas
- [ ] stop rules presentes y claras :contentReference[oaicite:64]{index=64}  
- [ ] derivación: cuándo + a quién + qué comunicar
- [ ] privacidad: SENSITIVE_PF no sale a terceros por defecto :contentReference[oaicite:65]{index=65}  

### 8.3 QA Evidencia
- [ ] 15–25+ fuentes de alta calidad
- [ ] LR o equivalentes donde aplique
- [ ] EVIDENCIA LIMITADA marcada sin ambigüedad
- [ ] dosificación de ejercicio (si aplica) referenciada a CPG/SR/RCT

---

## 9) “Gaps” permitidos (cómo declarar incertidumbre sin romper reglas)

A veces NO existe una CPG directa para un micro-nicho (ej.: subpoblación muy específica). En ese caso:
1) Declarar explícitamente: `EVIDENCIA DIRECTA INSUFICIENTE`  
2) Apoyarse en:
   - CPG de condición madre (p.ej., UI/PFMT)
   - SR/RCT de intervención (p.ej., PFMT, ejercicio)
   - Consensos internacionales relevantes  
3) Mantener “humildad algorítmica”:
   - bajar ponderación
   - exigir reevaluación más frecuente
   - mostrar “qué falta”

---

## 10) Biblioteca mínima de fuentes “ancla” (25) — año, tipo, por qué importa

> Estas fuentes son el “piso” para construir los módulos core. Cada módulo sumará su bibliografía específica.

1) **NICE NG59** (2016; actualizado en acceso 2020 en NCBI Bookshelf) — *Guía clínica*: manejo LBP/ciática, enfoque no invasivo, criterios de imágenes/derivación. :contentReference[oaicite:66]{index=66}  
2) **NICE NG226** (2022) — *Guía clínica*: OA (diagnóstico y manejo no quirúrgico), mensajes clave (ejercicio/educación). :contentReference[oaicite:67]{index=67}  
3) **OARSI Knee/Hip/Polyarticular OA** (2019) — *Guía/consenso con base meta-analítica*: perfiles de tratamiento no quirúrgico. :contentReference[oaicite:68]{index=68}  
4) **AAOS Management of Knee OA (Non-Arthroplasty)** (2021) — *CPG*: recomendaciones con revisión sistemática, útil para decisiones y “do/don’t”. :contentReference[oaicite:69]{index=69}  
5) **JOSPT Patellofemoral Pain CPG** (2019) — *CPG*: diagnóstico clínico y tratamiento basado en evidencia para PFP. :contentReference[oaicite:70]{index=70}  
6) **JOSPT Lateral Ankle Ligament Sprains CPG** (2021) — *CPG*: manejo agudo + CAI, progresión y prevención recaídas. :contentReference[oaicite:71]{index=71}  
7) **JOSPT Midportion Achilles Tendinopathy CPG** (2024) — *CPG*: diagnóstico/examen/intervención para tendinopatía aquilea. :contentReference[oaicite:72]{index=72}  
8) **JOSPT Neck Pain CPG (Revision 2017)** — *CPG*: clasificación y recomendaciones de intervención por subgrupos. :contentReference[oaicite:73]{index=73}  
9) **JOSPT Lateral Elbow Pain/LET CPG** (2022) — *CPG*: evaluación, pronóstico e intervención en LET. :contentReference[oaicite:74]{index=74}  
10) **JOSPT Knee Ligament Sprain CPG** (2017) — *CPG*: manejo de esguinces ligamentosos rodilla; estructura por ICF. :contentReference[oaicite:75]{index=75}  
11) **JOSPT Exercise-Based Knee & ACL Injury Prevention Guideline** (2023) — *CPG*: prevención primaria/ secundaria con programas multicomponente. :contentReference[oaicite:76]{index=76}  
12) **Aspetar ACL Reconstruction Rehab Guideline** (2023) — *Guía clínica (AGREE II / GRADE)*: rehabilitación post-ACLR, progresión y criterios. :contentReference[oaicite:77]{index=77}  
13) **Panther Symposium ACL RTS Consensus** (2020/2021) — *Consenso*: define RTS continuum + guía clínica de testing/decisión. :contentReference[oaicite:78]{index=78}  
14) **Doha Agreement Groin Pain in Athletes** (2015) — *Consenso*: taxonomía clínica estandarizada para dolor inguinal. :contentReference[oaicite:79]{index=79}  
15) **JOSPT Rotator Cuff Tendinopathy CPG** (2025) — *CPG*: evaluación/tratamiento/prognosis en tendinopatía RC (sin full-thickness como core). :contentReference[oaicite:80]{index=80}  
16) **JOSPT Hip OA CPG (Revision 2025)** — *CPG*: actualización para hip OA (tests/medidas/intervenciones). :contentReference[oaicite:81]{index=81}  
17) **NICE NG123 (Urinary Incontinence & POP in women)** (2019) — *Guía clínica*: UI/POP, PFMT, rutas y consideraciones. :contentReference[oaicite:82]{index=82}  
18) **Cochrane Review PFMT for urinary incontinence in women** (Dumoulin et al., 2018) — *SR/MA*: efectividad PFMT (pilar PF-UI). :contentReference[oaicite:83]{index=83}  
19) **EAU Guidelines – Non-neurogenic Female LUTS** (edición 2024) — *Guía clínica*: recomendaciones con soporte de RCTs/SR para OAB/UUI y PFMT. :contentReference[oaicite:84]{index=84}  
20) **ACOG Committee Opinion 804** (2020) — *Guía/posición clínica*: actividad física y ejercicio en embarazo y postparto (seguridad + progresión). :contentReference[oaicite:85]{index=85}  
21) **Michaleff et al.** (2012) — *SR diagnóstica*: precisión Canadian C-spine rule vs NEXUS (LR/triage trauma). :contentReference[oaicite:86]{index=86}  
22) **Barelds et al.** (2017) — *Meta-análisis*: reglas de decisión para excluir fractura tobillo (incluye LR negativos). :contentReference[oaicite:87]{index=87}  
23) **Gomes et al.** (2022) — *Estudio/validación diagnóstica*: precisión Ottawa Ankle Rule (útil para documentación LR y poblaciones). :contentReference[oaicite:88]{index=88}  
24) **International Urogynecological Consultation (IUGA)** — *Consulta/consenso internacional*: capítulos (p.ej., conservative treatment POP) para PF-POP. :contentReference[oaicite:89]{index=89}  
25) **RCPI / IOG National Clinical Guideline** (2023) — *Guía clínica*: diagnóstico y manejo POP (estructura clínica y recomendaciones). :contentReference[oaicite:90]{index=90}  

---

## 11) “Cómo usar este índice” (workflow recomendado)

1) Elegir módulo desde §5 según demanda clínica/negocio (PF → MSK core → sport → training).  
2) Crear carpeta y spec con naming §2.  
3) Rellenar primero: **SEGURIDAD**, **Quick mínimos**, **Red flags/STOP RULES**, **Evidencia ancla**.  
4) Luego: tests/KPIs/PROMs con método de medición (y confidence). :contentReference[oaicite:91]{index=91}  
5) Implementar scoring con explainability y “Next Best Test”. :contentReference[oaicite:92]{index=92}  
6) Escribir Plan A/B/C + reevaluación con KPIs y método consistente. :contentReference[oaicite:93]{index=93}  
7) Construir `/evidence/modules/{MODULE_ID}.md` (15–25+ fuentes).  
8) QA técnico + clínico + evidencia; crear fixtures; congelar snapshots exportables.  
9) Marcar estado en este índice:
   - `PLANNED` → definido, no implementado
   - `DRAFT` → spec en progreso
   - `MVP` → Quick+seguridad+exportables mínimos ok
   - `FULL` → Full mode + QA completa + evidencia robusta
   - `DEPRECATED` → reemplazado (con migración)

---

## 12) Tabla de estado (para mantener vivo el índice)

> Mantener esta tabla actualizada en PRs. (Ejemplo inicial: todo PLANNED)

| Dominio | MODULE_ID | Estado | Prioridad | Dependencias | Nota clave |
|---|---|---:|---:|---|---|
| PF | pf_pelvis_ui_core | PLANNED | P0 | privacidad + PF red flags | mayor impacto + define estándar PF |
| PF | pf_pelvis_pop_core | PLANNED | P0 | PF UI core | POP conservative + derivación |
| PF | pf_pelvis_pelvic_pain_core | PLANNED | P0 | motor dolor (I1/I2) | safety-first + triage |
| PF | pf_pelvis_postpartum_return | PLANNED | P1 | ACOG + PF UI | progresión carga y síntomas |
| MSK | msk_spine_lbp_sciatica | PLANNED | P0 | NICE NG59 | volumen alto |
| MSK | msk_spine_neck_pain | PLANNED | P1 | JOSPT neck | clasificación CPG |
| MSK | msk_knee_pfp | PLANNED | P0 | JOSPT PFP | alta demanda deportiva |
| MSK | msk_knee_oa | PLANNED | P0 | NICE/OARSI/AAOS | clínica + wellness |
| MSK | msk_ankle_las_cai | PLANNED | P1 | JOSPT LAS | retorno a correr/deporte |
| MSK | msk_ankle_achilles_midportion | PLANNED | P1 | JOSPT Achilles 2024 | runners |
| MSK | msk_hip_oa | PLANNED | P1 | JOSPT Hip OA 2025 | dolor cadera |
| MSK | msk_shoulder_rcrsp_rc_tendinopathy | PLANNED | P1 | JOSPT RC 2025 | hombro frecuente |
| MSK | msk_elbow_let | PLANNED | P2 | JOSPT LET 2022 | tenis/carga |
| SPORT | sport_knee_acl_rehab | PLANNED | P0 | Aspetar + Panther | RTS y performance |
| SPORT | sport_knee_acl_prevention | PLANNED | P1 | JOSPT prevention 2023 | programas preventivos |
| SPORT | sport_hip_groin_doha | PLANNED | P2 | Doha 2015 | dolor inguinal atletas |
| SPORT | sport_running_load_management | PLANNED | P1 | SR/CPG anclas | retorno a correr |
| TRAIN | training_global_strength_foundations | PLANNED | P2 | safety MSK/PF | base negocio wellness |
| TRAIN | training_global_endurance_foundations | PLANNED | P3 | safety MSK/PF | runners |
| TRAIN | training_hyrox_30_45 | PLANNED | P3 | safety MSK | marketing + adherencia |
| TRAIN | training_return_to_sport_strength_power | PLANNED | P2 | RTS ACL | potencia y saltos |

---

## 13) Recordatorio final (clínico-legal)
Esto es apoyo a la decisión clínica. No reemplaza juicio profesional ni evaluación médica. Red flags y consentimiento son mandatorios. :contentReference[oaicite:94]{index=94}  
