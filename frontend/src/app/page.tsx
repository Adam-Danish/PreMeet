"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type Founder = {
  name: string;
  sector: string;
  target_countries: string[];
  wants: string[];
  needs: string;
};

type PlanItem = {
  id: string;
  rank: number;
  name: string;
  org: string;
  country: string;
  type: string;
  sector?: string;
  why: string;
  opener: string;
};

type Stage = "none" | "meeting" | "pilot" | "deal";
type Outcomes = Record<string, Stage>;
type View = "plan" | "log" | "dashboard";

type Dashboard = {
  contacts: number;
  meetings: number;
  pilots: number;
  deals: number;
};

const COUNTRIES = [
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Singapore",
  "Philippines",
  "Malaysia",
];

const TYPES = ["startup", "investor", "corporate", "government"];
const SECTORS = ["agriculture", "fintech", "healthtech", "logistics"];
const STAGES: Stage[] = ["none", "meeting", "pilot", "deal"];

const STAGE_LABELS: Record<Stage, string> = {
  none: "None",
  meeting: "Meeting",
  pilot: "Pilot",
  deal: "Deal",
};

const DEFAULT_FOUNDER: Founder = {
  name: "Aina",
  sector: "agriculture",
  target_countries: ["Indonesia", "Thailand"],
  wants: ["corporate", "investor"],
  needs: "Plantation pilots and seed funding",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGES.includes(value as Stage);
}

function isPlanItem(value: unknown): value is PlanItem {
  if (!isObject(value)) return false;

  const textFields = [
    "id",
    "name",
    "org",
    "country",
    "type",
    "why",
    "opener",
  ];

  return (
    textFields.every((field) => typeof value[field] === "string") &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.rank === "number" &&
    Number.isInteger(value.rank) &&
    value.rank > 0 &&
    (value.sector === undefined || typeof value.sector === "string")
  );
}

function isDashboard(value: unknown): value is Dashboard {
  if (!isObject(value)) return false;

  return ["contacts", "meetings", "pilots", "deals"].every((key) => {
    const count = value[key];
    return (
      typeof count === "number" &&
      Number.isInteger(count) &&
      count >= 0
    );
  });
}

async function api(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<unknown> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("plan");
  const [founder, setFounder] = useState<Founder>(DEFAULT_FOUNDER);
  const [planOwner, setPlanOwner] = useState("");
  const [plan, setPlan] = useState<PlanItem[]>([]);

  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [outcomesReady, setOutcomesReady] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [planError, setPlanError] = useState("");
  const [outcomesError, setOutcomesError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [notice, setNotice] = useState("");

  const metrics = dashboard
    ? [
        { label: "Contacts", value: dashboard.contacts },
        { label: "Meetings", value: dashboard.meetings },
        { label: "Pilots", value: dashboard.pilots },
        { label: "Deals", value: dashboard.deals },
      ]
    : [];

  function toggleSelection(
    field: "target_countries" | "wants",
    value: string,
  ) {
    setFounder((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function makePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingPlan) return;

    setPlanError("");
    setNotice("");

    const submitted: Founder = {
      ...founder,
      name: founder.name.trim(),
      needs: founder.needs.trim(),
    };

    if (
      !submitted.name ||
      !submitted.needs ||
      !submitted.target_countries.length ||
      !submitted.wants.length
    ) {
      setPlanError(
        "Enter your name and needs, then select countries and people to meet.",
      );
      return;
    }

    setLoadingPlan(true);

    try {
      const data = await api("/api/plan", "POST", submitted);

      if (
        !Array.isArray(data) ||
        data.length === 0 ||
        !data.every(isPlanItem)
      ) {
        throw new Error("Invalid or empty game plan.");
      }

      const entries = data as PlanItem[];

      if (new Set(entries.map((item) => item.id)).size !== entries.length) {
        throw new Error("Duplicate attendees returned.");
      }

      setPlan(
        [...entries]
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 5),
      );
      setPlanOwner(submitted.name);
      setNotice("Your game plan is ready.");
    } catch {
      setPlanError("Couldn’t make a plan. Try again.");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function loadOutcomes() {
    setLoadingOutcomes(true);
    setOutcomesReady(false);
    setOutcomesError("");

    try {
      const data = await api("/api/outcomes");

      if (
        !isObject(data) ||
        !Object.values(data).every(isStage)
      ) {
        throw new Error("Invalid outcomes response.");
      }

      setOutcomes(data as Outcomes);
      setOutcomesReady(true);
    } catch {
      setOutcomesError("Couldn’t load saved outcomes. Please retry.");
    } finally {
      setLoadingOutcomes(false);
    }
  }

  async function loadDashboard() {
    setLoadingDashboard(true);
    setDashboardError("");

    try {
      const data = await api("/api/dashboard");

      if (!isDashboard(data)) {
        throw new Error("Invalid dashboard response.");
      }

      setDashboard(data);
    } catch {
      setDashboard(null);
      setDashboardError("Couldn’t load the event dashboard. Please retry.");
    } finally {
      setLoadingDashboard(false);
    }
  }

  function openView(next: View) {
    if (savingId || loadingOutcomes) return;

    setView(next);
    setNotice("");

    if (next === "log") void loadOutcomes();
    if (next === "dashboard") void loadDashboard();
  }

  async function saveOutcome(id: string, stage: Stage) {
    if (!outcomesReady || savingId || outcomes[id] === stage) return;

    setSavingId(id);
    setOutcomesError("");
    setNotice("");

    try {
      const data = await api("/api/outcomes", "POST", { id, stage });

      if (!isObject(data) || data.ok !== true) {
        throw new Error("Outcome was not confirmed.");
      }

      setOutcomes((current) => ({ ...current, [id]: stage }));
      setDashboard(null);
      setNotice("Outcome saved. Open the dashboard to see updated totals.");
    } catch {
      setOutcomesError("Couldn’t save this outcome. Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/">
            <span className="brand-mark">P</span>
            <span>PreMeet</span>
          </a>
          <span className="event-label">Hack Day KL · 31 Oct 2026</span>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <p className="eyebrow">Event Game Plan</p>
          <h1>
            Arrive with a plan.
            <br />
            Leave with proof.
          </h1>
          <p className="hero-description">
            Find the right people before your event, then track the
            conversations that become meetings, pilots and deals.
          </p>
          <span className="preview-label">
            Before the event → After the event → Measurable outcomes
          </span>
        </section>

        <nav className="view-nav" aria-label="App sections">
          {([
            ["plan", "01", "Game plan"],
            ["log", "02", "After the event"],
            ["dashboard", "03", "Event dashboard"],
          ] as const).map(([id, number, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              disabled={savingId !== null || loadingOutcomes}
              className={
                view === id ? "view-button active" : "view-button"
              }
              onClick={() => openView(id)}
            >
              <span>{number}</span>
              {label}
            </button>
          ))}
        </nav>

        {notice && (
          <p className="notice" role="status">{notice}</p>
        )}

        {view === "plan" && (
          <>
            {planError && (
              <p className="error-message" role="alert">{planError}</p>
            )}

            <div className="plan-layout">
              <aside className="panel profile-panel">
                <p className="eyebrow">Start here</p>
                <h2>Your founder profile</h2>
                <p className="muted">
                  Tell us what you build and what you need next.
                </p>

                <form
                  onSubmit={makePlan}
                  className="profile-form"
                  aria-busy={loadingPlan}
                >
                  <Field label="Your name">
                    <input
                      required
                      maxLength={80}
                      autoComplete="name"
                      value={founder.name}
                      onChange={(event) =>
                        setFounder({
                          ...founder,
                          name: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <Field label="Sector">
                    <select
                      value={founder.sector}
                      onChange={(event) =>
                        setFounder({
                          ...founder,
                          sector: event.target.value,
                        })
                      }
                    >
                      {SECTORS.map((sector) => (
                        <option key={sector} value={sector}>
                          {sector}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <fieldset>
                    <legend>Target countries</legend>
                    <div className="choices">
                      {COUNTRIES.map((country) => (
                        <label className="choice" key={country}>
                          <input
                            type="checkbox"
                            checked={founder.target_countries.includes(country)}
                            onChange={() =>
                              toggleSelection("target_countries", country)
                            }
                          />
                          {country}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>Who do you want to meet?</legend>
                    <div className="choices">
                      {TYPES.map((type) => (
                        <label className="choice" key={type}>
                          <input
                            type="checkbox"
                            checked={founder.wants.includes(type)}
                            onChange={() =>
                              toggleSelection("wants", type)
                            }
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <Field label="What are you building, and what do you need?">
                    <textarea
                      required
                      rows={4}
                      maxLength={1000}
                      value={founder.needs}
                      onChange={(event) =>
                        setFounder({
                          ...founder,
                          needs: event.target.value,
                        })
                      }
                    />
                  </Field>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={loadingPlan}
                  >
                    {loadingPlan
                      ? "Making your game plan…"
                      : "Make my game plan →"}
                  </button>
                </form>
              </aside>

              <section aria-labelledby="plan-heading">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Before the event</p>
                    <h2 id="plan-heading">
                      {plan.length
                        ? `${planOwner}’s game plan`
                        : "Your next five conversations"}
                    </h2>
                  </div>
                  <span className="badge">{plan.length} people</span>
                </div>

                {!plan.length ? (
                  <div className="empty-state">
                    <span className="empty-number">5</span>
                    <h3>Fewer random introductions.</h3>
                    <p>
                      Complete your profile to see who to meet,
                      why they matter and how to start the conversation.
                    </p>
                    {loadingPlan && (
                      <p role="status">Finding your recommendations…</p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="section-note">
                      A clear reason to connect, and an opener to get started.
                    </p>

                    <div className="cards">
                      {plan.map((item) => (
                        <article className="person-card" key={item.id}>
                          <div className="person-heading">
                            <span className="rank">{item.rank}</span>
                            <div>
                              <h3>{item.name}</h3>
                              <p className="muted">{item.org}</p>
                            </div>
                          </div>

                          <div className="tags">
                            <span>{item.country}</span>
                            <span>{item.type}</span>
                            {item.sector && <span>{item.sector}</span>}
                          </div>

                          <p className="card-label">Why meet</p>
                          <p className="reason">{item.why}</p>

                          <div className="opener">
                            <p className="card-label">Start with this</p>
                            <p>“{item.opener}”</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        {view === "log" && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">After the event</p>
                <h2>What came of the conversation?</h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                disabled={loadingOutcomes || savingId !== null}
                onClick={() => void loadOutcomes()}
              >
                {loadingOutcomes ? "Loading…" : "Refresh outcomes"}
              </button>
            </div>

            <p className="muted">
              Choose the furthest stage reached. Each selection saves
              immediately to the shared demo event log.
            </p>

            {outcomesError && (
              <p className="error-message api-message" role="alert">
                {outcomesError}
              </p>
            )}

            {loadingOutcomes && (
              <p className="section-note api-message" role="status">
                Loading saved outcomes…
              </p>
            )}

            {!plan.length ? (
              <div className="empty-state compact">
                <h3>Your recommended contacts will appear here.</h3>
                <p>Generate a game plan first.</p>
                <button
                  type="button"
                  className="primary-button"
                  disabled={loadingOutcomes}
                  onClick={() => openView("plan")}
                >
                  Make a game plan →
                </button>
              </div>
            ) : (
              <div className="outcome-list">
                {plan.map((item) => (
                  <div
                    className="outcome-row"
                    key={item.id}
                    aria-busy={savingId === item.id}
                  >
                    <div className="person-heading">
                      <span className="rank">{item.rank}</span>
                      <div>
                        <h3>{item.name}</h3>
                        <p className="muted">
                          {item.org} · {item.country}
                        </p>
                        <p className="muted">
                          {savingId === item.id
                            ? "Saving…"
                            : !outcomesReady
                              ? "Waiting for saved outcomes"
                              : outcomes[item.id]
                                ? `Saved: ${STAGE_LABELS[outcomes[item.id]]}`
                                : "Not logged"}
                        </p>
                      </div>
                    </div>

                    <div
                      className="outcome-actions"
                      role="group"
                      aria-label={`Outcome for ${item.name}`}
                    >
                      {STAGES.map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          className="outcome-button"
                          aria-pressed={outcomes[item.id] === stage}
                          disabled={
                            !outcomesReady ||
                            loadingOutcomes ||
                            savingId !== null
                          }
                          onClick={() =>
                            void saveOutcome(item.id, stage)
                          }
                        >
                          {STAGE_LABELS[stage]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "dashboard" && (
          <section>
            <div className="section-heading">
              <div>
                <p className="eyebrow">For Startup ASEAN</p>
                <h2>Event outcomes, beyond attendance.</h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                disabled={loadingDashboard}
                onClick={() => void loadDashboard()}
              >
                {loadingDashboard ? "Updating…" : "Refresh dashboard"}
              </button>
            </div>

            <p className="section-note">
              Event totals include saved contact outcomes and the
              event records supplied by your team.
            </p>

            {dashboardError && (
              <p className="error-message" role="alert">
                {dashboardError}
              </p>
            )}

            {loadingDashboard ? (
              <div className="panel" role="status">
                Loading event results…
              </div>
            ) : dashboard ? (
              <>
                <div className="metrics">
                  {metrics.map((metric) => (
                    <article className="metric-card" key={metric.label}>
                      <p>{metric.label}</p>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                </div>

                <figure className="panel funnel-chart">
                  <figcaption>
                    <h3>From first contact to business outcome</h3>
                    <p className="muted">
                      These are cumulative stages: a deal also counts
                      as a pilot and a meeting.
                    </p>
                  </figcaption>

                  {metrics.map((metric) => (
                    <div className="chart-row" key={metric.label}>
                      <span>{metric.label}</span>
                      <div className="chart-track" aria-hidden="true">
                        <div
                          className="chart-fill"
                          style={{
                            width: `${
                              Math.min(
                                1,
                                metric.value /
                                  Math.max(dashboard.contacts, 1),
                              ) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}

                  {dashboard.contacts === 0 && (
                    <p className="section-note">
                      No contact outcomes have been recorded yet.
                      Log an outcome after your first conversation.
                    </p>
                  )}
                </figure>
              </>
            ) : (
              <div className="empty-state">
                <h3>Event results are unavailable.</h3>
                <p>Use Refresh dashboard to try again.</p>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="site-footer">
        PreMeet / Event Game Plan
        <span>Know who to meet. Track what happens next.</span>
      </footer>
    </div>
  );
}