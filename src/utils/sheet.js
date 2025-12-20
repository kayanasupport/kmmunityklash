import Papa from "papaparse";

/** Build round objects from raw row */
function rowToRound(r) {
  const answers = [];
  for (let i = 1; i <= 8; i++) {
    const t = r[`a${i}`];
    const p = r[`p${i}`];
    if (t !== undefined && t !== null && String(t).trim() !== "" && p !== undefined && p !== "") {
      answers.push({
        text: String(t).trim(),
        points: Number(p),
        revealed: false,
      });
    }
  }
  // round can be "1", 1, or even "x2" – normalize to 1/2/3
  let mult = 1;
  const raw = String(r.round ?? "").trim().toLowerCase();
  if (raw.startsWith("x")) mult = Number(raw.slice(1)) || 1;
  else mult = Number(raw) || 1;

  return {
    question: String(r.question || "").trim(),
    multiplier: mult,
    answers,
  };
}

/** Parse CSV text to rounds (used by both Google Sheet + local upload) */
export function parseCsvText(text) {
  const { data } = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => String(h).trim().toLowerCase(),
  });

  return data
    .filter((r) => r && r.question && String(r.question).trim().length)
    .map(rowToRound);
}

/** Load from a published Google Sheet (File → Share → Publish to web → CSV) */
export async function loadFromSheet(sheetId) {
  if (!sheetId) return [];
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const text = await fetch(url).then((r) => r.text());
  // If someone passed a URL instead of just the ID, try to extract the ID
  if (text.startsWith("<")) {
    // likely not published or permission issue
    console.warn("Sheet appears not published to CSV. Check 'Publish to the web'.");
  }
  return parseCsvText(text);
}
