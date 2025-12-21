import React from "react";
import { useGame } from "./store";
import "./styles.css";

export default function Studio() {
  const {
    title, titleFont, rounds, currentRoundIndex, revealed,
    teamA, teamB, strikesA, strikesB, bank, buzz, roundMultiplier
  } = useGame();

  const r = rounds[currentRoundIndex] || { q: "Waiting for host to load a round...", answers: [] };

  return (
    <div className="studio">
      <header className="studio-head">
        <div className="brand">K’MMUNITY KLASH</div>
        <div className="round-pill">Round x{r.mult || roundMultiplier || 1}</div>
      </header>

      <main className="board">
        <h1 className="question" style={{ fontFamily: titleFont }}>{r.q || "Waiting for host to load a round..."}</h1>

        <div className="answers-grid">
          {Array.from({ length: Math.max(4, r.answers.length || 4) }).map((_, idx) => {
            const ans = r.answers[idx];
            const isShown = revealed.includes(idx) && ans;
            return (
              <div key={idx} className={`answer-card ${isShown ? "shown" : ""}`}>
                <div className="slot">{idx + 1}</div>
                <div className="answer-text">{isShown ? ans.a : ""}</div>
                <div className="points">{isShown ? ans.p : ""}</div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="scorebar">
        <div className="team">
          <div className="label">Team A</div>
          <div className="score">{teamA}</div>
          <div className="strikes">
            {[0,1,2].map(i => <span key={i} className={`x ${strikesA>i?"on":""}`}>x</span>)}
          </div>
        </div>

        <div className="bank">
          <div className="label">Bank</div>
          <div className="score">{bank}</div>
        </div>

        <div className="team">
          <div className="label">Team B</div>
          <div className="score">{teamB}</div>
          <div className="strikes">
            {[0,1,2].map(i => <span key={i} className={`x ${strikesB>i?"on":""}`}>x</span>)}
          </div>
        </div>
      </footer>

      {buzz && <div className={`buzz-ribbon ${buzz==="A"?"left":"right"}`}>BUZZ! Team {buzz}</div>}
    </div>
  );
}
