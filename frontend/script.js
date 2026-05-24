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
