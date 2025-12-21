import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "./store";

/* -------------------------------------------------------
   Tiny CSV parser (supports our sheet headers)
   - headers: round,question,a1,p1,a2,p2,...,a8,p8,multiplier (optional)
------------------------------------------------------- */
function parseCsv(text) {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);

  if (!rows.length) return [];

  const headers = rows[0].split(",").map((h) => h.trim().toLowerCase());
  const find = (name) => headers.findIndex((h) => h === name);

  const idxRound = find("round");
  const idxQ = find("question");
  const idxMult = find("multiplier"); // optional

  const rounds = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(",").map((c) => c.trim());
    if (!cols[idxQ]) continue;

    const answers = [];
    for (let n = 1; n <= 8; n++) {
      const ai = find(`a${n}`);
      const pi = find(`p${n}`);
      const text = ai >= 0 ? cols[ai] : "";
      const pts = pi >= 0 ? Number(cols[pi]) || 0 : 0;
      if (text) answers.push({ text, points: pts, revealed: false });
    }

    rounds.push({
      round: idxRound >= 0 ? Number(cols[idxRound]) || 1 : i,
      question: cols[idxQ],
      multiplier: idxMult >= 0 ? Number(cols[idxMult]) || 1 : 1,
      answers,
    });
  }

  // sort by round if provided
  rounds.sort((a, b) => (a.round || 0) - (b.round || 0));
  return rounds;
}

/* -------------------------------------------------------
   Sample round (handy when testing with no CSV)
------------------------------------------------------- */
const SAMPLE_ROUND = {
  question: "Name something people do before a big meeting",
  multiplier: 1,
  answers: [
    { text: "Prepare slides", points: 35, revealed: false },
    { text: "Get coffee", points: 25, revealed: false },
    { text: "Practice", points: 20, revealed: false },
    { text: "Check notes", points: 10, revealed: false },
    { text: "Review agenda", points: 5, revealed: false },
  ],
};

/* -------------------------------------------------------
   UI Components
------------------------------------------------------- */
function Header() {
  const title = useGame((s) => s.title);
  const titleFont = useGame((s) => s.titleFont);
  return (
    <header className="header">
      <div className="logoTitle">
        <div className="logoBadge">KK</div>
        <div className="title" style={{ fontFamily: titleFont || "Bangers" }}>
          {title || "K'mmunity Klash"}
        </div>
      </div>
      <div />
    </header>
  );
}

function Card({ index, ans, onToggle }) {
  return (
    <div
      className={`card ${ans?.revealed ? "revealed" : ""}`}
      onClick={() => onToggle?.(index)}
      role="button"
      tabIndex={0}
      title="Click to reveal/hide"
    >
      <div className="answer">
        {ans?.revealed ? String(ans.text || "").toUpperCase() : "— — — —"}
      </div>
      <div className="points">{ans?.revealed ? (Number(ans.points) || 0) : "?"}</div>
    </div>
  );
}

function Board() {
  const round = useGame((s) => s.round);
  const reveal = useGame((s) => s.reveal);
  const answers = round?.answers || [];

  // 1–8 number keys reveal/hide tiles
  useEffect(() => {
    const onKey = (e) => {
      if (!/^[1-8]$/.test(e.key)) return;
      const idx = Number(e.key) - 1;
      if (idx < answers.length) reveal(idx);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answers.length, reveal]);

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="badge">Round Multiplier: x{Number(round?.multiplier) || 1}</div>
        <div className="badge">Answers: {answers.length || 0}</div>
      </div>

      <div style={{ marginTop: 10, fontWeight: 800, fontSize: 20 }}>
        {round?.question || "Load a round..."}
      </div>

      <div className="board">
        {answers.map((a, i) => (
          <Card key={i} index={i} ans={a} onToggle={reveal} />
        ))}
      </div>

      <div className="footer">
        Tip: share the <strong>Studio View</strong> tab in Google Meet.
      </div>
    </div>
  );
}

function ScoreBar() {
  const teamA = useGame((s) => s.teamA);
  const teamB = useGame((s) => s.teamB);
  return (
    <div className="panel">
      <div className="scorebar">
        <div className="team">
          <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 4 }}>Team A</div>
          <div className="big">{Number(teamA?.score) || 0}</div>
          <div className="strikes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="x">{(teamA?.strikes || 0) > i ? "X" : " "}</div>
            ))}
          </div>
        </div>

        <div className="team">
          <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 4 }}>Team B</div>
          <div className="big">{Number(teamB?.score) || 0}</div>
          <div className="strikes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="x">{(teamB?.strikes || 0) > i ? "X" : " "}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Controls() {
  const g = useGame();
  const [rounds, setRounds] = useState([]);
  const [selIndex, setSelIndex] = useState(0);
  const fileRef = useRef(null);

  const bankValue = useMemo(
    () => (Number(g.roundBank) || 0) * (Number(g.round?.multiplier) || 1),
    [g.roundBank, g.round?.multiplier]
  );

  // hotkeys for host-only helpers
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.key === "r" || e.key === "R") g.resetBuzz();
      if (e.key === "a" || e.key === "A") g.buzz("A");
      if (e.key === "b" || e.key === "B") g.buzz("B");
      if (e.key === "s" || e.key === "S") g.addStrike("A");
      if (e.key === "d" || e.key === "D") g.addStrike("B");
      if (e.key === "w" || e.key === "W") g.awardRound("A");
      if (e.key === "e" || e.key === "E") g.awardRound("B");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length) {
      setRounds(parsed);
      setSelIndex(0);
      g.setRound(parsed[0]);
      alert("CSV loaded ✔ — use the dropdown to switch rounds.");
    } else {
      alert("No rounds found in CSV. Please check headers.");
    }
  };

  const loadSample = () => {
    g.setRound(SAMPLE_ROUND);
    alert("Sample round loaded ✔");
  };

  const loadSelectedRound = () => {
    if (!rounds.length) return; // use current round
    g.setRound(rounds[selIndex]);
  };

  const awardA = () => g.awardRound("A");
  const awardB = () => g.awardRound("B");

  return (
    <div className="panel controls">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="badge">{g.hostMode ? "Host Mode: ON" : "Host Mode: OFF"}</div>
        <button className="btn ghost" onClick={g.resetScores}>
          Reset Scores
        </button>
      </div>

      <label>Open Studio View (share this tab)</label>
      <button
        className="btn"
        onClick={() => window.open(`${location.origin}${location.pathname}studio`, "_blank")}
      >
        Open Studio View (share this tab)
      </button>

      <label>Game Title</label>
      <input
        placeholder="K'mmunity Klash"
        value={g.title}
        onChange={(e) => g.setTitle(e.target.value)}
      />

      <label>Title Font</label>
      <select
        className="select-dark"
        value={g.titleFont}
        onChange={(e) => g.setTitleFont(e.target.value)}
      >
        <option value="Bangers">Bangers (bold comic)</option>
        <option value="Impact">Impact (classic TV)</option>
        <option value="Anton">Anton (condensed)</option>
        <option value="Rubik">Rubik (rounded)</option>
      </select>

      <label>Google Sheet ID (published as CSV)</label>
      <input
        placeholder="YOUR_GOOGLE_SHEET_ID"
        value={g.sheetId}
        onChange={(e) => {
          localStorage.setItem("sheetId", e.target.value);
          g.setTitle(g.title); // trigger persist/sync
        }}
      />

      <label>Or upload a CSV (same headers)</label>
      <div className="row">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button className="btn ghost" onClick={loadSample}>
          Load Sample Round
        </button>
      </div>

      <label>Load Selected Round</label>
      <div className="row">
        <button className="btn" onClick={loadSelectedRound}>
          Load Selected Round
        </button>
        <select
          className="select-dark"
          value={selIndex}
          onChange={(e) => setSelIndex(Number(e.target.value))}
        >
          {rounds.length ? (
            rounds.map((r, i) => (
              <option key={i} value={i}>
                #{r.round || i + 1} • x{r.multiplier || 1} • {r.question?.slice(0, 28)}
              </option>
            ))
          ) : (
            <option value={0}>
              #{1} • x{Number(g.round?.multiplier) || 1} • {g.round?.question?.slice(0, 28) || "Round"}
            </option>
          )}
        </select>
      </div>

      <div className="row" style={{ alignItems: "stretch", gap: 10 }}>
        <button className="btn" onClick={awardA}>Award to Team A</button>
        <div className="panel" style={{ minWidth: 96, textAlign: "center" }}>
          <div className="badge">Bank</div>
          <div style={{ fontWeight: 900 }}>
            {(Number(g.roundBank) || 0)} × {(Number(g.round?.multiplier) || 1)} ={" "}
            {bankValue}
          </div>
        </div>
        <button className="btn" onClick={awardB}>Award to Team B</button>
      </div>

      <label>Strikes</label>
      <div className="row">
        <button className="btn ghost" onClick={() => g.addStrike("A")}>+ Strike A</button>
        <button className="btn ghost" onClick={() => g.addStrike("B")}>+ Strike B</button>
        <button className="btn ghost" onClick={g.clearStrikes}>Clear</button>
      </div>

      <label>Buzzer</label>
      <div className="row">
        <button className="btn ghost" onClick={() => g.buzz("A")}>Buzz Team A</button>
        <button className="btn ghost" onClick={g.resetBuzz}>Reset</button>
        <button className="btn ghost" onClick={() => g.buzz("B")}>Buzz Team B</button>
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Keyboard (host):</div>
        <div className="stack">
          <span className="badge">1–8 = reveal/hide answer</span>
          <span className="badge">A/B = buzz team</span>
          <span className="badge">R = reset buzz</span>
          <span className="badge">S = +strike (A), D = +strike (B)</span>
          <span className="badge">W = award A, E = award B</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Header />
      <div className="wrapper">
        <div>
          <Board />
          <div className="gap" />
          <ScoreBar />
        </div>
        <Controls />
      </div>
    </div>
  );
}
