"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { NegotiationCard } from "./negotiation-card";
import type { Mission, Event, Action } from "@/lib/engine";
type Data = {
  mission: Mission | null;
  events: Event[];
  storage: string;
  planner: string;
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
  "Scout the lot",
  "Get it in writing",
  "Check the title",
  "The sit-down",
  "Your call",
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
          <span className="brandmark">TS</span> Saprano
        </a>
        <div className="side-caption">Tony’s motor sit-down</div>
        <nav>
          <a className="api-nav" href="/api-guide">
            House rules
          </a>
          <button
            className={tab === "journey" ? "nav-active" : ""}
            onClick={() => setTab("journey")}
          >
            <span>◆</span> The sit-down <span className="nav-count">1</span>
          </button>
          <button
            className={tab === "memory" ? "nav-active" : ""}
            onClick={() => setTab("memory")}
          >
            <span>▣</span> The books
          </button>
        </nav>
        <div className="side-card">
          <span className="eyebrow">FROM THE BACK ROOM</span>
          <h3>A boss doesn’t settle.</h3>
          <p>You name the number. We stay at the table until the price respects it.</p>
          <div className="orbit">
            <div>TS</div>
          </div>
        </div>
        <div className="side-bottom">
          <span className="avatar">TS</span>
          <div>
            Tony’s office<small>North Jersey</small>
          </div>
          <span className="tiny-dot" />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Saprano <b>/</b> The lot
          </span>
          <div className="top-status">
            <span className="tiny-dot" />
            {data?.storage || "Connecting…"}
          </div>
        </header>
        <div className="content">
          <div className="title-row">
            <div>
              <span className="eyebrow">THE NUMBER STAYS IN THE ROOM</span>
              <h1>
                Your next car.
                <span>Negotiated like a sit-down.</span>
              </h1>
              <p className="subtitle">
                Firm counters. We follow up. The ceiling never leaves this
                office.
              </p>
            </div>
            <div className="mission-tag">
              <span className="tiny-dot" />
              {m ? `DAY ${m.day} AT THE TABLE` : "THE TABLE IS SET"}
              <small>Accelerated simulation</small>
            </div>
          </div>
          <div className="disclosure">
            <span>◈</span>
            <div>
              <strong>Back-room demo</strong> · Fictional listings and
              simulated dealer responses. {data?.planner || "Loading planner…"}.
              No real messages or purchases.
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
              <div className="welcome-symbol">TS</div>
              <span className="eyebrow">TONY NAMES THE TERMS</span>
              <h2>
                “Find me a clean car.
                <br />
                Keep the whole thing under $32,000.”
              </h2>
              <p>
                We pull comparable offers, chase the fees, check the title, and
                bring the packet back for your blessing.
              </p>
              <button
                className="primary"
                disabled={busy || !data}
                onClick={() => command("create")}
              >
                {busy ? "Setting the table…" : "Open the sit-down"}{" "}
                <span>→</span>
              </button>
              <div className="welcome-details">
                Clean title or we walk <span>·</span> Under 40,000 miles{" "}
                <span>·</span> You make the call
              </div>
            </section>
          ) : (
            <>
              <section className="mission-card">
                <div className="mission-heading">
                  <div className="car-icon">TS</div>
                  <div>
                    <span className="eyebrow">
                      THE BRIEF · V{m.version}
                    </span>
                    <h2>A daily driver. No stories.</h2>
                  </div>
                  <span className={`status ${m.status}`}>
                    {m.status === "approval"
                      ? "Your call"
                      : m.status === "approved"
                        ? "Blessed"
                        : m.status === "active"
                          ? "In play"
                          : m.status === "paused"
                            ? "On ice"
                            : m.status === "blocked"
                              ? "Dead end"
                              : m.status}
                  </span>
                </div>
                <div className="brief-grid">
                  <div>
                    <span>THE CEILING</span>
                    <strong>{money(m.budget)}</strong>
                  </div>
                  <div>
                    <span>MILEAGE CAP</span>
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
                  <span>MOVES MADE</span>
                  <strong>
                    {m.steps}
                    <small> written in the books</small>
                  </strong>
                </div>
                <div>
                  <span>OFF THE TOP</span>
                  <strong>
                    {money(m.learning.totalReduction)}
                    <small> across the table</small>
                  </strong>
                </div>
                <div>
                  <span>CARS THAT QUALIFY</span>
                  <strong>
                    {data?.qualified}
                    <small> fit the brief</small>
                  </strong>
                </div>
                <div>
                  <span>THE BOOKS</span>
                  <strong>
                    v{m.version}
                    <small> on the record</small>
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
                        The table
                      </button>
                      <button
                        className={tab === "memory" ? "selected" : ""}
                        onClick={() => setTab("memory")}
                      >
                        The books
                      </button>
                    </div>
                    <span className="small-label">
                      {m.offers.length} cars on the sheet
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
                              <div className="vehicle-glyph">LOT</div>
                              <div>
                                <span className="dealer">{o.dealer}</span>
                                <h3>{o.car}</h3>
                                <p>
                                  {o.miles.toLocaleString()} miles · On the lot
                                </p>
                              </div>
                              <div className="price">
                                <strong>
                                  {money(o.total ?? o.advertised)}
                                </strong>
                                <small>
                                  {o.total
                                    ? "all-in, in writing"
                                    : "sticker only"}
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
                                    ? "✓ Title’s clean"
                                    : "✕ Branded title — we walk"
                                  : o.negotiated
                                    ? "They came back with a number"
                                    : o.quoted
                                      ? "It’s in writing"
                                      : "Waiting on the itemized"}
                              </span>
                              {o.total !== undefined && o.total > m.budget && (
                                <span className="bad">Over the ceiling</span>
                              )}
                              {o.id === m.selected && (
                                <span className="winner">The one</span>
                              )}
                            </div>
                            <NegotiationCard
                              offer={o}
                              policy={m.policy}
                              day={m.day}
                            />
                            <details>
                              <summary>See the paperwork</summary>
                              <p>{o.evidence}</p>
                            </details>
                          </article>
                        ))}
                        {!m.offers.length && (
                          <div className="empty">
                            The sheet fills in once we scout cars that fit the brief.
                          </div>
                        )}
                      </div>
                      <div className="section-title">
                        <h3>Every move, on the record.</h3>
                        <span>Latest 30 entries</span>
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
                        WHAT WE KEEP AT THE TABLE
                      </span>
                      <h3>The books hold the essentials.</h3>
                      <p>
                        Each move gets the latest brief, three cars, and the
                        running tally. The full history stays in the back.
                      </p>
                      <dl>
                        <dt>The goal</dt>
                        <dd>
                          Clean-title car, at most {money(m.budget)} all-in, at
                          most {m.maxMiles.toLocaleString()} miles.
                        </dd>
                        <dt>How we negotiate</dt>
                        <dd>
                          {m.learning.itemizedFirst
                            ? "Ask for itemized fees and removal of optional add-ons. Triggered by a measured advertised-to-total price gap."
                            : "Collect written totals before comparing offers."}
                        </dd>
                        <dt>Our number</dt>
                        <dd>
                          {money(m.policy?.targetTotal ?? 28000)} · up to{" "}
                          {m.policy?.maxRounds ?? 4} rounds per dealer ·
                          deadline day {m.policy?.deadlineDay ?? 14}.                           Counters
                          never show the ceiling.
                        </dd>
                        <dt>What the table taught us</dt>
                        <dd>
                          {m.learning.observations} negotiation outcomes;{" "}
                          {money(m.learning.totalReduction)} aggregate reduction
                          across quotes.
                        </dd>
                        <dt>Last word</dt>
                        <dd>{m.lastDecision}</dd>
                        <dt>Words on the wire</dt>
                        <dd>
                          {m.tokens.toLocaleString()} · {data?.planner}
                        </dd>
                        <dt>What this is</dt>
                        <dd>
                          A small simulated sit-down. No billion-token run, and
                          nobody actually bought a car.
                        </dd>
                      </dl>
                    </div>
                  )}
                </section>
                <aside className="right-column">
                  <section className="next-card">
                    <span className="eyebrow">NEXT MOVE</span>
                    <div className="spark">THE TABLE</div>
                    <h3>
                      {m.status === "approval"
                        ? "This one needs your blessing."
                        : m.status === "approved"
                          ? "The packet is blessed."
                          : m.status === "paused"
                            ? "We’re on ice. The books are safe."
                            : m.status === "blocked"
                              ? "Nothing on the lot fits."
                              : "We keep working the number."}
                    </h3>
                    <p>
                      {selected
                        ? `${selected.car} at ${money(selected.total!)} all-in. ${money(m.budget - selected.total!)} under the ceiling.`
                        : m.status === "blocked"
                          ? "No clean offer fits. Change the terms, or hold the line."
                          : m.status === "paused"
                            ? "Pick it up from the books, even after the office goes dark."
                            : data?.actions[0]?.label ||
                              "Look over the packet."}
                    </p>
                    {m.status === "active" && (
                      <>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => command("step")}
                        >
                          {busy ? "Working the room…" : "Make the next move"}{" "}
                          <span>→</span>
                        </button>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => setAuto(!auto)}
                        >
                          {auto ? "Hold it" : "Let it ride"}
                        </button>
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => {
                            setAuto(false);
                            void command("pause");
                          }}
                        >
                          Put it on ice
                        </button>
                      </>
                    )}
                    {m.status === "paused" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => command("resume")}
                      >
                        Back to the table →
                      </button>
                    )}
                    {m.status === "approval" && (
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => command("approve")}
                      >
                        Bless the packet ✓
                      </button>
                    )}
                    {m.status === "approved" && (
                      <p className="approved-note">
                        ✓ Your blessing is on the books. Nobody bought a car,
                        and nobody paid.
                      </p>
                    )}
                    <div className="next-foot">
                      {busy
                        ? "Writing it in the books…"
                        : `Last entry ${new Date(m.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </div>
                  </section>
                  <section className="constraints">
                    <span className="eyebrow">
                      TERMS CAN CHANGE
                    </span>
                    <h3>Revise the brief</h3>
                    <label>
                      The ceiling ($)
                      <input
                        type="number"
                        min="10000"
                        max="100000"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Our number ($)
                      <input
                        type="number"
                        min="5000"
                        max={budget}
                        value={target}
                        onChange={(e) => setTarget(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Rounds at the table
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
                      Save the new terms
                    </button>
                    <p>
                      The ceiling stays private. Our number guides the
                      counters. A change wipes pending replies and any earlier
                      blessing.
                    </p>
                  </section>
                  <section className="proof">
                    <span>◈</span>
                    <div>
                      <strong>The books don’t close</strong>
                      <p>
                        Every move is versioned. The paperwork stays. A
                        separate worker keeps the sit-down going with this page
                        shut.
                      </p>
                    </div>
                  </section>
                </aside>
              </div>
              <footer>
                <span>SAPRANO · NORTH JERSEY MOTOR SIT-DOWN</span>
                <button
                  disabled={busy}
                  onClick={() => {
                    setAuto(false);
                    void command("create");
                  }}
                >
                  Start another sit-down →
                </button>
              </footer>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
