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

// ─── COACH CONTEXT ─────────────────────────
let coachContext = {
    lastTopic: null,
    lastResponse: null,
    turnCount: 0,
    askedForCodes: false
};

// ─── TEXT NORMALIZATION ────────────────────
function normalize(text) {
    let t = text.toLowerCase();
    t = t.replace(/[إأآا]/g, "ا");
    t = t.replace(/ى/g, "ي");
    t = t.replace(/ة/g, "ه");
    t = t.replace(/ِ|ُ|َ|ٌ|ٍ|ً/g, "");
    return t;
}

function tokenize(text) {
    return normalize(text).split(/\s+/).filter(w => w.length >= 2);
}

function getBigrams(words) {
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
        bigrams.push(words[i] + " " + words[i + 1]);
    }
    return bigrams;
}

function getTrigrams(words) {
    const tri = [];
    for (let i = 0; i < words.length - 2; i++) {
        tri.push(words[i] + " " + words[i + 1] + " " + words[i + 2]);
    }
    return tri;
}

// ─── QUESTION WORD DETECTION ───────────────
function detectQuestionType(text) {
    const t = normalize(text);
    if (/^(كيف|كيفيه|كيفية|طريقه|طريقة|وشلون)/.test(t)) return "how";
    if (/^(وش|ماهو|ماهي|ما|منو|من)/.test(t)) return "what";
    if (/^(ليش|ليه|لماذ)/.test(t)) return "why";
    if (/^(عطيني|اعطيني|جيب|ورني|ارني|دلني)/.test(t)) return "give";
    if (/^(هل|اذا|لو)/.test(t)) return "if";
    if (/^(عندك|فيه|في)/.test(t)) return "have";
    if (/^(اشرح|فسر|وضح|عرفني)/.test(t)) return "explain";
    return "other";
}

// ─── COACH MATCHER (SMART) ─────────────────
function findBestCategory(input) {
    const norm = normalize(input);
    const words = tokenize(input);
    const bigrams = getBigrams(words);
    const trigrams = getTrigrams(words);
    const wordSet = new Set(words);

    let best = { entry: null, score: -999, type: "none" };
    let second = { entry: null, score: -999, type: "none" };

    for (const entry of coachKnowledge) {
        let score = 0;
        let matchCount = 0;

        // 1) Trigrams (most specific) — massive weight
        for (const tri of trigrams) {
            for (const topic of entry.topics) {
                if (normalize(topic).includes(tri)) {
                    score += tri.length * 8;
                    matchCount++;
                }
            }
        }

        // 2) Bigrams — high weight
        for (const bi of bigrams) {
            for (const topic of entry.topics) {
                if (normalize(topic).includes(bi)) {
                    score += bi.length * 5;
                    matchCount++;
                }
            }
        }

        // 3) Full word matches — medium weight
        for (const word of words) {
            for (const topic of entry.topics) {
                const tNorm = normalize(topic);
                if (tNorm === word) {
                    score += word.length * 4;
                    matchCount++;
                } else if (tNorm.includes(word) && word.length > 2) {
                    score += 2;
                    matchCount++;
                } else if (word.includes(tNorm) && tNorm.length > 2) {
                    score += 1;
                    matchCount++;
                }
            }
        }

        // 4) Boost: topic name in user message
        if (norm.includes(normalize(entry.name))) {
            score += 30;
            matchCount += 5;
        }

        // Penalize: if user explicitly mentions a different mode
        if (entry.name === "الرياضة" && (norm.includes("دفاع") || norm.includes("مرمى") || norm.includes("save"))) {
            score -= 5;
        }
        if (entry.name === "الدفاع" && (norm.includes("هجوم") || norm.includes("تسديد") || norm.includes("shot"))) {
            score -= 3;
        }

        if (score > best.score) {
            second = best;
            best = { entry, score, matchCount };
        } else if (score > second.score) {
            second = { entry, score, matchCount };
        }

        // Track the first candidate for context
        if (!best.entry && score > 0) {
            best = { entry, score, matchCount };
        }
    }

    // If scores are close and match counts differ, prefer the one with more matches
    if (best.entry && second.entry && best.score - second.score < 5 && best.matchCount < second.matchCount) {
        return second;
    }

    return best;
}

// ─── SMART FALLBACK ────────────────────────
function smartFallback(input) {
    const norm = normalize(input);
    const words = tokenize(input);

    // Check if it's about personal performance
    if (words.some(w => ["ضعيف", "مستواي", "متطور", "تطوير", "اتحسن", "تحسنت", "مشكلتي", "غلطاتي", "اخطائي"].includes(w))) {
        return "صراحة، مشكلتك مو في الميكانيك. مشكلتك في اتخاذ القرار. أكثر لاعبين يظنون أنهم بطيئين أو ما يلمسون الكورة — لكن الحقيقة إنهم في المكان الغلط.\n\nحلل ثلاث مباريات لعبك. شوف كل هدف دخل عليك: هل كان بسبب سوء تمركز؟ لو الجواب نعم — ركز اسبوع كامل على التمركز فقط. رح تتفاجأ بكم目标和 بتقل.";
    }

    // Asking about RLCS/pro players
    if (words.some(w => ["rlcs", "محترف", "احتراف", "بطولة", "worlds", "pro", "zen", "vatira", "monkey", "beastmode", "firstkiller"].includes(w))) {
        return "من وجهة نظري كلاعب RLCS سابق، الفرق بين المحترف والهاوي مو الميكانيك — الفرق في **الانتظام** (consistency). زن و فاتيرا يلعبون بنفس المستوى كل مباراة. ما عندهم مباراة سيئة.\n\nنصيحتي: شوف ريبلاي حق Zen من مباراة خسرها. شف كيف يتحرك تحت الضغط. المحترف ما يهلع — عنده خطة بديلة لكل موقف.";
    }

    // Asking about camera settings / controls
    if (words.some(w => ["كاميرا", "camera", "اعدادات", "ضبط", "setting", "senstivity", "حساسية", "كنترول", "تحكم", "عصا", "controller"].includes(w))) {
        return "الإعدادات شي شخصي. بس أقدر أعطيك إعداداتي اللي أوصلتني لـ RLCS:\n\n📷 **Camera:**\n• Distance: 270\n• Height: 90\n• Angle: -5\n• Stiffness: 0.45\n• Swivel Speed: 5.0\n• Transition Speed: 1.20\n\n🎮 **Controller:**\n• Steering Sens: 1.30\n• Aerial Sens: 1.30\n• Deadzone: 0.05 (ignore timing)\n• Dodge Deadzone: 0.60\n\nجربها وعدل عاللي يناسبك. أهم شي: لا تغير الإعدادات كل يوم — ثبتها و تعود عليها.";
    }

    // Asking about ranking up
    if (words.some(w => ["رنك", "rank", "ترقية", "اطلع", "صاعد", "bronze", "silver", "gold", "platinum", "diamond", "champion", "gc", "ssl", "رتبه"].includes(w))) {
        return "اللي يمنعك ترتفع مو مهارتك — وعيك بأخطائك. كل رتبة لها مشكلة:\n\n**Plat**: تلعب بسرعة بدون تفكير. اهدأ.\n**Diamond**: تطفش من الدفاع. العب أكثر خلف الكورة.\n**Champ**: قرارات سيئة تحت الضغط. خذ نفس.\n**GC**: still mechanical gaps.\n\nحدد رتبتك واشتغل على نقطة الضعف ذي بالذات — رح تطلع رنك.";
    }

    // Asking about specific mechanics
    if (words.some(w => ["فليك", "flick", "فليب", "flip", "إيريال", "ايريال", "ايردربل", "دريبل", "wavedash", "speedflip", "half", "فلير", "reset"].includes(w))) {
        return "أي ميكانيك في هاللعبة ينقسم لثلاث مراحل:\n1️⃣ **الفهم** — شوف كيف المحترف يسويها (فيديو يوتيوب)\n2️⃣ **التطبيق في free play** — كررها بدون ضغط ١٠ دقايق يومياً\n3️⃣ **التطبيق في المباراة** — جربها في مواقف منخفضة الخطورة\n\nأغلب الناس يطفرون من المرحلة ٢. لا تستعجل — كل ميكانيك يحتاج وقت.";
    }

    // Generic improvement advice
    if (words.some(w => ["اتطور", "تطوير", "تحسن", "اتحسن", "مستواي", "ضعيف"].includes(w))) {
        return "أفضل طريقة تتحسن: حدد **مهارة واحدة** كل أسبوع.\n\nالأسبوع الأول: الـ recoveries (wavedash, half flip)\nالأسبوع الثاني: first touch و التحكم بالكرة\nالأسبوع الثالث: دقة التسديد\nالأسبوع الرابع: shadow defense\n\nكل يوم ١٥ دقيقة قبل الرانكد. شهر واحد فقط و رح تشوف فرق كبير.";
    }

    return null;
}

// ─── COACH RESPONSE GENERATOR ──────────────
function getCoachResponse(input) {
    const lower = normalize(input.trim());
    const words = tokenize(input);
    coachContext.turnCount++;

    // ── Pure greetings (short & direct) ──
    const greetings = ["هلا", "هلو", "مرحبا", "هاي", "ها", "hi", "hello", "hey", "سلام", "اهلين", "مساء الخير", "السلام عليكم", "مساء", "صباح الخير", "هاي"];
    if (words.length <= 3 && greetings.some(g => lower.includes(g))) {
        return "وعليكم السلام! أهلاً بك. أنا جاهز لأي سؤال — روتنيشن، ميكانيك، بوست، تدريب، أو تحليل. وش عندك؟";
    }

    // ── Thanks & farewells ──
    const thanks = ["شكرا", "يسلمو", "تسلم", "thx", "thanks", "thank", "يعطيك", "الله يعافيك", "ما قصرت"];
    if (words.length <= 4 && thanks.some(g => lower.includes(g)) && !lower.includes("سؤال")) {
        const farewells = [
            "العفو! أي وقت. شد حيلك و بتوصل GC قريباً 💪",
            "الله يسلمك! إذا احتجت شي ثاني — أنا موجود.",
            "على الرحب والسعة! تذكّر: التطور يحتاج صبر. كل مباراة درس جديد.",
            "تقدّر بالخدمة! لا تنسى تسوي تحليل ريبلاي لنفسك — كل اسبوع مرة.",
            "العفو! واذا تبغى كودات تدريب لمهارة معينة — قلي وش تحتاج."
        ];
        return farewells[Math.floor(Math.random() * farewells.length)];
    }

    // ── Follow-up chatter ──
    const affirmatives = ["نعم", "اي", "ايه", "yes", "yeah", "يب", "ok", "اوكي", "تم", "طيب"];
    if (words.length <= 3 && affirmatives.some(a => lower.includes(a))) {
        const followups = [
            "تمام! جرب الكلام اللي قلته لك و ارجع لي بخبر.",
            "كويس! عندك سؤال ثاني ولا شيء؟",
            "حلو. خلني أضيف: أهم شي الاستمرارية. كل يوم شوي — مو مرة في الأسبوع كثير.",
            "ممتاز! إذا تبغى شيء محدد — روتنيشن، ميكانيك، تدريب — قلي."
        ];
        return followups[Math.floor(Math.random() * followups.length)];
    }

    // ── Ask about replay analysis (from the RL Analyzer results) ──
    if (lower.includes("ريبلاي") || lower.includes("تحليل") || lower.includes("نصائح") || lower.includes("نتايج") || lower.includes("نتائج")) {
        if (lower.includes("نصائح") || lower.includes("شفت")) {
            return "نعم شفت التحليل. الأرقام مو كذب — اللي يبين من إحصائياتك:\n\nإذا **سرعة البوست** أقل من ٣٠ → تركز على جمع boost أكثر من اللعب. إذا **نسبة الدقة** أقل من ٢٠٪ مع محاولات كثيرة — تسدد من زوايا صعبة. إذا **السرعة المتوسطة** أقل من ١٥٠٠ — تتحرك ببطء.\n\nوش تبغى أركز عليه بالضبط؟";
        }
        return "حللنا الريبلاي حقك. الأرقام تتكلم. بس التحليل الحقيقي يكون لما تشوف الريبلاي بنفسك بنظرة ثالثة. ركز على:\n1️⃣ أول ٣ ثواني بعد ما تلمس الكورة — وين تروح؟\n2️⃣ الـ double commits — كم مرة لعبت وانت ورا زميلك؟\n3️⃣ كل هدف دخل عليك — ويش كان المفروض تسوي بدال اللي سويت؟\n\nجرب ذي الطريقة و رح تكتشف أخطاء ما كنت منتبه لها.";
    }

    // ── Smart fallback before KB lookup (covers personal questions) ──
    const smart = smartFallback(input);
    if (smart) return smart;

    // ── Knowledge Base matching ──
    const result = findBestCategory(input);
    if (result.entry && result.score > 0) {
        coachContext.lastTopic = result.entry;
        const responses = result.entry.responses;
        // Rotate responses if possible to avoid same reply twice
        let idx = Math.floor(Math.random() * responses.length);
        if (responses.length > 1) {
            while (responses[idx] === coachContext.lastResponse && responses.length > 1) {
                idx = (idx + 1) % responses.length;
            }
        }
        coachContext.lastResponse = responses[idx];
        return responses[idx];
    }

    // ── Ultra fallback: analyze question words ──
    const qType = detectQuestionType(input);
    const ulf = [
        "صراحةً، سؤالك يحتاج تفصيل. وش بالضبط اللي تبغى تعرفه؟ مثلاً: روتنيشن ولا ميكانيك ولا تدريب؟.",
        "سؤال ممتاز. بس عشان أجاوب بدقة: هل تقصد في 1v1 ولا 2v2 ولا 3v3؟ كل طور له أسلوب مختلف.",
        "فكرت في هالسؤال من زمان. الإجابة المختصرة: ركز على الأساسيات. إجابة كاملة: وش بالضبط مستواك الحالي وراح أعطيك خطة مخصصة.",
        "أقدر أفيدك بشرط: حدد وش المشكلة بالضبط. هل هي في الهجوم ولا الدفاع؟ ولا في التمركز ولا القرارات؟ كل شي له حل مختلف.",
        "أهلاً! وش تحتاج؟ عندي خبرة في كل شي روكيت ليق — روتنيشن، ميكانيك، إدارة بوست، تحليل ريبلاي. قلي وش تبي بالضبط.",
        "بصفتي لاعب RLCS سابق، أقدر أقولك إن السؤال هذا يلامس موضوع كبير. أقترح تركز على جزئية وحدة: مثلاً تحسين التمركز الدفاعي. إذا تبغى تفاصيل أكثر قلي."
    ];
    return ulf[Math.floor(Math.random() * ulf.length)];
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
