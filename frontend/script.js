const API_URL = "/api/analyze";
const SET_KEY_URL = "/api/set-key";

const apiInput = document.getElementById("api-key-input");
const apiStatus = document.getElementById("api-status");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const uploadStatus = document.getElementById("upload-status");
const resultsSection = document.getElementById("results-section");
const errorSection = document.getElementById("error-section");
const errorMessage = document.getElementById("error-message");

const savedMode = localStorage.getItem("rl_game_mode") || "1v1";
let gameMode = savedMode;

document.querySelectorAll(".mode-option").forEach(el => {
    if (el.dataset.mode === savedMode) {
        el.classList.add("selected");
        el.querySelector("input[type=radio]").checked = true;
    }
});

document.querySelectorAll(".mode-option").forEach(el => {
    el.addEventListener("click", () => {
        document.querySelectorAll(".mode-option").forEach(o => o.classList.remove("selected"));
        el.classList.add("selected");
        el.querySelector("input[type=radio]").checked = true;
        gameMode = el.dataset.mode;
        localStorage.setItem("rl_game_mode", gameMode);
    });
});

const savedKey = localStorage.getItem("rl_api_key");
if (savedKey) {
    apiInput.value = savedKey;
    fetch(SET_KEY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: savedKey })
    });
}

// ═══ AUTH ═══════════════════════════════════
let authMode = "login";

function checkAuth() {
    fetch("/api/me")
        .then(r => r.json())
        .then(data => {
            if (data.user) {
                document.getElementById("auth-logged-out").classList.add("hidden");
                document.getElementById("auth-logged-in").classList.remove("hidden");
                document.getElementById("auth-username").textContent = data.user;
            }
        })
        .catch(() => {});
}

function showAuthModal(mode) {
    authMode = mode;
    document.getElementById("auth-modal").classList.remove("hidden");
    document.getElementById("auth-modal-title").textContent = mode === "login" ? "تسجيل دخول" : "إنشاء حساب جديد";
    document.getElementById("auth-submit-btn").textContent = mode === "login" ? "دخول" : "تسجيل";
    document.getElementById("auth-error").style.display = "none";
    document.getElementById("auth-input-username").value = "";
    document.getElementById("auth-input-password").value = "";
}

function closeAuthModal() {
    document.getElementById("auth-modal").classList.add("hidden");
}

function handleAuth(event) {
    event.preventDefault();
    const username = document.getElementById("auth-input-username").value.trim();
    const password = document.getElementById("auth-input-password").value.trim();
    const errorEl = document.getElementById("auth-error");
    const endpoint = authMode === "login" ? "/api/login" : "/api/register";

    fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            closeAuthModal();
            document.getElementById("auth-logged-out").classList.add("hidden");
            document.getElementById("auth-logged-in").classList.remove("hidden");
            document.getElementById("auth-username").textContent = data.user;
        } else {
            errorEl.textContent = data.error || "حدث خطأ";
            errorEl.style.display = "block";
        }
    })
    .catch(() => {
        errorEl.textContent = "تعذر الاتصال بالخادم";
        errorEl.style.display = "block";
    });
    return false;
}

function logoutUser() {
    fetch("/api/logout", { method: "POST" })
        .then(r => r.json())
        .then(() => {
            document.getElementById("auth-logged-out").classList.remove("hidden");
            document.getElementById("auth-logged-in").classList.add("hidden");
        })
        .catch(() => {});
}

checkAuth();

function saveApiKey() {
    const key = apiInput.value.trim();
    if (!key) { alert("اكتب مفتاح API أول"); return; }
    fetch(SET_KEY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            localStorage.setItem("rl_api_key", key);
            apiStatus.textContent = "✅ تم حفظ المفتاح";
            apiStatus.classList.remove("hidden");
            setTimeout(() => apiStatus.classList.add("hidden"), 3000);
        }
    })
    .catch(() => alert("فشل حفظ المفتاح. شغل السيرفر أول."));
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
    if (!file.name.toLowerCase().endsWith(".replay")) {
        showError("الملف لازم يكون .replay");
        return;
    }
    if (!localStorage.getItem("rl_api_key")) {
        showError("سوي حفظ لمفتاح API الأول");
        return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("game_mode", gameMode);
    dropZone.classList.add("hidden");
    uploadStatus.classList.remove("hidden");
    fetch(API_URL, { method: "POST", body: formData })
    .then(res => res.json())
    .then(data => {
        uploadStatus.classList.add("hidden");
        dropZone.classList.remove("hidden");
        if (data.success) showResults(data);
        else showError(data.error || "خطأ غير معروف");
    })
    .catch(() => {
        uploadStatus.classList.add("hidden");
        dropZone.classList.remove("hidden");
        showError("تعذر الاتصال. شغل الباك اند.");
    });
}

function showResults(data) {
    resultsSection.classList.remove("hidden");
    errorSection.classList.add("hidden");
    const game = data.game_info;
    const players = data.players;
    const mins = Math.floor((game.duration || 0) / 60);
    const secs = Math.floor((game.duration || 0) % 60);

    document.getElementById("game-details").innerHTML = `
        <div class="game-stat"><span class="label">الخريطة</span><span class="value">${game.map}</span></div>
        <div class="game-stat"><span class="label">المدة</span><span class="value">${mins}:${secs.toString().padStart(2, "0")}</span></div>
        <div class="game-stat"><span class="label">${game.blue_name}</span><span class="value" style="color:#4a9eff">${game.blue_goals}</span></div>
        <div class="game-stat"><span class="label">${game.orange_name}</span><span class="value" style="color:#ff8c33">${game.orange_goals}</span></div>
        <div class="game-stat"><span class="label">النوع</span><span class="value">${game.playlist}</span></div>
        ${game.overtime ? `<div class="game-stat"><span class="label">⏱</span><span class="value" style="color:#ff1744">وقت إضافي!</span></div>` : ""}
    `;

    // Trends
    const trends = data.trends || {};
    renderTrends(trends);

    // Players
    let html = "";
    players.forEach((p, i) => {
        const s = p.stats;
        const tc = p.team_key || (i < 2 ? "blue" : "orange");
        const pTrends = trends[p.name];
        html += `
        <div class="player-card team-${tc}">
            <div class="player-header">
                <span class="player-name">${p.name}</span>
                <span class="team-badge ${tc}">${tc === "blue" ? "الأزرق" : "البرتقالي"}</span>
            </div>
            ${pTrends && pTrends.insights && pTrends.insights.length ? `
            <div class="trends-mini">
                ${pTrends.insights.map(i => `<span class="trend-insight">${i}</span>`).join("")}
            </div>` : ""}
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">⚽ أهداف</span><span class="stat-value">${s.goals}</span></div>
                <div class="stat-item"><span class="stat-label">🎯 تمريرات</span><span class="stat-value">${s.assists}</span></div>
                <div class="stat-item"><span class="stat-label">🛑 تصديات</span><span class="stat-value">${s.saves}</span></div>
                <div class="stat-item"><span class="stat-label">🔫 تسديدات</span><span class="stat-value">${s.shots}</span></div>
                <div class="stat-item"><span class="stat-label">📊 دقة التسديد</span><span class="stat-value ${s.shooting_pct < 20 && s.shots > 2 ? "bad" : s.shooting_pct > 40 ? "good" : "warn"}">${s.shooting_pct}%</span></div>
                <div class="stat-item"><span class="stat-label">⭐ سكور</span><span class="stat-value">${s.score}</span></div>
                <div class="stat-item"><span class="stat-label">⛽ بوست (وسط)</span><span class="stat-value ${s.boost_avg < 30 ? "bad" : s.boost_avg < 50 ? "warn" : "good"}">${s.boost_avg}</span></div>
                <div class="stat-item"><span class="stat-label">📦 بوست مجمع</span><span class="stat-value">${s.boost_collected}</span></div>
                <div class="stat-item"><span class="stat-label">🔫 بوست مسروق</span><span class="stat-value">${s.boost_stolen}</span></div>
                <div class="stat-item"><span class="stat-label">🟦 بودات كبيرة</span><span class="stat-value">${s.count_big_pads}</span></div>
                <div class="stat-item"><span class="stat-label">🟩 بودات صغيرة</span><span class="stat-value">${s.count_small_pads}</span></div>
                <div class="stat-item"><span class="stat-label">🗑️ بوست مهدر supersonic</span><span class="stat-value ${s.boost_wasted_pct > 15 ? "bad" : "warn"}">${s.boost_wasted_pct}%</span></div>
                <div class="stat-item"><span class="stat-label">🪫 وقت 0 بوست</span><span class="stat-value ${s.percent_zero_boost > 15 ? "bad" : "warn"}">${s.percent_zero_boost}%</span></div>
                <div class="stat-item"><span class="stat-label">🔵 Full boost</span><span class="stat-value">${s.percent_full_boost}%</span></div>
                <div class="stat-item"><span class="stat-label">♻️ Overfill</span><span class="stat-value ${s.overfill_pct > 10 ? "bad" : "warn"}">${s.overfill_pct}%</span></div>
                <div class="stat-item"><span class="stat-label">🏃 سرعة وسط</span><span class="stat-value ${s.avg_speed < 1500 ? "warn" : "good"}">${s.avg_speed}</span></div>
                <div class="stat-item"><span class="stat-label">💨 Supersonic</span><span class="stat-value">${s.percent_supersonic}%</span></div>
                <div class="stat-item"><span class="stat-label">🚶 بطيء</span><span class="stat-value">${s.time_slow_speed}ث</span></div>
                <div class="stat-item"><span class="stat-label">🌍 على الأرض</span><span class="stat-value">${s.ground_pct}%</span></div>
                <div class="stat-item"><span class="stat-label">🕊️ في الجو</span><span class="stat-value">${s.air_pct}%</span></div>
                <div class="stat-item"><span class="stat-label">🎯 High aerials</span><span class="stat-value">${s.time_high_air}ث</span></div>
                <div class="stat-item"><span class="stat-label">⚔️ هجوم</span><span class="stat-value" style="color:#4a9eff">${s.percent_offensive}%</span></div>
                <div class="stat-item"><span class="stat-label">🛡️ دفاع</span><span class="stat-value" style="color:#ff8c33">${s.percent_defensive}%</span></div>
                <div class="stat-item"><span class="stat-label">📍 مسافة للكرة</span><span class="stat-value">${s.dist_ball}</span></div>
                <div class="stat-item"><span class="stat-label">👥 مسافة للفريق</span><span class="stat-value">${s.dist_mates}</span></div>
                <div class="stat-item"><span class="stat-label">🔙 ورا الكرة</span><span class="stat-value">${s.time_behind_ball}ث</span></div>
                <div class="stat-item"><span class="stat-label">🔜 قدام الكرة</span><span class="stat-value">${s.time_infront_ball}ث</span></div>
                <div class="stat-item"><span class="stat-label">💥 ديمو سويته</span><span class="stat-value">${s.demos_inflicted}</span></div>
                <div class="stat-item"><span class="stat-label">💀 ديمو أخذته</span><span class="stat-value">${s.demos_taken}</span></div>
                <div class="stat-item"><span class="stat-label">🌀 Powerslides</span><span class="stat-value">${s.count_powerslide}</span></div>
                ${s.goals_against_last_defender ? `<div class="stat-item"><span class="stat-label">🔥 أهداف بدفاعي</span><span class="stat-value" style="color:#ff1744;font-weight:900">${s.goals_against_last_defender}</span></div>` : ""}
            </div>
            <div class="tips-section">
                <h3>💡 نصائح مخصصة — بدون مجاملة</h3>
                ${p.tips.map(t => `
                    <div class="tip-card priority-${t.priority}">
                        <div class="tip-header">
                            <span class="tip-title">${t.title}</span>
                            <span class="tip-priority ${t.priority}">${t.priority === "high" ? "🚨 مهم" : t.priority === "medium" ? "⚡ متوسط" : "✅ ممتاز"}</span>
                        </div>
                        <p class="tip-advice">${t.advice}</p>
                    </div>
                `).join("")}
            </div>
            <button class="btn btn-sm btn-history" onclick="loadPlayerHistory('${p.name}')">📜 سجل ${p.name}</button>
        </div>`;
    });
    document.getElementById("players-results").innerHTML = html;

    // Team analysis (scrim)
    if (data.team_analysis) {
        renderTeamAnalysis(data.team_analysis);
    }

    // Load history for first player
    if (players.length > 0) {
        loadPlayerHistory(players[0].name);
    }

    resultsSection.scrollIntoView({ behavior: "smooth" });
}

function renderTrends(trends) {
    const section = document.getElementById("trends-section");
    const names = Object.keys(trends);
    if (!names.length) { section.classList.add("hidden"); return; }

    let cards = "";
    for (const name of names) {
        const t = trends[name];
        if (!t.insights || !t.insights.length) continue;
        cards += `
        <div class="trends-card">
            <div class="trends-player-name">📈 ${name} — ${t.games_analyzed} مباريات</div>
            <div class="trends-insights">
                ${t.insights.map(i => `<div class="trend-insight">${i}</div>`).join("")}
            </div>
        </div>`;
    }

    if (cards) {
        section.innerHTML = `
            <div class="card">
                <h2>📊 تطور المستوى</h2>
                <div class="trends-grid">${cards}</div>
            </div>`;
        section.classList.remove("hidden");
    } else {
        section.classList.add("hidden");
    }
}

function renderTeamAnalysis(teamData) {
    const section = document.getElementById("team-section");
    section.classList.remove("hidden");

    const modeLabel = gameMode === "scrim" ? "سكريم" : "3v3";
    let html = `<div class="card"><h2>🏆 تحليل الفريق — ${modeLabel}</h2><div class="team-grid">`;
    for (const key of ["blue", "orange"]) {
        const t = teamData[key];
        if (!t) continue;
        const won = t.goals > t.opponent_goals;
        const drawn = t.goals === t.opponent_goals;
        const resultClass = drawn ? "team-drawn" : (won ? "team-won" : "team-lost");
        const icon = won ? "✅" : (drawn ? "⚖️" : "❌");
        html += `
        <div class="team-card ${resultClass}">
            <div class="team-header">
                <span class="team-name" style="color:${key === "blue" ? "#4a9eff" : "#ff8c33"}">${t.name}</span>
                <span class="team-result">${t.goals} - ${t.opponent_goals} ${icon}</span>
            </div>
            <div class="team-stats">
                <div class="team-stat"><span class="label">🚀 سرعة الفريق</span><span class="value">${t.avg_speed}</span></div>
                <div class="team-stat"><span class="label">⛽ boost</span><span class="value">${t.avg_boost}</span></div>
                <div class="team-stat"><span class="label">🎯 تسديدات</span><span class="value">${t.total_shots}</span></div>
                <div class="team-stat"><span class="label">🛑 تصديات</span><span class="value">${t.total_saves}</span></div>
                <div class="team-stat"><span class="label">🎯 تمريرات</span><span class="value">${t.total_assists}</span></div>
                <div class="team-stat"><span class="label">💥 ديمو</span><span class="value">${t.demos_inflicted}</span></div>
                <div class="team-stat"><span class="label">📍 مسافة للكرة</span><span class="value">${t.avg_distance_ball}</span></div>
                <div class="team-stat"><span class="label">👥 تماسك الفريق</span><span class="value">${t.avg_distance_mates}</span></div>
                <div class="team-stat"><span class="label">⭐ مجموع سكور</span><span class="value">${t.total_score}</span></div>
            </div>
            <div class="tips-section">
                <h3>💡 نصائح الفريق</h3>
                ${t.tips.map(tip => `
                    <div class="tip-card priority-${tip.priority}">
                        <div class="tip-header">
                            <span class="tip-title">${tip.title}</span>
                            <span class="tip-priority ${tip.priority}">${tip.priority === "high" ? "🚨 مهم" : tip.priority === "medium" ? "⚡ متوسط" : "✅ ممتاز"}</span>
                        </div>
                        <p class="tip-advice">${tip.advice}</p>
                    </div>
                `).join("")}
            </div>
        </div>`;
    }
    html += '</div></div>';
    section.innerHTML = html;
}

function loadPlayerHistory(playerName) {
    const section = document.getElementById("history-section");
    const content = document.getElementById("history-content");
    fetch(`/api/history/${encodeURIComponent(playerName)}?mode=${gameMode}`)
        .then(r => r.json())
        .then(data => {
            if (!data.history || !data.history.length) {
                section.classList.add("hidden");
                return;
            }
            section.classList.remove("hidden");
            const h = data.history;
            let rows = h.map((g, i) => {
                const won = (g.team === "blue" && g.blue_goals > g.orange_goals) || (g.team === "orange" && g.orange_goals > g.blue_goals);
                const drawn = g.blue_goals === g.orange_goals;
                return `
                <tr>
                    <td>#${h.length - i}</td>
                    <td>${g.map_name || "-"}</td>
                    <td>${g.goals} / ${g.assists} / ${g.saves}</td>
                    <td>${g.shooting_pct}%</td>
                    <td>${g.boost_avg}</td>
                    <td>${g.score}</td>
                    <td style="color:${won ? "#00c853" : drawn ? "#ffab00" : "#ff1744"}">${won ? "فوز" : drawn ? "تعادل" : "خسارة"}</td>
                    <td style="font-size:12px;color:#5a6a8a">${g.uploaded_at ? g.uploaded_at.slice(0, 10) : "-"}</td>
                </tr>`;
            }).join("");
            content.innerHTML = `
                <p style="margin-bottom:10px;color:#8892b0">آخر ${h.length} مباريات — ${playerName}</p>
                <div class="table-wrap">
                    <table class="history-table">
                        <thead><tr>
                            <th>#</th><th>الخريطة</th><th>أهداف/تمرير/تصدي</th><th>دقة</th><th>boost</th><th>سكور</th><th>نتيجة</th><th>التاريخ</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        })
        .catch(() => section.classList.add("hidden"));
}

function showError(msg) {
    errorSection.classList.remove("hidden");
    resultsSection.classList.add("hidden");
    errorMessage.innerHTML = msg.replace(/\n/g, "<br>");
}

function resetApp() {
    errorSection.classList.add("hidden");
    resultsSection.classList.add("hidden");
    dropZone.classList.remove("hidden");
    uploadStatus.classList.add("hidden");
    document.getElementById("file-input").value = "";
}

// ═══════════════════════════════════════════════
// AI COACH — Knowledge Base, Matcher, UI
// ═══════════════════════════════════════════════

const coachKnowledge = [
    {
        id: "rotations",
        name: "روتنيشن",
        topics: ["روتنيشن", "روتيشن", "rotations", "دوران"],
        responses: [
            "الروتنيشن هو أساس اللعب الجماعي. في 3v3، أفضّل نظام الـ 3 أدوار: 1 هجوم، 1 مساند، 1 دفاع. أبداً لا تجلس ورا زميلك نفس المنطقة — وزعوا المساحة. واهم شي: إذا زميلك رجع عنده boost قليل، اترك اللعبة وارجع بداله.",
            "في 2v2، الفكرة أبسط: واحد هجوم وواحد دفاع. لا تهجم وزميلك وراك — معناها لو ضاعت الكرة هدف مضمون. الـ shadow defense هنا أساسي: ارجع ورا الكرة شوي واقرأ تحركات الخصم بدال ما تنقض على كل شي.",
            "في 1v1 الروتنيشن مختلف — أنت اللاعب الوحيد. ركز على إنك ما تضيع boost بدون فايدة. اعطي نفسك مساحة وكمل البلاي بهدوء. السرعه مو دايم حل — اقرأ لعب الخصم.",
            "من خبرتي في الـ RLCS، الفرق المحترفة تمشي بقاعدة الـ spacing: بين كل لاعب والثاني مسافة سيارة ونص. إذا اقتربت أكثر من كذا، تخلي الدفاع مكشوف. تذكّر: الـ 3v3 مو لعبة فردية."
        ]
    },
    {
        id: "boost",
        name: "بوست",
        topics: ["boost", "بوست", "بست", "نيترو", "nitro", "وقود", "fuel"],
        responses: [
            "إدارة البوست تفرق بين لاعب محترف ولاعب عادي. أول نصيحة: لا تستخدم boost عشان توصل للكرة لو هي رايحه للزميل — خلها. ثاني شي: اعرف مواقع البوستات الكبيرة على الخريطة مثل ظهر يدك.",
            "في الـ RLCS، البوست يحدد الفريق اللي يتحكم بالمباراة. لو boostك قليل، العب small pads بدال ما تروح big pad وتترك منطقتك. الـ small pads تعطيك 12 بوست وموزعة في كل مكان — استغلها.",
            "النصيحة الذهبية: لا توصل لسرعة supersonic كل شوي. خفف زيادة boost عشان ما تضيعه. في الدفاع، حافظ على 30-40 بوست عشان تقدر تتصدى وترجع بسرعة.",
            "سر البوست أن تجمعه بذكاء: ارسم مسارك بين big pads و small pads. واهم شي — لا توقف عشان تجمع boost! تحرك ببطء وانت تجمعه عشان ما تخلي دفاعك فاضي."
        ]
    },
    {
        id: "mechanics",
        name: "ميكانيك",
        topics: ["ميكانيك", "ميكانيكا", "ميكانيكية", "حركات", "فليك", "ايريال", "ايردربل", "دريبل", "ريسيت", "reset", "flip", "wave", "wavedash"],
        responses: [
            "الميكانيك مهم بس مو كل شي. في الـ RLCS، أبسط الحركات تنفع لو طبقتها بوقتها. ركّز على الأساسيات: الـ powerslide cut، الـ hook shot، و wave dash. هذي كافية توصل لـ GC.",
            "الـ flip reset حركة متقدمة — مرة حلوة بس مو ضرورية. شاهد كيف يطبقها Justin و Zen: بسيط و سلس. بس تذكر: ٩ من ١٠ مرات، الـ air dribble البسيط ينفع أكثر من الـ reset.",
            "إذا تبغى تتطور في الميكانيك، خصص ١٠ دقائق free play يومياً. ركز على: fast aerial، flick (front flip و 45 degree)، و powershot. التكرار يخليها عادة.",
            "الـ wavedash أساسي: استخدمه عشان تطلع من الحيطان بسرعة، وعشان توقف بدل ما تطفش بعد الهبوط. ضروري كل لاعب يتقنه.",
            "فيه فرق بين speed و mechanics. اتعلم تقرأ الكرة بدل ما تجري وراها بسرعه. السرعة الزايدة تخلي ميكانيكك غير مضبوط. خذ وقتك."
        ]
    },
    {
        id: "positioning",
        name: "تمركز",
        topics: ["مركز", "position", "تمركز", "مكان", "موقع", "positioning"],
        responses: [
            "التمركز الصحيح يخلي المباراة سهله. اتحرك على طول الخط الوهمي بين الكرة ومرماك. لا تقطع على زميلك ولا تتجمعون في زاويه وحده.",
            "في الدفاع، اقعد على الـ back post. من هناك تشوف كل الملعب. إذا انضغطت، لا تطلع بخروج سيء — استخدم الحائط و اطلع ببطء عشان تعطي زميلك وقت يرجع.",
            "لما تهاجم، لا تدخل الـ corner مع الخصم. خذ الكرة للـ mid و شوف الخيارات. الـ corner موت زون لأي لاعب — يضيق الخيارات و يخليك عرضه للديمو.",
            "شوف الخريطة كاملة، مو بس الكرة. اعرف وين زميلك ووين الخصم. الـ game sense يبدأ من الوعي المكاني. كل ٣ ثواني ارفع راسك من الكرة."
        ]
    },
    {
        id: "2v2",
        name: "2v2",
        topics: ["2v2", "two", "twos", "دبل", "ثنائي"],
        responses: [
            "في الـ 2v2، السر هو التوازن. إذا زميلك مهاجم، انت دفاع. بس مو دفاع بعيد — قريب كفاية عشان لو ارتدت الكرة تلمسها. الفرق الكبيرة تقرأ ارتدادات الكوره قبل لا تصير.",
            "نصيحة قوية: لا تروح للـ boost إذا زميلك في الهجوم ويمكن يفقد الكرة. خذ small pads وابقى قريب. ثانية تأخير منك = هدف عليك.",
            "الـ 2v2 يعتمد على الـ first touch. اللي يلمس الكرة أول يتحكم باللعبة. درب الـ kickoff إلى أن يصبح عندك ثابت. و لا تنسى الـ demo — في 2v2 الديمو يفتح مساحات هائلة.",
            "إذا خسرت المباراة، شوف كم مرة لعبت وانت ورا زميلك (double committing). هذي أكبر غلطة في 2v2. اقرأ تحركات زميلك."
        ]
    },
    {
        id: "3v3",
        name: "3v3",
        topics: ["3v3", "three", "threes", "ثلاثي", "standard"],
        responses: [
            "الـ 3v3 لعبة سرعة و تنظيم. النظام اللي أتبعه: لاعب ١ يضغط (first man)، لاعب ٢ يساند (second man)، لاعب ٣ دفاع بعيد (third man). كل واحد له دور واضح.",
            "الغلطة الأكثر شيوعاً في 3v3: كل اللاعبين يهجمون. لا! إذا تقدمتم كلهم، أي كرة طايرة من الخصم = هدف. لاعب واحد يهجم، الثاني مساند على بعد ١٠ متر، الثالث دفاع.",
            "في الـ kickoff، الـ cheat up (يميل شوي قدام) استراتيجية قوية. بس إذا سويتها و الخصم سوا quick aerial — بتستقبل هدف. اقرأ أسلوب الخصم و قرر.",
            "الفرق المحترفة تتكلم باستمرار. الكل يعلن: \"أنا هاجم\", \"أنا رجعت\", \"دق علي\". إذا ما عندك مايك، استخدم quick chats. التواصل أهم من الميكانيك."
        ]
    },
    {
        id: "1v1",
        name: "1v1",
        topics: ["1v1", "one", "ones", "فردي", "duel"],
        responses: [
            "الـ 1v1 أصعب وضع — كل غلطتك تنشاف ولا في زميل يعوضك. النصيحة الأولى: shadow defense. ارجع مع الكورنر و إقرأ الخصم بدل ما تنقض.",
            "في 1v1، البوست أثمن شيء. لا تهدر boost في هجمات فاشلة. إذا حسيت اللعبة صعبة، ارجع لعب defensive و استغل أخطاء الخصم. الصبر يربح 1v1.",
            "الـ kickoff في 1v1 يحدد المباراة. تدرب على speed flip kickoff و الـ delayed kickoff. إذا فزت بالـ kickoff, عندك فرصة تسجل هدف مباشر.",
            "نصيحة مهمة: لا تروح للـ challenge إذا مو متأكد. أعطي الخصم مساحة، يغلط و تخطف الكورة. في 1v1، اللي يغلط أقل هو الفائز."
        ]
    },
    {
        id: "defense",
        name: "دفاع",
        topics: ["ديفينس", "دفاع", "تصدي", "save", "مرمى", "حارس", "حراسة"],
        responses: [
            "الدفاع يبدأ قبل لا توصل الكرة. التمركز الصحيح يقلل التصدي الصعب. اقعد على back post و خلي الكرة قدامك — لا تكون جنب المرمى.",
            "في التصدي، استخدم الـ jump اقل ما يمكن. إذا تقدر تلمسها وانت على الأرض — أفضل. القفز يخليك خارج اللعبه ثانيتين كاملة.",
            "الـ shadow defense هو أقوى مهارة دفاعية. تقدم مع الكورة بنفس اتجاهها، و اقرأ متى راح يسوي الخصم تسديده. هنا تتصدى.",
            "لا تنسى: التصدي مو بس إبعاد الكرة — التصدي المثالي يوجه الكرة لزميلك عشان تبدأ هجمة مرتدة. شوف وين زميلك قبل ما تلمس الكورة.",
            "من أعظم النصائح من RLCS: شوف الخصم مو الكرة. عيونه و جسمه يخبرك وين بيوجه الكورة قبل لا يلمسها."
        ]
    },
    {
        id: "offense",
        name: "هجوم",
        topics: ["هجوم", "هجمة", "تسديد", "تسديدة", "shot", "تسجيل", "هدف", "scoring"],
        responses: [
            "في الهجوم، التنوع هو السلاح. إذا تسدد نفس النوع كل مرة — الخصم بيقرأك. غير بين: ground shot, air dribble, flick, pass.",
            "أفضل لحظة تسديد: الخصم قاعد يعمل rotate. إذا شفت اثنين من الفريق الخصم في نفس الزاوية — سدد فوراً. المرمى فاضي.",
            "الـ passing play أقوى من الـ solo play. ارفع الكورة للوسط بدل ما تسدد من الزاوية. زميلك عنده فرصة أفضل منك.",
            "في 3v3، الـ back pass يفك الضغط. إذا انحصيت، مرر الكوره لدفاع. يعطيكم فرصة إعادة تنظيم بدل ما تخسر الكورة في نصف ملعبكم."
        ]
    },
    {
        id: "improvement",
        name: "تطوير",
        topics: ["كيف اتدرب", "كيف اطور", "كيف اتعلم", "كيف احسن", "اتدرب", "تطور", "تتحسن", "اتعلم", "تحسن", "طور", "اتطور", "مستواي", "ضعيف", "غلطاتي", "اخطائي", "مشكلتي", "rank", "رنك", "رتبة", "رتبتي"],
        responses: [
            "التطور في روكيت ليق يحتاج شيئين: تكرار واعي و تحليل. العب أقل، حلل أكثر. خذ ١٠ دقائق تشوف ريبلاي نفسك قبل كل جلسة لعب.",
            "أفضل طريقة تتحسن: free play يومياً ١٥ دقيقة قبل ما تبدأ Ranked. ركز على: التحكم بالكرة، السرعة، الـ recoveries. هذي مهارات أساسية.",
            "لا تهتم بالرنك. ركز على مهارة وحدة كل أسبوع. هالاسبوع: wavedashes. الأسبوع الجاي: fast aerials. شهر واحد و بتشوف فرق.",
            "تحليل الريبلاي هو سر المحترفين. شوف كل هدف دخل عليك من منظور ثالث. اسأل نفسك: وين كان المفروض أكون؟",
            "نصيحة من تجربتي: كل ما زاد ضغط المباراة، زادت أخطائك. تدرب على الـ breathing. خذ نفس عميق قبل كل kickoff. اللعبة لعبة mental بنفس ما هي physical.",
            "اللي يمنعك ترتفع مو مهارتك — وعيك بأخطائك. كل رتبة لها مشكلة. plat: تلعب بسرعة بدون تفكير. diamond: تطفش من الدفاع. champ: قرارات سيئة تحت الضغط. حدد رتبتك واشتغل على نقطة الضعف.",
            "أفضل طريقة تتحسن: خذ مهارة واحدة كل أسبوع. الأسبوع الأول: recoveries. الثاني: first touch. الثالث: دقة التسديد. الرابع: shadow defense. كل يوم ١٥ دقيقة قبل الرانكد."
        ]
    },
    {
        id: "mental",
        name: "نفسي",
        topics: ["mental", "عقلي", "نفسي", "غضب", "ضغط", "tilt", "toxic", "toxicity", "nerves", "قلق", "انفعال"],
        responses: [
            "الـ mentality أساسي. إذا خسرت مباراتين ورا بعض — اترك اللعبة. امشي ٥ دقايق، اشرب موية، و ارجع. الـ tilt يخليك تسوء أكثر.",
            "لا ترد على toxic players. كتم الكل و العب لعبتك. الـ chat ما يجيبلك رنك. ركز على اللي تقدر تتحكم فيه: قراراتك و تحركاتك.",
            "في الـ RLCS، الفرق اللي تفوز هي اللي تهدأ تحت الضغط. إذا راح عليك هدف اول — خذ نفس و ابدا من جديد. المباراة ما انتهت.",
            "الـ confidence يأتي من التحضير. إذا تدربت زين قبل المباراة، بتلعب زين. الثقة مو كبرياء — ثقة إنك سويت الـ preparation."
        ]
    },
    {
        id: "teamplay",
        name: "جماعي",
        topics: ["سكريم", "scrim", "فريق", "team", "جماعي", "فريقي", "teamplay"],
        responses: [
            "السكريمات تختلف عن ranked. هنا تحتاج استراتيجية: سو play مكتوب (pre-planned). مثلاً كيك اوف معين يتبعه play معين.",
            "أهم شي في اللعب الجماعي: التواصل. يكون في قائد يعطي تعليمات واضحة. مش \"هجم\" — \"أنا أول، ارجع\". الوضوح يمنع الـ double commit.",
            "في السكريم، جرب تشكيلات مختلفة. كل لاعب له دور: مهاجم، وسط، مدافع. مع الوقت بتعرفون وين كل واحد يبدع.",
            "حللوا سوا بعد كل مباراة. ٥ دقايق نقاش: وش ضبط؟ وش لا؟ بدون لوم. التحليل الجماعي يرفع مستوى الفريق كامل."
        ]
    },
    {
        id: "demos",
        name: "ديمو",
        topics: ["ديمو", "demo", "demolish", "تدمير", "اشتباك", "bump"],
        responses: [
            "الديمو مو حرام — استراتيجيه! استخدمه عشان تفتح مساحة. في 3v3، ديمو المدافع يفتح المرمى بشكل مو طبيعي.",
            "أفضل وقت للديمو: الخصم واقف يتفرج على الكورة (ball chasing). ديمو و كوره في المرمى. بس لا تجري ورا ديمو و تترك منطقتك.",
            "في 2v2، الـ bump و الـ demo يغيرون المباراة. إذا سويت ديمو لأحد اللاعبين، عندكم ٢ ضد ١ لمدة ٣ ثواني — استغلوها.",
            "نصيحة: لا تركز على الديمو كثير. طبيعي يصير لك ديمو — سو recover سريع و ارجع. الديمو مو نهاية العالم."
        ]
    },
    {
        id: "wallplay",
        name: "حائط",
        topics: ["حائط", "wall", "ارتداد", "كيرف", "curve", "hook", "بانج", "bank", "كورنر", "corner"],
        responses: [
            "الـ wall play من أهم المهارات. أول شي: تعلم تتحكم بالكرة على الحائط في free play. ارمي الكوره على الحائط، اطير وراها، و حولها لمرمى.",
            "في الدفاع، استخدم الحائط عشان تطلع الكوره من منطقة الخطر. لا تحاول تلمسها وهي في الهواء — خلها ترتد و اقطعها.",
            "الـ hook shot إذا ضبطت معك — راح تسجل اهداف كثيره. تمركز جنب الكوره شوي، و استخدم الـ powerslide عشان تغير اتجاهك بسرعه.",
            "استغل الـ corner. ارفع الكوره عالي بدل ما تسدد من الزاوية. الكوره العالية تعطي زميلك وقت يتقدم و يسجل."
        ]
    },
    {
        id: "kickoff",
        name: "كيك أوف",
        topics: ["كيك", "kickoff", "بداية", "انطلاق", "faceoff"],
        responses: [
            "الكيك أوف يحدد وتيرة المباراة. تعلم speed flip kickoff عشان توصل الكوره قبل الخصم. فرّق كبير بين لاعبين متساويين.",
            "في 2v2 و 3v3، قرر مع زميلك مين يروح للكورة و مين يساند. لا تروحون كلهم — double commit في الكيك أوف كارثة.",
            "نوع كيك أوف: fast, delayed, fake. الـ fake kickoff خطير — لازم تتأكد إن زميلك عارف وش بتسوي. تنسيق غلط = هدف.",
            "نصيحة RLCS: غير نوع الكيك أوف كل شوي. إذا دايم تسوي نفس الحركة — الخصم بيقرأك و يستغلها."
        ]
    },
    {
        id: "pro",
        name: "احتراف",
        topics: ["ساس", "sauce", "ستايل", "style", "فلير", "fancy", "احتراف", "pro", "rlcs", "بطولة", "محترف", "worlds", "zen", "vatira", "monkey", "beastmode", "firstkiller"],
        responses: [
            "لا تحاول تلعب استايل pro من اول يوم. المحترفين يلعبون ببساطة — حركاتهم الأساسية قوية ومتقنة. أتقن الأساسيات الأول.",
            "كل واحد من المحترفين له ستايل مختلف — شاهد فيديوهاتهم و حلل ليش قراراتهم صحيحة. مو بس الحركات الحلوة.",
            "أقوى حركة في الـ RLCS؟ الجواب: اتخاذ القرار السريع. المحترف يقرر في أجزاء من الثانية. هذا ييجي من الخبرة و التكرار.",
            "ما يصير محترف بين ليلة و ضحاها. كل الـ pros لعبوا آلاف الساعات. استمتع بالرحلة و ركز على التطور — الرنك بييجي."
        ]
    },
    {
        id: "training_packs",
        name: "كودات تدريب",
        topics: ["كود", "كودات", "code", "codes", "pack", "باك", "تدريب", "training", "تريننق", "تمرين", "مابت", "ماب", "map", "وركشوب", "workshop", "مهارات"],
        responses: [
            "عندي لك مجموعة مابات تدريب شاملة:\n\n🎯 تسديد\n• Ground Shots: 6EB1-79B2-33B8-681C\n• Shooting Consistency: 6CF3-4C0B-32B4-1AC7\n• Powershot: 42BF-686D-E047-574B\n\n✈️ إيريال\n• Aerials: C7E0-9E0B-B739-A899\n• Air Roll Aerials: 30EF-9E98-C844-E83D\n• High Aerials: FA24-B2B7-2E8E-193B\n• Backboard Reads: 07E1-81BC-DD2E-BF8C\n\n🔄 فليك و دريبل\n• Flick Training: 5ED9-0EA3-323F-949F\n• Ground Dribble: 3B5F-89C2-84B4-CBC7\n• Bounce Dribble: 5B28-3395-F15A-01E3\n\n🥅 دفاع\n• Defensive Aerials: 2E23-ABD5-20C6-DBD4\n• Save Training: 5CBC-278C-3BBD-6473\n• Shadow Defense: 5CCE-FB29-7B05-A0B1\n\n🔥 متقدمة\n• Air Dribble: D74D-FB19-06F3-CC67\n• Flip Reset: 2186-5167-B7C8-C46F\n• Redirects: 8D93-C997-0ACD-8416\n• Ceiling Shots: AFC9-2CCC-95EC-D9D4\n• Wall Shots: 9F6D-4387-4C57-2E4B\n\n⚡ سرعة\n• Speed Flip: A503-264C-A7EB-D282\n• Kickoff: BFAA-45A5-7A56-73CC\n\n💡 Ultimate Warmup: 4969-3B77-4D8A-3A3C",
            "المابتات حسب مستواك:\n\n**Plat / Diamond:**\n• Ground Shots: 6EB1-79B2-33B8-681C\n• Aerials: C7E0-9E0B-B739-A899\n• Saves: 5CBC-278C-3BBD-6473\n• Ultimate Warmup: 4969-3B77-4D8A-3A3C\n\n**Champ:**\n• Air Dribble: D74D-FB19-06F3-CC67\n• Redirects: 8D93-C997-0ACD-8416\n• Bounce Dribble: 5B28-3395-F15A-01E3\n• Speed Flip: A503-264C-A7EB-D282\n\n**GC / SSL:**\n• Flip Reset: 2186-5167-B7C8-C46F\n• Ceiling Shots: AFC9-2CCC-95EC-D9D4\n• Wall Shots: 9F6D-4387-4C57-2E4B\n\n📌 انسخ الكود وحطه في Custom Training > Enter Code",
            "أفضل مابت تدريب بالنسبة لي:\n\n🏆 Ground Shots (Poquito): 6EB1-79B2-33B8-681C — أفضل مابت لدقة التسديد.\n🏆 Aerials (Poquito): C7E0-9E0B-B739-A899 — أساس الإيريال.\n🏆 Ultimate Warmup: 4969-3B77-4D8A-3A3C — تسخين شامل قبل الرانكد.\n🏆 Air Dribble (Aizr): D74D-FB19-06F3-CC67 — تحكم بالكرة في الجو.\n🏆 Flip Reset (Aizr): 2186-5167-B7C8-C46F — أصعب حركة في اللعبة.",
            "روتيني اليومي عشان أطور:\n\n١- ١٠ دقايق Free Play — تحكم بالكرة.\n٢- ١٠ دقايق مابت تدريب — ركز على مهارة واحدة.\n٣- ١٠ دقايق 1v1 — ضغط حقيقي.\n\nهالروتين يرفع مستواك بسرعة."
        ]
    },
    {
        id: "camera_settings",
        name: "إعدادات",
        topics: ["كاميرا", "camera", "إعدادات", "ضبط", "setting", "حساسية", "sens", "sensitivity", "كنترول", "تحكم", "controller", "deadzone", "دزون"],
        responses: [
            "الإعدادات شي شخصي. بس أقدر أعطيك إعداداتي اللي أوصلتني لـ RLCS:\n\n📷 Camera:\n• Distance: 270\n• Height: 90\n• Angle: -5\n• Stiffness: 0.45\n• Swivel Speed: 5.0\n• Transition Speed: 1.20\n\n🎮 Controller:\n• Steering Sens: 1.30\n• Aerial Sens: 1.30\n• Deadzone: 0.05\n• Dodge Deadzone: 0.60\n\nجربها وعدل عاللي يناسبك. أهم شي: لا تغير الإعدادات كل يوم."
        ]
    },
    {
        id: "replay_analysis",
        name: "تحليل ريبلاي",
        topics: ["ريبلاي", "تحليل", "نتايج", "نتائج", "replay"],
        responses: [
            "حللنا الريبلاي حقك. الأرقام تتكلم. بس التحليل الحقيقي يكون لما تشوف الريبلاي بنفسك بنظرة ثالثة. ركز على:\n1️⃣ أول ٣ ثواني بعد ما تلمس الكورة — وين تروح؟\n2️⃣ الـ double commits — كم مرة لعبت وانت ورا زميلك؟\n3️⃣ كل هدف دخل عليك — وش كان المفروض تسوي بدال اللي سويت؟",
            "لما تحلل ريبلاي نفسك، اسأل نفسك ٣ أسئلة:\n• هل كنت في المكان الصحيح للدفاع؟\n• هل استخدمت البوست بذكاء ولا أهدرته؟\n• هل تواصلت مع زملائك؟\n\nالأجوبة تكشف نقاط ضعفك."
        ]
    }
];

// ─── TEXT NORMALIZATION ──────────────────
function coachNorm(text) {
    return text.toLowerCase()
        .replace(/[إأآا]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ِ|ُ|َ|ٌ|ٍ|ً/g, "");
}

function coachWords(text) {
    return coachNorm(text).split(/\s+/).filter(w => w.length >= 2);
}

// ─── SMART "HOW TO IMPROVE AT X" PARSER ──
function parseImproveQuery(text) {
    const norm = coachNorm(text);
    const m = norm.match(/^(?:كيف|كيفيه|كيفية|وشلون)\s+(?:اتدرب|اتعلم|اطور|احسن)\s+(?:على|في)?\s*(.+)/);
    if (m) {
        const topic = m[1].trim();
        if (topic.length >= 2) return topic;
    }
    return null;
}

// ─── CATEGORY MATCHER ────────────────────
function findBestCategory(input) {
    const norm = coachNorm(input);
    const words = coachWords(input);

    let best = { entry: null, score: 0, matches: [] };

    for (const entry of coachKnowledge) {
        let score = 0;
        const matched = [];

        for (const topic of entry.topics) {
            const t = coachNorm(topic);

            // Multi-word exact phrase match — strongest signal
            if (t.includes(" ") && norm.includes(t)) {
                score += t.length * 8;
                matched.push(topic);
                continue;
            }

            // Exact word match in tokenized input
            if (!t.includes(" ") && words.includes(t)) {
                score += t.length * 5;
                matched.push(topic);
                continue;
            }

            // Substring match — weakest signal
            if (!t.includes(" ") && norm.includes(t)) {
                score += t.length * 1;
                matched.push(topic);
                continue;
            }
        }

        // Bonus for 2+ unique keyword matches
        if (matched.length >= 3) score += 15;
        else if (matched.length >= 2) score += 6;

        if (score > best.score) {
            best = { entry, score, matches: matched };
        }
    }

    return best;
}

// ─── INPUT ANALYSIS ──────────────────────
function analyzeInput(text) {
    const norm = coachNorm(text);
    const words = coachWords(text);
    const shortWords = text.split(/\s+/).filter(w => w.length >= 1);

    const frustration = words.some(w => ["زعلان", "متضايق", "خسرت", "تعبان", "طفشت", "ملل", "ضيق", "غاضب", "غضبان", "خسارة", "مستاء", "خايس", "خايص", "سيء", "سئمت", "عجزت", "ماحب"].includes(w));
    const excitement = words.some(w => ["فزت", "حلو", "جميل", "رائع", "روعة", "ممتاز", "فخور", "انتصار", "ناس", "جامد", "نار", "ناري", "مبسوط", "فرحت", "استمتعت"].includes(w));
    const seekingOpinion = words.some(w => ["رأيك", "تعتقد", "تظن", "تشوف", "برأيك", "وجهة نظر", "قل", "برأي"].includes(w));
    const aboutSelf = words.some(w => ["أنا", "انا", "عمري", "عمري", "قريت", "شفت", "سمعت", "جربت", "سويت", "لعبت", "صرلي", "صار", "قاعد", "قاعد"].includes(w));
    const disagree = words.some(w => ["غلط", "خطأ", "لا", "مو", "مش", "كذب", "غباء", "متفق", "اتفق"].includes(w));

    return { frustration, excitement, seekingOpinion, aboutSelf, disagree, norm, words, shortWords };
}

// ─── CONVERSATIONAL FALLBACK ─────────────
function conversationalFallback(input, analysis) {
    const { frustration, excitement, seekingOpinion, aboutSelf, disagree } = analysis;

    // ── Frustrated / tilted ──
    if (frustration) {
        return [
            "أحسك متضايق شوي. صدقني كلنا نمر بهالمرحلة. الـ tilt يخليك تسوي قرارات غلط بدون ما تدري. خذ استراحة ١٠ دقايق، امشي، ارجع هادئ — بتلعب أفضل.",
            "أتفهم شعورك. روكيت ليق لعبة صعبة لأن الأخطاء تبان قوي. بس تذكر: كل خسارة درس. شوف الريبلاي، وش اللي ضيع المباراة؟ ركز على شيء واحد واطوره.",
            "الخسارة مو نهاية العالم. أنا خسرت مباريات كثيرة في الـ RLCS وتعلمت منها أكثر من اللي فزت فيها. اللي يميز المحترف إنه يتعلم من الخسارة مو إنه يتأثر."
        ][Math.floor(Math.random() * 3)];
    }

    // ── Excited / hyped ──
    if (excitement) {
        return [
            "ايوا! كذا اللعب! الفرحة هذي هي سبب حبنا للعبة. بس تذكر: لا توقف على هالانتصار — استمر، حافظ على هالطاقة واستخدمها عشان تطور أكثر.",
            "ممتاز! الفوز جميل لكن لا يخليك تغتر. حافظ على تواضعك و استمر تتعلم. الفرق بين لاعب كويس ولاعب محترف هو الاستمرارية.",
            "هذا الكلام يسعدني! تأكد إنك تحتفل بانتصاراتك — حتى الصغيرة. كل هدف يتعلم منه، كل مباراة تطورك."
        ][Math.floor(Math.random() * 3)];
    }

    // ── Talking about self / story ──
    if (aboutSelf) {
        return [
            "صراحة، كل لاعب عنده قصته. اللي مهم إنك تحافظ على شغفك. روكيت ليق لعبة تتعلمها يوم بعد يوم. أهم شيء: لا تقارن نفسك بالثانيين — ركز على تطورك أنت.",
            "من كلامك أحسك لاعب شغوف. هذا أجمل شي. تذكر إن المهارات تاخذ وقت — حتى Zen ما صار Zen بين ليلة وضحاها. العب بذكاء مو بسرعة.",
            "كل لاعب عنده نقاط قوة ونقاط ضعف. انت وش تشوف أقوى شيء فيك؟ ركز عليه وطوره — الباقي بيج مع الوقت."
        ][Math.floor(Math.random() * 3)];
    }

    // ── Seeking opinion ──
    if (seekingOpinion) {
        return [
            "من وجهة نظري كلاعب RLCS سابق، الرأي الحقيقي يبان في أرض الملعب. أقدر أقولك إن المهارات الفردية مهمة بس التوافق مع الفريق هو اللي يربح البطولات. وش رأيك أنت؟",
            "أنا أؤمن بشيء واحد: اللعبة ما توقف على حركة وحدة. فيه مليون طريقة تلعب. اللي يناسب غيرك مو دايم يناسبك. جرب، أخطأ، تعلم — هذي طريق التطور.",
            "بكل صراحة: روكيت ليق مو لعبة ميكانيك بس — ٦٠٪ قرارات و٤٠٪ تنفيذ. إذا تعلمت تقرأ اللعبة صح، نص المشوار قطعته."
        ][Math.floor(Math.random() * 3)];
    }

    // ── Disagreeing ──
    if (disagree) {
        return [
            "ممكن عندك وجهة نظر مختلفة، وهذا شي جميل. النقاش يولد أفكار جديدة. أنا أتكلم من خبرتي، بس كل واحد له أسلوبه. جرب تشوف وش يناسبك، وإذا لقيت شي أفضل — علمني.",
            "الصراحة أحترم إنك ما تتفق. اللعبة فيها أكثر من طريقة. أنا أعطيك نصائح من تجربتي، لكن في النهاية اللي يقرر هو أسلوبك. جرب وقرر بنفسك."
        ][Math.floor(Math.random() * 2)];
    }

    // ── General chat / anything else ──
    const general = [
        "والله كلامك ذكرني بأيام الـ RLCS. أفتقد أجواء البطولات — الضغط، الجمهور، التنافس. روكيت ليق مو مجرد لعبة، أسلوب حياة. وش أكثر شيء تحبه فيها؟",
        "أحياناً أفضل شي تسويه هو توقف و تفكر: ليش أنا لاعب هاللعبة؟ إذا كان الجواب لأني أستمتع — فأنت في الطريق الصحيح. الاستمتاع يخليك تتطور بدون ما تحس.",
        "صدقني، أكثر لحظاتي إلهامًا في روكيت ليق كانت وأنا في free play. مش ضروري دايماً تكون في مباراة — خذ وقتك مع الكورة، جرب حركات جديدة، اطلع من منطقة الراحة.",
        "فيه مقولة belovedة في المجتمع: 'حط الكورة في المرمى'. مبسّطة، بس فيها كل شي. لا تعقد الأمور — ركز على الأساسيات و الباقي بيجي.",
        "أعظم لاعبين روكيت ليق ما أوصلوا بالميكانيك فقط — وصلوا لأنهم يفكرون أسرع من خصومهم. الخطوة الجاية: ارفع سرعة تفكيرك. شوف الكورة، اقرأ اللعبة، تحرك.",
        "أقوى نصيحة أقدر أعطيها لأي لاعب: لا تخاف تخطئ. كل خطأ تتعلم منه يرفع مستواك. المشكلة الوحيدة هي إنك تكرر نفس الخطأ بدون ما تاخذ العبرة.",
        "عندي قناعة: كل مباراة خسرتها في الـ RLCS علمتني أكثر من أي مباراة فزت فيها. الخسارة تظهر نقاط ضعفك، والفوز يخبيها. حلل خسائرك — بتتطور بسرعة.",
        "مافي شي اسمه 'موهبة فطرية' في روكيت ليق. كل المحترفين تدربوا آلاف الساعات. الفرق بينك وبينهم: ساعات التدريب الواعي. العب بهدف، ليس عشان تخلص المباراة.",
        "خلني أقولك سر: السرعة مو دايماً الحل. أبطأ شوي، فكر، و نفذ بدقة. لاعب بطيء وذكي يغلب لاعب سريع وغبي ٩ مرات من ١٠.",
        "تخيل إن كل مباراة رانكد هي تمرين. ما فيها شي تخسره إلا نقاط — و النقاط ترجع. لكن الخبرة و المهارة اللي تاخذها من المباراة تبقى معك للأبد.",
        "الـ Rocket League زي الشطرنج بالسرعة. لازم تفكر بخطوتين قدام. وين بتروح الكورة؟ وين راح يكون الخصم؟ وين زميلك؟ هذي الأسئلة هي اللي تفرق."
    ];
    return general[Math.floor(Math.random() * general.length)];
}

// ─── MAIN COACH RESPONSE ─────────────────
function getCoachResponse(input) {
    const text = input.trim();
    if (!text) return "";
    const analysis = analyzeInput(text);

    // ── Step 1: Check for "how to improve at X" and route to specific topic ──
    const improveTopic = parseImproveQuery(text);
    if (improveTopic) {
        const topicResult = findBestCategory(improveTopic);
        if (topicResult.entry && topicResult.score > 0) {
            const responses = topicResult.entry.responses;
            const idx = Math.floor(Math.random() * responses.length);
            return responses[idx];
        }
    }

    // ── Step 2: KB category matching — any match, even weak ──
    const result = findBestCategory(text);
    if (result.entry && result.score > 0) {
        const responses = result.entry.responses;
        const idx = Math.floor(Math.random() * responses.length);
        return responses[idx];
    }

    // ── Step 3: Pure greetings ──
    const greetWords = ["هلا", "هلو", "مرحبا", "هاي", "hi", "hello", "hey", "سلام", "اهلين", "السلام عليكم", "مساء", "صباح"];
    const n = coachNorm(text);
    const w = coachWords(text);
    if (w.length <= 3 && greetWords.some(g => coachNorm(g) === n || n.startsWith(coachNorm(g)))) {
        return "وعليكم السلام! أنا جاهز لأي سؤال — روتنيشن، ميكانيك، بوست، تدريب، أو تحليل. وش عندك؟";
    }

    // ── Step 4: Thanks / farewell ──
    const thanksWords = ["شكرا", "يسلمو", "تسلم", "thx", "thanks", "thank", "يعطيك", "ما قصرت"];
    if (w.length <= 3 && thanksWords.some(t => coachNorm(t) === n || n.startsWith(coachNorm(t)))) {
        return [
            "العفو! إذا احتجت شي ثاني أنا موجود. شد حيلك و بتوصل GC قريباً",
            "الله يسلمك! تذكّر: التطور يحتاج صبر. كل مباراة درس جديد",
            "على الرحب والسعة! لا تنسى تسوي تحليل ريبلاي لنفسك كل اسبوع"
        ][Math.floor(Math.random() * 3)];
    }

    // ── Step 5: Short affirmative follow-up ──
    const affirmWords = ["نعم", "اي", "ايه", "yes", "yeah", "يب", "ok", "اوكي", "تم", "طيب"];
    if (w.length <= 2 && affirmWords.some(a => coachNorm(a) === n || n.startsWith(coachNorm(a)))) {
        return [
            "تمام! جرب الكلام اللي قلته لك و ارجع لي بخبر",
            "كويس! عندك سؤال ثاني؟",
            "حلو. خلني أضيف: أهم شي الاستمرارية. كل يوم شوي — مو مرة في الأسبوع كثير"
        ][Math.floor(Math.random() * 3)];
    }

    // ── Step 6: Conversational fallback ──
    return conversationalFallback(text, analysis);
}

// ─── COACH UI ────────────────────────────
const coachToggle = document.getElementById("coach-toggle");
const coachPanel = document.getElementById("coach-panel");
const coachClose = document.getElementById("coach-close");
const coachMessages = document.getElementById("coach-messages");
const coachInput = document.getElementById("coach-input");
const coachSend = document.getElementById("coach-send");

let coachOpen = false;

coachToggle.addEventListener("click", () => {
    coachOpen = !coachOpen;
    coachPanel.classList.toggle("hidden", !coachOpen);
    if (coachOpen) coachInput.focus();
});

coachClose.addEventListener("click", () => {
    coachOpen = false;
    coachPanel.classList.add("hidden");
});

function addCoachMsg(text, type) {
    const div = document.createElement("div");
    div.className = "coach-msg coach-msg-" + type;
    div.innerHTML = '<div class="coach-msg-avatar">' + (type === "bot" ? "🏆" : "👤") + '</div><div class="coach-msg-content">' + text.replace(/\n/g, "<br>") + "</div>";
    coachMessages.appendChild(div);
    coachMessages.scrollTop = coachMessages.scrollHeight;
}

function showCoachTyping() {
    const div = document.createElement("div");
    div.className = "coach-msg coach-msg-bot";
    div.id = "coach-typing";
    div.innerHTML = '<div class="coach-msg-avatar">🏆</div><div class="coach-msg-content coach-typing"><span></span><span></span><span></span></div>';
    coachMessages.appendChild(div);
    coachMessages.scrollTop = coachMessages.scrollHeight;
}

function removeCoachTyping() {
    const el = document.getElementById("coach-typing");
    if (el) el.remove();
}

function handleCoachSend() {
    const text = coachInput.value.trim();
    if (!text) return;
    addCoachMsg(text, "user");
    coachInput.value = "";

    showCoachTyping();
    const delay = 300 + Math.random() * 1000;
    setTimeout(() => {
        removeCoachTyping();
        addCoachMsg(getCoachResponse(text), "bot");
    }, delay);
}

coachSend.addEventListener("click", handleCoachSend);
coachInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleCoachSend();
});




