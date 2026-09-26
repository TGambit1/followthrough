"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { NegotiationCard } from "./negotiation-card";
import type { Mission, Event, Action } from "@/lib/engine";
type Data = {
  mission: Mission | null;
  events: Event[];
  storage: string;
  planner: string;
  jev?: string;
  actions: Action[];
  qualified: number;
};
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const stages = [
  "Discover",
  "Collect quotes",
  "Verify",
  "Negotiate",
  "Your decision",
];
export default function Home() {
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [auto, setAuto] = useState(false),
    [budget, setBudget] = useState(32000),
    [miles, setMiles] = useState(40000),
    [target, setTarget] = useState(28000),
    [rounds, setRounds] = useState(4),
    [tab, setTab] = useState<"journey" | "memory">("journey");
  const epoch = useRef(0);
  const refresh = useCallback(async () => {
    const started = epoch.current;
    try {
      const r = await fetch("/api/mission");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (started === epoch.current)
        setData((previous) =>
          previous?.mission?.id === d.mission?.id &&
          (previous?.mission?.version ?? -1) > (d.mission?.version ?? -1)
            ? previous
            : d,
        );
    } catch (e) {
      if (started === epoch.current)
        setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []);
  useEffect(() => {
    void refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);
  const command = useCallback(
    async (name: string, extra: Record<string, number> = {}) => {
      epoch.current++;
      setBusy(true);
      setError("");
      try {
        const r = await fetch("/api/mission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command: name,
            version: data?.mission?.version,
            ...extra,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        epoch.current++;
        setData(d);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
        setAuto(false);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [data?.mission?.version, refresh],
  );
  useEffect(() => {
    if (!auto || busy || data?.mission?.status !== "active") return;
    const t = setTimeout(() => command("step"), 1800);
    return () => clearTimeout(t);
  }, [auto, busy, data?.mission?.status, command]);
  useEffect(() => {
    if (data?.mission) {
      setBudget(data.mission.budget);
      setMiles(data.mission.maxMiles);
      setTarget(data.mission.policy?.targetTotal ?? 28000);
      setRounds(data.mission.policy?.maxRounds ?? 4);
    }
  }, [
    data?.mission?.budget,
    data?.mission?.maxMiles,
    data?.mission?.policy?.targetTotal,
    data?.mission?.policy?.maxRounds,
  ]);
  const m = data?.mission;
  const selected = m?.offers.find((o) => o.id === m.selected);
  const phase = !m?.offers.length
    ? 0
    : m.offers.some((o) => !o.quoted)
      ? 1
      : m.offers.some((o) => !o.verified && o.miles <= m.maxMiles)
        ? 2
        : m.status === "active" || m.status === "paused"
          ? 3
          : 4;
  return (
    <div className="shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brandmark">↗</span> followthrough
          <span className="brand-dot">.</span>
        </a>
        <div className="side-caption">YOUR AMBITION, IN MOTION</div>
        <nav>
          <a className="api-nav" href="/api-guide">
            ↗ Negotiation API
          </a>
          <button className="nav-active" onClick={() => setTab("journey")}>
            <span>◉</span> Purchase mission <span className="nav-count">1</span>
          </button>
          <button onClick={() => setTab("memory")}>
            <span>▤</span> Durable memory
          </button>
        </nav>
        <div className="side-card">
          <span className="eyebrow">BUILT TO KEEP GOING</span>
          <h3>
            Life takes longer
            <br />
            than a context window.
          </h3>
          <p>Your goal, evidence, and next step travel together.</p>
          <div className="orbit">
            <div>↗</div>
          </div>
        </div>
        <div className="side-bottom">
          <span className="avatar">Y</span>
          <div>
            Your workspace<small>Hackathon prototype</small>
          </div>
          <span className="tiny-dot" />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Workspace <b>/</b> Car purchase
          </span>
          <div className="top-status">
            <span className="tiny-dot" />
            {data?.storage || "Connecting…"}
          </div>
        </header>
        <div className="content">
          <div className="title-row">
            <div>
              <span className="eyebrow">YOUR PRICE. YOUR TERMS.</span>
              <h1>
                Your next car.
                <br />
                <span>Negotiated. Not settled for.</span>
              </h1>
              <p className="subtitle">
                Firm counters. Persistent follow-ups. A ceiling we keep to
                ourselves.
              </p>
            </div>
            <div className="mission-tag">
              <span className="tiny-dot" />
              {m ? `DAY ${m.day} OF THE JOURNEY` : "READY WHEN YOU ARE"}
              <small>Accelerated simulation</small>
            </div>
          </div>
          <div className="disclosure">
            <span>◈</span>
            <div>
              <strong>Demo environment</strong> · Fictional listings and
              simulated dealer responses. {data?.planner || "Loading planner…"}.{" "}
              {data?.jev || "Rule price check"}. No real messages or purchases.
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  void refresh();
                }}
              >
                Retry connection
              </button>
            </div>
          )}
          {!m ? (
            <section className="welcome">
              <div className="welcome-symbol">↗</div>
              <span className="eyebrow">START WITH THE OUTCOME</span>
              <h2>
                “Find me a reliable car.
                <br />
                Keep the whole purchase under $32,000.”
              </h2>
              <p>
                Followthrough collects comparable offers, follows up on fees,
                checks the evidence, and brings the decision back to you.
              </p>
              <button
                className="primary"
                disabled={busy || !data}
                onClick={() => command("create")}
              >
                {busy ? "Creating your mission…" : "Start purchase mission"}{" "}
                <span>↗</span>
              </button>
              <div className="welcome-details">
                Clean title required <span>·</span> Under 40,000 miles{" "}
                <span>·</span> You approve the decision
              </div>
            </section>
          ) : (
            <>
              <section className="mission-card">
                <div className="mission-heading">
                  <div className="car-icon">↗</div>
                  <div>
                    <span className="eyebrow">
                      ACTIVE PURCHASE BRIEF · V{m.version}
                    </span>
                    <h2>A reliable daily driver</h2>
                  </div>
                  <span className={`status ${m.status}`}>
                    {m.presentation && !m.presentation.present
                      ? "Price withheld"
                      : m.status === "approval"
                        ? "Needs your review"
                        : m.status === "approved"
                          ? "Packet approved"
                          : m.status}
                  </span>
                </div>
                <div className="brief-grid">
                  <div>
                    <span>PRIVATE CEILING</span>
                    <strong>{money(m.budget)}</strong>
                  </div>
                  <div>
                    <span>MILEAGE LIMIT</span>
                    <strong>
                      {m.maxMiles.toLocaleString()} <small>mi</small>
                    </strong>
                  </div>
                  <div>
                    <span>NON-NEGOTIABLE</span>
                    <strong>
                      Clean title <span className="check">✓</span>
                    </strong>
                  </div>
                </div>
                <div className="stage-track">
                  {stages.map((s, i) => (
                    <div
                      key={s}
                      className={
                        i < phase ? "done" : i === phase ? "current" : ""
                      }
                    >
                      <span>
                        {i < phase ? "✓" : String(i + 1).padStart(2, "0")}
                      </span>
                      {s}
                    </div>
                  ))}
                </div>
              </section>
              <div className="metric-grid">
                <div>
                  <span>COMPLETED ACTIONS</span>
                  <strong>
                    {m.steps}
                    <small> saved to memory</small>
                  </strong>
                </div>
                <div>
                  <span>NEGOTIATED REDUCTION</span>
                  <strong>
                    {money(m.learning.totalReduction)}
                    <small> across all offers</small>
                  </strong>
                </div>
                <div>
                  <span>QUALIFIED OFFERS</span>
                  <strong>
                    {data?.qualified}
                    <small> meet current brief</small>
                  </strong>
                </div>
                <div>
                  <span>CHECKPOINT</span>
                  <strong>
                    v{m.version}
                    <small> persisted</small>
                  </strong>
                </div>
              </div>
              <div className="work-grid">
                <section className="work-main">
                  <div className="section-top">
                    <div className="tabs">
                      <button
                        className={tab === "journey" ? "selected" : ""}
                        onClick={() => setTab("journey")}
                      >
                        The journey
                      </button>
                      <button
                        className={tab === "memory" ? "selected" : ""}
                        onClick={() => setTab("memory")}
                      >
                        Working memory
                      </button>
                    </div>
                    <span className="small-label">
                      {m.offers.length} offers tracked
                    </span>
                  </div>
                  {tab === "journey" ? (
                    <>
                      <div className="offer-list">
                        {m.offers.map((o) => (
                          <article
                            key={o.id}
                            className={`offer ${o.id === m.selected ? "chosen" : ""}`}
                          >
                            <div className="offer-top">
                              <div className="vehicle-glyph">⌁</div>
                              <div>
                                <span className="dealer">{o.dealer}</span>
                                <h3>{o.car}</h3>
                                <p>
                                  {o.miles.toLocaleString()} miles · Synthetic
                                  listing
                                </p>
                              </div>
                              <div className="price">
                                <strong>
                                  {money(o.total ?? o.advertised)}
                                </strong>
                                <small>
                                  {o.total
                                    ? "all-in quoted"
                                    : "advertised only"}
                                </small>
                              </div>
                            </div>
                            <div className="offer-bottom">
                              <span
                                className={
                                  o.verified && !o.cleanTitle
                                    ? "bad"
                                    : "offer-badge"
                                }
                              >
                                {o.verified
                                  ? o.cleanTitle
                                    ? "✓ Clean title verified"
                                    : "✕ Branded title — excluded"
                                  : o.negotiated
                                    ? "Revised quote received"
                                    : o.quoted
                                      ? "Written quote received"
                                      : "Awaiting itemized quote"}
                              </span>
                              {o.total !== undefined && o.total > m.budget && (
                                <span className="bad">Over current budget</span>
                              )}
                              {o.id === m.selected && (
                                <span className="winner">Recommended</span>
                              )}
                            </div>
                            <NegotiationCard
                              offer={o}
                              policy={m.policy}
                              day={m.day}
                            />
                            <details>
                              <summary>View evidence</summary>
                              <p>{o.evidence}</p>
                            </details>
                          </article>
                        ))}
                        {!m.offers.length && (
                          <div className="empty">
                            Your shortlist will appear after the agent discovers
                            matching cars.
                          </div>
                        )}
                      </div>
                      <div className="section-title">
                        <h3>Every step, remembered.</h3>
                        <span>Latest 30 events</span>
                      </div>
                      <div className="timeline">
                        {data?.events.map((e) => (
                          <article key={e.id}>
                            <div
                              className={`event-dot ${e.kind === "brief" ? "orange" : ""}`}
                            />
                            <div className="event-meta">
                              DAY {e.day} <span>· CHECKPOINT {e.version}</span>
                            </div>
                            <h4>{e.title}</h4>
                            <p>{e.detail}</p>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="memory">
                      <span className="eyebrow">
                        BOUNDED CONTEXT · DURABLE HISTORY
                      </span>
                      <h3>The agent carries the essentials.</h3>
                      <p>
                        Each decision receives the latest purchase brief, three
                        offer records, and aggregate feedback. The full event
                        history stays in storage.
                      </p>
                      <dl>
                        <dt>Current goal</dt>
                        <dd>
                          Clean-title car, at most {money(m.budget)} all-in, at
                          most {m.maxMiles.toLocaleString()} miles.
                        </dd>
                        <dt>Learned negotiation policy</dt>
                        <dd>
                          {m.learning.itemizedFirst
                            ? "Ask for itemized fees and removal of optional add-ons. Triggered by a measured advertised-to-total price gap."
                            : "Collect written totals before comparing offers."}
                        </dd>
                        <dt>Negotiation target</dt>
                        <dd>
                          {money(m.policy?.targetTotal ?? 28000)} · up to{" "}
                          {m.policy?.maxRounds ?? 4} rounds per dealer ·
                          deadline day {m.policy?.deadlineDay ?? 14}. Counters
                          do not reveal the ceiling.
                        </dd>
                        <dt>Hard feedback</dt>
                        <dd>
                          {m.learning.observations} negotiation outcomes;{" "}
                          {money(m.learning.totalReduction)} aggregate reduction
                          across quotes.
                        </dd>
                        <dt>Last decision</dt>
                        <dd>{m.lastDecision}</dd>
                        <dt>Model tokens reported</dt>
                        <dd>
                          {m.tokens.toLocaleString()} · {data?.planner}
                        </dd>
                        <dt>Scope of the evidence</dt>
                        <dd>
                          Small synthetic scenario. No billion-token or real
                          multiday run is claimed.
                        </dd>
                      </dl>
                    </div>
                  )}
                </section>
                <aside className="right-column">
                  <section className="next-card">
                    <span className="eyebrow">WHAT HAPPENS NEXT</span>
                    <div className="spark">✳</div>
                    <h3>
                      {m.presentation && !m.presentation.present
                        ? "This price stays off your desk."
                        : m.status === "approval"
                          ? "A decision worth your attention."
                          : m.status === "approved"
                            ? "Ready for the real-world handoff."
                            : m.status === "paused"
                              ? "Your progress is safe."
                              : m.status === "blocked"
                                ? "Your brief comes first."
                                : "Moving your purchase forward."}
                    </h3>
                    <p>
                      {m.presentation && !m.presentation.present
                        ? `${m.presentation.subject} at ${money(m.presentation.amount)} was not put up for approval.${
                            m.presentation.source === "jev" &&
                            m.presentation.probability !== null
                              ? ` Jev’s yes-probability was ${Math.round(m.presentation.probability * 100)}%, below the ${Math.round(m.presentation.threshold * 100)}% line.`
                              : ""
                          }`
                        : selected
                          ? `${selected.car} at ${money(selected.total!)} all-in. ${money(m.budget - selected.total!)} below your current budget.${
                              m.presentation?.source === "jev" &&
                              m.presentation.probability !== null
                                ? ` Jev’s yes-probability was ${Math.round(m.presentation.probability * 100)}%, so this price was presented for your decision.`
                                : ""
                            }`
                          : m.status === "blocked"
                            ? "No verified offer fits. Update your constraints to continue, or keep your current limits."
                            : m.status === "paused"
                              ? "Resume from the saved checkpoint, even after restarting the server."
                              : data?.actions[0]?.label ||
                                "Review your purchase packet."}
                    </p>
                    {m.status === "active" && (
                      <>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => command("step")}
                        >
                          {busy ? "Working…" : "Run next step"} <span>→</span>
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setAuto(!auto)}
                        >
                          {auto ? "Stop autoplay" : "Autoplay demo"}
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            setAuto(false);
                            void command("pause");
                          }}
                        >
                          Ⅱ Pause at checkpoint
                        </button>
                      </>
                    )}
                    {m.status === "paused" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => command("resume")}
                      >
                        Resume mission ↗
                      </button>
                    )}
                    {m.status === "approval" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => command("approve")}
                      >
                        Approve demo packet ✓
                      </button>
                    )}
                    {m.status === "approved" && (
                      <p className="approved-note">
                        ✓ Your review is recorded. No purchase or payment has
                        been executed.
                      </p>
                    )}
                    <div className="next-foot">
                      {busy
                        ? "Committing the next checkpoint…"
                        : `Last saved ${new Date(m.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  </section>
                  <section className="constraints">
                    <span className="eyebrow">
                      PLANS CHANGE. MEMORY FOLLOWS.
                    </span>
                    <h3>Update the brief</h3>
                    <label>
                      Private ceiling ($)
                      <input
                        type="number"
                        min="10000"
                        max="100000"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Target price ($)
                      <input
                        type="number"
                        min="5000"
                        max={budget}
                        value={target}
                        onChange={(e) => setTarget(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Counteroffer rounds per dealer
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={rounds}
                        onChange={(e) => setRounds(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Maximum mileage
                      <input
                        type="number"
                        min="1000"
                        max="200000"
                        value={miles}
                        onChange={(e) => setMiles(Number(e.target.value))}
                      />
                    </label>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => {
                        setAuto(false);
                        void command("brief", {
                          budget,
                          maxMiles: miles,
                          targetTotal: target,
                          maxRounds: rounds,
                        });
                      }}
                    >
                      Save & re-evaluate
                    </button>
                    <p>
                      Ceiling stays private. Target guides counters. Changes
                      cancel pending simulated counters and invalidate earlier
                      approval.
                    </p>
                  </section>
                  <section className="proof">
                    <span>◈</span>
                    <div>
                      <strong>Built for the long run</strong>
                      <p>
                        Versioned checkpoints. Persistent evidence. A separate
                        worker can run without this page open.
                      </p>
                    </div>
                  </section>
                </aside>
              </div>
              <footer>
                <span>FOLLOWTHROUGH · LONG HORIZON ENGINEERING</span>
                <button
                  disabled={busy}
                  onClick={() => {
                    setAuto(false);
                    void command("create");
                  }}
                >
                  Start a new demo ↗
                </button>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
