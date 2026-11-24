# NEON OVERDRIVE

A browser-based 3D coastal sunset highway racing arcade game built with **TypeScript**, **Three.js**, **Vite**, and the **Web Audio API**.

## Features

- **Sunset Coastal Highway**: Endless pooled road segments, Art Deco skyline blocks, beachfront palms, billboard landmarks, golden-hour sky dome, and 360° city horizon framing.
- **25 Unlockable Cars & 3D Garage**: Nine custom-sculpted vehicle chassis classes with interactive Front, Side, Rear, and 360° showroom camera angles, dual Coin + Best Distance unlock requirements, and per-car top-speed bonuses.
- **Dynamic Obstacles & Arcade Gameplay**: Smooth 3-lane switching, throttle/brake control, manual boost and track boost pads, 6 obstacle types with live lane-weaving traffic, swooping interceptor drones, oscillating laser gates, rotating EMP hazards, hydraulic roadblocks, near-miss bonuses, and combo multipliers.
- **Procedural Rap & Beast Soundtrack**: Rotating multi-track Web Audio beat sequencer (four distinct 16-step beat arrangements switching each run), speed-reactive engine audio, and balanced arcade sound effects.
- **Controls & Persistence**: Keyboard steering (`A`/`D` or `←`/`→`), throttle/brake (`W`/`S` or `↑`/`↓`), boost (`Space`), pause (`Esc`/`P`), mobile swipe + touch buttons, and `localStorage` persistence for records, unlocks, and settings.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Starts the Vite development server at `http://localhost:3000`.

### Type Checking

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

Outputs the optimized production bundle to `dist/`.

## Architecture Overview

- `src/core/`: Top-level game orchestration (`Game`), frame timing (`GameLoop`), central state store (`GameState`), and WebGL/bloom pipeline (`Renderer`).
- `src/world/`: Scene lifecycle (`SceneManager`), dynamic chase/attract/showroom camera (`CameraController`), golden-hour lighting (`Lighting`), and sky/horizon backdrop (`Environment`).
- `src/vehicle/`: Composite 3D car builder (`PlayerCar`), catalog specs (`CarCatalog`), kinematics (`CarPhysics`), exhaust effects (`CarEffects`), and vehicle coordinator (`CarController`).
- `src/track/`: Lane math (`LaneSystem`), pooled road geometry (`RoadSegment`), city blocks and coastal trees (`TrackDecorations`), and streaming coordinator (`TrackManager`).
- `src/gameplay/`: Dynamic obstacle and collectible pools (`ObstacleManager`, `CollectibleManager`), wave formations (`TacticalWaveDirector`), swept 2D collision & near-miss detection (`CollisionSystem`), boost gauge (`BoostSystem`), combo scoring (`ScoreManager`), and speed progression (`DifficultyManager`).
- `src/controls/`: Decoupled keyboard (`KeyboardController`) and mobile touch (`TouchController`) input handlers.
- `src/effects/`: Pooled instanced 3D particles (`ParticleSystem`), speed streaks (`SpeedEffects`), and effect coordinator (`VisualEffects`).
- `src/audio/`: Procedural music sequencer (`ClassicSoundtrack`, `AudioManager`) and sound effects synthesizer (`SoundEffects`).
- `src/ui/`: Modular DOM screens (`MainMenu`, `GameHUD`, `PauseMenu`, `GameOverScreen`, `SettingsMenu`, `GarageModal`, `UIManager`).
- `src/settings/` & `src/storage/`: Persistent configuration (`GameSettings`) and `localStorage` save data (`SaveManager`).
