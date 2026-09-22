/* ==========================================================================
   Neon city - one fixed canvas behind every section.
   Towers are painted once (three depth layers); each frame composites them and
   animates the highway (you travel forward with time AND scroll), lamps,
   traffic, light ribbons, windows, billboards and stars. The sky, horizon and
   moon shift with scroll so each section is its own district.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = matchMedia("(max-width: 760px)").matches;
  var cv = document.createElement("canvas");
  cv.id = "city-canvas"; cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d");
  if (!ctx) return;

  var PINK = "255,79,190", CYAN = "74,232,240", VIO = "150,90,255", CREAM = "255,236,170";
  var W, H, dpr, hy, hyB, layers = [], stars = [], cars = [], spr = {}, shoot = null, nextShoot = 8;
  var mx = 0, mxT = 0, pan = 0, t = 0, off = 0, lastSc = 0, running = false, last = 0, R = 22;

  function rng(s) { return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrap(v) { return ((v % R) + R) % R; }

  /* district per scroll position: pan, sky top rgb, haze rgb, horizon glow rgb, moon x, horizon y, moon y */
  var STOPS = [
    [0,   10, 3, 30,  64, 20, 120,  160, 70, 255,  .58, .72, .26],   /* home: violet highway, top right */
    [.25, 6, 4, 34,   28, 34, 130,  61, 123, 255,  .85, .78, .18],   /* what I do: open top right area */
    [.5,  14, 3, 36,  96, 20, 112,  255, 79, 190,  .88, .78, .28],   /* projects: open right side */
    [.75, 8, 4, 30,   26, 56, 124,  74, 232, 240,  .80, .76, .35],   /* experience: open mid right */
    [1,   10, 3, 30,  64, 20, 120,  160, 70, 255,  .60, .68, .26]    /* contact: center */
  ];
  function tint(p) {
    for (var i = 1; i < STOPS.length; i++) if (p <= STOPS[i][0] || i === STOPS.length - 1) {
      var a = STOPS[i - 1], b = STOPS[i], k = clamp((p - a[0]) / (b[0] - a[0]), 0, 1);
      return a.map(function (v, j) { return lerp(v, b[j], k); });
    }
  }
  function rgb(a, o, al) { return "rgba(" + (a[o] | 0) + "," + (a[o + 1] | 0) + "," + (a[o + 2] | 0) + "," + al + ")"; }

  function glow(c) {
    if (spr[c]) return spr[c];
    var s = document.createElement("canvas"); s.width = s.height = 64;
    var g = s.getContext("2d"), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(" + c + ",1)"); r.addColorStop(.3, "rgba(" + c + ",.4)"); r.addColorStop(1, "rgba(" + c + ",0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    return (spr[c] = s);
  }
  function lamp(c, x, y, r, a, sy) {
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.drawImage(glow(c), x - r, y - r * (sy || 1), r * 2, r * 2 * (sy || 1));
  }

  /* ---- towers, painted once -------------------------------------------- */
  var SPEC = [
    { zoom: .04, shift: 6,  step: 9,  win: 2.2, edge: 1,   glow: 4,  alpha: .62, fog: .5 },
    { zoom: .10, shift: 16, step: 13, win: 3.4, edge: 1.6, glow: 8,  alpha: 1,   fog: .18 },
    { zoom: .24, shift: 34, step: 20, win: 5.5, edge: 2.6, glow: 14, alpha: 1,   fog: 0 }
  ];
  var FILL = { pink: ["#FF6AD5", "#7A2FE8"], cyan: ["#2A55F0", "#0C1470"], dark: ["#2A1070", "#0C0530"], teal: ["#12A7A0", "#0B2B66"], violet: ["#6A35E6", "#2B0E80"] };
  var EDGE = { pink: CYAN, cyan: "130,240,255", dark: PINK, teal: "120,255,230", violet: PINK };
  var BAR = [PINK, CYAN, "255,170,90", "120,150,255"];

  function tower(g, x, y, w, bot, st, sp, r, dyn) {
    var h = bot - y, gr = g.createLinearGradient(0, y, 0, y + h * .7);
    gr.addColorStop(0, FILL[st][0]); gr.addColorStop(1, FILL[st][1]);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(8,2,30,.3)"; g.fillRect(x + w * .64, y, w * .36, h);
    g.save(); g.shadowColor = "rgba(" + EDGE[st] + ",.9)"; g.shadowBlur = sp.glow;
    g.fillStyle = "rgba(" + EDGE[st] + ",.95)"; g.fillRect(x, y, sp.edge, h); g.fillRect(x, y, w, sp.edge); g.restore();
    var lim = Math.min(h, H * .62), i, j, c;
    if (st === "pink") {
      var n = Math.max(3, Math.floor(w / (sp.step * 1.1))), cw = w / n;
      for (i = 0; i < n; i++) { g.fillStyle = "rgba(255,240,190,.88)"; g.fillRect(x + cw * (i + .32), y + sp.step, cw * .3, lim * (.4 + r() * .3)); }
      g.save(); g.shadowColor = "#FFD86B"; g.shadowBlur = sp.glow; g.fillStyle = "#FFD86B"; g.fillRect(x + w * .2, y - sp.step * .5, w * .6, sp.step * .5); g.restore();
    } else if (st === "cyan") {
      var cs = sp.step * 1.7; g.strokeStyle = "rgba(140,235,255,.3)"; g.lineWidth = 1; g.beginPath();
      for (j = y + cs; j < y + lim; j += cs) for (i = x; i < x + w - cs + 1; i += cs) { g.moveTo(i, j - cs); g.lineTo(i + cs, j); g.moveTo(i + cs, j - cs); g.lineTo(i, j); }
      g.stroke();
    } else if (st === "dark") {
      for (j = y + sp.step; j < y + lim; j += sp.step * 1.3) if (r() < .6) {
        c = BAR[(r() * 4) | 0]; g.fillStyle = "rgba(" + c + ",.85)";
        g.fillRect(x + w * r() * .35 + 3, j, w * (.25 + r() * .5), 2 + sp.win * .45);
      }
    } else {
      var cols = Math.max(2, Math.floor(w / sp.step)), gx = x + (w - cols * sp.step) / 2 + (sp.step - sp.win) / 2;
      for (i = 0; i < cols; i++) for (j = 1; j < lim / sp.step; j++) if (r() < .3) {
        c = r() > .6 ? CREAM : r() > .5 ? CYAN : PINK; g.fillStyle = "rgba(" + c + "," + (.35 + r() * .5).toFixed(2) + ")";
        g.fillRect(gx + i * sp.step, y + j * sp.step, sp.win, sp.win * 1.3);
      }
    }
    /* things that will flicker on their own schedule */
    for (i = 0; i < Math.min(6, w / sp.step) && dyn.length < (small ? 50 : 110); i++) {
      dyn.push({ k: 0, x: x + sp.step * (.5 + r() * (w / sp.step - 1)), y: y + sp.step * (1 + r() * (lim / sp.step - 2)), w: sp.win, h: sp.win * 1.3, ph: r() * 6.28, rate: .1 + r() * .3, c: r() > .5 ? CYAN : r() > .5 ? PINK : CREAM });
    }
    if (r() > .55) dyn.push({ k: 1, x: x + w * (.1 + r() * .4), y: y + lim * (.12 + r() * .5), w: w * (.28 + r() * .3), h: sp.win * 1.4, ph: r() * 6.28, c: r() > .5 ? PINK : CYAN });
  }

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    W = innerWidth; H = innerHeight; hyB = H * .74;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
    var k = small ? .55 : 1, styles = ["dark", "pink", "cyan", "violet", "teal"];
    layers = SPEC.map(function (sp, li) {
      var lw = W + sp.shift * 2 + 40, r = rng(21 + li * 41), dyn = [], LH = H * 1.15;
      var c = document.createElement("canvas"); c.width = lw * dpr; c.height = LH * dpr;
      var g = c.getContext("2d"); g.scale(dpr, dpr);
      var x, w, h, si = 0;
      if (li < 2) {
        var a = li ? .2 : -10, b = li ? .8 : 1;
        for (x = lw * a; x < lw * b;) {
          w = (li ? 44 : 26) * k + r() * (li ? 50 : 34) * k; h = H * (li ? .16 + r() * .32 : .1 + r() * .18);
          tower(g, x, hyB - h, w, LH, styles[(r() * 5) | 0], sp, r, dyn); x += w + r() * 4;
        }
      } else {
        [[-10, .22, ["dark", "pink", "cyan"]], [.78, 1.02, ["cyan", "violet", "pink"]]].forEach(function (grp) {
          for (x = lw * grp[0]; x < lw * grp[1];) {
            w = (90 + r() * 80) * k; h = H * (.5 + r() * .45);
            tower(g, x, hyB - h, w, LH, grp[2][si++ % 3], sp, r, dyn); x += w * .8;
          }
        });
      }
      if (sp.fog) {
        g.globalCompositeOperation = "source-atop";
        var f = g.createLinearGradient(0, hyB - H * .5, 0, hyB); f.addColorStop(0, "rgba(110,50,210," + sp.fog * .6 + ")"); f.addColorStop(1, "rgba(160,90,240," + sp.fog + ")");
        g.fillStyle = f; g.fillRect(0, 0, lw, LH);
      }
      return { c: c, sp: sp, lw: lw, LH: LH, dyn: dyn };
    });
    var r2 = rng(9); stars = [];
    for (var i = 0; i < (small ? 90 : 220); i++) {
      var q = r2(); stars.push({ x: r2() * W, y: r2() * H * .62, s: .6 + r2() * 1.3, ph: r2() * 6.28, sp: .4 + r2() * 1.6, c: q < .3 ? "255,255,255" : q < .55 ? "190,120,255" : q < .78 ? PINK : CYAN });
    }
    cars = [];
    for (i = 0; i < (small ? 5 : 10); i++) { var cc = {}; spawn(cc, true); cars.push(cc); }
  }

  /* the highway: lane offset u, distance d (small = near). y grows toward the camera */
  function P(u, d) { var k = 1 / d; return { x: W / 2 + u * W * .62 * k, y: hy + (H - hy) * k, k: k }; }
  function quad(a, b, c, d, f) { ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); }
  function spawn(c, first) {
    c.dir = Math.random() < .5 ? 1 : -1; c.u = c.dir * (Math.random() < .5 ? .24 : .72);
    c.d = first ? 2 + Math.random() * 16 : (c.dir > 0 ? R - 1 : 1.2); c.v = .8 + Math.random() * 1.6;
  }

  function barrier(s, hb) {
    var dn = .55, df = 26, u = s * 1.04;
    function B(d, f) { var p = P(u, d); return { x: p.x, y: p.y - hb * p.k * f }; }
    var wall = ctx.createLinearGradient(0, hy, 0, H); wall.addColorStop(0, "rgba(44,16,120,.95)"); wall.addColorStop(1, "rgba(24,8,70,.98)");
    quad(B(dn, 0), B(dn, 1), B(df, 1), B(df, 0), wall);
    ctx.globalCompositeOperation = "lighter";
    var mid = s < 0 ? PINK : CYAN;
    quad(B(dn, .55), B(dn, 1.3), B(df, 1.3), B(df, .55), "rgba(" + CYAN + ",.1)");
    quad(B(dn, .9), B(dn, 1), B(df, 1), B(df, .9), "rgba(" + CYAN + ",.95)");
    quad(B(dn, .36), B(dn, .44), B(df, .36), B(df, .44), "rgba(" + mid + ",.85)");
    ctx.strokeStyle = "rgba(200,170,255,.5)";
    for (var i = 0; i < 16; i++) {
      var d = wrap(i * 1.4 - off) + .55, a = B(d, 0), b = B(d, 1);
      ctx.lineWidth = 1 + 3 * a.k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function lamps(hb) {
    var L = [], n = small ? 5 : 8, i, s;
    for (i = 0; i < n; i++) for (s = -1; s <= 1; s += 2) L.push({ s: s, d: wrap(i * (R / n) - off * 1) + .8, i: i });
    L.sort(function (a, b) { return b.d - a.d; });
    L.forEach(function (l) {
      var p = P(l.s * 1.04, l.d), k = p.k, bx = p.x, by = p.y - hb * k, top = by - H * .3 * k;
      var nx = bx - l.s * W * .1 * k, ny = top + H * .02 * k, fade = clamp((R - l.d) / 6, 0, 1);
      ctx.globalAlpha = fade; ctx.strokeStyle = "#1B0B45"; ctx.lineWidth = 2 + 4 * k;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, top); ctx.quadraticCurveTo(bx - l.s * W * .03 * k, top - H * .05 * k, nx, ny); ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      lamp(CYAN, nx, ny, 22 + 90 * k, (.55 + .15 * Math.sin(t * 2 + l.i * 1.7)) * fade);
      ctx.globalAlpha = fade; ctx.fillStyle = "#DFFCFF"; ctx.beginPath(); ctx.ellipse(nx, ny, 4 + 16 * k, 1.5 + 5 * k, 0, 0, 6.3); ctx.fill();
      lamp(CYAN, nx + l.s * -W * .02 * k, P(l.s * .6, l.d).y, 20 + 70 * k, .18 * fade, .35);
      ctx.globalCompositeOperation = "source-over";
    });
    ctx.globalAlpha = 1;
  }

  /* flowing light ribbons: [points as fractions of W,H], colour, width, speed */
  var RIBS = [
    [[[-.05, .92], [.2, .66], [.42, .88], [.5, .72]], CYAN, 26, .10],
    [[[-.05, .8], [.25, .58], [.45, .82], [.51, .72]], "120,255,235", 13, .14],
    [[[-.05, .97], [.3, .8], [.44, .92], [.5, .73]], PINK, 10, .09],
    [[[1.05, .84], [.8, .66], [.62, .86], [.5, .72]], CYAN, 24, .12],
    [[[1.05, .72], [.78, .6], [.6, .76], [.51, .72]], VIO, 13, .10],
    [[[1.05, .94], [.75, .84], [.6, .92], [.5, .74]], PINK, 9, .13],
    [[[-.05, .3], [.3, .16], [.62, .5], [1.05, .36]], VIO, 6, .07]
  ];
  function ribbons() {
    var use = small ? [0, 3, 2, 5] : [0, 1, 2, 3, 4, 5, 6], n = small ? 18 : 44;
    ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt";
    use.forEach(function (ri, q) {
      var R0 = RIBS[ri], p = R0[0].map(function (a, i) {
        return [a[0] * W + (i > 0 && i < 3 ? Math.sin(t * .5 + q + i) * W * .012 : 0), hy + (a[1] - .72) * H + (i > 0 && i < 3 ? Math.cos(t * .4 + q) * H * .015 : 0)];
      }), px, py, j, s, u, x, y, al;
      for (j = 0; j <= n; j++) {
        s = j / n; u = 1 - s;
        x = u * u * u * p[0][0] + 3 * u * u * s * p[1][0] + 3 * u * s * s * p[2][0] + s * s * s * p[3][0];
        y = u * u * u * p[0][1] + 3 * u * u * s * p[1][1] + 3 * u * s * s * p[2][1] + s * s * s * p[3][1];
        if (j) {
          al = .5 + .5 * Math.sin(s * 9 - t * R0[3] * 14 + q * 2);
          var wd = R0[2] * Math.pow(1 - s, 1.3) * (.4 + .6 * al) + .6;
          ctx.strokeStyle = "rgba(" + R0[1] + "," + (.1 + .12 * al) + ")"; ctx.lineWidth = wd * 2.4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          ctx.strokeStyle = "rgba(" + R0[1] + "," + (.25 + .5 * al) * (1 - s * .5) + ")"; ctx.lineWidth = wd; ctx.lineCap = "butt";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
        }
        px = x; py = y;
      }
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    var S = tint(pan), i, d, a, L, j;
    hy = H * S[11];
    var sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, rgb(S, 1, 1)); sky.addColorStop(1, rgb(S, 4, 1));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    for (i = 0; i < stars.length; i++) {
      d = stars[i]; ctx.globalAlpha = reduce ? .6 : .25 + .6 * (.5 + .5 * Math.sin(t * d.sp + d.ph));
      ctx.fillStyle = "rgb(" + d.c + ")"; ctx.fillRect(d.x + mx * d.s * 3, d.y - pan * 12, d.s, d.s);
    }
    if (!reduce) sparks(dt);

    /* the moon */
    var mr = Math.max(46, Math.min(W, H) * .11), mX = W * S[10], mY = H * S[12] - pan * 10;
    ctx.globalCompositeOperation = "lighter";
    lamp("150,90,255", mX, mY, mr * 4.4, 0.95); lamp("255,110,210", mX, mY, mr * 2.6, 0.6);
    lamp("110,60,255", mX, mY, mr * 6.5, 0.4);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    var mg = ctx.createRadialGradient(mX - mr * .2, mY - mr * .2, 0, mX, mY, mr);
    mg.addColorStop(0, "#FFFFFF"); mg.addColorStop(0.4, "#FFFBE0"); mg.addColorStop(1, "#FFDD80");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mX, mY, mr, 0, 6.3); ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    var bl = ctx.createRadialGradient(W / 2, hy, 0, W / 2, hy, W * .6);
    bl.addColorStop(0, rgb(S, 7, .32)); bl.addColorStop(1, rgb(S, 7, 0));
    ctx.fillStyle = bl; ctx.fillRect(0, hy - H * .55, W, H * .55 + 60);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;

    for (i = 0; i < layers.length; i++) {
      L = layers[i]; ctx.save(); ctx.globalAlpha = L.sp.alpha;
      ctx.translate(W / 2 - mx * L.sp.shift, hy);
      var sc = 1 + pan * L.sp.zoom; ctx.scale(sc, sc); ctx.translate(-L.lw / 2, -hyB);
      ctx.drawImage(L.c, 0, 0, L.lw, L.LH);
      ctx.globalCompositeOperation = "lighter";
      for (j = 0; j < L.dyn.length; j++) {
        d = L.dyn[j];
        if (d.k === 0) a = reduce ? .5 : clamp((Math.sin(t * d.rate + d.ph) - .45) * 3, 0, 1) * .8;
        else { a = .55 + .3 * Math.sin(t * 1.1 + d.ph); if (!reduce && Math.sin(t * 19 + d.ph * 7) > .97 && Math.sin(t * .6 + d.ph) > .8) a *= .2; }
        if (a > .02) {
          if (d.k) { ctx.fillStyle = "rgba(" + d.c + "," + (a * .18).toFixed(2) + ")"; ctx.fillRect(d.x - 3, d.y - 3, d.w + 6, d.h + 6); }
          ctx.fillStyle = "rgba(" + d.c + "," + a.toFixed(2) + ")"; ctx.fillRect(d.x, d.y, d.w, d.h);
        }
      }
      ctx.restore();
    }

    /* the road */
    var hb = H * .13, rd = ctx.createLinearGradient(0, hy, 0, H);
    rd.addColorStop(0, "#3A1C9A"); rd.addColorStop(.35, "#5A24C8"); rd.addColorStop(1, "#3B14A0");
    quad(P(-.98, .5), P(.98, .5), P(.98, 30), P(-.98, 30), rd);
    ctx.globalCompositeOperation = "lighter";
    lamp(CYAN, W / 2, hy + 6, W * .16, .5, .3); lamp(PINK, W * .36, hy + 22, W * .1, .16, .4); lamp(VIO, W * .64, hy + 22, W * .1, .2, .4);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    [-.95, .95].forEach(function (u) { quad(P(u - .006, .5), P(u + .006, .5), P(u + .006, 30), P(u - .006, 30), "rgba(255,255,255,.7)"); });
    [-.014, .014].forEach(function (u) { quad(P(u - .0025, .5), P(u + .0025, .5), P(u + .0025, 30), P(u - .0025, 30), "rgba(255,255,255,.9)"); });
    [-.48, .48].forEach(function (u) {
      for (i = 0; i < 18; i++) {
        d = wrap(i * 1.25 - off) + .55;
        quad(P(u - .012, d), P(u + .012, d), P(u + .012, d + .55), P(u - .012, d + .55), "rgba(255,255,255," + clamp(.25 + 3 / d, 0, .9).toFixed(2) + ")");
      }
    });

    if (!reduce) traffic(dt);
    barrier(-1, hb); barrier(1, hb); lamps(hb); ribbons();
    ctx.globalAlpha = 1;
  }

  function traffic(dt) {
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i]; c.d += c.dir * -c.v * dt * 0.5 * (c.d < 4 ? 1.6 : 1);
      if (c.d < 1 || c.d > R) { spawn(c, false); continue; }
      var p = P(c.u, c.d), sep = W * .035 * p.k + 1, r = 4 + 30 * p.k, head = c.dir > 0, col = head ? "225,250,255" : "255,50,130";
      var fd = clamp(Math.min(c.d - 1, R - c.d) / 3, 0, 1);
      lamp(col, p.x - sep, p.y, r, .95 * fd); lamp(col, p.x + sep, p.y, r, .95 * fd);
      lamp(col, p.x, p.y + 18 * p.k, r * 1.7, .14 * fd, 2.2);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function sparks(dt) {
    if (!shoot && t > nextShoot) shoot = { x: W * (.3 + Math.random() * .6), y: H * (.04 + Math.random() * .16), a: 0 };
    if (!shoot) return;
    shoot.a += dt / .8;
    var hx = shoot.x - shoot.a * 280, hyy = shoot.y + shoot.a * 120, g = ctx.createLinearGradient(hx, hyy, hx + 80, hyy - 34);
    g.addColorStop(0, "rgba(255,255,255," + (.9 * (1 - shoot.a)).toFixed(2) + ")"); g.addColorStop(1, "rgba(255,120,220,0)");
    ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hyy); ctx.lineTo(hx + 80, hyy - 34); ctx.stroke();
    if (shoot.a >= 1) { shoot = null; nextShoot = t + 20 + Math.random() * 25; }
  }

  /* ---- loop ------------------------------------------------------------ */
  function readPan() { var e = document.documentElement; return clamp(e.scrollTop / Math.max(1, e.scrollHeight - e.clientHeight), 0, 1); }
  function frame(now) {
    var dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    var sy = scrollY; off += dt * .2 + (sy - lastSc) * .006; lastSc = sy;
    pan += (readPan() - pan) * .08; mx += (mxT - mx) * .05;
    // skip painting while a project is open on top of the city
    if (!document.documentElement.classList.contains("is-viewing")) draw(dt);
    if (running) requestAnimationFrame(frame);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function still() { pan = readPan(); t = 4; off = 0; draw(0); }

  build();
  if (reduce) {
    still(); var q = false;
    addEventListener("scroll", function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; still(); }); }, { passive: true });
  } else {
    lastSc = scrollY; start();
    document.addEventListener("visibilitychange", function () { if (document.hidden) running = false; else start(); });
    if (matchMedia("(hover: hover)").matches) addEventListener("pointermove", function (e) { mxT = e.clientX / W * 2 - 1; }, { passive: true });
  }
  var rz, lw = innerWidth, lh = innerHeight;
  addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (innerWidth === lw && Math.abs(innerHeight - lh) < 140) return;
      lw = innerWidth; lh = innerHeight; build(); if (reduce) still();
    }, 200);
  });
})();
