// Input: keyboard + mouse, reduced to one small frame of intent per tick.
// One clear job: listen to devices and expose { pitch, roll, throttleUp, throttleDown,
// startPressed, restartPressed }. It never decides what the game does with them.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    pitch: 0,
    roll: 0,
    throttleUp: false,
    throttleDown: false,
    startPressed: false,
    restartPressed: false,
  };

  function refresh() {
    const up = keys.has('ArrowUp');
    const down = keys.has('ArrowDown');
    const left = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    input.pitch = (up ? 1 : 0) - (down ? 1 : 0);
    input.roll = (right ? 1 : 0) - (left ? 1 : 0);
    input.throttleUp = keys.has('KeyW') || keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.throttleDown = keys.has('KeyS') || keys.has('ControlLeft') || keys.has('ControlRight');
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'Enter' || e.code === 'Space') input.startPressed = true;
    if (e.code === 'KeyR') input.restartPressed = true;
    if (e.code === 'KeyM') input.mutePressed = true;
    keys.add(e.code);
    refresh();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    refresh();
  });
  canvas.addEventListener('mousedown', () => {
    input.startPressed = true;
    input.restartPressed = true;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    refresh();
  });

  // One-shot flags: the game loop consumes them each frame.
  input.consumeStart = function consumeStart() {
    const v = input.startPressed;
    input.startPressed = false;
    return v;
  };
  input.consumeRestart = function consumeRestart() {
    const v = input.restartPressed;
    input.restartPressed = false;
    return v;
  };
  input.consumeMute = function consumeMute() {
    const v = input.mutePressed;
    input.mutePressed = false;
    return v;
  };
  return input;
}
