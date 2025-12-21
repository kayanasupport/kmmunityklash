// src/Studio.jsx
import React, { useEffect, useRef } from 'react';
import { useGame } from './store';           // <- your Zustand store
import { SFX } from './sfx';
import './styles.css';

export default function Studio() {
  // Select only what we need to render + compare
  const title      = useGame(s => s.round?.question || 'Waiting for host to load a round...');
  const answers    = useGame(s => s.round?.answers || []); // [{text, points, revealed}, ...]
  const strikesA   = useGame(s => s.strikes?.A || 0);
  const strikesB   = useGame(s => s.strikes?.B || 0);
  const buzzTeam   = useGame(s => s.buzzTeam || null);
  const scoreA     = useGame(s => s.scores?.A || 0);
  const scoreB     = useGame(s => s.scores?.B || 0);
  const bank       = useGame(s => s.bank || 0);
  const multiplier = useGame(s => s.multiplier || 1);

  // ---------- SFX: detect changes ----------
  const prev = useRef({ strikesA, strikesB, buzzTeam, revealedCount: 0, scoreA, scoreB, bank });
  useEffect(() => {
    // reveal detection = count of revealed answers
    const revealedCount = (answers || []).filter(a => a?.revealed).length;

    const p = prev.current;

    // Buzz (transition into A/B)
    if (buzzTeam && buzzTeam !== p.buzzTeam) SFX.play('buzz');

    // Strike added (A or B)
    if (strikesA > p.strikesA || strikesB > p.strikesB) SFX.play('strike');

    // New reveal(s)
    if (revealedCount > p.revealedCount) SFX.play('reveal');

    // Award (scores go up & bank goes down)
    const scoreUp = (scoreA > p.scoreA) || (scoreB > p.scoreB);
    const bankDown = bank < p.bank;
    if (scoreUp && bankDown) SFX.play('award');

    prev.current = { strikesA, strikesB, buzzTeam, revealedCount, scoreA, scoreB, bank };
  }, [answers, buzzTeam, strikesA, strikesB, scoreA, scoreB, bank]);

  // Keyboard safety: allow quick mute/unmute in Studio (M key)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'm') {
        SFX.setMuted(!SFX.isMuted());
      }
      if (e.key === '-' || e.key === '_') SFX.setVolume(Math.max(0, SFX.getVolume() - 0.1));
      if (e.key === '=' || e.key === '+') SFX.setVolume(Math.min(1, SFX.getVolume() + 0.1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="studio-root">
      <div className="studio-stage">
        <div className="studio-header">
          <div className="studio-logo">K’MMUNITY KLASH</div>
          <div className="studio-round-pill">Round ×{multiplier}</div>
        </div>

        <div className="studio-question">
          {title}
        </div>

        <div className="studio-answers">
          {(answers || []).map((a, i) => (
            <div
              key={i}
              className={`studio-answer ${a?.revealed ? 'is-revealed' : ''}`}
            >
              <div className="studio-answer-index">{i + 1}</div>
              <div className="studio-answer-text">{a?.revealed ? (a?.text || '') : ''}</div>
              <div className="studio-answer-points">{a?.revealed ? (a?.points || 0) : ''}</div>
            </div>
          ))}
        </div>

        <div className="studio-footer">
          <div className="studio-team">
            <div className="studio-team-name">Team A</div>
            <div className="studio-team-score">{scoreA}</div>
            <div className="studio-strikes">
              {[...Array(3)].map((_, k) => (
                <span key={k} className={`x ${k < strikesA ? 'on' : ''}`}>x</span>
              ))}
            </div>
          </div>

          <div className="studio-bank">
            <div className="studio-bank-label">Bank</div>
            <div className="studio-bank-value">{bank}</div>
          </div>

          <div className="studio-team">
            <div className="studio-team-name">Team B</div>
            <div className="studio-team-score">{scoreB}</div>
            <div className="studio-strikes">
              {[...Array(3)].map((_, k) => (
                <span key={k} className={`x ${k < strikesB ? 'on' : ''}`}>x</span>
              ))}
            </div>
          </div>
        </div>

        {buzzTeam && (
          <div className={`studio-buzz-banner team-${buzzTeam}`}>
            BUZZ! Team {buzzTeam}
          </div>
        )}
      </div>
    </div>
  );
}
