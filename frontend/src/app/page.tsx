"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type Founder = {
  name: string;
  company: string;
  sector: string;
  stage: string;
  target_countries: string[];
  wants: string[];
  needs: string;
};

type Profile = {
  id: string;
  name: string;
  org: string;
  country: string;
  type: string;
  sector: string;
  looking_for: string;
};

type PlanEntry = {
  id: string;
  rank: number;
  why: string;
  opener: string;
};

type Stage = "none" | "meeting" | "pilot" | "deal";
type Outcomes = Record<string, Stage>;
type View = "plan" | "log" | "dashboard";

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
  none: "No outcome",
  meeting: "Meeting",
  pilot: "Pilot",
  deal: "Deal",
};

const DEFAULT_FOUNDER: Founder = {
  name: "Aina",
  company: "TaniLab (sample)",
  sector: "agriculture",
  stage: "seed",
  target_countries: ["Indonesia", "Thailand"],
  wants: ["corporate", "investor"],
  needs: "Plantation pilots and seed funding",
};

// Frontend preview data. Replace with the backend's event profiles later.
const PROFILES: Profile[] = [
  {
    id: "p01",
    name: "Budi",
    org: "Sawit Agro (sample)",
    country: "Indonesia",
    type: "corporate",
    sector: "agriculture",
    looking_for: "farm-tech pilots on plantations",
  },
  {
    id: "p02",
    name: "Mali",
    org: "Green Fields (sample)",
    country: "Thailand",
    type: "corporate",
    sector: "agriculture",
    looking_for: "crop monitoring and plantation pilots",
  },
  {
    id: "p03",
    name: "Rizky",
    org: "Nusantara Ventures (sample)",
    country: "Indonesia",
    type: "investor",
    sector: "agriculture",
    looking_for: "seed-stage agriculture startups",
  },
  {
    id: "p04",
    name: "Nicha",
    org: "Harvest Capital (sample)",
    country: "Thailand",
    type: "investor",
    sector: "agriculture",
    looking_for: "seed funding opportunities in farm technology",
  },
  {
    id: "p05",
    name: "Sari",
    org: "Plantation Partners (sample)",
    country: "Indonesia",
    type: "corporate",
    sector: "agriculture",
    looking_for: "startup partners for plantation pilots",
  },
  {
    id: "p06",
    name: "Arun",
    org: "Agri Future (sample)",
    country: "Thailand",
    type: "government",
    sector: "agriculture",
    looking_for: "cross-border agriculture innovation",
  },
  {
    id: "p07",
    name: "Mei",
    org: "Seed Bridge (sample)",
    country: "Singapore",
    type: "investor",
    sector: "agriculture",
    looking_for: "regional seed-stage investments",
  },
  {
    id: "p08",
    name: "Farah",
    org: "Farm Sensor (sample)",
    country: "Malaysia",
    type: "startup",
    sector: "agriculture",
    looking_for: "technology partners and pilot customers",
  },
  {
    id: "p09",
    name: "Linh",
    org: "Route Works (sample)",
    country: "Vietnam",
    type: "corporate",
    sector: "logistics",
    looking_for: "delivery optimisation partners",
  },
  {
    id: "p10",
    name: "Daniel",
    org: "Pay Forward (sample)",
    country: "Singapore",
    type: "investor",
    sector: "fintech",
    looking_for: "digital payment startups",
  },
  {
    id: "p11",
    name: "Isabel",
    org: "Care Connect (sample)",
    country: "Philippines",
    type: "startup",
    sector: "healthtech",
    looking_for: "hospital partnerships",
  },
  {
    id: "p12",
    name: "Amir",
    org: "Trade Enable (sample)",
    country: "Malaysia",
    type: "government",
    sector: "logistics",
    looking_for: "regional trade programmes",
  },
];

const PROFILE_BY_ID = Object.fromEntries(
  PROFILES.map((profile) => [profile.id, profile]),
);

// Fictional event records from five other founders.
const SAMPLE_STAGES: Stage[] = [
  "none", "meeting", "none",
  "pilot", "meeting", "none",
  "deal", "meeting", "none",
  "meeting", "pilot", "none",
  "meeting", "none", "none",
];

const SAMPLE_EVENT_OUTCOMES = SAMPLE_STAGES.map((stage, index) => ({
  founder: `sample-founder-${Math.floor(index / 3) + 1}`,
  id: PROFILES[index % PROFILES.length].id,
  stage,
}));

function storageKey(founder: Founder) {
  const identity = JSON.stringify([
    founder.name.trim().toLowerCase(),
    founder.company.trim().toLowerCase(),
  ]);

  return `premeet:outcomes:v1:${identity}`;
}

function loadSavedOutcomes(founder: Founder): Outcomes {
  try {
    const raw: unknown = JSON.parse(
      localStorage.getItem(storageKey(founder)) ?? "{}",
    );

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

    return Object.fromEntries(
      Object.entries(raw).filter(
        ([id, stage]) =>
          PROFILE_BY_ID[id] &&
          typeof stage === "string" &&
          STAGES.includes(stage as Stage),
      ),
    ) as Outcomes;
  } catch {
    return {};
  }
}

// Preview only. The backend will prefilter 20 candidates and ask Gemma
// to return PlanEntry[] using these same id/rank/why/opener fields.
async function loadGamePlan(founder: Founder): Promise<PlanEntry[]> {
  function score(profile: Profile) {
    return (
      (profile.sector === founder.sector ? 3 : 0) +
      (founder.target_countries.includes(profile.country) ? 2 : 0) +
      (founder.wants.includes(profile.type) ? 2 : 0)
    );
  }

  return [...PROFILES]
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .slice(0, 10)
    .map((profile, index) => ({
      id: profile.id,
      rank: index + 1,
      why:
        `${profile.org} works in ${profile.sector} in ${profile.country}. ` +
        `Their interest in ${profile.looking_for} is a conversation ` +
        `to explore for ${founder.company}.`,
      opener:
        `We're building ${founder.company} in ${founder.sector}. ` +
        `Could we discuss your work on ${profile.looking_for}?`,
    }));
}

function funnel(stages: Stage[]) {
  const reached = (minimum: Stage) =>
    stages.filter(
      (stage) => STAGES.indexOf(stage) >= STAGES.indexOf(minimum),
    ).length;

  return {
    contacts: stages.length,
    meetings: reached("meeting"),
    pilots: reached("pilot"),
    deals: reached("deal"),
  };
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
  const [activeFounder, setActiveFounder] = useState<Founder | null>(null);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [savedOutcomes, setSavedOutcomes] = useState<Outcomes>({});
  const [includeSamples, setIncludeSamples] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const stats = funnel([
    ...(includeSamples ? SAMPLE_EVENT_OUTCOMES.map((row) => row.stage) : []),
    ...Object.values(savedOutcomes),
  ]);

  const metrics = [
    { label: "Contacts", value: stats.contacts },
    { label: "Meetings", value: stats.meetings },
    { label: "Pilots", value: stats.pilots },
    { label: "Deals", value: stats.deals },
  ];

  const hasUnsavedChanges =
    JSON.stringify(outcomes) !== JSON.stringify(savedOutcomes);

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

  async function generatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const submitted: Founder = {
      ...founder,
      name: founder.name.trim(),
      company: founder.company.trim(),
      needs: founder.needs.trim(),
    };

    if (
      !submitted.name ||
      !submitted.company ||
      !submitted.needs ||
      !submitted.target_countries.length ||
      !submitted.wants.length
    ) {
      setError("Complete your profile and select countries and people to meet.");
      return;
    }

    setLoading(true);

    try {
      const result = await loadGamePlan(submitted);

      if (!result.length) {
        throw new Error("No recommendations returned.");
      }

      const saved = loadSavedOutcomes(submitted);

      setActiveFounder(submitted);
      setPlan(result);
      setOutcomes(saved);
      setSavedOutcomes(saved);
      setNotice("Your sample game plan is ready.");
    } catch {
      setError("Couldn’t make a plan. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateOutcome(id: string, value: string) {
    setOutcomes((current) => {
      const next = { ...current };

      if (value === "") {
        delete next[id];
      } else {
        next[id] = value as Stage;
      }

      return next;
    });
    setNotice("");
  }

  function saveOutcomes() {
    if (!activeFounder) return;

    setSavedOutcomes({ ...outcomes });
    setError("");

    try {
      localStorage.setItem(
        storageKey(activeFounder),
        JSON.stringify(outcomes),
      );
      setNotice("Outcomes saved in this browser. Your dashboard is updated.");
    } catch {
      setNotice(
        "Dashboard updated for this session. Browser storage is unavailable.",
      );
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
            Frontend preview · Fictional data · Gemma not connected
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
              className={view === id ? "view-button active" : "view-button"}
              onClick={() => setView(id)}
            >
              <span>{number}</span>
              {label}
            </button>
          ))}
        </nav>

        {error && <p className="error-message" role="alert">{error}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}

        {view === "plan" && (
          <div className="plan-layout">
            <aside className="panel profile-panel">
              <p className="eyebrow">Start here</p>
              <h2>Your founder profile</h2>
              <p className="muted">
                Tell us what you build and what you need next.
              </p>

              <form onSubmit={generatePlan} className="profile-form">
                <Field label="Your name">
                  <input
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={founder.name}
                    onChange={(event) =>
                      setFounder({ ...founder, name: event.target.value })
                    }
                  />
                </Field>

                <Field label="Company">
                  <input
                    required
                    maxLength={120}
                    autoComplete="organization"
                    value={founder.company}
                    onChange={(event) =>
                      setFounder({ ...founder, company: event.target.value })
                    }
                  />
                </Field>

                <div className="form-columns">
                  <Field label="Sector">
                    <select
                      value={founder.sector}
                      onChange={(event) =>
                        setFounder({ ...founder, sector: event.target.value })
                      }
                    >
                      {SECTORS.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Startup stage">
                    <select
                      value={founder.stage}
                      onChange={(event) =>
                        setFounder({ ...founder, stage: event.target.value })
                      }
                    >
                      <option value="pre-seed">Pre-seed</option>
                      <option value="seed">Seed</option>
                      <option value="series-a">Series A</option>
                      <option value="growth">Growth</option>
                    </select>
                  </Field>
                </div>

                <fieldset>
                  <legend>Target countries</legend>
                  <div className="choices">
                    {COUNTRIES.map((country) => (
                      <label key={country} className="choice">
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
                      <label key={type} className="choice">
                        <input
                          type="checkbox"
                          checked={founder.wants.includes(type)}
                          onChange={() => toggleSelection("wants", type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Field label="What do you need?">
                  <textarea
                    required
                    rows={3}
                    maxLength={600}
                    value={founder.needs}
                    onChange={(event) =>
                      setFounder({ ...founder, needs: event.target.value })
                    }
                  />
                </Field>

                <button className="primary-button" disabled={loading}>
                  {loading ? "Making your plan…" : "Make my game plan →"}
                </button>
              </form>
            </aside>

            <section aria-labelledby="plan-heading">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Before the event</p>
                  <h2 id="plan-heading">
                    {activeFounder
                      ? `${activeFounder.name}’s game plan`
                      : "Your next ten conversations"}
                  </h2>
                </div>
                <span className="badge">{plan.length} people</span>
              </div>

              {!plan.length ? (
                <div className="empty-state">
                  <span className="empty-number">10</span>
                  <h3>Fewer random introductions.</h3>
                  <p>
                    Complete your founder profile to see who to meet,
                    why they matter and how to start the conversation.
                  </p>
                </div>
              ) : (
                <>
                  <p className="section-note">
                    Sample recommendations. Live Gemma ranking will replace
                    this preview when the backend is connected.
                  </p>

                  <div className="cards">
                    {plan.map((item) => {
                      const person = PROFILE_BY_ID[item.id];

                      return (
                        <article className="person-card" key={item.id}>
                          <div className="person-heading">
                            <span className="rank">{item.rank}</span>
                            <div>
                              <h3>{person.name}</h3>
                              <p className="muted">{person.org}</p>
                            </div>
                          </div>

                          <div className="tags">
                            <span>{person.country}</span>
                            <span>{person.type}</span>
                            <span>{person.sector}</span>
                          </div>

                          <p className="card-label">Why meet</p>
                          <p className="reason">{item.why}</p>

                          <div className="opener">
                            <p className="card-label">Start with this</p>
                            <p>“{item.opener}”</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {view === "log" && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">After the event</p>
                <h2>What came of the conversation?</h2>
              </div>
              {hasUnsavedChanges && (
                <span className="badge">Unsaved changes</span>
              )}
            </div>

            <p className="muted">
              Record the furthest stage reached for each person.
              Leave people you have not contacted as “Not logged”.
            </p>

            {!plan.length ? (
              <div className="empty-state compact">
                <h3>Your contacts will appear here.</h3>
                <p>Generate a game plan first.</p>
                <button
                  className="primary-button"
                  onClick={() => setView("plan")}
                >
                  Make a game plan →
                </button>
              </div>
            ) : (
              <>
                <div className="outcome-list">
                  {plan.map((item) => {
                    const person = PROFILE_BY_ID[item.id];

                    return (
                      <div className="outcome-row" key={person.id}>
                        <div className="person-heading">
                          <span className="rank">{item.rank}</span>
                          <div>
                            <h3>{person.name}</h3>
                            <p className="muted">
                              {person.org} · {person.country}
                            </p>
                          </div>
                        </div>

                        <label className="outcome-select">
                          <span className="sr-only">
                            Outcome for {person.name}
                          </span>
                          <select
                            value={outcomes[person.id] ?? ""}
                            onChange={(event) =>
                              updateOutcome(person.id, event.target.value)
                            }
                          >
                            <option value="">Not logged</option>
                            {STAGES.map((stage) => (
                              <option key={stage} value={stage}>
                                {STAGE_LABELS[stage]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="save-row">
                  <p className="muted">
                    Saved on this browser for {activeFounder?.company}.
                    Generate this founder’s plan again after refreshing
                    to reload the saved log.
                  </p>
                  <button
                    className="primary-button"
                    onClick={saveOutcomes}
                    disabled={!hasUnsavedChanges}
                  >
                    Save outcomes
                  </button>
                </div>
              </>
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
              <span className="badge">Preview dashboard</span>
            </div>

            <div className="dashboard-controls">
              <label className="choice">
                <input
                  type="checkbox"
                  checked={includeSamples}
                  onChange={(event) =>
                    setIncludeSamples(event.target.checked)
                  }
                />
                Include fictional event records
              </label>
              <p className="muted">
                {includeSamples ? SAMPLE_EVENT_OUTCOMES.length : 0} sample
                records + {Object.keys(savedOutcomes).length} saved founder
                records
              </p>
            </div>

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
                  A deal also counts as a pilot and a meeting.
                  Only saved outcomes are included.
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
                          (metric.value / Math.max(stats.contacts, 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <strong>{metric.value}</strong>
                </div>
              ))}

              {stats.contacts === 0 && (
                <p className="section-note">
                  No outcomes yet. Save a contact’s outcome or enable
                  the sample records to preview the funnel.
                </p>
              )}
            </figure>
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