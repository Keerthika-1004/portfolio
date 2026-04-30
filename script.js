(function () {
  "use strict";

  var STORAGE_NAME = "kiki_visitor_name_v2";
  var LEGACY_STORAGE_NAME = "kiki_visitor_name";
  var RESUME_URL = "resume.pdf";
  var RESUME_FILENAME = "Keerthika_S_Resume.pdf";

  var PHASE_ASK_NAME = "ask_name";
  var PHASE_MENU = "menu";

  var phase = PHASE_ASK_NAME;
  var visitorName = "";

  var launcher = document.getElementById("kiki-launcher");
  var panel = document.getElementById("kiki-panel");
  var closeBtn = document.getElementById("kiki-close");
  var messagesEl = document.getElementById("kiki-messages");
  var typingEl = document.getElementById("kiki-typing");
  var quickEl = document.getElementById("kiki-quick");
  var form = document.getElementById("kiki-form");
  var input = document.getElementById("kiki-input");
  var widget = document.getElementById("kiki-widget");

  var intentKeywords = {
    skills: ["skill", "skills", "tech", "stack", "technologies", "languages"],
    projects: ["project", "projects", "portfolio", "work samples"],
    experience: ["experience", "experiences", "work", "job", "jobs", "career", "history"],
    resume: ["resume", "cv", "download", "pdf"],
  };

  var RESPONSE_DELAY_MIN = 500;
  var RESPONSE_DELAY_MAX = 1000;
  var TYPEWRITER_MS = 18;

  /** Normalize stored/display names (bad characters caused garbled greetings). */
  function sanitizeStoredName(raw) {
    if (!raw || typeof raw !== "string") return "";
    var t = raw.trim().replace(/\s+/g, " ");
    t = t.replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
    if (t.length > 48) t = t.slice(0, 48);
    return t;
  }

  /** Older browsers saved plain UTF-8; wipe abandoned key once so bad values disappear. */
  (function dropLegacyKikiStorageKey() {
    try {
      sessionStorage.removeItem(LEGACY_STORAGE_NAME);
    } catch (_) {}
  })();

  function loadStoredName() {
    try {
      var raw = sanitizeStoredName(sessionStorage.getItem(STORAGE_NAME) || "");
      if (raw && /wjy/i.test(raw)) {
        sessionStorage.removeItem(STORAGE_NAME);
        return "";
      }
      return raw;
    } catch (_) {
      return "";
    }
  }

  function saveName(name) {
    try {
      sessionStorage.setItem(STORAGE_NAME, sanitizeStoredName(name || ""));
    } catch (_) {}
  }

  function randomDelay() {
    return (
      RESPONSE_DELAY_MIN + Math.random() * (RESPONSE_DELAY_MAX - RESPONSE_DELAY_MIN)
    );
  }

  function createBubble(who) {
    var div = document.createElement("div");
    div.className = "kiki__msg kiki__msg--" + who;
    div.setAttribute("role", "text");
    return div;
  }

  function appendUser(text) {
    var div = createBubble("user");
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function scrollDown() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    typingEl.hidden = false;
    scrollDown();
  }

  function hideTyping() {
    typingEl.hidden = true;
  }

  function typewriterInto(el, text, done) {
    el.textContent = "";
    var i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        scrollDown();
        setTimeout(tick, TYPEWRITER_MS);
      } else if (done) done();
    }
    tick();
  }

  function delayedBotPlain(text, useTypewriter) {
    hideQuickButtons();
    showTyping();
    setTimeout(function () {
      hideTyping();
      var div = createBubble("bot");
      messagesEl.appendChild(div);
      var tw =
        useTypewriter !== false &&
        text.indexOf("<") === -1 &&
        text.length <= 380;
      if (tw) {
        typewriterInto(div, text, function () {
          scrollDown();
          afterBotMessage();
        });
      } else {
        div.textContent = text;
        scrollDown();
        afterBotMessage();
      }
    }, randomDelay());
  }

  function afterBotMessage() {
    setTimeout(function () {
      if (phase === PHASE_MENU) showQuickButtons();
    }, 80);
  }

  function delayedBotRich(buildFn) {
    hideQuickButtons();
    showTyping();
    setTimeout(function () {
      hideTyping();
      var div = createBubble("bot");
      buildFn(div);
      messagesEl.appendChild(div);
      scrollDown();
      afterBotMessage();
    }, randomDelay());
  }

  function extractName(raw) {
    var t = raw.trim().replace(/^["']|["']$/g, "");
    var patterns = [
      /^i(?:'|\u2019)?m\s+(.+)$/i,
      /^i\s+am\s+(.+)$/i,
      /^my\s+name\s+is\s+(.+)$/i,
      /^call\s+me\s+(.+)$/i,
      /^this\s+is\s+(.+)$/i,
      /^it(?:'|\u2019)?s\s+(.+)$/i,
    ];
    var i,
      m;
    for (i = 0; i < patterns.length; i++) {
      m = t.match(patterns[i]);
      if (m) return cleanNamePart(m[1]);
    }
    return cleanNamePart(t);
  }

  function cleanNamePart(s) {
    var out = (s || "")
      .replace(/[\s.!?]+$/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(" ");
    return out || "friend";
  }

  function detectIntent(lower) {
    if (!lower.length) return null;
    if (/\b(resume|cv)\b/.test(lower) || lower.includes("pdf")) return "resume";
    if (
      /\b(skill|skills|tech|stack|technologies)\b/.test(lower) ||
      lower.includes("language")
    )
      return "skills";
    if (/\b(project|projects|portfolio)\b/.test(lower)) return "projects";
    if (
      /\b(experience|work|job|employment|history|vivriti|prodapt|career)\b/.test(
        lower.replace(/\s+/g, " ")
      ) ||
      lower.includes("experience")
    )
      return "experience";
    /* keyword intents */
    var key,
      kw,
      j;
    for (key in intentKeywords) {
      if (!Object.prototype.hasOwnProperty.call(intentKeywords, key)) continue;
      kw = intentKeywords[key];
      for (j = 0; j < kw.length; j++) {
        if (
          lower === kw[j] ||
          lower.includes(kw[j] + " ") ||
          lower.includes(" " + kw[j])
        )
          return key;
      }
    }
    return null;
  }

  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  var OPENERS_SKILLS = [
    "Sure thing — here’s what Keerthika brings to the table 👇✨",
    "Nice question 😊 Let me show you the stack 👇",
    "Love it — skills coming right up 💪",
  ];

  var OPENERS_PROJECTS = [
    "Great pick — here are some standout builds 👇🚀",
    "Here’s the fun stuff — real projects, real impact 👇",
    "Let me walk you through the highlights 👇✨",
  ];

  var OPENERS_EXP = [
    "Absolutely — here’s the journey so far 👇📍",
    "Solid question — experience snapshot below 👇",
    "Let’s talk shop — here’s the timeline 👇💼",
  ];

  var OPENERS_RESUME = [
    "Perfect — resume links right here 👇📄",
    "Easy — grab it below 👇🔗",
  ];

  var FALLBACK_LINES = [
    "Hmm — I’m mostly wired for skills, projects, experience & resume 😊\nPick one of the buttons or ask about those!",
    "Good question! I shine brightest on skills / projects / jobs / CV 💫 Try those?",
    "Let’s keep it focused — I’ve got skills, projects, experience & resume covered 🤝",
  ];

  function normalizeInput(s) {
    return (s || "")
      .trim()
      .toLowerCase()
      .replace(/[^\w\s@.+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function textSkills() {
    return (
      randomPick(OPENERS_SKILLS) +
      "\n\n" +
      "• Languages: Java 8, Java 21 ☕\n" +
      "• Frameworks: Spring Boot, Spring MVC, Spring Security\n" +
      "• Microservices: REST APIs, WebClient, API Gateway, Circuit Breaker\n" +
      "• Security & IAM: Keycloak (RBAC, realms, tokens 🔐)\n" +
      "• Data: PostgreSQL, MySQL, MariaDB, Aurora — plus integrations like Salesforce where needed\n" +
      "• Cloud & DevOps: Kubernetes, Docker, Jenkins, GCP ☁️\n" +
      "• Observability: OpenTelemetry, Jaeger, Actuator, SonarLint 📊\n" +
      "• Practices: Swagger/OpenAPI, JUnit, Jira, Git, Scrum\n\n" +
      "Want projects, experience, or the resume next? Just say the word 💬"
    );
  }

  function textProjects() {
    return (
      randomPick(OPENERS_PROJECTS) +
      "\n\n" +
      "• Co-lending platform (Apollo) — Vivriti ✨\n" +
      "Keycloak, gateway routing, microservices, tracing, Aurora — shipping features end-to-end.\n\n" +
      "• Automated user data rectification — Prodapt / Lumen 📡\n" +
      "Salesforce + Zuora automation — less manual work, faster turnaround.\n\n" +
      "• Hackathons & Gen AI 🤖\n" +
      "POCs with ChatGPT / OpenAI / Whisper-style workflows + innovation builds.\n\n" +
      "Curious about roles or the résumé? I’ve got that too 👋"
    );
  }

  function textExperience() {
    return (
      randomPick(OPENERS_EXP) +
      "\n\n" +
      "• Vivriti Capital — Software Engineer (Full Stack Developer)\n" +
      "Nov 2024 – Present · Apollo co-lending — React UI + backend, Keycloak, gateways, microservices, tracing, Aurora, Scrum-style delivery 🚀\n\n" +
      "• Prodapt — Associate Software Engineer\n" +
      "Aug 2022 – Oct 2024 · Lumen — Salesforce & Zuora automation, Spring APIs, quality & tests 💪\n\n" +
      "Happy to drop resume links whenever you’re ready 📎"
    );
  }

  function buildResume(div) {
    div.classList.add("kiki__msg--resume-links");
    var lead = document.createElement("p");
    lead.style.margin = "0";
    lead.textContent = randomPick(OPENERS_RESUME);
    div.appendChild(lead);

    var wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "0.5rem";

    var aView = document.createElement("a");
    aView.href = RESUME_URL;
    aView.target = "_blank";
    aView.rel = "noopener noreferrer";
    aView.className = "kiki__resume-btn";
    aView.textContent = "👀 View (new tab)";

    var aDl = document.createElement("a");
    aDl.href = RESUME_URL;
    aDl.download = RESUME_FILENAME;
    aDl.className = "kiki__resume-btn";
    aDl.textContent = "⬇️ Download PDF";

    wrap.appendChild(aView);
    wrap.appendChild(document.createTextNode(" "));
    wrap.appendChild(aDl);
    div.appendChild(wrap);
  }

  function respond(intent) {
    if (intent === "skills") delayedBotPlain(textSkills(), true);
    else if (intent === "projects") delayedBotPlain(textProjects(), true);
    else if (intent === "experience") delayedBotPlain(textExperience(), true);
    else if (intent === "resume")
      delayedBotRich(function (div) {
        buildResume(div);
      });
    else
      delayedBotPlain(randomPick(FALLBACK_LINES), true);
  }

  function hideQuickButtons() {
    quickEl.hidden = true;
    quickEl.innerHTML = "";
  }

  function showQuickButtons() {
    if (phase !== PHASE_MENU) return;
    quickEl.hidden = false;
    quickEl.innerHTML = "";

    function addQuick(label, intent) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kiki__quick-btn";
      b.textContent = label;
      b.addEventListener("click", function () {
        appendUser(label);
        respond(intent);
      });
      quickEl.appendChild(b);
    }

    addQuick("⚙️ Skills", "skills");
    addQuick("📁 Projects", "projects");
    addQuick("💼 Experience", "experience");
    addQuick("📄 Resume", "resume");
  }

  function onMenuMessage(raw) {
    var lower = normalizeInput(raw);
    if (!lower) return;
    appendUser(raw);
    var intent = detectIntent(lower);
    respond(intent);
  }

  function onAskNameMessage(raw) {
    if (!raw.trim()) return;
    appendUser(raw);
    visitorName = extractName(raw);
    saveName(visitorName);
    phase = PHASE_MENU;

    hideQuickButtons();
    showTyping();
    setTimeout(function () {
      hideTyping();
      var div = createBubble("bot");
      messagesEl.appendChild(div);
      var greet =
        "Lovely to meet you, " +
        visitorName +
        "! 🙌\nWhat would you like to peek at first - skills, projects, experience, or resume?";
      typewriterInto(div, greet, function () {
        showQuickButtons();
        scrollDown();
      });
    }, randomDelay());
  }

  function initChatContent() {
    hideTyping();
    messagesEl.innerHTML = "";
    visitorName = loadStoredName();
    if (visitorName) {
      phase = PHASE_MENU;
      var div = createBubble("bot");
      div.textContent =
        "Hey " +
        visitorName +
        "! Great to see you again 🤝\n" +
        "Tap a shortcut below or just ask - I'm here.";
      messagesEl.appendChild(div);
      showQuickButtons();
    } else {
      phase = PHASE_ASK_NAME;
      var ask = createBubble("bot");
      ask.textContent =
        "Hey there 👋 I'm Kiki!\nQuick one - what should I call you?";
      messagesEl.appendChild(ask);
      hideQuickButtons();
    }
    scrollDown();
  }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    widget.setAttribute("data-state", "open");
    initChatContent();
    input.focus();
  }

  function closePanel() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    widget.setAttribute("data-state", "collapsed");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = input.value;
    input.value = "";
    if (phase === PHASE_ASK_NAME) onAskNameMessage(val);
    else onMenuMessage(val);
  });

  launcher.addEventListener("click", function () {
    if (panel.hidden) openPanel();
    else closePanel();
  });

  closeBtn.addEventListener("click", function () {
    closePanel();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });
})();

(function () {
  "use strict";

  var THEME_KEY = "portfolio-theme";

  function applyTheme(mode) {
    var root = document.documentElement;
    root.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (_) {}
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    if (mode === "dark") {
      btn.textContent = "☀️";
      btn.setAttribute("aria-label", "Switch to light theme");
    } else {
      btn.textContent = "🌙";
      btn.setAttribute("aria-label", "Switch to dark theme");
    }
  }

  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch (_) {}
    var prefersDark = false;
    try {
      prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (_) {}
    var mode = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
    applyTheme(mode);
    btn.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  function initProjectFilters() {
    var bar = document.querySelector(".filters");
    if (!bar) return;
    var buttons = bar.querySelectorAll(".filter-btn");
    var cards = document.querySelectorAll(".project-card");

    function applyFilter(filterVal) {
      var f = (filterVal || "all").toLowerCase();
      cards.forEach(function (card) {
        var tagsStr = card.getAttribute("data-tags");
        var tags =
          tagsStr !== null ? tagsStr.trim().split(/\s+/).filter(Boolean) : [];
        var show;
        if (f === "all") {
          show = true;
        } else if (!tags.length) {
          show = false;
        } else {
          show = tags.indexOf(f) !== -1;
        }
        card.classList.toggle("hidden", !show);
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter") || "all";
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        applyFilter(f);
      });
    });
  }

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    function showAll() {
      els.forEach(function (el) {
        el.classList.add("visible");
      });
    }
    if (!els.length) return;
    if (!window.IntersectionObserver) {
      showAll();
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { rootMargin: "0px 0px -32px 0px", threshold: 0.06 }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  function initTypewriter() {
    var el = document.getElementById("typewriter");
    if (!el) return;
    var raw = el.getAttribute("data-words") || "[]";
    var words;
    try {
      words = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!words || !words.length) return;

    var wordIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var typeMs = 85;
    var deleteMs = 42;
    var pauseFull = 2200;
    var pauseBetween = 480;

    function tick() {
      var full = words[wordIndex];
      if (!deleting) {
        charIndex++;
        el.textContent = full.substring(0, charIndex);
        if (charIndex >= full.length) {
          setTimeout(function () {
            deleting = true;
            tick();
          }, pauseFull);
        } else {
          setTimeout(tick, typeMs);
        }
      } else {
        charIndex--;
        el.textContent = full.substring(0, Math.max(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          setTimeout(tick, pauseBetween);
        } else {
          setTimeout(tick, deleteMs);
        }
      }
    }

    el.textContent = "";
    setTimeout(tick, 600);
  }

  function initScrollSpy() {
    var ids = ["about", "skills", "projects", "experience", "contact"];
    function tick() {
      var threshold = 140;
      var active = "";
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var top = el.getBoundingClientRect().top;
        if (top <= threshold) active = id;
      });
      document.querySelectorAll(".nav__link[data-nav]").forEach(function (link) {
        link.classList.toggle(
          "nav__link--active",
          active && link.getAttribute("data-nav") === active
        );
      });
    }
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    tick();
  }

  function initSkillBars() {
    var cards = document.querySelectorAll("[data-skill-card]");
    if (!cards.length || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll(".skill-row[data-pct]").forEach(function (row) {
            var fill = row.querySelector(".skill-row__fill");
            var pct = row.getAttribute("data-pct");
            if (fill && pct) fill.style.width = pct + "%";
          });
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );
    cards.forEach(function (c) {
      io.observe(c);
    });
  }

  function initProjectModal() {
    var dlg = document.getElementById("project-modal");
    var titleEl = document.getElementById("project-modal-title");
    var bodyEl = document.getElementById("project-modal-body");
    var btnClose = document.getElementById("project-modal-close");
    if (!dlg || !titleEl || !bodyEl) return;

    function openModal(btn) {
      var tid = btn.getAttribute("data-detail-template");
      var tpl = tid ? document.getElementById(tid) : null;
      var card = btn.closest(".project-card");
      var ht = card ? card.querySelector(".card__title") : null;
      titleEl.textContent = ht ? ht.textContent : "Details";
      bodyEl.innerHTML = "";
      if (tpl && tpl.content) {
        bodyEl.appendChild(document.importNode(tpl.content, true));
      }
      if (typeof dlg.showModal === "function") dlg.showModal();
      else alert("Details unavailable — please update your browser.");
    }

    function closeModal() {
      if (dlg.open && typeof dlg.close === "function") dlg.close();
    }

    document.querySelectorAll(".btn-project-detail").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openModal(btn);
      });
    });

    if (btnClose) btnClose.addEventListener("click", closeModal);

    dlg.addEventListener("click", function (e) {
      var rect = dlg.querySelector(".project-modal__surface");
      if (e.target === dlg) closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dlg.open) closeModal();
    });
  }

  function bootPortfolioUI() {
    initTheme();
    initTypewriter();
    initProjectFilters();
    initReveal();
    initScrollSpy();
    initSkillBars();
    initProjectModal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPortfolioUI);
  } else {
    bootPortfolioUI();
  }
})();
