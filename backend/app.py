import os, json, tempfile, time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from analyzer import RocketLeagueAnalyzer

app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
BALLCHASING_API = "https://ballchasing.com/api"

HEADERS = {}

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

        for _ in range(15):
            time.sleep(2)
            r2 = requests.get(
                f"{BALLCHASING_API}/replays/{replay_id}",
                headers={"Authorization": HEADERS["Authorization"]}
            )
            if r2.status_code == 200:
                data = r2.json()
                if data.get("status") == "done" or "players" in data.get("blue", {}):
                    break

        analyzer = RocketLeagueAnalyzer(data)
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

        return jsonify({"success": True, "game_info": game_info, "players": results})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route("/")
def index():
    return send_from_directory("../frontend", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("../frontend", path)

if __name__ == "__main__":
    print("=" * 50)
    print("  Rocket League Replay Analyzer")
    print("  http://localhost:5000")
    print("=" * 50)
    app.run(host="0.0.0.0", port=5000, debug=True)
