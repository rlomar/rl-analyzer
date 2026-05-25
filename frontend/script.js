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
    if (el.dataset.mode === savedMode) { el.classList.add("selected"); el.querySelector("input[type=radio]").checked = true; }
});
document.querySelectorAll(".mode-option").forEach(el => {
    el.addEventListener("click", () => {
        document.querySelectorAll(".mode-option").forEach(o => o.classList.remove("selected"));
        el.classList.add("selected"); el.querySelector("input[type=radio]").checked = true;
        gameMode = el.dataset.mode; localStorage.setItem("rl_game_mode", gameMode);
    });
});
const savedKey = localStorage.getItem("rl_api_key");
if (savedKey) { apiInput.value = savedKey; fetch(SET_KEY_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({key:savedKey}) }); }

// ═══ AUTH ═══════════════════════════════════
function getProviderIcon(username) {
    if (username.startsWith("steam_")) return "🎮";
    if (username.startsWith("epic_")) return "⭐";
    return "👤";
}
function checkAuth() {
    fetch("/api/me").then(r=>r.json()).then(data => {
        const uph=document.getElementById("user-profile-header");
        if (data.user) {
            document.getElementById("auth-logged-out").classList.add("hidden");
            document.getElementById("auth-logged-in").classList.remove("hidden");
            document.getElementById("auth-username").textContent = getProviderIcon(data.user) + " " + (data.tagged_name || data.display_name || data.user);
            // Fetch full profile to populate header + stats
            fetch("/api/user/profile").then(r=>r.json()).then(d=>{
                if(d.error) return;
                const u=d.user||{}, s=d.stats||{}, ttl=s.total_replays||0;
                const tag=u.tagged_name||u.display_name||u.username||"مستخدم";
                const totalXp=u.xp||0;
                const level=Math.floor(totalXp/1000)+1;
                const xpPct=Math.min(100,Math.round(((totalXp%1000)/1000)*100));
                const rank=ttl>=100?"SSL":ttl>=50?"GC":ttl>=30?"Champ":ttl>=20?"Diamond":ttl>=10?"Plat":ttl>=5?"Gold":ttl>=2?"Silver":"Bronze";
                document.getElementById("uph-avatar").textContent=tag.charAt(0).toUpperCase();
                document.getElementById("uph-rank").textContent=rank;
                document.getElementById("uph-name").textContent=tag;
                document.getElementById("uph-sub").textContent=u.username||"مستخدم مسجل";

                // Rank glow & border on avatar
                const rankColors={Bronze:"#8d6e63",Silver:"#bdbdbd",Gold:"#ffb300",Plat:"#26a69a",Diamond:"#1e88e5",Champ:"#8e24aa",GC:"#d32f2f",SSL:"#7c4dff"};
                const av=document.getElementById("uph-avatar");
                const c=rankColors[rank]||rankColors.Bronze;
                av.style.setProperty("--avatar-border",c);
                av.style.setProperty("--avatar-glow",c+"44");
                av.style.setProperty("--avatar-glow-soft",c+"22");
const onlineDot=document.querySelector("#user-profile-header .dot");
if(onlineDot) onlineDot.style.background="#00c853";
                document.getElementById("uph-level").textContent="Level "+level;
                document.getElementById("uph-xp").style.width=xpPct+"%";
                document.getElementById("uph-xp-text").textContent=(totalXp%1000)+" / 1000 XP";
                // Banner color by rank
                const banner=document.querySelector("#user-profile-header .profile-banner");
                const colors={Bronze:"linear-gradient(135deg,#8d6e63,#6d4c41,#4e342e)",Silver:"linear-gradient(135deg,#bdbdbd,#9e9e9e,#757575)",Gold:"linear-gradient(135deg,#ffd54f,#ffb300,#ff8f00)",Plat:"linear-gradient(135deg,#80cbc4,#26a69a,#00897b)",Diamond:"linear-gradient(135deg,#64b5f6,#1e88e5,#1565c0)",Champ:"linear-gradient(135deg,#ce93d8,#8e24aa,#6a1b9a)",GC:"linear-gradient(135deg,#ef5350,#d32f2f,#b71c1c)",SSL:"linear-gradient(135deg,#b388ff,#7c4dff,#651fff)"};
                if(banner) banner.style.background=colors[rank]||colors.Bronze;
                uph.classList.remove("hidden");
                // Stats cards
                document.getElementById("stat-goals").textContent=s.total_goals||0;
                document.getElementById("stat-wins").textContent=Math.round((s.total_replays||0)*0.45);
                document.getElementById("stat-accuracy").textContent=Math.round(s.avg_shooting_pct||0)+"%";
                document.getElementById("stat-mvp").textContent=Math.round((s.total_replays||0)*0.2);
                document.getElementById("stats-grid").classList.remove("hidden");
document.getElementById("profile-tabs").classList.remove("hidden");
// Fetch achievements
fetch("/api/user/achievements").then(r=>r.json()).then(ad=>{
    const achs=ad.achievements||[];
    const c=document.getElementById("achievements-content");
    c.innerHTML=achs.map(a=>`<div class="achievement ${a.unlocked?"unlocked":"locked"}">${a.icon} ${a.name}</div>`).join("");
    document.getElementById("achievements-grid").classList.remove("hidden");
}).catch(()=>{});
// Fetch radar
fetch("/api/user/radar").then(r=>r.json()).then(rd=>{
    if(rd.radar){renderRadarChart(rd.radar);document.getElementById("radar-section").classList.remove("hidden");}
}).catch(()=>{});
            }).catch(()=>{});
        } else {
            uph.classList.add("hidden");
            document.getElementById("stats-grid").classList.add("hidden");
document.getElementById("profile-tabs").classList.add("hidden");
document.getElementById("achievements-grid").classList.add("hidden");
document.getElementById("radar-section").classList.add("hidden");
        }
    }).catch(()=>{});
}

function toggleUserMenu() {
    const m = document.getElementById("user-menu"); m.classList.toggle("hidden");
}
document.addEventListener("click", function(e) {
    const m = document.getElementById("user-menu"), t = document.getElementById("menu-toggle");
    if (!m.classList.contains("hidden") && !m.contains(e.target) && !t.contains(e.target)) m.classList.add("hidden");
});

function logoutUser() {
    fetch("/api/logout",{method:"POST"}).then(r=>r.json()).then(()=>{
        document.getElementById("auth-logged-out").classList.remove("hidden");
        document.getElementById("auth-logged-in").classList.add("hidden");
        document.getElementById("user-menu").classList.add("hidden");
    }).catch(()=>{});
}
checkAuth();

// ═══ TAB SWITCHING ════════════════════
function switchTab(tab){
    document.querySelectorAll(".profile-tabs .tab").forEach(t=>t.classList.remove("active"));
    document.querySelector(`.profile-tabs .tab[onclick*="${tab}"]`).classList.add("active");
    ["overview","matches","analytics","settings"].forEach(t=>{
        document.getElementById("tab-"+t).classList.toggle("hidden",t!==tab);
    });
    if(tab==="matches") loadMatchesTab();
    if(tab==="analytics") loadAnalyticsTab();
}
function loadMatchesTab(){
    const el=document.getElementById("matches-list");
    el.innerHTML='<p style="color:#8892b0;">جاري التحميل...</p>';
    fetch("/api/user/profile").then(r=>r.json()).then(d=>{
        const recent=d.replays||[];
        if(!recent.length){el.innerHTML='<p style="color:#8892b0;">لا توجد مباريات بعد</p>';return;}
        let html='<div class="table-wrap"><table class="history-table"><thead><tr><th>#</th><th>الطور</th><th>الخريطة</th><th>أ/ت/تص</th><th>دقة</th><th>سكور</th><th>نتيجة</th><th>التاريخ</th></tr></thead><tbody>';
        recent.forEach((g,i)=>{
            const w=(g.team==="blue"&&g.blue_goals>g.orange_goals)||(g.team==="orange"&&g.orange_goals>g.blue_goals);
            const dr=g.blue_goals===g.orange_goals;
            html+=`<tr><td>#${recent.length-i}</td><td>${g.game_mode||"-"}</td><td>${g.map_name||"-"}</td><td>${g.goals||0}/${g.assists||0}/${g.saves||0}</td><td>${Math.round(g.shooting_pct||0)}%</td><td>${g.score||0}</td><td style="color:${w?"#00c853":dr?"#ffab00":"#ff1744"}">${w?"فوز":dr?"تعادل":"خسارة"}</td><td style="font-size:12px;color:#5a6a8a">${g.uploaded_at?g.uploaded_at.slice(0,10):"-"}</td></tr>`;
        });
        html+='</tbody></table></div>';
        el.innerHTML=html;
    }).catch(()=>{el.innerHTML='<p style="color:#ff1744;">تعذر التحميل</p>';});
}
function loadAnalyticsTab(){
    const el=document.getElementById("analytics-list");
    el.innerHTML='<p style="color:#8892b0;">جاري التحميل...</p>';
    fetch("/api/user/profile").then(r=>r.json()).then(d=>{
        const s=d.stats||{};
        el.innerHTML=`
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                <div class="stat-card"><span>⚽</span><h3>Goals</h3><strong>${s.total_goals||0}</strong></div>
                <div class="stat-card"><span>🎯</span><h3>Shots</h3><strong>${s.total_shots||0}</strong></div>
                <div class="stat-card"><span>🛡️</span><h3>Saves</h3><strong>${s.total_saves||0}</strong></div>
                <div class="stat-card"><span>🤝</span><h3>Assists</h3><strong>${s.total_assists||0}</strong></div>
                <div class="stat-card"><span>📊</span><h3>Win Rate</h3><strong>${s.total_replays?Math.round((Math.min(s.total_replays*0.45,s.total_replays)/s.total_replays)*100):0}%</strong></div>
                <div class="stat-card"><span>⛽</span><h3>Avg Boost</h3><strong>${Math.round(s.avg_boost||0)}</strong></div>
                <div class="stat-card"><span>💀</span><h3>Demos</h3><strong>${s.total_demos||0}</strong></div>
                <div class="stat-card"><span>🏅</span><h3>MVP Count</h3><strong>${Math.round((s.total_replays||0)*0.2)}</strong></div>
            </div>
            <p style="color:#5a6a8a;font-size:13px;margin-top:16px;">إجمالي الريبلايات: ${s.total_replays||0}</p>`;
    }).catch(()=>{el.innerHTML='<p style="color:#ff1744;">تعذر التحميل</p>';});
}

// ── PROFILE URL ROUTING ────────────────
(function(){
    const path=window.location.pathname;
    const m=path.match(/^\/(p|u)\/(.+)/);
    if(m){
        const profileName=decodeURIComponent(m[2]);
        setTimeout(()=>showPlayerProfile(profileName),600);
    }
})();

function copyProfileLink(){
    fetch("/api/me").then(r=>r.json()).then(d=>{
        if(!d.user) return alert("سجل الدخول أولاً");
        const url=`${window.location.origin}/p/${encodeURIComponent(d.user)}`;
        navigator.clipboard.writeText(url).then(()=>alert("✅ تم نسخ الرابط: "+url)).catch(()=>alert("❌ فشل النسخ"));
    });
}

function saveApiKey() {
    const key = apiInput.value.trim();
    if (!key) { alert("اكتب مفتاح API أول"); return; }
    fetch(SET_KEY_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key})})
    .then(r=>r.json()).then(d=>{if(d.success){localStorage.setItem("rl_api_key",key);apiStatus.textContent="✅ تم حفظ المفتاح";apiStatus.classList.remove("hidden");setTimeout(()=>apiStatus.classList.add("hidden"),3000);}})
    .catch(()=>alert("فشل حفظ المفتاح. شغل السيرفر أول."));
}

// ── File Upload ────────────────────────
dropZone.addEventListener("click",()=>fileInput.click());
dropZone.addEventListener("dragover", () => { dropZone.classList.add("drag-active"); });
dropZone.addEventListener("dragleave", () => { dropZone.classList.remove("drag-active"); });
dropZone.addEventListener("drop",e=>{e.preventDefault();dropZone.classList.remove("dragover");if(e.dataTransfer.files.length>0)handleFile(e.dataTransfer.files[0]);});
fileInput.addEventListener("change",e=>{if(e.target.files.length>0)handleFile(e.target.files[0]);});

function showResults(data) {
    resultsSection.classList.remove("hidden"); errorSection.classList.add("hidden");
    const game=data.game_info, players=data.players;
    const mins=Math.floor((game.duration||0)/60), secs=Math.floor((game.duration||0)%60);
    const rid=data.replay_id||"";
    document.getElementById("game-details").innerHTML=`
        <div class="game-stat"><span class="label">الخريطة</span><span class="value">${game.map}</span></div>
        <div class="game-stat"><span class="label">المدة</span><span class="value">${mins}:${secs.toString().padStart(2,"0")}</span></div>
        <div class="game-stat"><span class="label">${game.blue_name}</span><span class="value" style="color:#4a9eff">${game.blue_goals}</span></div>
        <div class="game-stat"><span class="label">${game.orange_name}</span><span class="value" style="color:#ff8c33">${game.orange_goals}</span></div>
        <div class="game-stat"><span class="label">النوع</span><span class="value">${game.playlist}</span></div>
        ${game.overtime?`<div class="game-stat"><span class="label">⏱</span><span class="value" style="color:#ff1744">وقت إضافي!</span></div>`:""}
        ${rid?`<div class="game-stat"><span class="label">⬇ تحميل</span><span class="value"><a href="/api/replay/${rid}/download" class="btn btn-sm" style="padding:4px 12px;text-decoration:none;">تحميل الريبلاي</a></span></div>`:""}`;
    const trends=data.trends||{}; renderTrends(trends);
    let html="";
    players.forEach((p,i)=>{
        const s=p.stats, tc=p.team_key||(i<2?"blue":"orange"), pt=trends[p.name];
        html+=`<div class="player-card team-${tc}"><div class="player-header"><span class="player-name">${p.name}</span><span class="team-badge ${tc}">${tc==="blue"?"الأزرق":"البرتقالي"}</span></div>
        ${pt&&pt.insights&&pt.insights.length?`<div class="trends-mini">${pt.insights.map(i=>`<span class="trend-insight">${i}</span>`).join("")}</div>`:""}
        <div class="stats-grid">${renderStatsGrid(s)}</div>
        <div class="tips-section"><h3>💡 نصائح مخصصة — بدون مجاملة</h3>${p.tips.map(t=>`<div class="tip-card priority-${t.priority}"><div class="tip-header"><span class="tip-title">${t.title}</span><span class="tip-priority ${t.priority}">${t.priority==="high"?"🚨 مهم":t.priority==="medium"?"⚡ متوسط":"✅ ممتاز"}</span></div><p class="tip-advice">${t.advice}</p></div>`).join("")}</div>
        <button class="btn btn-sm btn-history" onclick="loadPlayerHistory('${p.name}')">📜 سجل ${p.name}</button></div>`;
    });
    document.getElementById("players-results").innerHTML=html;
    if(data.team_analysis) renderTeamAnalysis(data.team_analysis);
    if(players.length>0) loadPlayerHistory(players[0].name);
    resultsSection.scrollIntoView({behavior:"smooth"});
}
function renderStatsGrid(s){return`<div class="stat-item"><span class="stat-label">⚽ أهداف</span><span class="stat-value">${s.goals}</span></div><div class="stat-item"><span class="stat-label">🎯 تمريرات</span><span class="stat-value">${s.assists}</span></div><div class="stat-item"><span class="stat-label">🛑 تصديات</span><span class="stat-value">${s.saves}</span></div><div class="stat-item"><span class="stat-label">🔫 تسديدات</span><span class="stat-value">${s.shots}</span></div><div class="stat-item"><span class="stat-label">📊 دقة التسديد</span><span class="stat-value ${s.shooting_pct<20&&s.shots>2?"bad":s.shooting_pct>40?"good":"warn"}">${s.shooting_pct}%</span></div><div class="stat-item"><span class="stat-label">⭐ سكور</span><span class="stat-value">${s.score}</span></div><div class="stat-item"><span class="stat-label">⛽ بوست (وسط)</span><span class="stat-value ${s.boost_avg<30?"bad":s.boost_avg<50?"warn":"good"}">${s.boost_avg}</span></div><div class="stat-item"><span class="stat-label">📦 بوست مجمع</span><span class="stat-value">${s.boost_collected}</span></div><div class="stat-item"><span class="stat-label">🔫 بوست مسروق</span><span class="stat-value">${s.boost_stolen}</span></div><div class="stat-item"><span class="stat-label">🟦 بودات كبيرة</span><span class="stat-value">${s.count_big_pads}</span></div><div class="stat-item"><span class="stat-label">🟩 بودات صغيرة</span><span class="stat-value">${s.count_small_pads}</span></div><div class="stat-item"><span class="stat-label">🗑️ بوست مهدر</span><span class="stat-value ${s.boost_wasted_pct>15?"bad":"warn"}">${s.boost_wasted_pct}%</span></div><div class="stat-item"><span class="stat-label">🪫 وقت 0 بوست</span><span class="stat-value ${s.percent_zero_boost>15?"bad":"warn"}">${s.percent_zero_boost}%</span></div><div class="stat-item"><span class="stat-label">🔵 Full boost</span><span class="stat-value">${s.percent_full_boost}%</span></div><div class="stat-item"><span class="stat-label">♻️ Overfill</span><span class="stat-value ${s.overfill_pct>10?"bad":"warn"}">${s.overfill_pct}%</span></div><div class="stat-item"><span class="stat-label">🏃 سرعة وسط</span><span class="stat-value ${s.avg_speed<1500?"warn":"good"}">${s.avg_speed}</span></div><div class="stat-item"><span class="stat-label">💨 Supersonic</span><span class="stat-value">${s.percent_supersonic}%</span></div><div class="stat-item"><span class="stat-label">🚶 بطيء</span><span class="stat-value">${s.time_slow_speed}ث</span></div><div class="stat-item"><span class="stat-label">🌍 على الأرض</span><span class="stat-value">${s.ground_pct}%</span></div><div class="stat-item"><span class="stat-label">🕊️ في الجو</span><span class="stat-value">${s.air_pct}%</span></div><div class="stat-item"><span class="stat-label">🎯 High aerials</span><span class="stat-value">${s.time_high_air}ث</span></div><div class="stat-item"><span class="stat-label">⚔️ هجوم</span><span class="stat-value" style="color:#4a9eff">${s.percent_offensive}%</span></div><div class="stat-item"><span class="stat-label">🛡️ دفاع</span><span class="stat-value" style="color:#ff8c33">${s.percent_defensive}%</span></div><div class="stat-item"><span class="stat-label">📍 مسافة للكرة</span><span class="stat-value">${s.dist_ball}</span></div><div class="stat-item"><span class="stat-label">👥 مسافة للفريق</span><span class="stat-value">${s.dist_mates}</span></div><div class="stat-item"><span class="stat-label">🔙 ورا الكرة</span><span class="stat-value">${s.time_behind_ball}ث</span></div><div class="stat-item"><span class="stat-label">🔜 قدام الكرة</span><span class="stat-value">${s.time_infront_ball}ث</span></div><div class="stat-item"><span class="stat-label">💥 ديمو سويته</span><span class="stat-value">${s.demos_inflicted}</span></div><div class="stat-item"><span class="stat-label">💀 ديمو أخذته</span><span class="stat-value">${s.demos_taken}</span></div><div class="stat-item"><span class="stat-label">🌀 Powerslides</span><span class="stat-value">${s.count_powerslide}</span></div>${s.goals_against_last_defender?`<div class="stat-item"><span class="stat-label">🔥 أهداف بدفاعي</span><span class="stat-value" style="color:#ff1744;font-weight:900">${s.goals_against_last_defender}</span></div>`:""}`;}
function renderTrends(t){const s=document.getElementById("trends-section"),n=Object.keys(t);if(!n.length){s.classList.add("hidden");return;}let c="";for(const k of n){const v=t[k];if(!v.insights||!v.insights.length)continue;c+=`<div class="trends-card"><div class="trends-player-name">📈 ${k} — ${v.games_analyzed} مباريات</div><div class="trends-insights">${v.insights.map(i=>`<div class="trend-insight">${i}</div>`).join("")}</div></div>`;}if(c){s.innerHTML=`<div class="card"><h2>📊 تطور المستوى</h2><div class="trends-grid">${c}</div></div>`;s.classList.remove("hidden");}else s.classList.add("hidden");}
function renderTeamAnalysis(t){const s=document.getElementById("team-section");s.classList.remove("hidden");const ml=gameMode==="scrim"?"سكريم":"3v3";let h=`<div class="card"><h2>🏆 تحليل الفريق — ${ml}</h2><div class="team-grid">`;for(const k of["blue","orange"]){const v=t[k];if(!v)continue;const wn=v.goals>v.opponent_goals,dr=v.goals===v.opponent_goals;h+=`<div class="team-card ${wn?"team-won":dr?"team-drawn":"team-lost"}"><div class="team-header"><span class="team-name" style="color:${k==="blue"?"#4a9eff":"#ff8c33"}">${v.name}</span><span class="team-result">${v.goals} - ${v.opponent_goals} ${wn?"✅":dr?"⚖️":"❌"}</span></div><div class="team-stats"><div class="team-stat"><span class="label">🚀 سرعة الفريق</span><span class="value">${v.avg_speed}</span></div><div class="team-stat"><span class="label">⛽ boost</span><span class="value">${v.avg_boost}</span></div><div class="team-stat"><span class="label">🎯 تسديدات</span><span class="value">${v.total_shots}</span></div><div class="team-stat"><span class="label">🛑 تصديات</span><span class="value">${v.total_saves}</span></div><div class="team-stat"><span class="label">🎯 تمريرات</span><span class="value">${v.total_assists}</span></div><div class="team-stat"><span class="label">💥 ديمو</span><span class="value">${v.demos_inflicted}</span></div><div class="team-stat"><span class="label">📍 مسافة للكرة</span><span class="value">${v.avg_distance_ball}</span></div><div class="team-stat"><span class="label">👥 تماسك الفريق</span><span class="value">${v.avg_distance_mates}</span></div><div class="team-stat"><span class="label">⭐ مجموع سكور</span><span class="value">${v.total_score}</span></div></div><div class="tips-section"><h3>💡 نصائح الفريق</h3>${v.tips.map(t=>`<div class="tip-card priority-${t.priority}"><div class="tip-header"><span class="tip-title">${t.title}</span><span class="tip-priority ${t.priority}">${t.priority==="high"?"🚨 مهم":t.priority==="medium"?"⚡ متوسط":"✅ ممتاز"}</span></div><p class="tip-advice">${t.advice}</p></div>`).join("")}</div></div>`;}h+="</div></div>";s.innerHTML=h;}
function loadPlayerHistory(pn){const sec=document.getElementById("history-section"),con=document.getElementById("history-content");fetch(`/api/history/${encodeURIComponent(pn)}?mode=${gameMode}`).then(r=>r.json()).then(d=>{if(!d.history||!d.history.length){sec.classList.add("hidden");return;}sec.classList.remove("hidden");const h=d.history;let rows=h.map((g,i)=>{const w=(g.team==="blue"&&g.blue_goals>g.orange_goals)||(g.team==="orange"&&g.orange_goals>g.blue_goals),dr=g.blue_goals===g.orange_goals;return`<tr><td>#${h.length-i}</td><td>${g.map_name||"-"}</td><td>${g.goals}/${g.assists}/${g.saves}</td><td>${g.shooting_pct}%</td><td>${g.boost_avg}</td><td>${g.score}</td><td style="color:${w?"#00c853":dr?"#ffab00":"#ff1744"}">${w?"فوز":dr?"تعادل":"خسارة"}</td><td style="font-size:12px;color:#5a6a8a">${g.uploaded_at?g.uploaded_at.slice(0,10):"-"}</td></tr>`;}).join("");con.innerHTML=`<p style="margin-bottom:10px;color:#8892b0">آخر ${h.length} مباريات — ${pn}</p><div class="table-wrap"><table class="history-table"><thead><tr><th>#</th><th>الخريطة</th><th>أهداف/تمرير/تصدي</th><th>دقة</th><th>boost</th><th>سكور</th><th>نتيجة</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table></div>`;}).catch(()=>sec.classList.add("hidden"));}
function showError(m){errorSection.classList.remove("hidden");resultsSection.classList.add("hidden");errorMessage.innerHTML=m.replace(/\n/g,"<br>");}
function resetApp(){errorSection.classList.add("hidden");resultsSection.classList.add("hidden");dropZone.classList.remove("hidden");uploadStatus.classList.add("hidden");document.getElementById("file-input").value="";}

// ═══ PLAYER SEARCH ═════════════════════
let searchTimeout=null;
function handleSearch(){
    clearTimeout(searchTimeout);
    const inp=document.getElementById("search-input").value.trim(),res=document.getElementById("search-results");
    if(inp.length<1){res.classList.add("hidden");return;}
    searchTimeout=setTimeout(()=>{
        fetch(`/api/players/search?q=${encodeURIComponent(inp)}`).then(r=>r.json()).then(d=>{
            const pl=d.players||[];
            if(!pl.length){res.innerHTML='<div class="search-result-item search-result-empty">لا توجد نتائج</div>';res.classList.remove("hidden");return;}
            res.innerHTML=pl.map(p=>{
                const isUser=p.source==="user";
                const statsTxt=isUser?`مستخدم مسجل`:`${p.total_games} مباريات | ${p.total_goals} goals | ${Math.round(p.avg_score||0)} avg`;
                return `<div class="search-result-item search-result-${p.source}" onclick="showPlayerProfile('${p.player_name}')"><span class="search-result-name">${isUser?"👤 ":""}${p.player_name}</span><span class="search-result-stats">${statsTxt}</span></div>`;
            }).join("");
            res.classList.remove("hidden");
        }).catch(()=>{});
    },300);
}
document.addEventListener("click",function(e){const res=document.getElementById("search-results"),inp=document.getElementById("search-input");if(!res.classList.contains("hidden")&&!res.contains(e.target)&&e.target!==inp)res.classList.add("hidden");});

function playerRank(ttl){return ttl>=100?"SSL":ttl>=50?"GC":ttl>=30?"Champ":ttl>=20?"Diamond":ttl>=10?"Plat":ttl>=5?"Gold":ttl>=2?"Silver":"Bronze";}
const rankColors={Bronze:"#8d6e63",Silver:"#bdbdbd",Gold:"#ffb300",Plat:"#26a69a",Diamond:"#1e88e5",Champ:"#8e24aa",GC:"#d32f2f",SSL:"#7c4dff"};
const rankBanners={Bronze:"linear-gradient(135deg,#8d6e63,#6d4c41,#4e342e)",Silver:"linear-gradient(135deg,#bdbdbd,#9e9e9e,#757575)",Gold:"linear-gradient(135deg,#ffd54f,#ffb300,#ff8f00)",Plat:"linear-gradient(135deg,#80cbc4,#26a69a,#00897b)",Diamond:"linear-gradient(135deg,#64b5f6,#1e88e5,#1565c0)",Champ:"linear-gradient(135deg,#ce93d8,#8e24aa,#6a1b9a)",GC:"linear-gradient(135deg,#ef5350,#d32f2f,#b71c1c)",SSL:"linear-gradient(135deg,#b388ff,#7c4dff,#651fff)"};

function showPlayerProfile(pn){
    document.getElementById("search-results").classList.add("hidden");
    const modal=document.getElementById("player-profile-modal"),content=document.getElementById("player-profile-content");
    modal.classList.remove("hidden"); content.innerHTML="<p style='color:#8892b0;'>جاري التحميل...</p>";
    fetch(`/api/players/profile/${encodeURIComponent(pn)}`).then(r=>r.json()).then(profile=>{
        if(profile.error || !profile.stats || !profile.stats.total_games){
            fetch(`/api/user-search?q=${encodeURIComponent(pn)}`).then(r=>r.json()).then(ud=>{
                const u=ud.user;
                if(!u){
                    content.innerHTML="<p style='color:#ff1744;'>لا توجد بيانات لهذا اللاعب</p>";
                    return;
                }
                const tag=u.tagged_name||u.display_name||u.username||pn;
                const rank="Bronze";
                const rc=rankColors[rank];
                const link=`${window.location.origin}/p/${encodeURIComponent(u.username)}`;
                let html=`
                    <div class="profile-header" style="display:block;">
                        <div class="profile-banner" style="background:${rankBanners[rank]};"></div>
                        <div class="profile-main" style="flex-direction:column;">
                            <div class="profile-avatar-wrapper">
                                <div class="profile-avatar" style="--avatar-border:${rc};--avatar-glow:${rc}44;--avatar-glow-soft:${rc}22;background:linear-gradient(135deg,${rc},${rc}88);">${tag.charAt(0).toUpperCase()}</div>
                                <div class="rank-badge">${rank}</div>
                            </div>
                            <div class="profile-info">
                                <h2 style="color:#fff;margin:0;">${tag}</h2>
                                <p class="profile-sub" style="color:#8892b0;font-size:13px;">👤 مستخدم مسجل — لا توجد ريبلايات بعد</p>
                                <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${link}');alert('✅ تم نسخ الرابط')" style="margin-top:8px;">🔗 نسخ الرابط</button>
                            </div>
                        </div>
                    </div>`;
                content.innerHTML=html;
            }).catch(()=>{content.innerHTML="<p style='color:#ff1744;'>لا توجد بيانات لهذا اللاعب</p>";});
            return;
        }
        const s=profile.stats||{},games=profile.games||[];
        fetch(`/api/players/${encodeURIComponent(pn)}/replays`).then(r=>r.json()).then(replayData=>{
            const replays=replayData.replays||[];
            const ttl=s.total_games||0;
            const rank=playerRank(ttl);
            const rc=rankColors[rank];
            const plink=`${window.location.origin}/p/${encodeURIComponent(pn)}`;
            const totalXp=0; const level=1; const xpPct=0;
            let html=`
                <div class="profile-header" style="display:block;">
                    <div class="profile-banner" style="background:${rankBanners[rank]};"></div>
                    <div class="profile-main" style="flex-direction:column;">
                        <div class="profile-avatar-wrapper">
                            <div class="profile-avatar" style="--avatar-border:${rc};--avatar-glow:${rc}44;--avatar-glow-soft:${rc}22;background:linear-gradient(135deg,${rc},${rc}88);">${pn.charAt(0).toUpperCase()}</div>
                            <div class="rank-badge">${rank}</div>
                        </div>
                        <div class="profile-info">
                            <h2 style="color:#fff;margin:0;">${pn}</h2>
                            <p class="profile-sub" style="color:#8892b0;font-size:13px;">${ttl} مباريات إجمالي</p>
                            <button class="btn btn-sm" onclick="navigator.clipboard.writeText('${plink}');alert('✅ تم نسخ الرابط')" style="margin-top:8px;">🔗 نسخ الرابط</button>
                        </div>
                    </div>
                </div>
                <div class="stats-grid" style="margin-top:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
                    <div class="stat-card"><span>⚽</span><h3>Goals</h3><strong>${s.total_goals||0}</strong></div>
                    <div class="stat-card"><span>🏆</span><h3>Wins</h3><strong>${Math.round(ttl*0.45)}</strong></div>
                    <div class="stat-card"><span>🎯</span><h3>Accuracy</h3><strong>${Math.round(s.avg_shooting_pct||0)}%</strong></div>
                    <div class="stat-card"><span>🚀</span><h3>MVP</h3><strong>${Math.round(ttl*0.2)}</strong></div>
                </div>`;
            if(replays.length){
                html+=`<h4 style="color:#fff;margin:15px 0 10px;">🕐 الريبلايات</h4><div class="table-wrap" style="max-height:300px;overflow-y:auto;"><table class="history-table"><thead><tr><th>#</th><th>الطور</th><th>الخريطة</th><th>أ/ت/تص</th><th>سكور</th><th>نتيجة</th><th>التاريخ</th><th></th></tr></thead><tbody>`;
                replays.forEach((g,i)=>{
                    const won=(g.team==="blue"&&g.blue_goals>g.orange_goals)||(g.team==="orange"&&g.orange_goals>g.blue_goals);
                    html+=`<tr><td>#${replays.length-i}</td><td>${g.game_mode||"-"}</td><td>${g.map_name||"-"}</td><td>${g.goals||0}/${g.assists||0}/${g.saves||0}</td><td>${g.score||0}</td><td style="color:${won?"#00c853":"#ff1744"}">${won?"فوز":"خسارة"}</td><td style="font-size:12px;color:#5a6a8a">${g.uploaded_at?g.uploaded_at.slice(0,10):"-"}</td>
                    <td>${g.replay_id?`<a href="/api/replay/${g.replay_id}/download" class="btn btn-sm" style="padding:4px 10px;font-size:11px;text-decoration:none;">⬇</a>`:""}</td></tr>`;
                });
                html+=`</tbody></table></div>`;
            }
            content.innerHTML=html;
        }).catch(()=>{content.innerHTML="<p style='color:#ff1744;'>تعذر تحميل بيانات اللاعب</p>";});
    }).catch(()=>{content.innerHTML="<p style='color:#ff1744;'>تعذر تحميل بيانات اللاعب</p>";});
}
function closePlayerProfile(){document.getElementById("player-profile-modal").classList.add("hidden");}

// ═══════════════════════════════════════════════
// AI COACH
// ═══════════════════════════════════════════════
const coachKnowledge=[
    {id:"rotations",name:"روتنيشن",topics:["روتنيشن","روتيشن","rotations","دوران"],responses:["الروتنيشن هو أساس اللعب الجماعي. في 3v3، أفضّل نظام الـ 3 أدوار: 1 هجوم، 1 مساند، 1 دفاع. أبداً لا تجلس ورا زميلك نفس المنطقة — وزعوا المساحة. واهم شي: إذا زميلك رجع عنده boost قليل، اترك اللعبة وارجع بداله.","في 2v2، الفكرة أبسط: واحد هجوم وواحد دفاع. لا تهجم وزميلك وراك — معناها لو ضاعت الكرة هدف مضمون. الـ shadow defense هنا أساسي: ارجع ورا الكرة شوي واقرأ تحركات الخصم بدال ما تنقض على كل شي.","في 1v1 الروتنيشن مختلف — أنت اللاعب الوحيد. ركز على إنك ما تضيع boost بدون فايدة. اعطي نفسك مساحة وكمل البلاي بهدوء. السرعه مو دايم حل — اقرأ لعب الخصم.","من خبرتي في الـ RLCS، الفرق المحترفة تمشي بقاعدة الـ spacing: بين كل لاعب والثاني مسافة سيارة ونص. إذا اقتربت أكثر من كذا، تخلي الدفاع مكشوف. تذكّر: الـ 3v3 مو لعبة فردية."]},
    {id:"boost",name:"بوست",topics:["boost","بوست","بست","نيترو","nitro","وقود","fuel"],responses:["إدارة البوست تفرق بين لاعب محترف ولاعب عادي. أول نصيحة: لا تستخدم boost عشان توصل للكرة لو هي رايحه للزميل — خلها. ثاني شي: اعرف مواقع البوستات الكبيرة على الخريطة مثل ظهر يدك.","في الـ RLCS، البوست يحدد الفريق اللي يتحكم بالمباراة. لو boostك قليل، العب small pads بدال ما تروح big pad وتترك منطقتك. الـ small pads تعطيك 12 بوست وموزعة في كل مكان — استغلها.","النصيحة الذهبية: لا توصل لسرعة supersonic كل شوي. خفف زيادة boost عشان ما تضيعه. في الدفاع، حافظ على 30-40 بوست عشان تقدر تتصدى وترجع بسرعة.","سر البوست أن تجمعه بذكاء: ارسم مسارك بين big pads و small pads. واهم شي — لا توقف عشان تجمع boost! تحرك ببطء وانت تجمعه عشان ما تخلي دفاعك فاضي."]},
    {id:"mechanics",name:"ميكانيك",topics:["ميكانيك","ميكانيكا","ميكانيكية","حركات","فليك","ايريال","ايردربل","دريبل","ريسيت","reset","flip","wave","wavedash"],responses:["الميكانيك مهم بس مو كل شي. في الـ RLCS، أبسط الحركات تنفع لو طبقتها بوقتها. ركّز على الأساسيات: الـ powerslide cut، الـ hook shot، و wave dash. هذي كافية توصل لـ GC.","الـ flip reset حركة متقدمة — مرة حلوة بس مو ضرورية. شاهد كيف يطبقها Justin و Zen: بسيط و سلس. بس تذكر: ٩ من ١٠ مرات، الـ air dribble البسيط ينفع أكثر من الـ reset.","إذا تبغى تتطور في الميكانيك، خصص ١٠ دقائق free play يومياً. ركز على: fast aerial، flick (front flip و 45 degree)، و powershot. التكرار يخليها عادة.","الـ wavedash أساسي: استخدمه عشان تطلع من الحيطان بسرعة، وعشان توقف بدل ما تطفش بعد الهبوط. ضروري كل لاعب يتقنه.","فيه فرق بين speed و mechanics. اتعلم تقرأ الكرة بدل ما تجري وراها بسرعه. السرعة الزايدة تخلي ميكانيكك غير مضبوط. خذ وقتك."]},
    {id:"positioning",name:"تمركز",topics:["مركز","position","تمركز","مكان","موقع","positioning"],responses:["التمركز الصحيح يخلي المباراة سهله. اتحرك على طول الخط الوهمي بين الكرة ومرماك. لا تقطع على زميلك ولا تتجمعون في زاويه وحده.","في الدفاع، اقعد على الـ back post. من هناك تشوف كل الملعب. إذا انضغطت، لا تطلع بخروج سيء — استخدم الحائط و اطلع ببطء عشان تعطي زميلك وقت يرجع.","لما تهاجم، لا تدخل الـ corner مع الخصم. خذ الكرة للـ mid و شوف الخيارات. الـ corner موت زون لأي لاعب — يضيق الخيارات و يخليك عرضه للديمو.","شوف الخريطة كاملة، مو بس الكرة. اعرف وين زميلك ووين الخصم. الـ game sense يبدأ من الوعي المكاني. كل ٣ ثواني ارفع راسك من الكرة."]},
    {id:"2v2",name:"2v2",topics:["2v2","two","twos","دبل","ثنائي"],responses:["في الـ 2v2، السر هو التوازن. إذا زميلك مهاجم، انت دفاع. بس مو دفاع بعيد — قريب كفاية عشان لو ارتدت الكرة تلمسها. الفرق الكبيرة تقرأ ارتدادات الكوره قبل لا تصير.","نصيحة قوية: لا تروح للـ boost إذا زميلك في الهجوم ويمكن يفقد الكرة. خذ small pads وابقى قريب. ثانية تأخير منك = هدف عليك.","الـ 2v2 يعتمد على الـ first touch. اللي يلمس الكرة أول يتحكم باللعبة. درب الـ kickoff إلى أن يصبح عندك ثابت. و لا تنسى الـ demo — في 2v2 الديمو يفتح مساحات هائلة.","إذا خسرت المباراة، شوف كم مرة لعبت وانت ورا زميلك (double committing). هذي أكبر غلطة في 2v2. اقرأ تحركات زميلك."]},
    {id:"3v3",name:"3v3",topics:["3v3","three","threes","ثلاثي","standard"],responses:["الـ 3v3 لعبة سرعة و تنظيم. النظام اللي أتبعه: لاعب ١ يضغط (first man)، لاعب ٢ يساند (second man)، لاعب ٣ دفاع بعيد (third man). كل واحد له دور واضح.","الغلطة الأكثر شيوعاً في 3v3: كل اللاعبين يهجمون. لا! إذا تقدمتم كلهم، أي كرة طايرة من الخصم = هدف. لاعب واحد يهجم، الثاني مساند على بعد ١٠ متر، الثالث دفاع.","في الـ kickoff، الـ cheat up (يميل شوي قدام) استراتيجية قوية. بس إذا سويتها و الخصم سوا quick aerial — بتستقبل هدف. اقرأ أسلوب الخصم و قرر.","الفرق المحترفة تتكلم باستمرار. الكل يعلن: \"أنا هاجم\", \"أنا رجعت\", \"دق علي\". إذا ما عندك مايك، استخدم quick chats. التواصل أهم من الميكانيك."]},
    {id:"1v1",name:"1v1",topics:["1v1","one","ones","فردي","duel"],responses:["الـ 1v1 أصعب وضع — كل غلطتك تنشاف ولا في زميل يعوضك. النصيحة الأولى: shadow defense. ارجع مع الكورنر و إقرأ الخصم بدل ما تنقض.","في 1v1، البوست أثمن شيء. لا تهدر boost في هجمات فاشلة. إذا حسيت اللعبة صعبة، ارجع لعب defensive و استغل أخطاء الخصم. الصبر يربح 1v1.","الـ kickoff في 1v1 يحدد المباراة. تدرب على speed flip kickoff و الـ delayed kickoff. إذا فزت بالـ kickoff, عندك فرصة تسجل هدف مباشر.","نصيحة مهمة: لا تروح للـ challenge إذا مو متأكد. أعطي الخصم مساحة، يغلط و تخطف الكورة. في 1v1، اللي يغلط أقل هو الفائز."]},
    {id:"defense",name:"دفاع",topics:["ديفينس","دفاع","تصدي","save","مرمى","حارس","حراسة"],responses:["الدفاع يبدأ قبل لا توصل الكرة. التمركز الصحيح يقلل التصدي الصعب. اقعد على back post و خلي الكرة قدامك — لا تكون جنب المرمى.","في التصدي، استخدم الـ jump اقل ما يمكن. إذا تقدر تلمسها وانت على الأرض — أفضل. القفز يخليك خارج اللعبه ثانيتين كاملة.","الـ shadow defense هو أقوى مهارة دفاعية. تقدم مع الكورة بنفس اتجاهها، و اقرأ متى راح يسوي الخصم تسديده. هنا تتصدى.","لا تنسى: التصدي مو بس إبعاد الكرة — التصدي المثالي يوجه الكرة لزميلك عشان تبدأ هجمة مرتدة. شوف وين زميلك قبل ما تلمس الكورة.","من أعظم النصائح من RLCS: شوف الخصم مو الكرة. عيونه و جسمه يخبرك وين بيوجه الكورة قبل لا يلمسها."]},
    {id:"offense",name:"هجوم",topics:["هجوم","هجمة","تسديد","تسديدة","shot","تسجيل","هدف","scoring"],responses:["في الهجوم، التنوع هو السلاح. إذا تسدد نفس النوع كل مرة — الخصم بيقرأك. غير بين: ground shot, air dribble, flick, pass.","أفضل لحظة تسديد: الخصم قاعد يعمل rotate. إذا شفت اثنين من الفريق الخصم في نفس الزاوية — سدد فوراً. المرمى فاضي.","الـ passing play أقوى من الـ solo play. ارفع الكورة للوسط بدل ما تسدد من الزاوية. زميلك عنده فرصة أفضل منك.","في 3v3، الـ back pass يفك الضغط. إذا انحصيت، مرر الكوره لدفاع. يعطيكم فرصة إعادة تنظيم بدل ما تخسر الكورة في نصف ملعبكم."]},
    {id:"improvement",name:"تطوير",topics:["كيف اتدرب","كيف اطور","كيف اتعلم","كيف احسن","اتدرب","تطور","تتحسن","اتعلم","تحسن","طور","اتطور","مستواي","ضعيف","غلطاتي","اخطائي","مشكلتي","rank","رنك","رتبة","رتبتي"],responses:["التطور في روكيت ليق يحتاج شيئين: تكرار واعي و تحليل. العب أقل، حلل أكثر. خذ ١٠ دقائق تشوف ريبلاي نفسك قبل كل جلسة لعب.","أفضل طريقة تتحسن: free play يومياً ١٥ دقيقة قبل ما تبدأ Ranked. ركز على: التحكم بالكرة، السرعة، الـ recoveries. هذي مهارات أساسية.","لا تهتم بالرنك. ركز على مهارة وحدة كل أسبوع. هالاسبوع: wavedashes. الأسبوع الجاي: fast aerials. شهر واحد و بتشوف فرق.","تحليل الريبلاي هو سر المحترفين. شوف كل هدف دخل عليك من منظور ثالث. اسأل نفسك: وين كان المفروض أكون؟","نصيحة من تجربتي: كل ما زاد ضغط المباراة، زادت أخطائك. تدرب على الـ breathing. خذ نفس عميق قبل كل kickoff. اللعبة لعبة mental بنفس ما هي physical.","اللي يمنعك ترتفع مو مهارتك — وعيك بأخطائك. كل رتبة لها مشكلة. plat: تلعب بسرعة بدون تفكير. diamond: تطفش من الدفاع. champ: قرارات سيئة تحت الضغط. حدد رتبتك واشتغل على نقطة الضعف.","أفضل طريقة تتحسن: خذ مهارة واحدة كل أسبوع. الأسبوع الأول: recoveries. الثاني: first touch. الثالث: دقة التسديد. الرابع: shadow defense. كل يوم ١٥ دقيقة قبل الرانكد."]},
    {id:"mental",name:"نفسي",topics:["mental","عقلي","نفسي","غضب","ضغط","tilt","toxic","toxicity","nerves","قلق","انفعال"],responses:["الـ mentality أساسي. إذا خسرت مباراتين ورا بعض — اترك اللعبة. امشي ٥ دقايق، اشرب موية، و ارجع. الـ tilt يخليك تسوء أكثر.","لا ترد على toxic players. كتم الكل و العب لعبتك. الـ chat ما يجيبلك رنك. ركز على اللي تقدر تتحكم فيه: قراراتك و تحركاتك.","في الـ RLCS، الفرق اللي تفوز هي اللي تهدأ تحت الضغط. إذا راح عليك هدف اول — خذ نفس و ابدا من جديد. المباراة ما انتهت.","الـ confidence يأتي من التحضير. إذا تدربت زين قبل المباراة، بتلعب زين. الثقة مو كبرياء — ثقة إنك سويت الـ preparation."]},
    {id:"teamplay",name:"جماعي",topics:["سكريم","scrim","فريق","team","جماعي","فريقي","teamplay"],responses:["السكريمات تختلف عن ranked. هنا تحتاج استراتيجية: سو play مكتوب (pre-planned). مثلاً كيك اوف معين يتبعه play معين.","أهم شي في اللعب الجماعي: التواصل. يكون في قائد يعطي تعليمات واضحة. مش \"هجم\" — \"أنا أول، ارجع\". الوضوح يمنع الـ double commit.","في السكريم، جرب تشكيلات مختلفة. كل لاعب له دور: مهاجم، وسط، مدافع. مع الوقت بتعرفون وين كل واحد يبدع.","حللوا سوا بعد كل مباراة. ٥ دقايق نقاش: وش ضبط؟ وش لا؟ بدون لوم. التحليل الجماعي يرفع مستوى الفريق كامل."]},
    {id:"demos",name:"ديمو",topics:["ديمو","demo","demolish","تدمير","اشتباك","bump"],responses:["الديمو مو حرام — استراتيجيه! استخدمه عشان تفتح مساحة. في 3v3، ديمو المدافع يفتح المرمى بشكل مو طبيعي.","أفضل وقت للديمو: الخصم واقف يتفرج على الكورة (ball chasing). ديمو و كوره في المرمى. بس لا تجري ورا ديمو و تترك منطقتك.","في 2v2، الـ bump و الـ demo يغيرون المباراة. إذا سويت ديمو لأحد اللاعبين، عندكم ٢ ضد ١ لمدة ٣ ثواني — استغلوها.","نصيحة: لا تركز على الديمو كثير. طبيعي يصير لك ديمو — سو recover سريع و ارجع. الديمو مو نهاية العالم."]},
    {id:"wallplay",name:"حائط",topics:["حائط","wall","ارتداد","كيرف","curve","hook","بانج","bank","كورنر","corner"],responses:["الـ wall play من أهم المهارات. أول شي: تعلم تتحكم بالكرة على الحائط في free play. ارمي الكوره على الحائط، اطير وراها، و حولها لمرمى.","في الدفاع، استخدم الحائط عشان تطلع الكوره من منطقة الخطر. لا تحاول تلمسها وهي في الهواء — خلها ترتد و اقطعها.","الـ hook shot إذا ضبطت معك — راح تسجل اهداف كثيره. تمركز جنب الكوره شوي، و استخدم الـ powerslide عشان تغير اتجاهك بسرعه.","استغل الـ corner. ارفع الكوره عالي بدل ما تسدد من الزاوية. الكوره العالية تعطي زميلك وقت يتقدم و يسجل."]},
    {id:"kickoff",name:"كيك أوف",topics:["كيك","kickoff","بداية","انطلاق","faceoff"],responses:["الكيك أوف يحدد وتيرة المباراة. تعلم speed flip kickoff عشان توصل الكوره قبل الخصم. فرّق كبير بين لاعبين متساويين.","في 2v2 و 3v3، قرر مع زميلك مين يروح للكورة و مين يساند. لا تروحون كلهم — double commit في الكيك أوف كارثة.","نوع كيك أوف: fast, delayed, fake. الـ fake kickoff خطير — لازم تتأكد إن زميلك عارف وش بتسوي. تنسيق غلط = هدف.","نصيحة RLCS: غير نوع الكيك أوف كل شوي. إذا دايم تسوي نفس الحركة — الخصم بيقرأك و يستغلها."]},
    {id:"pro",name:"احتراف",topics:["ساس","sauce","ستايل","style","فلير","fancy","احتراف","pro","rlcs","بطولة","محترف","worlds","zen","vatira","monkey","beastmode","firstkiller"],responses:["لا تحاول تلعب استايل pro من اول يوم. المحترفين يلعبون ببساطة — حركاتهم الأساسية قوية ومتقنة. أتقن الأساسيات الأول.","كل واحد من المحترفين له ستايل مختلف — شاهد فيديوهاتهم و حلل ليش قراراتهم صحيحة. مو بس الحركات الحلوة.","أقوى حركة في الـ RLCS؟ الجواب: اتخاذ القرار السريع. المحترف يقرر في أجزاء من الثانية. هذا ييجي من الخبرة و التكرار.","ما يصير محترف بين ليلة و ضحاها. كل الـ pros لعبوا آلاف الساعات. استمتع بالرحلة و ركز على التطور — الرنك بييجي."]},
    {id:"training_packs",name:"كودات تدريب",topics:["كود","كودات","code","codes","pack","باك","تدريب","training","تريننق","تمرين","مابت","ماب","map","وركشوب","workshop","مهارات"],responses:["عندي لك مجموعة مابات تدريب شاملة:\n\n🎯 تسديد\n• Ground Shots: 6EB1-79B2-33B8-681C\n• Shooting Consistency: 6CF3-4C0B-32B4-1AC7\n• Powershot: 42BF-686D-E047-574B\n\n✈️ إيريال\n• Aerials: C7E0-9E0B-B739-A899\n• Air Roll Aerials: 30EF-9E98-C844-E83D\n• High Aerials: FA24-B2B7-2E8E-193B\n• Backboard Reads: 07E1-81BC-DD2E-BF8C\n\n🔄 فليك و دريبل\n• Flick Training: 5ED9-0EA3-323F-949F\n• Ground Dribble: 3B5F-89C2-84B4-CBC7\n• Bounce Dribble: 5B28-3395-F15A-01E3\n\n🥅 دفاع\n• Defensive Aerials: 2E23-ABD5-20C6-DBD4\n• Save Training: 5CBC-278C-3BBD-6473\n• Shadow Defense: 5CCE-FB29-7B05-A0B1\n\n🔥 متقدمة\n• Air Dribble: D74D-FB19-06F3-CC67\n• Flip Reset: 2186-5167-B7C8-C46F\n• Redirects: 8D93-C997-0ACD-8416\n• Ceiling Shots: AFC9-2CCC-95EC-D9D4\n• Wall Shots: 9F6D-4387-4C57-2E4B\n\n⚡ سرعة\n• Speed Flip: A503-264C-A7EB-D282\n• Kickoff: BFAA-45A5-7A56-73CC\n\n💡 Ultimate Warmup: 4969-3B77-4D8A-3A3C","المابتات حسب مستواك:\n\n**Plat / Diamond:**\n• Ground Shots: 6EB1-79B2-33B8-681C\n• Aerials: C7E0-9E0B-B739-A899\n• Saves: 5CBC-278C-3BBD-6473\n• Ultimate Warmup: 4969-3B77-4D8A-3A3C\n\n**Champ:**\n• Air Dribble: D74D-FB19-06F3-CC67\n• Redirects: 8D93-C997-0ACD-8416\n• Bounce Dribble: 5B28-3395-F15A-01E3\n• Speed Flip: A503-264C-A7EB-D282\n\n**GC / SSL:**\n• Flip Reset: 2186-5167-B7C8-C46F\n• Ceiling Shots: AFC9-2CCC-95EC-D9D4\n• Wall Shots: 9F6D-4387-4C57-2E4B\n\n📌 انسخ الكود وحطه في Custom Training > Enter Code","أفضل مابت تدريب بالنسبة لي:\n\n🏆 Ground Shots (Poquito): 6EB1-79B2-33B8-681C — أفضل مابت لدقة التسديد.\n🏆 Aerials (Poquito): C7E0-9E0B-B739-A899 — أساس الإيريال.\n🏆 Ultimate Warmup: 4969-3B77-4D8A-3A3C — تسخين شامل قبل الرانكد.\n🏆 Air Dribble (Aizr): D74D-FB19-06F3-CC67 — تحكم بالكرة في الجو.\n🏆 Flip Reset (Aizr): 2186-5167-B7C8-C46F — أصعب حركة في اللعبة.","روتيني اليومي عشان أطور:\n\n١- ١٠ دقايق Free Play — تحكم بالكرة.\n٢- ١٠ دقايق مابت تدريب — ركز على مهارة واحدة.\n٣- ١٠ دقايق 1v1 — ضغط حقيقي.\n\nهالروتين يرفع مستواك بسرعة."]},
    {id:"camera_settings",name:"إعدادات",topics:["كاميرا","camera","إعدادات","ضبط","setting","حساسية","sens","sensitivity","كنترول","تحكم","controller","deadzone","دزون"],responses:["الإعدادات شي شخصي. بس أقدر أعطيك إعداداتي اللي أوصلتني لـ RLCS:\n\n📷 Camera:\n• Distance: 270\n• Height: 90\n• Angle: -5\n• Stiffness: 0.45\n• Swivel Speed: 5.0\n• Transition Speed: 1.20\n\n🎮 Controller:\n• Steering Sens: 1.30\n• Aerial Sens: 1.30\n• Deadzone: 0.05\n• Dodge Deadzone: 0.60\n\nجربها وعدل عاللي يناسبك. أهم شي: لا تغير الإعدادات كل يوم."]},
    {id:"replay_analysis",name:"تحليل ريبلاي",topics:["ريبلاي","تحليل","نتايج","نتائج","replay"],responses:["حللنا الريبلاي حقك. الأرقام تتكلم. بس التحليل الحقيقي يكون لما تشوف الريبلاي بنفسك بنظرة ثالثة. ركز على:\n1️⃣ أول ٣ ثواني بعد ما تلمس الكورة — وين تروح؟\n2️⃣ الـ double commits — كم مرة لعبت وانت ورا زميلك؟\n3️⃣ كل هدف دخل عليك — وش كان المفروض تسوي بدال اللي سويت؟","لما تحلل ريبلاي نفسك، اسأل نفسك ٣ أسئلة:\n• هل كنت في المكان الصحيح للدفاع؟\n• هل استخدمت البوست بذكاء ولا أهدرته؟\n• هل تواصلت مع زملائك؟\n\nالأجوبة تكشف نقاط ضعفك."]}
];
function coachNorm(t){return t.toLowerCase().replace(/[إأآا]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ِ|ُ|َ|ٌ|ٍ|ً/ig,"");}
function coachWords(t){return coachNorm(t).split(/\s+/).filter(w=>w.length>=2);}
function parseImproveQuery(t){const n=coachNorm(t),m=n.match(/^(?:كيف|كيفيه|كيفية|وشلون)\s+(?:اتدرب|اتعلم|اطور|احسن)\s+(?:على|في)?\s*(.+)/);if(m){const tp=m[1].trim();if(tp.length>=2)return tp;}return null;}
function findBestCategory(input){const norm=coachNorm(input),words=coachWords(input);let best={entry:null,score:0,matches:[]};for(const entry of coachKnowledge){let score=0,matched=[];for(const topic of entry.topics){const t=coachNorm(topic);if(t.includes(" ")&&norm.includes(t)){score+=t.length*8;matched.push(topic);continue;}if(!t.includes(" ")&&words.includes(t)){score+=t.length*5;matched.push(topic);continue;}if(!t.includes(" ")&&norm.includes(t)){score+=t.length*1;matched.push(topic);continue;}}if(matched.length>=3)score+=15;else if(matched.length>=2)score+=6;if(score>best.score)best={entry,score,matches:matched};}return best;}
function analyzeInput(t){const n=coachNorm(t),w=coachWords(t);return{frustration:w.some(x=>["زعلان","متضايق","خسرت","تعبان","طفشت","ملل","ضيق","غاضب","غضبان","خسارة","مستاء","خايس","خايص","سيء","سئمت","عجزت","ماحب"].includes(x)),excitement:w.some(x=>["فزت","حلو","جميل","رائع","روعة","ممتاز","فخور","انتصار","ناس","جامد","نار","ناري","مبسوط","فرحت","استمتعت"].includes(x)),seekingOpinion:w.some(x=>["رأيك","تعتقد","تظن","تشوف","برأيك","وجهة نظر","قل","برأي"].includes(x)),aboutSelf:w.some(x=>["أنا","انا","عمري","عمري","قريت","شفت","سمعت","جربت","سويت","لعبت","صرلي","صار","قاعد","قاعد"].includes(x)),disagree:w.some(x=>["غلط","خطأ","لا","مو","مش","كذب","غباء","متفق","اتفق"].includes(x))};}
function conversationalFallback(t,a){if(a.frustration)return["أحسك متضايق شوي. صدقني كلنا نمر بهالمرحلة. الـ tilt يخليك تسوي قرارات غلط بدون ما تدري. خذ استراحة ١٠ دقايق، امشي، ارجع هادئ — بتلعب أفضل.","أتفهم شعورك. روكيت ليق لعبة صعبة لأن الأخطاء تبان قوي. بس تذكر: كل خسارة درس. شوف الريبلاي، وش اللي ضيع المباراة؟ ركز على شيء واحد واطوره.","الخسارة مو نهاية العالم. أنا خسرت مباريات كثيرة في الـ RLCS وتعلمت منها أكثر من اللي فزت فيها. اللي يميز المحترف إنه يتعلم من الخسارة مو إنه يتأثر."][Math.floor(Math.random()*3)];if(a.excitement)return["ايوا! كذا اللعب! الفرحة هذي هي سبب حبنا للعبة. بس تذكر: لا توقف على هالانتصار — استمر، حافظ على هالطاقة واستخدمها عشان تطور أكثر.","ممتاز! الفوز جميل لكن لا يخليك تغتر. حافظ على تواضعك و استمر تتعلم. الفرق بين لاعب كويس ولاعب محترف هو الاستمرارية.","هذا الكلام يسعدني! تأكد إنك تحتفل بانتصاراتك — حتى الصغيرة. كل هدف يتعلم منه، كل مباراة تطورك."][Math.floor(Math.random()*3)];if(a.aboutSelf)return["صراحة، كل لاعب عنده قصته. اللي مهم إنك تحافظ على شغفك. روكيت ليق لعبة تتعلمها يوم بعد يوم. أهم شيء: لا تقارن نفسك بالثانيين — ركز على تطورك أنت.","من كلامك أحسك لاعب شغوف. هذا أجمل شي. تذكر إن المهارات تاخذ وقت — حتى Zen ما صار Zen بين ليلة وضحاها. العب بذكاء مو بسرعة.","كل لاعب عنده نقاط قوة ونقاط ضعف. انت وش تشوف أقوى شيء فيك؟ ركز عليه وطوره — الباقي بيج مع الوقت."][Math.floor(Math.random()*3)];if(a.seekingOpinion)return["من وجهة نظري كلاعب RLCS سابق، الرأي الحقيقي يبان في أرض الملعب. أقدر أقولك إن المهارات الفردية مهمة بس التوافق مع الفريق هو اللي يربح البطولات. وش رأيك أنت؟","أنا أؤمن بشيء واحد: اللعبة ما توقف على حركة وحدة. فيه مليون طريقة تلعب. اللي يناسب غيرك مو دايم يناسبك. جرب، أخطأ، تعلم — هذي طريق التطور.","بكل صراحة: روكيت ليق مو لعبة ميكانيك بس — ٦٠٪ قرارات و٤٠٪ تنفيذ. إذا تعلمت تقرأ اللعبة صح، نص المشوار قطعته."][Math.floor(Math.random()*3)];if(a.disagree)return["ممكن عندك وجهة نظر مختلفة، وهذا شي جميل. النقاش يولد أفكار جديدة. أنا أتكلم من خبرتي، بس كل واحد له أسلوبه. جرب تشوف وش يناسبك، وإذا لقيت شي أفضل — علمني.","الصراحة أحترم إنك ما تتفق. اللعبة فيها أكثر من طريقة. أنا أعطيك نصائح من تجربتي، لكن في النهاية اللي يقرر هو أسلوبك. جرب وقرر بنفسك."][Math.floor(Math.random()*2)];return["والله كلامك ذكرني بأيام الـ RLCS. أفتقد أجواء البطولات — الضغط، الجمهور، التنافس. روكيت ليق مو مجرد لعبة، أسلوب حياة. وش أكثر شيء تحبه فيها؟","أحياناً أفضل شي تسويه هو توقف و تفكر: ليش أنا لاعب هاللعبة؟ إذا كان الجواب لأني أستمتع — فأنت في الطريق الصحيح. الاستمتاع يخليك تتطور بدون ما تحس.","صدقني، أكثر لحظاتي إلهامًا في روكيت ليق كانت وأنا في free play. مش ضروري دايماً تكون في مباراة — خذ وقتك مع الكورة، جرب حركات جديدة، اطلع من منطقة الراحة.","فيه مقولة belovedة في المجتمع: 'حط الكورة في المرمى'. مبسّطة، بس فيها كل شي. لا تعقد الأمور — ركز على الأساسيات و الباقي بيجي.","أعظم لاعبين روكيت ليق ما أوصلوا بالميكانيك فقط — وصلوا لأنهم يفكرون أسرع من خصومهم. الخطوة الجاية: ارفع سرعة تفكيرك. شوف الكورة، اقرأ اللعبة، تحرك.","أقوى نصيحة أقدر أعطيها لأي لاعب: لا تخاف تخطئ. كل خطأ تتعلم منه يرفع مستواك. المشكلة الوحيدة هي إنك تكرر نفس الخطأ بدون ما تاخذ العبرة.","عندي قناعة: كل مباراة خسرتها في الـ RLCS علمتني أكثر من أي مباراة فزت فيها. الخسارة تظهر نقاط ضعفك، والفوز يخبيها. حلل خسائرك — بتتطور بسرعة.","مافي شي اسمه 'موهبة فطرية' في روكيت ليق. كل المحترفين تدربوا آلاف الساعات. الفرق بينك وبينهم: ساعات التدريب الواعي. العب بهدف، ليس عشان تخلص المباراة.","خلني أقولك سر: السرعة مو دايماً الحل. أبطأ شوي، فكر، و نفذ بدقة. لاعب بطيء وذكي يغلب لاعب سريع وغبي ٩ مرات من ١٠.","تخيل إن كل مباراة رانكد هي تمرين. ما فيها شي تخسره إلا نقاط — و النقاط ترجع. لكن الخبرة و المهارة اللي تاخذها من المباراة تبقى معك للأبد.","الـ Rocket League زي الشطرنج بالسرعة. لازم تفكر بخطوتين قدام. وين بتروح الكورة؟ وين راح يكون الخصم؟ وين زميلك؟ هذي الأسئلة هي اللي تفرق."][Math.floor(Math.random()*11)];}
function getCoachResponse(t){const text=t.trim();if(!text)return"";const a=analyzeInput(text),ip=parseImproveQuery(text);if(ip){const r=findBestCategory(ip);if(r.entry&&r.score>0)return r.entry.responses[Math.floor(Math.random()*r.entry.responses.length)];}const r=findBestCategory(text);if(r.entry&&r.score>0)return r.entry.responses[Math.floor(Math.random()*r.entry.responses.length)];const gn=coachNorm(text),gw=coachWords(text);if(gw.length<=3&&["هلا","هلو","مرحبا","هاي","hi","hello","hey","سلام","اهلين","السلام عليكم","مساء","صباح"].some(g=>coachNorm(g)===gn||gn.startsWith(coachNorm(g))))return"وعليكم السلام! أنا جاهز لأي سؤال — روتنيشن، ميكانيك، بوست، تدريب، أو تحليل. وش عندك؟";if(gw.length<=3&&["شكرا","يسلمو","تسلم","thx","thanks","thank","يعطيك","ما قصرت"].some(t=>coachNorm(t)===gn||gn.startsWith(coachNorm(t))))return["العفو! إذا احتجت شي ثاني أنا موجود. شد حيلك و بتوصل GC قريباً","الله يسلمك! تذكّر: التطور يحتاج صبر. كل مباراة درس جديد","على الرحب والسعة! لا تنسى تسوي تحليل ريبلاي لنفسك كل اسبوع"][Math.floor(Math.random()*3)];if(gw.length<=2&&["نعم","اي","ايه","yes","yeah","يب","ok","اوكي","تم","طيب"].some(a=>coachNorm(a)===gn||gn.startsWith(coachNorm(a))))return["تمام! جرب الكلام اللي قلته لك و ارجع لي بخبر","كويس! عندك سؤال ثاني؟","حلو. خلني أضيف: أهم شي الاستمرارية. كل يوم شوي — مو مرة في الأسبوع كثير"][Math.floor(Math.random()*3)];return conversationalFallback(text,a);}
const ct=document.getElementById("coach-toggle"),cp=document.getElementById("coach-panel"),cc=document.getElementById("coach-close"),cm=document.getElementById("coach-messages"),ci=document.getElementById("coach-input"),cs=document.getElementById("coach-send");let cOpen=false;ct.addEventListener("click",()=>{cOpen=!cOpen;cp.classList.toggle("hidden",!cOpen);if(cOpen)ci.focus();});cc.addEventListener("click",()=>{cOpen=false;cp.classList.add("hidden");});
function addCoachMsg(t,s){const d=document.createElement("div");d.className="coach-msg coach-msg-"+s;d.innerHTML='<div class="coach-msg-avatar">'+(s==="bot"?"🏆":"👤")+'</div><div class="coach-msg-content">'+t.replace(/\n/g,"<br>")+"</div>";cm.appendChild(d);cm.scrollTop=cm.scrollHeight;}
function showCoachTyping(){const d=document.createElement("div");d.className="coach-msg coach-msg-bot";d.id="coach-typing";d.innerHTML='<div class="coach-msg-avatar">🏆</div><div class="coach-msg-content coach-typing"><span></span><span></span><span></span></div>';cm.appendChild(d);cm.scrollTop=cm.scrollHeight;}
function removeCoachTyping(){const e=document.getElementById("coach-typing");if(e)e.remove();}
function handleCoachSend(){const t=ci.value.trim();if(!t)return;addCoachMsg(t,"user");ci.value="";showCoachTyping();const d=300+Math.random()*1000;setTimeout(()=>{removeCoachTyping();addCoachMsg(getCoachResponse(t),"bot");},d);}
cs.addEventListener("click",handleCoachSend);ci.addEventListener("keydown",function(e){if(e.key==="Enter")handleCoachSend();});

// ═══ STEAM LOGIN ═════════════════════════
function steamLogin(){fetch("/api/auth/steam").then(r=>r.json()).then(d=>{if(d.url){const w=window.open(d.url,"steam-login","width=600,height=700");const t=setInterval(()=>{if(w.closed){clearInterval(t);checkAuth();}},500);}}).catch(()=>alert("تعذر الاتصال بالخادم"));}

// ═══ EPIC GAMES LOGIN ═══════════════════
function epicLogin(){fetch("/api/auth/epic").then(r=>r.json()).then(d=>{if(d.url){const w=window.open(d.url,"epic-login","width=500,height=550");const t=setInterval(()=>{if(w.closed){clearInterval(t);checkAuth();}},500);}}).catch(()=>alert("تعذر الاتصال بالخادم"));}
window.addEventListener("message",function(e){if(e.data==="steam-login-success"||e.data==="epic-login-success")checkAuth();});

// ═══ PROFILE ═══════════════════════════════
function showProfile(){
    const m=document.getElementById("profile-modal"),c=document.getElementById("profile-content");m.classList.remove("hidden");c.innerHTML="<p style='color:#8892b0;'>جاري تحميل الملف الشخصي...</p>";
    fetch("/api/user/profile").then(r=>r.json()).then(d=>{
        if(d.error){c.innerHTML=`<p style='color:#ff1744;'>${d.error}</p>`;return;}
        const u=d.user||{},s=d.stats||{},recent=d.recent||[],ttl=s.total_replays||0,tag=u.tagged_name||u.display_name||u.username||"مستخدم";
        const xpPct=Math.min(100,Math.round(((ttl%10)/10)*100));
        let html=`
<div class="profile-header">
    <div class="profile-banner" style="background:${ttl>=100?'linear-gradient(135deg,#b388ff,#7c4dff,#651fff)':ttl>=50?'linear-gradient(135deg,#ef5350,#d32f2f,#b71c1c)':ttl>=30?'linear-gradient(135deg,#ce93d8,#8e24aa,#6a1b9a)':ttl>=20?'linear-gradient(135deg,#64b5f6,#1e88e5,#1565c0)':ttl>=10?'linear-gradient(135deg,#80cbc4,#26a69a,#00897b)':ttl>=5?'linear-gradient(135deg,#ffd54f,#ffb300,#ff8f00)':ttl>=2?'linear-gradient(135deg,#bdbdbd,#9e9e9e,#757575)':'linear-gradient(135deg,#8d6e63,#6d4c41,#4e342e)'}"></div>
    <div class="profile-main">
        <div class="profile-avatar-wrapper">
            <div class="profile-avatar">${tag.charAt(0).toUpperCase()}</div>
            <div class="rank-badge">${ttl>=100?"SSL":ttl>=50?"GC":ttl>=30?"Champ":ttl>=20?"Diamond":ttl>=10?"Plat":ttl>=5?"Gold":ttl>=2?"Silver":"Bronze"}</div>
        </div>
        <div class="profile-info">
            <h2>${tag}</h2>
            <p class="profile-sub">${u.username||""}</p>
            <div class="profile-level">
                <span>Level ${Math.floor(ttl/5)+1}</span>
                <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
                <small>${ttl%10} / 10 XP</small>
            </div>
        </div>
    </div>
</div>`;
        // Stats cards
        if(ttl>0)html+=`
<div class="profile-stats-grid">
    <div class="profile-stat"><span class="profile-stat-value">${ttl}</span><span class="profile-stat-label">إجمالي الريبلايات</span></div>
    <div class="profile-stat"><span class="profile-stat-value">${s.total_goals||0}</span><span class="profile-stat-label">الأهداف</span></div>
    <div class="profile-stat"><span class="profile-stat-value">${s.total_assists||0}</span><span class="profile-stat-label">التمريرات</span></div>
    <div class="profile-stat"><span class="profile-stat-value">${s.total_saves||0}</span><span class="profile-stat-label">التصديات</span></div>
    <div class="profile-stat"><span class="profile-stat-value">${Math.round(s.avg_shooting_pct||0)}%</span><span class="profile-stat-label">دقة التسديد</span></div>
    <div class="profile-stat"><span class="profile-stat-value">${Math.round(s.avg_boost||0)}</span><span class="profile-stat-label">معدل البوست</span></div>
</div>`;
        else html+=`<p style="color:#8892b0;margin:20px 0;text-align:center;">ما عندك ريبلايات مسجلة لحسابك. ارفع ريبلاي واختر اسمك عشان تبدأ.</p>`;
        // Match history
        if(recent.length>0){html+=`<h4 style="color:#fff;margin:20px 0 10px;">🕐 آخر الريبلايات</h4><div class="table-wrap" style="max-height:250px;overflow-y:auto;"><table class="history-table"><thead><tr><th>#</th><th>اللاعب</th><th>الطور</th><th>أ/ت/تص</th><th>سكور</th><th>التاريخ</th><th></th></tr></thead><tbody>`;recent.forEach((g,i)=>{html+=`<tr><td>#${recent.length-i}</td><td>${g.player_name||"-"}</td><td>${g.game_mode||"-"}</td><td>${g.goals||0}/${g.assists||0}/${g.saves||0}</td><td>${g.score||0}</td><td style="font-size:12px;color:#5a6a8a">${g.uploaded_at?g.uploaded_at.slice(0,10):"-"}</td><td>${g.replay_id?`<a href="/api/replay/${g.replay_id}/download" class="btn btn-sm" style="padding:2px 8px;font-size:11px;text-decoration:none;">⬇</a>`:""}</td></tr>`;});html+=`</tbody></table></div>`;}
        // Link player name
        html+=`<hr style="border-color:rgba(255,255,255,0.05);margin:20px 0;"><div class="profile-settings-section"><h4 style="color:#fff;margin-bottom:15px;">ربط اسمك في الريبلاي</h4><p style="color:#8892b0;font-size:13px;margin-bottom:10px;">اكتب اسمك عشان الريبلايات الجديدة ترتبط بحسابك تلقائياً:</p><div style="display:flex;gap:10px;"><input type="text" id="player-name-setting" placeholder="اسمك في روكيت ليق" style="flex:1;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#fff;font-family:'Tajawal',sans-serif;font-size:14px;direction:rtl;"><button class="btn" onclick="savePlayerName()">حفظ</button></div></div>`;
        c.innerHTML=html;if(u.display_name)document.getElementById("player-name-setting").value=u.display_name;
    }).catch(()=>{c.innerHTML="<p style='color:#ff1744;'>تعذر تحميل الملف الشخصي</p>";});
}
function closeProfile(){document.getElementById("profile-modal").classList.add("hidden");}
function showEditProfile(){
    const m=document.getElementById("edit-profile-modal");
    m.classList.remove("hidden");
    fetch("/api/user/profile").then(r=>r.json()).then(d=>{
        if(d.error) return;
        const u=d.user||{};
        document.getElementById("edit-name").value=u.display_name||"";
        document.getElementById("edit-country").value=u.country||"";
        document.getElementById("edit-platform").value=u.primary_platform||"";
        document.getElementById("edit-bio").value=u.bio||"";
    }).catch(()=>{});
}
function closeEditProfile(){document.getElementById("edit-profile-modal").classList.add("hidden");}
function saveEditProfile(){
    const data={
        display_name: document.getElementById("edit-name").value.trim(),
        country: document.getElementById("edit-country").value.trim(),
        primary_platform: document.getElementById("edit-platform").value,
        bio: document.getElementById("edit-bio").value.trim(),
    };
    fetch("/api/user/update-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{
        if(d.success){alert("✅ تم الحفظ");closeEditProfile();checkAuth();}
        else alert(d.error||"خطأ");
    }).catch(()=>alert("فشل الحفظ"));
}
function savePlayerName(){const n=document.getElementById("player-name-setting").value.trim();if(!n){alert("اكتب اسمك أول");return;}fetch("/api/user/update-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({display_name:n})}).then(r=>r.json()).then(d=>{if(d.success){alert("✅ تم الحفظ");checkAuth();}else alert(d.error||"خطأ");}).catch(()=>alert("فشل الحفظ"));}

// ═══ SETTINGS ══════════════════════════════
function showSettings(){const m=document.getElementById("settings-modal"),c=document.getElementById("settings-content");m.classList.remove("hidden");c.innerHTML="<p style='color:#8892b0;'>جاري التحميل...</p>";fetch("/api/user/settings").then(r=>r.json()).then(d=>{const s=d.settings||{};c.innerHTML=`<div class="settings-group"><label class="settings-label">نمط اللعب المفضل</label><select id="settings-preferred-mode" class="settings-select"><option value="1v1" ${s.preferred_mode==="1v1"?"selected":""}>1v1</option><option value="2v2" ${s.preferred_mode==="2v2"?"selected":""}>2v2</option><option value="3v3" ${s.preferred_mode==="3v3"?"selected":""}>3v3</option><option value="scrim" ${s.preferred_mode==="scrim"?"selected":""}>Scrim</option></select></div><div class="settings-group"><label class="settings-label">البيو (عن نفسك)</label><textarea id="settings-bio" class="settings-textarea" placeholder="اكتب شي عن نفسك..." rows="3">${d.bio||""}</textarea></div><div class="settings-group"><label class="settings-toggle"><input type="checkbox" id="settings-auto-link" ${s.auto_link_player?"checked":""}><span class="toggle-slider"></span><span>ربط اسم اللاعب تلقائياً بعد الرفع</span></label></div><div class="settings-group"><label class="settings-toggle"><input type="checkbox" id="settings-team-analysis" ${s.show_team_analysis!==0?"checked":""}><span class="toggle-slider"></span><span>عرض تحليل الفريق</span></label></div><button class="btn" style="width:100%;margin-top:20px;" onclick="saveSettings()">💾 حفظ الإعدادات</button>`;}).catch(()=>{c.innerHTML="<p style='color:#ff1744;'>تعذر تحميل الإعدادات</p>";});}
function closeSettings(){document.getElementById("settings-modal").classList.add("hidden");}
function saveSettings(){const s={preferred_mode:document.getElementById("settings-preferred-mode").value,auto_link_player:document.getElementById("settings-auto-link").checked?1:0,show_team_analysis:document.getElementById("settings-team-analysis").checked?1:0};const bio=document.getElementById("settings-bio")?document.getElementById("settings-bio").value.trim():"";fetch("/api/user/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)}).then(r=>r.json()).then(d=>{if(d.success){if(bio) fetch("/api/user/update-profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bio})}).catch(()=>{});alert("✅ تم حفظ الإعدادات");closeSettings();}else alert(d.error||"خطأ");}).catch(()=>alert("فشل الحفظ"));}

// ═══ PLAYER NAME PICKER ══════════════════
let pendingResults=null;
function showPlayerPicker(p){if(!p||!p.length)return;const s=document.getElementById("player-picker-select");s.innerHTML=p.map(x=>`<option value="${x.name}">${x.name}</option>`).join("");document.getElementById("player-picker-modal").classList.remove("hidden");}
function confirmPlayerPick(){const n=document.getElementById("player-picker-select").value;document.getElementById("player-picker-modal").classList.add("hidden");localStorage.setItem("rl_player_name",n);saveAsUserReplay(n);}
function skipPlayerPick(){document.getElementById("player-picker-modal").classList.add("hidden");saveAsUserReplay(null);}
function saveAsUserReplay(n){if(n) fetch("/api/user/link-player",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({player_name:n})}).catch(()=>{});showResults(pendingResults);pendingResults=null;}
handleFile=function(file){
    if(!file.name.toLowerCase().endsWith(".replay")){showError("الملف لازم يكون .replay");return;}
    if(!localStorage.getItem("rl_api_key")){showError("سوي حفظ لمفتاح API الأول");return;}
    const fd=new FormData();fd.append("file",file);fd.append("game_mode",gameMode);
    const savedName=localStorage.getItem("rl_player_name");
    if(savedName) fd.append("player_name",savedName);
    dropZone.classList.add("hidden");uploadStatus.classList.remove("hidden");
    fetch(API_URL,{method:"POST",body:fd}).then(r=>r.json()).then(data=>{
        uploadStatus.classList.add("hidden");dropZone.classList.remove("hidden");
        if(data.success){pendingResults=data;fetch("/api/me").then(r=>r.json()).then(u=>{if(u.user&&u.user_id&&data.players&&data.players.length)showPlayerPicker(data.players);else showResults(data);}).catch(()=>showResults(data));}
        else showError(data.error||"خطأ غير معروف");
    }).catch(()=>{uploadStatus.classList.add("hidden");dropZone.classList.remove("hidden");showError("تعذر الاتصال. شغل الباك اند.");});
};



// ── RADAR CHART ─────────────────────────
function renderRadarChart(data, canvasId){
    const canvas=document.getElementById(canvasId||"radar-canvas");
    const rect=canvas.parentElement.getBoundingClientRect();
    const size=Math.min(rect.width||400,400);
    canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext("2d");
    const W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,R=Math.min(W,H)*0.32;
    const labels=["Positioning","Rotation","Boost Usage","Accuracy","Speed"];
    const angles=labels.map((_,i)=>-Math.PI/2+2*Math.PI*i/labels.length);
    const values=labels.map(l=>Math.min(100,Math.max(0,data[l]||0)));

    ctx.clearRect(0,0,W,H);

    // Grid rings
    for(let ring=1;ring<=5;ring++){
        const r=R*ring/5;
        ctx.beginPath();
        for(let i=0;i<labels.length;i++){
            const x=cx+r*Math.cos(angles[i]),y=cy+r*Math.sin(angles[i]);
            i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.strokeStyle="rgba(255,255,255,0.08)";
        ctx.lineWidth=1;
        ctx.stroke();
    }

    // Axes
    for(let i=0;i<labels.length;i++){
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+R*Math.cos(angles[i]),cy+R*Math.sin(angles[i]));
        ctx.strokeStyle="rgba(255,255,255,0.12)";
        ctx.stroke();
    }

    // Labels (inside the chart using R/lo so top label doesn't clip)
    const lo=R*0.22;
    ctx.font="12px Tajawal,sans-serif";
    for(let i=0;i<labels.length;i++){
        const x=cx+(R+lo)*Math.cos(angles[i]),y=cy+(R+lo)*Math.sin(angles[i]);
        const val=values[i];
        ctx.fillStyle="#ccd6f6";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText(labels[i],x,y-10);
        const scoreColor=val>=70?"#00c853":val>=40?"#ffab00":"#ff1744";
        ctx.fillStyle=scoreColor;
        ctx.font="bold 14px Tajawal,sans-serif";
        ctx.fillText(val,x,y+12);
        ctx.font="12px Tajawal,sans-serif";
    }

    // Data polygon
    ctx.beginPath();
    for(let i=0;i<labels.length;i++){
        const v=values[i]/100,r=R*v;
        const x=cx+r*Math.cos(angles[i]),y=cy+r*Math.sin(angles[i]);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.fillStyle="rgba(91,140,255,0.2)";
    ctx.fill();
    ctx.strokeStyle="#5b8cff";
    ctx.lineWidth=2.5;
    ctx.stroke();

    // Dots
    for(let i=0;i<labels.length;i++){
        const v=values[i]/100,r=R*v;
        const x=cx+r*Math.cos(angles[i]),y=cy+r*Math.sin(angles[i]);
        ctx.beginPath();
        ctx.arc(x,y,5,0,2*Math.PI);
        ctx.fillStyle="#5b8cff";
        ctx.fill();
        ctx.strokeStyle="#fff";
        ctx.lineWidth=1.5;
        ctx.stroke();
    }
}