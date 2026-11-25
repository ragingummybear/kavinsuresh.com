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
      <div class="body">${esc(p.body.trim())}</div>
      ${p.note ? `<aside class="note"><div class="note-h">Inspiration</div>${renderNote(p.note)}</aside>` : ""}
    </article>
    <nav class="pn">
      ${older ? `<a href="#/${older.slug}">&larr; ${esc(older.title)}</a>` : `<a href="#/">All poems</a>`}
      ${newer ? `<a class="next" href="#/${newer.slug}">${esc(newer.title)} &rarr;</a>` : ""}
    </nav>`;
}

function route() {
  const slug = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const i = poems.findIndex(p => p.slug === slug);
  if (slug && i >= 0) renderPoem(i); else renderIndex();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
route();
