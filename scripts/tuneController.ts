/**
 * Headless simulation runner for tuning the controller.
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/tuneController.ts
 */
import { cartPendulumRig } from "../src/rigs/cartPendulum/rig";
import { compileController } from "../src/engine/controllerSandbox";
import { rk4Step } from "../src/engine/rk4";
import { clamp, isFiniteState } from "../src/utils/math";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.001;
const SIM_DURATION = 15; // seconds
const PRINT_INTERVAL = 0.25; // print state every 250ms of sim time
const TOTAL_STEPS = Math.round(SIM_DURATION / FIXED_DT);
const PRINT_EVERY = Math.round(PRINT_INTERVAL / FIXED_DT);

// Allow passing controller code as a file argument, otherwise use default
const controllerCode = `
function controller(state, dt) {
    // PD gains for pendulum angle (positive: push cart toward the lean to catch it)
    const Kp = 150;
    const Kd = 30;

    // PD gains for cart centering (gentle — must not fight the pendulum controller)
    const Kx = 4;
    const Kv = 10;

    // Full state feedback: all terms same sign
    // Cart terms push WITH the displacement to indirectly lean the pendulum back
    return Kp * state.angle + Kd * state.angularVelocity + Kx * state.cartPosition + Kv * state.cartVelocity;
}`;

const rig = cartPendulumRig;
const config: CartPendulumConfig = {
    ...rig.defaultConfig,
    // Linear actuator: low-mass carriage, no passive friction, high force authority
    M: 0.1,
    b: 0,
    maxForce: 50
};
let state: CartPendulumState = { ...rig.defaultState };

const compiled = compileController(controllerCode);
if (!compiled.success || !compiled.controller) {
    console.error("Controller compilation failed:", compiled.error);
    process.exit(1);
}

const controllerFn = compiled.controller;

console.log("=== Pendulo Headless Simulation ===");
console.log(`Duration: ${SIM_DURATION}s | Timestep: ${FIXED_DT * 1000}ms | Initial angle: ${((state.theta * 180) / Math.PI).toFixed(1)} deg`);
console.log(`Config: M=${config.M} m=${config.m} l=${config.l} g=${config.g} b=${config.b} maxForce=${config.maxForce}`);
console.log("");
console.log("  time(s) |  angle(deg) |  ang_vel(r/s) |   cart_x(m) |  cart_v(m/s) |  force(N)");
console.log("  --------|-------------|---------------|-------------|--------------|----------");

let lastForce = 0;
let maxAngle = 0;
let settled = false;
let settledTime = -1;

for (let step = 0; step <= TOTAL_STEPS; step++) {
    const time = step * FIXED_DT;

    // Print at intervals
    if (step % PRINT_EVERY === 0) {
        const angleDeg = (state.theta * 180) / Math.PI;
        console.log(
            `  ${time.toFixed(2).padStart(7)} | ${angleDeg.toFixed(3).padStart(11)} | ${state.thetaDot.toFixed(4).padStart(13)} | ${state.x.toFixed(4).padStart(11)} | ${state.xDot.toFixed(4).padStart(12)} | ${lastForce.toFixed(2).padStart(9)}`
        );
    }

    // Track max angle
    maxAngle = Math.max(maxAngle, Math.abs(state.theta));

    // Check if settled (angle < 0.5 deg and angular velocity < 0.1 rad/s for the first time)
    if (!settled && Math.abs(state.theta) < 0.5 * (Math.PI / 180) && Math.abs(state.thetaDot) < 0.1) {
        settled = true;
        settledTime = time;
    }

    if (step === TOTAL_STEPS) break;

    // Evaluate controller
    const controllerInput = rig.getControllerInput(state);
    let force = controllerFn(controllerInput, FIXED_DT);
    force = clamp(force, -config.maxForce, config.maxForce);
    lastForce = force;

    // RK4 step
    const capturedForce = force;
    state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => rig.derivatives(s, config, capturedForce));

    // Divergence check
    if (!isFiniteState(state)) {
        console.log("\n  *** DIVERGED at t=" + time.toFixed(3) + "s ***");
        process.exit(1);
    }
}

console.log("");
console.log("=== Summary ===");
console.log(`  Max angle:     ${((maxAngle * 180) / Math.PI).toFixed(2)} deg`);
console.log(`  Final angle:   ${((state.theta * 180) / Math.PI).toFixed(4)} deg`);
console.log(`  Final cart x:  ${state.x.toFixed(4)} m`);
console.log(`  Settled:       ${settled ? `yes, at t=${settledTime.toFixed(2)}s` : "no"}`);
console.log(`  Status:        ${Math.abs(state.theta) < 1 * (Math.PI / 180) ? "BALANCED" : "NOT BALANCED"}`);
