import { useEffect, useMemo } from "react";
import { useGame } from "./store";
import cx from "clsx";

function StrikeLights({ n=0 }) {
  return (
    <div className="studio-strikes">
      {[0,1,2].map(i => (
        <div key={i} className={cx("studio-x", i < n && "on")}>X</div>
      ))}
    </div>
  );
}

export default function Studio(){
  const g = useGame();

  // dynamic doc title
  useEffect(()=>{ document.title = `${g.title} — Studio`; },[g.title]);

  const frame =
    g.teamA.score + g.teamB.score >= 500
      ? "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f472b6, #a78bfa)"
      : g.teamA.score + g.teamB.score >= 300
      ? "#d6b660"
      : g.teamA.score + g.teamB.score >= 200
      ? "#c0c0c0"
      : g.teamA.score + g.teamB.score >= 100
      ? "#cd7f32"
      : "#2b3d7a";

  return (
    <div className="studio-wrap">
      {/* stage lights */}
      <div className="studio-spot a" />
      <div className="studio-spot b" />
      <header className="studio-header">
        <div className="studio-logo">KK</div>
        <h1 className="studio-title">{g.title}</h1>
        <div className="studio-round">Round x{g.round?.multiplier || 1}</div>
      </header>

      <main className="studio-main">
        {/* Answer Board */}
        <section className="studio-board" style={{borderImage: typeof frame==="string" && frame.includes("conic") ? frame+" 1" : "linear-gradient(90deg, var(--accent), var(--accent-2)) 1"}}>
          <div className="studio-question">
            {g.round?.question || "Waiting for host to load a round…"}
          </div>
          <div className="studio-answers">
            {(g.round?.answers || []).map((a,i)=>(
              <div key={i} className={cx("studio-answer", a.revealed && "show")}>
                <span className="num">{i+1}</span>
                <span className="text">{a.revealed ? a.text : ""}</span>
                <span className="pts">{a.revealed ? a.points : ""}</span>
              </div>
            ))}
          </div>
          {g.buzzingTeam && (
            <div className="studio-buzz">BUZZ! Team {g.buzzingTeam}</div>
          )}
        </section>

        {/* Podiums */}
        <section className="studio-podiums">
          <div className="pod">
            <div className="pod-name">{g.teamA.name}</div>
            <div className="pod-score">{g.teamA.score}</div>
            <StrikeLights n={g.teamA.strikes}/>
          </div>
          <div className="pod mid">
            <div className="bank">
              Bank <b>{g.roundBank}</b> × <b>{g.round?.multiplier || 1}</b> =
              <span className="bank-total"> {g.roundBank*(g.round?.multiplier||1)}</span>
            </div>
          </div>
          <div className="pod">
            <div className="pod-name">{g.teamB.name}</div>
            <div className="pod-score">{g.teamB.score}</div>
            <StrikeLights n={g.teamB.strikes}/>
          </div>
        </section>
      </main>

      <footer className="studio-footer">
        Share this tab in Google Meet — host controls stay in the other tab.
      </footer>
    </div>
  );
}
