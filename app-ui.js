/* ===== app-ui.js — ZenPrep AI UI Layer ===== */
/* Rendering, Event Handlers, Initialization */

/* ===== LOGO SVG ===== */
function logoSvg(size){
  const w=size||80;
  return`<svg width="${w}" height="${w}" viewBox="0 0 320 320" aria-hidden="true"><defs><linearGradient id="zG1" x1="40" y1="40" x2="250" y2="250" gradientUnits="userSpaceOnUse"><stop stop-color="#62efff"/><stop offset=".52" stop-color="#387dff"/><stop offset="1" stop-color="#8d3bff"/></linearGradient><linearGradient id="zG2" x1="180" y1="42" x2="270" y2="250" gradientUnits="userSpaceOnUse"><stop stop-color="#50dbff"/><stop offset="1" stop-color="#ac32ff"/></linearGradient></defs><path d="M36 82H191L170 118H107H223L82 262H229L249 225H145L249 82H99L36 82Z" fill="url(#zG1)"/><path d="M191 78L268 218L230 279L143 125L191 78Z" fill="url(#zG2)"/><path d="M223 53H242V71H223Z" fill="#6ff2ff"/><path d="M251 69H264V82H251Z" fill="#8f78ff"/></svg>`;
}

function statusBadge(){
  if(S.api==="live")return`<div class="status live">${esc(S.last)} live</div>`;
  if(S.api==="ready")return`<div class="status">${esc(runtimeLabel(S.runtime))} ready</div>`;
  if(S.api==="bad")return`<div class="status bad">AI unavailable — local fallback</div>`;
  return`<div class="status warn">Local demo mode</div>`;
}

/* ===== AUTH SCREEN ===== */
function renderAuth(){
  return`<div class="auth-center"><div class="auth-card card">
    <div class="logo-wrap">${logoSvg(80)}</div>
    <h1>ZenPrep <span>AI</span></h1>
    <p>Enter your access credentials to begin exam preparation</p>
    ${S.authError?`<div class="auth-error">${esc(S.authError)}</div>`:""}
    <form id="authf" class="form">
      <input id="auth-code" class="field" placeholder="Access Code" value="${esc(S.access)}" autocomplete="off" required>
      <input id="auth-pass" class="field" type="password" placeholder="Password" autocomplete="off" required>
      <button class="btn pri" type="submit" ${S.authLoading?"disabled":""}>
        ${S.authLoading?'Verifying<span class="loading-dots"></span>':"Verify & Continue"}
      </button>
    </form>
    <p style="margin-top:16px;font-size:.82rem;text-align:center">Powered by <strong>ZAVAN GROUP</strong></p>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(126,191,255,0.1);text-align:center">
      <p style="font-size:.78rem;color:var(--muted);margin-bottom:8px">Student Portal</p>
      <button class="btn ghost" data-a="student-portal" style="font-size:.85rem">Continue as Student →</button>
    </div>
  </div></div>`;
}

/* ===== REGISTER SCREEN ===== */
function renderRegister(){
  return`<div class="auth-center"><div class="auth-card card" style="max-width:680px">
    <div class="logo-wrap">${logoSvg(60)}</div>
    <h1 style="font-size:1.6rem">Welcome${S.learnerName?`, ${esc(S.learnerName)}`:""}</h1>
    <p>Set up your profile and select your exam</p>
    <form id="regf" class="form" style="margin-top:20px">
      <input id="reg-name" class="field" placeholder="Your Full Name" value="${esc(S.learnerName)}" required>
      <div class="row" style="margin-top:16px;margin-bottom:8px">
        <h3>Select Up to 3 Exams</h3>
        <button type="button" class="btn ghost" data-a="clear-exams">Clear All</button>
      </div>
      ${EXAM_CATEGORIES.map(cat=>`<div class="exam-cat">
        <h4>${esc(cat.name)}</h4>
        <div class="examgrid">${cat.exams.map(ex=>{
          const isSel=S.selectedExams.includes(ex.id);
          return`<button type="button" class="exam-btn ${isSel?"sel":""}" data-a="pick-exam" data-v="${esc(ex.id)}">
            ${isSel?`<span class="sel-count">${S.selectedExams.indexOf(ex.id)+1}</span> `:""}${esc(ex.label)}${ex.lang==="ml"?'<span class="lang">മലയാളം</span>':""}
          </button>`;
        }).join("")}</div>
      </div>`).join("")}
      <div style="margin-top:8px">
        <p style="font-size:.85rem;margin-bottom:8px">Or type a custom exam name (adds to selection):</p>
        <div class="row">
          <input id="reg-exam-custom" class="field" placeholder="e.g. RRB NTPC, IBPS Clerk..." value="">
          <button type="button" class="btn" data-a="add-custom">Add</button>
        </div>
      </div>
      <div class="row" style="margin-top:16px">
        <button class="btn pri" type="submit" style="flex:1" ${S.selectedExams.length===0?"disabled":""}>
          Start Learning (${S.selectedExams.length}) →
        </button>
      </div>
    </form>
  </div></div>`;
}

/* ===== LOADING SCREEN ===== */
function renderLoad(){
  const p=S.exam?.preset;
  return`<section class="auth-center"><div class="wrap" style="max-width:600px">
    <div class="pane card">
      <div class="row"><div>
        <div class="ey">${p?"Preset Mode":"Adaptive Mode"}</div>
        <h2>Building ${esc(S.exam?.name||"")} mission control</h2>
        <p>${p?"Applying official-style rules for "+esc(p.label)+".":"Adaptive mapping in progress."}${isExamMalayalam(S.exam?.name)?" <strong>Malayalam medium</strong> enabled.":""}</p>
      </div><div class="pill">${S.load+1} / ${STEPS.length}</div></div>
      <div class="rail"><div class="fill" style="width:${((S.load+1)/STEPS.length)*100}%"></div></div>
      <div class="steps">${STEPS.map((s,i)=>`<div class="step ${i<S.load?"done":i===S.load?"on":""}">
        <strong>${esc(s)}</strong>
      </div>`).join("")}</div>
    </div>
  </div></section>`;
}

/* ===== DASHBOARD TABS ===== */
function renderOverview(){
  const o=S.ov||{};
  return`<section class="pane card">
    <div class="row"><div>
      <div class="ey">Overview${isExamMalayalam(S.exam?.name)?' · <span style="color:var(--gold)">മലയാളം</span>':"" }</div>
      <h2>${esc(o.examTitle||"")}</h2>
      <p>${esc(o.patternSummary||"")}</p>
    </div><div class="chips">
      <div class="pill">Difficulty · ${esc(o.difficulty||"")}</div>
      <button class="btn ghost" data-a="refresh-ov">${S.loadingOv?"Refreshing...":"Refresh With AI"}</button>
    </div></div>
    <div class="grid2"><div class="surface">
      <h3>Recommended strategy</h3>
      <ul class="list">${(o.strategy||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
    </div><div class="surface">
      <h3>Study time plan</h3>
      <div class="stack">${(o.timePlan||[]).map(x=>`<div class="surface"><strong>${esc(x[0])} · ${esc(x[1])}</strong><p>${esc(x[2])}</p></div>`).join("")}</div>
    </div></div>
    <div class="surface"><h3>Syllabus focus</h3>
      <div class="topics">
        <button class="topic ${S.topic==="All Topics"?"on":""}" data-a="topic" data-v="All Topics">All Topics</button>
        ${S.topics.map(t=>`<button class="topic ${S.topic===t?"on":""}" data-a="topic" data-v="${esc(t)}">${esc(t)}</button>`).join("")}
      </div>
    </div>
  </section>`;
}

function renderPractice(){
  const p=S.prog,b=curBatch();
  const mlClass=isExamMalayalam(S.exam?.name)?" ml-text":"";
  return`<section class="pane card">
    <div class="row"><div>
      <div class="ey">Practice</div><h2>Fresh MCQ drills on demand</h2>
      <p>Select topic and difficulty, then generate. Answers lock on click.</p>
    </div><div class="chips">
      <div class="pill">Topic · ${esc(S.topic)}</div>
      <div class="pill">Difficulty · ${esc(tc(S.diff))}</div>
      ${b?`<div class="pill">${b.src==="local"?"Local":"AI"} batch</div>`:""}
    </div></div>
    <div class="grid2"><div class="surface">
      <div class="row">
        <select class="sel" id="pt"><option>All Topics</option>${S.topics.map(t=>`<option ${S.topic===t?"selected":""}>${esc(t)}</option>`).join("")}</select>
        <select class="sel" id="pd"><option value="easy" ${S.diff==="easy"?"selected":""}>Easy</option><option value="medium" ${S.diff==="medium"?"selected":""}>Medium</option><option value="hard" ${S.diff==="hard"?"selected":""}>Hard</option></select>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn pri" data-a="gen-pr">${S.loadingPr?"Generating...":"Generate Questions"}</button>
        <button class="btn" data-a="next-pr">Next Set</button>
        <button class="btn ghost" data-a="regen-pr">Regenerate</button>
      </div>
    </div><div class="surface">
      <div class="grid5">
        <div class="stat"><span>Attempted</span><strong>${p.a}</strong></div>
        <div class="stat"><span>Correct</span><strong>${p.c}</strong></div>
        <div class="stat"><span>Wrong</span><strong>${p.w}</strong></div>
        <div class="stat"><span>Accuracy</span><strong>${p.acc}%</strong></div>
        <div class="stat"><span>Net</span><strong>${money(p.net)}</strong></div>
      </div>
    </div></div>
    <div class="qset">${S.loadingPr?`<div class="empty">Generating question set<span class="loading-dots"></span></div>`:b?b.qs.map((q,i)=>{const a=S.practice.ans[q.id];return`<div class="q">
      <div class="row"><div>
        <div class="ey">Question ${i+1}</div>
        <h3 class="${q.lang==="ml"?"ml-text":""}">${esc(q.q)}</h3>
      </div><div class="chips">
        <div class="pill">${esc(q.t)}</div><div class="pill">${esc(tc(q.d))}</div>
      </div></div>
      <div class="opts">${q.o.map((o,ix)=>{let c="opt"+(q.lang==="ml"?" ml-text":"");if(a){if(ix===q.a)c+=" ok";else if(ix===a.s)c+=" bad";}return`<button class="${c}" data-a="ans" data-id="${q.id}" data-v="${ix}" ${a?"disabled":""}>${esc(o)}</button>`;}).join("")}</div>
      ${a?`<div class="surface${q.lang==="ml"?" ml-text":""}"><strong>${a.ok?"✓ Correct":"✗ Not this one"}</strong><p>${esc(q.e)}</p><p><strong>Shortcut:</strong> ${esc(q.s)}</p></div>`:""}
    </div>`;}).join(""):`<div class="empty">No batch active yet. Click "Generate Questions" to start.</div>`}</div>
  </section>`;
}

function renderTeach(){
  return`<section class="pane card">
    <div><div class="ey">Teach Me</div><h2>Expandable topic teaching cards</h2>
    <p>Open any topic for summary, key points, shortcuts, and common mistakes.</p></div>
    <div class="stack" style="margin-top:16px">${S.topics.map(t=>{const open=!!S.teach.open[t],g=S.teach.cache[t]||guide(t);return`<div class="surface">
      <div class="row"><div><h3>${esc(t)}</h3></div>
      <button class="btn ${open?"pri":""}" data-a="teach" data-v="${esc(t)}">${open?"Collapse":"Teach Me"}</button></div>
      ${open?(S.loadingTeach===t?`<div class="empty">Loading<span class="loading-dots"></span></div>`:`<div class="stack">
        <p>${esc(g.summary)}</p>
        <div class="grid2"><div class="surface"><strong>Key points</strong><ul class="list">${g.key.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
        <div class="surface"><strong>Shortcuts</strong><ul class="list">${g.short.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div></div>
        <div class="surface"><strong>Worked example</strong><p>${esc(g.example)}</p></div>
        <div class="surface"><strong>Common mistakes</strong><ul class="list">${g.mist.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>`):""}
    </div>`;}).join("")}</div>
  </section>`;
}

function renderDoubt(){
  return`<section class="pane card">
    <div class="row"><div><div class="ey">Ask Doubt</div><h2>Exam-aware multi-turn help</h2></div>
    <div class="pill">Context · ${esc(S.topic)}</div></div>
    <div class="chat-grid"><div class="surface">
      <div class="msgs">${S.chat.map(m=>`<div class="msg ${m.r==="user"?"user":""}"><strong>${m.r==="user"?"You":"ZenPrep AI"}</strong>${md(m.t)}</div>`).join("")}
      ${S.sending?`<div class="empty">Thinking<span class="loading-dots"></span></div>`:""}</div>
      <form id="chatf" class="form" style="margin-top:14px">
        <textarea id="chatin" class="ta" placeholder="Ask a doubt, request a shortcut, or ask for explanation."></textarea>
        <button class="btn pri" type="submit">${S.sending?"Sending...":"Send Doubt"}</button>
      </form>
    </div><div class="surface">
      <h3>Quick prompts</h3>
      <div class="quick" style="flex-direction:column">
        <button class="chip" data-a="qp" data-v="Explain this like a beginner">Explain like a beginner</button>
        <button class="chip" data-a="qp" data-v="Give exam shortcut">Give exam shortcut</button>
        <button class="chip" data-a="qp" data-v="Ask me a follow-up">Ask me a follow-up</button>
        ${isExamMalayalam(S.exam?.name)?`<button class="chip" data-a="qp" data-v="Explain in Malayalam">മലയാളത്തിൽ വിശദീകരിക്കുക</button>`:""}
      </div>
    </div></div>
  </section>`;
}

function renderProgress(){
  const p=S.prog,bt=Object.entries(p.t),bd=Object.entries(p.d);
  return`<section class="pane card">
    <div><div class="ey">Progress</div><h2>Real-time performance tracking</h2></div>
    <div class="grid5" style="margin-top:16px">
      <div class="stat"><span>Attempted</span><strong>${p.a}</strong></div>
      <div class="stat"><span>Correct</span><strong>${p.c}</strong></div>
      <div class="stat"><span>Wrong</span><strong>${p.w}</strong></div>
      <div class="stat"><span>Net Score</span><strong>${money(p.net)}</strong></div>
      <div class="stat"><span>Best Streak</span><strong>${p.best}</strong></div>
    </div>
    <div class="grid2" style="margin-top:16px"><div class="surface">
      <h3>Topic-wise performance</h3>
      ${bt.length?`<div class="bars">${bt.map(([k,v])=>{const a=v.a?+((v.c/v.a)*100).toFixed(1):0;return`<div class="bar"><div class="row"><span>${esc(k)}</span><span>${a}%</span></div><i style="width:${Math.max(8,a)}%"></i></div>`;}).join("")}</div>`:`<div class="empty">No scored answers yet.</div>`}
    </div><div class="surface">
      <h3>Accuracy ring</h3>
      <div class="ring" style="--v:${p.acc}"><strong>${p.acc}%</strong></div>
      ${bd.length?`<div class="bars" style="margin-top:14px">${bd.map(([k,v])=>{const a=v.a?+((v.c/v.a)*100).toFixed(1):0;return`<div class="bar"><div class="row"><span>${esc(tc(k))}</span><span>${a}%</span></div><i style="width:${Math.max(8,a)}%"></i></div>`;}).join("")}</div>`:""}
    </div></div>
    <div class="surface" style="margin-top:16px"><h3>Latest activity</h3>
      <div class="feed">${p.feed.length?p.feed.map(f=>`<div class="surface"><strong>${esc(f.l)}</strong><p>${esc(f.d)}</p><p>${esc(f.t)} · Score ${money(f.s)}</p></div>`).join(""):`<div class="empty">Your activity feed is empty.</div>`}</div>
    </div>
  </section>`;
}

function renderMock(){
  const run=S.mock.run,res=S.mock.res;
  if(run){
    const c=curMock(),cnt=Object.keys(run.ans).length,total=run.o.length,flag=Object.values(run.flag).filter(Boolean).length;
    if(!c)return`<section class="pane card"><div class="empty">Loading question...</div></section>`;
    const mlClass=c.q.lang==="ml"?" ml-text":"";
    return`<section class="pane card"><div class="mockbox">
      <div class="row"><div>
        <div class="ey">Mock in progress</div><h2>${esc(run.c.title)}</h2>
        <div class="chips">
          <div class="pill ${run.tl<=60?"urgent":""}" id="mock-timer">Total · ${tm(run.tl)}</div>
          ${run.c.nav==="locked"?`<div class="pill ${run.sl<=45?"urgent":""}">${esc(run.c.secs[run.sec].name)} · ${tm(run.sl)}</div>`:""}
          <div class="pill">Answered · ${cnt}/${total}</div>
          <div class="pill">Review · ${flag}</div>
        </div>
      </div><div class="row">
        ${run.sec<run.c.secs.length-1?`<button class="btn ghost" data-a="next-sec">Next Section →</button>`:""}
        <button class="btn btn-danger" data-a="sub-mock">Submit Mock</button>
      </div></div>
      <div class="grid2"><div class="q">
        <div class="row"><div>
          <div class="ey">${esc(c.s.name)} · Q${c.p.qi+1} of ${total}</div>
          <h3 class="${mlClass}">${esc(c.q.q)}</h3>
        </div><div class="chips"><div class="pill">${esc(c.q.t)}</div></div></div>
        <div class="opts">${c.q.o.map((o,ix)=>`<button class="opt${run.ans[c.q.id]===ix?" ok":""}${mlClass}" data-a="m-ans" data-v="${ix}">${esc(o)}</button>`).join("")}</div>
        <div class="row" style="margin-top:12px">
          <button class="btn" data-a="m-prev" ${run.i<=0?"disabled":""}>← Previous</button>
          <button class="btn" data-a="m-next" ${run.i>=total-1?"disabled":""}>Next →</button>
          <button class="btn ghost" data-a="m-flag">${run.flag[c.q.id]?"Unmark":"Mark for Review"}</button>
        </div>
      </div><div class="surface">
        <h3>Question Palette</h3>
        <div class="palette">${run.o.map((x,i)=>{const q=run.c.secs[x.si].qs[x.qi],on=i===run.i,ans=q.id in run.ans,fg=!!run.flag[q.id],lock=run.c.nav==="locked"&&x.si>run.sec;
          return`<button class="pbtn ${on?"on":""} ${ans?"ans":""} ${fg?"flag":""}" data-a="m-jump" data-v="${i}" ${lock?"disabled":""}>${i+1}</button>`;}).join("")}</div>
        <div style="margin-top:12px;font-size:.8rem;color:var(--muted)">
          <span style="color:var(--mint)">■</span> Answered &nbsp;
          <span style="color:var(--gold)">■</span> Flagged &nbsp;
          <span style="color:var(--blue)">■</span> Current &nbsp;
          <span style="color:#666">■</span> Locked
        </div>
      </div></div>
    </div></section>`;
  }
  if(res){
    return`<section class="pane card">
      <div class="row"><div>
        <div class="ey">Mock Results</div><h2>${esc(S.mock.cfg?.title||"")}</h2>
      </div><div class="row">
        <button class="btn pri" data-a="start-mock">Start Another Attempt</button>
        <button class="btn ghost" data-a="clear-mock">Close Results</button>
      </div></div>
      <div class="grid5" style="margin-top:16px">
        <div class="score"><span>Score</span><strong style="color:${res.sc>=0?"var(--mint)":"var(--red)"}">${money(res.sc)}</strong></div>
        <div class="score"><span>Accuracy</span><strong>${res.acc}%</strong></div>
        <div class="score"><span>Correct</span><strong style="color:var(--mint)">${res.c}</strong></div>
        <div class="score"><span>Wrong</span><strong style="color:var(--red)">${res.w}</strong></div>
        <div class="score"><span>Unattempted</span><strong>${res.u}</strong></div>
      </div>
      <div class="grid2" style="margin-top:16px"><div class="surface">
        <h3>Section breakdown</h3>
        <table><thead><tr><th>Section</th><th>Att.</th><th>✓</th><th>✗</th><th>Skip</th><th>Score</th></tr></thead>
        <tbody>${res.secs.map(s=>`<tr><td>${esc(s.n)}</td><td>${s.a}</td><td style="color:var(--mint)">${s.c}</td><td style="color:var(--red)">${s.w}</td><td style="color:var(--gold)">${s.u||0}</td><td>${money(s.sc)}</td></tr>`).join("")}</tbody></table>
      </div><div class="surface">
        <h3>Recent attempts</h3>
        ${S.mock.h.length?S.mock.h.map(h=>`<div class="surface"><strong>${esc(h.t)}</strong><p>${esc(h.tm)} · Score ${esc(h.s)} · ${esc(String(h.a))}%</p></div>`).join(""):`<div class="empty">No previous attempts.</div>`}
      </div></div>
    </section>`;
  }
  // Mock config screen
  const c=S.mock.cfg;
  if(!c)return`<div class="empty">Loading mock configuration...</div>`;
  return`<section class="pane card">
    <div class="row"><div>
      <div class="ey">Mock Test</div><h2>${esc(c.title)}</h2>
      <p>${c.nav==="locked"?"Section lock enabled":"Free navigation"} · ${c.total} min total${isExamMalayalam(S.exam?.name)?" · Malayalam medium":""}</p>
    </div><div class="chips">
      <div class="pill">Duration · ${c.total} min</div>
      <div class="pill">Sections · ${c.secs.length}</div>
    </div></div>
    <div class="grid2" style="margin-top:16px"><div class="surface">
      <h3>Instructions</h3>
      <ul class="list">${c.inst.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
      <h3 style="margin-top:14px">Section map</h3>
      <div class="stack">${c.secs.map(s=>`<div class="surface"><strong>${esc(s.name)}</strong><p>${s.count} questions · ${s.min} min · +${money(s.pc)} / -${money(s.pw)}</p></div>`).join("")}</div>
    </div><div class="surface">
      <h3>Ready to begin?</h3>
      <p style="margin-bottom:14px">Timer starts immediately. Each wrong answer deducts marks. Use flags for uncertain questions.</p>
      <button class="btn pri" data-a="start-mock" style="width:100%">Start Mock Test</button>
    </div></div>
  </section>`;
}

/* ===== ADMIN PANEL ===== */
function renderAdmin(){
  const d=S.adminData;
  if(!d)return`<div class="auth-center"><div class="empty">Loading admin data...</div></div>`;
  const s=d.summary||{};
  const maxDau=Math.max(1,...(d.dau||[]).map(x=>x.count));
  return`<section class="dash"><div class="wrap">
    <div class="top card">
      <div style="display:flex;gap:12px;align-items:center">${logoSvg(40)}<div><strong style="color:#b8f6ff;letter-spacing:.1em;font-size:.85rem">ADMIN PANEL</strong><br><span style="font-size:.82rem;color:var(--muted)">ZenPrep AI Analytics</span></div></div>
      <button class="btn" data-a="admin-exit">← Back to App</button>
    </div>
    <div class="grid4" style="margin-top:16px">
      <div class="admin-card"><span>Total Students</span><strong style="color:var(--mint)">${s.totalStudents||0}</strong></div>
      <div class="admin-card"><span>Total Attempts</span><strong>${s.totalAttempts||0}</strong></div>
      <div class="admin-card"><span>Active Today</span><strong style="color:var(--blue)">${s.today||0}</strong></div>
      <div class="admin-card"><span>Top Exam</span><strong style="font-size:1.1rem">${esc(s.topExam||"—")}</strong></div>
    </div>
    <div class="grid2" style="margin-top:16px">
      <div class="surface"><h3>Daily Active Users (14 days)</h3>
        <div class="dau-chart">${(d.dau||[]).map(x=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
          <div class="dau-bar" style="height:${Math.max(2,(x.count/maxDau)*100)}%"></div>
          <div class="dau-label">${x.date.slice(5)}</div>
        </div>`).join("")}</div>
      </div>
      <div class="surface"><h3>Exam Distribution</h3>
        ${(d.exams||[]).length?`<table><thead><tr><th>Exam</th><th>Students</th><th>Attempts</th></tr></thead><tbody>
        ${d.exams.map(e=>`<tr><td>${esc(e.label)}</td><td>${e.students}</td><td>${e.attempts}</td></tr>`).join("")}
        </tbody></table>`:`<div class="empty">No exam data yet.</div>`}
      </div>
    </div>
    <div class="surface" style="margin-top:16px"><h3>Recent Students</h3>
      ${(d.recentStudents||[]).length?`<table><thead><tr><th>Name</th><th>Last Seen</th><th>Attempts</th><th>Accuracy</th><th>Exams</th></tr></thead><tbody>
      ${d.recentStudents.slice(0,20).map(st=>`<tr>
        <td><strong>${esc(st.name)}</strong></td>
        <td>${st.lastSeen?new Date(st.lastSeen).toLocaleDateString():"—"}</td>
        <td>${st.totalAttempts||0}</td>
        <td>${st.accuracy||0}%</td>
        <td>${st.selectedExams&&st.selectedExams.length?st.selectedExams.map(e=>`<span class="chip" style="margin:2px;padding:4px 8px;font-size:.75rem">${esc(e)}</span>`).join(""):esc(st.lastExam||"—")}</td>
      </tr>`).join("")}</tbody></table>`:`<div class="empty">No students registered yet.</div>`}
    </div>
    <p style="text-align:center;margin-top:24px;color:var(--muted)">Powered by ZAVAN GROUP</p>
  </div></section>`;
}

/* ===== SETTINGS MODAL ===== */
function renderSettings(){
  if(!S.modal)return"";
  return`<div class="modalbg"><div class="modal card">
    <div class="ey">AI routing and security</div>
    <h2>Manage AI settings</h2>
    <p style="margin:8px 0 16px">Leave keys empty to use the secure proxy. Add browser keys for local use.</p>
    <form id="keyf" class="form">
      <input id="keyin-claude" class="field" type="password" value="${esc(S.ck)}" placeholder="Optional Claude API key">
      <input id="keyin-gemma" class="field" type="password" value="${esc(S.gk)}" placeholder="Optional OpenRouter Gemma key">
      <select id="modein" class="sel">
        <option value="auto" ${S.mode==="auto"?"selected":""}>Auto: Claude then Gemma</option>
        <option value="claude" ${S.mode==="claude"?"selected":""}>Claude only</option>
        <option value="gemma" ${S.mode==="gemma"?"selected":""}>Gemma only</option>
      </select>
      <div class="row">
        <button class="btn pri" type="submit">Save</button>
        <button class="btn" type="button" data-a="clear-key">Reset Keys</button>
        <button class="btn ghost" type="button" data-a="close-key">Close</button>
      </div>
    </form>
  </div></div>`;
}

/* ===== MAIN DRAW ===== */
function draw(){
  const A=document.getElementById("app");
  const p=S.prog;

  if(S.screen==="auth"){A.innerHTML=renderAuth();return;}
  if(S.screen==="register"){A.innerHTML=renderRegister();return;}
  if(S.screen==="load"){A.innerHTML=renderLoad();return;}
  if(S.screen==="admin"){A.innerHTML=renderAdmin();return;}

  // Dashboard
  A.innerHTML=`<section class="dash"><div class="wrap">
    <div class="top card">
      <div style="display:flex;gap:12px;align-items:center">
        ${logoSvg(40)}
        <div><strong style="color:#b8f6ff;letter-spacing:.1em;font-size:.85rem">ZAV INFO TECH</strong><br>
        <span style="font-size:.82rem">${esc(S.exam?.name||"")}${S.learnerName?" · "+esc(S.learnerName):""}</span></div>
      </div>
      <div class="stats">
        <div class="pill">Attempted · ${p.a}</div>
        <div class="pill">Accuracy · ${p.acc}%</div>
        ${S.selectedExams.length>1?`
        <select class="sel switcher" data-a="switch-exam" style="background:rgba(255,255,255,0.05);color:var(--mint);border-color:var(--mint)">
          ${S.selectedExams.map(ex=>`<option value="${esc(ex)}" ${S.exam?.n===norm(ex)?"selected":""}>Switch: ${esc(tc(ex))}</option>`).join("")}
        </select>
        `:""}
        ${statusBadge()}
        <button class="btn ghost" data-a="key">AI Settings</button>
        <button class="btn" data-a="logout">Logout</button>
        <button class="btn" data-a="home">Reset Exams</button>
      </div>
    </div>
    <div class="tabs">${TABS.map(([k,l])=>`<button class="tab ${S.tab===k?"on":""}" data-a="tab" data-v="${k}"><strong>${esc(l)}</strong></button>`).join("")}</div>
    ${S.tab==="overview"?renderOverview():S.tab==="practice"?renderPractice():S.tab==="teach"?renderTeach():S.tab==="doubt"?renderDoubt():S.tab==="progress"?renderProgress():renderMock()}
    <p style="text-align:center;color:var(--muted);margin-top:24px">Powered by ZAVAN GROUP</p>
  </div></section>${renderSettings()}${S.note?`<div class="toast">${esc(S.note)}</div>`:""}`;
}

/* ===== EVENT HANDLERS ===== */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-a]");if(!b)return;
  const a=b.dataset.a,v=b.dataset.v;

  // Student Portal - Quick access for registered students
  if(a==="student-portal"){
    const storedName=sessionStorage.getItem(NAME_KEY);
    const storedExams=sessionStorage.getItem(EXAM_KEY);
    if(storedName&&storedExams&&storedExams!=="[]"){
      S.learnerName=storedName;
      try{
        S.selectedExams=JSON.parse(storedExams);
      }catch(err){
        S.selectedExams=[];
      }
      if(S.selectedExams.length>0){
        S.screen="register";
        draw();
        return;
      }
    }
    note("No previous session found. Please verify access.");
  }

  // Auth & Register
  if(a==="pick-exam"){
    if(S.selectedExams.includes(v)){
      S.selectedExams=S.selectedExams.filter(x=>x!==v);
    }else{
      if(S.selectedExams.length>=3)return note("Maximum 3 exams allowed.");
      S.selectedExams.push(v);
    }
    sessionStorage.setItem(EXAM_KEY,JSON.stringify(S.selectedExams));
    if(S.learnerName&&S.access)syncExamsToServer();
    draw();
  }
  if(a==="clear-exams"){
    S.selectedExams=[];
    sessionStorage.setItem(EXAM_KEY,"[]");
    if(S.learnerName&&S.access)syncExamsToServer();
    draw();
  }
  if(a==="add-custom"){
    const i=document.getElementById("reg-exam-custom"),val=(i.value||"").trim();
    if(!val)return;
    if(S.selectedExams.includes(val))return;
    if(S.selectedExams.length>=3)return note("Maximum 3 exams allowed.");
    S.selectedExams.push(val);
    sessionStorage.setItem(EXAM_KEY,JSON.stringify(S.selectedExams));
    if(S.learnerName&&S.access)syncExamsToServer();
    i.value="";
    draw();
  }

  // Dashboard nav
  if(a==="tab"){S.tab=v;draw();}
  if(a==="topic"){S.topic=v;draw();}
  if(a==="logout"){
    clearTimeout(lt);clearInterval(mt);flushEvents();
    S.access="";S.password="";S.learnerName="";S.selectedExams=[];
    S.exam=null;S.ov=null;S.prog={a:0,c:0,w:0,acc:0,net:0,st:0,best:0,t:{},d:{},feed:[]};
    sessionStorage.removeItem(ACCESS_KEY);sessionStorage.removeItem(PASS_KEY);
    sessionStorage.removeItem(NAME_KEY);sessionStorage.removeItem(EXAM_KEY);
    S.screen="auth";draw();
  }
  if(a==="home"){
    clearTimeout(lt);clearInterval(mt);flushEvents();
    S.selectedExams=[];S.exam=null;S.ov=null;
    sessionStorage.setItem(EXAM_KEY,"[]");
    S.screen="register";draw();
  }
  if(a==="admin-exit"){S.screen=sessionStorage.getItem(NAME_KEY)?"register":"auth";S.adminData=null;draw();}

  // AI Settings
  if(a==="key"){S.modal=1;draw();}
  if(a==="close-key"){S.modal=0;draw();}
  if(a==="clear-key"){sessionStorage.removeItem(CLAUDE_KEY);sessionStorage.removeItem(GEMMA_KEY);S.ck="";S.gk="";S.modal=0;syncConnectionState();draw();note("Keys cleared.");}

  // Overview
  if(a==="refresh-ov")loadOv(true);

  // Practice
  if(a==="gen-pr"||a==="next-pr"){
    const t=document.getElementById("pt"),d=document.getElementById("pd");
    if(t)S.topic=t.value;if(d)S.diff=d.value;
    genPractice(a==="next-pr");
  }
  if(a==="regen-pr"){
    const t=document.getElementById("pt"),d=document.getElementById("pd");
    if(t)S.topic=t.value;if(d)S.diff=d.value;
    if(S.exam&&S.exam.n){const k=[S.exam.n,S.topic,S.diff].join("::");delete S.practice.cache[k];}
    genPractice(true);
  }
  if(a==="ans")answerQ(b.dataset.id,b.dataset.v);

  // Teach
  if(a==="teach")loadTeach(v);

  // Chat
  if(a==="qp")sendChat(v);

  // Mock
  if(a==="start-mock"){S.mock.cfg=localMock();startMock();}
  if(a==="m-ans"){
    const c=curMock();
    if(c&&S.mock.run)S.mock.run.ans[c.q.id]=+v;
    draw();
  }
  if(a==="m-prev"){if(S.mock.run)jump(S.mock.run.i-1);}
  if(a==="m-next"){if(S.mock.run)jump(S.mock.run.i+1);}
  if(a==="m-jump"){if(S.mock.run)jump(+v);}
  if(a==="m-flag"){const c=curMock();if(c&&S.mock.run)S.mock.run.flag[c.q.id]=!S.mock.run.flag[c.q.id];draw();}
  if(a==="next-sec"){nextSec();}
  if(a==="sub-mock"){submitMock(false);}
  if(a==="clear-mock"){S.mock.res=null;S.mock.run=null;draw();}
});

document.addEventListener("change",e=>{
  const b=e.target.closest("[data-a]");if(!b)return;
  const a=b.dataset.a;
  if(a==="switch-exam"){
    const idx=S.selectedExams.indexOf(e.target.value);
    if(idx>=0){
      switchActiveExam(idx);
    }
  }
});

document.addEventListener("submit",async e=>{
  e.preventDefault();

  // Auth form
  if(e.target.id==="authf"){
    const code=document.getElementById("auth-code").value.trim();
    const pass=document.getElementById("auth-pass").value.trim();
    if(!code||!pass){S.authError="Please enter both code and password.";draw();return;}
    S.authLoading=true;S.authError="";draw();
    const result=await verifyAccess(code,pass);
    S.authLoading=false;
    if(result.ok){
      S.access=code;S.password=pass;
      sessionStorage.setItem(ACCESS_KEY,code);sessionStorage.setItem(PASS_KEY,pass);
      S.authError="";S.screen="register";
    }else{
      S.authError=result.error||"Invalid access code or password.";
    }
    draw();
  }

  // Register form
  if(e.target.id==="regf"){
    const name=document.getElementById("reg-name").value.trim();
    if(!name){note("Please enter your name.");return;}
    if(!S.selectedExams.length){note("Please select at least one exam.");return;}
    
    if(!confirm(`Confirm your target exams:\n\n${S.selectedExams.map(x=>"👉 "+tc(x)).join("\n")}\n\nIs this selection correct?`)) {
      return;
    }
    
    S.learnerName=name;sessionStorage.setItem(NAME_KEY,name);
    syncConnectionState();
    syncExamsToServer();
    startExam(S.selectedExams);
  }

  // Key settings form
  if(e.target.id==="keyf"){
    const ck=(document.getElementById("keyin-claude").value||"").trim();
    const gk=(document.getElementById("keyin-gemma").value||"").trim();
    const md=(document.getElementById("modein").value||"auto").trim();
    const rt=(ck||gk)?"browser":"proxy";
    ck?sessionStorage.setItem(CLAUDE_KEY,ck):sessionStorage.removeItem(CLAUDE_KEY);
    gk?sessionStorage.setItem(GEMMA_KEY,gk):sessionStorage.removeItem(GEMMA_KEY);
    sessionStorage.setItem(MODE_KEY,md);sessionStorage.setItem(RUNTIME_KEY,rt);
    S.ck=ck;S.gk=gk;S.mode=md;S.runtime=rt;S.api="local";
    syncConnectionState();S.modal=0;draw();
    note(`AI settings saved. ${runtimeLabel(rt)} active.`);
    if(S.screen==="dash")loadOv(true);
  }

  // Chat form
  if(e.target.id==="chatf"){
    const i=document.getElementById("chatin"),v=i.value;i.value="";sendChat(v);
  }
});

// Flush events before page unload
window.addEventListener("beforeunload",()=>{flushEvents();});

/* ===== INIT ===== */
(function init(){
  const params=new URLSearchParams(location.search);
  
  // Check for logout/reset
  if(params.get("logout")){
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(PASS_KEY);
    sessionStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(EXAM_KEY);
    S.access="";
    S.password="";
    S.learnerName="";
    S.selectedExams=[];
    location.href=location.pathname;
    return;
  }
  
  if(params.get("reset")){
    sessionStorage.clear();
    location.href=location.pathname;
    return;
  }
  
  const adminCode=params.get("admin");
  if(adminCode){loadAdmin(adminCode);return;}

  // Check for existing session
  if(S.access&&S.learnerName){
    // Has full session — go to register/exam select
    S.screen="register";
    // Load selected exams from storage
    try{
      const stored=sessionStorage.getItem(EXAM_KEY);
      if(stored)S.selectedExams=JSON.parse(stored);
    }catch(e){S.selectedExams=[];}
  }else if(S.access){
    S.screen="register";
  }else{
    S.screen="auth";
  }

  syncConnectionState();
  draw();
})();
