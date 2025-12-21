import React, { useEffect, useMemo, useState } from "react";
import { useGame } from "./store";
import sfx from "./sfx";
import "./styles.css";

function StrikeXs({ count }) {
  const c = Math.min(3, count || 0);
  return (
    <div className="kk-studio-strikes">
      {Array.from({ length: c }).map((_, i) => (
        <span key={i} className="kk-strike-x">✖</span>
      ))}
    </div>
  );
}

function StudioAnswer({ visibleIndex, answer, revealed }) {
  return (
    <div className={`kk-studio-answer ${revealed ? "revealed" : ""}`}>
      <div className="kk-answer-left">{visibleIndex + 1}</div>
      <div className="kk-answer-center">{revealed ? (answer?.text || "\u00A0") : "\u00A0"}</div>
      <div className="kk-answer-right">{revealed ? (answer?.points ?? 0) : "\u00A0"}</div>
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
  const strikeFlash = useGame((s) => s.strikeFlash);

  const visible = useMemo(() => {
    const ans = round?.answers || [];
    return ans.map((a, i) => ({ a, i }))
      .filter(({ a }) => (a?.text || "").trim().length > 0 && Number(a?.points || 0) > 0);
  }, [round]);

  // Audio enable (autoplay policy)
  const [audioReady, setAudioReady] = useState(() => localStorage.getItem("kk-audio-ready") === "1");
  async function primeAudio() {
    setAudioReady(true);
    localStorage.setItem("kk-audio-ready", "1");
    try { await sfx.prime(); } catch {}
  }

  // Fast path: listen to instantaneous event channel for SFX
  useEffect(() => {
    const bc = new BroadcastChannel("kk-evt");
    bc.onmessage = (ev) => {
      if (!audioReady) return;
      const { type } = ev.data || {};
      if (type === "reveal") sfx.safePlay(() => sfx.reveal.play());
      else if (type === "strike") sfx.safePlay(() => sfx.strike.play());
      else if (type === "buzz") sfx.safePlay(() => sfx.buzz.play());
      else if (type === "award" || type === "transfer" || type === "reset") sfx.safePlay(() => sfx.award.play());
    };
    return () => bc.close();
  }, [audioReady]);

  // Strike big X overlay
  const [flashId, setFlashId] = useState(null);
  useEffect(() => {
    if (strikeFlash?.id) {
      setFlashId(strikeFlash.id);
      const t = setTimeout(() => setFlashId(null), 900);
      return () => clearTimeout(t);
    }
  }, [strikeFlash?.id]);

  return (
    <div className={`kk-studio ${font === "Bangers" ? "font-bangers" : ""}`} onClick={() => { if (!audioReady) primeAudio(); }}>
      <div className="kk-studio-frame">
        {!audioReady && (
          <button className="kk-audio-primer" onClick={primeAudio}>Enable Audio</button>
        )}

        <div className="kk-studio-header">
          <div className="kk-studio-title">{title || "K’mmunity Klash"}</div>
          <div className="kk-studio-scores">
            <div className={`kk-studio-team ${buzz === "A" ? "buzzing" : ""}`}>
              <span>Team A</span>
              <strong>{teamA.score}</strong>
              <StrikeXs count={teamA.strikes} />
            </div>
            <div className="kk-studio-bank">
              <span>Bank</span>
              <strong>{bank}</strong>
            </div>
            <div className={`kk-studio-team ${buzz === "B" ? "buzzing" : ""}`}>
              <span>Team B</span>
              <strong>{teamB.score}</strong>
              <StrikeXs count={teamB.strikes} />
            </div>
          </div>
        </div>

        <div className="kk-studio-question">{round ? round.question : "Waiting for host…"}</div>

        <div className="kk-studio-answers">
          {visible.map(({ a, i }, visIdx) => (
            <StudioAnswer key={i} visibleIndex={visIdx} answer={a} revealed={revealed[i]} />
          ))}
        </div>

        {buzz && (
          <div className={`kk-buzz-banner show ${buzz === "A" ? "team-a" : "team-b"}`}>
            <span>{buzz === "A" ? "Team A" : "Team B"} Buzz!</span>
          </div>
        )}

        {flashId && (
          <div className="kk-strike-overlay">
            <div className="kk-strike-x-big">✖</div>
          </div>
        )}
      </div>
    </div>
  );
}
