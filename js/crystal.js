/* ============================================================
   CryFlow — Crystal Growth Canvas  (v2 – 震撼版)
   ============================================================ */

(function () {
  'use strict';

  var canvas = document.getElementById('crystalCanvas');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none'; return;
  }

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- palette ---------- */
  var COLORS = [
    { r: 107, g: 163, b: 190 },   // brand-blue
    { r: 140, g: 195, b: 220 },   // mid-blue
    { r: 168, g: 212, b: 230 },   // light-blue
    { r: 214, g: 236, b: 243 },   // ice
    { r: 201, g: 169, b: 110 },   // gold
  ];
  var COLOR_W = [0.30, 0.25, 0.22, 0.13, 0.10];

  function pickColor() {
    var r = Math.random(), s = 0;
    for (var i = 0; i < COLOR_W.length; i++) { s += COLOR_W[i]; if (r < s) return i; }
    return 0;
  }

  function rgba(ci, a) {
    var c = COLORS[ci];
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* ---------- config ---------- */
  var C = {
    seeds:        8,
    maxSegs:      5000,
    growPerFrame:  6,
    segLen:       8,
    hexDirs:      6,
    branchP:      0.12,
    jitter:       0.18,
    maxGen:       20,
    mainAlpha:    0.35,
    glowAlpha:    0.12,
    nodeAlpha:    0.55,
  };

  /* ---------- state ---------- */
  var W, H, segs, tips, total, frame, done, staticCanvas, needsStaticRedraw;

  function sizeCanvas() {
    var r = canvas.parentElement.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Off-screen canvas for "frozen" segments (performance)
    staticCanvas = document.createElement('canvas');
    staticCanvas.width  = W * dpr;
    staticCanvas.height = H * dpr;
    var sctx = staticCanvas.getContext('2d');
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    needsStaticRedraw = true;
  }

  function hexSnap(a) {
    var step = Math.PI * 2 / C.hexDirs;
    return Math.round(a / step) * step + (Math.random() - 0.5) * C.jitter * 2;
  }

  /* ---------- init ---------- */
  function init() {
    segs = []; tips = []; total = 0; frame = 0; done = false;

    // Staggered seeds — each has a "delay" so they don't all start at once
    for (var i = 0; i < C.seeds; i++) {
      var sx, sy;
      // Spread across screen, slight bias away from bottom-left text area
      if (i < 3) {
        // 3 seeds in center-right
        sx = W * (0.45 + Math.random() * 0.50);
        sy = H * (0.15 + Math.random() * 0.55);
      } else if (i < 6) {
        // 3 seeds spread wider
        sx = W * (0.15 + Math.random() * 0.75);
        sy = H * (0.05 + Math.random() * 0.80);
      } else {
        // 2 accent seeds near edges
        sx = Math.random() > 0.5 ? W * (0.85 + Math.random() * 0.15) : W * Math.random() * 0.2;
        sy = H * Math.random();
      }

      tips.push({
        x: sx, y: sy,
        angle: hexSnap(Math.random() * Math.PI * 2),
        ci: pickColor(),
        gen: 0,
        delay: Math.floor(i * 18),   // stagger: each seed starts ~18 frames later
        active: i === 0               // only first seed active immediately
      });
    }
  }

  /* ---------- grow ---------- */
  function grow() {
    // Activate delayed seeds
    for (var t = 0; t < tips.length; t++) {
      if (!tips[t].active && frame >= tips[t].delay) tips[t].active = true;
    }

    var newTips = [];
    var grew = 0;

    for (var i = 0; i < tips.length && grew < C.growPerFrame; i++) {
      var tip = tips[i];
      if (!tip.active || tip.dead) continue;

      var a = tip.angle;
      var len = C.segLen * (0.7 + Math.random() * 0.6);
      len *= Math.max(0.25, 1 - tip.gen * 0.035);

      var nx = tip.x + Math.cos(a) * len;
      var ny = tip.y + Math.sin(a) * len;

      if (nx < -30 || nx > W + 30 || ny < -30 || ny > H + 30) {
        tip.dead = true; continue;
      }

      var seg = {
        x1: tip.x, y1: tip.y, x2: nx, y2: ny,
        ci: tip.ci, gen: tip.gen, birth: frame,
        w: Math.max(0.6, 2.2 - tip.gen * 0.1),
        gw: Math.max(1.5, 6 - tip.gen * 0.3),
      };
      segs.push(seg);
      total++;
      grew++;

      tip.x = nx; tip.y = ny;
      tip.angle = hexSnap(a + (Math.random() - 0.5) * 0.35);

      // Branching
      if (Math.random() < C.branchP && tip.gen < C.maxGen) {
        var dir = (Math.random() > 0.5 ? 1 : -1);
        var ba = a + dir * (Math.PI / 3 + (Math.random() - 0.5) * 0.5);
        newTips.push({
          x: nx, y: ny,
          angle: hexSnap(ba),
          ci: Math.random() < 0.8 ? tip.ci : pickColor(),
          gen: tip.gen + 1,
          delay: 0, active: true
        });
        // Occasionally double-branch for symmetry
        if (Math.random() < 0.3) {
          newTips.push({
            x: nx, y: ny,
            angle: hexSnap(a - dir * (Math.PI / 3 + (Math.random() - 0.5) * 0.3)),
            ci: tip.ci,
            gen: tip.gen + 1,
            delay: 0, active: true
          });
        }
      }

      if (total >= C.maxSegs) { done = true; break; }
    }

    // Clean dead tips, add new
    tips = tips.filter(function (t) { return !t.dead; });
    for (var j = 0; j < newTips.length; j++) tips.push(newTips[j]);
    if (tips.length === 0) done = true;
  }

  /* ---------- draw ---------- */
  var FREEZE_AGE = 90; // after this many frames, segment is "frozen" into static layer

  function drawSeg(c, seg, alpha, glowA) {
    // Glow
    c.beginPath();
    c.moveTo(seg.x1, seg.y1);
    c.lineTo(seg.x2, seg.y2);
    c.strokeStyle = rgba(seg.ci, glowA);
    c.lineWidth = seg.gw;
    c.lineCap = 'round';
    c.stroke();

    // Core
    c.beginPath();
    c.moveTo(seg.x1, seg.y1);
    c.lineTo(seg.x2, seg.y2);
    c.strokeStyle = rgba(seg.ci, alpha);
    c.lineWidth = seg.w;
    c.lineCap = 'round';
    c.stroke();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Draw static (frozen) layer
    if (needsStaticRedraw) {
      var sctx = staticCanvas.getContext('2d');
      sctx.clearRect(0, 0, W, H);

      for (var s = 0; s < segs.length; s++) {
        var seg = segs[s];
        if (!seg.frozen) continue;
        drawSeg(sctx, seg, C.mainAlpha * seg.genFade, C.glowAlpha * seg.genFade);
      }
      needsStaticRedraw = false;
    }

    // Blit static layer
    ctx.drawImage(staticCanvas, 0, 0, W * dpr, H * dpr, 0, 0, W, H);

    // Draw active (recent) segments
    var frozeAny = false;

    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      if (seg.frozen) continue;

      var age = frame - seg.birth;
      var fadeIn = Math.min(age / 30, 1);
      var genFade = Math.max(0.2, 1 - seg.gen * 0.04);

      // Freeze old segments into static layer
      if (age > FREEZE_AGE) {
        seg.frozen = true;
        seg.genFade = genFade;
        frozeAny = true;
        continue;
      }

      var alpha = C.mainAlpha * fadeIn * genFade;
      var gAlpha = C.glowAlpha * fadeIn * genFade;

      drawSeg(ctx, seg, alpha, gAlpha);

      // Bright growth tip
      if (age < 12) {
        var tipBright = 0.7 * (1 - age / 12);
        ctx.beginPath();
        ctx.arc(seg.x2, seg.y2, 3 - seg.gen * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = rgba(seg.ci, tipBright);
        ctx.fill();

        // Bloom around tip
        ctx.beginPath();
        ctx.arc(seg.x2, seg.y2, 8 - seg.gen * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(seg.ci, tipBright * 0.15);
        ctx.fill();
      }

      // Junction nodes (where gen > 0 starts = a branch point)
      if (seg.gen > 0 && age < 20) {
        ctx.beginPath();
        ctx.arc(seg.x1, seg.y1, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(seg.ci, C.nodeAlpha * fadeIn * (1 - age / 20));
        ctx.fill();
      }
    }

    if (frozeAny) needsStaticRedraw = true;

    // After growth is done, add subtle shimmer to a few random nodes
    if (done) {
      var shimmerCount = 12;
      var t = frame * 0.02;
      for (var k = 0; k < shimmerCount; k++) {
        // Deterministic "random" index based on k
        var idx = Math.floor((k * 1234.567) % segs.length);
        var sh = segs[idx];
        var pulse = (Math.sin(t + k * 1.7) + 1) * 0.5; // 0..1
        ctx.beginPath();
        ctx.arc(sh.x2, sh.y2, 2 + pulse * 3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(sh.ci, 0.08 + pulse * 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sh.x2, sh.y2, 6 + pulse * 8, 0, Math.PI * 2);
        ctx.fillStyle = rgba(sh.ci, 0.02 + pulse * 0.04);
        ctx.fill();
      }
    }
  }

  /* ---------- loop ---------- */
  var rafId;

  function loop() {
    frame++;
    if (!done) grow();
    render();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    sizeCanvas();
    init();
    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  /* ---------- resize ---------- */
  var rTimer;
  window.addEventListener('resize', function () {
    clearTimeout(rTimer);
    rTimer = setTimeout(function () {
      sizeCanvas();
      needsStaticRedraw = true;
      // Re-freeze everything so static canvas is correct
      for (var i = 0; i < segs.length; i++) {
        if (segs[i].frozen) segs[i].genFade = segs[i].genFade || 0.5;
      }
      needsStaticRedraw = true;
    }, 250);
  });

  /* ---------- lifecycle ---------- */
  var hero = document.getElementById('hero');
  if (hero) {
    var obs = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { start(); obs.disconnect(); }
    }, { threshold: 0.05 });
    obs.observe(hero);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      if (!rafId) loop();
    }
  });

})();
