import { useEffect } from "react";
import { useGame } from "./store";
import cx from "clsx";

function StrikeLights({ n = 0 }) {
  return (
    <div className="studio-strikes">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cx("studio-x", i < n && "on")}>
          X
        </div>
      ))}
    </div>
  );
}

export default function Studio() {
  const g = useGame();

  useEffect(() => {
    document.title = `${g.title} — Studio`;
    document.documentElement.style.setProperty("--title-font", `"${g.titleFont}", var(--ui-font)`);
  }, [g.title, g.titleFont]);

  // Frame color (visual flourish)
  const total = g.teamA.score + g.teamB.score;
  let frame = "linear-gradient(90deg, var(--accent), var(--accent-2)) 1";
  if (total >= 500) frame = "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f472b6, #a78bfa) 1";
  else if (total >= 300) frame = "linear-gradient(90deg, #d6b660, #e3cc7a) 1";
  else if (total >= 200) frame = "linear-gradient(90deg, #c0c0c0, #d8d8d8) 1";
  else if (total >= 100) frame = "linear-gradient(90deg, #cd7f32, #e59f5b) 1";

  return (
    <div className="studio-wrap">
      <div className="studio-spot a" />
      <div className="studio-spot b" />

      <header className="studio-header">
        <div className="studio-logo">KK</div>
        <h1 className="studio-title">{g.title}</h1>
        <div className="studio-round">Round x{g.round?.multiplier || 1}</div>
      </header>

      <main className="studio-main">
        <section className="studio-board" style={{ borderImage: frame, borderImageSlice: 1 }}>
          <div className="studio-question">
            {g.round?.question || "Waiting for host to load a round..."}
          </div>

          <div className="studio-answers">
            {(g.round?.answers || []).map((a, i) => (
              <div key={i} className={cx("studio-answer", a.revealed && "show")}>
                <span className="num">{i + 1}</span>
                <span className="text">{a.revealed ? a.text : ""}</span>
                <span className="pts">{a.revealed ? a.points : ""}</span>
              </div>
            ))}
          </div>

          {g.buzzingTeam && <div className="studio-buzz">BUZZ! Team {g.buzzingTeam}</div>}
        </section>

        <section className="studio-podiums">
          <div className="pod">
            <div className="pod-name">{g.teamA.name}</div>
            <div className="pod-score">{g.teamA.score}</div>
            <StrikeLights n={g.teamA.strikes} />
          </div>

          <div className="pod mid">
            <div className="bank">
              Bank <b>{g.roundBank}</b> × <b>{g.round?.multiplier || 1}</b> =
              <span className="bank-total"> {g.roundBank * (g.round?.multiplier || 1)}</span>
            </div>
          </div>

          <div className="pod">
            <div className="pod-name">{g.teamB.name}</div>
            <div className="pod-score">{g.teamB.score}</div>
            <StrikeLights n={g.teamB.strikes} />
          </div>
        </section>
      </main>

      <footer className="studio-footer">
        Share this tab in Google Meet — host controls stay in the other tab.
      </footer>
    </div>
  );
}
