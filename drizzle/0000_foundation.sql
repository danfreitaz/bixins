CREATE TABLE IF NOT EXISTS properties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL UNIQUE,
 state jsonb NOT NULL, credits integer NOT NULL DEFAULT 600 CHECK (credits >= 0),
 version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS game_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES properties(owner_id),
 idempotency_key uuid NOT NULL, kind text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS economy_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL REFERENCES properties(owner_id),
 reference text NOT NULL, delta integer NOT NULL, balance_after integer NOT NULL CHECK(balance_after>=0), kind text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,reference)
);
CREATE INDEX IF NOT EXISTS actions_created_at ON game_actions(created_at);
