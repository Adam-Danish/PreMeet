CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    org TEXT NOT NULL,
    country TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('startup', 'investor', 'corporate', 'government')),
    sector TEXT NOT NULL,
    looking_for TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_outcomes (
    founder TEXT NOT NULL,
    id TEXT NOT NULL REFERENCES profiles(id),
    stage TEXT NOT NULL CHECK (stage IN ('none', 'meeting', 'pilot', 'deal')),
    PRIMARY KEY (founder, id)
);

-- shortcut: One demo founder's log; add founder_id before supporting multiple users.
CREATE TABLE IF NOT EXISTS outcomes (
    id TEXT PRIMARY KEY REFERENCES profiles(id),
    stage TEXT NOT NULL CHECK (stage IN ('none', 'meeting', 'pilot', 'deal'))
);
