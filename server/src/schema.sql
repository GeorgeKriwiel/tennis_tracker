CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  elo INT NOT NULL DEFAULT 1200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  played_on DATE NOT NULL,
  player_a_id INT NOT NULL REFERENCES players(id),
  player_b_id INT NOT NULL REFERENCES players(id),
  sets JSONB NOT NULL,
  winner_id INT NOT NULL REFERENCES players(id),
  player_a_elo_after INT NOT NULL,
  player_b_elo_after INT NOT NULL,
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- deleted_at is unused: it belonged to a short-lived soft-delete design (removing a player now deletes their matches). Safe to drop later.
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS players_active_name_key ON players (name) WHERE deleted_at IS NULL;
