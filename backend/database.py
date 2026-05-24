import sqlite3, os

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "rl_analyzer.db")

def get_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS replays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            replay_id TEXT,
            game_mode TEXT,
            map_name TEXT,
            duration REAL,
            overtime INTEGER DEFAULT 0,
            playlist TEXT,
            blue_name TEXT,
            orange_name TEXT,
            blue_goals INTEGER DEFAULT 0,
            orange_goals INTEGER DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS player_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            replay_id INTEGER REFERENCES replays(id),
            player_name TEXT,
            team TEXT,
            goals INTEGER DEFAULT 0,
            assists INTEGER DEFAULT 0,
            saves INTEGER DEFAULT 0,
            shots INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            shooting_pct REAL DEFAULT 0,
            boost_avg REAL DEFAULT 0,
            boost_collected INTEGER DEFAULT 0,
            boost_stolen INTEGER DEFAULT 0,
            count_big_pads INTEGER DEFAULT 0,
            count_small_pads INTEGER DEFAULT 0,
            boost_wasted_pct REAL DEFAULT 0,
            overfill_pct REAL DEFAULT 0,
            percent_zero_boost REAL DEFAULT 0,
            percent_full_boost REAL DEFAULT 0,
            avg_speed REAL DEFAULT 0,
            total_distance REAL DEFAULT 0,
            percent_supersonic REAL DEFAULT 0,
            time_slow_speed REAL DEFAULT 0,
            ground_pct REAL DEFAULT 0,
            air_pct REAL DEFAULT 0,
            time_high_air REAL DEFAULT 0,
            percent_offensive REAL DEFAULT 0,
            percent_defensive REAL DEFAULT 0,
            dist_ball REAL DEFAULT 0,
            dist_mates REAL DEFAULT 0,
            time_behind_ball REAL DEFAULT 0,
            time_infront_ball REAL DEFAULT 0,
            demos_inflicted INTEGER DEFAULT 0,
            demos_taken INTEGER DEFAULT 0,
            count_powerslide INTEGER DEFAULT 0,
            goals_against_last_defender INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS team_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            replay_id INTEGER REFERENCES replays(id),
            team_key TEXT,
            team_name TEXT,
            goals INTEGER DEFAULT 0,
            avg_boost REAL DEFAULT 0,
            avg_speed REAL DEFAULT 0,
            avg_dist_ball REAL DEFAULT 0,
            avg_dist_mates REAL DEFAULT 0,
            total_demos_inflicted INTEGER DEFAULT 0,
            total_demos_taken INTEGER DEFAULT 0,
            total_boost_collected INTEGER DEFAULT 0,
            total_shots INTEGER DEFAULT 0,
            total_saves INTEGER DEFAULT 0,
            total_assists INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_player_stats_name ON player_stats(player_name);
        CREATE INDEX IF NOT EXISTS idx_player_stats_replay ON player_stats(replay_id);
        CREATE INDEX IF NOT EXISTS idx_replays_mode ON replays(game_mode);
    """)
    conn.commit()
    conn.close()

def save_replay(replay_data, game_mode, players_analysis):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO replays (replay_id, game_mode, map_name, duration, overtime,
                            playlist, blue_name, orange_name, blue_goals, orange_goals)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        replay_data.get("id", ""),
        game_mode,
        replay_data.get("map_name", ""),
        replay_data.get("duration", 0),
        1 if replay_data.get("overtime") else 0,
        replay_data.get("playlist_name", ""),
        replay_data.get("blue", {}).get("name", "Blue"),
        replay_data.get("orange", {}).get("name", "Orange"),
        replay_data.get("blue", {}).get("goals", 0),
        replay_data.get("orange", {}).get("goals", 0),
    ))
    replay_pk = cursor.lastrowid

    for p in players_analysis:
        s = p["stats"]
        cursor.execute("""
            INSERT INTO player_stats (
                replay_id, player_name, team,
                goals, assists, saves, shots, score, shooting_pct,
                boost_avg, boost_collected, boost_stolen,
                count_big_pads, count_small_pads,
                boost_wasted_pct, overfill_pct,
                percent_zero_boost, percent_full_boost,
                avg_speed, total_distance, percent_supersonic, time_slow_speed,
                ground_pct, air_pct, time_high_air,
                percent_offensive, percent_defensive,
                dist_ball, dist_mates,
                time_behind_ball, time_infront_ball,
                demos_inflicted, demos_taken,
                count_powerslide, goals_against_last_defender
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            replay_pk, p["name"], p.get("team_key", ""),
            s["goals"], s["assists"], s["saves"], s["shots"], s["score"], s["shooting_pct"],
            s["boost_avg"], s["boost_collected"], s["boost_stolen"],
            s["count_big_pads"], s["count_small_pads"],
            s["boost_wasted_pct"], s["overfill_pct"],
            s["percent_zero_boost"], s["percent_full_boost"],
            s["avg_speed"], s["total_distance"], s["percent_supersonic"], s["time_slow_speed"],
            s["ground_pct"], s["air_pct"], s["time_high_air"],
            s["percent_offensive"], s["percent_defensive"],
            s["dist_ball"], s["dist_mates"],
            s["time_behind_ball"], s["time_infront_ball"],
            s["demos_inflicted"], s["demos_taken"],
            s["count_powerslide"], s["goals_against_last_defender"],
        ))

    if game_mode == "scrim":
        _save_team_stats(cursor, replay_pk, replay_data, players_analysis)

    conn.commit()
    conn.close()
    return replay_pk

def _save_team_stats(cursor, replay_pk, replay_data, players_analysis):
    teams = {"blue": [], "orange": []}
    for p in players_analysis:
        teams[p.get("team_key", "blue")].append(p)

    for team_key in ["blue", "orange"]:
        members = teams[team_key]
        if not members:
            continue
        team_name = replay_data.get(team_key, {}).get("name", team_key.title())
        team_goals = replay_data.get(team_key, {}).get("goals", 0)
        avg_b = sum(p["stats"]["boost_avg"] for p in members) / len(members)
        avg_sp = sum(p["stats"]["avg_speed"] for p in members) / len(members)
        avg_db = sum(p["stats"]["dist_ball"] for p in members) / len(members)
        avg_dm = sum(p["stats"]["dist_mates"] for p in members) / len(members)
        total_di = sum(p["stats"]["demos_inflicted"] for p in members)
        total_dt = sum(p["stats"]["demos_taken"] for p in members)
        total_bc = sum(p["stats"]["boost_collected"] for p in members)
        total_sh = sum(p["stats"]["shots"] for p in members)
        total_sv = sum(p["stats"]["saves"] for p in members)
        total_as = sum(p["stats"]["assists"] for p in members)

        cursor.execute("""
            INSERT INTO team_stats (replay_id, team_key, team_name, goals,
                avg_boost, avg_speed, avg_dist_ball, avg_dist_mates,
                total_demos_inflicted, total_demos_taken,
                total_boost_collected, total_shots, total_saves, total_assists)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (replay_pk, team_key, team_name, team_goals,
              round(avg_b, 1), round(avg_sp), round(avg_db), round(avg_dm),
              total_di, total_dt, total_bc, total_sh, total_sv, total_as))

def get_player_history(player_name, game_mode, limit=10):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ps.*, r.game_mode, r.map_name, r.uploaded_at,
               r.blue_goals, r.orange_goals, r.blue_name, r.orange_name
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = ? AND r.game_mode = ?
        ORDER BY r.uploaded_at DESC
        LIMIT ?
    """, (player_name, game_mode, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_player_names(game_mode):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT ps.player_name
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE r.game_mode = ?
        ORDER BY ps.player_name
    """, (game_mode,))
    rows = [r["player_name"] for r in cursor.fetchall()]
    conn.close()
    return rows

def get_team_stats_for_replay(replay_pk):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM team_stats WHERE replay_id = ?", (replay_pk,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
