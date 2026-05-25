import sqlite3, os

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "rl_analyzer.db")

def get_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

from werkzeug.security import generate_password_hash, check_password_hash

def _generate_hash_tag(conn):
    import random
    for _ in range(100):
        tag = str(random.randint(1000, 9999))
        if not conn.execute("SELECT id FROM users WHERE hash_tag = ?", (tag,)).fetchone():
            return tag
    return str(random.randint(1000, 9999))

def create_user(username, password=None, steam_id=None, epic_id=None):
    conn = get_db()
    try:
        tag = _generate_hash_tag(conn)
        # First user becomes admin automatically
        is_first = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0
        is_admin = 1 if is_first else 0
        if steam_id:
            conn.execute("INSERT INTO users (username, steam_id, hash_tag, is_admin) VALUES (?, ?, ?, ?)",
                          (username, steam_id, tag, is_admin))
        elif epic_id:
            conn.execute("INSERT INTO users (username, epic_id, hash_tag, is_admin) VALUES (?, ?, ?, ?)",
                          (username, epic_id, tag, is_admin))
        else:
            conn.execute("INSERT INTO users (username, password, hash_tag, is_admin) VALUES (?, ?, ?, ?)",
                          (username, generate_password_hash(password), tag, is_admin))
        conn.commit()
        uid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        return uid
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def get_user_by_steam(steam_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users WHERE steam_id = ?", (steam_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_epic(epic_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username FROM users WHERE epic_id = ?", (epic_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def verify_user(username, password):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT password FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row and check_password_hash(row["password"], password):
        return True
    return False

def get_user_history(user_id, limit=20):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*, ps.player_name, ps.goals, ps.assists, ps.saves, ps.score,
               ps.shooting_pct, ps.boost_avg
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = ? AND ps.player_name = r.user_player_name
        ORDER BY r.uploaded_at DESC LIMIT ?
    """, (user_id, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def update_last_replay_player_name(user_id, player_name):
    conn = get_db()
    conn.execute("UPDATE replays SET user_player_name = ? WHERE user_id = ? AND id = (SELECT MAX(id) FROM replays WHERE user_id = ?)", (player_name, user_id, user_id))
    conn.commit()
    conn.close()

def set_user_display_name(user_id, player_name):
    conn = get_db()
    conn.execute("UPDATE users SET display_name = ? WHERE id = ?", (player_name, user_id))
    conn.commit()
    conn.close()

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT,
            steam_id TEXT UNIQUE,
            epic_id TEXT UNIQUE,
            hash_tag TEXT DEFAULT '',
            display_name TEXT,
            avatar TEXT,
            bio TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS replays (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            replay_id TEXT UNIQUE,
            game_mode TEXT,
            map_name TEXT,
            duration REAL,
            overtime INTEGER DEFAULT 0,
            playlist TEXT,
            blue_name TEXT,
            orange_name TEXT,
            blue_goals INTEGER DEFAULT 0,
            orange_goals INTEGER DEFAULT 0,
            user_id INTEGER,
            user_player_name TEXT,
            file_path TEXT,
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
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(id),
            preferred_mode TEXT DEFAULT '3v3',
            auto_link_player INTEGER DEFAULT 0,
            show_team_analysis INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS page_visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT,
            user_id INTEGER,
            ip TEXT,
            user_agent TEXT,
            visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_player_stats_name ON player_stats(player_name);
        CREATE INDEX IF NOT EXISTS idx_player_stats_replay ON player_stats(replay_id);
        CREATE INDEX IF NOT EXISTS idx_replays_mode ON replays(game_mode);
        CREATE INDEX IF NOT EXISTS idx_replays_user ON replays(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_hash_tag ON users(hash_tag);
    """)
    # Migrations for old databases (add missing columns/tables)
    try:
        conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("CREATE TABLE IF NOT EXISTS page_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT, user_id INTEGER, ip TEXT, user_agent TEXT, visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    except sqlite3.OperationalError:
        pass
    try:
        conn.execute("CREATE TABLE IF NOT EXISTS user_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE REFERENCES users(id), preferred_mode TEXT DEFAULT '3v3', auto_link_player INTEGER DEFAULT 0, show_team_analysis INTEGER DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

def get_replay_by_id(replay_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM replays WHERE replay_id = ?", (replay_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def save_replay(replay_data, game_mode, players_analysis, user_id=None, user_player_name=None, file_path=None):
    conn = get_db()
    cursor = conn.cursor()

    # Check if replay already exists (duplicate)
    replay_id = replay_data.get("id", "")
    if replay_id:
        existing = cursor.execute("SELECT id FROM replays WHERE replay_id = ?", (replay_id,)).fetchone()
        if existing:
            conn.close()
            return existing[0]

    # Calculate team goals from player stats (more reliable than API)
    team_goals = {"blue": 0, "orange": 0}
    for p in players_analysis:
        tk = p.get("team_key", "blue")
        team_goals[tk] = team_goals.get(tk, 0) + p["stats"]["goals"]

    cursor.execute("""
        INSERT INTO replays (replay_id, game_mode, map_name, duration, overtime,
                            playlist, blue_name, orange_name, blue_goals, orange_goals,
                            user_id, user_player_name, file_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        replay_id,
        game_mode,
        replay_data.get("map_name", ""),
        replay_data.get("duration", 0),
        1 if replay_data.get("overtime") else 0,
        replay_data.get("playlist_name", ""),
        replay_data.get("blue", {}).get("name", "Blue"),
        replay_data.get("orange", {}).get("name", "Orange"),
        team_goals.get("blue", 0),
        team_goals.get("orange", 0),
        user_id,
        user_player_name,
        file_path,
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

    if game_mode in ("scrim", "3v3"):
        _save_team_stats(cursor, replay_pk, replay_data, players_analysis)

    conn.commit()
    conn.close()
    return replay_pk

def _save_team_stats(cursor, replay_pk, replay_data, players_analysis):
    teams = {"blue": [], "orange": []}
    for p in players_analysis:
        teams[p.get("team_key", "blue")].append(p)

    team_goals_map = {}
    for tk, members in teams.items():
        team_goals_map[tk] = sum(p["stats"]["goals"] for p in members)

    for team_key in ["blue", "orange"]:
        members = teams[team_key]
        if not members:
            continue
        team_name = replay_data.get(team_key, {}).get("name", team_key.title())
        team_goals = team_goals_map.get(team_key, 0)
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

# ── USER SETTINGS ──────────────────────
def get_user_settings(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO user_settings (user_id) VALUES (?)", (user_id,))
        conn.commit()
        cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def update_user_settings(user_id, settings):
    conn = get_db()
    allowed = {"preferred_mode", "auto_link_player", "show_team_analysis"}
    updates = {k: v for k, v in settings.items() if k in allowed}
    if updates:
        sets = ", ".join(f"{k} = ?" for k in updates)
        vals = list(updates.values()) + [user_id]
        conn.execute(f"UPDATE user_settings SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?", vals)
        conn.commit()
    conn.close()

# ── USER AGGREGATED STATS ──────────────
def get_user_aggregated_stats(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COUNT(DISTINCT r.id) AS total_replays,
            COUNT(DISTINCT r.game_mode) AS modes_played,
            SUM(ps.goals) AS total_goals,
            SUM(ps.assists) AS total_assists,
            SUM(ps.saves) AS total_saves,
            SUM(ps.shots) AS total_shots,
            SUM(ps.score) AS total_score,
            AVG(ps.shooting_pct) AS avg_shooting_pct,
            AVG(ps.boost_avg) AS avg_boost,
            AVG(ps.avg_speed) AS avg_speed,
            AVG(ps.percent_offensive) AS avg_offensive,
            AVG(ps.percent_defensive) AS avg_defensive,
            SUM(ps.demos_inflicted) AS total_demos,
            SUM(ps.demos_taken) AS total_demos_taken,
            AVG(ps.percent_supersonic) AS avg_supersonic,
            AVG(ps.dist_ball) AS avg_dist_ball,
            AVG(ps.dist_mates) AS avg_dist_mates
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = ? AND ps.player_name = r.user_player_name
    """, (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {}

def get_user_recent_replays(user_id, limit=10):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.*, ps.player_name, ps.goals, ps.assists, ps.saves, ps.score,
               ps.shooting_pct, ps.boost_avg
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = ? AND ps.player_name = r.user_player_name
        ORDER BY r.uploaded_at DESC LIMIT ?
    """, (user_id, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def update_user_profile(user_id, display_name=None, avatar=None, bio=None):
    conn = get_db()
    updates = {}
    if display_name is not None: updates["display_name"] = display_name
    if avatar is not None: updates["avatar"] = avatar
    if bio is not None: updates["bio"] = bio
    if updates:
        sets = ", ".join(f"{k} = ?" for k in updates)
        vals = list(updates.values()) + [user_id]
        conn.execute(f"UPDATE users SET {sets} WHERE id = ?", vals)
        conn.commit()
    conn.close()

# ── PLAYER SEARCH ─────────────────────────
def search_players(query, limit=20):
    conn = get_db()
    cursor = conn.cursor()
    like = f"%{query}%"
    cursor.execute("""
        SELECT player_name, total_games, total_goals, total_assists, total_saves, avg_score, source FROM (
            SELECT ps.player_name,
                   COUNT(r.id) AS total_games,
                   SUM(ps.goals) AS total_goals,
                   SUM(ps.assists) AS total_assists,
                   SUM(ps.saves) AS total_saves,
                   AVG(ps.score) AS avg_score,
                   'player' AS source
            FROM player_stats ps
            JOIN replays r ON ps.replay_id = r.id
            WHERE ps.player_name LIKE ? COLLATE NOCASE
            GROUP BY ps.player_name

            UNION ALL

            SELECT IFNULL(display_name, username) AS player_name,
                   0 AS total_games,
                   0 AS total_goals,
                   0 AS total_assists,
                   0 AS total_saves,
                   0 AS avg_score,
                   'user' AS source
            FROM users
            WHERE (display_name LIKE ? COLLATE NOCASE OR username LIKE ? COLLATE NOCASE)
              AND display_name IS NOT NULL
        ) combined
        ORDER BY total_games DESC, player_name ASC
        LIMIT ?
    """, (like, like, like, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_replay_file_path(replay_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path, map_name FROM replays WHERE replay_id = ?", (replay_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_replays_for_player(player_name, limit=50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.replay_id, r.map_name, r.game_mode, r.uploaded_at,
               r.blue_goals, r.orange_goals,
               ps.goals, ps.assists, ps.saves, ps.score, ps.team
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = ?
        ORDER BY r.uploaded_at DESC LIMIT ?
    """, (player_name, limit))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_player_full_profile(player_name):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            COUNT(*) AS total_games,
            SUM(ps.goals) AS total_goals,
            SUM(ps.assists) AS total_assists,
            SUM(ps.saves) AS total_saves,
            SUM(ps.shots) AS total_shots,
            AVG(ps.score) AS avg_score,
            AVG(ps.shooting_pct) AS avg_shooting_pct,
            AVG(ps.boost_avg) AS avg_boost,
            AVG(ps.avg_speed) AS avg_speed,
            AVG(ps.percent_offensive) AS avg_offensive,
            AVG(ps.percent_defensive) AS avg_defensive,
            AVG(ps.percent_supersonic) AS avg_supersonic
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = ?
    """, (player_name,))
    stats = dict(cursor.fetchone())
    cursor.execute("""
        SELECT r.game_mode, r.map_name, r.uploaded_at, r.blue_goals, r.orange_goals,
               ps.goals, ps.assists, ps.saves, ps.score, ps.team
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = ?
        ORDER BY r.uploaded_at DESC LIMIT 20
    """, (player_name,))
    games = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return stats, games

def record_visit(path, user_id=None, ip=None, user_agent=None):
    conn = get_db()
    conn.execute("INSERT INTO page_visits (path, user_id, ip, user_agent) VALUES (?, ?, ?, ?)",
                 (path, user_id, ip, user_agent))
    conn.commit()
    conn.close()

def get_admin_stats():
    conn = get_db()
    cursor = conn.cursor()
    # Total users
    cursor.execute("SELECT COUNT(*) AS total FROM users")
    total_users = cursor.fetchone()["total"]
    # Users today
    cursor.execute("SELECT COUNT(*) AS total FROM users WHERE date(created_at) = date('now')")
    users_today = cursor.fetchone()["total"]
    # Total visits
    cursor.execute("SELECT COUNT(*) AS total FROM page_visits")
    total_visits = cursor.fetchone()["total"]
    # Visits today
    cursor.execute("SELECT COUNT(*) AS total FROM page_visits WHERE date(visited_at) = date('now')")
    visits_today = cursor.fetchone()["total"]
    # Unique visitors today
    cursor.execute("SELECT COUNT(DISTINCT COALESCE(user_id, ip)) AS total FROM page_visits WHERE date(visited_at) = date('now')")
    unique_today = cursor.fetchone()["total"]
    # Visits per day (last 14 days)
    cursor.execute("""
        SELECT date(visited_at) AS day, COUNT(*) AS count,
               COUNT(DISTINCT COALESCE(user_id, ip)) AS uniques
        FROM page_visits
        WHERE visited_at >= date('now', '-14 days')
        GROUP BY date(visited_at)
        ORDER BY day DESC
    """)
    visits_per_day = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {
        "total_users": total_users,
        "users_today": users_today,
        "total_visits": total_visits,
        "visits_today": visits_today,
        "unique_today": unique_today,
        "visits_per_day": visits_per_day,
    }

def get_admin_users():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.username, u.display_name, u.hash_tag, u.created_at,
               (SELECT COUNT(*) FROM replays WHERE user_id = u.id) AS replay_count,
               (SELECT MAX(visited_at) FROM page_visits WHERE user_id = u.id) AS last_visit
        FROM users u
        ORDER BY u.created_at DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
