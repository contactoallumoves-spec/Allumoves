// ===== app.js PART 1/3 =====
/* All u moves — app.js (v5) */
(() => {
"use strict";
const APP_VERSION = "aum-app-v5.0.0";
const state = { patientData: {}, globalIntake: null, activeModules: [], meta: { version: APP_VERSION, updatedAt: null } };
const AUTOSAVE_KEY = "aum_autosave_v2";
let autosaveTimer = null;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function safeText(v) { if (v === null || v === undefined) return ""; return String(v); }
function renderComponent(cfg) {
if (cfg instanceof Node) return cfg;
const tag = cfg?.tag || "div";
const el = document.createElement(tag);
const cls = cfg?.className || cfg?.class || cfg?.classes;
if (cls) el.className = cls;
if (cfg?.attrs) { for (const [k, v] of Object.entries(cfg.attrs)) { if (v === null || v === undefined) continue; el.setAttribute(k, String(v)); } }
if (cfg?.dataset) { for (const [k, v] of Object.entries(cfg.dataset)) { el.dataset[k] = String(v); } }
if (cfg?.text !== undefined) el.textContent = safeText(cfg.text);
if (cfg?.children && Array.isArray(cfg.children)) {
for (const child of cfg.children) {
if (child === null || child === undefined) continue;
if (child instanceof Node) el.appendChild(child);
else if (typeof child === "string" || typeof child === "number") el.appendChild(document.createTextNode(String(child)));
else el.appendChild(renderComponent(child));
}
}
if (cfg?.on) { for (const [evt, handler] of Object.entries(cfg.on)) el.addEventListener(evt, handler); }
return el;
}
function iconEl(faClass, extraClass = "") { return renderComponent({ tag: "i", className: `fa-solid ${faClass} ${extraClass}`.trim(), attrs: { "aria-hidden": "true" } }); }
function todayStamp() { const d = new Date(); const yyyy = String(d.getFullYear()); const mm = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0"); return `${yyyy}-${mm}-${dd}`; }
function downloadTextFile(filename, text, mime = "application/json;charset=utf-8") {
const blob = new Blob([text], { type: mime });
const url = URL.createObjectURL(blob);
const a = renderComponent({ tag: "a", attrs: { href: url, download: filename } });
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyToClipboard(text) {
try { await navigator.clipboard.writeText(text); toast("Copiado al portapapeles ✅"); return true; }
catch (_) {
try {
const ta = renderComponent({ tag: "textarea", attrs: { "aria-hidden": "true" }, className: "fixed -top-[9999px] left-[-9999px]" });
ta.value = text; document.body.appendChild(ta); ta.focus(); ta.select();
const ok = document.execCommand("copy");
ta.remove();
if (ok) toast("Copiado al portapapeles ✅"); else toast("No se pudo copiar. Selecciona y copia manualmente.", "warning");
return ok;
} catch (e) { toast("No se pudo copiar. Selecciona y copia manualmente.", "warning"); return false; }
}
}
function toast(message, kind = "info") {
const hostId = "aum-toast-host";
let host = document.getElementById(hostId);
if (!host) { host = renderComponent({ tag: "div", attrs: { id: hostId }, className: "fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] space-y-2" }); document.body.appendChild(host); }
const palette = kind === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-900" : kind === "danger" ? "bg-red-50 border-red-200 text-red-900" : "bg-white border-gray-200 text-gray-900";
const item = renderComponent({ tag: "div", className: `px-4 py-2 rounded-2xl border shadow-lg text-sm font-semibold ${palette}`.trim(), text: message });
host.appendChild(item);
setTimeout(() => item.remove(), 2200);
}
const patientInputIds = ["kine-name","patient-name","patient-rut","patient-dob","patient-age","patient-address","patient-commune","patient-phone","patient-email","patient-insurance","patient-emergency-name","patient-emergency-phone","patient-occupation","patient-work-details","patient-sport"];
function getPatientEl(id) { return document.getElementById(id); }
function ensureWeightHeightBMI() {
const ageInput = getPatientEl("patient-age");
if (!ageInput) return;
if (getPatientEl("patient-weight") && getPatientEl("patient-height") && getPatientEl("patient-bmi")) return;
const ageCol = ageInput.closest("div");
const grid = ageCol?.parentElement;
if (!grid) return;
const mkCol = (id, label, placeholder) => renderComponent({ tag: "div", className: "md:col-span-2", children: [renderComponent({ tag: "label", className: "aum-label", text: label }), renderComponent({ tag: "input", className: "aum-input", attrs: { id, type: "number", inputmode: "decimal", placeholder: placeholder || "" } })] });
const weightCol = mkCol("patient-weight", "Peso (kg)", "—");
const heightCol = mkCol("patient-height", "Talla (cm)", "—");
const bmiCol = renderComponent({ tag: "div", className: "md:col-span-2", children: [renderComponent({ tag: "label", className: "aum-label", text: "IMC" }), renderComponent({ tag: "input", className: "aum-input bg-gray-50", attrs: { id: "patient-bmi", type: "text", readonly: "true", placeholder: "—" } })] });
const idx = Array.from(grid.children).indexOf(ageCol);
const insertAt = idx >= 0 ? idx + 1 : grid.children.length;
grid.insertBefore(weightCol, grid.children[insertAt] || null);
grid.insertBefore(heightCol, grid.children[insertAt + 1] || null);
grid.insertBefore(bmiCol, grid.children[insertAt + 2] || null);
const weightEl = getPatientEl("patient-weight");
const heightEl = getPatientEl("patient-height");
const bmiEl = getPatientEl("patient-bmi");
const recalc = () => {
const w = Number(weightEl?.value || "");
const hcm = Number(heightEl?.value || "");
if (!Number.isFinite(w) || !Number.isFinite(hcm) || w <= 0 || hcm <= 0) { if (bmiEl) bmiEl.value = ""; return; }
const hm = hcm / 100;
const bmi = w / (hm * hm);
if (bmiEl) bmiEl.value = Number.isFinite(bmi) ? bmi.toFixed(1) : "";
};
if (weightEl) weightEl.addEventListener("input", recalc);
if (heightEl) heightEl.addEventListener("input", recalc);
}
function bindPatientInputs() {
ensureWeightHeightBMI();
const allIds = [...patientInputIds, "patient-weight", "patient-height", "patient-bmi"];
allIds.forEach((id) => {
const el = getPatientEl(id);
if (!el) return;
el.addEventListener("input", () => { state.patientData[id] = el.value ?? ""; scheduleAutosave(); });
});
}
const INTAKE_BRANCHES = [{ value: "MSK", label: "MSK" },{ value: "PF", label: "Piso pélvico" },{ value: "SPORT", label: "Deportiva" }];
function ensureGlobalIntakeState() {
if (state.globalIntake && typeof state.globalIntake === "object") return;
state.globalIntake = { branch: "MSK", tests: {}, numeric: {}, text: {}, ui: { collapsed: { basics: false, comorb: false, alerts: false, outputs: true } }, computed: { globalRules: [] } };
const defaults = { motivo: "", duracion: "", banderas_rojas_txt: "", diabetes: null, tiroides: null, cardio: null, osteoporosis: null, anticoagulantes: null, corticoides: null, autoinmune_inmunosup: null, cancer_previo: null, embarazo: null, postparto: null, depresion_ansiedad: null, tabaco: null, alcohol: null, alergias: "", meds_txt: "" };
for (const [k, v] of Object.entries(defaults)) { if (k.endsWith("_txt") || typeof v === "string") state.globalIntake.text[k] = v; else state.globalIntake.tests[k] = v; }
state.globalIntake.numeric.dolor_reposo = null;
state.globalIntake.numeric.dolor_actividad = null;
state.globalIntake.numeric.suenio = null;
const pfDefaults = { pf_incontinencia_urinaria: null, pf_incontinencia_fecal: null, pf_urgencia: null, pf_prolapso_sensacion: null, pf_dolor_pelvico: null, pf_dolor_relaciones: null, pf_estreñimiento: null };
for (const [k, v] of Object.entries(pfDefaults)) state.globalIntake.tests[k] = v;
state.globalIntake.text.sport_objetivo = "";
state.globalIntake.text.sport_disciplina = "";
state.globalIntake.tests.sport_competitivo = null;
state.globalIntake.text.sport_carga_semana = "";
}
function toggleIntakeSection(key) { ensureGlobalIntakeState(); state.globalIntake.ui.collapsed[key] = !state.globalIntake.ui.collapsed[key]; renderIntakeRemote(); scheduleAutosave(); }
function sectionShell({ title, subtitle, icon, collapsed, onToggle, badges = [], children = [] }) {
const chevron = iconEl("fa-chevron-down", "text-white/80 transition-transform");
if (!collapsed) chevron.classList.add("rotate-180");
const header = renderComponent({ tag: "button", className: "w-full text-left bg-brand-dark px-5 py-4 flex items-center justify-between gap-4", attrs: { type: "button" }, on: { click: onToggle }, children: [
renderComponent({ tag: "div", className: "flex items-center gap-3 min-w-0", children: [
renderComponent({ tag: "div", className: "w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center shrink-0", children: [iconEl(icon || "fa-clipboard-list", "text-brand-accent")] }),
renderComponent({ tag: "div", className: "min-w-0", children: [
renderComponent({ tag: "div", className: "text-white font-extrabold tracking-wide", text: title }),
subtitle ? renderComponent({ tag: "div", className: "text-white/60 text-sm font-semibold mt-0.5", text: subtitle }) : null
].filter(Boolean) })
] }),
renderComponent({ tag: "div", className: "flex items-center gap-2 shrink-0", children: [...badges, renderComponent({ tag: "span", className: "w-9 h-9 rounded-full flex items-center justify-center bg-white/10", children: [chevron] })] })
] });
const content = renderComponent({ tag: "div", className: "p-5 space-y-4", attrs: { "data-intake-content": title }, children });
if (collapsed) content.hidden = true;
return renderComponent({ tag: "section", className: "bg-white rounded-3xl shadow-lg overflow-hidden border border-black/5", children: [header, content] });
}
function infoPill(text, kind = "info") {
const cls = kind === "danger" ? "bg-red-50 text-red-700 border-red-200" : kind === "warning" ? "bg-yellow-50 text-yellow-800 border-yellow-200" : "bg-blue-50 text-blue-700 border-blue-200";
return renderComponent({ tag: "span", className: `text-xs font-extrabold px-2 py-1 rounded-full border ${cls}`.trim(), text });
}
function triControl({ value, onChange, withStrongVisual = true }) {
const container = renderComponent({ tag: "div", className: "inline-flex rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm" });
const mkBtn = (v, label) => renderComponent({ tag: "button", className: "px-3 py-2 text-xs font-extrabold tracking-wide transition-all", attrs: { type: "button", "data-tri": v }, text: label });
container.appendChild(mkBtn("null", "No eval."));
container.appendChild(mkBtn("false", "No"));
container.appendChild(mkBtn("true", "Sí"));
const apply = (val) => {
const activeClasses = { null: withStrongVisual ? ["bg-gray-200", "text-gray-800"] : ["bg-brand-dark", "text-white"], false: withStrongVisual ? ["bg-red-600", "text-white"] : ["bg-brand-dark", "text-white"], true: withStrongVisual ? ["bg-emerald-600", "text-white"] : ["bg-brand-dark", "text-white"] };
const borderClasses = { null: "border-gray-200", false: "border-red-300", true: "border-emerald-300" };
container.classList.remove("border-gray-200", "border-red-300", "border-emerald-300");
container.classList.add(borderClasses[val === null ? "null" : val ? "true" : "false"]);
$$("button[data-tri]", container).forEach((b) => {
const key = b.dataset.tri;
const isActive = (key === "null" && val === null) || (key === "true" && val === true) || (key === "false" && val === false);
b.className = "px-3 py-2 text-xs font-extrabold tracking-wide transition-all";
if (isActive) b.classList.add(...activeClasses[key === "null" ? "null" : key === "true" ? "true" : "false"]);
else b.classList.add("bg-white", "text-gray-600", "hover:bg-gray-50");
});
};
container.addEventListener("click", (e) => {
const btn = e.target.closest("button[data-tri]");
if (!btn) return;
const v = btn.dataset.tri;
const next = v === "true" ? true : v === "false" ? false : null;
onChange(next);
apply(next);
});
apply(value);
return container;
}
function quadControlPF({ value, onChange }) {
const container = renderComponent({ tag: "div", className: "inline-flex rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm" });
const mkBtn = (v, label) => renderComponent({ tag: "button", className: "px-3 py-2 text-xs font-extrabold tracking-wide transition-all", attrs: { type: "button", "data-quad": v }, text: label });
container.appendChild(mkBtn("null", "No eval."));
container.appendChild(mkBtn("false", "No"));
container.appendChild(mkBtn("true", "Sí"));
container.appendChild(mkBtn("pnr", "Pref. no resp."));
const apply = (val) => {
container.classList.remove("border-gray-200", "border-red-300", "border-emerald-300", "border-slate-300");
const border = val === true ? "border-emerald-300" : val === false ? "border-red-300" : val === "pnr" ? "border-slate-300" : "border-gray-200";
container.classList.add(border);
$$("button[data-quad]", container).forEach((b) => {
const key = b.dataset.quad;
const isActive = (key === "null" && val === null) || (key === "true" && val === true) || (key === "false" && val === false) || (key === "pnr" && val === "pnr");
b.className = "px-3 py-2 text-xs font-extrabold tracking-wide transition-all";
if (isActive) {
if (key === "true") b.classList.add("bg-emerald-600", "text-white");
else if (key === "false") b.classList.add("bg-red-600", "text-white");
else if (key === "pnr") b.classList.add("bg-slate-700", "text-white");
else b.classList.add("bg-gray-200", "text-gray-800");
} else b.classList.add("bg-white", "text-gray-600", "hover:bg-gray-50");
});
};
container.addEventListener("click", (e) => {
const btn = e.target.closest("button[data-quad]");
if (!btn) return;
const v = btn.dataset.quad;
const next = v === "true" ? true : v === "false" ? false : v === "pnr" ? "pnr" : null;
onChange(next);
apply(next);
});
apply(value);
return container;
}
function labeledRow(label, controlNode, hint = "") {
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
renderComponent({ tag: "div", className: "flex items-start justify-between gap-4", children: [
renderComponent({ tag: "div", className: "min-w-0", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: label }),
hint ? renderComponent({ tag: "div", className: "text-sm text-gray-600 mt-1", text: hint }) : null
].filter(Boolean) }),
renderComponent({ tag: "div", className: "shrink-0", children: [controlNode] })
] })
] });
}
function intakeTextField(id, label, placeholder = "—") {
const input = renderComponent({ tag: "input", className: "aum-input", attrs: { type: "text", placeholder } });
input.value = state.globalIntake.text[id] || "";
input.addEventListener("input", () => { state.globalIntake.text[id] = input.value; scheduleAutosave(); });
return labeledRow(label, input);
}
function intakeTextarea(id, label, placeholder = "—") {
const ta = renderComponent({ tag: "textarea", className: "aum-input min-h-[96px] resize-y", attrs: { placeholder } });
ta.value = state.globalIntake.text[id] || "";
ta.addEventListener("input", () => { state.globalIntake.text[id] = ta.value; scheduleAutosave(); });
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [renderComponent({ tag: "div", className: "font-extrabold text-brand-dark mb-2", text: label }), ta] });
}
function intakeNumeric(id, label, min = 0, max = 10, step = 1, hint = "") {
const input = renderComponent({ tag: "input", className: "aum-input", attrs: { type: "number", inputmode: "decimal", min: String(min), max: String(max), step: String(step), placeholder: "—" } });
const v = state.globalIntake.numeric[id];
input.value = v === null || v === undefined ? "" : String(v);
input.addEventListener("input", () => { const n = input.value === "" ? null : Number(input.value); state.globalIntake.numeric[id] = Number.isFinite(n) ? n : null; scheduleAutosave(); evaluateGlobalRulesAndRender(); });
return labeledRow(label, input, hint);
}
function intakeTri(id, label, hint = "") {
const val = state.globalIntake.tests[id] ?? null;
const ctrl = triControl({ value: val, onChange: (next) => { state.globalIntake.tests[id] = next; scheduleAutosave(); evaluateGlobalRulesAndRender(); } });
return labeledRow(label, ctrl, hint);
}
function intakePFQuad(id, label, hint = "") {
const val = state.globalIntake.tests[id] ?? null;
const ctrl = quadControlPF({ value: val, onChange: (next) => { state.globalIntake.tests[id] = next; scheduleAutosave(); evaluateGlobalRulesAndRender(); } });
return labeledRow(label, ctrl, hint);
}
function intakeSelectBranch() {
const select = renderComponent({ tag: "select", className: "aum-input cursor-pointer font-extrabold", children: INTAKE_BRANCHES.map((o) => renderComponent({ tag: "option", attrs: { value: o.value }, text: o.label })) });
select.value = state.globalIntake.branch || "MSK";
select.addEventListener("change", () => { state.globalIntake.branch = select.value; scheduleAutosave(); renderIntakeRemote(); evaluateGlobalRulesAndRender(); });
return labeledRow("Rama del Intake", select, "Define el set de preguntas esenciales según el tipo de atención.");
}
function truthyTri(v) { return v === true; }
function globalCtx() { return { patient: state.patientData || {}, intake: state.globalIntake || { tests: {}, numeric: {}, text: {}, branch: "MSK" }, modules: state.activeModules || [] }; }
const GLOBAL_RULES = [
{ id: "anticoagulantes", severity: "danger", title: "Anticoagulantes / alto riesgo de sangrado", description: "Evita técnicas invasivas (punción, electrolisis, etc.) sin autorización médica y plan de manejo del riesgo.", when: (ctx) => truthyTri(ctx.intake.tests.anticoagulantes), actions: ["Confirmar fármaco/dosis (warfarina, DOAC, antiagregantes) y última toma.","Consultar con médico si se planifica técnica invasiva o si hay hematomas/sangrado espontáneo.","Preferir estrategias no invasivas y educación + carga progresiva."], consider: ["Riesgo de hematoma, sangrado prolongado.","Precaución con masaje profundo y manipulación de tejidos."] },
{ id: "diabetes", severity: "warning", title: "Diabetes / riesgo de cicatrización y neuropatía", description: "Ajusta carga y control de tejidos; monitoriza sensibilidad, perfusión y respuesta a ejercicio.", when: (ctx) => truthyTri(ctx.intake.tests.diabetes), actions: ["Screening de sensibilidad (si aplica), dolor neuropático y control glicémico.","Progresión de carga conservadora si hay tendinopatía y comorbilidades.","Educar sobre signos de irritación/infección en piel/tejidos."], consider: ["Neuropatía, menor tolerancia a carga, recuperación más lenta."] },
{ id: "osteoporosis", severity: "warning", title: "Osteoporosis / riesgo de fractura", description: "Evita altas fuerzas/torques no controlados; prioriza progresión gradual, fuerza y equilibrio.", when: (ctx) => truthyTri(ctx.intake.tests.osteoporosis), actions: ["Evitar HVLA/manipulaciones de alta velocidad sin indicación clara.","Enseñar técnica y progresar cargas con control (fuerza/resistencia).","Si dolor agudo post-trauma o dolor nocturno severo: considerar evaluación médica."], consider: ["Riesgo de fractura por fragilidad, especialmente si hay dolor agudo o trauma mínimo."] },
{ id: "corticoides", severity: "warning", title: "Uso de corticoides", description: "Considera riesgo tendinoso, piel frágil y comorbilidades asociadas; individualiza carga.", when: (ctx) => truthyTri(ctx.intake.tests.corticoides), actions: ["Confirmar tipo (sistémico vs local), duración y motivo.","Cautela con carga explosiva y progresiones bruscas, especialmente en tendones."], consider: ["Mayor riesgo de lesión tendinosa (dependiente de contexto) y fragilidad tisular."] },
{ id: "cardio", severity: "warning", title: "Comorbilidad cardiovascular", description: "Precauciones de ejercicio: monitoriza síntomas, presión y tolerancia; prioriza seguridad.", when: (ctx) => truthyTri(ctx.intake.tests.cardio), actions: ["Indagar síntomas de alarma con ejercicio (dolor torácico, disnea desproporcionada, síncope).","Monitorear respuesta (RPE, disnea, presión si disponible).","Escalar progresión aeróbica/fortalecimiento según tolerancia."], consider: ["Riesgo aumentado en esfuerzos intensos; aplicar progresión graduada."] },
{ id: "cancer_previo", severity: "info", title: "Cáncer previo (historia)", description: "Mantén screening de banderas rojas y coordina si hay síntomas sistémicos nuevos.", when: (ctx) => truthyTri(ctx.intake.tests.cancer_previo), actions: ["Preguntar por síntomas sistémicos nuevos (baja de peso no explicada, fiebre, sudoración nocturna).","Si dolor progresivo/nocturno sin explicación mecánica: derivar para evaluación médica."], consider: ["Mayor umbral de sospecha ante síntomas sistémicos o dolor atípico."] },
{ id: "autoinmune_inmunosup", severity: "warning", title: "Autoinmune / inmunosupresión", description: "Riesgo de infección y alteración en recuperación; ajustar intervención y vigilancia.", when: (ctx) => truthyTri(ctx.intake.tests.autoinmune_inmunosup), actions: ["Confirmar fármacos inmunosupresores y estado general.","Cautela con técnicas invasivas y control de piel/tejidos."], consider: ["Mayor susceptibilidad a infección, fatiga, variabilidad de síntomas."] },
{ id: "embarazo_postparto", severity: "info", title: "Embarazo / postparto", description: "Ajusta posiciones y carga; considera síntomas pélvicos, diástasis y fatiga.", when: (ctx) => truthyTri(ctx.intake.tests.embarazo) || truthyTri(ctx.intake.tests.postparto), actions: ["Evitar posiciones prolongadas supinas en etapas avanzadas (según tolerancia).","Integrar screening de piso pélvico si hay síntomas urinarios/pélvicos.","Progresar fuerza y retorno a actividad según síntomas y carga total."], consider: ["Cambios hormonales y de carga, tolerancia variable, relevancia del PF."] }
];
function evaluateGlobalRules() {
const ctx = globalCtx();
const out = [];
for (const rule of GLOBAL_RULES) {
let ok = false;
try { ok = !!rule.when(ctx); } catch (_) { ok = false; }
if (ok) out.push(rule);
}
const order = { danger: 0, warning: 1, info: 2 };
out.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
return out;
}
function renderRuleCard(rule) {
const sev = rule.severity || "info";
const palette = sev === "danger" ? { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "fa-triangle-exclamation" } : sev === "warning" ? { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-900", icon: "fa-triangle-exclamation" } : { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", icon: "fa-circle-info" };
const listBlock = (title, items) => {
if (!items || !items.length) return null;
return renderComponent({ tag: "div", className: "mt-3", children: [
renderComponent({ tag: "div", className: `text-xs font-extrabold uppercase tracking-wide ${palette.text}`.trim(), text: title }),
renderComponent({ tag: "ul", className: "mt-2 list-disc pl-5 space-y-1 text-sm text-gray-800", children: items.map((t) => renderComponent({ tag: "li", text: t })) })
] });
};
return renderComponent({ tag: "div", className: `p-4 rounded-2xl border ${palette.bg} ${palette.border}`.trim(), children: [
renderComponent({ tag: "div", className: "flex items-start gap-3", children: [
renderComponent({ tag: "div", className: `w-9 h-9 rounded-full flex items-center justify-center ${palette.bg}`.trim(), children: [iconEl(palette.icon, palette.text)] }),
renderComponent({ tag: "div", className: "min-w-0", children: [
renderComponent({ tag: "div", className: `font-extrabold ${palette.text}`.trim(), text: rule.title || "Alerta" }),
rule.description ? renderComponent({ tag: "div", className: "text-sm text-gray-800 mt-1", text: rule.description }) : null,
listBlock("Acciones ahora", rule.actions || rule.nextSteps || []),
listBlock("Consideraciones", rule.consider || rule.considerations || [])
].filter(Boolean) })
] })
] });
}
function evaluateGlobalRulesAndRender() {
ensureGlobalIntakeState();
state.globalIntake.computed.globalRules = evaluateGlobalRules();
const alertsHost = $("#intake-global-alerts");
if (alertsHost) {
alertsHost.replaceChildren();
const rules = state.globalIntake.computed.globalRules || [];
if (!rules.length) {
alertsHost.appendChild(renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-700 font-semibold", text: "Sin alertas globales activas (según comorbilidades/medicación marcadas)." }));
} else { rules.forEach((r) => alertsHost.appendChild(renderRuleCard(r))); }
}
const soapEl = $("#intake-soap-text");
if (soapEl) soapEl.value = generateSOAP();
const derEl = $("#intake-deriv-text");
if (derEl) derEl.value = generateDerivacion();
}
function renderIntakeRemote() {
ensureGlobalIntakeState();
const root = $("#intake-remote-root");
if (!root) return;
root.replaceChildren();
const activeRules = (state.globalIntake.computed.globalRules || []).length;
const badges = [];
if (activeRules > 0) badges.push(infoPill(`Alertas: ${activeRules}`, "warning"));
const basicsCollapsed = !!state.globalIntake.ui.collapsed.basics;
const comorbCollapsed = !!state.globalIntake.ui.collapsed.comorb;
const alertsCollapsed = !!state.globalIntake.ui.collapsed.alerts;
const outputsCollapsed = !!state.globalIntake.ui.collapsed.outputs;
const basics = sectionShell({ title: "Intake Remoto Global", subtitle: "Siempre presente · ramas MSK / PF / Deportiva", icon: "fa-clipboard-check", collapsed: basicsCollapsed, onToggle: () => toggleIntakeSection("basics"), badges, children: [
intakeSelectBranch(),
renderComponent({ tag: "div", className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
intakeTextField("motivo", "Motivo principal (breve)", "Ej: dolor hombro al overhead"),
intakeTextField("duracion", "Duración / evolución", "Ej: 3 semanas, progresivo"),
intakeNumeric("dolor_reposo", "Dolor reposo (0–10)", 0, 10, 1),
intakeNumeric("dolor_actividad", "Dolor actividad (0–10)", 0, 10, 1),
intakeNumeric("suenio", "Impacto en sueño (0–10)", 0, 10, 1, "0 = sin impacto, 10 = no duerme por dolor")
] }),
intakeTextarea("banderas_rojas_txt", "Banderas rojas (texto libre / si aplica)", "Ej: fiebre, baja de peso, dolor nocturno no mecánico…"),
renderIntakeBranchBlock()
] });
const comorb = sectionShell({ title: "Comorbilidades y medicación", subtitle: "Tri-estado · dispara reglas globales", icon: "fa-notes-medical", collapsed: comorbCollapsed, onToggle: () => toggleIntakeSection("comorb"), children: [
renderComponent({ tag: "div", className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
intakeTri("diabetes", "Diabetes"),
intakeTri("tiroides", "Tiroides"),
intakeTri("cardio", "Cardiovascular"),
intakeTri("osteoporosis", "Osteoporosis"),
intakeTri("anticoagulantes", "Anticoagulantes / antiagregantes"),
intakeTri("corticoides", "Corticoides (sistémicos o frecuentes)"),
intakeTri("autoinmune_inmunosup", "Autoinmune / inmunosupresión"),
intakeTri("cancer_previo", "Cáncer previo"),
intakeTri("embarazo", "Embarazo"),
intakeTri("postparto", "Postparto"),
intakeTri("depresion_ansiedad", "Depresión / ansiedad (impacto relevante)"),
intakeTri("tabaco", "Tabaco"),
intakeTri("alcohol", "Alcohol (problemático)")
] }),
intakeTextarea("alergias", "Alergias", "—"),
intakeTextarea("meds_txt", "Medicación relevante (texto libre)", "Ej: DOAC, estatinas, antidepresivos, etc.")
] });
const alerts = sectionShell({ title: "Alertas y consideraciones (motor global)", subtitle: "Acciones ahora · sugerencias de evaluación/plan", icon: "fa-triangle-exclamation", collapsed: alertsCollapsed, onToggle: () => toggleIntakeSection("alerts"), children: [renderComponent({ tag: "div", attrs: { id: "intake-global-alerts" }, className: "space-y-3" })] });
const outputs = sectionShell({ title: "Salidas rápidas (SOAP / Derivación)", subtitle: "Se auto-actualiza · botón para copiar", icon: "fa-file-lines", collapsed: outputsCollapsed, onToggle: () => toggleIntakeSection("outputs"), children: [renderOutputsBlock()] });
root.appendChild(renderComponent({ tag: "div", className: "space-y-4", children: [basics, comorb, alerts, outputs] }));
evaluateGlobalRulesAndRender();
}
function renderOutputsBlock() {
const soap = renderComponent({ tag: "textarea", className: "aum-input min-h-[140px] resize-y", attrs: { id: "intake-soap-text", placeholder: "SOAP aparecerá aquí…" } });
soap.value = generateSOAP();
const deriv = renderComponent({ tag: "textarea", className: "aum-input min-h-[160px] resize-y", attrs: { id: "intake-deriv-text", placeholder: "Derivación aparecerá aquí…" } });
deriv.value = generateDerivacion();
const mkCopyBtn = (label, getText) => renderComponent({ tag: "button", className: "px-4 py-2 rounded-xl bg-brand-dark text-white text-sm font-extrabold hover:bg-gray-800 transition-all hide-on-pdf", attrs: { type: "button" }, text: label, on: { click: () => copyToClipboard(getText()) } });
return renderComponent({ tag: "div", className: "space-y-4", children: [
renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
renderComponent({ tag: "div", className: "flex items-start justify-between gap-3", children: [renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Resumen SOAP" }), mkCopyBtn("Copiar SOAP", () => soap.value)] }),
renderComponent({ tag: "div", className: "mt-3", children: [soap] })
] }),
renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
renderComponent({ tag: "div", className: "flex items-start justify-between gap-3", children: [renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Borrador de derivación" }), mkCopyBtn("Copiar derivación", () => deriv.value)] }),
renderComponent({ tag: "div", className: "mt-3", children: [deriv] })
] })
] });
}
function renderIntakeBranchBlock() {
const b = state.globalIntake.branch || "MSK";
if (b === "PF") {
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Rama PF (Piso pélvico)" }),
renderComponent({ tag: "div", className: "text-sm text-gray-700 mt-1", text: "Incluye opción “Prefiero no responder” en preguntas sensibles." }),
renderComponent({ tag: "div", className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4", children: [
intakePFQuad("pf_incontinencia_urinaria", "Incontinencia urinaria"),
intakePFQuad("pf_urgencia", "Urgencia miccional"),
intakePFQuad("pf_incontinencia_fecal", "Incontinencia fecal/gases"),
intakePFQuad("pf_estreñimiento", "Estreñimiento"),
intakePFQuad("pf_prolapso_sensacion", "Sensación de bulto / prolapso"),
intakePFQuad("pf_dolor_pelvico", "Dolor pélvico"),
intakePFQuad("pf_dolor_relaciones", "Dolor en relaciones sexuales")
] })
] });
}
if (b === "SPORT") {
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Rama Deportiva" }),
renderComponent({ tag: "div", className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4", children: [
intakeTextField("sport_disciplina", "Disciplina/deporte", "Ej: running, crossfit, tenis"),
intakeTextField("sport_objetivo", "Objetivo (return to sport / performance)", "Ej: volver a competir 10K"),
intakeTri("sport_competitivo", "¿Compite actualmente?"),
intakeTextField("sport_carga_semana", "Carga semanal (texto libre)", "Ej: 4 sesiones + 25 km")
] })
] });
}
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Rama MSK" }),
renderComponent({ tag: "div", className: "text-sm text-gray-700 mt-1", text: "Usa módulos específicos del Stack para razonamiento por segmento." })
] });
}
function getName(id, fallback = "") { const v = state.patientData?.[id]; return (v && String(v).trim()) || fallback; }
function aggregateTopHypotheses(n) {
const all = [];
state.activeModules.forEach((m) => { const list = Array.isArray(m?.computed?.hypotheses) ? m.computed.hypotheses : []; list.forEach((h) => all.push({ ...h, moduleKey: m.key, moduleId: m.instanceId })); });
all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
return all.slice(0, n);
}
function generateSOAP() {
ensureGlobalIntakeState();
const pName = getName("patient-name", "Paciente");
const edad = getName("patient-age", "");
const motivo = (state.globalIntake.text.motivo || "").trim();
const dur = (state.globalIntake.text.duracion || "").trim();
const dr = state.globalIntake.numeric.dolor_reposo;
const da = state.globalIntake.numeric.dolor_actividad;
const sueño = state.globalIntake.numeric.suenio;
const hyp = aggregateTopHypotheses(3);
const outcomes = [];
state.activeModules.forEach((m) => { if (m?.computed?.spadi?.totalPct !== null && m?.computed?.spadi?.totalPct !== undefined) outcomes.push(`SPADI: ${m.computed.spadi.totalPct.toFixed(0)}%`); if (m?.computed?.dash?.total !== null && m?.computed?.dash?.total !== undefined) outcomes.push(`DASH: ${m.computed.dash.total.toFixed(0)}`); });
const sLines = [`S: ${pName}${edad ? ` (${edad} años)` : ""}. ${motivo || "Motivo no especificado."}${dur ? ` Duración: ${dur}.` : ""}`, `Dolor: reposo ${dr ?? "—"}/10 · actividad ${da ?? "—"}/10 · sueño ${sueño ?? "—"}/10.`];
const oLines = [`O: Módulos activos: ${state.activeModules.length || 0}.`, outcomes.length ? `Outcomes: ${outcomes.join(" · ")}.` : "Outcomes: —"];
const aLines = [`A: ${hyp.length ? hyp.map((h, i) => `${i + 1}) ${h.title} (${h.score})`).join(" · ") : "Hipótesis no definidas aún."}`];
const pLines = [];
const g = (state.globalIntake.computed.globalRules || []).slice(0, 3);
if (g.length) pLines.push(`Consideraciones globales: ${g.map((r) => r.title).join(" · ")}.`);
const planBullets = [];
state.activeModules.forEach((m) => { const derived = derivePlan(m); const short = derived?.bullets?.slice(0, 3) || []; if (short.length) planBullets.push(`${m.title || m.key}: ${short.join(" / ")}`); });
if (planBullets.length) pLines.push(`Plan inicial (resumen): ${planBullets.join(" | ")}`); else pLines.push("Plan inicial: —");
return [sLines.join("\n"), oLines.join("\n"), aLines.join("\n"), `P: ${pLines.join(" ")}`].join("\n\n");
}
function generateDerivacion() {
ensureGlobalIntakeState();
const kine = getName("kine-name", "Kinesiólogo/a");
const pName = getName("patient-name", "Paciente");
const rut = getName("patient-rut", "");
const edad = getName("patient-age", "");
const motivo = (state.globalIntake.text.motivo || "").trim();
const dur = (state.globalIntake.text.duracion || "").trim();
const redFlags = (state.globalIntake.text.banderas_rojas_txt || "").trim();
const gRules = (state.globalIntake.computed.globalRules || []).filter((r) => r.severity === "danger" || r.severity === "warning");
const hyp = aggregateTopHypotheses(3);
const hypLine = hyp.length ? hyp.map((h, i) => `${i + 1}) ${h.title}`).join(" · ") : "—";
const lines = [`A quien corresponda,`,``,`Derivo a ${pName}${edad ? ` (${edad} años)` : ""}${rut ? `, RUT: ${rut}` : ""} para evaluación médica/imagen/criterio según contexto clínico.`,``,`Motivo: ${motivo || "—"}`, dur ? `Evolución: ${dur}` : null, redFlags ? `Banderas rojas / puntos de atención: ${redFlags}` : null, gRules.length ? `Consideraciones (comorbilidades/medicación): ${gRules.map((r) => r.title).join(" · ")}` : null, `Hipótesis funcionales principales: ${hypLine}`,``,`Atte.,`,`${kine}`].filter(Boolean);
return lines.join("\n");
}
"""
// ===== app.js PART 2/3 =====
};
function getTemplates() { const modules = window.clinicalModules; if (!modules || typeof modules !== "object") return {}; return modules; }
function fillModuleSelector() {
const sel = document.getElementById("moduleSelector");
if (!sel) return;
const templates = getTemplates();
const keys = Object.keys(templates);
sel.replaceChildren();
keys.forEach((k) => { const tpl = templates[k]; const opt = renderComponent({ tag: "option", attrs: { value: k }, text: tpl?.title || k }); sel.appendChild(opt); });
}
function newInstanceId() { return `m_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
function ensureModuleState(m, tpl) {
if (!m.tests) m.tests = {};
if (!m.numeric) m.numeric = {};
if (!m.text) m.text = {};
if (!m.ui) m.ui = {};
if (!m.ui.collapsedSections) m.ui.collapsedSections = {};
if (!m.ui.quickInclude) m.ui.quickInclude = {};
if (!m.ui.mode) m.ui.mode = "full";
if (!m.computed) m.computed = {};
if (tpl?.sections) {
tpl.sections.forEach((sec) => {
(sec.fields || []).forEach((f) => {
if (!f || !f.id) return;
if (f.type === "boolean" || f.type === "triBool" || f.type === "checkbox") {
if (!(f.id in m.tests)) m.tests[f.id] = null;
const sevKey = `sev_${f.id}`;
if (!(sevKey in m.text)) m.text[sevKey] = "";
}
if (f.type === "number" || f.type === "numeric") { if (!(f.id in m.numeric)) m.numeric[f.id] = null; }
if (f.type === "text" || f.type === "textarea" || f.type === "select") { if (!(f.id in m.text)) m.text[f.id] = ""; }
});
});
}
if (tpl?.sections) {
tpl.sections.forEach((sec, idx) => {
const t = (sec.title || "").toLowerCase();
if (t.includes("spadi") || t.includes("dash") || t.includes("quickdash")) { if (!(idx in m.ui.collapsedSections)) m.ui.collapsedSections[idx] = true; }
});
}
}
function addSelectedModule() {
const sel = document.getElementById("moduleSelector");
if (!sel) return;
const key = sel.value;
const tpl = getTemplates()[key];
if (!tpl) return toast("No se encontró el módulo seleccionado.", "warning");
const instanceId = newInstanceId();
const m = { instanceId, key, title: tpl.title || key, icon: tpl.icon || "fa-layer-group", tests: {}, numeric: {}, text: {}, ui: { mode: "quick" }, computed: {} };
ensureModuleState(m, tpl);
state.activeModules.push(m);
state.meta.updatedAt = new Date().toISOString();
renderActiveTags();
renderClinicalStack();
scheduleAutosave();
}
function removeModule(instanceId) { state.activeModules = state.activeModules.filter((m) => m.instanceId !== instanceId); renderActiveTags(); renderClinicalStack(); scheduleAutosave(); }
function resetStack() {
if (!confirm("¿Resetear el stack clínico? Se perderán los módulos actuales (puedes exportar .aum antes).")) return;
state.activeModules = [];
state.meta.updatedAt = new Date().toISOString();
renderActiveTags();
renderClinicalStack();
scheduleAutosave();
}
function isSectionEssential(tpl, section, idx) {
if (section?.quick === true || section?.essential === true) return true;
const title = (section?.title || "").toLowerCase();
if (title.includes("bandera") || title.includes("red flag") || title.includes("irrit")) return true;
if (title.includes("clasific") || title.includes("hipótesis") || title.includes("hipotes")) return true;
if (title.includes("plan") || title.includes("trat")) return true;
if (title.includes("spadi") || title.includes("dash") || title.includes("quickdash")) return true;
const qp = tpl?.quickProfile;
if (qp?.sections && Array.isArray(qp.sections)) { return qp.sections.some((s) => String(s).toLowerCase() === title); }
return idx <= 1;
}
function shouldRenderSection(m, tpl, section, idx) {
if (m.ui.mode !== "quick") return true;
if (isSectionEssential(tpl, section, idx)) return true;
return !!m.ui.quickInclude[idx];
}
function fieldLabel(text) { return renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text }); }
function fieldHint(text) { if (!text) return null; return renderComponent({ tag: "div", className: "text-sm text-gray-600 mt-1", text }); }
function severitySelect(current, onChange) {
const sel = renderComponent({ tag: "select", className: "aum-input !py-2 !px-3 !text-sm font-extrabold cursor-pointer", children: [
renderComponent({ tag: "option", attrs: { value: "" }, text: "Severidad (opcional)" }),
renderComponent({ tag: "option", attrs: { value: "Leve" }, text: "Leve" }),
renderComponent({ tag: "option", attrs: { value: "Moderado" }, text: "Moderado" }),
renderComponent({ tag: "option", attrs: { value: "Severo" }, text: "Severo" })
] });
sel.value = current || "";
sel.addEventListener("change", () => onChange(sel.value));
return sel;
}
function triBoolWithSeverity({ m, field }) {
const val = m.tests[field.id] ?? null;
const tri = triControl({ value: val, onChange: (next) => { m.tests[field.id] = next; if (next !== true) m.text[`sev_${field.id}`] = ""; scheduleAutosave(); refreshAfterModuleChange(m); } });
const sevKey = `sev_${field.id}`;
const sev = m.text[sevKey] || "";
const sevWrap = renderComponent({ tag: "div", className: "mt-3", children: [] });
const updateSevUI = () => {
sevWrap.replaceChildren();
if (m.tests[field.id] === true) {
sevWrap.appendChild(renderComponent({ tag: "div", className: "grid grid-cols-1 md:grid-cols-2 gap-3 items-center", children: [
renderComponent({ tag: "div", className: "text-sm font-extrabold text-gray-700", text: "Severidad" }),
severitySelect(sev, (v) => { m.text[sevKey] = v; scheduleAutosave(); refreshAfterModuleChange(m); })
] }));
}
};
updateSevUI();
tri.addEventListener("click", () => setTimeout(updateSevUI, 0));
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
fieldLabel(field.label || field.title || field.id),
fieldHint(field.hint || field.help || ""),
renderComponent({ tag: "div", className: "mt-3", children: [tri] }),
sevWrap
] });
}
function textField({ m, field }) {
const input = renderComponent({ tag: field.type === "textarea" ? "textarea" : "input", className: "aum-input", attrs: field.type === "textarea" ? { placeholder: field.placeholder || "—" } : { type: "text", placeholder: field.placeholder || "—" } });
input.value = m.text[field.id] || "";
input.addEventListener("input", () => { m.text[field.id] = input.value; scheduleAutosave(); refreshAfterModuleChange(m); });
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [fieldLabel(field.label || field.title || field.id), fieldHint(field.hint || field.help || ""), renderComponent({ tag: "div", className: "mt-3", children: [input] })].filter(Boolean) });
}
function numericField({ m, field }) {
const min = field.min ?? 0;
const max = field.max ?? 10;
const step = field.step ?? 1;
const input = renderComponent({ tag: "input", className: "aum-input", attrs: { type: "number", inputmode: "decimal", min: String(min), max: String(max), step: String(step), placeholder: field.placeholder || "—" } });
const v = m.numeric[field.id];
input.value = v === null || v === undefined ? "" : String(v);
input.addEventListener("input", () => { const n = input.value === "" ? null : Number(input.value); m.numeric[field.id] = Number.isFinite(n) ? n : null; scheduleAutosave(); refreshAfterModuleChange(m); });
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [fieldLabel(field.label || field.title || field.id), fieldHint(field.hint || field.help || ""), renderComponent({ tag: "div", className: "mt-3", children: [input] })].filter(Boolean) });
}
function selectField({ m, field }) {
const opts = Array.isArray(field.options) ? field.options : [];
const select = renderComponent({ tag: "select", className: "aum-input cursor-pointer font-extrabold", children: [renderComponent({ tag: "option", attrs: { value: "" }, text: field.placeholder || "—" }), ...opts.map((o) => { if (typeof o === "string") return renderComponent({ tag: "option", attrs: { value: o }, text: o }); return renderComponent({ tag: "option", attrs: { value: o.value }, text: o.label || o.value }); })] });
select.value = m.text[field.id] || "";
select.addEventListener("change", () => { m.text[field.id] = select.value; scheduleAutosave(); refreshAfterModuleChange(m); });
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [fieldLabel(field.label || field.title || field.id), fieldHint(field.hint || field.help || ""), renderComponent({ tag: "div", className: "mt-3", children: [select] })].filter(Boolean) });
}
function renderField({ m, field }) {
if (!field || !field.id) return null;
const t = field.type || "text";
if (t === "boolean" || t === "triBool" || t === "checkbox") return triBoolWithSeverity({ m, field });
if (t === "number" || t === "numeric") return numericField({ m, field });
if (t === "select") return selectField({ m, field });
if (t === "textarea" || t === "text") return textField({ m, field });
return textField({ m, field: { ...field, type: "text" } });
}
function sectionHeaderBadges(m, sectionTitle) {
const t = (sectionTitle || "").toLowerCase();
const badges = [];
if (t.includes("spadi")) {
const sp = m?.computed?.spadi;
if (sp && sp.totalPct !== null && sp.totalPct !== undefined) {
const label = `SPADI ${sp.totalPct.toFixed(0)}%${sp.complete ? "" : ` · incompleto ${sp.answered}/${sp.expected}`}`;
badges.push(infoPill(label, sp.complete ? "info" : "warning"));
}
}
if (t.includes("dash")) {
const da = m?.computed?.dash;
if (da && da.total !== null && da.total !== undefined) {
const label = `DASH ${da.total.toFixed(0)}${da.complete ? "" : ` · incompleto ${da.answered}/${da.expected}`}`;
badges.push(infoPill(label, da.complete ? "info" : "warning"));
}
}
return badges;
}
function outcomesPreviewNode(m, sectionTitle) {
const t = (sectionTitle || "").toLowerCase();
if (t.includes("spadi")) {
const sp = m?.computed?.spadi;
if (!sp || sp.totalPct === null || sp.totalPct === undefined) return null;
return renderComponent({ tag: "div", className: "p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-800", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: `SPADI: ${sp.totalPct.toFixed(0)}% (${spadiSeverityLabel(sp.totalPct)})` }),
renderComponent({ tag: "div", className: "mt-1", text: spadiInterpretation(sp.totalPct) }),
!sp.complete ? renderComponent({ tag: "div", className: "mt-2 font-extrabold text-yellow-800", text: `Incompleto: ${sp.answered}/${sp.expected} ítems.` }) : null,
renderComponent({ tag: "div", className: "mt-2 text-gray-700", text: "Recomendación: usa el score para guiar metas funcionales y dosificación según irritabilidad/tolerancia." })
].filter(Boolean) });
}
if (t.includes("dash")) {
const da = m?.computed?.dash;
if (!da || da.total === null || da.total === undefined) return null;
return renderComponent({ tag: "div", className: "p-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-800", children: [
renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: `DASH: ${da.total.toFixed(0)} (${dashSeverityLabel(da.total)})` }),
renderComponent({ tag: "div", className: "mt-1", text: dashInterpretation(da.total) }),
!da.complete ? renderComponent({ tag: "div", className: "mt-2 font-extrabold text-yellow-800", text: `Incompleto: ${da.answered}/${da.expected} ítems.` }) : null,
renderComponent({ tag: "div", className: "mt-2 text-gray-700", text: "Recomendación: reevalúa para seguimiento (MCID/seguimiento clínico) y ajusta plan." })
].filter(Boolean) });
}
return null;
}
function renderSection({ m, tpl, section, idx }) {
const collapsed = !!m.ui.collapsedSections[idx];
const essential = isSectionEssential(tpl, section, idx);
const isQuick = m.ui.mode === "quick";
const isIncluded = shouldRenderSection(m, tpl, section, idx);
if (isQuick && !essential && !isIncluded) {
return renderComponent({ tag: "section", className: "bg-white rounded-3xl shadow-lg overflow-hidden border border-black/5", children: [
renderComponent({ tag: "div", className: "bg-brand-dark px-5 py-4 flex items-center justify-between gap-3", children: [
renderComponent({ tag: "div", className: "text-white font-extrabold tracking-wide", text: section.title || `Sección ${idx + 1}` }),
renderComponent({ tag: "button", className: "hide-on-pdf px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-extrabold hover:bg-white/20 transition-all", attrs: { type: "button" }, text: "Incluir (Rápido)", on: { click: () => { m.ui.quickInclude[idx] = true; renderClinicalStack(); scheduleAutosave(); } } })
] }),
renderComponent({ tag: "div", className: "p-4 text-sm text-gray-700 bg-gray-50", text: "Oculto en Modo Rápido (no esencial). Puedes incluirlo si lo necesitas." })
] });
}
const badges = sectionHeaderBadges(m, section.title);
const preview = outcomesPreviewNode(m, section.title);
const chevron = iconEl("fa-chevron-down", "text-white/80 transition-transform");
if (!collapsed) chevron.classList.add("rotate-180");
const header = renderComponent({ tag: "button", className: "w-full text-left bg-brand-dark px-5 py-4 flex items-center justify-between gap-4", attrs: { type: "button" }, on: { click: () => { m.ui.collapsedSections[idx] = !m.ui.collapsedSections[idx]; renderClinicalStack(); scheduleAutosave(); } }, children: [
renderComponent({ tag: "div", className: "min-w-0", children: [renderComponent({ tag: "div", className: "text-white font-extrabold tracking-wide", text: section.title || `Sección ${idx + 1}` }), section.subtitle ? renderComponent({ tag: "div", className: "text-white/60 text-sm font-semibold mt-0.5", text: section.subtitle }) : null].filter(Boolean) }),
renderComponent({ tag: "div", className: "flex items-center gap-2 shrink-0", children: [...badges, renderComponent({ tag: "span", className: "w-9 h-9 rounded-full flex items-center justify-center bg-white/10", children: [chevron] })] })
] });
const content = renderComponent({ tag: "div", className: "p-5 space-y-4", children: (section.fields || []).map((f) => renderField({ m, field: f })).filter(Boolean) });
const previewWrap = renderComponent({ tag: "div", children: preview ? [preview] : [] });
if (!preview) previewWrap.hidden = true;
if (collapsed) content.hidden = true;
if (preview) previewWrap.hidden = !collapsed;
return renderComponent({ tag: "section", className: "bg-white rounded-3xl shadow-lg overflow-hidden border border-black/5", children: [header, previewWrap, content] });
}
function getExpectedCounts(tpl, prefix) {
let expected = 0;
if (!tpl?.sections) return expected;
tpl.sections.forEach((sec) => { (sec.fields || []).forEach((f) => { if (!f?.id) return; if (String(f.id).startsWith(prefix)) expected += 1; }); });
return expected;
}
function calcSPADI(module, tpl) {
const expectedPain = getExpectedCounts(tpl, "spadi_p");
const expectedDis = getExpectedCounts(tpl, "spadi_d");
const expected = expectedPain + expectedDis;
let painSum = 0, painAns = 0, disSum = 0, disAns = 0;
for (const [k, v] of Object.entries(module.numeric || {})) {
if (!k.startsWith("spadi_")) continue;
if (v === null || v === undefined || v === "") continue;
const num = Number(v);
if (!Number.isFinite(num)) continue;
if (k.startsWith("spadi_p")) { painSum += num; painAns += 1; }
else if (k.startsWith("spadi_d")) { disSum += num; disAns += 1; }
}
if (painAns === 0 && disAns === 0) return { totalPct: null, painPct: null, disPct: null, answered: 0, expected, complete: false };
const painPct = painAns ? (painSum / (painAns * 10)) * 100 : null;
const disPct = disAns ? (disSum / (disAns * 10)) * 100 : null;
const totalPct = (() => { const parts = []; if (painPct !== null) parts.push(painPct); if (disPct !== null) parts.push(disPct); if (!parts.length) return null; return parts.reduce((a, b) => a + b, 0) / parts.length; })();
const answered = painAns + disAns;
const complete = expected ? answered >= expected : answered > 0;
return { totalPct, painPct, disPct, answered, expected, complete };
}
function calcQuickDASH(module, tpl) {
const expected = getExpectedCounts(tpl, "dash_q");
let sum = 0, answered = 0;
for (const [k, v] of Object.entries(module.numeric || {})) {
if (!k.startsWith("dash_q")) continue;
if (v === null || v === undefined || v === "") continue;
const num = Number(v);
if (!Number.isFinite(num)) continue;
sum += num; answered += 1;
}
if (answered === 0) return { total: null, answered: 0, expected, complete: false };
const mean = sum / answered;
const total = (mean - 1) * 25;
const complete = expected ? answered >= expected : answered >= 10;
return { total, answered, expected, complete };
}
function spadiSeverityLabel(pct) { if (pct < 21) return "leve"; if (pct < 41) return "moderado"; if (pct < 61) return "severo"; return "muy severo"; }
function dashSeverityLabel(score) { if (score < 21) return "leve"; if (score < 41) return "moderado"; if (score < 61) return "severo"; return "muy severo"; }
function spadiInterpretation(pct) { if (pct < 21) return "Limitación baja; objetivo: recuperar función específica y tolerancia a carga."; if (pct < 41) return "Limitación moderada; prioriza control de dolor + exposición progresiva a tareas clave."; if (pct < 61) return "Limitación alta; fase temprana: control de irritabilidad + carga dosificada y educación."; return "Limitación muy alta; considerar screening de factores agravantes, adherencia, sueño y derivación si banderas rojas."; }
function dashInterpretation(score) { if (score < 21) return "Discapacidad baja; enfoca en tareas funcionales y progresión específica."; if (score < 41) return "Discapacidad moderada; prioriza tareas limitantes + control de dolor y carga."; if (score < 61) return "Discapacidad alta; reduce irritabilidad y reintroduce gradualmente tareas clave."; return "Discapacidad muy alta; revisar diagnóstico diferencial, comorbilidades y necesidad de derivación."; }
function humanizeId(id) { return String(id || "").replace(/^cls_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function computeHypothesisRanking(m, tpl) {
const list = [];
const rules = tpl?.hypothesisRules;
if (Array.isArray(rules) && rules.length) {
rules.forEach((h) => {
const why = [];
let score = 0;
(h.rules || []).forEach((r) => {
try {
const ok = typeof r.when === "function" ? r.when(m, state) : false;
if (ok) { score += Number(r.points || 0); if (r.why) why.push(r.why); }
} catch (_) {}
});
if (score > 0 || h.alwaysShow) list.push({ id: h.id || h.title, title: h.title || humanizeId(h.id), score, why });
});
} else {
const candidates = Object.entries(m.tests || {}).filter(([k, v]) => String(k).startsWith("cls_"));
candidates.forEach(([k, v]) => {
const why = [];
let score = 0;
if (v === true) {
score += 100;
why.push("Marcado como Sí (clasificación).");
const sev = (m.text || {})[`sev_${k}`] || "";
if (sev) { score += sev === "Severo" ? 15 : sev === "Moderado" ? 10 : sev === "Leve" ? 5 : 0; why.push(`Severidad: ${sev}.`); }
} else if (v === null) { score += 5; why.push("No evaluado: considera completar para mejorar ranking."); }
list.push({ id: k, title: humanizeId(k), score, why });
});
if (!candidates.length) {
const positives = Object.entries(m.tests || {}).filter(([_, v]) => v === true).slice(0, 6);
if (positives.length) list.push({ id: "hipotesis_mecanica", title: "Hipótesis mecánica (heurística)", score: 30 + positives.length * 2, why: positives.map(([k]) => `Positivo: ${humanizeId(k)}`) });
}
}
list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
m.computed.hypotheses = list.slice(0, 3);
m.computed.hypothesesAll = list;
}
function renderHypothesesCard(m) {
const top = Array.isArray(m?.computed?.hypotheses) ? m.computed.hypotheses : [];
const all = Array.isArray(m?.computed?.hypothesesAll) ? m.computed.hypothesesAll : top;
if (!all.length) return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-700 font-semibold", text: "Aún no hay hipótesis rankeables. Marca clasificación (cls_*) y tests clave." });
const item = (h, idx) => renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
renderComponent({ tag: "div", className: "flex items-start justify-between gap-3", children: [renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: `${idx + 1}. ${h.title}` }), infoPill(`Score ${h.score}`, h.score >= 80 ? "info" : "warning")] }),
h.why?.length ? renderComponent({ tag: "ul", className: "mt-2 list-disc pl-5 space-y-1 text-sm text-gray-800", children: h.why.slice(0, 5).map((w) => renderComponent({ tag: "li", text: w })) }) : null
].filter(Boolean) });
return renderComponent({ tag: "div", className: "space-y-3", children: top.map((h, i) => item(h, i)) });
}
function evalRuleCondition(cond, m) {
if (!cond) return false;
if (typeof cond === "function") return !!cond(m);
if (typeof cond === "string") return m.tests?.[cond] === true;
if (cond.id) { const v = m.tests?.[cond.id]; return cond.is === v; }
const any = Array.isArray(cond.any) ? cond.any : null;
const all = Array.isArray(cond.all) ? cond.all : null;
const not = Array.isArray(cond.not) ? cond.not : null;
let ok = true;
if (any) ok = any.some((id) => m.tests?.[id] === true);
if (ok && all) ok = all.every((id) => m.tests?.[id] === true);
if (ok && not) ok = not.every((id) => m.tests?.[id] === true);
return ok;
}
function evaluateModuleLogic(m, tpl) {
const rules = Array.isArray(tpl?.logicRules) ? tpl.logicRules : [];
const out = [];
rules.forEach((r) => {
let ok = false;
try { if (r.when) ok = evalRuleCondition(r.when, m); else if (r.any || r.all || r.not) ok = evalRuleCondition(r, m); }
catch (_) { ok = false; }
if (!ok) return;
out.push({ id: r.id || r.title || Math.random().toString(16).slice(2), severity: r.severity || "info", title: r.title || "Alerta", description: r.description || r.desc || "", actions: r.actions || r.nextSteps || r.checklist || [], consider: r.consider || r.considerations || [] });
});
const order = { danger: 0, warning: 1, info: 2 };
out.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
m.computed.moduleRules = out;
}
function renderModuleRules(m) {
const rules = Array.isArray(m?.computed?.moduleRules) ? m.computed.moduleRules : [];
if (!rules.length) return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-700 font-semibold", text: "Sin alertas/acciones activas (según lo marcado)." });
return renderComponent({ tag: "div", className: "space-y-3", children: rules.map((r) => renderRuleCard(r)) });
}
function getIrritability(m) {
const val = (m.text || {}).irritabilidad || (m.text || {}).fase || "";
if (typeof val !== "string") return "";
const v = val.toLowerCase();
if (v.includes("alta")) return "alta";
if (v.includes("moder")) return "moderada";
if (v.includes("baja")) return "baja";
if (v.includes("agud")) return "alta";
if (v.includes("subag")) return "moderada";
if (v.includes("cron")) return "baja";
return "";
}
function derivePlan(m) {
const ir = getIrritability(m);
const plan = { phase: ir || "no_definida", bullets: [], dosage: [] };
plan.bullets.push("Educación: dolor, carga, expectativas y señales de alarma.");
plan.bullets.push("Carga progresiva: exposición gradual a tareas limitantes.");
plan.bullets.push("Fortalecimiento específico + control motor según hipótesis.");
if (!ir) { plan.dosage.push("Define irritabilidad/fase para dosificar (frecuencia, repeticiones, RPE, progreso)."); return plan; }
if (ir === "alta") { plan.dosage.push("Fase alta irritabilidad: isométricos/ROM tolerado, frecuencia alta, baja carga (RPE 2–4)."); plan.dosage.push("Evitar picos de dolor >2/10 durante y >24h post."); }
else if (ir === "moderada") { plan.dosage.push("Fase moderada: isotónicos submáximos, 2–4 sesiones/sem, RPE 4–6, progresión semanal."); plan.dosage.push("Monitorizar respuesta 24–48h."); }
else if (ir === "baja") { plan.dosage.push("Fase baja: fuerza/ potencia según objetivo, 2–3 sesiones/sem, RPE 6–8, progresión por criterios."); plan.dosage.push("Integrar tareas específicas (deporte/ADL) y retorno gradual."); }
return plan;
}
function renderPlanCard(m) {
const plan = derivePlan(m);
const hasDosage = plan.phase !== "no_definida";
return renderComponent({ tag: "div", className: "p-4 rounded-2xl border border-gray-200 bg-white", children: [
renderComponent({ tag: "div", className: "flex items-start justify-between gap-3", children: [renderComponent({ tag: "div", className: "font-extrabold text-brand-dark", text: "Plan sugerido (C): Checklist + dosificación" }), infoPill(hasDosage ? `Irritabilidad: ${plan.phase}` : "Sin irritabilidad", hasDosage ? "info" : "warning")] }),
renderComponent({ tag: "div", className: "mt-3", children: [renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase tracking-wide text-gray-500", text: "Checklist" }), renderComponent({ tag: "ul", className: "mt-2 list-disc pl-5 space-y-1 text-sm text-gray-800", children: plan.bullets.map((b) => renderComponent({ tag: "li", text: b })) })] }),
renderComponent({ tag: "div", className: "mt-3", children: [renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase tracking-wide text-gray-500", text: hasDosage ? "Dosificación (según fase)" : "Dosificación (pendiente)" }), renderComponent({ tag: "ul", className: "mt-2 list-disc pl-5 space-y-1 text-sm text-gray-800", children: plan.dosage.map((d) => renderComponent({ tag: "li", text: d })) })] })
] });
}
"""
// ===== app.js PART 3/3 =====
function moduleHeader(m) {
const mode = m.ui.mode || "full";
const mkModeBtn = (label, val) => renderComponent({ tag: "button", className: `hide-on-pdf px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${mode === val ? "bg-white text-brand-dark" : "bg-white/10 text-white hover:bg-white/20"}`.trim(), attrs: { type: "button" }, text: label, on: { click: (e) => { e.preventDefault(); m.ui.mode = val; renderClinicalStack(); scheduleAutosave(); } } });
return renderComponent({ tag: "div", className: "bg-brand-dark px-6 py-5 flex items-start justify-between gap-4", children: [
renderComponent({ tag: "div", className: "flex items-start gap-4 min-w-0", children: [
renderComponent({ tag: "div", className: "w-12 h-12 rounded-2xl bg-brand-accent/20 flex items-center justify-center shrink-0", children: [iconEl(m.icon || "fa-layer-group", "text-brand-accent text-lg")] }),
renderComponent({ tag: "div", className: "min-w-0", children: [
renderComponent({ tag: "div", className: "text-white font-extrabold tracking-wide text-lg truncate", text: m.title || m.key }),
renderComponent({ tag: "div", className: "text-white/60 text-sm font-semibold mt-0.5 truncate", text: mode === "quick" ? "Modo Rápido (5 min): esenciales" : "Modo Completo" })
] })
] }),
renderComponent({ tag: "div", className: "flex items-center gap-2 shrink-0", children: [
mkModeBtn("Rápido", "quick"),
mkModeBtn("Completo", "full"),
renderComponent({ tag: "button", className: "hide-on-pdf w-10 h-10 rounded-2xl bg-white/10 text-white hover:bg-red-600 transition-all flex items-center justify-center", attrs: { type: "button", title: "Quitar módulo" }, children: [iconEl("fa-trash")], on: { click: () => removeModule(m.instanceId) } })
] })
] });
}
function buildModuleCard(m) {
const tpl = getTemplates()[m.key];
if (!tpl) return null;
ensureModuleState(m, tpl);
m.computed.spadi = calcSPADI(m, tpl);
m.computed.dash = calcQuickDASH(m, tpl);
computeHypothesisRanking(m, tpl);
evaluateModuleLogic(m, tpl);
const sections = (tpl.sections || []).map((sec, idx) => renderSection({ m, tpl, section: sec, idx })).filter(Boolean);
const topBlocks = renderComponent({ tag: "div", className: "p-6 space-y-4", children: [
renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase tracking-wide text-gray-500", text: "Ranking Top 3 hipótesis (reglas transparentes)" }),
renderHypothesesCard(m),
renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase tracking-wide text-gray-500 mt-2", text: "Alertas → acciones (motor por módulo)" }),
renderModuleRules(m),
renderComponent({ tag: "div", className: "text-xs font-extrabold uppercase tracking-wide text-gray-500 mt-2", text: "Plan sugerido" }),
renderPlanCard(m)
] });
return renderComponent({ tag: "article", className: "aum-module-card bg-white rounded-3xl shadow-xl overflow-hidden border border-black/5", dataset: { instanceId: m.instanceId }, children: [moduleHeader(m), topBlocks, renderComponent({ tag: "div", className: "p-6 space-y-4", children: sections })] });
}
function refreshAfterModuleChange(m) {
const tpl = getTemplates()[m.key];
if (!tpl) return;
m.computed.spadi = calcSPADI(m, tpl);
m.computed.dash = calcQuickDASH(m, tpl);
computeHypothesisRanking(m, tpl);
evaluateModuleLogic(m, tpl);
evaluateGlobalRulesAndRender();
renderClinicalStack();
}
function renderEmptyState() {
const empty = document.getElementById("empty-state");
if (!empty) return;
empty.hidden = state.activeModules.length > 0;
}
function renderClinicalStack() {
const stack = document.getElementById("clinical-stack");
if (!stack) return;
stack.replaceChildren();
state.activeModules.forEach((m) => { const card = buildModuleCard(m); if (card) stack.appendChild(card); });
renderEmptyState();
}
function renderActiveTags() {
const container = document.getElementById("active-tags-container");
if (!container) return;
container.replaceChildren();
const tags = state.activeModules.map((m) => renderComponent({ tag: "span", className: "inline-flex items-center gap-2 px-3 py-2 rounded-full bg-brand-dark text-white text-xs font-extrabold shadow-sm", children: [iconEl(m.icon || "fa-layer-group", "text-brand-accent"), renderComponent({ tag: "span", text: m.title || m.key })] }));
if (!tags.length) { container.appendChild(renderComponent({ tag: "span", className: "text-sm text-gray-600 font-semibold", text: "Sin módulos en el stack (agrega uno desde el selector)." })); return; }
tags.forEach((t) => container.appendChild(t));
}
function exportAUM() {
ensureGlobalIntakeState();
const payload = { appVersion: APP_VERSION, exportedAt: new Date().toISOString(), patientData: state.patientData || {}, globalIntake: state.globalIntake || null, activeModules: state.activeModules || [] };
const filename = `AllUMoves_${todayStamp()}.aum`;
downloadTextFile(filename, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
toast("Export .aum generado ✅");
}
function importAUMFromObject(obj) {
if (!obj || typeof obj !== "object") throw new Error("Archivo inválido.");
state.patientData = obj.patientData && typeof obj.patientData === "object" ? obj.patientData : {};
state.globalIntake = obj.globalIntake && typeof obj.globalIntake === "object" ? obj.globalIntake : null;
state.activeModules = Array.isArray(obj.activeModules) ? obj.activeModules : [];
ensureGlobalIntakeState();
Object.entries(state.patientData).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; });
const weightEl = document.getElementById("patient-weight");
const heightEl = document.getElementById("patient-height");
if (weightEl && state.patientData["patient-weight"] !== undefined) weightEl.value = state.patientData["patient-weight"];
if (heightEl && state.patientData["patient-height"] !== undefined) heightEl.value = state.patientData["patient-height"];
if (weightEl) weightEl.dispatchEvent(new Event("input"));
const templates = getTemplates();
state.activeModules.forEach((m) => { const tpl = templates[m.key]; if (tpl) ensureModuleState(m, tpl); });
renderIntakeRemote();
renderActiveTags();
renderClinicalStack();
state.meta.updatedAt = new Date().toISOString();
scheduleAutosave();
toast("Import .aum cargado ✅");
}
function importAUM(file) {
if (!file) return;
const reader = new FileReader();
reader.onload = () => {
try { const text = String(reader.result || ""); const obj = JSON.parse(text); importAUMFromObject(obj); }
catch (e) { console.error(e); toast("Error leyendo .aum. Verifica el archivo.", "danger"); }
};
reader.readAsText(file);
}
function scheduleAutosave() {
if (autosaveTimer) clearTimeout(autosaveTimer);
autosaveTimer = setTimeout(() => {
try {
ensureGlobalIntakeState();
const payload = { appVersion: APP_VERSION, savedAt: new Date().toISOString(), patientData: state.patientData || {}, globalIntake: state.globalIntake || null, activeModules: state.activeModules || [] };
localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
} catch (e) {}
}, 250);
}
function tryRestoreAutosave() {
try {
const raw = localStorage.getItem(AUTOSAVE_KEY);
if (!raw) return;
const obj = JSON.parse(raw);
if (!obj || typeof obj !== "object") return;
state.patientData = obj.patientData || {};
state.globalIntake = obj.globalIntake || null;
state.activeModules = Array.isArray(obj.activeModules) ? obj.activeModules : [];
ensureGlobalIntakeState();
Object.entries(state.patientData).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; });
ensureWeightHeightBMI();
renderIntakeRemote();
renderActiveTags();
renderClinicalStack();
toast("Sesión restaurada (autosave) ✅");
} catch (_) {}
}
function setupPreprintHandlers() {
let oldHeights = new Map();
const expandTextareas = () => { oldHeights = new Map(); $$("textarea").forEach((ta) => { oldHeights.set(ta, ta.style.height || ""); ta.style.height = "auto"; ta.style.height = `${ta.scrollHeight}px`; }); };
const restoreTextareas = () => { oldHeights.forEach((h, ta) => { try { ta.style.height = h; } catch (_) {} }); oldHeights.clear(); };
window.addEventListener("beforeprint", () => { expandTextareas(); });
window.addEventListener("afterprint", () => { restoreTextareas(); });
}
function bindControls() {
const btnAdd = document.getElementById("btn-add-module");
if (btnAdd) btnAdd.addEventListener("click", addSelectedModule);
const btnReset = document.getElementById("btn-reset-stack");
if (btnReset) btnReset.addEventListener("click", resetStack);
const btnSave = document.getElementById("btn-save-aum");
if (btnSave) btnSave.addEventListener("click", exportAUM);
const btnLoad = document.getElementById("btn-load-aum");
const fileInput = document.getElementById("file-load-input");
if (btnLoad && fileInput) {
btnLoad.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => { const f = fileInput.files?.[0]; importAUM(f); fileInput.value = ""; });
}
}
function init() {
ensureGlobalIntakeState();
fillModuleSelector();
bindPatientInputs();
bindControls();
setupPreprintHandlers();
tryRestoreAutosave();
renderIntakeRemote();
renderActiveTags();
renderClinicalStack();
console.log(`[AUM] app.js loaded: ${APP_VERSION}`);
}
document.addEventListener("DOMContentLoaded", init);
})();
