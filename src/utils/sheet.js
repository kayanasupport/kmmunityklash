import Papa from "papaparse";

/**
 * Load a question pack from a published Google Sheet CSV
 * Expected headers: round, question, a1, p1, a2, p2, ..., a8, p8
 */
export async function loadFromSheet(sheetId) {
  if (!sheetId) return [];
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  const text = await fetch(url).then(r => r.text());
  const rows = Papa.parse(text, { header: true }).data;

  const rounds = rows
    .filter(r => r.question?.trim())
    .map((r) => {
      const answers = [];
      for (let i = 1; i <= 8; i++) {
        const text = r[`a${i}`];
        const pts  = r[`p${i}`];
        if (text && pts !== undefined && pts !== "") {
          answers.push({ text: String(text).trim(), points: Number(pts), revealed:false });
        }
      }
      const mult = Number(r.round) > 0 ? Number(r.round) : 1;
      return {
        question: r.question.trim(),
        multiplier: mult, // use 1/2/3 as “round multiplier”
        answers,
      };
    });

  return rounds;
}
