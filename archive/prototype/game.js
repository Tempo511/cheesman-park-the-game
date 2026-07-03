const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const coinCountEl = document.querySelector("#coinCount");
const zoneLabelEl = document.querySelector("#zoneLabel");
const toastEl = document.querySelector("#eventToast");
const eventTitleEl = document.querySelector("#eventTitle");
const eventTextEl = document.querySelector("#eventText");
const stickEl = document.querySelector("#stick");
const nubEl = document.querySelector("#nub");
const actionButton = document.querySelector("#actionButton");

const TILE = 32;
const ATLAS_TILE = 64;
const WORLD = { width: 64 * TILE, height: 46 * TILE };
const PAVILION = { x: 26 * TILE, y: 13 * TILE, w: 12 * TILE, h: 9 * TILE };
const keys = new Set();
const pointer = { active: false, id: null, x: 0, y: 0, dx: 0, dy: 0 };
let dpr = 1;
let width = 0;
let height = 0;
let lastTime = performance.now();
let coinsCollected = 0;
let flashlightUntil = 0;
let toastUntil = 3500;
let eventPhase = "sunset";

const grassBaseAtlas = new Image();
let grassBaseReady = false;
grassBaseAtlas.addEventListener("load", () => {
  grassBaseReady = true;
});
grassBaseAtlas.src = "./grassTilesCheesman.png";

const decorAtlas = new Image();
let decorAtlasReady = false;
decorAtlas.addEventListener("load", () => {
  decorAtlasReady = true;
});
decorAtlas.src = "./cheesmanTiles.png";

const player = {
  x: PAVILION.x + PAVILION.w / 2,
  y: PAVILION.y + PAVILION.h + 160,
  radius: 12,
  speed: 176,
  dirX: 0,
  dirY: 1,
  bob: 0,
};

const ghost = {
  x: PAVILION.x + PAVILION.w + 170,
  y: PAVILION.y + 110,
  angle: 0,
  stunnedUntil: 0,
};

const coins = [
  { x: 880, y: 760, found: false },
  { x: 1010, y: 610, found: false },
  { x: 1130, y: 820, found: false },
  { x: 1260, y: 680, found: false },
  { x: 790, y: 520, found: false },
  { x: 1350, y: 470, found: false },
  { x: 1090, y: 390, found: false },
  { x: 1470, y: 875, found: false },
  { x: 640, y: 845, found: false },
];

const trees = [
  [490, 350, 1.1], [620, 270, 0.9], [790, 280, 1], [1460, 310, 1.15],
  [1620, 460, 0.95], [430, 660, 1], [520, 860, 1.08], [1590, 840, 1],
  [1410, 1030, 1.12], [1130, 1050, 0.9], [760, 1060, 1.02], [330, 1040, 0.88],
  [1710, 1120, 1.1], [270, 470, 0.98], [1800, 650, 0.92],
];

const benches = [
  [905, 500, 0], [1180, 525, 0], [780, 735, -0.12], [1320, 780, 0.15],
  [1018, 934, 0], [1510, 610, 1.57], [560, 610, 1.57],
];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inRect(point, rect, pad = 0) {
  return point.x >= rect.x - pad && point.x <= rect.x + rect.w + pad &&
    point.y >= rect.y - pad && point.y <= rect.y + rect.h + pad;
}

function camera() {
  const zoom = clamp(Math.min(width / 520, height / 720), 0.82, 1.45);
  const viewW = width / zoom;
  const viewH = height / zoom;
  return {
    zoom,
    x: clamp(player.x - viewW / 2, 0, WORLD.width - viewW),
    y: clamp(player.y - viewH / 2, 0, WORLD.height - viewH),
  };
}

function worldToScreen(cam, x, y) {
  return { x: (x - cam.x) * cam.zoom, y: (y - cam.y) * cam.zoom };
}

function drawPixelRect(x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  }
}

function drawGround(cam, time) {
  ctx.fillStyle = "#668f58";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  drawGrassTiles();

  drawPaths();
  drawPavilionGround();
  drawObjects(time);

  ctx.restore();
}

function drawGrassTiles() {
  for (let y = 0; y < WORLD.height; y += ATLAS_TILE) {
    for (let x = 0; x < WORLD.width; x += ATLAS_TILE) {
      const n = Math.abs((x / ATLAS_TILE * 13 + y / ATLAS_TILE * 19) % 17);
      const baseIndex = n % 4;
      drawBaseGrassTile(baseIndex, x, y);

      if (n === 0 || n === 4 || n === 8) {
        const decorIndex = n === 0 ? 3 : n === 4 ? 4 : 5;
        drawDecorTile(decorIndex, 0, x, y);
      } else if (n === 12) {
        drawGrassDetail(x, y, n);
      }
    }
  }
}

function drawGrassDetail(x, y, n) {
  ctx.fillStyle = n % 2 ? "#8fc663" : "#65994b";
  ctx.fillRect(x + 16, y + 18, 5, 13);
  ctx.fillRect(x + 22, y + 14, 5, 17);
  ctx.fillRect(x + 28, y + 20, 5, 11);
  if (n % 3 === 0) {
    ctx.fillStyle = "#ddeb73";
    ctx.fillRect(x + 40, y + 30, 4, 4);
    ctx.fillRect(x + 45, y + 26, 4, 4);
  }
}

function drawBaseGrassTile(col, x, y) {
  if (!grassBaseReady) {
    const n = (x * 17 + y * 31) % 7;
    ctx.fillStyle = n < 2 ? "#709a61" : n === 3 ? "#5e8554" : "#668f58";
    ctx.fillRect(x, y, ATLAS_TILE, ATLAS_TILE);
    return;
  }

  ctx.drawImage(
    grassBaseAtlas,
    col * ATLAS_TILE,
    0,
    ATLAS_TILE,
    ATLAS_TILE,
    x,
    y,
    ATLAS_TILE,
    ATLAS_TILE,
  );
}

function drawDecorTile(col, row, x, y) {
  if (!decorAtlasReady) return;

  ctx.drawImage(
    decorAtlas,
    col * ATLAS_TILE,
    row * ATLAS_TILE,
    ATLAS_TILE,
    ATLAS_TILE,
    x,
    y,
    ATLAS_TILE,
    ATLAS_TILE,
  );
}

function drawPaths() {
  ctx.lineCap = "square";
  ctx.lineJoin = "round";

  drawPath("#bca576", 58, [
    [0, 930], [470, 820], [800, 720], [PAVILION.x + PAVILION.w / 2, PAVILION.y + PAVILION.h + 65],
    [1360, 735], [WORLD.width, 920],
  ]);
  drawPath("#d0bd8a", 38, [
    [0, 930], [470, 820], [800, 720], [PAVILION.x + PAVILION.w / 2, PAVILION.y + PAVILION.h + 65],
    [1360, 735], [WORLD.width, 920],
  ]);

  drawPath("#bca576", 48, [
    [1040, 0], [1050, 300], [PAVILION.x + PAVILION.w / 2, PAVILION.y + 20],
    [1020, 850], [990, WORLD.height],
  ]);
  drawPath("#d0bd8a", 30, [
    [1040, 0], [1050, 300], [PAVILION.x + PAVILION.w / 2, PAVILION.y + 20],
    [1020, 850], [990, WORLD.height],
  ]);
}

function drawPath(color, size, points) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawPavilionGround() {
  drawPixelRect(PAVILION.x - 24, PAVILION.y - 14, PAVILION.w + 48, PAVILION.h + 44, "#cfcbb9", "#817d72");
  for (let x = PAVILION.x - 20; x < PAVILION.x + PAVILION.w + 20; x += 32) {
    ctx.fillStyle = "#bab6a6";
    ctx.fillRect(x, PAVILION.y + PAVILION.h + 17, 18, 8);
  }
  for (let y = PAVILION.y; y < PAVILION.y + PAVILION.h; y += 32) {
    for (let x = PAVILION.x; x < PAVILION.x + PAVILION.w; x += 32) {
      ctx.fillStyle = (x + y) % 64 === 0 ? "#e8e1cf" : "#ddd6c4";
      ctx.fillRect(x, y, 32, 32);
    }
  }
  drawPixelRect(PAVILION.x + 68, PAVILION.y + PAVILION.h + 22, PAVILION.w - 136, 34, "#b8aa90", "#817d72");
}

function drawObjects(time) {
  trees.forEach(([x, y, scale]) => drawTree(x, y, scale, time));
  benches.forEach(([x, y, rot]) => drawBench(x, y, rot));
  coins.filter((coin) => !coin.found).forEach((coin) => drawCoin(coin.x, coin.y, time));
}

function drawTree(x, y, scale, time) {
  const sway = Math.sin(time / 900 + x) * 2;
  drawPixelRect(x - 8 * scale, y + 24 * scale, 16 * scale, 32 * scale, "#6d4b35");
  ctx.fillStyle = "#3f733f";
  ctx.fillRect(x - 36 * scale + sway, y - 18 * scale, 72 * scale, 42 * scale);
  ctx.fillStyle = "#4d884a";
  ctx.fillRect(x - 26 * scale + sway, y - 34 * scale, 52 * scale, 30 * scale);
  ctx.fillStyle = "#315d37";
  ctx.fillRect(x - 18 * scale + sway, y + 16 * scale, 36 * scale, 20 * scale);
}

function drawBench(x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  drawPixelRect(-28, -8, 56, 12, "#8f573b", "#5d382d");
  drawPixelRect(-26, 6, 52, 8, "#a86843", "#5d382d");
  ctx.restore();
}

function drawCoin(x, y, time) {
  const bob = Math.sin(time / 240 + x) * 4;
  drawPixelRect(x - 7, y - 9 + bob, 14, 18, "#f5c855", "#8d542c");
  ctx.fillStyle = "#ffe58c";
  ctx.fillRect(x - 2, y - 5 + bob, 4, 10);
}

function drawPavilionStructure(cam, time) {
  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  const columns = [
    [PAVILION.x + 30, PAVILION.y + 34], [PAVILION.x + 104, PAVILION.y + 34],
    [PAVILION.x + 178, PAVILION.y + 34], [PAVILION.x + 252, PAVILION.y + 34],
    [PAVILION.x + 326, PAVILION.y + 34],
    [PAVILION.x + 30, PAVILION.y + 210], [PAVILION.x + 104, PAVILION.y + 210],
    [PAVILION.x + 178, PAVILION.y + 210], [PAVILION.x + 252, PAVILION.y + 210],
    [PAVILION.x + 326, PAVILION.y + 210],
  ];
  columns.forEach(([x, y]) => {
    drawPixelRect(x - 9, y - 18, 18, 54, "#f7f1dd", "#8b8a7f");
    drawPixelRect(x - 14, y - 24, 28, 8, "#fff8e8", "#8b8a7f");
  });

  const roofAlpha = inRect(player, PAVILION, 18) ? 0.32 : 0.88;
  ctx.globalAlpha = roofAlpha;
  drawPixelRect(PAVILION.x - 52, PAVILION.y - 54, PAVILION.w + 104, 92, "#f4ecd7", "#807a71");
  drawPixelRect(PAVILION.x - 28, PAVILION.y - 82, PAVILION.w + 56, 34, "#d9c6a5", "#807a71");
  ctx.fillStyle = "#fff7e4";
  ctx.fillRect(PAVILION.x - 28, PAVILION.y - 54, PAVILION.w + 56, 12);
  ctx.globalAlpha = 1;

  if (inRect(player, PAVILION, 18)) {
    ctx.fillStyle = `rgba(255, 244, 190, ${0.12 + Math.sin(time / 420) * 0.03})`;
    ctx.fillRect(PAVILION.x - 24, PAVILION.y - 10, PAVILION.w + 48, PAVILION.h + 38);
  }

  ctx.restore();
}

function drawPlayer(cam, time) {
  const p = worldToScreen(cam, player.x, player.y);
  const z = cam.zoom;
  const bob = Math.sin(player.bob) * 2 * z;

  ctx.fillStyle = "rgba(34, 43, 36, 0.28)";
  ctx.fillRect(p.x - 12 * z, p.y + 12 * z, 24 * z, 8 * z);

  drawScreenRect(p.x - 8 * z, p.y - 18 * z + bob, 16 * z, 18 * z, "#5f7db7", "#24314c");
  drawScreenRect(p.x - 7 * z, p.y - 34 * z + bob, 14 * z, 14 * z, "#d99a6c", "#6a4535");
  drawScreenRect(p.x - 10 * z, p.y - 41 * z + bob, 20 * z, 8 * z, "#32533d", "#203629");
  drawScreenRect(p.x - 11 * z, p.y - 2 * z + bob, 7 * z, 14 * z, "#394659");
  drawScreenRect(p.x + 4 * z, p.y - 2 * z + bob, 7 * z, 14 * z, "#394659");

  if (performance.now() < flashlightUntil) {
    const angle = Math.atan2(player.dirY, player.dirX);
    ctx.save();
    ctx.translate(p.x, p.y - 22 * z);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#fff1a6";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(150 * z, -34 * z);
    ctx.lineTo(150 * z, 34 * z);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawScreenRect(x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  }
}

function drawGhost(cam, time) {
  const p = worldToScreen(cam, ghost.x, ghost.y);
  const z = cam.zoom;
  const stunned = performance.now() < ghost.stunnedUntil;
  const bob = Math.sin(time / 260) * 5 * z;

  ctx.globalAlpha = stunned ? 0.45 : 0.72;
  drawScreenRect(p.x - 14 * z, p.y - 24 * z + bob, 28 * z, 34 * z, stunned ? "#d4f5ff" : "#e8eff2", "#8aa8ae");
  ctx.fillStyle = "#e8eff2";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 22 * z + bob, 14 * z, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#40515c";
  ctx.fillRect(p.x - 7 * z, p.y - 20 * z + bob, 4 * z, 5 * z);
  ctx.fillRect(p.x + 4 * z, p.y - 20 * z + bob, 4 * z, 5 * z);
  ctx.globalAlpha = 1;
}

function update(dt, now) {
  let x = 0;
  let y = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) y -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) y += 1;
  x += pointer.dx;
  y += pointer.dy;

  const len = Math.hypot(x, y);
  if (len > 0.08) {
    x /= Math.max(1, len);
    y /= Math.max(1, len);
    player.x = clamp(player.x + x * player.speed * dt, 42, WORLD.width - 42);
    player.y = clamp(player.y + y * player.speed * dt, 70, WORLD.height - 42);
    player.dirX = x;
    player.dirY = y;
    player.bob += dt * 13;
  }

  const phaseTime = Math.floor(now / 12000) % 3;
  eventPhase = ["sunset", "dance", "ghost"][phaseTime];

  ghost.angle += dt * (performance.now() < ghost.stunnedUntil ? 0.35 : 0.9);
  ghost.x = PAVILION.x + PAVILION.w / 2 + Math.cos(ghost.angle) * 360;
  ghost.y = PAVILION.y + PAVILION.h / 2 + Math.sin(ghost.angle * 0.72) * 240;

  coins.forEach((coin) => {
    if (!coin.found && Math.hypot(player.x - coin.x, player.y - coin.y) < 32) {
      coin.found = true;
      coinsCollected += 1;
      coinCountEl.textContent = coinsCollected;
      showToast("Picnic coin found", "+1 Cheesman Point. The lawn approves.");
    }
  });

  if (coins.every((coin) => coin.found)) {
    coins.forEach((coin, i) => {
      coin.found = false;
      coin.x = 560 + ((i * 139 + now / 8) % 980);
      coin.y = 380 + ((i * 91 + now / 11) % 650);
    });
    showToast("Fresh drops", "More coins appeared around the pavilion paths.");
  }

  zoneLabelEl.textContent = inRect(player, PAVILION, 24) ? "Under the Pavilion" : "Pavilion Lawn";
}

function draw(now) {
  const cam = camera();
  drawGround(cam, now);
  drawGhost(cam, now);
  drawPlayer(cam, now);
  drawPavilionStructure(cam, now);
  drawVignette();
  updateEventCopy(now);
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
  gradient.addColorStop(0, "rgba(37, 48, 38, 0)");
  gradient.addColorStop(1, "rgba(37, 48, 38, 0.28)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function updateEventCopy(now) {
  if (now < toastUntil) {
    toastEl.classList.add("is-visible");
    return;
  }

  if (eventPhase === "dance" && inRect(player, PAVILION, 30)) {
    eventTitleEl.textContent = "Pavilion dance meetup";
    eventTextEl.textContent = "Stand under the roof for cozy local event energy.";
    toastEl.classList.add("is-visible");
  } else if (eventPhase === "ghost") {
    eventTitleEl.textContent = "Ghost hour";
    eventTextEl.textContent = "Tap the flashlight button if the marble ghost gets close.";
    toastEl.classList.add("is-visible");
  } else {
    toastEl.classList.remove("is-visible");
  }
}

function showToast(title, text) {
  eventTitleEl.textContent = title;
  eventTextEl.textContent = text;
  toastUntil = performance.now() + 2200;
}

function useFlashlight() {
  flashlightUntil = performance.now() + 520;
  const dx = ghost.x - player.x;
  const dy = ghost.y - player.y;
  const distance = Math.hypot(dx, dy);
  const facing = (dx / distance) * player.dirX + (dy / distance) * player.dirY;
  if (distance < 180 && facing > 0.45) {
    ghost.stunnedUntil = performance.now() + 1800;
    showToast("Ghost dazzled", "The pavilion marble spirit needs a second.");
  }
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(loop);
}

function setStick(clientX, clientY) {
  const rect = stickEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const max = rect.width * 0.34;
  const dx = clamp(clientX - cx, -max, max);
  const dy = clamp(clientY - cy, -max, max);
  const len = Math.hypot(dx, dy);
  const unit = len > 4 ? Math.min(len / max, 1) : 0;
  pointer.dx = len ? (dx / len) * unit : 0;
  pointer.dy = len ? (dy / len) * unit : 0;
  nubEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetStick() {
  pointer.active = false;
  pointer.id = null;
  pointer.dx = 0;
  pointer.dy = 0;
  nubEl.style.transform = "translate(-50%, -50%)";
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") useFlashlight();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));

stickEl.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.id = event.pointerId;
  stickEl.setPointerCapture(event.pointerId);
  setStick(event.clientX, event.clientY);
});

stickEl.addEventListener("pointermove", (event) => {
  if (pointer.active && pointer.id === event.pointerId) setStick(event.clientX, event.clientY);
});

stickEl.addEventListener("pointerup", resetStick);
stickEl.addEventListener("pointercancel", resetStick);
actionButton.addEventListener("pointerdown", useFlashlight);

resize();
showToast("Sunset at the pavilion", "Collect picnic coins before the ghost drifts by.");
requestAnimationFrame(loop);
