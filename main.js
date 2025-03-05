// Import Three.js and PointerLockControls from CDN
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/PointerLockControls.js';

// --- Scene Setup ---
const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);  // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 2; // Eye height

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Audio Setup ---
const listener = new THREE.AudioListener();
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
const shootSound = new THREE.Audio(listener);
const hitSound = new THREE.Audio(listener);

// Replace these URLs with your own audio asset URLs
audioLoader.load('https://example.com/shoot.mp3', (buffer) => {
  shootSound.setBuffer(buffer);
  shootSound.setVolume(0.5);
});
audioLoader.load('https://example.com/hit.mp3', (buffer) => {
  hitSound.setBuffer(buffer);
  hitSound.setVolume(0.5);
});

// --- Pointer Lock Controls ---
const controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => {
  if (controls.isLocked === false && gameStarted) controls.lock();
});

// --- Keyboard and Mouse Controls ---
// Default key mappings and movement state
let controlsMapping = {
  forward: 'w',
  backward: 's',
  left: 'a',
  right: 'd'
};
const movement = {
  forward: false,
  backward: false,
  left: false,
  right: false
};

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === controlsMapping.forward) movement.forward = true;
  if (key === controlsMapping.backward) movement.backward = true;
  if (key === controlsMapping.left) movement.left = true;
  if (key === controlsMapping.right) movement.right = true;
});

document.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  if (key === controlsMapping.forward) movement.forward = false;
  if (key === controlsMapping.backward) movement.backward = false;
  if (key === controlsMapping.left) movement.left = false;
  if (key === controlsMapping.right) movement.right = false;
});

// --- Shooting Mechanic ---
let bullets = [];
document.addEventListener('mousedown', (event) => {
  if (event.button === 0 && gameStarted) { // Left click
    shoot();
  }
});

function shoot() {
  if (shootSound.isPlaying) shootSound.stop();
  shootSound.play();

  const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  bullet.position.copy(camera.position);
  scene.add(bullet);
  
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  bullets.push({ mesh: bullet, direction });
}

// --- Environment Setup ---
// Ground
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228822 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

// --- Enemy Setup ---
let enemy;
function spawnEnemy() {
  const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);
  const enemyMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
  
  // Spawn enemy at a random position in front of the player
  enemy.position.set(
    camera.position.x + (Math.random() - 0.5) * 20,
    0.5,
    camera.position.z - (10 + Math.random() * 10)
  );
  scene.add(enemy);
}

// --- Collision Detection ---
function checkCollisions() {
  if (!enemy) return;
  const enemyBox = new THREE.Box3().setFromObject(enemy);
  
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletBox = new THREE.Box3().setFromObject(bullet.mesh);
    
    if (enemyBox.intersectsBox(bulletBox)) {
      if (hitSound.isPlaying) hitSound.stop();
      hitSound.play();
      
      scene.remove(enemy);
      enemy = null;
      
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
      
      setTimeout(() => {
        displayMissionText("Target Eliminated! New Mission...");
        spawnEnemy();
      }, 2000);
    }
  }
}

// --- Mission Text ---
const missionTextEl = document.createElement('div');
missionTextEl.id = 'missionText';
document.body.appendChild(missionTextEl);

function displayMissionText(text, duration = 3000) {
  missionTextEl.textContent = text;
  setTimeout(() => {
    missionTextEl.textContent = "";
  }, duration);
}

// --- Game Loop ---
let gameStarted = false;
const clock = new THREE.Clock();
const playerSpeed = 10;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Move player only when pointer is locked
  if (controls.isLocked === true) {
    const moveDistance = playerSpeed * delta;
    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0;
    forwardVector.normalize();
    
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(camera.up, forwardVector).normalize();

    if (movement.forward) controls.getObject().position.add(forwardVector.clone().multiplyScalar(moveDistance));
    if (movement.backward) controls.getObject().position.add(forwardVector.clone().multiplyScalar(-moveDistance));
    if (movement.left) controls.getObject().position.add(rightVector.clone().multiplyScalar(moveDistance));
    if (movement.right) controls.getObject().position.add(rightVector.clone().multiplyScalar(-moveDistance));
  }

  // Update bullet positions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.mesh.position.add(bullet.direction.clone().multiplyScalar(50 * delta));
    if (bullet.mesh.position.distanceTo(camera.position) > 100) {
      scene.remove(bullet.mesh);
      bullets.splice(i, 1);
    }
  }

  checkCollisions();
  renderer.render(scene, camera);
}
animate();

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI Elements ---
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const changeControlsBtn = document.getElementById('changeControlsBtn');
const controlsList = document.getElementById('controlsList');

// Start game and pointer lock when "Start Game" is clicked
startBtn.addEventListener('click', () => {
  menu.style.display = 'none';
  gameStarted = true;
  controls.lock();
  displayMissionText("Mission 1: Eliminate the target!");
  spawnEnemy();
});

// Allow remapping of controls
changeControlsBtn.addEventListener('click', () => {
  let newForward = prompt("Enter key for moving forward:", controlsMapping.forward);
  let newBackward = prompt("Enter key for moving backward:", controlsMapping.backward);
  let newLeft = prompt("Enter key for moving left:", controlsMapping.left);
  let newRight = prompt("Enter key for moving right:", controlsMapping.right);

  if (newForward) controlsMapping.forward = newForward.toLowerCase();
  if (newBackward) controlsMapping.backward = newBackward.toLowerCase();
  if (newLeft) controlsMapping.left = newLeft.toLowerCase();
  if (newRight) controlsMapping.right = newRight.toLowerCase();

  controlsList.innerHTML = `
    <li>Move Forward: ${controlsMapping.forward.toUpperCase()}</li>
    <li>Move Backward: ${controlsMapping.backward.toUpperCase()}</li>
    <li>Move Left: ${controlsMapping.left.toUpperCase()}</li>
    <li>Move Right: ${controlsMapping.right.toUpperCase()}</li>
    <li>Shoot: Left Click</li>
  `;
});
