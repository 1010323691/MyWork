const canvas = document.getElementById("universeCanvas");
const ctx = canvas.getContext("2d");

const ui = {
  toggle: document.getElementById("toggleSim"),
  reset: document.getElementById("resetSim"),
  phaseName: document.getElementById("phaseName"),
  phaseDescription: document.getElementById("phaseDescription"),
  phaseProgressBar: document.getElementById("phaseProgressBar"),
  missionTime: document.getElementById("missionTime"),
  shipSpeed: document.getElementById("shipSpeed"),
  earthDistance: document.getElementById("earthDistance"),
  moonDistance: document.getElementById("moonDistance"),
  totalAccel: document.getElementById("totalAccel"),
  thrustLevel: document.getElementById("thrustLevel"),
  attitudeError: document.getElementById("attitudeError"),
  fuelRemaining: document.getElementById("fuelRemaining"),
  timeScaleLabel: document.getElementById("timeScaleLabel"),
};

const TAU = Math.PI * 2;

const earth = {
  radius: 6371,
  mu: 398600.4418,
  color: "#4ea8ff",
};

const moon = {
  radius: 1737.4,
  mu: 4902.8001,
  orbitRadius: 384400,
  orbitPeriod: 27.321661 * 86400,
  soiRadius: 66000,
  color: "#dfe7f6",
};

const missionPhases = {
  parking: {
    name: "近地停泊轨道",
    description: "飞船先在近地轨道稳定滑行，保持较低初始速度，等待转移窗口。",
  },
  tli: {
    name: "地月转移点火",
    description: "自动驾驶沿顺行方向持续加速，把飞船从低地轨道逐步推入前往月球的转移轨道。",
  },
  coastToMoon: {
    name: "地月转移巡航",
    description: "主要依靠地球和月球引力飞行，只做小幅修正，速度较发射段明显下降。",
  },
  lunarFlyby: {
    name: "绕月飞越",
    description: "飞船进入月球引力主导区后连续弯折，轨迹自然过渡，不再强行改轨。",
  },
  returnBurn: {
    name: "返地修正点火",
    description: "离开月球后进行一次返地修正，把近地点重新压回地球附近。",
  },
  earthReturn: {
    name: "返航再入引导",
    description: "飞船主要受地球引力回收，末段仅做轻微再入走廊修正。",
  },
};

const config = {
  timeScale: 1200,
  shipDryMass: 23000,
  shipFuelMass: 54000,
  maxThrust: 280,
  angularResponse: 0.085,
  angleSmoothing: 0.16,
  trailStride: 2,
};

let simState;
let running = true;
let lastFrame = 0;
let stars = [];

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

function magnitude(v) {
  return Math.hypot(v.x, v.y);
}

function normalize(v) {
  const len = magnitude(v) || 1;
  return { x: v.x / len, y: v.y / len };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function polar(radius, angle) {
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function perpendicular(v) {
  return { x: -v.y, y: v.x };
}

function vectorToAngle(v) {
  return Math.atan2(v.y, v.x);
}

function angleDelta(a, b) {
  let diff = b - a;
  while (diff > Math.PI) diff -= TAU;
  while (diff < -Math.PI) diff += TAU;
  return diff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function moonAngleAt(time) {
  return 1.18 + (time / moon.orbitPeriod) * TAU;
}

function moonPosition(time) {
  return polar(moon.orbitRadius, moonAngleAt(time));
}

function moonVelocity(time) {
  const angle = moonAngleAt(time);
  const speed = (TAU * moon.orbitRadius) / moon.orbitPeriod;
  return {
    x: -Math.sin(angle) * speed,
    y: Math.cos(angle) * speed,
  };
}

function gravitationalAcceleration(position, time) {
  const earthDistance = magnitude(position);
  const earthAccel = scale(position, -earth.mu / Math.pow(earthDistance, 3));
  const moonPos = moonPosition(time);
  const toMoon = subtract(moonPos, position);
  const moonDistance = magnitude(toMoon);
  const moonAccel = scale(toMoon, moon.mu / Math.pow(moonDistance, 3));

  return {
    total: add(earthAccel, moonAccel),
    earthAccel,
    moonAccel,
    moonPos,
    moonDistance,
  };
}

function circularOrbitSpeed(radius) {
  return Math.sqrt(earth.mu / radius);
}

function createState() {
  const initialRadius = earth.radius + 220;
  const initialPosition = { x: initialRadius, y: 0 };
  const initialVelocity = { x: 0, y: circularOrbitSpeed(initialRadius) };

  return {
    time: 0,
    ship: {
      position: initialPosition,
      velocity: initialVelocity,
      angle: vectorToAngle(initialVelocity),
      angularVelocity: 0,
      mass: config.shipDryMass + config.shipFuelMass,
      fuelMass: config.shipFuelMass,
      throttle: 0,
      thrust: 0,
      engineActive: false,
      trail: [initialPosition],
      trailTick: 0,
    },
    autopilot: {
      phaseKey: "parking",
      phaseProgress: 0,
      phaseStartedAt: 0,
      targetAngle: vectorToAngle(initialVelocity),
      smoothedTargetAngle: vectorToAngle(initialVelocity),
      lastAttitudeError: 0,
      minMoonDistance: Infinity,
      moonPeriapsisPassed: false,
      returnBurnTimer: 0,
      returnBurnStarted: false,
    },
    metrics: {
      acceleration: 0,
      earthDistance: initialRadius - earth.radius,
      moonDistance: magnitude(subtract(moonPosition(0), initialPosition)) - moon.radius,
    },
  };
}

function currentPhase() {
  return missionPhases[simState.autopilot.phaseKey];
}

function updatePhaseState() {
  const ship = simState.ship;
  const autopilot = simState.autopilot;
  const gravity = gravitationalAcceleration(ship.position, simState.time);
  const earthDistance = magnitude(ship.position) - earth.radius;
  const earthSpeed = magnitude(ship.velocity);
  const toMoon = subtract(gravity.moonPos, ship.position);
  const moonDistance = magnitude(toMoon) - moon.radius;
  const radialOutToMoon = dot(subtract(ship.position, gravity.moonPos), subtract(ship.velocity, moonVelocity(simState.time)));

  autopilot.minMoonDistance = Math.min(autopilot.minMoonDistance, moonDistance);

  if (autopilot.phaseKey === "parking" && simState.time >= 3600) {
    autopilot.phaseKey = "tli";
    autopilot.phaseStartedAt = simState.time;
  } else if (
    autopilot.phaseKey === "tli" &&
    (earthSpeed >= 10.72 || earthDistance > 90000 || simState.time - autopilot.phaseStartedAt > 3200)
  ) {
    autopilot.phaseKey = "coastToMoon";
    autopilot.phaseStartedAt = simState.time;
  } else if (autopilot.phaseKey === "coastToMoon" && moonDistance < 90000) {
    autopilot.phaseKey = "lunarFlyby";
    autopilot.phaseStartedAt = simState.time;
    autopilot.minMoonDistance = moonDistance;
  } else if (autopilot.phaseKey === "lunarFlyby") {
    if (moonDistance <= autopilot.minMoonDistance + 5) {
      autopilot.minMoonDistance = moonDistance;
    }

    if (!autopilot.moonPeriapsisPassed && radialOutToMoon > 0 && moonDistance > autopilot.minMoonDistance + 300) {
      autopilot.moonPeriapsisPassed = true;
    }

    if (autopilot.moonPeriapsisPassed && moonDistance > autopilot.minMoonDistance + 9000) {
      autopilot.phaseKey = "returnBurn";
      autopilot.phaseStartedAt = simState.time;
      autopilot.returnBurnStarted = true;
      autopilot.returnBurnTimer = 3600;
    }
  } else if (autopilot.phaseKey === "returnBurn") {
    if (autopilot.returnBurnTimer <= 0) {
      autopilot.phaseKey = "earthReturn";
      autopilot.phaseStartedAt = simState.time;
    }
  }

  const phaseDurations = {
    parking: 3600,
    tli: 3200,
    coastToMoon: 140000,
    lunarFlyby: 28000,
    returnBurn: 3600,
    earthReturn: 120000,
  };
  const elapsed = simState.time - autopilot.phaseStartedAt;
  autopilot.phaseProgress = clamp(elapsed / phaseDurations[autopilot.phaseKey], 0, 1);
}

function computeGuidance() {
  const ship = simState.ship;
  const autopilot = simState.autopilot;
  const gravity = gravitationalAcceleration(ship.position, simState.time);
  const moonPos = gravity.moonPos;
  const moonVel = moonVelocity(simState.time);
  const toEarth = scale(ship.position, -1);
  const toMoon = subtract(moonPos, ship.position);
  const earthDistance = magnitude(ship.position) - earth.radius;
  const moonDistance = magnitude(toMoon) - moon.radius;
  const earthRadial = normalize(ship.position);
  const earthTangential = normalize(perpendicular(earthRadial));
  const velocityDir = normalize(ship.velocity);
  const moonRelativeVelocity = subtract(ship.velocity, moonVel);
  const moonRelativeSpeed = magnitude(moonRelativeVelocity);

  let targetDirection = velocityDir;
  let throttle = 0;

  if (autopilot.phaseKey === "parking") {
    targetDirection = earthTangential;
    const targetSpeed = circularOrbitSpeed(magnitude(ship.position));
    throttle = clamp((targetSpeed - magnitude(ship.velocity)) * 0.22, 0, 0.06);
  } else if (autopilot.phaseKey === "tli") {
    targetDirection = velocityDir;
    const targetSpeed = 10.52;
    throttle = clamp((targetSpeed - magnitude(ship.velocity)) * 0.32 + 0.12, 0.08, 0.85);
  } else if (autopilot.phaseKey === "coastToMoon") {
    const leadTime = clamp(magnitude(toMoon) / Math.max(magnitude(ship.velocity), 0.5), 9000, 68000);
    const targetPoint = add(moonPos, add(scale(moonVel, leadTime), { x: 0, y: -9000 }));
    targetDirection = normalize(subtract(targetPoint, ship.position));
    const crossTrack = Math.abs(targetDirection.x * velocityDir.y - targetDirection.y * velocityDir.x);
    throttle = clamp(crossTrack * 0.12 + (moonDistance > 140000 ? 0.018 : 0.006), 0, 0.06);
  } else if (autopilot.phaseKey === "lunarFlyby") {
    const moonRadial = normalize(subtract(ship.position, moonPos));
    const moonTangential = normalize(perpendicular(moonRadial));
    const desiredFlybyDir = normalize(add(scale(moonTangential, 0.82), scale(moonRadial, -0.26)));
    const retroMoon = scale(normalize(moonRelativeVelocity), -1);
    targetDirection = normalize(add(scale(desiredFlybyDir, 0.68), scale(retroMoon, 0.32)));
    throttle = moonDistance < 15000 ? 0.12 : moonDistance < 30000 ? 0.055 : 0.014;
  } else if (autopilot.phaseKey === "returnBurn") {
    const earthAim = normalize(add(scale(normalize(toEarth), 0.38), scale(velocityDir, -0.92)));
    targetDirection = earthAim;
    throttle = autopilot.returnBurnTimer > 1800 ? 0.52 : 0.34;
  } else {
    const radialSpeed = dot(normalize(ship.position), ship.velocity);
    targetDirection = normalize(add(scale(normalize(toEarth), 0.76), scale(velocityDir, -0.24)));
    throttle = earthDistance > 220000 && radialSpeed > 0.08 ? 0.018 : 0.004;
  }

  return {
    gravity,
    throttle: ship.fuelMass > 0 ? throttle : 0,
    targetAngle: vectorToAngle(targetDirection),
    earthDistance,
    moonDistance,
    moonRelativeSpeed,
  };
}

function consumeFuel(ship, thrustKN, dt) {
  if (thrustKN <= 0 || ship.fuelMass <= 0) return 0;

  const massFlow = thrustKN * 0.012;
  const fuelUsed = Math.min(ship.fuelMass, massFlow * dt);
  ship.fuelMass -= fuelUsed;
  ship.mass = config.shipDryMass + ship.fuelMass;
  return fuelUsed;
}

function stepSimulation(dt) {
  updatePhaseState();

  const ship = simState.ship;
  const autopilot = simState.autopilot;
  const guidance = computeGuidance();

  autopilot.smoothedTargetAngle += angleDelta(autopilot.smoothedTargetAngle, guidance.targetAngle) * Math.min(1, dt * config.angleSmoothing);

  const attitudeError = angleDelta(ship.angle, autopilot.smoothedTargetAngle);
  ship.angularVelocity += attitudeError * config.angularResponse * dt;
  ship.angularVelocity *= 0.9;
  ship.angle += ship.angularVelocity * dt;

  ship.throttle += (guidance.throttle - ship.throttle) * Math.min(1, dt * 0.16);
  ship.engineActive = ship.throttle > 0.003 && ship.fuelMass > 0;
  ship.thrust = config.maxThrust * ship.throttle;
  consumeFuel(ship, ship.thrust, dt);

  const thrustAccel = ship.engineActive ? ship.thrust / ship.mass : 0;
  const thrustVector = {
    x: Math.cos(ship.angle) * thrustAccel,
    y: Math.sin(ship.angle) * thrustAccel,
  };
  const totalAccel = add(guidance.gravity.total, thrustVector);

  ship.velocity = add(ship.velocity, scale(totalAccel, dt));
  ship.position = add(ship.position, scale(ship.velocity, dt));
  simState.time += dt;

  if (autopilot.phaseKey === "returnBurn" && autopilot.returnBurnTimer > 0) {
    autopilot.returnBurnTimer = Math.max(0, autopilot.returnBurnTimer - dt);
  }

  ship.trailTick += 1;
  if (ship.trailTick % config.trailStride === 0) {
    ship.trail.push({ x: ship.position.x, y: ship.position.y });
  }

  autopilot.targetAngle = autopilot.smoothedTargetAngle;
  autopilot.lastAttitudeError = Math.abs(attitudeError) * (180 / Math.PI);
  simState.metrics.acceleration = magnitude(totalAccel) * 1000;
  simState.metrics.earthDistance = Math.max(0, magnitude(ship.position) - earth.radius);
  simState.metrics.moonDistance = Math.max(0, magnitude(subtract(moonPosition(simState.time), ship.position)) - moon.radius);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  generateStars(rect.width, rect.height);
}

function generateStars(width, height) {
  stars = Array.from({ length: Math.max(180, Math.floor((width * height) / 9000)) }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.7 + 0.2,
    alpha: Math.random() * 0.7 + 0.2,
  }));
}

function computeView() {
  const rect = canvas.getBoundingClientRect();
  const moonPos = moonPosition(simState.time);
  const extents = [moon.orbitRadius * 1.15, Math.abs(moonPos.x), Math.abs(moonPos.y)];

  for (let i = 0; i < simState.ship.trail.length; i += Math.max(1, Math.floor(simState.ship.trail.length / 80))) {
    const p = simState.ship.trail[i];
    extents.push(Math.abs(p.x), Math.abs(p.y));
  }

  extents.push(Math.abs(simState.ship.position.x), Math.abs(simState.ship.position.y));

  const maxExtent = Math.max(...extents, 100000);
  const scaleFactor = Math.min(rect.width, rect.height) * 0.42 / maxExtent;

  return {
    width: rect.width,
    height: rect.height,
    centerX: rect.width * 0.5,
    centerY: rect.height * 0.5,
    scaleFactor,
  };
}

function worldToScreen(point, view) {
  return {
    x: view.centerX + point.x * view.scaleFactor,
    y: view.centerY - point.y * view.scaleFactor,
  };
}

function drawBackground(width, height) {
  const haze = ctx.createRadialGradient(width * 0.5, height * 0.45, 30, width * 0.5, height * 0.5, width * 0.55);
  haze.addColorStop(0, "rgba(23, 48, 128, 0.16)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  for (const star of stars) {
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, TAU);
    ctx.fill();
  }
}

function drawOrbitRing(radius, color, view) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([7, 10]);
  ctx.beginPath();
  ctx.arc(view.centerX, view.centerY, radius * view.scaleFactor, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawBody(position, radiusKm, minRadius, color, glow, view) {
  const screen = worldToScreen(position, view);
  const radius = Math.max(minRadius, radiusKm * view.scaleFactor);

  const aura = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius * 2.7);
  aura.addColorStop(0, glow);
  aura.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius * 2.7, 0, TAU);
  ctx.fill();

  const fill = ctx.createRadialGradient(screen.x - radius * 0.28, screen.y - radius * 0.35, radius * 0.15, screen.x, screen.y, radius);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.24, color);
  fill.addColorStop(1, "rgba(6, 15, 36, 0.95)");
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, TAU);
  ctx.fill();
}

function drawTrail(view) {
  const trail = simState.ship.trail;
  if (trail.length < 2) return;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < trail.length; i += 1) {
    const screen = worldToScreen(trail[i], view);
    if (i === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  }
  ctx.strokeStyle = "rgba(149, 255, 207, 0.78)";
  ctx.lineWidth = 1.9;
  ctx.stroke();
  ctx.restore();
}

function drawShip(view) {
  const shipScreen = worldToScreen(simState.ship.position, view);
  const ship = simState.ship;

  ctx.save();
  ctx.translate(shipScreen.x, shipScreen.y);
  ctx.rotate(-ship.angle);

  if (ship.engineActive) {
    const flameLength = 16 + ship.throttle * 20;
    const flame = ctx.createLinearGradient(-flameLength, 0, 0, 0);
    flame.addColorStop(0, "rgba(255, 211, 102, 0)");
    flame.addColorStop(0.35, "rgba(255, 140, 75, 0.95)");
    flame.addColorStop(1, "rgba(119, 213, 255, 0.96)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-flameLength, 8);
    ctx.lineTo(-flameLength + 8, 0);
    ctx.lineTo(-flameLength, -8);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#ff8c69";
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(-8, 8);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-8, -8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#ffe7d1";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#a8f0ff";
  ctx.beginPath();
  ctx.arc(4, 0, 2.1, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawLabels(view) {
  ctx.save();
  ctx.font = '12px "Noto Sans SC", sans-serif';
  ctx.fillStyle = "rgba(237,244,255,0.92)";

  const earthPos = worldToScreen({ x: 0, y: 0 }, view);
  const moonPos = worldToScreen(moonPosition(simState.time), view);
  const shipPos = worldToScreen(simState.ship.position, view);

  ctx.fillText("地球", earthPos.x + 20, earthPos.y - 12);
  ctx.fillText("月球", moonPos.x + 18, moonPos.y - 12);
  ctx.fillText("Artemis II", shipPos.x + 18, shipPos.y - 12);
  ctx.restore();
}

function render() {
  const view = computeView();
  ctx.clearRect(0, 0, view.width, view.height);
  drawBackground(view.width, view.height);
  drawOrbitRing(moon.orbitRadius, "rgba(255,255,255,0.18)", view);
  drawTrail(view);
  drawBody({ x: 0, y: 0 }, earth.radius, 18, earth.color, "rgba(78, 168, 255, 0.22)", view);
  drawBody(moonPosition(simState.time), moon.radius, 9, moon.color, "rgba(223, 231, 246, 0.2)", view);
  drawShip(view);
  drawLabels(view);
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const clock = [hours, minutes, secs].map((v) => String(v).padStart(2, "0")).join(":");
  return days > 0 ? `T+${days}d ${clock}` : `T+${clock}`;
}

function formatDistance(km) {
  if (km >= 1000000) return `${(km / 1000000).toFixed(2)}M km`;
  if (km >= 1000) return `${km.toFixed(0)} km`;
  return `${km.toFixed(1)} km`;
}

function updateUi() {
  const ship = simState.ship;
  const phase = currentPhase();
  const fuelPct = Math.max(0, (ship.fuelMass / config.shipFuelMass) * 100);
  const speed = magnitude(ship.velocity);

  ui.phaseName.textContent = phase.name;
  ui.phaseDescription.textContent = phase.description;
  ui.phaseProgressBar.style.width = `${Math.min(100, simState.autopilot.phaseProgress * 100)}%`;
  ui.missionTime.textContent = formatTime(simState.time);
  ui.shipSpeed.textContent = `${speed.toFixed(2)} km/s`;
  ui.earthDistance.textContent = formatDistance(simState.metrics.earthDistance);
  ui.moonDistance.textContent = formatDistance(simState.metrics.moonDistance);
  ui.totalAccel.textContent = `${simState.metrics.acceleration.toFixed(2)} m/s²`;
  ui.thrustLevel.textContent = `${ship.thrust.toFixed(0)} kN`;
  ui.attitudeError.textContent = `${simState.autopilot.lastAttitudeError.toFixed(1)}°`;
  ui.fuelRemaining.textContent = `${fuelPct.toFixed(1)}%`;
  ui.timeScaleLabel.textContent = `${config.timeScale}x`;
  ui.toggle.textContent = running ? "暂停" : "继续";
}

function loop(timestamp) {
  if (!lastFrame) lastFrame = timestamp;
  const elapsed = Math.min(0.05, (timestamp - lastFrame) / 1000);
  lastFrame = timestamp;

  if (running) {
    let remaining = elapsed * config.timeScale;
    while (remaining > 0) {
      const dt = Math.min(4, remaining);
      stepSimulation(dt);
      remaining -= dt;
    }
  }

  render();
  updateUi();
  requestAnimationFrame(loop);
}

function resetSimulation() {
  simState = createState();
  running = true;
  lastFrame = 0;
}

ui.toggle.addEventListener("click", () => {
  running = !running;
  updateUi();
});

ui.reset.addEventListener("click", () => {
  resetSimulation();
});

window.addEventListener("resize", resizeCanvas);

resetSimulation();
resizeCanvas();
updateUi();
requestAnimationFrame(loop);
