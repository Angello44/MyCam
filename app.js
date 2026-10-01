import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
// TensorFlow.js & COCO-SSD di-load via <script> tag di index.html (global: tf, cocoSsd)

// ── Firebase Config ──────────────────────────────────────────────────────────
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

// ── Elements ─────────────────────────────────────────────────────────────────
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const detectCanvas = document.getElementById("detect-canvas");
const flash = document.getElementById("flash");
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
const toast = document.getElementById("toast");

// ── State ─────────────────────────────────────────────────────────────────────
let stream = null;
let lastDataUrl = null;
let toastTimer = null;
let cocoModel = null;
let detectLoop = null;
let lastPredicts = [];

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "camcloud_gallery";

function saveToStorage(entry) {
  const existing = getFromStorage();
  existing.unshift(entry); // terbaru di depan
  // Batasi 30 foto agar localStorage tidak penuh
  const trimmed = existing.slice(0, 30);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
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

// ── Firebase status ───────────────────────────────────────────────────────────
statusDot.classList.add("live");
statusText.textContent = "Firebase terhubung";

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ── Load COCO-SSD Model ───────────────────────────────────────────────────────
async function loadModel() {
  aiDot.className = "ai-dot loading";
  aiText.textContent = "Memuat model COCO-SSD…";
  try {
    cocoModel = await cocoSsd.load();
    aiDot.className = "ai-dot ready";
    aiText.textContent = "Model siap — deteksi aktif";
    showToast("Model COCO-SSD siap");
  } catch (e) {
    aiDot.className = "ai-dot";
    aiText.textContent = "Gagal memuat model AI";
    console.error("COCO-SSD load error:", e);
  }
}

// ── Detection Loop ────────────────────────────────────────────────────────────
function startDetection() {
  if (!cocoModel || !stream) return;

  const rect = video.getBoundingClientRect();
  detectCanvas.width = rect.width;
  detectCanvas.height = rect.height;

  const ctx = detectCanvas.getContext("2d");

  async function detect() {
    if (!stream) return;
    aiDot.className = "ai-dot detecting";

    const predictions = await cocoModel.detect(video);
    lastPredicts = predictions;

    ctx.clearRect(0, 0, detectCanvas.width, detectCanvas.height);

    const scaleX = detectCanvas.width / video.videoWidth;
    const scaleY = detectCanvas.height / video.videoHeight;

    predictions.forEach((pred) => {
      const [x, y, w, h] = pred.bbox;

      // Flip koordinat X karena video di-mirror (scaleX(-1))
      const flippedX = video.videoWidth - x - w;

      const sx = flippedX * scaleX;
      const sy = y * scaleY;
      const sw = w * scaleX;
      const sh = h * scaleY;
      const conf = Math.round(pred.score * 100);

      ctx.strokeStyle = "#2d2926";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx, sy, sw, sh);

      const label = `${pred.class} ${conf}%`;
      const padding = 4;
      ctx.font = "600 11px Inter, sans-serif";
      const textW = ctx.measureText(label).width;
      ctx.fillStyle = "#2d2926";
      ctx.fillRect(sx - 0.75, sy - 20, textW + padding * 2, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, sx + padding, sy - 6);
    });

    aiDot.className = "ai-dot ready";
    detectLoop = requestAnimationFrame(detect);
  }

  detect();
}

function stopDetection() {
  if (detectLoop) cancelAnimationFrame(detectLoop);
  detectLoop = null;
  detectCanvas
    .getContext("2d")
    .clearRect(0, 0, detectCanvas.width, detectCanvas.height);
  lastPredicts = [];
}

// ── Camera: Start ─────────────────────────────────────────────────────────────
btnStart.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => startDetection(), {
      once: true,
    });
    camIdle.style.display = "none";
    btnStart.disabled = true;
    btnSnap.disabled = false;
    btnStop.disabled = false;
    showToast("Kamera aktif");
  } catch {
    showToast("Gagal mengakses kamera — izinkan di browser");
  }
});

// ── Camera: Stop ──────────────────────────────────────────────────────────────
btnStop.addEventListener("click", () => {
  stopDetection();
  stream?.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  stream = null;
  camIdle.style.display = "flex";
  aiDot.className = "ai-dot ready";
  aiText.textContent = "Model siap — kamera mati";
  btnStart.disabled = false;
  btnSnap.disabled = true;
  btnStop.disabled = true;
  showToast("Kamera dimatikan");
});

// ── Snap & Save ───────────────────────────────────────────────────────────────
btnSnap.addEventListener("click", async () => {
  flash.classList.add("pop");
  setTimeout(() => flash.classList.remove("pop"), 120);

  // Jalankan deteksi fresh saat snap — jangan andalkan lastPredicts yang bisa stale
  let snapshot = [];
  if (cocoModel && stream) {
    try {
      const fresh = await cocoModel.detect(video);
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
    } catch (e) {
      console.warn("Deteksi saat snap gagal, pakai lastPredicts:", e);
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

  // Capture — flip horizontal agar tidak mirror
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.translate(640, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 640, 480);
  ctx.restore();
  const dataUrl = canvas.toDataURL("image/png");
  lastDataUrl = dataUrl;

  // Preview
  previewImg.src = dataUrl;
  previewImg.style.display = "block";
  previewIdle.style.display = "none";
  btnDownload.disabled = false;

  // Detection tags di panel preview
  renderDetectTags(snapshot);

  // Simpan ke localStorage & render ke gallery
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

  // Simpan ke Firestore
  btnSnap.disabled = true;
  btnSnap.textContent = "Menyimpan…";

  try {
    const docRef = await addDoc(collection(db, "photos"), {
      timestamp: new Date(),
      namaFile: "foto_" + Date.now() + ".png",
      status: "captured",
      detectedObjects: snapshot, // array lengkap: class, confidence, bbox
      objectCount: snapshot.length,
    });
    showToast("Tersimpan — " + docRef.id.slice(0, 8) + "…");
    console.log("✅ Firestore saved:", snapshot);
  } catch (e) {
    showToast("Gagal menyimpan: " + e.message);
    console.error("❌ Firestore error:", e);
  } finally {
    btnSnap.disabled = false;
    btnSnap.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      Ambil Foto & Simpan`;
  }
});

// ── Render Detection Tags ─────────────────────────────────────────────────────
function renderDetectTags(predictions) {
  if (!predictions.length) {
    detectList.innerHTML =
      '<span class="detect-empty">Tidak ada objek terdeteksi.</span>';
    return;
  }
  detectList.innerHTML = predictions
    .map((p) => {
      const conf = Math.round(p.score * 100);
      return `<span class="detect-tag">${p.class} <span class="conf">${conf}%</span></span>`;
    })
    .join("");
}

// ── Download ──────────────────────────────────────────────────────────────────
btnDownload.addEventListener("click", () => {
  if (!lastDataUrl) return;
  const a = document.createElement("a");
  a.href = lastDataUrl;
  a.download = "camcloud_" + Date.now() + ".png";
  a.click();
  showToast("Foto diunduh");
});

// ── Gallery ───────────────────────────────────────────────────────────────────
// ── Gallery ───────────────────────────────────────────────────────────────────
function deleteFromStorage(index) {
  const entries = getFromStorage();
  entries.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function refreshPhotoCount() {
  const n = getFromStorage().length;
  photoCount.textContent = n + " foto";
  if (n === 0) {
    gallery.innerHTML =
      '<div class="gallery-empty">Foto yang diambil akan muncul di sini.</div>';
    document.getElementById("btn-clear-all").style.display = "none";
  }
}

function renderGalleryItem(entry, prepend = false, storageIndex = null) {
  document.querySelector(".gallery-empty")?.remove();
  document.getElementById("btn-clear-all").style.display = "inline-flex";

  const label = entry.labels?.length
    ? entry.labels.join(", ")
    : "Tidak terdeteksi";

  const item = document.createElement("div");
  item.className = "gallery-item";
  item.dataset.index = storageIndex ?? 0;
  item.innerHTML = `
    <img src="${entry.dataUrl}" alt="foto">
    <div class="item-time">${entry.time} · ${label}</div>
    <button class="btn-delete-item" title="Hapus foto" aria-label="Hapus foto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
  `;

  item.querySelector(".btn-delete-item").addEventListener("click", (e) => {
    e.stopPropagation();
    const idx = parseInt(item.dataset.index);
    deleteFromStorage(idx);
    item.remove();
    gallery.querySelectorAll(".gallery-item").forEach((el, i) => {
      el.dataset.index = i;
    });
    refreshPhotoCount();
    showToast("Foto dihapus");
  });

  if (prepend) {
    gallery.querySelectorAll(".gallery-item").forEach((el) => {
      el.dataset.index = parseInt(el.dataset.index) + 1;
    });
    item.dataset.index = 0;
    gallery.insertBefore(item, gallery.firstChild);
  } else {
    gallery.appendChild(item);
  }
}

function loadGalleryFromStorage() {
  const entries = getFromStorage();
  if (!entries.length) return;

  document.querySelector(".gallery-empty")?.remove();
  entries.forEach((entry, i) => renderGalleryItem(entry, false, i));
  photoCount.textContent = entries.length + " foto";
  document.getElementById("btn-clear-all").style.display = "inline-flex";
}

document.getElementById("btn-clear-all").addEventListener("click", () => {
  clearStorage();
  gallery.innerHTML =
    '<div class="gallery-empty">Foto yang diambil akan muncul di sini.</div>';
  photoCount.textContent = "0 foto";
  document.getElementById("btn-clear-all").style.display = "none";
  showToast("Semua foto dihapus");
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadModel();
loadGalleryFromStorage();
