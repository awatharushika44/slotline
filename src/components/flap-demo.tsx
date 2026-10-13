"use client";

import { useState } from "react";
import { Flap } from "./flap";

export function FlapDemo() {
  const [free, setFree] = useState(true);
  return (
    <div className="board" style={{ maxWidth: "28rem" }}>
      <div className="board-row" style={{ gridTemplateColumns: "1fr auto" }}>
        <span>Boardroom A</span>
        <span className={`board-status ${free ? "board-status--free" : "board-status--busy"}`}>
          <Flap value={free ? "● Free" : "■ Busy"} />
        </span>
      </div>
      <button className="btn btn--ghost" style={{ color: "var(--on-ink)", borderColor: "rgba(255,255,255,.4)", marginBlock: "var(--space-3)" }} onClick={() => setFree((f) => !f)}>
        Toggle status
      </button>
    </div>
  );
}