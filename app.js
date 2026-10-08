import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
// TensorFlow.js & COCO-SSD di-load via <script> tag di index.html (global: tf, cocoSsd)

// ── Firebase Config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDtr7Si-2OnMFCgKqriJ-X7YJAOBv4LNAM",
  authDomain: "cameramobile-34a8c.firebaseapp.com",
  projectId: "cameramobile-34a8c",
  storageBucket: "cameramobile-34a8c.firebasestorage.app",
  messagingSenderId: "205707431058",
  appId: "1:205707431058:web:fa6523e7df16bd2240aa4b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── COCO-SSD Class Color Map ──────────────────────────────────────────────────
const CLASS_COLORS = {
  // People & animals
  person: "#ef4444",
  bear: "#92400e",
  cat: "#f97316",
  dog: "#f59e0b",
  horse: "#84cc16",
  sheep: "#22c55e",
  cow: "#10b981",
  elephant: "#14b8a6",
  bird: "#06b6d4",
  zebra: "#0ea5e9",
  giraffe: "#3b82f6",
  // Vehicles
  car: "#6366f1",
  truck: "#8b5cf6",
  bus: "#a855f7",
  motorcycle: "#ec4899",
  bicycle: "#f43f5e",
  airplane: "#0891b2",
  boat: "#0369a1",
  train: "#1d4ed8",
  // Electronics
  "cell phone": "#7c3aed",
  laptop: "#4f46e5",
  tv: "#1e40af",
  keyboard: "#0f766e",
  mouse: "#047857",
  remote: "#065f46",
  // Kitchen & food
  bottle: "#c2410c",
  cup: "#b45309",
  fork: "#92400e",
  knife: "#78350f",
  spoon: "#713f12",
  bowl: "#4d7c0f",
  banana: "#fbbf24",
  apple: "#ef4444",
  sandwich: "#f97316",
  orange: "#fb923c",
  broccoli: "#86efac",
  carrot: "#fdba74",
  "hot dog": "#fca5a1",
  pizza: "#fcd34d",
  donut: "#fbcfe8",
  cake: "#f0abfc",
  // Furniture & household
  chair: "#a3e635",
  couch: "#34d399",
  bed: "#67e8f9",
  "dining table": "#93c5fd",
  toilet: "#c084fc",
  "wine glass": "#e879f9",
  scissors: "#f9a8d4",
  "potted plant": "#6ee7b7",
  // Outdoor & misc
  umbrella: "#fde68a",
  handbag: "#fecaca",
  tie: "#bfdbfe",
  suitcase: "#ddd6fe",
  backpack: "#fdf4ff",
  clock: "#fffbeb",
  "traffic light": "#fef08a",
  "fire hydrant": "#fff7ed",
  "stop sign": "#fef2f2",
  bench: "#f0fdfa",
  book: "#fafafa",
  vase: "#f0f9ff",
  "sports ball": "#bbf7d0",
  kite: "#fef9c3",
  skateboard: "#e2e8f0",
  surfboard: "#f1f5f9",
  "tennis racket": "#ecfdf5",
  frisbee: "#84cc16",
};

function getClassColor(cls) {
  return CLASS_COLORS[cls] || "#facc15";
}

// ── Detect mobile breakpoint ──────────────────────────────────────────────────
const isMobile = () => window.innerWidth <= 767;

// ── Desktop Elements ──────────────────────────────────────────────────────────
const video = document.getElementById("video");
const detectCanvas = document.getElementById("detect-canvas");
const flashEl = document.getElementById("flash");
const previewImg = document.getElementById("preview-img");
const previewIdle = document.getElementById("preview-idle");
const camIdle = document.getElementById("cam-idle");
const btnStart = document.getElementById("btn-start");
const btnSnap = document.getElementById("btn-snap");
const btnStop = document.getElementById("btn-stop");
const btnDownload = document.getElementById("btn-download");
const gallery = document.getElementById("gallery");
const photoCount = document.getElementById("photo-count");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const aiDot = document.getElementById("ai-dot");
const aiText = document.getElementById("ai-text");
const detectList = document.getElementById("detect-list");

// ── Mobile Elements ───────────────────────────────────────────────────────────
const mVideo = document.getElementById("m-video");
const mDetectCanvas = document.getElementById("m-detect-canvas");
const mFlashEl = document.getElementById("m-flash");
const mPreviewImg = document.getElementById("m-preview-img");
const mPreviewIdle = document.getElementById("m-preview-idle");
const mCamIdle = document.getElementById("m-cam-idle");
const mBtnStart = document.getElementById("m-btn-start");
const mBtnSnap = document.getElementById("m-btn-snap");
const mBtnStop = document.getElementById("m-btn-stop");
const mBtnDownload = document.getElementById("m-btn-download");
const mGallery = document.getElementById("m-gallery");
const mPhotoCount = document.getElementById("m-photo-count");
const mStatusDot = document.getElementById("m-status-dot");
const mStatusText = document.getElementById("m-status-text");
const mAiDot = document.getElementById("m-ai-dot");
const mAiText = document.getElementById("m-ai-text");
const mDetectList = document.getElementById("m-detect-list");
const btnFlash = document.getElementById("btn-flash");
const btnSwitch = document.getElementById("btn-switch");

// ── Shared canvas ─────────────────────────────────────────────────────────────
const canvas = document.getElementById("canvas");
const toast = document.getElementById("toast");

// ── State ─────────────────────────────────────────────────────────────────────
let stream = null;
let lastDataUrl = null;
let toastTimer = null;
let cocoModel = null;
let detectLoop = null;
let lastPredicts = [];
let facingMode = "user";
let flashOn = false;
let torchTrack = null;

// ── Zoom state ────────────────────────────────────────────────────────────────
let currentZoom = 1;
let minZoom = 1;
let maxZoom = 4;
let zoomTimer = null;

const zoomIndicator = document.getElementById("zoom-indicator");

function showZoomIndicator(val) {
  if (!zoomIndicator) return;
  zoomIndicator.textContent = val.toFixed(1) + "×";
  zoomIndicator.classList.add("visible");
  clearTimeout(zoomTimer);
  zoomTimer = setTimeout(() => zoomIndicator.classList.remove("visible"), 1500);
}

async function applyZoom(val) {
  if (!torchTrack) return;
  try {
    const caps = torchTrack.getCapabilities();
    if (!caps.zoom) return;
    minZoom = caps.zoom.min ?? 1;
    maxZoom = caps.zoom.max ?? 4;
    currentZoom = Math.min(maxZoom, Math.max(minZoom, val));
    await torchTrack.applyConstraints({ advanced: [{ zoom: currentZoom }] });
    showZoomIndicator(currentZoom);
  } catch {
    /* zoom tidak didukung */
  }
}

// ── Pinch to zoom ─────────────────────────────────────────────────────────────
let pinchStartDist = null;
let pinchStartZoom = 1;

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

const viewfinder = document.getElementById("m-viewfinder");
if (viewfinder) {
  viewfinder.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        pinchStartDist = getPinchDist(e.touches);
        pinchStartZoom = currentZoom;
        e.preventDefault();
      }
    },
    { passive: false },
  );

  viewfinder.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2 && pinchStartDist) {
        const dist = getPinchDist(e.touches);
        const scale = dist / pinchStartDist;
        applyZoom(pinchStartZoom * scale);
        e.preventDefault();
      }
    },
    { passive: false },
  );

  viewfinder.addEventListener("touchend", () => {
    pinchStartDist = null;
  });
}

// ── LocalStorage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "camcloud_gallery";

function saveToStorage(entry) {
  const list = getFromStorage();
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
}

function getFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Firebase & AI status ──────────────────────────────────────────────────────
function setStatus(connected) {
  const cls = connected ? "live" : "";
  const label = connected ? "Firebase terhubung" : "Gagal terhubung";
  if (statusDot) statusDot.className = "status-dot " + cls;
  if (statusText) statusText.textContent = label;
  if (mStatusDot) mStatusDot.className = "status-dot " + cls;
  if (mStatusText) mStatusText.textContent = label;
}

function setAI(dotClass, label) {
  if (aiDot) aiDot.className = "ai-dot " + dotClass;
  if (aiText) aiText.textContent = label;
  if (mAiDot) mAiDot.className = "ai-dot " + dotClass;
  if (mAiText) mAiText.textContent = label;
}

setStatus(true);

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ── Active video & canvas (tergantung mode) ───────────────────────────────────
function activeVideo() {
  return isMobile() ? mVideo : video;
}
function activeCanvas() {
  return isMobile() ? mDetectCanvas : detectCanvas;
}
function activeFlash() {
  return isMobile() ? mFlashEl : flashEl;
}

// ── Load COCO-SSD ─────────────────────────────────────────────────────────────
async function loadModel() {
  setAI("loading", "Memuat COCO-SSD…");
  try {
    cocoModel = await cocoSsd.load();
    setAI("ready", "Model siap");
    showToast("Model COCO-SSD siap");
  } catch (e) {
    setAI("", "AI gagal dimuat");
    console.error("COCO-SSD load error:", e);
  }
}

// ── Detection loop ────────────────────────────────────────────────────────────
function startDetection() {
  if (!cocoModel || !stream) return;
  const vid = activeVideo();
  const cvs = activeCanvas();
  const ctx = cvs.getContext("2d");

  const rect = vid.getBoundingClientRect();
  cvs.width = rect.width;
  cvs.height = rect.height;

  async function detect() {
    if (!stream) return;
    setAI("detecting", "Mendeteksi…");

    const predictions = await cocoModel.detect(vid);
    lastPredicts = predictions;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const scaleX = cvs.width / vid.videoWidth;
    const scaleY = cvs.height / vid.videoHeight;

    // Flip X hanya jika kamera depan (mirror)
    const shouldFlip = facingMode === "user";

    predictions.forEach((pred) => {
      const [x, y, w, h] = pred.bbox;
      const rawX = shouldFlip ? vid.videoWidth - x - w : x;
      const sx = rawX * scaleX;
      const sy = y * scaleY;
      const sw = w * scaleX;
      const sh = h * scaleY;
      const conf = Math.round(pred.score * 100);
      const color = getClassColor(pred.class);

      // Bounding box berwarna per class
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // Label background pakai warna yang sama (semi transparan)
      const label = `${pred.class} ${conf}%`;
      const padding = 4;
      ctx.font = "600 11px Inter, sans-serif";
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = color + "cc"; // hex + alpha cc = ~80%
      ctx.fillRect(sx - 0.75, sy - 20, textW + padding * 2, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, sx + padding, sy - 6);
    });

    setAI("ready", "Model siap");
    detectLoop = requestAnimationFrame(detect);
  }

  detect();
}

function stopDetection() {
  if (detectLoop) cancelAnimationFrame(detectLoop);
  detectLoop = null;
  activeCanvas()
    .getContext("2d")
    .clearRect(0, 0, activeCanvas().width, activeCanvas().height);
  lastPredicts = [];
}

// ── Start Camera (shared) ─────────────────────────────────────────────────────
async function startCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
    });

    const vid = activeVideo();
    vid.srcObject = stream;

    // Simpan torch track kalau ada (untuk flash HP)
    torchTrack = stream.getVideoTracks()[0] || null;

    vid.addEventListener("loadeddata", () => startDetection(), { once: true });

    // Update UI
    const idle = isMobile() ? mCamIdle : camIdle;
    idle.style.display = "none";

    if (isMobile()) {
      mBtnStart.disabled = true;
      mBtnSnap.disabled = false;
      mBtnStop.disabled = false;
      btnFlash.disabled = false;
      btnSwitch.disabled = false;
    } else {
      btnStart.disabled = true;
      btnSnap.disabled = false;
      btnStop.disabled = false;
    }

    // Mirror video hanya untuk kamera depan
    vid.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";

    showToast("Kamera aktif");
  } catch {
    showToast("Gagal akses kamera — izinkan di browser");
  }
}

// ── Stop Camera (shared) ──────────────────────────────────────────────────────
function stopCamera() {
  stopDetection();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  torchTrack = null;
  flashOn = false;

  const vid = activeVideo();
  const idle = isMobile() ? mCamIdle : camIdle;
  vid.srcObject = null;
  idle.style.display = "flex";

  if (isMobile()) {
    mBtnStart.disabled = false;
    mBtnSnap.disabled = true;
    mBtnStop.disabled = true;
    btnFlash.disabled = true;
    btnSwitch.disabled = true;
    btnFlash.classList.remove("flash-on");
    document.getElementById("flash-icon-off").style.display = "";
    document.getElementById("flash-icon-on").style.display = "none";
  } else {
    btnStart.disabled = false;
    btnSnap.disabled = true;
    btnStop.disabled = true;
  }

  setAI("ready", "Model siap");
  showToast("Kamera dimatikan");
}

// ── Desktop listeners ─────────────────────────────────────────────────────────
btnStart.addEventListener("click", () => startCamera());
btnStop.addEventListener("click", () => stopCamera());

// ── Mobile listeners ──────────────────────────────────────────────────────────
mBtnStart.addEventListener("click", () => startCamera());
mBtnStop.addEventListener("click", () => stopCamera());

// Switch kamera (depan ↔ belakang)
btnSwitch.addEventListener("click", async () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  showToast(facingMode === "user" ? "Kamera depan" : "Kamera belakang");
  await startCamera();
});

// Flash / torch toggle
btnFlash.addEventListener("click", async () => {
  if (!torchTrack) return;
  flashOn = !flashOn;
  try {
    await torchTrack.applyConstraints({ advanced: [{ torch: flashOn }] });
    btnFlash.classList.toggle("flash-on", flashOn);
    document.getElementById("flash-icon-off").style.display = flashOn
      ? "none"
      : "";
    document.getElementById("flash-icon-on").style.display = flashOn
      ? ""
      : "none";
    showToast(flashOn ? "Flash nyala" : "Flash mati");
  } catch {
    showToast("Flash tidak didukung di browser ini");
    flashOn = false;
  }
});

// ── Snap & Save (shared) ──────────────────────────────────────────────────────
async function doSnap(snapBtn) {
  const vid = activeVideo();
  const flashAnim = activeFlash();

  flashAnim.classList.add("pop");
  setTimeout(() => flashAnim.classList.remove("pop"), 120);

  // Fresh detection
  let snapshot = [];
  if (cocoModel && stream) {
    try {
      const fresh = await cocoModel.detect(vid);
      snapshot = fresh.map((p) => ({
        class: p.class,
        confidence: parseFloat(p.score.toFixed(3)),
        bbox: {
          x: Math.round(p.bbox[0]),
          y: Math.round(p.bbox[1]),
          width: Math.round(p.bbox[2]),
          height: Math.round(p.bbox[3]),
        },
      }));
    } catch {
      snapshot = lastPredicts.map((p) => ({
        class: p.class,
        confidence: parseFloat(p.score.toFixed(3)),
        bbox: {
          x: Math.round(p.bbox[0]),
          y: Math.round(p.bbox[1]),
          width: Math.round(p.bbox[2]),
          height: Math.round(p.bbox[3]),
        },
      }));
    }
  }

  // Capture — flip hanya kamera depan
  const ctx = canvas.getContext("2d");
  ctx.save();
  if (facingMode === "user") {
    ctx.translate(640, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(vid, 0, 0, 640, 480);
  ctx.restore();
  const dataUrl = canvas.toDataURL("image/png");
  lastDataUrl = dataUrl;

  // Update preview (desktop + mobile)
  previewImg.src = dataUrl;
  previewImg.style.display = "block";
  previewIdle.style.display = "none";
  btnDownload.disabled = false;
  mPreviewImg.src = dataUrl;
  mPreviewImg.style.display = "block";
  mPreviewIdle.style.display = "none";
  mBtnDownload.disabled = false;

  renderDetectTags(snapshot);

  // Gallery entry
  const entry = {
    dataUrl,
    time: new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    date: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    labels: snapshot.slice(0, 2).map((p) => p.class),
  };
  saveToStorage(entry);
  renderGalleryItem(entry, true);

  // Mobile: auto pindah ke tab gallery
  if (isMobile()) {
    document.querySelector('.m-tab[data-tab="gallery"]').click();
  }

  // Firestore
  if (snapBtn) snapBtn.disabled = true;
  try {
    const docRef = await addDoc(collection(db, "photos"), {
      timestamp: new Date(),
      namaFile: "foto_" + Date.now() + ".png",
      status: "captured",
      detectedObjects: snapshot,
      objectCount: snapshot.length,
    });
    showToast("Tersimpan — " + docRef.id.slice(0, 8) + "…");
    console.log("✅ Firestore saved:", snapshot);
  } catch (e) {
    showToast("Gagal simpan: " + e.message);
    console.error("❌ Firestore error:", e);
  } finally {
    if (snapBtn) snapBtn.disabled = false;
  }
}

btnSnap.addEventListener("click", () => doSnap(btnSnap));
mBtnSnap.addEventListener("click", () => doSnap(mBtnSnap));

// ── Detection tags ────────────────────────────────────────────────────────────
function renderDetectTags(predictions) {
  const html = predictions.length
    ? predictions
        .map((p) => {
          const conf = Math.round(p.confidence * 100);
          const color = getClassColor(p.class);
          return `<span class="detect-tag" style="border-color:${color};background:${color}22;">
                    <span class="detect-dot" style="background:${color}"></span>
                    ${p.class} <span class="conf">${conf}%</span>
                  </span>`;
        })
        .join("")
    : '<span class="detect-empty">Tidak ada objek terdeteksi.</span>';
  detectList.innerHTML = html;
  mDetectList.innerHTML = html;
}

// ── Download ──────────────────────────────────────────────────────────────────
function doDownload() {
  if (!lastDataUrl) return;
  const a = document.createElement("a");
  a.href = lastDataUrl;
  a.download = "mycam_" + Date.now() + ".png";
  a.click();
  showToast("Foto diunduh");
}
btnDownload.addEventListener("click", doDownload);
mBtnDownload.addEventListener("click", doDownload);

// ── Gallery ───────────────────────────────────────────────────────────────────
function deleteFromStorage(index) {
  const entries = getFromStorage();
  entries.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function refreshPhotoCount() {
  const n = getFromStorage().length;
  photoCount.textContent = n + " foto";
  mPhotoCount.textContent = n;
  const none =
    '<div class="gallery-empty">Foto yang diambil akan muncul di sini.</div>';
  if (n === 0) {
    gallery.innerHTML = none;
    mGallery.innerHTML = none;
    document.getElementById("btn-clear-all").style.display = "none";
    document.getElementById("m-btn-clear-all").style.display = "none";
  }
}

function renderGalleryItem(entry, prepend = false, storageIndex = null) {
  document.querySelector("#gallery .gallery-empty")?.remove();
  document.querySelector("#m-gallery .gallery-empty")?.remove();
  document.getElementById("btn-clear-all").style.display = "inline-flex";
  document.getElementById("m-btn-clear-all").style.display = "inline-flex";

  const label = entry.labels?.length ? entry.labels.join(", ") : "";

  // Factory buat item DOM
  function makeItem(galleryEl) {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.index = storageIndex ?? 0;
    item.innerHTML = `
            <img src="${entry.dataUrl}" alt="foto">
            <div class="item-time">${entry.time}${label ? " · " + label : ""}</div>
            <button class="btn-delete-item" title="Hapus" aria-label="Hapus foto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
            </button>`;

    item.querySelector(".btn-delete-item").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFromStorage(parseInt(item.dataset.index));

      // Hapus item yang sama di kedua gallery
      document
        .querySelectorAll(`.gallery-item[data-index="${item.dataset.index}"]`)
        .forEach((el) => el.remove());
      document.querySelectorAll(".gallery-item").forEach((el, i) => {
        el.dataset.index = i;
      });
      refreshPhotoCount();
      showToast("Foto dihapus");
    });

    if (prepend) {
      galleryEl.querySelectorAll(".gallery-item").forEach((el) => {
        el.dataset.index = parseInt(el.dataset.index) + 1;
      });
      item.dataset.index = 0;
      galleryEl.insertBefore(item, galleryEl.firstChild);
    } else {
      galleryEl.appendChild(item);
    }
  }

  makeItem(gallery);
  makeItem(mGallery);

  // Update count
  const n = getFromStorage().length;
  photoCount.textContent = n + " foto";
  mPhotoCount.textContent = n;
}

function loadGalleryFromStorage() {
  const entries = getFromStorage();
  if (!entries.length) return;
  document.querySelector("#gallery .gallery-empty")?.remove();
  document.querySelector("#m-gallery .gallery-empty")?.remove();
  entries.forEach((entry, i) => renderGalleryItem(entry, false, i));
  photoCount.textContent = entries.length + " foto";
  mPhotoCount.textContent = entries.length;
  document.getElementById("btn-clear-all").style.display = "inline-flex";
  document.getElementById("m-btn-clear-all").style.display = "inline-flex";
}

function clearAll() {
  clearStorage();
  const none =
    '<div class="gallery-empty">Foto yang diambil akan muncul di sini.</div>';
  gallery.innerHTML = none;
  mGallery.innerHTML = none;
  photoCount.textContent = "0 foto";
  mPhotoCount.textContent = "0";
  document.getElementById("btn-clear-all").style.display = "none";
  document.getElementById("m-btn-clear-all").style.display = "none";
  showToast("Semua foto dihapus");
}

document.getElementById("btn-clear-all").addEventListener("click", clearAll);
document.getElementById("m-btn-clear-all").addEventListener("click", clearAll);

// ── Mobile Tabs ───────────────────────────────────────────────────────────────
document.querySelectorAll(".m-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".m-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document
      .getElementById("m-screen-camera")
      .classList.toggle("m-hidden", target !== "camera");
    document
      .getElementById("m-screen-gallery")
      .classList.toggle("m-hidden", target !== "gallery");
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadModel();
loadGalleryFromStorage();
