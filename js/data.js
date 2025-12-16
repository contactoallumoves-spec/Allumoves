// All u moves — js/data.js
// Módulos clínicos (JSON) consumidos por el motor de la app.
// Terminología: evita terminología antigua y privilegia lenguaje contemporáneo
// tipo "dolor relacionado al manguito rotador (RCRSP)" / "tendinopatía del manguito".

(() => {
  "use strict";

  // -----------------------------
  // Helpers (solo para reglas)
  // -----------------------------
  const countTrue = (...vals) => vals.reduce((acc, v) => acc + (v ? 1 : 0), 0);

  const safeNumber = (v) => {
    const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const getAge = (patientData) => {
    const a = safeNumber(patientData?.["patient-age"]);
    return a === null ? null : a;
  };

  const bilateralVal = (maybeBilateral, side) => {
    if (maybeBilateral && typeof maybeBilateral === "object") return safeNumber(maybeBilateral[side]);
    return null;
  };

  // -----------------------------
  // DASH — 30 ítems (paráfrasis no literal) + 2 módulos opcionales (trabajo, deporte/arte)
  // Escala en app: 0–5 (0 = no respondido / N/A). Puedes instruir al paciente: 1–5.
  // -----------------------------
  const DASH_CORE_LABELS = [
    "Abrir un frasco/tarro que está muy apretado",
    "Escribir (mano/brazo) por un rato",
    "Girar una llave en una cerradura",
    "Preparar comida (picar, mezclar, cocinar)",
    "Empujar una puerta pesada",
    "Poner un objeto en un estante por sobre la cabeza",
    "Hacer tareas domésticas pesadas (ej: limpiar fuerte)",
    "Hacer tareas de jardinería o similares",
    "Arreglar la cama (sábanas/frazadas)",
    "Cargar una bolsa o mochila con compras",
    "Cargar un objeto pesado (ej: caja)",
    "Cambiar una ampolleta/objeto por sobre la cabeza",
    "Lavarse o secarse el pelo",
    "Lavarse la espalda (alcanzar zona dorsal)",
    "Ponerse un polerón/polerita por la cabeza",
    "Cortar comida con cuchillo",
    "Actividades recreativas que exigen algo de fuerza del brazo (ej: deporte suave)",
    "Actividades recreativas con impacto o fuerza alta del brazo (ej: deporte intenso)",
    "Interacción social/ocio afectado por el brazo/hombro",
    "Limitación en el trabajo habitual por el brazo/hombro",
    "Dolor en el brazo/hombro",
    "Dolor al hacer actividades con el brazo/hombro",
    "Hormigueo/adormecimiento en brazo/mano",
    "Debilidad percibida en brazo/hombro",
    "Rigidez en hombro/brazo",
    "Dificultad para dormir por dolor del brazo/hombro",
    "Sentirse menos capaz por el problema (confianza funcional)",
    "Impacto del problema en el ánimo/estrés",
    "Impacto del problema en la imagen corporal o autoestima",
    "Impacto global en actividades diarias (resumen)",
  ];

  const DASH_WORK_LABELS = [
    "Trabajo: usar herramientas o tareas repetitivas con el brazo",
    "Trabajo: levantar/cargar en el trabajo",
    "Trabajo: movimientos por sobre la cabeza en el trabajo",
    "Trabajo: tolerancia general de la jornada por el brazo/hombro",
  ];

  const DASH_SPORT_LABELS = [
    "Deporte/arte: gesto específico que exige el hombro (principal)",
    "Deporte/arte: gesto repetitivo con velocidad/alcance",
    "Deporte/arte: fuerza/potencia del miembro superior requerida",
    "Deporte/arte: tolerancia del volumen semanal (sin reagudización)",
  ];

  const DASH_CORE = DASH_CORE_LABELS.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `dash_q${n}`,
      label: `DASH — ${label} (0–5; 0=N/A)`,
      type: "numeric",
      min: 0,
      max: 5,
      normal: 0,
      default: 0,
      unit: "",
      limited: 4,
    };
  });

  const DASH_WORK = DASH_WORK_LABELS.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `dash_work${n}`,
      label: `DASH (Trabajo) — ${label} (0–5; 0=N/A)`,
      type: "numeric",
      min: 0,
      max: 5,
      normal: 0,
      default: 0,
      unit: "",
      limited: 4,
    };
  });

  const DASH_SPORT = DASH_SPORT_LABELS.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `dash_sport${n}`,
      label: `DASH (Deporte/Arte) — ${label} (0–5; 0=N/A)`,
      type: "numeric",
      min: 0,
      max: 5,
      normal: 0,
      default: 0,
      unit: "",
      limited: 4,
    };
  });

  // -----------------------------
  // SPADI — 5 dolor + 8 discapacidad (paráfrasis no literal). Escala 0–10.
  // -----------------------------
  const SPADI_PAIN_LABELS = [
    "Dolor al máximo (peor dolor del hombro)",
    "Dolor al estar acostado sobre el hombro afectado",
    "Dolor al alcanzar un objeto alto (por sobre la cabeza)",
    "Dolor al llevar la mano hacia la nuca/cuello (peinarse)",
    "Dolor al empujar o sostener peso con el brazo",
  ];

  const SPADI_DIS_LABELS = [
    "Dificultad para lavarse el pelo / arreglarse",
    "Dificultad para lavarse la espalda / alcanzar la zona dorsal",
    "Dificultad para ponerse o sacarse una prenda por la cabeza",
    "Dificultad para ponerse o sacarse chaqueta / manga",
    "Dificultad para levantar/alcanzar un objeto alto",
    "Dificultad para cargar una bolsa o peso moderado",
    "Dificultad para usar el brazo en tareas domésticas",
    "Dificultad para actividades recreativas/deporte por el hombro",
  ];

  const SPADI_PAIN = SPADI_PAIN_LABELS.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `spadi_p${n}`,
      label: `SPADI (Dolor) — ${label} (0–10)`,
      type: "numeric",
      min: 0,
      max: 10,
      normal: 0,
      default: 0,
      unit: "",
      limited: 6,
    };
  });

  const SPADI_DIS = SPADI_DIS_LABELS.map((label, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `spadi_d${n}`,
      label: `SPADI (Discapacidad) — ${label} (0–10)`,
      type: "numeric",
      min: 0,
      max: 10,
      normal: 0,
      default: 0,
      unit: "",
      limited: 6,
    };
  });

  // -----------------------------
  // MÓDULOS
  // -----------------------------
  const clinicalModules = {
    hombro: {
      key: "hombro",
      title: "Hombro & Cintura Escapular",
      icon: "fa-person-rays",
      sections: [
        {
          title: "Identificación (Segmento)",
          icon: "fa-id-card",
          style: "grid2",
          fields: [
            { id: "lado_sintomatico", label: "Lado sintomático (I / D / Bilateral)", type: "text", placeholder: "Ej: Derecha" },
            { id: "dominancia", label: "Dominancia (diestra/zurda)", type: "text", placeholder: "Ej: Diestra" },
          ],
        },
        {
          title: "Motivo, metas y contexto (laboral / deportivo)",
          icon: "fa-clipboard-question",
          style: "card",
          fields: [
            { id: "motivo_consulta", label: "Motivo de consulta (qué, desde cuándo, dónde, cómo)", type: "textarea" },
            { id: "metas_paciente", label: "Metas del paciente (SMART si es posible)", type: "textarea" },
            { id: "contexto_trabajo_deporte", label: "Contexto de carga (gestos, volumen, cambios recientes)", type: "textarea" },
            { id: "tratamientos_previos", label: "Tratamientos previos y respuesta", type: "textarea" },
          ],
        },
        {
          title: "Síntomas clave & Función",
          icon: "fa-person-walking",
          style: "card",
          fields: [
            { id: "dolor_actual", label: "Dolor actual (NRS)", type: "numeric", min: 0, max: 10, normal: 0, default: 0, unit: "/10", limited: 6 },
            { id: "dolor_peor_24h", label: "Dolor peor últimas 24h (NRS)", type: "numeric", min: 0, max: 10, normal: 0, default: 0, unit: "/10", limited: 6 },
            { id: "dolor_nocturno", label: "Dolor nocturno (interrumpe sueño)", type: "boolean", default: false },
            { id: "dolor_no_mecanico", label: "Dolor no mecánico (no cambia con postura/carga)", type: "boolean", default: false },
            { id: "dolor_sobre_cabeza", label: "Dolor al elevar/sobre-cabeza", type: "boolean", default: false },
            { id: "dolor_al_lado", label: "Dolor al acostarse sobre el hombro", type: "boolean", default: false },
            { id: "rigidez_matinal", label: "Rigidez matinal significativa", type: "boolean", default: false },
            { id: "sensacion_inestabilidad", label: "Sensación de inestabilidad / aprehensión", type: "boolean", default: false },

            { id: "psfs_act1", label: "PSFS Actividad #1 (nombre)", type: "text", placeholder: "Ej: peinarse / overhead" },
            { id: "psfs_act1_score", label: "PSFS #1 (0–10 capacidad)", type: "numeric", min: 0, max: 10, normal: 10, default: 0, unit: "/10", limited: 6 },
            { id: "psfs_act2", label: "PSFS Actividad #2 (nombre)", type: "text" },
            { id: "psfs_act2_score", label: "PSFS #2 (0–10 capacidad)", type: "numeric", min: 0, max: 10, normal: 10, default: 0, unit: "/10", limited: 6 },
            { id: "psfs_act3", label: "PSFS Actividad #3 (nombre)", type: "text" },
            { id: "psfs_act3_score", label: "PSFS #3 (0–10 capacidad)", type: "numeric", min: 0, max: 10, normal: 10, default: 0, unit: "/10", limited: 6 },

            { id: "resumen_funcional", label: "Resumen funcional (evitación, ajustes, limitaciones principales)", type: "textarea" },
          ],
        },
        {
          title: "Seguridad: Banderas Rojas (Descartes)",
          icon: "fa-triangle-exclamation",
          style: "grid2",
          fields: [
            { id: "trauma_deformidad_fractura", label: "Trauma con deformidad / sospecha fractura-luxación", type: "boolean" },
            { id: "fiebre_escalofrios", label: "Fiebre/escalofríos o malestar sistémico", type: "boolean" },
            { id: "perdida_peso", label: "Pérdida de peso inexplicada", type: "boolean" },
            { id: "antecedente_cancer", label: "Antecedente de cáncer", type: "boolean" },
            { id: "inmunosupresion", label: "Inmunosupresión / corticoides crónicos", type: "boolean" },
            { id: "dolor_toracico_disnea", label: "Dolor torácico / disnea / irradiación atípica", type: "boolean" },
            { id: "deficit_neuro_progresivo", label: "Déficit neurológico progresivo (fuerza/sensibilidad)", type: "boolean" },
            { id: "sintomas_vasculares", label: "Síntomas vasculares (frialdad, palidez, edema, pulso)", type: "boolean" },
            { id: "notas_red_flags", label: "Notas / decisión clínica / plan de derivación", type: "textarea" },
          ],
        },
        {
          title: "Tipo de dolor, irritabilidad & factores psicosociales",
          icon: "fa-brain",
          style: "card",
          fields: [
            { id: "dolor_nociceptivo", label: "Mecanismo nociceptivo predominante (proporcional a carga/gesto)", type: "boolean" },
            { id: "dolor_neuropatico", label: "Mecanismo neuropático (ardor/eléctrico, alodinia, déficits)", type: "boolean" },
            { id: "dolor_nociplastico", label: "Mecanismo nociplástico posible (hipersensibilidad, sueño/estrés)", type: "boolean" },
            { id: "irritabilidad", label: "Irritabilidad (Alta / Media / Baja)", type: "text", placeholder: "Ej: Media" },
            { id: "miedo_movimiento", label: "Miedo al movimiento / evitación", type: "boolean" },
            { id: "catastrofismo", label: "Catastrofismo / preocupación elevada", type: "boolean" },
            { id: "estres_sueno", label: "Estrés alto / sueño insuficiente", type: "boolean" },
            { id: "notas_psicosocial", label: "Notas (creencias, expectativas, barreras, adherencia)", type: "textarea" },
          ],
        },
        {
          title: "Tamizaje Cervical / Radicular (si corresponde)",
          icon: "fa-person-circle-question",
          style: "grid2",
          fields: [
            { id: "spurling", label: "Spurling (+)", type: "boolean" },
            { id: "distraction_alivia", label: "Distracción cervical alivia (+)", type: "boolean" },
            { id: "ultt_mediano", label: "ULTT Mediano (+)", type: "boolean" },
            { id: "rotacion_cervical_lt60", label: "Rotación cervical ipsilateral < 60° (+)", type: "boolean" },
            { id: "neuro_notas", label: "Notas neuro (dermatomas, miotomas, reflejos, parestesias)", type: "textarea" },
          ],
        },
        {
          title: "Observación & Control Escápulo-Torácico",
          icon: "fa-arrows-to-circle",
          style: "grid2",
          fields: [
            { id: "disquinesia_escapular", label: "Disquinesia escapular (observación)", type: "boolean" },
            { id: "winging", label: "Winging / borde medial prominente", type: "boolean" },
            { id: "scap_assist", label: "Scapular Assistance Test (+) (↓ dolor / ↑ ROM)", type: "boolean" },
            { id: "scap_retract", label: "Scapular Retraction Test (+) (↓ dolor / ↑ fuerza)", type: "boolean" },
            { id: "toracica_limitada", label: "Movilidad torácica limitada (ext/rot)", type: "boolean" },
            { id: "notas_escapula", label: "Notas (patrón, timing, compensaciones, re-test)", type: "textarea" },
          ],
        },
        {
          title: "Rango de Movimiento (ROM Activo)",
          icon: "fa-ruler-combined",
          style: "card",
          fields: [
            { id: "flexion_activa", label: "Flexión Anterior (Activo)", type: "numeric", unit: "°", min: 0, max: 180, normal: 170, limited: 120, bilateral: true, default: { L: 0, R: 0 } },
            { id: "abduccion_activa", label: "Abducción (Activo)", type: "numeric", unit: "°", min: 0, max: 180, normal: 170, limited: 120, bilateral: true, default: { L: 0, R: 0 } },
            { id: "er0_activa", label: "Rotación Externa 0° ABD (Activo)", type: "numeric", unit: "°", min: 0, max: 90, normal: 60, limited: 35, bilateral: true, default: { L: 0, R: 0 } },
            { id: "ir0_activa", label: "Rotación Interna 0° ABD (Activo)", type: "numeric", unit: "°", min: 0, max: 90, normal: 70, limited: 45, bilateral: true, default: { L: 0, R: 0 } },
            { id: "ir_funcional", label: "IR funcional (mano detrás de espalda) — nivel vertebral", type: "text", placeholder: "Ej: T7 / L1..." },
          ],
        },
        {
          title: "Rango de Movimiento (ROM Pasivo)",
          icon: "fa-hand",
          style: "card",
          fields: [
            { id: "flexion_pasiva", label: "Flexión Anterior (Pasivo)", type: "numeric", unit: "°", min: 0, max: 180, normal: 175, limited: 125, bilateral: true, default: { L: 0, R: 0 } },
            { id: "abduccion_pasiva", label: "Abducción (Pasivo)", type: "numeric", unit: "°", min: 0, max: 180, normal: 175, limited: 125, bilateral: true, default: { L: 0, R: 0 } },
            { id: "er0_pasiva", label: "Rotación Externa 0° ABD (Pasivo)", type: "numeric", unit: "°", min: 0, max: 90, normal: 70, limited: 40, bilateral: true, default: { L: 0, R: 0 } },
            { id: "er90_pasiva", label: "Rotación Externa 90° ABD (Pasivo)", type: "numeric", unit: "°", min: 0, max: 120, normal: 90, limited: 60, bilateral: true, default: { L: 0, R: 0 } },
            { id: "ir90_pasiva", label: "Rotación Interna 90° ABD (Pasivo)", type: "numeric", unit: "°", min: 0, max: 90, normal: 60, limited: 35, bilateral: true, default: { L: 0, R: 0 } },
            { id: "accesorios_restringidos", label: "Restricción marcada GH (inferior/posterior/anterior)", type: "boolean", default: false },
          ],
        },
        {
          title: "Fuerza (Clínica / MMT)",
          icon: "fa-dumbbell",
          style: "card",
          fields: [
            { id: "abd_mmt", label: "Abducción / Scaption (MMT 0–5)", type: "numeric", min: 0, max: 5, normal: 5, limited: 3, bilateral: true, default: { L: 0, R: 0 } },
            { id: "er_mmt", label: "Rotación Externa (MMT 0–5)", type: "numeric", min: 0, max: 5, normal: 5, limited: 3, bilateral: true, default: { L: 0, R: 0 } },
            { id: "ir_mmt", label: "Rotación Interna (MMT 0–5)", type: "numeric", min: 0, max: 5, normal: 5, limited: 3, bilateral: true, default: { L: 0, R: 0 } },
            { id: "dolor_isometria_baja", label: "Dolor significativo con isometría (carga baja)", type: "boolean", default: false },
            { id: "notas_fuerza", label: "Notas (dolor vs debilidad real, patrón, fatiga)", type: "textarea" },
          ],
        },
        {
          title: "Pruebas Especiales (Clusters / Triage)",
          icon: "fa-stethoscope",
          style: "grid2",
          fields: [
            // RCRSP (Cluster Park)
            { id: "hawkins", label: "Hawkins-Kennedy (+)", type: "boolean" },
            { id: "arco_doloroso", label: "Arco doloroso (+)", type: "boolean" },
            { id: "infra_dolor_debil", label: "Test Infraspinoso (dolor y/o debilidad) (+)", type: "boolean" },

            // Desgarro completo
            { id: "drop_arm", label: "Drop Arm (+)", type: "boolean" },
            { id: "er_lag_sign", label: "External Rotation Lag Sign (+)", type: "boolean" },

            // Inestabilidad anterior
            { id: "aprehension", label: "Apprehension (+)", type: "boolean" },
            { id: "relocation_alivia", label: "Relocation alivia (+)", type: "boolean" },
            { id: "surprise", label: "Surprise (+)", type: "boolean" },

            // AC joint (combinación)
            { id: "cross_body", label: "Cross-body adduction (+)", type: "boolean" },
            { id: "paxinos", label: "Paxinos (+)", type: "boolean" },
            { id: "obriens_local_ac", label: "O'Brien con dolor local AC (+)", type: "boolean" },

            // Subescapular
            { id: "belly_press", label: "Belly-Press (+)", type: "boolean" },
            { id: "lift_off", label: "Lift-Off (+)", type: "boolean" },
            { id: "bear_hug", label: "Bear Hug (+)", type: "boolean" },

            // SLAP/bíceps (cautela)
            { id: "biceps_load_ii", label: "Biceps Load II (+)", type: "boolean" },
          ],
        },
        {
          title: "Clasificación (principal / secundaria)",
          icon: "fa-tags",
          style: "card",
          fields: [
            { id: "cls_rcrsp", label: "Dolor relacionado al manguito rotador (RCRSP) / tendinopatía (± parcial)", type: "boolean" },
            { id: "cls_rc_full_thickness", label: "Déficit de potencia: sospecha desgarro completo manguito", type: "boolean" },
            { id: "cls_capsulitis", label: "Déficit de movilidad: capsulitis adhesiva (hombro rígido)", type: "boolean" },
            { id: "cls_instability", label: "Alteración de coordinación: inestabilidad GH", type: "boolean" },
            { id: "cls_ac_joint", label: "Articulación acromioclavicular sintomática", type: "boolean" },
            { id: "cls_cervical", label: "Componente cervical/radicular relevante", type: "boolean" },
            { id: "cls_other", label: "Otro / diferencial dominante", type: "text", placeholder: "Ej: suprascapular neuropatía, etc." },
          ],
        },
        {
          title: "Razonamiento Clínico & Síntesis",
          icon: "fa-lightbulb",
          style: "card",
          fields: [
            { id: "hipotesis_principal", label: "Hipótesis principal (diagnóstico funcional / mecanismo)", type: "textarea" },
            { id: "hipotesis_secundarias", label: "Hipótesis secundarias / diferenciales", type: "textarea" },
            { id: "hallazgos_clave", label: "Hallazgos clave que cambian la probabilidad", type: "textarea" },
            { id: "plan_inicial", label: "Plan inicial (educación, carga, ejercicio, derivación si aplica)", type: "textarea" },
          ],
        },

        // PROMs: SPADI
        {
          title: "Outcome Measure: SPADI — Dolor (5)",
          icon: "fa-clipboard-list",
          style: "grid2",
          fields: [
            ...SPADI_PAIN,
            { id: "spadi_total_pct", label: "SPADI Total (%) (si lo calculas, regístralo aquí)", type: "numeric", min: 0, max: 100, normal: 0, default: 0, unit: "%", limited: 30 },
            { id: "spadi_notas", label: "SPADI — Notas (cómo se aplicó / contexto)", type: "textarea" },
          ],
        },
        {
          title: "Outcome Measure: SPADI — Discapacidad (8)",
          icon: "fa-clipboard-list",
          style: "grid2",
          fields: [...SPADI_DIS],
        },

        // PROMs: DASH
        {
          title: "Outcome Measure: DASH — Ítems 01–10",
          icon: "fa-clipboard-check",
          style: "grid2",
          fields: DASH_CORE.slice(0, 10),
        },
        {
          title: "Outcome Measure: DASH — Ítems 11–20",
          icon: "fa-clipboard-check",
          style: "grid2",
          fields: DASH_CORE.slice(10, 20),
        },
        {
          title: "Outcome Measure: DASH — Ítems 21–30",
          icon: "fa-clipboard-check",
          style: "grid2",
          fields: [
            ...DASH_CORE.slice(20, 30),
            { id: "dash_total", label: "DASH Total (0–100) (si lo calculas, regístralo aquí)", type: "numeric", min: 0, max: 100, normal: 0, default: 0, unit: "", limited: 20 },
            { id: "dash_notas", label: "DASH — Notas (administración, N/A, observaciones)", type: "textarea" },
          ],
        },
        {
          title: "Outcome Measure: DASH — Módulos Opcionales",
          icon: "fa-puzzle-piece",
          style: "grid2",
          fields: [
            ...DASH_WORK,
            ...DASH_SPORT,
            { id: "dash_modulos_notas", label: "Notas (si aplicó Trabajo / Deporte-Artes y por qué)", type: "textarea" },
          ],
        },
      ],

      // -----------------------------
      // LÓGICA EN TIEMPO REAL (alerts)
      // -----------------------------
      logicRules: [
        // Red flags
        {
          id: "rf-fractura-luxacion",
          severity: "danger",
          title: "ALERTA: Bandera Roja — trauma con sospecha de fractura/luxación",
          description: "Trauma con deformidad o sospecha de fractura/luxación → evaluación médica/imagen y manejo urgente según contexto.",
          when: (s) => Boolean(s?.tests?.trauma_deformidad_fractura),
        },
        {
          id: "rf-infeccion",
          severity: "danger",
          title: "ALERTA: Bandera Roja — posible infección",
          description: "Fiebre/malestar sistémico + dolor no mecánico (y/o inmunosupresión) → descartar infección. Considera derivación urgente.",
          when: (s) =>
            Boolean(s?.tests?.fiebre_escalofrios) &&
            Boolean(s?.tests?.dolor_no_mecanico) &&
            (Boolean(s?.tests?.inmunosupresion) || Boolean(s?.tests?.dolor_nocturno)),
        },
        {
          id: "rf-neoplasia",
          severity: "danger",
          title: "ALERTA: Bandera Roja — posible neoplasia",
          description: "Antecedente de cáncer + pérdida de peso y/o dolor nocturno no mecánico → descartar neoplasia. Derivación prioritaria.",
          when: (s) =>
            Boolean(s?.tests?.antecedente_cancer) &&
            (Boolean(s?.tests?.perdida_peso) || Boolean(s?.tests?.dolor_nocturno)) &&
            Boolean(s?.tests?.dolor_no_mecanico),
        },
        {
          id: "rf-cardiopulmonar",
          severity: "danger",
          title: "ALERTA: dolor referido cardiopulmonar (descartar)",
          description: "Dolor torácico/disnea/irradiación atípica → descarte médico inmediato según contexto y factores de riesgo.",
          when: (s) => Boolean(s?.tests?.dolor_toracico_disnea),
        },
        {
          id: "rf-neuro-progresivo",
          severity: "danger",
          title: "ALERTA: déficit neurológico progresivo",
          description: "Déficit neurológico progresivo → evaluación médica prioritaria. Considera origen cervical/neurológico.",
          when: (s) => Boolean(s?.tests?.deficit_neuro_progresivo),
        },
        {
          id: "rf-vascular",
          severity: "danger",
          title: "ALERTA: signos vasculares (descartar compromiso vascular/TOS)",
          description: "Síntomas vasculares (frialdad, palidez, edema, pulso alterado) → descartar compromiso vascular. Derivar según severidad.",
          when: (s) => Boolean(s?.tests?.sintomas_vasculares),
        },

        // Clusters (alto valor) — renombrados a RCRSP (lenguaje contemporáneo)
        {
          id: "cluster-park-rcrsp-2de3",
          severity: "warning",
          title: "Cluster (+): RCRSP probable",
          description:
            "≥2/3 positivos (Hawkins-Kennedy, Arco doloroso, Infraspinoso dolor/debilidad) aumenta fuertemente la probabilidad de dolor relacionado al manguito rotador, según contexto.",
          when: (s) => {
            const hk = Boolean(s?.tests?.hawkins);
            const pa = Boolean(s?.tests?.arco_doloroso);
            const infra = Boolean(s?.tests?.infra_dolor_debil);
            return countTrue(hk, pa, infra) >= 2;
          },
        },
        {
          id: "cluster-park-rcrsp-3de3",
          severity: "warning",
          title: "Cluster (++): RCRSP muy probable",
          description:
            "3/3 positivos sugieren probabilidad muy alta de RCRSP (integrar irritabilidad, carga y diferenciales; el test no “dice” el tejido exacto).",
          when: (s) => Boolean(s?.tests?.hawkins) && Boolean(s?.tests?.arco_doloroso) && Boolean(s?.tests?.infra_dolor_debil),
        },
        {
          id: "cluster-rct-fullthickness",
          severity: "warning",
          title: "Sospecha: desgarro completo del manguito rotador",
          description:
            "Arco doloroso (+) + Drop Arm (+) y/o ER Lag (+) + infraspinoso (+) aumenta sospecha de desgarro completo. Considera imagen según historia/función.",
          when: (s, p) => {
            const pa = Boolean(s?.tests?.arco_doloroso);
            const da = Boolean(s?.tests?.drop_arm);
            const erLag = Boolean(s?.tests?.er_lag_sign);
            const infra = Boolean(s?.tests?.infra_dolor_debil);

            const age = getAge(p);
            const riskAge = age !== null && age >= 60;
            const riskTrauma = Boolean(s?.tests?.trauma_deformidad_fractura);

            return pa && (da || erLag) && infra && (riskAge || riskTrauma || Boolean(s?.tests?.dolor_nocturno));
          },
        },
        {
          id: "pattern-adhesive-capsulitis",
          severity: "warning",
          title: "Patrón compatible con capsulitis adhesiva (hombro rígido)",
          description:
            "Dolor nocturno/rigidez + limitación marcada del ROM pasivo (especialmente ER) y/o accesorios restringidos sugiere capsulitis (confirmar patrón e historia).",
          when: (s) => {
            const night = Boolean(s?.tests?.dolor_nocturno) || Boolean(s?.tests?.dolor_al_lado);
            const stiff = Boolean(s?.tests?.rigidez_matinal) || Boolean(s?.tests?.accesorios_restringidos);

            const er = s?.numeric?.er0_pasiva;
            const erL = bilateralVal(er, "L");
            const erR = bilateralVal(er, "R");
            const limitedER = (erL !== null && erL > 0 && erL <= 35) || (erR !== null && erR > 0 && erR <= 35);

            return night && stiff && limitedER;
          },
        },
        {
          id: "instability-anterior",
          severity: "warning",
          title: "Sospecha: inestabilidad anterior glenohumeral",
          description:
            "Apprehension (+) + alivio con Relocation (+) (± Surprise) aumenta la probabilidad de inestabilidad anterior. Integrar historia y deporte.",
          when: (s) => Boolean(s?.tests?.aprehension) && Boolean(s?.tests?.relocation_alivia),
        },
        {
          id: "ac-joint-likely",
          severity: "warning",
          title: "Sospecha: articulación acromioclavicular sintomática",
          description:
            "≥2 pruebas AC positivas (Cross-body, Paxinos, O'Brien con dolor local AC) sugieren origen AC si el dolor está bien localizado sobre la articulación.",
          when: (s) => countTrue(Boolean(s?.tests?.cross_body), Boolean(s?.tests?.paxinos), Boolean(s?.tests?.obriens_local_ac)) >= 2,
        },
        {
          id: "subscap-suspect",
          severity: "warning",
          title: "Sospecha: compromiso subescapular (triage)",
          description:
            "≥2 positivos (Belly-press / Lift-off / Bear-hug) aumentan sospecha de disfunción del subescapular (diferenciar dolor vs debilidad).",
          when: (s) => countTrue(Boolean(s?.tests?.belly_press), Boolean(s?.tests?.lift_off), Boolean(s?.tests?.bear_hug)) >= 2,
        },

        // Cervical/radicular (Wainner)
        {
          id: "cervical-radicular-3de4",
          severity: "warning",
          title: "Componente cervical/radicular probable (cluster 3/4)",
          description:
            "≥3/4 positivos (Spurling, Distracción, ULTT Mediano, Rotación <60°) sugiere componente radicular y ajusta el plan (neuro/tolerancia).",
          when: (s) =>
            countTrue(Boolean(s?.tests?.spurling), Boolean(s?.tests?.distraction_alivia), Boolean(s?.tests?.ultt_mediano), Boolean(s?.tests?.rotacion_cervical_lt60)) >= 3,
        },
        {
          id: "cervical-radicular-4de4",
          severity: "danger",
          title: "Componente cervical/radicular muy probable (cluster 4/4)",
          description:
            "4/4 positivos → alta probabilidad. Prioriza evaluación cervical/neuro y coordina manejo según severidad/función.",
          when: (s) =>
            Boolean(s?.tests?.spurling) &&
            Boolean(s?.tests?.distraction_alivia) &&
            Boolean(s?.tests?.ultt_mediano) &&
            Boolean(s?.tests?.rotacion_cervical_lt60),
        },

        // Apoyos (re-test)
        {
          id: "scapular-contribution",
          severity: "info",
          title: "Contribución escápulo-torácica posible",
          description:
            "Scapular Assistance/Retraction (+) sugiere que modificar la escápula cambia síntomas. Útil para re-test funcional y plan de control motor + carga.",
          when: (s) => Boolean(s?.tests?.scap_assist) || Boolean(s?.tests?.scap_retract),
        },
      ],
    },
  };

  // Exponer al navegador (sin ES Modules)
  window.clinicalModules = clinicalModules;
})();
