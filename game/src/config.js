// Meridian Ridge Runner — shared constants: world layout, mission rings, physics limits.
// One clear job: the numbers every other module reads, nothing else.
export const GAME_TITLE = 'Meridian Ridge Runner';
export const GAME_SUBTITLE = 'A ridge-running courier sortie over the Meridian valley';

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// Runway: flat asphalt strip along +Z through the valley floor (y = 0).
export const RUNWAY = { x0: -14, x1: 14, z0: -100, z1: 900, headingDeg: 0 };

// Mission rings, flown in order. Each ring: centre (x, y, z) in metres, radius in metres.
export const RINGS = [
  { x: 0, y: 95, z: 1400, r: 46 },
  { x: 260, y: 150, z: 2100, r: 46 },
  { x: -320, y: 200, z: 2900, r: 46 },
  { x: 180, y: 125, z: 3700, r: 46 },
  { x: 0, y: 65, z: 4400, r: 46 },
];

// Start of the sortie: parked on the runway threshold, facing down the strip.
export const START_POSE = { x: 0, y: 2, z: -40, headingDeg: 0, pitchDeg: 0, rollDeg: 0 };

export const PHYSICS = {
  minSpeed: 38, // m/s — below this the wing stops flying and the jet sinks
  maxSpeed: 132, // m/s — flat out at full throttle, level
  cruiseThrottle: 0.62,
  accelPerThrottle: 46, // m/s^2 at full throttle before drag
  dragCoef: 0.34, // 1/s — drag grows with speed
  pitchRateDeg: 42, // deg/s toward the commanded pitch
  rollRateDeg: 95, // deg/s toward the commanded roll
  maxPitchDeg: 26,
  maxRollDeg: 62,
  turnCoef: 0.62, // heading deg/s per deg of bank, scaled by speed
  fuelBurnPerSec: 0.55, // %/s at full throttle
  stallSink: 14, // m/s extra sink when stalled
  crashVerticalSpeed: 9, // m/s — hitting ground harder than this is a crash
  ringScore: 500,
  landingScore: 1000,
};

export const FUEL_START = 100;
export const DAMAGE_START = 0;
