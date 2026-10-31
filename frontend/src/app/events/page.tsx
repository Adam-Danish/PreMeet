"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./events.module.css";
import Link from "next/link";

// Change to false after the backend endpoints are ready.
const DEMO_MODE = true;

type EventItem = {
  id: string;
  title: string;
  description: string;
  organizer: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  city: string;
  country: string;
  status: "upcoming" | "ongoing" | "completed";
  attendee_count: number;
  topics: string[];
};

type Outcomes = {
  contacts: number;
  meetings: number;
  pilots: number;
  deals: number;
};

type HistoryItem = {
  event: EventItem;
  outcomes: Outcomes;
};

type View = "events" | "details" | "history";

const DEMO_EVENTS: EventItem[] = [
  {
    id: "demo-hack-day",
    title: "Hack Day KL — Sample Event",
    description:
      "Meet founders, developers and ecosystem partners. Build together, exchange ideas and find your next collaborator.",
    organizer: "Sample Event Team",
    starts_at: "2026-10-31T09:30:00+08:00",
    ends_at: "2026-10-31T16:00:00+08:00",
    venue: "Sample Innovation Hub",
    city: "Kuala Lumpur",
    country: "Malaysia",
    status: "ongoing",
    attendee_count: 120,
    topics: ["AI", "Startups", "Networking"],
  },
  {
    id: "demo-founder-connect",
    title: "ASEAN Founder Connect — Sample Event",
    description:
      "An event for startup founders exploring regional partnerships, investment and pilot opportunities.",
    organizer: "Sample Founder Network",
    starts_at: "2026-11-14T10:00:00+08:00",
    ends_at: "2026-11-14T17:00:00+08:00",
    venue: "Sample Business Centre",
    city: "Kuala Lumpur",
    country: "Malaysia",
    status: "upcoming",
    attendee_count: 200,
    topics: ["Funding", "Partnerships", "Regional Growth"],
  },
];

const PAST_EVENT: EventItem = {
  id: "demo-startup-mixer",
  title: "Startup Mixer — Sample Event",
  description:
    "A past networking event where founders met potential customers, investors and business partners.",
  organizer: "Sample Startup Community",
  starts_at: "2026-10-17T14:00:00+08:00",
  ends_at: "2026-10-17T18:00:00+08:00",
  venue: "Sample Community Space",
  city: "Petaling Jaya",
  country: "Malaysia",
  status: "completed",
  attendee_count: 80,
  topics: ["Startups", "Investment", "Networking"],
};

const DEMO_HISTORY: HistoryItem[] = [
  {
    event: PAST_EVENT,
    outcomes: {
      contacts: 8,
      meetings: 4,
      pilots: 2,
      deals: 1,
    },
  },
];

const OUTCOME_KEYS = ["contacts", "meetings", "pilots", "deals"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEvent(value: unknown): value is EventItem {
  if (!isObject(value)) return false;

  const fields = [
    "id", "title", "description", "organizer",
    "starts_at", "ends_at", "venue", "city", "country",
  ];

  return (
    fields.every((field) => typeof value[field] === "string") &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.starts_at === "string" &&
    Number.isFinite(Date.parse(value.starts_at)) &&
    typeof value.ends_at === "string" &&
    Number.isFinite(Date.parse(value.ends_at)) &&
    Date.parse(value.ends_at) >= Date.parse(value.starts_at) &&
    ["upcoming", "ongoing", "completed"].includes(String(value.status)) &&
    typeof value.attendee_count === "number" &&
    Number.isInteger(value.attendee_count) &&
    value.attendee_count >= 0 &&
    Array.isArray(value.topics) &&
    value.topics.every((topic) => typeof topic === "string")
  );
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!isObject(value) || !isEvent(value.event)) return false;
  if (value.event.status !== "completed") return false;

  const outcomes = value.outcomes;
  if (!isObject(outcomes)) return false;

  return OUTCOME_KEYS.every((key) => {
    const count = outcomes[key];
    return typeof count === "number" && Number.isInteger(count) && count >= 0;
  });
}

async function getJSON(path: string): Promise<unknown> {
  const response = await fetch(path, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

async function getEvents(): Promise<EventItem[]> {
  if (DEMO_MODE) return DEMO_EVENTS;

  const data = await getJSON("/api/events");

  if (!Array.isArray(data) || !data.every(isEvent)) {
    throw new Error("Invalid events response.");
  }

  return data;
}

async function getHistory(): Promise<HistoryItem[]> {
  if (DEMO_MODE) return DEMO_HISTORY;

  const data = await getJSON("/api/event-history");

  if (!Array.isArray(data) || !data.every(isHistoryItem)) {
    throw new Error("Invalid history response.");
  }

  return data;
}

async function getEvent(id: string): Promise<EventItem> {
  if (DEMO_MODE) {
    const event = [...DEMO_EVENTS, PAST_EVENT].find((item) => item.id === id);
    if (!event) throw new Error("Event not found.");
    return event;
  }

  const data = await getJSON(`/api/events/${encodeURIComponent(id)}`);

  if (!isEvent(data) || data.id !== id) {
    throw new Error("Invalid event details.");
  }

  return data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

export default function EventsPage() {
  const [view, setView] = useState<View>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [detailsError, setDetailsError] = useState("");

  const detailRequest = useRef(0);

  const loadCollections = useCallback(async () => {
    const [eventResult, historyResult] = await Promise.allSettled([
      getEvents(),
      getHistory(),
    ]);

    if (eventResult.status === "fulfilled") {
      setEvents(eventResult.value);
      setEventsError("");
    } else {
      setEvents([]);
      setEventsError("Couldn’t load events. Please refresh to try again.");
    }

    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
      setHistoryError("");
    } else {
      setHistory([]);
      setHistoryError("Couldn’t load event history. Please refresh to try again.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
  let active = true;

  Promise.allSettled([getEvents(), getHistory()]).then(
    ([eventResult, historyResult]) => {
      if (!active) return;

      if (eventResult.status === "fulfilled") {
        setEvents(eventResult.value);
        setEventsError("");
      } else {
        setEvents([]);
        setEventsError("Couldn’t load events. Please refresh to try again.");
      }

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value);
        setHistoryError("");
      } else {
        setHistory([]);
        setHistoryError(
          "Couldn’t load event history. Please refresh to try again.",
        );
      }

      setLoading(false);
    },
  );

  return () => {
    active = false;
  };
}, []);

  async function openDetails(event: EventItem) {
    const requestId = ++detailRequest.current;

    setSelected(event);
    setView("details");
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const details = await getEvent(event.id);

      if (requestId === detailRequest.current) {
        setSelected(details);
      }
    } catch {
      if (requestId === detailRequest.current) {
        setDetailsError(
          "Couldn’t refresh event details. Showing the information from the list.",
        );
      }
    } finally {
      if (requestId === detailRequest.current) {
        setDetailsLoading(false);
      }
    }
  }

  function refresh() {
    setLoading(true);
    void loadCollections();
  }

  const query = search.trim().toLowerCase();

  const visibleEvents = events
    .filter((event) => event.status !== "completed")
    .filter((event) =>
      [event.title, event.city, event.country, ...event.topics]
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

  const sortedHistory = [...history].sort(
    (a, b) => Date.parse(b.event.starts_at) - Date.parse(a.event.starts_at),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
  <Link href="/" className={styles.brand}>
    <span>P</span>
    PreMeet
  </Link>

  <Link href="/" className={styles.backLink}>
    ← Game plan
  </Link>
</header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Your event journey</p>
        <h1>Find your next opportunity.</h1>
        <p>
          Explore events, check the details and revisit the connections
          that turned into results.
        </p>

        {DEMO_MODE && (
          <span className={styles.demoBadge}>
            Demo mode · Sample events and outcomes
          </span>
        )}
      </section>

      <nav className={styles.tabs} aria-label="Event sections">
        {([
          ["events", "Events"],
          ["details", "Event details"],
          ["history", "History"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            disabled={id === "details" && !selected}
            className={view === id ? styles.activeTab : styles.tab}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === "events" && (
        <section aria-labelledby="events-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="events-heading">Upcoming and ongoing events</h2>
              <p className={styles.muted}>Choose an event to explore its details.</p>
            </div>
            <button
              className={styles.button}
              disabled={loading}
              onClick={refresh}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <label className={styles.search}>
            Search events
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by event, location or topic"
            />
          </label>

          {eventsError && (
            <p className={styles.error} role="alert">{eventsError}</p>
          )}

          {loading ? (
            <p className={styles.empty} role="status">Loading events…</p>
          ) : (
            <>
              <div className={styles.grid}>
                {visibleEvents.map((event) => (
                  <article className={styles.card} key={event.id}>
                    <span className={styles.status}>{event.status}</span>
                    <h3>{event.title}</h3>
                    <p className={styles.muted}>
                      {formatDate(event.starts_at)} MYT
                    </p>
                    <p>{event.venue} · {event.city}</p>

                    <div className={styles.tags}>
                      {event.topics.map((topic, index) => (
                        <span key={`${topic}-${index}`}>{topic}</span>
                      ))}
                    </div>

                    <p className={styles.description}>{event.description}</p>

                    <div className={styles.cardFooter}>
                      <span className={styles.muted}>
                        {event.attendee_count} attendees
                      </span>
                      <button
                        className={styles.primaryButton}
                        onClick={() => void openDetails(event)}
                      >
                        View details →
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {!visibleEvents.length && !eventsError && (
                <p className={styles.empty}>
                  {query ? "No events match your search." : "No upcoming events yet."}
                </p>
              )}
            </>
          )}
        </section>
      )}

      {view === "details" && selected && (
        <section className={styles.details}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.status}>{selected.status}</span>
              <h2>{selected.title}</h2>
            </div>
            <button
              className={styles.button}
              disabled={detailsLoading}
              onClick={() => void openDetails(selected)}
            >
              {detailsLoading ? "Updating…" : "Refresh details"}
            </button>
          </div>

          {detailsError && (
            <p className={styles.error} role="alert">{detailsError}</p>
          )}

          <p className={styles.detailDescription}>{selected.description}</p>

          <dl className={styles.detailGrid}>
            <div>
              <dt>Starts</dt>
              <dd>{formatDate(selected.starts_at)} MYT</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{formatDate(selected.ends_at)} MYT</dd>
            </div>
            <div>
              <dt>Venue</dt>
              <dd>{selected.venue}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{selected.city}, {selected.country}</dd>
            </div>
            <div>
              <dt>Organiser</dt>
              <dd>{selected.organizer}</dd>
            </div>
            <div>
              <dt>Attendees</dt>
              <dd>{selected.attendee_count}</dd>
            </div>
          </dl>

          <div className={styles.tags}>
            {selected.topics.map((topic, index) => (
              <span key={`${topic}-${index}`}>{topic}</span>
            ))}
          </div>
        </section>
      )}

      {view === "history" && (
        <section aria-labelledby="history-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="history-heading">Your event history</h2>
              <p className={styles.muted}>
                Past attended events and the outcomes recorded for each.
              </p>
            </div>
            <button
              className={styles.button}
              disabled={loading}
              onClick={refresh}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {historyError && (
            <p className={styles.error} role="alert">{historyError}</p>
          )}

          {loading ? (
            <p className={styles.empty} role="status">Loading history…</p>
          ) : (
            <div className={styles.historyList}>
              {sortedHistory.map(({ event, outcomes }) => (
                <article className={styles.card} key={event.id}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <span className={styles.status}>Completed</span>
                      <h3>{event.title}</h3>
                      <p className={styles.muted}>
                        {formatDate(event.starts_at)} MYT · {event.city}
                      </p>
                    </div>
                    <button
                      className={styles.button}
                      onClick={() => void openDetails(event)}
                    >
                      Event details →
                    </button>
                  </div>

                  <div className={styles.outcomes}>
                    {OUTCOME_KEYS.map((key) => (
                      <div key={key}>
                        <span>{key}</span>
                        <strong>{outcomes[key]}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}

              {!sortedHistory.length && !historyError && (
                <p className={styles.empty}>
                  No past attended events yet.
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}