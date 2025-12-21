import React, { useMemo, useRef, useState } from "react";
import { useGame } from "./store";
import "./styles.css";

// Small helpers for CSV → round objects
const parseCSV = async (file) => {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.split(","));
  if (!rows.length) return [];

  // headers: round,question,a1,p1,a2,p2,...
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    round: header.indexOf("round"),
    question: header.indexOf("question"),
  };

  const rounds = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const roundNo = Number(r[idx.round] || 1);
    const question = r[idx.question] || "";
    const answers = [];
    for (let j = 2; j < header.length; j += 2) {
      const aText = r[j] || "";
      const p = Number(r[j + 1] || 0);
      if (aText && p > 0) answers.push({ text: aText, points: p, revealed: false });
    }
    // Family-Feud feel: default x1
    rounds.push({
      id: `${roundNo}-${i}`,
      question,
      multiplier: 1,
      answers,
    });
  }
  return rounds;
};

function ScoreBar({ team, label }) {
  return (
    <div className="scoreBox">
      <div className="scoreLabel">{label}</div>
      <div className="scoreValue">{team.score || 0}</div>
      <div className="strikeRow">
        {[...Array(3)].map((_, i) => (
          <span key={i} className={`strikeDot ${team.strikes > i ? "on" : ""}`}>X</span>
        ))}
      </div>
    </div>
  );
}

function BankCard() {
  const bank = useGame((s) => s.roundBank);
  const mult = useGame((s) => s.round?.multiplier || 1);
  return (
    <div className="bankBadge">
      Bank <span className="mono">{bank}</span> × <span className="mono">{mult}</span> ={" "}
      <b className="mono">{bank * mult}</b>
    </div>
  );
}

function Controls() {
  const hostMode = useGame((s) => s.hostMode);
  const setTitle = useGame((s) => s.setTitle);
  const setTitleFont = useGame((s) => s.setTitleFont);

  const setRound = useGame((s) => s.setRound);
  const reveal = useGame((s) => s.reveal);
  const addStrike = useGame((s) => s.addStrike);
  const clearStrikes = useGame((s) => s.clearStrikes);
  const buzz = useGame((s) => s.buzz);
  const resetBuzz = useGame((s) => s.resetBuzz);
  const awardRound = useGame((s) => s.awardRound);
  const resetScores = useGame((s) => s.resetScores);

  const title = useGame((s) => s.title);
  const titleFont = useGame((s) => s.titleFont);
  const round = useGame((s) => s.round);
  const teamA = useGame((s) => s.teamA);
  const teamB = useGame((s) => s.teamB);
  const buzzingTeam = useGame((s) => s.buzzingTeam);

  const [rounds, setRounds] = useState([]);
  const [selected, setSelected] = useState(null);

  const fileRef = useRef(null);

  const onCSV = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = await parseCSV(f);
    setRounds(parsed);
    if (parsed.length) {
      setSelected(parsed[0].id);
      setRound(parsed[0]);
      alert("Sample round loaded");
    }
  };

  const onLoadSelected = () => {
    if (!rounds.length) return;
    const r = rounds.find((x) => x.id === selected) || rounds[0];
    setRound(r);
  };

  const allRevealed = useMemo(
    () => (round?.answers || []).every((a) => a.revealed),
    [round]
  );

  return (
    <div className="panel">
      <div className="toolbar">
        <button className={`hostBtn ${hostMode ? "on" : ""}`} disabled>
          Host Mode: {hostMode ? "ON" : "OFF"}
        </button>
        <button className="reset" onClick={resetScores}>
          Reset Scores
        </button>
      </div>

      <div className="row">
        <button
          className="shareBtn"
          onClick={() => {
            const url = `${location.origin}/studio`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
        >
          Open Studio View (share this tab)
        </button>
      </div>

      <div className="form">
        <label>Game Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="K'mmunity Klash"
        />
      </div>

      <div className="form">
        <label>Title Font</label>
        <select value={titleFont} onChange={(e) => setTitleFont(e.target.value)}>
          <option>Bangers (bold comic)</option>
          <option>Anton</option>
          <option>Montserrat</option>
          <option>Poppins</option>
        </select>
      </div>

      <div className="form">
        <label>Or upload a CSV (same headers)</label>
        <input type="file" accept=".csv" ref={fileRef} onChange={onCSV} />
      </div>

      <div className="row">
        <button className="primary wide" onClick={async () => {
          // quick demo loader without a real sheet
          if (!rounds.length) {
            alert("Choose a CSV first, then pick a round.");
            return;
          }
          setRound(rounds[0]);
        }}>
          Load Sample Round
        </button>
      </div>

      <div className="row">
        <div className="selectGroup">
          <label>Load Selected Round</label>
          <div className="selectRow">
            <button className="primary" onClick={onLoadSelected}>
              Load Selected Round
            </button>
            <select
              value={selected || ""}
              onChange={(e) => setSelected(e.target.value)}
              className="selectDark"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id.split("-")[0]} • x{r.multiplier} • {r.question.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="awardRow">
        <button className="award" onClick={() => awardRound("A")}>
          Award to Team A
        </button>
        <BankCard />
        <button className="award" onClick={() => awardRound("B")}>
          Award to Team B
        </button>
      </div>

      <div className="strikeControls">
        <div className="strikeCol">
          <button onClick={() => addStrike("A")}>+ Strike A</button>
        </div>
        <div className="strikeCol">
          <button onClick={() => addStrike("B")}>+ Strike B</button>
        </div>
        <div className="strikeCol">
          <button onClick={clearStrikes}>Clear</button>
        </div>
      </div>

      <div className="buzzControls">
        <button
          className={`buzz ${buzzingTeam === "A" ? "lit" : ""}`}
          onClick={() => buzz("A")}
        >
          Buzz Team A
        </button>
        <button className="buzz reset" onClick={resetBuzz}>
          Reset
        </button>
        <button
          className={`buzz ${buzzingTeam === "B" ? "lit" : ""}`}
          onClick={() => buzz("B")}
        >
          Buzz Team B
        </button>
      </div>

      <div className="kbd">
        <div>Keyboard (host):</div>
        <div>1–8 = reveal/hide answer</div>
        <div>R = reset buzz • S = +strike (A), D = +strike (B)</div>
        <div>W = award A, E = award B</div>
      </div>

      {/* Live scores for host */}
      <div className="scoreRow">
        <ScoreBar team={teamA} label={teamA.name} />
        <ScoreBar team={teamB} label={teamB.name} />
      </div>

      {/* Answer grid (host can toggle) */}
      <div className="answersHost">
        {(round?.answers || []).map((a, i) => (
          <button
            key={i}
            className={`answerBtn ${a.revealed ? "on" : ""}`}
            onClick={() => reveal(i)}
            title="Click to reveal/hide"
          >
            <span className="num">{i + 1}</span>
            <span className="txt">{a.text || "—"}</span>
            <span className="pts">{a.revealed ? a.points : ""}</span>
          </button>
        ))}
        {!round?.answers?.length && (
          <div className="empty">Load a round…</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // bind some hotkeys for host convenience
  const reveal = useGame((s) => s.reveal);
  const addStrike = useGame((s) => s.addStrike);
  const resetBuzz = useGame((s) => s.resetBuzz);
  const awardRound = useGame((s) => s.awardRound);

  React.useEffect(() => {
    const onKey = (e) => {
      if (/^[1-8]$/.test(e.key)) {
        e.preventDefault();
        reveal(Number(e.key) - 1);
      } else if (e.key.toLowerCase() === "s") {
        addStrike("A");
      } else if (e.key.toLowerCase() === "d") {
        addStrike("B");
      } else if (e.key.toLowerCase() === "r") {
        resetBuzz();
      } else if (e.key.toLowerCase() === "w") {
        awardRound("A");
      } else if (e.key.toLowerCase() === "e") {
        awardRound("B");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reveal, addStrike, resetBuzz, awardRound]);

  return (
    <div className="wrap">
      <header className="brand">
        <div className="badge">KK</div>
        <div className="title">K’MMUNITY KLASH</div>
      </header>
      <Controls />
    </div>
  );
}
