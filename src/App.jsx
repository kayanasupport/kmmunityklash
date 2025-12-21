import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "./store";

/* Minimal CSV parser for a1/p1..a8/p8 */
function parseCsv(text) {
  const rows = text.split(/\r?\n/).map(r => r.trim());
  if (!rows.length) return [];
  const head = rows[0].split(",").map(h => h.trim().toLowerCase());
  const idx = (n) => head.findIndex(h => h === n);

  const rounds = [];
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i]) continue;
    const cols = rows[i].split(",").map(c => c.trim());
    const q = cols[idx("question")] || "";
    if (!q) continue;
    const answers = [];
    for (let n = 1; n <= 8; n++) {
      const txt = idx(`a${n}`) >= 0 ? cols[idx(`a${n}`)] : "";
      const pts = idx(`p${n}`) >= 0 ? Number(cols[idx(`p${n}`)]) || 0 : 0;
      if (txt) answers.push({ text: txt, points: pts, revealed: false });
    }
    rounds.push({
      round: idx("round") >= 0 ? Number(cols[idx("round")]) || i : i,
      question: q,
      multiplier: idx("multiplier") >= 0 ? Number(cols[idx("multiplier")]) || 1 : 1,
      answers,
    });
  }
  rounds.sort((a,b)=> (a.round||0)-(b.round||0));
  return rounds;
}

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

function Header() {
  const title = useGame(s => s.title);
  const font = useGame(s => s.titleFont);
  return (
    <header className="header">
      <div className="logoTitle">
        <div className="logoBadge">KK</div>
        <div className="title" style={{ fontFamily: font || "Bangers" }}>{title}</div>
      </div>
      <div />
    </header>
  );
}

function Card({ ans, index, onToggle }) {
  return (
    <div className={`card ${ans?.revealed ? "revealed" : ""}`} onClick={() => onToggle(index)}>
      <div className="answer">{ans?.revealed ? String(ans.text || "").toUpperCase() : "— — — —"}</div>
      <div className="points">{ans?.revealed ? (Number(ans.points) || 0) : "?"}</div>
    </div>
  );
}

function Board() {
  const round = useGame(s => s.round);
  const reveal = useGame(s => s.reveal);
  const buzzingTeam = useGame(s => s.buzzingTeam);

  const answers = round?.answers || [];

  useEffect(() => {
    const onKey = (e) => {
      if (/^[1-8]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < answers.length) reveal(i);
      }
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

      {buzzingTeam && (
        <div className="panel" style={{ marginTop: 12, background: "rgba(194,65,12,.15)", borderColor: "rgba(255,170,120,.5)" }}>
          <div style={{ fontWeight: 900 }}>BUZZ!</div>
          <div>First buzz: <strong>Team {buzzingTeam}</strong></div>
        </div>
      )}

      <div className="footer">Tip: share the <strong>Studio View</strong> tab in Google Meet.</div>
    </div>
  );
}

function ScoreBar() {
  const a = useGame(s => s.teamA);
  const b = useGame(s => s.teamB);
  return (
    <div className="panel">
      <div className="scorebar">
        <div className="team">
          <div style={{ opacity:.8, fontSize:12, marginBottom:4 }}>Team A</div>
          <div className="big">{Number(a?.score) || 0}</div>
          <div className="strikes">{[0,1,2].map(i => <div key={i} className="x">{(a?.strikes||0)>i ? "X" : " "}</div>)}</div>
        </div>
        <div className="team">
          <div style={{ opacity:.8, fontSize:12, marginBottom:4 }}>Team B</div>
          <div className="big">{Number(b?.score) || 0}</div>
          <div className="strikes">{[0,1,2].map(i => <div key={i} className="x">{(b?.strikes||0)>i ? "X" : " "}</div>)}</div>
        </div>
      </div>
    </div>
  );
}

function Controls() {
  const g = useGame();
  const [rounds, setRounds] = useState([]);
  const [sel, setSel] = useState(0);

  const bank = useMemo(
    () => (Number(g.roundBank) || 0) * (Number(g.round?.multiplier) || 1),
    [g.roundBank, g.round?.multiplier]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.key === "A" || e.key === "a") g.buzz("A");
      if (e.key === "B" || e.key === "b") g.buzz("B");
      if (e.key === "R" || e.key === "r") g.resetBuzz();
      if (e.key === "S" || e.key === "s") g.addStrike("A");
      if (e.key === "D" || e.key === "d") g.addStrike("B");
      if (e.key === "W" || e.key === "w") g.awardRound("A");
      if (e.key === "E" || e.key === "e") g.awardRound("B");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g]);

  const onCsv = async (file) => {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.length) return alert("No rounds found. Check headers.");
    setRounds(parsed);
    setSel(0);
    g.setRound(parsed[0]);
  };

  return (
    <div className="panel controls">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="badge">{g.hostMode ? "Host Mode: ON" : "Host Mode: OFF"}</div>
        <button className="btn ghost" onClick={g.resetScores}>Reset Scores</button>
      </div>

      <label>Open Studio View (share this tab)</label>
      <button className="btn" onClick={() => window.open(`${location.origin}${location.pathname}studio`, "_blank")}>
        Open Studio View (share this tab)
      </button>

      <label>Game Title</label>
      <input value={g.title} onChange={(e)=>g.setTitle(e.target.value)} placeholder="K'mmunity Klash" />

      <label>Title Font</label>
      <select className="select-dark" value={g.titleFont} onChange={(e)=>g.setTitleFont(e.target.value)}>
        <option value="Bangers">Bangers (bold comic)</option>
        <option value="Impact">Impact (classic TV)</option>
        <option value="Anton">Anton (condensed)</option>
        <option value="Rubik">Rubik (rounded)</option>
      </select>

      <label>Google Sheet ID (published as CSV)</label>
      <input value={g.sheetId} onChange={(e)=>{localStorage.setItem("sheetId", e.target.value);}} placeholder="YOUR_GOOGLE_SHEET_ID" />

      <label>Or upload a CSV (same headers)</label>
      <input type="file" accept=".csv" onChange={(e)=>onCsv(e.target.files?.[0])} />

      <div className="row" style={{ marginTop: 6 }}>
        <button className="btn" onClick={()=>g.setRound(SAMPLE_ROUND)}>Load Sample Round</button>
      </div>

      <label>Load Selected Round</label>
      <div className="row">
        <button className="btn" onClick={()=> rounds.length && g.setRound(rounds[sel])}>Load Selected Round</button>
        <select className="select-dark" value={sel} onChange={(e)=>setSel(Number(e.target.value))}>
          {rounds.length ? rounds.map((r,i)=>(
            <option key={i} value={i}>#{r.round||i+1} • x{r.multiplier||1} • {r.question.slice(0,28)}</option>
          )) : (
            <option value={0}>#{1} • x{Number(g.round?.multiplier)||1} • {g.round?.question?.slice(0,28) || "Round"}</option>
          )}
        </select>
      </div>

      <div className="row" style={{ alignItems: "stretch", gap: 10 }}>
        <button className="btn" onClick={()=>g.awardRound("A")}>Award to Team A</button>
        <div className="panel" style={{ minWidth: 90, textAlign: "center" }}>
          <div className="badge">Bank</div>
          <div style={{ fontWeight: 900 }}>
            {(Number(g.roundBank)||0)} × {(Number(g.round?.multiplier)||1)} = {bank}
          </div>
        </div>
        <button className="btn" onClick={()=>g.awardRound("B")}>Award to Team B</button>
      </div>

      <label>Strikes</label>
      <div className="row">
        <button className="btn ghost" onClick={()=>g.addStrike("A")}>+ Strike A</button>
        <button className="btn ghost" onClick={()=>g.addStrike("B")}>+ Strike B</button>
        <button className="btn ghost" onClick={g.clearStrikes}>Clear</button>
      </div>

      <label>Buzzer</label>
      <div className="row">
        <button className="btn ghost" onClick={()=>g.buzz("A")}>Buzz Team A</button>
        <button className="btn ghost" onClick={g.resetBuzz}>Reset</button>
        <button className="btn ghost" onClick={()=>g.buzz("B")}>Buzz Team B</button>
      </div>

      <div className="panel" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, opacity: .9, marginBottom: 4 }}>Keyboard (host):</div>
        <div className="stack">
          <span className="badge">1–8 = reveal/hide answer</span>
          <span className="badge">A/B = buzz team</span>
          <span className="badge">R = reset buzz</span>
          <span className="badge">S/D = +strike A/B</span>
          <span className="badge">W/E = award A/B</span>
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
