const poems = (window.POEMS || []).map(p => ({ ...p, slug: slugify(p.title) }));
const app = document.getElementById("app");
document.getElementById("yr").textContent = new Date().getFullYear();

function slugify(s) {
  return s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmt(d) {
  if (!d) return "";
  const dt = new Date(d + "T12:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderNote(n) {
  return n.trim().split(/\n\s*\n/).map(para =>
    "<p>" + esc(para).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>') + "</p>"
  ).join("");
}

// ---------- calendar heatmap ----------
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const BACK = `<a class="back" href="#/">&larr; All poems</a>`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function renderCalendar(selected) {
  const count = {};
  poems.forEach(p => { if (p.date) count[p.date] = (count[p.date] || 0) + 1; });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // show at least ~4 months, and always back to the first poem
  let start = new Date(today); start.setDate(start.getDate() - 7 * 17);
  poems.forEach(p => { if (p.date) { const d = parseYmd(p.date); if (d < start) start = d; } });
  start = new Date(start); start.setDate(start.getDate() - start.getDay());   // back to Sunday
  const weeks = [];
  for (const d = new Date(start); d <= today;) {
    const w = [];
    for (let i = 0; i < 7; i++) { w.push(new Date(d)); d.setDate(d.getDate() + 1); }
    weeks.push(w);
  }
  const cols = weeks.map((w, wi) => {
    const first = w.find(d => d.getDate() === 1);
    const label = (wi === 0 && w[0].getDate() <= 21) ? MONTHS[w[6].getMonth()] : first ? MONTHS[first.getMonth()] : "";
    const cells = w.map(d => {
      if (d > today) return `<span class="day future"></span>`;
      const key = ymd(d), n = count[key] || 0, lvl = Math.min(n, 4);
      const name = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const tip = `${name}: ${n ? n + (n === 1 ? " poem" : " poems") : "no poems"}`;
      const cls = `day l${lvl}${key === selected ? " sel" : ""}${+d === +today ? " today" : ""}`;
      return n
        ? `<a class="${cls}" href="#/day/${key}" title="${tip}" aria-label="${tip}"></a>`
        : `<span class="${cls}" title="${tip}"></span>`;
    }).join("");
    return `<div class="wk"><span class="mo">${label}</span>${cells}</div>`;
  }).join("");
  const total = poems.length, days = Object.keys(count).length;
  return `
    <section class="cal-wrap" aria-label="Poems by day">
      <div class="cal" id="cal">
        <div class="wk dows"><span class="mo"></span><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></div>
        ${cols}
      </div>
      <div class="cal-foot">
        <span>${total} ${total === 1 ? "poem" : "poems"} on ${days} ${days === 1 ? "day" : "days"}</span>
        <span class="legend">Fewer <i class="day l0"></i><i class="day l1"></i><i class="day l2"></i><i class="day l3"></i><i class="day l4"></i> More</span>
      </div>
    </section>`;
}
function scrollCalendar() {
  const c = document.getElementById("cal");
  if (!c) return;
  const sel = c.querySelector(".sel");
  c.scrollLeft = sel ? sel.parentElement.offsetLeft - c.clientWidth / 2 : c.scrollWidth;
}

function renderIndex() {
  document.title = "Kavin Suresh";
  if (!poems.length) { app.innerHTML = '<p class="empty">Nothing here yet.</p>'; return; }
  app.innerHTML = renderCalendar() + '<ol class="index">' + poems.map(p =>
    `<li><a href="#/${p.slug}"><span class="t">${esc(p.title)}</span><span class="d">${esc(fmt(p.date))}</span></a></li>`
  ).join("") + "</ol>";
  scrollCalendar();
}

function renderDay(key) {
  const list = poems.filter(p => p.date === key);
  document.title = fmt(key) + " | Kavin Suresh";
  app.innerHTML = BACK + renderCalendar(key) + `
    <section class="dayview">
      <h1>${esc(parseYmd(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}</h1>
      ${list.length ? list.map(p => `
        <article class="entry">
          <h2><a href="#/${p.slug}">${esc(p.title)}</a></h2>
          ${p.form ? `<div class="d">${esc(p.form)}</div>` : ""}
          <div class="body">${esc(p.body.trim())}</div>
          ${p.note ? `<aside class="note"><div class="note-h">Inspiration</div>${renderNote(p.note)}</aside>` : ""}
          ${p.animation || p.secret ? `<p class="more"><a href="#/${p.slug}">${p.secret ? "Open the poem for the locked note" : "Open the poem to see its animation"} &rarr;</a></p>` : ""}
        </article>`).join("") : `<p class="empty">No poems this day.</p>`}
    </section>
    <nav class="pn"><a href="#/">All poems</a></nav>`;
  scrollCalendar();
}

function renderPoem(i) {
  const p = poems[i];
  const newer = poems[i - 1], older = poems[i + 1];
  document.title = p.title + " | Kavin Suresh";
  app.innerHTML = BACK + `
    <article>
      <h1>${esc(p.title)}</h1>
      <div class="d">${p.form ? esc(p.form) + " &middot; " : ""}<a class="dlink" href="#/day/${esc(p.date)}">${esc(fmt(p.date))}</a></div>
      ${p.animation ? `<div class="anim" id="anim"></div>` : ""}
      <div class="body">${esc(p.body.trim())}</div>
      ${p.secret ? `<aside class="note secret" id="secret">
        <form class="unlock" id="unlock">
          <label for="pw">The moment behind this one is locked.</label>
          <span class="unlock-row"><input id="pw" type="password" autocomplete="off" placeholder="Password"><button type="submit">Unlock</button></span>
          <span class="unlock-msg" id="unlock-msg" aria-live="polite"></span>
        </form>
      </aside>` : ""}
      ${p.note ? `<aside class="note"><div class="note-h">Inspiration</div>${renderNote(p.note)}</aside>` : ""}
    </article>
    <nav class="pn">
      ${older ? `<a href="#/${older.slug}">&larr; ${esc(older.title)}</a>` : `<a href="#/">All poems</a>`}
      ${newer ? `<a class="next" href="#/${newer.slug}">${esc(newer.title)} &rarr;</a>` : ""}
    </nav>`;
  if (p.animation) mountAnimation(p);
  if (p.secret) mountSecret(p);
}

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlockSecret(sec, password) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  for (const k of sec.keys) {
    try {
      const kek = await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: b64(k.salt), iterations: sec.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(k.iv) }, kek, b64(k.key));
      const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
      const text = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(sec.iv) }, key, b64(sec.data));
      return new TextDecoder().decode(text);
    } catch (e) { /* wrong password for this key, try the next */ }
  }
  return null;
}

function mountSecret(p) {
  const form = document.getElementById("unlock"), msg = document.getElementById("unlock-msg");
  if (!form) return;
  if (!(window.crypto && crypto.subtle)) { msg.textContent = "Unlocking needs a secure (https) connection."; return; }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const pw = document.getElementById("pw").value;
    if (!pw) return;
    msg.textContent = "Unlocking...";
    form.querySelector("button").disabled = true;
    const text = await unlockSecret(p.secret, pw);
    form.querySelector("button").disabled = false;
    if (text === null) { msg.textContent = "That's not it."; return; }
    document.getElementById("secret").innerHTML = `<div class="note-h">The moment behind it</div>${renderNote(text)}`;
  });
}

function mountAnimation(p) {
  const run = () => {
    const el = document.getElementById("anim");
    const fn = (window.POEM_ANIMATIONS || {})[p.slug];
    if (el && fn) fn(el, p.body.trim().split("\n").filter(l => l.trim()));
  };
  if ((window.POEM_ANIMATIONS || {})[p.slug]) return run();
  const s = document.createElement("script");
  s.src = p.animation;
  s.onload = run;
  document.head.appendChild(s);
}

function route() {
  const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const day = slug.match(/^day\/(\d{4}-\d{2}-\d{2})$/);
  const i = poems.findIndex(p => p.slug === slug);
  if (day) renderDay(day[1]);
  else if (slug && i >= 0) renderPoem(i);
  else renderIndex();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
