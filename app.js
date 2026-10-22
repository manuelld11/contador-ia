// ---- Configuración ----
const RECOGNITION_LANG = "es-ES"; // cambiar a "es-CO" / "es-MX" / "es-AR" etc. si el reconocimiento anda mejor con otro acento
const STORAGE_KEYS = {
  date: "contadorIA_date",
  count: "contadorIA_count",
  log: "contadorIA_log",       // menciones de hoy: [{time: "HH:MM:SS", phrase: "..."}]
  history: "contadorIA_history" // totales por día ya cerrados: [{date: "YYYY-MM-DD", count: N}]
};

// ---- Utilidades de fecha/almacenamiento ----
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- Estado ----
let state = {
  date: localStorage.getItem(STORAGE_KEYS.date) || todayStr(),
  count: parseInt(localStorage.getItem(STORAGE_KEYS.count) || "0", 10),
  log: loadJSON(STORAGE_KEYS.log, []),
  history: loadJSON(STORAGE_KEYS.history, [])
};

function persist() {
  localStorage.setItem(STORAGE_KEYS.date, state.date);
  localStorage.setItem(STORAGE_KEYS.count, String(state.count));
  saveJSON(STORAGE_KEYS.log, state.log);
  saveJSON(STORAGE_KEYS.history, state.history);
}

function rolloverIfNeeded() {
  const today = todayStr();
  if (state.date !== today) {
    state.history.push({ date: state.date, count: state.count });
    state.date = today;
    state.count = 0;
    state.log = [];
    persist();
    renderCounter();
  }
}

// ---- DOM ----
const counterEl = document.getElementById("counter");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const resetBtn = document.getElementById("resetBtn");
const historyBtn = document.getElementById("historyBtn");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const historyOverlay = document.getElementById("historyOverlay");
const historyTableBody = document.querySelector("#historyTable tbody");
const todayLogTableBody = document.querySelector("#todayLogTable tbody");

function renderCounter() {
  counterEl.textContent = state.count;
}

function flashCounter() {
  counterEl.classList.add("flash");
  setTimeout(() => counterEl.classList.remove("flash"), 300);
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch (e) {
    // Web Audio no disponible; se ignora el sonido
  }
}

function setStatus(mode, text) {
  statusDot.className = "dot" + (mode ? " " + mode : "");
  statusText.textContent = text;
}

// ---- Detección de "ia" / "inteligencia artificial" ----
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes (marcas diacríticas combinadas tras NFD)
    .replace(/[.,]/g, "")  // "i.a." / "i,a" -> "ia" (el motor a veces transcribe la sigla con puntos)
    .replace(/\bi a\b/g, "ia"); // "i a" (letras deletreadas con espacio) -> "ia"
}

function countMentions(transcript) {
  let text = normalize(transcript);
  let matches = [];

  text = text.replace(/\binteligencia artificial\b/g, () => {
    matches.push("inteligencia artificial");
    return " ";
  });

  text = text.replace(/\bia\b/g, () => {
    matches.push("ia");
    return " ";
  });

  return matches;
}

function registerMentions(matches, rawTranscript) {
  if (matches.length === 0) return;
  rolloverIfNeeded();
  const time = new Date().toLocaleTimeString("es-ES");
  matches.forEach(() => {
    state.count += 1;
    state.log.push({ time, phrase: rawTranscript });
  });
  persist();
  renderCounter();
  flashCounter();
  beep();
}

// ---- Reconocimiento de voz ----
const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let userStopped = false;

function startRecognition() {
  if (!SpeechRecognitionImpl) {
    setStatus("error", "Este navegador no soporta reconocimiento de voz (usa Chrome o Edge)");
    return;
  }

  recognition = new SpeechRecognitionImpl();
  recognition.lang = RECOGNITION_LANG;
  recognition.continuous = true;
  recognition.interimResults = true; // mantiene el flujo de audio "vivo" con el motor; igual solo contamos los resultados finales
  recognition.maxAlternatives = 1;

  recognition.onstart = () => setStatus("listening", "Escuchando...");

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        const matches = countMentions(transcript);
        registerMentions(matches, transcript.trim());
      }
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setStatus("error", "Permiso de micrófono denegado");
      userStopped = true;
    } else if (event.error === "no-speech") {
      // normal durante silencios, se reinicia en onend
    } else {
      setStatus("error", "Error: " + event.error);
    }
  };

  recognition.onend = () => {
    if (!userStopped) {
      // Reinicio inmediato: cada ms de retraso aquí es audio que se pierde.
      try {
        recognition.start();
      } catch (e) {
        setTimeout(() => {
          try { recognition.start(); } catch (e2) { /* ya estaba iniciado */ }
        }, 50);
      }
    } else {
      setStatus(null, "Apagado");
    }
  };

  userStopped = false;
  try {
    recognition.start();
  } catch (e) {
    setStatus("error", "No se pudo iniciar el micrófono");
  }
}

// ---- Mantener la pantalla encendida (clave en celulares) ----
let wakeLock = null;

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (e) {
    // el navegador puede negarlo si la pestaña no está visible; no es crítico
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") requestWakeLock();
});

// ---- Historial (modal) ----
function renderHistory() {
  historyTableBody.innerHTML = "";
  const rows = [...state.history].reverse();
  rows.forEach(({ date, count }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${date}</td><td>${count}</td>`;
    historyTableBody.appendChild(tr);
  });
  if (rows.length === 0) {
    historyTableBody.innerHTML = `<tr><td colspan="2">Todavía no hay días cerrados</td></tr>`;
  }

  todayLogTableBody.innerHTML = "";
  const todayRows = [...state.log].reverse();
  todayRows.forEach(({ time, phrase }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${time}</td><td>${phrase}</td>`;
    todayLogTableBody.appendChild(tr);
  });
  if (todayRows.length === 0) {
    todayLogTableBody.innerHTML = `<tr><td colspan="2">Todavía no hay menciones hoy</td></tr>`;
  }
}

historyBtn.addEventListener("click", () => {
  renderHistory();
  historyOverlay.classList.add("open");
});

closeHistoryBtn.addEventListener("click", () => historyOverlay.classList.remove("open"));
historyOverlay.addEventListener("click", (e) => {
  if (e.target === historyOverlay) historyOverlay.classList.remove("open");
});

// ---- Reinicio manual ----
resetBtn.addEventListener("click", () => {
  const ok = confirm("¿Reiniciar el contador de hoy a 0? (el historial de días anteriores no se toca)");
  if (!ok) return;
  state.count = 0;
  state.log = [];
  persist();
  renderCounter();
});

// ---- Revisión periódica de cambio de día ----
setInterval(rolloverIfNeeded, 60 * 1000);

// ---- Init ----
rolloverIfNeeded();
renderCounter();
startRecognition();
requestWakeLock();
