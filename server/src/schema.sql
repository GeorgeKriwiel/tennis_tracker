CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  elo INT NOT NULL DEFAULT 1200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- A "match" is a single set OR a single tiebreak (match_type), standalone rows of
-- equal standing — never a set containing a tiebreak. score_a / score_b are games
-- won (set) or points won (tiebreak). winner_id is NULL for a draw (equal games;
-- a tiebreak can never draw, enforced in matchInput.ts, so it's always set there).
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  played_on DATE NOT NULL,
  player_a_id INT NOT NULL REFERENCES players(id),
  player_b_id INT NOT NULL REFERENCES players(id),
  score_a INT NOT NULL,
  score_b INT NOT NULL,
  match_type VARCHAR(10) NOT NULL DEFAULT 'set' CHECK (match_type IN ('set', 'tiebreak')),
  winner_id INT REFERENCES players(id),
  player_a_elo_after INT NOT NULL,
  player_b_elo_after INT NOT NULL,
  park VARCHAR(100),
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Upgrades from earlier versions of this table.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS park VARCHAR(100);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_a INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score_b INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type VARCHAR(10) NOT NULL DEFAULT 'set';
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_match_type_check;
ALTER TABLE matches ADD CONSTRAINT matches_match_type_check CHECK (match_type IN ('set', 'tiebreak'));

DO $$
BEGIN
  -- Old multi-set format: keep the first set's score, then drop the sets column.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'sets'
  ) THEN
    UPDATE matches
    SET score_a = (sets->0->>'playerA')::int, score_b = (sets->0->>'playerB')::int
    WHERE score_a IS NULL;
    ALTER TABLE matches DROP COLUMN sets;
  END IF;
END $$;

ALTER TABLE matches ALTER COLUMN score_a SET NOT NULL;
ALTER TABLE matches ALTER COLUMN score_b SET NOT NULL;
ALTER TABLE matches ALTER COLUMN winner_id DROP NOT NULL;

-- deleted_at is unused: it belonged to a short-lived soft-delete design (removing a player now deletes their matches). Safe to drop later.
ALTER TABLE players ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS players_active_name_key ON players (name) WHERE deleted_at IS NULL;

-- One-off: matches imported from the results spreadsheet stored their park in notes.
-- Move those into the park column (only exact park names from that import; idempotent).
UPDATE matches SET park = notes, notes = NULL
WHERE park IS NULL AND notes IN ('Willamette Park', 'Grant Park', 'Irving Park', 'Gabriel Park');
