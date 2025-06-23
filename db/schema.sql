CREATE TABLE crossy_road_elo_rankings (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    elo INT DEFAULT 1200,
    country TEXT DEFAULT 'United States',
    games INT DEFAULT 0,
    won INT DEFAULT 0,
    flag TEXT DEFAULT 'us',
    modified INT DEFAULT 0,
    rank INT DEFAULT 0
)

CREATE TABLE crossy_road_games (
    game_id SERIAL PRIMARY KEY,
    id TEXT NOT NULL,
    tournament TEXT NOT NULL,
    place INT NOT NULL,
    score INT DEFAULT 0,
    change INT DEFAULT 0,
    elo INT DEFAULT 1200,
    tournaments INT DEFAULT 0,
    played INT DEFAULT 0,
    won INT DEFAULT 0,
    img TEXT,
    FOREIGN KEY (id) REFERENCES crossy_road_elo_rankings(id)
)

CREATE TABLE crossy_road_records (
    id SERIAL PRIMARY KEY,
    rank INT NOT NULL,
    name TEXT NOT NULL,
    score INT NOT NULL,
    date DATE NOT NULL,
    titles INT NOT NULL,
    video_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    flag TEXT NOT NULL
)

CREATE TABLE crossy_road_tournaments (
    tournament_number SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    winner TEXT NOT NULL,
    bracket_url TEXT,
    bracket_url2 TEXT,
    winner_country TEXT NOT NULL,
    tournament_logo TEXT NOT NULL
)

CREATE TABLE crossy_road_challenges (
    challenge_id SERIAL PRIMARY KEY,
    created	TEXT NOT NULL,
    message_id TEXT NOT NULL,
    challenger_id TEXT NOT NULL,
    opponent_id	TEXT NOT NULL,
    winner_id TEXT NOT NULL,
    challenger_initial_elo INT NOT NULL,
    challenger_final_elo INT NOT NULL,
    challenger_score INT NOT NULL,
    opponent_initial_elo INT NOT NULL,
    opponent_final_elo INT NOT NULL,
    opponent_score INT NOT NULL
)

CREATE TABLE crossy_road_runs (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created TEXT NOT NULL,
    message_id TEXT NOT NULL,
    run_attempts INT NOT  NULL,
    actions INT NOT NULL
)