# NEON OVERDRIVE

A 3D coastal highway arcade racing game built with TypeScript, Three.js, Vite, and the Web Audio API. Race across a three-lane coastal boulevard through an evolving day-night cycle, weave past dynamic highway obstacles, build score multipliers, and unlock 25 custom vehicles in an interactive 3D showroom.

## Features

- **3D Coastal Highway & Day-Night Cycle**: Endless pooled road segments, Art Deco skyline blocks, coastal palms, 360-degree horizon framing, and a continuous 8-minute day-night atmosphere cycle transitioning through Day, Sunset, Midnight, and Dawn every 2 minutes.
- **25 Unlockable Cars & 3D Garage**: Nine distinct vehicle chassis classes (`muscle_blower`, `drift_widebody`, `ourea_electric`, `magnetar_super`, `cerbero_racer`, `chiron_rally`, `spectra_wtype`, `janus_racer`, `chronos_proto`) with category filters, interactive Front, Side, Rear, and 360° Spin showroom cameras, dual Coin + Best Distance unlock requirements, and per-car top-speed bonuses.
- **Dynamic Obstacles & Wave Formations**: Opening highway formations and scaling tactical waves featuring 8 obstacle types—Traffic Vehicles (with lane-change blinkers), Energy Barriers, Roadblocks, Laser Gates, EMP Hazards, Interceptor Drones, Laser Sweepers (unlocked at 1,500m / Tier 5), and Shock Pylons (unlocked at 3,000m / Tier 8)—with corridor checks that always preserve at least one clear path.
- **Risk-Reward Scoring & Deep-Run Zones**: Collect Score Crystals (coins), Energy Orbs, and Boost Cells, hit track Boost Pads, earn Near-Miss bonuses, trigger 10,000-point Fever bursts, and enter Express (`2,500m`, `1.5x`), Overclock (`5,000m`, `2.0x`), and Apex (`8,000m`, `2.5x`) score zones.
- **Procedural Web Audio Engine**: Four-track rotating beat sequencer, speed- and boost-reactive engine synthesis, and voice-capped arcade sound effects with master volume, music, SFX, and mute controls.
- **Responsive Desktop & Mobile Support**: Auto-adapting FOV for portrait and wide screens, keyboard controls, swipe gestures, configurable on-screen touch pads (`Auto`, `Always`, `Off`), automatic pause when switching tabs, and `localStorage` persistence.

## Screenshots

> Screenshots are not bundled in this repository. Run the local dev or preview server to capture gameplay, garage, and day-night cycle views:
>
> - `[Main Menu & Attract Mode Screenshot Placeholder]`
> - `[Active Highway Racing & HUD Screenshot Placeholder]`
> - `[3D Garage Showroom & Car Unlocks Screenshot Placeholder]`

## Controls & How to Play

### Desktop Controls

| Key | Action |
| --- | --- |
| `A` / `←` | Shift one lane left |
| `D` / `→` | Shift one lane right |
| `W` / `↑` | Hold throttle for extra speed |
| `S` / `↓` | Hold brake to slow down |
| `Space` | Hold Overdrive Boost (requires at least 15% charge) |
| `Esc` | Pause / resume race, or close open Settings / Garage modal |
| `P` | Pause / resume race |

### Touch & Mobile Controls

- **Swipe Left / Right** on the viewport to switch lanes.
- **Swipe Up** on the viewport (or hold the on-screen **Boost** button) to boost.
- **Tap Left / Right** touch buttons when touch controls are visible (`Auto` on touch/small screens, or `Always` in Settings).

### Gameplay Tips

- Passing closely beside obstacles triggers a **Near Miss** score and boost energy bonus.
- Every `10,000` points awards bonus coins, refills boost, and activates an 8-second `2x` score burst.
- Unlocking new cars in the **Cars** garage requires both Coins and a Best Distance milestone, and permanently increases your starting and top speeds.

## Tech Stack

- **Language & Build**: TypeScript 7, Vite 8
- **3D Rendering**: Three.js (WebGL 2, `EffectComposer` + `UnrealBloomPass` on hardware-accelerated GPUs, automatic software-WebGL fallback)
- **Procedural Assets & Audio**: HTML5 Canvas 2D texture generation, Web Audio API synthesis & sequencer
- **Styling & UI**: Modular DOM components + CSS (`src/styles/`), Tailwind CSS v4 Vite plugin

## Project Structure

```text
.
├── index.html                  # App entry HTML, viewport meta, Google Fonts links
├── metadata.json               # App name, description, and capability metadata
├── package.json                # Scripts and dependencies
├── public/
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
│   ├── audio/                  # AudioManager, Soundtrack, SoundEffects
│   ├── ui/                     # UIManager, MainMenu, GameHUD, PauseMenu, GameOverScreen, SettingsMenu, GarageModal
│   ├── settings/               # GameSettings store
│   ├── storage/                # SaveManager (localStorage persistence & schema validation)
│   ├── styles/                 # main.css, menu.css, hud.css, effects.css
│   └── utils/                  # Constants, MathUtils, ObjectPool, TextureFactory
└── vite.config.ts              # Vite build and asset copy configuration
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

`NEON OVERDRIVE` builds to a self-contained static web bundle in `dist/` with no backend server or database required:

1. Run `npm run lint && npm run build`.
2. Deploy the contents of `dist/` to any static hosting platform (Cloud Run / Nginx, Cloudflare Pages, Vercel, Netlify, GitHub Pages, or Firebase Hosting).
3. Ensure WebGL 2 is supported by target browsers and serve over HTTPS so browser audio and mobile viewport APIs function reliably.

## Configuration & Persistence

- **Environment Variables**: `.env.example` contains platform template placeholders (`GEMINI_API_KEY`, `APP_URL`), though the client game itself runs 100% client-side and does not read any API keys or secrets.
- **Browser Storage**: Progress and preferences are saved per browser origin in `localStorage`:
  - `neon_overdrive_save_v1`: High score, best distance, run stats, coin wallet, unlocked cars, and equipped car.
  - `neon_overdrive_settings_v1`: Graphics quality (`high` / `balanced`), master volume, music/SFX toggles, mute state, and touch pad mode.

## Testing & Verification

Before releasing changes:

1. Run `npm run lint` to confirm zero TypeScript errors.
2. Run `npm run build` and verify `dist/index.html`, `dist/favicon.svg`, and `dist/assets/` are generated cleanly.
3. Run `npm run preview` and manually verify in desktop and mobile browsers:
   - Main Menu → Garage (preview, camera angles, unlock/equip, filter tabs, reset) → Settings (volume, quality, touch mode)
   - Gameplay controls (`A`/`D` or `←`/`→`, `W`/`S`, `Space`, `Esc`, `P`, mobile swipe/touch pads)
   - Collisions, near misses, pause/resume, tab-switch auto-pause, game over, and restart
   - Persistence across page reloads and private/incognito sessions

## Credits & License

- All 3D vehicle/world geometry, procedural Canvas 2D textures, and Web Audio synthesizer tracks/effects are generated in-code within this repository.
- Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).
- No `LICENSE` file is currently present in this repository; add an explicit license file before distributing under specific open-source or commercial terms.
