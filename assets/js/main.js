(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var I18N = window.__YG_I18N__ || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CONSENT_KEY = "yg-consent";

  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function storeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }

  /* ---------- nav ---------- */
  function initNav() {
    var nav = $(".nav");
    if (!nav) return;
    var solidAlways = nav.hasAttribute("data-solid");
    function onScroll() { nav.classList.toggle("is-solid", solidAlways || window.scrollY > 40); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- reveal ---------- */
  function initReveal() {
    var els = $$(".reveal, .paradigms li");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.02, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-in");
      });
    }, 5000);
  }

  /* ---------- parallax: transform-based, 3 depths, one rAF ---------- */
  function initParallax() {
    if (reduced) return;
    var layers = $$("[data-depth]");
    if (!layers.length) return;
    var items = layers.map(function (el) {
      return { el: el, depth: parseFloat(el.getAttribute("data-depth")) || 0, host: el.closest("section") || el.parentElement, visible: true };
    });
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          items.forEach(function (it) { if (it.host === e.target) it.visible = e.isIntersecting; });
        });
      }, { rootMargin: "20% 0px 20% 0px" });
      items.forEach(function (it) { io.observe(it.host); });
    }
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var scale = window.innerWidth < 760 ? 0.55 : 1; // softer on phones
      items.forEach(function (it) {
        if (!it.visible) return;
        var r = it.host.getBoundingClientRect();
        var progress = (r.top + r.height / 2 - vh / 2) / vh; // 0 when centred
        var y = -progress * it.depth * 120 * scale;
        it.el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
      });
    }
    function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    update();
  }

  /* ---------- hero video: only plays when visible ---------- */
  function initVideo() {
    var v = $(".reel video");
    if (!v) return;
    if (reduced) { v.removeAttribute("autoplay"); v.pause(); v.setAttribute("controls", ""); return; }
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () { v.setAttribute("controls", ""); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause(); });
      }).observe(v);
    }
  }

  /* ---------- cookies / consent ---------- */
  function readConsent() {
    var raw = storeGet(CONSENT_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function writeConsent(media) {
    var c = { necessary: true, media: !!media, v: 1, at: new Date().toISOString() };
    storeSet(CONSENT_KEY, JSON.stringify(c));
    return c;
  }
  function applyConsent(c) {
    if (c && c.media) $$("[data-yt]").forEach(loadYouTube);
  }
  function initCookies() {
    var banner = $("#cookie");
    if (!banner) return;
    var cats = $(".cookie-cats", banner);
    var mediaBox = $("#ck-media", banner);
    function show() {
      var c = readConsent();
      if (mediaBox) mediaBox.checked = !!(c && c.media);
      banner.hidden = false;
      document.body.classList.add("has-banner");
    }
    function hide() { banner.hidden = true; document.body.classList.remove("has-banner"); }
    function decide(media) { applyConsent(writeConsent(media)); hide(); }

    $$("[data-ck]", banner).forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-ck");
        if (a === "accept") decide(true);
        else if (a === "reject") decide(false);
        else if (a === "save") decide(mediaBox && mediaBox.checked);
        else if (a === "settings") {
          cats.hidden = !cats.hidden;
          b.setAttribute("aria-expanded", String(!cats.hidden));
          var save = $("[data-ck='save']", banner);
          if (save) save.hidden = cats.hidden;
        }
      });
    });
    $$("[data-cookie-prefs]").forEach(function (b) {
      b.addEventListener("click", function () { cats.hidden = false; var s = $("[data-ck='save']", banner); if (s) s.hidden = false; show(); });
    });

    var c = readConsent();
    if (!c) show(); else applyConsent(c);
  }

  /* ---------- YouTube: nothing loads before click or consent ---------- */
  function loadYouTube(box) {
    if (!box || box.getAttribute("data-loaded")) return;
    box.setAttribute("data-loaded", "1");
    var id = box.getAttribute("data-yt");
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?rel=0&modestbranding=1";
    f.title = box.getAttribute("data-title") || "YouTube";
    f.loading = "lazy";
    f.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    box.innerHTML = "";
    box.appendChild(f);
  }
  function initYouTube() {
    $$("[data-yt]").forEach(function (box) {
      var btn = $("button", box);
      if (btn) btn.addEventListener("click", function () { loadYouTube(box); });
    });
  }

  /* ---------- form ---------- */
  function initForm() {
    var form = $("#join-form");
    if (!form) return;
    var t = I18N.form || {};
    var errBox = $(".form-errors", form);
    var submit = $("button[type='submit']", form);
    var terms = $("#f-terms", form);
    var privacy = $("#f-privacy", form);
    var otherRadio = $("#f-diff-other", form);
    var otherWrap = $(".other-text", form);
    var otherInput = otherWrap ? $("input", otherWrap) : null;

    function syncSubmit() {
      var ok = terms.checked && privacy.checked;
      submit.setAttribute("aria-disabled", ok ? "false" : "true");
    }
    terms.addEventListener("change", syncSubmit);
    privacy.addEventListener("change", syncSubmit);
    syncSubmit();

    $$("input[name='dificultad']", form).forEach(function (r) {
      r.addEventListener("change", function () {
        var on = otherRadio.checked;
        otherWrap.hidden = !on;
        otherInput.required = on;
        if (on) otherInput.focus();
      });
    });

    function clearErrors() {
      errBox.classList.remove("is-on");
      errBox.innerHTML = "";
      $$(".has-error", form).forEach(function (el) { el.classList.remove("has-error"); });
    }
    function validate() {
      var errs = [];
      function need(sel, msg) {
        var el = $(sel, form);
        if (!el.value.trim()) { errs.push(msg); el.closest(".field").classList.add("has-error"); }
      }
      need("#f-name", t.errName);
      need("#f-wa", t.errWa);
      var wa = $("#f-wa", form).value.replace(/[\s().-]/g, "");
      if (wa && !/^\+?\d{7,15}$/.test(wa)) { errs.push(t.errWaFormat); $("#f-wa", form).closest(".field").classList.add("has-error"); }
      var mail = $("#f-email", form).value.trim();
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { errs.push(t.errEmail); $("#f-email", form).closest(".field").classList.add("has-error"); }
      need("#f-years", t.errYears);
      if (!$("input[name='dificultad']:checked", form)) { errs.push(t.errDiff); $("#f-diff-fs", form).classList.add("has-error"); }
      else if (otherRadio.checked && !otherInput.value.trim()) { errs.push(t.errOther); otherWrap.classList.add("has-error"); }
      if (!terms.checked) { errs.push(t.errTerms); terms.closest(".consent").classList.add("has-error"); }
      if (!privacy.checked) { errs.push(t.errPrivacy); privacy.closest(".consent").classList.add("has-error"); }
      return errs;
    }

    function auditRecord() {
      var now = new Date();
      var off = -now.getTimezoneOffset();
      var sign = off >= 0 ? "+" : "-";
      var pad = function (n) { return String(Math.floor(Math.abs(n))).padStart(2, "0"); };
      var local = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds()) + "." + String(now.getMilliseconds()).padStart(3, "0") + sign + pad(off / 60) + ":" + pad(off % 60);
      return {
        form_id: "lista-espera",
        accepted_at: local + "  (en produccion: reloj del servidor)",
        client_timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
        ip_address: "(se toma en el servidor; no se lee en el navegador)",
        lang: doc.lang.slice(0, 2),
        terms_version: form.getAttribute("data-terms-version"),
        terms_hash: form.getAttribute("data-terms-hash"),
        terms_accepted: terms.checked,
        privacy_version: form.getAttribute("data-privacy-version"),
        privacy_hash: form.getAttribute("data-privacy-hash"),
        privacy_accepted: privacy.checked
      };
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors();
      var errs = validate();
      if (errs.length) {
        errBox.innerHTML = "<p><strong>" + t.errTitle + "</strong></p><ul>" + errs.map(function (m) { return "<li>" + m + "</li>"; }).join("") + "</ul>";
        errBox.classList.add("is-on");
        errBox.focus();
        return;
      }
      var mode = form.getAttribute("data-mode") || "simulado";
      var rec = auditRecord();
      if (mode === "simulado") {
        console.info("[Registro de aceptacion — MODO SIMULADO: no se guarda ni se envia nada]\n", JSON.stringify(rec, null, 2));
      }
      // Demo: no data is sent anywhere.
      form.hidden = true;
      var thanks = $("#thanks");
      thanks.hidden = false;
      thanks.setAttribute("tabindex", "-1");
      thanks.focus();
    });
  }

  function boot() {
    safe(initNav, "nav");
    safe(initReveal, "reveal");
    safe(initParallax, "parallax");
    safe(initVideo, "video");
    safe(initYouTube, "youtube");
    safe(initCookies, "cookies");
    safe(initForm, "form");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
