// Animation for "Dancing with the Fog".
// Registers itself on window.POEM_ANIMATIONS; app.js mounts it above the poem.
(function () {
  const reg = (window.POEM_ANIMATIONS = window.POEM_ANIMATIONS || {});

  reg["dancing-with-the-fog"] = function mount(el, lines) {
    const LINE = 4.4;                    // seconds per poem line
    const N = lines.length;
    const END = LINE * N;                // story length
    const TOTAL = END + 3.5;             // hold on the last frame, then show replay

    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Animation: two clouds of fog dance over a reservoir until the rising sun lifts them away, leaving a cyclist climbing alone at dawn.");
    el.appendChild(canvas);
    const replay = document.createElement("button");
    replay.className = "anim-replay";
    replay.type = "button";
    replay.textContent = "Replay";
    el.appendChild(replay);
    const ctx = canvas.getContext("2d");

    // ---------- helpers ----------
    const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
    const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    // three-stop palette: pre-dawn -> sunrise -> bright morning
    const pal = (a, b, c, k1, k2) => [hex(a), hex(b), hex(c), k1, k2];
    const at = (p, s) => s < p[3] ? mix(p[0], p[1], smooth(0, p[3], s)) : mix(p[1], p[2], smooth(p[3], p[4], s));
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    const P = {
      skyTop:  pal("#2f3a55", "#6d7ea3", "#8fc1e4", 0.5, 0.95),
      skyLow:  pal("#8c93a8", "#f4b386", "#f9e6bd", 0.5, 0.95),
      ridgeB:  pal("#4a5370", "#9a8fa0", "#b9b6b4", 0.5, 0.95),
      ridgeM:  pal("#343c55", "#6f6070", "#9c8f73", 0.5, 0.95),
      water:   pal("#4c5671", "#b98e86", "#8fb6c9", 0.5, 0.95),
      hill:    pal("#1f2436", "#4a3b37", "#8a7246", 0.5, 0.95),
      road:    pal("#3a3f52", "#77655c", "#c9b48d", 0.5, 0.95),
      rider:   pal("#0f1220", "#21181a", "#2b2219", 0.5, 0.95),
      fogTint: pal("#e9edf5", "#ffe2cf", "#ffffff", 0.5, 0.95),
    };

    // ---------- fog clouds ----------
    function makeCloud(n) {
      const puffs = [];
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, d = Math.sqrt(rand());
        puffs.push({
          ox: Math.cos(a) * d * 1.0, oy: Math.sin(a) * d * 0.5,
          r: 0.35 + rand() * 0.45, ph: rand() * 6.28, sp: 0.6 + rand(),
          rise: 0.6 + rand() * 0.9, drift: rand() - 0.5,
          trace: rand() < 0.28,           // these stay thick and white longest
        });
      }
      return puffs;
    }
    const lovers = [makeCloud(18), makeCloud(18)];
    const blanket = makeCloud(30);        // low fog lying on the water

    let W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = el.clientWidth || 600;
      H = Math.round(W * 0.6);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ridge = (x, base, amps) => base - amps.reduce((s, [a, f, p]) => s + a * Math.sin(x * f + p), 0);
    const ridgeBack = x => ridge(x / W, H * 0.47, [[H * 0.06, 5.1, 0.4], [H * 0.035, 11.3, 1.7], [H * 0.012, 29, 0.2]]);
    const ridgeMid = x => ridge(x / W, H * 0.6, [[H * 0.03, 7.3, 2.1], [H * 0.015, 17.1, 0.6]]) + H * 0.2 * Math.exp(-Math.pow((x / W - 0.4) / 0.24, 2));
    // foreground slope with the road on it, climbing to the right
    const roadY = x => H * (0.98 - 0.2 * (x / W)) - H * 0.015 * Math.sin((x / W) * 9);

    function fillUnder(fn, color) {
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, fn(x));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    function puff(x, y, r, color, a, stretch) {
      if (a <= 0.003 || r <= 0) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(color, a));
      g.addColorStop(0.55, rgba(color, a * 0.55));
      g.addColorStop(1, rgba(color, 0));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, stretch);
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---------- cyclist ----------
    // Filled silhouette: road bike, drop bars, helmet, tapered limbs.
    // Units are "k" (about a pixel at 560px wide), bike faces right, road at y = 0.
    function limb(p1, p2, w1, w2) {
      const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L;
      ctx.beginPath();
      ctx.moveTo(p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2);
      ctx.lineTo(p2[0] + nx * w2 / 2, p2[1] + ny * w2 / 2);
      ctx.lineTo(p2[0] - nx * w2 / 2, p2[1] - ny * w2 / 2);
      ctx.lineTo(p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(p1[0], p1[1], w1 / 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(p2[0], p2[1], w2 / 2, 0, Math.PI * 2); ctx.fill();
    }
    function ik(hip, foot, L1, L2, back) {    // knee bends forward, elbow (back = true) bends back
      const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
      const d = clamp(Math.hypot(dx, dy), 1e-3, L1 + L2 - 1e-3);
      const base = Math.atan2(dy, dx);
      const off = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const a = back ? base + off : base - off;
      return [hip[0] + Math.cos(a) * L1, hip[1] + Math.sin(a) * L1];
    }

    function rider(t, s) {
      const k = W / 560;
      const x = lerp(W * 0.6, W * 0.75, smooth(0, 1, t / END));
      const slope = Math.atan2(roadY(x + 12) - roadY(x - 12), 24);
      const crank = t * 5.2;
      const near = at(P.rider, s);
      const far = mix(near, at(P.hill, s), 0.38);
      const S = (pt) => [pt[0] * k, pt[1] * k];

      ctx.save();
      ctx.translate(x, roadY(x) - 1.2 * k);
      ctx.rotate(slope);
      ctx.lineCap = "round"; ctx.lineJoin = "round";

      // body motion out of the saddle: hips dip on each downstroke, bike rocks a touch
      const dip = Math.cos(crank * 2) * 0.9;
      const fwd = Math.sin(crank * 2) * 0.5;
      const hip = [0.5 + fwd, -36 + dip];
      const shoulder = [16 + fwd * 0.6, -47 + dip * 0.5];
      const hand = [20.5, -31.8];
      const head = [20 + fwd * 0.5, -51.5 + dip * 0.4];
      const bb = [0, -10.5], crankLen = 6.6;
      const pedal = ph => [bb[0] + Math.cos(crank + ph) * crankLen, bb[1] + Math.sin(crank + ph) * crankLen];

      // far side: leg and arm, slightly hazier
      ctx.fillStyle = rgba(far);
      {
        const f = pedal(Math.PI), kn = ik(hip, f, 16, 16);
        limb(S(hip), S(kn), 3.4 * k, 2.6 * k); limb(S(kn), S(f), 2.5 * k, 1.6 * k);
        limb(S([f[0] - 2.2, f[1] - 0.2]), S([f[0] + 3.2, f[1] + 0.3]), 1.8 * k, 1.2 * k);
        const el = ik(shoulder, [hand[0] - 0.6, hand[1]], 8.6, 8.6, true);
        limb(S(shoulder), S(el), 2.4 * k, 1.9 * k); limb(S(el), S([hand[0] - 0.6, hand[1]]), 1.9 * k, 1.5 * k);
      }

      // bike
      ctx.fillStyle = rgba(near);
      ctx.strokeStyle = rgba(near);
      const rear = [-18.5, -12], front = [18.5, -12], R = 12;
      for (const w of [rear, front]) {
        ctx.lineWidth = 1.4 * k;
        ctx.beginPath(); ctx.arc(w[0] * k, w[1] * k, (R - 0.7) * k, 0, Math.PI * 2); ctx.stroke();   // tire
        ctx.lineWidth = 1.9 * k;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(w[0] * k, w[1] * k, (R - 2.9) * k, 0, Math.PI * 2); ctx.stroke(); // deep rim
        ctx.globalAlpha = 0.18; ctx.lineWidth = 0.5 * k;
        for (let i = 0; i < 8; i++) {
          const a = -crank * 1.9 + (i * Math.PI) / 8;
          ctx.beginPath();
          ctx.moveTo((w[0] + Math.cos(a) * 1.2) * k, (w[1] + Math.sin(a) * 1.2) * k);
          ctx.lineTo((w[0] + Math.cos(a) * (R - 4.5)) * k, (w[1] + Math.sin(a) * (R - 4.5)) * k);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(w[0] * k, w[1] * k, 1.1 * k, 0, Math.PI * 2); ctx.fill();
      }
      const seatTop = [-5.5, -29.5], headTop = [14, -29.2], headBot = [15.3, -24.6];
      const tube = (a, b, w) => limb(S(a), S(b), w * k, w * k);
      tube(bb, seatTop, 1.7);                   // seat tube
      tube(seatTop, headTop, 1.4);              // top tube
      tube(bb, headBot, 1.9);                   // down tube
      tube(headTop, headBot, 2.0);              // head tube
      tube(bb, rear, 1.2);                      // chainstay
      tube([-4.6, -27], rear, 1.1);             // seatstay
      tube(headBot, [17.4, -16], 1.5);          // fork
      tube([17.4, -16], front, 1.2);
      tube(seatTop, [-6.3, -32], 1.1);          // seatpost
      limb(S([-9.5, -32.4]), S([-3.2, -32.6]), 1.6 * k, 1.2 * k);   // saddle
      tube(headTop, [19, -31.2], 1.3);          // stem
      // drop bars: hood forward, curve down and back
      ctx.lineWidth = 1.3 * k;
      ctx.beginPath();
      ctx.moveTo(19 * k, -31.2 * k);
      ctx.quadraticCurveTo(22.6 * k, -31.4 * k, 22 * k, -27.6 * k);
      ctx.quadraticCurveTo(21.6 * k, -25.2 * k, 19.4 * k, -25.4 * k);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(bb[0] * k, bb[1] * k, 3.6 * k, 0, Math.PI * 2); ctx.fill();  // chainring

      // near side: torso, head, arm, leg
      ctx.fillStyle = rgba(near);
      limb(S(hip), S(shoulder), 4.8 * k, 5 * k);                     // torso
      limb(S([hip[0] + 3, hip[1] - 4]), S([shoulder[0] - 3, shoulder[1] + 0.5]), 5.4 * k, 5.2 * k); // back, a touch rounded
      limb(S([shoulder[0] + 1, shoulder[1] - 1]), S([head[0] - 0.8, head[1] + 2.4]), 2.4 * k, 2.1 * k);  // neck
      const hd = S(head);
      ctx.beginPath(); ctx.ellipse(hd[0], hd[1], 3.1 * k, 3.3 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();                          // helmet, swept back
      ctx.moveTo(hd[0] - 4.6 * k, hd[1] - 0.6 * k);
      ctx.quadraticCurveTo(hd[0] - 1.5 * k, hd[1] - 5.6 * k, hd[0] + 3.4 * k, hd[1] - 2.3 * k);
      ctx.quadraticCurveTo(hd[0] + 4.2 * k, hd[1] - 1 * k, hd[0] + 2.8 * k, hd[1] - 0.6 * k);
      ctx.closePath(); ctx.fill();
      {
        const el = ik(shoulder, hand, 8.6, 8.6, true);
        limb(S(shoulder), S(el), 2.7 * k, 2.1 * k); limb(S(el), S(hand), 2.1 * k, 1.6 * k);
        const f = pedal(0), kn = ik(hip, f, 16, 16);
        limb(S(hip), S(kn), 3.8 * k, 2.8 * k); limb(S(kn), S(f), 2.7 * k, 1.7 * k);
        limb(S([f[0] - 2.2, f[1] - 0.2]), S([f[0] + 3.2, f[1] + 0.3]), 2 * k, 1.3 * k);  // shoe
      }
      ctx.restore();
    }

    // ---------- one frame ----------
    function draw(t) {
      const s = clamp(t / END);                       // story progress 0..1
      const sunT = smooth(LINE * 2, LINE * 3.2, t);   // sun rises on line 3
      const seethe = smooth(LINE * 2, LINE * 2.4, t) * (1 - smooth(LINE * 3.1, LINE * 3.8, t));
      const lift = smooth(LINE * 3, LINE * 4.6, t);   // fog lifted on line 4
      const jitter = seethe * 1.2;

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
      sky.addColorStop(0, rgba(at(P.skyTop, s)));
      sky.addColorStop(1, rgba(at(P.skyLow, s)));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // sun, behind the back ridge
      const sx = W * 0.64 + (Math.random() - 0.5) * jitter, sr = W * 0.045;
      const sy = lerp(H * 0.56, H * 0.3, sunT) + (Math.random() - 0.5) * jitter;
      const hot = hex("#ff6a2b"), calm = hex("#fff0c2");
      const sunCol = mix(calm, hot, seethe);
      const glowR = sr * (5 + seethe * 2.5 + Math.sin(t * 9) * seethe * 0.8);
      const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, glowR);
      glow.addColorStop(0, rgba(sunCol, 0.55 * sunT + 0.05));
      glow.addColorStop(1, rgba(sunCol, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      if (seethe > 0.01) {                       // angry flickering rays
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.8);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          const len = sr * (1.9 + 0.7 * Math.sin(t * 11 + i * 1.7)) * seethe;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a - 0.09) * sr * 1.1, Math.sin(a - 0.09) * sr * 1.1);
          ctx.lineTo(Math.cos(a) * (sr + len), Math.sin(a) * (sr + len));
          ctx.lineTo(Math.cos(a + 0.09) * sr * 1.1, Math.sin(a + 0.09) * sr * 1.1);
          ctx.fillStyle = rgba(mix(hex("#ffb347"), hot, 0.5), 0.7 * seethe);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, sr * (1 + seethe * 0.06 * Math.sin(t * 14)), 0, Math.PI * 2);
      ctx.fillStyle = rgba(sunCol, 0.35 + 0.65 * smooth(0, 0.3, sunT));
      ctx.fill();

      // land
      fillUnder(ridgeBack, rgba(at(P.ridgeB, s)));
      // reservoir, framed by the hills in front of it
      const wy = H * 0.63, wh = H * 0.1;
      const waterCol = at(P.water, s);
      const wg = ctx.createLinearGradient(0, wy, 0, H);
      wg.addColorStop(0, rgba(mix(waterCol, at(P.skyLow, s), 0.35)));
      wg.addColorStop(1, rgba(waterCol));
      ctx.fillStyle = wg;
      ctx.fillRect(0, wy, W, H - wy);
      if (sunT > 0.05) {                          // shimmer of the sun on the water
        for (let i = 0; i < 9; i++) {
          const yy = wy + wh * (0.15 + i * 0.09);
          const ww = W * (0.05 + 0.02 * Math.sin(t * 2 + i)) * (1 - i * 0.06);
          ctx.fillStyle = rgba(hex("#fff3d6"), 0.35 * sunT * (1 - i / 10));
          ctx.fillRect(sx * 0.62 - ww / 2 + Math.sin(t * 1.5 + i) * 6, yy, ww, 1.2);
        }
      }
      fillUnder(ridgeMid, rgba(at(P.ridgeM, s)));

      // fog
      const fogCol = at(P.fogTint, s);
      const R = W * 0.058;
      // blanket on the water burns off as the sun rises
      for (const p of blanket) {
        const bx = W * 0.4 + p.ox * W * 0.27 + Math.sin(t * 0.3 * p.sp + p.ph) * W * 0.01;
        const by = wy + wh * 0.25 + p.oy * wh * 0.9 - lift * H * 0.08 * p.rise;
        const a = 0.22 * (1 - smooth(0.25, 0.85, sunT * 0.6 + lift * 0.6)) + (p.trace ? 0.06 * (1 - lift) : 0);
        puff(bx, by, R * p.r * 1.3, fogCol, a, 0.55);
      }
      // the two lovers
      const danceR = W * lerp(0.13, 0.06, smooth(LINE, LINE * 2, t));   // they draw close on line 2
      const w = t * 0.9;
      const cx = W * 0.38, cy = H * 0.57;
      lovers.forEach((cloud, j) => {
        const sgn = j ? 1 : -1;
        const ang = w + (j ? Math.PI : 0);
        let x = cx + Math.cos(ang) * danceR * (1 - lift);
        let y = cy + Math.sin(ang) * danceR * 0.35 * (1 - lift);
        // lifted away and pulled apart
        x += sgn * lift * W * 0.26;
        y -= lift * H * 0.36;
        const shiver = seethe * Math.sin(t * 20 + j) * 1.5;
        for (const p of cloud) {
          const spread = 1 + lift * 1.6;
          const px = x + shiver + p.ox * R * spread + Math.sin(t * p.sp + p.ph) * R * 0.12 + p.drift * lift * W * 0.06;
          const py = y + p.oy * R * spread - lift * H * 0.18 * p.rise + Math.cos(t * p.sp * 0.8 + p.ph) * R * 0.08;
          const keep = p.trace ? 0.75 : 0.12;
          const a = 0.5 * (1 - lift * (1 - keep));
          puff(px, py, R * p.r * (1 + lift * 0.4), fogCol, a, 1 + lift * 0.9);
        }
      });

      // morning light shafts once the sun is up
      if (sunT > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 5; i++) {
          const a0 = 1.85 + i * 0.16 + Math.sin(t * 0.2 + i) * 0.02;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(a0) * W, sy + Math.sin(a0) * W);
          ctx.lineTo(sx + Math.cos(a0 + 0.05) * W, sy + Math.sin(a0 + 0.05) * W);
          ctx.closePath();
          ctx.fillStyle = rgba(hex("#ffe9b8"), 0.035 * smooth(0.3, 1, sunT));
          ctx.fill();
        }
        ctx.restore();
      }

      // foreground slope and road
      fillUnder(x => roadY(x) + 3, rgba(at(P.hill, s)));
      ctx.strokeStyle = rgba(at(P.road, s));
      ctx.lineWidth = Math.max(2, W / 260);
      ctx.beginPath();
      for (let x = 0; x <= W + 8; x += 8) x === 0 ? ctx.moveTo(x, roadY(x)) : ctx.lineTo(x, roadY(x));
      ctx.stroke();

      rider(t, s);

      // the poem, one line per scene
      const i = Math.min(N - 1, Math.floor(t / LINE));
      const local = t - i * LINE;
      const fadeIn = smooth(0.15, 0.9, local);
      const fadeOut = i === N - 1 ? 1 : 1 - smooth(LINE - 0.6, LINE - 0.05, local);
      const a = fadeIn * fadeOut;
      const fs = Math.max(15, W / 30);
      ctx.font = `italic ${fs}px "EB Garamond", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = fs * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
      ctx.fillText(lines[i], W / 2, H * 0.14 + (1 - fadeIn) * 6);
      ctx.shadowBlur = 0;
    }

    // ---------- playback ----------
    let start = null, raf = null, done = false;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frame(now) {
      if (start === null) start = now;
      const t = (now - start) / 1000;
      draw(Math.min(t, END + 0.01));
      if (t >= TOTAL) { done = true; el.classList.add("anim-done"); raf = null; return; }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      done = false; start = null; el.classList.remove("anim-done");
      if (!raf) raf = requestAnimationFrame(frame);
    }
    replay.addEventListener("click", play);

    resize();
    if (reduce) { draw(END); el.classList.add("anim-done"); }
    else {
      draw(0);
      if ("IntersectionObserver" in window) {
        let started = false;
        const io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting && !started) { started = true; play(); io.disconnect(); }
        }, { threshold: 0.3 });
        io.observe(el);
      } else play();
    }
    let lastW = W;
    window.addEventListener("resize", () => {
      if (el.clientWidth === lastW) return;
      lastW = el.clientWidth; resize();
      if (done || reduce) draw(END);
    });
  };
})();
