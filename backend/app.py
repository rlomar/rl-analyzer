import os, json, tempfile, time, shutil, requests as requests_lib
from datetime import timedelta
from flask import Flask, request, jsonify, send_from_directory, session, send_file
from flask_cors import CORS
from analyzer import RocketLeagueAnalyzer
from database import init_db, save_replay, get_player_history, get_player_names, create_user, verify_user, get_user_by_steam, get_user_by_epic, get_user_history, get_user_settings, update_user_settings, get_user_aggregated_stats, get_user_recent_replays, update_user_profile, search_players, get_player_full_profile, get_replays_for_player, get_replay_file_path, get_replay_by_id, set_user_display_name, update_last_replay_player_name, record_visit, check_and_unlock_achievements, get_user_achievements, get_db, award_xp, search_user_exact, get_user_by_display_or_username, get_user_info, get_user_info_by_id, get_radar_metrics, _c, follow_user, unfollow_user, get_followers, get_following, is_following, get_follower_count, get_following_count, create_or_get_chat, get_user_chats, get_chat_messages, send_message, block_user, unblock_user, get_blocked_users, is_blocked, mark_chat_read, get_total_unread_count, USE_PG, create_password_reset, get_pending_password_reset, resolve_password_reset, update_user_password
from urllib.parse import urlencode
from trends import analyze_trends, generate_scrim_team_analysis

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
REPLAY_STORAGE = os.path.join(BASE_DIR, "backend", "replays")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
# Persistent secret key — env var takes precedence, otherwise file, otherwise generate
app.secret_key = os.environ.get("SESSION_SECRET")
if not app.secret_key:
    SECRET_KEY_FILE = os.path.join(BASE_DIR, "backend", ".secret_key")
    if os.path.exists(SECRET_KEY_FILE):
        with open(SECRET_KEY_FILE, "r") as f:
            app.secret_key = f.read().strip()
    else:
        app.secret_key = os.urandom(32).hex()
        os.makedirs(os.path.dirname(SECRET_KEY_FILE), exist_ok=True)
        with open(SECRET_KEY_FILE, "w") as f:
            f.write(app.secret_key)
# Keep sessions alive across browser restarts
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
CORS(app, supports_credentials=True)

# Admin credentials – predefined in env (defaults: admin / admin123)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

UPLOAD_FOLDER = tempfile.gettempdir()
os.makedirs(REPLAY_STORAGE, exist_ok=True)
BALLCHASING_API = "https://ballchasing.com/api"

HEADERS = {}

MODE_KEYWORDS = {
    "1v1": ["duel", "1v1", "1 vs 1", "1v1"],
    "2v2": ["double", "2v2", "2 vs 2"],
    "3v3": ["standard", "3v3", "3 vs 3", "solo standard"],
}

def detect_game_mode(data):
    # 1. Check playlist name
    playlist = data.get("playlist_name", "") or ""
    playlist_lower = playlist.lower()
    for mode, keywords in MODE_KEYWORDS.items():
        if any(k in playlist_lower for k in keywords):
            return mode
    # 2. Count players in each team
    blue_team = data.get("blue", {}) or {}
    orange_team = data.get("orange", {}) or {}
    blue_n = len(blue_team.get("players", []))
    orange_n = len(orange_team.get("players", []))
    max_p = max(blue_n, orange_n)
    if max_p <= 1: return "1v1"
    if max_p == 2: return "2v2"
    if max_p >= 3: return "3v3"
    # 3. Last resort — check player_stats from analysis
    return "3v3"

MODE_LABELS = {"1v1": "فردي 1v1", "2v2": "زوجي 2v2", "3v3": "فريق 3v3"}

init_db()

STEAM_OPENID = "https://steamcommunity.com/openid/login"
STEAM_API_KEY = os.environ.get("STEAM_API_KEY", "")

def get_steam_display_name(steam_id):
    if not STEAM_API_KEY:
        return None
    try:
        r = requests_lib.get(
            f"https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
            params={"key": STEAM_API_KEY, "steamids": steam_id}
        )
        data = r.json()
        players = data.get("response", {}).get("players", [])
        if players:
            return players[0].get("personaname")
    except Exception:
        pass
    return None

def get_db_user_id(username):
    from database import get_user_info
    return get_user_info(username)

# ── VISIT TRACKING ─────────────────────────
@app.before_request
def track_visit():
    if request.endpoint in ("index", "static_files"):
        uid = session.get("user_id")
        record_visit(
            path=request.path,
            user_id=uid,
            ip=request.remote_addr,
            user_agent=request.headers.get("User-Agent", "")[:200],
        )
    # Update last_seen for authenticated users on any API call
    uid = session.get("user_id")
    if uid:
        try:
            conn = get_db()
            _c(conn, "UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = %s", (uid,))
            conn.commit()
            conn.close()
        except:
            pass

# ── STEAM LOGIN ────────────────────────────
@app.route("/api/auth/steam")
def api_auth_steam():
    base = request.host_url.rstrip("/")
    params = urlencode({
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": f"{base}/api/auth/steam/callback",
        "openid.realm": base,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    })
    return jsonify({"url": f"{STEAM_OPENID}?{params}"})

@app.route("/api/auth/steam/callback")
def api_auth_steam_callback():
    args = request.args
    if args.get("openid.mode") == "id_res":
        sid = args.get("openid.claimed_id", "").replace("https://steamcommunity.com/openid/id/", "")
        if sid:
            user = get_user_by_steam(sid)
            if user:
                session["user"] = user["username"]
                session["user_id"] = user["id"]
                session.permanent = True
            else:
                uid = create_user(f"steam_{sid}", steam_id=sid)
                if uid:
                    session["user"] = f"steam_{sid}"
                    session["user_id"] = uid
                    session.permanent = True
                    # Set display name from Steam API
                    steam_name = get_steam_display_name(sid)
                    if steam_name:
                        set_user_display_name(uid, steam_name)
            return '<script>if(window.opener){window.opener.postMessage("steam-login-success","*");window.close()}else{location="/"}</script>'
    return '<script>if(window.opener)window.close();else location="/"</script>'

# ── EPIC GAMES OAUTH ──────────────────────────
EPIC_CLIENT_ID = os.environ.get("EPIC_CLIENT_ID", "")
EPIC_CLIENT_SECRET = os.environ.get("EPIC_CLIENT_SECRET", "")

@app.route("/api/auth/epic")
def api_auth_epic():
    base = request.host_url.rstrip("/")
    if EPIC_CLIENT_ID:
        params = urlencode({
            "client_id": EPIC_CLIENT_ID,
            "redirect_uri": f"{base}/api/auth/epic/callback",
            "response_type": "code",
            "scope": "basic_profile",
        })
        return jsonify({"url": f"https://accounts.epicgames.com/authorize?{params}"})
    # Fallback: show Epic display name input page
    return jsonify({"url": f"{base}/api/auth/epic-form"})

@app.route("/api/auth/epic/callback")
def api_auth_epic_callback():
    code = request.args.get("code")
    if code and EPIC_CLIENT_ID and EPIC_CLIENT_SECRET:
        base = request.host_url.rstrip("/")
        try:
            tr = requests_lib.post("https://accounts.epicgames.com/token", data={
                "client_id": EPIC_CLIENT_ID,
                "client_secret": EPIC_CLIENT_SECRET,
                "redirect_uri": f"{base}/api/auth/epic/callback",
                "grant_type": "authorization_code",
                "code": code,
            })
            token_data = tr.json()
            access_token = token_data.get("access_token")
            if access_token:
                ur = requests_lib.get("https://api.epicgames.com/epic/id/v1/accounts/me",
                    headers={"Authorization": f"Bearer {access_token}"})
                user_info = ur.json()
                epic_id = user_info.get("id", "")
                display_name = user_info.get("displayName", "")
                if epic_id:
                    user = get_user_by_epic(epic_id)
                    if user:
                        session["user"] = user["username"]
                        session["user_id"] = user["id"]
                        session.permanent = True
                    else:
                        uid = create_user(f"epic_{epic_id}", epic_id=epic_id)
                        if uid:
                            session["user"] = f"epic_{epic_id}"
                            session["user_id"] = uid
                            session.permanent = True
                            if display_name:
                                set_user_display_name(uid, display_name)
                    return '<script>if(window.opener){window.opener.postMessage("epic-login-success","*");window.close()}else{location="/"}</script>'
        except Exception:
            pass
        return '<script>alert("فشل تسجيل Epic Games");window.close()</script>'
    return '<script>if(window.opener)window.close();else location="/"</script>'

@app.route("/api/auth/epic-form")
def epic_login_form():
    return '''
    <!DOCTYPE html>
    <html dir="rtl">
    <head><meta charset="UTF-8"><title>Epic Games - تسجيل</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Tahoma,Arial,sans-serif; background:#0a0e17; color:#e0e0e0; display:flex; align-items:center; justify-content:center; min-height:100vh; }
        .card { background:#131a2b; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:30px; width:360px; text-align:center; }
        .card h2 { margin-bottom:8px; color:#fff; font-size:20px; }
        .card p { color:#8892b0; font-size:13px; margin-bottom:8px; }
        .card .note { color:#5a6a8a; font-size:11px; margin-bottom:16px; }
        input { width:100%; padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.3); color:#fff; font-size:14px; margin-bottom:12px; text-align:center; }
        button { width:100%; padding:12px; border-radius:10px; border:none; background:linear-gradient(135deg,#2a2a2a,#404040); color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
        button:hover { background:linear-gradient(135deg,#404040,#555); }
        .error { color:#ff1744; font-size:13px; margin-bottom:10px; display:none; }
    </style>
    </head><body>
    <div class="card">
        <h2>⭐ Epic Games</h2>
        <p>اكتب اسم المستخدم في Epic Games</p>
        <p class="note">هذا خيار احتياطي. عشان تربط الحساب رسمياً،<br>ضف EPIC_CLIENT_ID و EPIC_CLIENT_SECRET في البيئة.</p>
        <form action="/api/auth/epic/complete" method="POST" id="epic-form">
            <input type="text" name="epic_name" placeholder="Epic Games display name" required>
            <p class="error" id="epic-error"></p>
            <button type="submit">تسجيل</button>
        </form>
    </div>
    <script>
        document.getElementById("epic-form").addEventListener("submit", async function(e) {
            e.preventDefault();
            const name = this.epic_name.value.trim();
            if (!name) return;
            try {
                const r = await fetch("/api/auth/epic/complete", {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body: JSON.stringify({epic_name: name})
                });
                const d = await r.json();
                if (d.success) {
                    if (window.opener) { window.opener.postMessage("epic-login-success","*"); window.close(); }
                    else location.href = "/";
                } else {
                    document.getElementById("epic-error").textContent = d.error;
                    document.getElementById("epic-error").style.display = "block";
                }
            } catch(e) {
                document.getElementById("epic-error").textContent = "خطأ في الاتصال";
                document.getElementById("epic-error").style.display = "block";
            }
        });
    </script>
    </body></html>
    '''

@app.route("/api/auth/epic/complete", methods=["POST"])
def epic_login_complete():
    data = request.get_json()
    epic_name = data.get("epic_name", "").strip() if data else ""
    if not epic_name:
        return jsonify({"error": "الاسم مطلوب"}), 400
    user = get_user_by_epic(epic_name)
    if user:
        session["user"] = user["username"]
        session["user_id"] = user["id"]
        session.permanent = True
    else:
        uid = create_user(f"epic_{epic_name.replace(' ','_')}", epic_id=epic_name)
        if uid:
            session["user"] = f"epic_{epic_name.replace(' ','_')}"
            session["user_id"] = uid
            session.permanent = True
            set_user_display_name(uid, epic_name)
        else:
            return jsonify({"error": "فشل إنشاء الحساب"}), 500
    return jsonify({"success": True})

# ── PASSWORD AUTH ──────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def api_auth_register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "يرجى إدخال اسم المستخدم وكلمة المرور"}), 400
    if len(username) < 3:
        return jsonify({"error": "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"}), 400
    if len(password) < 4:
        return jsonify({"error": "كلمة المرور يجب أن تكون 4 أحرف على الأقل"}), 400
    # Admin account check
    if username == ADMIN_USERNAME:
        if password != ADMIN_PASSWORD:
            return jsonify({"error": "بيانات الدخول غير صحيحة للأدمن"}), 403
        # Admin register – redirect to login if exists
        existing = get_user_info(username)
        if existing:
            # Already created, just log them in
            session["user"] = username
            session["user_id"] = existing["id"]
            session.permanent = True
            return jsonify({"success": True, "user": {"username": username, "id": existing["id"]}})
        uid = create_user(username, password=password, is_admin=1)
        if not uid:
            return jsonify({"error": "فشل إنشاء الحساب"}), 500
        session["user"] = username
        session["user_id"] = uid
        session.permanent = True
        return jsonify({"success": True, "user": {"username": username, "id": uid}})
    existing = get_user_info(username)
    if existing:
        return jsonify({"error": "اسم المستخدم موجود مسبقاً"}), 409
    uid = create_user(username, password=password)
    if not uid:
        return jsonify({"error": "فشل إنشاء الحساب"}), 500
    session["user"] = username
    session["user_id"] = uid
    session.permanent = True
    return jsonify({"success": True, "user": {"username": username, "id": uid}})

@app.route("/api/auth/forgot-password", methods=["POST"])
def api_auth_forgot_password():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "يرجى إدخال اسم المستخدم"}), 400
    # Find user
    user = get_user_info(username)
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404
    # Find admin user
    admin = get_user_info(ADMIN_USERNAME)
    if not admin:
        return jsonify({"error": "لا يوجد أدمن في النظام"}), 500
    # Don't allow password reset for admin
    if username == ADMIN_USERNAME:
        return jsonify({"error": "لا يمكن إعادة تعيين كلمة مرور الأدمن"}), 400
    # Create or get chat between admin and user
    cid = create_or_get_chat(admin["id"], user["id"])
    # Create password reset entry
    create_password_reset(cid, user["id"])
    # Send auto message in chat
    display = user.get("display_name") or username
    msg = f"🔑 المستخدم `{display}` (@{username}) طلب إعادة تعيين كلمة المرور.\nاكتب كلمة المرور الجديدة هنا وسيتم تغييرها تلقائياً."
    send_message(cid, admin["id"], msg)
    return jsonify({"success": True, "message": "تم إرسال طلبك للأدمن. سيتم تغيير كلمة المرور قريباً."})

@app.route("/api/auth/login", methods=["POST"])
def api_auth_login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"error": "يرجى إدخال اسم المستخدم وكلمة المرور"}), 400
    # Admin login
    if username == ADMIN_USERNAME:
        if password != ADMIN_PASSWORD:
            return jsonify({"error": "اسم المستخدم أو كلمة المرور غير صحيحة"}), 401
        existing = get_user_info(username)
        if not existing:
            return jsonify({"error": "حساب الأدمن غير موجود. سجل أولاً."}), 404
        session["user"] = existing["username"]
        session["user_id"] = existing["id"]
        session.permanent = True
        return jsonify({"success": True, "user": {"username": existing["username"], "display_name": existing.get("display_name"), "hash_tag": existing.get("hash_tag")}})
    user = verify_user(username, password)
    if not user:
        return jsonify({"error": "اسم المستخدم أو كلمة المرور غير صحيحة"}), 401
    session["user"] = user["username"]
    session["user_id"] = user["id"]
    session.permanent = True
    return jsonify({"success": True, "user": {"username": user["username"], "display_name": user.get("display_name"), "hash_tag": user.get("hash_tag")}})

# ── USER PROFILE & SETTINGS ─────────────────
@app.route("/api/user/profile", methods=["GET"])
def api_user_profile():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    uid = session["user_id"]
    info = get_db_user_id(session.get("user"))
    stats = get_user_aggregated_stats(uid)
    settings = get_user_settings(uid)
    recent = get_user_recent_replays(uid, limit=5)
    tag = info.get("hash_tag", "") if info else ""
    display = info.get("display_name") or (info.get("username") if info else None)
    return jsonify({
        "user": {
            "username": info["username"] if info else None,
            "display_name": display,
            "hash_tag": tag,
            "tagged_name": f"{display}#{tag}" if display and tag else display,
            "avatar": info.get("avatar") if info else None,
            "bio": info.get("bio") if info else None,
            "country": info.get("country") if info else None,
            "primary_platform": info.get("primary_platform") if info else None,
            "xp": info.get("xp") if info else 0,
            "followers_count": get_follower_count(uid),
            "following_count": get_following_count(uid),
        },
        "stats": stats,
        "settings": settings,
        "recent": recent,
    })

@app.route("/api/user/radar", methods=["GET"])
def api_user_radar():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    return jsonify({"radar": get_radar_metrics(session["user_id"])})

@app.route("/api/user/settings", methods=["GET", "POST"])
def api_user_settings():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    if request.method == "GET":
        settings = get_user_settings(session["user_id"])
        return jsonify({"settings": settings})
    data = request.get_json()
    if not data:
        return jsonify({"error": "لا يوجد بيانات"}), 400
    update_user_settings(session["user_id"], data)
    return jsonify({"success": True})

@app.route("/api/user/stats", methods=["GET"])
def api_user_stats():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    stats = get_user_aggregated_stats(session["user_id"])
    return jsonify({"stats": stats})

@app.route("/api/user/update-profile", methods=["POST"])
def api_update_profile():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    data = request.get_json()
    display_name = data.get("display_name", "").strip()
    bio = data.get("bio", "").strip()
    country = data.get("country", "").strip()
    primary_platform = data.get("primary_platform", "").strip()
    avatar = data.get("avatar", "").strip()
    update_user_profile(session["user_id"],
        display_name=display_name or None,
        bio=bio or None,
        country=country or None,
        primary_platform=primary_platform or None,
        avatar=avatar or None)
    return jsonify({"success": True})

# ── LOGOUT ──────────────────────────────────
@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("user", None)
    session.pop("user_id", None)
    return jsonify({"success": True})

@app.route("/api/me", methods=["GET"])
def api_me():
    info = get_db_user_id(session.get("user")) if "user" in session else None
    if info:
        from database import get_user_settings as _gus, _c as _gc, get_db
        settings = _gus(info["id"])
        tag = info.get("hash_tag", "")
        display = info.get("display_name") or info.get("username", "")
        # Check is_admin
        conn = get_db()
        row = _gc(conn, "SELECT is_admin FROM users WHERE id = %s", (info["id"],)).fetchone()
        is_admin = bool(row and row["is_admin"]) if row else False
        conn.close()
        return jsonify({
            "user": session["user"],
            "user_id": info["id"],
            "display_name": display,
            "hash_tag": tag,
            "tagged_name": f"{display}#{tag}" if tag else display,
            "settings": settings,
            "is_admin": is_admin,
        })
    return jsonify({"user": None})

# ── ADMIN ────────────────────────────────
def get_admin_stats():
    conn = get_db()
    total_users = _c(conn, "SELECT COUNT(*) AS c FROM users").fetchone()["c"]
    total_replays = _c(conn, "SELECT COUNT(*) AS c FROM replays").fetchone()["c"]
    total_players = _c(conn, "SELECT COUNT(DISTINCT player_name) AS c FROM player_stats").fetchone()["c"]
    today_sql = "SELECT COUNT(*) AS c FROM replays WHERE DATE(uploaded_at) = CURRENT_DATE" if USE_PG else "SELECT COUNT(*) AS c FROM replays WHERE DATE(uploaded_at) = DATE('now')"
    today_replays = _c(conn, today_sql).fetchone()["c"]
    week_sql = "SELECT COUNT(*) AS c FROM replays WHERE uploaded_at >= CURRENT_DATE - INTERVAL '7 days'" if USE_PG else "SELECT COUNT(*) AS c FROM replays WHERE uploaded_at >= datetime('now', '-7 days')"
    week_users_sql = "SELECT COUNT(*) AS c FROM users WHERE id >= 0"
    week_replays = _c(conn, week_sql).fetchone()["c"]
    visits_sql = "SELECT COUNT(*) AS c FROM page_visits WHERE DATE(visited_at) = CURRENT_DATE" if USE_PG else "SELECT COUNT(*) AS c FROM page_visits WHERE DATE(visited_at) = DATE('now')"
    today_visits = _c(conn, visits_sql).fetchone()["c"]
    conn.close()
    return {"users": total_users, "replays": total_replays, "players": total_players, "today_replays": today_replays, "week_replays": week_replays, "today_visits": today_visits}

def get_admin_users():
    conn = get_db()
    rows = _c(conn, "SELECT id, username, display_name, hash_tag, is_admin, xp FROM users ORDER BY id DESC LIMIT 200").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_admin_user_detail(user_id):
    conn = get_db()
    user = _c(conn, "SELECT id, username, display_name, hash_tag, is_admin, xp, bio, country, primary_platform FROM users WHERE id = %s", (user_id,)).fetchone()
    if not user:
        conn.close()
        return None
    user = dict(user)
    replays = _c(conn, "SELECT id, replay_id, map_name, game_mode, uploaded_at FROM replays WHERE user_id = %s ORDER BY uploaded_at DESC LIMIT 50", (user_id,)).fetchall()
    user["replays"] = [dict(r) for r in replays]
    stats = _c(conn, "SELECT COUNT(*) AS total, COALESCE(SUM(goals),0) AS goals, COALESCE(SUM(assists),0) AS assists, COALESCE(SUM(saves),0) AS saves FROM player_stats WHERE player_name IN (SELECT player_name FROM replays WHERE user_id = %s)", (user_id,)).fetchone()
    user["stats"] = dict(stats) if stats else {}
    first_seen = _c(conn, "SELECT MIN(uploaded_at) AS first FROM replays WHERE user_id = %s", (user_id,)).fetchone()
    user["first_replay"] = dict(first_seen)["first"] if first_seen and first_seen["first"] else None
    conn.close()
    return user

def _require_admin():
    """Returns error response or None. Checks session + is_admin + username=='admin'."""
    if "user_id" not in session:
        return jsonify({"error": "غير مسجل"}), 401
    conn = get_db()
    row = _c(conn, "SELECT username, is_admin FROM users WHERE id = %s", (session["user_id"],)).fetchone()
    conn.close()
    if not row or not row["is_admin"] or row["username"] != "admin":
        return jsonify({"error": "غير مصرح"}), 403
    return None

@app.route("/api/admin/stats", methods=["GET"])
def api_admin_stats():
    err = _require_admin()
    if err: return err
    return jsonify({"stats": get_admin_stats()})

@app.route("/api/admin/users", methods=["GET"])
def api_admin_users():
    err = _require_admin()
    if err: return err
    return jsonify({"users": get_admin_users()})

@app.route("/api/admin/user/<int:user_id>", methods=["GET"])
def api_admin_user_detail(user_id):
    err = _require_admin()
    if err: return err
    detail = get_admin_user_detail(user_id)
    if not detail:
        return jsonify({"error": "المستخدم غير موجود"}), 404
    return jsonify({"user": detail})

@app.route("/api/admin/user/<int:user_id>/reset-password", methods=["POST"])
def api_admin_reset_password(user_id):
    err = _require_admin()
    if err: return err
    data = request.get_json(silent=True) or {}
    new_password = data.get("password", "")
    if len(new_password) < 4:
        return jsonify({"error": "كلمة المرور 4 أحرف على الأقل"}), 400
    conn = get_db()
    from werkzeug.security import generate_password_hash
    _c(conn, "UPDATE users SET password = %s WHERE id = %s", (generate_password_hash(new_password), user_id))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "تم إعادة تعيين كلمة المرور"})

@app.route("/api/set-key", methods=["POST"])
def set_api_key():
    data = request.get_json()
    key = data.get("key", "")
    if key:
        HEADERS["Authorization"] = key
        return jsonify({"success": True})
    return jsonify({"error": "API key مطلوب"}), 400

@app.route("/api/analyze", methods=["POST"])
def analyze_replay():
    if "file" not in request.files:
        return jsonify({"error": "ما رفعت ملف"}), 400

    file = request.files["file"]
    game_mode = request.form.get("game_mode", "3v3")

    if not file.filename.lower().endswith(".replay"):
        return jsonify({"error": "الملف لازم يكون .replay"}), 400

    if "Authorization" not in HEADERS:
        return jsonify({"error": "API key, first"}), 401

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    try:
        # Check if this replay was already uploaded (by replay_id returned from Ballchasing)
        with open(filepath, "rb") as f:
            r_post = requests_lib.post(
                f"{BALLCHASING_API}/v2/upload",
                headers={"Authorization": HEADERS["Authorization"]},
                files={"file": (file.filename, f, "application/octet-stream")}
            )
        if r_post.status_code == 409:
            replay_id = r_post.json().get("id")
        elif r_post.status_code in (200, 201):
            replay_id = r_post.json().get("id")
        else:
            return jsonify({"error": f"Ballchasing API: {r_post.status_code} {r_post.text[:200]}"}), 500
        if not replay_id:
            return jsonify({"error": "ما لقيت replay ID"}), 500

        # Poll until data is ready
        for _ in range(15):
            time.sleep(2)
            r2 = requests_lib.get(
                f"{BALLCHASING_API}/replays/{replay_id}",
                headers={"Authorization": HEADERS["Authorization"]}
            )
            if r2.status_code == 200:
                data = r2.json()
                if data.get("status") == "ok" or "goals" in data.get("blue", {}):
                    break

        actual_mode = detect_game_mode(data)
        if actual_mode != game_mode:
            actual_label = MODE_LABELS.get(actual_mode, actual_mode)
            selected_label = MODE_LABELS.get(game_mode, game_mode)
            return jsonify({
                "error": f"❌ خطأ في اختيار الطور!\nهذا الريبلاي {actual_label} مو {selected_label}.\nغير الطور إلى {actual_label} وحاول مرة ثانية."
            }), 400

        # === DUPLICATE CHECK ===
        existing = get_replay_by_id(replay_id)
        if existing:
            analyzer = RocketLeagueAnalyzer(data, game_mode)
            results = analyzer.analyze()
            game_info = {
                "map": data.get("map_name", "Unknown"),
                "duration": data.get("duration", 0),
                "overtime": data.get("overtime", False),
                "playlist": data.get("playlist_name", "Unknown"),
                "blue_name": data.get("blue", {}).get("name", "Blue"),
                "orange_name": data.get("orange", {}).get("name", "Orange"),
                "blue_goals": data.get("blue", {}).get("goals", 0),
                "orange_goals": data.get("orange", {}).get("goals", 0),
            }
            trends_data = {}
            for p in results:
                summary, _ = analyze_trends(p["name"], game_mode)
                if summary:
                    trends_data[p["name"]] = summary
            team_analysis = None
            if game_mode in ("scrim", "3v3", "2v2"):
                try:
                    team_analysis = generate_scrim_team_analysis(results, game_info)
                except Exception:
                    team_analysis = None
            return jsonify({
                "success": True,
                "replay_id": replay_id,
                "game_info": game_info,
                "players": results,
                "trends": trends_data,
                "team_analysis": team_analysis,
                "duplicate": True,
            })

        # New replay — wait for full processing
        for _ in range(15):
            time.sleep(2)
            r2 = requests_lib.get(
                f"{BALLCHASING_API}/replays/{replay_id}",
                headers={"Authorization": HEADERS["Authorization"]}
            )
            if r2.status_code == 200:
                d2 = r2.json()
                if d2.get("status") == "ok" or "goals" in d2.get("blue", {}):
                    data = d2
                    break

        analyzer = RocketLeagueAnalyzer(data, game_mode)
        results = analyzer.analyze()

        game_info = {
            "map": data.get("map_name", "Unknown"),
            "duration": data.get("duration", 0),
            "overtime": data.get("overtime", False),
            "playlist": data.get("playlist_name", "Unknown"),
            "blue_name": data.get("blue", {}).get("name", "Blue"),
            "orange_name": data.get("orange", {}).get("name", "Orange"),
            "blue_goals": data.get("blue", {}).get("goals", 0),
            "orange_goals": data.get("orange", {}).get("goals", 0),
        }

        # Save a copy of the replay file
        replay_filename = f"{replay_id}.replay"
        replay_filepath = os.path.join(REPLAY_STORAGE, replay_filename)
        shutil.copy2(filepath, replay_filepath)

        # Save to database
        user_id = session.get("user_id")
        user_player_name = request.form.get("player_name") or None
        save_replay(data, game_mode, results, user_id=user_id, user_player_name=user_player_name, file_path=replay_filepath)

        # Award XP
        if user_id:
            up = next((p for p in results if p["name"] == (user_player_name or "")), None)
            if up:
                s = up["stats"]
                won = (up["team_key"] == "blue" and game_info["blue_goals"] > game_info["orange_goals"]) or (up["team_key"] == "orange" and game_info["orange_goals"] > game_info["blue_goals"])
                award_xp(user_id, goals=s.get("goals",0), assists=s.get("assists",0), saves=s.get("saves",0), score=s.get("score",0), won=won)

        # Load trends for each player
        trends_data = {}
        for p in results:
            summary, _ = analyze_trends(p["name"], game_mode)
            if summary:
                trends_data[p["name"]] = summary

        # Team analysis for 2v2 / 3v3 / scrim
        team_analysis = None
        if game_mode in ("scrim", "3v3", "2v2"):
            try:
                team_analysis = generate_scrim_team_analysis(results, game_info)
            except Exception:
                team_analysis = None

        # Check achievements
        new_achievements = []
        if user_id:
            stats = get_user_aggregated_stats(user_id)
            new_achievements = check_and_unlock_achievements(user_id, stats)

        return jsonify({
            "success": True,
            "replay_id": replay_id,
            "game_info": game_info,
            "players": results,
            "trends": trends_data,
            "team_analysis": team_analysis,
            "new_achievements": new_achievements,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route("/api/players", methods=["GET"])
def api_players():
    game_mode = request.args.get("mode", "")
    names = get_player_names(game_mode) if game_mode else []
    return jsonify({"players": names})

@app.route("/api/history/<player_name>", methods=["GET"])
def api_history(player_name):
    game_mode = request.args.get("mode", "3v3")
    games = get_player_history(player_name, game_mode, limit=20)
    return jsonify({"history": games})

@app.route("/api/trends/<player_name>", methods=["GET"])
def api_trends(player_name):
    game_mode = request.args.get("mode", "3v3")
    summary, latest = analyze_trends(player_name, game_mode)
    if not summary:
        return jsonify({"error": "ما فيه معلومات كافية عن هذا اللاعب", "games": 0}), 404
    return jsonify(summary)

@app.route("/api/players/search", methods=["GET"])
def api_players_search():
    query = request.args.get("q", "").strip()
    if len(query) < 1:
        return jsonify({"players": []})
    results = search_players(query)
    return jsonify({"players": results})

@app.route("/api/user-search", methods=["GET"])
def api_user_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"user": None})
    from database import search_user_exact
    row = search_user_exact(query)
    if row:
        r = dict(row)
        tag = r.get("hash_tag", "")
        display = r.get("display_name") or r.get("username", "")
        return jsonify({"user": {
            "username": r["username"],
            "display_name": display,
            "hash_tag": tag,
            "tagged_name": f"{display}#{tag}" if tag else display,
            "xp": r.get("xp", 0),
            "followers_count": get_follower_count(r["id"]),
            "following_count": get_following_count(r["id"]),
        }})
    return jsonify({"user": None})

@app.route("/api/players/profile/<player_name>", methods=["GET"])
def api_player_profile(player_name):
    stats, games = get_player_full_profile(player_name)
    if not stats or not stats.get("total_games"):
        return jsonify({"error": "لا توجد بيانات لهذا اللاعب"}), 404
    return jsonify({"stats": stats, "games": games})

@app.route("/api/profile/<name>", methods=["GET"])
def api_unified_profile(name):
    """Return profile data for a player or registered user by name."""
    # Try player stats first
    stats, games = get_player_full_profile(name)
    if stats and stats.get("total_games"):
        return jsonify({
            "source": "player",
            "player_name": name,
            "stats": stats,
            "games": games,
        })
    # Try registered user
    r = get_user_by_display_or_username(name)
    if r:
        tag = r.get("hash_tag", "")
        display = r.get("display_name") or r.get("username", "")
        return jsonify({
            "source": "user",
            "player_name": f"{display}#{tag}" if tag else display,
            "username": r["username"],
            "display_name": display,
            "hash_tag": tag,
            "avatar": r.get("avatar"),
            "bio": r.get("bio"),
            "country": r.get("country"),
            "primary_platform": r.get("primary_platform"),
            "xp": r.get("xp", 0),
        })
    return jsonify({"error": "لا توجد بيانات"}), 404

@app.route("/p/<name>")
@app.route("/u/<name>")
def profile_page(name):
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/api/players/<player_name>/replays", methods=["GET"])
def api_player_replays(player_name):
    games = get_replays_for_player(player_name)
    return jsonify({"replays": games})

@app.route("/api/replay/<replay_id>/download", methods=["GET"])
def api_replay_download(replay_id):
    info = get_replay_file_path(replay_id) if get_replay_file_path else None
    # 1. Try local file from DB path
    if info:
        fp = info.get("file_path")
        if fp and os.path.exists(fp):
            return send_file(fp, as_attachment=True, download_name=f"{replay_id}.replay")
    # 2. Try fallback path
    fallback = os.path.join(REPLAY_STORAGE, f"{replay_id}.replay")
    if os.path.exists(fallback):
        return send_file(fallback, as_attachment=True, download_name=f"{replay_id}.replay")
    # 3. Proxy from Ballchasing
    try:
        bc_url = f"{BALLCHASING_API}/replays/{replay_id}/file"
        r = requests_lib.get(bc_url, headers={"Authorization": HEADERS.get("Authorization", "")}, stream=True)
        if r.status_code == 200:
            return send_file(
                r.raw, as_attachment=True, download_name=f"{replay_id}.replay",
                mimetype=r.headers.get("content-type", "application/octet-stream")
            )
    except Exception:
        pass
    return jsonify({"error": "ملف الريبلاي غير متوفر"}), 404

@app.route("/api/user/history", methods=["GET"])
def api_user_history():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    history = get_user_history(session["user_id"])
    return jsonify({"history": history})

@app.route("/api/user/link-player", methods=["POST"])
def api_link_player():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    data = request.get_json()
    player_name = data.get("player_name", "").strip()
    if not player_name:
        return jsonify({"error": "الاسم مطلوب"}), 400
    update_last_replay_player_name(session["user_id"], player_name)
    # Award XP for the linked replay
    try:
        uid = session["user_id"]
        from database import _c as _gc
        conn = get_db()
        row = _gc(conn, """
            SELECT ps.goals, ps.assists, ps.saves, ps.score, r.blue_goals, r.orange_goals, ps.team
            FROM replays r JOIN player_stats ps ON ps.replay_id = r.id
            WHERE r.user_id = %s AND r.user_player_name = %s AND ps.player_name = %s
            ORDER BY r.uploaded_at DESC LIMIT 1
        """, (uid, player_name, player_name)).fetchone()
        conn.close()
        if row:
            won = (row["team"] == "blue" and row["blue_goals"] > row["orange_goals"]) or (row["team"] == "orange" and row["orange_goals"] > row["blue_goals"])
            award_xp(uid, goals=row["goals"] or 0, assists=row["assists"] or 0, saves=row["saves"] or 0, score=row["score"] or 0, won=won)
    except Exception as e:
        print("XP award after link error:", e)
    return jsonify({"success": True})

@app.route("/api/user/achievements", methods=["GET"])
def api_user_achievements():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    achs = get_user_achievements(session["user_id"])
    return jsonify({"achievements": achs})

@app.route("/api/user/set-player-name", methods=["POST"])
def api_set_player_name():
    if "user_id" not in session:
        return jsonify({"error": "ما أنت مسجل دخول"}), 401
    data = request.get_json()
    player_name = data.get("player_name", "").strip()
    if not player_name:
        return jsonify({"error": "الاسم مطلوب"}), 400
    set_user_display_name(session["user_id"], player_name)
    return jsonify({"success": True})

# ── FOLLOW API ──────────────────────────
@app.route("/api/user/follow", methods=["POST"])
def api_follow():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    player_name = data.get("player_name", "").strip()
    if not player_name: return jsonify({"error": "الاسم مطلوب"}), 400
    ok = follow_user(session["user_id"], player_name)
    return jsonify({"success": ok})

@app.route("/api/user/unfollow", methods=["POST"])
def api_unfollow():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    player_name = data.get("player_name", "").strip()
    if not player_name: return jsonify({"error": "الاسم مطلوب"}), 400
    unfollow_user(session["user_id"], player_name)
    return jsonify({"success": True})

@app.route("/api/user/followers", methods=["GET"])
def api_followers():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    return jsonify({"followers": get_followers(session["user_id"])})

@app.route("/api/user/following", methods=["GET"])
def api_following():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    return jsonify({"following": get_following(session["user_id"])})

# ── ONLINE STATUS ────────────────────────
@app.route("/api/user/online-status", methods=["GET"])
def api_online_status():
    usernames = request.args.getlist("username")
    if not usernames:
        return jsonify({})
    placeholders = ", ".join("%s" for _ in usernames)
    conn = get_db()
    rows = _c(conn, f"SELECT username, last_seen FROM users WHERE username IN ({placeholders})", usernames).fetchall()
    conn.close()
    now = time.time()
    is_pg = "DATABASE_URL" in os.environ
    result = {}
    for r in rows:
        ls = r.get("last_seen")
        online = False
        if ls:
            try:
                if is_pg:
                    online = (now - ls.timestamp()) < 300
                else:
                    from datetime import datetime
                    dt = datetime.strptime(ls, "%Y-%m-%d %H:%M:%S") if isinstance(ls, str) else ls
                    online = (now - dt.timestamp()) < 300
            except:
                online = False
        result[r["username"]] = {"online": online, "last_seen": str(ls) if ls else None}
    return jsonify(result)

@app.route("/api/user/follow-status", methods=["GET"])
def api_follow_status():
    if "user_id" not in session: return jsonify({"following": False})
    player = request.args.get("player", "").strip()
    if not player: return jsonify({"following": False})
    return jsonify({"following": is_following(session["user_id"], player)})

# ── CHAT API ────────────────────────────
@app.route("/api/chats/unread", methods=["GET"])
def api_chats_unread():
    if "user_id" not in session: return jsonify({"unread": 0})
    return jsonify({"unread": get_total_unread_count(session["user_id"])})

@app.route("/api/chat/<int:chat_id>/read", methods=["POST"])
def api_chat_mark_read(chat_id):
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    mark_chat_read(chat_id, session["user_id"])
    return jsonify({"success": True})

@app.route("/api/chats", methods=["GET"])
def api_chats():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    chats = get_user_chats(session["user_id"])
    # Attach last message
    result = []
    for c in chats:
        conn = get_db()
        row = _c(conn, "SELECT content FROM messages WHERE chat_id = %s ORDER BY created_at DESC LIMIT 1", (c["id"],)).fetchone()
        conn.close()
        c["last_message"] = row["content"][:60] if row else ""
        result.append(c)
    return jsonify({"chats": result})

@app.route("/api/chat/start", methods=["POST"])
def api_chat_start():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    player_name = data.get("player_name", "").strip()
    if not player_name: return jsonify({"error": "الاسم مطلوب"}), 400
    target = get_user_by_display_or_username(player_name)
    if not target: return jsonify({"error": "المستخدم غير موجود"}), 404
    if target["id"] == session["user_id"]: return jsonify({"error": "ما تقدر تراسل نفسك"}), 400
    # Check block
    if is_blocked(target["id"], session["user_id"]):
        return jsonify({"error": "هذا المستخدم حظرك"}), 403
    if is_blocked(session["user_id"], target["id"]):
        return jsonify({"error": "أنت حظرت هذا المستخدم"}), 403
    cid = create_or_get_chat(session["user_id"], target["id"])
    return jsonify({"chat_id": cid})

@app.route("/api/chat/<int:chat_id>", methods=["GET"])
def api_chat_messages(chat_id):
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    return jsonify({"messages": get_chat_messages(chat_id, session["user_id"])})

@app.route("/api/chat/<int:chat_id>/send", methods=["POST"])
def api_chat_send(chat_id):
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    content = data.get("content", "").strip()
    if not content: return jsonify({"error": "الرسالة فارغة"}), 400
    sender_id = session["user_id"]
    # Check if this is the admin sending a message in a password reset chat
    conn = get_db()
    row = _c(conn, "SELECT username, is_admin FROM users WHERE id = %s", (sender_id,)).fetchone()
    conn.close()
    if row and row["is_admin"] and row["username"] == ADMIN_USERNAME:
        pending = get_pending_password_reset(chat_id)
        if pending:
            new_password = content
            if len(new_password) >= 4:
                update_user_password(pending["user_id"], new_password)
                resolve_password_reset(pending["id"])
                # Get username for confirmation
                uinfo = get_user_info_by_id(pending["user_id"])
                uname = (uinfo.get("display_name") or uinfo.get("username") or "المستخدم") if uinfo else "المستخدم"
                # Save the admin's message first
                send_message(chat_id, sender_id, content)
                # Send confirmation as auto message
                send_message(chat_id, sender_id, f"✅ تم تغيير كلمة المرور للمستخدم `{uname}` بنجاح!")
                return jsonify({"success": True})
            else:
                # Save message anyway but don't update password
                send_message(chat_id, sender_id, content)
                send_message(chat_id, sender_id, "⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل. حاول مرة أخرى.")
                return jsonify({"success": True})
    send_message(chat_id, sender_id, content)
    return jsonify({"success": True})

# ── BLOCK API ───────────────────────────
@app.route("/api/user/block", methods=["POST"])
def api_block():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    if not username: return jsonify({"error": "الاسم مطلوب"}), 400
    target = get_user_by_display_or_username(username)
    if not target: return jsonify({"error": "المستخدم غير موجود"}), 404
    if target["id"] == session["user_id"]: return jsonify({"error": "ما تقدر تحظر نفسك"}), 400
    ok = block_user(session["user_id"], target["id"])
    return jsonify({"success": ok})

@app.route("/api/user/unblock", methods=["POST"])
def api_unblock():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    if not username: return jsonify({"error": "الاسم مطلوب"}), 400
    target = get_user_by_display_or_username(username)
    if not target: return jsonify({"error": "المستخدم غير موجود"}), 404
    unblock_user(session["user_id"], target["id"])
    return jsonify({"success": True})

@app.route("/api/user/blocked", methods=["GET"])
def api_blocked():
    if "user_id" not in session: return jsonify({"error": "سجل الدخول أولاً"}), 401
    return jsonify({"blocked": get_blocked_users(session["user_id"])})

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)

if __name__ == "__main__":
    print("=" * 50)
    print("  Rocket League Replay Analyzer")
    print("  http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
