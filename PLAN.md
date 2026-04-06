# Pendulo — Inverted Pendulum Control Simulator

## Context

Build a browser-based inverted pendulum simulator where users can write custom control algorithms to balance a pendulum on a moving cart. The goal is physically accurate simulation (full nonlinear Lagrangian mechanics with RK4 integration) suitable for real control algorithm development, not just a toy demo. The architecture must be modular so future rig types (e.g., reaction-wheel balancer) can be swapped in without changing the engine, UI, or editor.

## Tech Stack

- **React + Vite + TypeScript**
- **Canvas API** — direct 2D rendering, no library needed
- **CodeMirror 6** via `@uiw/react-codemirror` — lightweight code editor
- **uPlot** via `uplot-react` — canvas-based real-time charting (handles 100k+ points at 60fps)
- **Custom physics** — Lagrangian equations of motion, RK4 integration, no physics engine

## Architecture

### Core Abstraction: `Rig<S, C>`

Every simulation model implements this interface. The engine, UI, plots, and editor all work generically through it.

```typescript
// src/types/Rig.ts
interface Rig<S extends Record<string, number>, C extends Record<string, number>> {
  name: string;
  description: string;
  defaultState: S;
  defaultConfig: C;
  derivatives(state: S, config: C, controlInput: number): S;
  getControllerInput(state: S): Record<string, number>;
  render(ctx: CanvasRenderingContext2D, state: S, config: C, dims: Dimensions): void;
  getParameterDefinitions(): ParameterDefinition[];
  getInitialConditionDefinitions(): InitialConditionDefinition[];
  getPlotDefinitions(): PlotDefinition[];
}
```

Adding a future rig = create a new folder in `src/rigs/`, implement the interface, register it. Nothing else changes.

### File Structure

```
pendulo/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── types/
│   │   ├── Rig.ts                    # Rig<S,C>, ParameterDefinition, PlotDefinition
│   │   ├── Simulation.ts             # SimulationStatus, TimeSeriesPoint
│   │   └── Controller.ts             # ControllerFunction type
│   ├── rigs/
│   │   ├── index.ts                  # Registry: { cartPendulum: ... }
│   │   └── cartPendulum/
│   │       ├── types.ts              # CartPendulumState, CartPendulumConfig
│   │       ├── physics.ts            # Lagrangian EOM derivatives
│   │       ├── renderer.ts           # Canvas drawing
│   │       └── rig.ts                # Rig implementation
│   ├── engine/
│   │   ├── rk4.ts                    # Generic RK4 integrator
│   │   ├── SimulationEngine.ts       # Fixed-timestep loop, history, NaN guard
│   │   └── controllerSandbox.ts      # Safe compilation of user code
│   ├── components/
│   │   ├── Layout.tsx                # CSS Grid shell
│   │   ├── Toolbar.tsx               # Play/Pause/Reset/Speed
│   │   ├── SimCanvas.tsx             # Canvas + rAF render loop
│   │   ├── CodeEditor.tsx            # CodeMirror wrapper
│   │   ├── ParameterPanel.tsx        # Dynamic sliders from rig defs
│   │   ├── InitialConditionsPanel.tsx
│   │   ├── TimePlots.tsx             # uPlot streaming charts
│   │   └── RigSelector.tsx           # Rig dropdown (1 option for V1)
│   ├── hooks/
│   │   ├── useSimulation.ts          # Owns engine, exposes state to React
│   │   ├── useAnimationFrame.ts      # rAF loop with cleanup
│   │   └── useControllerCompiler.ts  # Debounced code compilation
│   ├── constants/
│   │   └── defaults.ts               # Default controller code (sample PID)
│   └── utils/
│       ├── math.ts                   # clamp, wrapAngle, isFiniteState
│       └── history.ts                # Ring buffer for time-series
```

## Physics: Cart-Pendulum Model

Full nonlinear equations from Lagrangian mechanics. State: `[x, x_dot, theta, theta_dot]`.

Two coupled equations solved via Cramer's rule:

```
Determinant: D = l * (M + m * sin^2(theta))

x_ddot = [l * (F - b * x_dot + m * l * theta_dot^2 * sin(theta)) - m * l * cos(theta) * g * sin(theta)] / D

theta_ddot = [(M + m) * g * sin(theta) - cos(theta) * (F - b * x_dot + m * l * theta_dot^2 * sin(theta))] / D
```

Parameters: cart mass M, bob mass m, rod length l, gravity g, friction b, max force limit.

**Integration**: RK4 at 1ms fixed timestep — 4th-order accurate, stable even for full-rotation swings.

## Engine Design

`SimulationEngine` is a plain TypeScript class (not a React component):

- **Fixed timestep accumulator**: each `step(wallDt)` adds `wallDt * speedMultiplier` to an accumulator, then drains it in 1ms chunks via RK4
- **Accumulator cap**: 100ms max to prevent spiral-of-death
- **Per-step**: evaluate user controller -> NaN guard -> clamp force -> RK4 -> divergence check -> record history (every 10th step)
- **History**: ring buffer (~5000 entries = 50s at 10ms sample rate)

## Controller Sandbox

User code is compiled via `new Function()` with `"use strict"`. The user writes:

```javascript
function controller(state, dt) {
    // state.angle, state.angularVelocity, state.cartPosition, state.cartVelocity
    // Return a force value (Newtons) to apply to the cart
    return 0;
}
```

Safety: try/catch on every invocation, NaN guard on return, force clamped to `[-maxForce, maxForce]`, compilation errors shown in UI.

## Default Sample Controller

A PD controller as a starting template (not built-in — just default editor content):

```javascript
function controller(state, dt) {
    // PD gains for pendulum angle
    const Kp = 50;
    const Kd = 10;

    // PD gains for cart centering
    const Kx = 2;
    const Kv = 4;

    // Pendulum stabilization
    const pendulumForce = -(Kp * state.angle + Kd * state.angularVelocity);

    // Cart centering
    const cartForce = -(Kx * state.cartPosition + Kv * state.cartVelocity);

    return pendulumForce + cartForce;
}
```

## UI Layout

```
+-----------------------------------------------+
|  Toolbar: [> Pause] [Reset] [0.5x 1x 2x 4x]  |
|  Rig: [Cart Pendulum v]  Time: 12.34s         |
+-------------------------+---------------------+
|                         |  Code Editor         |
|    Canvas Visualization |  (CodeMirror)        |
|    - Cart on track      |                      |
|    - Pendulum rod + bob |---------------------|
|    - Force arrow        |  Parameters          |
|    - State readout      |  (sliders)           |
|                         |  Initial Conditions  |
+-------------------------+---------------------+
|  Time Plots: angle | cart position | force     |
+-----------------------------------------------+
```

Grid: `1fr 400px` columns, `48px 1fr 250px` rows, `100vh` height.

## Canvas Rendering

- Track with tick marks at regular intervals
- Cart as filled rectangle at scaled position
- Pendulum rod from cart pivot to bob position: `pivot + (l * sin(theta), -l * cos(theta))`
- Bob as filled circle, radius proportional to `sqrt(mass)`
- Force arrow on cart showing control force direction/magnitude
- Real-time state readout overlay (angle, velocity, position)
- Retina support: canvas dimensions = `clientWidth * devicePixelRatio`

## Implementation Phases

### Phase 1: Scaffold + Types (~8 files)
1. `npm create vite@latest . -- --template react-ts`
2. Install deps: `@uiw/react-codemirror`, `@codemirror/lang-javascript`, `@codemirror/theme-one-dark`, `uplot`, `uplot-react`
3. Configure Vite path aliases (`@/` -> `src/`)
4. Create type definitions: `Rig.ts`, `Simulation.ts`, `Controller.ts`
5. Implement utilities: `math.ts`, `history.ts`

### Phase 2: Physics + Rig (~5 files)
1. Generic RK4 integrator (`rk4.ts`)
2. Cart pendulum types, physics, renderer, rig object
3. Rig registry

### Phase 3: Engine (~2 files)
1. Controller sandbox (`controllerSandbox.ts`)
2. Simulation engine class (`SimulationEngine.ts`)

### Phase 4: UI Shell (~6 files)
1. Layout, Toolbar, SimCanvas
2. `useAnimationFrame`, `useSimulation` hooks
3. App.tsx wiring
4. **Milestone**: pendulum visible and animating

### Phase 5: Interactivity (~4 files)
1. CodeEditor with error display
2. `useControllerCompiler` hook
3. ParameterPanel, InitialConditionsPanel

### Phase 6: Plots (~1 file)
1. TimePlots with uPlot streaming via ref (no React re-renders per frame)

### Phase 7: Polish (~2 files)
1. RigSelector, defaults.ts
2. Divergence warnings, responsive layout, styling

## Verification

1. `npm run dev` — app loads without errors
2. Pendulum falls from initial angle with no controller (gravity works)
3. Default PID controller balances pendulum from ~10 degree offset
4. Parameter sliders change physics in real-time
5. Code editor accepts custom controller, compilation errors shown inline
6. Time plots stream data in real-time
7. Reset clears state and restarts from initial conditions
8. Speed controls affect simulation rate correctly
