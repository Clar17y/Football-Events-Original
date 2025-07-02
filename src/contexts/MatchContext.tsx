// src/contexts/MatchContext.tsx
import React, { createContext, useState, useEffect } from 'react';

export interface MatchClock {
  running: boolean;
  startTs: number | null;              // wall-clock ms when the period started
  offsetMs: number;                    // paused time so far
}

export const MatchContext = createContext<{
  clock: MatchClock;
  start: () => void;
  pause: () => void;
  reset: () => void;
}>({} as any);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clock, setClock] = useState<MatchClock>({ running: false, startTs: null, offsetMs: 0 });

  const start = () =>
    setClock(c => c.running ? c : { running: true, startTs: Date.now(), offsetMs: c.offsetMs });

  const pause = () =>
    setClock(c => !c.running ? c : { running: false, startTs: null, offsetMs: c.offsetMs + Date.now() - (c.startTs ?? 0) });

  const reset = () => setClock({ running: false, startTs: null, offsetMs: 0 });

  return (
    <MatchContext.Provider value={{ clock, start, pause, reset }}>
      {children}
    </MatchContext.Provider>
  );
};
