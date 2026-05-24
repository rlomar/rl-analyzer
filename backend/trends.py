from database import get_player_history

STAT_META = {
    "goals": {"label": "الأهداف", "higher_is_better": True},
    "assists": {"label": "التمريرات", "higher_is_better": True},
    "saves": {"label": "التصديات", "higher_is_better": True},
    "shots": {"label": "التسديدات", "higher_is_better": True},
    "score": {"label": "السكور", "higher_is_better": True},
    "shooting_pct": {"label": "دقة التسديد", "higher_is_better": True},
    "boost_avg": {"label": "معدل البوست", "higher_is_better": True},
    "boost_collected": {"label": "بوست مجمع", "higher_is_better": True},
    "boost_stolen": {"label": "بوست مسروق", "higher_is_better": True},
    "count_big_pads": {"label": "بودات كبيرة", "higher_is_better": False},
    "count_small_pads": {"label": "بودات صغيرة", "higher_is_better": True},
    "boost_wasted_pct": {"label": "بوست مهدر", "higher_is_better": False},
    "overfill_pct": {"label": "Overfill", "higher_is_better": False},
    "percent_zero_boost": {"label": "وقت فاضي", "higher_is_better": False},
    "percent_full_boost": {"label": "Full boost", "higher_is_better": True},
    "avg_speed": {"label": "السرعة", "higher_is_better": True},
    "percent_supersonic": {"label": "Supersonic", "higher_is_better": True},
    "time_slow_speed": {"label": "وقت بطيء", "higher_is_better": False},
    "ground_pct": {"label": "على الأرض", "higher_is_better": False},
    "air_pct": {"label": "في الجو", "higher_is_better": True},
    "time_high_air": {"label": "High aerials", "higher_is_better": True},
    "percent_offensive": {"label": "هجوم", "higher_is_better": True},
    "percent_defensive": {"label": "دفاع", "higher_is_better": False},
    "dist_ball": {"label": "مسافة للكرة", "higher_is_better": False},
    "dist_mates": {"label": "مسافة للفريق", "higher_is_better": False},
    "time_behind_ball": {"label": "ورا الكرة", "higher_is_better": False},
    "time_infront_ball": {"label": "قدام الكرة", "higher_is_better": True},
    "demos_inflicted": {"label": "ديمو سويت", "higher_is_better": True},
    "demos_taken": {"label": "ديمو أخذت", "higher_is_better": False},
    "count_powerslide": {"label": "Powerslides", "higher_is_better": False},
    "goals_against_last_defender": {"label": "أهداف بدفاعي", "higher_is_better": False},
}

def analyze_trends(player_name, game_mode):
    history = get_player_history(player_name, game_mode, limit=10)
    if len(history) < 2:
        return None, None

    latest = history[0]
    avg_older = _average_stats(history[1:])

    trends = {}
    for stat_key, meta in STAT_META.items():
        curr = float(latest.get(stat_key, 0))
        prev = float(avg_older.get(stat_key, 0))
        diff = round(curr - prev, 1)
        if abs(diff) < 0.5:
            continue
        improved = (diff > 0) == meta["higher_is_better"]
        if stat_key in ("count_big_pads", "count_small_pads", "demos_inflicted", "demos_taken", "count_powerslide"):
            if abs(diff) < 1:
                continue
        trends[stat_key] = {
            "label": meta["label"],
            "latest": curr,
            "previous": prev,
            "diff": diff,
            "improved": improved,
        }

    insights = _generate_insights(trends, history)

    summary = {
        "player_name": player_name,
        "game_mode": game_mode,
        "games_analyzed": len(history),
        "trends": trends,
        "insights": insights,
    }
    return summary, latest

def _average_stats(rows):
    if not rows:
        return {}
    avg = {}
    keys = [k for k in STAT_META.keys()]
    for key in keys:
        vals = [float(r.get(key, 0)) for r in rows]
        avg[key] = sum(vals) / len(vals)
    return avg

def _generate_insights(trends, history):
    insights = []
    improved = [t for t in trends.values() if t["improved"]]
    worsened = [t for t in trends.values() if not t["improved"]]

    if improved:
        top = sorted(improved, key=lambda x: abs(x["diff"]), reverse=True)[:2]
        names = " و ".join(t["label"] for t in top)
        insights.append(f"✅ تحسن ملحوظ في {names}")

    if worsened:
        top = sorted(worsened, key=lambda x: abs(x["diff"]), reverse=True)[:2]
        names = " و ".join(t["label"] for t in top)
        insights.append(f"⚠️ تراجع في {names} — ركز عليهم")

    # Check for patterns across all games
    if len(history) >= 3:
        recent = history[:3]
        bad_boost = sum(1 for r in recent if float(r.get("percent_zero_boost", 0)) > 15)
        if bad_boost >= 2:
            insights.append("💡 نمط متكرر: إدارة boost ضعيفة في آخر مباريات — درب على small pads")
        low_shots = sum(1 for r in recent if float(r.get("shots", 0)) < 2)
        if low_shots >= 2:
            insights.append("💡 نمط متكرر: تسديدات قليلة — جرّب تكون أكثر هجوم")
        high_goals_against = sum(1 for r in recent if float(r.get("goals_against_last_defender", 0)) > 0)
        if high_goals_against >= 2:
            insights.append("💡 نمط متكرر: أهداف تدخل بدفاعك — shadow defense يحتاج شغل")
    return insights

def generate_scrim_team_analysis(players_analysis, game_info):
    teams = {"blue": [], "orange": []}
    for p in players_analysis:
        teams[p.get("team_key", "blue")].append(p)

    # Calculate team goals from player stats (more reliable than API)
    team_goals = {}
    for team_key, members in teams.items():
        team_goals[team_key] = sum(p["stats"]["goals"] for p in members)

    analysis = {}
    for team_key in ["blue", "orange"]:
        members = teams[team_key]
        if not members:
            continue
        team_name = game_info.get(f"{team_key}_name", team_key.title())
        goals = team_goals.get(team_key, 0)
        opp_key = "orange" if team_key == "blue" else "blue"
        opp_goals = team_goals.get(opp_key, 0)

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
        total_score = sum(p["stats"]["score"] for p in members)

        team_tips = _generate_team_tips(members, avg_b, avg_dm, avg_sp, total_sh, total_sv, total_di, total_dt, goals, opp_goals)

        analysis[team_key] = {
            "name": team_name,
            "goals": goals,
            "opponent_goals": opp_goals,
            "won": goals > opp_goals,
            "avg_boost": round(avg_b, 1),
            "avg_speed": round(avg_sp),
            "avg_distance_ball": round(avg_db),
            "avg_distance_mates": round(avg_dm),
            "total_boost": total_bc,
            "total_shots": total_sh,
            "total_saves": total_sv,
            "total_assists": total_as,
            "total_score": total_score,
            "demos_inflicted": total_di,
            "demos_taken": total_dt,
            "tips": team_tips,
        }

    return analysis

def _generate_team_tips(members, avg_boost, avg_dist_mates, avg_speed, shots, saves, demos_in, demos_taken, goals_for, goals_against):
    tips = []

    if avg_boost < 35:
        tips.append({
            "priority": "high",
            "title": "🔥 الفريق فاضي بوست",
            "advice": f"معدل بوست الفريق {avg_boost}. صغير. الفريق اللي boost average حقته أقل يخسر. خذوا small pads كفريق."
        })

    if avg_dist_mates > 3000:
        tips.append({
            "priority": "high",
            "title": "📏 التباعد كبير",
            "advice": f"معدل المسافة بين اللاعبين {avg_dist_mates}. كبير — التيم مفكك. حاولوا تلعبون قريب عشان الدعم السريع."
        })
    elif avg_dist_mates < 600:
        tips.append({
            "priority": "medium",
            "title": "📏 التلزيم الزايد",
            "advice": f"المسافة بين اللاعبين {avg_dist_mates}. تلزقون في بعض — تفرقوا عشان التغطية."
        })

    if shots < 5:
        tips.append({
            "priority": "high",
            "title": "🎯 تسديدات قليلة",
            "advice": f"مجموع التسديدات {shots}. قليل. ما تسددون ما تسجلون — اضغطوا أكثر كفريق."
        })

    if saves < 2 and goals_against > 0:
        tips.append({
            "priority": "high",
            "title": "🛑 دفاع团队的 ضعيف",
            "advice": f"{saves} تصديات بس. في سكريم الدفاع مسؤولية الجميع — الباك بوست أساسي."
        })

    if demos_in < 1 and demos_taken > 3:
        tips.append({
            "priority": "medium",
            "title": "💥 ينضربون ديمو",
            "advice": f"سويتوا {demos_in} ديمو وأخذتوا {demos_taken}. الديمو يكسّر دفاع الخصم — استخدموه."
        })

    if goals_for < goals_against:
        if avg_speed < 1600:
            tips.append({
                "priority": "high",
                "title": "🐢 بطيئين",
                "advice": f"معدل سرعة الفريق {avg_speed}. بطيء. في سكريم السرعة الجماعية تفرق — تحركوا أسرع."
            })

    if goals_for == 0:
        tips.append({
            "priority": "high",
            "title": "⚽ ما سجلتم",
            "advice": "صفر أهداف. شوفوا الرتشن — يمكن أحد عالق في الدفاع أو الهجوم غير منظم. حددوا أدواركم."
        })

    if not tips:
        tips.append({
            "priority": "low",
            "title": "✅ أداء فريق كويس",
            "advice": "إحصائيات الفريق مقبولة. ركزوا على التقليل من الأخطاء الفردية."
        })

    return tips
