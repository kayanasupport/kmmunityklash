import React from "react";
import { useGame } from "./store";

export default function Studio() {
  const g = useGame((s) => ({
    title: s.title,
    titleFont: s.titleFont,
    round: s.round,
    roundBank: s.roundBank,
    teamA: s.teamA,
    teamB: s.teamB,
    buzzingTeam: s.buzzingTeam,
  }));

  const answers = g.round?.answers || [];
  return (
    <div className="studio-wrap" style={{ fontFamily: "var(--ui-font)" }}>
      <div className="studio-spot a" />
      <div className="studio-spot b" />

      <header className="studio-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="studio-logo">KK</div>
          <h1
            className="studio-title"
            style={{ fontFamily: g.titleFont || "Bangers" }}
          >
            {g.title || "K'mmunity Klash"}
          </h1>
        </div>
        <div className="studio-round">Round x{Number(g.round?.multiplier) || 1}</div>
      </header>

      <main className="studio-main">
        {/* BOARD */}
        <section className="studio-board">
          <div className="studio-question">{g.round?.question || "Waiting for host to load a round..."}</div>

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

          {g.buzzingTeam && (
            <div className="studio-buzz">BUZZ! Team {g.buzzingTeam}</div>
          )}
        </section>

        {/* PODIUMS */}
        <section className="studio-podiums">
          <div className="pod">
            <div className="pod-name">{g.teamA?.name || "Team A"}</div>
            <div className="pod-score">{Number(g.teamA?.score) || 0}</div>
            <div className="studio-strikes">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`studio-x ${
                    (Number(g.teamA?.strikes) || 0) > i ? "on" : ""
                  }`}
                >
                  X
                </div>
              ))}
            </div>
          </div>

          <div className="pod mid">
            <div className="bank">
              Bank
              <span className="bank-total">
                {Number(g.roundBank) || 0} × {Number(g.round?.multiplier) || 1} ={" "}
                {(Number(g.roundBank) || 0) * (Number(g.round?.multiplier) || 1)}
              </span>
            </div>
          </div>

          <div className="pod">
            <div className="pod-name">{g.teamB?.name || "Team B"}</div>
            <div className="pod-score">{Number(g.teamB?.score) || 0}</div>
            <div className="studio-strikes">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`studio-x ${
                    (Number(g.teamB?.strikes) || 0) > i ? "on" : ""
                  }`}
                >
                  X
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
