// All u moves — Clinical Suite Engine (app.js)
// This file is designed to "take control" of the existing index.html by overriding the global
// functions referenced by inline onclick/onchange attributes.
// No HTML strings are hardcoded; DOM is built via renderComponent(config).

(() => {
  "use strict";

  // -----------------------------
  // Global State
  // -----------------------------
  const appState = {
    patientData: {},
    ui: {
      printing: {
        textareaSnapshots: new Map(), // textarea -> {height, overflow}
        buttonSnapshots: new Map(),   // button -> childNodes clones + disabled
      },
    },
  };

  // Required by spec
  const activeModules = [];
  window.activeModules = activeModules; // helpful for debugging

  let moduleCounter = 0;

  // -----------------------------
  // DOM helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
  }

  function safeNumber(v) {
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function percentDiff(a, b) {
    const A = safeNumber(a);
    const B = safeNumber(b);
    if (A === null || B === null) return null;
    const denom = Math.max(Math.abs(A), Math.abs(B), 1e-9);
    return (Math.abs(A - B) / denom) * 100;
  }

  // -----------------------------
  // Render Engine (NO hardcoded HTML)
  // -----------------------------
  /**
   * renderComponent(config)
   * Config schema (minimal):
   * {
   *   tag: 'div',
   *   id, className,
   *   attrs: { ... },
   *   dataset: { ... },
   *   text: '...',
   *   children: [ ...config | string | number ],
   *   on: { click: (e)=>{}, input: (e)=>{} },
   * }
   */
  function renderComponent(cfg) {
    if (cfg === null || cfg === undefined) return document.createTextNode("");
    if (typeof cfg === "string" || typeof cfg === "number" || typeof cfg === "boolean") {
      return document.createTextNode(String(cfg));
    }
    if (!isObject(cfg)) throw new Error("renderComponent: config must be an object, string, number, or boolean.");

    const el = document.createElement(cfg.tag || "div");

    if (cfg.id) el.id = String(cfg.id);
    if (cfg.className) el.className = String(cfg.className);

    if (cfg.attrs && isObject(cfg.attrs)) {
      Object.entries(cfg.attrs).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (k in el) {
          // Prefer properties when available
          try {
            el[k] = v;
          } catch {
            el.setAttribute(k, String(v));
          }
        } else {
          el.setAttribute(k, String(v));
        }
      });
    }

    if (cfg.dataset && isObject(cfg.dataset)) {
      Object.entries(cfg.dataset).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        el.dataset[k] = String(v);
      });
    }

    if (cfg.text !== undefined && cfg.text !== null) {
      el.textContent = String(cfg.text);
    }

    if (cfg.on && isObject(cfg.on)) {
      Object.entries(cfg.on).forEach(([evt, handler]) => {
        if (typeof handler === "function") el.addEventListener(evt, handler);
      });
    }

    if (Array.isArray(cfg.children)) {
      cfg.children.forEach((child) => el.appendChild(renderComponent(child)));
    }

    return el;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function mount(parent, cfg) {
    const el = renderComponent(cfg);
    parent.appendChild(el);
    return el;
  }

  // -----------------------------
  // Patient Data Binding
  // -----------------------------
  const PATIENT_TEXT_IDS = [
    "kine-name",
    "patient-name",
    "patient-rut",
    "patient-dob",
    "patient-age",
    "patient-address",
    "patient-commune",
    "patient-phone",
    "patient-email",
    "patient-insurance",
    "patient-emergency-name",
    "patient-emergency-phone",
    "patient-occupation",
    "patient-work-details",
    "patient-sport",
    "general-anamnesis",

    // injected
    "patient-weight",
    "patient-height",
    "patient-bmi",
  ];

  const PATIENT_RADIO_NAMES = ["sex", "dominance", "consent"];

  function updatePatientField(key, value) {
    appState.patientData[key] = value;
    evaluateLogic();
  }

  function bindPatientInputs() {
    // Text-ish fields
    PATIENT_TEXT_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const handler = () => {
        updatePatientField(id, el.value);
        if (id === "patient-dob") calculateAge();
        if (id === "patient-weight" || id === "patient-height") updateBMI();
      };

      // Keep it responsive
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);

      // Initialize state from DOM (if any)
      updatePatientField(id, el.value);
    });

    // Radios
    PATIENT_RADIO_NAMES.forEach((name) => {
      $$(`input[name="${name}"]`).forEach((radio) => {
        radio.addEventListener("change", () => {
          const checked = $(`input[name="${name}"]:checked`);
          if (checked) updatePatientField(name, checked.value);
        });

        // Initialize
        if (radio.checked) updatePatientField(name, radio.value);
      });
    });
  }

  // Age calculation – keeps the existing ID contract from index.html
  function calculateAge() {
    const dobInput = $("#patient-dob");
    const ageInput = $("#patient-age");
    if (!dobInput || !ageInput) return;

    const iso = String(dobInput.value || "");
    if (!iso) return;

    const dob = new Date(iso);
    if (Number.isNaN(dob.getTime())) return;

    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;

    ageInput.value = String(age);
    updatePatientField("patient-age", ageInput.value);
  }

  // BMI (IMC) based on kg + cm (or meters if user inputs small number)
  function updateBMI() {
    const wEl = $("#patient-weight");
    const hEl = $("#patient-height");
    const bmiEl = $("#patient-bmi");
    if (!wEl || !hEl || !bmiEl) return;

    const w = safeNumber(wEl.value);
    const hRaw = safeNumber(hEl.value);

    if (w === null || hRaw === null || w <= 0 || hRaw <= 0) {
      bmiEl.value = "";
      updatePatientField("patient-bmi", "");
      return;
    }

    const hMeters = hRaw > 3 ? hRaw / 100 : hRaw; // assume cm if >3
    const bmi = w / (hMeters * hMeters);
    const bmiRounded = Number.isFinite(bmi) ? bmi.toFixed(1) : "";
    bmiEl.value = bmiRounded;
    updatePatientField("patient-bmi", bmiRounded);
  }

  // Inject "Peso" and "Estatura" (and show BMI) into Identificación section
  function injectAnthropometrics() {
    const grid = $("#section-identity .grid");
    if (!grid) return;

    // Avoid double-inject
    if ($("#patient-weight") || $("#patient-height")) return;

    const insuranceInput = $("#patient-insurance");
    const anchor = insuranceInput ? insuranceInput.closest("div") : null;

    const weightBlock = renderComponent({
      tag: "div",
      className: "md:col-span-4",
      children: [
        { tag: "label", className: "aum-label", text: "Peso (kg)" },
        {
          tag: "input",
          id: "patient-weight",
          className: "aum-input",
          attrs: { type: "number", inputMode: "decimal", min: "0", step: "0.1", placeholder: "Ej: 80.5" },
        },
      ],
    });

    const heightBlock = renderComponent({
      tag: "div",
      className: "md:col-span-4",
      children: [
        { tag: "label", className: "aum-label", text: "Estatura (cm)" },
        {
          tag: "input",
          id: "patient-height",
          className: "aum-input",
          attrs: { type: "number", inputMode: "decimal", min: "0", step: "0.1", placeholder: "Ej: 175" },
        },
      ],
    });

    const bmiBlock = renderComponent({
      tag: "div",
      className: "md:col-span-4",
      children: [
        { tag: "label", className: "aum-label", text: "IMC (auto)" },
        {
          tag: "input",
          id: "patient-bmi",
          className: "aum-input text-center bg-gray-50",
          attrs: { type: "text", readOnly: true, placeholder: "-" },
        },
      ],
    });

    if (anchor && anchor.parentElement === grid) {
      // Insert right after insurance block
      const next = anchor.nextSibling;
      grid.insertBefore(weightBlock, next);
      grid.insertBefore(heightBlock, next);
      grid.insertBefore(bmiBlock, next);
    } else {
      grid.appendChild(weightBlock);
      grid.appendChild(heightBlock);
      grid.appendChild(bmiBlock);
    }
  }

  // -----------------------------
  // Module Data + Mock DB
  // -----------------------------


  // (Opcional) Cadera demo para probar múltiples módulos abiertos
  const mockCaderaData = {
    key: "cadera",
    title: "Cadera",
    icon: "fa-bone",
    sections: [
      {
        title: "ROM",
        icon: "fa-ruler-combined",
        style: "card",
        fields: [
          {
            id: "flexion",
            label: "Flexión",
            type: "numeric",
            unit: "°",
            min: 0,
            max: 140,
            bilateral: true,
            normal: 120,
            default: { L: 120, R: 120 },
          },
        ],
      },
      {
        title: "Pruebas",
        icon: "fa-stethoscope",
        style: "grid2",
        fields: [{ id: "fadir", label: "FADIR", type: "boolean" }],
      },
    ],
    logicRules: [
      {
        id: "cadera-fadir",
        severity: "info",
        title: "Nota: FADIR positivo",
        description:
          "FADIR positivo puede asociarse a irritación anterior/FAI en el contexto correcto. Verifica ROM rotación interna, dolor inguinal y tolerancia a carga.",
        when: (s) => Boolean(s.tests?.fadir),
      },
    ],
  };

  const mockData = {
    cadera: mockCaderaData,
  };

  function getModuleTemplate(type) {
    // Prefer external clinicalModules (js/data.js)
    try {
      const cm = window.clinicalModules;
      if (cm && cm[type]) return cm[type];
    } catch {}
    if (mockData[type]) return mockData[type];

    // Fallback simple (sin HTML hardcode) para tipos aún no modelados
    return {
      key: type,
      title: String(type || "Módulo"),
      icon: "fa-file-medical",
      sections: [
        {
          title: "Notas",
          icon: "fa-pen",
          style: "card",
          fields: [{ id: "nota", label: "Observación", type: "textarea" }],
        },
      ],
      logicRules: [],
    };
  }

  // -----------------------------
  // Stack Engine (Modules)
  // -----------------------------
  function getModuleLabelFromSelect(value) {
    const sel = $("#moduleSelector");
    if (!sel) return value;
    const opt = Array.from(sel.options).find((o) => o.value === value);
    return opt ? opt.text : value;
  }

  function ensureEmptyStateHidden() {
    const empty = $("#empty-state");
    if (empty) empty.style.display = "none";
  }

  function ensureEmptyStateShownIfNeeded() {
    const stack = $("#clinical-stack");
    const empty = $("#empty-state");
    if (!stack || !empty) return;

    const anyModules = stack.querySelector(".module-entry");
    empty.style.display = anyModules ? "none" : "block";
  }

  function initModuleState(template) {
    const state = {
      numeric: {},
      tests: {},
      text: {},
      ui: {
        modes: {}, // fieldId -> "slider" | "exact" | "quick"
      },
    };

    (template.sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.type === "numeric") {
          if (f.bilateral) {
            state.numeric[f.id] = {
              L: safeNumber(f.default?.L) ?? safeNumber(f.normal) ?? safeNumber(f.max) ?? 0,
              R: safeNumber(f.default?.R) ?? safeNumber(f.normal) ?? safeNumber(f.max) ?? 0,
            };
          } else {
            state.numeric[f.id] = safeNumber(f.default) ?? safeNumber(f.normal) ?? safeNumber(f.max) ?? 0;
          }
          state.ui.modes[f.id] = "slider";
        }
        if (f.type === "boolean") state.tests[f.id] = Boolean(f.default) || false;
        if (f.type === "textarea" || f.type === "text") state.text[f.id] = String(f.default ?? "");
      });
    });

    return state;
  }

  function addModuleFromSelect(loadedType = null, loadedId = null, loadedState = null) {
    const selector = $("#moduleSelector");
    const type = loadedType || (selector ? selector.value : "");
    if (!type) {
      alert("Seleccione una zona.");
      return null;
    }

    const template = getModuleTemplate(type);
    const moduleId = loadedId || `mod-${type}-${moduleCounter++}`;
    const moduleName = loadedType ? template.title : getModuleLabelFromSelect(type);

    const module = {
      id: moduleId,
      type,
      name: moduleName,
      template,
      state: initModuleState(template),
      refs: {
        alertContainer: null,
        root: null,
      },
    };

    if (loadedState && isObject(loadedState)) {
      module.state = deepMerge(module.state, loadedState);
    }

    activeModules.push(module);
    renderModule(module);

    if (!loadedType && selector) selector.value = "";
    return moduleId;
  }

  function deepMerge(base, patch) {
    if (!isObject(base) || !isObject(patch)) return patch;
    const out = { ...base };
    Object.entries(patch).forEach(([k, v]) => {
      if (isObject(v) && isObject(out[k])) out[k] = deepMerge(out[k], v);
      else out[k] = v;
    });
    return out;
  }

  function removeModule(id) {
    const idx = activeModules.findIndex((m) => m.id === id);
    if (idx >= 0) activeModules.splice(idx, 1);

    const modEl = document.getElementById(id);
    if (modEl) modEl.remove();

    const tag = document.getElementById(`tag-${id}`);
    if (tag) tag.remove();

    ensureEmptyStateShownIfNeeded();
    evaluateLogic();
  }

  function resetStack() {
    if (!confirm("¿Borrar todo?")) return;

    // Clear modules
    activeModules.length = 0;

    // Remove module DOM nodes (keep empty-state)
    const stack = $("#clinical-stack");
    if (stack) {
      $$(".module-entry", stack).forEach((n) => n.remove());
      ensureEmptyStateShownIfNeeded();
    }

    // Clear tags
    const tags = $("#active-tags-container");
    if (tags) clearNode(tags);

    // Clear patient inputs
    PATIENT_TEXT_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = "";
      appState.patientData[id] = "";
    });

    PATIENT_RADIO_NAMES.forEach((name) => {
      $$(`input[name="${name}"]`).forEach((r) => (r.checked = false));
      appState.patientData[name] = "";
    });

    // Clear previews (optional)
    const media = $("#media-preview-area");
    if (media) {
      clearNode(media);
      media.classList.add("hidden");
    }
    const docs = $("#doc-preview-area");
    if (docs) {
      clearNode(docs);
      docs.classList.add("hidden");
    }

    evaluateLogic();
  }

  // Expose required global hooks used by index.html onclick attributes
  window.addModuleFromSelect = addModuleFromSelect;
  window.removeModule = removeModule;
  window.resetStack = resetStack;
  window.calculateAge = calculateAge;

  // -----------------------------
  // Module Rendering
  // -----------------------------
  function renderModule(module) {
    const stack = $("#clinical-stack");
    if (!stack) return;

    ensureEmptyStateHidden();

    // Tag
    upsertModuleTag(module);

    // Card skeleton
    const card = renderComponent({
      tag: "div",
      id: module.id,
      className:
        "module-entry bg-white rounded-xl shadow-md overflow-hidden border border-brand-accent/20 relative mb-6 pdf-break-avoid",
      children: [
        {
          tag: "div",
          className: "bg-brand-dark px-6 py-4 flex justify-between items-center text-white relative",
          children: [
            {
              tag: "h3",
              className: "font-bold flex items-center gap-3 uppercase text-sm z-10",
              children: [
                {
                  tag: "span",
                  className:
                    "w-8 h-8 bg-brand-accent rounded-full flex items-center justify-center text-brand-dark",
                  children: [{ tag: "i", className: `fa-solid ${module.template.icon || "fa-file-medical"}` }],
                },
                { tag: "span", text: `Evaluación: ${module.name}` },
              ],
            },
            {
              tag: "button",
              className:
                "text-brand-grey hover:text-red-400 hide-on-pdf cursor-pointer z-20 bg-white/10 rounded-full w-8 h-8 flex items-center justify-center",
              attrs: { type: "button", title: "Eliminar módulo" },
              on: { click: () => removeModule(module.id) },
              children: [{ tag: "i", className: "fa-solid fa-trash-can" }],
            },
          ],
        },
        {
          tag: "div",
          className: "p-6 md:p-8 space-y-6",
          children: [
            // alerts placeholder
            {
              tag: "div",
              className: "space-y-2",
              dataset: { role: "alerts" },
            },
            // content
            ...renderModuleContent(module),
          ],
        },
      ],
    });

    stack.appendChild(card);
    module.refs.root = card;
    module.refs.alertContainer = $('[data-role="alerts"]', card);

    // Sync UI from state (important for loaded sessions)
    syncModuleUIFromState(module);
    evaluateLogic();

    // Auto scroll for user added modules (not for loaded sessions)
    if (!module.__loaded) {
      setTimeout(() => {
        const el = document.getElementById(module.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }

  function upsertModuleTag(module) {
    const tagContainer = $("#active-tags-container");
    if (!tagContainer) return;

    const existing = document.getElementById(`tag-${module.id}`);
    if (existing) return;

    const tag = renderComponent({
      tag: "div",
      id: `tag-${module.id}`,
      className:
        "bg-brand-accent/20 text-white border border-brand-accent rounded-full px-3 py-1 text-xs flex items-center gap-2 shadow-sm",
      children: [
        { tag: "span", className: "font-medium", text: module.name },
        {
          tag: "button",
          className: "text-brand-accent hover:text-white cursor-pointer hide-on-pdf",
          attrs: { type: "button", title: "Cerrar" },
          on: { click: () => removeModule(module.id) },
          children: [{ tag: "i", className: "fa-solid fa-times" }],
        },
      ],
    });

    tagContainer.appendChild(tag);
  }

  function renderModuleContent(module) {
    const content = [];
    const sections = module.template.sections || [];

    sections.forEach((section) => {
      content.push(renderSection(module, section));
    });

    return content;
  }

  function renderSection(module, section) {
    const header = renderComponent({
      tag: "h4",
      className: "text-brand-dark font-bold text-xs uppercase mb-4 flex items-center gap-2",
      children: [
        { tag: "i", className: `fa-solid ${section.icon || "fa-circle"} text-brand-accent` },
        { tag: "span", text: section.title || "Sección" },
      ],
    });

    const bodyChildren = (section.fields || []).map((field) => renderField(module, field));

    let bodyClass = "space-y-4";
    if (section.style === "grid2") bodyClass = "grid grid-cols-1 sm:grid-cols-2 gap-3";

    const wrapperClass =
      section.style === "card"
        ? "bg-gray-50/50 p-5 rounded-xl border border-gray-100"
        : "bg-white p-0";

    return renderComponent({
      tag: "div",
      className: wrapperClass,
      children: [
        header,
        {
          tag: "div",
          className: bodyClass,
          children: bodyChildren,
        },
      ],
    });
  }

  function renderField(module, field) {
    switch (field.type) {
      case "numeric":
        return field.bilateral ? renderNumericBilateral(module, field) : renderNumericSingle(module, field);
      case "boolean":
        return renderBooleanField(module, field);
      case "textarea":
        return renderTextareaField(module, field);
      case "text":
        return renderTextField(module, field);
      default:
        return renderComponent({
          tag: "div",
          className: "text-sm text-brand-grey",
          text: `Campo no soportado: ${String(field.type)}`,
        });
    }
  }

  // -------- Boolean field
  function renderBooleanField(module, field) {
    const inputId = `${module.id}__bool__${field.id}`;
    const cfg = {
      tag: "label",
      className: "flex items-center p-2 border rounded bg-white cursor-pointer hover:bg-gray-50",
      children: [
        {
          tag: "input",
          id: inputId,
          className: "mr-3 w-4 h-4 accent-brand-dark",
          attrs: { type: "checkbox" },
          dataset: { moduleId: module.id, fieldId: field.id, fieldType: "boolean" },
          on: {
            change: (e) => {
              const checked = Boolean(e.currentTarget.checked);
              module.state.tests[field.id] = checked;
              evaluateLogic();
            },
          },
        },
        { tag: "span", className: "text-sm text-gray-700", text: field.label || field.id },
      ],
    };

    return renderComponent(cfg);
  }

  // -------- Text fields
  function renderTextareaField(module, field) {
    const inputId = `${module.id}__txt__${field.id}`;
    return renderComponent({
      tag: "div",
      className: "flex flex-col",
      children: [
        { tag: "label", className: "aum-label", attrs: { for: inputId }, text: field.label || field.id },
        {
          tag: "textarea",
          id: inputId,
          className: "aum-input h-24 resize-y shadow-inner",
          dataset: { moduleId: module.id, fieldId: field.id, fieldType: "text" },
          attrs: { placeholder: field.placeholder || "Escribe..." },
          on: {
            input: (e) => {
              module.state.text[field.id] = e.currentTarget.value;
              evaluateLogic();
            },
          },
        },
      ],
    });
  }

  function renderTextField(module, field) {
    const inputId = `${module.id}__txt__${field.id}`;
    return renderComponent({
      tag: "div",
      className: "flex flex-col",
      children: [
        { tag: "label", className: "aum-label", attrs: { for: inputId }, text: field.label || field.id },
        {
          tag: "input",
          id: inputId,
          className: "aum-input",
          dataset: { moduleId: module.id, fieldId: field.id, fieldType: "text" },
          attrs: { type: "text", placeholder: field.placeholder || "" },
          on: {
            input: (e) => {
              module.state.text[field.id] = e.currentTarget.value;
              evaluateLogic();
            },
          },
        },
      ],
    });
  }

  // -------- Numeric: mode toggles
  function renderModeToggle(module, field) {
    const modes = [
      { id: "slider", label: "Barra" },
      { id: "exact", label: "Exacto" },
      { id: "quick", label: "Rápido" },
    ];

    const buttonCfgs = modes.map((m) => ({
      tag: "button",
      className:
        "px-3 py-1 rounded-md text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-all",
      attrs: { type: "button" },
      dataset: { moduleId: module.id, fieldId: field.id, mode: m.id, role: "mode-btn" },
      text: m.label,
      on: {
        click: (e) => {
          e.preventDefault();
          module.state.ui.modes[field.id] = m.id;
          syncNumericModeUI(module, field.id);
        },
      },
    }));

    return renderComponent({
      tag: "div",
      className: "flex items-center gap-2",
      children: buttonCfgs,
    });
  }

  function syncNumericModeUI(module, fieldId) {
    const root = document.getElementById(module.id);
    if (!root) return;

    const mode = module.state.ui.modes[fieldId] || "slider";

    // highlight active button
    $$(`[data-role="mode-btn"][data-field-id="${fieldId}"]`, root).forEach((btn) => {
      const isActive = btn.dataset.mode === mode;
      btn.classList.toggle("bg-brand-dark", isActive);
      btn.classList.toggle("text-white", isActive);
      btn.classList.toggle("border-brand-dark", isActive);
    });

    // show relevant panel
    $$(`[data-role="mode-panel"][data-field-id="${fieldId}"]`, root).forEach((panel) => {
      const isPanel = panel.dataset.mode === mode;
      panel.classList.toggle("hidden", !isPanel);
    });
  }

  function renderNumericSingle(module, field) {
    const label = field.label || field.id;
    const unit = field.unit || "";
    const min = safeNumber(field.min) ?? 0;
    const max = safeNumber(field.max) ?? 100;

    const wrapper = renderComponent({
      tag: "div",
      className: "space-y-2",
      children: [
        {
          tag: "div",
          className: "flex items-center justify-between gap-3",
          children: [
            { tag: "div", className: "text-sm font-semibold text-gray-700", text: label },
            renderModeToggle(module, field),
          ],
        },
        // Panels
        renderNumericPanels({
          module,
          field,
          unit,
          min,
          max,
          side: null,
        }),
      ],
    });

    return wrapper;
  }

  function renderNumericBilateral(module, field) {
    const label = field.label || field.id;
    const unit = field.unit || "";
    const min = safeNumber(field.min) ?? 0;
    const max = safeNumber(field.max) ?? 100;

    const diffElId = `${module.id}__diff__${field.id}`;

    const wrapper = renderComponent({
      tag: "div",
      className: "space-y-2",
      children: [
        {
          tag: "div",
          className: "flex items-center justify-between gap-3",
          children: [
            { tag: "div", className: "text-sm font-semibold text-gray-700", text: label },
            renderModeToggle(module, field),
          ],
        },
        {
          tag: "div",
          className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
          children: [
            renderComponent({
              tag: "div",
              className: "bg-white rounded-lg border border-gray-200 p-3",
              children: [
                { tag: "div", className: "text-xs font-bold text-brand-grey uppercase mb-2", text: "Izq" },
                renderNumericPanels({ module, field, unit, min, max, side: "L" }),
              ],
            }),
            renderComponent({
              tag: "div",
              className: "bg-white rounded-lg border border-gray-200 p-3",
              children: [
                { tag: "div", className: "text-xs font-bold text-brand-grey uppercase mb-2", text: "Der" },
                renderNumericPanels({ module, field, unit, min, max, side: "R" }),
              ],
            }),
          ],
        },
        {
          tag: "div",
          className: "text-xs flex items-center gap-2",
          children: [
            { tag: "span", className: "text-brand-grey font-semibold", text: "Δ" },
            {
              tag: "span",
              id: diffElId,
              className: "font-mono font-bold text-gray-700",
              text: "-",
              dataset: { moduleId: module.id, fieldId: field.id, role: "diff" },
            },
          ],
        },
      ],
    });

    return wrapper;
  }

  function renderNumericPanels({ module, field, unit, min, max, side }) {
    const fieldId = field.id;
    const normal = safeNumber(field.normal) ?? safeNumber(max) ?? 0;
    const limited = safeNumber(field.limited) ?? Math.round(normal * 0.7);

    const mk = (mode, children) =>
      renderComponent({
        tag: "div",
        className: "space-y-2",
        dataset: { role: "mode-panel", fieldId: fieldId, mode: mode },
        children,
      });

    // Slider
    const slider = mk("slider", [
      {
        tag: "div",
        className: "flex items-center gap-3",
        children: [
          {
            tag: "input",
            className:
              "flex-grow h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-dark",
            attrs: { type: "range", min: String(min), max: String(max), step: "1" },
            dataset: { moduleId: module.id, fieldId, side: side || "", kind: "slider" },
            on: {
              input: (e) => {
                const v = clamp(e.currentTarget.value, min, max);
                setNumericValue(module, fieldId, side, v);
              },
            },
          },
          {
            tag: "output",
            className: "text-xs font-mono w-12 text-right font-bold text-brand-dark",
            dataset: { moduleId: module.id, fieldId, side: side || "", kind: "out" },
            text: "-",
          },
        ],
      },
    ]);

    // Exact number
    const exact = mk("exact", [
      {
        tag: "div",
        className: "flex items-center gap-3",
        children: [
          {
            tag: "input",
            className: "aum-input text-center",
            attrs: { type: "number", min: String(min), max: String(max), step: "1", inputMode: "numeric" },
            dataset: { moduleId: module.id, fieldId, side: side || "", kind: "number" },
            on: {
              input: (e) => {
                const v = clamp(e.currentTarget.value, min, max);
                setNumericValue(module, fieldId, side, v);
              },
            },
          },
          { tag: "span", className: "text-xs font-bold text-brand-grey", text: unit },
        ],
      },
    ]);

    // Quick buttons
    const quick = mk("quick", [
      {
        tag: "div",
        className: "flex gap-2",
        children: [
          {
            tag: "button",
            className:
              "flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold transition-all",
            attrs: { type: "button" },
            dataset: { moduleId: module.id, fieldId, side: side || "", kind: "quick-normal" },
            children: [{ tag: "span", text: "Normal" }],
            on: {
              click: () => setNumericValue(module, fieldId, side, normal),
            },
          },
          {
            tag: "button",
            className:
              "flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs font-bold transition-all",
            attrs: { type: "button" },
            dataset: { moduleId: module.id, fieldId, side: side || "", kind: "quick-limited" },
            children: [{ tag: "span", text: "Limitado" }],
            on: {
              click: () => setNumericValue(module, fieldId, side, limited),
            },
          },
        ],
      },
      {
        tag: "div",
        className: "text-[11px] text-brand-grey",
        text: `Normal≈${normal}${unit} · Limitado≈${limited}${unit}`,
      },
    ]);

    return renderComponent({
      tag: "div",
      children: [slider, exact, quick],
    });
  }

  function getNumericState(module, fieldId) {
    return module.state.numeric[fieldId];
  }

  function setNumericValue(module, fieldId, side, value) {
    const min = safeNumber(findField(module, fieldId)?.min) ?? 0;
    const max = safeNumber(findField(module, fieldId)?.max) ?? 100;
    const v = clamp(value, min, max);

    const cur = getNumericState(module, fieldId);

    if (side === "L" || side === "R") {
      if (!isObject(cur)) module.state.numeric[fieldId] = { L: v, R: v };
      else module.state.numeric[fieldId][side] = v;
    } else {
      module.state.numeric[fieldId] = v;
    }

    syncNumericValueUI(module, fieldId);
    evaluateLogic();
  }

  function findField(module, fieldId) {
    const sections = module.template.sections || [];
    for (const sec of sections) {
      for (const f of sec.fields || []) {
        if (f.id === fieldId) return f;
      }
    }
    return null;
  }

  function syncNumericValueUI(module, fieldId) {
    const root = document.getElementById(module.id);
    if (!root) return;
    const field = findField(module, fieldId);
    const unit = field?.unit || "";
    const cur = getNumericState(module, fieldId);

    const applySide = (sideKey) => {
      const v = sideKey ? cur?.[sideKey] : cur;
      // slider
      const slider = root.querySelector(
        `input[type="range"][data-field-id="${fieldId}"][data-kind="slider"][data-side="${sideKey || ""}"]`
      );
      if (slider) slider.value = String(v ?? "");
      // number
      const num = root.querySelector(
        `input[type="number"][data-field-id="${fieldId}"][data-kind="number"][data-side="${sideKey || ""}"]`
      );
      if (num) num.value = String(v ?? "");
      // output
      const out = root.querySelector(
        `output[data-field-id="${fieldId}"][data-kind="out"][data-side="${sideKey || ""}"]`
      );
      if (out) out.textContent = v === null || v === undefined || v === "" ? "-" : `${v}${unit}`;
    };

    if (field?.bilateral) {
      applySide("L");
      applySide("R");
      syncDiffUI(module, fieldId);
    } else {
      applySide("");
    }
  }

  function syncDiffUI(module, fieldId) {
    const root = document.getElementById(module.id);
    if (!root) return;

    const cur = getNumericState(module, fieldId);
    if (!isObject(cur)) return;

    const d = percentDiff(cur.L, cur.R);
    const diffEl = root.querySelector(`[data-role="diff"][data-field-id="${fieldId}"]`);
    if (!diffEl) return;

    if (d === null) {
      diffEl.textContent = "-";
      diffEl.classList.remove("text-brand-danger");
      diffEl.classList.add("text-gray-700");
      return;
    }

    diffEl.textContent = `${d.toFixed(1)}%`;
    const isHigh = d > 10;
    diffEl.classList.toggle("text-brand-danger", isHigh);
    diffEl.classList.toggle("text-gray-700", !isHigh);
  }

  function syncModuleUIFromState(module) {
    // set modes for numeric fields + values
    const sections = module.template.sections || [];
    sections.forEach((sec) => {
      (sec.fields || []).forEach((f) => {
        if (f.type === "numeric") {
          syncNumericValueUI(module, f.id);
          syncNumericModeUI(module, f.id);
        }
        if (f.type === "boolean") {
          const root = document.getElementById(module.id);
          if (!root) return;
          const checkbox = root.querySelector(`input[type="checkbox"][data-field-id="${f.id}"]`);
          if (checkbox) checkbox.checked = Boolean(module.state.tests[f.id]);
        }
        if (f.type === "textarea" || f.type === "text") {
          const root = document.getElementById(module.id);
          if (!root) return;
          const el = root.querySelector(`[data-field-type="text"][data-field-id="${f.id}"]`);
          if (el) el.value = String(module.state.text[f.id] ?? "");
        }
      });
    });
  }

  // -----------------------------
  // Logic Watcher
  // -----------------------------
  function evaluateLogic() {
    activeModules.forEach((m) => evaluateModuleLogic(m));
  }

  function evaluateModuleLogic(module) {
    const container = module.refs.alertContainer || $('[data-role="alerts"]', document.getElementById(module.id));
    if (!container) return;

    // We rebuild alerts each time (simple + robust).
    clearNode(container);

    const rules = module.template.logicRules || [];
    rules.forEach((rule) => {
      let ok = false;
      try {
        ok = typeof rule.when === "function" ? Boolean(rule.when(module.state, appState.patientData)) : false;
      } catch {
        ok = false;
      }
      if (!ok) return;

      container.appendChild(renderAlertCard(rule));
    });
  }

  function renderAlertCard(rule) {
    const severity = rule.severity || "info";
    const palette = {
      info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        title: "text-blue-900",
        body: "text-blue-800",
        icon: "fa-circle-info",
      },
      warning: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        title: "text-yellow-900",
        body: "text-yellow-800",
        icon: "fa-triangle-exclamation",
      },
      danger: {
        bg: "bg-red-50",
        border: "border-red-200",
        title: "text-red-900",
        body: "text-red-800",
        icon: "fa-circle-exclamation",
      },
    }[severity] || {
      bg: "bg-gray-50",
      border: "border-gray-200",
      title: "text-gray-900",
      body: "text-gray-800",
      icon: "fa-bell",
    };

    return renderComponent({
      tag: "div",
      className: `${palette.bg} ${palette.border} border rounded-xl p-4 flex gap-3 items-start pdf-break-avoid`,
      children: [
        {
          tag: "div",
          className: "w-9 h-9 rounded-full bg-white/60 border border-white flex items-center justify-center flex-shrink-0",
          children: [{ tag: "i", className: `fa-solid ${palette.icon} ${palette.title}` }],
        },
        {
          tag: "div",
          className: "space-y-1",
          children: [
            { tag: "div", className: `text-sm font-bold ${palette.title}`, text: rule.title || "Alerta" },
            { tag: "div", className: `text-xs leading-relaxed ${palette.body}`, text: rule.description || "" },
          ],
        },
      ],
    });
  }

  window.evaluateLogic = evaluateLogic;

  // -----------------------------
  // Storage: .aum export/import
  // -----------------------------
  function exportSession() {
    const session = {
      meta: {
        app: "all-u-moves-clinical-suite",
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      patientData: buildPatientSnapshot(),
      modules: activeModules.map((m) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        state: m.state,
      })),
    };

    const isoDate = new Date().toISOString().slice(0, 10);
    const filename = `paciente-${isoDate}.aum`;

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = renderComponent({
      tag: "a",
      attrs: { href: url, download: filename },
    });

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildPatientSnapshot() {
    // read from DOM to avoid drift
    const out = {};

    PATIENT_TEXT_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) out[id] = el.value;
    });

    PATIENT_RADIO_NAMES.forEach((name) => {
      const checked = $(`input[name="${name}"]:checked`);
      if (checked) out[name] = checked.value;
    });

    return out;
  }

  function loadSession(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || "{}"));
        loadSessionFromObject(parsed);
        alert("Sesión cargada.");
      } catch (err) {
        alert("Error al leer archivo: " + err);
      }
    };
    reader.readAsText(file);
  }

  function loadSessionFromObject(session) {
    resetStackWithoutConfirm();

    const patient = session.patientData || session.static || {};
    // Fill text inputs
    Object.entries(patient).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (el) el.value = String(value ?? "");
    });

    // Radios
    PATIENT_RADIO_NAMES.forEach((name) => {
      const val = patient[name];
      if (val === null || val === undefined) return;
      const radio = $(`input[name="${name}"][value="${CSS.escape(String(val))}"]`);
      if (radio) radio.checked = true;
    });

    // Recalc derived fields
    calculateAge();
    updateBMI();

    // Modules
    const mods = Array.isArray(session.modules) ? session.modules : [];
    mods.forEach((m) => {
      const id = addModuleFromSelect(m.type, m.id, m.state);
      const mod = activeModules.find((x) => x.id === id);
      if (!mod) return;
      mod.__loaded = true;
      mod.name = m.name || mod.name;

      // Update tag label (if needed)
      const tag = document.getElementById(`tag-${mod.id}`);
      if (tag) {
        const label = tag.querySelector("span");
        if (label) label.textContent = mod.name;
      }

      // Update header title
      const root = document.getElementById(mod.id);
      if (root) {
        const headerSpan = root.querySelector("h3 span:last-child");
        if (headerSpan) headerSpan.textContent = `Evaluación: ${mod.name}`;
      }

      syncModuleUIFromState(mod);
    });

    ensureEmptyStateShownIfNeeded();
    evaluateLogic();
  }

  function resetStackWithoutConfirm() {
    // Clear modules
    activeModules.length = 0;

    // Remove module DOM nodes (keep empty-state)
    const stack = $("#clinical-stack");
    if (stack) {
      $$(".module-entry", stack).forEach((n) => n.remove());
      ensureEmptyStateShownIfNeeded();
    }

    // Clear tags
    const tags = $("#active-tags-container");
    if (tags) clearNode(tags);

    // Clear patient inputs
    PATIENT_TEXT_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = "";
      appState.patientData[id] = "";
    });

    PATIENT_RADIO_NAMES.forEach((name) => {
      $$(`input[name="${name}"]`).forEach((r) => (r.checked = false));
      appState.patientData[name] = "";
    });

    // Clear previews
    const media = $("#media-preview-area");
    if (media) {
      clearNode(media);
      media.classList.add("hidden");
    }
    const docs = $("#doc-preview-area");
    if (docs) {
      clearNode(docs);
      docs.classList.add("hidden");
    }
  }

  // Compatibility with index.html buttons
  window.exportSession = exportSession;
  window.saveSession = exportSession; // header button calls saveSession()
  window.loadSession = loadSession;

  // file input onchange in index.html calls processLoadSession(this)
  window.processLoadSession = (input) => {
    const file = input?.files?.[0];
    if (!file) return;
    loadSession(file);
    // reset input so selecting same file again works
    input.value = "";
  };

  // -----------------------------
  // UI: hidden file inputs + uploads
  // -----------------------------
  function triggerFileInput(id) {
    const el = document.getElementById(id);
    if (el) el.click();
  }
  window.triggerFileInput = triggerFileInput;

  function processMediaUpload(input) {
    const container = $("#media-preview-area");
    if (!container) return;

    container.classList.remove("hidden");

    const files = input?.files ? Array.from(input.files) : [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = String(e.target?.result || "");

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        const mediaNode = isImage
          ? renderComponent({ tag: "img", className: "w-full h-full object-cover", attrs: { src } })
          : isVideo
          ? renderComponent({ tag: "video", className: "w-full h-full object-cover", attrs: { src, controls: false } })
          : renderComponent({ tag: "div", className: "text-xs text-brand-grey p-2", text: "Archivo no soportado" });

        const wrapper = renderComponent({
          tag: "div",
          className:
            "relative group rounded-lg overflow-hidden shadow-sm border border-gray-200 aspect-square bg-gray-100 pdf-break-avoid",
          children: [
            { tag: "div", className: "w-full h-full", children: [mediaNode] },
            ...(isVideo
              ? [
                  {
                    tag: "div",
                    className: "absolute inset-0 flex items-center justify-center bg-black/30 text-white",
                    children: [{ tag: "i", className: "fa-solid fa-play" }],
                  },
                ]
              : []),
            {
              tag: "div",
              className: "absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate hide-on-pdf",
              text: file.name,
            },
            {
              tag: "button",
              className:
                "absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer hide-on-pdf",
              attrs: { type: "button", title: "Quitar" },
              on: { click: () => wrapper.remove() },
              children: [{ tag: "i", className: "fa-solid fa-times" }],
            },
          ],
        });

        container.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });

    input.value = "";
  }
  window.processMediaUpload = processMediaUpload;

  function processDocUpload(input) {
    const container = $("#doc-preview-area");
    if (!container) return;

    container.classList.remove("hidden");

    const files = input?.files ? Array.from(input.files) : [];
    files.forEach((file) => {
      const row = renderComponent({
        tag: "div",
        className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 pdf-break-avoid",
        children: [
          {
            tag: "div",
            className: "flex items-center gap-3 overflow-hidden",
            children: [
              { tag: "i", className: "fa-solid fa-file-pdf text-red-500 text-xl flex-shrink-0" },
              { tag: "span", className: "text-sm text-gray-700 truncate font-medium", text: file.name },
            ],
          },
          {
            tag: "button",
            className: "text-gray-400 hover:text-red-500 cursor-pointer hide-on-pdf",
            attrs: { type: "button", title: "Quitar" },
            on: { click: () => row.remove() },
            children: [{ tag: "i", className: "fa-solid fa-trash" }],
          },
        ],
      });

      container.appendChild(row);
    });

    input.value = "";
  }
  window.processDocUpload = processDocUpload;

  // -----------------------------
  // Print / PDF: intercept and prepare
  // -----------------------------
  function expandAllTextareasForPrint() {
    const textareas = $$("textarea");
    textareas.forEach((ta) => {
      appState.ui.printing.textareaSnapshots.set(ta, {
        height: ta.style.height,
        overflow: ta.style.overflow,
      });
      ta.style.height = `${ta.scrollHeight}px`;
      ta.style.overflow = "hidden";
    });
  }

  function restoreTextareasAfterPrint() {
    appState.ui.printing.textareaSnapshots.forEach((snap, ta) => {
      ta.style.height = snap.height;
      ta.style.overflow = snap.overflow;
    });
    appState.ui.printing.textareaSnapshots.clear();
  }

  function setButtonBusy(btn, busyText) {
    if (!btn) return;

    const snapshot = {
      disabled: btn.disabled,
      children: Array.from(btn.childNodes).map((n) => n.cloneNode(true)),
    };
    appState.ui.printing.buttonSnapshots.set(btn, snapshot);

    btn.disabled = true;
    clearNode(btn);
    btn.appendChild(
      renderComponent({
        tag: "span",
        className: "flex items-center gap-2",
        children: [
          { tag: "i", className: "fa-solid fa-spinner fa-spin" },
          { tag: "span", text: busyText },
        ],
      })
    );
  }

  function restoreButtonsAfterPrint() {
    appState.ui.printing.buttonSnapshots.forEach((snap, btn) => {
      btn.disabled = snap.disabled;
      clearNode(btn);
      snap.children.forEach((n) => btn.appendChild(n));
    });
    appState.ui.printing.buttonSnapshots.clear();
  }

  function exportToPDF() {
    // The floating button in index.html uses onclick="exportToPDF()"
    const btn = $('button[onclick="exportToPDF()"]');
    setButtonBusy(btn, "Preparando...");

    document.body.classList.add("printing");

    expandAllTextareasForPrint();

    const cleanup = () => {
      document.body.classList.remove("printing");
      restoreTextareasAfterPrint();
      restoreButtonsAfterPrint();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error(e);
        alert("No se pudo abrir el diálogo de impresión/PDF. Revisa permisos del navegador.");
        cleanup();
      }
    }, 150);
  }
  window.exportToPDF = exportToPDF;

  // ------------------------------------------------------------
  // mockHombroData (REQUIRED by spec)
  // 3 preguntas reales de hombro y usado por el motor cuando elijas "Hombro".
  // ------------------------------------------------------------
  const mockHombroData = {
    key: "hombro",
    title: "Hombro",
    icon: "fa-person-rays",
    sections: [
      {
        title: "Rango de Movimiento (ROM)",
        icon: "fa-ruler-combined",
        style: "card",
        fields: [
          {
            id: "abduccion",
            label: "Abducción",
            type: "numeric",
            unit: "°",
            min: 0,
            max: 180,
            bilateral: true,
            normal: 180,
            default: { L: 170, R: 160 },
          },
        ],
      },
      {
        title: "Pruebas Especiales",
        icon: "fa-stethoscope",
        style: "grid2",
        fields: [
          { id: "neer", label: "Test de Neer", type: "boolean" },
          { id: "hawkins", label: "Hawkins-Kennedy", type: "boolean" },
        ],
      },
    ],
    logicRules: [
      {
        id: "subacromial-warning",
        severity: "warning",
        title: "Alerta clínica: posible síndrome subacromial",
        description:
          "Neer + Hawkins positivos aumentan sospecha de irritación subacromial. Correlaciona con dolor, fuerza (rotadores) y patrón de carga.",
        when: (s) => Boolean(s.tests?.neer) && Boolean(s.tests?.hawkins),
      },
    ],
  };

  // Register into mock DB (no hardcoded HTML; data-driven rendering)
  mockData.hombro = mockHombroData;

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    // date display (keep consistent with existing index.html)
    const dateEl = $("#date-display");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString("es-CL");

    injectAnthropometrics();
    bindPatientInputs();

    // Start with correct empty state
    ensureEmptyStateShownIfNeeded();

    // Evaluate once at start
    evaluateLogic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
