<p align="center">
  <img src="public/assets/aistudio/image_d6756ab8.png" alt="Asphalt Rush Logo" width="420" />
</p>

# Asphalt Rush

A 3D coastal highway arcade racing game built with TypeScript, Three.js, Vite, and the Web Audio API. Race across a three-lane coastal boulevard through an evolving day-night cycle, weave past dynamic highway obstacles, build score multipliers, and unlock 25 custom vehicles in an interactive 3D showroom.

## Features

- **3D Coastal Highway & Day-Night Cycle**: Endless pooled road segments, Art Deco skyline blocks, coastal palms, sequential overhead gantry signs (`Iesus Dominus est`, `xenos`, `Ἁγία Μαρία, Μήτηρ Θεοῦ`, `The Brook`), cycling roadside artwork billboards, 360-degree horizon framing, and a continuous day-night cycle transitioning through Day, Sunset, Midnight, and Dawn every 1 minute 30 seconds on the first cycle (6 minutes total), then every 2 minutes 30 seconds on subsequent cycles (10 minutes total).
- **25 Unlockable Cars & 3D Showroom Garage**: Nine distinct sculpted chassis classes (`muscle_blower`, `drift_widebody`, `ourea_electric`, `magnetar_super`, `cerbero_racer`, `chiron_rally`, `spectra_wtype`, `janus_racer`, `chronos_proto`) featuring quad halo-ring headlights, category filters, interactive Front, Side, Rear, and 360° Spin cameras (plus touch/mouse orbit drag), dual Coin (`1,500`–`150,000` Coins) + Best Distance unlock requirements, and per-car speed bonuses.
- **Volumetric Backfire & Boost Exhaust**: Custom 3D Fresnel teardrop flame plumes and nozzle glows that trigger smooth exhaust backfire pops on throttle engagement, high-speed lane shifts, and boost ignition, plus continuous afterburner flames while boosting.
- **Dynamic Obstacles & Wave Formations**: Opening highway formations and scaling tactical waves featuring 8 obstacle types—Traffic Vehicles (with lane-change blinkers), Energy Barriers, Roadblocks, Laser Gates, EMP Hazards, Interceptor Drones, Laser Sweepers (unlocked at 1,500m / Tier 5), and Shock Pylons (unlocked at 3,000m / Tier 8)—with corridor checks that always preserve at least one clear path.
- **Risk-Reward Scoring & Deep-Run Zones**: Collect Gold Coins (`score_crystal`), limited Energy Orbs and Boost Cells, hit track Boost Pads, earn Near-Miss bonuses, trigger 1,000-point Fever bursts, and enter Express (`2,500m`, `1.5x`), Overclock (`5,000m`, `2.0x`), and Apex (`8,000m`, `2.5x`) score zones.
- **30-Track Soundtrack & Web Audio Engine**: Plays tracks 1–30 sequentially from the curated soundtrack (advancing to a fresh track on each new run and stopping cleanly on pause or game over) with automatic local 30-track Web Audio synthesizer fallback, speed- and boost-reactive engine synthesis, arcade SFX, and a 20% default master volume.
- **Responsive Desktop & Mobile Support**: Portrait and landscape FOV/camera distance adaptation across the main menu, garage showroom, and gameplay chase view, `ResizeObserver` viewport tracking, keyboard controls, swipe gestures, configurable on-screen touch pads (`Auto`, `Always`, `Off`), a translucent bottom pause dock, automatic pause when switching tabs, and `localStorage` persistence.

## Controls & How to Play

### Desktop Controls

| Key | Action |
| --- | --- |
| `A` / `←` | Shift one lane left |
| `D` / `→` | Shift one lane right |
| `W` / `↑` | Hold throttle for extra speed |
| `Space` | Hold Boost (requires at least 15% charge) |
| `Esc` | Pause / resume race, or close open Settings / Garage modal |
| `P` | Pause / resume race |

### Touch & Mobile Controls

- **Swipe Left / Right** on the viewport to switch lanes.
- **Swipe Up** on the viewport (or hold the on-screen **Boost** button) to boost.
- **Tap Left / Right** touch buttons when touch controls are visible (`Auto` on touch/small screens, or `Always` in Settings).

### Gameplay Tips

- Passing closely beside obstacles triggers a **Near Miss** score and boost energy bonus.
- Every `1,000` points awards bonus coins, refills boost, and activates an 8-second `2x` score burst.
- Unlocking new cars in the **Cars** garage requires both Coins and a Best Distance milestone, and permanently increases your starting and top speeds.

## Tech Stack

- **Language & Build**: TypeScript 7, Vite 8
- **3D Rendering**: Three.js (WebGL 2, `EffectComposer` + `UnrealBloomPass` on hardware-accelerated GPUs, automatic software-WebGL fallback)
- **Procedural Assets & Audio**: HTML5 Canvas 2D texture generation, Web Audio API synthesis & YouTube IFrame playlist controller
- **Styling & UI**: Modular DOM components + CSS (`src/styles/`), Tailwind CSS v4 Vite plugin

## Project Structure

```text
.
├── index.html                  # App entry HTML, viewport meta, and font links
├── metadata.json               # Application manifest metadata
├── package.json                # Scripts and dependencies
├── public/
│   ├── assets/                 # Brand logo and roadside billboard artwork
│   └── favicon.svg             # Vector favicon
├── src/
│   ├── main.ts                 # Bootstrap, DOM mount, WebGL fallback banner
│   ├── core/                   # Game coordinator, GameLoop, GameState, Renderer
│   ├── world/                  # SceneManager, CameraController, Lighting, Environment, DayNightCycle
│   ├── track/                  # LaneSystem, RoadSegment, TrackDecorations, TrackManager
│   ├── vehicle/                # CarCatalog (25 cars), PlayerCar, CarPhysics, CarEffects, CarController
│   ├── gameplay/               # ObstacleManager, CollectibleManager, TacticalWaveDirector, CollisionSystem, BoostSystem, ScoreManager, DifficultyManager
│   ├── controls/               # KeyboardController, TouchController
│   ├── effects/                # ParticleSystem, SpeedEffects, VisualEffects
│   ├── audio/                  # AudioManager, Soundtrack, LocalTrackBank, SoundEffects
│   ├── ui/                     # UIManager, MainMenu, GameHUD, PauseMenu, GameOverScreen, SettingsMenu, GarageModal
│   ├── settings/               # GameSettings store
│   ├── storage/                # SaveManager (localStorage persistence & schema validation)
│   ├── styles/                 # main.css, menu.css, hud.css, effects.css
│   └── utils/                  # Constants, MathUtils, ObjectPool, TextureFactory
└── vite.config.ts              # Vite build and static asset configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ (tested on Node v22) and npm

### Installation

```bash
npm install
```

### Run Locally (Development)

```bash
npm run dev
```

Starts the Vite development server on `http://localhost:3000`.

### Type Checking & Production Build

```bash
npm run lint
npm run build
```

- `npm run lint` runs TypeScript strict checking (`tsc --noEmit`).
- `npm run build` compiles the static production bundle into `dist/`.

### Preview Production Bundle

```bash
npm run preview
```

Serves the compiled `dist/` bundle locally so you can verify production assets before publishing.

## Deployment

`Asphalt Rush` builds to a self-contained static web bundle in `dist/` with no backend server or database required:

1. Run `npm run lint && npm run build`.
2. Deploy the contents of `dist/` to any static hosting platform (Cloud Run / Nginx, Cloudflare Pages, Vercel, Netlify, GitHub Pages, or Firebase Hosting).
3. Ensure WebGL 2 is supported by target browsers and serve over HTTPS so browser audio and mobile viewport APIs function reliably.

## Configuration & Persistence

- **Environment Variables**: `.env.example` contains a template placeholder (`APP_URL`), while the game runs 100% client-side and does not require API keys or secrets.
- **Browser Storage**: Progress and preferences are saved per browser origin in `localStorage` (with automatic migration from legacy keys):
  - `asphalt_rush_save_v1`: High score, best distance, run stats, coin wallet, unlocked cars, and equipped car.
  - `asphalt_rush_settings_v1`: Graphics quality (`high` / `balanced`), master volume (default `20%`), music/SFX toggles, mute state, and touch pad mode.

## Verification

1. Run `npm run lint` to confirm zero TypeScript errors.
2. Run `npm run build` and verify `dist/index.html`, `dist/favicon.svg`, and `dist/assets/` are generated cleanly.
3. Verify core gameplay, garage showroom, settings persistence, audio lifecycle, backfire effects, and responsive desktop/mobile layouts.

## Credits & License

- All 3D vehicle/world geometry, shaders, procedural Canvas 2D textures, and Web Audio synthesizers are authored in-code within this repository; brand and roadside billboard assets reside under `public/assets/`.
- Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).
- No `LICENSE` file is currently present in this repository; add an explicit license file before distributing under specific open-source or commercial terms.
