// src/store.js
// Lightweight store (no external deps) that mirrors the previous zustand API.
// Exports: useGame (React hook), getState, setState, updateState

import { useSyncExternalStore, useState, useEffect } from "react";

const STORAGE_KEY = "kk-game-v1";
const CHANNEL_NAME = "kk-game-bc";

// --- tiny event hub ----------------------------------------------------------
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- persistence + cross-tab sync -------------------------------------------
const bc = (() => {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
})();

if (bc) {
  bc.onmessage = (e) => {
    if (e?.data?.type === "kk:set") {
      _state = e.data.payload;
      save();
      notify();
    } else if (e?.data?.type === "kk:update") {
      _state = { ..._state, ...e.data.payload };
      save();
      notify();
    }
  };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// --- default state -----------------------------------------------------------
const defaultState = {
  title: "K'mmunity Klash",
  font: "Bangers",
  roundMultiplier: 1,
  teamA: { score: 0, strikes: 0 },
  teamB: { score: 0, strikes: 0 },
  bank: 0,
  round: null,         // { question, answers: [{text, points, revealed}], id }
  buzz: null,          // "A" | "B" | null
  firstBuzz: null,     // "A" | "B" | null
};

let _state = Object.assign({}, defaultState, load() || {});

// --- state ops ---------------------------------------------------------------
export function getState() {
  return _state;
}

export function setState(next) {
  _state = next;
  save();
  if (bc) bc.postMessage({ type: "kk:set", payload: _state });
  notify();
}

export function updateState(patch) {
  _state = { ..._state, ...patch };
  save();
  if (bc) bc.postMessage({ type: "kk:update", payload: patch });
  notify();
}

// Convenience helpers used by the app (keep names stable if you used them)
export const actions = {
  resetAll() {
    setState({ ...defaultState, title: _state.title, font: _state.font });
  },
  setTitleFont({ title, font }) {
    updateState({ title, font });
  },
  setRound(round) {
    updateState({ round, bank: 0, buzz: null, firstBuzz: null });
  },
  reveal(index) {
    const round = _state.round ? { ..._state.round } : null;
    if (!round) return;
    round.answers = round.answers.map((a, i) =>
      i === index ? { ...a, revealed: !a.revealed } : a
    );
    const bank = round.answers
      .filter((a) => a.revealed)
      .reduce((s, a) => s + (a.points || 0), 0) * (_state.roundMultiplier || 1);
    updateState({ round, bank });
  },
  strike(team) {
    const key = team === "A" ? "teamA" : "teamB";
    const teamObj = { ..._state[key], strikes: Math.min(3, _state[key].strikes + 1) };
    updateState({ [key]: teamObj });
  },
  clearStrikes() {
    updateState({ teamA: { ..._state.teamA, strikes: 0 }, teamB: { ..._state.teamB, strikes: 0 } });
  },
  award(team) {
    const key = team === "A" ? "teamA" : "teamB";
    const teamObj = { ..._state[key], score: _state[key].score + (_state.bank || 0) };
    updateState({ [key]: teamObj, bank: 0 });
  },
  buzz(team) {
    updateState({
      buzz: team,
      firstBuzz: _state.firstBuzz || team,
    });
  },
  resetBuzz() {
    updateState({ buzz: null });
  },
  setRoundMultiplier(m) {
    updateState({ roundMultiplier: m });
  },
};

// --- React hook (zustand-like usage) -----------------------------------------
export function useGame(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(_state),
    () => selector(_state) // SSR fallback
  );
}
