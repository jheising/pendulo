# Pendulo

A browser-based inverted pendulum simulator where you write custom control algorithms to balance a pendulum on a moving cart. Built with physically accurate simulation (full nonlinear Lagrangian mechanics, RK4 integration) suitable for real control algorithm development.

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal. Hit **Play**, and the default PD controller will balance the pendulum from a 10-degree offset.

## How It Works

### The Simulator

The simulation canvas shows a cart on a track with a pendulum rod and bob. The cart applies a horizontal force (controlled by your algorithm) to keep the pendulum balanced upright.

- **Click near the pendulum bob** to perturb it — closer clicks apply stronger impulses, pushing the bob in the opposite direction
- **Resize any pane** by dragging the borders between the canvas, code editor, parameter panels, and plots
- All layout sizes, code, and parameters are **persisted to localStorage** across sessions

### Writing a Controller

The code editor on the right accepts a JavaScript function with this signature:

```javascript
function controller(state, dt) {
    // state.angle           - pendulum angle from vertical (rad), 0 = upright
    // state.angularVelocity - angular velocity (rad/s)
    // state.cartPosition    - cart position (m)
    // state.cartVelocity    - cart velocity (m/s)
    // dt                    - timestep (s)
    //
    // Return a force value (Newtons) to apply to the cart.
    return 0;
}
```

The default controller uses full state feedback:

```javascript
function controller(state, dt) {
    const Kp = 150;  // pendulum angle gain
    const Kd = 30;   // angular velocity gain
    const Kx = 4;    // cart position gain
    const Kv = 10;   // cart velocity gain

    return Kp * state.angle + Kd * state.angularVelocity
         + Kx * state.cartPosition + Kv * state.cartVelocity;
}
```

All four gains have the **same sign** — the cart position terms nudge the pendulum to lean toward center, which indirectly brings the cart back. This settles from a 10-degree offset in under 2 seconds with no overshoot.

Code is compiled on the fly with a 300ms debounce. Compilation errors appear below the editor. If your controller throws or returns NaN, it's safely caught and treated as zero force.

### Parameter Presets

The **Preset** dropdown above the parameter sliders offers several configurations:

| Preset | Description |
|--------|-------------|
| Wheeled Cart | Standard cart on wheels (default) |
| Linear Actuator | Low-mass carriage on a belt-driven rail |
| Segway | Heavy platform with rider, high-torque wheels |
| Long Rod | 3m pendulum with slow, dramatic swings |
| Heavy Bob | 2kg tip mass, harder to control |
| Moon Gravity | Same cart at 1/6th Earth gravity |

Select a preset to populate the sliders, then tweak individual parameters. Use the **Reset** button to restore defaults.

### Time Plots

The chart at the bottom streams angle, cart position, and control force in real time. Click any series in the legend to toggle it on or off.

## Physics

Full nonlinear equations of motion derived from Lagrangian mechanics for a pendulum on a moving cart. State vector: `[x, x_dot, theta, theta_dot]`.

Two coupled second-order ODEs solved via Cramer's rule:

```
D = l * (M + m * sin^2(theta))

x_ddot     = [l*(F - b*x_dot + m*l*theta_dot^2*sin(theta)) - m*l*cos(theta)*g*sin(theta)] / D
theta_ddot = [(M+m)*g*sin(theta) - cos(theta)*(F - b*x_dot + m*l*theta_dot^2*sin(theta))] / D
```

Integrated with a 4th-order Runge-Kutta scheme at a 1ms fixed timestep. An accumulator pattern handles variable frame rates while maintaining fixed physics steps.

### Verified Accuracy

Three headless physics tests validate the simulation (run with `npx tsx --tsconfig tsconfig.app.json scripts/<test>.ts`):

| Test | What it validates | Result |
|------|-------------------|--------|
| `testEnergyConservation` | Total energy drift over 60s with no friction | < 10^-9% drift |
| `testSmallAnglePeriod` | Oscillation period vs. T = 2pi*sqrt(l/g) | 0.0004% error |
| `testFreeFall` | KE at bottom vs. energy conservation prediction | 0.00015% error |

## Headless Mode

The `scripts/` directory contains headless simulation runners that bypass the browser entirely:

```bash
# Tune controller gains — prints state table and balance metrics
npx tsx --tsconfig tsconfig.app.json scripts/tuneController.ts

# Run physics validation tests
npx tsx --tsconfig tsconfig.app.json scripts/testEnergyConservation.ts
npx tsx --tsconfig tsconfig.app.json scripts/testSmallAnglePeriod.ts
npx tsx --tsconfig tsconfig.app.json scripts/testFreeFall.ts
```

Edit the controller code and parameters directly in `scripts/tuneController.ts` to iterate on gains without a browser.

## Architecture

The codebase is organized around a generic **Rig** interface. Every simulation model implements `Rig<S, C>` (state and config types), and the engine, UI, plots, and editor all work through it. Adding a future rig (e.g., reaction-wheel balancer) means implementing the interface and registering it — nothing else changes.

```
src/
  types/          Rig, Simulation, Controller interfaces
  rigs/           Rig implementations (cartPendulum/)
  engine/         RK4 integrator, SimulationEngine, controller sandbox
  components/     React UI components
  hooks/          useSimulation, useAnimationFrame, useControllerCompiler,
                  useResizable, usePersistedState
  constants/      Default controller code
  utils/          Math helpers, ring buffer
```

## Tech Stack

- **React + Vite + TypeScript**
- **Canvas API** for simulation rendering
- **CodeMirror 6** via `@uiw/react-codemirror` for the code editor
- **Chart.js** for real-time time-series plots
- **Custom physics** — Lagrangian EOM, RK4 integration, no physics engine

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Type-check and build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```
