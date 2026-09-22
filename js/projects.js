/* ==========================================================================
   Project viewer
   Clicking a project opens the real project files (projects/...) in an
   iframe that grows out of the card, with a bar to get back.
   Ctrl/Cmd-click or middle-click still opens the project in a new tab.
   Links: #project/<id> opens a project directly, e.g. #project/tourify
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  var viewer = document.getElementById("viewer");
  if (!viewer) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  var frame = $(".viewer__frame", viewer);
  var bar = $(".viewer__bar", viewer);
  var titleEl = $(".viewer__title", viewer);
  var tabsEl = $(".viewer__tabs", viewer);
  var stage = $(".viewer__stage", viewer);
  var loading = $(".viewer__loading", viewer);
  var loadingName = $(".viewer__loading-name", viewer);
  var tipsBtn = $("[data-tips]", viewer);
  var tips = $(".viewer__tips", viewer);
  var tipsList = $(".viewer__tips-list", viewer);
  var reloadBtn = $("[data-reload]", viewer);
  var newTab = $("[data-newtab]", viewer);
  var backBtn = $(".viewer__back", viewer);
  var ghost = $(".viewer__ghost", viewer);
  var outside = [$("#main"), $("#nav"), $(".skip-link")].filter(Boolean);

  var st = { prevHash: "", open: false, busy: false, slug: null, card: null, views: [], current: null, frames: {}, lastFocus: null };
  var tipsSeen = {};
  var DURATION = 620;
  var EASE = "cubic-bezier(.2, .7, .2, 1)";

  /* ---- reading a card ---------------------------------------------------- */

  function cardFor(slug) {
    return $('.work[data-project="' + slug + '"]');
  }

  function viewsOf(card) {
    var seen = {};
    return $$("a[data-view]", card).reduce(function (list, a) {
      var id = a.getAttribute("data-view");
      if (!seen[id]) {
        seen[id] = true;
        list.push({ id: id, label: a.getAttribute("data-label") || a.textContent.trim(), src: a.getAttribute("href") });
      }
      return list;
    }, []);
  }

  function titleOf(card) {
    return card.getAttribute("data-title") || ($(".work__title", card) || {}).textContent || "Project";
  }

  /* ---- geometry for the grow / shrink ------------------------------------ */

  function insetFrom(card) {
    var media = card && $("[data-origin]", card);
    if (!media) return null;
    var r = media.getBoundingClientRect();
    var w = window.innerWidth, h = window.innerHeight;
    if (r.width < 20 || r.bottom < 0 || r.top > h) return null;
    return "inset(" + Math.max(0, r.top) + "px " + Math.max(0, w - r.right) + "px " +
      Math.max(0, h - r.bottom) + "px " + Math.max(0, r.left) + "px round 20px)";
  }

  function animate(el, keyframes, opts) {
    if (!el.animate) return Promise.resolve();
    var a = el.animate(keyframes, opts);
    return new Promise(function (done) { a.onfinish = done; a.oncancel = done; });
  }

  /* ---- opening ----------------------------------------------------------- */

  function open(slug, viewId) {
    var card = cardFor(slug);
    if (!card || st.busy) return;
    if (st.open) { if (st.slug === slug) { if (viewId) show(viewId); return; } teardown(); }

    var views = viewsOf(card);
    if (!views.length) return;

    st.open = true; st.slug = slug; st.card = card; st.views = views;
    st.lastFocus = document.activeElement;
    if (!/^#project\//.test(location.hash)) st.prevHash = location.hash;

    // settle the card if the tilt effect left it rotated
    $$(".tilt", card).forEach(function (t) { t.classList.remove("is-tilting"); t.style.transform = ""; });

    var title = titleOf(card);
    titleEl.textContent = title;
    loadingName.textContent = title;
    loading.classList.remove("is-done");

    buildTabs();
    buildTips(card);

    // the card's own picture stretches to full screen, then gives way to the project
    var img = $("[data-origin] img", card);
    ghost.style.backgroundImage = img ? 'url("' + (img.currentSrc || img.src) + '")' : "none";
    ghost.style.backgroundPosition = img ? getComputedStyle(img).objectPosition : "";
    // tall phone screens stay whole as they grow instead of zooming in
    ghost.style.backgroundSize = img && img.naturalHeight > img.naturalWidth ? "contain" : "cover";
    ghost.classList.remove("is-gone");

    // lock the page behind without a jump where the scrollbar was
    var gutter = window.innerWidth - root.clientWidth;
    if (gutter > 0) document.body.style.paddingRight = gutter + "px";
    root.classList.add("is-viewing");
    outside.forEach(function (el) { el.inert = true; });

    viewer.hidden = false;
    var from = insetFrom(card);
    // force a style pass so the scrim can fade in
    void viewer.offsetWidth;
    viewer.classList.add("is-open");

    st.busy = true;
    var grow = (reduceMotion || !from)
      ? animate(frame, [{ opacity: 0 }, { opacity: 1 }], { duration: reduceMotion ? 1 : 280, easing: "ease-out" })
      : animate(frame, [{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }], { duration: DURATION, easing: EASE });
    // the picture starts exactly where the card image sits and grows with the window
    var r = from && $("[data-origin]", card).getBoundingClientRect();
    if (r) animate(ghost, [
      { top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" },
      { top: "0px", left: "0px", width: "100%", height: "100%" }
    ], { duration: DURATION, easing: EASE });
    if (!reduceMotion) animate(bar, [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: from ? 240 : 0, easing: "ease-out", fill: "backwards" });

    grow.then(function () {
      st.busy = false;
      ghost.classList.add("is-gone");
      if (!st.open) return;
      show(viewId && views.some(function (v) { return v.id === viewId; }) ? viewId : views[0].id);
      if (!tipsSeen[slug] && tipsList.children.length) setTips(true);
    });

    setHash("#project/" + slug);
    backBtn.focus({ preventScroll: true });
  }

  function buildTabs() {
    tabsEl.innerHTML = "";
    tabsEl.hidden = st.views.length < 2;
    if (tabsEl.hidden) return;
    st.views.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "viewer__tab";
      b.setAttribute("role", "tab");
      b.setAttribute("data-view", v.id);
      b.setAttribute("aria-selected", "false");
      b.textContent = v.label;
      tabsEl.appendChild(b);
    });
  }

  function buildTips(card) {
    var tpl = $("template.project__tips", card);
    tipsList.innerHTML = tpl ? tpl.innerHTML : "";
    tipsBtn.hidden = !tipsList.children.length;
    setTips(false);
  }

  function setTips(on) {
    tips.hidden = !on;
    tipsBtn.setAttribute("aria-expanded", on ? "true" : "false");
    if (on && st.slug) tipsSeen[st.slug] = true;
  }

  /* ---- switching views (e.g. guest site / admin panel) ------------------- */

  function show(id) {
    var view = st.views.filter(function (v) { return v.id === id; })[0];
    if (!view) return;
    st.current = id;

    $$(".viewer__tab", tabsEl).forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-view") === id ? "true" : "false");
    });
    newTab.href = view.src;

    Object.keys(st.frames).forEach(function (k) { st.frames[k].hidden = k !== id; });

    var f = st.frames[id];
    if (!f) {
      f = document.createElement("iframe");
      f.title = titleOf(st.card) + (st.views.length > 1 ? ", " + view.label : "");
      f.setAttribute("allow", "autoplay; fullscreen; clipboard-write");
      f.addEventListener("load", function () {
        if (f.src === "about:blank") return;
        // once someone starts using the project, tuck the tips away
        try { f.contentWindow.addEventListener("pointerdown", function () { setTips(false); }, { once: true }); } catch (e) {}
        setTimeout(function () {
          f.classList.add("is-ready");
          if (st.frames[st.current] === f) loading.classList.add("is-done");
        }, 160);
      });
      st.frames[id] = f;
      loading.classList.remove("is-done");
      stage.appendChild(f);
      f.src = view.src;
    } else {
      loading.classList.toggle("is-done", f.classList.contains("is-ready"));
    }
  }

  function restart() {
    var f = st.frames[st.current];
    if (!f) return;
    f.classList.remove("is-ready");
    loading.classList.remove("is-done");
    try { f.contentWindow.location.reload(); }
    catch (e) { var src = f.src; f.src = "about:blank"; f.src = src; }
  }

  /* ---- closing ----------------------------------------------------------- */

  function close() {
    if (!st.open || st.busy) return;
    setTips(false);
    st.busy = true;
    var to = insetFrom(st.card);
    viewer.classList.remove("is-open");

    var shrink = (reduceMotion || !to)
      ? animate(frame, [{ opacity: 1 }, { opacity: 0 }], { duration: reduceMotion ? 1 : 240, easing: "ease-in", fill: "forwards" })
      : animate(frame, [{ clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: to }], { duration: 520, easing: EASE, fill: "forwards" });

    shrink.then(function () {
      st.busy = false;
      teardown();
      frame.getAnimations && frame.getAnimations().forEach(function (a) { a.cancel(); });
    });
  }

  // remove the iframes so sound, timers and animations inside them stop
  function teardown() {
    Object.keys(st.frames).forEach(function (k) {
      var f = st.frames[k];
      try { f.src = "about:blank"; } catch (e) {}
      f.remove();
    });
    st.frames = {};
    viewer.hidden = true;
    viewer.classList.remove("is-open");
    root.classList.remove("is-viewing");
    document.body.style.paddingRight = "";
    outside.forEach(function (el) { el.inert = false; });
    var back = st.lastFocus;
    st.open = false; st.slug = null; st.card = null; st.views = []; st.current = null;
    setHash(st.prevHash || location.pathname + location.search);
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  function setHash(h) {
    try { history.replaceState(history.state, "", h); } catch (e) {}
  }

  /* ---- events ------------------------------------------------------------ */

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest && e.target.closest("[data-open]");
    if (!trigger || viewer.contains(trigger)) return;
    // let people open a project in a new tab the usual way
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(trigger.getAttribute("data-open"), trigger.getAttribute("data-view"));
  });

  viewer.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-close]")) { close(); return; }
    var tab = t.closest(".viewer__tab");
    if (tab) { show(tab.getAttribute("data-view")); return; }
    if (t.closest("[data-tips]")) { setTips(tips.hidden); return; }
    if (t.closest(".viewer__tips-close")) { setTips(false); return; }
    if (t.closest("[data-reload]")) { restart(); }
  });

  document.addEventListener("keydown", function (e) {
    if (!st.open || e.key !== "Escape") return;
    if (!tips.hidden) { setTips(false); tipsBtn.focus(); return; }
    close();
  });

  function fromHash() {
    var m = /^#project\/([\w-]+)(?:\/([\w-]+))?$/.exec(location.hash);
    if (m) open(m[1], m[2]);
    else if (st.open) close();
  }
  window.addEventListener("hashchange", fromHash);
  if (/^#project\//.test(location.hash)) {
    // wait for the card to be laid out so the viewer grows from it
    window.addEventListener("load", function () {
      var card = cardFor(location.hash.split("/")[1]);
      if (card) card.scrollIntoView({ block: "center", behavior: "instant" });
      setTimeout(fromHash, 60);
    });
  }
})();
