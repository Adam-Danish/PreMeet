"use client";

import { useState } from "react";

type Profile = {
  name: string;
  interests: string[];
  goals: string[];
};

type Attendee = Profile & {
  id: string;
  role: string;
};

type MeetingRequest = {
  id: string;
  recipient: Attendee;
  status: "pending";
};

const attendees: Attendee[] = [
  {
    id: "1",
    name: "Aisha Rahman",
    role: "AI Developer",
    interests: ["AI", "Python", "Startups"],
    goals: ["Find collaborators", "Build a product"],
  },
  {
    id: "2",
    name: "Daniel Lim",
    role: "Frontend Developer",
    interests: ["React", "Design", "Web development"],
    goals: ["Learn", "Find collaborators"],
  },
  {
    id: "3",
    name: "Sarah Tan",
    role: "Product Designer",
    interests: ["Design", "Startups", "Accessibility"],
    goals: ["Build a product", "Meet founders"],
  },
  {
    id: "4",
    name: "Amir Hassan",
    role: "Backend Developer",
    interests: ["Python", "AI", "Cloud"],
    goals: ["Find collaborators", "Learn"],
  },
  {
    id: "5",
    name: "Priya Kumar",
    role: "Startup Founder",
    interests: ["Startups", "AI", "Business"],
    goals: ["Meet founders", "Build a product"],
  },
  {
    id: "6",
    name: "Jason Wong",
    role: "Full Stack Developer",
    interests: ["React", "Python", "Web development"],
    goals: ["Find collaborators", "Build a product"],
  },
  {
    id: "7",
    name: "Nur Iman",
    role: "Data Scientist",
    interests: ["AI", "Data", "Python"],
    goals: ["Learn", "Find collaborators"],
  },
  {
    id: "8",
    name: "Kevin Lee",
    role: "Cloud Engineer",
    interests: ["Cloud", "Security", "Web development"],
    goals: ["Learn", "Meet founders"],
  },
  {
    id: "9",
    name: "Mei Chen",
    role: "UX Researcher",
    interests: ["Design", "Accessibility", "Business"],
    goals: ["Find collaborators", "Learn"],
  },
  {
    id: "10",
    name: "Farah Aziz",
    role: "Mobile Developer",
    interests: ["AI", "Design", "Startups"],
    goals: ["Build a product", "Learn"],
  },
];

function parseTags(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function sharedTags(first: string[], second: string[]) {
  const normalized = new Set(first.map((tag) => tag.toLowerCase()));
  return second.filter((tag) => normalized.has(tag.toLowerCase()));
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export default function Home() {
  const [tab, setTab] = useState<"discover" | "meetings">("discover");
  const [name, setName] = useState("");
  const [interests, setInterests] = useState("AI, Startups");
  const [goals, setGoals] = useState("Find collaborators, Learn");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<MeetingRequest[]>([]);
  const [notice, setNotice] = useState("");

  const matches = profile
    ? attendees
        .map((attendee) => {
          const commonInterests = sharedTags(profile.interests, attendee.interests);
          const commonGoals = sharedTags(profile.goals, attendee.goals);

          const interestScore =
            commonInterests.length / Math.max(profile.interests.length, 1);
          const goalScore =
            commonGoals.length / Math.max(profile.goals.length, 1);

          return {
            attendee,
            score: Math.round((interestScore * 0.6 + goalScore * 0.4) * 100),
            reason: commonInterests.length
              ? `You both enjoy ${commonInterests.join(", ")}. ${
                  commonGoals.length
                    ? `You also share the goal: ${commonGoals[0].toLowerCase()}.`
                    : "Explore how your different goals could complement each other."
                }`
              : commonGoals.length
                ? `You both want to ${commonGoals[0].toLowerCase()}.`
                : "A chance to connect with someone outside your usual interests.",
            starter: commonInterests.length
              ? `What are you currently exploring in ${commonInterests[0]}?`
              : `What inspired you to become a ${attendee.role.toLowerCase()}?`,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    : [];

  function requestMeeting(attendee: Attendee) {
    if (requests.some((request) => request.recipient.id === attendee.id)) return;

    setRequests((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        recipient: attendee,
        status: "pending",
      },
    ]);
    setNotice(`Meeting request sent to ${attendee.name}.`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <a href="/" className="flex items-center gap-3 text-xl font-bold">
            <span className="rounded-xl bg-teal-700 px-3 py-2 text-sm text-white">
              PM
            </span>
            PreMeet
          </a>

          <nav aria-label="Main navigation" className="flex gap-2">
            <button
              onClick={() => setTab("discover")}
              aria-pressed={tab === "discover"}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "discover"
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setTab("meetings")}
              aria-pressed={tab === "meetings"}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === "meetings"
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Meetings ({requests.length})
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-700">
            Your next connection starts here
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Meet the right people.
            <br />
            <span className="text-teal-700">Before the event.</span>
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-slate-600">
            Discover attendees who share your interests, start a conversation,
            and turn introductions into opportunities.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Interactive demo · Fictional attendees · Sample matching rules
          </p>
        </div>

        <p role="status" className="mb-4 min-h-6 text-sm text-teal-800">
          {notice}
        </p>

        {tab === "discover" ? (
          <div className="grid items-start gap-8 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold">Your profile</h2>
              <p className="mt-2 text-sm text-slate-500">
                Tell us what you want to explore.
              </p>

              <form
                className="mt-6 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    !name.trim() ||
                    !parseTags(interests).length ||
                    !parseTags(goals).length
                  ) {
                    setNotice("Please enter your name, interests, and goals.");
                    return;
                  }

                  setProfile({
                    name: name.trim(),
                    interests: parseTags(interests),
                    goals: parseTags(goals),
                  });
                  setNotice("Your matches are ready.");
                }}
              >
                <label className="block text-sm font-medium">
                  Your name
                  <input
                    required
                    maxLength={80}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Adam Danish"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Interests
                  <input
                    required
                    maxLength={300}
                    value={interests}
                    onChange={(event) => setInterests(event.target.value)}
                    placeholder="AI, React, Design"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Separate interests with commas.
                  </span>
                </label>

                <label className="block text-sm font-medium">
                  Networking goals
                  <textarea
                    required
                    maxLength={300}
                    rows={3}
                    value={goals}
                    onChange={(event) => setGoals(event.target.value)}
                    placeholder="Find collaborators, Learn"
                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-3"
                  />
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Separate goals with commas.
                  </span>
                </label>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800"
                >
                  Find my matches →
                </button>
              </form>
            </aside>

            <section aria-labelledby="matches-heading">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 id="matches-heading" className="text-2xl font-semibold">
                  {profile ? `${profile.name}’s top matches` : "Your top matches"}
                </h2>
                <span className="shrink-0 text-sm text-slate-500">
                  {matches.length} people
                </span>
              </div>

              {!profile ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                  <h3 className="text-lg font-semibold">
                    Great conversations start with a little context.
                  </h3>
                  <p className="mt-3 text-slate-500">
                    Complete your profile to discover your matches.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {matches.map(({ attendee, score, reason, starter }) => {
                    const requested = requests.some(
                      (request) => request.recipient.id === attendee.id,
                    );

                    return (
                      <article
                        key={attendee.id}
                        className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
                            {initials(attendee.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">{attendee.name}</h3>
                            <p className="text-sm text-slate-500">
                              {attendee.role}
                            </p>
                          </div>
                          <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">
                            {score}%
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {attendee.interests.map((interest) => (
                            <span
                              key={interest}
                              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>

                        <p className="mt-4 text-sm leading-6 text-slate-600">
                          {reason}
                        </p>

                        <div className="my-5 rounded-xl bg-teal-50 p-3">
                          <p className="text-xs font-semibold text-teal-800">
                            BREAK THE ICE
                          </p>
                          <p className="mt-1 text-sm leading-6 text-teal-900">
                            “{starter}”
                          </p>
                        </div>

                        <button
                          onClick={() => requestMeeting(attendee)}
                          disabled={requested}
                          className="mt-auto w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {requested ? "Request sent ✓" : "Request meeting"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="max-w-3xl" aria-labelledby="meetings-heading">
            <h2 id="meetings-heading" className="mb-6 text-2xl font-semibold">
              Your meeting requests
            </h2>

            {requests.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-slate-500">No meeting requests yet.</p>
                <button
                  onClick={() => setTab("discover")}
                  className="mt-4 font-semibold text-teal-700"
                >
                  Discover people →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <article
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {request.recipient.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {request.recipient.role}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-800">
                      Awaiting response
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-500">
        PreMeet · Make your first hello count.
      </footer>
    </div>
  );
}