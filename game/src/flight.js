// Flight model: one step of the jet — throttle, pitch, bank, turns, fuel, rings, landings.
// One clear job: pure state transitions. It knows nothing about drawing or input devices.
import { PHYSICS, RINGS, RUNWAY, START_POSE, FUEL_START, DAMAGE_START } from './config.js';
import { heightAt } from './terrain.js';

export function createFlightState() {
  return {
    phase: 'title', // title | flying | landed | crashed | complete
    x: START_POSE.x,
    y: START_POSE.y,
    z: START_POSE.z,
    headingDeg: START_POSE.headingDeg,
    pitchDeg: START_POSE.pitchDeg,
    rollDeg: START_POSE.rollDeg,
    speed: 0,
    throttle: 0,
    fuel: FUEL_START,
    damage: DAMAGE_START,
    score: 0,
    ringsPassed: 0,
    timeSec: 0,
    message: '',
    messageUntil: 0,
    verticalSpeed: 0,
    landedAt: 0,
  };
}

export function resetFlight(state) {
  const fresh = createFlightState();
  Object.assign(state, fresh);
  state.phase = 'flying';
  state.message = 'FULL THROTTLE — ROTATE AT 120 KT';
  state.messageUntil = 6;
}

function degToRad(d) {
  return (d * Math.PI) / 180;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function approach(current, target, rate, dt) {
  const d = target - current;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return current + Math.sign(d) * step;
}

function setMessage(state, text, seconds) {
  state.message = text;
  state.messageUntil = state.timeSec + seconds;
}

// Distance from the jet to the next ring centre.
export function nextRing(state) {
  return state.ringsPassed < RINGS.length ? RINGS[state.ringsPassed] : null;
}

export function distanceToRing(state) {
  const ring = nextRing(state);
  if (!ring) return 0;
  return Math.hypot(ring.x - state.x, ring.y - state.y, ring.z - state.z);
}

// input: { pitch: -1..1 (1 = pull up), roll: -1..1 (1 = bank right),
//          throttleUp, throttleDown } — all from input.js, never read here.
export function stepFlight(state, input, dt) {
  if (state.phase !== 'flying') return;
  state.timeSec += dt;
  const P = PHYSICS;

  // Throttle.
  if (input.throttleUp) state.throttle = clamp(state.throttle + 0.55 * dt, 0, 1);
  if (input.throttleDown) state.throttle = clamp(state.throttle - 0.55 * dt, 0, 1);
  if (state.fuel <= 0) state.throttle = 0;

  // Attitude follows the stick.
  const targetPitch = input.pitch * P.maxPitchDeg;
  const targetRoll = input.roll * P.maxRollDeg;
  state.pitchDeg = approach(state.pitchDeg, targetPitch, P.pitchRateDeg, dt);
  state.rollDeg = approach(state.rollDeg, targetRoll, P.rollRateDeg, dt);

  // A banked wing turns the jet: heading follows roll, scaled by speed.
  const speedFactor = clamp(state.speed / 70, 0.25, 1.4);
  state.headingDeg -= state.rollDeg * P.turnCoef * speedFactor * dt;
  state.headingDeg = ((state.headingDeg % 360) + 360) % 360;

  // Speed: throttle pushes, drag pulls; climbing costs speed, diving gains it.
  const climbCost = Math.sin(degToRad(state.pitchDeg)) * 22;
  const accel = state.throttle * P.accelPerThrottle - P.dragCoef * state.speed - climbCost;
  state.speed = clamp(state.speed + accel * dt, 0, P.maxSpeed);

  // Motion along the nose.
  const hRad = degToRad(state.headingDeg);
  const pRad = degToRad(state.pitchDeg);
  const horiz = Math.cos(pRad) * state.speed;
  state.x += Math.sin(hRad) * horiz * dt;
  state.z += Math.cos(hRad) * horiz * dt;
  let vy = Math.sin(pRad) * state.speed;
  if (state.speed < P.minSpeed) vy -= (P.minSpeed - state.speed) * 0.28; // stall sink
  state.verticalSpeed = vy;
  state.y += vy * dt;

  // Fuel burns with throttle; an empty tank means a glide.
  state.fuel = Math.max(0, state.fuel - state.throttle * P.fuelBurnPerSec * dt);
  if (state.fuel <= 0 && state.throttle === 0 && state.messageUntil < state.timeSec) {
    setMessage(state, 'FUEL EMPTY — GLIDE HER HOME', 4);
  }

  // Ring capture: fly through the hoop.
  const ring = nextRing(state);
  if (ring) {
    const d = Math.hypot(ring.x - state.x, ring.y - state.y, ring.z - state.z);
    if (d < ring.r) {
      state.ringsPassed += 1;
      const bonus = Math.round(state.speed * 2);
      state.score += P.ringScore + bonus;
      setMessage(
        state,
        state.ringsPassed >= RINGS.length
          ? `RING ${state.ringsPassed}/5 — COURSE CLEAR, LAND ON THE RUNWAY`
          : `RING ${state.ringsPassed}/5 — +${P.ringScore + bonus} PTS`,
        4,
      );
    }
  }

  // Ground contact.
  const ground = heightAt(state.x, state.z);
  if (state.y <= ground + 2.5) {
    const onRunway =
      Math.abs(state.x) <= RUNWAY.x1 + 2 && state.z >= RUNWAY.z0 && state.z <= RUNWAY.z1;
    const gentle =
      Math.abs(state.verticalSpeed) < P.crashVerticalSpeed &&
      Math.abs(state.rollDeg) < 18 &&
      state.speed < 78;
    if (onRunway && gentle && ground < 1) {
      state.y = 2.5;
      state.phase = 'landed';
      state.landedAt = state.timeSec;
      if (state.ringsPassed >= RINGS.length) {
        state.phase = 'complete';
        const timeBonus = Math.max(0, Math.round((420 - state.timeSec) * 5));
        state.score += P.landingScore + timeBonus;
        setMessage(state, `MISSION COMPLETE — +${P.landingScore + timeBonus} PTS`, 999);
      } else {
        state.fuel = Math.min(100, state.fuel + 40);
        setMessage(state, 'TOUCHDOWN — REFUELLED, PRESS R TO FLY AGAIN', 999);
      }
    } else {
      state.phase = 'crashed';
      state.damage = 100;
      state.y = ground + 2.5;
      setMessage(state, 'CRASHED — PRESS R TO TRY AGAIN', 999);
    }
  }

  // Out of the valley, turn back: soft wall far from the course.
  if (Math.abs(state.x) > 2600 || state.z < -900 || state.z > 5600) {
    setMessage(state, 'TURN BACK — LEAVING THE MERIDIAN VALLEY', 3);
    state.headingDeg = (state.headingDeg + 180) % 360;
    state.x = clamp(state.x, -2400, 2400);
    state.z = clamp(state.z, -700, 5400);
  }
}
