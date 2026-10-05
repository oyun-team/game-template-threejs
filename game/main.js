// Örnek oyun: Mücevher Avı. Bu dosyayı kendi oyununla değiştir.
// Example game: Gem Hunt. Replace this file with your own game.
// Three.js docs / belgeler: https://threejs.org/docs  Examples / örnekler: https://threejs.org/examples
import * as THREE from "three";

const TEXT = {
  tr: { start: "Başlamak için dokun", score: "Skor", time: "Süre", over: "Süre bitti!", best: "En iyi", again: "Tekrar oynamak için dokun", hint: "Dönen mücevherlere dokun, kırmızı kayalara dokunma" },
  en: { start: "Tap to start", score: "Score", time: "Time", over: "Time's up!", best: "Best", again: "Tap to play again", hint: "Tap the spinning gems, avoid the red rocks" },
};
const t = TEXT[OyunSDK.getLanguage()] || TEXT.tr;
const $ = (id) => document.getElementById(id);

// --- Three.js basics: a renderer draws a scene through a camera. ---
const canvas = $("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // sharp but not too slow on phones
const scene = new THREE.Scene();
scene.background = new THREE.Color("#1b1730");
scene.fog = new THREE.Fog("#1b1730", 12, 26);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
camera.position.set(0, 0, 14);

scene.add(new THREE.HemisphereLight("#ffffff", "#40306a", 1.2));
const sun = new THREE.DirectionalLight("#ffffff", 2);
sun.position.set(4, 8, 6);
scene.add(sun);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// Shapes and materials are made once and shared. Real models can be loaded from game/assets
// with GLTFLoader (see README).
const GEM = new THREE.OctahedronGeometry(0.7);
const ROCK = new THREE.DodecahedronGeometry(0.75);
const GEM_COLORS = ["#4cc9f0", "#80ed99", "#ffd23f", "#c77dff"].map((c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, metalness: 0.2, roughness: 0.3 }));
const ROCK_MATERIAL = new THREE.MeshStandardMaterial({ color: "#ff5d73", flatShading: true, roughness: 0.8 });

const ROUND_SECONDS = 30;
let state = "start"; // start | playing | over
let paused = false;
let things = [];
let score = 0;
let timeLeft = ROUND_SECONDS;
let spawnTimer = 0;

function showMessage(text) { $("message").textContent = text; }
function updateHud() {
  $("score").textContent = state === "start" ? "" : `${t.score}: ${score}`;
  $("time").textContent = state === "start" ? "" : `${t.time}: ${Math.ceil(timeLeft)}`;
}

// How much of the world the camera sees at z = 0, so things spawn inside the screen.
function viewSize() {
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
  return { w: h * camera.aspect, h };
}

function spawn() {
  const rock = Math.random() < 0.25;
  const mesh = new THREE.Mesh(rock ? ROCK : GEM, rock ? ROCK_MATERIAL : GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)]);
  const { w, h } = viewSize();
  mesh.position.set((Math.random() - 0.5) * (w - 2), -h / 2 - 1, (Math.random() - 0.5) * 4);
  mesh.userData = { rock, speed: 2 + Math.random() * 2 + (ROUND_SECONDS - timeLeft) * 0.08, spin: 1 + Math.random() * 3 };
  scene.add(mesh);
  things.push(mesh);
}

function removeThing(mesh) {
  scene.remove(mesh);
  things = things.filter((m) => m !== mesh);
}

function startRound() {
  things.forEach((m) => scene.remove(m));
  things = [];
  score = 0;
  timeLeft = ROUND_SECONDS;
  spawnTimer = 0;
  state = "playing";
  showMessage("");
  updateHud();
}

async function endRound() {
  state = "over";
  showMessage(`${t.over}\n${t.score}: ${score}\n\n${t.again}`);
  try {
    const result = await OyunSDK.submitScore(score);
    showMessage(`${t.over}\n${t.score}: ${score}\n${t.best}: ${result.best}\n\n${t.again}`);
  } catch (err) {
    console.warn(err);
  }
}

// Tapping: a raycaster finds which 3D object is under the finger.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => {
  if (state !== "playing") {
    startRound();
    return;
  }
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(things)[0];
  if (!hit) return;
  const mesh = hit.object;
  if (mesh.userData.rock) {
    score = Math.max(0, score - 3);
    timeLeft = Math.max(0, timeLeft - 3);
  } else {
    score++;
  }
  removeThing(mesh);
  updateHud();
});

// The site tells the game when the player switches tabs or locks the phone.
OyunSDK.onPause(() => (paused = true));
OyunSDK.onResume(() => (paused = false));

function update(dt) {
  if (state !== "playing" || paused) return;
  timeLeft -= dt;
  if (timeLeft <= 0) {
    timeLeft = 0;
    updateHud();
    endRound();
    return;
  }
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawn();
    spawnTimer = 0.5 + Math.random() * 0.4;
  }
  const top = viewSize().h / 2 + 1.5;
  for (const m of things.slice()) {
    m.position.y += m.userData.speed * dt;
    m.rotation.x += m.userData.spin * dt;
    m.rotation.y += m.userData.spin * 0.7 * dt;
    if (m.position.y > top) removeThing(m);
  }
  updateHud();
}

showMessage(`${t.start}\n\n${t.hint}`);
const timer = new THREE.Timer();
renderer.setAnimationLoop((time) => {
  timer.update(time);
  update(Math.min(timer.getDelta(), 0.05));
  renderer.render(scene, camera);
});
