"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Compass,
  Handshake,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

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

  const textFields = ["id", "name", "org", "country", "type", "why", "opener"];

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
    return typeof count === "number" && Number.isInteger(count) && count >= 0;
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
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
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
  error,
  id,
  children,
}: {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLDivElement>(null);
  const profileHeading = useRef<HTMLHeadingElement>(null);

  const metrics = dashboard
    ? [
        { label: "Contacts", value: dashboard.contacts },
        { label: "Meetings", value: dashboard.meetings },
        { label: "Pilots", value: dashboard.pilots },
        { label: "Deals", value: dashboard.deals },
      ]
    : [];

  function toggleSelection(field: "target_countries" | "wants", value: string) {
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

    const errors: Record<string, string> = {};
    if (!submitted.name) errors.name = "Enter your name.";
    if (!submitted.needs) errors.needs = "Tell us what you are looking for.";
    if (!submitted.target_countries.length)
      errors.countries = "Select at least one country.";
    if (!submitted.wants.length)
      errors.wants = "Select at least one type of person.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => errorSummary.current?.focus());
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

      setPlan([...entries].sort((a, b) => a.rank - b.rank).slice(0, 5));
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

      if (!isObject(data) || !Object.values(data).every(isStage)) {
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
    <main className="main" id="main-content" tabIndex={-1}>
      <header className="page-heading">
        <div>
          <h1>
            {view === "plan"
              ? "Your next great connection starts here."
              : view === "log"
                ? "Keep the conversation moving."
                : "Connections, with an impact."}
          </h1>
          <p>
            {view === "plan"
              ? "A little intention turns an introduction into an opportunity."
              : view === "log"
                ? "Turn the people you meet into progress you can track."
                : "See what your event is making possible."}
          </p>
        </div>
        <Link href="/events" className="secondary-button">
          Explore events
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>

      <nav className="view-nav" aria-label="Game plan sections">
        {(
          [
            ["plan", "Game plan", Compass],
            ["log", "Outcome log", MessageCircle],
            ["dashboard", "Dashboard", Target],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            disabled={savingId !== null || loadingOutcomes}
            className={view === id ? "view-button active" : "view-button"}
            onClick={() => openView(id)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      {notice && (
        <p className="notice" role="status">
          <CheckCheck size={18} aria-hidden="true" />
          {notice}
        </p>
      )}

      {view === "plan" && (
        <div className="plan-layout">
          <aside className="panel profile-panel">
            <div className="profile-title">
              <h2 ref={profileHeading} tabIndex={-1}>
                Your founder profile
              </h2>
              <span className="profile-indicator">
                <span className="status-dot" />
                Personalize
              </span>
            </div>
            <p className="muted">The right people start with knowing you.</p>
            <form
              onSubmit={makePlan}
              noValidate
              className="profile-form"
              aria-busy={loadingPlan}
            >
              {Object.keys(fieldErrors).length > 0 && (
                <div
                  className="error-message"
                  role="alert"
                  tabIndex={-1}
                  ref={errorSummary}
                >
                  <strong>Check your profile</strong>
                  <ul>
                    {Object.entries(fieldErrors).map(([id, error]) => (
                      <li key={id}>
                        <a href={`#${id}`}>{error}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="form-row">
                <Field label="Your name" id="name" error={fieldErrors.name}>
                  <input
                    id="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={founder.name}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={
                      fieldErrors.name ? "name-error" : undefined
                    }
                    onChange={(event) =>
                      setFounder({ ...founder, name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Your sector" id="sector">
                  <select
                    id="sector"
                    value={founder.sector}
                    onChange={(event) =>
                      setFounder({ ...founder, sector: event.target.value })
                    }
                  >
                    {SECTORS.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector.charAt(0).toUpperCase() + sector.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <fieldset
                id="countries"
                tabIndex={-1}
                aria-describedby={
                  fieldErrors.countries ? "countries-error" : undefined
                }
              >
                <legend>Where do you want to grow?</legend>
                <p className="field-hint">Choose your target markets.</p>
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
                      <Check
                        size={14}
                        className="choice-check"
                        aria-hidden="true"
                      />
                      {country}
                    </label>
                  ))}
                </div>
                {fieldErrors.countries && (
                  <p className="field-error" id="countries-error">
                    {fieldErrors.countries}
                  </p>
                )}
              </fieldset>
              <fieldset
                id="wants"
                tabIndex={-1}
                aria-describedby={fieldErrors.wants ? "wants-error" : undefined}
              >
                <legend>Who would you like to meet?</legend>
                <div className="choices">
                  {TYPES.map((type) => (
                    <label className="choice" key={type}>
                      <input
                        type="checkbox"
                        checked={founder.wants.includes(type)}
                        onChange={() => toggleSelection("wants", type)}
                      />
                      <Check
                        size={14}
                        className="choice-check"
                        aria-hidden="true"
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
                {fieldErrors.wants && (
                  <p className="field-error" id="wants-error">
                    {fieldErrors.wants}
                  </p>
                )}
              </fieldset>
              <Field
                label="What are you looking for?"
                id="needs"
                error={fieldErrors.needs}
              >
                <textarea
                  id="needs"
                  required
                  rows={3}
                  maxLength={1000}
                  value={founder.needs}
                  placeholder="A pilot partner, seed funding, a new market…"
                  aria-invalid={!!fieldErrors.needs}
                  aria-describedby={
                    fieldErrors.needs ? "needs-error needs-hint" : "needs-hint"
                  }
                  onChange={(event) =>
                    setFounder({ ...founder, needs: event.target.value })
                  }
                />
              </Field>
              <p className="field-hint" id="needs-hint">
                Be specific. A clear ask makes a better match.
              </p>
              {planError && (
                <p className="error-message" role="alert">
                  {planError}
                </p>
              )}
              <button
                type="submit"
                className="primary-button generate-button"
                disabled={loadingPlan}
              >
                {loadingPlan ? (
                  <LoaderCircle className="spin" size={18} aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {loadingPlan
                  ? "Finding your people…"
                  : plan.length
                    ? "Regenerate my game plan"
                    : "Build my game plan"}
                {!loadingPlan && <ArrowRight size={17} aria-hidden="true" />}
              </button>
              <p className="form-footnote">
                Five thoughtful matches. A reason to connect.
              </p>
            </form>
          </aside>

          <section
            className="recommendations"
            aria-labelledby="plan-heading"
            aria-busy={loadingPlan}
          >
            <div className="section-heading">
              <div>
                <h2 id="plan-heading">
                  {plan.length
                    ? `${planOwner}’s game plan`
                    : "Your conversation shortlist"}
                </h2>
                <p className="muted">Less small talk. More common ground.</p>
              </div>
              <span className="count-label">
                <Users size={15} aria-hidden="true" />
                {plan.length} people
              </span>
            </div>
            {loadingPlan ? (
              <div className="loading-recommendations" role="status">
                <p>
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                  Matching your goals with the right people…
                </p>
                {[1, 2, 3].map((n) => (
                  <div className="skeleton-card" key={n} aria-hidden="true">
                    <span className="skeleton-avatar" />
                    <div>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ))}
              </div>
            ) : !plan.length ? (
              <div className="shortlist-empty">
                <div className="connection-visual" aria-hidden="true">
                  <span className="connection-person">YOU</span>
                  <span className="connection-line" />
                  <span className="connection-target">
                    <Users size={28} />
                  </span>
                </div>
                <h3>Meet with a little more purpose.</h3>
                <p>
                  Your next five conversations, chosen around what you’re
                  building and where you want to go.
                </p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    profileHeading.current?.scrollIntoView({ block: "center" });
                    document
                      .getElementById("name")
                      ?.focus({ preventScroll: true });
                  }}
                >
                  Start with your profile
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <div className="shortlist-benefits">
                  <span>
                    <Check size={16} aria-hidden="true" />
                    People who fit your goals
                  </span>
                  <span>
                    <Check size={16} aria-hidden="true" />A real reason to
                    connect
                  </span>
                  <span>
                    <Check size={16} aria-hidden="true" />
                    An opener that feels natural
                  </span>
                </div>
              </div>
            ) : (
              <div className="cards">
                {plan.map((item) => (
                  <article className="person-card" key={item.id}>
                    <div className="person-card-top">
                      <div className="person-heading">
                        <span className="person-avatar" aria-hidden="true">
                          {item.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <h3>{item.name}</h3>
                          <p className="muted">{item.org}</p>
                        </div>
                      </div>
                      <span className="match-rank">Match {item.rank}</span>
                    </div>
                    <div className="tags">
                      <span>
                        <MapPin size={13} aria-hidden="true" />
                        {item.country}
                      </span>
                      <span>{item.type}</span>
                      {item.sector && <span>{item.sector}</span>}
                    </div>
                    <p className="card-label">Why you should connect</p>
                    <p className="reason">{item.why}</p>
                    <div className="opener">
                      <MessageCircle size={16} aria-hidden="true" />
                      <div>
                        <p className="card-label">Break the ice</p>
                        <p>“{item.opener}”</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="context-note">
              <CircleHelp size={17} aria-hidden="true" />
              <p>
                A game plan is a starting point. The best part of the
                conversation is what you bring to it.
              </p>
            </div>
          </section>
        </div>
      )}

      {view === "log" && (
        <section className="panel outcome-panel">
          <div className="section-heading">
            <div>
              <h2>From hello to what’s next</h2>
              <p className="muted">
                Choose the furthest stage reached for each conversation.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={loadingOutcomes || savingId !== null}
              onClick={() => void loadOutcomes()}
            >
              <RefreshCw
                size={16}
                className={loadingOutcomes ? "spin" : ""}
                aria-hidden="true"
              />
              {loadingOutcomes ? "Loading…" : "Refresh outcomes"}
            </button>
          </div>
          <p className="shared-log-note">
            <CircleHelp size={16} aria-hidden="true" />
            Changes save immediately to the shared demo event log.
          </p>
          {outcomesError && (
            <p className="error-message api-message" role="alert">
              {outcomesError}
            </p>
          )}
          {loadingOutcomes && (
            <p className="api-message loading-message" role="status">
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
              Loading saved outcomes…
            </p>
          )}
          {!plan.length ? (
            <div className="empty-state compact">
              <MessageCircle size={32} aria-hidden="true" />
              <h3>Every outcome starts with a conversation.</h3>
              <p>
                Build a game plan first. Your recommended contacts will appear
                here, ready to follow up.
              </p>
              <button
                type="button"
                className="primary-button"
                disabled={loadingOutcomes}
                onClick={() => openView("plan")}
              >
                Build a game plan
                <ArrowRight size={16} aria-hidden="true" />
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
                    <span className="person-avatar" aria-hidden="true">
                      {item.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <h3>{item.name}</h3>
                      <p className="muted">
                        {item.org} · {item.country}
                      </p>
                      <p className="saved-state">
                        {savingId === item.id
                          ? "Saving…"
                          : !outcomesReady
                            ? "Waiting for saved outcomes"
                            : outcomes[item.id]
                              ? `Saved: ${STAGE_LABELS[outcomes[item.id]]}`
                              : "Not logged yet"}
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
                          !outcomesReady || loadingOutcomes || savingId !== null
                        }
                        onClick={() => void saveOutcome(item.id, stage)}
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
              <h2>Your event, beyond attendance</h2>
              <p className="muted">
                A shared view of meetings, pilots, and deals for Startup ASEAN.
              </p>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={loadingDashboard}
              onClick={() => void loadDashboard()}
            >
              <RefreshCw
                size={16}
                className={loadingDashboard ? "spin" : ""}
                aria-hidden="true"
              />
              {loadingDashboard ? "Updating…" : "Refresh dashboard"}
            </button>
          </div>
          {dashboardError && (
            <p className="error-message api-message" role="alert">
              {dashboardError}
            </p>
          )}
          {loadingDashboard ? (
            <div className="panel dashboard-loading" role="status">
              <LoaderCircle size={22} className="spin" aria-hidden="true" />
              Loading event results…
            </div>
          ) : dashboard ? (
            <>
              <div className="metrics">
                {metrics.map((metric) => (
                  <article className="metric-card" key={metric.label}>
                    <p>{metric.label}</p>
                    <strong>{metric.value.toLocaleString()}</strong>
                    <span>
                      {metric.label === "Contacts"
                        ? "Conversations started"
                        : metric.label === "Meetings"
                          ? "Taking the next step"
                          : metric.label === "Pilots"
                            ? "Putting ideas to work"
                            : "Making it official"}
                    </span>
                  </article>
                ))}
              </div>
              <div className="dashboard-layout">
                <figure className="panel funnel-chart">
                  <figcaption>
                    <h3>The connection journey</h3>
                    <p className="muted">
                      From first contact to a business outcome.
                    </p>
                  </figcaption>
                  {metrics.map((metric) => (
                    <div className="chart-row" key={metric.label}>
                      <span>{metric.label}</span>
                      <div className="chart-track" aria-hidden="true">
                        <div
                          className="chart-fill"
                          style={{
                            width: `${Math.min(1, metric.value / Math.max(dashboard.contacts, 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <strong>{metric.value.toLocaleString()}</strong>
                    </div>
                  ))}
                  {dashboard.contacts === 0 && (
                    <p className="section-note">
                      No contacts recorded yet. Log an outcome after your first
                      conversation.
                    </p>
                  )}
                </figure>
                <aside className="panel dashboard-context">
                  <Handshake size={28} aria-hidden="true" />
                  <h3>Progress is a conversation away.</h3>
                  <p>
                    These stages are cumulative. A deal also counts as a pilot
                    and a meeting.
                  </p>
                  <p>
                    Totals include saved contact outcomes and event records
                    supplied by your team.
                  </p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => openView("log")}
                  >
                    Update your outcomes
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </aside>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Target size={32} aria-hidden="true" />
              <h3>Results aren’t available yet.</h3>
              <p>
                Refresh the dashboard to try loading your event results again.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => void loadDashboard()}
              >
                Try again
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
