# Meridian Ridge Runner

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/kiroroai/best-flight-game-20261126-0057/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/kiroroai/best-flight-game-20261126-0057/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A complete, original flight game that runs offline in a desktop browser from
static files — no network requests, no libraries. Fly the courier run over the
Meridian valley: take off from the strip, thread all 5 target rings between
the ridges, then bring her home to the runway before the fuel runs dry.

## The game

- **Chase view** over a seeded valley: grass floor, forested slopes, rock
  ridges and snow caps, with a sun, drifting clouds and distance haze.
- **The jet in frame**, banked and pitched with your stick, with lit
  instruments: attitude indicator, compass tape, airspeed / heading /
  altitude readouts, throttle, fuel and damage.
- **A runway ahead** on takeoff and final, and **target rings** marking the
  course — fly through each hoop to score.
- **Decisions, not just flying**: throttle and turn discipline pay, fuel
  burns with throttle, a stall sinks you, a hard landing on anything but the
  runway is a crash, and a gentle touchdown on the strip refuels you.

## Controls

| Key | Action |
| --- | --- |
| ↑ / ↓ | Pitch down / up |
| ← / → | Bank left / right (bank turns the jet) |
| W / Shift | Throttle up |
| S / Ctrl | Throttle down |
| Enter / click | Start, restart |
| R | Restart after a crash or landing |
| M | Mute |

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome, for example:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080. The screenshots in `screenshots/` are real
renders of this code in headless Chrome (`?shot=cover|takeoff|rings|landing`
parks the jet at a fixed pose for a stable frame).

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Entry for the [Make the best flight game](https://make.fun/c/best-flight-game-20261126-0057)
competition on make.fun.
