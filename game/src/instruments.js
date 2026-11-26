// HUD and screens: compass, tapes, attitude indicator, fuel/damage, mission panels.
// One clear job: every 2D overlay drawn on top of the 3D scene. It never touches flight state.
import { CANVAS_W, CANVAS_H, GAME_TITLE, GAME_SUBTITLE, RINGS } from './config.js';
import { nextRing, distanceToRing } from './flight.js';

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(8, 18, 30, ${alpha})`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 210, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

const KNOTS = 1.94384;
const FEET = 3.28084;

function drawCompass(ctx, state) {
  const cx = CANVAS_W / 2;
  const cy = 34;
  panel(ctx, cx - 190, 10, 380, 48, 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 190, 10, 380, 48);
  ctx.clip();
  const heading = state.headingDeg;
  for (let d = -60; d <= 60; d += 5) {
    let deg = Math.round(heading + d);
    deg = ((deg % 360) + 360) % 360;
    const x = cx + d * 3.1;
    const major = deg % 30 === 0;
    ctx.strokeStyle = major ? '#e8f2ff' : 'rgba(200, 225, 255, 0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, major ? 34 : 28);
    ctx.stroke();
    if (major) {
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg).padStart(3, '0');
      text(ctx, label, x, 52, 13, '#e8f2ff', 'center');
    }
  }
  ctx.restore();
  // Centre caret + numeric heading.
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(cx - 7, 12);
  ctx.lineTo(cx + 7, 12);
  ctx.lineTo(cx, 22);
  ctx.closePath();
  ctx.fill();
  text(ctx, `HDG ${String(Math.round(heading)).padStart(3, '0')}°`, cx, 78, 15, '#ffb020', 'center');
}

function drawAttitude(ctx, state) {
  const cx = 112;
  const cy = CANVAS_H - 112;
  const r = 62;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-state.rollDeg * Math.PI) / 180);
  ctx.translate(0, state.pitchDeg * 1.6);
  ctx.fillStyle = '#4f8fd0';
  ctx.fillRect(-r - 4, -r * 2 - 4, r * 2 + 8, r * 2 + 4);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r - 4, 0, r * 2 + 8, r * 2 + 4);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const p of [-20, -10, 10, 20]) {
    ctx.beginPath();
    ctx.moveTo(-16, -p * 1.6);
    ctx.lineTo(16, -p * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  // Fixed aircraft symbol.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy + 4);
  ctx.lineTo(cx - 10, cy + 4);
  ctx.lineTo(cx, cy - 4);
  ctx.lineTo(cx + 10, cy + 4);
  ctx.lineTo(cx + 34, cy + 4);
  ctx.stroke();
  // Bezel.
  ctx.strokeStyle = 'rgba(200, 225, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, 'ATT', cx, cy + r + 18, 12, '#cfe4ff', 'center', 'normal');
}

function drawReadouts(ctx, state) {
  const y = CANVAS_H - 62;
  // Airspeed, heading, altitude — big numbers, bottom centre.
  panel(ctx, CANVAS_W / 2 - 250, y - 34, 150, 62, 0.55);
  panel(ctx, CANVAS_W / 2 - 75, y - 34, 150, 62, 0.55);
  panel(ctx, CANVAS_W / 2 + 100, y - 34, 150, 62, 0.55);
  text(ctx, 'AIRSPEED', CANVAS_W / 2 - 175, y - 16, 11, '#9fc6ee', 'center', 'normal');
  text(ctx, `${Math.round(state.speed * KNOTS)}`, CANVAS_W / 2 - 175, y + 14, 26, '#ffffff', 'center');
  text(ctx, 'KT', CANVAS_W / 2 - 118, y + 14, 12, '#9fc6ee', 'center', 'normal');
  text(ctx, 'HEADING', CANVAS_W / 2, y - 16, 11, '#9fc6ee', 'center', 'normal');
  text(ctx, `${String(Math.round(state.headingDeg)).padStart(3, '0')}°`, CANVAS_W / 2, y + 14, 26, '#ffffff', 'center');
  text(ctx, 'ALTITUDE', CANVAS_W / 2 + 175, y - 16, 11, '#9fc6ee', 'center', 'normal');
  text(ctx, `${Math.round(state.y * FEET)}`, CANVAS_W / 2 + 175, y + 14, 26, '#ffffff', 'center');
  text(ctx, 'FT', CANVAS_W / 2 + 232, y + 14, 12, '#9fc6ee', 'center', 'normal');
  // Throttle bar under the readouts.
  const tw = 220;
  const tx = CANVAS_W / 2 - tw / 2;
  const ty = CANVAS_H - 18;
  ctx.fillStyle = 'rgba(8, 18, 30, 0.55)';
  ctx.fillRect(tx, ty, tw, 8);
  ctx.fillStyle = '#37c978';
  ctx.fillRect(tx, ty, tw * state.throttle, 8);
  text(ctx, `THR ${Math.round(state.throttle * 100)}%`, tx + tw + 10, ty + 8, 12, '#cfe4ff', 'left', 'normal');
}

function drawMissionPanel(ctx, state) {
  panel(ctx, 16, 12, 300, 96, 0.55);
  text(ctx, GAME_TITLE.toUpperCase(), 28, 36, 16, '#ffffff');
  text(ctx, `RINGS  ${state.ringsPassed}/${RINGS.length}      SCORE  ${state.score}`, 28, 60, 14, '#ffd23e');
  const ring = nextRing(state);
  if (ring) {
    const d = Math.round(distanceToRing(state));
    text(ctx, `NEXT RING ${state.ringsPassed + 1} — ${d} m`, 28, 84, 13, '#cfe4ff', 'left', 'normal');
  } else if (state.phase === 'flying') {
    text(ctx, 'ALL RINGS CLEAR — LAND ON THE RUNWAY', 28, 84, 13, '#7dff9a', 'left', 'normal');
  }
  // Fuel + damage bars, top right.
  panel(ctx, CANVAS_W - 316, 12, 300, 96, 0.55);
  text(ctx, 'FUEL', CANVAS_W - 304, 38, 12, '#9fc6ee', 'left', 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(CANVAS_W - 304, 46, 276, 10);
  ctx.fillStyle = state.fuel > 25 ? '#37c978' : '#ff5a3c';
  ctx.fillRect(CANVAS_W - 304, 46, 276 * (state.fuel / 100), 10);
  text(ctx, `${Math.round(state.fuel)}%`, CANVAS_W - 22, 38, 12, '#ffffff', 'right');
  text(ctx, 'DAMAGE', CANVAS_W - 304, 80, 12, '#9fc6ee', 'left', 'normal');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(CANVAS_W - 304, 88, 276, 10);
  ctx.fillStyle = state.damage > 60 ? '#ff5a3c' : '#ffb020';
  ctx.fillRect(CANVAS_W - 304, 88, 276 * (state.damage / 100), 10);
  text(ctx, `${Math.round(state.damage)}%`, CANVAS_W - 22, 80, 12, '#ffffff', 'right');
}

function drawCrosshair(ctx, state) {
  if (state.phase !== 'flying') return;
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H * 0.42;
  ctx.strokeStyle = 'rgba(255, 210, 62, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx - 13, cy);
  ctx.moveTo(cx + 13, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy - 13);
  ctx.moveTo(cx, cy + 13);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();
  if (state.message && state.timeSec < state.messageUntil) {
    text(ctx, state.message, CANVAS_W / 2, 104, 17, '#ffffff', 'center');
  }
}

function drawVignette(ctx) {
  const g = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.45,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.95,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

export function drawHUD(ctx, state) {
  drawCompass(ctx, state);
  drawAttitude(ctx, state);
  drawReadouts(ctx, state);
  drawMissionPanel(ctx, state);
  drawCrosshair(ctx, state);
  drawVignette(ctx);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 14, 24, 0.62)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  panel(ctx, CANVAS_W / 2 - 330, CANVAS_H / 2 - 150, 660, 300, 0.85);
  text(ctx, title, CANVAS_W / 2, CANVAS_H / 2 - 92, 34, accent, 'center');
  let y = CANVAS_H / 2 - 44;
  for (const line of lines) {
    text(ctx, line, CANVAS_W / 2, y, 16, '#e8f2ff', 'center', 'normal');
    y += 30;
  }
}

export function drawTitleScreen(ctx, state) {
  overlay(ctx, GAME_TITLE, [
    GAME_SUBTITLE,
    '',
    'Fly the courier run: take off, thread all 5 rings over the valley,',
    'then bring her home to the runway before the fuel runs dry.',
    '',
    '↑ / ↓  pitch      ← / →  bank & turn      W / S  throttle',
    'R  restart        Click or press ENTER to fly',
  ], '#ffd23e');
}

export function drawEndScreen(ctx, state) {
  if (state.phase === 'crashed') {
    overlay(ctx, 'CRASHED', [
      `The ridge claims another courier. Rings cleared: ${state.ringsPassed}/${RINGS.length}.`,
      `Score: ${state.score}.`,
      '',
      'Press R or click to try again.',
    ], '#ff5a3c');
  } else if (state.phase === 'complete') {
    const mins = Math.floor(state.timeSec / 60);
    const secs = Math.round(state.timeSec % 60).toString().padStart(2, '0');
    overlay(ctx, 'MISSION COMPLETE', [
      `All 5 rings threaded and a clean landing on the Meridian strip.`,
      `Time ${mins}:${secs}   •   Score ${state.score}   •   Fuel left ${Math.round(state.fuel)}%`,
      '',
      'Press R or click to fly the run again.',
    ], '#7dff9a');
  } else if (state.phase === 'landed') {
    overlay(ctx, 'TOUCHDOWN', [
      `Safe on the runway — but ${RINGS.length - state.ringsPassed} ring(s) still wait out there.`,
      'Fuel topped up. Press R to take off and finish the course.',
    ], '#ffd23e');
  }
}
