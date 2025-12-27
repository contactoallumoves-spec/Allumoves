/* All u moves — js/data.js
   Clinical modules data (JSON-like) for app.js engine
   - Shoulder module (Hombro & Cintura Escapular)
   - Evidence-informed structure: red flags, ROM, strength, special tests, clusters, PROMs (SPADI/DASH)
   - Avoids outdated terminology; uses contemporary classification language (e.g., RCRSP)
*/
(() => {
  "use strict";

  // ---------------------------------------
  // Helpers (data-only, no DOM here)
  // ---------------------------------------
  const spadiPainItems = [
    ["spadi_p01", "Dolor en el peor momento"],
    ["spadi_p02", "Dolor al estar acostado/a del lado afectado"],
    ["spadi_p03", "Dolor al alcanzar un objeto en un estante alto"],
    ["spadi_p04", "Dolor al tocar la nuca / parte posterior de la cabeza"],
    ["spadi_p05", "Dolor al empujar con la mano/brazo afectado (ej. puerta, levantarse de silla)"],
  ];

  const spadiDisItems = [
    ["spadi_d01", "Lavarse el cabello"],
    ["spadi_d02", "Lavarse la espalda (entre omóplatos / región lumbar)"],
    ["spadi_d03", "Ponerse una camiseta/jersey"],
    ["spadi_d04", "Ponerse una camisa/chaqueta (mangas)"],
    ["spadi_d05", "Ponerse pantalones"],
    ["spadi_d06", "Colocar un objeto en un estante alto"],
    ["spadi_d07", "Llevar un objeto pesado (p. ej., bolsa de compras)"],
    ["spadi_d08", "Sacar algo del bolsillo trasero / cinturón"],
  ];

  // DASH (30 ítems core). Escala típica 1–5. Usamos 0 como "No aplica".
  // 1 = Sin dificultad, 2 = Leve, 3 = Moderada, 4 = Severa, 5 = Incapaz
  const dashCoreItems = [
    ["dash_q01", "Abrir un frasco/tarro apretado o nuevo"],
    ["dash_q02", "Escribir"],
    ["dash_q03", "Girar una llave"],
    ["dash_q04", "Preparar una comida (cortar, revolver, etc.)"],
    ["dash_q05", "Empujar una puerta pesada"],
    ["dash_q06", "Poner un objeto sobre la cabeza"],
    ["dash_q07", "Hacer tareas domésticas pesadas (limpiar, lavar pisos, etc.)"],
    ["dash_q08", "Jardinería o trabajos de patio"],
    ["dash_q09", "Tender la cama (arreglarla)"],
    ["dash_q10", "Cargar una bolsa o maletín"],
    ["dash_q11", "Cargar un objeto pesado (≈ 4–5 kg)"],
    ["dash_q12", "Cambiar una ampolleta / bombilla"],
    ["dash_q13", "Lavarse o secarse el cabello"],
    ["dash_q14", "Lavarse la espalda"],
    ["dash_q15", "Ponerse una camiseta/jersey"],
    ["dash_q16", "Ponerse una camisa/chaqueta (mangas)"],
    ["dash_q17", "Usar un cuchillo para cortar comida"],
    ["dash_q18", "Actividades recreativas que requieren poco esfuerzo (leer, tejer, etc.)"],
    ["dash_q19", "Actividades recreativas que requieren algo de fuerza o impacto (golf, martillo, etc.)"],
    ["dash_q20", "Actividades recreativas que requieren movimientos libres del brazo (lanzar, nadar, etc.)"],
    ["dash_q21", "Actividades recreativas en las que el brazo se somete a fuerza o impacto (tenis, básquet, etc.)"],
    ["dash_q22", "Durante las últimas semanas: ¿tu problema ha interferido con tus actividades sociales?"],
    ["dash_q23", "Durante las últimas semanas: ¿tu problema ha limitado tu trabajo u otras actividades diarias?"],
    ["dash_q24", "Dolor en el brazo/hombro/mano"],
    ["dash_q25", "Hormigueo (parestesias) en brazo/hombro/mano"],
    ["dash_q26", "Debilidad en brazo/hombro/mano"],
    ["dash_q27", "Rigidez en brazo/hombro/mano"],
    ["dash_q28", "Dificultad para dormir debido al dolor"],
    ["dash_q29", "Dificultad para mantener el brazo en una posición por tiempo prolongado"],
    ["dash_q30", "Confianza para usar el brazo en tareas habituales"],
  ];

  // DASH módulos opcionales (Trabajo / Deporte-Artes)
  const dashWorkItems = [
    ["dash_w01", "Módulo Trabajo: usar herramientas / equipos específicos del trabajo"],
    ["dash_w02", "Módulo Trabajo: realizar tareas repetitivas con el brazo"],
    ["dash_w03", "Módulo Trabajo: levantar/cargar en el trabajo"],
    ["dash_w04", "Módulo Trabajo: trabajar con el brazo por encima del hombro"],
  ];

  const dashSportItems = [
    ["dash_s01", "Módulo Deporte/Artes: actividad que exige velocidad o precisión del brazo"],
    ["dash_s02", "Módulo Deporte/Artes: actividad que exige impacto/carga en brazo"],
    ["dash_s03", "Módulo Deporte/Artes: actividad con movimiento repetido overhead"],
    ["dash_s04", "Módulo Deporte/Artes: rendimiento global en tu deporte/arte"],
  ];

  const spadiQuick = {
    primaryLabel: "0 (sin dolor/dificultad)",
    primaryValue: 0,
    secondaryLabel: "10 (peor dificultad/dolor)",
    secondaryValue: 10,
    clearLabel: "Vaciar",
  };

  const dashQuick = {
    primaryLabel: "1 (sin dificultad)",
    primaryValue: 1,
    secondaryLabel: "5 (incapaz)",
    secondaryValue: 5,
    clearLabel: "Vaciar",
  };

  function mkPROMField(id, label, min, max, unit, normal, limited, help) {
    return {
      id,
      label,
      type: "numeric",
      unit,
      min,
      max,
      normal,
      limited,
      bilateral: false,
      help,
    };
  }

  function withQuickConfig(field, quick) {
    return { ...field, quick };
  }

  function mkDashField(id, label) {
    return mkPROMField(
      id,
      label,
      0,
      5,
      "",
      1,
      3,
      "0=No aplica · 1=Sin dificultad · 5=Incapaz"
    );
  }

  const mmtOptions = [
    { value: "", label: "— Seleccionar —" },
    { value: "5", label: "5/5 (fuerte, sin dolor)" },
    { value: "4plus", label: "4+/5" },
    { value: "4", label: "4/5" },
    { value: "4minus", label: "4-/5" },
    { value: "3plus", label: "3+/5" },
    { value: "3", label: "≤3/5" },
    { value: "dolor", label: "Dolor inhibidor" },
  ];

  // ---------------------------------------
  // Intake remoto global (siempre visible)
  // ---------------------------------------
  const intakeRemoteConfig = {
    title: "Intake Remoto Global",
    comorbidities: {
      title: "Comorbilidades y contexto sistémico",
      icon: "fa-heart-pulse",
      style: "grid2",
      fields: [
        { id: "com_hta", label: "Hipertensión arterial", type: "boolean", help: "Control y riesgos cardiovasculares." },
        { id: "com_disli", label: "Dislipidemia / síndrome metabólico", type: "boolean", help: "Carga cardiometabólica y riesgo vascular." },
        { id: "com_obesidad", label: "Obesidad / IMC > 30", type: "boolean", help: "Impacto en carga articular y fatiga." },
        { id: "com_diabetes", label: "Diabetes", type: "boolean", help: "Riesgo de neuropatía y cicatrización lenta." },
        { id: "com_tiroides", label: "Alteración tiroidea", type: "boolean", help: "Fatiga, cambios de masa corporal, metabolismo." },
        { id: "com_cardio", label: "Cardio/vascular", type: "boolean", help: "HTA, coronariopatía, insuficiencia o edema." },
        { id: "com_respiratorio", label: "EPOC / Asma / restricción respiratoria", type: "boolean", help: "Fatiga, tolerancia al esfuerzo, monitorizar disnea." },
        { id: "com_renal", label: "Renal / hepática crónica", type: "boolean", help: "Metabolismo de fármacos y retención de líquidos." },
        { id: "com_salud_mental", label: "Salud mental (ansiedad/depresión)", type: "boolean", help: "Screening psicosocial y adherencia al tratamiento." },
        { id: "com_eii", label: "Enfermedad inflamatoria / reumática", type: "boolean", help: "Brotes articulares, fatiga, medicación inmuno." },
        { id: "com_osteoporosis", label: "Osteoporosis / baja DMO", type: "boolean", help: "Fragilidad ósea; precaución con impactos y manipulación." },
        { id: "com_autoinmune", label: "Autoinmune / inmunosupresión", type: "boolean", help: "Brotes, fatiga, riesgo infeccioso." },
        { id: "com_cancer", label: "Cáncer previo (o en control)", type: "boolean", help: "Red flags: pérdida de peso, fiebre, dolor no mecánico." },
        { id: "com_embarazo", label: "Embarazo / Postparto", type: "boolean", help: "Posiciones seguras, fatiga, diástasis y periné." },
      ],
    },
    medications: {
      title: "Medicación activa",
      icon: "fa-pills",
      style: "grid2",
      fields: [
        { id: "med_anticoagulantes", label: "Anticoagulantes / antiagregantes", type: "boolean", help: "Mayor riesgo de hematomas/sangrado." },
        { id: "med_corticoides", label: "Corticoides sistémicos", type: "boolean", help: "Fragilidad tisular; inmunosupresión." },
        { id: "med_inmunosupresores", label: "Inmunosupresores / biológicos", type: "boolean", help: "Riesgo infeccioso y retraso de cicatrización." },
        { id: "med_aine_cronico", label: "AINE/analgésicos diarios", type: "boolean", help: "Ocultan irritabilidad real y riesgo GI/renal." },
        { id: "med_opioides", label: "Opioides / tramadol", type: "boolean", help: "Sedación, dependencia; ajustar objetivos y seguridad." },
        { id: "med_relajantes", label: "Relajantes musculares / benzodiacepinas", type: "boolean", help: "Sedación, caídas, interferencia con control motor." },
        { id: "med_psicofarmacos", label: "Antidepresivos / antipsicóticos", type: "boolean", help: "Efectos sobre sueño, peso y activación." },
        { id: "med_hormonales", label: "Anticonceptivos / TRH", type: "boolean", help: "Cambios ligamentarios, riesgo trombótico individual." },
      ],
    },
    branches: [
      {
        key: "msk",
        title: "MSK",
        icon: "fa-bone",
        sections: [
          {
            title: "Síntesis clínica y 24h",
            style: "grid2",
            fields: [
              { id: "msk_region", label: "Zona principal", type: "text", placeholder: "Columna, hombro, rodilla, etc." },
              {
                id: "msk_irritabilidad",
                label: "Irritabilidad percibida",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "alta", label: "Alta (empeora rápido, tarda en bajar)" },
                  { value: "media", label: "Media" },
                  { value: "baja", label: "Baja" },
                ],
              },
              { id: "msk_patron_24h", label: "Patrón 24h (dolor, rigidez)", type: "textarea", placeholder: "Sueño, mañana, post-carga" },
              {
                id: "msk_sueno",
                label: "Sueño",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "ok", label: "Sin alteración" },
                  { value: "fragmentado", label: "Fragmentado / se despierta por dolor" },
                  { value: "insomnio", label: "Muy interrumpido / <5h" },
                ],
              },
              { id: "msk_objetivo", label: "Objetivo del paciente", type: "textarea", placeholder: "Dormir mejor, volver al trabajo/deporte, etc." },
            ],
          },
          {
            title: "Alarma y contexto médico",
            style: "grid2",
            fields: [
              { id: "msk_trauma", label: "Trauma o cirugía reciente", type: "boolean" },
              {
                id: "msk_redflags",
                label: "Síntomas de alarma autorreportados",
                type: "select",
                options: [
                  { value: "", label: "Ninguno reportado" },
                  { value: "sistemicos", label: "Fiebre, sudoraciones nocturnas, pérdida de peso" },
                  { value: "neuro", label: "Déficit neurológico progresivo / cauda" },
                  { value: "toracico", label: "Dolor torácico / disnea" },
                  { value: "infeccioso", label: "Herida/infección activa" },
                  { value: "vascular", label: "Calor/eritema + edema súbito" },
                ],
                help: "Reporte remoto; confirmar en sesión presencial/teleconsulta.",
              },
              { id: "msk_dolor_no_mecanico", label: "Dolor no mecánico (no cambia con postura/carga)", type: "boolean" },
              { id: "msk_bandera_roja_detalle", label: "Detalle bandera roja", type: "textarea", placeholder: "Aclarar síntomas sistémicos/neuro" },
            ],
          },
          {
            title: "Carga, trabajo y actividad física",
            style: "grid2",
            fields: [
              {
                id: "msk_carga_actual",
                label: "Carga reciente",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "estable", label: "Estable" },
                  { value: "aumento_brusco", label: "Aumento brusco" },
                  { value: "retorno", label: "Retorno tras pausa / detraining" },
                  { value: "descarga", label: "Reducción forzada (dolor/enfermedad)" },
                ],
              },
              {
                id: "msk_trabajo_demanda",
                label: "Demanda laboral",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "sedentario", label: "Sedentario / oficina" },
                  { value: "mixto", label: "Mixto (de pie + carga moderada)" },
                  { value: "manual_pesado", label: "Manual pesado / turnos" },
                ],
              },
              {
                id: "msk_actividad_fisica",
                label: "Actividad física base",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "baja", label: "<150 min/sem o sedentarismo" },
                  { value: "salud", label: "150-300 min/sem" },
                  { value: "alta", label: "Entrenamiento alto / fuerza + cardio" },
                ],
              },
              { id: "msk_deporte", label: "Deporte/gesto principal", type: "text", placeholder: "Overhead, running, etc." },
              { id: "msk_trabajo_detalle", label: "Detalle trabajo/carga", type: "textarea", placeholder: "Turnos, horas de pie, cargas específicas." },
            ],
          },
          {
            title: "Contexto psicosocial (banderas amarillas)",
            style: "grid2",
            fields: [
              {
                id: "msk_yellow_flags",
                label: "Factor psicosocial predominante",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "ninguna", label: "Sin banderas reportadas" },
                  { value: "miedo_mov", label: "Miedo al movimiento / lesión" },
                  { value: "catastrofismo", label: "Catastrofismo / preocupación alta" },
                  { value: "estres_laboral", label: "Estrés laboral / carga cognitiva" },
                  { value: "baja_red", label: "Baja red de apoyo" },
                ],
              },
              { id: "msk_psico_notas", label: "Contexto psicosocial (notas)", type: "textarea", placeholder: "Creencias, barreras, adherencia." },
            ],
          },
        ],
      },
      {
        key: "piso",
        title: "Piso pélvico",
        icon: "fa-toilet-paper",
        sections: [
          {
            title: "Síntomas sensibles (remoto)",
            style: "grid2",
            fields: [
              {
                id: "piso_incontinencia",
                label: "Pérdidas urinarias",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              {
                id: "piso_dolor_sexual",
                label: "Dolor con actividad sexual",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              {
                id: "piso_prolapso",
                label: "Sensación de peso/prolapso",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              {
                id: "piso_parto",
                label: "Embarazo/parto reciente",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "embarazo", label: "Embarazo actual" },
                  { value: "postparto", label: "Postparto < 1 año" },
                  { value: "no", label: "No aplica" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              {
                id: "piso_habitos_intestinales",
                label: "Esfuerzo/estreñimiento",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "si", label: "Sí" },
                  { value: "no", label: "No" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              { id: "piso_objetivo", label: "Objetivo principal", type: "textarea", placeholder: "Control de pérdidas, retorno deportivo, etc." },
            ],
          },
          {
            title: "Hábitos, 24h y sueño",
            style: "grid2",
            fields: [
              { id: "piso_patron_24h", label: "Patrón 24h (micción, presión, dolor)", type: "textarea", placeholder: "Peor noche, al toser, ejercicio" },
              {
                id: "piso_sueno",
                label: "Sueño",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "ok", label: "Sin interrupciones" },
                  { value: "micciones_nocturnas", label: "Interrumpido por micciones" },
                  { value: "insomnio", label: "Muy interrumpido / <5h" },
                ],
              },
              {
                id: "piso_redflags",
                label: "Alertas pélvicas autorreportadas",
                type: "select",
                options: [
                  { value: "", label: "Ninguna" },
                  { value: "sangrado", label: "Sangrado / secreción anómala" },
                  { value: "infeccion", label: "Fiebre + dolor pélvico" },
                  { value: "dolor_agudo", label: "Dolor agudo no mecánico" },
                ],
              },
              {
                id: "piso_estreñimiento",
                label: "Patrón intestinal",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "regular", label: "Regular" },
                  { value: "constipacion", label: "Estreñimiento / esfuerzo" },
                  { value: "diarrea", label: "Diarrea / alternante" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
            ],
          },
          {
            title: "Contexto psicosocial básico",
            style: "grid2",
            fields: [
              {
                id: "piso_yellow_flags",
                label: "Factor psicosocial",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "ninguna", label: "Sin banderas" },
                  { value: "ansiedad", label: "Ansiedad / preocupación" },
                  { value: "historia_trauma", label: "Historia de trauma / dolor persistente" },
                  { value: "baja_red", label: "Baja red de apoyo" },
                  { value: "nsnc", label: "Prefiero no responder" },
                ],
              },
              { id: "piso_contexto_psico", label: "Notas psicosociales", type: "textarea", placeholder: "Expectativas, barreras, acompañamiento." },
            ],
          },
        ],
      },
      {
        key: "sport",
        title: "Deportiva / Kine deportiva",
        icon: "fa-person-running",
        sections: [
          {
            title: "Perfil deportivo",
            style: "grid2",
            fields: [
              { id: "sport_disciplina", label: "Deporte principal", type: "text", placeholder: "Running, fútbol, crossfit, etc." },
              {
                id: "sport_frecuencia",
                label: "Volumen actual",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "baja", label: "2-3 sesiones/sem" },
                  { value: "moderada", label: "4-5 sesiones/sem" },
                  { value: "alta", label: "6+ sesiones/sem o doble jornada" },
                ],
              },
              { id: "sport_competencia", label: "En temporada competitiva", type: "boolean" },
              {
                id: "sport_carga_reciente",
                label: "Cambio de carga aguda",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "estable", label: "Estable" },
                  { value: "aumento_brusco", label: "Aumento brusco" },
                  { value: "retorno", label: "Retorno tras pausa" },
                ],
              },
              { id: "sport_lesion_previa", label: "Lesión en el último año", type: "boolean" },
              { id: "sport_objetivo", label: "Objetivo / evento próximo", type: "textarea", placeholder: "PR, torneo, reinsertarse al juego, etc." },
            ],
          },
          {
            title: "Recuperación, trabajo y contexto",
            style: "grid2",
            fields: [
              {
                id: "sport_sueno",
                label: "Sueño y recuperación",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "restful", label: "Descanso adecuado" },
                  { value: "fragmentado", label: "Sueño fragmentado" },
                  { value: "insuficiente", label: "<6h o fatiga marcada" },
                ],
              },
              {
                id: "sport_recuperacion_24h",
                label: "Respuesta 24h post-entrenamiento",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "tolerable", label: "Molestias tolerables que se resuelven <24h" },
                  { value: "prolongada", label: "Dolor/fatiga >24-48h" },
                  { value: "regresion", label: "Recae al subir carga" },
                ],
              },
              {
                id: "sport_trabajo_demanda",
                label: "Demanda laboral",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "sedentario", label: "Sedentario" },
                  { value: "mixto", label: "Mixto" },
                  { value: "manual_pesado", label: "Manual pesado / turnos" },
                ],
              },
              {
                id: "sport_psico",
                label: "Factor psicosocial",
                type: "select",
                options: [
                  { value: "", label: "— Seleccionar —" },
                  { value: "ninguno", label: "Sin preocupación relevante" },
                  { value: "ansiedad", label: "Ansiedad por rendimiento/lesión" },
                  { value: "estres", label: "Estrés laboral/académico alto" },
                ],
              },
            ],
          },
        ],
      },
    ],
    logic: {
      alerts: [
        {
          id: "alert-cancer-previo",
          severity: "warning",
          title: "Antecedente de cáncer + dolor",
          description: "Confirmar controles médicos, red flags sistémicos y necesidad de derivación/imagen.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.comorbidities.com_cancer === true,
        },
        {
          id: "alert-anticoagulantes",
          severity: "warning",
          title: "Anticoagulantes / antiagregantes",
          description: "Evita técnicas invasivas o de alto impacto; vigila hematomas y sangrado.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.medications.med_anticoagulantes === true,
        },
        {
          id: "alert-opioides",
          severity: "warning",
          title: "Opioides o sedantes en uso",
          description: "Monitorea somnolencia, riesgo de caídas y dependencia; coordina con prescriptor.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.medications.med_opioides === true || ctx.medications.med_relajantes === true,
        },
        {
          id: "alert-trauma-anticoag",
          severity: "danger",
          title: "Trauma reciente + anticoagulantes",
          description: "Riesgo de sangrado oculto. Considera derivación médica si hay dolor desproporcionado o aumento de volumen.",
          appliesTo: ["msk"],
          when: (ctx) => ctx.medications.med_anticoagulantes === true && ctx.values.msk_trauma === true,
        },
        {
          id: "alert-osteoporosis",
          severity: "warning",
          title: "Fragilidad ósea",
          description: "Evita impactos y manipulación de alta velocidad; evalúa riesgo de fractura por estrés.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_osteoporosis === true,
        },
        {
          id: "alert-redflags-remote",
          severity: "danger",
          title: "Síntomas de alarma referidos",
          description: "Fiebre, pérdida de peso, déficit neurológico, dolor torácico o infección requieren descarte médico/imagen antes de progresar carga.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ["sistemicos", "neuro", "toracico", "infeccioso", "vascular"].includes(ctx.values.msk_redflags),
        },
        {
          id: "alert-pelvic-redflags",
          severity: "danger",
          title: "Alarma pélvica",
          description: "Sangrado, fiebre o dolor pélvico no mecánico requieren derivación médica antes de intervenciones.",
          appliesTo: ["piso"],
          when: (ctx) => ["sangrado", "infeccion", "dolor_agudo"].includes(ctx.values.piso_redflags),
        },
        {
          id: "alert-pelvic-sensitive",
          severity: "info",
          title: "Preferencia de confidencialidad",
          description: "Algunas respuestas sensibles se marcaron como “Prefiero no responder”. Garantiza privacidad y agenda screening gradual.",
          appliesTo: ["piso"],
          when: (ctx) => ["piso_incontinencia", "piso_dolor_sexual", "piso_prolapso", "piso_parto", "piso_habitos_intestinales", "piso_estreñimiento", "piso_yellow_flags"].some((id) => ctx.values[id] === "nsnc"),
        },
        {
          id: "alert-irritabilidad-sueno",
          severity: "warning",
          title: "Alta irritabilidad + sueño alterado",
          description: "Dosifica carga con márgenes amplios y prioriza higiene de sueño para evitar reagudizaciones.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.values.msk_irritabilidad === "alta" && ["fragmentado", "insomnio"].includes(ctx.values.msk_sueno),
        },
        {
          id: "alert-yellow-flags",
          severity: "warning",
          title: "Banderas amarillas presentes",
          description: "Incorpora educación, metas graduales y validación de preocupaciones para mejorar adherencia.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => [ctx.values.msk_yellow_flags, ctx.values.piso_yellow_flags, ctx.values.sport_psico].some((v) => v && !["", "ninguna", "ninguno"].includes(v)),
        },
      ],
      evaluation: [
        {
          id: "eval-diabetes",
          text: "Diabetes: revisar glicemias recientes, integridad de piel y screening de neuropatía periférica.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.comorbidities.com_diabetes === true,
        },
        {
          id: "eval-tiroides",
          text: "Alteración tiroidea: documentar fatiga, frío/calor, cambios de peso y posibles efectos sobre recuperación.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.comorbidities.com_tiroides === true,
        },
        {
          id: "eval-respiratorio",
          text: "Respiratorio: monitoriza disnea, saturación percibida y necesidad de pausas si hay EPOC/asma.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_respiratorio === true,
        },
        {
          id: "eval-cardio",
          text: "Cardio/vascular: vitales de base, tolerancia al esfuerzo y banderas de disnea/dolor torácico antes de pruebas exigentes.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_cardio === true,
        },
        {
          id: "eval-osteoporosis",
          text: "Osteoporosis/baja DMO: evaluar antecedentes de fractura, densitometría y dolor a la percusión.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_osteoporosis === true,
        },
        {
          id: "eval-salud-mental",
          text: "Salud mental: considerar escalas breves (PHQ/GAD) y ajustar progresión según motivación y energía.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.comorbidities.com_salud_mental === true || ctx.values.msk_yellow_flags === "catastrofismo",
        },
        {
          id: "eval-anticoag",
          text: "Anticoagulantes: indagar INR/última dosis, hematomas y pruebas que impliquen compresión sostenida.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.medications.med_anticoagulantes === true,
        },
        {
          id: "eval-inmuno",
          text: "Autoinmune/inmunosupresión: monitorea signos infecciosos, fatiga y brotes articulares.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.comorbidities.com_autoinmune === true || ctx.medications.med_inmunosupresores === true,
        },
        {
          id: "eval-opioides",
          text: "Uso de opioides/sedantes: revisar dosis, horario y riesgo de caídas antes de ejercicios exigentes.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.medications.med_opioides === true || ctx.medications.med_relajantes === true,
        },
        {
          id: "eval-emb",
          text: "Embarazo/postparto: verifica trimestre, diástasis, tolerancia a decúbitos y seguridad fetal.",
          appliesTo: ["piso", "msk"],
          when: (ctx) => ctx.comorbidities.com_embarazo === true || ["embarazo", "postparto"].includes(ctx.values.piso_parto),
        },
        {
          id: "eval-pelvic-loss",
          text: "Piso pélvico: diario miccional y tamizaje de prolapsos si hay pérdidas o sensación de peso.",
          appliesTo: ["piso"],
          when: (ctx) => ctx.values.piso_incontinencia === "si" || ctx.values.piso_prolapso === "si",
        },
        {
          id: "eval-pelvic-dolor",
          text: "Dolor sexual: usar escalas de dolor, evaluar factores psicosociales y derivar a ginecología si hay alarma.",
          appliesTo: ["piso"],
          when: (ctx) => ctx.values.piso_dolor_sexual === "si",
        },
        {
          id: "eval-sport-carga",
          text: "Deporte: documentar carga aguda/crónica y variaciones (ACWR) para planificar progresión segura.",
          appliesTo: ["sport"],
          when: (ctx) => ["aumento_brusco", "retorno"].includes(ctx.values.sport_carga_reciente),
        },
        {
          id: "eval-carga-msk",
          text: "Carga MSK: documenta volumen (semanas previas), tareas repetitivas y cambios agudos antes de dosificar.",
          appliesTo: ["msk"],
          when: (ctx) => ["aumento_brusco", "retorno", "descarga"].includes(ctx.values.msk_carga_actual),
        },
        {
          id: "eval-msk-no-mecanico",
          text: "Dolor no mecánico: prioriza descarte sistémico y prueba de comportamiento al movimiento antes de asumir origen local.",
          appliesTo: ["msk"],
          when: (ctx) => ctx.values.msk_dolor_no_mecanico === true,
        },
        {
          id: "eval-irritabilidad",
          text: "Irritabilidad alta: planifica tests cortos y progresión lenta, vigilando respuesta en las 24h.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.values.msk_irritabilidad === "alta",
        },
        {
          id: "eval-sueno",
          text: "Sueño alterado: preguntar higiene de sueño y diferenciar despertares por dolor vs hábitos.",
          appliesTo: ["msk", "sport", "piso"],
          when: (ctx) => ["fragmentado", "insomnio", "micciones_nocturnas", "insuficiente"].includes(ctx.values.msk_sueno) || ["micciones_nocturnas", "insomnio"].includes(ctx.values.piso_sueno) || ["fragmentado", "insuficiente"].includes(ctx.values.sport_sueno),
        },
        {
          id: "eval-trabajo",
          text: "Demanda laboral alta: documenta posturas, horas de pie/carga y oportunidades de micro-pausas.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ["manual_pesado", "mixto"].includes(ctx.values.msk_trabajo_demanda) || ctx.values.sport_trabajo_demanda === "manual_pesado",
        },
        {
          id: "eval-actividad",
          text: "Actividad física baja: educa sobre beneficios de actividad moderada y prográmala de forma segura.",
          appliesTo: ["msk", "piso"],
          when: (ctx) => ctx.values.msk_actividad_fisica === "baja",
        },
        {
          id: "eval-psico",
          text: "Banderas amarillas: valida preocupaciones, establece objetivos alcanzables y usa escalas de creencias/dolor.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => [ctx.values.msk_yellow_flags, ctx.values.piso_yellow_flags, ctx.values.sport_psico].some((v) => v && !["", "ninguna", "ninguno"].includes(v)),
        },
        {
          id: "eval-pelvic-sleep",
          text: "Micciones nocturnas: cuantifica frecuencia, ingesta hídrica nocturna y hábitos de cafeína.",
          appliesTo: ["piso"],
          when: (ctx) => ctx.values.piso_sueno === "micciones_nocturnas",
        },
      ],
      treatment: [
        {
          id: "tx-cardio",
          text: "Carga dosificada con monitoreo de FC/PA; pausas activas y educación en percepción de esfuerzo.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_cardio === true,
        },
        {
          id: "tx-osteoporosis",
          text: "Fortalecimiento progresivo, bajo impacto; evitar manipulaciones HVLA en columna costal/lumbar.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.comorbidities.com_osteoporosis === true,
        },
        {
          id: "tx-anticoag",
          text: "Técnicas de baja compresión; educar sobre hematomas y signos de alarma.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ctx.medications.med_anticoagulantes === true,
        },
        {
          id: "tx-corticoides",
          text: "Progresión lenta de carga tendinosa y vigilancia de glucemias; cuidado con tracciones fuertes.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.medications.med_corticoides === true,
        },
        {
          id: "tx-emb",
          text: "Evita Valsalva sostenido; posiciones seguras, trabajo respiratorio y manejo de presión intraabdominal.",
          appliesTo: ["piso", "msk"],
          when: (ctx) => ctx.comorbidities.com_embarazo === true || ["embarazo", "postparto"].includes(ctx.values.piso_parto),
        },
        {
          id: "tx-sueno",
          text: "Higiene de sueño: ajustar horarios, limitar pantallas, educar en posiciones antiálgicas.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => ["fragmentado", "insomnio", "micciones_nocturnas", "insuficiente"].includes(ctx.values.msk_sueno) || ["micciones_nocturnas", "insomnio"].includes(ctx.values.piso_sueno) || ["fragmentado", "insuficiente"].includes(ctx.values.sport_sueno),
        },
        {
          id: "tx-irritabilidad",
          text: "Progresión lenta: margen de síntomas 0-2/10 durante y <3/10 a las 24h; evita saltos de carga.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ctx.values.msk_irritabilidad === "alta",
        },
        {
          id: "tx-carga-msk",
          text: "Planificar bloques de carga: semana de descarga tras aumentos >10-15% y monitor 24-48h post sesión.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ["aumento_brusco", "retorno", "descarga"].includes(ctx.values.msk_carga_actual) || ["aumento_brusco", "retorno"].includes(ctx.values.sport_carga_reciente),
        },
        {
          id: "tx-trabajo",
          text: "Ajustes laborales: pausas cada 45-60 min, alternar posturas y educar en levantamiento seguro.",
          appliesTo: ["msk", "sport"],
          when: (ctx) => ["manual_pesado", "mixto"].includes(ctx.values.msk_trabajo_demanda) || ctx.values.sport_trabajo_demanda === "manual_pesado",
        },
        {
          id: "tx-pelvic-loss",
          text: "Entrenamiento de piso pélvico (contracciones y relajación), educación en hábitos de evacuación y toser con protección abdominal.",
          appliesTo: ["piso"],
          when: (ctx) => ctx.values.piso_incontinencia === "si",
        },
        {
          id: "tx-pelvic-dolor",
          text: "Desensibilización gradual, pautas de lubricación/posiciones, y derivación interdisciplinaria si el dolor es severo.",
          appliesTo: ["piso"],
          when: (ctx) => ctx.values.piso_dolor_sexual === "si",
        },
        {
          id: "tx-sport-carga",
          text: "Plan de periodización con semanas de descarga; coordinar con entrenador si hay competencia próxima.",
          appliesTo: ["sport"],
          when: (ctx) => ctx.values.sport_competencia === true || ["aumento_brusco", "retorno"].includes(ctx.values.sport_carga_reciente),
        },
        {
          id: "tx-sport-lesion",
          text: "Prevenir recaídas: include warm-up específico, control de carga y screening de zonas previamente lesionadas.",
          appliesTo: ["sport"],
          when: (ctx) => ctx.values.sport_lesion_previa === true,
        },
        {
          id: "tx-psico",
          text: "Educar en dolor y seguridad, metas graduales y exposición con acompañamiento para banderas amarillas.",
          appliesTo: ["msk", "piso", "sport"],
          when: (ctx) => [ctx.values.msk_yellow_flags, ctx.values.piso_yellow_flags, ctx.values.sport_psico].some((v) => v && !["", "ninguna", "ninguno"].includes(v)),
        },
      ],
    },
  };

  // ---------------------------------------
  // Module definition: Hombro
  // ---------------------------------------
  const clinicalModules = {
    hombro: {
      key: "hombro",
      title: "Hombro & Cintura Escapular",
      scope: "msk",
      icon: "fa-person-rays",
      sections: [
        // 1) Red Flags / Derivación
        {
          title: "Banderas Rojas & Derivación",
          icon: "fa-triangle-exclamation",
          style: "card",
          fast: true,
          fields: [
            { id: "antecedente_cancer", label: "Antecedente de cáncer", type: "boolean", help: "Especialmente reciente o sin controles." },
            { id: "perdida_peso", label: "Pérdida de peso inexplicada", type: "boolean" },
            { id: "fiebre", label: "Fiebre / escalofríos", type: "boolean" },
            { id: "riesgo_infeccion", label: "Riesgo de infección (inmunosupresión, drogas EV, herida, posqx)", type: "boolean" },
            { id: "trauma_significativo", label: "Trauma significativo (caída/choque)", type: "boolean" },
            { id: "deformidad_visible", label: "Deformidad visible / sospecha de luxación", type: "boolean" },
            { id: "dolor_nocturno_no_mecanico", label: "Dolor nocturno no mecánico (no cambia con postura/carga)", type: "boolean" },
            { id: "dolor_reposo_intenso", label: "Dolor intenso en reposo (desproporcionado)", type: "boolean" },
            { id: "incapacidad_elevar_brazo", label: "Incapacidad de elevar el brazo activamente tras trauma", type: "boolean" },
            { id: "deficit_neuro_progresivo", label: "Déficit neurológico progresivo (fuerza/sensibilidad)", type: "boolean" },
            { id: "dolor_pecho_disnea", label: "Dolor torácico / disnea (tamizaje)", type: "boolean" },
            { id: "redflags_notas", label: "Notas / decisión (derivación, imagen, urgencias)", type: "textarea", placeholder: "Registra lo relevante y tu conducta." },
          ],
        },

        // 2) Anamnesis específica
        {
          title: "Anamnesis Específica",
          icon: "fa-clipboard-question",
          style: "grid2",
          fast: true,
          fields: [
            { id: "lado_sintomatico", label: "Lado sintomático", type: "text", placeholder: "Izq / Der / Bilateral" },
            { id: "dominancia", label: "Dominancia", type: "text", placeholder: "Diestro / Zurdo" },
            { id: "inicio", label: "Inicio", type: "text", placeholder: "Agudo / Subagudo / Gradual" },
            { id: "mecanismo", label: "Mecanismo / detonante", type: "text", placeholder: "Trauma, sobrecarga, overhead, etc." },
            mkPROMField("dolor_eva", "Dolor actual (0–10)", 0, 10, "/10", 0, 5, "Escala EVA/END"),
            { id: "dolor_localizacion", label: "Localización dolor", type: "text", placeholder: "Anterolateral, AC, bicipital, posterior, etc." },
            { id: "dolor_irradia", label: "¿Irradia? (brazo/mano/escápula)", type: "text", placeholder: "Describe patrón" },
            { id: "irritabilidad", label: "Irritabilidad (para dosificación)", type: "text", placeholder: "Alta / Media / Baja" }, // app.js lo convierte en select
            { id: "patron_24h", label: "Patrón 24h (sueño, mañana, carga)", type: "text", placeholder: "Ej: peor noche, rigidez AM, etc." },
            { id: "dolor_nocturno", label: "Dolor nocturno (clínico)", type: "boolean" },
            { id: "rigidez", label: "Rigidez / sensación de tope", type: "boolean" },
            { id: "chasquidos", label: "Chasquidos / bloqueos", type: "boolean" },
            { id: "sensacion_inestabilidad", label: "Sensación de inestabilidad/aprehensión", type: "boolean" },
            { id: "parestesias", label: "Parestesias / adormecimiento", type: "boolean" },
            { id: "agravantes", label: "Agravantes (gestos/cargas)", type: "textarea", placeholder: "Overhead, empuje, tracción, dormir, etc." },
            { id: "aliviantes", label: "Aliviantes", type: "textarea", placeholder: "Reposo relativo, calor, posición, etc." },
            { id: "objetivo_paciente", label: "Objetivo del paciente", type: "textarea", placeholder: "Volver a deporte, trabajo, overhead, dormir, etc." },
          ],
        },

        // 3) Inspección (postura, escápula, atrofias, color/edema)
        {
          title: "Inspección (postura, escápula, atrofias, color/edema)",
          icon: "fa-eye",
          style: "card",
          fields: [
            { id: "inspeccion_postura_global", label: "Postura global (cervical/torácica/escápula)", type: "textarea", placeholder: "Alineación, cifosis/ lordosis, reposo escapular y respiración." },
            { id: "postura_protraccion", label: "Protracción / hombro anteriorizado", type: "boolean" },
            { id: "elevacion_hombro", label: "Elevación de hombro (compensación)", type: "boolean" },
            { id: "escapula_alada", label: "Escápula alada", type: "boolean" },
            { id: "dyskinesis_escapular", label: "Disquinesia escapular (observación dinámica)", type: "boolean" },
            { id: "ritmo_alterado", label: "Ritmo escápulo-humeral alterado", type: "boolean" },
            { id: "atrofia_supra", label: "Atrofia supraespinoso (fosa supraespinosa)", type: "boolean" },
            { id: "atrofia_infra", label: "Atrofia infraespinoso (fosa infraespinosa)", type: "boolean" },
            { id: "atrofia_deltoides", label: "Atrofia deltoides / cara lateral hombro", type: "boolean" },
            { id: "signo_popeye", label: "Signo 'Popeye' (bíceps)", type: "boolean" },
            { id: "asimetria_clavicular", label: "Asimetría clavicular / AC", type: "boolean" },
            { id: "cicatrices", label: "Cicatrices / antecedentes quirúrgicos visibles", type: "boolean" },
            { id: "eritema", label: "Eritema / cambios de color", type: "boolean" },
            { id: "edema", label: "Edema visible", type: "boolean" },
            { id: "equimosis", label: "Equimosis / hematoma", type: "boolean" },
            { id: "temp_aumentada", label: "Temperatura local aumentada", type: "boolean" },
            { id: "inspeccion_color_edema", label: "Color / edema (detalle)", type: "textarea", placeholder: "Eritema, cianosis, edema localizado o difuso." },
            { id: "inspeccion_notas", label: "Notas de inspección", type: "textarea", placeholder: "Describe hallazgos relevantes." },
          ],
        },

        // 4) Palpación completa (puntos relevantes)
        {
          title: "Palpación completa",
          icon: "fa-hand",
          style: "card",
          fields: [
            { id: "dolor_ac_palp", label: "Dolor a palpación articulación AC", type: "boolean" },
            { id: "dolor_acromion_palp", label: "Dolor acromion / espina escapular", type: "boolean" },
            { id: "dolor_bicipital_palp", label: "Dolor corredera bicipital", type: "boolean" },
            { id: "dolor_coracoides_palp", label: "Dolor región coracoides", type: "boolean" },
            { id: "dolor_supra_insercion_palp", label: "Dolor inserción supraespinoso (tubérculo mayor)", type: "boolean" },
            { id: "dolor_infra_palp", label: "Dolor infraespinoso / redondo menor", type: "boolean" },
            { id: "dolor_subescapular_palp", label: "Dolor subescapular / surco", type: "boolean" },
            { id: "dolor_deltoides_palp", label: "Dolor deltoides (anterior/lateral/posterior)", type: "boolean" },
            { id: "dolor_trapecio_palp", label: "Dolor trapecio/elevador escápula", type: "boolean" },
            { id: "dolor_pectoral_menor_palp", label: "Dolor pectoral menor", type: "boolean" },
            { id: "dolor_cervicoescapular_palp", label: "Dolor cervico-escapular", type: "boolean" },
            { id: "dolor_borde_escapular", label: "Dolor borde medial escápula / romboides", type: "boolean" },
            { id: "dolor_oseo_focal", label: "Dolor óseo focal (clavícula/húmero proximal)", type: "boolean" },
            { id: "crepitacion", label: "Crepitación / fricción palpable", type: "boolean" },
            { id: "palpacion_notas", label: "Notas de palpación", type: "textarea", placeholder: "Puntos gatillo, dolor focal, respuesta al tacto, etc." },
          ],
        },

        // 5) ROM activo + pasivo + dolor (bilateral y % dif)
        {
          title: "ROM Activo + Pasivo + Dolor (bilateral)",
          icon: "fa-ruler-combined",
          style: "card",
          fields: [
            { id: "flexion_a", label: "Flexión AROM", type: "numeric", unit: "°", min: 0, max: 180, normal: 170, limited: 120, bilateral: true },
            { id: "abduccion_a", label: "Abducción AROM", type: "numeric", unit: "°", min: 0, max: 180, normal: 170, limited: 120, bilateral: true },
            { id: "extension_a", label: "Extensión AROM", type: "numeric", unit: "°", min: 0, max: 70, normal: 60, limited: 40, bilateral: true },
            { id: "er0_a", label: "Rotación Externa (0° Abd) AROM", type: "numeric", unit: "°", min: 0, max: 100, normal: 80, limited: 50, bilateral: true },
            { id: "er90_a", label: "Rotación Externa (90° Abd) AROM", type: "numeric", unit: "°", min: 0, max: 120, normal: 100, limited: 70, bilateral: true },
            { id: "ir90_a", label: "Rotación Interna (90° Abd) AROM", type: "numeric", unit: "°", min: 0, max: 90, normal: 70, limited: 45, bilateral: true },
            { id: "flexion_p", label: "Flexión PROM", type: "numeric", unit: "°", min: 0, max: 180, normal: 175, limited: 130, bilateral: true },
            { id: "abduccion_p", label: "Abducción PROM", type: "numeric", unit: "°", min: 0, max: 180, normal: 175, limited: 130, bilateral: true },
            { id: "er0_p", label: "Rotación Externa (0° Abd) PROM", type: "numeric", unit: "°", min: 0, max: 100, normal: 85, limited: 55, bilateral: true },
            { id: "er90_p", label: "Rotación Externa (90° Abd) PROM", type: "numeric", unit: "°", min: 0, max: 120, normal: 105, limited: 75, bilateral: true },
            { id: "ir90_p", label: "Rotación Interna (90° Abd) PROM", type: "numeric", unit: "°", min: 0, max: 90, normal: 75, limited: 50, bilateral: true },
            { id: "arco_doloroso", label: "Arco doloroso (clínico)", type: "boolean", help: "Marcar si el dolor aparece en un rango específico de elevación." },
            { id: "compensaciones", label: "Compensaciones (hombro elevado, tronco, escápula)", type: "boolean" },
            { id: "ir_mano_espalda", label: "IR funcional (mano a espalda) — nivel", type: "text", placeholder: "Ej: T7, T12, glúteo" },
            { id: "patron_capsular", label: "Patrón capsular (sospecha) — ER limitada > Abd/Flex", type: "boolean" },
            { id: "endfeel_duro", label: "End-feel duro/abrupto", type: "boolean" },
            { id: "dolor_movimiento_activo", label: "Dolor AROM (rango y calidad)", type: "textarea", placeholder: "Dolor inicial/fin de rango, fatiga, sensación de tope." },
            { id: "dolor_movimiento_pasivo", label: "Dolor PROM (rango y calidad)", type: "textarea", placeholder: "Dolor capsular/pericapsular, irritabilidad, fin de rango." },
            { id: "rom_diff_flex_pct", label: "Diferencia % flexión (L/R)", type: "numeric", unit: "%", min: 0, max: 100, normal: 5, limited: 20, bilateral: false, help: "(lado menor / lado mayor) × 100. Útil para seguimiento." },
            { id: "rom_diff_abd_pct", label: "Diferencia % abducción (L/R)", type: "numeric", unit: "%", min: 0, max: 100, normal: 5, limited: 20, bilateral: false },
            { id: "rom_diff_rot_ext_pct", label: "Diferencia % rotación externa (L/R)", type: "numeric", unit: "%", min: 0, max: 100, normal: 5, limited: 20, bilateral: false },
            { id: "rom_diff_rot_int_pct", label: "Diferencia % rotación interna (L/R)", type: "numeric", unit: "%", min: 0, max: 100, normal: 5, limited: 20, bilateral: false },
            { id: "rom_diff_funcional_pct", label: "Diferencia % funcional (IR mano a espalda / tareas)", type: "numeric", unit: "%", min: 0, max: 100, normal: 5, limited: 25, bilateral: false, help: "Percepción funcional entre lados; documenta % de brecha." },
            { id: "arom_notas", label: "Notas AROM/PROM", type: "textarea", placeholder: "Dolor, tope, calidad de movimiento, comparativa L/R." },
            { id: "prom_notas", label: "End-feel / rigidez (detalle)", type: "textarea", placeholder: "Capsular vs no capsular, irritabilidad y respuesta post prueba." },
          ],
        },

        // 6) Fuerza: bloque MMT + alternativa dinamometría (selector)
        {
          title: "Fuerza (MMT + Dinamometría)",
          icon: "fa-dumbbell",
          style: "card",
          fields: [
            {
              id: "fuerza_modalidad",
              label: "Selector fuerza (MMT / dinamometría)",
              type: "select",
              options: [
                { value: "", label: "— Seleccionar —" },
                { value: "mmt", label: "MMT (escala 0-5)" },
                { value: "hhd", label: "Dinamometría (HHD)" },
                { value: "mixto", label: "Mixto (ambos métodos)" },
              ],
            },
            { id: "debilidad_marcada", label: "Debilidad marcada (clínica)", type: "boolean", help: "Incapacidad clara vs inhibición por dolor." },
            { id: "dolor_contra_resistencia", label: "Dolor con resistencia (cualquier dirección)", type: "boolean" },
            { id: "mmt_flexion", label: "MMT Flexión", type: "select", options: mmtOptions },
            { id: "mmt_abduccion", label: "MMT Abducción / scaption", type: "select", options: mmtOptions },
            { id: "mmt_scaption", label: "MMT Elevación en escápula", type: "select", options: mmtOptions },
            { id: "mmt_er0", label: "MMT Rotación Externa (0°)", type: "select", options: mmtOptions },
            { id: "mmt_er90", label: "MMT Rotación Externa (90°)", type: "select", options: mmtOptions },
            { id: "mmt_ir0", label: "MMT Rotación Interna (0°)", type: "select", options: mmtOptions },
            { id: "mmt_extension", label: "MMT Extensión", type: "select", options: mmtOptions },
            { id: "mmt_deltoides_post", label: "MMT Deltoides posterior / horizontal abd", type: "select", options: mmtOptions },
            { id: "mmt_serrato", label: "MMT Serrato anterior (push-up plus / wall slide)", type: "select", options: mmtOptions },
            { id: "mmt_trap_medio", label: "MMT Trapecio medio / retractores", type: "select", options: mmtOptions },
            { id: "mmt_trap_inferior", label: "MMT Trapecio inferior", type: "select", options: mmtOptions },
            { id: "mmt_romboides", label: "MMT Romboides", type: "select", options: mmtOptions },
            { id: "mmt_biceps", label: "MMT Bíceps", type: "select", options: mmtOptions },
            { id: "mmt_triceps", label: "MMT Tríceps", type: "select", options: mmtOptions },
            { id: "fuerza_manual_global", label: "Evaluación manual global", type: "textarea", placeholder: "Describe patrón RC, deltoides, escápula, control y fatiga." },
            { id: "fuerza_musculos_detalle", label: "Notas MMT (dolor/síntomas)", type: "textarea", placeholder: "Ej: ER 4-/5 dolor posterolateral; Serrato 4/5 fatiga." },
            {
              id: "dinamometria_modalidad",
              label: "Modalidad dinamometría",
              type: "select",
              options: [
                { value: "", label: "— Seleccionar —" },
                { value: "hhd_isometrico", label: "HHD isométrico" },
                { value: "dinamometro_mano", label: "Dinamómetro mano / empuñadura" },
                { value: "isocinetico", label: "Isocinético / laboratorio" },
              ],
            },
            { id: "dyn_unidad", label: "Unidad / protocolo", type: "text", placeholder: "Ej: N, kgf, N/kg · posición y palanca" },
            { id: "dyn_er0", label: "ER (0° Abd)", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true, help: "Registra valor L/R con el mismo protocolo." },
            { id: "dyn_ir0", label: "IR (0° Abd)", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true },
            { id: "dyn_abd_scaption", label: "Abducción (scaption)", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true },
            { id: "dyn_flex", label: "Flexión", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true },
            { id: "dyn_ext", label: "Extensión", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true },
            { id: "dyn_row", label: "Tracción (row) / retractores", type: "numeric", unit: "", min: 0, max: 1000, normal: 0, limited: 0, bilateral: true },
            { id: "dyn_notas", label: "Notas dinamometría", type: "textarea", placeholder: "Protocolo, posición, dolor, confiabilidad." },
          ],
        },

        // 7) Control motor y escápula
        {
          title: "Control Motor & Escápula",
          icon: "fa-person-running",
          style: "card",
          fields: [
            { id: "control_escapular_deficit", label: "Déficit control escapular", type: "boolean" },
            { id: "fatiga_serrato", label: "Fatiga/insuficiencia serrato anterior (clínica)", type: "boolean" },
            { id: "trap_inf_deficit", label: "Déficit trapecio inferior (clínico)", type: "boolean" },
            { id: "sat", label: "Scapular Assistance Test (SAT) mejora síntomas", type: "boolean" },
            { id: "srt", label: "Scapular Retraction Test (SRT) mejora fuerza/síntomas", type: "boolean" },
            { id: "ckc_dolor", label: "Dolor en tareas CKC (apoyo) — pared/suelo", type: "boolean" },
            { id: "control_notas", label: "Notas control motor", type: "textarea", placeholder: "Wall slide, push-up plus, elevación, patrón, etc." },
          ],
        },

        // 10) Pruebas especiales (RCRSP / Manguito)
        {
          title: "Pruebas Especiales — RCRSP / Manguito Rotador",
          icon: "fa-stethoscope",
          style: "card",
          fields: [
            { id: "hawkins", label: "Hawkins-Kennedy (+)", type: "boolean" },
            { id: "neer", label: "Neer (+)", type: "boolean" },
            { id: "jobe", label: "Jobe / Empty Can (+)", type: "boolean" },
            { id: "infraspinatus_test", label: "Test resistencia ER (infraespinoso) (+)", type: "boolean", help: "Dolor o debilidad reproducible." },
            { id: "drop_arm", label: "Drop Arm (+)", type: "boolean" },
            { id: "er_lag_sign", label: "ER Lag Sign (+)", type: "boolean" },
            { id: "hornblower", label: "Hornblower (+) (redondo menor)", type: "boolean" },
            { id: "belly_press", label: "Belly-Press (+) (subescapular)", type: "boolean" },
            { id: "lift_off", label: "Lift-Off (+) (subescapular)", type: "boolean" },
            { id: "bear_hug", label: "Bear Hug (+) (subescapular)", type: "boolean" },
            { id: "rcrsp_notas", label: "Notas pruebas RCRSP/RC", type: "textarea", placeholder: "Registra lado, dolor, debilidad, calidad y comparativa." },
          ],
        },

        // 11) AC joint
        {
          title: "Pruebas Especiales — Articulación AC",
          icon: "fa-link",
          style: "card",
          fields: [
            { id: "cross_body_adduction", label: "Cross-Body Adduction (+)", type: "boolean" },
            { id: "paxinos", label: "Paxinos (+)", type: "boolean" },
            { id: "ac_resisted_extension", label: "Resisted AC Extension (+)", type: "boolean" },
            { id: "ac_notas", label: "Notas AC", type: "textarea", placeholder: "Dolor focal AC vs dolor difuso." },
          ],
        },

        // 12) Inestabilidad / Labrum
        {
          title: "Pruebas Especiales — Inestabilidad / Labrum",
          icon: "fa-rotate",
          style: "card",
          fields: [
            { id: "apprehension", label: "Apprehension (+)", type: "boolean" },
            { id: "relocation_relief", label: "Relocation (alivia aprensión/dolor) (+)", type: "boolean" },
            { id: "sulcus", label: "Sulcus Sign (+)", type: "boolean" },
            { id: "load_shift", label: "Load and Shift (+)", type: "boolean" },
            { id: "crank", label: "Crank (+) (dolor/click)", type: "boolean" },
            { id: "biceps_load_ii", label: "Biceps Load II (+)", type: "boolean" },
            { id: "instab_notas", label: "Notas inestabilidad/labrum", type: "textarea", placeholder: "Dirección, historia de episodios, deporte overhead/contacto." },
          ],
        },

        // 13) Bíceps
        {
          title: "Pruebas Especiales — Bíceps",
          icon: "fa-hand-fist",
          style: "card",
          fields: [
            { id: "speed", label: "Speed (+)", type: "boolean" },
            { id: "yergason", label: "Yergason (+)", type: "boolean" },
            { id: "uppercut", label: "Uppercut (+)", type: "boolean" },
            { id: "biceps_notas", label: "Notas bíceps", type: "textarea", placeholder: "Dolor corredera vs referido." },
          ],
        },

        // 14) Screen cervical / neuro
        {
          title: "Screen Cervical / Neuro (referido)",
          icon: "fa-brain",
          style: "card",
          fields: [
            { id: "spurling", label: "Spurling (+)", type: "boolean" },
            { id: "distraction", label: "Distracción cervical (alivia) (+)", type: "boolean" },
            { id: "ultt_a", label: "ULTT A (+)", type: "boolean" },
            { id: "rotation_lt60", label: "Rotación cervical < 60° (lado sintomático)", type: "boolean" },
            { id: "dermatomas", label: "Alteración dermatomas", type: "boolean" },
            { id: "miotomas", label: "Déficit miotomas", type: "boolean" },
            { id: "reflejos", label: "Reflejos alterados", type: "boolean" },
            { id: "cervical_notas", label: "Notas cervical/neuro", type: "textarea", placeholder: "Síntomas, distribución, prueba neurodinámica, etc." },
          ],
        },

        // 15) Clasificación clínica (útil para tratamiento)
        {
          title: "Clasificación Clínica (para guiar tratamiento)",
          icon: "fa-sitemap",
          style: "card",
          fast: true,
          fields: [
            { id: "cls_rcrsp", label: "RCRSP (dolor relacionado al manguito / carga)", type: "boolean" },
            { id: "cls_capsulitis", label: "Hombro rígido / capsulitis (probable)", type: "boolean" },
            { id: "cls_instability", label: "Inestabilidad (anterior/multidireccional)", type: "boolean" },
            { id: "cls_ac_joint", label: "Dolor articulación AC", type: "boolean" },
            { id: "cls_biceps", label: "Tendinopatía bíceps / complejo bicipital", type: "boolean" },
            { id: "cls_rc_full_thickness", label: "Sospecha desgarro completo manguito", type: "boolean" },
            { id: "cls_cervical", label: "Componente cervical / radiculopatía probable", type: "boolean" },
            { id: "cls_otra", label: "Otra hipótesis (texto)", type: "text", placeholder: "Ej: dolor referido, dolor nociplástico, etc." },
            { id: "clasificacion_notas", label: "Notas clasificación", type: "textarea", placeholder: "Qué te hace pensar eso y qué necesitas confirmar." },
          ],
        },

        // 16) Plan y objetivos (auto + editable)
        {
          title: "Plan, Objetivos y Seguimiento",
          icon: "fa-bullseye",
          style: "card",
          fast: true,
          fields: [
            { id: "hipotesis_principal", label: "Hipótesis principal", type: "textarea", placeholder: "Estructura(s)/mecanismo(s) y por qué." },
            { id: "objetivos_smarts", label: "Objetivos (SMART)", type: "textarea", placeholder: "Ej: dormir 7h sin dolor, overhead 10 rep sin dolor >2/10, etc." },
            { id: "plan_inicial", label: "Plan inicial (editable) — aquí se insertan sugerencias", type: "textarea", placeholder: "Tu plan + lo que copie el motor automático." },
            { id: "criterios_progresion", label: "Criterios de progresión (función, dolor 24h, simetría, tests)", type: "textarea", placeholder: "Define cuándo progresas carga/volumen/overhead." },
            { id: "retest", label: "Re-test elegido (para seguimiento)", type: "text", placeholder: "Ej: AROM flex, SAT, SPADI, tarea overhead, etc." },
          ],
        },

        // 17) SPADI (colapsado por defecto por app.js)
        {
          title: "SPADI — Dolor (0–10) y Discapacidad (0–10)",
          icon: "fa-clipboard-list",
          style: "card",
          fields: [
            { id: "spadi_info", label: "Instrucción", type: "text", placeholder: "0=sin dolor/dificultad · 10=peor/ imposible" },
            ...spadiPainItems.map(([id, label]) => withQuickConfig(mkPROMField(id, label, 0, 10, "", 0, 5, "0–10"), spadiQuick)),
            ...spadiDisItems.map(([id, label]) => withQuickConfig(mkPROMField(id, label, 0, 10, "", 0, 5, "0–10"), spadiQuick)),
            { id: "spadi_notas", label: "Notas SPADI", type: "textarea", placeholder: "Contexto de respuestas, cambios relevantes." },
          ],
        },

        // 18) DASH core (colapsado por defecto por app.js)
        {
          title: "DASH — Cuestionario (Core 30 ítems)",
          icon: "fa-list-check",
          style: "grid2",
          fields: [
            { id: "dash_info", label: "Instrucción", type: "text", placeholder: "0=No aplica · 1=Sin dificultad · 5=Incapaz" },
            ...dashCoreItems.map(([id, label]) => withQuickConfig(mkDashField(id, label), dashQuick)),
            { id: "dash_notas", label: "Notas DASH", type: "textarea", placeholder: "Contexto, tareas relevantes, etc." },
          ],
        },

        // 19) DASH módulos (colapsado por defecto por app.js)
        {
          title: "DASH — Módulos opcionales (Trabajo / Deporte-Artes)",
          icon: "fa-briefcase",
          style: "grid2",
          fields: [
            ...dashWorkItems.map(([id, label]) => withQuickConfig(mkDashField(id, label), dashQuick)),
            ...dashSportItems.map(([id, label]) => withQuickConfig(mkDashField(id, label), dashQuick)),
            { id: "dash_modulos_notas", label: "Notas módulos DASH", type: "textarea", placeholder: "Si aplica, describe el gesto específico." },
          ],
        },
      ],

      // ---------------------------------------
      // Logic Rules (real-time reasoning)
      // - Uses tri-state booleans: only === true counts as positive
      // - when signature: (s, p) => boolean
      //   s = {tests, numeric, text}
      //   p = patientData (includes patient-age, etc.)
      // ---------------------------------------
      logicRules: [
        // Red Flags
        {
          id: "red-flag-tumor",
          severity: "danger",
          title: "ALERTA: Bandera Roja (Posible neoplasia)",
          description:
            "Antecedente de cáncer + dolor nocturno no mecánico + pérdida de peso inexplicada. Recomendación: DERIVACIÓN / evaluación médica urgente.",
          hypothesis: false,
          when: (s) =>
            s.tests.antecedente_cancer === true &&
            s.tests.dolor_nocturno_no_mecanico === true &&
            s.tests.perdida_peso === true,
        },
        {
          id: "red-flag-infection",
          severity: "danger",
          title: "ALERTA: Bandera Roja (Posible infección)",
          description:
            "Fiebre/escalofríos + riesgo de infección + dolor intenso en reposo. Recomendación: derivación médica urgente.",
          hypothesis: false,
          when: (s) =>
            s.tests.fiebre === true &&
            s.tests.riesgo_infeccion === true &&
            s.tests.dolor_reposo_intenso === true,
        },
        {
          id: "red-flag-fracture-dislocation",
          severity: "danger",
          title: "ALERTA: Trauma significativo (fractura / luxación a descartar)",
          description:
            "Trauma significativo con deformidad visible o incapacidad para elevar el brazo. Considera urgencias/imágenes según clínica.",
          hypothesis: false,
          when: (s) =>
            s.tests.trauma_significativo === true &&
            (s.tests.deformidad_visible === true || s.tests.incapacidad_elevar_brazo === true),
        },
        {
          id: "red-flag-neuro",
          severity: "danger",
          title: "ALERTA: Déficit neurológico progresivo",
          description:
            "Déficit neurológico progresivo requiere evaluación prioritaria. Considera screen cervical y derivación según gravedad.",
          hypothesis: false,
          when: (s) => s.tests.deficit_neuro_progresivo === true,
        },
        {
          id: "red-flag-cardiopulmonary",
          severity: "danger",
          title: "ALERTA: Síntomas torácicos / respiratorios",
          description:
            "Dolor torácico o disnea: descartar urgencias cardiopulmonares. Recomendación: derivación inmediata según contexto.",
          hypothesis: false,
          when: (s) => s.tests.dolor_pecho_disnea === true,
        },

        // Cervical radiculopathy cluster (Wainner-like)
        {
          id: "cluster-cervical-radiculopathy",
          severity: "warning",
          title: "Cluster cervical (+): sospecha componente radicular",
          description:
            "Múltiples hallazgos (Spurling, Distracción, ULTT A, rotación <60°) aumentan probabilidad de componente cervical. Ajusta razonamiento y manejo.",
          scoreValue: 12,
          criteria: [
            { id: "spurling", source: "tests", label: "Spurling (+)", weight: 3 },
            { id: "distraction", source: "tests", label: "Distracción (+)", weight: 3 },
            { id: "ultt_a", source: "tests", label: "ULTT A (+)", weight: 3 },
            { id: "rotation_lt60", source: "tests", label: "Rotación <60°", weight: 3, missingLabel: "Medir rotación <60°" },
          ],
          when: (s) => {
            const positives = [
              s.tests.spurling === true,
              s.tests.distraction === true,
              s.tests.ultt_a === true,
              s.tests.rotation_lt60 === true,
            ].filter(Boolean).length;
            return positives >= 3;
          },
        },

        // RCRSP (Park-like cluster) — avoid "impingement" terminology
        {
          id: "cluster-rcrsp",
          severity: "warning",
          title: "Cluster RCRSP (+): mayor probabilidad de dolor relacionado al manguito",
          description:
            "Combinación de Arco doloroso + Hawkins-Kennedy + resistencia ER (infraespinoso) sugiere mayor probabilidad de RCRSP. Integra carga, control escapular y progresión por irritabilidad.",
          scoreValue: 15,
          criteria: [
            { id: "arco_doloroso", source: "tests", label: "Arco doloroso (+)", weight: 5 },
            { id: "hawkins", source: "tests", label: "Hawkins-Kennedy (+)", weight: 5 },
            { id: "infraspinatus_test", source: "tests", label: "Resistencia ER dolor/debilidad", weight: 5, missingLabel: "Test infraespinoso" },
          ],
          when: (s) =>
            s.tests.arco_doloroso === true &&
            s.tests.hawkins === true &&
            s.tests.infraspinatus_test === true,
        },

        // Full thickness tear suspicion (age/context)
        {
          id: "cluster-full-thickness-rc",
          severity: "warning",
          title: "Sospecha de desgarro completo del manguito (a considerar)",
          description:
            "ER Lag Sign o Drop Arm (+) junto a debilidad marcada y/o edad avanzada aumenta sospecha. Considera derivación/imagen según impacto funcional y contexto.",
          scoreValue: 14,
          criteria: [
            { id: "er_lag_sign", source: "tests", label: "ER Lag Sign (+)", weight: 5 },
            { id: "drop_arm", source: "tests", label: "Drop Arm (+)", weight: 5 },
            { id: "debilidad_marcada", source: "tests", label: "Debilidad marcada", weight: 3 },
            { id: "patient-age", source: "patient", label: "Edad ≥60", weight: 1, type: "numeric", minValue: 60, missingLabel: "Registrar edad" },
          ],
          when: (s, p) => {
            const age = Number(p?.["patient-age"]);
            const ageOk = Number.isFinite(age) ? age >= 60 : false;
            const strongTest = s.tests.er_lag_sign === true || s.tests.drop_arm === true;
            const weakness = s.tests.debilidad_marcada === true;
            return strongTest && (weakness || ageOk);
          },
        },

        // Traumatic cuff suspicion integrating edad/trauma
        {
          id: "cluster-traumatic-rc",
          severity: "warning",
          title: "Contexto traumático: sospecha de rotura del manguito",
          description:
            "Trauma significativo + incapacidad de elevar el brazo y pruebas específicas (Drop Arm / ER Lag) o edad ≥45 elevan la sospecha de rotura. Considera imagen según impacto funcional.",
          scoreValue: 13,
          criteria: [
            { id: "trauma_significativo", source: "tests", label: "Trauma significativo", weight: 4 },
            { id: "incapacidad_elevar_brazo", source: "tests", label: "Incapacidad elevar brazo", weight: 4 },
            { id: "drop_arm", source: "tests", label: "Drop Arm (+)", weight: 3 },
            { id: "er_lag_sign", source: "tests", label: "ER Lag Sign (+)", weight: 2 },
            { id: "patient-age", source: "patient", label: "Edad ≥45", weight: 1, type: "numeric", minValue: 45, missingLabel: "Registrar edad" },
          ],
          when: (s, p) => {
            const age = Number(p?.["patient-age"]);
            const ageFlag = Number.isFinite(age) ? age >= 45 : false;
            const trauma = s.tests.trauma_significativo === true && s.tests.incapacidad_elevar_brazo === true;
            const cuffTests = s.tests.drop_arm === true || s.tests.er_lag_sign === true;
            return trauma && (cuffTests || ageFlag);
          },
        },

        // Capsulitis / stiff shoulder suspicion
        {
          id: "cluster-stiff-shoulder",
          severity: "warning",
          title: "Patrón compatible con hombro rígido / capsulitis (probable)",
          description:
            "Rigidez + dolor nocturno + patrón capsular (ER limitada) en rango etario típico aumenta probabilidad. Dosifica movilidad según irritabilidad y monitoriza 24h.",
          scoreValue: 12,
          criteria: [
            { id: "rigidez", source: "tests", label: "Rigidez clínica", weight: 4 },
            { id: "dolor_nocturno", source: "tests", label: "Dolor nocturno", weight: 3 },
            { id: "patron_capsular", source: "tests", label: "Patrón capsular", weight: 3 },
            { id: "patient-age", source: "patient", label: "Edad 40-65", weight: 2, type: "numeric", minValue: 40, maxValue: 65, missingLabel: "Registrar edad" },
          ],
          when: (s, p) => {
            const age = Number(p?.["patient-age"]);
            const ageOk = Number.isFinite(age) ? age >= 40 && age <= 65 : false;
            return (
              s.tests.rigidez === true &&
              s.tests.dolor_nocturno === true &&
              s.tests.patron_capsular === true &&
              ageOk
            );
          },
        },

        // Rigidez post-trauma / post-inmovilización
        {
          id: "rule-post-trauma-stiffness",
          severity: "info",
          title: "Rigidez secundaria a trauma o inmovilización",
          description:
            "Trauma significativo con patrón capsular o end-feel duro sugiere rigidez secundaria. Dosifica progresión de movilidad y monitorea dolor nocturno.",
          when: (s) =>
            s.tests.trauma_significativo === true &&
            s.tests.rigidez === true &&
            (s.tests.patron_capsular === true || s.tests.endfeel_duro === true),
        },

        // Instability anterior
        {
          id: "cluster-anterior-instability",
          severity: "warning",
          title: "Cluster inestabilidad anterior (+)",
          description:
            "Apprehension (+) y Relocation con alivio (+) aumenta probabilidad de inestabilidad anterior. Enfocar estabilidad dinámica, control motor y exposición graduada.",
          scoreValue: 10,
          criteria: [
            { id: "apprehension", source: "tests", label: "Apprehension (+)", weight: 5 },
            { id: "relocation_relief", source: "tests", label: "Relocation alivia", weight: 5, missingLabel: "Test Relocation" },
          ],
          when: (s) => s.tests.apprehension === true && s.tests.relocation_relief === true,
        },

        // AC joint pain cluster
        {
          id: "cluster-ac-joint",
          severity: "warning",
          title: "Cluster AC (+): dolor focal articulación AC",
          description:
            "Cross-body adduction (+) + dolor a palpación AC sugiere mayor probabilidad de dolor AC. Ajusta compresión/cargas y progresa por tolerancia.",
          scoreValue: 9,
          criteria: [
            { id: "cross_body_adduction", source: "tests", label: "Cross-body adduction (+)", weight: 4 },
            { id: "dolor_ac_palp", source: "tests", label: "Dolor a palpación AC", weight: 4 },
            { id: "ac_notas", source: "text", label: "Notas AC documentadas", weight: 1, type: "text", missingLabel: "Documentar notas AC" },
          ],
          when: (s) => s.tests.cross_body_adduction === true && s.tests.dolor_ac_palp === true,
        },

        // RCRSP + rango etario / carga repetitiva
        {
          id: "rule-rcrsp-age-load",
          severity: "info",
          title: "Dolor relacionado a carga (RCRSP) en rango etario típico",
          description:
            "Edad 30–65 sin trauma mayor + signos RCRSP (arco doloroso, Hawkins/Jobe/infraespinoso) orientan a manejo de carga progresiva y control escapular.",
          criteria: [
            { id: "arco_doloroso", source: "tests", label: "Arco doloroso", weight: 3 },
            { id: "hawkins", source: "tests", label: "Hawkins-Kennedy (+)", weight: 3 },
            { id: "jobe", source: "tests", label: "Jobe/Empty Can (+)", weight: 3 },
            { id: "infraspinatus_test", source: "tests", label: "Resistencia ER dolor/debilidad", weight: 3 },
            { id: "patient-age", source: "patient", label: "Edad 30-65", weight: 2, type: "numeric", minValue: 30, maxValue: 65, missingLabel: "Registrar edad" },
          ],
          when: (s, p) => {
            const age = Number(p?.["patient-age"]);
            const ageOk = Number.isFinite(age) ? age >= 30 && age <= 65 : false;
            const signs = [s.tests.arco_doloroso === true, s.tests.hawkins === true, s.tests.jobe === true, s.tests.infraspinatus_test === true].filter(Boolean).length >= 3;
            return ageOk && signs && s.tests.trauma_significativo !== true;
          },
        },

        // Irritability guidance
        {
          id: "irritability-high",
          severity: "info",
          title: "Irritabilidad alta: prioriza control de síntomas",
          description:
            "Si hay irritabilidad alta, prioriza educación + manejo de carga + dosis baja/moderada, evitando picos de dolor y vigilando respuesta 24h.",
          when: (s) => String(s.text.irritabilidad || "").toLowerCase().includes("alta"),
        },
      ],
    },
  };

  // Expose to window for non-module script usage
  window.intakeRemoteConfig = intakeRemoteConfig;
  window.clinicalModules = clinicalModules;
})();
