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

const readableHeaders = {
  protocol: "Protocol",
  model: "Model",
  avg_latency: "Avg Latency",
  avg_UTMOS: "Avg UTMOS",
  "avg_WER_%": "Avg WER %",
  WER_%_std_between_asr_models: "WER Std",
  average_number_of_interruptions_per_dialogue: "Interruptions / Dialogue",
  number_of_dialogues_with_interruption: "Dialogues Interrupted",
  interrupted_time_s: "Interrupted Time s",
  EN_lang_%: "EN Lang %",
  second_most_spoken_language: "2nd Language",
  percentage_2nd_language: "2nd Lang %",
  same_dialect_%: "Same Dialect %",
  NA_dialect_%: "NA Dialect %",
  avg_emo_naturalness_logit: "Emo Naturalness",
  same_stance_as_question_%: "Same Stance %",
  more_negative_stance_%: "More Negative %",
  more_positive_stance_%: "More Positive %",
  avg_general_expl_feat: "Explainable Feature"
};

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
  if (header === "avg_latency") {
    return `${Number(value).toFixed(1)} ms`;
  }
  if (header.includes("%") || header.includes("avg_") || header.includes("_s")) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : value;
  }
  return value;
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

  const headerRow = document.createElement("tr");
  [...benchmarkHeaders, "report"].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header === "report" ? "Report" : readableHeaders[header] || header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  sortedRows.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.model === "original") {
      tr.classList.add("baseline-row");
    }
    benchmarkHeaders.forEach((header) => {
      const td = document.createElement("td");
      const value = row[header] || "";
      td.textContent = formatCell(header, value);
      if (header === "model") {
        td.className = "model-cell";
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
