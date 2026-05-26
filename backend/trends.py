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

import random as _rl_rnd
def random_choice(items):
    return _rl_rnd.choice(items)

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

def _team_stats(members):
    def _s(k, default=0):
        return sum(p["stats"].get(k, default) for p in members)
    n = len(members) or 1
    return {
        "goals": _s("goals"),
        "assists": _s("assists"),
        "saves": _s("saves"),
        "shots": _s("shots"),
        "score": _s("score"),
        "boost_avg": _s("boost_avg") / n,
        "speed_avg": _s("avg_speed") / n,
        "dist_ball": _s("dist_ball") / n,
        "dist_mates": _s("dist_mates") / n,
        "demos_in": _s("demos_inflicted"),
        "demos_taken": _s("demos_taken"),
        "boost_collected": _s("boost_collected"),
        "boost_stolen": _s("boost_stolen"),
        "zero_boost": _s("percent_zero_boost") / n,
        "powerslides": _s("count_powerslide"),
    }

def generate_scrim_team_analysis(players_analysis, game_info):
    teams = {"blue": [], "orange": []}
    for p in players_analysis:
        teams[p.get("team_key", "blue")].append(p)

    team_data = {}
    for tk in ["blue", "orange"]:
        if teams[tk]:
            team_data[tk] = _team_stats(teams[tk])
            team_data[tk]["name"] = game_info.get(f"{tk}_name", tk.title())

    analysis = {}
    for team_key in ["blue", "orange"]:
        if team_key not in team_data:
            continue
        s = team_data[team_key]
        opp_key = "orange" if team_key == "blue" else "blue"
        opp = team_data.get(opp_key)

        goals = s["goals"]
        opp_goals = opp["goals"] if opp else 0

        tips = _generate_team_tips(s, opp, team_key)

        analysis[team_key] = {
            "name": s["name"],
            "goals": goals,
            "opponent_goals": opp_goals,
            "won": goals > opp_goals,
            "avg_boost": round(s["boost_avg"], 1),
            "avg_speed": round(s["speed_avg"]),
            "avg_distance_ball": round(s["dist_ball"]),
            "avg_distance_mates": round(s["dist_mates"]),
            "total_boost": s["boost_collected"],
            "total_shots": s["shots"],
            "total_saves": s["saves"],
            "total_assists": s["assists"],
            "total_score": s["score"],
            "demos_inflicted": s["demos_in"],
            "demos_taken": s["demos_taken"],
            "tips": tips,
        }

    return analysis

def _generate_team_tips(s, opp, team_key):
    tips = []
    won = opp is None or s["goals"] > opp["goals"]
    drew = opp is not None and s["goals"] == opp["goals"]

    # ---- REASON: why won / why lost ----
    if opp is not None:
        reasons = []
        diffs = []

        shot_diff = s["shots"] - opp["shots"]
        if shot_diff >= 3:
            reasons.append((random_choice(["🎯 سددتم أكثر", "ضغط هجومي أعلى"]), f"فريقكم سدد {s['shots']} مرة مقابل {opp['shots']} للخصم — {random_choice(['الفرق بالضغط', 'الهجوم المنظم'])} سبب رئيسي."))
            diffs.append(("shots", shot_diff))
        elif shot_diff <= -3:
            reasons.append((random_choice(["🎯 تسديدات أقل", "ما تهددون"]), f"سددتم {s['shots']} بس والخصم {opp['shots']}. الفارق بالضغط الهجومي واضح."))
            diffs.append(("shots", shot_diff))

        boost_diff = s["boost_avg"] - opp["boost_avg"]
        if boost_diff >= 8:
            reasons.append((random_choice(["⛽ بوست أحسن", "إدارة boost"]), f"معدل boost {s['boost_avg']:.0f} vs {opp['boost_avg']:.0f}. فرق boost كبير — إدارة البوست الجماعية كانت أفضل."))
            diffs.append(("boost", boost_diff))
        elif boost_diff <= -8:
            reasons.append((random_choice(["⛽ بوست أقل", "جوعانين بوست"]), f"معدل boost {s['boost_avg']:.0f} والخصم {opp['boost_avg']:.0f}. فرق {abs(boost_diff):.0f} نقطة — تحتاجون small pads."))
            diffs.append(("boost", boost_diff))

        speed_diff = s["speed_avg"] - opp["speed_avg"]
        if speed_diff >= 200:
            reasons.append((random_choice(["🚀 أسرع", "السرعة فكتكم"]), f"سرعة فريقكم {s['speed_avg']:.0f} vs {opp['speed_avg']:.0f}. كنتم أسرع — هذا ضغط."))
            diffs.append(("speed", speed_diff))
        elif speed_diff <= -200:
            reasons.append((random_choice(["🐢 أبطأ", "السرعة ناقصة"]), f"سرعة فريقكم {s['speed_avg']:.0f} والخصم {opp['speed_avg']:.0f}. بطيئين — الخصم يضغط أسرع."))
            diffs.append(("speed", speed_diff))

        demo_diff = s["demos_in"] - opp["demos_in"]
        if demo_diff >= 2:
            reasons.append((random_choice(["💥 ديمو ملك", "كسرتم صفوفهم"]), f"دمّرتم {s['demos_in']} وأخذتوا {s['demos_taken']}. الديمو فتح لكم المساحة."))
            diffs.append(("demos", demo_diff))
        elif demo_diff <= -2:
            reasons.append((random_choice(["💥 ينضربون ديمو", "صفوفكم مهزوزة"]), f"دمّرتم {s['demos_in']} بس وأخذتوا {s['demos_taken']}. الفرق بالديمو واضح."))
            diffs.append(("demos", demo_diff))

        save_diff = s["saves"] - opp["saves"]
        if save_diff >= 2:
            reasons.append((random_choice(["🛑 دفاع أقوى", "التصديات حمتكم"]), f"تصديات {s['saves']} vs {opp['saves']}. الدفاع كان العامل الحاسم."))
            diffs.append(("saves", save_diff))
        elif save_diff <= -2:
            reasons.append((random_choice(["🛑 دفاع أضعف", "تصديات أقل"]), f"تصديات {s['saves']} والخصم {opp['saves']}. الدفاع خذلكم."))
            diffs.append(("saves", save_diff))

        assist_diff = s["assists"] - opp["assists"]
        if assist_diff >= 2:
            reasons.append((random_choice(["🎯 تمريرات أحسن", "لعب جماعي"]), f"تمريرات {s['assists']} vs {opp['assists']}. اللعب الجماعي هو الفرق."))
            diffs.append(("assists", assist_diff))
        elif assist_diff <= -2:
            reasons.append((random_choice(["🎯 تمريرات أقل", "فردي أكثر من جماعي"]), f"تمريرات {s['assists']} والخصم {opp['assists']}. تحتاجون تمرير أكثر."))
            diffs.append(("assists", assist_diff))

        dist_diff = opp["dist_ball"] - s["dist_ball"]  # positive = 우리 closer
        if dist_diff >= 400:
            reasons.append((random_choice(["📍 ضغط أعلى", "قريب من الكرة"]), f"بعدكم عن الكرة {s['dist_ball']:.0f} والخصم {opp['dist_ball']:.0f}. كنتم أقرب — ضغط مستمر."))
        elif dist_diff <= -400:
            reasons.append((random_choice(["📍 بعيد عن الكرة", "ضغط منخفض"]), f"بعدكم عن الكرة {s['dist_ball']:.0f} والخصم {opp['dist_ball']:.0f}. الخصم كان أقرب للكرة — يضغطون أكثر."))

        if won and reasons:
            picked = random_choice(reasons[:3])
            tips.append({"priority": "low", "title": f"🏆 {picked[0]}", "advice": picked[1]})
        elif not won and not drew and reasons:
            picked = random_choice(reasons[:3])
            tips.append({"priority": "high", "title": f"⚠️ {picked[0]}", "advice": picked[1]})

    # ---- BOOST ----
    if s["boost_avg"] < 30:
        tips.append({"priority": "high", "title": random_choice(["🔥 جوعانين بوست", "فاضيين طول الوقت", "بنزين طاف"]), "advice": f"معدل بوست الفريق {s['boost_avg']:.0f}. منخفض جداً. الفريق اللي boost average حقته أقل يخسر. خذوا small pads ووزعوا البوست."})
    elif s["boost_avg"] < 45:
        tips.append({"priority": "medium", "title": random_choice(["⛽ بوست متوسط", "محتاجين boost", "جوعانين شوي"]), "advice": f"معدل بوست {s['boost_avg']:.0f}. مقبول بس فيه أحسن — دوروا small pads."})

    # ---- SPACING ----
    if s["dist_mates"] > 3200:
        tips.append({"priority": "high", "title": random_choice(["📏 التباعد كبير", "تيم مفكك", "تلعبون لحالكم"]), "advice": f"المسافة بين اللاعبين {s['dist_mates']:.0f}. كبير جداً — التيم مفكك. قربوا عشان الدعم السريع."})
    elif s["dist_mates"] < 600:
        tips.append({"priority": "medium", "title": random_choice(["📏 تلزقون ببعض", "ما تتركون مساحة"]), "advice": f"المسافة {s['dist_mates']:.0f}. تلزقون — تفرقوا عشان التغطية."})

    # ---- SHOTS ----
    if s["shots"] < 4:
        tips.append({"priority": "high", "title": random_choice(["🎯 ما تسددون", "تسديدات قليلة", "خايفين؟"]), "advice": f"سددتم {s['shots']} تسديدة فقط. ما تهددون — اضغطوا أكثر."})
    elif s["shots"] > 15 and s["goals"] < 2:
        tips.append({"priority": "medium", "title": random_choice(["🎯 تسديدات بدون أهداف", "تصيب ولا تخيب"]), "advice": f"{s['shots']} تسديدة ودخل {s['goals']} أهداف. دقة التسديد تيم تحتاج شغل."})

    # ---- SAVES ----
    if s["saves"] < 2 and (opp and opp["shots"] > 5):
        tips.append({"priority": "high", "title": random_choice(["🛑 دفاع ضعيف", "تصديات أقل", "المرمى مكشوف"]), "advice": f"{s['saves']} تصديات والخصم سدد {opp['shots']}. دفاع الفريق ضعيف — الباك بوست مسؤولية الجميع."})

    # ---- DEMOS ----
    if s["demos_in"] < 1 and (opp and opp["demos_in"] > 2):
        tips.append({"priority": "medium", "title": random_choice(["💥 ينضربون ديمو", "لا تدمّرون"]), "advice": f"دمّرتم {s['demos_in']} وأخذتوا {s['demos_taken']}. الخصم يدمّركم وما تردون — الديمو يفتح المساحة."})
    elif s["demos_in"] > s["demos_taken"] * 2:
        tips.append({"priority": "low", "title": random_choice(["💥 دباسة فريق", "دمّرتم الجميع"]), "advice": f"دمّرتم {s['demos_in']} وأخذتوا {s['demos_taken']}. الديمو سلاحكم — استمروا."})

    # ---- SPEED ----
    if s["speed_avg"] < 1500:
        tips.append({"priority": "high", "title": random_choice(["🐢 فريق بطيء", "حركوا رجولكم"]), "advice": f"معدل سرعة الفريق {s['speed_avg']:.0f}. بطيئين — السرعة تفرق في السكريم."})
    elif s["speed_avg"] > 2100 and s["goals"] < 2:
        tips.append({"priority": "medium", "title": random_choice(["🏃 سريع بس فوضوي", "تهور زايد"]), "advice": f"سرعة {s['speed_avg']:.0f} بس ما استفدتم منها. السرعة بدون تنظيم = فوضى."})

    # ---- ASSISTS ----
    if s["assists"] < 1 and s["shots"] > 5:
        tips.append({"priority": "medium", "title": random_choice(["🎯 ما تمررون", "فردي زيادة"]), "advice": f"{s['assists']} تمريرة — ما فيه تمرير. السكريم يعتمد على اللعب الجماعي."})

    # ---- BOOST STEAL ----
    if s["boost_stolen"] < 30 and (opp and opp["boost_collected"] > 600):
        tips.append({"priority": "medium", "title": random_choice(["🔫 تسرقون بوست؟", "خلوهم جوعانين"]), "advice": f"سرقتوا {s['boost_stolen']} بس. سرقة boost الخصم يخليهم فاضيين — مهم جداً."})

    # ---- POWERSLIDES ----
    total_ps = s.get("powerslides", 0)
    if total_ps > 20:
        tips.append({"priority": "medium", "title": random_choice(["🌀 Powerslides كثير", "تزحفون زيادة"]), "advice": f"{total_ps} powerslide. دوران زايد — يوديكم خارج البلاي."})

    # ---- GOAL SUMMARY (if won/lost) ----
    if won and not drew:
        tips.append({"priority": "low", "title": random_choice(["✅ فوز مستحق", "أداء الفريق"]), "advice": random_choice([
            "فزتم بفضل الضغط الجماعي والتنظيم. استمروا على نفس المنوال.",
            "فوز团队. الحمد لله على الأداء — ركزوا على التقليل من الأخطاء الفردية.",
            "فوز مبروك. اللي خلى الفرق هو الرتشن واللعب كفريق واحد.",
        ])})
    elif not won and not drew:
        tips.append({"priority": "high", "title": random_choice(["❌ أسباب الخسارة", "وش اللي خلاك تخسر؟"]), "advice": random_choice([
            "الخسارة غالباً بسبب الضعف الجماعي. راجعوا أدواركم وارتشن.",
            "الخصم كان منظم أكثر. تحتاجون تنسيق أفضل و fast rotation.",
            "لما تخسر، شوف إحصائيات الفريق فوق. ركزوا على أكبر نقطة ضعف واشتغلوا عليها كتيم.",
        ])})

    # ---- NO TIPS ----
    if not tips:
        tips.append({"priority": "low", "title": random_choice(["✅ أداء فريق كويس", "ممتازين"]), "advice": "إحصائيات الفريق مقبولة. ركزوا على التقليل من الأخطاء الفردية."})

    tips.sort(key=lambda t: {"high": 0, "medium": 1, "low": 2}[t["priority"]])
    return tips
