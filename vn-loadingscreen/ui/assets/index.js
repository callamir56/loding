(() => {
  "use strict";

  const STAGES = [
    "INIT_CORE",
    "INIT_BEFORE_MAP_LOADED",
    "INIT_AFTER_MAP_LOADED",
    "INIT_SESSION",
  ];

  const THEMES = ["default", "halloween", "christmas"];

  const DEFAULTS = {
    gameTime: 84300000,
    msPerGameMinute: 1000,
    tickerItems: [
      "Welcome to IRAN Server",
      "Join our Discord for news and support",
      "Please read the rules before playing",
      "Report any bugs to our staff team",
      "Best Roleplay Experience in IRAN",
    ],
    headline: "WELCOME TO IRAN SERVER!",
    breakingLabel: "BREAKING NEWS",
    city: "TEHRAN - IRAN",
    temperature: 25,
    temperatureUnit: "C",
    celsius: true,
    theme: "default",
    backgroundVideo: "./assets/bg.webm",
    backgroundMusic: "./assets/bg.mp3",
    musicVolume: 0.35,
    logo: "./assets/logo.png",
    weatherIcon: "./assets/weather.svg",
    loadProgress: 0,
    loadPart: "INIT_CORE",
    visible: true,
    translations: {
      LOADING: "Loading",
      INIT_CORE: "Initializing core",
      INIT_BEFORE_MAP_LOADED: "3d preprocessing",
      INIT_AFTER_MAP_LOADED: "3d models",
      INIT_SESSION: "Session",
    },
  };

  const state = {
    ...DEFAULTS,
    tickerItems: [...DEFAULTS.tickerItems],
    translations: { ...DEFAULTS.translations },
  };

  let elements = null;
  let clockTimer = null;
  let clockValue = state.gameTime;
  let tickerSignature = "";
  let latestResourceConfiguration = null;
  let musicRetryTimer = null;

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(Number(value) || 0, minimum), maximum);
  }

  function parseMessage(rawMessage) {
    if (typeof rawMessage !== "string") {
      return rawMessage;
    }

    try {
      return JSON.parse(rawMessage);
    } catch (_error) {
      return null;
    }
  }

  function normaliseTheme(theme) {
    const value = String(theme || "default").toLowerCase();
    return THEMES.includes(value) ? value : "default";
  }

  function normaliseTicker(items) {
    if (!Array.isArray(items)) {
      return [...DEFAULTS.tickerItems];
    }

    const cleaned = items
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map(String)
      .filter(Boolean);

    return cleaned.length > 0 ? cleaned : ["Welcome to the server!"];
  }

  function applyConfiguration(configuration) {
    if (!configuration || typeof configuration !== "object") {
      return;
    }

    const oldGameTime = state.gameTime;
    const oldMinuteDuration = state.msPerGameMinute;

    Object.assign(state, configuration);
    state.tickerItems = normaliseTicker(
      configuration.tickerItems ?? state.tickerItems,
    );
    state.translations = {
      ...DEFAULTS.translations,
      ...state.translations,
      ...(configuration.translations || {}),
    };
    state.theme = normaliseTheme(state.theme);

    if (!configuration.temperatureUnit && "celsius" in configuration) {
      state.temperatureUnit = configuration.celsius ? "C" : "F";
    }
    state.temperatureUnit =
      String(state.temperatureUnit || "F").toUpperCase() === "C" ? "C" : "F";

    state.gameTime = Number(state.gameTime);
    if (!Number.isFinite(state.gameTime)) {
      state.gameTime = DEFAULTS.gameTime;
    }

    state.msPerGameMinute = Math.max(
      Number(state.msPerGameMinute) || DEFAULTS.msPerGameMinute,
      100,
    );

    if (!elements) {
      return;
    }

    renderConfiguration();
    renderProgress();

    if (
      state.gameTime !== oldGameTime ||
      state.msPerGameMinute !== oldMinuteDuration
    ) {
      startClock();
    }
  }

  function handleMessage(event) {
    const message = parseMessage(event.data);
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.__config) {
      latestResourceConfiguration = message.__config;
      applyConfiguration(message.__config);
    }

    if (message.eventName === "loadProgress") {
      state.loadProgress = clamp(message.loadFraction, 0, 1);
      renderProgress();
    }

    if (message.eventName === "startInitFunction" && message.type) {
      state.loadPart = String(message.type);
      renderProgress();
    }

    if (message.hide) {
      state.visible = false;
      renderVisibility();
    }
  }

  const TEHRAN_OFFSET_HOURS = 3.5;

  function getTehranTimeString() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const tehranOffset = TEHRAN_OFFSET_HOURS * 60 * 60 * 1000;
    const tehran = new Date(utc + tehranOffset);
    let h = tehran.getHours();
    const m = tehran.getMinutes();
    const s = tehran.getSeconds();
    const suffix = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} ${suffix}`;
  }

  function getTehranTimeStringPersian() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const tehranOffset = TEHRAN_OFFSET_HOURS * 60 * 60 * 1000;
    const tehran = new Date(utc + tehranOffset);
    return tehran.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }

  function formatTime(milliseconds) {
    return getTehranTimeString();
  }

  function renderClock() {
    if (elements) {
      elements.gameTime.textContent = getTehranTimeString();
    }
  }

  function startClock() {
    if (clockTimer) {
      window.clearInterval(clockTimer);
    }
    renderClock();
    clockTimer = window.setInterval(() => {
      renderClock();
    }, 1000);
  }

  function renderTheme() {
    document.documentElement.classList.remove("halloween", "christmas");
    if (state.theme !== "default") {
      document.documentElement.classList.add(state.theme);
    }
  }

  function renderVisibility() {
    if (!elements) {
      return;
    }

    elements.loadingScreen.classList.toggle("is-hidden", !state.visible);
    if (!state.visible) {
      elements.backgroundMusic.pause();
      if (musicRetryTimer) {
        window.clearInterval(musicRetryTimer);
        musicRetryTimer = null;
      }
    }
  }

  function setVideoSource(path) {
    const value = String(path || DEFAULTS.backgroundVideo);
    if (elements.backgroundSource.getAttribute("src") === value) {
      return;
    }

    elements.backgroundSource.setAttribute("src", value);
    elements.backgroundVideo.load();
  }

  function attemptMusicPlayback() {
    if (!elements || !state.visible) {
      return;
    }

    const audio = elements.backgroundMusic;
    audio.muted = false;
    audio.volume = clamp(state.musicVolume, 0, 1);

    const playback = audio.play();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {
        if (!musicRetryTimer) {
          musicRetryTimer = window.setInterval(() => {
            if (!audio.paused || !state.visible) {
              window.clearInterval(musicRetryTimer);
              musicRetryTimer = null;
              return;
            }
            audio.play().catch(() => {});
          }, 1000);
        }
      });
    }
  }

  function setAudioSource(path) {
    const value = String(path || DEFAULTS.backgroundMusic);
    const audio = elements.backgroundMusic;

    audio.autoplay = true;
    audio.loop = true;
    audio.muted = false;
    audio.volume = clamp(state.musicVolume, 0, 1);

    if (elements.musicSource.getAttribute("src") !== value) {
      elements.musicSource.setAttribute("src", value);
      audio.load();
    }

    attemptMusicPlayback();
  }

  function setLogoSource(path) {
    elements.logoImage.setAttribute("src", String(path || DEFAULTS.logo));
  }

  function createTickerEntry(text) {
    const entry = document.createElement("span");
    entry.className = "ticker-entry";

    const label = document.createElement("span");
    label.className = "ticker-text";
    label.textContent = text;

    const separator = document.createElement("span");
    separator.className = "ticker-separator";
    separator.setAttribute("aria-hidden", "true");

    entry.append(label, separator);
    return entry;
  }

  function renderTicker() {
    const signature = JSON.stringify(state.tickerItems);
    if (signature === tickerSignature) {
      return;
    }

    tickerSignature = signature;
    elements.tickerTrack.replaceChildren();

    for (let copy = 0; copy < 4; copy += 1) {
      const group = document.createElement("div");
      group.className = "ticker-group";
      if (copy > 0) {
        group.setAttribute("aria-hidden", "true");
      }

      state.tickerItems.forEach((item) => {
        group.appendChild(createTickerEntry(item));
      });
      elements.tickerTrack.appendChild(group);
    }
  }

  function renderConfiguration() {
    if (!elements) {
      return;
    }

    renderTheme();
    renderVisibility();
    renderTicker();

    elements.loadingTitle.textContent = state.translations.LOADING || "Loading";
    elements.headline.textContent = String(state.headline || DEFAULTS.headline);
    elements.breakingLabel.textContent = String(
      state.breakingLabel || DEFAULTS.breakingLabel,
    );
    elements.city.textContent = String(state.city || DEFAULTS.city);
    elements.temperature.textContent = `${Math.round(Number(state.temperature) || 0)}°${state.temperatureUnit}`;
    elements.weatherIcon.setAttribute(
      "src",
      String(state.weatherIcon || DEFAULTS.weatherIcon),
    );

    setVideoSource(state.backgroundVideo);
    setAudioSource(state.backgroundMusic);
    setLogoSource(state.logo);
  }

  function stageProgress(stage, stageIndex) {
    const activeIndex = STAGES.indexOf(state.loadPart);
    const effectiveIndex = activeIndex === -1 ? STAGES.length : activeIndex;

    if (stageIndex < effectiveIndex) {
      return 100;
    }
    if (stageIndex === effectiveIndex) {
      return clamp(state.loadProgress, 0, 1) * 100;
    }
    return 0;
  }

  function createProgressItem(stage) {
    const item = document.createElement("div");
    item.className = "progress-item";
    item.dataset.stage = stage;

    const label = document.createElement("p");
    label.className = "progress-label";

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";

    track.appendChild(fill);
    item.append(label, track);
    return item;
  }

  function renderProgress() {
    if (!elements) {
      return;
    }

    const bars = STAGES.map((stage, index) => ({
      stage,
      progress: stageProgress(stage, index),
    })).filter((bar, index) => index === 0 || bar.progress > 0);

    const visibleStages = new Set(bars.map((bar) => bar.stage));
    Array.from(elements.progressList.children).forEach((item) => {
      if (!visibleStages.has(item.dataset.stage)) {
        item.remove();
      }
    });

    bars.forEach((bar) => {
      let item = Array.from(elements.progressList.children).find(
        (candidate) => candidate.dataset.stage === bar.stage,
      );

      if (!item) {
        item = createProgressItem(bar.stage);
        elements.progressList.appendChild(item);
      }

      item.querySelector(".progress-label").textContent =
        state.translations[bar.stage] || bar.stage;
      item.querySelector(".progress-fill").style.width = `${bar.progress}%`;
    });
  }

  function initialise() {
    if (window.nuiHandoverData && typeof window.nuiHandoverData === "object") {
      applyConfiguration(window.nuiHandoverData);
    }
    if (latestResourceConfiguration) {
      applyConfiguration(latestResourceConfiguration);
    }

    elements = {
      loadingScreen: document.getElementById("loading-screen"),
      backgroundVideo: document.getElementById("background-video"),
      backgroundSource: document.getElementById("background-source"),
      backgroundMusic: document.getElementById("background-music"),
      musicSource: document.getElementById("music-source"),
      loadingTitle: document.getElementById("loading-title"),
      progressList: document.getElementById("progress-list"),
      logoImage: document.getElementById("logo-image"),
      gameTime: document.getElementById("game-time"),
      city: document.getElementById("city"),
      weatherIcon: document.getElementById("weather-icon"),
      temperature: document.getElementById("temperature"),
      breakingLabel: document.getElementById("breaking-label"),
      tickerTrack: document.getElementById("ticker-track"),
      headline: document.getElementById("headline"),
    };

    elements.backgroundMusic.addEventListener("canplay", attemptMusicPlayback);
    window.addEventListener("focus", attemptMusicPlayback);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        attemptMusicPlayback();
      }
    });
    ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, attemptMusicPlayback, {
        once: true,
        passive: true,
      });
    });

    renderConfiguration();
    renderProgress();
    startClock();
  }

  window.addEventListener("message", handleMessage);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialise, { once: true });
  } else {
    initialise();
  }
})();