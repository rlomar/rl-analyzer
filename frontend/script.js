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

// ═══════════════════════════════════════════
//  AI COACH — RLCS Pro Analyst Chat
// ═══════════════════════════════════════════

// ─── COACH KNOWLEDGE BASE ──────────────────
const coachKnowledge = [
    {
        topics: ["روتنيشن", "روتيشن", "rotations", "دوران", "rotation"],
        responses: [
            "الروتنيشن هو أساس اللعب الجماعي. في 3v3، أفضّل نظام الـ 3 أدوار: 1 هجوم، 1 مساند، 1 دفاع. أبداً لا تجلس ورا زميلك نفس المنطقة — وزعوا المساحة. واهم شي: إذا زميلك رجع عنده boost قليل، اترك اللعبة وارجع بداله.",
            "في 2v2، الفكرة أبسط: واحد هجوم وواحد دفاع. لا تهجم وزميلك وراك — معناها لو ضاع الكرة هدف مضمون. الـ shadow defense هنا أساسي: ارجع ورا الكرة شوي واقرأ تحركات الخصم بدال ما تنقض على كل شي.",
            "في 1v1 الروتنيشن مختلف — أنت اللاعب الوحيد. ركز على إنك ما تضيع boost بدون فايدة. اعطي نفسك مساحة وكمل البلاي بهدوء. السرعه مو دايم حل — اقرأ لعب الخصم.",
            "من خبرتي في الـ RLCS، الفرق المحترفة تمشي بقاعدة الـ spacing: بين كل لاعب والثاني مسافة سيارة ونص. إذا اقتربت أكثر من كذا، تخلي الدفاع مكشوف. تذكّر: الـ 3v3 مو لعبة فردية."
        ]
    },
    {
        topics: ["boost", "بوست", "بست", "nitro", "fuel", "وقود", "nitro"],
        responses: [
            "إدارة البوست تفرق بين لاعب محترف ولاعب عادي. أول نصيحة: لا تستخدم boost عشان توصل للكرة لو هي رايحه للزميل — خلها. ثاني شي: اعرف مواقع البوستات الكبيرة (big pads) على الخريطة مثل ظهر يدك.",
            "في الـ RLCS، أبطار البوست يحدد الفريق اللي يتحكم بالمباراة. لو boostك قليل، العب small pads بدال ما تروح big pad وتترك منطقتك. الـ small pads تعطيك 12 بوست وموزعة في كل مكان — استغلها.",
            "النصيحة الذهبية: لا توصل لسرعة supersonic كل شوي. خفف زيادة boost عشان ما تضيعه. في الدفاع، حافظ على 30-40 بوست عشان تقدر تتصدى وترجع بسرعة.",
            "سر boost أن تجمعه ذكياً: ارسم مسارك بين big pads و small pads. واهم شي — لا توقف عشان تجمع boost! تحرك ببطء وانت تجمعه عشان ما تخلي دفاعك فاضي."
        ]
    },
    {
        topics: ["ميكانيك", "حركات", "ميكانيكا", "ميكانيكية", "فليك", "ايريال", "ايردربل", "ريسيت", "reset", "flip", "mechanics"],
        responses: [
            "الميكانيك مهم بس مو كل شي. في الـ RLCS، أبسط الحركات تنفع لو طبقتها بوقتها. ركّز على الأساسيات: الـ powerslide cut، الـ hook shot، و wave dash. هذي كافية توصل لـ GC.",
            "الـ flip reset حركة متقدمة — مرة حلوة بس مو ضرورية. شاهد كيف يطبقها Justin و Zen: بسيط و سلس. بس تذكر: ٩ من ١٠ مرات، الـ air dribble البسيط ينفع أكثر من الـ reset.",
            "إذا تبغى تتطور في الميكانيك، سو التمرين ذا: كل يوم ١٠ دقائق free play. ركز على الـ fast aerial، الـ flick (front flip و 45 degree)، و الـ powershot. التكرار يخليها عادة.",
            "الـ wavedash أساسي: استخدمه عشان تطلع من الحيطان بسرعة، وعشان توقف بدل ما تطفش بعد الهبوط. ضروري كل لاعب يتقنه.",
            "فيه فرق بين speed و mechanics. اتعلم تقرأ الكرة بدل ما تجري وراها بسرعه. السرعة الزايدة تخلي ميكانيكك غير مضبوط. خذ وقتك."
        ]
    },
    {
        topics: ["مركز", "position", "تمركز", "مكان", "موقع", "positioning"],
        responses: [
            "التمركز الصحيح يخلي المباراة سهله. اتحرك على طول الخط الوهمي بين الكرة ومرماك. لا تقطع على زميلك ولا تتجمعون في زاويه وحده.",
            "في الدفاع، اقعد على الـ back post. من هناك تشوف كل الملعب. إذا انضغطت، لا تطلع بخروج سيء — استخدم الحائط و اطلع ببطء عشان تعطي زميلك وقت يرجع.",
            "لما تهاجم، لا تدخل الـ corner مع الخصم. خذ الكرة للـ mid و شوف الخيارات. الـ corner موت زون لأي لاعب — يضيق الخيارات و يخليك عرضه للديمو.",
            "شوف الخريطة كاملة، مو بس الكرة. اعرف وين زميلك ووين الخصم. الـ game sense يبدأ من الوعي المكاني. كل ٣ ثواني ارفع راسك من الكرة."
        ]
    },
    {
        topics: ["2v2", "two", "twos", "دبل", "ثنائي"],
        responses: [
            "في الـ 2v2، السر هو التوازن. إذا زميلك مهاجم، انت دفاع. بس مو دفاع بعيد — قريب كفاية عشان لو ارتدت الكرة تلمسها. الفرق الكبيرة تقرأ ارتدادات الكره قبل لا تصير.",
            "نصيحة قويه: لا تروح للـ boost إذا زميلك في الهجوم ويمكن يفقد الكرة. خذ small pads وابقى قريب. ثانية تأخير منك = هدف عليك.",
            "الـ 2v2 يعتمد على الـ first touch. اللي يلمس الكرة أول يتحكم باللعبة. درب الـ kickoff إلى أن يصبح عندك ثابت. و لا تنسى الـ demo — في 2v2 الديمو يفتح مساحات هائلة.",
            "إذا خسرت المباراة، شوف كم مره لعبت وانت ورا زميلك (double committing). هذي أكبر غلطة في 2v2. اقرأ تحركات زميلك."
        ]
    },
    {
        topics: ["3v3", "three", "threes", "ثلاثي", "standard"],
        responses: [
            "الـ 3v3 لعبة سرعة و تنظيم. النظام اللي أتبعه: لاعب ١ يضغط (first man)، لاعب ٢ يساند (second man)، لاعب ٣ دفاع بعيد (third man). كل واحد له دور واضح.",
            "الغلطة الأكثر شيوعاً في 3v3: كل اللاعبين يهجمون. لا! إذا تقدمتم كلهم، أي كرة طايرة من الخصم = هدف. لاعب واحد يهجم، الثاني مساند على بعد ١٠ متر، الثالث دفاع.",
            "في الـ kickoff، الـ cheat up (يميل شوي قدام) استراتيجية قوية. بس إذا سويتها و الخصم سوا quick aerial — بتستقبل هدف. اقرأ أسلوب الخصم و قرر.",
            "الفرق المحترفة تتكلم باستمرار. الكل يعلن: 'I'm challenging', 'I'm back', 'You go'. إذا ما عندك مايك، استخدم quick chats. التواصل أهم من الميكانيك."
        ]
    },
    {
        topics: ["1v1", "one", "ones", "فردي", "duel"],
        responses: [
            "الـ 1v1 أصعب وضع — كل غلطتك تنشاف ولا في زميل يعوضك. النصيحة الأولى: shadow defense. ارجع مع الكورنر و إقرأ الخصم بدل ما تنقض.",
            "في 1v1، البوست أثمن شيء. لا تهدر boost في هجمات فاشلة. إذا حسيت اللعبة صعبة، ارجع لعب defensive و استغل أخطاء الخصم. الصبر يربح 1v1.",
            "الـ kickoff في 1v1 يحدد المباراة. تدرب على speed flip kickoff و الـ delayed kickoff. إذا فزت بالـ kickoff, عندك فرصة تسجل هدف مباشر.",
            "نصيحة مهمة: لا تروح للـ challenge إذا مو متأكد. أعطي الخصم مساحة، يغلط و تخطف الكورة. في 1v1، اللي يغلط أقل هو الفائز."
        ]
    },
    {
        topics: ["ديفينس", "دفاع", "تصدي", "save", "goal", "مرمى", "حارس"],
        responses: [
            "الدفاع يبدأ قبل لا توصل الكرة. التمركز الصحيح يقلل التصدي الصعب. اقعد على back post و خلي الكرة قدامك — لا تكون جنب المرمى.",
            "في التصدي، استخدم الـ jump اقل ما يمكن. إذا تقدر تلمسها وانت على الأرض — أفضل. القفز يخليك خارج اللعبه ثانيتين كاملة.",
            "الـ shadow defense هو أقوى مهارة دفاعية. تقدم مع الكورة بنفس اتجاهها، و اقرأ متى راح يسوي الخصم تسديده. هنا تتصدى.",
            "لا تنسى: التصدي مو بس إبعاد الكرة — التصدي المثالي يوجه الكرة لزميلك عشان تبدأ هجمة مرتدة. شوف وين زميلك قبل ما تلمس الكورة.",
            "من أعظم النصائح من RLCS: شوف الخصم مو الكرة. عيونه و جسمه يخبرك وين بيوجه الكورة قبل لا يلمسها."
        ]
    },
    {
        topics: ["هجوم", "هجمة", "تسديد", "تسديدة", "shot", "تسجل", "هدف", "scoring"],
        responses: [
            "في الهجوم، التنوع هو السلاح. إذا تسدد نفس النوع كل مرة — الخصم بيقرأك. غير بين: ground shot, air dribble, flick, pass.",
            "أفضل لحظة تسديد: الخصم قاعد يعمل rotate. إذا شفت اثنين من الفريق الخصم في نفس الزاوية — سدد فوراً. المرمى فاضي.",
            "الـ passing play أقوى من الـ solo play. ارفع الكورة للوسط بدل ما تسدد من الزاوية. زميلك عنده فرصة أفضل منك.",
            "في 3v3، الـ back pass يفك الضغط. إذا انحصيت، مرر الكوره لدفاع. يعطيكم فرصة إعادة تنظيم بدل ما تخسر الكورة في نصف ملعبكم."
        ]
    },
    {
        topics: ["تطور", "تتحسن", "اتعلم", "تحسن", "طور", "تمرين", "تدريب", "training", "improve", "learn", "rank", "رتبة", "رنك"],
        responses: [
            "التطور في روكيت ليق يحتاج شيئين: تكرار واعي و تحليل. العب أقل، حلل أكثر. خذ ١٠ دقائق تشوف ريبلاي نفسك قبل كل جلسة لعب.",
            "أفضل طريقة تتحسن: free play يومياً ١٥ دقيقة قبل ما تبدأ Ranked. ركز على: التحكم بالكرة، السرعة، الـ recoveries. هذي مهارات أساسية.",
            "لا تهتم بالرنك. ركز على مهارة وحدة كل أسبوع. هالاسبوع: wavedashes. الأسبوع الجاي: fast aerials. شهر واحد و بتشوف فرق.",
            "تحليل الريبلاي هو سر المحترفين. شوف كل هدف دخل عليك من视角 ثالث (bird's eye). اسأل نفسك: وين كان المفروض أكون؟",
            "نصيحة من تجربتي: كل ما زاد ضغط المباراة، زادت أخطائك. تدرب على الـ breathing. خذ نفس عميق قبل كل kickoff. اللعبة mental game نفس ما هي physical."
        ]
    },
    {
        topics: ["mental", "عقلي", "نفسي", "غضب", "ضغط", "toxis", "tilt", "toxic", "nerves", "قلق"],
        responses: [
            "الـ mentality أساسي. إذا خسرت مباراتين ورا بعض — اترك اللعبة. امشي ٥ دقايق، اشرب موية، و ارجع. الـ tilt يخليك تسوء أكثر.",
            "لا ترد على toxic players. Mute الكل و العب لعبتك. الـ chat ما يجيبلك رنك. ركز على اللي تقدر تتحكم فيه: قراراتك و تحركاتك.",
            "في الـ RLCS، الفرق اللي تفوز هي اللي تهدأ تحت الضغط. إذا راح عليك هدف اول — خذ نفس و ابدا من جديد. المباراة ما انتهت.",
            "الـ confidence يأتي من التحضير. إذا تدربت زين قبل المباراة، بتلعب زين. الثقة مو كبرياء — ثقة إنك سويت الـ preparation."
        ]
    },
    {
        topics: ["سكريم", "scrim", "فريق", "team", "teamplay", "جماعي", "فريقي"],
        responses: [
            "السكريمات تختلف عن ranked. هنا تحتاج استراتيجية: سو play مكتوب (pre-planned). مثلاً كيك اوف معين يتبعه play معين.",
            "أهم شي في اللعب الجماعي: التواصل. يكون في قائد يعطي تعليمات واضحة. مش 'هجم' — 'أنا أول، ارجع'. الوضوح يمنع الـ double commit.",
            "في السكريم، جرب تشكيلات مختلفة. كل لاعب له دور: striker, midfielder, defender. مع الوقت بتعرفون وين كل واحد يبدع.",
            "حللوا سوا بعد كل مباراة. ٥ دقايق نقاش: وش ضبط؟ وش لا؟ بدون لوم. التحليل الجماعي يرفع مستوى الفريق كامل."
        ]
    },
    {
        topics: ["ديمو", "demo", "demolish", "تدمير", "اشتباك", "bump"],
        responses: [
            "الديمو مو حرام — استراتيجيه! استخدمه عشان تفتح مساحة. في 3v3، ديمو المدافع يفتح المرمى بشكل مو طبيعي.",
            "أفضل وقت للديمو: الخصم واقف يتفرج على الكورة (ball chasing). ديمو و كوره في المرمى. بس لا تجري ورا ديمو و تترك منطقتك.",
            "في 2v2، الـ bump و الـ demo يغيرون المباراة. إذا سويت ديمو لأحد اللاعبين، عندكم ٢ ضد ١ لمدة ٣ ثواني — استغلوها.",
            "نصيحة: لا تركز على الديمو كثير. طبيعي يصير لك ديمو — سوي recover سريع و ارجع. الديمو مو نهاية العالم."
        ]
    },
    {
        topics: ["كيرف", "curve", "hook", "بانج", "bank", "حائط", "wall", "ارتداد"],
        responses: [
            "الـ wall play من أهم المهارات. أول شي: تعلم تتحكم بالكرة على الحائط في free play. ارمي الكوره على الحائط، اطير وراها، و حولها لمرمى.",
            "في الدفاع، استخدم الحائط عشان تطلع الكوره من منطقة الخطر. لا تحاول تلمسها وهي في الهواء — خلها ترتد و اقطعها.",
            "الـ hook shot إذا ضبطت معك — راح تسجل اهداف كثيره. تمركز جنب الكوره شوي، و استخدم الـ powerslide عشان تغير اتجاهك بسرعه.",
            "استغل الـ corner. ارفع الكوره عالي بدل ما تسدد من الزاوية. الكوره العالية تعطي زميلك وقت يتقدم و يسجل."
        ]
    },
    {
        topics: ["كيك", "kickoff", "بداية", "انطلاق", "faceoff"],
        responses: [
            "الكيك أوف يحدد وتيرة المباراة. تعلم speed flip kickoff عشان توصل الكوره قبل الخصم. فرّق كبير بين لاعبين متساويين.",
            "في 2v2 و 3v3، قرر مع زميلك مين يروح للكورة و مين يساند. لا تروحون كلهم — double commit في الكيك أوف كارثة.",
            "نوع كيك أوف: fast, delayed, fake. الـ fake kickoff خطير — لازم تتأكد إن زميلك عارف وش بتسوي. تنسيق غلط = هدف.",
            "نصيحة RLCS: غير نوع الكيك أوف كل شوي. إذا دايم تسوي نفس الحركة — الخصم بيقرأك و يستغلها."
        ]
    },
    {
        topics: ["ساس", "sauce", "استايل", "style", "ستايل", "فلير", "fancy", "احتراف", "pro"],
        responses: [
            "لا تحاول تلعب استايل pro من اول يوم. المحترفين يلعبون ببساطة — حركاتهم الأساسية قوية ومتقنة. أتقن الأساسيات الأول.",
            "Zen و Vatira و Beastmode — كل واحد له ستايل مختلف. شوف فيديوهاتهم و حلل ليش قراراتهم صحيحة. مو بس الحركات الحلوة.",
            "اقوى حركة في الـ RLCS؟ الجواب: اتخاذ القرار السريع. المحترف يقرر في أجزاء من الثانية. هذا ييجي من الخبرة و التكرار.",
            "ما يصير محترف بين ليلة و ضحاها. كل الـ pros لعبوا آلاف الساعات. استمتع بالرحلة و ركز على التطور — الرنك بييجي."
        ]
    },
    {
        topics: ["تدريب", "training", "تمرين", "تريننق", "باك", "pack", "كود", "code", "كودات", "training pack", "ماب", "map", "وركشوب", "workshop", "مهارات", "كيف اتدرب", "كيف اطور", "مابت"],
        responses: [
            "عندي لك مجموعة مابات تدريب شاملة لكل مهارات روكيت ليق. اختر اللي يناسب مستواك:\n\n🎯 **تسديد**\n• Ground Shots (Poquito): `6EB1-79B2-33B8-681C`\n• Shooting Consistency: `6DCC-4761-4C37-F06C`\n• Powershot Pack: `50F2-5EF8-4FBE-8F57`\n• First Touch & Shot: `39DF-4E31-4B1C-62A7`\n\n✈️ **إيريال**\n• Aerials (Poquito): `5CB2-6B38-42A3-EB1C`\n• Air Roll Aerials: `D07B-2074-49CB-8207`\n• High Aerials: `A69C-49FE-4C0B-7F96`\n• Backboard Reads: `3BEB-3C0C-49DB-A208`\n\n🔄 **فليك و دريبل**\n• Flick Training: `446B-38B4-4F16-50B7`\n• Ground Dribble: `40C8-4056-4138-459F`\n• Bounce Dribble: `4C2F-4B38-4C41-9A24`\n• 45° Flick: `87C1-61F4-4E58-80CF`\n\n🥅 **دفاع**\n• Defensive Aerials (Llexxi): `5CB2-6B38-42A3-EB1C`\n• Save Training: `0746-4776-41FC-5D1A`\n• Shadow Defense: `6487-3B3C-400D-65A4`\n• Uncomfortable Saves: `6F2E-4E2B-4CB3-B1D2`\n\n🔥 **متقدمة**\n• Air Dribble (Aizr): `C8ED-420B-4AF3-B6EE`\n• Flip Reset (Aizr): `A79E-4B0C-4F5E-9C2B`\n• Redirects (Poquito): `8E3C-6B42-4C31-09B7`\n• Ceiling Shots: `84F7-402B-4B9A-4693`\n• Wall Shots: `0A3C-84B6-4307-CE45`\n\n⚡ **كيك أوف و سبيد**\n• Speed Flip Kickoff: `A503-4C87-44F3-60B6`\n• Kickoff Training: `E81B-4A33-4C9F-88C6`\n\n💡 **تسخين كامل**\n• Ultimate Warmup (WayProtein): `4969-3B77-4D8A-3A3C`",
            "المابتات اللي أستخدمها شخصياً:\n\n**للمبتدئين:**\n• Ultimate Warmup → `4969-3B77-4D8A-3A3C` — كل المهارات الأساسية\n• Ground Shots → `6EB1-79B2-33B8-681C` — دقة التسديد\n• Aerials → `5CB2-6B38-42A3-EB1C` — أساس الإيريال\n\n**متوسط:**\n• Redirects → `8E3C-6B42-4C31-09B7` — يخليك تقرأ الكورة\n• Backboard Defense → `3BEB-3C0C-49DB-A208` — دفاع الحائط\n• Shadow Defense → `6487-3B3C-400D-65A4` — يرفع وعيك الدفاعي\n\n**متقدم:**\n• Air Dribble → `C8ED-420B-4AF3-B6EE` — تحكم بالكرة في الجو\n• Flip Reset → `A79E-4B0C-4F5E-9C2B` — أغنى حركة باللعبة\n• Speed Flip → `A503-4C87-44F3-60B6` — سرعة الكيك أوف\n\nابدأ من اللي يناسب مستواك و زود التحدي كل أسبوع.",
            "📋 **حسب مستواك:**\n\n**Plat و Diamond:**\n1️⃣ Ground Shots: `6EB1-79B2-33B8-681C`\n2️⃣ Aerials: `5CB2-6B38-42A3-EB1C`\n3️⃣ Save Training: `0746-4776-41FC-5D1A`\n4️⃣ Ultimate Warmup: `4969-3B77-4D8A-3A3C`\nركز على التسديد و الدفاع.\n\n**Champ:**\n1️⃣ Air Dribble: `C8ED-420B-4AF3-B6EE`\n2️⃣ Redirects: `8E3C-6B42-4C31-09B7`\n3️⃣ Bounce Dribble: `4C2F-4B38-4C41-9A24`\n4️⃣ Speed Flip: `A503-4C87-44F3-60B6`\nطور تحكمك الجوي و سرعتك.\n\n**GC و SSL:**\n1️⃣ Flip Reset: `A79E-4B0C-4F5E-9C2B`\n2️⃣ Ceiling Shots: `84F7-402B-4B9A-4693`\n3️⃣ Wall Shots: `0A3C-84B6-4307-CE45`\n4️⃣ Kit自分のパーソナル\nهنا تركز على التخصص و الميكانيك الدقيقة.",
            "عندي لك كودات مابات تدريب مقسمة حسب المهارة:\n\n🎯 **تسديد**\n• Ground Shots → `6EB1-79B2-33B8-681C`\n• Powershot → `50F2-5EF8-4FBE-8F57`\n• Shooting Consistency → `6DCC-4761-4C37-F06C`\n\n✈️ **إيريال**\n• Aerials Pack → `5CB2-6B38-42A3-EB1C`\n• High Aerials → `A69C-49FE-4C0B-7F96`\n• Air Roll Shots → `D07B-2074-49CB-8207`\n\n🔥 **متقدمة**\n• Flip Reset → `A79E-4B0C-4F5E-9C2B`\n• Air Dribble → `C8ED-420B-4AF3-B6EE`\n• Redirects → `8E3C-6B42-4C31-09B7`\n• Ceiling Shot → `84F7-402B-4B9A-4693`\n• Wall Shots → `0A3C-84B6-4307-CE45`\n\n🛡️ **دفاع**\n• Saves → `0746-4776-41FC-5D1A`\n• Shadow D → `6487-3B3C-400D-65A4`\n• Backboard → `3BEB-3C0C-49DB-A208`\n\n⚡ **سرعة**\n• Speed Flip → `A503-4C87-44F3-60B6`\n• Kickoff → `E81B-4A33-4C9F-88C6`\n\n📌 انسخ الكود و حطه في Custom Training > Enter Code",
            "بداية، إذا جديد، ابدأ بـ Ultimate Warmup: `4969-3B77-4D8A-3A3C`. ٥٠ كرة تغطي كل الأساسيات. بعدها خذ Ground Shots عشان تضبط دقة التسديد.\n\nلما تحس مستواك تحسن، انتقل لـ Redirects و Air Dribble. و لا تنسى كل جلسة لازم تمرن على ساعتين:\n- ١٠ دقايق Free Play (تحكم بالكرة)\n- ١٠ دقايق مابت تدريب (تركيز على مهارة)\n- ١٠ دقايق 1v1 (ضغط حقيقي)\n\nهالروتين يرفع مستواك بسرعة.",
            "أفضل مابت تدريب بالنسبة لي:\n\n🏆 **Ground Shots (Poquito)**\n`6EB1-79B2-33B8-681C`\nأفضل مابت لتطوير دقة التسديد من الأرض. ٣٢ كرة بتصاعد في الصعوبة.\n\n🏆 **Aerials (Poquito)**\n`5CB2-6B38-42A3-EB1C`\nأساس الإيريال — يخليك تتحكم بالكرة في الجو.\n\n🏆 **Ultimate Warmup**\n`4969-3B77-4D8A-3A3C`\nتسخين شامل لجميع المهارات قبل الرانكد.\n\n🏆 **Air Dribble (Aizr)**\n`C8ED-420B-4AF3-B6EE`\nتعلم تتحكم بالكرة من أول لمسة إلى التسجيل.\n\n🏆 **Flip Reset (Aizr)**\n`A79E-4B0C-4F5E-9C2B`\nأصعب حركة في اللعبة — لكن مع التكرار تصير عادة."
        ]
    }
];

// ─── COACH MATCHER ─────────────────────────
function findCoachResponse(input) {
    const lower = input.toLowerCase();
    let bestMatches = [];
    let bestScore = 0;

    for (const entry of coachKnowledge) {
        let score = 0;
        for (const topic of entry.topics) {
            if (lower.includes(topic.toLowerCase())) {
                score += topic.length * 2;
            }
        }
        // Also check word-by-word
        const words = lower.split(/\s+/);
        for (const word of words) {
            if (word.length >= 2) {
                for (const topic of entry.topics) {
                    if (topic.toLowerCase().includes(word)) {
                        score += 1;
                    }
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatches = [entry];
        } else if (score === bestScore && score > 0) {
            bestMatches.push(entry);
        }
    }

    if (bestScore > 0) {
        const entry = bestMatches[Math.floor(Math.random() * bestMatches.length)];
        const responses = entry.responses;
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Fallback responses
    const fallbacks = [
        "سؤال ممتاز! خلني أوضح لك: روكيت ليق لعبة قرارات أكثر من ميكانيك. كل لعبه، اسأل نفسك: 'ليش سويت كذا؟' و 'وش كان ممكن اسوي احسن؟'. بهالطريقه بتتطور.",

        "صراحة، السؤال ذا يعتمد على مستواك حالياً. بس المبدأ واحد: ركز على شي واحد كل مرة. مثلاً هاليومين ركز على الـ recoveries وسرعة الرد بعد كل لمسة.",

        "فيه طريقتين للعب: defensive و offensive. الأفضل تتعلم الاتنين. لكن إذا بتختار، ابدا defensive — لأن الدفاع اسهل تتعلمه و يخليك تفوز مباريات أكثر.",

        "انا شفت لاعبين كثار في RLCS. اللي ينجحون هم اللي يشتغلون على نقاط ضعفهم. مو اللي يلعبون ١٠ ساعات نفس الغلط. حلل ريبلاي نفسك و بتعرف وش مشكلتك.",

        "والله، المفتاح هو الـ consistency. مو لازم تكون سريع — خلك ثابت. لمسة وحدة مضبوطة احسن من ١٠ لمسات فاشلة. اشتغل على الـ first touch.",

        "خليني اشرحها لك بطريقة بسيطة: كل ما زادت سرعتك في اللعبه، زادت أخطائك. حل المشكلة? اهدأ. العب ببطء و زيادة السرعة تدريجياً. السرعه تجي مع الوقت.",

        "فيهBase rule: لا تروح لمكان فيه زميلك. إذا شفت واحد من فريقك في منطقه، روح مكان ثاني. التوزيع الصحيح يربح المباريات.",

        "اسمع من مجرب: الـ mechanics مو كل شي. أفضل لاعبين RLCS عندهم ذكاء لعبي عالي. يتوقعون الكورة قبل لا تصير. هذا يسمى prediction — و يتطور مع الخبره.",

        "أقوى شي تتعلمه: متى تترك الكوره. مو كل كوره لازم تلمسها. إذا الخصم اسرع منك — خل الكوره تروح و ركز على التمركز. الصبر يربح.",

        "عندي لك تحدي: العب ١٠ مباريات و انت ما تستخدم boost زيادة عن ٥٠. بتكتشف انك تعتمد على boost زيادة عن اللزوم. boost استراتيجي مو عادة."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── COACH RESPONSE GENERATOR ──────────────
function getCoachResponse(input) {
    // Check for greetings
    const lower = input.toLowerCase().trim();
    const greetings = ["هلا", "هلو", "مرحبا", "هاي", "ها", "hi", "hello", "hey", "سلام", "مساء", "صباح", "اهلين", "مساء الخير", "السلام عليكم"];
    if (greetings.some(g => lower.includes(g)) && lower.length < 15) {
        return "وعليكم السلام! أنا جاهز — أسألني عن أي شي في روكيت ليق. روتنيشن؟ بوست؟ ميكانيك؟ ولا وش تبي بالضبط؟";
    }

    const thanks = ["شكرا", "يسلمو", "تسلم", "thx", "thanks", "thank", "نعم", "تمام"];
    if (thanks.some(g => lower.includes(g)) && lower.length < 12) {
        return "العفو! تذكر: التطور يحتاج وقت. كل مباراة درس. و إذا عندك سؤال ثاني — أنا هنا. شد حيلك و بتوصل GC قريباً 💪";
    }

    return findCoachResponse(input);
}

// ─── COACH UI ──────────────────────────────
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
    if (coachOpen) {
        coachInput.focus();
    }
});

coachClose.addEventListener("click", () => {
    coachOpen = false;
    coachPanel.classList.add("hidden");
});

function addCoachMsg(text, type = "bot") {
    const div = document.createElement("div");
    div.className = `coach-msg coach-msg-${type}`;
    div.innerHTML = `
        <div class="coach-msg-avatar">${type === "bot" ? "🏆" : "👤"}</div>
        <div class="coach-msg-content">${text.replace(/\n/g, "<br>")}</div>
    `;
    coachMessages.appendChild(div);
    coachMessages.scrollTop = coachMessages.scrollHeight;
}

function showCoachTyping() {
    const div = document.createElement("div");
    div.className = "coach-msg coach-msg-bot";
    div.id = "coach-typing";
    div.innerHTML = `<div class="coach-msg-avatar">🏆</div><div class="coach-msg-content coach-typing"><span></span><span></span><span></span></div>`;
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
    const delay = 300 + Math.random() * 1200;
    setTimeout(() => {
        removeCoachTyping();
        const response = getCoachResponse(text);
        addCoachMsg(response, "bot");
    }, delay);
}

coachSend.addEventListener("click", handleCoachSend);
coachInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleCoachSend();
});
