function qs(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseHistory(text) {
  const lines = String(text || "").split(/\r?\n/);

  const items = [];
  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line) continue;

    // Format A: "4815 | Senin"
    if (line.includes("|")) {
      const parts = line.split("|").map((s) => s.trim());
      const raw = parts[0] || "";
      const day = parts[1] ? parts[1].trim() : "";
      const digits = raw.replace(/[^\d]/g, "");
      if (digits.length >= 4) items.push({ result: digits.slice(0, 4), day });
      continue;
    }

    // Format B: "6135 9085 2603 ..." (banyak angka 4D per baris)
    const tokens = line.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      const digits = String(t).replace(/[^\d]/g, "");
      if (digits.length === 4) items.push({ result: digits, day: "" });
      else if (digits.length > 4) {
        // kalau ada token "XXXXXX", ambil tiap 4 digit dari depan (best-effort)
        for (let i = 0; i + 3 < digits.length; i += 4) {
          const chunk = digits.slice(i, i + 4);
          if (chunk.length === 4) items.push({ result: chunk, day: "" });
        }
      }
    }
  }

  return items;
}

// Kamus mapping digit -> digit (contoh)
const DIGIT_MAP = {
  ix: { "0": "5", "1": "6", "2": "7", "3": "8", "4": "9", "5": "0", "6": "1", "7": "2", "8": "3", "9": "4" },
  ml: { "1": "6", "2": "5", "3": "8", "4": "7", "9": "6", "0": "1", "5": "2", "6": "9", "7": "4", "8": "3" },
  mb: { "0": "8", "1": "7", "2": "6", "3": "9", "4": "5", "5": "4", "6": "2", "7": "1", "8": "0", "9": "3" },
  ty: { "0": "7", "1": "4", "2": "9", "3": "6", "4": "1", "5": "8", "6": "3", "7": "0", "8": "5", "9": "2" },
};

// Data asumsi per pasaran (biar hasil beda-beda).
// Format: baris paling atas = yang paling baru.
const DEFAULT_MARKET_DATA = {
  sgp: [
    { result: "4815", day: "Senin" },
    { result: "9730", day: "Minggu" },
    { result: "2380", day: "Sabtu" },
    { result: "1705", day: "Rabu" },
    { result: "5892", day: "Kamis" },
    { result: "6347", day: "Rabu" },
    { result: "7128", day: "Senin" },
    { result: "4509", day: "Minggu" },
  ],
  jpn: [
    { result: "0249", day: "Rabu" },
    { result: "8310", day: "Rabu" },
    { result: "4925", day: "Rabu" },
    { result: "9076", day: "Rabu" },
    { result: "1234", day: "Rabu" },
    { result: "5561", day: "Rabu" },
    { result: "7408", day: "Rabu" },
  ],
  hk: [
    { result: "6158", day: "Jumat" },
    { result: "1047", day: "Kamis" },
    { result: "9981", day: "Rabu" },
    { result: "3206", day: "Selasa" },
    { result: "7712", day: "Senin" },
    { result: "4820", day: "Minggu" },
    { result: "0639", day: "Sabtu" },
  ],
  syd: [
    { result: "8391", day: "Minggu" },
    { result: "5007", day: "Sabtu" },
    { result: "2460", day: "Jumat" },
    { result: "9135", day: "Kamis" },
    { result: "6784", day: "Rabu" },
    { result: "1102", day: "Selasa" },
    { result: "3599", day: "Senin" },
  ],
};

function mod10(n) {
  return ((n % 10) + 10) % 10;
}

function mapDigit(mapName, d) {
  const key = String(d);
  const v = DIGIT_MAP[mapName]?.[key];
  return v == null ? 0 : Number(v);
}


function buildFormulas() {
  const formulas = [];

  const base = [
    { key: "K+3", compute: (a, c, k, e) => mod10(k + 3) },
    { key: "SUM-3", compute: (a, c, k, e) => mod10(a + c + k + e - 3) },
    { key: "C+E", compute: (a, c, k, e) => mod10(c + e) },
    {
      key: "IX(TY(K))",
      compute: (a, c, k, e) => {
        const ty = mapDigit("ty", k);
        return mapDigit("ix", ty);
      },
    },
  ];
  formulas.push(...base);

  const vars = [
    ["A", (a, c, k, e) => a],
    ["C", (a, c, k, e) => c],
    ["K", (a, c, k, e) => k],
    ["E", (a, c, k, e) => e],
  ];

  // Pairwise ops
  const ops = [
    ["+", (x, y) => x + y],
    ["-", (x, y) => x - y],
    ["x2+", (x, y) => x * 2 + y],
    ["x2-", (x, y) => x * 2 - y],
  ];

  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const [name1, get1] = vars[i];
      const [name2, get2] = vars[j];
      for (const [opName, opFn] of ops) {
        const key = opName.includes("+") || opName.includes("-") ? `${name1}${opName}${name2}` : `${name1}${opName}${name2}`;
        formulas.push({
          key,
          compute: (a, c, k, e) => mod10(opFn(get1(a, c, k, e), get2(a, c, k, e))),
        });
      }
    }
  }

  // Offsets per variable (0..9)
  const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const [name, get] of vars) {
    for (const off of offsets) {
      formulas.push({ key: `${name}+${off}`, compute: (a, c, k, e) => mod10(get(a, c, k, e) + off) });
      formulas.push({ key: `${name}-${off}`, compute: (a, c, k, e) => mod10(get(a, c, k, e) - off) });
    }
  }

  // Map transforms
  const maps = ["ix", "ml", "mb", "ty"];
  for (const [name, get] of vars) {
    for (const m of maps) {
      formulas.push({ key: `${m.toUpperCase()}(${name})`, compute: (a, c, k, e) => mod10(mapDigit(m, get(a, c, k, e))) });
    }
  }

  // Dedup by key (just in case)
  const seen = new Set();
  return formulas.filter((f) => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });
}

const FORMULAS = buildFormulas();

function generateVariants(baseDigit, count) {
  const d = String(baseDigit);
  const pool = [d];

  const v1 = DIGIT_MAP.ix[d] ?? "5";
  const v2 = DIGIT_MAP.ty[d] ?? "7";
  const v3 = DIGIT_MAP.ml[d] ?? "6";
  for (const v of [v1, v2, v3]) if (!pool.includes(v)) pool.push(v);

  let i = 0;
  while (pool.length < count && i <= 9) {
    const s = String(i);
    if (!pool.includes(s)) pool.push(s);
    i++;
  }

  return pool.slice(0, count);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function generateVariants2d(base2d, count) {
  const s = String(base2d).replace(/[^\d]/g, "").slice(0, 2).padStart(2, "0");
  const a = s[0];
  const b = s[1];

  const pool = [s];
  const add = (v) => {
    const vv = String(v);
    if (vv.length === 2 && !pool.includes(vv)) pool.push(vv);
  };

  // Map per digit (ix/ty/ml) untuk bikin varian sederhana
  add((DIGIT_MAP.ix[a] ?? a) + (DIGIT_MAP.ix[b] ?? b));
  add((DIGIT_MAP.ty[a] ?? a) + (DIGIT_MAP.ty[b] ?? b));
  add((DIGIT_MAP.ml[a] ?? a) + (DIGIT_MAP.ml[b] ?? b));
  add(b + a); // swap

  // Isi sampai count dengan urutan 00..99 (deterministic)
  for (let i = 0; pool.length < count && i <= 99; i++) {
    const v = pad2(i);
    add(v);
  }

  return pool.slice(0, count);
}

function matchTarget(target, currentResult, variants) {
  const res = String(currentResult || "");
  if (res.length < 4) return false;
  const a = res[0];
  const c = res[1];
  const k = res[2];
  const e = res[3];
  const depan2d = a + c;
  const belakang2d = k + e;
  const jumlah2d = pad2((Number(k) + Number(e)) % 100);

  if (target === "cb") return variants.some((v) => res.includes(v));
  if (target === "k") return variants.includes(k);
  if (target === "e") return variants.includes(e);
  if (target === "ai") return variants.includes(k) || variants.includes(e);
  if (target === "a") return variants.includes(a);
  if (target === "c") return variants.includes(c);
  if (target === "ai2d") return variants.includes(depan2d);
  if (target === "ai2b") return variants.includes(belakang2d);
  if (target === "j2d") return variants.includes(jumlah2d);
  return false;
}

function scanLocal({ history, dayFilter, target, digitCount, limit, maxShow, marketLabel }) {
  let rows = history.slice();
  if (dayFilter) rows = rows.filter((x) => (x.day || "").toLowerCase() === dayFilter.toLowerCase());
  rows = rows.slice(0, Math.max(2, limit));

  const out = [];
  for (const f of FORMULAS) {
    let streak = 0;
    for (let i = 0; i < rows.length - 1; i++) {
      const current = rows[i].result;
      const prev = rows[i + 1].result;

      const a = Number(prev[0]);
      const c = Number(prev[1]);
      const k = Number(prev[2]);
      const e = Number(prev[3]);

      const base = clamp(Number(f.compute(a, c, k, e)), 0, 9);
      const variants =
        target === "ai2d" || target === "ai2b" || target === "j2d"
          ? generateVariants2d(pad2(base * 11), digitCount) // base digit -> 2D asumsi (contoh: 6 => "66")
          : generateVariants(base, digitCount);
      if (matchTarget(target, current, variants)) streak++;
      else break;
    }

    const latest = rows[0]?.result ?? "";
    const la = Number(latest[0] ?? 0);
    const lc = Number(latest[1] ?? 0);
    const lk = Number(latest[2] ?? 0);
    const le = Number(latest[3] ?? 0);
    const nextBase = clamp(Number(f.compute(la, lc, lk, le)), 0, 9);
    const nextVariants =
      target === "ai2d" || target === "ai2b" || target === "j2d"
        ? generateVariants2d(pad2(nextBase * 11), digitCount)
        : generateVariants(nextBase, digitCount);

    out.push({
      code: `#${String(marketLabel || "MK").toUpperCase()}_${String(target || "T").toUpperCase()}_${f.key}`,
      market: String(marketLabel || "").toUpperCase(),
      type: String(target || "").toUpperCase(),
      rumus_key: f.key,
      ai: nextVariants.join(""),
      pjg: streak,
    });
  }

  out.sort((a, b) => b.pjg - a.pjg);
  return out.slice(0, maxShow);
}

// =========================
// UI (mirip screenshot)
// =========================
let foundItems = [];
let savedItems = [];
let historyDirty = false;
let userMarketData = {};

function normalizeMarketKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function loadUserMarkets() {
  try {
    const raw = localStorage.getItem("sk_market_data");
    const parsed = raw ? JSON.parse(raw) : {};
    userMarketData = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    userMarketData = {};
  }
}

function persistUserMarkets() {
  localStorage.setItem("sk_market_data", JSON.stringify(userMarketData));
}

function getMarketData(marketKey) {
  const key = String(marketKey || "").toLowerCase();
  return userMarketData[key] || DEFAULT_MARKET_DATA[key] || [];
}

function setMarketData(marketKey, items) {
  const key = normalizeMarketKey(marketKey);
  if (!key) return null;
  userMarketData[key] = Array.isArray(items) ? items : [];
  persistUserMarkets();
  return key;
}

function loadSaved() {
  try {
    const raw = localStorage.getItem("sk_saved_items");
    savedItems = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(savedItems)) savedItems = [];
  } catch {
    savedItems = [];
  }
}

function persistSaved() {
  localStorage.setItem("sk_saved_items", JSON.stringify(savedItems));
}

function historyToTextareaText(items) {
  return items.map((x) => `${x.result}${x.day ? " | " + x.day : ""}`).join("\n");
}

function setHistoryForMarket(marketKey) {
  const data = getMarketData(marketKey);
  if (!data) return;
  qs("#histori").value = historyToTextareaText(data);
  historyDirty = false;
}

function setProgress(pct, text) {
  const p = clamp(Number(pct) || 0, 0, 100);
  qs("#progress-container-lokal").style.display = "block";
  qs("#progress-bar-lokal").style.width = `${p}%`;
  qs("#progress-text-lokal").textContent = String(text || "");
}

function resetProgress() {
  qs("#progress-container-lokal").style.display = "none";
  qs("#progress-bar-lokal").style.width = "0%";
  qs("#progress-text-lokal").textContent = ">_ MENYIAPKAN RADAR...";
}

function renderFound() {
  const tbody = qs("#sk-result-body");
  if (!foundItems.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="padding:16px;color:#64748b;font-style:italic;text-align:center;">Klik SCAN untuk mencari rumus...</td></tr>';
    return;
  }

  tbody.innerHTML = foundItems
    .map((it) => {
      const rms = (it.type || "").toUpperCase();
      const statusHtml =
        '<span class="badge-ok"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;"></span>Ready</span>';
      return `
        <tr style="border-bottom:1px solid #fde68a; background:#fffbeb;">
          <td style="padding:8px 2px; text-align:center;"><span style="font-size:11px; font-weight:900; color:#0f172a;">${rms}</span></td>
          <td style="padding:8px 6px; text-align:center;">
            <span class="mono" style="display:inline-block; font-size:11px; font-weight:900; color:#1e3a8a; background:#e0e7ff; padding:4px 8px; border-radius:8px; border:1px solid #a5b4fc;">
              ${it.rumus_key}
            </span>
          </td>
          <td style="padding:8px 2px; text-align:center;">
            <span class="mono" style="color:#0f172a; font-size:13px; font-weight:800; border-bottom:2px dotted #cbd5e1;">
              ${it.ai}
            </span>
          </td>
          <td style="padding:8px 2px; text-align:center;"><b style="color:#1d4ed8; font-size:12.5px;">${it.pjg}</b></td>
          <td style="padding:8px 2px; text-align:center;">${statusHtml}</td>
        </tr>
      `;
    })
    .join("");
}

function ensureMarketFilterOptions() {
  const sel = qs("#sk-saved-filter-market");
  const existing = new Set(Array.from(sel.options).map((o) => o.value));
  const markets = Array.from(new Set(savedItems.map((x) => String(x.market || "").toUpperCase()).filter(Boolean))).sort();
  for (const m of markets) {
    if (existing.has(m)) continue;
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  }
}

function renderSaved() {
  qs("#sk-saved-count").textContent = String(savedItems.length);
  ensureMarketFilterOptions();

  const marketFilter = qs("#sk-saved-filter-market").value;
  const typeFilter = qs("#sk-saved-filter-type").value;

  let list = savedItems.slice();
  if (marketFilter) list = list.filter((x) => (x.market || "").toUpperCase() === marketFilter.toUpperCase());
  if (typeFilter) list = list.filter((x) => (x.type || "").toUpperCase() === typeFilter.toUpperCase());

  const tbody = qs("#sk-saved-body");
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="k-empty">Belum ada rumus yang disimpan.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((it) => {
      const key = encodeURIComponent(it.code);
      return `
        <tr>
          <td style="text-align:center;"><input class="sk-saved-check" data-code="${key}" type="checkbox" /></td>
          <td class="mono" style="font-weight:900;">${it.code}</td>
          <td class="mono" style="text-align:center;font-weight:800;">${it.ai}</td>
          <td style="text-align:center;font-weight:900;">${it.pjg}</td>
          <td style="text-align:center;"><span style="display:inline-flex;align-items:center;gap:6px;font-weight:900;color:#15803d;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;"></span>ok</span></td>
        </tr>
      `;
    })
    .join("");
}

function upsertSaved(item) {
  const code = item.code;
  if (!code) return;
  if (savedItems.some((x) => x.code === code)) return;
  savedItems.unshift(item);
  persistSaved();
  renderSaved();
}

window.skSaveAllFound = function () {
  if (!foundItems.length) return;
  foundItems.forEach((it) => upsertSaved(it));
};

window.skClearResults = function () {
  foundItems = [];
  renderFound();
  resetProgress();
};

function deleteSelectedSaved() {
  const checked = qsa(".sk-saved-check").filter((c) => c.checked).map((c) => decodeURIComponent(c.dataset.code || ""));
  if (!checked.length) return;
  savedItems = savedItems.filter((it) => !checked.includes(it.code));
  persistSaved();
  renderSaved();
}

async function runScan() {
  const btn = qs("#btn-scan-lokal");
  btn.disabled = true;
  try {
    const marketLabel = qs("#sk-market").value || "sgp";
    const historySource = historyDirty ? parseHistory(qs("#histori").value) : getMarketData(marketLabel);
    const history = historySource.length ? historySource : parseHistory(qs("#histori").value);
    const dayFilter = qs("#sk-day").value;
    const target = qs("#sk-fcol").value;
    const digitCount = clamp(Number(qs("#sk-digit").value) || 4, 3, 9);
    const limit = clamp(Number(qs("#sk-limit").value) || 20, 2, 22);
    const maxShow = clamp(parseInt(qs("#sk-maxrumus").value, 10) || 5, 1, 50);

    foundItems = [];
    renderFound();
    resetProgress();

    if (history.length < 2) {
      setProgress(100, ">_ HISTORI KURANG (MIN 2 BARIS)");
      return;
    }

    setProgress(10, ">_ MENGONTAK MESIN MATRIX...");
    await sleep(350);
    setProgress(60, ">_ MENYARING RIWAYAT TREN DATA PASARAN...");
    await sleep(450);

    foundItems = scanLocal({ history, dayFilter, target, digitCount, limit, maxShow, marketLabel });
    setProgress(100, ">_ PEMINDAIAN SELESAI : RUMUS DITEMUKAN!");
    renderFound();
  } finally {
    btn.disabled = false;
  }
}

function wireUi() {
  qs("#btn-scan-lokal").addEventListener("click", (e) => {
    e.preventDefault();
    runScan();
  });

  qs("#histori").addEventListener("input", () => {
    historyDirty = true;
  });

  qs("#sk-market").addEventListener("change", (e) => {
    if (historyDirty) return; // user lagi pakai histori manual
    setHistoryForMarket(e.target.value);
  });

  qs("#sk-market-import").addEventListener("click", async () => {
    const fileInput = qs("#sk-market-file");
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const text = await file.text();
    qs("#histori").value = String(text || "");
    historyDirty = true; // user sedang mode manual (hasil import)
  });

  qs("#sk-market-add").addEventListener("click", () => {
    const rawKey = qs("#sk-market-new").value;
    const key = normalizeMarketKey(rawKey);
    if (!key) return;

    const items = parseHistory(qs("#histori").value);
    if (items.length < 2) return;

    const savedKey = setMarketData(key, items);
    if (!savedKey) return;

    // Tambahkan option ke dropdown jika belum ada
    const sel = qs("#sk-market");
    const exists = Array.from(sel.options).some((o) => o.value === savedKey);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = savedKey;
      opt.textContent = savedKey.toUpperCase();
      sel.appendChild(opt);
    }

    sel.value = savedKey;
    setHistoryForMarket(savedKey);
    qs("#sk-market-new").value = "";
    qs("#sk-market-file").value = "";
  });

  // Enter untuk cepat tambah pasaran
  qs("#sk-market-new").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      qs("#sk-market-add").click();
    }
  });

  qs("#sk-btn-refresh-all").addEventListener("click", () => renderSaved());
  qs("#sk-saved-filter-market").addEventListener("change", () => renderSaved());
  qs("#sk-saved-filter-type").addEventListener("change", () => renderSaved());

  qs("#sk-saved-check-all").addEventListener("change", (e) => {
    const checked = !!e.target.checked;
    qsa(".sk-saved-check").forEach((c) => {
      c.checked = checked;
    });
  });

  qs("#sk-btn-delete").addEventListener("click", () => deleteSelectedSaved());

  // Validasi ringan untuk input Target Rumus
  qs("#sk-maxrumus").addEventListener("input", (e) => {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) return;
    e.target.value = String(clamp(n, 1, 100));
  });

  // Tombol bawah (placeholder UI)
  qs("#sk-btn-trek").addEventListener("click", () => alert("Trek (demo offline): belum diimplement."));
  qs("#sk-btn-rekap").addEventListener("click", () => alert("Rekap (demo offline): belum diimplement."));
  qs("#sk-btn-save").addEventListener("click", () => alert("Save (demo offline): koleksi sudah tersimpan otomatis di browser."));
}

document.addEventListener("DOMContentLoaded", () => {
  loadUserMarkets();
  loadSaved();
  // Inject user markets ke dropdown
  const sel = qs("#sk-market");
  Object.keys(userMarketData || {}).forEach((k) => {
    if (!k) return;
    const exists = Array.from(sel.options).some((o) => o.value === k);
    if (exists) return;
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k.toUpperCase();
    sel.appendChild(opt);
  });
  // Isi histori awal dari pasaran dropdown
  setHistoryForMarket(qs("#sk-market").value);
  renderFound();
  renderSaved();
  wireUi();
});
