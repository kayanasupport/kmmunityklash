export async function fetchCsvText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch CSV");
  return await res.text();
}

// Exported for possible external uses; store has its own internal version too.
export function parseCsvText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) return [];

  const header = lines[0].split(",").map((h) => h.trim());
  const req = ["round","question","a1","p1","a2","p2","a3","p3","a4","p4","a5","p5","a6","p6","a7","p7","a8","p8"];
  const ok = req.every((k) => header.includes(k));
  if (!ok) throw new Error("CSV headers invalid");

  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const round = Number(cols[idx.round] || 1) || 1;
    const question = cols[idx.question] || "";
    const answers = [];
    for (let n = 1; n <= 8; n++) {
      const a = cols[idx["a" + n]] || "";
      const p = Number(cols[idx["p" + n]] || 0) || 0;
      answers.push({ text: a, points: p });
    }
    return { round, question, answers };
  });
}
