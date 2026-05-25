import os, json, tempfile, time
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from analyzer import RocketLeagueAnalyzer
from database import init_db, save_replay, get_player_history, get_player_names, create_user, verify_user, get_user_by_steam, get_user_by_epic, get_user_history, get_user_settings, update_user_settings, get_user_aggregated_stats, get_user_recent_replays, update_user_profile, search_players, get_player_full_profile, set_user_display_name, update_last_replay_player_name
from urllib.parse import urlencode
from trends import analyze_trends, generate_scrim_team_analysis

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.secret_key = os.urandom(24).hex()
CORS(app, supports_credentials=True)

UPLOAD_FOLDER = tempfile.gettempdir()
BALLCHASING_API = "https://ballchasing.com/api"

HEADERS = {}

MODE_KEYWORDS = {
    "1v1": ["duel", "1v1", "1 vs 1", "1v1"],
    "2v2": ["double", "2v2", "2 vs 2"],
    "3v3": ["standard", "3v3", "3 vs 3", "solo standard"],
}

def detect_game_mode(data):
    playlist = data.get("playlist_name", "").lower()
    for mode, keywords in MODE_KEYWORDS.items():
        if any(k in playlist for k in keywords):
            return mode
    blue_n = len(data.get("blue", {}).get("players", []))
    orange_n = len(data.get("orange", {}).get("players", []))
    max_p = max(blue_n, orange_n)
    if max_p <= 1: return "1v1"
    if max_p == 2: return "2v2"
    return "3v3"

MODE_LABELS = {"1v1": "فردي 1v1", "2v2": "زوجي 2v2", "3v3": "فريق 3v3"}

init_db()

STEAM_OPENID = "https://steamcommunity.com/openid/login"

def get_db_user_id(username):
    from database import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, display_name, hash_tag FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

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
            else:
                uid = create_user(f"steam_{sid}", steam_id=sid)
                if uid:
                    session["user"] = f"steam_{sid}"
                    session["user_id"] = uid
            return '<script>if(window.opener){window.opener.postMessage("steam-login-success","*");window.close()}else{location="/"}</script>'
    return '<script>if(window.opener)window.close();else location="/"</script>'

# ── EPIC GAMES AUTH ──────────────────────────
@app.route("/api/auth/epic")
def api_auth_epic():
    base = request.host_url.rstrip("/")
    return jsonify({"url": f"{base}/api/auth/epic-form"})

@app.route("/api/auth/epic-form")
def epic_login_form():
    return '''
    <!DOCTYPE html>
    <html dir="rtl">
    <head><meta charset="UTF-8"><title>Epic Games - تسجيل</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Tahoma,Arial,sans-serif; background:#0a0e17; color:#e0e0e0; display:flex; align-items:center; justify-content:center; min-height:100vh; }
        .card { background:#131a2b; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:30px; width:340px; text-align:center; }
        .card h2 { margin-bottom:8px; color:#fff; font-size:20px; }
        .card p { color:#8892b0; font-size:13px; margin-bottom:20px; }
        input { width:100%; padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.3); color:#fff; font-size:14px; margin-bottom:12px; text-align:center; }
        button { width:100%; padding:12px; border-radius:10px; border:none; background:linear-gradient(135deg,#2a2a2a,#404040); color:#fff; font-size:14px; font-weight:700; cursor:pointer; }
        button:hover { background:linear-gradient(135deg,#404040,#555); }
        .error { color:#ff1744; font-size:13px; margin-bottom:10px; display:none; }
    </style>
    </head><body>
    <div class="card">
        <h2>⭐ تسجيل عبر Epic Games</h2>
        <p>اكتب اسم المستخدم في Epic Games</p>
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
    else:
        uid = create_user(f"epic_{epic_name.replace(' ','_')}", epic_id=epic_name)
        if uid:
            session["user"] = f"epic_{epic_name.replace(' ','_')}"
            session["user_id"] = uid
            set_user_display_name(uid, epic_name)
        else:
            return jsonify({"error": "فشل إنشاء الحساب"}), 500
    return jsonify({"success": True})

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
        },
        "stats": stats,
        "settings": settings,
        "recent": recent,
    })

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
    update_user_profile(session["user_id"], display_name=display_name or None, bio=bio or None)
    return jsonify({"success": True})

# ── PASSWORD AUTH ──────────────────────────
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if len(username) < 3: return jsonify({"error": "اسم المستخدم ٣ أحرف على الأقل"}), 400
    if len(password) < 4: return jsonify({"error": "كلمة المرور ٤ أحرف على الأقل"}), 400
    uid = create_user(username, password)
    if uid:
        session["user"] = username
        session["user_id"] = uid
        return jsonify({"success": True, "user": username})
    return jsonify({"error": "اسم المستخدم موجود مسبقاً"}), 409

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    if verify_user(username, password):
        info = get_db_user_id(username)
        session["user"] = username
        session["user_id"] = info["id"] if info else None
        return jsonify({"success": True, "user": username})
    return jsonify({"error": "اسم المستخدم أو كلمة المرور خطأ"}), 401

@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("user", None)
    session.pop("user_id", None)
    return jsonify({"success": True})

@app.route("/api/me", methods=["GET"])
def api_me():
    info = get_db_user_id(session.get("user")) if "user" in session else None
    if info:
        from database import get_user_settings as _gus
        settings = _gus(info["id"])
        tag = info.get("hash_tag", "")
        display = info.get("display_name") or info.get("username", "")
        return jsonify({
            "user": session["user"],
            "user_id": info["id"],
            "display_name": display,
            "hash_tag": tag,
            "tagged_name": f"{display}#{tag}" if tag else display,
            "settings": settings,
        })
    return jsonify({"user": None})

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
        import requests
    except ImportError:
        return jsonify({"error": "requests"}), 500

    try:
        with open(filepath, "rb") as f:
            r = requests.post(
                f"{BALLCHASING_API}/v2/upload",
                headers={"Authorization": HEADERS["Authorization"]},
                files={"file": (file.filename, f, "application/octet-stream")}
            )
        if r.status_code == 409:
            replay_id = r.json().get("id")
        elif r.status_code in (200, 201):
            replay_id = r.json().get("id")
        else:
            return jsonify({"error": f"Ballchasing API: {r.status_code} {r.text[:200]}"}), 500
        if not replay_id:
            return jsonify({"error": "ما لقيت replay ID"}), 500

        for _ in range(30):
            time.sleep(2)
            r2 = requests.get(
                f"{BALLCHASING_API}/replays/{replay_id}",
                headers={"Authorization": HEADERS["Authorization"]}
            )
            if r2.status_code == 200:
                data = r2.json()
                if data.get("status") == "ok" or "goals" in data.get("blue", {}):
                    break

        actual_mode = detect_game_mode(data)
        if game_mode != "scrim" and actual_mode != game_mode:
            actual_label = MODE_LABELS.get(actual_mode, actual_mode)
            selected_label = MODE_LABELS.get(game_mode, game_mode)
            return jsonify({
                "error": f"❌ خطأ في اختيار الطور!\nالريبلاي هذا {actual_label} مو {selected_label}.\nغير الطور إلى {actual_label} وحاول مرة ثانية."
            }), 400

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

        # Save to database
        user_id = session.get("user_id")
        user_player_name = request.form.get("player_name") or None
        save_replay(data, game_mode, results, user_id=user_id, user_player_name=user_player_name)

        # Load trends for each player
        trends_data = {}
        for p in results:
            summary, _ = analyze_trends(p["name"], game_mode)
            if summary:
                trends_data[p["name"]] = summary

        # Team analysis for scrim / 3v3
        team_analysis = None
        if game_mode in ("scrim", "3v3"):
            team_analysis = generate_scrim_team_analysis(results, game_info)

        return jsonify({
            "success": True,
            "game_info": game_info,
            "players": results,
            "trends": trends_data,
            "team_analysis": team_analysis,
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

@app.route("/api/players/profile/<player_name>", methods=["GET"])
def api_player_profile(player_name):
    stats, games = get_player_full_profile(player_name)
    if not stats or not stats.get("total_games"):
        return jsonify({"error": "لا توجد بيانات لهذا اللاعب"}), 404
    return jsonify({"stats": stats, "games": games})

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
    return jsonify({"success": True})

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
