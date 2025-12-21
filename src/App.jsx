import React, { useEffect, useRef, useState } from "react";
import { useGame } from "./store";
import "./styles.css";

export default function App() {
  const fileRef = useRef(null);
  const [roundPick, setRoundPick] = useState(0);

  const {
    title, titleFont, teamA, teamB, strikesA, strikesB, bank, total, rounds, currentRoundIndex,
    setTitle, setTitleFont, setMultiplier,
    loadCsvRounds, loadSample, selectRound,
    revealAnswer, hideAnswer, addStrike, clearStrikes,
    setBuzz, resetBuzz, awardTo, resetScores
  } = useGame();

  useEffect(() => {
    // Ensure listeners & persisted state load once
    useGame.getState().boot?.();
  }, []);

  useEffect(() => {
    setRoundPick(currentRoundIndex >= 0 ? currentRoundIndex : 0);
  }, [currentRoundIndex]);

  // CSV loader (client-only)
  const onCsv = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const head = rows.shift().split(",");
    const objs = rows.map(line => {
      const cols = line.split(",");
      const o = {};
      head.forEach((h, i) => { o[h.trim()] = cols[i]?.trim(); });
      return o;
    });
    loadCsvRounds(objs);
    alert("CSV loaded");
  };

  const r = rounds[currentRoundIndex] || { q: "Load a round…", answers: [] };

  return (
    <div className="host">
      <div className="grid">
        <div className="board-card">
          <div className="round-hint">Round Multiplier: x{r.mult || 1}</div>
          <div className="answers-count">Answers: {r.answers?.length || 0}</div>
          <h1 className="question">{r.q || "Load a round…"}</h1>

          <div className="host-answers">
            {Array.from({ length: Math.max(4, r.answers.length || 4) }).map((_, idx) => {
              const ans = r.answers[idx];
              const revealed = useGame.getState().revealed.includes(idx) && ans;
              return (
                <button
                  key={idx}
                  className={`reveal-btn ${revealed ? "on" : ""}`}
                  onClick={() => (revealed ? hideAnswer(idx) : revealAnswer(idx))}
                >
                  <span className="slot">{idx + 1}</span>
                  <span className="txt">{revealed ? ans.a : "— — —"}</span>
                  <span className="pts">{revealed ? ans.p : "?"}</span>
                </button>
              );
            })}
          </div>

          <div className="score-inline">
            <div className="team-col">
              <div className="team-name">Team A</div>
              <div className="score-mini">{teamA}</div>
              <div className="xs">
                {[0,1,2].map(i => (
                  <span key={i} className={`x ${strikesA>i?"on":""}`}>x</span>
                ))}
              </div>
            </div>
            <div className="team-col">
              <div className="team-name">Team B</div>
              <div className="score-mini">{teamB}</div>
              <div className="xs">
                {[0,1,2].map(i => (
                  <span key={i} className={`x ${strikesB>i?"on":""}`}>x</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="controls">
          <div className="row">
            <button className="btn ghost" onClick={resetScores}>Reset Scores</button>
          </div>

          <div className="row">
            <a className="btn primary" href="/studio" target="_blank" rel="noreferrer">Open Studio View (share this tab)</a>
          </div>

          <label className="lbl">Game Title</label>
          <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="K'mmunity Klash" />

          <label className="lbl">Title Font</label>
          <select className="input" value={titleFont} onChange={e=>setTitleFont(e.target.value)}>
            <option>Bangers (bold comic)</option>
            <option>Anton</option>
            <option>Montserrat</option>
          </select>

          <label className="lbl">Or upload a CSV (same headers)</label>
          <input ref={fileRef} className="input" type="file" accept=".csv" onChange={onCsv} />

          <div className="row">
            <button className="btn" onClick={loadSample}>Load Sample Round</button>
          </div>

          <label className="lbl">Load Selected Round</label>
          <div className="row">
            <select
              className="input select-round"
              value={roundPick}
              onChange={(e)=>setRoundPick(Number(e.target.value))}
              onBlur={()=>selectRound(roundPick)}
              onKeyDown={(e)=>{ if(e.key==='Enter') selectRound(roundPick);}}
            >
              {(rounds || []).map((rr, idx) => (
                <option key={idx} value={idx}>
                  #{idx+1} • x{rr.mult || 1} • {rr.q?.slice(0, 40) || "Round"}
                </option>
              ))}
            </select>
            <button className="btn" onClick={()=>selectRound(roundPick)}>Load Selected Round</button>
          </div>

          <div className="bank-wrap">
            <div className="bank-label">Bank</div>
            <div className="bank-score">{bank} × {r.mult || 1} = <strong>{bank * (r.mult || 1)}</strong></div>
          </div>

          <div className="row two">
            <button className="btn win" onClick={()=>awardTo("A")}>Award to Team A</button>
            <button className="btn win" onClick={()=>awardTo("B")}>Award to Team B</button>
          </div>

          <div className="row two">
            <button className="btn" onClick={()=>addStrike("A")}>+ Strike A</button>
            <button className="btn" onClick={()=>addStrike("B")}>+ Strike B</button>
            <button className="btn ghost" onClick={clearStrikes}>Clear</button>
          </div>

          <div className="row two">
            <button className="btn buzz" onClick={()=>setBuzz("A")}>Buzz Team A</button>
            <button className="btn ghost" onClick={resetBuzz}>Reset</button>
            <button className="btn buzz" onClick={()=>setBuzz("B")}>Buzz Team B</button>
          </div>

          <div className="kbd">
            <div>Keyboard (host):</div>
            <div>1–8 = reveal/hide answer • A/B = buzz team • R = reset buzz</div>
            <div>S = +strike (A), D = +strike (B) • W/E = award A/B</div>
          </div>
        </div>
      </div>
    </div>
  );
}
