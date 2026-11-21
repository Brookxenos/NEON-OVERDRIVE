# NEON OVERDRIVE

A high-speed, browser-based 3D cyberpunk highway hover-racing arcade game built with **TypeScript**, **Three.js**, **Vite**, and the **Web Audio API**.

## Features

- **3D Cyber-Highway World**: Endless pooled road segments with wet normal-mapped asphalt, neon lane dividers, cantilevered light standards, overhead energy gates, parallax skyscrapers, and an atmospheric night sky dome.
- **Hover-Car Physics & Model**: Multi-part composite 3D hover-car with carbon-fiber clearcoat bodywork, iridescent cockpit canopy, volumetric headlight cones, articulated active aero flaps, and dual-layer plasma thrusters.
- **Arcade Gameplay**: Smooth 3-lane switching, throttle/brake control, manual boost overdrive and track boost pads, 5 distinct obstacle archetypes, energy/score/boost collectibles, near-miss bonuses, combo multipliers, and progressive speed scaling.
- **Procedural Synthwave Audio**: Multi-layer Web Audio synthesizer featuring a 4-bar synthwave arrangement (pads, bass, kick, gated snare, hats, arpeggio), speed-reactive 3-layer hover turbine, and spatial sound effects.
- **Controls & Persistence**: Tap-based keyboard steering (`A`/`D` or `←`/`→`), throttle/brake (`W`/`S` or `↑`/`↓`), boost (`Space`), pause (`Esc`/`P`), mobile swipe + touch buttons, and `localStorage` persistence for high scores and settings.

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
- `src/world/`: Scene lifecycle (`SceneManager`), dynamic chase/attract camera (`CameraController`), 3-point & softbox lighting (`Lighting`), and sky/horizon city backdrop (`Environment`).
- `src/vehicle/`: Composite 3D hover-car mesh (`PlayerCar`), kinematics (`CarPhysics`), exhaust triggers (`CarEffects`), and vehicle coordinator (`CarController`).
- `src/track/`: Lane math (`LaneSystem`), pooled road geometry (`RoadSegment`), parallax skyscrapers (`TrackDecorations`), and streaming coordinator (`TrackManager`).
- `src/gameplay/`: Obstacle and collectible pools (`ObstacleManager`, `CollectibleManager`), AABB collision & near-miss detection (`CollisionSystem`), boost gauge (`BoostSystem`), combo scoring (`ScoreManager`), and speed progression (`DifficultyManager`).
- `src/controls/`: Decoupled keyboard (`KeyboardController`) and mobile touch (`TouchController`) input handlers.
- `src/effects/`: Pooled instanced 3D particles (`ParticleSystem`), speed streaks & cyber-rain (`SpeedEffects`), and effect coordinator (`VisualEffects`).
- `src/audio/`: Procedural music sequencer (`AudioManager`) and sound effects synthesizer (`SoundEffects`).
- `src/ui/`: Modular DOM screens (`MainMenu`, `GameHUD`, `PauseMenu`, `GameOverScreen`, `SettingsMenu`, `UIManager`).
- `src/settings/` & `src/storage/`: Persistent configuration (`GameSettings`) and `localStorage` save data (`SaveManager`).
