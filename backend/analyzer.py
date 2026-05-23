class RocketLeagueAnalyzer:
    def __init__(self, data):
        self.data = data
        self.players = []

    def analyze(self):
        self._extract_players()
        results = []
        for p in self.players:
            analysis = self._analyze_player(p)
            tips = self._generate_tips(analysis)
            results.append({
                "name": p["name"],
                "stats": analysis,
                "tips": tips
            })
        return results

    def _extract_players(self):
        for team_key in ["blue", "orange"]:
            team = self.data.get(team_key, {})
            team_name = team.get("name", team_key)
            for player in team.get("players", []):
                p = {
                    "name": player.get("name", "Unknown"),
                    "team": team_name,
                    "team_key": team_key,
                }
                stats = player.get("stats", {})
                for category in ["core", "boost", "movement", "positioning", "demo"]:
                    p.update(stats.get(category, {}))
                self.players.append(p)

    def _g(self, p, key, default=0):
        return p.get(key, default)

    def _analyze_player(self, p):
        goals = self._g(p, "goals")
        assists = self._g(p, "assists")
        saves = self._g(p, "saves")
        shots = self._g(p, "shots")
        score = self._g(p, "score")
        mvp = self._g(p, "mvp")
        shooting_pct = self._g(p, "shooting_percentage")

        boost_avg = self._g(p, "avg_amount", 50)
        amount_collected = self._g(p, "amount_collected")
        amount_stolen = self._g(p, "amount_stolen")
        amount_collected_big = self._g(p, "amount_collected_big")
        amount_collected_small = self._g(p, "amount_collected_small")
        count_big = self._g(p, "count_collected_big")
        count_small = self._g(p, "count_collected_small")
        overfill = self._g(p, "amount_overfill")
        boost_supersonic = self._g(p, "amount_used_while_supersonic")
        time_zero = self._g(p, "time_zero_boost")
        time_full = self._g(p, "time_full_boost")
        percent_zero = self._g(p, "percent_zero_boost", 0)
        percent_full = self._g(p, "percent_full_boost", 0)
        bpm = self._g(p, "bpm")
        bcpm = self._g(p, "bcpm")

        avg_speed = self._g(p, "avg_speed", 1400)
        total_distance = self._g(p, "total_distance")
        time_supersonic = self._g(p, "time_supersonic_speed")
        time_boost_speed = self._g(p, "time_boost_speed")
        time_slow_speed = self._g(p, "time_slow_speed")
        time_ground = self._g(p, "time_ground")
        time_low_air = self._g(p, "time_low_air")
        time_high_air = self._g(p, "time_high_air")
        time_powerslide = self._g(p, "time_powerslide")
        count_powerslide = self._g(p, "count_powerslide")
        percent_supersonic = self._g(p, "percent_supersonic_speed", 0)
        percent_ground = self._g(p, "percent_ground", 0)
        percent_low_air = self._g(p, "percent_low_air", 0)
        percent_high_air = self._g(p, "percent_high_air", 0)

        avg_dist_ball = self._g(p, "avg_distance_to_ball", 2000)
        avg_dist_mates = self._g(p, "avg_distance_to_mates", 1200)
        time_offensive = self._g(p, "time_offensive_third")
        time_neutral = self._g(p, "time_neutral_third")
        time_defensive = self._g(p, "time_defensive_third")
        time_behind = self._g(p, "time_behind_ball")
        time_infront = self._g(p, "time_infront_ball")
        time_most_back = self._g(p, "time_most_back")
        time_most_forward = self._g(p, "time_most_forward")
        time_closest = self._g(p, "time_closest_to_ball")
        time_farthest = self._g(p, "time_farthest_from_ball")
        percent_offensive = self._g(p, "percent_offensive_third", 0)
        percent_defensive = self._g(p, "percent_defensive_third", 0)
        goals_against_last = self._g(p, "goals_against_while_last_defender")

        demos_inflicted = self._g(p, "inflicted")
        demos_taken = self._g(p, "taken")

        time_air = time_low_air + time_high_air
        total_movement = time_ground + time_air
        air_pct = (time_air / max(total_movement, 1)) * 100
        ground_pct = (time_ground / max(total_movement, 1)) * 100

        boost_wasted_ratio = boost_supersonic / max(amount_collected, 1) * 100
        overfill_ratio = overfill / max(amount_collected, 1) * 100
        steal_ratio = amount_stolen / max(amount_collected, 1) * 100
        big_ratio = count_big / max(count_big + count_small, 1) * 100
        small_ratio = count_small / max(count_big + count_small, 1) * 100

        return {
            "goals": goals, "assists": assists, "saves": saves, "shots": shots,
            "score": score, "mvp": mvp, "shooting_pct": round(shooting_pct, 1),
            "boost_avg": round(boost_avg, 1),
            "boost_collected": round(amount_collected),
            "boost_stolen": round(amount_stolen),
            "count_big_pads": count_big,
            "count_small_pads": count_small,
            "boost_overfill": round(overfill),
            "boost_wasted_pct": round(boost_wasted_ratio, 1),
            "overfill_pct": round(overfill_ratio, 1),
            "steal_pct": round(steal_ratio, 1),
            "big_pad_pct": round(big_ratio, 1),
            "time_zero_boost": round(time_zero, 1),
            "time_full_boost": round(time_full, 1),
            "percent_zero_boost": round(percent_zero, 1),
            "percent_full_boost": round(percent_full, 1),
            "bpm": round(bpm),
            "bcpm": round(bcpm),
            "avg_speed": round(avg_speed),
            "total_distance": round(total_distance),
            "time_supersonic": round(time_supersonic, 1),
            "time_boost_speed": round(time_boost_speed, 1),
            "time_slow_speed": round(time_slow_speed, 1),
            "time_ground": round(time_ground, 1),
            "time_low_air": round(time_low_air, 1),
            "time_high_air": round(time_high_air, 1),
            "time_air": round(time_air, 1),
            "air_pct": round(air_pct, 1),
            "ground_pct": round(ground_pct, 1),
            "percent_supersonic": round(percent_supersonic, 1),
            "time_powerslide": round(time_powerslide, 1),
            "count_powerslide": count_powerslide,
            "time_offensive": round(time_offensive, 1),
            "time_neutral": round(time_neutral, 1),
            "time_defensive": round(time_defensive, 1),
            "percent_offensive": round(percent_offensive, 1),
            "percent_defensive": round(percent_defensive, 1),
            "time_behind_ball": round(time_behind, 1),
            "time_infront_ball": round(time_infront, 1),
            "time_most_back": round(time_most_back, 1),
            "time_most_forward": round(time_most_forward, 1),
            "time_closest_to_ball": round(time_closest, 1),
            "time_farthest_from_ball": round(time_farthest, 1),
            "dist_ball": round(avg_dist_ball),
            "dist_mates": round(avg_dist_mates),
            "goals_against_last_defender": goals_against_last,
            "demos_inflicted": demos_inflicted,
            "demos_taken": demos_taken,
        }

    def _generate_tips(self, a):
        tips = []

        s = a["shots"]
        g = a["goals"]
        sp = a["shooting_pct"]

        if sp < 25 and s >= 3:
            tips.append({
                "type": "shooting", "priority": "high",
                "title": random_choice(["دقتك في التسديد تصدق؟", "تصيب ولا تخيب؟", "وش هالدقة الخايسة"]),
                "advice": f"سددت {s} مرات ودخلت {g} أهداف ({sp}%). لو تسدد على بحر بتصيب سمكة. رح training pack تسديد."
            })
        elif s > 0 and g == 0:
            tips.append({
                "type": "shooting", "priority": "medium",
                "title": random_choice(["سددت ولا سجلت", "أيش هالتسديدات", "من جدك؟ صفر أهداف؟"]),
                "advice": f"{s} تسديدات وصفر. الغرض من التسديد إنه يدخل المرمى مو يضيع في الجدار."
            })
        elif sp >= 40 and s >= 3:
            tips.append({
                "type": "shooting", "priority": "low",
                "title": random_choice(["فيه بارود", "دقة تسديد ممتازة"]),
                "advice": f"{sp}% دقة. زين والله."
            })

        ba = a["boost_avg"]
        if ba < 25:
            tips.append({
                "type": "boost", "priority": "high",
                "title": random_choice(["بوست؟ أيش هذا", "وش معنى boost؟", "فاضي مثل المطافي"]),
                "advice": f"معدل بوست {ba}. والله إن سرعة السيارة العادية أسرع منك. الـ small pads موجودة عشانك. مشي عليها وانت رايح."
            })
        elif ba < 40:
            tips.append({
                "type": "boost", "priority": "high",
                "title": random_choice(["جوعان بوست", "بنزينك طاف"]),
                "advice": f"معدل boost {ba}. أغلب وقتك فاضي. الطريق مبلط بالـ small pads."
            })
        elif ba < 55:
            tips.append({
                "type": "boost", "priority": "medium",
                "title": random_choice(["مقبول", "قربت تبطّل"]),
                "advice": f"معدل boost {ba}. مو مرتفع بس أحسن من ناس."
            })

        pz = a["percent_zero_boost"]
        if pz > 18:
            tips.append({
                "type": "boost_zero", "priority": "high",
                "title": random_choice(["جنبك حنفية فاضية", "صفر بوست طول الوقت"]),
                "advice": f"{pz}% من وقتك بوستك صفر. كل ١٠ ثوان ٢ منهم مفصول. إذا جاءتك هجمة وأنت فاضي بتتفرج."
            })

        bw = a["boost_wasted_pct"]
        if bw > 18:
            tips.append({
                "type": "boost_waste", "priority": "high",
                "title": random_choice(["حرام البوست", "هدر بالراحة"]),
                "advice": f"{bw}% من بوستك وأنت supersonic. بعد ما توصل ارفع رجلك."
            })
        elif bw > 10:
            tips.append({
                "type": "boost_waste", "priority": "medium",
                "title": random_choice(["خفف شوي", "فيه هدر بسيط"]),
                "advice": f"{bw}% بوست يضيع وأنت عالسرعة. دامك supersonic ليه تضغط؟"
            })

        ov = a["overfill_pct"]
        if ov > 12:
            tips.append({
                "type": "boost_overfill", "priority": "medium",
                "title": random_choice(["تأخذ وانت شبعان", "جشع بوست"]),
                "advice": f"{ov}% راح على الفاضي لأنك تاخذ boost وأنت ١٠٠. إذا انت full لا تاخذ."
            })

        bp = a["count_big_pads"]
        sp2 = a["count_small_pads"]
        if bp > 0 and sp2 < 5:
            tips.append({
                "type": "boost_pads", "priority": "high",
                "title": random_choice(["مدمن big pads", "small pads حرام عليك؟"]),
                "advice": f"أخذت {bp} كبير و{sp2} صغير. الـ small pads موجودة."
            })

        bpr = a["big_pad_pct"]
        if bpr > 65 and sp2 > 0:
            tips.append({
                "type": "boost_pads", "priority": "medium",
                "title": random_choice(["big pad مدمن", "إدمان بوست كبير"]),
                "advice": f"{bpr}% من البودات كبيرة. خفف شوي."
            })

        tf2 = a["time_offensive"]
        td2 = a["time_defensive"]
        if tf2 > 0 and td2 > 0:
            ratio = tf2 / max(td2, 1)
            if ratio > 2:
                tips.append({
                    "type": "positioning", "priority": "high",
                    "title": random_choice(["ما ترجع ولا على بالك", "فاكرها لعبة فردي"]),
                    "advice": f"هجوم {tf2}ث / دفاع {td2}ث. أول ما تنكب ارجع بسرعة."
                })
            elif ratio > 1.3:
                tips.append({
                    "type": "positioning", "priority": "medium",
                    "title": random_choice(["ارجع يا رجل", "كلك هجوم"]),
                    "advice": f"هجوم {tf2}ث دفاع {td2}ث. ترجع على مهلك."
                })
            elif ratio < 0.4:
                tips.append({
                    "type": "positioning", "priority": "medium",
                    "title": random_choice(["تلعب دفاع من خوف", "تشجع شوي"]),
                    "advice": "دفاع أكثر من هجوم. تقدم."
                })

        po = a["percent_offensive"]
        pd2 = a["percent_defensive"]
        if pd2 > 55 and po < 20:
            tips.append({
                "type": "positioning", "priority": "high",
                "title": random_choice(["قاعد في الدفاع", "حارس المرمى"]),
                "advice": f"{pd2}% دفاع. غير جو."
            })

        bh = a["time_behind_ball"]
        ib = a["time_infront_ball"]
        if bh > 0 and ib > 0:
            br = bh / max(ib, 1)
            if br > 4:
                tips.append({
                    "type": "positioning", "priority": "high",
                    "title": random_choice(["ورا الكرة كالظل", "تخاف تقف قدام"]),
                    "advice": f"أكثر من {br:.0f} أضعاف ورا الكرة. تقدم."
                })

        tm_back = a["time_most_back"]
        tm_fwd = a["time_most_forward"]
        if tm_back > 0 and tm_fwd > 0:
            rr = tm_back / max(tm_fwd, 1)
            if rr > 2.5:
                tips.append({
                    "type": "rotation", "priority": "high",
                    "title": random_choice(["دايمًا آخر رجل", "تخاف تتقدم"]),
                    "advice": f"آخر رجل {tm_back}ث / أول رجل {tm_fwd}ث."
                })
            elif tm_fwd / max(tm_back, 1) > 3:
                tips.append({
                    "type": "rotation", "priority": "medium",
                    "title": random_choice(["قدام طول الوقت", "تنسى الدفاع"]),
                    "advice": f"أول رجل {tm_fwd}ث / آخر رجل {tm_back}ث."
                })

        gal = a["goals_against_last_defender"]
        if gal > 0:
            tips.append({
                "type": "defense", "priority": "high",
                "title": random_choice(["فيه ثغرة دفاعية", "دخل عليك وأنت آخر رجل"]),
                "advice": f"دخل عليك {gal} أهداف وأنت آخر رجل. shadow defense."
            })

        if a["saves"] == 0 and td2 > tf2:
            tips.append({
                "type": "defense", "priority": "medium",
                "title": random_choice(["تقعد بالدفاع ولا فايدة", "مستثمر في الدفاع"]),
                "advice": "تقعد بمنطقتك وما تسوي تصديات. اقرأ اللعب."
            })

        ha = a["time_high_air"]
        la = a["time_low_air"]
        ap = a["air_pct"]

        if ha < 3 and la > 10:
            tips.append({
                "type": "aerials", "priority": "medium",
                "title": random_choice(["ارفع راسك", "تحتاج طيران عالي"]),
                "advice": f"High air {ha}ث بس. fast aerial."
            })
        elif ap < 10:
            tips.append({
                "type": "aerials", "priority": "medium",
                "title": random_choice(["وش لك في الأرض", "طير يا حمامة"]),
                "advice": f"فقط {ap}% جو."
            })

        if a["avg_speed"] < 1500:
            tips.append({
                "type": "speed", "priority": "medium",
                "title": random_choice(["بطيء", "حرك شوي"]),
                "advice": "سرعة تحت 1500."
            })

        ps = a["percent_supersonic"]
        if ps < 10:
            tips.append({
                "type": "speed", "priority": "medium",
                "title": random_choice(["supersonic؟", "وش supersonic هذه"]),
                "advice": f"{ps}% supersonic."
            })

        cp = a["count_powerslide"]
        if cp > 0:
            avg_slide = a["time_powerslide"] / max(cp, 1)
            if avg_slide > 0.35:
                tips.append({
                    "type": "mechanics", "priority": "medium",
                    "title": random_choice(["تتمسك بالباورسلايد", "أطول من عمري"]),
                    "advice": f"معدل powerslide {avg_slide:.2f}s."
                })
            elif avg_slide < 0.15 and cp > 10:
                tips.append({
                    "type": "mechanics", "priority": "low",
                    "title": random_choice(["powerslide نظيف", "سريع"]),
                    "advice": f"{avg_slide:.2f}s. ممتاز."
                })

        sp3 = a["steal_pct"]
        if sp3 > 35:
            tips.append({
                "type": "boost_steal", "priority": "low",
                "title": random_choice(["حرامي محترف", "يسرق boost"]),
                "advice": f"{sp3}% من بوستك من الخصم."
            })
        elif sp3 < 5 and a["boost_collected"] > 500:
            tips.append({
                "type": "boost_steal", "priority": "medium",
                "title": random_choice(["يسرقون بوستك", "خلك حرامي"]),
                "advice": f"{sp3}% فقط مسروق."
            })

        di = a["demos_inflicted"]
        dt = a["demos_taken"]
        if di > 0 and dt > 0:
            if di >= dt * 2:
                tips.append({
                    "type": "demos", "priority": "low",
                    "title": random_choice(["دباسة بشر", "ديمو ملك"]),
                    "advice": f"{di} / {dt}."
                })
            elif dt > di:
                tips.append({
                    "type": "demos", "priority": "medium",
                    "title": random_choice(["ينديمونك", "يتيم ديمو"]),
                    "advice": f"أخذت {dt} وسويت {di}."
                })
        elif di > 0 and dt == 0:
            tips.append({
                "type": "demos", "priority": "low",
                "title": random_choice(["بدم بارد", "ديمو وصفر"]),
                "advice": f"سويت {di} وأخذت صفر."
            })

        dm = a["dist_mates"]
        if dm > 3200:
            tips.append({
                "type": "teamplay", "priority": "high",
                "title": random_choice(["بعيد عن الناس", "تلعب لحالك"]),
                "advice": f"المسافة {dm}. قرب."
            })
        elif dm < 700 and dm > 0:
            tips.append({
                "type": "teamplay", "priority": "medium",
                "title": random_choice(["ملزق فيهم", "زاحف"]),
                "advice": f"تبعد {dm} فقط."
            })

        db = a["dist_ball"]
        if db > 3800:
            tips.append({
                "type": "pressure", "priority": "high",
                "title": random_choice(["كرة؟ ما أشوفها", "بعيد مرة"]),
                "advice": f"تبعد {db}. اضغط."
            })

        sl = a["time_slow_speed"]
        bs = a["time_boost_speed"]
        if sl > 0 and bs > 0:
            sr = sl / max(bs, 1)
            if sr > 2.5:
                tips.append({
                    "type": "speed", "priority": "low",
                    "title": random_choice(["تمشي على مهلك", "تتمشى"]),
                    "advice": "بطيء أكثر من السريع. حرك."
                })

        g2 = a["goals"]
        as2 = a["assists"]
        sv2 = a["saves"]
        sh2 = a["shots"]
        sco = a["score"]

        if g2 == 0 and as2 == 0 and sv2 == 0 and sh2 == 0:
            tips.append({
                "type": "general", "priority": "high",
                "title": random_choice(["وش سويت بالمباراة؟", "حضورك غياب"]),
                "advice": "صفر في كل شيء."
            })

        if g2 == 0 and as2 == 0 and sv2 == 0 and sh2 == 0 and sco == 0:
            tips.append({
                "type": "general", "priority": "high",
                "title": random_choice(["حرفيًّا ما سويت شيء", "أنت كانك ما كنت"]),
                "advice": "سكور صفر. وش أقولك؟"
            })

        total_impact = g2 + as2 + sv2 + sh2
        if total_impact > 0:
            if total_impact < 3:
                tips.append({
                    "type": "general", "priority": "medium",
                    "title": random_choice(["تأثيرك خفيف", "بالكاد حسّينا فيك"]),
                    "advice": f"مجموع {total_impact} فقط."
                })
            elif total_impact > 10:
                tips.append({
                    "type": "general", "priority": "low",
                    "title": random_choice(["فاعل خير", "تأثير واضح"]),
                    "advice": f"{total_impact}. استمر."
                })
            elif total_impact > 6:
                tips.append({
                    "type": "general", "priority": "low",
                    "title": random_choice(["ماشي حالك", "كويس"]),
                    "advice": f"{total_impact}. فيه أحسن."
                })

        if sco > 500:
            tips.append({
                "type": "general", "priority": "low",
                "title": random_choice(["سكور عالي", "أنت الزعيم"]),
                "advice": f"{sco}. ناصح."
            })
        elif sco > 300:
            tips.append({
                "type": "general", "priority": "low",
                "title": random_choice(["سكور كويس", "مقبول"]),
                "advice": f"{sco}. فيه أفضل."
            })

        tips.sort(key=lambda t: {"high": 0, "medium": 1, "low": 2}[t["priority"]])

        return tips

import random as _rl_random
def random_choice(items):
    return _rl_random.choice(items)
