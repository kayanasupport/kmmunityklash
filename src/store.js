// Lightweight global store with BroadcastChannel + localStorage
const KEY = "kk-game-v2";
const BC  = new BroadcastChannel("kk-game-v2");

const initial = () => ({
  title: "K'mmunity Klash",
  font: "bangers",
  roundMultiplier: 1,
  question: "",
  answers: [], // [{text, points, shown}]
  bank: 0,
  teams: {
    A: { name: "Team A", score: 0, strikes: 0, buzz: false },
    B: { name: "Team B", score: 0, strikes: 0, buzz: false }
  }
});

const listeners = new Set();

let state = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : initial();
  } catch {
    return initial();
  }
})();

const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const notify = () => listeners.forEach((l) => l(state));

const broadcast = () => {
  BC.postMessage({ type: "state", payload: state });
};

export const subscribe = (fn) => {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
};

const set = (updater) => {
  state = typeof updater === "function" ? updater(state) : updater;
  save();
  notify();
  broadcast();
};

// receive from other tabs (Studio/Host)
BC.onmessage = (ev) => {
  if (!ev?.data) return;
  if (ev.data.type === "state") {
    state = ev.data.payload;
    save();
    notify();
  }
};

// public actions
export const actions = {
  resetAll() {
    set(initial());
  },
  setTitle(t) {
    set((s) => ({ ...s, title: t }));
  },
  setFont(f) {
    set((s) => ({ ...s, font: f }));
  },
  setMultiplier(m) {
    set((s) => ({ ...s, roundMultiplier: m || 1, bank: 0 }));
  },
  loadRound(question, answers) {
    // answers: [{text, points}]
    set((s) => ({
      ...s,
      question,
      bank: 0,
      answers: answers.map((a) => ({ ...a, shown: false })),
      teams: {
        A: { ...s.teams.A, buzz: false, strikes: 0 },
        B: { ...s.teams.B, buzz: false, strikes: 0 }
      }
    }));
  },
  reveal(i) {
    set((s) => {
      if (!s.answers[i] || s.answers[i].shown) return s;
      const answers = s.answers.slice();
      answers[i] = { ...answers[i], shown: true };
      const rawSum = answers
        .filter((a) => a.shown)
        .reduce((n, a) => n + (Number(a.points) || 0), 0);
      const bank = rawSum * (Number(s.roundMultiplier) || 1);
      return { ...s, answers, bank };
    });
  },
  hide(i) {
    set((s) => {
      if (!s.answers[i] || !s.answers[i].shown) return s;
      const answers = s.answers.slice();
      answers[i] = { ...answers[i], shown: false };
      const rawSum = answers
        .filter((a) => a.shown)
        .reduce((n, a) => n + (Number(a.points) || 0), 0);
      const bank = rawSum * (Number(s.roundMultiplier) || 1);
      return { ...s, answers, bank };
    });
  },
  award(team) {
    set((s) => {
      const bank = Number(s.bank) || 0;
      if (!bank) return s;
      const t = team === "B" ? "B" : "A";
      return {
        ...s,
        teams: {
          ...s.teams,
          [t]: { ...s.teams[t], score: s.teams[t].score + bank }
        },
        bank: 0
      };
    });
  },
  buzz(team) {
    set((s) => {
      const t = team === "B" ? "B" : "A";
      return {
        ...s,
        teams: {
          ...s.teams,
          [t]: { ...s.teams[t], buzz: true },
          [t === "A" ? "B" : "A"]: { ...s.teams[t === "A" ? "B" : "A"], buzz: false }
        }
      };
    });
  },
  resetBuzz() {
    set((s) => ({
      ...s,
      teams: {
        A: { ...s.teams.A, buzz: false },
        B: { ...s.teams.B, buzz: false }
      }
    }));
  },
  strike(team) {
    set((s) => {
      const t = team === "B" ? "B" : "A";
      const val = Math.min(3, (s.teams[t].strikes || 0) + 1);
      return {
        ...s,
        teams: { ...s.teams, [t]: { ...s.teams[t], strikes: val } }
      };
    });
  },
  clearStrikes() {
    set((s) => ({
      ...s,
      teams: {
        A: { ...s.teams.A, strikes: 0 },
        B: { ...s.teams.B, strikes: 0 }
      }
    }));
  }
};

// helpers for CSV (host upload)
export const parseCsvText = (csv) => {
  // expects header: round,question,a1,p1,a2,p2,...a8,p8
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const rows = lines.slice(1).map((l) => l.split(","));
  return rows.map((cols) => {
    const question = cols[1] || "";
    const pairs = [];
    for (let i = 2; i < cols.length; i += 2) {
      const text = (cols[i] || "").trim();
      const points = Number(cols[i + 1] || 0);
      if (text) pairs.push({ text, points });
    }
    return { question, answers: pairs };
  });
};
