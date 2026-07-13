const startDate = new Date("2024-10-11T00:00:00");

const yearsEl = document.getElementById("years");
const monthsEl = document.getElementById("months");
const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");

function pad(n) {
  return String(n).padStart(2, "0");
}

function update() {
  const now = new Date();

  // Calculate full calendar months elapsed since startDate.
  let months = (now.getFullYear() - startDate.getFullYear()) * 12
             + (now.getMonth() - startDate.getMonth());

  // Anchor for the remainder: startDate shifted forward by `months` months.
  let anchor = new Date(startDate);
  anchor.setMonth(anchor.getMonth() + months);

  // If the anchor is still in the future (e.g. day-of-month or time hasn't
  // been reached yet this month), back off one month.
  if (anchor > now) {
    months -= 1;
    anchor = new Date(startDate);
    anchor.setMonth(anchor.getMonth() + months);
  }

  // Split total months into years + remaining months.
  const years = Math.floor(months / 12);
  const remMonths = months - years * 12;

  let diff = Math.max(0, now - anchor);

  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);

  yearsEl.textContent = years.toLocaleString();
  monthsEl.textContent = remMonths.toLocaleString();
  daysEl.textContent = days.toLocaleString();
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);
}

update();
setInterval(update, 1000);

/* ---------- Nyan Cat random flight paths + traced rainbow trail ---------- */
(function () {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const nyan = document.querySelector(".nyan");
  const trailSvg = document.querySelector(".trail");
  if (!nyan || !trailSvg) return;

  const bandsGroup = trailSvg.querySelector(".trail-bands");
  const centerPathEl = trailSvg.querySelector("#trail-center-path");

  const CAT_W = 120;
  const CAT_H = 70;
  const MARGIN = 20;

  // Trail anchor relative to the cat's top-left: back of the pop-tart body,
  // vertically centered on the body.
  const TRAIL_ANCHOR_X = 18;
  const TRAIL_ANCHOR_Y = 35;

  const BAND_COLORS = ["#ff0f0f", "#ff9a00", "#ffee00", "#33cc33", "#3399ff", "#9933ff"];
  const COLORS = BAND_COLORS.length;
  const BAND_H = 6;             // stroke width of each color band (px)
  const FADE_SEG = 16;          // opacity buckets per band (fade resolution)
  const TRAIL_FRACTION = 0.4;   // trail length as a fraction of viewport width
  const TRAIL_MIN = 220;        // trail length floor so mobile still shows something
  const trailMax = () => Math.max(TRAIL_MIN, window.innerWidth * TRAIL_FRACTION);
  const SAMPLE_MIN_DIST = 2;    // min px between recorded points
  const WAVE_AMP = 5;           // perpendicular wave amplitude (px)
  const WAVE_LEN = 60;          // wave wavelength along trail (px)
  const WAVE_SPEED = 6;         // wave phase speed (rad/s)

  // Fade curve: `u` runs 0 at the tail to 1 at the head (cat).
  // Match the old mask gradient: transparent 0..0.12, ramp to opaque by 0.55.
  function fadeAlpha(u) {
    const a = (u - 0.12) / (0.55 - 0.12);
    return a < 0 ? 0 : a > 1 ? 1 : a;
  }

  // Build FADE_SEG sub-paths per color band. Each has a fixed
  // stroke-opacity so the ribbon fades from tail (transparent) to head
  // (opaque) without needing an SVG mask.
  const SVG_NS = "http://www.w3.org/2000/svg";
  const bandPaths = []; // bandPaths[bandIdx] = [<path> × FADE_SEG]
  const segAlpha = Array.from({ length: FADE_SEG });
  for (let k = 0; k < FADE_SEG; k++) {
    segAlpha[k] = fadeAlpha((k + 0.5) / FADE_SEG);
  }
  for (let b = 0; b < COLORS; b++) {
    const list = [];
    for (let k = 0; k < FADE_SEG; k++) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("class", "band");
      p.setAttribute("stroke", BAND_COLORS[b]);
      p.setAttribute("stroke-opacity", segAlpha[k].toFixed(3));
      p.setAttribute("d", "");
      bandsGroup.appendChild(p);
      list.push(p);
    }
    bandPaths.push(list);
  }

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function pickPath() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const topBound = MARGIN;
    const bottomBound = Math.max(topBound + 40, vh - CAT_H - MARGIN);
    const range = bottomBound - topBound;

    const type = pick([
      "straight", "straight",
      "diagonal",
      "sine", "sine",
      "arch", "arch",
    ]);

    const path = {
      type,
      vw,
      startY: topBound + Math.random() * range,
      endY: 0,
      durationMs: rand(6000, 11000),
      topBound,
      bottomBound,
    };

    if (type === "diagonal") {
      path.endY = topBound + Math.random() * range;
    } else {
      path.endY = path.startY;
    }

    if (type === "arch") {
      path.amplitude = rand(120, Math.min(260, range * 0.7));
      path.archDir = Math.random() < 0.5 ? -1 : 1;
    } else if (type === "sine") {
      path.amplitude = rand(40, Math.min(110, range * 0.35));
      path.cycles = pick([1, 1.5, 2, 2.5, 3]);
      path.phase = Math.random() * Math.PI * 2;
    }

    return path;
  }

  function positionAt(path, t) {
    const totalX = path.vw + 2 * CAT_W;
    const x = -CAT_W + t * totalX;

    const baseY = path.startY + (path.endY - path.startY) * t;
    let y = baseY;

    if (path.type === "arch") {
      const bump = 4 * t * (1 - t);
      y = baseY + path.archDir * path.amplitude * bump;
    } else if (path.type === "sine") {
      y = baseY + path.amplitude * Math.sin(path.phase + t * Math.PI * 2 * path.cycles);
    }

    const minY = path.topBound;
    const maxY = path.bottomBound;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;

    return { x, y };
  }

  // ----- Trail state -----
  // Points are ordered oldest → newest; the last point sits at the cat.
  let trailPoints = [];

  function resetTrail() {
    trailPoints = [];
    for (let b = 0; b < COLORS; b++) {
      for (let k = 0; k < FADE_SEG; k++) {
        bandPaths[b][k].setAttribute("d", "");
      }
    }
    centerPathEl.setAttribute("d", "M0 0");
  }

  function pushTrailPoint(catX, catY) {
    const p = {
      x: catX + TRAIL_ANCHOR_X,
      y: catY + TRAIL_ANCHOR_Y,
    };

    const last = trailPoints[trailPoints.length - 1];
    if (!last) {
      trailPoints.push(p);
    } else {
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      if (Math.hypot(dx, dy) >= SAMPLE_MIN_DIST) {
        trailPoints.push(p);
      } else {
        // Not far enough to be a new sample — nudge the head so the
        // trail stays glued to the cat between samples.
        last.x = p.x;
        last.y = p.y;
      }
    }

    // Trim from the tail so total arc-length ≤ trailMax().
    const maxLen = trailMax();
    let acc = 0;
    let cutIdx = 0;
    for (let i = trailPoints.length - 1; i > 0; i--) {
      const a = trailPoints[i];
      const b = trailPoints[i - 1];
      acc += Math.hypot(a.x - b.x, a.y - b.y);
      if (acc > maxLen) {
        cutIdx = i;
        break;
      }
    }
    if (cutIdx > 0) trailPoints.splice(0, cutIdx);
  }

  function renderTrail(nowMs) {
    const n = trailPoints.length;
    if (n < 2) {
      for (let b = 0; b < COLORS; b++) {
        for (let k = 0; k < FADE_SEG; k++) {
          bandPaths[b][k].setAttribute("d", "");
        }
      }
      centerPathEl.setAttribute("d", "M0 0");
      return;
    }

    // Arc length from the head (cat) backwards for each point.
    const arc = Array.from({ length: n });
    arc[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
      const a = trailPoints[i];
      const b = trailPoints[i + 1];
      arc[i] = arc[i + 1] + Math.hypot(b.x - a.x, b.y - a.y);
    }
    const L = arc[0] || 1;

    // Unit normal at each point (perpendicular to local tangent).
    const nx = Array.from({ length: n });
    const ny = Array.from({ length: n });
    for (let i = 0; i < n; i++) {
      const iPrev = Math.max(0, i - 1);
      const iNext = Math.min(n - 1, i + 1);
      let tx = trailPoints[iNext].x - trailPoints[iPrev].x;
      let ty = trailPoints[iNext].y - trailPoints[iPrev].y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      nx[i] = -ty;
      ny[i] = tx;
    }

    const k = (Math.PI * 2) / WAVE_LEN;
    const wt = (nowMs / 1000) * WAVE_SPEED;

    // Wobble offset (shared by every band) so the whole ribbon undulates.
    const wave = Array.from({ length: n });
    for (let i = 0; i < n; i++) {
      wave[i] = WAVE_AMP * Math.sin(k * arc[i] - wt);
    }

    // Bucket each segment (i → i+1) into a FADE_SEG index by its midpoint's
    // position along the trail. `u = 1 - arc/L` runs 0 at tail to 1 at head.
    const segBucket = Array.from({ length: n - 1 });
    for (let i = 0; i < n - 1; i++) {
      const uMid = 1 - (arc[i] + arc[i + 1]) * 0.5 / L;
      let bucket = Math.floor(uMid * FADE_SEG);
      if (bucket < 0) bucket = 0;
      else if (bucket >= FADE_SEG) bucket = FADE_SEG - 1;
      segBucket[i] = bucket;
    }

    // Build one polyline per (band, opacity bucket).
    const bandDs = Array.from({ length: FADE_SEG });
    const bandPrev = Array.from({ length: FADE_SEG });
    for (let b = 0; b < COLORS; b++) {
      const bandOffset = (b - (COLORS - 1) / 2) * BAND_H;
      for (let k2 = 0; k2 < FADE_SEG; k2++) {
        bandDs[k2] = "";
        bandPrev[k2] = -2;
      }
      for (let i = 0; i < n - 1; i++) {
        const bucket = segBucket[i];
        const off_i  = bandOffset + wave[i];
        const off_i1 = bandOffset + wave[i + 1];
        const x_i  = trailPoints[i].x     + nx[i]     * off_i;
        const y_i  = trailPoints[i].y     + ny[i]     * off_i;
        const x_i1 = trailPoints[i + 1].x + nx[i + 1] * off_i1;
        const y_i1 = trailPoints[i + 1].y + ny[i + 1] * off_i1;

        if (bandPrev[bucket] === i - 1) {
          bandDs[bucket] += "L" + x_i1.toFixed(1) + " " + y_i1.toFixed(1) + " ";
        } else {
          bandDs[bucket] +=
            "M" + x_i.toFixed(1)  + " " + y_i.toFixed(1)  + " " +
            "L" + x_i1.toFixed(1) + " " + y_i1.toFixed(1) + " ";
        }
        bandPrev[bucket] = i;
      }
      for (let k2 = 0; k2 < FADE_SEG; k2++) {
        bandPaths[b][k2].setAttribute("d", bandDs[k2]);
      }
    }

    // Center-line path drives the textPath.
    let td = "";
    for (let i = 0; i < n; i++) {
      td += (i === 0 ? "M" : "L") + trailPoints[i].x.toFixed(1) + " " + trailPoints[i].y.toFixed(1);
      if (i < n - 1) td += " ";
    }
    centerPathEl.setAttribute("d", td);
  }

  function runPath(path) {
    return new Promise((resolve) => {
      resetTrail();
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / path.durationMs);
        const { x, y } = positionAt(path, t);
        nyan.style.top = y + "px";
        nyan.style.transform = `translateX(${x}px)`;

        pushTrailPoint(x, y);
        renderTrail(now);

        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  // After the cat crosses the finish line, keep flying it in a straight
  // line off the right side of the viewport so the rainbow trail behind
  // it also drains fully off-screen before the next run begins.
  function drainTrail(path) {
    return new Promise((resolve) => {
      // Match the horizontal speed the cat had during the run so the
      // hand-off is seamless.
      const speedX = (path.vw + 2 * CAT_W) / (path.durationMs / 1000);
      const end = positionAt(path, 1);
      let x = end.x;
      const y = end.y;
      let lastNow = performance.now();

      function tick(now) {
        const dt = Math.min(0.05, (now - lastNow) / 1000);
        lastNow = now;
        x += speedX * dt;

        nyan.style.top = y + "px";
        nyan.style.transform = `translateX(${x}px)`;

        pushTrailPoint(x, y);
        renderTrail(now);

        // Done once the oldest trail point has exited the viewport
        // (or the trail has been fully trimmed away).
        const vw = window.innerWidth;
        const drained =
          trailPoints.length === 0 ||
          trailPoints[0].x > vw + 20;

        if (!drained) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  async function loop() {
    nyan.style.transform = "translateX(-9999px)";
    while (true) {
      const path = pickPath();
      await runPath(path);
      await drainTrail(path);
      resetTrail();
      nyan.style.transform = "translateX(-9999px)";
      await new Promise((r) => setTimeout(r, rand(300, 900)));
    }
  }

  loop();
})();

/* ---------- "Are you Lúcia?" dialog flow ---------- */
(function () {
  const SESSION_KEY = "quitDialogShown";
  if (sessionStorage.getItem(SESSION_KEY)) return;

  const dialogOverlay = document.getElementById("dialog-overlay");
  const dialogQuestion = document.getElementById("dialog-question");
  const yesBtn = document.getElementById("dialog-yes");
  const noBtn = document.getElementById("dialog-no");

  const celebrateOverlay = document.getElementById("celebrate-overlay");
  const celebrateClose = document.getElementById("celebrate-close");
  const fireworksCanvas = document.getElementById("fireworks-canvas");

  const shiaOverlay = document.getElementById("shia-overlay");
  const shiaClose = document.getElementById("shia-close");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lastFocused = null;

  function showOverlay(el, focusEl) {
    lastFocused = document.activeElement;
    el.classList.add("visible");
    el.removeAttribute("inert");
    if (focusEl) {
      // Defer to allow transition/paint.
      setTimeout(() => focusEl.focus(), 30);
    }
  }

  function hideOverlay(el) {
    el.classList.remove("visible");
    el.setAttribute("inert", "");
    if (lastFocused && typeof lastFocused.focus === "function") {
      try { lastFocused.focus(); } catch { /* ignore */ }
    }
  }

  function markShown() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  }

  // Question nodes
  const questions = {
    q1: {
      text: "Are you L\u00facia?",
      yes: () => showQuestion("q2"),
      no:  () => showQuestion("q3"),
    },
    q2: {
      text: "Have you quit yet?",
      yes: () => { hideOverlay(dialogOverlay); celebrate(); markShown(); },
      no:  () => { hideOverlay(dialogOverlay); shia();      markShown(); },
    },
    q3: {
      text: "Can you ask her to quit?",
      yes: () => { hideOverlay(dialogOverlay); celebrate(); markShown(); },
      no:  () => { hideOverlay(dialogOverlay); markShown(); },
    },
  };

  let currentNode = null;

  function showQuestion(key) {
    const node = questions[key];
    if (!node) return;
    currentNode = node;
    dialogQuestion.textContent = node.text;
    // Only open the overlay the first time; subsequent question changes
    // just swap text while it's already visible.
    if (!dialogOverlay.classList.contains("visible")) {
      showOverlay(dialogOverlay, yesBtn);
    } else {
      setTimeout(() => yesBtn.focus(), 0);
    }
  }

  yesBtn.addEventListener("click", () => currentNode && currentNode.yes());
  noBtn.addEventListener("click",  () => currentNode && currentNode.no());

  // Escape key: acts as "No" (safe default — cancel / decline).
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (dialogOverlay.classList.contains("visible")) {
      currentNode?.no();
    } else if (celebrateOverlay.classList.contains("visible")) {
      closeCelebrate();
    } else if (shiaOverlay.classList.contains("visible")) {
      hideOverlay(shiaOverlay);
    }
  });

  // ----- Shia branch -----
  function shia() {
    // Best-effort background tab: open in new tab then try to keep focus.
    try {
      const w = window.open("https://www.indeed.com", "_blank");
      if (w) {
        // Some browsers respect this and re-focus the opener; most do not.
        try { window.focus(); } catch { /* ignore */ }
        try { w.blur(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    showOverlay(shiaOverlay, shiaClose);
  }

  shiaClose.addEventListener("click", () => hideOverlay(shiaOverlay));
  shiaOverlay.addEventListener("click", (e) => {
    if (e.target === shiaOverlay) hideOverlay(shiaOverlay);
  });

  // ----- Celebrate branch (fireworks) -----
  const FIREWORK_COLORS = ["#ff0f0f", "#ff9a00", "#ffee00", "#33cc33", "#3399ff", "#9933ff", "#ff3b8a"];
  let fireworksRunning = false;
  let fireworksRaf = 0;
  let fireworksParticles = [];
  let fireworksLastSpawn = 0;
  let fireworksCtx = null;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    fireworksCanvas.width = window.innerWidth * dpr;
    fireworksCanvas.height = window.innerHeight * dpr;
    fireworksCanvas.style.width = window.innerWidth + "px";
    fireworksCanvas.style.height = window.innerHeight + "px";
    if (fireworksCtx) fireworksCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnFirework() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw * (0.15 + Math.random() * 0.7);
    const cy = vh * (0.15 + Math.random() * 0.45);
    const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
    const count = 50 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
      const speed = 2 + Math.random() * 4;
      fireworksParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }
  }

  function fireworksTick(now) {
    if (!fireworksRunning) return;
    const ctx = fireworksCtx;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Trail fade
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, vw, vh);

    if (now - fireworksLastSpawn > 550) {
      spawnFirework();
      fireworksLastSpawn = now;
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = fireworksParticles.length - 1; i >= 0; i--) {
      const p = fireworksParticles[i];
      p.life += 1;
      p.vy += 0.05; // gravity
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (alpha <= 0) {
        fireworksParticles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    fireworksRaf = requestAnimationFrame(fireworksTick);
  }

  function startFireworks() {
    if (prefersReduced) return;
    if (!fireworksCtx) fireworksCtx = fireworksCanvas.getContext("2d");
    resizeCanvas();
    fireworksParticles = [];
    fireworksLastSpawn = 0;
    fireworksRunning = true;
    fireworksRaf = requestAnimationFrame(fireworksTick);
  }

  function stopFireworks() {
    fireworksRunning = false;
    if (fireworksRaf) cancelAnimationFrame(fireworksRaf);
    fireworksRaf = 0;
    fireworksParticles = [];
    if (fireworksCtx) {
      fireworksCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function celebrate() {
    showOverlay(celebrateOverlay, celebrateClose);
    startFireworks();
  }

  function closeCelebrate() {
    stopFireworks();
    hideOverlay(celebrateOverlay);
  }

  celebrateClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeCelebrate();
  });
  celebrateOverlay.addEventListener("click", () => closeCelebrate());

  window.addEventListener("resize", () => {
    if (fireworksRunning) resizeCanvas();
  });

  // Kick off the flow one second after load.
  setTimeout(() => showQuestion("q1"), 1000);
})();
