// Seeded deterministic randomness: the same seed always builds the same valley.
// One clear job: hash noise and smooth value noise for the terrain. No Math.random here.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic 2D integer hash -> [0, 1).
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

// Smooth value noise in [-1, 1] at world coordinates (x, z), cell size `cell` metres.
export function valueNoise2D(x, z, cell, seed) {
  const gx = x / cell;
  const gz = z / cell;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = smooth(gx - ix);
  const fz = smooth(gz - iz);
  const a = hash2(ix, iz, seed) * 2 - 1;
  const b = hash2(ix + 1, iz, seed) * 2 - 1;
  const c = hash2(ix, iz + 1, seed) * 2 - 1;
  const d = hash2(ix + 1, iz + 1, seed) * 2 - 1;
  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fz;
}

// Fractal brownian motion: 3 octaves of value noise, still in [-1, 1]-ish range.
export function fbm2D(x, z, seed) {
  let sum = 0;
  let amp = 0.55;
  let cell = 620;
  for (let o = 0; o < 3; o++) {
    sum += valueNoise2D(x, z, cell, seed + o * 101) * amp;
    amp *= 0.5;
    cell *= 0.45;
  }
  return sum;
}
