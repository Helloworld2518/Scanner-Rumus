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

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function parseHistory(text, opts) {
  const options = opts || {};
  const gridOrder = options.gridOrder || "row"; // row|col
  const newest = options.newest || "top"; // top|bottom
  const lines = String(text || "").split(/\r?\n/);

  // Jika formatnya grid (banyak angka 4D per baris), user biasanya menganggap
  // urutan histori itu "atas ke bawah per kolom" (column-major).
  // Kita deteksi grid: minimal 2 baris dan tiap baris punya >=2 token 4D.
  const grid = [];
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

    // Collect grid row
    const tokens = line
      .split(/\s+/)
      .map((t) => String(t).replace(/[^\d]/g, ""))
      .filter((d) => d.length === 4);
    if (tokens.length) grid.push(tokens);
  }

  // Jika ada format A (pakai "|"), langsung return items + sisanya (row-major)
  if (items.length) {
    // Append grid row-major kalau ada
    for (const row of grid) for (const v of row) items.push({ result: v, day: "" });
    return items;
  }

  // Grid parsing: bisa row-major atau column-major (tergantung sumber paito)
  if (gridOrder === "col") {
    const maxCols = Math.max(0, ...grid.map((r) => r.length));
    for (let c = 0; c < maxCols; c++) {
      for (let r = 0; r < grid.length; r++) {
        const v = grid[r][c];
        if (v) items.push({ result: v, day: "" });
      }
    }
  } else {
    for (const row of grid) for (const v of row) items.push({ result: v, day: "" });
  }

  // Arah waktu: jika data terbaru di bawah, balikkan agar index 0 = terbaru
  if (newest === "bottom") items.reverse();

  // DETEKSI INPUT MANUAL: Beri nama hari otomatis jika user tidak memasukkannya
  const hasDays = items.some((x) => x.day && x.day.trim() !== "");
  if (!hasDays && items.length > 0) {
    const daysCycle = ["Minggu", "Sabtu", "Jumat", "Kamis", "Rabu", "Selasa", "Senin"];
    items.forEach((x, i) => {
      x.day = daysCycle[i % 7];
    });
  }

  // PERBANYAK DATA: Jika data inputan terlalu pendek (misal < 150 baris), gandakan 
  // agar saat difilter per hari, jumlah barisnya tetap mencukupi untuk ditarik rumusnya.
  if (items.length > 0 && items.length < 150) {
    const original = [...items];
    while (items.length < 150) {
      original.forEach((x) => items.push({ result: x.result, day: x.day }));
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

const FLORIDA_RAW = `9313 5558 3621 5318 9773 8130 0423
5054 1185 2360 1895 9133 1117 6630
5490 1045 9886 3163 1956 3010 6510
4742 6611 1058 9635 8718 0535 1016
1381 2585 7622 7351 7832 8993 8273
2359 5014 4444 9318 3680 1409 1354
9112 8698 6006 1471 7176 6326 1385
0018 2941 1161 1013 5847 6555 8687
9330 8512 7219 9631 4356 6428 3268
9790 1483 2539 6415 9763 8630 2150
8823 0319 4749 7382 4650 2450 0559
2588 1376 7618 7721 3602 8073 6789
1749 2292 6614 5617 6761 3011 4485
1375 1620 2195 2863 4099 9862 4273
5961 4910 6488 1661 0631 7047 4116
6467 7225 4217 0001 8829 7294 6544
3925 6725 3938 1440 4052 9129 1891
5330 9362 6380 7956 6320 6721 1744
5385 4382 3578 4757 5584 9001 0546
8611 4930 4885 1826 3123 4447 1415
1820 1564 2069 2282 4052 5765 7817
2387 8429 8629 5261 5124 7573 9476
5461 8095 3465 1126 3491 6250 2470
5811 6815 6933 7287 2589 8272 2923
8184 7982 8828 5265 8522 3344 0324
0577 9457 3943 8833 8998 3468 7528
0038 7701 9291 8616 5759 9515 2204
4724 4590 8522 4347 4993 8453 7942
2450 7851 9389 5856 3937 8444 3543
9516 8074 2739 9915 3337 0060 5030
1531 7920 7369 8749 1219 3345 1623
0267 6609 1494 4115 6864 7977 5687
5308 7026 6129 0318 3114 7636 8429
9808 7157 7116 4682 5263 1787 8188
5100 3462 0913 8411 2347 2351 4003
1771 8701 7129 4808 7902 2769 6386
1561 4303 2123 0429 2713 8140 6847
9832 3985 3432 7426 2841 3992 8599
3362 4933 8779 7298 3247 4435 9364
8663 0475 2344 2951 1556 7833 2539
1829 0704 8625 0243 0193 8351 5189
1509 7400 1770 1536 6018 4217 1397
1104 8569 9496 1807 0167 5768 5731
3778 5985 2054 6354 0544 7763 5974
1677 2311 0650 7229 7294 9907 4700
0020 4261 0156 0204 3802 3252 0068
2807 5839 7530 6896 3535 6406 2644
1733 8481 5364 2784 1983 6493 0074
2080 4982 3287 6016 2949 3806 5118
6220 3699 8095 4681 3701 3996 8542
3243 1085 9755 8871 3981 9155 4953
4683 7503 7398 4458 2326 9701 3905
1534 3670 6525 1588 3480 8700 9468
3788 4952 5027 2965 8701 0221 5487
6128 8065 4628 7337 0119 9059 0557
6549 7921 8041 5479 7886 5856 9356
3666 7787 3357 9575 8806 1687 7138
3307 5282 5599 1079 0088 1567 7947
1029 8456 7979 0162 3141 7354 3815
9156 2461 8483 1388 5033 7381 8634
4554 8960 5902 3857 1555 1365 1830
3211 3323 4119 1808 1050 9415 7615
7341 8179 8675 1659 3918 7026 6255
6401 9277 7866 2340 9988 7767 7721
7147 8882 5337 6657 8348 8754 9764
0188 5951 0193 5369 6740 3417 9248
8069 1563 7155 2515 8970 5669 0736
7694 2495 2335 8092 7118 0361 0396
3138 9866 4339 1124 0612 5923 7660
7061 4623 9483 4056 2033 1082 4983
3340 4615 2733 7821 5274 9652 3627
0378 5960 3915 4685 2262 3272 1147
8358 7415 7957 8921 4094 5964 5881
7041 8238 0253 0198 3562 4483 3290
0398 1537 3316 1980 6883 6438 7597
2414 7810 8360 7466 0639 9727 1583
1690 3831 9916 0765 8768 5106 5123
9432 9887 2376 1031 4308 1953 1269
1681 6396 4421 0673 6521 3630 4781
8282 9653 8597 6914 2129 0180 9503
4672 9722 9909 4599 9742 4231 8060
9887 7432 2578 6577 2861 2425 6207
4267 9003 3329 9711 3157 8882 1997
8614 5408 7800 5626 9410 5801 8475
5351 7824 4091 0923 1471 9190 4003
8965 7382 4746 4340 4962 3791 1559
6181 8768 1939 7236 6427 9040 6737
5868 6010 0561 5460 0708 8106 9528
0575 5593 6568 5689 1602 8059 1400
5664 4508 3749 5217 0697 6115 4230
8038 6133 5221 1404 2117 2611 1776
6344 8107 9766 5940 6642 5885 9203
6200 0642 7514 0395 0404 4588 0450
6050 8330 4203 8542 1230 0643 7317
3781 7761 8194 9361 3047 2620 0557
1578 3434 7497 3871 5940 0823 6218
0569 0389 8655 2932 9025 6099 5580
7398 1260 5608 9690 0401 6263 7574
1287 7044 8195 6705 1050 7549 3109
1470 5171 3263 4708 9286 1364 7619
9783 2370 3321 9441 3310 2701 8945
6545 5159 1076 7146 1573 2659 4648
0016 1080 4415 9514 4656 5391 8660
0004 9391 1550 5799 3629 6440 4105
8693 0769 6188 9077 5338 9223 9558
7182 2848 4738 5636 5008 0975 6594
6561 3797 3280 6901 3533 4013 5189
8122 9249 9058 0696 4111 9793 8048
5235 1404 8523 6132 9643 7778 7483
7081 7446 9483 7450 1172 9852 6994
5015 0077 4064 7485 2713 0339 9419
9143 9931 2266 0339 6380 9921 4421
3750 5479 4799 0982 4357 1529 9436
8240 1665 7960 2583 0624 6239 7947
7425 6752 2388 0392 0745 0550 6459
3395 7947 8460 2535 5749 8667 8277
2701 1313 4259 6952 8944 6510 1844
9011 3552 9395 6253 2200 3905 9180
7187 6296 1389 0981 5899 3108 1522
1967 1129 0253 4826 6884 7186 0983
1145 6401 1699 5730 9298 1758 3394
8382 5658 7635 9642 5354 9110 5016
0177 9967 2180 5538 6758 9150 6742
7158 8877 9433 4962 8192 7768 4117
9057 1567 6871 8267 5518 5068 9102
8952 1433 3591 1818 3337 8477 5866
4514 0261 9104 9727 6796 0203 7611
6184 9662 7732 6501 3844 5267 5536
6756 2016 9728 4041 2948 5830 7231
2006 7274 5065 5292 3464 0606 5244
8026 3463 9787 0396 1922 7643 5787
8069 9076 7450 8976 4243 0176 8588
2757 2558 9123 7294 3906 0215 0184
3437 0544 6249 4178 3456 2257 7359
2724 9660 4957 0283 1189 0835 7026
9211 9655 0322 3867 6419 1887 9204
4919 0932 1741 3075 2059 8955 8646
7833 2729 5282 8640 1823 7723 1781
2759 3369 9470 1818 2672 6686 7257
2970 2626 2478 1828 7053 1397 6238
1118 8390 0965 3708 0539 9379 7513
1681 1543 9351 1908 9282 8452 1280
4824 4924 3954 4380 2660 9648 4510
4104 4519 2470 0325 5948 6882 4143
6650 9806 4650 2028 9069 4583 4868
6765 6235 1516 3403 9690 5739 0801
9075 1739 6789 5408 2558 7523 0472
5631 8519 7956 2479 9496 2327 0793
1259 4527 4785 7949 5001 2204 6585
2529 2524 5495 4907 3436 2986 1743
9769 7629 9302 7224 3690 7955 7101
6170 0813 2894 4935 5914 8964 1906
5527 3442 9938 4709 1310 8938 8203
1069 7250 5490 4946 8209 4096 4019
1971 9952 9330 5436 6858 0667 0756
8346 1471 5255 7365 3460 9018 6396
3630 2923 9987 5153 1646 6902 1854
7468 5397 6744 8699 1259 9438 5884
6786 7699 8229 1517 3588 2158 4525
2585 2015 5460 0128 7185 4122 2243
7539 8258 0483 9000 4590 8357 8884
4270 5523 2242 0326 9775 1029 8063
7897 7285 6741 3843 4566 2477 9604
2137 8896 0898 0080 9954 4222 2959
4995 9033 8101 9723 4207 0543 5684
1467 1217 6082 7703 6159 6922 2891
8320 1172 4408 3252 9061 6712 3180
9389 4872 4863 0710 7982 0736 4434
8114 4899 2048 9842 0091 3370 9060
3404 2722 0692 9928 8296 7239 4406
8257 7583 8600 4027 5667 9166 4638
0065 0435 7688 9074 0372 7585 7071
5040 8634 0601 6861 0627 5937 2048
6257 9512 1608 5928 3382 8785 9838
0682 8877 3557 0561 7393 3647 6368
8633 1535 5634 6908 7522 7186 4436
5680 0653 6145 7441 6814 0989 4829
9612 7207 3496 5848 9265 1760 6823
6333 2584 4118 1737 5877 2458 8195
2339 5275 7312 2898 0252 3381 7157
1197 8826 3269 7084 7855 6239 8796
9181 3916 9900 9846 5802 1934 5911
0874 3560 7799 8494 3760 7410 2991
6674 4597`;

// Data asumsi per pasaran (biar hasil beda-beda).
// Format: baris paling atas = yang paling baru.
const DEFAULT_MARKET_DATA = {
  sgp: [
    { result: "4815", day: "Senin" },
    { result: "9730", day: "Minggu" },
    { result: "2380", day: "Sabtu" },
    { result: "1705", day: "Jumat" },
    { result: "5892", day: "Kamis" },
    { result: "6347", day: "Rabu" },
    { result: "7128", day: "Selasa" },
  ],
  jpn: [
    { result: "0249", day: "Senin" },
    { result: "8310", day: "Minggu" },
    { result: "4925", day: "Sabtu" },
    { result: "9076", day: "Jumat" },
    { result: "1234", day: "Kamis" },
    { result: "5561", day: "Rabu" },
    { result: "7408", day: "Selasa" },
  ],
  hk: [
    { result: "6158", day: "Senin" },
    { result: "1047", day: "Minggu" },
    { result: "9981", day: "Sabtu" },
    { result: "3206", day: "Jumat" },
    { result: "7712", day: "Kamis" },
    { result: "4820", day: "Rabu" },
    { result: "0639", day: "Selasa" },
  ],
  syd: [
    { result: "8391", day: "Senin" },
    { result: "5007", day: "Minggu" },
    { result: "2460", day: "Sabtu" },
    { result: "9135", day: "Jumat" },
    { result: "6784", day: "Kamis" },
    { result: "1102", day: "Rabu" },
    { result: "3599", day: "Selasa" },
  ],
  florida: parseHistory(FLORIDA_RAW, { gridOrder: "row", newest: "top" }),
};

// Gandakan otomatis data dummy agar filter hari tidak kosong (tanpa ambil data dari luar)
Object.keys(DEFAULT_MARKET_DATA).forEach((k) => {
  if (Array.isArray(DEFAULT_MARKET_DATA[k]) && DEFAULT_MARKET_DATA[k].length > 0 && DEFAULT_MARKET_DATA[k].length < 150) {
    const orig = [...DEFAULT_MARKET_DATA[k]];
    while (DEFAULT_MARKET_DATA[k].length < 150) {
      orig.forEach((x) => DEFAULT_MARKET_DATA[k].push({ ...x }));
    }
  }
});

function mod10(n) {
  return ((n % 10) + 10) % 10;
}

function mapDigit(mapName, d) {
  const key = String(d);
  const v = DIGIT_MAP[mapName]?.[key];
  return v == null ? 0 : Number(v);
}

// ==========================================
// FORMULA STRING BUILDER (mirip kodeasli.html)
// ==========================================
const NAMEP = ["A", "C", "K", "E", "J", "JT", "JD", "JS", "J3D", "J4D"];
const SUFFIXES = ["off", "ix", "ty", "ml", "mb", "m0", "m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9"];

function buildFormulaStrFromState(s) {
  let formulaStr = "";
  if (s.k1 !== undefined && s.k1 >= 0 && NAMEP[s.k1]) {
    formulaStr += NAMEP[s.k1] + (s.m1 || 1) + ((s.s1 && s.s1 !== "off") ? s.s1 : "");
  }
  if (s.op1 && s.k2 !== undefined && s.k2 >= 0 && NAMEP[s.k2]) {
    formulaStr += s.op1 + NAMEP[s.k2] + (s.m2 || 1) + ((s.s2 && s.s2 !== "off") ? s.s2 : "");
  }
  if (s.op2 && s.k3 !== undefined && s.k3 >= 0 && NAMEP[s.k3]) {
    formulaStr += s.op2 + NAMEP[s.k3] + (s.m3 || 1) + ((s.s3 && s.s3 !== "off") ? s.s3 : "");
  }
  if (s.sf && s.sf !== "off") formulaStr += "." + s.sf;
  return formulaStr || "AUTO";
}

function applySuffix(val, suffix) {
  const s = String(suffix || "off").toLowerCase();
  if (!s || s === "off") return val;
  if (s === "ix" || s === "ty" || s === "ml" || s === "mb") return mapDigit(s, val);
  if (s[0] === "m" && s.length === 2) {
    const n = Number(s[1]);
    if (!Number.isNaN(n)) return mod10(val + n);
  }
  return val;
}

function evalFormulaDigit(draws, idx, state) {
  // idx = index current (0 terbaru). state.mx = offset baris (m1/m2/m3)
  const getTerm = (kIdx, m, suf) => {
    const key = NAMEP[kIdx] || "A";
    const offset = Math.max(1, Number(m) || 1);
    const d = draws[idx + offset] || "";
    let v = gp(d, key);
    v = applySuffix(v, suf);
    return v;
  };

  let acc = getTerm(state.k1 ?? 0, state.m1 ?? 1, state.s1 ?? "off");
  if (state.op1 && state.k2 !== undefined) {
    const v2 = getTerm(state.k2, state.m2 ?? 1, state.s2 ?? "off");
    acc = state.op1 === "-" ? mod10(acc - v2) : mod10(acc + v2);
  }
  if (state.op2 && state.k3 !== undefined) {
    const v3 = getTerm(state.k3, state.m3 ?? 1, state.s3 ?? "off");
    acc = state.op2 === "-" ? mod10(acc - v3) : mod10(acc + v3);
  }
  // final suffix after dot
  acc = applySuffix(acc, state.sf ?? "off");
  return clamp(Number(acc) || 0, 0, 9);
}

function isTarget2D(target) {
  const t = String(target || "").toLowerCase();
  return t === "ai2d" || t === "ai2b" || t === "j2d" || t === "j";
}

function computePredForState(draws, target, digitCount, state) {
  // Prediksi berdasarkan draw terbaru (idx=0) => base digit
  const base = evalFormulaDigit(draws, 0, state);
  if (isTarget2D(target)) {
    return generateVariants2d(base, digitCount).join(" ");
  }
  return generateVariants(base, digitCount).join("");
}

function makeRandomState(limit) {
  const maxM = Math.max(1, Number(limit) || 20);
  const k1 = randInt(0, NAMEP.length - 1);
  const k2 = randInt(0, NAMEP.length - 1);
  const k3 = randInt(0, NAMEP.length - 1);
  const m1 = randInt(1, maxM - 1);
  const m2 = randInt(1, maxM - 1);
  const m3 = randInt(1, maxM - 1);
  const s1 = randomChoice(SUFFIXES);
  const s2 = randomChoice(SUFFIXES);
  const s3 = randomChoice(SUFFIXES);
  const sf = randomChoice(SUFFIXES);
  const ops = ["+", "-"];
  const use2 = Math.random() < 0.85;
  const use3 = Math.random() < 0.55;
  return {
    k1,
    m1,
    s1,
    op1: use2 ? randomChoice(ops) : "",
    k2: use2 ? k2 : undefined,
    m2: use2 ? m2 : undefined,
    s2: use2 ? s2 : "off",
    op2: use3 ? randomChoice(ops) : "",
    k3: use3 ? k3 : undefined,
    m3: use3 ? m3 : undefined,
    s3: use3 ? s3 : "off",
    sf,
  };
}

// ==========================================
// MATRIX ENGINE (adaptasi dari mrm-v3.html)
// ==========================================
function gp(draw4, pos) {
  const d = String(draw4 || "");
  if (d.length < 4) return 0;
  const a = Number(d[0]);
  const c = Number(d[1]);
  const k = Number(d[2]);
  const e = Number(d[3]);

  if (pos === "A") return a;
  if (pos === "C") return c;
  if (pos === "K") return k;
  if (pos === "E") return e;

  // jumlah-jumlah (mod 10)
  if (pos === "J") return mod10(k + e); // jumlah 2 digit belakang (mod10)
  if (pos === "JT") return mod10(c + k); // tengah
  if (pos === "JD") return mod10(a + c); // depan
  if (pos === "J4D") return mod10(a + c + k + e);
  if (pos === "J3D") return mod10(c + k + e);
  if (pos === "JS") return mod10(a + c);
  return 0;
}

function buildMat(draws, sp, b, target, win) {
  const n = draws.length;
  const maxR = Math.min(win, n - b);
  const mat = [];
  for (let i = 0; i < 10; i++) mat.push(new Array(10).fill(0));

  // Matrix 1D (0..9): kelas target diturunkan dari draw sesuai TARGET.
  for (let i = maxR - 1; i >= 0; i--) {
    const base = gp(draws[i + b], sp);
    const d = String(draws[i] || "");
    let cls = 0;
    if (d.length >= 4) {
      if (target === "a") cls = Number(d[0]);
      else if (target === "c") cls = Number(d[1]);
      else if (target === "k") cls = Number(d[2]);
      else if (target === "e") cls = Number(d[3]);
      else if (target === "ai2d") cls = Number(d[1]); // ambil digit kedua dari 2D depan (AC) sebagai kelas
      else if (target === "ai2b") cls = Number(d[3]); // digit terakhir dari 2D belakang (KE)
      else if (target === "ai") cls = Number(d[3]);   // default ekor
      else if (target === "cb") cls = Number(d[3]);   // default ekor
      else if (target === "j2d") cls = Number(d[3]);
      else cls = Number(d[3]);
    }
    mat[base][cls] += 1;
  }
  return mat;
}

function topPool(mat, base, n) {
  // Ambil top N berdasar frekuensi.
  // Untuk bikin hasil scan bisa berbeda antar run (seperti situs),
  // tie-break (frekuensi sama) kita acak dulu, lalu sort by freq.
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  shuffleInPlace(digits);
  const ranked = digits
    .sort((a, b) => mat[base][b] - mat[base][a])
    .slice(0, n);

  // Jika base ada di pool, putar array supaya base ada di index 0
  const idx = ranked.indexOf(base);
  if (idx > 0) return ranked.slice(idx).concat(ranked.slice(0, idx));
  return ranked;
}

function evalKey(draws, sp, b, target, trainWin, ps) {
  const mat = buildMat(draws, sp, b, target, trainWin);
  const n = draws.length;
  const maxR = n - b;
  if (maxR <= 0) return null;

  let hits = 0;
  let misses = 0;
  let total = 0;
  for (let i = maxR - 1; i >= 0; i--) {
    const pool = topPool(mat, gp(draws[i + b], sp), ps);
    const ok = matchTarget(target, draws[i], pool.map(String));
    if (ok) hits++;
    else misses++;
    total++;
  }

  const ns = draws[b - 1] || null;
  const nb = ns ? gp(ns, sp) : null;
  const nextPool = nb !== null ? topPool(mat, nb, ps) : [];
  if (!total) return null;
  return {
    sp,
    b,
    ps,
    hits,
    misses,
    total,
    hr: (hits / total) * 100,
    nextPool,
  };
}

function buildMatrixFormulas(target, limit, ps) {
  const sources = ["JD", "JT", "JS", "J3D", "J4D", "A", "C", "K", "E", "J"];
  const formulas = [];
  const maxB = Math.max(1, Number(limit) || 20);
  for (const sp of sources) {
    for (let b = 1; b <= maxB - 1; b++) {
      formulas.push({
        key: `${sp}${b}m${ps}`,
        sp,
        b,
      });
    }
  }
  return formulas;
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
  const r = Math.random();
  const pool = [String(baseDigit)];
  
  if (r < 0.5) {
    let cur = Number(baseDigit);
    while(pool.length < count) {
      cur = (cur + 1) % 10;
      if (!pool.includes(String(cur))) pool.push(String(cur));
    }
  } else {
    const d = String(baseDigit);
    const v1 = DIGIT_MAP.ix[d] ?? "5";
    const v2 = DIGIT_MAP.ty[d] ?? "7";
    const v3 = DIGIT_MAP.ml[d] ?? "6";
    const v4 = DIGIT_MAP.mb[d] ?? "8";
    for (const v of [v1, v2, v3, v4]) if (!pool.includes(v)) pool.push(v);
    
    let i = 0;
    while (pool.length < count && i <= 9) {
      const s = String(i);
      if (!pool.includes(s)) pool.push(s);
      i++;
    }
  }
  return pool.slice(0, count).sort();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function generateVariants2d(baseDigit, count) {
  const pool = [];
  let cur = Number(baseDigit) || 1;
  while(pool.length < count) {
    const s = pad2(cur);
    if (!pool.includes(s)) pool.push(s);
    cur = (cur + 11) % 100; 
  }
  return pool.slice(0, count).sort();
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
  const jumlah2d = String((Number(k) + Number(e)) % 10); // J2D murni adalah digit satuan

  if (target === "cb") return variants.some((v) => res.includes(v));
  if (target === "k") return variants.includes(k);
  if (target === "e") return variants.includes(e);
  if (target === "ai") return variants.includes(k) || variants.includes(e);
  if (target === "a") return variants.includes(a);
  if (target === "c") return variants.includes(c);
  if (target === "ai2d") return variants.includes(depan2d);
  if (target === "ai2b") return variants.includes(belakang2d);
  if (target === "j" || target === "j2d") return variants.includes(jumlah2d);
  return false;
}

function scanLocal({ history, dayFilter, target, digitCount, limit, maxShow, marketLabel }) {
  let rows = history.slice();
  if (dayFilter) rows = rows.filter((x) => (x.day || "").toLowerCase() === dayFilter.toLowerCase());
  // Untuk engine matrix, kita tetap butuh draws sebanyak mungkin.
  // Limit baris di UI dipakai untuk membatasi kandidat BR (b) dan view, bukan memotong seluruh histori.

  const draws = rows.map((x) => x.result).filter((x) => String(x || "").length >= 4);
  if (draws.length < 2) return [];

  const ps = clamp(Number(digitCount) || 4, 1, 9);
  const brLimit = Math.max(1, Number(limit) || 20);
  // Mode "scrapped UI": server biasanya mengirim state rumus acak.
  // Kita simulasikan dengan random state generator agar formulaStr bisa seperti:
  // A2ty+A3m9+JS2m0.m0
  const candidates = [];
  const want = clamp(Number(maxShow) || 5, 1, 50) * 6; // oversample biar bisa dedup
  for (let i = 0; i < want; i++) {
    const st = makeRandomState(brLimit);
    const rumusKey = buildFormulaStrFromState(st);
    const pred = computePredForState(draws, target, ps, st);
    candidates.push({
      rumus_key: rumusKey,
      ai: pred,
      state: st,
    });
  }

  const out = [];
  // Dedupe by pred string (mirip kodeasli.html: buang formula dengan kolom prediksi sama)
  const seenPred = new Set();
  for (const c of candidates) {
    if (out.length >= maxShow) break;
    if (!c.ai || seenPred.has(c.ai)) continue;
    seenPred.add(c.ai);
    out.push({
      code: `#${String(marketLabel || "MK").toUpperCase()}_${String(target || "T").toUpperCase()}_${c.rumus_key}`,
      market: String(marketLabel || "").toUpperCase(),
      type: String(target || "").toUpperCase(),
      rumus_key: c.rumus_key,
      ai: c.ai,
      // PJG di situs = baris (limit)
      pjg: brLimit,
      state: c.state,
    });
  }

  // Random order output agar tiap scan beda (seperti server)
  shuffleInPlace(out);
  return out.slice(0, maxShow);
}

// =========================
// UI (mirip screenshot)
// =========================
let foundItems = [];
let savedItems = [];
let historyDirty = false;
let userMarketData = {};

function parseMatrixKey(key) {
  const m = String(key || "").match(/^([A-Z]{1,3})(\d{1,2})m(\d{1,2})$/i);
  if (!m) return null;
  return { sp: m[1].toUpperCase(), b: Number(m[2]), ps: Number(m[3]) };
}

function calcPjgFromKey(rumusKey, digitCount) {
  const mk = parseMatrixKey(rumusKey);
  if (!mk) return 0;
  const ps = clamp(Number(digitCount) || mk.ps || 4, 1, 9);
  // Heuristic sesuai contoh user: JD1m3 => 4 ketika digit=4, J4D3m4 => 6 ketika digit=4
  // Rumus yang paling mendekati dua contoh itu adalah: pjg = (b) + (digitCount - 1)
  // (mis: b=1,digit=4 =>4) (b=3,digit=4 =>6)
  return Math.max(0, mk.b + (ps - 1));
}

function getFormulaByKey(key) {
  // Support key matrix seperti "JD1m3"
  const mk = parseMatrixKey(key);
  if (mk) return mk;
  // Legacy: formula arithmetic lama (kalau masih ada tersimpan)
  return FORMULAS.find((f) => f.key === key) || null;
}

function targetLabel(target) {
  const t = String(target || "").toLowerCase();
  if (t === "cb") return "CB (Colok Bebas)";
  if (t === "ai") return "AI (3/4)";
  if (t === "ai2b") return "AI 2D Belakang";
  if (t === "ai2d") return "AI 2D Depan";
  if (t === "a") return "AS (A)";
  if (t === "c") return "COP (C)";
  if (t === "k") return "KEPALA (K)";
  if (t === "e") return "EKOR (E)";
  if (t === "j2d") return "JUMLAH 2D";
  return String(target || "").toUpperCase();
}

function explainCurrentDigits(res4) {
  const res = String(res4 || "");
  const a = res[0] ?? "-";
  const c = res[1] ?? "-";
  const k = res[2] ?? "-";
  const e = res[3] ?? "-";
  return { a, c, k, e, depan2d: a + c, belakang2d: k + e, jumlah2d: pad2((Number(k) + Number(e)) % 100) };
}

function explainFormulaStep(draws, idx, state) {
  const explainTerm = (kIdx, m, suf) => {
    const key = NAMEP[kIdx ?? 0] || "A";
    const offset = Math.max(1, Number(m) || 1);
    const d = draws[idx + offset] || "";
    const rawV = gp(d, key);
    const finalV = applySuffix(rawV, suf);
    if (suf && suf !== "off") {
      return `${key}${offset}[${rawV}➔${suf}:${finalV}]`;
    }
    return `${key}${offset}[${rawV}]`;
  };

  let str = explainTerm(state.k1, state.m1, state.s1);
  let total = applySuffix(gp(draws[idx + Math.max(1, Number(state.m1) || 1)] || "", NAMEP[state.k1 ?? 0] || "A"), state.s1);

  if (state.op1 && state.k2 !== undefined) {
    let val2 = applySuffix(gp(draws[idx + Math.max(1, Number(state.m2) || 1)] || "", NAMEP[state.k2] || "A"), state.s2);
    str += ` ${state.op1} ` + explainTerm(state.k2, state.m2, state.s2);
    total = state.op1 === "-" ? mod10(total - val2) : mod10(total + val2);
  }
  if (state.op2 && state.k3 !== undefined) {
    let val3 = applySuffix(gp(draws[idx + Math.max(1, Number(state.m3) || 1)] || "", NAMEP[state.k3] || "A"), state.s3);
    str += ` ${state.op2} ` + explainTerm(state.k3, state.m3, state.s3);
    total = state.op2 === "-" ? mod10(total - val3) : mod10(total + val3);
  }

  const finalBase = evalFormulaDigit(draws, idx, state);
  if (state.sf && state.sf !== "off") {
    return `(${str} = ${total}).${state.sf} ➔ ${finalBase}`;
  }
  return `${str} = ${finalBase}`;
}

function buildTrekForItem(item, opts) {
  const options = opts || {};
  const marketKey = String(item.market || "").toLowerCase();
  const target = String(item.type || "").toLowerCase();
  const formulaKey = String(item.rumus_key || "");

  const dayFilter = options.dayFilter || "";
  const digitCount = clamp(Number(options.digitCount) || 4, 1, 9);
  const limit = Math.max(1, Number(options.limit) || 20);

  let rows = getMarketData(marketKey).slice();
  if (dayFilter) rows = rows.filter((x) => (x.day || "").toLowerCase() === String(dayFilter).toLowerCase());
  const draws = rows.map((x) => x.result).filter((x) => String(x || "").length >= 4);
  if (draws.length < 2) return "Histori kurang (minimal 2 baris).";

  const lines = [];
  lines.push(`CODE    : ${item.code}`);
  lines.push(`PASARAN : ${marketKey.toUpperCase()}`);
  lines.push(`TARGET  : ${targetLabel(target)}`);
  lines.push(`DIGIT   : ${digitCount}`);
  lines.push(`LIMIT   : ${limit} brs`);
  lines.push("---------------");

  // TREK untuk formula string (simulasi local)
  const state = item.state || makeRandomState(limit);
  const formulaStr = formulaKey || buildFormulaStrFromState(state);

  lines.push(`Code  : ${formulaStr}`);
  lines.push(`Rumus : ${target.toUpperCase()} ${digitCount} Digit`);
  lines.push("");

  let putaran = 0;
  let patah = 0;
  for (let i = 0; i < Math.min(limit, draws.length - 2); i++) {
    const base = evalFormulaDigit(draws, i, state);
    const poolArr = isTarget2D(target) ? generateVariants2d(base, digitCount) : generateVariants(base, digitCount);
    const poolStr = poolArr.join(isTarget2D(target) ? " " : "");

    const current = draws[i];
    const ok = matchTarget(target, current, poolArr);
    putaran++;
    if (!ok) patah++;
    
    const stepStr = explainFormulaStep(draws, i, state);
    lines.push(`${current} : ${stepStr}  ➔  ${poolStr} ${ok ? target.toUpperCase() : "ZNK"}`);
  }

  const predBase = evalFormulaDigit(draws, 0, state);
  const predStep = explainFormulaStep(draws, 0, state);
  const predVars = isTarget2D(target) ? generateVariants2d(predBase, digitCount).join(" ") : generateVariants(predBase, digitCount).join("");

  lines.push("");
  lines.push(`PREDIKSI SELANJUTNYA:\n${predStep}  ➔  ${predVars}`);
  lines.push("===============");
  lines.push(`${putaran} putaran | patah ${patah}x`);
  return lines.join("\n");
}

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
    userMarketData = (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    userMarketData = {};
  }
}

function persistUserMarkets() {
  localStorage.setItem("sk_market_data", JSON.stringify(userMarketData));
}

function getMarketData(marketKey) {
  const key = String(marketKey || "").toLowerCase();
  return (userMarketData && userMarketData[key]) || DEFAULT_MARKET_DATA[key] || [];
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
  // Untuk data yang tidak punya hari, tampilkan 1 angka per baris (lebih aman untuk urutan histori)
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
        `<span class="badge-ok"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;"></span>Ready</span>`;
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
    const limit = Math.max(1, Number(qs("#sk-limit").value) || 20);
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
  } catch (err) {
    setProgress(100, ">_ " + (err.message || "ERROR KONEKSI / PEMINDAIAN"));
    console.error(err);
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
    qs("#sk-day").value = ""; // Reset Hari agar tidak memfilter hingga kosong (Bug Florida)
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

  qs("#sk-limit").addEventListener("input", (e) => {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) return;
    e.target.value = String(Math.max(1, n));
  });

  function openModal(code, log) {
    qs("#sk-modal-code").textContent = code || "";
    qs("#sk-modal-log").textContent = log || "";
    qs("#sk-modal").style.display = "block";
  }

  function closeModal() {
    qs("#sk-modal").style.display = "none";
  }

  qs("#sk-modal-close").addEventListener("click", () => closeModal());
  qs("#sk-modal").addEventListener("click", (e) => {
    if (e.target && e.target.id === "sk-modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  qs("#sk-modal-copy").addEventListener("click", async () => {
    const txt = qs("#sk-modal-log").textContent || "";
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  });

  // Tombol bawah: TREK (offline)
  qs("#sk-btn-trek").addEventListener("click", () => {
    const checked = qsa(".sk-saved-check").filter((c) => c.checked).map((c) => decodeURIComponent(c.dataset.code || ""));
    if (!checked.length) {
      openModal("TREK", "Pilih dulu rumus di KOLEKSI (centang checkbox) lalu klik TREK.");
      return;
    }

    const dayFilter = qs("#sk-day").value;
    const digitCount = Number(qs("#sk-digit").value) || 4;
    const limit = Number(qs("#sk-limit").value) || 20;

    const logs = [];
    for (const code of checked.slice(0, 10)) {
      const it = savedItems.find((x) => x.code === code);
      if (!it) continue;
      logs.push(buildTrekForItem(it, { dayFilter, digitCount, limit }));
      logs.push("\n");
    }
    openModal(checked.length === 1 ? checked[0] : `TREK (${checked.length} rumus)`, logs.join("\n"));
  });

  qs("#sk-btn-rekap").addEventListener("click", () => {
    const checked = qsa(".sk-saved-check").filter((c) => c.checked).map((c) => decodeURIComponent(c.dataset.code || ""));
    if (!checked.length) {
      openModal("REKAP", "Pilih dulu rumus di KOLEKSI (centang checkbox) lalu klik REKAP.");
      return;
    }

    let formulas = [];
    checked.forEach(code => {
      const item = savedItems.find(x => x.code === code);
      if (item) formulas.push({ code: item.code, type: item.type || 'AI', ai: item.ai });
    });

    const pool = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
    const tiers = [];
    
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i];
      const k = parseInt(a[0], 10);
      const e = parseInt(a[1], 10);
      const biji = (k + e) % 10;
      let poin = 0;
      
      formulas.forEach(f => {
        const type = String(f.type).toUpperCase();
        const digits = String(f.ai).replace(/[^0-9]/g, '').split('');
        if (digits.length === 0) return;

        if (type === 'K' || type === 'KEP' || type === 'KEPALA') {
          if (!digits.includes(String(k))) poin++;
        } else if (type === 'E' || type === 'EKR' || type === 'EKOR') {
          if (!digits.includes(String(e))) poin++;
        } else if (type === 'J' || type === 'JML' || type === 'J2D') {
          if (!digits.includes(String(biji))) poin++;
        } else {
          // AI, CB, dll
          let found = false;
          for (let d of digits) {
            if (a.includes(d)) { found = true; break; }
          }
          if (!found) poin++;
        }
      });
      
      if (!tiers[poin]) tiers[poin] = [];
      tiers[poin].push(a);
    }

    let lines = [`Rekap — ${formulas.length} Rumus`, ''];
    formulas.forEach(f => lines.push(`${(f.type+'    ').slice(0,4)} : ${f.ai}`));

    // KRES / Frekuensi kemunculan digit
    if (formulas.length > 1) {
      const digitCount = {};
      formulas.forEach(f => {
        const digits = new Set(String(f.ai).replace(/[^0-9]/g, '').split('').filter(d => d !== ''));
        digits.forEach(d => { digitCount[d] = (digitCount[d] || 0) + 1; });
      });
      const kresByLevel = {};
      Object.entries(digitCount).forEach(([digit, count]) => {
        if (count >= 2) {
          if (!kresByLevel[count]) kresByLevel[count] = [];
          kresByLevel[count].push(digit);
        }
      });
      const levels = Object.keys(kresByLevel).map(Number).sort((a, b) => b - a);
      if (levels.length > 0) {
        lines.push('---------------');
        levels.forEach(level => {
          const digits = kresByLevel[level].slice().sort().join('');
          lines.push(`KRES ${level}   : ${digits}`);
        });
      }
    }

    lines.push('');
    for (let p = 0; p <= formulas.length; p++) {
      if (tiers[p] && tiers[p].length) {
        lines.push(`${p === 0 ? '[TOP]' : p === 1 ? '[CAD 1]' : p === 2 ? '[CAD 2]' : `[MATI ${p}]`} ${tiers[p].length} Line`);
        lines.push(tiers[p].join('*')); 
        lines.push('');
      }
    }

    openModal(checked.length === 1 ? checked[0] : `REKAP (${checked.length} rumus)`, lines.join('\n'));
  });

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
