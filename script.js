const video = document.getElementById("camera");
const cameraMessage = document.getElementById("cameraMessage");
const startCamera = document.getElementById("startCamera");
const capture = document.getElementById("capture");
const switchCamera = document.getElementById("switchCamera");
const canvas = document.getElementById("canvas");
const gallery = document.getElementById("gallery");
const flash = document.getElementById("flash");

let stream = null;
let facingMode = "user";

async function openCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    cameraMessage.querySelector("p").textContent =
      "Camera is unavailable here. Open this app on localhost or HTTPS.";
    cameraMessage.style.display = "flex";
    return;
  }

  if (stream) stream.getTracks().forEach(track => track.stop());

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false
    });

    video.srcObject = stream;
    video.muted = true;
    await video.play();
    cameraMessage.style.display = "none";
    startCamera.textContent = "CAMERA ON ✓";
    video.style.transform = facingMode === "user" ? "scaleX(-1)" : "scaleX(1)";
  } catch (error) {
    console.error("Camera error:", error);
    cameraMessage.style.display = "flex";

    startCamera.textContent = "OPEN CAMERA";
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      cameraMessage.querySelector("p").textContent =
        "Camera permission was blocked. Click the camera icon in your browser's address bar and allow Camera, then try again.";
    } else if (error.name === "NotFoundError") {
      cameraMessage.querySelector("p").textContent =
        "No camera was found on this device.";
    } else {
      cameraMessage.querySelector("p").textContent =
        "Could not open the camera. Use localhost or HTTPS and check browser permissions.";
    }
  }
}

if (startCamera) startCamera.addEventListener("click", openCamera);

if (switchCamera) {
  switchCamera.addEventListener("click", async () => {
    facingMode = facingMode === "user" ? "environment" : "user";
    await openCamera();
  });
}

if (capture) {
  capture.addEventListener("click", () => {
    if (!stream || !video.videoWidth) {
      alert("Open the camera first!");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    flash.classList.remove("flash");
    void flash.offsetWidth;
    flash.classList.add("flash");

    const image = canvas.toDataURL("image/jpeg", 0.92);

    const empty = gallery.querySelector(".empty");
    if (empty) empty.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "photo";

    const img = document.createElement("img");
    img.src = image;
    img.alt = "GRWM snapshot";

    wrapper.appendChild(img);
    gallery.prepend(wrapper);
  });
}

const audio = document.getElementById("audio");
const play = document.getElementById("play");
const progress = document.getElementById("progress");
const volume = document.getElementById("volume");
const musicFile = document.getElementById("musicFile");
const musicList = document.getElementById("musicList");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const displayTitle = document.getElementById("displayTitle");
const displayArtist = document.getElementById("displayArtist");
const songTitle = document.getElementById("songTitle");
const artist = document.getElementById("artist");

let musicLibrary = [];
let currentSongId = null;
let currentObjectUrl = null;

const DB_NAME = "retroGrwmDB";
const STORE = "songs";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSongs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveSong(file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite")
      .objectStore(STORE)
      .add({ name: file.name, blob: file, addedAt: Date.now() });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeSong(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function songName(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function releaseObjectUrl() {
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = null;
}

async function playSong(song) {
  currentSongId = song.id;
  releaseObjectUrl();
  currentObjectUrl = URL.createObjectURL(song.blob);
  audio.src = currentObjectUrl;
  audio.volume = Number(volume.value);

  const name = songName(song.name);
  displayTitle.textContent = name;
  songTitle.textContent = name;
  displayArtist.textContent = "Your GRWM mix";
  artist.textContent = "Your GRWM mix";

  try {
    await audio.play();
    play.textContent = "❚❚";
  } catch {
    play.textContent = "▶";
  }
}

function renderMusicLibrary() {
  musicList.innerHTML = "";

  if (!musicLibrary.length) {
    musicList.innerHTML =
      '<div class="empty-music">No saved songs yet. Add your first GRWM song ♫</div>';
    return;
  }

  musicLibrary.forEach(song => {
    const row = document.createElement("div");
    row.className = "music-row";

    const info = document.createElement("div");
    info.className = "music-info";

    const title = document.createElement("strong");
    title.textContent = songName(song.name);

    const subtitle = document.createElement("small");
    subtitle.textContent = "YOUR GRWM MIX";

    info.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "music-row-actions";

    const playButton = document.createElement("button");
    playButton.textContent = "▶";
    playButton.onclick = () => playSong(song);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "×";
    deleteButton.className = "delete-song";
    deleteButton.onclick = async () => {
      if (!confirm(`Remove "${songName(song.name)}"?`)) return;
      await removeSong(song.id);
      if (currentSongId === song.id) {
        audio.pause();
        audio.removeAttribute("src");
        releaseObjectUrl();
        currentSongId = null;
        play.textContent = "▶";
      }
      await refreshLibrary();
    };

    actions.append(playButton, deleteButton);
    row.append(info, actions);
    musicList.appendChild(row);
  });
}

async function refreshLibrary() {
  musicLibrary = await getSongs();
  renderMusicLibrary();
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

play.addEventListener("click", async () => {
  if (!audio.src) {
    if (musicLibrary.length) await playSong(musicLibrary[0]);
    else alert("Add a song first!");
    return;
  }

  if (audio.paused) {
    await audio.play();
    play.textContent = "❚❚";
  } else {
    audio.pause();
    play.textContent = "▶";
  }
});

audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  if (audio.duration) progress.value = (audio.currentTime / audio.duration) * 100;
});

progress.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = (progress.value / 100) * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});

audio.addEventListener("ended", async () => {
  const index = musicLibrary.findIndex(song => song.id === currentSongId);
  if (index >= 0 && index < musicLibrary.length - 1) {
    await playSong(musicLibrary[index + 1]);
  } else {
    play.textContent = "▶";
  }
});

document.getElementById("prev").addEventListener("click", async () => {
  const index = musicLibrary.findIndex(song => song.id === currentSongId);
  if (index > 0) await playSong(musicLibrary[index - 1]);
});

document.getElementById("next").addEventListener("click", async () => {
  const index = musicLibrary.findIndex(song => song.id === currentSongId);
  if (index >= 0 && index < musicLibrary.length - 1) {
    await playSong(musicLibrary[index + 1]);
  }
});

musicFile.addEventListener("change", async () => {
  const files = Array.from(musicFile.files || []);
  if (!files.length) return;

  try {
    for (const file of files) await saveSong(file);
    await refreshLibrary();

    const newest = musicLibrary.slice(-files.length);
    if (newest.length) await playSong(newest[0]);
  } catch (error) {
    console.error(error);
    alert("Could not save this song in your browser.");
  }

  musicFile.value = "";
});

refreshLibrary().catch(console.error);

document.querySelectorAll(".step").forEach(step => {
  step.addEventListener("click", () => {
    document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
    step.classList.add("active");
  });
});

function updateClock() {
  document.getElementById("cameraTime").textContent =
    new Date().toLocaleTimeString([], { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

window.addEventListener("beforeunload", () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
});
