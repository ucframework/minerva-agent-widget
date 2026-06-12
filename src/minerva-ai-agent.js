"use strict";

/**
 * Minerva AI Agent Widget
 * A lightweight, embeddable AI chat widget for usage in UC Pages websites.
 *
 * @class
 * @param {Object} config - Configuration object for the widget
 */
class MinervaAIAgent {
  constructor(config) {
    this.config = this._mergeConfig(config);
    this.lang = this._resolveInitialLang();

    this.container = null;
    this.shadow = null;
    this.fab = null;
    this.fabIcon = null;
    this.fabLabel = null;
    this.chatPanel = null;
    this.transport = null;
    this.isOpen = false;
    this.isExpanded = false;
    this._introRunning = false;

    this._init();
  }

  /**
   * Resolve the initial UI language: English when the browser is set to
   * English, otherwise Portuguese (the default for this audience).
   * @private
   */
  _resolveInitialLang() {
    const nav =
      (typeof navigator !== "undefined" &&
        (navigator.language || navigator.languages?.[0])) ||
      "";
    return nav.toLowerCase().startsWith("en") ? "en" : "pt";
  }

  /**
   * Set the UI language ("pt" or "en") at runtime. Re-renders the open
   * widget so the change is reflected immediately.
   */
  setLanguage(lang) {
    const next = lang === "en" ? "en" : "pt";
    if (next === this.lang) return;
    this.lang = next;

    if (this.fab && this.fabLabel && !this.isOpen) {
      this.fabLabel.textContent = "";
    }
    if (this.isOpen && this.chatPanel) {
      this.chatPanel.innerHTML = "";
      this._renderPanelContent();
    }
  }

  /**
   * Merge provided config with defaults
   * @private
   */
  _mergeConfig(provided) {
    // Integrator-facing options: primaryColor, apiUrl, domain, provider,
    // search. Labels live in code (see LABELS / _getLabels), language is
    // resolved from the browser and changed via setLanguage().
    // - apiUrl: see _getApiBase for resolution order and default.
    // - domain ("sgrh" | "sga"): when absent, the widget asks the user on
    //   first open (picker built from /api/get_configs).
    // - provider ("iaedu" | "ollama"): LLM used by the backend.
    // - search ("dense" | "sparse" | "hybrid"): retrieval strategy.
    return {
      primaryColor: provided?.primaryColor || "#20A495",
      apiUrl: provided?.apiUrl || null,
      domain: provided?.domain || null,
      provider: provided?.provider || "iaedu",
      search: provided?.search || "dense",
    };
  }

  /**
   * UI strings, in code (not config). One entry per language; pick the
   * current one with _label(). To add a string, add it to both pt and en.
   * @private
   */
  _getLabels() {
    return {
      pt: {
        header: "Minerva",
        button: "Enviar",
        placeholder: "Escreva sua pergunta...",
        fab: "Pergunte à Minerva",
        stop: "Parar",
        stopped: "Resposta interrompida.",
        thinking: [
          "A pesquisar documentos…",
          "A analisar a documentação…",
          "A redigir a resposta…",
          "Quase pronto…",
        ],
        pickerTitle: "Sobre que serviço quer falar?",
        pickerError: "Não foi possível carregar os serviços.",
        retry: "Tentar novamente",
        networkError:
          "Não foi possível contactar o serviço. Verifique a sua ligação à internet (e a VPN da UC, se aplicável) e tente novamente.",
        genericError: "Ocorreu um erro. Por favor, tente novamente.",
      },
      en: {
        header: "Minerva",
        button: "Send",
        placeholder: "Write your question...",
        fab: "Ask Minerva",
        stop: "Stop",
        stopped: "Response stopped.",
        thinking: [
          "Searching documents…",
          "Reading the documentation…",
          "Writing the answer…",
          "Almost there…",
        ],
        pickerTitle: "Which service do you need help with?",
        pickerError: "Could not load the services.",
        retry: "Try again",
        networkError:
          "Could not reach the service. Check your internet connection (and the UC VPN, if applicable) and try again.",
        genericError: "An error occurred. Please try again.",
      },
    };
  }

  /**
   * Get a UI string for the current language.
   * @private
   */
  _label(key) {
    return this._getLabels()[this.lang][key];
  }

  /**
   * The API base URL. Resolved, in order, from:
   *   1. config.apiUrl — passed to minervaAgent.init({ apiUrl }); the
   *      explicit per-integration override.
   *   2. the build-time environment — esbuild replaces process.env.API_URL
   *      with the value from the active .env file (.env.local / .env.development
   *      / .env.production).
   *   3. window.MINERVA_API_URL — an explicit global for previewing the
   *      unbuilt source over a plain static server.
   *   4. the default endpoint: https://uc-vortex.dev.ucframework.pt
   * @private
   */
  _getApiBase() {
    const DEFAULT_API_URL = "https://uc-vortex.dev.ucframework.pt";
    let apiUrl = this.config.apiUrl;
    if (!apiUrl) {
      try {
        apiUrl = process.env.API_URL;
      } catch {
        apiUrl = undefined;
      }
    }
    if (!apiUrl && typeof window !== "undefined") {
      apiUrl = window.MINERVA_API_URL;
    }
    if (!apiUrl) {
      apiUrl = DEFAULT_API_URL;
    }
    return String(apiUrl).replace(/\/+$/, "");
  }

  /**
   * SVG icons map
   * @private
   */
  _getSVGMap() {
    return {
      search: `<svg class="minerva-fab-icon" viewBox="0 0 12334 12334" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7124.59 4321.49C7483.25 4321.49 7774 4030.59 7774 3671.75C7774 3312.9 7483.25 3022 7124.59 3022C6765.92 3022 6475.17 3312.9 6475.17 3671.75C6475.17 4030.59 6765.92 4321.49 7124.59 4321.49Z" fill="currentColor"/>
        <path d="M3084 5473.03C4179.86 5473.03 5068.22 4584.67 5068.22 3488.81H5465.07C5465.07 4584.67 6353.45 5473.03 7449.29 5473.03V5869.88C6353.45 5869.88 5465.07 6758.25 5465.07 7854.1H5068.22C5068.22 6758.25 4179.86 5869.88 3084 5869.88V5473.03Z" fill="currentColor"/>
        <path d="M9733.49 8874.83L12333.8 11475.1L11475.1 12333.8L8874.83 9733.49C7939.86 10481.5 6754.12 10929 5464.5 10929C2448.1 10929 0 8480.9 0 5464.5C0 2448.1 2448.1 0 5464.5 0C8480.9 0 10929 2448.1 10929 5464.5C10929 6754.12 10481.5 7939.86 9733.49 8874.83ZM8515.33 8424.32C9257.77 7659.16 9714.67 6615.45 9714.67 5464.5C9714.67 3116.28 7812.72 1214.33 5464.5 1214.33C3116.28 1214.33 1214.33 3116.28 1214.33 5464.5C1214.33 7812.72 3116.28 9714.67 5464.5 9714.67C6615.45 9714.67 7659.16 9257.77 8424.32 8515.33L8515.33 8424.32Z" fill="currentColor"/>
      </svg>`,
      close: `<svg class="minerva-fab-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      expand: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5858 5H14V3H21V10H19V6.41421L14.7071 10.7071L13.2929 9.29289L17.5858 5ZM3 14H5V17.5858L9.29289 13.2929L10.7071 14.7071L6.41421 19H10V21H3V14Z"></path></svg>`,
      collapse: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4.00008H13V11.0001H20V9.00008H16.4142L20.7071 4.70718L19.2929 3.29297L15 7.58586V4.00008ZM4.00008 15H7.58586L3.29297 19.2929L4.70718 20.7071L9.00008 16.4142V20H11.0001V13H4.00008V15Z"></path></svg>`,
      minimize: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      reset: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z"></path></svg>`,
      send: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16396503 C3.34915502,0.9 2.40734225,0.9 1.77946707,1.4429026 C0.994623095,2.0751824 0.837654326,3.16451446 1.15159189,3.9 L3.03521743,10.3409914 C3.03521743,10.4980889 3.19218622,10.6551863 3.50612381,10.6551863 L16.6915026,11.4406732 C16.6915026,11.4406732 17.1624089,11.4406732 17.1624089,12.0729531 C17.1624089,12.5442452 16.6915026,12.4744748 16.6915026,12.4744748 Z" fill="currentColor"/>
      </svg>`,
      copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM5.00242 8L5.00019 20H14.9998V8H5.00242ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z"></path></svg>`,
      checkmark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"></path></svg>`,
      headerSearch: `<svg class="minerva-header-icon" viewBox="0 0 12334 12334" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7124.59 4321.49C7483.25 4321.49 7774 4030.59 7774 3671.75C7774 3312.9 7483.25 3022 7124.59 3022C6765.92 3022 6475.17 3312.9 6475.17 3671.75C6475.17 4030.59 6765.92 4321.49 7124.59 4321.49Z" fill="currentColor"/>
        <path d="M3084 5473.03C4179.86 5473.03 5068.22 4584.67 5068.22 3488.81H5465.07C5465.07 4584.67 6353.45 5473.03 7449.29 5473.03V5869.88C6353.45 5869.88 5465.07 6758.25 5465.07 7854.1H5068.22C5068.22 6758.25 4179.86 5869.88 3084 5869.88V5473.03Z" fill="currentColor"/>
        <path d="M9733.49 8874.83L12333.8 11475.1L11475.1 12333.8L8874.83 9733.49C7939.86 10481.5 6754.12 10929 5464.5 10929C2448.1 10929 0 8480.9 0 5464.5C0 2448.1 2448.1 0 5464.5 0C8480.9 0 10929 2448.1 10929 5464.5C10929 6754.12 10481.5 7939.86 9733.49 8874.83ZM8515.33 8424.32C9257.77 7659.16 9714.67 6615.45 9714.67 5464.5C9714.67 3116.28 7812.72 1214.33 5464.5 1214.33C3116.28 1214.33 1214.33 3116.28 1214.33 5464.5C1214.33 7812.72 3116.28 9714.67 5464.5 9714.67C6615.45 9714.67 7659.16 9257.77 8424.32 8515.33L8515.33 8424.32Z" fill="currentColor"/>
      </svg>`,
    };
  }

  /**
   * Get SVG by name
   * @private
   */
  _getSVG(name) {
    const svgMap = this._getSVGMap();
    return svgMap[name] || "";
  }

  /**
   * Initialize the widget
   * @private
   */
  _init() {
    this._createContainer();
    this._createFAB();
    this._setupTransport();

    // The panel shrinks with the window via CSS (max-height); when the
    // window gets too short for even a cramped panel, minimize the chat.
    // Desktop layouts only — on mobile the panel is full-screen and the
    // on-screen keyboard legitimately shrinks the viewport.
    this._onWindowResize = () => {
      if (this.isOpen && window.innerWidth > 520 && window.innerHeight < 380) {
        this._closeChat({ focusFab: false });
      }
    };
    window.addEventListener("resize", this._onWindowResize);
  }

  /**
   * Create the main container
   * @private
   */
  _createContainer() {
    this.container = document.createElement("div");
    this.container.id = "minerva-agent-container";
    document.body.appendChild(this.container);

    const shadowHost = document.createElement("div");
    this.container.appendChild(shadowHost);
    this._applyThemeVars(shadowHost);
    this.shadow = shadowHost.attachShadow({ mode: "closed" });

    const link = document.createElement("link");
    link.rel = "stylesheet";
    const scripts = document.querySelectorAll(
      'script[src*="minerva-ai-agent.js"]',
    );
    if (scripts.length > 0) {
      const scriptSrc = scripts[scripts.length - 1].src;
      const basePath = scriptSrc.substring(0, scriptSrc.lastIndexOf("/"));
      link.href = basePath + "/minerva-ai-agent.css";
    } else {
      link.href = "minerva-ai-agent.css";
    }
    this.shadow.appendChild(link);
  }

  /**
   * Apply theme as inline custom properties on the shadow host.
   * Inline style.setProperty() beats any rule inside the shadow root,
   * so the configured color always wins over CSS defaults.
   * @private
   */
  _applyThemeVars(host) {
    host.style.setProperty("--minerva-primary", this.config.primaryColor);
    host.style.setProperty(
      "--minerva-primary-hover",
      this._darken(this.config.primaryColor, 0.12),
    );
  }

  /**
   * Darken a #rrggbb hex color by a 0..1 amount. Falls back to the
   * input if it isn't a parseable 6-digit hex.
   * @private
   */
  _darken(hex, amount) {
    const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = 1 - amount;
    const r = Math.round(((n >> 16) & 255) * f);
    const g = Math.round(((n >> 8) & 255) * f);
    const b = Math.round((n & 255) * f);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  /**
   * Create floating action button
   * @private
   */
  _createFAB() {
    const widget = document.createElement("div");
    widget.className = "minerva-widget";
    this.shadow.appendChild(widget);

    this.fab = document.createElement("button");
    this.fab.className = "minerva-fab";
    this.fab.setAttribute("aria-label", "Open support");
    this.fab.setAttribute("aria-haspopup", "dialog");
    this.fab.setAttribute("aria-expanded", "false");

    this.fabIcon = document.createElement("span");
    this.fabIcon.className = "minerva-fab-icon-wrap";
    this.fabIcon.innerHTML = this._getSearchIconSVG();

    this.fabLabel = document.createElement("span");
    this.fabLabel.className = "minerva-fab-label";

    this.fab.appendChild(this.fabIcon);
    this.fab.appendChild(this.fabLabel);
    widget.appendChild(this.fab);

    this.fab.addEventListener("click", () => this._toggleChat());

    this._scheduleFabIntro();
  }

  /**
   * Expand the FAB into a pill and type out the label character by
   * character (typewriter effect), hold it, then erase and collapse.
   * Driven by a single requestAnimationFrame loop so it cannot fire
   * after destroy(). Clicks during the intro still toggle the chat;
   * the icon swap is deferred (see _updateFABIcon) so the intro plays
   * to the end and only then reconciles to the open/closed state.
   * @private
   */
  _scheduleFabIntro() {
    const text = this._label("fab");
    const delayFrames = 30; // ~0.5s before it starts
    const charFrames = 8; // frames between each typed character
    const holdFrames = 240; // ~4s fully typed
    let frames = 0;

    this._introRunning = true;

    // Pause the animation (notably the erase phase) while the pointer is
    // over the FAB, so hovering keeps the label visible. It resumes —
    // and only then can dismiss — once the pointer leaves.
    let hovering = false;
    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
    };
    this.fab.addEventListener("mouseenter", onEnter);
    this.fab.addEventListener("mouseleave", onLeave);

    const finish = () => {
      this._introRunning = false;
      if (this.fab) {
        this.fab.removeEventListener("mouseenter", onEnter);
        this.fab.removeEventListener("mouseleave", onLeave);
        this.fab.classList.remove("minerva-fab-expanded");
        this._updateFABIcon();
      }
      if (this.fabLabel) this.fabLabel.textContent = "";
    };

    const tick = () => {
      if (!this.fab) {
        this._introRunning = false;
        return;
      }

      // Freeze progress while hovered (but keep the loop alive so it
      // resumes on mouseleave). Don't freeze during the initial delay or
      // the typing phase — only once the label is fully shown.
      const fullyTyped = frames >= delayFrames + text.length * charFrames;
      if (hovering && fullyTyped) {
        requestAnimationFrame(tick);
        return;
      }

      frames++;

      if (frames === delayFrames) {
        this.fab.classList.add("minerva-fab-expanded");
      }

      if (frames >= delayFrames) {
        const elapsed = frames - delayFrames;
        const typed = Math.floor(elapsed / charFrames);

        if (typed <= text.length) {
          this.fabLabel.textContent = text.slice(0, typed);
        } else if (typed <= text.length + Math.ceil(holdFrames / charFrames)) {
          this.fabLabel.textContent = text;
        } else {
          const erased =
            typed - text.length - Math.ceil(holdFrames / charFrames);
          const remaining = text.length - erased;
          if (remaining <= 0) {
            finish();
            return;
          }
          this.fabLabel.textContent = text.slice(0, remaining);
        }
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Get search icon SVG
   * @private
   */
  _getSearchIconSVG() {
    return this._getSVG("search");
  }

  /**
   * Get close icon SVG
   * @private
   */
  _getCloseIconSVG() {
    return this._getSVG("close");
  }

  /**
   * Setup transport layer
   * @private
   */
  _setupTransport() {
    const apiBase = this._getApiBase();

    const json = async (method, path, body, signal) => {
      const res = await fetch(apiBase + path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
      const text = await res.text();
      let data = null;
      try {
        data = this._parseJsonLoose(text);
      } catch {}
      if (!res.ok) {
        // Mock errors look like { error: { message } }, the real backend
        // (DRF) uses { detail }.
        const detail = data?.error?.message || data?.detail || "";
        const err = new Error(
          `${res.status} ${res.statusText}${detail ? " — " + detail : ""}`,
        );
        err.status = res.status;
        throw err;
      }
      if (data === null) {
        throw new Error("Invalid JSON response from API");
      }
      return data;
    };

    this.transport = {
      getConfigs: () => json("GET", "/api/get_configs"),
      newThread: ({ domain, provider, search }, { signal } = {}) =>
        json("POST", "/api/chat/new", { domain, provider, search }, signal),
      sendMessage: ({ threadId, message }, { signal } = {}) =>
        json(
          "POST",
          "/api/chat/message",
          { thread_id: threadId, message },
          signal,
        ),
    };
  }

  /**
   * JSON.parse with a fallback for the real backend, which emits raw
   * (unescaped) control characters — \r\n inside welcome_message — that
   * strict JSON parsers reject. The fallback walks the text and escapes
   * control characters found inside string literals only, leaving
   * structural whitespace untouched.
   * @private
   */
  _parseJsonLoose(text) {
    try {
      return JSON.parse(text);
    } catch {}
    let out = "";
    let inString = false;
    let escaped = false;
    for (const ch of text) {
      if (inString) {
        if (escaped) {
          escaped = false;
          out += ch;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          out += ch;
          continue;
        }
        if (ch === '"') {
          inString = false;
          out += ch;
          continue;
        }
        const code = ch.charCodeAt(0);
        if (code < 0x20) {
          out += "\\u" + code.toString(16).padStart(4, "0");
          continue;
        }
        out += ch;
      } else {
        if (ch === '"') inString = true;
        out += ch;
      }
    }
    return JSON.parse(out);
  }

  /**
   * Toggle chat panel open/close
   * @private
   */
  _toggleChat() {
    if (this.isOpen) {
      this._closeChat();
    } else {
      this._openChat();
    }
  }

  /**
   * Open chat panel
   * @private
   */
  _openChat() {
    this.isOpen = true;

    const widget = this.shadow.querySelector(".minerva-widget");
    widget.classList.add("minerva-open");
    this.chatPanel = document.createElement("div");
    this.chatPanel.className = "minerva-chat-panel";
    this.chatPanel.id = "minerva-chat-panel";
    this.chatPanel.setAttribute("role", "dialog");
    this.chatPanel.setAttribute("aria-modal", "true");
    this.chatPanel.setAttribute("aria-label", this._label("header"));
    widget.appendChild(this.chatPanel);

    // Escape stops an in-flight answer, otherwise closes the panel.
    // Tab is kept cycling inside the panel (it is a modal dialog).
    this.chatPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (this.busy && this._abort) {
          this._stopRequest();
        } else {
          this._closeChat();
        }
        return;
      }
      if (e.key === "Tab") {
        const focusables = [
          ...this.chatPanel.querySelectorAll(
            "button, textarea, summary, a[href]",
          ),
        ].filter((f) => !f.disabled && f.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = this.shadow.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    this._renderPanelContent();
    this.fab.setAttribute("aria-expanded", "true");
    this._updateFABIcon();
  }

  /**
   * Decide what the open panel shows: the domain picker when no domain
   * is configured (constructor option or remembered choice), then the
   * consent gate, then the chat itself. Assumes an empty chatPanel.
   * @private
   */
  _renderPanelContent() {
    if (!this.config.domain) {
      this.config.domain = this._loadSavedDomain();
    }
    if (!this.config.domain) {
      this._createDomainPickerUI();
    } else if (this._hasConsent()) {
      this._createChatUI();
    } else {
      this._createConsentUI();
    }
  }

  /**
   * Close chat panel
   * @private
   */
  _closeChat({ focusFab = true } = {}) {
    this.isOpen = false;
    this.isExpanded = false;

    const widget = this.shadow?.querySelector(".minerva-widget");
    if (widget) widget.classList.remove("minerva-open");

    if (this.chatPanel) {
      this.chatPanel.classList.add("exit-animation");
      setTimeout(() => {
        if (this.chatPanel) {
          this.chatPanel.remove();
          this.chatPanel = null;
        }
      }, 300);
    }

    if (this.fab) {
      this.fab.setAttribute("aria-expanded", "false");
      if (focusFab) this.fab.focus();
    }
    this._updateFABIcon();
  }

  /**
   * Update FAB icon based on open/close state. While the intro
   * animation is running, the icon and expanded pill are left alone —
   * finish() reconciles them once the animation completes.
   * @private
   */
  _updateFABIcon() {
    if (this._introRunning) return;

    if (this.isOpen) {
      this.fabIcon.innerHTML = this._getCloseIconSVG();
      this.fab.setAttribute("aria-label", "Close support");
    } else {
      this.fabIcon.innerHTML = this._getSearchIconSVG();
      this.fab.setAttribute("aria-label", "Open support");
    }
  }

  /**
   * Consent storage key, scoped per domain like the state key.
   * @private
   */
  _consentKey() {
    return `minerva-agent:consent:${this.config.domain}`;
  }

  /**
   * Friendly display name for a backend domain key, per language.
   * Unknown keys fall back to the uppercased key.
   * @private
   */
  _domainDisplayName(key) {
    const names = {
      pt: {
        sgrh: "Recursos Humanos (SGRH)",
        sga: "Serviços Académicos (SGA)",
      },
      en: {
        sgrh: "Human Resources (SGRH)",
        sga: "Academic Services (SGA)",
      },
    };
    return names[this.lang][key] || key.toUpperCase();
  }

  /**
   * The user's domain choice (when the integrator didn't set one) is
   * remembered on the device for 24 hours, like the conversation.
   * @private
   */
  _domainKey() {
    return "minerva-agent:domain";
  }

  /**
   * Load the persisted domain choice, or null if absent/expired.
   * @private
   */
  _loadSavedDomain() {
    const TTL = 24 * 60 * 60 * 1000;
    try {
      const raw = localStorage.getItem(this._domainKey());
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved?.domain || Date.now() - saved.savedAt > TTL) {
        localStorage.removeItem(this._domainKey());
        return null;
      }
      return saved.domain;
    } catch {
      return null;
    }
  }

  /**
   * Persist the domain choice.
   * @private
   */
  _saveDomain(domain) {
    try {
      localStorage.setItem(
        this._domainKey(),
        JSON.stringify({ domain, savedAt: Date.now() }),
      );
    } catch {}
  }

  /**
   * Conversation state (thread id + messages) is kept in localStorage for
   * 24 hours from the last activity, so reloading the page or reopening
   * the tab restores the conversation. The reset button wipes it.
   * @private
   */
  _stateKey() {
    return `minerva-agent:state:${this.config.domain}`;
  }

  /**
   * Load persisted conversation state, or null if absent/expired.
   * @private
   */
  _loadState() {
    const TTL = 24 * 60 * 60 * 1000;
    try {
      const raw = localStorage.getItem(this._stateKey());
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!state || typeof state.savedAt !== "number") return null;
      if (Date.now() - state.savedAt > TTL) {
        localStorage.removeItem(this._stateKey());
        return null;
      }
      return state;
    } catch {
      return null;
    }
  }

  /**
   * Persist the current thread id and message log (last 50 messages).
   * @private
   */
  _saveState() {
    try {
      localStorage.setItem(
        this._stateKey(),
        JSON.stringify({
          threadId: this._threadId || null,
          messages: (this._messages || []).slice(-50),
          savedAt: Date.now(),
        }),
      );
    } catch {}
  }

  /**
   * Wipe persisted conversation state.
   * @private
   */
  _clearState() {
    try {
      localStorage.removeItem(this._stateKey());
    } catch {}
  }

  /**
   * Whether the user agreed to the disclaimer in the last 24 hours.
   * Stored in localStorage with the same TTL as the conversation state,
   * so a restored conversation is never shown behind a consent gate the
   * user already accepted.
   * @private
   */
  _hasConsent() {
    const TTL = 24 * 60 * 60 * 1000;
    try {
      const at = Number(localStorage.getItem(this._consentKey()));
      return !!at && Date.now() - at < TTL;
    } catch {
      return false;
    }
  }

  /**
   * Hardcoded consent/disclaimer copy, per language.
   * @private
   */
  _getConsentContent() {
    const lang = this.lang;
    const content = {
      pt: {
        intro: "Ao clicar em 'Concordo' e utilizar este serviço, confirma que:",
        bullets: [
          "Reconhece que está a interagir com um serviço de Inteligência Artificial",
          "As respostas são geradas automaticamente e podem conter erros",
          "Não deve partilhar dados pessoais sensíveis ou confidenciais",
          "Concorda com o tratamento dos seus dados para prestação do serviço conversacional",
        ],
        cancel: "Cancelar",
        agree: "Concordo",
      },
      en: {
        intro:
          "By clicking 'I agree' and using this service, you are confirming that:",
        bullets: [
          "You acknowledge you are engaging with an AI service",
          "Responses are generated automatically and may contain errors",
          "You should not share sensitive or confidential personal data",
          "You consent to the processing of your data to provide the conversational service",
        ],
        cancel: "Cancel",
        agree: "I agree",
      },
    };
    return content[lang];
  }

  /**
   * Render the domain picker shown when no domain was configured. The
   * options come from the backend (/api/get_configs); picking one stores
   * the choice for 24h and moves on to the consent gate / chat.
   * @private
   */
  async _createDomainPickerUI() {
    const title = this._label("header");
    this.chatPanel.innerHTML = `
      <div class="minerva-root">
        <div class="minerva-header">
          ${this._getSVG("headerSearch")}
          <span class="minerva-header-title">${this._escape(title)}</span>
        </div>
        <div class="minerva-domain-picker">
          <p class="minerva-domain-title">${this._escape(this._label("pickerTitle"))}</p>
          <div class="minerva-domain-list">
            <div class="minerva-bubble minerva-typing"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    `;
    this._addHeaderControls({ includeReset: false });

    const list = this.chatPanel.querySelector(".minerva-domain-list");
    try {
      const configs = await this.transport.getConfigs();
      const keys = Object.keys(configs?.domains || {});
      if (!keys.length) throw new Error("no domains");
      // The panel may have been closed or re-rendered while fetching.
      if (!list.isConnected) return;
      list.innerHTML = "";
      for (const key of keys) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "minerva-domain-btn";
        btn.textContent = this._domainDisplayName(key);
        btn.addEventListener("click", () => {
          this.config.domain = key;
          this._saveDomain(key);
          this.chatPanel.innerHTML = "";
          this._renderPanelContent();
        });
        list.appendChild(btn);
      }
      list.querySelector("button")?.focus();
    } catch {
      if (!list.isConnected) return;
      list.innerHTML = "";
      const msg = document.createElement("p");
      msg.className = "minerva-domain-error";
      msg.textContent = this._label("pickerError");
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "minerva-domain-btn";
      retryBtn.textContent = this._label("retry");
      retryBtn.addEventListener("click", () => this._createDomainPickerUI());
      list.appendChild(msg);
      list.appendChild(retryBtn);
      retryBtn.focus();
    }
  }

  /**
   * Render the consent gate shown on first open of a session.
   * @private
   */
  _createConsentUI() {
    const c = this._getConsentContent();
    const title = this._label("header");

    this.chatPanel.innerHTML = `
      <div class="minerva-root">
        <div class="minerva-header">
          ${this._getSVG("headerSearch")}
          <span class="minerva-header-title">${this._escape(title)}</span>
        </div>
        <div class="minerva-consent">
          <p class="minerva-consent-intro">${this._escape(c.intro)}</p>
          <ul class="minerva-consent-list">
            ${c.bullets.map((b) => `<li>${this._escape(b)}</li>`).join("")}
          </ul>
        </div>
        <div class="minerva-consent-actions">
          <button type="button" class="minerva-consent-btn minerva-consent-cancel">${this._escape(c.cancel)}</button>
          <button type="button" class="minerva-consent-btn minerva-consent-agree">${this._escape(c.agree)}</button>
        </div>
      </div>
    `;

    this._addHeaderControls({ includeReset: false });

    this.chatPanel.querySelector(".minerva-consent-agree").focus();

    this.chatPanel
      .querySelector(".minerva-consent-cancel")
      .addEventListener("click", () => this._closeChat());

    this.chatPanel
      .querySelector(".minerva-consent-agree")
      .addEventListener("click", () => {
        try {
          localStorage.setItem(this._consentKey(), String(Date.now()));
        } catch {}
        this.chatPanel.innerHTML = "";
        this._createChatUI();
      });
  }

  /**
   * Create chat UI
   * @private
   */
  _createChatUI() {
    const chatContent = this._getChatHTML();
    this.chatPanel.innerHTML = chatContent;

    this._setupChatHandlers();
    this._addHeaderControls();
    this.chatPanel.querySelector("textarea").focus();
  }

  /**
   * Get chat HTML template
   * @private
   */
  _getChatHTML() {
    const chatTitle = this._label("header");
    const placeholderText = this._label("placeholder");
    const sendBtnLabel = this._label("button");

    return `
      <div class="minerva-root">
        <div class="minerva-header">
          ${this._getSVG("headerSearch")}
          <span class="minerva-header-title">${this._escape(chatTitle)}</span>
        </div>
        <div class="minerva-messages" role="log" aria-live="polite"></div>
        <form class="minerva-composer">
          <div class="minerva-input-wrapper">
            <textarea rows="1" placeholder="${this._escape(placeholderText)}" aria-label="Message"></textarea>
            <button type="submit" class="minerva-send-btn" aria-label="${this._escape(sendBtnLabel)}">
              ${this._getSVG("send")}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Setup chat event handlers
   * @private
   */
  _setupChatHandlers() {
    const messagesEl = this.chatPanel.querySelector(".minerva-messages");
    const formEl = this.chatPanel.querySelector(".minerva-composer");
    const textareaEl = this.chatPanel.querySelector("textarea");
    const submitBtn = this.chatPanel.querySelector(".minerva-send-btn");

    // Restore the conversation persisted on this device (24h TTL).
    const state = this._loadState();
    this._threadId = state?.threadId || null;
    this._messages = state?.messages || [];
    for (const m of this._messages) {
      if (m.role === "user") {
        this._addUserMessage(messagesEl, m.text, { time: m.time });
      } else {
        this._addBotMessage(messagesEl, m.text, m.sources || [], {
          instant: true,
          time: m.time,
        });
      }
    }

    // Fresh conversation: open the thread now so the backend's welcome
    // message greets the user before they type anything.
    if (!this._threadId && this._messages.length === 0) {
      this._startNewThread(messagesEl);
    }

    submitBtn.disabled = true;

    const updateSendButtonState = () => {
      submitBtn.disabled = textareaEl.value.trim().length === 0 || this.busy;
    };

    // Grow the textarea as text wraps, up to a 3-line cap, then scroll.
    // Heights mirror the CSS: 36px = 1 line, ~76px = 3 lines.
    const oneLine = 36;
    const maxLines = 76;
    const autoGrow = () => {
      textareaEl.style.height = oneLine + "px";
      const needed = textareaEl.scrollHeight;
      if (needed <= oneLine) {
        textareaEl.style.overflowY = "hidden";
        return;
      }
      const next = Math.min(needed, maxLines);
      textareaEl.style.height = next + "px";
      textareaEl.style.overflowY = needed > maxLines ? "auto" : "hidden";
    };

    textareaEl.addEventListener("input", () => {
      updateSendButtonState();
      autoGrow();
    });
    textareaEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        formEl.requestSubmit();
      }
    });

    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = textareaEl.value.trim();
      if (!msg || this.busy) return;
      textareaEl.value = "";
      textareaEl.style.height = oneLine + "px";
      textareaEl.style.overflowY = "hidden";
      await this._sendMessage(msg, { textareaEl, messagesEl, submitBtn });
    });

    return { messagesEl, textareaEl, submitBtn };
  }

  /**
   * Create a backend thread and greet with its welcome_message (when the
   * backend returns one — the mock does not). Used on first open of a
   * fresh conversation and after a reset. The in-flight promise is kept
   * on the instance so a message sent before it resolves awaits it
   * instead of opening a second thread. Failures are swallowed — the
   * thread is then created lazily on the first send.
   * @private
   */
  async _startNewThread(messagesEl) {
    const typingEl = this._addTypingIndicator(messagesEl);
    this._threadPromise = this.transport.newThread({
      domain: this.config.domain,
      provider: this.config.provider,
      search: this.config.search,
    });
    try {
      const created = await this._threadPromise;
      this._threadId = created.thread_id;
      typingEl.remove();
      const welcome =
        typeof created.welcome_message === "string"
          ? this._normalizeWelcome(created.welcome_message)
          : "";
      if (welcome) {
        this._addBotMessage(messagesEl, welcome, [], { instant: true });
        this._messages.push({
          role: "bot",
          text: welcome,
          time: this._getHourFormat(),
        });
      }
      this._saveState();
    } catch {
      typingEl.remove();
    } finally {
      this._threadPromise = null;
    }
  }

  /**
   * The backend's welcome_message is hard-wrapped at the source-code
   * line width (\r\n + indentation), with breaks falling mid-sentence.
   * Rebuild the intended paragraphs: a line that ends without sentence
   * punctuation is a wrap and gets glued to the next line; a line that
   * ends a sentence keeps its paragraph break.
   * @private
   */
  _normalizeWelcome(raw) {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const paragraphs = [];
    for (const line of lines) {
      const prev = paragraphs[paragraphs.length - 1];
      if (prev && !/[.!?:]$/.test(prev)) {
        paragraphs[paragraphs.length - 1] = prev + " " + line;
      } else {
        paragraphs.push(line);
      }
    }
    return paragraphs.join("\n\n");
  }

  /**
   * Send message to AI
   * @private
   */
  async _sendMessage(message, { textareaEl, messagesEl, submitBtn, isRetry }) {
    if (!isRetry) {
      this._addUserMessage(messagesEl, message);
      this._messages.push({
        role: "user",
        text: message,
        time: this._getHourFormat(),
      });
      this._saveState();
    }
    this._setBusy(true, submitBtn, textareaEl);

    this._abort = new AbortController();
    const aborter = this._abort;
    const signal = this._abort.signal;
    const typingEl = this._addTypingIndicator(messagesEl, {
      stages: true,
      onStop: () => this._stopRequest(),
    });

    try {
      // A welcome-thread request may still be in flight — reuse it.
      if (!this._threadId && this._threadPromise) {
        try {
          await this._threadPromise;
        } catch {}
      }
      if (!this._threadId) {
        const created = await this.transport.newThread(
          {
            domain: this.config.domain,
            provider: this.config.provider,
            search: this.config.search,
          },
          { signal },
        );
        this._threadId = created.thread_id;
        this._saveState();
      }

      try {
        const res = await this.transport.sendMessage(
          {
            threadId: this._threadId,
            message,
          },
          { signal },
        );
        typingEl.remove();
        const docs = this._parseRetrievedDocs(res.retrieved_docs);
        this._addBotMessage(messagesEl, res.answer, docs);
        this._messages.push({
          role: "bot",
          text: res.answer,
          sources: docs,
          time: this._getHourFormat(),
        });
        this._saveState();
      } catch (err) {
        // A 404 from /api/chat/message means the thread expired or is
        // unknown server-side (real backend: "Sessao nao encontrada",
        // mock: thread_not_found) — drop it and retry once on a fresh
        // thread.
        if (err.status === 404 && !isRetry) {
          this._threadId = null;
          this._saveState();
          typingEl.remove();
          return this._sendMessage(message, {
            textareaEl,
            messagesEl,
            submitBtn,
            isRetry: true,
          });
        }
        throw err;
      }
    } catch (err) {
      typingEl.remove();
      if (err.name === "AbortError") {
        if (!aborter.silent) {
          this._addNotice(messagesEl, this._label("stopped"));
        }
      } else if (err.name === "TypeError") {
        // fetch rejects with a TypeError ("Failed to fetch" / "Load
        // failed") when the network/VPN/CORS layer fails — show a
        // human message instead of the browser's internal one.
        this._addError(messagesEl, this._label("networkError"));
      } else {
        this._addError(messagesEl, err.message || this._label("genericError"));
      }
    } finally {
      this._abort = null;
      this._setBusy(false, submitBtn, textareaEl);
      textareaEl.focus();
    }
  }

  /**
   * Abort the in-flight request, if any. With silent=true (used by
   * reset, which clears the chat anyway) no "stopped" notice is shown.
   * @private
   */
  _stopRequest(silent = false) {
    if (this._abort) {
      this._abort.silent = silent;
      this._abort.abort();
    }
  }

  /**
   * Add user message to chat
   * @private
   */
  _addUserMessage(messagesEl, text, { time } = {}) {
    const el = document.createElement("div");
    el.className = "minerva-msg minerva-user";
    time = time || this._getHourFormat();
    const contentEl = document.createElement("div");
    contentEl.className = "minerva-msg-content";
    const bubbleEl = document.createElement("div");
    bubbleEl.className = "minerva-bubble";
    bubbleEl.textContent = text;
    contentEl.appendChild(bubbleEl);

    const footerEl = document.createElement("div");
    footerEl.className = "minerva-msg-footer minerva-msg-footer-sent";
    footerEl.innerHTML = `
      <button class="minerva-copy-btn" aria-label="Copy message" data-tooltip="Copy">
        ${this._getSVG("copy")}
      </button>
      <span class="minerva-msg-time">${this._escape(time)}</span>
    `;
    footerEl.style.opacity = "1";
    contentEl.appendChild(footerEl);
    el.appendChild(contentEl);

    const copyBtn = footerEl.querySelector(".minerva-copy-btn");
    this._setupTooltip(copyBtn);
    this._setupCopyButton(el, text);
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Add bot message to chat. With { instant: true } the message renders
   * fully without the streaming animation (used when restoring a
   * persisted conversation); time overrides the displayed timestamp.
   * @private
   */
  _addBotMessage(messagesEl, text, sources, { instant = false, time } = {}) {
    const el = document.createElement("div");
    el.className = "minerva-msg minerva-bot";
    time = time || this._getHourFormat();
    const contentEl = document.createElement("div");
    contentEl.className = "minerva-msg-content";
    const bubbleEl = document.createElement("div");
    bubbleEl.className = "minerva-bubble";
    bubbleEl.setAttribute("data-streaming", "true");

    contentEl.appendChild(bubbleEl);

    const footerEl = document.createElement("div");
    footerEl.className = "minerva-msg-footer minerva-msg-footer-received";
    footerEl.innerHTML = `
      <span class="minerva-msg-time">${this._escape(time)}</span>
      <button class="minerva-copy-btn" aria-label="Copy message" data-tooltip="Copy">
        ${this._getSVG("copy")}
      </button>
    `;
    footerEl.style.opacity = "0";
    footerEl.style.transition = "opacity 0.3s ease";
    contentEl.appendChild(footerEl);
    el.appendChild(contentEl);

    const copyBtn = footerEl.querySelector(".minerva-copy-btn");
    this._setupTooltip(copyBtn);

    const sourcesContainer = document.createElement("div");
    sourcesContainer.style.opacity = "0";
    sourcesContainer.style.transition = "opacity 0.3s ease";

    if (sources && sources.length) {
      sourcesContainer.className = "minerva-sources";
      sourcesContainer.innerHTML = `
        <details>
          <summary>Sources (${sources.length})</summary>
          <ul class="minerva-sources-list">
            ${sources
              .map((s) => {
                const name = `[${s.index}] ${this._escape(s.filename)}`;
                // Only references that carry a real URL become links;
                // the rest are plain text (no pointer cursor, nothing
                // pretending to be clickable).
                const url = this._sourceUrl(s);
                const nameHtml = url
                  ? `<a class="minerva-src-link" href="${this._escape(url)}" target="_blank" rel="noopener noreferrer">${name}</a>`
                  : name;
                return `
              <li>
                <div class="minerva-src-name">${nameHtml}</div>
                ${s.source && !url ? `<div>${this._escape(s.source)}</div>` : ""}
              </li>
            `;
              })
              .join("")}
          </ul>
        </details>
      `;
      el.appendChild(sourcesContainer);
    }

    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const reveal = () => {
      footerEl.style.opacity = "1";
      if (sourcesContainer.children.length > 0) {
        sourcesContainer.style.opacity = "1";
      }
      this._setupCopyButton(el, text);
      const nearBottom =
        messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <
        80;
      if (instant || nearBottom) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    };

    if (instant) {
      bubbleEl.innerHTML = this._renderMarkdown(text);
      bubbleEl.removeAttribute("data-streaming");
      reveal();
    } else {
      this._streamText(bubbleEl, text, reveal);
    }
  }

  /**
   * Add typing indicator. With { stages: true } it rotates progress
   * hints under the dots (answers take 45–90 s on the real backend);
   * with onStop it shows a button that aborts the in-flight request.
   * Timers stop themselves once the element leaves the DOM.
   * @private
   */
  _addTypingIndicator(messagesEl, { stages = false, onStop } = {}) {
    const el = document.createElement("div");
    el.className = "minerva-msg minerva-bot";

    const row = document.createElement("div");
    row.className = "minerva-typing-row";
    row.innerHTML = `<div class="minerva-bubble minerva-typing"><span></span><span></span><span></span></div>`;
    el.appendChild(row);

    if (onStop) {
      const stopBtn = document.createElement("button");
      stopBtn.type = "button";
      stopBtn.className = "minerva-stop-btn";
      stopBtn.textContent = this._label("stop");
      stopBtn.setAttribute("aria-label", this._label("stop"));
      stopBtn.addEventListener("click", onStop);
      row.appendChild(stopBtn);
    }

    if (stages) {
      const status = document.createElement("div");
      status.className = "minerva-typing-status";
      el.appendChild(status);

      const texts = this._label("thinking");
      let i = -1;
      const advance = () => {
        if (!el.isConnected) {
          clearInterval(timer);
          return;
        }
        if (i < texts.length - 1) i++;
        status.textContent = texts[i];
      };
      const timer = setInterval(advance, 8000);
      setTimeout(advance, 2000);
    }

    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  /**
   * Add a neutral system notice (e.g. "response stopped").
   * @private
   */
  _addNotice(messagesEl, text) {
    const el = document.createElement("div");
    el.className = "minerva-notice";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Add error message
   * @private
   */
  _addError(messagesEl, text) {
    const el = document.createElement("div");
    el.className = "minerva-error";
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Set busy state
   * @private
   */
  _setBusy(busy, submitBtn, textareaEl) {
    this.busy = busy;
    submitBtn.disabled = busy || textareaEl.value.trim().length === 0;
    textareaEl.disabled = busy;
  }

  /**
   * Add header control buttons
   * @private
   */
  _addHeaderControls({ includeReset = true } = {}) {
    const header = this.chatPanel.querySelector(".minerva-header");
    if (!header) return;

    const controls = document.createElement("div");
    controls.className = "minerva-header-controls";

    if (includeReset) {
      const resetBtn = document.createElement("button");
      resetBtn.className = "minerva-header-control-btn";
      resetBtn.setAttribute("aria-label", "Reset conversation");
      resetBtn.setAttribute("data-tooltip", "Reset");
      resetBtn.innerHTML = this._getSVG("reset");
      resetBtn.addEventListener("click", () => this._resetConversation());
      this._setupTooltip(resetBtn);
      controls.appendChild(resetBtn);
    }

    const expandBtn = document.createElement("button");
    expandBtn.className = "minerva-header-control-btn";
    expandBtn.setAttribute("aria-label", "Expand");
    expandBtn.setAttribute("data-tooltip", "Expand");
    expandBtn.innerHTML = this._getSVG("expand");
    expandBtn.addEventListener("click", () => this._toggleExpand(expandBtn));
    this._setupTooltip(expandBtn);

    const minimizeBtn = document.createElement("button");
    minimizeBtn.className = "minerva-header-control-btn";
    minimizeBtn.setAttribute("aria-label", "Minimize");
    minimizeBtn.setAttribute("data-tooltip", "Minimize");
    minimizeBtn.innerHTML = this._getSVG("minimize");
    minimizeBtn.addEventListener("click", () => this._closeChat());
    this._setupTooltip(minimizeBtn);

    controls.appendChild(expandBtn);
    controls.appendChild(minimizeBtn);
    header.appendChild(controls);
  }

  /**
   * Setup tooltip positioning
   * @private
   */
  _setupTooltip(btn) {
    if (btn.dataset.tooltipSetup) return;
    btn.dataset.tooltipSetup = "true";

    const tooltip = document.createElement("div");
    tooltip.className = "minerva-tooltip";
    tooltip.textContent = btn.getAttribute("data-tooltip");
    // Styles are inline (not in the stylesheet) because the tooltip is
    // positioned at the viewport level; it lives inside the shadow root
    // so page CSS can never touch it.
    tooltip.style.cssText = `
      position: fixed;
      background: #ffffff;
      color: #0f172a;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 2147483646;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
    `;
    const widget = this.shadow.querySelector(".minerva-widget");
    (widget || this.shadow).appendChild(tooltip);

    const updatePosition = () => {
      const rect = btn.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + "px";
      tooltip.style.top = rect.bottom + 6 + "px";
      tooltip.style.transform = "translateX(-50%)";
    };

    btn.addEventListener("mouseenter", () => {
      updatePosition();
      tooltip.style.opacity = "1";
    });

    btn.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
    });
  }

  /**
   * Reset conversation: wipe the persisted state and message log, then
   * eagerly open a fresh thread so the next message starts a brand-new
   * conversation. If thread creation fails it falls back to the lazy
   * path (created on the next send).
   * @private
   */
  async _resetConversation() {
    this._stopRequest(true);
    this._clearState();
    this._threadId = null;
    this._messages = [];

    const messagesEl = this.chatPanel.querySelector(".minerva-messages");
    if (messagesEl) {
      messagesEl.innerHTML = "";
      await this._startNewThread(messagesEl);
    }
  }

  /**
   * Toggle expand/collapse
   * @private
   */
  _toggleExpand(btn) {
    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      this.chatPanel.classList.add("minerva-chat-panel-expanded");
      btn.innerHTML = this._getSVG("collapse");
      btn.setAttribute("data-tooltip", "Collapse");
    } else {
      this.chatPanel.classList.remove("minerva-chat-panel-expanded");
      btn.innerHTML = this._getSVG("expand");
      btn.setAttribute("data-tooltip", "Expand");
    }
  }

  /**
   * Get current time in HH:MM format
   * @private
   */
  _getHourFormat() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  /**
   * Setup copy button functionality
   * @private
   */
  _setupCopyButton(messageEl, text) {
    const copyBtn = messageEl.querySelector(".minerva-copy-btn");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = this._getSVG("checkmark");
        copyBtn.classList.add("minerva-copy-success");
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.classList.remove("minerva-copy-success");
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  }

  /**
   * Escape HTML special characters
   * @private
   */
  _escape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Render markdown to HTML
   * @private
   */
  _renderMarkdown(src) {
    if (!src) return "";
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let i = 0;

    const renderInline = (text) => {
      let out = this._escape(text);
      const codes = [];
      out = out.replace(/`([^`]+)`/g, (_, c) => {
        codes.push(c);
        return ` CODE${codes.length - 1} `;
      });
      out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
      out = out.replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        (_, label, href) =>
          `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      );
      out = out.replace(/ CODE(\d+) /g, (_, i) => `<code>${codes[+i]}</code>`);
      return out;
    };

    while (i < lines.length) {
      const line = lines[i];

      if (/^```/.test(line)) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++;
        html.push(`<pre><code>${this._escape(buf.join("\n"))}</code></pre>`);
        continue;
      }

      const h = line.match(/^(#{1,3})\s+(.+)$/);
      if (h) {
        const level = h[1].length;
        html.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
        i++;
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(
            `<li>${renderInline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`,
          );
          i++;
        }
        html.push(`<ul>${items.join("")}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(
            `<li>${renderInline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`,
          );
          i++;
        }
        html.push(`<ol>${items.join("")}</ol>`);
        continue;
      }

      if (line.trim() === "") {
        i++;
        continue;
      }

      const para = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^```/.test(lines[i]) &&
        !/^#{1,3}\s+/.test(lines[i]) &&
        !/^\s*[-*]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        para.push(lines[i]);
        i++;
      }
      html.push(`<p>${renderInline(para.join(" "))}</p>`);
    }

    return html.join("");
  }

  /**
   * Stream text with word-by-word animation
   * @private
   */
  _streamText(element, fullText, onComplete) {
    const html = this._renderMarkdown(fullText);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    const chunks = [];
    const extractChunks = (node) => {
      if (node.nodeType === 3) {
        const text = node.textContent;
        const words = text.split(/(\s+)/);
        chunks.push(...words.filter((w) => w.length > 0));
      } else {
        const openTag = `<${node.nodeName.toLowerCase()}>`;
        const closeTag = `</${node.nodeName.toLowerCase()}>`;
        chunks.push(openTag);
        for (let child of node.childNodes) {
          extractChunks(child);
        }
        chunks.push(closeTag);
      }
    };

    for (let child of tempDiv.childNodes) {
      extractChunks(child);
    }

    let chunkIndex = 0;
    const wordDelay = 25;
    let accumulator = "";

    // Keep the view pinned to the bottom while the text grows — but only
    // if the user was already at (or near) the bottom, so scrolling up to
    // read something isn't fought by the animation.
    const scroller = element.closest(".minerva-messages");
    const nearBottom = () =>
      scroller &&
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;

    const addNextChunk = () => {
      if (chunkIndex < chunks.length) {
        const stick = nearBottom();
        accumulator += chunks[chunkIndex];
        element.innerHTML = accumulator;
        if (stick) scroller.scrollTop = scroller.scrollHeight;
        chunkIndex++;
        setTimeout(addNextChunk, wordDelay);
      } else {
        const stick = nearBottom();
        element.innerHTML = html;
        element.removeAttribute("data-streaming");
        if (stick) scroller.scrollTop = scroller.scrollHeight;
        onComplete?.();
      }
    };

    addNextChunk();
  }

  /**
   * The URL of a parsed source, if it has one. Accepts a dedicated url
   * field (the structured retrieved_docs we asked the backend for) or a
   * source field that is itself an http(s) URL. Anything else — including
   * today's plain-text sources — yields null, and the entry renders as
   * plain text instead of a link.
   * @private
   */
  _sourceUrl(s) {
    const candidate = s.url || s.source || "";
    return /^https?:\/\//i.test(candidate) ? candidate : null;
  }

  /**
   * Parse retrieved docs from API response
   * @private
   */
  _parseRetrievedDocs(raw) {
    if (!raw || typeof raw !== "string") return [];
    const out = [];
    const lines = raw.split("\n");
    let current = null;

    for (const line of lines) {
      const header = line.match(/^\[(\d+)\]\s+(.+)$/);
      if (header) {
        if (current) out.push(current);
        current = {
          index: +header[1],
          filename: header[2].trim(),
          chunk_id: "",
          source: "",
        };
        continue;
      }
      if (current) {
        const chunk = line.match(/chunk_id=([^\s|]+)/);
        const source = line.match(/source=(.+?)(?:\s*\||\s*$)/);
        if (chunk) current.chunk_id = chunk[1];
        if (source) current.source = source[1].trim();
      }
    }
    if (current) out.push(current);
    return out;
  }

  /**
   * Destroy the widget and clean up
   */
  destroy() {
    if (this._onWindowResize) {
      window.removeEventListener("resize", this._onWindowResize);
      this._onWindowResize = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadow = null;
    this.fab = null;
    this.fabIcon = null;
    this.fabLabel = null;
    this.chatPanel = null;
    this.transport = null;
  }
}

// Global API
window.minervaAgent = {
  _instance: null,

  /**
   * Mount the widget. The only option is { primaryColor }. Returns the
   * instance. Calling init again replaces any existing widget.
   */
  init(config) {
    if (this._instance) this._instance.destroy();
    this._instance = new MinervaAIAgent(config || {});
    return this._instance;
  },

  /**
   * Switch the UI language at runtime: "pt" or "en".
   */
  setLanguage(lang) {
    if (this._instance) this._instance.setLanguage(lang);
  },

  /**
   * Current UI language ("pt" or "en"), or null if not mounted.
   */
  getLanguage() {
    return this._instance ? this._instance.lang : null;
  },

  /**
   * Tear down the widget.
   */
  destroy() {
    if (this._instance) {
      this._instance.destroy();
      this._instance = null;
    }
  },
};
