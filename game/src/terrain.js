// Terrain: a seeded heightfield valley with a flat runway corridor and rising ridges.
// One clear job: heightAt(x, z) and the ground colour for a height + slope.
import { fbm2D } from './random.js';
import { RUNWAY } from './config.js';

const SEED = 20261126;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// 0 in the flat valley corridor, 1 out on the ridges.
function ridgeFactor(x, z) {
  const side = clamp01((Math.abs(x) - 150) / 750);
  const far = clamp01((z - 1500) / 2600);
  return Math.max(side, far * 0.75);
}

export function heightAt(x, z) {
  const ridge = ridgeFactor(x, z);
  const amp = 26 + 235 * ridge;
  let h = fbm2D(x, z, SEED) * amp;
  // Flatten the runway corridor so the strip and its approaches sit at y = 0.
  const corridor = clamp01((140 - Math.abs(x)) / 140) * clamp01((1700 - z) / 400 + 1);
  const flat = clamp01(corridor);
  h *= 1 - flat * 0.96;
  // The runway strip itself is exactly flat.
  if (Math.abs(x) <= RUNWAY.x1 + 6 && z >= RUNWAY.z0 - 60 && z <= RUNWAY.z1 + 60) {
    const edge = clamp01((Math.abs(x) - RUNWAY.x1) / 6);
    h *= edge;
  }
  return h;
}

// Slope magnitude (0 flat .. ~1 steep) from a small finite difference.
export function slopeAt(x, z) {
  const dx = heightAt(x + 24, z) - heightAt(x - 24, z);
  const dz = heightAt(x, z + 24) - heightAt(x, z - 24);
  return Math.min(1, Math.hypot(dx, dz) / 48);
}

// Ground colour: valley grass -> forest -> rock -> snow, darkened on steep faces.
export function groundColor(x, z, out) {
  const h = heightAt(x, z);
  const s = slopeAt(x, z);
  let r; let g; let b;
  if (h < 10) { r = 96; g = 148; b = 74; } // valley grass
  else if (h < 55) { r = 74; g = 122; b = 62; } // forest green
  else if (h < 110) { r = 122; g = 104; b = 78; } // dry rock
  else if (h < 165) { r = 138; g = 128; b = 118; } // high rock
  else { r = 226; g = 230; b = 236; } // snow
  // Patchy variation so the ground does not read as one flat colour.
  const patch = fbm2D(x * 0.7 + 500, z * 0.7, SEED + 7) * 14;
  const shade = (1 - s * 0.45) * (1 + patch / 160);
  out[0] = Math.max(0, Math.min(255, Math.round(r * shade)));
  out[1] = Math.max(0, Math.min(255, Math.round(g * shade)));
  out[2] = Math.max(0, Math.min(255, Math.round(b * shade)));
  return out;
}
