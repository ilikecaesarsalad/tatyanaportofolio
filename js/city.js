/* ==========================================================================
   Tatyana Faradilla R. - night-city finale + motion layer
   A one-point-perspective street canyon built as SVG at runtime: receding
   facades, a wet road, street lamps, signage and the skyline at the far end.
   Plus the scroll choreography, depth parallax and tilt behaviour.
   No dependencies.
   ========================================================================== */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var NS = "http://www.w3.org/2000/svg";

  /* ---- seeded random so the street is the same on every reload --------- */
  function rng(seed) {
    var s = seed || 1;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  /* ---- the shared perspective ------------------------------------------
     Everything is described as a fraction of the stage height (0 = street
     level, 1 = top of the stage) and then mapped into each layer's own
     viewBox, so all the planes agree on one vanishing point.             */
  var VP = 800;            /* vanishing point, x */
  var HORIZON = 0.22;      /* where the street meets the sky */
  var ROOF_EDGE = 1.38;    /* roofline height at the frame edge */

  function towardVP(x) { return Math.min(1, (x <= VP ? x : 1600 - x) / VP); }
  function baseF(x) { return HORIZON * towardVP(x); }
  function roofF(x) { return HORIZON + (ROOF_EDGE - HORIZON) * (1 - towardVP(x)); }

  function mapper(H, VH) {
    return function (f) { return VH * (1 - f / H); };
  }

  /* ---- one run of building faces along a band of the street ------------ */
  function facades(band, my, seed, o) {
    var r = rng(seed);
    var out = [];
    var x = band[0];

    while (x < band[1] - 8) {
      var w = o.minW + r() * (o.maxW - o.minW);
      var x1 = Math.min(x + w, band[1]);
      var k = o.lowK + r() * (o.highK - o.lowK);      /* how tall this one is */
      var dark = r() < o.darkRate;                     /* most blocks stay unlit */
      var lit = dark ? 0 : o.litRate * (.45 + r() * .85);

      var b0 = my(baseF(x)), b1 = my(baseF(x1));
      var top = function (xx) { return my(HORIZON + (roofF(xx) - HORIZON) * k); };
      var t0 = top(x), t1 = top(x1);

      var body = "M" + x.toFixed(1) + "," + b0.toFixed(1) +
                 " L" + x.toFixed(1) + "," + t0.toFixed(1) +
                 " L" + x1.toFixed(1) + "," + t1.toFixed(1) +
                 " L" + x1.toFixed(1) + "," + b1.toFixed(1) + " Z";
      out.push('<path d="' + body + '" fill="url(#face' + o.id + ')"/>');

      /* the edge facing the street catches the lamps */
      var inner = (band[0] < VP) ? x1 : x;
      var it = (band[0] < VP) ? t1 : t0, ib = (band[0] < VP) ? b1 : b0;
      out.push('<path d="M' + inner.toFixed(1) + ',' + it.toFixed(1) + ' L' + inner.toFixed(1) + ',' + ib.toFixed(1) +
               '" stroke="#E9B87C" stroke-width="' + o.rim + '" opacity="' + (.10 + r() * .16).toFixed(2) + '"/>');
      /* roof line */
      out.push('<path d="M' + x.toFixed(1) + ',' + t0.toFixed(1) + ' L' + x1.toFixed(1) + ',' + t1.toFixed(1) +
               '" stroke="#9BB0E0" stroke-width="' + (o.rim * .7).toFixed(1) + '" opacity=".22"/>');
      out.push('<path d="M' + x.toFixed(1) + ',' + t0.toFixed(1) + ' L' + x.toFixed(1) + ',' + b0.toFixed(1) +
               '" stroke="#040711" stroke-width="' + (o.rim * 1.1).toFixed(1) + '" opacity=".7"/>');

      /* windows, laid out on the receding face */
      var cols = Math.max(2, Math.round((x1 - x) / o.colStep));
      var wi = 0;
      for (var c = 0; c < cols; c++) {
        var u = (c + .5) / cols;
        var cx = x + (x1 - x) * u;
        var cb = b0 + (b1 - b0) * u, ct = t0 + (t1 - t0) * u;
        var span = cb - ct;
        if (span < o.rowStep * 2) continue;
        var rows = Math.floor((span - o.rowStep) / o.rowStep);
        for (var q = 0; q < rows; q++) {
          if (r() > lit) continue;
          var wy = ct + o.rowStep * (q + .8);
          var warm = r() > .26;
          var cls = (r() > .88) ? ' class="win-blink-' + (wi % 3) + '"' : "";
          out.push('<rect' + cls + ' x="' + (cx - o.winW / 2).toFixed(1) + '" y="' + wy.toFixed(1) +
                   '" width="' + o.winW + '" height="' + o.winH + '" rx="' + (o.winW > 5 ? 1 : 0) +
                   '" fill="' + (warm ? "#E9B87C" : "#8FA6F5") + '" opacity="' + (.2 + r() * .4).toFixed(2) +
                   '" style="animation-delay:' + (-r() * 20).toFixed(1) + 's"/>');
          wi++;
        }
      }

      /* an occasional lit sign on the street-facing edge */
      if (o.signs && r() > .74) {
        var sx = (band[0] < VP) ? x1 - o.signW - o.rim : x + o.rim;
        var sy = t0 + (b0 - t0) * (.26 + r() * .34);
        var sh = o.signH * (.55 + r() * .8);
        var tone = r() > .8 ? "#E2725B" : (r() > .38 ? "#E9B87C" : "#9E88E8");
        out.push('<rect class="sign-glow" x="' + sx.toFixed(1) + '" y="' + sy.toFixed(1) +
                 '" width="' + o.signW + '" height="' + sh.toFixed(1) +
                 '" rx="' + (o.signW / 2.4).toFixed(1) + '" fill="' + tone + '" opacity=".6"' +
                 ' style="animation-delay:' + (-r() * 7).toFixed(1) + 's"/>');
        out.push('<rect x="' + (sx - o.signW * .9).toFixed(1) + '" y="' + (sy - o.signW).toFixed(1) +
                 '" width="' + (o.signW * 2.8).toFixed(1) + '" height="' + (sh + o.signW * 2).toFixed(1) +
                 '" rx="' + o.signW + '" fill="' + tone + '" opacity=".10"/>');
      }

      /* rooftop warning light on the taller ones */
      if (o.beacons && k > o.highK - .12 && r() > .5) {
        out.push('<circle class="roof-beacon" cx="' + ((x + x1) / 2).toFixed(1) + '" cy="' + (t0 - 4).toFixed(1) +
                 '" r="' + o.beaconR + '" fill="#E2725B" style="animation-delay:' + (-r() * 4).toFixed(1) + 's"/>');
      }

      x = x1 + (r() < .34 ? 3 : 0);
    }
    return out.join("");
  }

  /* ---- a street lamp standing on the pavement --------------------------- */
  function lamp(x, my, side, scale) {
    var b = my(baseF(x));
    var topY = b - 250 * scale;
    var arm = (side === "L" ? 1 : -1) * 26 * scale;
    return '' +
    '<g>' +
      '<ellipse class="lamp-glow" cx="' + (x + arm) + '" cy="' + (topY + 8 * scale) + '" rx="' + (76 * scale) +
        '" ry="' + (76 * scale) + '" fill="url(#lampGlow)"/>' +
      '<rect x="' + (x - 2.4 * scale) + '" y="' + topY + '" width="' + (4.8 * scale) + '" height="' + (250 * scale) + '" fill="#070C1A"/>' +
      '<path d="M' + x + ',' + (topY + 4 * scale) + ' q' + (arm / 2) + ',' + (-14 * scale) + ' ' + arm + ',0" ' +
        'stroke="#070C1A" stroke-width="' + (4 * scale) + '" fill="none"/>' +
      '<ellipse class="lamp-glow" cx="' + (x + arm) + '" cy="' + (topY + 7 * scale) + '" rx="' + (6.4 * scale) +
        '" ry="' + (5 * scale) + '" fill="#FFE3B8"/>' +
      '<ellipse cx="' + (x + arm) + '" cy="' + b + '" rx="' + (62 * scale) + '" ry="' + (11 * scale) + '" fill="url(#pool)"/>' +
      '<rect x="' + (x + arm - 3 * scale) + '" y="' + b + '" width="' + (6 * scale) + '" height="' + (74 * scale) +
        '" fill="#E9B87C" opacity=".10"/>' +
    "</g>";
  }

  function defs(id, top, bottom) {
    return '<defs>' +
      '<linearGradient id="face' + id + '" x1="0" y1="0" x2=".2" y2="1">' +
        '<stop offset="0%" stop-color="' + top + '"/>' +
        '<stop offset="62%" stop-color="' + bottom + '"/>' +
        '<stop offset="100%" stop-color="#04070F"/>' +
      '</linearGradient>' +
      '<radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#FFC983" stop-opacity=".55"/>' +
        '<stop offset="46%" stop-color="#FFB05E" stop-opacity=".18"/>' +
        '<stop offset="100%" stop-color="#FF9E4A" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="pool" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0%" stop-color="#FFC078" stop-opacity=".32"/>' +
        '<stop offset="58%" stop-color="#FFB05E" stop-opacity=".06"/>' +
        '<stop offset="100%" stop-color="#FF9E4A" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<linearGradient id="road" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#16203C"/>' +
        '<stop offset="34%" stop-color="#0A1022"/>' +
        '<stop offset="100%" stop-color="#04070E"/>' +
      '</linearGradient>' +
    "</defs>";
  }

  /* ---- the road, drawn on the furthest plane so everything sits on it --- */
  function road(my, VH) {
    var h = my(0), hz = my(HORIZON);
    var r = rng(313);
    var out = [];

    out.push('<path d="M0,' + h + ' L' + VP + ',' + hz + ' L1600,' + h + ' Z" fill="url(#road)"/>');
    /* kerbs catching the lamp light */
    out.push('<path d="M0,' + h + ' L' + VP + ',' + hz + '" stroke="#E9B87C" stroke-width="3" opacity=".3"/>');
    out.push('<path d="M1600,' + h + ' L' + VP + ',' + hz + '" stroke="#E9B87C" stroke-width="3" opacity=".3"/>');
    out.push('<path d="M0,' + (h - 3) + ' L' + VP + ',' + (hz - 1) + '" stroke="#FFE3B8" stroke-width="1" opacity=".22"/>');
    out.push('<path d="M1600,' + (h - 3) + ' L' + VP + ',' + (hz - 1) + '" stroke="#FFE3B8" stroke-width="1" opacity=".22"/>');
    /* lane markings converging on the vanishing point */
    [-1, 1].forEach(function (s) {
      out.push('<path d="M' + (VP + s * 430) + ',' + h + ' L' + VP + ',' + hz +
               '" stroke="#9DB4F5" stroke-width="1.6" opacity=".16" stroke-dasharray="26 22"/>');
    });
    /* wet reflections smeared down from the far end */
    for (var i = 0; i < 26; i++) {
      var t = r();
      var x = VP + (r() - .5) * 760 * (0.25 + t);
      var y0 = hz + 2;
      var len = 10 + t * (h - hz) * .7;
      var warm = r() > .34;
      out.push('<rect x="' + x.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' + (1.6 + t * 4).toFixed(1) +
               '" height="' + len.toFixed(1) + '" rx="1.5" fill="' + (warm ? "#E9B87C" : "#8FA6F5") +
               '" opacity="' + (.06 + r() * .16).toFixed(2) + '"/>');
    }
    /* haze sitting on the horizon */
    out.push('<rect x="0" y="' + (hz - 40) + '" width="1600" height="62" fill="#2E4278" opacity=".26"/>');
    return out.join("");
  }

  /* ---- assemble one plane ----------------------------------------------- */
  function plane(cfg) {
    var my = mapper(cfg.H, cfg.VH);
    var body = defs(cfg.id, cfg.top, cfg.bottom);
    if (cfg.road) body += road(my, cfg.VH);
    body += facades(cfg.left, my, cfg.seed, cfg);
    body += facades(cfg.right, my, cfg.seed + 97, cfg);
    if (cfg.lamps) {
      cfg.lamps.forEach(function (l) { body += lamp(l[0], my, l[1], l[2]); });
    }
    return '<svg viewBox="0 0 1600 ' + cfg.VH + '" preserveAspectRatio="none" xmlns="' + NS + '" aria-hidden="true">' +
           body + "</svg>";
  }

  /* ---- build the street -------------------------------------------------- */
  var stage = document.getElementById("contact-city-stage");
  if (stage) {
    var rangeEl = stage.querySelector(".layer--range");
    if (rangeEl) {
      rangeEl.innerHTML = '<div class="city-plate"></div><span class="city-plate__glow"></span>';
    }

    [
      { sel: "far", id: "f", H: .64, VH: 380, seed: 41, road: true,
        left: [460, 646], right: [954, 1140],
        minW: 30, maxW: 58, lowK: .52, highK: .86, rim: 1.2,
        colStep: 15, rowStep: 8, winW: 2.6, winH: 3.2, litRate: .42, darkRate: .3,
        top: "#1A2545", bottom: "#0C1428", signs: false, beacons: false, beaconR: 2 },

      { sel: "mid", id: "m", H: .90, VH: 535, seed: 73,
        left: [250, 466], right: [1134, 1350],
        minW: 46, maxW: 92, lowK: .60, highK: .98, rim: 2,
        colStep: 25, rowStep: 15, winW: 4.6, winH: 6, litRate: .36, darkRate: .4,
        top: "#16203E", bottom: "#0A1124",
        signs: true, signW: 6, signH: 46, beacons: true, beaconR: 3,
        lamps: [[266, "L", .46], [372, "L", .58], [1228, "R", .58], [1334, "R", .46]] },

      { sel: "near", id: "n", H: 1.32, VH: 784, seed: 109,
        left: [0, 256], right: [1344, 1600],
        minW: 74, maxW: 136, lowK: .72, highK: 1.06, rim: 3,
        colStep: 40, rowStep: 27, winW: 8, winH: 10, litRate: .3, darkRate: .46,
        top: "#121B36", bottom: "#070D1E",
        signs: true, signW: 10, signH: 84, beacons: true, beaconR: 4.5,
        lamps: [[126, "L", .92], [1474, "R", .92]] },

      { sel: "front", id: "x", H: 1.58, VH: 940, seed: 151,
        left: [0, 96], right: [1504, 1600],
        minW: 96, maxW: 140, lowK: .9, highK: 1.15, rim: 4,
        colStep: 54, rowStep: 42, winW: 11, winH: 14, litRate: .2, darkRate: .55,
        top: "#0E1730", bottom: "#050912",
        signs: false, beacons: false, beaconR: 5 }
    ].forEach(function (cfg) {
      var el = stage.querySelector(".layer--" + cfg.sel);
      if (el) el.innerHTML = plane(cfg);
    });

    /* distant lights drifting at mid depth */
    var motes = stage.querySelector(".city-lights");
    if (motes && !reduce) {
      var mr = rng(617);
      var frag = [];
      for (var i = 0; i < 16; i++) {
        var size = (1.6 + mr() * 3).toFixed(1);
        var warm = mr() > .42;
        frag.push('<i style="left:' + (8 + mr() * 84).toFixed(1) + "%;bottom:" + (24 + mr() * 46).toFixed(1) + "%;" +
          "width:" + size + "px;height:" + size + "px;" +
          "background:" + (warm ? "#E9B87C" : "#9DB4F5") + ";" +
          "box-shadow:0 0 " + (5 + mr() * 9).toFixed(1) + "px " + (warm ? "rgba(233,184,124,.7)" : "rgba(157,180,245,.7)") + ";" +
          "--t:" + (16 + mr() * 18).toFixed(1) + "s;--delay:" + (-mr() * 20).toFixed(1) + "s;" +
          "--dx:" + ((mr() - .5) * 40).toFixed(0) + "px;--dy:" + (-10 - mr() * 26).toFixed(0) + 'px"></i>');
      }
      motes.innerHTML = frag.join("");
    }

    /* haze drifting between the facades */
    var haze = document.querySelector(".contact-city .city__haze");
    if (haze) {
      [[4, 10, 320, .38, 0], [56, 5, 400, .3, 1], [30, 22, 240, .26, 2], [76, 16, 280, .32, 3]]
        .forEach(function (c, i) {
          var d = document.createElement("div");
          d.className = "cloud";
          d.style.cssText = "left:" + c[0] + "%;top:" + c[1] + "%;width:" + c[2] + "px;opacity:" + c[3];
          d.setAttribute("data-drift", (0.24 + i * 0.18).toFixed(2));
          d.innerHTML =
            '<svg viewBox="0 0 300 110" xmlns="' + NS + '" aria-hidden="true">' +
            '<defs><linearGradient id="h' + i + '" x1="0" y1="1" x2="0" y2="0">' +
            '<stop offset="0%" stop-color="#3C5590"/><stop offset="60%" stop-color="#1D2C55"/>' +
            '<stop offset="100%" stop-color="#121C38"/>' +
            "</linearGradient></defs>" +
            '<g fill="url(#h' + i + ')"><ellipse cx="90" cy="70" rx="82" ry="30"/>' +
            '<circle cx="96" cy="50" r="36"/><circle cx="150" cy="58" r="30"/>' +
            '<circle cx="58" cy="62" r="25"/><ellipse cx="192" cy="74" rx="60" ry="23"/></g>' +
            "</svg>";
          haze.appendChild(d);
        });
    }

    var scene = document.querySelector(".contact-city");
    if (scene && !reduce) {
      var beacon = document.createElement("span");
      beacon.className = "beacon";
      scene.appendChild(beacon);
    }
  }

  /* ---- atmospheric particles across the page ---------------------------- */
  var sparkleTargets = [].slice.call(document.querySelectorAll(".section"));
  var sparklePool = [];
  var SPARKLE_LIMIT = 26;

  function createSparkle(parent) {
    var el = document.createElement("span");
    el.className = "sparkle";
    var shapes = ["star", "dot", "diamond"];
    el.setAttribute("data-shape", shapes[(Math.random() * shapes.length) | 0]);
    el.style.cssText =
      "left:" + (Math.random() * 100) + "%;" +
      "bottom:" + (10 + Math.random() * 70) + "%;" +
      "--size:" + (2 + Math.random() * 3).toFixed(1) + "px;" +
      "--delay:" + (Math.random() * 8).toFixed(1) + "s;" +
      "--dur:" + (5 + Math.random() * 5).toFixed(1) + "s;" +
      "--drift:" + ((Math.random() - 0.5) * 36).toFixed(0) + "px";
    parent.appendChild(el);
    return el;
  }

  if (!reduce) {
    sparkleTargets.forEach(function (section) {
      var count = 3 + ((Math.random() * 3) | 0);
      for (var i = 0; i < count && sparklePool.length < SPARKLE_LIMIT; i++) {
        sparklePool.push(createSparkle(section));
      }
    });
  }

  /* ---- scroll choreography ---------------------------------------------- */
  var staged = [].slice.call(document.querySelectorAll(".stage-in"));
  if (staged.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    staged.forEach(function (el) { io.observe(el); });
  } else {
    staged.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* split headline letters */
  [].slice.call(document.querySelectorAll("[data-split]")).forEach(function (el) {
    var text = el.textContent;
    el.textContent = "";
    var holder = document.createElement("span");
    holder.className = "split";
    // split animation disabled - keep the heading text
    holder.textContent = text;
    el.appendChild(holder);
  });

  /* progress rail */
  var rail = document.createElement("div");
  rail.className = "progress";
  document.body.appendChild(rail);

  /* ---- depth parallax + drift, one rAF loop ----------------------------- */
  var depthLayers = [].slice.call(document.querySelectorAll("[data-depth-layer]"));
  var drifters = [].slice.call(document.querySelectorAll("[data-drift]"));
  var hero = document.querySelector(".hero");
  var mx = 0, my2 = 0, tx = 0, ty = 0, frame = 0, queued = false;

  function paint() {
    queued = false;
    frame++;

    var doc = document.documentElement;
    var p = doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight);
    rail.style.transform = "scaleX(" + p.toFixed(4) + ")";

    tx += (mx - tx) * 0.06;
    ty += (my2 - ty) * 0.06;

    /* hero: a slow camera move up the canyon */
    if (!reduce && hero) {
      var hb = hero.getBoundingClientRect();
      if (hb.bottom > -200) {
        var t = frame * 0.0016;
        var sc = doc.scrollTop;
        hero.style.setProperty("--city-x", (tx * 12 + Math.sin(t) * 7).toFixed(2) + "px");
        hero.style.setProperty("--city-y", (sc * 0.16 + ty * 7 + Math.cos(t * 0.7) * 4).toFixed(2) + "px");
        hero.style.setProperty("--city-s", (1.08 + Math.sin(t * 0.5) * 0.012 + Math.min(sc, 700) * 0.00013).toFixed(4));
      }
    }

    /* the street: planes slide sideways by depth, which reads as walking in */
    if (!reduce && stage) {
      var box = stage.getBoundingClientRect();
      var prog = 1 - (box.top + box.height) / (window.innerHeight + box.height);
      prog = Math.max(0, Math.min(1, prog));

      depthLayers.forEach(function (el) {
        var d = parseFloat(el.getAttribute("data-depth-layer"));
        var lift = (1 - prog) * 120 * d;
        el.style.transform =
          "translate3d(" + (tx * 30 * d).toFixed(2) + "px," +
          (lift + ty * 10 * d).toFixed(2) + "px,0) scale(" + (1 + d * 0.03).toFixed(3) + ")";
      });

      var motesEl = stage.querySelector(".city-lights");
      if (motesEl) {
        motesEl.style.transform =
          "translate3d(" + (tx * 22).toFixed(2) + "px," + ((1 - prog) * 56 + ty * 8).toFixed(2) + "px,0)";
      }

      stage.style.setProperty("perspective-origin", (50 + tx * 6).toFixed(1) + "% " + (46 + ty * 5).toFixed(1) + "%");
    }

    if (!reduce) {
      drifters.forEach(function (el, i) {
        var sp = parseFloat(el.getAttribute("data-drift"));
        var t2 = frame * sp * 0.04;
        el.style.transform =
          "translate3d(" + (((t2 % 260) - 130) + tx * 34 * sp).toFixed(1) + "px," +
          (Math.sin(frame * 0.002 + i) * 7).toFixed(1) + "px,0)";
      });
    }
  }

  function queue() {
    if (queued || document.documentElement.classList.contains("is-viewing")) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  window.addEventListener("pointermove", function (e) {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my2 = (e.clientY / window.innerHeight) * 2 - 1;
    queue();
  }, { passive: true });

  if (!reduce) {
    (function loop() { queue(); requestAnimationFrame(loop); })();
  } else {
    paint();
  }

  /* ---- card tilt --------------------------------------------------------- */
  if (!reduce && window.matchMedia("(hover: hover)").matches) {
    [].slice.call(document.querySelectorAll(".tilt")).forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var b = card.getBoundingClientRect();
        var x = (e.clientX - b.left) / b.width - 0.5;
        var y = (e.clientY - b.top) / b.height - 0.5;
        card.classList.add("is-tilting");
        card.style.transform =
          "perspective(900px) rotateX(" + (-y * 6).toFixed(2) + "deg) rotateY(" +
          (x * 8).toFixed(2) + "deg) translateY(-5px) scale(1.01)";
      });
      card.addEventListener("pointerleave", function () {
        card.classList.remove("is-tilting");
        card.style.transform = "";
      });
    });

    [].slice.call(document.querySelectorAll(".btn, .filter, .copy")).forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform =
          "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," +
          ((e.clientY - r.top - r.height / 2) * 0.24).toFixed(1) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
})();

