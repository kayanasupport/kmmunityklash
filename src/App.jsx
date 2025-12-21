// src/App.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Store } from './store';
import './styles.css';

function useStore() {
  const [, force] = useState(0);
  useEffect(() => Store.subscribe(() => force((n) => n + 1)), []);
  return Store.get();
}

function AnswerCard({ a, i }) {
  return (
    <button
      className={`ans ${a.revealed ? 'revealed' : ''}`}
      onClick={() => Store.revealIndex(i)}
      title="Toggle reveal"
    >
      <span className="num">{i + 1}</span>
      <span className="txt">{a.revealed ? a.text : '— — — —'}</span>
      <span className="pts">{a.revealed ? a.points : ''}</span>
    </button>
  );
}

function Board() {
  const s = useStore();
  if (!s.round) {
    return (
      <div className="board wait">
        <div className="title">Load a round…</div>
      </div>
    );
  }
  return (
    <div className="board">
      <div className="title">
        <span className="pill">Round Multiplier: x{s.roundMultiplier}</span>
        <span className="q">{s.round.question}</span>
        <span className="pill">Answers: {s.round.answers.length}</span>
      </div>
      <div className="grid">
        {s.round.answers.map((a, i) => (
          <AnswerCard key={i} a={a} i={i} />
        ))}
      </div>

      <div className={`buzz ${s.buzz ? 'show' : ''}`}>
        {s.buzz ? `BUZZ! First buzz: ${s.buzz === 'teamA' ? 'Team A' : 'Team B'}` : ''}
        {!!s.buzz && (
          <button className="link" onClick={() => Store.resetBuzz()}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

function ScoreBar() {
  const s = useStore();
  return (
    <div className="scores">
      <div className="col">
        <div className="label">Team A</div>
        <div className="big">{s.teamA.score}</div>
        <div className="strikes">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`x ${s.teamA.strikes > i ? 'on' : ''}`}>
              x
            </span>
          ))}
        </div>
      </div>

      <div className="bank">
        <div className="mini">Bank</div>
        <div className="chip">
          {s.bank} <span className="mul">× {s.roundMultiplier}</span>
        </div>
      </div>

      <div className="col">
        <div className="label">Team B</div>
        <div className="big">{s.teamB.score}</div>
        <div className="strikes">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`x ${s.teamB.strikes > i ? 'on' : ''}`}>
              x
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Controls() {
  const s = useStore();
  const [csv, setCsv] = useState(null);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState('');

  // CSV loader (client-side)
  async function loadCSV(file) {
    const txt = await file.text();
    // very small CSV parser for your headers
    const lines = txt.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((ln) => {
      const cols = ln.split(',').map((c) => c.trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = cols[i]));
      return obj;
    });
    // create round options
    const rounds = rows.map((r, idx) => {
      const data = Store.fromRow(r);
      return {
        id: `#${idx + 1} • x${data.multiplier} • ${data.question}`.slice(0, 60),
        data,
      };
    });
    setOptions(rounds);
    if (rounds[0]) {
      setSelected(rounds[0].id);
      Store.setRound(rounds[0].data);
    }
  }

  async function handleLoadSample() {
    const r = await fetch('/kmmunity_klash_sample.csv').then((r) => r.text());
    const file = new File([r], 'sample.csv', { type: 'text/csv' });
    setCsv(file);
    await loadCSV(file);
    alert('Sample round loaded');
  }

  function handleSelectChange(e) {
    const id = e.target.value;
    setSelected(id);
    const found = options.find((o) => o.id === id);
    if (found) {
      Store.setRound(found.data);
    }
  }

  return (
    <div className="panel">
      <div className="row topbar">
        <div className="switch">Host Mode: ON</div>
        <button
          className="btn ghost"
          onClick={() => {
            Store.resetScores();
          }}
        >
          Reset Scores
        </button>
      </div>

      <button
        className="btn primary"
        onClick={() => window.open('/studio', '_blank')}
        title="Open the studio view in a second tab and share that tab in Meet"
      >
        Open Studio View (share this tab)
      </button>

      <label className="lbl">Game Title</label>
      <input
        className="txt"
        value={s.title}
        onChange={(e) => Store.setTitle(e.target.value)}
      />

      <label className="lbl">Title Font</label>
      <select
        className="sel high-contrast"
        value={s.font}
        onChange={(e) => Store.setFont(e.target.value)}
      >
        <option>Bangers (bold comic)</option>
        <option>Anton</option>
        <option>Impact</option>
        <option>Oswald</option>
      </select>

      <div className="sp" />

      <label className="lbl">Or upload a CSV (same headers)</label>
      <input
        className="file"
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files?.[0] && loadCSV(e.target.files[0])}
      />
      <button className="btn" onClick={handleLoadSample}>
        Load Sample Round
      </button>

      <div className="sp" />

      <label className="lbl">Load Selected Round</label>
      <div className="row">
        <button
          className="btn"
          onClick={() => {
            const found = options.find((o) => o.id === selected);
            if (found) Store.setRound(found.data);
          }}
        >
          Load Selected
          <br />
          Round
        </button>
        <select
          className="sel high-contrast grow"
          value={selected}
          onChange={handleSelectChange}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.id}
            </option>
          ))}
        </select>
      </div>

      <div className="bankRow">
        <button className="btn success" onClick={() => Store.awardTo('teamA')}>
          Award to
          <br />
          Team A
        </button>
        <div className="bankChip">
          <div className="mini">Bank</div>
          <div className="big">
            {s.bank} <span className="mul">× {s.roundMultiplier}</span>
          </div>
        </div>
        <button className="btn success" onClick={() => Store.awardTo('teamB')}>
          Award to
          <br />
          Team B
        </button>
      </div>

      <div className="row">
        <button className="btn" onClick={() => Store.addStrike('teamA')}>
          + Strike A
        </button>
        <button className="btn" onClick={() => Store.addStrike('teamB')}>
          + Strike B
        </button>
        <button className="btn ghost" onClick={() => Store.clearStrikes()}>
          Clear
        </button>
      </div>

      <div className="row">
        <button className="btn warn" onClick={() => Store.buzz('teamA')}>
          Buzz
          <br />
          Team A
        </button>
        <button className="btn ghost" onClick={() => Store.resetBuzz()}>
          Reset
        </button>
        <button className="btn warn" onClick={() => Store.buzz('teamB')}>
          Buzz
          <br />
          Team B
        </button>
      </div>

      <div className="keys">
        <div>Keyboard (host):</div>
        <div>1–8 = reveal/hide answer</div>
        <div>R = reset buzz</div>
        <div>S = +strike (A), D = +strike (B)</div>
        <div>W = award A, E = award B</div>
      </div>
    </div>
  );
}

export default function App() {
  // Keyboard shortcuts (host)
  const s = useStore();
  const ready = !!s.round;

  useEffect(() => {
    function onKey(e) {
      if (!ready) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '8') {
        const idx = Number(k) - 1;
        Store.revealIndex(idx);
      } else if (k === 'r') {
        Store.resetBuzz();
      } else if (k === 's') {
        Store.addStrike('teamA');
      } else if (k === 'd') {
        Store.addStrike('teamB');
      } else if (k === 'w') {
        Store.awardTo('teamA');
      } else if (k === 'e') {
        Store.awardTo('teamB');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready]);

  return (
    <div className={`app font-${s.font?.toLowerCase().split(' ')[0] || 'bangers'}`}>
      <header className="hdr">
        <div className="logo">KK</div>
        <div className="brand">{s.title}</div>
      </header>

      <div className="layout">
        <div className="left">
          <Board />
          <ScoreBar />
        </div>
        <div className="right">
          <Controls />
        </div>
      </div>
    </div>
  );
}
