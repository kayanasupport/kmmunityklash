import React, { useEffect, useState } from "react";
import { subscribe } from "./store";

export default function Studio() {
  const [s, setS] = useState(null);
  useEffect(() => subscribe(setS), []);
  if (!s) return null;

  return (
    <div className={`studio font-${s.font}`}>
      <div className="studio-header">
        <div className="logo-circle">KK</div>
        <div className="wordmark">{s.title}</div>
        <div className="pill">Round ×{s.roundMultiplier}</div>
      </div>

      <div className="studio-stage">
        <div className="studio-question">
          {s.question || "Waiting for host to load a round..."}
        </div>

        <div className="studio-answers">
          {s.answers.map((a, i) => (
            <div key={i} className={`studio-answer ${a.shown ? "on" : ""}`}>
              <div className="num">{i + 1}</div>
              <div className="text">{a.shown ? a.text : ""}</div>
              <div className="pts">{a.shown ? a.points : ""}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="studio-bottom">
        <Panel label="Team A" score={s.teams.A.score} strikes={s.teams.A.strikes}/>
        <div className="studio-bank">
          <div className="label">Bank</div>
          <div className="value">{s.bank}</div>
        </div>
        <Panel label="Team B" score={s.teams.B.score} strikes={s.teams.B.strikes}/>
      </div>

      {(s.teams.A.buzz || s.teams.B.buzz) && (
        <div className={`studio-buzz-banner ${s.teams.B.buzz ? "right" : ""}`}>
          BUZZ! {s.teams.A.buzz ? "Team A" : "Team B"}
        </div>
      )}
    </div>
  );
}

function Panel({ label, score, strikes }) {
  return (
    <div className="studio-team">
      <div className="label">{label}</div>
      <div className="score">{score}</div>
      <div className="xs">
        {new Array(3).fill(0).map((_, i) => (
          <span key={i} className={`x ${i < strikes ? "on" : ""}`}>x</span>
        ))}
      </div>
    </div>
  );
}
