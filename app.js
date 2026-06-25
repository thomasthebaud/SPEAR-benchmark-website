document.documentElement.classList.add("js-enabled");
const panels = Array.from(document.querySelectorAll("[data-tab-panel]"));
const links = Array.from(document.querySelectorAll("[data-tab-link]"));
const table = document.querySelector("#benchmark-table");
const statusEl = document.querySelector("#table-status");
const filterEl = document.querySelector("#model-filter");
let benchmarkRows = [];
let benchmarkHeaders = [];

const reportModels = new Set([
  "Qwen2.5-Omni-7B",
  "Qwen3-Omni-30B-A3B-Instruct",
  "gpt-4o-audio-preview-2025-06-03",
  "gpt-audio-1.5",
  "gpt-realtime-2",
  "mini-omni"
]);

const modelLinks = {
  "gpt-audio-1.5": "https://developers.openai.com/api/docs/models/gpt-audio-1.5",
  "gpt-realtime-2": "https://developers.openai.com/api/docs/models/gpt-realtime-2",
  "mini-omni": "https://huggingface.co/gpt-omni/mini-omni",
  "Qwen2.5-Omni-7B": "https://huggingface.co/Qwen/Qwen2.5-Omni-7B",
  "Qwen3-Omni-30B-A3B-Instruct": "https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct"
};

const readableHeaders = {
  model: "Model",
  UTMOS: "UTMOS",
  "WER_%": "WER %",
  "CER_%": "CER %",
  latency_ms: "Latency",
  interrupted_time_ms: "Interr. time",
  "interruptions_%": "Interr. %",
  "english_answers_%": "English answers",
  "same_dialect_as_question_%": "Same dialect",
  "north_american_dialect_%": "NA dialect",
  dialectal_entrainment_spearman: "Dialectal entrain.",
  dialectal_variance: "Dialectal variance",
  emotional_naturalness_logit: "Emotional naturalness",
  arousal_question_answer_corr: "Arousal corr.",
  valence_question_answer_corr: "Valence corr.",
  dominance_question_answer_corr: "Dominance corr.",
  "stance_same_as_question_%": "Same stance",
  "stance_more_negative_%": "More negative",
  "stance_more_positive_%": "More positive",
  explainable_duration_s: "Answer duration",
  explainable_voiced_ratio: "Voiced ratio",
  explainable_normalized_f0_std_avg: "Pitch variation"
};

const headerGroups = [
  { label: "", headers: ["model"] },
  { label: "Speech quality", headers: ["UTMOS", "WER_%", "CER_%"] },
  { label: "Interruptions", headers: ["latency_ms", "interrupted_time_ms", "interruptions_%"] },
  { label: "Language and Dialect", headers: ["english_answers_%", "same_dialect_as_question_%", "north_american_dialect_%", "dialectal_entrainment_spearman", "dialectal_variance"] },
  { label: "Emotions", headers: ["emotional_naturalness_logit", "arousal_question_answer_corr", "valence_question_answer_corr", "dominance_question_answer_corr"] },
  { label: "Stances", headers: ["stance_same_as_question_%", "stance_more_negative_%", "stance_more_positive_%"] },
  { label: "Explainable Features", headers: ["explainable_duration_s", "explainable_voiced_ratio", "explainable_normalized_f0_std_avg"] },
  { label: "", headers: ["report"] }
];

function displayHeaders() {
  return benchmarkHeaders.filter((header) => header !== "protocol");
}

function activateTab(name) {
  const validTabs = new Set(links.map((link) => link.dataset.tabLink));
  const selected = validTabs.has(name) ? name : "welcome";
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.tabPanel === selected);
  });
  links.forEach((link) => {
    link.classList.toggle("active", link.dataset.tabLink === selected);
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((value) => value.length)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function formatCell(header, value) {
  if (!value) {
    return "";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  if (header === "latency_ms" || header === "interrupted_time_ms") {
    return `${numeric.toFixed(0)} ms`;
  }
  if (header === "UTMOS" || header === "emotional_naturalness_logit") {
    return numeric.toFixed(3);
  }
  if (header.endsWith("%")) {
    return numeric.toFixed(1);
  }
  if ([
    "dialectal_entrainment_spearman",
    "arousal_question_answer_corr",
    "valence_question_answer_corr",
    "dominance_question_answer_corr",
    "explainable_voiced_ratio",
    "explainable_normalized_f0_std_avg"
  ].includes(header)) {
    return numeric.toFixed(3);
  }
  if (header === "dialectal_variance" || header === "explainable_duration_s") {
    return numeric.toFixed(1);
  }
  return numeric.toFixed(3);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function modelNameCell(model) {
  const url = modelLinks[model];
  if (!url) {
    return escapeHtml(model);
  }
  return `<a class="model-link" href="${url}" target="_blank" rel="noreferrer">${escapeHtml(model)}</a>`;
}

function modelReportCell(model) {
  if (!reportModels.has(model)) {
    return '<span class="no-report">No report</span>';
  }
  const url = `reports/${encodeURIComponent(model)}/detailed_report.html`;
  return `<a class="report-link" href="${url}">Detailed report</a>`;
}

function sortBenchmarkRows(rows) {
  return [...rows].sort((left, right) => {
    if (left.model === "original") {
      return -1;
    }
    if (right.model === "original") {
      return 1;
    }
    return left.model.localeCompare(right.model);
  });
}

function renderTable(rows) {
  const sortedRows = sortBenchmarkRows(rows);
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  const shownHeaders = displayHeaders();
  const groupRow = document.createElement("tr");
  const labelRow = document.createElement("tr");

  headerGroups.forEach((group) => {
    const headers = group.headers.filter((header) => header === "report" || shownHeaders.includes(header));
    if (!headers.length) {
      return;
    }
    if (headers.length === 1 && !group.label) {
      const th = document.createElement("th");
      th.rowSpan = 2;
      th.textContent = headers[0] === "report" ? "Report" : readableHeaders[headers[0]] || headers[0];
      groupRow.appendChild(th);
      return;
    }
    const groupTh = document.createElement("th");
    groupTh.className = "group-heading";
    groupTh.colSpan = headers.length;
    groupTh.textContent = group.label;
    groupRow.appendChild(groupTh);
    headers.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = readableHeaders[header] || header;
      labelRow.appendChild(th);
    });
  });

  thead.appendChild(groupRow);
  thead.appendChild(labelRow);

  sortedRows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.model === "original") {
      tr.classList.add("baseline-row");
    }
    displayHeaders().forEach((header) => {
      const td = document.createElement("td");
      const value = row[header] || "";
      if (header === "model") {
        td.className = "model-cell";
        td.innerHTML = modelNameCell(value);
      } else {
        td.textContent = formatCell(header, value);
      }
      if (!Number.isNaN(Number(value)) && value !== "") {
        td.classList.add("numeric");
      }
      tr.appendChild(td);
    });

    const reportTd = document.createElement("td");
    reportTd.innerHTML = modelReportCell(row.model);
    tr.appendChild(reportTd);
    tbody.appendChild(tr);
  });

  statusEl.textContent = `${sortedRows.length} model${sortedRows.length === 1 ? "" : "s"} shown.`;
}

async function loadBenchmark() {
  try {
    const response = await fetch("benchmark.csv");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const csv = parseCsv(await response.text());
    benchmarkHeaders = csv[0] || [];
    benchmarkRows = csv.slice(1).map((values) => Object.fromEntries(
      benchmarkHeaders.map((header, index) => [header, values[index] || ""])
    ));
    renderTable(benchmarkRows);
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = `Showing embedded benchmark table. Could not refresh benchmark.csv: ${error.message}`;
    }
  }
}

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) {
    return;
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");
    const subject = encodeURIComponent(`SPEAR Benchmark message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:tthebau1@jhu.edu?subject=${subject}&body=${body}`;
  });
}

links.forEach((link) => {
  link.addEventListener("click", () => activateTab(link.dataset.tabLink));
});

if (filterEl) {
  filterEl.addEventListener("input", () => {
    const query = filterEl.value.trim().toLowerCase();
    const rows = benchmarkRows.filter((row) => row.model.toLowerCase().includes(query));
    renderTable(rows);
  });
}

window.addEventListener("hashchange", () => activateTab(window.location.hash.slice(1)));

activateTab(window.location.hash.slice(1));
loadBenchmark();
setupContactForm();
