"use strict";

/*
  datadex — interaction layer
  Every feature checks for its own markup and for reduced-motion, so the
  page stays fully usable if any of it is missing or switched off.
*/

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- Header: scroll state, progress line, back to top ---------- */

  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-scroll-progress]");

  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.type = "button";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"></path><path d="M5 12l7-7 7 7"></path></svg>';
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
  document.body.appendChild(toTop);

  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (header) header.classList.toggle("is-scrolled", y > 8);
      if (progress) progress.style.setProperty("--scroll", max > 0 ? String(y / max) : "0");
      toTop.classList.toggle("is-visible", y > 700);
      updateStack();
      scrollQueued = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- Mobile navigation ---------- */

  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  const setNav = (open) => {
    if (!nav || !navToggle) return;
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("nav-open", open);
  };

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => setNav(!nav.classList.contains("is-open")));
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setNav(false)));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setNav(false);
    });
    window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => {
      if (e.matches) setNav(false);
    });
  }

  /* ---------- Active section in the nav ---------- */

  const navLinks = nav ? [...nav.querySelectorAll('a[href^="#"]:not(.nav-cta)')] : [];
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Proof strip ticker, cloned from the four real items ---------- */

  const proof = document.querySelector("[data-proof]");
  const proofTrack = document.querySelector("[data-proof-track]");
  if (proof && proofTrack && !reduceMotion) {
    const items = [...proofTrack.children];
    // Four copies in total: the track slides by half its width, so it needs an even count
    for (let copy = 0; copy < 3; copy += 1) {
      items.forEach((item) => {
        const clone = item.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("[data-count]").forEach((el) => el.removeAttribute("data-count"));
        proofTrack.appendChild(clone);
      });
    }
    proof.classList.add("is-marquee");
  }

  /* ---------- Scroll reveals ---------- */

  const revealGroups = [
    ".section-head",
    ...(proof && proof.classList.contains("is-marquee") ? [] : [".proof-grid > p"]),
    ".showcase-tabs",
    ".showcase-stage",
    ".stack-grid > div",
    ".process > li",
    ".reviews > li",
    ".team > *",
    ".contact .wrap > *",
  ];

  const revealTargets = [];
  revealGroups.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--d", (i % 6) * 80 + "ms");
      revealTargets.push(el);
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealTargets.forEach((el) => el.classList.add("in-view"));
  } else {
    const revealer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          revealer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealTargets.forEach((el) => revealer.observe(el));
  }

  /* ---------- Counting numbers ---------- */

  const counters = [...document.querySelectorAll("[data-count]")];

  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const duration = 1300;
    const start = performance.now();
    const frame = (now) => {
      const t = clamp((now - start) / duration, 0, 1);
      el.textContent = (target * easeOut(t)).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  if (counters.length && !reduceMotion && "IntersectionObserver" in window) {
    const counting = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counting.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => counting.observe(el));
  }

  /* ---------- Services showcase: tabs, crossfade, auto-advance ---------- */

  const showcase = document.querySelector("[data-showcase]");
  if (showcase) {
    const tabs = [...showcase.querySelectorAll("[data-showcase-tab]")];
    const panels = [...showcase.querySelectorAll("[data-showcase-panel]")];
    const cycleMs = 6500;
    let current = 0;
    let timer = 0;
    let cycleStart = 0;
    let remaining = cycleMs;
    // The bar and the switch share one clock: both pause and resume together
    const state = { hovered: false, focused: false, inView: false, hidden: document.hidden };
    const canRun = () => !reduceMotion && state.inView && !state.hovered && !state.focused && !state.hidden;

    panels.forEach((p) => p.removeAttribute("hidden"));
    showcase.style.setProperty("--cycle", cycleMs + "ms");

    const restartBar = () => {
      const bar = tabs[current].querySelector(".showcase-tab-progress");
      if (!bar) return;
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    };

    const hold = () => {
      if (timer) {
        clearTimeout(timer);
        timer = 0;
        remaining = Math.max(0, cycleMs - (performance.now() - cycleStart));
      }
      showcase.classList.add("is-paused");
    };

    const run = () => {
      if (timer || !canRun()) return;
      showcase.classList.remove("is-paused");
      cycleStart = performance.now() - (cycleMs - remaining);
      timer = window.setTimeout(() => {
        timer = 0;
        activate(current + 1, false);
      }, remaining);
    };

    const sync = () => (canRun() ? run() : hold());

    const activate = (index, focusTab) => {
      clearTimeout(timer);
      timer = 0;
      current = (index + tabs.length) % tabs.length;
      remaining = cycleMs;
      tabs.forEach((tab, i) => {
        const active = i === current;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel, i) => {
        const active = i === current;
        panel.classList.toggle("is-active", active);
        panel.setAttribute("aria-hidden", String(!active));
      });
      restartBar();
      if (focusTab) tabs[current].focus();
      sync();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => activate(i, false));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); activate(current + 1, true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); activate(current - 1, true); }
        if (e.key === "Home") { e.preventDefault(); activate(0, true); }
        if (e.key === "End") { e.preventDefault(); activate(tabs.length - 1, true); }
      });
    });

    showcase.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") { state.hovered = true; sync(); }
    });
    showcase.addEventListener("pointerleave", () => { state.hovered = false; sync(); });
    // Only keyboard focus pauses the cycle; a mouse click should not freeze it
    showcase.addEventListener("focusin", (e) => {
      if (e.target.matches && e.target.matches(":focus-visible")) { state.focused = true; sync(); }
    });
    showcase.addEventListener("focusout", (e) => {
      if (!showcase.contains(e.relatedTarget)) { state.focused = false; sync(); }
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        state.inView = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.25 }).observe(showcase);
    } else {
      state.inView = true;
    }

    document.addEventListener("visibilitychange", () => {
      state.hidden = document.hidden;
      sync();
    });

    showcase.classList.add("is-paused");
    activate(0, false);
  }

  /* ---------- Work cards: live-site badge ---------- */

  document.querySelectorAll(".work-item > a figure").forEach((figure) => {
    const badge = document.createElement("span");
    badge.className = "work-visit";
    badge.setAttribute("aria-hidden", "true");
    badge.innerHTML =
      'Open live site <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"></path><path d="M8 7h9v9"></path></svg>';
    figure.appendChild(badge);
  });

  /* ---------- 3D tilt on cards (mouse only) ---------- */

  if (finePointer && !reduceMotion) {
    const tiltTargets = document.querySelectorAll("[data-tilt]");
    tiltTargets.forEach((el) => {
      const featured = el.matches("[data-tilt]");
      const maxDeg = featured ? 12 : 5;
      let raf = 0;
      el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
      el.addEventListener("pointermove", (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            "perspective(1000px) rotateX(" + (-py * maxDeg).toFixed(2) + "deg) rotateY(" +
            (px * maxDeg).toFixed(2) + "deg) translateY(-6px)" + (featured ? " scale(1.015)" : "");
          if (featured) {
            el.style.setProperty("--mx", ((px + 0.5) * 100).toFixed(1) + "%");
            el.style.setProperty("--my", ((py + 0.5) * 100).toFixed(1) + "%");
          }
          raf = 0;
        });
      });
      el.addEventListener("pointerleave", () => {
        cancelAnimationFrame(raf);
        raf = 0;
        el.classList.remove("is-tilting");
        el.style.transform = "";
      });
    });
  }

  /* ---------- Particle fields: drifting dots that link up when close ---------- */

  const particleFields = [...document.querySelectorAll("[data-particles]")];
  if (particleFields.length && !reduceMotion) {
    particleFields.forEach((canvas) => {
      if (!canvas.getContext) return;
      const ctx = canvas.getContext("2d");
      const host = canvas.closest("section") || canvas.parentElement;
      const dark = canvas.dataset.particlesTheme === "dark";
      const palette = dark
        ? { dot: "25, 195, 191", alt: "255, 255, 255", line: "25, 195, 191", altScale: 0.5, lineAlpha: 0.26 }
        : { dot: "15, 163, 160", alt: "16, 35, 58", line: "15, 163, 160", altScale: 0.6, lineAlpha: 0.22 };
      let width = 0;
      let height = 0;
      let dots = [];
      let running = false;
      let frame = 0;
      const pointer = { x: -1e4, y: -1e4, active: false };

      const spawn = () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 1.8,
        a: 0.25 + Math.random() * 0.45,
        main: Math.random() < 0.7,
      });

      const resize = () => {
        const r = host.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = r.width;
        height = r.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const wanted = Math.round(clamp((width * height) / 16000, 28, 90));
        while (dots.length < wanted) dots.push(spawn());
        dots.length = wanted;
      };

      const draw = () => {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);

        for (const d of dots) {
          d.vx += (Math.random() - 0.5) * 0.02;
          d.vy += (Math.random() - 0.5) * 0.02;
          const speed = Math.hypot(d.vx, d.vy);
          if (speed > 0.45) { d.vx *= 0.45 / speed; d.vy *= 0.45 / speed; }
          if (pointer.active) {
            const dx = d.x - pointer.x;
            const dy = d.y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 140 && dist > 0.1) {
              const f = ((140 - dist) / 140) * 0.06;
              d.vx += (dx / dist) * f;
              d.vy += (dy / dist) * f;
            }
          }
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -10) d.x = width + 10;
          if (d.x > width + 10) d.x = -10;
          if (d.y < -10) d.y = height + 10;
          if (d.y > height + 10) d.y = -10;
        }

        const linkDist = 130;
        ctx.lineWidth = 1;
        for (let i = 0; i < dots.length; i += 1) {
          for (let j = i + 1; j < dots.length; j += 1) {
            const a = dots[i];
            const b = dots[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            if (Math.abs(dx) > linkDist || Math.abs(dy) > linkDist) continue;
            const dist = Math.hypot(dx, dy);
            if (dist > linkDist) continue;
            const alpha = (1 - dist / linkDist) * palette.lineAlpha;
            ctx.strokeStyle = "rgba(" + palette.line + ", " + alpha.toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        for (const d of dots) {
          ctx.fillStyle = d.main
            ? "rgba(" + palette.dot + ", " + d.a.toFixed(3) + ")"
            : "rgba(" + palette.alt + ", " + (d.a * palette.altScale).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }

        frame = requestAnimationFrame(draw);
      };

      const start = () => {
        if (running) return;
        running = true;
        frame = requestAnimationFrame(draw);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
      };

      host.addEventListener("pointermove", (e) => {
        const r = host.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.active = true;
      });
      host.addEventListener("pointerleave", () => { pointer.active = false; });

      window.addEventListener("resize", resize);
      resize();

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !document.hidden) start();
          else stop();
        }, { threshold: 0 }).observe(host);
      } else {
        start();
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else start();
      });
    });
  }

  /* ---------- Work: index labels and the stacking effect ---------- */

  const workItems = [...document.querySelectorAll(".work-item")];
  workItems.forEach((li, i) => {
    li.style.setProperty("--i", String(i));
    const body = li.querySelector(".work-body");
    if (body) {
      const idx = document.createElement("p");
      idx.className = "work-index";
      idx.textContent = String(i + 1).padStart(2, "0") + " / " + String(workItems.length).padStart(2, "0");
      body.insertBefore(idx, body.firstChild);
    }
  });

  function updateStack() {
    if (workItems.length < 2 || reduceMotion) return;
    for (let i = 0; i < workItems.length - 1; i += 1) {
      const card = workItems[i];
      const next = workItems[i + 1];
      const r = card.getBoundingClientRect();
      const n = next.getBoundingClientRect();
      const covered = clamp((r.bottom - n.top) / r.height, 0, 1);
      card.classList.toggle("is-covered", covered > 0);
      card.style.setProperty("--s", (1 - covered * 0.06).toFixed(3));
      card.style.setProperty("--b", (1 - covered * 0.08).toFixed(3));
    }
  }

  /* ---------- Stack: console that types the list, built from the grid ---------- */

  const terminal = document.querySelector("[data-stack-terminal]");
  const terminalBody = document.querySelector("[data-stack-terminal-body]");
  const stackGrid = document.querySelector(".stack-grid");
  if (terminal && terminalBody && stackGrid) {
    const groups = [...stackGrid.querySelectorAll(":scope > div")].map((g) => ({
      name: (g.querySelector("h3") || {}).textContent || "",
      items: [...g.querySelectorAll("li")].map((li) => li.textContent.trim()),
    }));
    const pad = Math.max(...groups.map((g) => g.name.length)) + 4;
    const lines = [{ cls: "cmd", text: "$ datadex stack --list" }]
      .concat(groups.map((g) => ({ cls: "key", text: g.name.toLowerCase().padEnd(pad, " "), rest: g.items.join(", ") })))
      .concat([{ cls: "cmd", text: "$ datadex stack --note" }, { cls: "key", text: "if your team already has a stack, we adopt it." }]);

    terminal.removeAttribute("hidden");
    stackGrid.classList.add("is-replaced");
    const escapeHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const renderAll = () => {
      terminalBody.innerHTML = lines.map((l) => '<span class="' + l.cls + '">' + escapeHtml(l.text) + "</span>" + (l.rest ? escapeHtml(l.rest) : "")).join("\n") + '\n<span class="key">$</span> <span class="cur"></span>';
    };

    if (reduceMotion) {
      renderAll();
    } else {
      let inView = false;
      let running = false;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const type = async () => {
        if (running) return;
        running = true;
        while (inView) {
          terminalBody.innerHTML = "";
          for (const l of lines) {
            if (!inView) break;
            const full = l.text + (l.rest || "");
            const span = document.createElement("span");
            const cur = document.createElement("span");
            cur.className = "cur";
            terminalBody.appendChild(span);
            terminalBody.appendChild(cur);
            for (let i = 1; i <= full.length; i += 1) {
              if (!inView) break;
              span.textContent = full.slice(0, i);
              await wait(l.cls === "cmd" ? 42 : 7);
            }
            cur.remove();
            span.outerHTML = '<span class="' + l.cls + '">' + escapeHtml(l.text) + "</span>" + (l.rest ? escapeHtml(l.rest) : "") + "\n";
            await wait(240);
          }
          if (!inView) break;
          terminalBody.insertAdjacentHTML("beforeend", '<span class="key">$</span> <span class="cur"></span>');
          await wait(5000);
        }
        running = false;
      };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting && !document.hidden;
          if (inView) type();
        }, { threshold: 0.2 }).observe(terminal);
      } else {
        inView = true;
        type();
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) inView = false;
      });
    }
  }

  /* ---------- Reviews: score beside one big quote, built from the list ---------- */

  const spotlight = document.querySelector("[data-reviews-spotlight]");
  const reviewList = document.querySelector("[data-reviews-list]");
  if (spotlight && reviewList) {
    const entries = [...reviewList.querySelectorAll("blockquote")].map((bq) => ({
      text: (bq.querySelector("p") || {}).textContent.trim().replace(/\s+/g, " "),
      name: (bq.querySelector("cite") || {}).textContent.trim(),
      avatar: (bq.querySelector("img") || {}).getAttribute("src"),
    })).filter((r) => r.text && r.name);

    if (entries.length) {
      const quote = spotlight.querySelector("[data-rs-quote]");
      const people = spotlight.querySelector("[data-rs-people]");
      let current = 0;
      let timer = 0;
      let inView = false;

      const show = (i) => {
        current = (i + entries.length) % entries.length;
        const r = entries[current];
        const words = r.text.split(" ").map((w, k) => '<span style="animation-delay:' + (reduceMotion ? 0 : k * 40) + 'ms">' + w.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "&nbsp;</span>").join("");
        quote.innerHTML = "<p>" + words + "</p><footer>" + (r.avatar ? '<img src="' + r.avatar + '" alt="" width="34" height="34">' : "") + "<cite>" + r.name + "</cite> on Fiverr</footer>";
        [...people.children].forEach((b, k) => {
          b.classList.toggle("is-on", k === current);
          b.setAttribute("aria-selected", String(k === current));
        });
      };
      const schedule = () => {
        clearTimeout(timer);
        if (reduceMotion || !inView) return;
        timer = window.setTimeout(() => { show(current + 1); schedule(); }, 7000);
      };

      entries.forEach((r, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", "Review by " + r.name);
        b.innerHTML = r.avatar ? '<img src="' + r.avatar + '" alt="">' : r.name.charAt(0);
        b.addEventListener("click", () => { show(i); schedule(); });
        people.appendChild(b);
      });

      spotlight.removeAttribute("hidden");
      reviewList.classList.add("is-replaced");

      // Reserve the height of the longest review so switching quotes never
      // moves the page, then re-measure if the viewport changes.
      const reserve = () => {
        const keep = quote.innerHTML;
        let max = 0;
        quote.style.minHeight = "0";
        entries.forEach((r) => {
          quote.innerHTML = "<p>" + r.text.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</p><footer><img alt=\"\" width=\"34\" height=\"34\"><cite>" + r.name + "</cite> on Fiverr</footer>";
          max = Math.max(max, quote.offsetHeight);
        });
        quote.innerHTML = keep;
        quote.style.minHeight = max + "px";
      };
      reserve();
      let resizeTimer = 0;
      window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(reserve, 150); });

      // The first quote is laid out at load with its word animation held, and
      // released the moment the section scrolls into view, so the reveal
      // plays for the visitor without the layout shifting.
      show(0);
      let started = false;
      if ("IntersectionObserver" in window && !reduceMotion) {
        quote.classList.add("is-waiting");
        new IntersectionObserver((e) => {
          inView = e[0].isIntersecting;
          if (inView && !started) { started = true; quote.classList.remove("is-waiting"); }
          schedule();
        }, { threshold: 0.3 }).observe(spotlight);
      } else {
        inView = true;
        started = true;
        schedule();
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) clearTimeout(timer); else schedule();
      });
    }
  }

  /* ---------- Process: rings that fill one after another ---------- */

  const process = document.querySelector(".process");
  const steps = process ? [...process.querySelectorAll(":scope > li")] : [];
  if (process && steps.length) {
    const stepMs = 3000;
    process.classList.add("has-rings");
    process.style.setProperty("--ring-ms", stepMs + "ms");
    steps.forEach((li, i) => {
      const ring = document.createElement("span");
      ring.className = "process-ring";
      ring.setAttribute("aria-hidden", "true");
      ring.innerHTML =
        '<svg class="ring" viewBox="0 0 56 56"><circle class="ring-bg" cx="28" cy="28" r="25"></circle><circle class="ring-fg" cx="28" cy="28" r="25"></circle></svg>' +
        "<b>" + (i + 1) + "</b>" +
        '<svg class="ring-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';
      li.insertBefore(ring, li.firstChild);
    });

    if (reduceMotion) {
      steps.forEach((li) => li.classList.add("is-done"));
    } else {
      let current = -1;
      let timer = 0;
      let inView = false;
      const paint = () => steps.forEach((li, k) => {
        li.classList.toggle("is-on", k === current);
        li.classList.toggle("is-done", k < current);
        if (k === current) {
          const fg = li.querySelector(".ring-fg");
          fg.style.animation = "none";
          void fg.offsetWidth;
          fg.style.animation = "";
        }
      });
      const tick = () => {
        // 0..4 fill one ring each; 5 holds the finished row before the reset
        current = (current + 1) % (steps.length + 1);
        paint();
        timer = window.setTimeout(tick, current === steps.length ? stepMs * 0.8 : stepMs);
      };
      const start = () => { if (!timer) tick(); };
      const stop = () => { clearTimeout(timer); timer = 0; };
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((e) => {
          inView = e[0].isIntersecting && !document.hidden;
          if (inView) start(); else stop();
        }, { threshold: 0.3 }).observe(process);
      } else {
        start();
      }
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop(); else if (inView) start();
      });
    }
  }

  /* ---------- Team: profile links orbit the lead engineer ---------- */

  const teamLinks = document.querySelector(".team-links");
  if (teamLinks && teamLinks.parentElement) {
    const icons = {
      fiverr: '<span class="team-link-icon fiverr" aria-hidden="true">fi</span>',
      portfolio: '<span class="team-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg></span>',
      linkedin: '<span class="team-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M8 10v7M8 7v.5M12 17v-4a2 2 0 0 1 4 0v4"></path></svg></span>',
      github: '<span class="team-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-4 1.5-4-2-6-2m12 4v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.7 11.7 0 0 0-6 0C6.8 2.8 5.8 3.1 5.8 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"></path></svg></span>',
      gitlab: '<span class="team-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21l-8-6 2-9 3 6h6l3-6 2 9z"></path></svg></span>',
    };
    const kind = (href) => {
      if (/fiverr/i.test(href)) return "fiverr";
      if (/linkedin/i.test(href)) return "linkedin";
      if (/gitlab/i.test(href)) return "gitlab";
      if (/github\.com/i.test(href)) return "github";
      return "portfolio";
    };

    const orbit = document.createElement("div");
    orbit.className = "team-orbit";
    orbit.innerHTML = '<div class="team-orbit-core" aria-hidden="true"><img src="./assets/images/apple-touch-icon.png" alt="" width="64" height="64"></div>';
    teamLinks.parentElement.insertBefore(orbit, teamLinks);
    orbit.appendChild(teamLinks);

    const items = [...teamLinks.querySelectorAll("li")];
    items.forEach((li, i) => {
      li.style.setProperty("--a", (360 / items.length) * i - 90 + "deg");
      const a = li.querySelector("a");
      if (a) a.insertAdjacentHTML("afterbegin", icons[kind(a.getAttribute("href") || "")]);
    });
  }

  /* ---------- Footer year ---------- */

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  onScroll();
})();
