(() => {
  "use strict";

  const STORAGE = {
    tasks: "daylight.tasks.v1",
    links: "daylight.links.v1",
    name: "daylight.name.v1",
    theme: "daylight.theme.v1",
    duration: "daylight.duration.v1"
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const safeRead = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      console.warn(`Could not read ${key} from Local Storage.`, error);
      return fallback;
    }
  };
  const safeWrite = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Could not save ${key} to Local Storage.`, error);
      showToast("Browser storage is unavailable. Your change may not persist.");
      return false;
    }
  };
  const makeId = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let tasks = safeRead(STORAGE.tasks, []);
  if (!Array.isArray(tasks)) tasks = [];
  let links = safeRead(STORAGE.links, null);
  if (!Array.isArray(links)) {
    links = [
      { id: makeId(), name: "Google", url: "https://google.com", icon: "G" },
      { id: makeId(), name: "YouTube", url: "https://youtube.com", icon: "▶" },
      { id: makeId(), name: "GitHub", url: "https://github.com", icon: "⌘" }
    ];
    safeWrite(STORAGE.links, links);
  }
  let userName = String(safeRead(STORAGE.name, "Bika") || "Bika").slice(0, 32);
  let theme = safeRead(STORAGE.theme, "light") === "dark" ? "dark" : "light";
  let duration = Number(safeRead(STORAGE.duration, 25));
  if (!Number.isFinite(duration) || duration < 1 || duration > 180) duration = 25;
  let currentFilter = "all";
  let sortEnabled = false;
  let remainingSeconds = duration * 60;
  let timerInterval = null;
  let timerRunning = false;
  let focusTaskId = null;
  let toastTimeout = null;

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function updateClock() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("#greeting").innerHTML = `${greeting}, ${escapeHTML(userName)}<span class="wave">✳</span>`;
    $("#current-day").textContent = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now).toUpperCase();
    $("#current-date").textContent = new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "long", year: "numeric"
    }).format(now);
    $("#current-time").textContent = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).format(now);
    $("#footer-year").textContent = now.getFullYear();
    $("#sidebar-name").textContent = `${userName}'s space`;
    const initials = userName.trim().charAt(0).toUpperCase() || "Y";
    $("#avatar-initials").textContent = initials;
    $("#top-avatar").textContent = initials;
  }

  function renderTasks() {
    const completed = tasks.filter((task) => task.done).length;
    const active = tasks.length - completed;
    const visibleTasks = tasks.filter((task) => {
      if (currentFilter === "active") return !task.done;
      if (currentFilter === "completed") return task.done;
      return true;
    });
    if (sortEnabled) visibleTasks.sort((a, b) => Number(a.done) - Number(b.done) || a.text.localeCompare(b.text, "id"));
    $("#task-list").innerHTML = visibleTasks.map((task) => `
      <li class="task-item ${task.done ? "done" : ""}" data-id="${escapeHTML(task.id)}">
        <button class="task-check ${task.done ? "checked" : ""}" data-action="toggle" aria-label="${task.done ? "Tandai belum selesai" : "Tandai selesai"}" aria-pressed="${task.done}">${task.done ? "✓" : ""}</button>
        <div class="task-copy"><div class="task-name">${escapeHTML(task.text)}</div><div class="task-meta">${task.done ? "Completed" : "On your list"} · ${escapeHTML(task.createdLabel || "Today")}</div></div>
        <div class="task-actions">${task.done ? "" : `<button class="task-action focus-task" data-action="focus" aria-label="Fokus pada ${escapeHTML(task.text)}" title="Fokus pada tugas ini">◷</button>`}<button class="task-action" data-action="edit" aria-label="Edit tugas" title="Edit">✎</button><button class="task-action delete" data-action="delete" aria-label="Hapus tugas" title="Delete">×</button></div>
      </li>`).join("");
    $("#empty-state").classList.toggle("hidden", visibleTasks.length > 0);
    $("#task-list").classList.toggle("hidden", visibleTasks.length === 0);
    $("#total-tasks").innerHTML = `${tasks.length} <small>tasks</small>`;
    $("#completed-tasks").innerHTML = `${completed} <small>tasks</small>`;
    $("#completion-rate").textContent = `${tasks.length ? Math.round(completed / tasks.length * 100) : 0}%`;
    $("#total-bar").style.width = `${tasks.length ? completed / tasks.length * 100 : 0}%`;
    $("#task-summary").textContent = tasks.length ? `${active} left to complete` : "Ready when you are";
    $("#task-badge").textContent = tasks.length;
    $("#sidebar-task-count").textContent = active;
    $("#filter-all-count").textContent = tasks.length;
    $("#filter-active-count").textContent = active;
    $("#filter-completed-count").textContent = completed;
    $("#remaining-label").textContent = `${active} task${active === 1 ? "" : "s"} remaining`;
    $("#clear-completed").disabled = completed === 0;
    $("#clear-completed").style.opacity = completed === 0 ? ".45" : "1";
    $$(".filter-button").forEach((button) => button.classList.toggle("active", button.dataset.filter === currentFilter));
    $("#sort-label").textContent = sortEnabled ? "Sorted A–Z" : "Sort tasks";
    safeWrite(STORAGE.tasks, tasks);
  }

  function addTask(text) {
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    if (tasks.some((task) => task.text.toLocaleLowerCase() === normalized.toLocaleLowerCase())) {
      $("#task-message").textContent = "That task is already on your list.";
      return;
    }
    tasks.unshift({ id: makeId(), text: normalized, done: false, createdAt: Date.now(), createdLabel: "Added just now" });
    $("#task-input").value = "";
    $("#task-message").textContent = "";
    currentFilter = "all";
    renderTasks();
    showToast("Task added to your list.");
  }

  function renderLinks() {
    $("#quick-link-list").innerHTML = links.map((link) => {
      let host = "";
      try { host = new URL(link.url).hostname.replace(/^www\./, ""); } catch (_) { host = link.url; }
      return `<div class="quick-link-row" style="display:flex;gap:5px;align-items:center">
        <a class="quick-link" href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer" style="flex:1">
          <span class="link-icon">${escapeHTML(link.icon || link.name.charAt(0).toUpperCase())}</span>
          <span class="link-copy"><strong>${escapeHTML(link.name)}</strong><span>${escapeHTML(host)}</span></span>
          <span class="link-arrow">↗</span>
        </a>
        <button class="link-delete" data-link-delete="${escapeHTML(link.id)}" aria-label="Hapus ${escapeHTML(link.name)}" title="Hapus tautan">×</button>
      </div>`;
    }).join("");
    safeWrite(STORAGE.links, links);
  }

  function applyTheme() {
    document.body.classList.toggle("dark", theme === "dark");
    $("#theme-icon").textContent = theme === "dark" ? "☀" : "☾";
    $("#theme-label").textContent = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    safeWrite(STORAGE.theme, theme);
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function renderTimer() {
    const focusTask = tasks.find((task) => task.id === focusTaskId && !task.done);
    $("#focus").classList.toggle("is-running", timerRunning);
    $("#timer-display").textContent = formatTime(remainingSeconds);
    $("#focus-minutes").innerHTML = `${duration} <small>min session</small>`;
    const circumference = 2 * Math.PI * 96;
    const progress = Math.max(0, Math.min(1, remainingSeconds / (duration * 60)));
    $("#timer-progress").style.strokeDasharray = circumference;
    $("#timer-progress").style.strokeDashoffset = circumference * (1 - progress);
    $("#timer-start").innerHTML = timerRunning ? "Ⅱ <span>Pause focus</span>" : remainingSeconds === 0 ? "↻ <span>Start again</span>" : "▶ <span>Start focus</span>";
    $("#timer-stop").disabled = !timerRunning;
    $("#timer-status").textContent = timerRunning ? "YOU'RE IN THE ZONE" : remainingSeconds === 0 ? "SESSION COMPLETE" : "READY TO FOCUS";
    $("#timer-caption").textContent = focusTask ? `${timerRunning ? "Focusing" : "Ready"}: ${focusTask.text}` : timerRunning ? "Stay with the moment" : remainingSeconds === 0 ? "Beautiful work. Take a breath." : "A fresh start awaits";
    document.title = timerRunning ? `${formatTime(remainingSeconds)} · Life Dashboard` : "Life Dashboard — Your day, in focus";
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    renderTimer();
  }

  function startTimer() {
    if (timerRunning) {
      stopTimer();
      return;
    }
    if (remainingSeconds <= 0) remainingSeconds = duration * 60;
    timerRunning = true;
    timerInterval = setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        focusTaskId = null;
        stopTimer();
        showToast("Focus session complete. Great work!");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Focus session complete", { body: "Great work. Take a short break." });
        }
      } else renderTimer();
    }, 1000);
    renderTimer();
  }

  $("#task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    addTask($("#task-input").value);
  });
  $("#task-input").addEventListener("input", () => { $("#task-message").textContent = ""; });

  $("#task-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const item = button.closest("[data-id]");
    const task = tasks.find((entry) => entry.id === item?.dataset.id);
    if (!task) return;
    const action = button.dataset.action;
    if (action === "toggle") {
      task.done = !task.done;
      task.completedAt = task.done ? Date.now() : null;
      if (task.done && focusTaskId === task.id) focusTaskId = null;
      renderTasks();
      renderTimer();
      if (task.done) {
        const completedItem = $$(".task-item").find((entry) => entry.dataset.id === task.id);
        completedItem?.classList.add("just-completed");
        setTimeout(() => completedItem?.classList.remove("just-completed"), 700);
      }
    } else if (action === "delete") {
      if (focusTaskId === task.id) focusTaskId = null;
      tasks = tasks.filter((entry) => entry.id !== task.id);
      renderTasks();
      renderTimer();
      showToast("Task deleted.");
    } else if (action === "edit") {
      $("#edit-task-id").value = task.id;
      $("#edit-task-input").value = task.text;
      $("#edit-task-dialog").showModal();
      $("#edit-task-input").focus();
    } else if (action === "focus") {
      focusTaskId = task.id;
      if (!timerRunning) startTimer();
      else renderTimer();
      $("#focus").scrollIntoView({ behavior: "smooth", block: "center" });
      showToast(`Focus session: ${task.text}`);
    }
  });

  function setFocusMode(enabled) {
    document.body.classList.toggle("focus-mode", enabled);
    const button = $("#focus-mode-toggle");
    button.setAttribute("aria-pressed", String(enabled));
    button.innerHTML = enabled ? "⛶ <span>Exit focus</span>" : "⛶ <span>Focus mode</span>";
    button.title = enabled ? "Keluar dari mode fokus (Esc)" : "Masuk ke mode fokus (M)";
    if (enabled) $("#focus").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  $("#focus-mode-toggle").addEventListener("click", () => {
    setFocusMode(!document.body.classList.contains("focus-mode"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("focus-mode") && !$("dialog[open]")) {
      setFocusMode(false);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.matches("input, textarea, select, [contenteditable='true']") || $("dialog[open]")) return;
    const shortcut = event.key.toLowerCase();
    if (shortcut === "n") {
      event.preventDefault();
      $("#task-input").focus();
      $("#task-input").scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (shortcut === "f") {
      event.preventDefault();
      startTimer();
      $("#focus").scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (shortcut === "m") {
      event.preventDefault();
      setFocusMode(!document.body.classList.contains("focus-mode"));
    }
  });

  $$(".filter-button").forEach((button) => button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    renderTasks();
  }));
  $("#sort-tasks").addEventListener("click", () => {
    sortEnabled = !sortEnabled;
    renderTasks();
  });
  $("#clear-completed").addEventListener("click", () => {
    const before = tasks.length;
    tasks = tasks.filter((task) => !task.done);
    if (tasks.length !== before) showToast("Completed tasks cleared.");
    renderTasks();
  });

  $("#edit-task-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("#edit-task-id").value;
    const value = $("#edit-task-input").value.trim().replace(/\s+/g, " ");
    if (!value) return;
    const duplicate = tasks.some((task) => task.id !== id && task.text.toLocaleLowerCase() === value.toLocaleLowerCase());
    if (duplicate) {
      showToast("A task with that name already exists.");
      return;
    }
    const task = tasks.find((entry) => entry.id === id);
    if (task) {
      task.text = value;
      renderTasks();
      $("#edit-task-dialog").close();
      showToast("Task updated.");
    }
  });

  function openNameDialog() {
    $("#name-input").value = userName;
    $("#name-dialog").showModal();
    $("#name-input").focus();
  }
  $("#top-avatar").addEventListener("click", openNameDialog);
  $("#edit-name-shortcut").addEventListener("click", openNameDialog);
  $("#name-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#name-input").value.trim();
    if (!name) return;
    userName = name.slice(0, 32);
    safeWrite(STORAGE.name, userName);
    updateClock();
    $("#name-dialog").close();
    showToast("Your dashboard has been personalized.");
  });
  $("#theme-toggle").addEventListener("click", () => {
    theme = theme === "light" ? "dark" : "light";
    applyTheme();
  });

  $("#timer-start").addEventListener("click", startTimer);
  $("#timer-stop").addEventListener("click", stopTimer);
  $("#timer-reset").addEventListener("click", () => {
    stopTimer();
    remainingSeconds = duration * 60;
    renderTimer();
    showToast("Timer reset.");
  });
  $("#timer-settings").addEventListener("click", () => {
    $("#duration-input").value = duration;
    $("#timer-dialog").showModal();
  });
  $("#timer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = Number($("#duration-input").value);
    if (!Number.isInteger(value) || value < 1 || value > 180) {
      $("#duration-input").setCustomValidity("Choose a whole number from 1 to 180.");
      $("#duration-input").reportValidity();
      return;
    }
    $("#duration-input").setCustomValidity("");
    stopTimer();
    duration = value;
    remainingSeconds = duration * 60;
    safeWrite(STORAGE.duration, duration);
    renderTimer();
    $("#timer-dialog").close();
    showToast(`Focus session set to ${duration} minutes.`);
  });

  $("#add-link-open").addEventListener("click", () => {
    $("#link-form").classList.toggle("hidden");
    if (!$("#link-form").classList.contains("hidden")) $("#link-name").focus();
  });
  $("#cancel-link").addEventListener("click", () => {
    $("#link-form").reset();
    $("#link-message").textContent = "";
    $("#link-form").classList.add("hidden");
  });
  $("#link-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#link-name").value.trim();
    let rawUrl = $("#link-url").value.trim();
    if (!name || !rawUrl) return;
    if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;
    let parsed;
    try { parsed = new URL(rawUrl); } catch (_) {
      $("#link-message").textContent = "Enter a valid website address.";
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      $("#link-message").textContent = "Only HTTP and HTTPS links are supported.";
      return;
    }
    if (links.some((link) => link.url.toLowerCase() === parsed.href.toLowerCase() || link.name.toLowerCase() === name.toLowerCase())) {
      $("#link-message").textContent = "That website is already saved.";
      return;
    }
    links.push({ id: makeId(), name, url: parsed.href, icon: name.charAt(0).toUpperCase() });
    renderLinks();
    $("#link-form").reset();
    $("#link-form").classList.add("hidden");
    showToast("Quick link saved.");
  });
  $("#quick-link-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-link-delete]");
    if (!button) return;
    links = links.filter((link) => link.id !== button.dataset.linkDelete);
    renderLinks();
    showToast("Quick link removed.");
  });

  // Keep the timer usable even if the tab is backgrounded; interval ticks are based on elapsed wall time.
  let lastTick = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (timerRunning) {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTick) / 1000);
      if (elapsed > 1) remainingSeconds = Math.max(0, remainingSeconds - elapsed + 1);
      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        focusTaskId = null;
        stopTimer();
        showToast("Focus session complete. Great work!");
      }
      renderTimer();
    }
    lastTick = Date.now();
  });
  const originalStartTimer = startTimer;
  // Track the wall-clock baseline while running, so timer remains accurate across background tabs.
  $("#timer-start").addEventListener("click", () => { lastTick = Date.now(); });
  $("#timer-stop").addEventListener("click", () => { lastTick = Date.now(); });
  $("#timer-reset").addEventListener("click", () => { lastTick = Date.now(); });

  const dinoBuddy = $(".dino-buddy");
  dinoBuddy.addEventListener("click", () => {
    dinoBuddy.classList.remove("cheering");
    void dinoBuddy.offsetWidth;
    dinoBuddy.classList.add("cheering");
    setTimeout(() => dinoBuddy.classList.remove("cheering"), 1800);
  });

  applyTheme();
  updateClock();
  renderTasks();
  renderLinks();
  renderTimer();
  setInterval(updateClock, 1_000);
})();
