import React from "react";
import { useGame } from "./store";
import "./styles.css";

function StudioAnswer({ index, answer, revealed }) {
  return (
    <div className={`kk-studio-answer ${revealed ? "revealed" : ""}`}>
      <div className="kk-answer-left">{index + 1}</div>
      <div className="kk-answer-center">{revealed ? (answer?.text || "\u00A0") : "\u00A0"}</div>
      <div className="kk-answer-right">{revealed ? answer?.points ?? 0 : "\u00A0"}</div>
    </div>
  );
}

export default function Studio() {
  const title = useGame((s) => s.title);
  const font = useGame((s) => s.font);
  const rounds = useGame((s) => s.rounds);
  const idx = useGame((s) => s.selectedRoundIndex);
  const round = rounds[idx] || null;
  const revealed = useGame((s) => s.revealed);
  const teamA = useGame((s) => s.teamA);
  const teamB = useGame((s) => s.teamB);
  const bank = useGame((s) => s.bank);
  const buzz = useGame((s) => s.buzz);

  const answers = Array.from({ length: 8 }).map((_, i) => round?.answers?.[i] || { text: "", points: 0 });

  return (
    <div className={`kk-studio ${font === "Bangers" ? "font-bangers" : ""}`}>
      <div className="kk-studio-frame">
        <div className="kk-studio-header">
          <div className="kk-studio-title">{title || "K’mmunity Klash"}</div>
          <div className="kk-studio-scores">
            <div className={`kk-studio-team ${buzz === "A" ? "buzzing" : ""}`}>
              <span>Team A</span>
              <strong>{teamA.score}</strong>
              <div className="kk-studio-strikes">
                {Array.from({ length: teamA.strikes }).map((_, i) => <span key={i} className="kk-strike-dot" />)}
              </div>
            </div>
            <div className="kk-studio-bank">
              <span>Bank</span>
              <strong>{bank}</strong>
            </div>
            <div className={`kk-studio-team ${buzz === "B" ? "buzzing" : ""}`}>
              <span>Team B</span>
              <strong>{teamB.score}</strong>
              <div className="kk-studio-strikes">
                {Array.from({ length: teamB.strikes }).map((_, i) => <span key={i} className="kk-strike-dot" />)}
              </div>
            </div>
          </div>
        </div>

        <div className="kk-studio-question">{round ? round.question : "Waiting for host…"}</div>

        <div className="kk-studio-answers">
          {answers.map((ans, i) => (
            <StudioAnswer key={i} index={i} answer={ans} revealed={revealed[i]} />
          ))}
        </div>

        {buzz && (
          <div className={`kk-buzz-banner show ${buzz === "A" ? "team-a" : "team-b"}`}>
            <span>{buzz === "A" ? "Team A" : "Team B"} Buzz!</span>
          </div>
        )}
      </div>
    </div>
  );
}
