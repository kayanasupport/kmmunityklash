import React from "react";
import { useGame } from "./store";
import "./styles.css";

function StudioAnswer({ idx, a }) {
  return (
    <div className={`studioAnswer ${a.revealed ? "on" : ""}`}>
      <div className="left">
        <div className="pill">{idx + 1}</div>
        <div className="txt">{a.revealed ? a.text : ""}</div>
      </div>
      <div className="pts">{a.revealed ? a.points : ""}</div>
    </div>
  );
}

export default function Studio() {
  const title = useGame((s) => s.title);
  const round = useGame((s) => s.round);
  const teamA = useGame((s) => s.teamA);
  const teamB = useGame((s) => s.teamB);
  const bank = useGame((s) => s.roundBank);
  const buzzingTeam = useGame((s) => s.buzzingTeam);

  return (
    <div className="studioWrap">
      <header className="studioHeader">
        <div className="badge">KK</div>
        <div className="title studio">{title}</div>
        <div className="roundTag">Round x{round?.multiplier || 1}</div>
      </header>

      <div className="studioBoard">
        <div className={`studioQuestion ${buzzingTeam ? "buzz" : ""}`}>
          {round?.question || "WAITING FOR HOST TO LOAD A ROUND…"}
        </div>

        <div className="studioGrid">
          {(round?.answers || []).map((a, i) => (
            <StudioAnswer key={i} idx={i} a={a} />
          ))}
        </div>

        <div className="studioFooter">
          <div className="teamCard">
            <div className="teamName">{teamA.name}</div>
            <div className="teamScore">{teamA.score || 0}</div>
            <div className="strikeRow">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`strikeDot ${teamA.strikes > i ? "on" : ""}`}>
                  X
                </span>
              ))}
            </div>
          </div>

          <div className="bankCard">
            Bank <span className="mono">{bank}</span>
          </div>

          <div className="teamCard">
            <div className="teamName">{teamB.name}</div>
            <div className="teamScore">{teamB.score || 0}</div>
            <div className="strikeRow">
              {[...Array(3)].map((_, i) => (
                <span key={i} className={`strikeDot ${teamB.strikes > i ? "on" : ""}`}>
                  X
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
