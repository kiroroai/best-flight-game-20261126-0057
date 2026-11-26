// Renderer: sky, terrain, runway, rings, clouds and the chase-view jet, all on one canvas.
// One clear job: turn world state into pixels. It never changes the flight state.
import { CANVAS_W, CANVAS_H, RUNWAY, RINGS } from './config.js';
import { heightAt, groundColor } from './terrain.js';

const FOCAL = (CANVAS_H / 2) / Math.tan((35 * Math.PI) / 180);

function degToRad(d) {
  return (d * Math.PI) / 180;
}

// Camera basis from the jet's nose: forward, right, up.
export function cameraBasis(state) {
  const h = degToRad(state.headingDeg);
  const p = degToRad(state.pitchDeg * 0.55); // camera pitches less than the nose
  const fx = Math.sin(h) * Math.cos(p);
  const fy = Math.sin(p);
  const fz = Math.cos(h) * Math.cos(p);
  // Right = worldUp x forward, normalised.
  let rx = fz;
  let rz = -fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl; rz /= rl;
  // Up = forward x right (right-handed: right x up = forward).
  const ux = fy * rz;
  const uy = fz * rx - fx * rz;
  const uz = -fy * rx;
  // Chase position: behind and above the jet.
  const cx = state.x - fx * 17;
  const cy = state.y - fy * 17 + 4.6;
  const cz = state.z - fz * 17;
  return { fx, fy, fz, rx, ry: 0, rz, ux, uy, uz, cx, cy, cz };
}

export function makeProjector(cam) {
  return function project(x, y, z) {
    const vx = x - cam.cx;
    const vy = y - cam.cy;
    const vz = z - cam.cz;
    const cx = vx * cam.rx + vy * cam.ry + vz * cam.rz;
    const cy = vx * cam.ux + vy * cam.uy + vz * cam.uz;
    const raw = vx * cam.fx + vy * cam.fy + vz * cam.fz;
    // Clamp the near plane so a corner just behind the camera does not invert,
    // but keep `raw` so callers can skip geometry that is really behind us.
    const cz = raw < 3 ? 3 : raw;
    return {
      sx: CANVAS_W / 2 + (FOCAL * cx) / cz,
      sy: CANVAS_H / 2 - (FOCAL * cy) / cz,
      depth: cz,
      raw,
    };
  };
}

function drawSky(ctx, state) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, '#2f6fc4');
  g.addColorStop(0.45, '#7fb2e5');
  g.addColorStop(0.62, '#cfe4f6');
  g.addColorStop(0.66, '#e8ddc4');
  g.addColorStop(1, '#8a7a5e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Sun, fixed in the late-afternoon sky.
  const sunX = CANVAS_W * 0.8;
  const sunY = CANVAS_H * 0.15;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
  glow.addColorStop(0, 'rgba(255, 244, 200, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 226, 150, 0.55)');
  glow.addColorStop(1, 'rgba(255, 226, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

const CLOUDS = [
  { x: -900, y: 420, z: 1800, s: 260 },
  { x: 700, y: 480, z: 2400, s: 320 },
  { x: -1400, y: 380, z: 3200, s: 300 },
  { x: 1100, y: 440, z: 800, s: 220 },
  { x: 300, y: 520, z: 4200, s: 340 },
  { x: -600, y: 460, z: 5000, s: 280 },
  { x: 1500, y: 400, z: 3600, s: 260 },
  { x: -1800, y: 500, z: 1200, s: 240 },
];

function drawClouds(ctx, project) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  for (const c of CLOUDS) {
    const p = project(c.x, c.y, c.z);
    if (p.depth < 10 || p.sx < -300 || p.sx > CANVAS_W + 300) continue;
    const s = (FOCAL * c.s) / p.depth / 260;
    if (s < 4) continue;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, 62 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.sx - 34 * s, p.sy + 6 * s, 34 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(p.sx + 36 * s, p.sy + 5 * s, 38 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const _rgb = [0, 0, 0];

function drawTerrain(ctx, project, cam) {
  const quads = [];
  const zStart = Math.floor((cam.cz - 150) / 100) * 100;
  const xStart = Math.floor((cam.cx - 1500) / 100) * 100;
  for (let gz = zStart; gz < cam.cz + 2600; gz += 100) {
    for (let gx = xStart; gx < cam.cx + 1500; gx += 100) {
      const h00 = heightAt(gx, gz);
      const h10 = heightAt(gx + 100, gz);
      const h01 = heightAt(gx, gz + 100);
      const h11 = heightAt(gx + 100, gz + 100);
      const p00 = project(gx, h00, gz);
      const p10 = project(gx + 100, h10, gz);
      const p01 = project(gx, h01, gz + 100);
      const p11 = project(gx + 100, h11, gz + 100);
      if (p00.raw < 4 && p10.raw < 4 && p01.raw < 4 && p11.raw < 4) continue;
      const depth = (p00.depth + p10.depth + p01.depth + p11.depth) / 4;
      // Skip quads entirely off-screen.
      const minX = Math.min(p00.sx, p10.sx, p01.sx, p11.sx);
      const maxX = Math.max(p00.sx, p10.sx, p01.sx, p11.sx);
      const minY = Math.min(p00.sy, p10.sy, p01.sy, p11.sy);
      const maxY = Math.max(p00.sy, p10.sy, p01.sy, p11.sy);
      if (maxX < -40 || minX > CANVAS_W + 40 || maxY < -40 || minY > CANVAS_H + 40) continue;
      groundColor(gx + 50, gz + 50, _rgb);
      // Distance haze toward the horizon colour.
      const fog = Math.min(0.72, Math.max(0, (depth - 900) / 2400));
      const r = Math.round(_rgb[0] + (198 - _rgb[0]) * fog);
      const g = Math.round(_rgb[1] + (214 - _rgb[1]) * fog);
      const b = Math.round(_rgb[2] + (232 - _rgb[2]) * fog);
      quads.push({ p00, p10, p11, p01, depth, color: `rgb(${r},${g},${b})` });
    }
  }
  quads.sort((a, b) => b.depth - a.depth);
  for (const q of quads) {
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.moveTo(q.p00.sx, q.p00.sy);
    ctx.lineTo(q.p10.sx, q.p10.sy);
    ctx.lineTo(q.p11.sx, q.p11.sy);
    ctx.lineTo(q.p01.sx, q.p01.sy);
    ctx.closePath();
    ctx.fill();
  }
}

function quadStrip(ctx, project, x0, x1, z0, z1, y, fill) {
  const p00 = project(x0, y, z0);
  const p10 = project(x1, y, z0);
  const p11 = project(x1, y, z1);
  const p01 = project(x0, y, z1);
  if (p00.raw < 4 && p10.raw < 4 && p11.raw < 4 && p01.raw < 4) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(p00.sx, p00.sy);
  ctx.lineTo(p10.sx, p10.sy);
  ctx.lineTo(p11.sx, p11.sy);
  ctx.lineTo(p01.sx, p01.sy);
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx, project, state) {
  // Asphalt strip, drawn after the terrain so it sits on top of the valley floor.
  // Built from short segments: one long quad would straddle the camera plane on
  // climb-out and smear up the screen.
  for (let z = RUNWAY.z0; z < RUNWAY.z1; z += 50) {
    quadStrip(ctx, project, RUNWAY.x0, RUNWAY.x1, z, Math.min(z + 50, RUNWAY.z1), 0.35, '#3c4148');
  }
  // Edge lines.
  for (let z = RUNWAY.z0; z < RUNWAY.z1; z += 50) {
    const ze = Math.min(z + 50, RUNWAY.z1);
    quadStrip(ctx, project, RUNWAY.x0 + 0.6, RUNWAY.x0 + 1.8, z, ze, 0.45, '#e8e8e8');
    quadStrip(ctx, project, RUNWAY.x1 - 1.8, RUNWAY.x1 - 0.6, z, ze, 0.45, '#e8e8e8');
  }
  // Centreline dashes every 60 m.
  for (let z = RUNWAY.z0 + 20; z < RUNWAY.z1 - 10; z += 60) {
    quadStrip(ctx, project, -1.1, 1.1, z, z + 26, 0.45, '#f4f4f4');
  }
  // Threshold chevrons at both ends.
  for (const zEnd of [RUNWAY.z0 + 4, RUNWAY.z1 - 34]) {
    for (let i = 0; i < 4; i++) {
      const x0 = RUNWAY.x0 + 2 + i * 6.4;
      quadStrip(ctx, project, x0, x0 + 3.4, zEnd, zEnd + 22, 0.45, '#f4f4f4');
    }
  }
}

function drawRings(ctx, project, state) {
  const ordered = RINGS.map((ring, i) => ({ ring, i })).sort((a, b) => {
    const da = Math.hypot(a.ring.x - state.x, a.ring.y - state.y, a.ring.z - state.z);
    const db = Math.hypot(b.ring.x - state.x, b.ring.y - state.y, b.ring.z - state.z);
    return db - da;
  });
  for (const { ring, i } of ordered) {
    const passed = i < state.ringsPassed;
    const next = i === state.ringsPassed;
    // Ring plane faces roughly along the course (+Z); build an orthonormal basis.
    const nx = 0; const ny = 0; const nz = 1;
    const ax = 1; const ay = 0; const az = 0;
    const bx = 0; const by = 1; const bz = 0;
    const outer = [];
    const inner = [];
    const SEG = 26;
    for (let s = 0; s < SEG; s++) {
      const a = (s / SEG) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      outer.push(project(
        ring.x + (ax * ca + bx * sa) * ring.r,
        ring.y + (ay * ca + by * sa) * ring.r,
        ring.z + (az * ca + bz * sa) * ring.r,
      ));
      inner.push(project(
        ring.x + (ax * ca + bx * sa) * ring.r * 0.8,
        ring.y + (ay * ca + by * sa) * ring.r * 0.8,
        ring.z + (az * ca + bz * sa) * ring.r * 0.8,
      ));
    }
    if (outer.some((p) => p.depth < 8)) continue;
    ctx.beginPath();
    outer.forEach((p, k) => (k === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
    ctx.closePath();
    inner.forEach((p, k) => (k === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.fillStyle = passed
      ? 'rgba(80, 200, 120, 0.35)'
      : next
        ? 'rgba(255, 176, 32, 0.92)'
        : 'rgba(255, 176, 32, 0.45)';
    ctx.fill('evenodd');
    ctx.strokeStyle = passed ? 'rgba(120, 230, 150, 0.8)' : 'rgba(255, 220, 120, 0.95)';
    ctx.lineWidth = next ? 3 : 2;
    ctx.beginPath();
    outer.forEach((p, k) => (k === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.stroke();
    // Number tag above the next ring.
    if (next) {
      const top = project(ring.x, ring.y + ring.r + 14, ring.z);
      ctx.fillStyle = '#ffb020';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`RING ${i + 1}`, top.sx, top.sy);
    }
  }
}

// The jet, drawn in screen space from a chase view: wings spread, tail up-screen.
function drawAircraft(ctx, state) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H * 0.6 - state.pitchDeg * 2.2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(degToRad(-state.rollDeg) * 0.9);
  ctx.scale(1, 1);
  // Engine glow.
  const glow = ctx.createRadialGradient(0, 46, 4, 0, 46, 46);
  glow.addColorStop(0, 'rgba(255, 170, 60, 0.85)');
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 46, 46, 0, Math.PI * 2);
  ctx.fill();
  // Main wings, swept back.
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.lineTo(-168, 26);
  ctx.lineTo(-168, 44);
  ctx.lineTo(-30, 30);
  ctx.lineTo(30, 30);
  ctx.lineTo(168, 44);
  ctx.lineTo(168, 26);
  ctx.lineTo(14, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c8442a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-168, 26);
  ctx.lineTo(-30, 12);
  ctx.moveTo(168, 26);
  ctx.lineTo(30, 12);
  ctx.stroke();
  // Tailplane.
  ctx.fillStyle = '#d8d2c4';
  ctx.beginPath();
  ctx.moveTo(-10, -62);
  ctx.lineTo(-72, -40);
  ctx.lineTo(-72, -28);
  ctx.lineTo(0, -44);
  ctx.lineTo(72, -28);
  ctx.lineTo(72, -40);
  ctx.lineTo(10, -62);
  ctx.closePath();
  ctx.fill();
  // Vertical fin.
  ctx.fillStyle = '#c8442a';
  ctx.beginPath();
  ctx.moveTo(-7, -58);
  ctx.lineTo(0, -96);
  ctx.lineTo(7, -58);
  ctx.closePath();
  ctx.fill();
  // Fuselage, nose pointing away (up-screen).
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#f2efe6');
  body.addColorStop(0.5, '#ffffff');
  body.addColorStop(1, '#d9d4c6');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.quadraticCurveTo(15, -60, 16, -10);
  ctx.quadraticCurveTo(17, 34, 12, 58);
  ctx.lineTo(-12, 58);
  ctx.quadraticCurveTo(-17, 34, -16, -10);
  ctx.quadraticCurveTo(-15, -60, 0, -92);
  ctx.closePath();
  ctx.fill();
  // Canopy glint.
  ctx.fillStyle = '#7fb2e5';
  ctx.beginPath();
  ctx.ellipse(0, -58, 7, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Twin engine nozzles.
  ctx.fillStyle = '#2c2f33';
  ctx.beginPath();
  ctx.arc(-9, 56, 6, 0, Math.PI * 2);
  ctx.arc(9, 56, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffb03c';
  ctx.beginPath();
  ctx.arc(-9, 56, 3.4, 0, Math.PI * 2);
  ctx.arc(9, 56, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // Navigation lights: red port, green starboard.
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath();
  ctx.arc(-168, 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2eff5e';
  ctx.beginPath();
  ctx.arc(168, 34, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderScene(ctx, state) {
  const cam = cameraBasis(state);
  const project = makeProjector(cam);
  drawSky(ctx, state);
  drawClouds(ctx, project);
  drawTerrain(ctx, project, cam);
  drawRunway(ctx, project, state);
  drawRings(ctx, project, state);
  drawAircraft(ctx, state);
}
