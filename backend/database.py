import os, re, sqlite3
from werkzeug.security import generate_password_hash, check_password_hash

DB_DIR = os.path.join(os.path.dirname(__file__), "data")
DB_PATH = os.path.join(DB_DIR, "rl_analyzer.db")
USE_PG = "DATABASE_URL" in os.environ

def get_db():
    if USE_PG:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        conn.autocommit = True
        return conn
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _c(conn, sql, params=None):
    if USE_PG:
        import psycopg2.extras
        sql = _adapt(sql)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if params: cur.execute(sql, params)
        else: cur.execute(sql)
        return _Result(cur)
    if params: return _Result(conn.execute(sql, params))
    return _Result(conn.execute(sql))

def _script(conn, sql):
    if USE_PG:
        for stmt in sql.split(";"):
            stmt = _adapt(stmt.strip())
            if stmt:
                try:
                    conn.cursor().execute(stmt)
                except Exception:
                    pass
    else:
        conn.executescript(sql)

def _adapt(sql):
    sql = sql.replace("?", "%s")
    sql = sql.replace("LIKE ? COLLATE NOCASE", "ILIKE %s")
    sql = sql.replace(" COLLATE NOCASE", "")
    sql = re.sub(r'(?i)\bIFNULL\(', 'COALESCE(', sql)
    sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    sql = sql.replace("date('now')", "CURRENT_DATE")
    sql = sql.replace("date('now', '-14 days')", "CURRENT_DATE - INTERVAL '14 days'")
    return sql

class _Result:
    def __init__(self, cur):
        self._cur = cur
    def fetchone(self): return self._cur.fetchone()
    def fetchall(self): return [dict(r) for r in self._cur.fetchall()]

def _last_id(conn, table="users"):
    if USE_PG:
        return _c(conn, f"SELECT LASTVAL() AS id").fetchone()["id"]
    return _c(conn, "SELECT last_insert_rowid() AS id").fetchone()["id"]

def _generate_hash_tag(conn):
    import random
    for _ in range(100):
        tag = str(random.randint(1000, 9999))
        if not _c(conn, "SELECT id FROM users WHERE hash_tag = %s", (tag,)).fetchone():
            return tag
    return str(random.randint(1000, 9999))

def create_user(username, password=None, steam_id=None, epic_id=None):
    conn = get_db()
    try:
        tag = _generate_hash_tag(conn)
        is_first = _c(conn, "SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"] == 0
        is_admin = 1 if is_first else 0
        if steam_id:
            _c(conn, "INSERT INTO users (username, steam_id, hash_tag, is_admin) VALUES (%s, %s, %s, %s)",
                  (username, steam_id, tag, is_admin))
        elif epic_id:
            _c(conn, "INSERT INTO users (username, epic_id, hash_tag, is_admin) VALUES (%s, %s, %s, %s)",
                  (username, epic_id, tag, is_admin))
        else:
            _c(conn, "INSERT INTO users (username, password, hash_tag, is_admin) VALUES (%s, %s, %s, %s)",
                  (username, generate_password_hash(password), tag, is_admin))
        conn.commit()
        uid = _last_id(conn)
        return uid
    except Exception:
        return None
    finally:
        conn.close()

def get_user_by_steam(steam_id):
    conn = get_db()
    row = _c(conn, "SELECT id, username FROM users WHERE steam_id = %s", (steam_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_epic(epic_id):
    conn = get_db()
    row = _c(conn, "SELECT id, username FROM users WHERE epic_id = %s", (epic_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def verify_user(username, password):
    conn = get_db()
    row = _c(conn, "SELECT password FROM users WHERE username = %s", (username,)).fetchone()
    conn.close()
    if row and check_password_hash(row["password"], password):
        return True
    return False

def get_user_history(user_id, limit=20):
    conn = get_db()
    sql = """
        SELECT r.*, ps.player_name, ps.goals, ps.assists, ps.saves, ps.score,
               ps.shooting_pct, ps.boost_avg
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = %s AND ps.player_name = r.user_player_name
        ORDER BY r.uploaded_at DESC LIMIT %s
    """
    rows = _c(conn, sql, (user_id, limit)).fetchall()
    conn.close()
    return rows

def update_last_replay_player_name(user_id, player_name):
    conn = get_db()
    sql = "UPDATE replays SET user_player_name = %s WHERE user_id = %s AND id = (SELECT MAX(id) FROM replays WHERE user_id = %s)"
    _c(conn, sql, (player_name, user_id, user_id))
    conn.commit()
    conn.close()

def set_user_display_name(user_id, player_name):
    conn = get_db()
    _c(conn, "UPDATE users SET display_name = %s WHERE id = %s", (player_name, user_id))
    conn.commit()
    conn.close()

def init_db():
    conn = get_db()
    _script(conn, """
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
            country TEXT DEFAULT '',
            primary_platform TEXT DEFAULT '',
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
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            achievement_id TEXT NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # Indexes
    for idx in [
        "CREATE INDEX IF NOT EXISTS idx_player_stats_name ON player_stats(player_name)",
        "CREATE INDEX IF NOT EXISTS idx_player_stats_replay ON player_stats(replay_id)",
        "CREATE INDEX IF NOT EXISTS idx_replays_mode ON replays(game_mode)",
        "CREATE INDEX IF NOT EXISTS idx_replays_user ON replays(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_users_hash_tag ON users(hash_tag)",
    ]:
        try: _c(conn, idx)
        except: pass
    # Unique constraint for achievements
    try:
        _c(conn, "CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique ON achievements(user_id, achievement_id)")
    except:
        pass
    # XP column migration
    try:
        _c(conn, "ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0")
    except:
        pass
    conn.commit()
    conn.close()

def get_replay_by_id(replay_id):
    conn = get_db()
    row = _c(conn, "SELECT * FROM replays WHERE replay_id = %s", (replay_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def save_replay(replay_data, game_mode, players_analysis, user_id=None, user_player_name=None, file_path=None):
    conn = get_db()

    replay_id = replay_data.get("id", "")
    if replay_id:
        existing = _c(conn, "SELECT id FROM replays WHERE replay_id = %s", (replay_id,)).fetchone()
        if existing:
            conn.close()
            return existing["id"]

    team_goals = {"blue": 0, "orange": 0}
    for p in players_analysis:
        tk = p.get("team_key", "blue")
        team_goals[tk] = team_goals.get(tk, 0) + p["stats"]["goals"]

    sql = """
        INSERT INTO replays (replay_id, game_mode, map_name, duration, overtime,
                            playlist, blue_name, orange_name, blue_goals, orange_goals,
                            user_id, user_player_name, file_path)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    _c(conn, sql, (
        replay_id, game_mode, replay_data.get("map_name", ""),
        replay_data.get("duration", 0),
        1 if replay_data.get("overtime") else 0,
        replay_data.get("playlist_name", ""),
        replay_data.get("blue", {}).get("name", "Blue"),
        replay_data.get("orange", {}).get("name", "Orange"),
        team_goals.get("blue", 0),
        team_goals.get("orange", 0),
        user_id, user_player_name, file_path,
    ))
    replay_pk = _last_id(conn, "replays")

    for p in players_analysis:
        s = p["stats"]
        _c(conn, """
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
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
        _save_team_stats(conn, replay_pk, replay_data, players_analysis)

    conn.commit()
    conn.close()
    return replay_pk

def _save_team_stats(conn, replay_pk, replay_data, players_analysis):
    teams = {"blue": [], "orange": []}
    for p in players_analysis:
        teams[p.get("team_key", "blue")].append(p)
    team_goals_map = {}
    for tk, members in teams.items():
        team_goals_map[tk] = sum(p["stats"]["goals"] for p in members)
    for team_key in ["blue", "orange"]:
        members = teams[team_key]
        if not members: continue
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
        _c(conn, """
            INSERT INTO team_stats (replay_id, team_key, team_name, goals,
                avg_boost, avg_speed, avg_dist_ball, avg_dist_mates,
                total_demos_inflicted, total_demos_taken,
                total_boost_collected, total_shots, total_saves, total_assists)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (replay_pk, team_key, team_name, team_goals,
              round(avg_b, 1), round(avg_sp), round(avg_db), round(avg_dm),
              total_di, total_dt, total_bc, total_sh, total_sv, total_as))

def get_player_history(player_name, game_mode, limit=10):
    conn = get_db()
    sql = """
        SELECT ps.*, r.game_mode, r.map_name, r.uploaded_at,
               r.blue_goals, r.orange_goals, r.blue_name, r.orange_name
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = %s AND r.game_mode = %s
        ORDER BY r.uploaded_at DESC LIMIT %s
    """
    rows = _c(conn, sql, (player_name, game_mode, limit)).fetchall()
    conn.close()
    return rows

def get_player_names(game_mode):
    conn = get_db()
    sql = """
        SELECT DISTINCT ps.player_name
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE r.game_mode = %s
        ORDER BY ps.player_name
    """
    rows = _c(conn, sql, (game_mode,)).fetchall()
    conn.close()
    return [r["player_name"] for r in rows]

def get_team_stats_for_replay(replay_pk):
    conn = get_db()
    rows = _c(conn, "SELECT * FROM team_stats WHERE replay_id = %s", (replay_pk,)).fetchall()
    conn.close()
    return rows

def get_user_settings(user_id):
    conn = get_db()
    row = _c(conn, "SELECT * FROM user_settings WHERE user_id = %s", (user_id,)).fetchone()
    if not row:
        _c(conn, "INSERT INTO user_settings (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        row = _c(conn, "SELECT * FROM user_settings WHERE user_id = %s", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}

def update_user_settings(user_id, settings):
    conn = get_db()
    allowed = {"preferred_mode", "auto_link_player", "show_team_analysis"}
    updates = {k: v for k, v in settings.items() if k in allowed}
    if updates:
        ph = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [user_id]
        _c(conn, f"UPDATE user_settings SET {ph}, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s", vals)
        conn.commit()
    conn.close()

def award_xp(user_id, goals=0, assists=0, saves=0, score=0, won=False):
    xp = 100  # base
    xp += goals * 25
    xp += assists * 15
    xp += saves * 10
    if score > 500: xp += 30
    if won: xp += 50
    conn = get_db()
    _c(conn, "UPDATE users SET xp = COALESCE(xp, 0) + %s WHERE id = %s", (xp, user_id))
    conn.commit()
    # Fetch new xp
    row = _c(conn, "SELECT xp FROM users WHERE id = %s", (user_id,)).fetchone()
    conn.close()
    total_xp = row["xp"] if row else 0
    level = total_xp // 1000 + 1
    progress = total_xp % 1000
    return {"xp_awarded": xp, "total_xp": total_xp, "level": level, "progress": progress}

def get_user_aggregated_stats(user_id):
    conn = get_db()
    sql = """
        SELECT
            COUNT(DISTINCT r.id) AS total_replays,
            COUNT(DISTINCT r.game_mode) AS modes_played,
            COALESCE(SUM(ps.goals), 0) AS total_goals,
            COALESCE(SUM(ps.assists), 0) AS total_assists,
            COALESCE(SUM(ps.saves), 0) AS total_saves,
            COALESCE(SUM(ps.shots), 0) AS total_shots,
            COALESCE(SUM(ps.score), 0) AS total_score,
            AVG(ps.shooting_pct) AS avg_shooting_pct,
            AVG(ps.boost_avg) AS avg_boost,
            AVG(ps.avg_speed) AS avg_speed,
            AVG(ps.percent_offensive) AS avg_offensive,
            AVG(ps.percent_defensive) AS avg_defensive,
            COALESCE(SUM(ps.demos_inflicted), 0) AS total_demos,
            COALESCE(SUM(ps.demos_taken), 0) AS total_demos_taken,
            AVG(ps.percent_supersonic) AS avg_supersonic,
            AVG(ps.dist_ball) AS avg_dist_ball,
            AVG(ps.dist_mates) AS avg_dist_mates
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = %s AND ps.player_name = r.user_player_name
    """
    row = _c(conn, sql, (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}

def get_user_recent_replays(user_id, limit=10):
    conn = get_db()
    sql = """
        SELECT r.*, ps.player_name, ps.goals, ps.assists, ps.saves, ps.score,
               ps.shooting_pct, ps.boost_avg
        FROM replays r
        JOIN player_stats ps ON ps.replay_id = r.id
        WHERE r.user_id = %s AND ps.player_name = r.user_player_name
        ORDER BY r.uploaded_at DESC LIMIT %s
    """
    rows = _c(conn, sql, (user_id, limit)).fetchall()
    conn.close()
    return rows

def update_user_profile(user_id, display_name=None, avatar=None, bio=None, country=None, primary_platform=None):
    conn = get_db()
    updates = {}
    if display_name is not None: updates["display_name"] = display_name
    if avatar is not None: updates["avatar"] = avatar
    if bio is not None: updates["bio"] = bio
    if country is not None: updates["country"] = country
    if primary_platform is not None: updates["primary_platform"] = primary_platform
    if updates:
        ph = ", ".join(f"{k} = %s" for k in updates)
        vals = list(updates.values()) + [user_id]
        _c(conn, f"UPDATE users SET {ph} WHERE id = %s", vals)
        conn.commit()
    conn.close()

def search_players(query, limit=20):
    conn = get_db()
    like = f"%{query}%"
    # Use ILIKE for PG, LIKE COLLATE NOCASE for SQLite
    like_clause = "ILIKE %s" if USE_PG else "LIKE ? COLLATE NOCASE"
    sql = f"""
        SELECT player_name, total_games, total_goals, total_assists, total_saves, avg_score, source FROM (
            SELECT ps.player_name,
                   COUNT(r.id) AS total_games,
                   COALESCE(SUM(ps.goals), 0) AS total_goals,
                   COALESCE(SUM(ps.assists), 0) AS total_assists,
                   COALESCE(SUM(ps.saves), 0) AS total_saves,
                   AVG(ps.score) AS avg_score,
                   'player' AS source
            FROM player_stats ps
            JOIN replays r ON ps.replay_id = r.id
            WHERE ps.player_name {like_clause}
            GROUP BY ps.player_name

            UNION ALL

            SELECT COALESCE(display_name, username) AS player_name,
                   0 AS total_games,
                   0 AS total_goals,
                   0 AS total_assists,
                   0 AS total_saves,
                   0 AS avg_score,
                   'user' AS source
            FROM users
            WHERE (COALESCE(display_name, '') {like_clause} OR username {like_clause})
        ) combined
        ORDER BY total_games DESC, player_name ASC
        LIMIT %s
    """ if USE_PG else f"""
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
            WHERE (IFNULL(display_name, '') LIKE ? COLLATE NOCASE OR username LIKE ? COLLATE NOCASE)
        ) combined
        ORDER BY total_games DESC, player_name ASC
        LIMIT ?
    """
    if USE_PG:
        params = (like, like, like, limit)
    else:
        params = (like, like, like, limit)
    rows = _c(conn, sql, params).fetchall()
    conn.close()
    return rows

def get_replay_file_path(replay_id):
    conn = get_db()
    row = _c(conn, "SELECT file_path, map_name FROM replays WHERE replay_id = %s", (replay_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_replays_for_player(player_name, limit=50):
    conn = get_db()
    sql = """
        SELECT r.replay_id, r.map_name, r.game_mode, r.uploaded_at,
               r.blue_goals, r.orange_goals,
               ps.goals, ps.assists, ps.saves, ps.score, ps.team
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = %s
        ORDER BY r.uploaded_at DESC LIMIT %s
    """
    rows = _c(conn, sql, (player_name, limit)).fetchall()
    conn.close()
    return rows

def get_player_full_profile(player_name):
    conn = get_db()
    sql = """
        SELECT
            COUNT(*) AS total_games,
            COALESCE(SUM(ps.goals), 0) AS total_goals,
            COALESCE(SUM(ps.assists), 0) AS total_assists,
            COALESCE(SUM(ps.saves), 0) AS total_saves,
            COALESCE(SUM(ps.shots), 0) AS total_shots,
            AVG(ps.score) AS avg_score,
            AVG(ps.shooting_pct) AS avg_shooting_pct,
            AVG(ps.boost_avg) AS avg_boost,
            AVG(ps.avg_speed) AS avg_speed,
            AVG(ps.percent_offensive) AS avg_offensive,
            AVG(ps.percent_defensive) AS avg_defensive,
            AVG(ps.percent_supersonic) AS avg_supersonic
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = %s
    """
    stats = _c(conn, sql, (player_name,)).fetchone()
    games_sql = """
        SELECT r.game_mode, r.map_name, r.uploaded_at, r.blue_goals, r.orange_goals,
               ps.goals, ps.assists, ps.saves, ps.score, ps.team
        FROM player_stats ps
        JOIN replays r ON ps.replay_id = r.id
        WHERE ps.player_name = %s
        ORDER BY r.uploaded_at DESC LIMIT 20
    """
    games = _c(conn, games_sql, (player_name,)).fetchall()
    conn.close()
    return stats, games

# ── ACHIEVEMENTS ─────────────────────────
ACHIEVEMENTS = [
    {"id": "first_replay", "name": "🎮 أول ريبلاي", "desc": "ارفع أول ريبلاي لك", "icon": "🎮"},
    {"id": "ten_wins", "name": "🏆 ١٠ انتصارات", "desc": "حقق ١٠ انتصارات", "icon": "🏆"},
    {"id": "aerial_master", "name": "✈️ ملك الأيريال", "desc": "متوسط وقت بالجو > ٣٠٪", "icon": "✈️"},
    {"id": "rotation_king", "name": "🔄 ملك الروتنيشن", "desc": "توازن هجوم/دفاع ٤٠-٦٠٪", "icon": "🔄"},
    {"id": "speed_demon", "name": "⚡ الشيطان السريع", "desc": "متوسط سرعة > ٢٠٠٠", "icon": "⚡"},
    {"id": "sharp_shooter", "name": "🎯 قناص", "desc": "دقة تسديد > ٥٠٪", "icon": "🎯"},
    {"id": "boost_manager", "name": "⛽ مدير البوست", "desc": "متوسط بوست ٤٠-٨٠", "icon": "⛽"},
    {"id": "demo_lord", "name": "💥 مدمر", "desc": "إجمالي ديمو > ١٠", "icon": "💥"},
    {"id": "wall_warrior", "name": "🧱 محارب الحائط", "desc": "نسبة دفاعية > ٣٥٪", "icon": "🧱"},
    {"id": "mvp", "name": "⭐ MVP", "desc": "مجموع سكور > ٥٠٠٠", "icon": "⭐"},
]

def init_achievements():
    conn = get_db()
    _script(conn, """
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            achievement_id TEXT NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    try:
        _c(conn, "CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_unique ON achievements(user_id, achievement_id)")
    except:
        pass
    conn.commit()
    conn.close()

def check_and_unlock_achievements(user_id, stats):
    if not stats or not user_id:
        return []
    conn = get_db()
    locked = _c(conn, "SELECT achievement_id FROM achievements WHERE user_id = %s", (user_id,)).fetchall()
    locked_ids = {r["achievement_id"] for r in locked}
    new_unlocks = []
    ttl = stats.get("total_replays", 0) or 0
    avg_air = stats.get("avg_offensive", 0) or 0
    avg_def = stats.get("avg_defensive", 0) or 0
    avg_speed = stats.get("avg_speed", 0) or 0
    avg_shoot = stats.get("avg_shooting_pct", 0) or 0
    avg_boost = stats.get("avg_boost", 0) or 0
    total_score = stats.get("total_score", 0) or 0
    total_demos = stats.get("total_demos", 0) or 0

    checks = {
        "first_replay": ttl >= 1,
        "ten_wins": ttl >= 10,
        "aerial_master": avg_air > 30,
        "rotation_king": 40 <= avg_air <= 60 and 40 <= avg_def <= 60,
        "speed_demon": avg_speed > 2000,
        "sharp_shooter": avg_shoot > 50,
        "boost_manager": 40 <= avg_boost <= 80,
        "demo_lord": total_demos >= 10,
        "wall_warrior": avg_def > 35,
        "mvp": total_score >= 5000,
    }

    for ach in ACHIEVEMENTS:
        aid = ach["id"]
        if aid in locked_ids:
            continue
        if checks.get(aid):
            try:
                _c(conn, "INSERT INTO achievements (user_id, achievement_id) VALUES (%s, %s)", (user_id, aid))
                new_unlocks.append(ach)
            except Exception:
                pass
    if new_unlocks:
        conn.commit()
    conn.close()
    return new_unlocks

def get_user_achievements(user_id):
    conn = get_db()
    rows = _c(conn, "SELECT achievement_id, unlocked_at FROM achievements WHERE user_id = %s ORDER BY unlocked_at DESC", (user_id,)).fetchall()
    unlocked = {r["achievement_id"]: r["unlocked_at"] for r in rows}
    result = []
    for ach in ACHIEVEMENTS:
        entry = dict(ach)
        entry["unlocked"] = ach["id"] in unlocked
        entry["unlocked_at"] = unlocked.get(ach["id"])
        result.append(entry)
    conn.close()
    return result

def record_visit(path, user_id=None, ip=None, user_agent=None):
    conn = get_db()
    _c(conn, "INSERT INTO page_visits (path, user_id, ip, user_agent) VALUES (%s, %s, %s, %s)",
         (path, user_id, ip, user_agent))
    conn.commit()
    conn.close()

def get_admin_stats():
    conn = get_db()
    total_users = _c(conn, "SELECT COUNT(*) AS total FROM users").fetchone()["total"]
    users_today = _c(conn, "SELECT COUNT(*) AS total FROM users WHERE created_at::date = CURRENT_DATE").fetchone()["total"] if USE_PG else _c(conn, "SELECT COUNT(*) AS total FROM users WHERE date(created_at) = date('now')").fetchone()["total"]
    total_visits = _c(conn, "SELECT COUNT(*) AS total FROM page_visits").fetchone()["total"]
    visits_today = _c(conn, "SELECT COUNT(*) AS total FROM page_visits WHERE visited_at::date = CURRENT_DATE").fetchone()["total"] if USE_PG else _c(conn, "SELECT COUNT(*) AS total FROM page_visits WHERE date(visited_at) = date('now')").fetchone()["total"]
    unique_today = _c(conn, "SELECT COUNT(DISTINCT COALESCE(user_id, ip::text)) AS total FROM page_visits WHERE visited_at::date = CURRENT_DATE").fetchone()["total"] if USE_PG else _c(conn, "SELECT COUNT(DISTINCT COALESCE(user_id, ip)) AS total FROM page_visits WHERE date(visited_at) = date('now')").fetchone()["total"]
    visits_per_day = _c(conn,
        "SELECT visited_at::date AS day, COUNT(*) AS count, COUNT(DISTINCT COALESCE(user_id, ip::text)) AS uniques FROM page_visits WHERE visited_at >= CURRENT_DATE - INTERVAL '14 days' GROUP BY visited_at::date ORDER BY day DESC"
        if USE_PG else
        "SELECT date(visited_at) AS day, COUNT(*) AS count, COUNT(DISTINCT COALESCE(user_id, ip)) AS uniques FROM page_visits WHERE visited_at >= date('now', '-14 days') GROUP BY date(visited_at) ORDER BY day DESC"
    ).fetchall()
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
    sql = """
        SELECT u.id, u.username, u.display_name, u.hash_tag, u.created_at,
               (SELECT COUNT(*) FROM replays WHERE user_id = u.id) AS replay_count,
               (SELECT MAX(visited_at) FROM page_visits WHERE user_id = u.id) AS last_visit
        FROM users u
        ORDER BY u.created_at DESC
    """
    rows = _c(conn, sql).fetchall()
    conn.close()
    return rows
