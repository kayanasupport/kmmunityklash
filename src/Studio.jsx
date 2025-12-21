import React from "react";
import { useGame } from "./store";

export default function Studio() {
  const s = useGame();

  const answers = s.round?.answers || [];
  const bank = (Number(s.roundBank) || 0) * (Number(s.round?.multiplier) || 1);

  return (
    <div className="studio-wrap" style={{ fontFamily: "var(--ui-font)" }}>
      <div className="studio-spot a" />
      <div className="studio-spot b" />

      <header className="studio-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="studio-logo">KK</div>
          <h1 className="studio-title" style={{ fontFamily: s.titleFont || "Bangers" }}>
            {s.title || "K'mmunity Klash"}
          </h1>
        </div>
        <div className="studio-round">Round x{Number(s.round?.multiplier) || 1}</div>
      </header>

      <main className="studio-main">
        <section className="studio-board">
          <div className="studio-question">
            {s.round?.question || "Waiting for host to load a round..."}
          </div>

          <div className="studio-answers">
            {answers.map((a, i) => (
              <div key={i} className={`studio-answer ${a.revealed ? "show" : ""}`}>
                <div className="num">{i + 1}</div>
                <div className="txt" style={{ fontWeight: 800 }}>
                  {a.revealed ? String(a.text || "").toUpperCase() : ""}
                </div>
                <div className="pts">{a.revealed ? (Number(a.points) || 0) : ""}</div>
              </div>
            ))}
          </div>

          {s.buzzingTeam && <div className="studio-buzz">BUZZ! Team {s.buzzingTeam}</div>}
        </section>

        <section className="studio-podiums">
          <div className="pod">
            <div className="pod-name">{s.teamA?.name || "Team A"}</div>
            <div className="pod-score">{Number(s.teamA?.score) || 0}</div>
            <div className="studio-strikes">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`studio-x ${((s.teamA?.strikes || 0) > i) ? "on" : ""}`}>X</div>
              ))}
            </div>
          </div>

          <div className="pod mid">
            <div className="bank">
              Bank
              <span className="bank-total"> {bank}</span>
            </div>
          </div>

          <div className="pod">
            <div className="pod-name">{s.teamB?.name || "Team B"}</div>
            <div className="pod-score">{Number(s.teamB?.score) || 0}</div>
            <div className="studio-strikes">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`studio-x ${((s.teamB?.strikes || 0) > i) ? "on" : ""}`}>X</div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
