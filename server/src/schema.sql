CREATE TABLE IF NOT EXISTS players (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  elo INT NOT NULL DEFAULT 1200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  played_on DATE NOT NULL,
  player_a_id INT NOT NULL,
  player_b_id INT NOT NULL,
  sets JSON NOT NULL,
  winner_id INT NOT NULL,
  player_a_elo_after INT NOT NULL,
  player_b_elo_after INT NOT NULL,
  notes VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_a_id) REFERENCES players(id),
  FOREIGN KEY (player_b_id) REFERENCES players(id),
  FOREIGN KEY (winner_id) REFERENCES players(id)
);
