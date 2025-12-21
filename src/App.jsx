import React, { useEffect, useMemo, useRef, useState } from "react";
import { actions, subscribe, parseCsvText } from "./store";
import { playReveal, playStrike, playBuzz, playAward } from "./sfx";

export default function App() {
  const [s, setS] = useState(null);
  const [rounds, setRounds] = useState([]); // parsed from CSV
  const [selected, setSelected] = useState(0);

  useEffect(() => subscribe(setS), []);

  const selectedRound = rounds[selected];

  function handleCsvUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsvText(text);
      setRounds(parsed);
      if (parsed[0]) {
        actions.loadRound(parsed[0].question, parsed[0].answers);
        setSelected(0);
      }
      alert("Rounds loaded from CSV");
    };
    reader.readAsText(f);
  }

  function loadSelected() {
    if (!selectedRound) return;
    actions.loadRound(selectedRound.question, selectedRound.answers);
  }

  const answersCount = useMemo(() => s?.answers?.length || 0, [s]);

  if (!s) return null;

  return (
    <div className={`app font-${s.font}`}>
      <header className="brand">
        <div className="logo-circle">KK</div>
        <h1>K'mmunity Klash</h1>
      </header>

      <section className="board">
        <div className="round-chip">Round Multiplier: ×{s.roundMultiplier}</div>
        <div className="answers-chip">Answers: {answersCount}</div>

        <div className="question">{s.question || "Load a round..."}</div>

        <div className="answers-grid">
          {s.answers.map((a, i) => (
            <button
              key={i}
              className={`answer-card ${a.shown ? "shown" : ""}`}
              onClick={() => {
                if (a.shown) {
                  actions.hide(i);
                } else {
                  actions.reveal(i);
                  playReveal();
                }
              }}
            >
              <span className="index">{i + 1}</span>
              <span className="text">{a.shown ? a.text : "— — — —"}</span>
              <span className="pts">{a.shown ? a.points : "?"}</span>
            </button>
          ))}
        </div>

        <div className="scores">
          <TeamCard label={s.teams.A.name} value={s.teams.A.score} strikes={s.teams.A.strikes} />
          <div className="bank">
            <div className="bank-label">Bank</div>
            <div className="bank-value">{s.bank}</div>
          </div>
          <TeamCard label={s.teams.B.name} value={s.teams.B.score} strikes={s.teams.B.strikes} />
        </div>
      </section>

      <aside className="panel">
        <div className="panel-row">
          <button onClick={() => { actions.resetAll(); }}>Reset Scores</button>
          <button onClick={() => window.open("/studio", "_blank")}>
            Open Studio View (share this tab)
          </button>
        </div>

        <div className="panel-group">
          <label>Game Title</label>
          <input
            value={s.title}
            onChange={(e) => actions.setTitle(e.target.value)}
            placeholder="Game Title"
          />
        </div>

        <div className="panel-group">
          <label>Title Font</label>
          <select value={s.font} onChange={(e) => actions.setFont(e.target.value)}>
            <option value="bangers">Bangers (bold comic)</option>
            <option value="inter">Inter (clean)</option>
          </select>
        </div>

        <div className="panel-row">
          <label>Round Multiplier</label>
          <select
            value={s.roundMultiplier}
            onChange={(e) => actions.setMultiplier(Number(e.target.value))}
          >
            <option value={1}>×1</option>
            <option value={2}>×2</option>
            <option value={3}>×3</option>
            <option value={4}>×4</option>
          </select>
        </div>

        <div className="panel-group">
          <label>Upload a CSV (same headers)</label>
          <input type="file" accept=".csv" onChange={handleCsvUpload} />
          <button onClick={() => {
            const sample = `round,question,a1,p1,a2,p2,a3,p3,a4,p4,a5,p5
1,Name something people do before a big meeting,Prepare slides,35,Get coffee,25,Practice,20,Check notes,10,Review agenda,5`;
            const parsed = parseCsvText(sample);
            setRounds(parsed);
            actions.loadRound(parsed[0].question, parsed[0].answers);
            alert("Sample round loaded");
          }}>Load Sample Round</button>
        </div>

        <div className="panel-group">
          <label>Load Selected Round</label>
          <div className="row">
            <select
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {rounds.map((r, i) => (
                <option key={i} value={i}>
                  #{i + 1} • ×{s.roundMultiplier} • {r.question.slice(0, 24)}
                </option>
              ))}
            </select>
            <button onClick={loadSelected}>Load Selected</button>
          </div>
        </div>

        <div className="panel-group">
          <label>Award Bank</label>
          <div className="row">
            <button onClick={() => { actions.award("A"); playAward(); }}>Award to Team A</button>
            <button onClick={() => { actions.award("B"); playAward(); }}>Award to Team B</button>
          </div>
        </div>

        <div className="panel-group">
          <label>Strikes</label>
          <div className="row">
            <button onClick={() => { actions.strike("A"); playStrike(); }}>+ Strike A</button>
            <button onClick={() => { actions.strike("B"); playStrike(); }}>+ Strike B</button>
            <button onClick={() => actions.clearStrikes()}>Clear</button>
          </div>
        </div>

        <div className="panel-group">
          <label>Buzzer</label>
          <div className="row">
            <button onClick={() => { actions.buzz("A"); playBuzz(); }}>Buzz Team A</button>
            <button onClick={() => actions.resetBuzz()}>Reset</button>
            <button onClick={() => { actions.buzz("B"); playBuzz(); }}>Buzz Team B</button>
          </div>
        </div>

        <div className="kbd-hints">
          <strong>Keyboard (host):</strong><br/>
          1–8 = reveal/hide answer • A/B = buzz team • R = reset buzz<br/>
          S = +strike (A), D = +strike (B) • W/E = award A/B
        </div>
      </aside>

      <Kbd />
    </div>
  );
}

function TeamCard({ label, value, strikes }) {
  const xs = new Array(3).fill(0).map((_, i) => (
    <span key={i} className={`x ${i < strikes ? "on" : ""}`}>x</span>
  ));
  return (
    <div className="team">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="xs">{xs}</div>
    </div>
  );
}

function Kbd() {
  // Hotkeys for host
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "8") {
        const i = Number(k) - 1;
        // toggle reveal
        actions.reveal(i); // reveal first…
        // if it was already shown, toggling will hide:
        // we call hide if already revealed by reading local
        // (safe enough, because reveal() ignores already-shown)
      } else if (k === "a") {
        actions.buzz("A");
      } else if (k === "b") {
        actions.buzz("B");
      } else if (k === "r") {
        actions.resetBuzz();
      } else if (k === "s") {
        actions.strike("A");
      } else if (k === "d") {
        actions.strike("B");
      } else if (k === "w") {
        actions.award("A");
      } else if (k === "e") {
        actions.award("B");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
