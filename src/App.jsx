import React, { useEffect, useRef, useState } from "react";
import { actions, useGame } from "./store";
import sfx from "./sfx";
import "./styles.css";
import { fetchCsvText } from "./utils/sheet";

function AnswerTile({ index, answer, revealed, onToggle }) {
  const text = answer?.text ?? "";
  const pts = Number(answer?.points ?? 0);
  return (
    <button
      className={`kk-answer ${revealed ? "revealed" : ""}`}
      onClick={() => onToggle(index)}
      title={`Toggle #${index + 1} (${pts} pts)`}
    >
      <div className="kk-answer-left">{index + 1}</div>
      <div className="kk-answer-center">{revealed ? (text || "\u00A0") : "\u00A0"}</div>
      <div className="kk-answer-right">{revealed ? pts : "\u00A0"}</div>
    </button>
  );
}

function ScoreBoard() {
  const teamA = useGame((s) => s.teamA);
  const teamB = useGame((s) => s.teamB);
  const bank = useGame((s) => s.bank);
  const buzz = useGame((s) => s.buzz);
  return (
    <div className="kk-scoreboard">
      <div className={`kk-team kk-team-a ${buzz === "A" ? "buzzing" : ""}`}>
        <div className="kk-team-name">Team A</div>
        <div className="kk-team-score">{teamA?.score ?? 0}</div>
        <div className="kk-strikes">
          {Array.from({ length: Math.min(3, teamA?.strikes ?? 0) }).map((_, i) => (
            <span key={i} className="kk-strike-dot" />
          ))}
        </div>
      </div>
      <div className="kk-bank">
        <div className="kk-bank-label">Bank</div>
        <div className="kk-bank-score">{bank ?? 0}</div>
      </div>
      <div className={`kk-team kk-team-b ${buzz === "B" ? "buzzing" : ""}`}>
        <div className="kk-team-name">Team B</div>
        <div className="kk-team-score">{teamB?.score ?? 0}</div>
        <div className="kk-strikes">
          {Array.from({ length: Math.min(3, teamB?.strikes ?? 0) }).map((_, i) => (
            <span key={i} className="kk-strike-dot" />
          ))}
        </div>
      </div>
    </div>
  );
}

function RoundBoard() {
  const rounds = useGame((s) => s.rounds) || [];
  const idx = useGame((s) => s.selectedRoundIndex);
  const revealed = useGame((s) => s.revealed) || Array(8).fill(false);
  const round = (idx != null && rounds[idx]) ? rounds[idx] : null;

  const answerList = Array.from({ length: 8 }).map((_, i) =>
    round?.answers?.[i] ? round.answers[i] : { text: "", points: 0 }
  );

  const toggle = (i) => {
    if (revealed[i]) {
      actions.hide(i);
    } else {
      actions.reveal(i);
      sfx.safePlay(() => sfx.reveal.play());
    }
  };

  return (
    <div className="kk-round-board">
      <div className="kk-question" title={round?.question || ""}>
        {round ? (round.question || "—") : "Load a CSV and pick a round"}
      </div>
      <div className="kk-answers-grid">
        {answerList.map((ans, i) => (
          <AnswerTile key={i} index={i} answer={ans} revealed={!!revealed[i]} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}

function Controls() {
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);
  const title = useGame((s) => s.title) ?? "K’mmunity Klash";
  const font = useGame((s) => s.font) ?? "Bangers";
  const rounds = useGame((s) => s.rounds) ?? [];
  const selectedRoundIndex = useGame((s) => s.selectedRoundIndex);
  const roundMultiplier = useGame((s) => s.roundMultiplier) ?? 1;

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    actions.loadCsv(text);
  };

  const onFetchUrl = async () => {
    if (!url.trim()) return;
    try {
      const csv = await fetchCsvText(url.trim());
      actions.loadCsv(csv);
    } catch (e) {
      alert("Failed to load CSV from URL. Make sure it's a direct CSV link (e.g. Google Sheet → Publish to web → CSV).");
    }
  };

  return (
    <div className="kk-controls">
      <div className="kk-panel">
        <h3>Game Setup</h3>
        <div className="kk-field">
          <label>Title</label>
          <input
            className="kk-input"
            value={title}
            onChange={(e) => actions.setTitle(e.target.value)}
            placeholder="K’mmunity Klash"
          />
        </div>
        <div className="kk-field">
          <label>Font</label>
          <select
            className="kk-select"
            value={font}
            onChange={(e) => actions.setFont(e.target.value)}
          >
            <option value="Bangers">Bangers (titles)</option>
            <option value="system-ui">System UI</option>
          </select>
        </div>
        <div className="kk-field">
          <label>CSV Upload</label>
          <div className="kk-file-row">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} />
            <button className="kk-btn" onClick={() => fileRef.current?.click()}>Choose CSV</button>
            <button className="kk-btn" onClick={actions.loadSample}>Load Sample</button>
          </div>
        </div>
        <div className="kk-field">
          <label>CSV URL</label>
          <div className="kk-url-row">
            <input className="kk-input" placeholder="https://...csv" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="kk-btn" onClick={onFetchUrl}>Fetch</button>
          </div>
          <div className="kk-help">Google Sheets: File → Share → Publish to web → CSV</div>
        </div>
        <div className="kk-field">
          <a className="kk-btn" href="/studio" target="_blank" rel="noreferrer">Open Studio View (share this tab)</a>
        </div>
      </div>

      <div className="kk-panel">
        <h3>Round & Multiplier</h3>
        <div className="kk-field">
          <label>Round</label>
          <select
            className="kk-select"
            value={selectedRoundIndex ?? ""}
            onChange={(e) => actions.setSelectedRound(Number(e.target.value))}
          >
            <option value="" disabled>Select a round</option>
            {rounds.map((r, i) => {
              const q = (r?.question ?? "").slice(0, 60); // SAFE: never crashes
              const mult = r?.round ?? 1;
              return (
                <option key={i} value={i}>{`#${i + 1} — x${mult} — ${q}`}</option>
              );
            })}
          </select>
        </div>
        <div className="kk-field">
          <label>Multiplier</label>
          <div className="kk-pillset">
            {[1, 2, 3].map((m) => (
              <button
                key={m}
                className={`kk-pill ${m === roundMultiplier ? "active" : ""}`}
                onClick={() => actions.setRoundMultiplier(m)}
              >
                x{m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="kk-panel">
        <h3>Award / Buzz / Strikes</h3>
        <div className="kk-actions-row">
          <button
            className="kk-btn primary"
            onClick={() => { actions.award("A"); sfx.safePlay(() => sfx.award.play()); }}
            title="W"
          >
            Award → Team A
          </button>
          <button
            className="kk-btn primary"
            onClick={() => { actions.award("B"); sfx.safePlay(() => sfx.award.play()); }}
            title="E"
          >
            Award → Team B
          </button>
        </div>
        <div className="kk-actions-row">
          <button
            className="kk-btn warn"
            onClick={() => { actions.strike("A"); sfx.safePlay(() => sfx.strike.play()); }}
            title="S"
          >
            + Strike A
          </button>
          <button
            className="kk-btn warn"
            onClick={() => { actions.strike("B"); sfx.safePlay(() => sfx.strike.play()); }}
            title="D"
          >
            + Strike B
          </button>
        </div>
        <div className="kk-actions-row">
          <button className="kk-btn buzz" onClick={() => { actions.buzz("A"); sfx.safePlay(() => sfx.buzz.play()); }} title="A">Buzz A</button>
          <button className="kk-btn buzz" onClick={() => { actions.buzz("B"); sfx.safePlay(() => sfx.buzz.play()); }} title="B">Buzz B</button>
          <button className="kk-btn" onClick={() => actions.resetBuzz()} title="R">Reset Buzz</button>
        </div>
      </div>

      <div className="kk-panel">
        <h3>Keyboard Legend</h3>
        <ul className="kk-legend">
          <li>1–8: reveal/hide tiles</li>
          <li>A / B: buzz A / buzz B</li>
          <li>R: reset buzz</li>
          <li>S / D: +strike Team A / Team B</li>
          <li>W / E: award bank to Team A / Team B</li>
        </ul>
      </div>
    </div>
  );
}

export default function App() {
  const font = useGame((s) => s.font) ?? "Bangers";
  const revealed = useGame((s) => s.revealed) ?? Array(8).fill(false);

  // Keyboard handlers on Host only (this tab).
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "8") {
        const idx = Number(k) - 1;
        if (revealed[idx]) {
          actions.hide(idx);
        } else {
          actions.reveal(idx);
          sfx.safePlay(() => sfx.reveal.play());
        }
      } else if (k === "a") {
        actions.buzz("A");
        sfx.safePlay(() => sfx.buzz.play());
      } else if (k === "b") {
        actions.buzz("B");
        sfx.safePlay(() => sfx.buzz.play());
      } else if (k === "r") {
        actions.resetBuzz();
      } else if (k === "s") {
        actions.strike("A");
        sfx.safePlay(() => sfx.strike.play());
      } else if (k === "d") {
        actions.strike("B");
        sfx.safePlay(() => sfx.strike.play());
      } else if (k === "w") {
        actions.award("A");
        sfx.safePlay(() => sfx.award.play());
      } else if (k === "e") {
        actions.award("B");
        sfx.safePlay(() => sfx.award.play());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed]);

  return (
    <div className={`kk-app ${font === "Bangers" ? "font-bangers" : ""}`}>
      <header className="kk-header">
        <div className="kk-title">K’mmunity Klash</div>
        <div className="kk-subtitle">Host Console</div>
      </header>
      <main className="kk-main">
        <div className="kk-left">
          <ScoreBoard />
          <RoundBoard />
        </div>
        <div className="kk-right">
          <Controls />
        </div>
      </main>
    </div>
  );
}
