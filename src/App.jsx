import { useEffect, useMemo, useState } from "react";
import { useGame } from "./store";
import { loadFromSheet } from "./utils/sheet";
import cx from "clsx";

function Strikes({ count=0 }){
  return (
    <div className="strikes">
      {[0,1,2].map(i => (
        <div key={i} className="x" style={{opacity: i < count ? 1 : .25}}>X</div>
      ))}
    </div>
  );
}

function ScoreBar(){
  const { teamA, teamB, updateTeam } = useGame();
  return (
    <div className="panel scorebar">
      <div className="team">
        <h3>Team A</h3>
        <input value={teamA.name} onChange={e=>updateTeam("teamA",{name:e.target.value})}/>
        <div className="row">
          <div className="big">{teamA.score}</div>
          <Strikes count={teamA.strikes}/>
        </div>
      </div>

      <div className="badge">Round scores add to the winner</div>

      <div className="team">
        <h3>Team B</h3>
        <input value={teamB.name} onChange={e=>updateTeam("teamB",{name:e.target.value})}/>
        <div className="row">
          <Strikes count={teamB.strikes}/>
          <div className="big">{teamB.score}</div>
        </div>
      </div>
    </div>
  );
}

function Board(){
  const { round, reveal, hide } = useGame();
  return (
    <div className="panel">
      <div className="row">
        <div className="badge">Round Multiplier: x{round.multiplier || 1}</div>
        <div style={{opacity:.7}}>Answers: {round.answers.length}</div>
      </div>
      <h2 style={{margin:"10px 0 8px 0"}}>{round.question || "Load a round…"}</h2>
      <div className="board">
        {round.answers.map((a,i)=>(
          <div
            key={i}
            className={cx("card", a.revealed && "revealed")}
            onClick={()=> a.revealed ? hide(i) : reveal(i)}
            title="Click to reveal/hide"
          >
            <div className="answer">{a.revealed ? a.text : "— — —"}</div>
            <div className="points">{a.revealed ? a.points : "?"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Controls(){
  const g = useGame();
  const [rounds, setRounds] = useState([]);
  const [idx, setIdx] = useState(0);
  const [title, setTitle] = useState(g.title);
  const [font, setFont] = useState(g.titleFont);

  useEffect(()=>{
    if(!g.sheetId) return;
    loadFromSheet(g.sheetId).then(setRounds).catch(()=>setRounds([]));
  },[g.sheetId]);

  useEffect(()=>{ document.documentElement.style.setProperty("--title-font", `"${g.titleFont}", var(--ui-font)`); },[g.titleFont]);

  const current = useMemo(()=> rounds[idx] ?? null, [rounds, idx]);

  return (
    <div className="panel controls">
      <div className="row">
        <button className="btn" onClick={()=>g.toggleHost()}>
          {g.hostMode ? "Host Mode: ON" : "Host Mode: OFF"}
        </button>
        <button className="btn ghost" onClick={()=>g.resetScores()}>Reset Scores</button>
      </div>

      <label>Game Title</label>
      <input value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>g.setTitle(title)} placeholder="K'mmunity Klash"/>

      <label>Title Font</label>
      <select value={font} onChange={(e)=>{ setFont(e.target.value); g.setTitleFont(e.target.value); }}>
        <option value="Bangers">Bangers (bold comic)</option>
        <option value="Montserrat">Montserrat (clean)</option>
      </select>

      <label>Google Sheet ID (published as CSV)</label>
      <input defaultValue={g.sheetId} onBlur={(e)=> location.href=`/?sheet=${e.target.value}` } placeholder="1AbC...SheetId" />

      <div className="gap"></div>
      <div className="row">
        <button className="btn" onClick={()=>{
          if(current) g.setRound(current);
        }}>Load Selected Round</button>
        <select value={idx} onChange={e=>setIdx(Number(e.target.value))}>
          {rounds.map((r,i)=>(<option key={i} value={i}>{`#${i+1} • x${r.multiplier} • ${r.question.slice(0,36)}…`}</option>))}
        </select>
      </div>

      <div className="gap"></div>
      <div className="row">
        <button className="btn" onClick={()=>g.awardRound("A")}>Award to Team A</button>
        <div className="badge">Bank: {g.roundBank} × {g.round.multiplier||1} = <b>{g.roundBank*(g.round.multiplier||1)}</b></div>
        <button className="btn" onClick={()=>g.awardRound("B")}>Award to Team B</button>
      </div>

      <label>Strikes</label>
      <div className="row">
        <button className="btn ghost" onClick={()=>g.addStrike("A")}>+ Strike A</button>
        <button className="btn ghost" onClick={()=>g.addStrike("B")}>+ Strike B</button>
        <button className="btn ghost" onClick={()=>g.clearStrikes()}>Clear</button>
      </div>

      <label>Buzzer</label>
      <div className="row">
        <button className="btn" onClick={()=>g.buzz("A")}>Buzz Team A</button>
        <button className="btn" onClick={()=>g.resetBuzz()}>Reset</button>
        <button className="btn" onClick={()=>g.buzz("B")}>Buzz Team B</button>
      </div>

      <label>Keyboard (host):</label>
      <div className="stack">
        <span className="badge">1-8 = reveal/hide answer</span>
        <span className="badge">A/B = buzz team</span>
        <span className="badge">R = reset buzz</span>
        <span className="badge">S = +strike (A), D = +strike (B)</span>
        <span className="badge">W = award A, E = award B</span>
      </div>
    </div>
  );
}

function Buzzer(){
  const { buzzingTeam, resetBuzz } = useGame();
  if(!buzzingTeam) return null;
  return (
    <div className="panel" style={{background:"#1a0d0f", borderColor:"#742b37"}}>
      <div className="row">
        <h2 style={{margin:0}}>BUZZ!</h2>
        <button className="btn" onClick={resetBuzz}>Reset</button>
      </div>
      <p style={{marginTop:8}}>First buzz: <b>Team {buzzingTeam}</b></p>
    </div>
  );
}

export default function App(){
  const g = useGame();
  // Support ?sheet= query override without rebuild
  useEffect(()=>{
    const u = new URL(location.href);
    const qs = u.searchParams.get("sheet");
    if(qs){ localStorage.setItem("sheetId", qs); }
    const fallback = localStorage.getItem("sheetId");
    if(!g.sheetId && fallback){ // reload to apply
      location.replace(`/?sheet=${fallback}`);
    }
  },[]);

  useEffect(()=>{
    function onKey(e){
      const n = Number(e.key);
      if(n>=1 && n<=8) return g.reveal(n-1);
      if(e.key==='a' || e.key==='A') return g.buzz("A");
      if(e.key==='b' || e.key==='B') return g.buzz("B");
      if(e.key==='r' || e.key==='R') return g.resetBuzz();
      if(e.key==='s' || e.key==='S') return g.addStrike("A");
      if(e.key==='d' || e.key==='D') return g.addStrike("B");
      if(e.key==='w' || e.key==='W') return g.awardRound("A");
      if(e.key==='e' || e.key==='E') return g.awardRound("B");
    }
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[]);

  // Dynamic title & font
  useEffect(()=>{
    document.title = g.title;
    document.documentElement.style.setProperty("--title-font", `"${g.titleFont}", var(--ui-font)`);
  },[g.title, g.titleFont]);

  // Milestone frame colors (100/200/300/500+)
  const total = g.teamA.score + g.teamB.score; // for single-tab demo; in real show use player balance
  let frame = "#2b3d7a";
  if (total >= 500) frame = "conic-gradient(from 0deg, #a78bfa, #22d3ee, #f472b6, #a78bfa)";
  else if (total >= 300) frame = "#d6b660";
  else if (total >= 200) frame = "#c0c0c0";
  else if (total >= 100) frame = "#cd7f32";

  return (
    <div className="wrapper">
      <div style={{gridColumn:"1 / -1"}} className="header">
        <div className="logoTitle">
          <div className="logoBadge">KK</div>
          <div className="title" style={{borderBottom:`6px solid`, borderImage: typeof frame==="string" && frame.includes("conic") ? frame+" 1" : "linear-gradient(90deg, var(--accent), var(--accent-2)) 1"}}>
            {g.title}
          </div>
        </div>
        <div className="stack">
          <span className="badge">{g.hostMode ? "Host Mode" : "Audience"}</span>
          <span className="badge">Total: {g.teamA.score + g.teamB.score}</span>
        </div>
      </div>

      <div>
        <Board />
        <Buzzer />
        <div className="footer">Tip: share this browser tab in Google Meet.</div>
      </div>

      <div>
        <ScoreBar />
        <Controls />
      </div>
    </div>
  );
}
