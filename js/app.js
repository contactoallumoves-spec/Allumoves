/* All u moves — js/app.js
   Frontend Stack Engine + Clinical Reasoning
   - No hardcoded HTML strings: DOM is built via renderComponent()
   - Real event listeners + global state
   - Modules from window.clinicalModules (js/data.js)
   - Autosave to localStorage (asks to restore)
*/
(() => {
  "use strict";

  // -----------------------------
  // Globals / State
  // -----------------------------
  const APP_VERSION = "aum-app-v4.0.0";

  const AUTOSAVE_KEY = "aum_autosave_v1";
  let autosaveTimer = null;

  // -----------------------------
  // DOM helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function normalizeTriEntry(raw) {
    if (raw && typeof raw === "object" && "value" in raw) {
      const val = raw.value === true ? true : raw.value === false ? false : null;
      const sev = raw.severity ? String(raw.severity) : null;
      return { value: val, severity: sev };
    }
    if (raw === true || raw === false || raw === null) {
      return { value: raw, severity: null };
    }
    return { value: null, severity: null };
  }

  function triValue(entry) {
    return entry && typeof entry === "object" && "value" in entry ? entry.value : entry ?? null;
  }

  function triSeverity(entry) {
    return entry && typeof entry === "object" ? entry.severity || null : null;
  }

  function triEntry(value, severity = null) {
    return { value: value === true ? true : value === false ? false : null, severity: severity || null };
  }

  function mapTriValues(obj = {}) {
    const out = {};
    Object.entries(obj).forEach(([k, v]) => {
      out[k] = triValue(v);
    });
    return out;
  }

  function renderComponent(cfg) {
    if (cfg instanceof Node) return cfg;

    const tag = cfg?.tag || "div";
    const el = document.createElement(tag);

    // className / classes
    const cls = cfg?.className || cfg?.class || cfg?.classes;
    if (cls) el.className = cls;

    // attrs
    if (cfg?.attrs) {
      for (const [k, v] of Object.entries(cfg.attrs)) {
        if (v === null || v === undefined) continue;
        el.setAttribute(k, String(v));
      }
    }

    // dataset
    if (cfg?.dataset) {
      for (const [k, v] of Object.entries(cfg.dataset)) {
        el.dataset[k] = String(v);
      }
    }

    // text
    if (cfg?.text !== undefined) {
      el.textContent = safeText(cfg.text);
    }

    // children
    if (cfg?.children && Array.isArray(cfg.children)) {
      for (const child of cfg.children) {
        if (child === null || child === undefined) continue;
        if (child instanceof Node) {
          el.appendChild(child);
        } else if (typeof child === "string" || typeof child === "number") {
          el.appendChild(document.createTextNode(String(child)));
        } else {
          el.appendChild(renderComponent(child));
        }
      }
    }

    // events
    if (cfg?.on) {
      for (const [evt, handler] of Object.entries(cfg.on)) {
        el.addEventListener(evt, handler);
      }
    }

    return el;
  }

  function iconEl(faClass, extraClass = "") {
    return renderComponent({
      tag: "i",
      className: `fa-solid ${faClass} ${extraClass}`.trim(),
      attrs: { "aria-hidden": "true" },
    });
  }

  let choiceStylesInjected = false;
  function ensureChoiceStyles() {
    if (choiceStylesInjected) return;
    const style = document.createElement("style");
    style.id = "aum-choice-style";
    style.textContent = `
      .aum-choice {
        --aum-choice-bg: #ffffff;
        --aum-choice-color: #102024;
        --aum-choice-border: rgba(16, 32, 36, 0.18);
        --aum-choice-active-bg: #102024;
        --aum-choice-active-color: #ffffff;
        --aum-choice-active-border: #0b1618;
        --aum-choice-shadow: 0 10px 25px -12px rgba(16, 32, 36, 0.55);
        border: 1px solid var(--aum-choice-border);
        background-color: var(--aum-choice-bg);
        color: var(--aum-choice-color);
        transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 120ms ease;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 1px 2px rgba(16, 32, 36, 0.06);
      }
      .aum-choice[data-active="true"] {
        background-color: var(--aum-choice-active-bg);
        color: var(--aum-choice-active-color);
        border-color: var(--aum-choice-active-border);
        box-shadow: 0 0 0 2px rgba(16, 32, 36, 0.12), var(--aum-choice-shadow);
        transform: translateY(-1px);
      }
      .aum-choice:not([data-active="true"]):hover,
      .aum-choice:not([data-active="true"]):focus-visible {
        border-color: rgba(16, 32, 36, 0.4);
        box-shadow: 0 8px 18px -12px rgba(16, 32, 36, 0.55);
      }
      .aum-choice:focus-visible {
        outline: 2px solid rgba(16, 32, 36, 0.35);
        outline-offset: 1px;
      }
    `;
    document.head.appendChild(style);
    choiceStylesInjected = true;
  }

  function setChoiceState(btn, active) {
    if (!btn) return;
    btn.dataset.active = active ? "true" : "false";
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  // -----------------------------
  // Time / download helpers
  // -----------------------------
  function todayStamp() {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = renderComponent({ tag: "a", attrs: { href: url, download: filename } });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // -----------------------------
  // Intake remoto global: helpers & state
  // -----------------------------
  let intakeFieldIndex = { all: [], comorbidities: [], medications: [], branches: {} };
  let intakeFieldMeta = {};
  const emptyIntakeDerived = () => ({ alerts: [], evaluation: [], treatment: [] });

  function getIntakeConfig() {
    try {
      return window.intakeRemoteConfig || null;
    } catch (_) {
      return null;
    }
  }

  function resetIntakeIndex() {
    intakeFieldIndex = { all: [], comorbidities: [], medications: [], branches: {} };
    intakeFieldMeta = {};
  }

  function collectSectionFields(sections = []) {
    const out = [];
    (sections || []).forEach((sec) => {
      (sec.fields || []).forEach((f) => out.push(f));
    });
    return out;
  }

  function makeIntakeSectionKey(scope, sectionId) {
    return `${scope}:${sectionId}`;
  }

  function buildEmptyIntakeState() {
    const cfg = getIntakeConfig();
    resetIntakeIndex();

    const values = {};
    const uiCollapsed = {};
    if (!cfg) return { values, uiCollapsed };

    const register = (fields, bucket, branchKey) => {
      if (!Array.isArray(fields)) return;
      fields.forEach((f) => {
        if (!f || !f.id) return;
        values[f.id] = f.default ?? (f.type === "boolean" ? null : "");
        intakeFieldIndex.all.push(f.id);
        if (bucket === "comorbidities") intakeFieldIndex.comorbidities.push(f.id);
        if (bucket === "medications") intakeFieldIndex.medications.push(f.id);
        if (bucket === "branch" && branchKey) {
          if (!intakeFieldIndex.branches[branchKey]) intakeFieldIndex.branches[branchKey] = [];
          intakeFieldIndex.branches[branchKey].push(f.id);
        }
        intakeFieldMeta[f.id] = { label: f.label || f.id, bucket, branch: branchKey || null };
      });
    };

    if (cfg.comorbidities) {
      const key = makeIntakeSectionKey("global", "comorbidities");
      uiCollapsed[key] = false;
      register(cfg.comorbidities.fields, "comorbidities");
    }
    if (cfg.medications) {
      const key = makeIntakeSectionKey("global", "medications");
      uiCollapsed[key] = false;
      register(cfg.medications.fields, "medications");
    }

    (cfg.branches || []).forEach((b) => {
      (b.sections || []).forEach((sec, idx) => {
        const secKey = makeIntakeSectionKey(b.key, idx);
        uiCollapsed[secKey] = false;
        register(sec.fields, "branch", b.key);
      });
    });

    return { values, uiCollapsed };
  }

  function hydrateIntakeState(existing) {
    const base = buildEmptyIntakeState();
    if (!existing) return base;
    const incomingValues = existing.values || existing;
    base.values = { ...base.values, ...(incomingValues || {}) };
    base.uiCollapsed = { ...base.uiCollapsed, ...(existing.uiCollapsed || {}) };
    return base;
  }

  // -----------------------------
  // Globals / State
  // -----------------------------
  const state = {
    patientData: {},
    intake: buildEmptyIntakeState(),
    intakeDerived: { global: emptyIntakeDerived(), scopes: {} },
    activeModules: [], // [{instanceId, key, title, icon, tests, numeric, text, ui, computed}]
    meta: { version: APP_VERSION, updatedAt: null },
  };

  const livePanelRefs = {
    root: null,
    desktopContent: null,
    drawerContent: null,
    drawer: null,
    toggle: null,
  };
  let livePanelRenderPending = false;

  // -----------------------------
  // Patient inputs + BMI injection
  // -----------------------------
  const patientInputIds = [
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
  ];

  function getPatientEl(id) {
    return document.getElementById(id);
  }

  function ensureWeightHeightBMI() {
    // Insert after Edad field (patient-age) inside the same grid row
    const ageInput = getPatientEl("patient-age");
    if (!ageInput) return;

    if (getPatientEl("patient-weight") && getPatientEl("patient-height") && getPatientEl("patient-bmi")) return;

    const ageCol = ageInput.closest("div");
    const grid = ageCol?.parentElement;
    if (!grid) return;

    const weightCol = renderComponent({
      tag: "div",
      className: "md:col-span-2",
      children: [
        renderComponent({ tag: "label", className: "aum-label", text: "Peso" }),
        renderComponent({
          tag: "input",
          className: "aum-input text-center",
          attrs: { type: "number", id: "patient-weight", placeholder: "kg", min: "0", step: "0.1" },
        }),
      ],
    });

    const heightCol = renderComponent({
      tag: "div",
      className: "md:col-span-2",
      children: [
        renderComponent({ tag: "label", className: "aum-label", text: "Estatura" }),
        renderComponent({
          tag: "input",
          className: "aum-input text-center",
          attrs: { type: "number", id: "patient-height", placeholder: "cm", min: "0", step: "0.1" },
        }),
      ],
    });

    const bmiCol = renderComponent({
      tag: "div",
      className: "md:col-span-2",
      children: [
        renderComponent({ tag: "label", className: "aum-label", text: "IMC" }),
        renderComponent({
          tag: "input",
          className: "aum-input text-center",
          attrs: { type: "text", id: "patient-bmi", placeholder: "-", readonly: "readonly" },
        }),
      ],
    });

    // Insert right after age column
    grid.insertBefore(weightCol, ageCol.nextSibling);
    grid.insertBefore(heightCol, weightCol.nextSibling);
    grid.insertBefore(bmiCol, heightCol.nextSibling);

    // Attach listeners
    const weight = getPatientEl("patient-weight");
    const height = getPatientEl("patient-height");
    const bmi = getPatientEl("patient-bmi");
    const onChange = () => {
      const w = Number(weight.value);
      const hCm = Number(height.value);
      if (Number.isFinite(w) && w > 0 && Number.isFinite(hCm) && hCm > 0) {
        const h = hCm / 100;
        const bmiVal = w / (h * h);
        bmi.value = Number.isFinite(bmiVal) ? bmiVal.toFixed(1) : "-";
        setPatientData("patient-weight", w);
        setPatientData("patient-height", hCm);
        setPatientData("patient-bmi", bmi.value);
      } else {
        bmi.value = "-";
        setPatientData("patient-weight", weight.value ? w : "");
        setPatientData("patient-height", height.value ? hCm : "");
        setPatientData("patient-bmi", "");
      }
    };
    weight.addEventListener("input", onChange);
    height.addEventListener("input", onChange);
  }

  function computeAgeFromDOB(dobStr) {
    if (!dobStr) return "";
    const dob = new Date(dobStr);
    if (Number.isNaN(dob.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? String(age) : "";
  }

  function setPatientData(id, value) {
    state.patientData[id] = value;
    scheduleLivePanelRender();
    scheduleAutosave();
  }

  function bindPatientInputs() {
    // Fill state from DOM initial values
    for (const id of patientInputIds) {
      const el = getPatientEl(id);
      if (!el) continue;
      state.patientData[id] = el.value ?? "";
    }

    // Attach listeners
    for (const id of patientInputIds) {
      const el = getPatientEl(id);
      if (!el) continue;

      if (id === "patient-dob") {
        el.addEventListener("change", () => {
          const age = computeAgeFromDOB(el.value);
          const ageEl = getPatientEl("patient-age");
          if (ageEl) ageEl.value = age || "-";
          setPatientData("patient-dob", el.value);
          setPatientData("patient-age", age || "");
          // re-evaluate logic where age matters
          evaluateAllLogic();
        });
        continue;
      }

      if (id === "patient-age") {
        // read-only - keep in state
        continue;
      }

      el.addEventListener("input", () => setPatientData(id, el.value));
    }

    // Backward-compat for inline onchange="calculateAge()"
    window.calculateAge = () => {
      const dob = getPatientEl("patient-dob")?.value || "";
      const age = computeAgeFromDOB(dob);
      const ageEl = getPatientEl("patient-age");
      if (ageEl) ageEl.value = age || "-";
      setPatientData("patient-dob", dob);
      setPatientData("patient-age", age || "");
      evaluateAllLogic();
    };

    const bindRadioGroup = (name, stateKey) => {
      const nodes = $$(`input[type="radio"][name="${name}"]`);
      if (!nodes.length) return;
      const sync = () => {
        const sel = nodes.find((n) => n.checked);
        setPatientData(stateKey, sel ? sel.value : "");
      };
      nodes.forEach((node) => node.addEventListener("change", sync));
      sync();
    };

    bindRadioGroup("dominance", "patient-dominance");
    bindRadioGroup("sex", "patient-sex");
    bindRadioGroup("consent", "patient-consent");
  }

  // -----------------------------
  // Intake remoto global (render siempre visible)
  // -----------------------------
  function setIntakeValue(id, value) {
    if (!state.intake) state.intake = buildEmptyIntakeState();
    state.intake.values[id] = value;
    renderAllIntakeInsights();
    evaluateAllLogic();
    scheduleLivePanelRender();
    scheduleAutosave();
  }

  function toggleIntakeSection(secKey) {
    if (!state.intake || !state.intake.uiCollapsed) return;
    state.intake.uiCollapsed[secKey] = !state.intake.uiCollapsed[secKey];
    const content = $(`[data-intake-section-content="${secKey}"]`);
    const chev = $(`[data-intake-chevron="${secKey}"]`);
    if (content) content.hidden = !!state.intake.uiCollapsed[secKey];
    if (chev) chev.classList.toggle("rotate-180", !state.intake.uiCollapsed[secKey]);
    scheduleAutosave();
  }

  function pickIntake(ids = []) {
    const out = {};
    ids.forEach((id) => {
      out[id] = state.intake?.values?.[id];
    });
    return out;
  }

  function intakeRuleApplies(rule, branchKey) {
    const scopes = Array.isArray(rule?.appliesTo) && rule.appliesTo.length ? rule.appliesTo : ["all"];
    return scopes.includes("all") || scopes.includes(branchKey);
  }

  function getModuleIntakeScope(module, tpl) {
    if (module?.scope) return module.scope;
    if (tpl?.scope) return tpl.scope;
    const cfg = getIntakeConfig();
    if (cfg && Array.isArray(cfg.branches)) {
      const match = cfg.branches.find((b) => b.key === module?.key || b.key === tpl?.key);
      if (match) return match.key;
    }
    return "all";
  }

  function deriveIntakeOutcomes(branchKey) {
    const cfg = getIntakeConfig();
    if (!cfg) return emptyIntakeDerived();

    const ctx = {
      branchKey,
      values: state.intake?.values || {},
      comorbidities: pickIntake(intakeFieldIndex.comorbidities),
      medications: pickIntake(intakeFieldIndex.medications),
    };

    const safeCheck = (rule) => {
      try {
        return typeof rule.when === "function" ? rule.when(ctx) : false;
      } catch (_) {
        return false;
      }
    };

    const alerts = (cfg.logic?.alerts || []).filter((r) => intakeRuleApplies(r, branchKey) && safeCheck(r));
    const evaluation = (cfg.logic?.evaluation || []).filter((r) => intakeRuleApplies(r, branchKey) && safeCheck(r));
    const treatment = (cfg.logic?.treatment || []).filter((r) => intakeRuleApplies(r, branchKey) && safeCheck(r));

    return {
      alerts,
      evaluation: evaluation.map((r) => r.text),
      treatment: treatment.map((r) => r.text),
    };
  }

  function intakeList(items, emptyText) {
    if (!items || items.length === 0) {
      return renderComponent({ tag: "div", className: "text-xs text-gray-500", text: emptyText || "Sin hallazgos críticos." });
    }
    return renderComponent({
      tag: "ul",
      className: "list-disc pl-4 space-y-1 text-sm text-gray-800",
      children: items.map((txt) => renderComponent({ tag: "li", text: txt })),
    });
  }

  function uniqueList(list = []) {
    const seen = new Set();
    const out = [];
    list.forEach((item) => {
      const key = String(item || "").trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  // -----------------------------
  // Live panel (real-time summary)
  // -----------------------------
  function scheduleLivePanelRender() {
    if (livePanelRenderPending) return;
    livePanelRenderPending = true;
    const cb = () => {
      livePanelRenderPending = false;
      renderLivePanel();
    };
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(cb);
    else setTimeout(cb, 16);
  }

  function setDrawerOpen(open) {
    if (!livePanelRefs.drawer) return;
    livePanelRefs.drawer.classList.toggle("translate-y-0", !!open);
    livePanelRefs.drawer.classList.toggle("translate-y-[68%]", !open);
    livePanelRefs.drawer.classList.toggle("pointer-events-none", !open);
    livePanelRefs.drawer.classList.toggle("pointer-events-auto", !!open);
    if (livePanelRefs.toggle) {
      livePanelRefs.toggle.setAttribute("aria-pressed", open ? "true" : "false");
    }
  }

  function ensureLivePanelShell() {
    if (livePanelRefs.root) return;

    const desktopContent = renderComponent({ tag: "div", className: "space-y-3", attrs: { "data-live-panel-content": "desktop" } });
    const desktop = renderComponent({
      tag: "aside",
      className: "hidden lg:block fixed right-4 top-28 w-[320px] max-h-[calc(100vh-140px)] overflow-y-auto z-40 pointer-events-auto",
      children: [
        renderComponent({
          tag: "div",
          className: "bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-gray-200 p-4 space-y-3",
          children: [
            renderComponent({
              tag: "div",
              className: "flex items-center justify-between",
              children: [
                renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase text-brand-dark tracking-wide", text: "Panel en tiempo real" }),
                renderComponent({ tag: "div", className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-accent/30 text-brand-dark", text: "Live" }),
              ],
            }),
            desktopContent,
          ],
        }),
      ],
    });

    const drawerContent = renderComponent({ tag: "div", className: "space-y-3", attrs: { "data-live-panel-content": "drawer" } });
    const drawer = renderComponent({
      tag: "div",
      className: "fixed inset-x-0 bottom-0 lg:hidden z-50 transform translate-y-[68%] transition-transform duration-300 ease-out pointer-events-none",
      attrs: { role: "complementary" },
      children: [
        renderComponent({
          tag: "div",
          className: "mx-3 mb-4 rounded-3xl shadow-2xl border border-gray-200 bg-white p-4 pb-5 max-h-[70vh] overflow-y-auto pointer-events-auto",
          children: [
            renderComponent({
              tag: "div",
              className: "flex items-center justify-between mb-2",
              children: [
                renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase text-brand-dark tracking-wide", text: "Panel en tiempo real" }),
                renderComponent({
                  tag: "button",
                  className: "text-brand-dark text-sm font-semibold px-3 py-1 rounded-full bg-brand-accent/40 hover:bg-brand-accent/60 transition-colors",
                  attrs: { type: "button" },
                  text: "Cerrar",
                  on: { click: () => setDrawerOpen(false) },
                }),
              ],
            }),
            drawerContent,
          ],
        }),
      ],
    });

    const toggle = renderComponent({
      tag: "button",
      className: "lg:hidden fixed bottom-28 right-4 z-50 bg-brand-dark text-white px-4 py-3 rounded-full shadow-xl flex items-center gap-2",
      attrs: { type: "button", "aria-pressed": "false" },
      on: { click: () => setDrawerOpen(!livePanelRefs.drawer?.classList.contains("translate-y-0")) },
      children: [iconEl("fa-chart-line"), renderComponent({ tag: "span", className: "font-bold text-sm", text: "Panel" })],
    });

    document.body.appendChild(desktop);
    document.body.appendChild(drawer);
    document.body.appendChild(toggle);

    livePanelRefs.root = desktop;
    livePanelRefs.desktopContent = desktopContent;
    livePanelRefs.drawerContent = drawerContent;
    livePanelRefs.drawer = drawer;
    livePanelRefs.toggle = toggle;
  }

  function panelSection(title, icon, content) {
    return {
      className: "rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm",
      children: [
        {
          tag: "div",
          className: "flex items-center gap-2 text-xs font-extrabold uppercase text-brand-dark tracking-wide",
          children: [iconEl(icon || "fa-circle-info"), { tag: "span", text: title }],
        },
        ...content,
      ],
    };
  }

  function pillList(items, emptyText, tone = "default") {
    if (!items || items.length === 0) {
      return { tag: "div", className: "text-xs text-gray-500", text: emptyText };
    }
    const palette =
      tone === "danger"
        ? "bg-red-50 text-red-800 border border-red-100"
        : tone === "warning"
        ? "bg-amber-50 text-amber-800 border border-amber-100"
        : "bg-gray-50 text-gray-800 border border-gray-100";
    return {
      tag: "div",
      className: "flex flex-wrap gap-2",
      children: items.map((txt) => ({
        tag: "span",
        className: `px-3 py-1 rounded-full text-xs font-semibold ${palette}`,
        text: txt,
      })),
    };
  }

  function isFieldAnswered(module, field) {
    if (!field || !field.id) return false;
    if (field.type === "boolean") return triValue(module.tests?.[field.id]) !== null;
    if (field.type === "numeric") {
      const v = module.numeric?.[field.id];
      if (field.bilateral) return v && isNum(v.L) && isNum(v.R);
      return isNum(v);
    }
    const val = module.text?.[field.id];
    return !!String(val || "").trim();
  }

  function sectionProgressSummary(module, tpl) {
    const sections = [];
    (tpl.sections || []).forEach((sec) => {
      const total = (sec.fields || []).length;
      let answered = 0;
      (sec.fields || []).forEach((f) => {
        if (isFieldAnswered(module, f)) answered += 1;
      });
      sections.push({ title: sec.title || "Sección", answered, total });
    });
    return sections;
  }

  function collectActiveComorbidities() {
    const values = state.intake?.values || {};
    return (intakeFieldIndex.comorbidities || [])
      .filter((id) => values[id] === true)
      .map((id) => intakeFieldMeta[id]?.label || id);
  }

  function collectIntakeAlertsBySeverity(sev) {
    const out = [];
    const seen = new Set();
    const scopes = Object.values(state.intakeDerived?.scopes || {});
    const append = (list = []) => {
      list.forEach((a) => {
        const key = a.id || a.title;
        if (!key || seen.has(key)) return;
        if (sev && a.severity !== sev) return;
        seen.add(key);
        out.push(a);
      });
    };
    append(state.intakeDerived?.global?.alerts || []);
    scopes.forEach((s) => append(s.alerts || []));
    return out;
  }

  function collectIntakeConsiderations() {
    const evals = [...(state.intakeDerived?.global?.evaluation || [])];
    const tx = [...(state.intakeDerived?.global?.treatment || [])];
    Object.values(state.intakeDerived?.scopes || {}).forEach((s) => {
      evals.push(...(s.evaluation || []));
      tx.push(...(s.treatment || []));
    });
    return uniqueList([...evals, ...tx]);
  }

  function collectModuleSummaries() {
    return state.activeModules.map((m) => {
      const tpl = getModuleTemplate(m.key);
      const sections = sectionProgressSummary(m, tpl);
      const totals = sections.reduce(
        (acc, sec) => {
          acc.answered += sec.answered;
          acc.total += sec.total;
          return acc;
        },
        { answered: 0, total: 0 }
      );
      const alerts = m.computed?.alerts || [];
      const reasoning = m.computed?.reasoning;
      const topHypotheses = (reasoning?.hypotheses || []).map((h) => ({
        title: h.title,
        score: h.score,
        status: h.triggered ? "Activa" : "Parcial",
      }));
      const planPhase = reasoning?.plan?.phase || derivePhaseFromIrritability(getIrritability(m, tpl));
      const planHasAlerts = !!reasoning?.plan?.hasAlerts;
      return {
        title: tpl.title || m.title,
        sections,
        progress: { answered: totals.answered, total: totals.total },
        alerts: alerts.map((a) => ({ title: a.title || "Alerta", severity: a.severity || "info" })),
        hypotheses: topHypotheses.slice(0, 3),
        planPhase,
        planHasAlerts,
      };
    });
  }

  function collectOutcomeSummaries() {
    const res = [];
    state.activeModules.forEach((m) => {
      const tpl = getModuleTemplate(m.key);
      const name = tpl.title || m.title;
      const hasSpadi = Object.keys(m.numeric || {}).some((id) => id.startsWith("spadi_"));
      const sp = m.computed?.spadi;
      if (sp && hasSpadi) {
        res.push({
          label: `${name} · SPADI`,
          type: "spadi",
          score: sp.totalPct,
          missing: sp.missing,
          complete: sp.missing === 0,
        });
      }
      const hasDash = Object.keys(m.numeric || {}).some((id) => id.startsWith("dash_"));
      const da = m.computed?.dash;
      if (da && hasDash) {
        res.push({
          label: `${name} · DASH`,
          type: "dash",
          score: da.total,
          missing: da.missing,
          complete: da.missing === 0,
        });
      }
    });
    return res;
  }

  function buildIdentitySection() {
    const items = [
      { label: "Nombre", value: state.patientData["patient-name"] || "—" },
      { label: "Edad", value: state.patientData["patient-age"] ? `${state.patientData["patient-age"]} años` : "—" },
      { label: "Dominancia", value: state.patientData["patient-dominance"] || "—" },
      { label: "IMC", value: state.patientData["patient-bmi"] || "—" },
    ];
    return panelSection(
      "Identificación",
      "fa-id-card-clip",
      [
        {
          tag: "div",
          className: "grid grid-cols-2 gap-2",
          children: items.map((it) => ({
            tag: "div",
            className: "p-3 rounded-xl bg-gray-50 border border-gray-100",
            children: [
              { tag: "div", className: "text-[11px] font-semibold text-gray-500 uppercase", text: it.label },
              { tag: "div", className: "text-sm font-bold text-brand-dark truncate", text: it.value },
            ],
          })),
        },
      ]
    );
  }

  function buildIntakeSection() {
    const comorbidities = collectActiveComorbidities();
    const redFlags = collectIntakeAlertsBySeverity("danger").map((a) => a.title || a.description || "Red flag");
    const considerations = collectIntakeConsiderations();

    return panelSection("Intake remoto", "fa-heart-pulse", [
      { tag: "div", className: "text-xs font-extrabold text-brand-dark", text: "Comorbilidades" },
      pillList(comorbidities, "Sin comorbilidades marcadas."),
      { tag: "div", className: "text-xs font-extrabold text-brand-dark mt-2", text: "Red flags" },
      pillList(redFlags, "Sin red flags activas.", "danger"),
      { tag: "div", className: "text-xs font-extrabold text-brand-dark mt-2", text: "Consideraciones" },
      pillList(considerations, "Sin consideraciones adicionales."),
    ]);
  }

  function buildModulesSection() {
    const modules = collectModuleSummaries();
    if (!modules.length) {
      return panelSection("Módulos activos", "fa-layer-group", [{ tag: "div", className: "text-xs text-gray-500", text: "Sin evaluaciones en curso." }]);
    }

    const moduleCards = modules.map((m) => {
      const progressPct = m.progress.total ? Math.round((m.progress.answered / m.progress.total) * 100) : 0;
      const progressText = m.progress.total ? `${m.progress.answered}/${m.progress.total}` : "0/0";
      const alerts = m.alerts || [];

      return {
        className: "rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2",
        children: [
          {
            tag: "div",
            className: "flex items-center justify-between gap-2",
            children: [
              { tag: "div", className: "font-bold text-brand-dark text-sm truncate", text: m.title },
              {
                tag: "span",
                className: "text-[11px] font-semibold px-2 py-1 rounded-full bg-brand-accent/40 text-brand-dark",
                text: `${progressPct}% (${progressText})`,
              },
            ],
          },
          {
            tag: "div",
            className: "flex flex-wrap gap-2",
            children: m.sections.map((sec) => ({
              tag: "span",
              className: "px-2 py-1 rounded-lg text-[11px] font-semibold bg-white border border-gray-200",
              text: `${sec.title} · ${sec.answered}/${sec.total || 0}`,
            })),
          },
          {
            tag: "div",
            className: "flex flex-wrap gap-2",
            children:
              alerts.length === 0
                ? [{ tag: "span", className: "text-[11px] text-gray-500", text: "Sin alertas activas." }]
                : alerts.map((a) => ({
                    tag: "span",
                    className: `px-2 py-1 rounded-full text-[11px] font-semibold ${
                      a.severity === "danger"
                        ? "bg-red-100 text-red-800"
                        : a.severity === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`,
                    text: a.title,
                  })),
          },
          {
            tag: "div",
            className: "space-y-1",
            children: [
              { tag: "div", className: "text-[11px] font-extrabold uppercase text-brand-dark", text: "Razonamiento" },
              {
                tag: "div",
                className: "flex flex-col gap-1",
                children:
                  m.hypotheses && m.hypotheses.length
                    ? m.hypotheses.map((h) => ({
                        tag: "div",
                        className: "flex items-center justify-between rounded-lg bg-white border border-gray-200 px-2 py-1",
                        children: [
                          { tag: "div", className: "text-[11px] font-semibold text-brand-dark truncate", text: h.title },
                          {
                            tag: "div",
                            className: "flex items-center gap-1",
                            children: [
                              { tag: "span", className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-accent/40 text-brand-dark", text: `${h.score} pts` },
                              { tag: "span", className: "text-[10px] font-semibold text-gray-600", text: h.status },
                            ],
                          },
                        ],
                      }))
                    : [{ tag: "div", className: "text-[11px] text-gray-500", text: "Completa hallazgos para ver hipótesis." }],
              },
              {
                tag: "div",
                className: "flex items-center gap-2",
                children: [
                  { tag: "span", className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-accent/20 text-brand-dark", text: m.planPhase || "Fase pendiente" },
                  m.planHasAlerts
                    ? { tag: "span", className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800", text: "Plan C activo" }
                    : { tag: "span", className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800", text: "Sin alertas críticas" },
                ],
              },
            ],
          },
        ],
      };
    });

    return panelSection("Módulos activos", "fa-layer-group", moduleCards);
  }

  function buildOutcomeSection() {
    const outcomes = collectOutcomeSummaries();
    if (!outcomes.length) {
      return panelSection("SPADI / DASH", "fa-square-poll-vertical", [{ tag: "div", className: "text-xs text-gray-500", text: "Aún sin PROMs calculados." }]);
    }

    return panelSection(
      "SPADI / DASH",
      "fa-square-poll-vertical",
      outcomes.map((o) => {
        const isComplete = o.complete && o.score !== null && o.score !== undefined;
        const baseCls = isComplete ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-amber-50 text-amber-800 border-amber-100";
        const scoreText =
          o.score !== null && o.score !== undefined
            ? `${o.type === "spadi" ? `${o.score.toFixed(1)}%` : o.score.toFixed(1)}`
            : "Incompleto";
        const missingText = o.missing > 0 ? ` · Faltan ${o.missing}` : "";
        return {
          className: `rounded-xl border p-3 ${baseCls}`,
          children: [
            { tag: "div", className: "text-sm font-bold", text: o.label },
            { tag: "div", className: "text-xs font-semibold", text: `${scoreText}${missingText}` },
          ],
        };
      })
    );
  }

  function renderLivePanel() {
    ensureLivePanelShell();
    const buildSections = () => [buildIdentitySection(), buildIntakeSection(), buildModulesSection(), buildOutcomeSection()];
    const renderInto = (container) => {
      if (!container) return;
      const sections = buildSections().map((cfg) => renderComponent(cfg));
      container.replaceChildren(...sections);
    };
    renderInto(livePanelRefs.desktopContent);
    renderInto(livePanelRefs.drawerContent);
  }

  function renderIntakeResults(branchKey) {
    const result = deriveIntakeOutcomes(branchKey);
    state.intakeDerived.scopes[branchKey] = result;

    const alertsWrap = $(`[data-intake-alerts="${branchKey}"]`);
    if (alertsWrap) {
      alertsWrap.replaceChildren();
      if (result.alerts.length === 0) {
        alertsWrap.appendChild(intakeList([], "Sin alertas clínicas activas."));
      } else {
        result.alerts.forEach((r) => alertsWrap.appendChild(renderAlertCard(r)));
      }
    }

    const evalWrap = $(`[data-intake-eval="${branchKey}"]`);
    if (evalWrap) {
      evalWrap.replaceChildren();
      evalWrap.appendChild(intakeList(result.evaluation, "Sin consideraciones especiales de evaluación."));
    }

    const txWrap = $(`[data-intake-tx="${branchKey}"]`);
    if (txWrap) {
      txWrap.replaceChildren();
      txWrap.appendChild(intakeList(result.treatment, "Sin modificaciones relevantes de tratamiento."));
    }
  }

  function renderAllIntakeInsights() {
    const cfg = getIntakeConfig();
    if (!cfg) return;
    state.intakeDerived = { global: emptyIntakeDerived(), scopes: {} };
    state.intakeDerived.global = deriveIntakeOutcomes("all");
    (cfg.branches || []).forEach((b) => renderIntakeResults(b.key));
  }

  function renderIntakeField(field) {
    if (!field || !field.id) return renderComponent({ tag: "div" });
    const value = state.intake?.values?.[field.id];

    if (field.type === "boolean") {
      return triBoolField({
        module: { tests: state.intake.values || {} },
        field,
        enableSeverity: false,
        onChange: (next) => setIntakeValue(field.id, next),
      });
    }

    if (field.type === "select") {
      return renderComponent({
        tag: "div",
        attrs: { "data-field": `intake:${field.id}` },
        children: [
          selectField({
            value: value ?? "",
            field,
            options: field.options || [],
            onChange: (v) => setIntakeValue(field.id, v),
          }),
        ],
      });
    }

    if (field.type === "textarea") {
      return renderComponent({
        tag: "div",
        attrs: { "data-field": `intake:${field.id}` },
        children: [
          textareaField({
            value: value || "",
            field,
            onChange: (v) => setIntakeValue(field.id, v),
          }),
        ],
      });
    }

    return renderComponent({
      tag: "div",
      attrs: { "data-field": `intake:${field.id}` },
      children: [
        textField({
          value: value || "",
          field,
          onChange: (v) => setIntakeValue(field.id, v),
        }),
      ],
    });
  }

  function renderIntakeSection(section, branchKey, secIndex) {
    const gridCls = section.style === "grid2" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3";
    const secKey = makeIntakeSectionKey(branchKey || "global", secIndex);
    const isCollapsed = !!state.intake?.uiCollapsed?.[secKey];
    const content = renderComponent({
      tag: "div",
      attrs: { "data-intake-section-content": secKey },
      className: "p-4",
      hidden: isCollapsed,
      children: [
        renderComponent({
          tag: "div",
          className: gridCls,
          children: (section.fields || []).map((f) => renderIntakeField(f)),
        }),
      ],
    });

    const chevron = renderComponent({
      tag: "i",
      className: `fa-solid fa-chevron-down transition-transform ${isCollapsed ? "" : "rotate-180"}`.trim(),
      attrs: { "data-intake-chevron": secKey, "aria-hidden": "true" },
    });

    const header = renderComponent({
      tag: "button",
      className: "w-full text-left flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors",
      attrs: { type: "button" },
      on: {
        click: () => toggleIntakeSection(secKey),
      },
      children: [
        renderComponent({
          tag: "div",
          className: "flex items-center gap-3 min-w-0",
          children: [
            renderComponent({
              tag: "div",
              className: "w-8 h-8 rounded-full bg-brand-accent/15 flex items-center justify-center text-brand-accent",
              children: [iconEl(section.icon || "fa-clipboard-list")],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: section.title || "Sección" }),
                section.subtitle
                  ? renderComponent({ tag: "div", className: "text-xs text-gray-500", text: section.subtitle })
                  : null,
              ],
            }),
          ],
        }),
        chevron,
      ],
    });

    return renderComponent({
      tag: "div",
      className: "rounded-2xl border border-gray-100 bg-white overflow-hidden",
      children: [header, content],
    });
  }

  function renderIntakeResultsGrid(branchKey) {
    return renderComponent({
      tag: "div",
      className: "grid grid-cols-1 lg:grid-cols-3 gap-3",
      children: [
        renderComponent({
          tag: "div",
          className: "rounded-2xl border border-gray-100 bg-white p-4 space-y-2",
          children: [
            renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase text-brand-dark", text: "Alertas" }),
            renderComponent({ tag: "div", attrs: { "data-intake-alerts": branchKey }, className: "space-y-3" }),
          ],
        }),
        renderComponent({
          tag: "div",
          className: "rounded-2xl border border-gray-100 bg-white p-4 space-y-2",
          children: [
            renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase text-brand-dark", text: "Consideraciones de evaluación" }),
            renderComponent({ tag: "div", attrs: { "data-intake-eval": branchKey }, className: "space-y-2" }),
          ],
        }),
        renderComponent({
          tag: "div",
          className: "rounded-2xl border border-gray-100 bg-white p-4 space-y-2",
          children: [
            renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase text-brand-dark", text: "Consideraciones de tratamiento" }),
            renderComponent({ tag: "div", attrs: { "data-intake-tx": branchKey }, className: "space-y-2" }),
          ],
        }),
      ],
    });
  }

  function renderIntakeBranch(branch) {
    return renderComponent({
      tag: "section",
      className: "rounded-3xl border border-gray-200 shadow-sm bg-white overflow-hidden",
      children: [
        renderComponent({
          tag: "div",
          className: "bg-brand-dark p-5 flex items-center gap-3",
          children: [
            renderComponent({
              tag: "div",
              className: "w-11 h-11 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent",
              children: [iconEl(branch.icon || "fa-person-rays")],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: "text-white font-extrabold text-lg", text: branch.title || "Rama" }),
                renderComponent({ tag: "div", className: "text-white/70 text-sm", text: "Disponible en todas las evaluaciones" }),
              ],
            }),
          ],
        }),
        renderComponent({
          tag: "div",
          className: "p-5 space-y-4",
          children: [
            ...(branch.sections || []).map((sec, idx) => renderIntakeSection(sec, branch.key, idx)),
            renderIntakeResultsGrid(branch.key),
          ],
        }),
      ],
    });
  }

  function renderIntakeRemote() {
    const root = $("#intake-remote-root");
    const cfg = getIntakeConfig();
    if (!root || !cfg) return;

    root.replaceChildren();

    if (cfg.comorbidities || cfg.medications) {
      const topGrid = renderComponent({ tag: "div", className: "grid grid-cols-1 lg:grid-cols-2 gap-4" });
      if (cfg.comorbidities) topGrid.appendChild(renderIntakeSection(cfg.comorbidities, "global", "comorbidities"));
      if (cfg.medications) topGrid.appendChild(renderIntakeSection(cfg.medications, "global", "medications"));
      root.appendChild(topGrid);
    }

    (cfg.branches || []).forEach((branch) => root.appendChild(renderIntakeBranch(branch)));

    renderAllIntakeInsights();
  }

  // -----------------------------
  // Module templates
  // -----------------------------
  function isOutcomeSectionTitle(title = "") {
    const t = (title || "").toLowerCase();
    return t.includes("spadi") || t.includes("dash") || t.includes("outcome");
  }

  function getOutcomeTypeFromTitle(title = "") {
    const t = (title || "").toLowerCase();
    if (t.includes("spadi")) return "spadi";
    if (t.includes("dash")) return "dash";
    return null;
  }

  function getModuleTemplate(typeKey) {
    // Prefer external modules (js/data.js)
    try {
      const cm = window.clinicalModules;
      if (cm && cm[typeKey]) return cm[typeKey];
    } catch (_) {}

    // Fallback: allow a minimal notes module
    return {
      key: typeKey,
      title: typeKey,
      icon: "fa-notes-medical",
      sections: [
        {
          title: "Notas",
          icon: "fa-pen-to-square",
          style: "card",
          fields: [{ id: "notas", label: "Notas", type: "textarea" }],
        },
      ],
      logicRules: [],
    };
  }

  // -----------------------------
  // Stack Engine: add/remove modules
  // -----------------------------
  function makeInstanceId(baseKey) {
    const rnd = Math.random().toString(16).slice(2, 8);
    return `${baseKey}-${Date.now().toString(36)}-${rnd}`;
  }

  function ensureModuleState(template) {
    const moduleState = {
      instanceId: makeInstanceId(template.key),
      key: template.key,
      title: template.title,
      scope: template.scope || "all",
      icon: template.icon || "fa-notes-medical",
      tests: {},
      numeric: {},
      text: {},
      ui: { collapsed: {}, mode: "complete", reasoningCollapsed: false }, // {sectionIndex:true/false}
      computed: { spadi: null, dash: null, alerts: [], reasoning: null },
    };

    // Seed defaults from fields
    (template.sections || []).forEach((sec, secIndex) => {
      // Default collapse: SPADI/DASH collapsed, others expanded
      moduleState.ui.collapsed[secIndex] = isOutcomeSectionTitle(sec.title) ? true : false;

      (sec.fields || []).forEach((f) => {
        if (!f || !f.id) return;
        if (f.type === "boolean") {
          moduleState.tests[f.id] = triEntry(f.default ?? null); // tri-estado con severidad opcional
        } else if (f.type === "numeric") {
          if (f.bilateral) {
            moduleState.numeric[f.id] = f.default && typeof f.default === "object" ? { ...f.default } : { L: null, R: null };
          } else {
            moduleState.numeric[f.id] = f.default ?? null;
          }
        } else {
          moduleState.text[f.id] = f.default ?? "";
        }
      });
    });

    return moduleState;
  }

  function addModule(typeKey) {
    const tpl = getModuleTemplate(typeKey);
    const m = ensureModuleState(tpl);

    state.activeModules.push(m);

    // Render tag + module card
    renderActiveTags();
    renderModuleCard(m, tpl);
    setEmptyStateVisibility();
    evaluateModuleLogic(m, tpl);
    updateModuleScores(m, tpl);
    scheduleLivePanelRender();
    scheduleAutosave();
  }

  function applyModuleMode(module) {
    const card = $(`[data-module-instance="${module.instanceId}"]`);
    if (!card) return;
    const isFast = module.ui.mode === "fast";

    $$(`[data-section-wrap^="${module.instanceId}:"]`, card).forEach((sec) => {
      const isFastSection = sec.dataset.fast === "true";
      sec.hidden = isFast && !isFastSection;
    });

    const notice = $(`[data-mode-notice="${module.instanceId}"]`, card);
    if (notice) notice.hidden = !isFast;

    $$(`[data-mode-button="${module.instanceId}"]`, card).forEach((btn) => {
      const active = btn.dataset.mode === module.ui.mode;
      setChoiceState(btn, active);
    });

    const chip = $(`[data-mode-chip="${module.instanceId}"]`, card);
    if (chip) chip.textContent = isFast ? "Modo Rápido (5 min)" : "Modo Completo";
  }

  function setModuleMode(module, mode) {
    if (!module || !mode) return;
    module.ui.mode = mode;
    applyModuleMode(module);
    scheduleAutosave();
  }

  function removeModule(instanceId) {
    const idx = state.activeModules.findIndex((m) => m.instanceId === instanceId);
    if (idx === -1) return;

    // Remove DOM card
    const card = $(`[data-module-instance="${instanceId}"]`);
    if (card) card.remove();

    state.activeModules.splice(idx, 1);
    renderActiveTags();
    setEmptyStateVisibility();
    scheduleLivePanelRender();
    scheduleAutosave();
  }

  function resetStack() {
    if (state.activeModules.length === 0) return;
    const ok = window.confirm("¿Seguro que quieres limpiar todas las evaluaciones del Stack?");
    if (!ok) return;

    state.activeModules = [];
    const stack = $("#clinical-stack");
    if (stack) {
      $$(".module-card", stack).forEach((n) => n.remove());
    }
    renderActiveTags();
    setEmptyStateVisibility();
    scheduleLivePanelRender();
    scheduleAutosave();
  }

  // -----------------------------
  // Collapsible Sections UI
  // -----------------------------
  function toggleSection(instanceId, secIndex) {
    const m = state.activeModules.find((x) => x.instanceId === instanceId);
    if (!m) return;
    m.ui.collapsed[secIndex] = !m.ui.collapsed[secIndex];
    const content = $(`[data-section-content="${instanceId}:${secIndex}"]`);
    const chevron = $(`[data-section-chevron="${instanceId}:${secIndex}"]`);
    if (content) content.hidden = !!m.ui.collapsed[secIndex];
    if (chevron) chevron.classList.toggle("rotate-180", !m.ui.collapsed[secIndex]);
    scheduleAutosave();
  }

  // -----------------------------
  // Field rendering
  // -----------------------------
  function setTriButtonState(container, entry) {
    const value = triValue(entry);
    const btns = $$("button[data-tri]", container);
    btns.forEach((b) => {
      const v = b.dataset.tri;
      const active =
        (v === "null" && value === null) ||
        (v === "true" && value === true) ||
        (v === "false" && value === false);
      setChoiceState(b, active);
    });
  }

  function triBoolField({ module, field, onChange, enableSeverity = true }) {
    const initial = enableSeverity ? normalizeTriEntry(module.tests?.[field.id]) : module.tests?.[field.id];
    const container = renderComponent({
      tag: "div",
      className: "flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100",
      children: [
        renderComponent({
          tag: "div",
          className: "min-w-0",
          children: [
            renderComponent({ tag: "div", className: "text-sm font-semibold text-brand-dark", text: field.label }),
            field.help
              ? renderComponent({ tag: "div", className: "text-xs text-gray-500 mt-0.5", text: field.help })
              : null,
          ],
        }),
        renderComponent({
          tag: "div",
          className: "flex items-center gap-2",
          children: [
            renderComponent({
              tag: "div",
              className: "flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1",
              children: [
                { tag: "button", className: "aum-choice px-2.5 py-1 rounded-md text-sm font-bold", attrs: { type: "button", "data-tri": "null", title: "No evaluado" }, text: "—" },
                { tag: "button", className: "aum-choice px-2.5 py-1 rounded-md text-sm font-bold", attrs: { type: "button", "data-tri": "false", title: "Negativo" }, text: "−" },
                { tag: "button", className: "aum-choice px-2.5 py-1 rounded-md text-sm font-bold", attrs: { type: "button", "data-tri": "true", title: "Positivo" }, text: "+" },
              ],
              on: {
                click: (e) => {
                  const btn = e.target.closest("button[data-tri]");
                  if (!btn) return;
                  const v = btn.dataset.tri;
                  const next = v === "true" ? true : v === "false" ? false : null;
                  if (enableSeverity) {
                    const current = normalizeTriEntry(module.tests?.[field.id]);
                    const payload = triEntry(next, next === true ? current.severity : null);
                    onChange(payload);
                    setTriButtonState(container, payload);
                    updateSeverityUI(payload);
                  } else {
                    onChange(next);
                    setTriButtonState(container, next);
                  }
                },
              },
            }),
          ],
        }),
      ],
    });

    let severityWrap = null;
    if (enableSeverity) {
      const options = [
        { value: "leve", label: "Leve" },
        { value: "moderado", label: "Moderado" },
        { value: "severo", label: "Severo" },
      ];
      severityWrap = renderComponent({
        tag: "div",
        className: "flex items-center gap-1",
        children: options.map((opt) =>
          renderComponent({
            tag: "button",
            className: "aum-choice px-2.5 py-1 rounded-md text-xs font-bold bg-white text-gray-600",
            attrs: { type: "button", "data-severity": opt.value, title: `Severidad ${opt.label}` },
            text: opt.label,
          })
        ),
        on: {
          click: (e) => {
            const btn = e.target.closest("button[data-severity]");
            if (!btn) return;
            const sel = btn.dataset.severity;
            const current = normalizeTriEntry(module.tests?.[field.id]);
            const payload = triEntry(true, sel);
            onChange(payload);
            setTriButtonState(container, payload);
            updateSeverityUI(payload);
          },
        },
      });
      container.appendChild(
        renderComponent({
          tag: "div",
          className: "flex flex-col gap-1 items-end",
          children: [
            renderComponent({ tag: "div", className: "text-[10px] uppercase font-extrabold text-gray-500", text: "Severidad (opcional)" }),
            severityWrap,
          ],
        })
      );
    }

    function updateSeverityUI(entry) {
      if (!enableSeverity || !severityWrap) return;
      const val = triValue(entry);
      severityWrap.hidden = val !== true;
      const activeSev = triSeverity(entry);
      $$("button[data-severity]", severityWrap).forEach((b) => {
        const active = b.dataset.severity === activeSev;
        setChoiceState(b, active);
      });
    }

    // Initialize
    setTriButtonState(container, initial);
    updateSeverityUI(initial);

    return container;
  }

  function textareaField({ value, field, onChange }) {
    const ta = renderComponent({
      tag: "textarea",
      className: "aum-input min-h-[96px] resize-y",
      attrs: { id: field.id, placeholder: field.placeholder || "" },
    });
    ta.value = value || "";
    ta.addEventListener("input", () => onChange(ta.value));
    return renderComponent({
      tag: "div",
      className: "p-3 bg-white rounded-xl border border-gray-100",
      children: [
        renderComponent({ tag: "div", className: "text-sm font-semibold text-brand-dark mb-2", text: field.label }),
        ta,
      ],
    });
  }

  function textField({ value, field, onChange }) {
    const input = renderComponent({
      tag: "input",
      className: "aum-input",
      attrs: { type: "text", id: field.id, placeholder: field.placeholder || "" },
    });
    input.value = value || "";
    input.addEventListener("input", () => onChange(input.value));
    return renderComponent({
      tag: "div",
      className: "p-3 bg-white rounded-xl border border-gray-100",
      children: [
        renderComponent({ tag: "div", className: "text-sm font-semibold text-brand-dark mb-2", text: field.label }),
        input,
      ],
    });
  }

  function selectField({ value, field, options, onChange }) {
    const select = renderComponent({
      tag: "select",
      className: "aum-input cursor-pointer font-semibold",
      attrs: { id: field.id },
      children: options.map((o) => renderComponent({ tag: "option", attrs: { value: o.value }, text: o.label })),
    });
    select.value = value || "";
    select.addEventListener("change", () => onChange(select.value));
    return renderComponent({
      tag: "div",
      className: "p-3 bg-white rounded-xl border border-gray-100",
      children: [
        renderComponent({ tag: "div", className: "text-sm font-semibold text-brand-dark mb-2", text: field.label }),
        select,
      ],
    });
  }

  function numericTriple({ module, field, value, side, onValueChange, onAfterChange, diffRef }) {
    // Local UI mode per field/side
    const modeKey = `${field.id}:${side || "S"}`;
    module.ui.modes = module.ui.modes || {};
    if (!module.ui.modes[modeKey]) module.ui.modes[modeKey] = "slider"; // slider | exact | quick
    let currentValue = value;

    const valLabel = renderComponent({
      tag: "span",
      className: "text-sm font-bold text-brand-dark",
      text: value === null || value === "" || value === undefined ? "—" : String(value),
    });

    const unitLabel = renderComponent({ tag: "span", className: "text-xs text-gray-500 ml-1", text: field.unit || "" });

    const modeBtn = (k, label) =>
      renderComponent({
        tag: "button",
        className: "aum-choice px-2 py-1 rounded-md text-xs font-bold",
        attrs: { type: "button", "data-mode": k },
        text: label,
      });

    const modeBar = renderComponent({
      tag: "div",
      className: "flex items-center gap-1",
      children: [modeBtn("slider", "Barra"), modeBtn("exact", "Exacto"), modeBtn("quick", "Rápido")],
      on: {
        click: (e) => {
          const b = e.target.closest("button[data-mode]");
          if (!b) return;
          module.ui.modes[modeKey] = b.dataset.mode;
          updateModeUI();
          scheduleAutosave();
        },
      },
    });

    const slider = renderComponent({
      tag: "input",
      className: "w-full",
      attrs: { type: "range", min: String(field.min ?? 0), max: String(field.max ?? 100), step: "1" },
    });
    slider.value = value ?? 0;

    const exact = renderComponent({
      tag: "input",
      className: "aum-input text-center",
      attrs: { type: "number", min: String(field.min ?? 0), max: String(field.max ?? 9999), step: "1" },
    });
    exact.value = value ?? "";

    const quickButtons = (() => {
      if (field.quick) {
        return [
          { key: "primary", label: field.quick.primaryLabel || "Opción 1", value: field.quick.primaryValue ?? null },
          { key: "secondary", label: field.quick.secondaryLabel || "Opción 2", value: field.quick.secondaryValue ?? null },
          { key: "clear", label: field.quick.clearLabel || "Vaciar", value: null },
        ];
      }
      return [
        { key: "normal", label: "Normal", value: field.normal ?? null },
        { key: "limited", label: "Limitado", value: field.limited ?? (field.normal != null ? Math.round(field.normal * 0.7) : null) },
        { key: "clear", label: "Vaciar", value: null },
      ];
    })();

    const quickWrap = renderComponent({
      tag: "div",
      className: "flex items-center gap-2",
      children: quickButtons.map((btn) =>
        renderComponent({
          tag: "button",
          className: "aum-choice px-3 py-2 rounded-lg bg-white text-sm font-bold",
          attrs: { type: "button", "data-quick": btn.key },
          text: btn.label,
        })
      ),
      on: {
        click: (e) => {
          const b = e.target.closest("button[data-quick]");
          if (!b) return;
          const cfg = quickButtons.find((q) => q.key === b.dataset.quick);
          if (!cfg) return;
          setValue(cfg.value ?? null);
          onAfterChange?.();
        },
      },
    });

    const modeArea = renderComponent({
      tag: "div",
      className: "mt-2",
      children: [slider, exact, quickWrap],
    });

    const headerLine = renderComponent({
      tag: "div",
      className: "flex items-center justify-between gap-3",
      children: [
        renderComponent({
          tag: "div",
          className: "min-w-0",
          children: [
            renderComponent({
              tag: "div",
              className: "text-sm font-semibold text-brand-dark",
              text: side ? `${field.label} (${side})` : field.label,
            }),
            field.help ? renderComponent({ tag: "div", className: "text-xs text-gray-500", text: field.help }) : null,
          ],
        }),
        renderComponent({
          tag: "div",
          className: "flex items-center gap-2 shrink-0",
          children: [
            renderComponent({ tag: "div", className: "flex items-center", children: [valLabel, unitLabel] }),
            modeBar,
          ],
        }),
      ],
    });

    function setValue(next) {
      // reflect in controls
      currentValue = next;
      valLabel.textContent = next === null || next === "" || next === undefined ? "—" : String(next);
      slider.value = String(next ?? 0);
      exact.value = next ?? "";
      refreshQuickButtons();
      onValueChange(next);
      if (diffRef) diffRef();
      scheduleAutosave();
    }

    slider.addEventListener("input", () => setValue(Number(slider.value)));
    slider.addEventListener("change", () => onAfterChange?.());
    exact.addEventListener("input", () => {
      const v = exact.value === "" ? null : Number(exact.value);
      setValue(Number.isFinite(v) ? v : null);
    });
    exact.addEventListener("change", () => onAfterChange?.());

    function setActiveModeButtons() {
      $$("button[data-mode]", modeBar).forEach((b) => {
        const active = b.dataset.mode === module.ui.modes[modeKey];
        setChoiceState(b, active);
      });
    }

    function refreshQuickButtons() {
      $$("button[data-quick]", quickWrap).forEach((b) => {
        const cfg = quickButtons.find((q) => q.key === b.dataset.quick);
        const active = cfg ? (cfg.value ?? null) === (currentValue ?? null) : false;
        setChoiceState(b, active);
      });
    }

    function updateModeUI() {
      setActiveModeButtons();
      const mode = module.ui.modes[modeKey];
      slider.hidden = mode !== "slider";
      exact.hidden = mode !== "exact";
      quickWrap.hidden = mode !== "quick";
      // keep controls synced
      slider.value = String(currentValue ?? 0);
      exact.value = currentValue ?? "";
      refreshQuickButtons();
    }

    // init
    updateModeUI();
    setActiveModeButtons();

    return renderComponent({
      tag: "div",
      className: "p-3 bg-gray-50 rounded-xl border border-gray-100",
      children: [headerLine, modeArea],
    });
  }

  function numericField({ module, field, onAfterChange }) {
    const wrap = renderComponent({ tag: "div", className: "space-y-3" });

    if (field.bilateral) {
      const diffText = renderComponent({ tag: "div", className: "text-xs text-gray-500 font-semibold", text: "Δ%: —" });

      const refreshDiff = () => {
        const v = module.numeric[field.id] || { L: null, R: null };
        const L = typeof v.L === "number" ? v.L : null;
        const R = typeof v.R === "number" ? v.R : null;
        const denom = Math.max(L || 0, R || 0);
        if (!denom) {
          diffText.textContent = "Δ%: —";
          diffText.classList.remove("text-red-600");
          diffText.classList.add("text-gray-500");
          return;
        }
        const diff = Math.abs((L || 0) - (R || 0));
        const pct = (diff / denom) * 100;
        diffText.textContent = `Δ%: ${pct.toFixed(0)}%`;
        if (pct > 10) {
          diffText.classList.add("text-red-600");
          diffText.classList.remove("text-gray-500");
        } else {
          diffText.classList.remove("text-red-600");
          diffText.classList.add("text-gray-500");
        }
      };

      const cols = renderComponent({
        tag: "div",
        className: "grid grid-cols-1 md:grid-cols-2 gap-3",
        children: [
          numericTriple({
            module,
            field,
            value: module.numeric[field.id]?.L ?? null,
            side: "L",
            onValueChange: (next) => {
              module.numeric[field.id] = module.numeric[field.id] || { L: null, R: null };
              module.numeric[field.id].L = next;
            },
            onAfterChange,
            diffRef: refreshDiff,
          }),
          numericTriple({
            module,
            field,
            value: module.numeric[field.id]?.R ?? null,
            side: "R",
            onValueChange: (next) => {
              module.numeric[field.id] = module.numeric[field.id] || { L: null, R: null };
              module.numeric[field.id].R = next;
            },
            onAfterChange,
            diffRef: refreshDiff,
          }),
        ],
      });

      wrap.appendChild(
        renderComponent({
          tag: "div",
          className: "flex items-center justify-between",
          children: [
            renderComponent({ tag: "div", className: "text-sm font-bold text-brand-dark", text: field.label }),
            diffText,
          ],
        })
      );
      wrap.appendChild(cols);
      refreshDiff();
      return wrap;
    }

    // unilateral
    return numericTriple({
      module,
      field,
      value: module.numeric[field.id] ?? null,
      onValueChange: (next) => {
        module.numeric[field.id] = next;
      },
      onAfterChange,
    });
  }

  // -----------------------------
  // Module scoring (SPADI / DASH)
  // -----------------------------
  function isNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  function outcomeToneClass(tone) {
    if (tone === "low") return "bg-emerald-100 text-emerald-800";
    if (tone === "moderate") return "bg-amber-100 text-amber-800";
    if (tone === "high") return "bg-orange-100 text-orange-800";
    if (tone === "very-high") return "bg-red-100 text-red-800";
    return "bg-brand-accent/20 text-brand-dark";
  }

  function interpretSpadiScore(score) {
    if (!isNum(score)) return null;
    const thresholds = [
      { max: 20, label: "mínima", tone: "low", rec: "Progresar ejercicios domiciliarios y educación en autocuidado." },
      { max: 40, label: "leve-moderada", tone: "moderate", rec: "Refuerza control de dolor nocturno y movilidad activa gradual." },
      { max: 60, label: "moderada", tone: "high", rec: "Planifica progresión supervisada y seguimiento semanal de síntomas." },
      { max: 80, label: "severa", tone: "high", rec: "Prioriza manejo de dolor y tareas toleradas antes de sobrecargar." },
    ];
    const match = thresholds.find((t) => score <= t.max) || { label: "muy severa", tone: "very-high", rec: "Considera derivación médica y progresión muy graduada." };
    return match;
  }

  function interpretDashScore(score) {
    if (!isNum(score)) return null;
    const thresholds = [
      { max: 15, label: "mínima", tone: "low", rec: "Mantén actividad habitual y ejercicios de mantenimiento." },
      { max: 30, label: "leve", tone: "moderate", rec: "Añade ejercicios funcionales y exposición graduada a tareas retadoras." },
      { max: 50, label: "moderada", tone: "high", rec: "Usa progresión estructurada de carga y monitoriza respuesta 24h." },
    ];
    const match = thresholds.find((t) => score <= t.max) || { label: "severa", tone: "very-high", rec: "Prioriza analgesia, modificaciones laborales/deportivas y reevaluación frecuente." };
    return match;
  }

  function calcSPADI(module) {
    const painIds = Object.keys(module.numeric).filter((id) => id.startsWith("spadi_p"));
    const disIds = Object.keys(module.numeric).filter((id) => id.startsWith("spadi_d"));

    const painVals = painIds.map((id) => module.numeric[id]).filter(isNum);
    const disVals = disIds.map((id) => module.numeric[id]).filter(isNum);

    const totalItems = painIds.length + disIds.length;
    const answered = painVals.length + disVals.length;
    const missing = Math.max(totalItems - answered, 0);

    const painPct = painVals.length ? (painVals.reduce((a, b) => a + b, 0) / (painVals.length * 10)) * 100 : null;
    const disPct = disVals.length ? (disVals.reduce((a, b) => a + b, 0) / (disVals.length * 10)) * 100 : null;

    let total = null;
    if (painPct !== null && disPct !== null) total = (painPct + disPct) / 2;
    else total = painPct ?? disPct ?? null;

    const interp = interpretSpadiScore(total);
    return {
      painPct,
      disPct,
      totalPct: total,
      answered,
      totalItems,
      missing,
      complete: missing === 0,
      interpretation: interp?.label || null,
      recommendation: interp?.rec || null,
      tone: interp?.tone || null,
    };
  }

  function calcDASH(module) {
    const coreIds = Object.keys(module.numeric).filter((id) => id.startsWith("dash_q"));
    // In data.js, 0 = N/A. Compute using answered values 1-5.
    const vals = coreIds
      .map((id) => module.numeric[id])
      .filter((v) => isNum(v) && v >= 1 && v <= 5);

    const totalItems = coreIds.length;
    const answered = vals.length;
    const missing = Math.max(totalItems - answered, 0);

    if (answered < 10) {
      return { total: null, n: answered, answered, totalItems, missing, complete: false, interpretation: null, recommendation: null, tone: null };
    }

    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const score = (mean - 1) * 25; // 0–100
    const interp = interpretDashScore(score);
    return {
      total: score,
      n: answered,
      answered,
      totalItems,
      missing,
      complete: missing === 0,
      interpretation: interp?.label || null,
      recommendation: interp?.rec || null,
      tone: interp?.tone || null,
    };
  }

  function updateModuleScores(module, tpl) {
    // SPADI
    const sp = calcSPADI(module);
    module.computed.spadi = sp;
    if ("spadi_total_pct" in module.numeric) {
      module.numeric.spadi_total_pct = sp.totalPct !== null ? Number(sp.totalPct.toFixed(1)) : null;
    }

    // DASH
    const da = calcDASH(module);
    module.computed.dash = da;
    if ("dash_total" in module.numeric) {
      module.numeric.dash_total = da.total !== null ? Number(da.total.toFixed(1)) : null;
    }

    // Update header chips in accordion titles (if present)
    const card = $(`[data-module-instance="${module.instanceId}"]`);
    if (!card) return;
    const spBadge = $(`[data-badge-spadi="${module.instanceId}"]`, card);
    const daBadge = $(`[data-badge-dash="${module.instanceId}"]`, card);

    const setOutcomeBadge = (el, typeLabel, data, formatter) => {
      if (!el) return;
      let text = `${typeLabel} —`;
      let toneClass = outcomeToneClass();
      if (data) {
        if (data.missing > 0) {
          text = `${typeLabel} incompleto (${data.missing})`;
          toneClass = "bg-yellow-100 text-yellow-800";
        } else if (formatter) {
          const formatted = formatter(data);
          if (formatted) text = formatted;
          toneClass = outcomeToneClass(data.tone);
        }
      }
      el.className = `text-xs font-extrabold px-2 py-1 rounded-lg ${toneClass}`;
      el.textContent = text;
    };

    setOutcomeBadge(
      spBadge,
      "SPADI",
      sp,
      (data) => (data.totalPct !== null ? `SPADI ${data.totalPct.toFixed(0)}%${data.interpretation ? ` · ${data.interpretation}` : ""}` : null)
    );
    setOutcomeBadge(
      daBadge,
      "DASH",
      da,
      (data) => (data.total !== null ? `DASH ${data.total.toFixed(0)}${data.interpretation ? ` · ${data.interpretation}` : ""}` : null)
    );

    renderOutcomeSummary(module, tpl, "spadi", sp);
    renderOutcomeSummary(module, tpl, "dash", da);
    scheduleLivePanelRender();
  }

  function renderOutcomeSummary(module, _tpl, type, data) {
    const card = $(`[data-module-instance="${module.instanceId}"]`);
    if (!card) return;
    const container = $(`[data-outcome-summary="${module.instanceId}:${type}"]`, card);
    if (!container) return;

    const label = type === "spadi" ? "SPADI" : "DASH";
    const answered = data?.answered ?? data?.n ?? 0;
    const totalItems = data?.totalItems ?? (type === "spadi" ? 13 : 30);
    const missing = Math.max(totalItems - answered, 0);

    const chips = [
      renderComponent({
        tag: "span",
        className: "px-2 py-1 rounded-full text-xs font-semibold bg-brand-accent/30 text-brand-dark",
        text: `Ítems respondidos: ${answered}/${totalItems}`,
      }),
    ];
    if (missing > 0) {
      chips.push(
        renderComponent({
          tag: "span",
          className: "px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800",
          text: `Faltan ${missing}`,
        })
      );
    }

    let mainLine = `${label}: completa los ítems para ver el puntaje.`;
    if (type === "spadi" && data) {
      if (data.totalPct !== null) {
        const detail = [];
        if (data.painPct !== null) detail.push(`Dolor ${data.painPct.toFixed(0)}%`);
        if (data.disPct !== null) detail.push(`Discapacidad ${data.disPct.toFixed(0)}%`);
        mainLine = `${label}: ${data.totalPct.toFixed(1)}%${detail.length ? ` (${detail.join(" · ")})` : ""}${missing > 0 ? " · incompleto" : ""}`;
      } else if (missing > 0) {
        mainLine = `${label}: faltan ${missing} ítems para calcular el puntaje.`;
      }
    }

    if (type === "dash" && data) {
      if (data.total !== null) {
        mainLine = `${label}: ${data.total.toFixed(1)} / 100 (${answered} de ${totalItems} ítems usados)${missing > 0 ? " · incompleto" : ""}`;
      } else if (missing > 0) {
        mainLine = `${label}: responde al menos 10 ítems (core) para calcular el puntaje.`;
      }
    }

    const interpretationLine =
      data && missing === 0 && data.interpretation
        ? renderComponent({
            tag: "div",
            className: "text-sm font-semibold text-brand-dark",
            text: `Interpretación clínica: ${data.interpretation}`,
          })
        : null;

    const recommendationLine =
      data && missing === 0 && data.recommendation
        ? renderComponent({
            tag: "div",
            className: "text-sm text-gray-700",
            text: `Recomendación: ${data.recommendation}`,
          })
        : null;

    const box = renderComponent({
      tag: "div",
      className: "p-3 rounded-xl border border-gray-200 bg-white space-y-2",
      children: [
        renderComponent({ tag: "div", className: "text-sm font-bold text-brand-dark", text: mainLine }),
        renderComponent({ tag: "div", className: "flex flex-wrap gap-2", children: chips }),
        interpretationLine,
        recommendationLine,
      ].filter(Boolean),
    });

    container.innerHTML = "";
    container.appendChild(box);
  }

  // -----------------------------
  // Clinical reasoning: alerts + plan suggestions
  // -----------------------------
  function normalizeIrritabilityValue(raw) {
    const v = String(raw || "").toLowerCase().trim();
    if (v.includes("alta")) return "alta";
    if (v.includes("media")) return "media";
    if (v.includes("baja")) return "baja";
    return "";
  }

  function getIrritability(module, tpl) {
    // Prefer dedicated select field id "irritabilidad"
    const local = normalizeIrritabilityValue(module.text.irritabilidad);
    if (local) return local;
    const scope = getModuleIntakeScope(module, tpl);
    const intakeKey = `${scope}_irritabilidad`;
    const fromIntake = normalizeIrritabilityValue(state.intake?.values?.[intakeKey]);
    if (fromIntake) return fromIntake;
    // fallback general MSK intake
    return normalizeIrritabilityValue(state.intake?.values?.msk_irritabilidad);
  }

  function getAge() {
    const a = Number(state.patientData["patient-age"]);
    return Number.isFinite(a) ? a : null;
  }

  function derivePhaseFromIrritability(ir) {
    if (ir === "alta") return "Fase 1 (analgesia / control de síntomas)";
    if (ir === "media") return "Fase 2 (capacidad y control motor / carga progresiva)";
    if (ir === "baja") return "Fase 3–4 (fuerza, potencia y retorno funcional/deportivo)";
    return "Fase: por definir (según irritabilidad y objetivo)";
  }

  function derivePlan(module, tpl) {
    const age = getAge();
    const ir = getIrritability(module, tpl);
    const cls = {
      rcrsp: triValue(module.tests.cls_rcrsp) === true,
      rcFull: triValue(module.tests.cls_rc_full_thickness) === true,
      caps: triValue(module.tests.cls_capsulitis) === true,
      instab: triValue(module.tests.cls_instability) === true,
      ac: triValue(module.tests.cls_ac_joint) === true,
      cerv: triValue(module.tests.cls_cervical) === true,
    };

    const plan = [];
    const hasAlerts = (module.computed?.alerts || []).some((a) => a.severity === "danger" || a.severity === "warning");

    const baseEducation = [
      "Educación: explicar el cuadro en lenguaje funcional y expectativas realistas.",
      "Manejo de carga: identificar gestos detonantes y ajustar sin reposo total.",
    ];

    const phaseBullets = () => {
      if (ir === "alta") {
        return [
          "Isométricos submáximos 20–40s x 4–6 series, 2–3 veces/día; margen de dolor ≤2–3/10.",
          "ROM suave y respiración diafragmática 3–5 minutos, 2–3 veces/día, priorizando sueño.",
        ];
      }
      if (ir === "media") {
        return [
          "Fuerza moderada RC/escápula: 3x8–12 repeticiones RPE 6–7, 2–3 días/sem, retesteo 24h.",
          "Movilidad dirigida (torácica/cápsula posterior) 2–3 bloques/sem con control de síntoma.",
        ];
      }
      if (ir === "baja") {
        return [
          "Fuerza pesada y potencia específica: 3–4x6–10 repeticiones RPE 7–8, 2–3 días/sem.",
          "Retorno progresivo al gesto (overhead/empuje/tracción) con criterios de simetría y tolerancia a volumen.",
        ];
      }
      return ["Checklist base sin dosificación: confirmar irritabilidad para personalizar cargas.", "Registrar respuesta 24h antes de subir exigencia."];
    };

    const focusBullets = [];
    if (cls.rcrsp) focusBullets.push("Enfoque RCRSP: control de carga + fortalecimiento progresivo del manguito y escápula + re-test overhead.");
    if (cls.caps) {
      focusBullets.push("Enfoque hombro rígido/capsulitis: educación, dolor y movilidad dosificada; progresión lenta según irritabilidad.");
      if (age !== null && age >= 40 && age <= 65) focusBullets.push("Edad compatible con hombro rígido: monitorear ER pasiva, sueño y respuesta a carga.");
    }
    if (cls.instab) focusBullets.push("Enfoque inestabilidad: control motor, propriocepción, estabilidad dinámica; progresar posiciones vulnerables con criterio.");
    if (cls.ac) focusBullets.push("Enfoque AC: modular compresión/dolor focal, dosificar empujes/cargas horizontales y progresar por tolerancia.");
    if (cls.rcFull) {
      focusBullets.push("Sospecha de desgarro completo: considerar derivación/imagen según edad, trauma y pérdida de potencia.");
      if (age !== null && age >= 60) focusBullets.push("Edad >60 aumenta probabilidad: evaluar déficit real vs inhibición por dolor.");
    }
    if (cls.cerv) focusBullets.push("Componente cervical: integrar evaluación neuro, manejo cervical y ajustar carga del hombro según radicularidad.");

    const planA = {
      title: ir ? "Plan A · Dosificado por irritabilidad" : "Plan A · Checklist base",
      bullets: [...baseEducation, ...phaseBullets()],
      note: ir ? `Irritabilidad: ${ir}` : "Define irritabilidad para personalizar dosis.",
    };

    const planB = {
      title: "Plan B · Alternativa si síntomas suben",
      bullets: ir
        ? [
            "Reducir 1 bloque de volumen o bajar RPE en 1–2 puntos por 48h si síntomas >3/10.",
            "Usar variantes en cadena cerrada o rangos parciales 48–72h antes de progresar.",
          ]
        : [
            "Usa progresiones en cadena cerrada de baja carga y registra tolerancia.",
            "Añade dosificación solo cuando se documente irritabilidad/24h.",
          ],
      note: "Ajuste escalonado si el plan principal aumenta síntomas.",
    };

    const planC = {
      title: hasAlerts ? "Plan C · Precaución / derivación" : "Plan C · Monitoreo activo",
      bullets: hasAlerts
        ? [
            "Prioriza resolver alertas: derivación/imagen según severidad.",
            "Limita cargas >RPE 6 y evita posiciones provocativas hasta aclarar alertas.",
          ]
        : [
            "Sin alertas críticas: mantener educación + monitoreo semanal.",
            "Escalar solo si síntomas y 24h permanecen estables.",
          ],
      note: hasAlerts ? "Se detectaron alertas clínicas: activar ruta segura." : "Ruta de seguridad por si se activan nuevas alertas.",
    };

    return {
      phase: derivePhaseFromIrritability(ir),
      irritability: ir,
      planA,
      planB,
      planC,
      focusBullets,
      hasAlerts,
    };
  }

  function renderAlertCard(rule, severity) {
    const sev = severity || rule.severity || "info";
    const palette =
      sev === "danger"
        ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "fa-triangle-exclamation" }
        : sev === "warning"
        ? { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "fa-triangle-exclamation" }
        : { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "fa-circle-info" };

    return renderComponent({
      tag: "div",
      className: `p-4 rounded-2xl border ${palette.bg} ${palette.border}`.trim(),
      children: [
        renderComponent({
          tag: "div",
          className: "flex items-start gap-3",
          children: [
            renderComponent({
              tag: "div",
              className: `w-9 h-9 rounded-full flex items-center justify-center ${palette.bg}`.trim(),
              children: [iconEl(palette.icon, palette.text)],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: `font-extrabold ${palette.text}`, text: rule.title || "Alerta clínica" }),
                renderComponent({ tag: "div", className: "text-sm text-gray-700 mt-1", text: rule.description || "" }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  function evaluateRuleCriteria(rule, module, tpl) {
    const criteria = Array.isArray(rule?.criteria) ? rule.criteria : [];
    if (!criteria.length) return { points: 0, matched: [], missing: [] };

    const normalizedTests = mapTriValues(module.tests);
    const matched = [];
    const missing = [];
    let points = 0;

    const getValue = (crit) => {
      const source = crit.source || "tests";
      if (source === "tests") return normalizedTests[crit.id];
      if (source === "numeric") return module.numeric?.[crit.id];
      if (source === "text") return module.text?.[crit.id];
      if (source === "patient") return state.patientData?.[crit.id];
      if (source === "intake") return state.intake?.values?.[crit.id];
      return undefined;
    };

    criteria.forEach((crit) => {
      const label = crit.label || crit.id;
      const weight = Number(crit.weight) || 1;
      const type = crit.type || "boolean";
      const raw = getValue(crit);

      if (type === "text") {
        const hasValue = String(raw || "").trim().length > 0;
        if (hasValue) {
          matched.push(label);
          points += weight;
        } else if (raw === null || raw === undefined || raw === "") {
          missing.push(crit.missingLabel || label);
        }
        return;
      }

      if (type === "numeric") {
        const num = Number(raw);
        const minOk = crit.minValue === undefined || (Number.isFinite(num) && num >= crit.minValue);
        const maxOk = crit.maxValue === undefined || (Number.isFinite(num) && num <= crit.maxValue);
        if (Number.isFinite(num) && minOk && maxOk) {
          matched.push(label);
          points += weight;
        } else if (raw === null || raw === undefined || raw === "") {
          missing.push(crit.missingLabel || label);
        }
        return;
      }

      // boolean (tri-state)
      if (raw === true) {
        matched.push(label);
        points += weight;
      } else if (raw === null || raw === undefined) {
        missing.push(crit.missingLabel || label);
      }
    });

    return { points, matched, missing };
  }

  function buildHypotheses(module, tpl) {
    const normalizedTests = mapTriValues(module.tests);
    const rules = (Array.isArray(tpl.logicRules) ? tpl.logicRules : []).filter((r) => r.hypothesis !== false);
    const results = [];

    rules.forEach((rule) => {
      const criteria = evaluateRuleCriteria(rule, module, tpl);
      let triggered = false;
      try {
        triggered = !!rule.when({ tests: normalizedTests, numeric: module.numeric, text: module.text }, state.patientData);
      } catch (_) {
        triggered = false;
      }
      const baseScore = triggered ? rule.scoreValue ?? 5 : 0;
      const score = baseScore + criteria.points;
      const why = criteria.matched.length ? criteria.matched : triggered ? ["Regla cumplida con los hallazgos actuales."] : [];
      const missing = criteria.missing.length ? criteria.missing : [];

      results.push({
        id: rule.id || rule.title || String(rule.when),
        title: rule.title || "Hipótesis clínica",
        score,
        triggered,
        why,
        missing,
        severity: rule.severity || "info",
      });
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);
  }

  function buildReasoningData(module, tpl) {
    const hypotheses = buildHypotheses(module, tpl);
    const plan = derivePlan(module, tpl);
    const missing = uniqueList(hypotheses.flatMap((h) => h.missing || []));
    return { hypotheses, plan, missing };
  }

  function renderHypotheses(module, tpl) {
    const container = $(`[data-hypotheses="${module.instanceId}"]`);
    if (!container) return;

    const reasoning = module.computed?.reasoning || buildReasoningData(module, tpl);
    module.computed.reasoning = reasoning;

    const hypotheses = reasoning.hypotheses || [];
    container.replaceChildren();

    if (!hypotheses.length) {
      container.appendChild(
        renderComponent({
          tag: "div",
          className: "p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-700",
          text: "Sin hipótesis priorizadas. Completa más hallazgos clave.",
        })
      );
      return;
    }

    hypotheses.forEach((h, idx) => {
      const tone =
        h.severity === "warning"
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : h.severity === "danger"
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-blue-50 border-blue-200 text-blue-800";

      const whyList =
        h.why && h.why.length
          ? renderComponent({
              tag: "ul",
              className: "list-disc pl-4 space-y-1 text-sm text-gray-800",
              children: h.why.map((w) => renderComponent({ tag: "li", text: w })),
            })
          : renderComponent({ tag: "div", className: "text-sm text-gray-600", text: "Registra más datos para justificar." });

      const missingList =
        h.missing && h.missing.length
          ? renderComponent({
              tag: "ul",
              className: "list-disc pl-4 space-y-1 text-xs text-gray-700",
              children: h.missing.map((m) => renderComponent({ tag: "li", text: m })),
            })
          : renderComponent({ tag: "div", className: "text-xs text-gray-500", text: "Sin pendientes críticos." });

      container.appendChild(
        renderComponent({
          tag: "div",
          className: "p-4 rounded-2xl border border-gray-200 bg-white space-y-2",
          children: [
            {
              tag: "div",
              className: "flex items-center justify-between gap-2",
              children: [
                { tag: "div", className: "font-extrabold text-brand-dark text-sm", text: `${idx + 1}. ${h.title}` },
                renderComponent({
                  tag: "div",
                  className: "flex items-center gap-2",
                  children: [
                    { tag: "span", className: `px-2 py-1 rounded-full text-[11px] font-semibold ${tone}`, text: h.triggered ? "Regla activa" : "Parcial" },
                    { tag: "span", className: "px-2 py-1 rounded-full text-[11px] font-bold bg-brand-accent/30 text-brand-dark", text: `${h.score} pts` },
                  ],
                }),
              ],
            },
            renderComponent({ tag: "div", className: "text-[11px] font-extrabold text-gray-600 uppercase", text: "Por qué" }),
            whyList,
            renderComponent({ tag: "div", className: "text-[11px] font-extrabold text-gray-600 uppercase", text: "Qué falta evaluar" }),
            missingList,
          ],
        })
      );
    });
  }

  function evaluateModuleLogic(module, tpl) {
    const container = $(`[data-alerts="${module.instanceId}"]`);
    if (!container) return;

    container.replaceChildren();

    const rules = Array.isArray(tpl.logicRules) ? tpl.logicRules : [];
    const triggered = [];
    const normalizedTests = mapTriValues(module.tests);

    for (const rule of rules) {
      if (!rule || typeof rule.when !== "function") continue;
      let ok = false;
      try {
        ok = !!rule.when({ tests: normalizedTests, numeric: module.numeric, text: module.text }, state.patientData);
      } catch (_) {
        ok = false;
      }
      if (ok) triggered.push(rule);
    }

    const scopeKey = getModuleIntakeScope(module, tpl);
    const intakeScope = state.intakeDerived.scopes[scopeKey] || emptyIntakeDerived();
    intakeScope.alerts.forEach((r) => triggered.push(r));

    module.computed = module.computed || {};
    module.computed.alerts = triggered.map((r) => ({
      id: r.id,
      title: r.title || "Alerta clínica",
      severity: r.severity || "info",
    }));

    if (triggered.length === 0) {
      scheduleLivePanelRender();
      return;
    }

    // Render in order: danger -> warning -> info
    const order = { danger: 0, warning: 1, info: 2 };
    triggered.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));

    triggered.forEach((r) => container.appendChild(renderAlertCard(r)));
    scheduleLivePanelRender();
  }

  function renderPlanCard(module, tpl) {
    const wrap = $(`[data-plan="${module.instanceId}"]`);
    if (!wrap) return;

    wrap.replaceChildren();

    const reasoning = module.computed?.reasoning || buildReasoningData(module, tpl);
    module.computed.reasoning = reasoning;
    const plan = reasoning.plan || derivePlan(module, tpl);

    const planCards = [plan.planA, plan.planB, plan.planC].map((p) =>
      renderComponent({
        tag: "div",
        className: "p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2",
        children: [
          {
            tag: "div",
            className: "flex items-center justify-between gap-2",
            children: [
              { tag: "div", className: "font-extrabold text-brand-dark", text: p.title },
              { tag: "span", className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-brand-accent/30 text-brand-dark", text: plan.phase },
            ],
          },
          p.note ? { tag: "div", className: "text-xs text-gray-600", text: p.note } : null,
          renderComponent({
            tag: "ul",
            className: "list-disc pl-5 space-y-1 text-sm text-gray-800",
            children: (p.bullets || []).map((b) => renderComponent({ tag: "li", text: b })),
          }),
        ],
      })
    );

    const focusList =
      plan.focusBullets && plan.focusBullets.length
        ? renderComponent({
            tag: "div",
            className: "p-3 rounded-xl border border-blue-100 bg-blue-50 space-y-2",
            children: [
              { tag: "div", className: "text-xs font-extrabold text-blue-900 uppercase", text: "Focos específicos" },
              renderComponent({
                tag: "ul",
                className: "list-disc pl-5 space-y-1 text-sm text-blue-900",
                children: plan.focusBullets.map((b) => renderComponent({ tag: "li", text: b })),
              }),
            ],
          })
        : null;

    const missing =
      reasoning.missing && reasoning.missing.length
        ? renderComponent({
            tag: "div",
            className: "p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-1",
            children: [
              { tag: "div", className: "text-xs font-extrabold text-amber-800 uppercase", text: "Qué falta para subir certeza" },
              renderComponent({
                tag: "div",
                className: "flex flex-wrap gap-2",
                children: reasoning.missing.map((m) => ({
                  tag: "span",
                  className: "px-2 py-1 rounded-full text-[11px] font-semibold bg-white border border-amber-200 text-amber-800",
                  text: m,
                })),
              }),
            ],
          })
        : null;

    const btnInsert = renderComponent({
      tag: "button",
      className: "px-3 py-2 rounded-lg bg-brand-dark text-white text-sm font-bold hover:bg-gray-800 transition-all",
      attrs: { type: "button" },
      text: "Insertar en “Plan inicial”",
      on: {
        click: () => {
          const target = $(`[data-field="${module.instanceId}:plan_inicial"] textarea, [data-field="${module.instanceId}:plan_inicial"] input`);
          const lines = ["", plan.phase, ...plan.planA.bullets.map((x) => `• ${x}`), "", ...plan.planB.bullets.map((x) => `• ${x}`), ""].join("\n");
          if (target) {
            target.value = (target.value || "") + lines;
            module.text.plan_inicial = target.value;
            scheduleAutosave();
          }
        },
      },
    });

    const notice =
      !plan.irritability || plan.phase.includes("por definir")
        ? renderComponent({
            tag: "div",
            className: "p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900",
            text: "Define irritabilidad/fase para dosificar con mayor precisión. Se muestra un checklist base.",
          })
        : null;

    wrap.appendChild(
      renderComponent({
        tag: "div",
        className: "p-4 rounded-2xl border border-gray-200 bg-white space-y-3",
        children: [
          renderComponent({
            tag: "div",
            className: "flex items-start justify-between gap-4",
            children: [
              renderComponent({
                tag: "div",
                className: "min-w-0",
                children: [
                  renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Planes A/B/C (automatizado)" }),
                  renderComponent({ tag: "div", className: "text-sm text-gray-600 mt-1", text: plan.phase }),
                ],
              }),
              btnInsert,
            ],
          }),
          notice,
          focusList,
          renderComponent({
            tag: "div",
            className: "grid grid-cols-1 md:grid-cols-3 gap-3",
            children: planCards,
          }),
          missing,
        ].filter(Boolean),
      })
    );
  }

  function renderReasoningSection(module, tpl) {
    module.computed = module.computed || {};
    module.computed.reasoning = buildReasoningData(module, tpl);
    renderHypotheses(module, tpl);
    renderPlanCard(module, tpl);
  }

  function renderModuleIntakeConsiderations(module, tpl) {
    const wrap = $(`[data-intake-considerations="${module.instanceId}"]`);
    if (!wrap) return;

    wrap.replaceChildren();

    const scopeKey = getModuleIntakeScope(module, tpl);
    const scoped = state.intakeDerived.scopes[scopeKey] || emptyIntakeDerived();
    const global = state.intakeDerived.global || emptyIntakeDerived();

    const evalList = uniqueList([...(global.evaluation || []), ...(scoped.evaluation || [])]);
    const txList = uniqueList([...(global.treatment || []), ...(scoped.treatment || [])]);

    const card = (title, list, emptyText, icon) =>
      renderComponent({
        tag: "div",
        className: "rounded-2xl border border-gray-100 bg-white p-4 space-y-2",
        children: [
          renderComponent({
            tag: "div",
            className: "flex items-center gap-2 text-xs font-extrabold uppercase text-brand-dark",
            children: [iconEl(icon || "fa-clipboard-list"), renderComponent({ tag: "span", text: title })],
          }),
          intakeList(list, emptyText),
        ],
      });

    wrap.appendChild(card("Consideraciones de evaluación", evalList, "Sin consideraciones especiales desde el intake.", "fa-magnifying-glass"));
    wrap.appendChild(card("Consideraciones de tratamiento", txList, "Sin ajustes relevantes de tratamiento desde el intake.", "fa-hand-holding-medical"));
  }

  function evaluateAllLogic() {
    state.activeModules.forEach((m) => {
      const tpl = getModuleTemplate(m.key);
      updateModuleScores(m, tpl);
      evaluateModuleLogic(m, tpl);
      renderReasoningSection(m, tpl);
      renderModuleIntakeConsiderations(m, tpl);
    });
    scheduleLivePanelRender();
  }

  // -----------------------------
  // Section render
  // -----------------------------
  function renderField(module, tpl, field) {
    if (!field || !field.id) return renderComponent({ tag: "div" });

    const afterChange = () => {
      // Derived updates
      updateModuleScores(module, tpl);
      evaluateModuleLogic(module, tpl);
      renderReasoningSection(module, tpl);
      scheduleAutosave();
    };

    // Special cases: irritability as select for speed
    if (field.id === "irritabilidad") {
      return selectField({
        value: module.text[field.id] || "",
        field: { ...field, label: field.label || "Irritabilidad" },
        options: [
          { value: "", label: "— Seleccionar —" },
          { value: "Alta", label: "Alta" },
          { value: "Media", label: "Media" },
          { value: "Baja", label: "Baja" },
        ],
        onChange: (v) => {
          module.text[field.id] = v;
          afterChange();
        },
      });
    }

    if (field.type === "boolean") {
      return triBoolField({
        module,
        field,
        onChange: (next) => {
          module.tests[field.id] = next;
          afterChange();
        },
      });
    }

    if (field.type === "numeric") {
      return renderComponent({
        tag: "div",
        attrs: { "data-field": `${module.instanceId}:${field.id}` },
        children: [numericField({ module, field, onAfterChange: afterChange })],
      });
    }

    if (field.type === "textarea") {
      return renderComponent({
        tag: "div",
        attrs: { "data-field": `${module.instanceId}:${field.id}` },
        children: [
          textareaField({
            value: module.text[field.id] || "",
            field,
            onChange: (v) => {
              module.text[field.id] = v;
              scheduleLivePanelRender();
              scheduleAutosave();
            },
          }),
        ],
      });
    }

    // text default
    return renderComponent({
      tag: "div",
      attrs: { "data-field": `${module.instanceId}:${field.id}` },
      children: [
        textField({
          value: module.text[field.id] || "",
          field,
          onChange: (v) => {
            module.text[field.id] = v;
            scheduleLivePanelRender();
            scheduleAutosave();
          },
        }),
      ],
    });
  }

  function sectionHeaderBadges(module, sectionTitle) {
    const t = (sectionTitle || "").toLowerCase();
    const badges = [];

    if (t.includes("spadi")) {
      badges.push(
        renderComponent({
          tag: "span",
          className: "text-xs font-extrabold px-2 py-1 rounded-lg bg-brand-accent/20 text-brand-dark",
          attrs: { "data-badge-spadi": module.instanceId },
          text: "SPADI —",
        })
      );
    }
    if (t.includes("dash")) {
      badges.push(
        renderComponent({
          tag: "span",
          className: "text-xs font-extrabold px-2 py-1 rounded-lg bg-brand-accent/20 text-brand-dark",
          attrs: { "data-badge-dash": module.instanceId },
          text: "DASH —",
        })
      );
    }

    return badges;
  }

  function renderSection(module, tpl, section, secIndex) {
    if (module.ui.collapsed[secIndex] === undefined) {
      module.ui.collapsed[secIndex] = isOutcomeSectionTitle(section.title);
    }

    const content = renderComponent({
      tag: "div",
      attrs: { "data-section-content": `${module.instanceId}:${secIndex}` },
      className: "p-4 pt-3",
      children: [],
    });

    // Layout
    const style = section.style || "card";
    const gridCls =
      style === "grid2" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3";
    const grid = renderComponent({ tag: "div", className: gridCls });

    const outcomeType = getOutcomeTypeFromTitle(section.title);
    if (outcomeType) {
      content.appendChild(
        renderComponent({
          tag: "div",
          className: "mb-3",
          attrs: { "data-outcome-summary": `${module.instanceId}:${outcomeType}` },
        })
      );
    }

    (section.fields || []).forEach((f) => grid.appendChild(renderField(module, tpl, f)));

    content.appendChild(grid);
    content.hidden = !!module.ui.collapsed[secIndex];

    const chevron = renderComponent({
      tag: "i",
      className: `fa-solid fa-chevron-down transition-transform ${content.hidden ? "" : "rotate-180"}`.trim(),
      attrs: { "data-section-chevron": `${module.instanceId}:${secIndex}`, "aria-hidden": "true" },
    });

    const header = renderComponent({
      tag: "button",
      className: "w-full text-left flex items-center justify-between gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors",
      attrs: { type: "button" },
      on: { click: () => toggleSection(module.instanceId, secIndex) },
      children: [
        renderComponent({
          tag: "div",
          className: "flex items-center gap-3 min-w-0",
          children: [
            renderComponent({
              tag: "div",
              className: "w-9 h-9 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0",
              children: [iconEl(section.icon || "fa-circle", "text-brand-accent")],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: "font-extrabold text-brand-dark truncate", text: section.title || "Sección" }),
                renderComponent({
                  tag: "div",
                  className: "flex items-center gap-2 mt-1",
                  children: sectionHeaderBadges(module, section.title),
                }),
              ],
            }),
          ],
        }),
        chevron,
      ],
    });

    return renderComponent({
      tag: "div",
      className: "rounded-2xl overflow-hidden border border-gray-200 bg-white",
      attrs: { "data-section-wrap": `${module.instanceId}:${secIndex}`, "data-fast": section.fast ? "true" : "false" },
      children: [header, content],
    });
  }

  // -----------------------------
  // Module card render
  // -----------------------------
  function renderModuleCard(module, tpl) {
    const stack = $("#clinical-stack");
    if (!stack) return;

    // Remove empty-state if any
    setEmptyStateVisibility();

    const card = renderComponent({
      tag: "section",
      className: "module-card bg-white rounded-3xl shadow-lg overflow-hidden border border-black/5",
      dataset: { moduleInstance: module.instanceId },
      attrs: { "data-module-instance": module.instanceId },
    });

    const header = renderComponent({
      tag: "div",
      className: "bg-brand-dark p-6 flex items-center justify-between gap-4",
      children: [
        renderComponent({
          tag: "div",
          className: "flex items-center gap-4 min-w-0",
          children: [
            renderComponent({
              tag: "div",
              className: "w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0",
              children: [iconEl(tpl.icon || "fa-person-rays", "text-brand-accent text-xl")],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: "text-white font-extrabold tracking-wide", text: `EVALUACIÓN: ${tpl.title || module.title}` }),
                renderComponent({ tag: "div", className: "text-white/60 text-sm font-semibold mt-0.5", text: "Secciones colapsables · Cálculo automático · Razonamiento clínico" }),
              ],
            }),
          ],
        }),
        renderComponent({
          tag: "div",
          className: "flex items-center gap-4",
          children: [
            renderComponent({
              tag: "div",
              className: "flex flex-col items-end gap-1 text-white",
              children: [
                renderComponent({
                  tag: "div",
                  className: "text-[11px] font-extrabold uppercase tracking-wide",
                  attrs: { "data-mode-chip": module.instanceId },
                  text: module.ui.mode === "fast" ? "Modo Rápido (5 min)" : "Modo Completo",
                }),
                renderComponent({
                  tag: "div",
                  className: "flex items-center gap-1 bg-white/10 rounded-full border border-white/20 p-1",
                  on: {
                    click: (e) => {
                      const btn = e.target.closest(`button[data-mode-button=\"${module.instanceId}\"]`);
                      if (!btn) return;
                      setModuleMode(module, btn.dataset.mode);
                    },
                  },
                  children: [
                    renderComponent({
                      tag: "button",
                      className: "aum-choice px-3 py-1 rounded-full text-xs font-bold text-white/80",
                      attrs: {
                        type: "button",
                        "data-mode-button": module.instanceId,
                        "data-mode": "fast",
                        style: "--aum-choice-bg: rgba(255,255,255,0.08); --aum-choice-color: #E5E7EB; --aum-choice-border: rgba(255,255,255,0.28); --aum-choice-active-bg: #F5EFE5; --aum-choice-active-color: #102024; --aum-choice-active-border: #F5EFE5;",
                      },
                      text: "Modo Rápido",
                    }),
                    renderComponent({
                      tag: "button",
                      className: "aum-choice px-3 py-1 rounded-full text-xs font-bold text-white/80",
                      attrs: {
                        type: "button",
                        "data-mode-button": module.instanceId,
                        "data-mode": "complete",
                        style: "--aum-choice-bg: rgba(255,255,255,0.08); --aum-choice-color: #E5E7EB; --aum-choice-border: rgba(255,255,255,0.28); --aum-choice-active-bg: #F5EFE5; --aum-choice-active-color: #102024; --aum-choice-active-border: #F5EFE5;",
                      },
                      text: "Modo Completo",
                    }),
                  ],
                }),
              ],
            }),
            renderComponent({
              tag: "button",
              className: "w-11 h-11 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-white/10 transition-colors",
              attrs: { type: "button", title: "Eliminar módulo" },
              on: { click: () => removeModule(module.instanceId) },
              children: [iconEl("fa-trash-can")],
            }),
          ],
        }),
      ],
    });

    const body = renderComponent({ tag: "div", className: "p-6 space-y-4" });

    // Alerts container
    body.appendChild(renderComponent({ tag: "div", attrs: { "data-alerts": module.instanceId }, className: "space-y-3" }));

    // Intake considerations container (evaluation + treatment)
    body.appendChild(
      renderComponent({
        tag: "div",
        attrs: { "data-intake-considerations": module.instanceId },
        className: "grid grid-cols-1 md:grid-cols-2 gap-3",
      })
    );

    const reasoningContent = renderComponent({
      tag: "div",
      attrs: { "data-reasoning-content": module.instanceId },
      className: "p-4 space-y-4",
      hidden: !!module.ui.reasoningCollapsed,
      children: [
        renderComponent({
          tag: "div",
          className: "space-y-2",
          children: [
            renderComponent({ tag: "div", className: "text-xs font-extrabold text-brand-dark uppercase", text: "Top-3 hipótesis" }),
            renderComponent({ tag: "div", attrs: { "data-hypotheses": module.instanceId }, className: "space-y-3" }),
          ],
        }),
        renderComponent({
          tag: "div",
          className: "space-y-2",
          children: [
            renderComponent({ tag: "div", className: "text-xs font-extrabold text-brand-dark uppercase", text: "Plan A/B/C" }),
            renderComponent({ tag: "div", attrs: { "data-plan": module.instanceId }, className: "space-y-3" }),
          ],
        }),
      ],
    });

    const reasoningChevron = renderComponent({
      tag: "i",
      className: `fa-solid fa-chevron-down transition-transform ${module.ui.reasoningCollapsed ? "" : "rotate-180"}`.trim(),
      attrs: { "aria-hidden": "true" },
    });

    const reasoningHeader = renderComponent({
      tag: "button",
      className: "w-full text-left flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors",
      attrs: { type: "button" },
      on: {
        click: () => {
          module.ui.reasoningCollapsed = !module.ui.reasoningCollapsed;
          reasoningContent.hidden = !!module.ui.reasoningCollapsed;
          reasoningChevron.classList.toggle("rotate-180", !module.ui.reasoningCollapsed);
          scheduleAutosave();
        },
      },
      children: [
        renderComponent({
          tag: "div",
          className: "flex items-center gap-3 min-w-0",
          children: [
            renderComponent({
              tag: "div",
              className: "w-9 h-9 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0",
              children: [iconEl("fa-brain", "text-brand-accent")],
            }),
            renderComponent({
              tag: "div",
              className: "min-w-0",
              children: [
                renderComponent({ tag: "div", className: "font-extrabold text-brand-dark truncate", text: "Razonamiento integrador" }),
                renderComponent({ tag: "div", className: "text-xs text-gray-600", text: "Top-3 hipótesis + Plan A/B/C + pendientes" }),
              ],
            }),
          ],
        }),
        reasoningChevron,
      ],
    });

    body.appendChild(
      renderComponent({
        tag: "div",
        className: "rounded-2xl overflow-hidden border border-gray-200 bg-white",
        children: [reasoningHeader, reasoningContent],
      })
    );

    const modeNotice = renderComponent({
      tag: "div",
      attrs: { "data-mode-notice": module.instanceId },
      className: "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3",
      children: [
        renderComponent({
          tag: "div",
          className: "w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700",
          children: [iconEl("fa-bolt")],
        }),
        renderComponent({
          tag: "div",
          className: "min-w-0",
          children: [
            renderComponent({ tag: "div", className: "text-sm font-extrabold text-brand-dark", text: "Modo Rápido (5 min)" }),
            renderComponent({
              tag: "div",
              className: "text-sm text-gray-700",
              text: "Se muestran las secciones esenciales para clasificar, priorizar red flags y sugerir tratamiento basado en evidencia.",
            }),
          ],
        }),
      ],
    });
    if (module.ui.mode !== "fast") modeNotice.hidden = true;
    body.appendChild(modeNotice);

    // Sections
    (tpl.sections || []).forEach((sec, idx) => {
      body.appendChild(renderSection(module, tpl, sec, idx));
    });

    card.appendChild(header);
    card.appendChild(body);

    stack.appendChild(card);
    applyModuleMode(module);

    // First derived render
    updateModuleScores(module, tpl);
    evaluateModuleLogic(module, tpl);
    renderReasoningSection(module, tpl);
    renderModuleIntakeConsiderations(module, tpl);
  }

  // -----------------------------
  // Active tags render
  // -----------------------------
  function renderActiveTags() {
    const container = $("#active-tags-container");
    if (!container) return;

    container.replaceChildren();

    state.activeModules.forEach((m) => {
      const tpl = getModuleTemplate(m.key);
      const chip = renderComponent({
        tag: "div",
        className: "flex items-center gap-2 bg-brand-dark text-white/90 px-4 py-2 rounded-full shadow-sm border border-white/10",
        children: [
          renderComponent({ tag: "span", className: "font-bold text-sm", text: tpl.title || m.title }),
          renderComponent({
            tag: "button",
            className: "w-6 h-6 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors",
            attrs: { type: "button", title: "Cerrar" },
            on: { click: () => removeModule(m.instanceId) },
            children: [iconEl("fa-xmark")],
          }),
        ],
      });
      container.appendChild(chip);
    });

    // Adjust min height
    container.style.minHeight = state.activeModules.length ? "auto" : "0px";
  }

  function setEmptyStateVisibility() {
    const empty = $("#empty-state");
    const stack = $("#clinical-stack");
    if (!empty || !stack) return;

    empty.style.display = state.activeModules.length ? "none" : "block";
  }

  // -----------------------------
  // Storage: export/load + autosave
  // -----------------------------
  function exportSession() {
    const payload = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      patientData: state.patientData,
      activeModules: state.activeModules,
      intake: state.intake,
    };
    downloadTextFile(`paciente-${todayStamp()}.aum`, JSON.stringify(payload, null, 2));
  }

  function loadSessionFromObject(payload) {
    if (!payload || typeof payload !== "object") return;

    // Reset current
    state.patientData = payload.patientData || {};
    state.activeModules = Array.isArray(payload.activeModules) ? payload.activeModules : [];
    state.intake = hydrateIntakeState(payload.intake);

    // Restore patient inputs (DOM)
    for (const [k, v] of Object.entries(state.patientData)) {
      const el = getPatientEl(k);
      if (el) el.value = v ?? "";
    }
    // Age placeholder
    const ageEl = getPatientEl("patient-age");
    if (ageEl) ageEl.value = state.patientData["patient-age"] || ageEl.value || "-";

    // Ensure BMI injected, then restore weight/height/bmi
    ensureWeightHeightBMI();
    ["patient-weight", "patient-height", "patient-bmi"].forEach((id) => {
      const el = getPatientEl(id);
      if (el && id in state.patientData) el.value = state.patientData[id] ?? "";
    });

    // Intake remoto global
    renderIntakeRemote();

    // Clear stack DOM and rebuild
    const stack = $("#clinical-stack");
    if (stack) {
      $$(".module-card", stack).forEach((n) => n.remove());
    }

    renderActiveTags();
    setEmptyStateVisibility();

    // Re-render module cards with templates
    state.activeModules.forEach((m) => {
      const tpl = getModuleTemplate(m.key);
      // Ensure missing structures
      m.tests = m.tests || {};
      Object.keys(m.tests).forEach((k) => {
        m.tests[k] = normalizeTriEntry(m.tests[k]);
      });
      m.numeric = m.numeric || {};
      m.text = m.text || {};
      m.ui = m.ui || { collapsed: {}, mode: "complete" };
      m.ui.mode = m.ui.mode || "complete";
      m.ui.collapsed = m.ui.collapsed || {};
      if (m.ui.reasoningCollapsed === undefined) m.ui.reasoningCollapsed = false;
      m.scope = m.scope || tpl.scope || "all";
      m.computed = m.computed || {};
      m.computed.spadi = m.computed.spadi || null;
      m.computed.dash = m.computed.dash || null;
      m.computed.alerts = m.computed.alerts || [];
      m.computed.reasoning = m.computed.reasoning || null;
      renderModuleCard(m, tpl);
    });

    evaluateAllLogic();
    scheduleAutosave(true);
  }

  function handleLoadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        loadSessionFromObject(payload);
      } catch (e) {
        alert("No se pudo leer el archivo .aum (JSON inválido).");
      }
    };
    reader.readAsText(file);
  }

  function scheduleAutosave(forceImmediate = false) {
    if (forceImmediate) {
      doAutosave();
      return;
    }
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(doAutosave, 300);
  }

  function doAutosave() {
    try {
      const payload = {
        version: APP_VERSION,
        savedAt: new Date().toISOString(),
        patientData: state.patientData,
        activeModules: state.activeModules,
        intake: state.intake,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
    } catch (_) {
      // ignore
    }
  }

  function maybeRestoreAutosave() {
    let raw = null;
    try {
      raw = localStorage.getItem(AUTOSAVE_KEY);
    } catch (_) {
      raw = null;
    }
    if (!raw) return;

    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      payload = null;
    }
    if (!payload) return;

    // Ask user (B)
    const ok = window.confirm("Encontré una sesión guardada automáticamente. ¿Restaurarla?");
    if (!ok) return;

    loadSessionFromObject(payload);
  }

  // -----------------------------
  // Print / PDF
  // -----------------------------
  function ensurePrintStyles() {
    if ($("#aum-print-style")) return;

    const style = renderComponent({
      tag: "style",
      attrs: { id: "aum-print-style" },
      text: `
        @media print {
          #btn-add-module, #btn-reset-stack, #btn-upload-media, #btn-upload-docs,
          #btn-save-aum, #btn-load-aum, .no-print, button[data-quick], button[data-mode] {
            display: none !important;
          }
        }
      `,
    });
    document.head.appendChild(style);
  }

  function expandAllTextareasForPrint() {
    $$("textarea").forEach((ta) => {
      // Expand to content height
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }

  function exportPDF() {
    expandAllTextareasForPrint();
    window.print();
  }

  // -----------------------------
  // Bind top controls
  // -----------------------------
  function bindTopControls() {
    const addBtn = $("#btn-add-module");
    const sel = $("#moduleSelector");
    if (addBtn && sel) {
      addBtn.addEventListener("click", () => {
        const key = sel.value;
        if (!key) return;
        addModule(key);
      });
    }

    const resetBtn = $("#btn-reset-stack");
    if (resetBtn) resetBtn.addEventListener("click", resetStack);

    const saveBtn = $("#btn-save-aum");
    if (saveBtn) saveBtn.addEventListener("click", exportSession);

    const loadBtn = $("#btn-load-aum");
    const loadInput = $("#file-load-input");
    if (loadBtn && loadInput) {
      loadBtn.addEventListener("click", () => loadInput.click());
      loadInput.addEventListener("change", () => {
        const f = loadInput.files && loadInput.files[0];
        if (!f) return;
        handleLoadFile(f);
        loadInput.value = "";
      });
    }

    const uploadMediaBtn = $("#btn-upload-media");
    const mediaInput = $("#media-upload-input");
    if (uploadMediaBtn && mediaInput) {
      const open = () => mediaInput.click();
      uploadMediaBtn.addEventListener("click", open);
      uploadMediaBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") open();
      });
    }

    const uploadDocsBtn = $("#btn-upload-docs");
    const docInput = $("#doc-upload-input");
    if (uploadDocsBtn && docInput) {
      const open = () => docInput.click();
      uploadDocsBtn.addEventListener("click", open);
      uploadDocsBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") open();
      });
    }

    const pdfBtn = $("#btn-export-pdf");
    if (pdfBtn) pdfBtn.addEventListener("click", exportPDF);

    // Before/after print hooks
    window.addEventListener("beforeprint", () => expandAllTextareasForPrint());
    ensurePrintStyles();
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    ensureChoiceStyles();
    ensureWeightHeightBMI();
    bindPatientInputs();
    renderIntakeRemote();
    bindTopControls();
    setEmptyStateVisibility();
    scheduleLivePanelRender();

    // Autosave restore prompt:
    maybeRestoreAutosave();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
