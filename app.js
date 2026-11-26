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

function renderIndex() {
  document.title = "Kavin Suresh";
  if (!poems.length) { app.innerHTML = '<p class="empty">Nothing here yet.</p>'; return; }
  app.innerHTML = '<ol class="index">' + poems.map(p =>
    `<li><a href="#/${p.slug}"><span class="t">${esc(p.title)}</span><span class="d">${esc(fmt(p.date))}</span></a></li>`
  ).join("") + "</ol>";
}

function renderPoem(i) {
  const p = poems[i];
  const newer = poems[i - 1], older = poems[i + 1];
  document.title = p.title + " | Kavin Suresh";
  app.innerHTML = `
    <article>
      <h1>${esc(p.title)}</h1>
      <div class="d">${p.form ? esc(p.form) + " &middot; " : ""}${esc(fmt(p.date))}</div>
      ${p.animation ? `<div class="anim" id="anim"></div>` : ""}
      <div class="body">${esc(p.body.trim())}</div>
      ${p.secret ? `<aside class="note secret" id="secret">
        <form class="unlock" id="unlock">
          <label for="pw">The real inspiration is locked.</label>
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
    document.getElementById("secret").innerHTML = `<div class="note-h">The real inspiration</div>${renderNote(text)}`;
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
  const i = poems.findIndex(p => p.slug === slug);
  if (slug && i >= 0) renderPoem(i); else renderIndex();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
