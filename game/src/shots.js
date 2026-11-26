// Deterministic screenshot poses: ?shot=<name> parks the jet at a fixed pose so the
// screenshots are stable renders of the game's own code. One clear job: poses, nothing else.
import { RINGS } from './config.js';

// Each pose: position, attitude, speed, throttle, rings already passed, and the message shown.
export const SHOTS = {
  // Cover: climbing out over the strip — runway below, first ring ahead, full HUD.
  cover: {
    x: 0, y: 55, z: 350, headingDeg: 0, pitchDeg: 12, rollDeg: 0,
    speed: 78, throttle: 0.9, fuel: 92, ringsPassed: 0, score: 0,
    message: 'CLIMB OUT — RING 1 AHEAD',
  },
  // Just lifted off the threshold, runway still filling the view below.
  takeoff: {
    x: 0, y: 18, z: 100, headingDeg: 0, pitchDeg: 10, rollDeg: 0,
    speed: 68, throttle: 0.95, fuel: 97, ringsPassed: 0, score: 0,
    message: 'ROTATE — CLIMB OUT OVER THE VALLEY',
  },
  // Threading ring 2 in a banked turn between the ridges.
  rings: {
    x: 190, y: 138, z: 1900, headingDeg: 17, pitchDeg: 3, rollDeg: -24,
    speed: 96, throttle: 0.78, fuel: 61, ringsPassed: 1, score: 640,
    message: 'RING 2 AHEAD — BANK AND THREAD IT',
  },
  // Short final after the last ring: close to the threshold, runway dead ahead.
  landing: {
    x: 0, y: 32, z: -200, headingDeg: 0, pitchDeg: -5, rollDeg: 0,
    speed: 58, throttle: 0.35, fuel: 22, ringsPassed: 5, score: 3420,
    message: 'ALL RINGS CLEAR — BRING HER HOME',
  },
};

export function applyShot(state, name) {
  const pose = SHOTS[name] || SHOTS.cover;
  state.phase = 'flying';
  state.x = pose.x;
  state.y = pose.y;
  state.z = pose.z;
  state.headingDeg = pose.headingDeg;
  state.pitchDeg = pose.pitchDeg;
  state.rollDeg = pose.rollDeg;
  state.speed = pose.speed;
  state.throttle = pose.throttle;
  state.fuel = pose.fuel;
  state.ringsPassed = pose.ringsPassed;
  state.score = pose.score;
  state.timeSec = 95;
  state.message = pose.message;
  state.messageUntil = 9999;
  state.verticalSpeed = 0;
  return pose;
}

// Keep the exported ring list in sync with the mission definition.
export function shotRingCount() {
  return RINGS.length;
}
