/**
 * Test 1: Energy Conservation
 *
 * With no friction (b=0) and no controller, total mechanical energy must
 * be conserved. Any drift beyond floating-point noise indicates a bug.
 *
 * Convention: theta=0 is UPRIGHT. Bob position relative to pivot in world
 * coordinates (y-up): (l*sin(theta), l*cos(theta)).
 *
 * Total energy for the coupled cart-pendulum:
 *   KE = 0.5*M*xDot^2 + 0.5*m*((xDot + l*thetaDot*cos(theta))^2 + (l*thetaDot*sin(theta))^2)
 *   PE = m*g*l*cos(theta)
 *   E  = KE + PE
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testEnergyConservation.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.001;
const SIM_DURATION = 60;
const TOTAL_STEPS = Math.round(SIM_DURATION / FIXED_DT);
const PRINT_EVERY = Math.round(5 / FIXED_DT);

const config: CartPendulumConfig = {
    M: 1.0,
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0,
    maxForce: 0
};

// Start near upright with a push — gives rich coupled dynamics
let state: CartPendulumState = {
    x: 0,
    xDot: 0,
    theta: Math.PI / 3, // 60 degrees from upright
    thetaDot: 0
};

function totalEnergy(s: CartPendulumState, c: CartPendulumConfig): number {
    const { M, m, l, g } = c;

    // Cart kinetic energy
    const keCart = 0.5 * M * s.xDot * s.xDot;

    // Bob velocity in world frame
    const vxBob = s.xDot + l * s.thetaDot * Math.cos(s.theta);
    const vyBob = -l * s.thetaDot * Math.sin(s.theta);
    const keBob = 0.5 * m * (vxBob * vxBob + vyBob * vyBob);

    // Bob height = l*cos(theta), so PE = m*g*l*cos(theta)
    // theta=0 (up): PE = +mgl (maximum), theta=pi (down): PE = -mgl (minimum)
    const pe = m * g * l * Math.cos(s.theta);

    return keCart + keBob + pe;
}

const E0 = totalEnergy(state, config);

console.log("=== Energy Conservation Test ===");
console.log(`Duration: ${SIM_DURATION}s | Timestep: ${FIXED_DT * 1000}ms | Initial angle: 60 deg from upright`);
console.log(`Config: M=${config.M} m=${config.m} l=${config.l} g=${config.g} b=${config.b}`);
console.log(`Initial energy: ${E0.toFixed(6)} J`);
console.log("");
console.log("  time(s) |  energy(J)  |  drift(J)   |  drift(%)   |  angle(deg)");
console.log("  --------|-------------|-------------|-------------|------------");

let maxDriftPct = 0;

for (let step = 0; step <= TOTAL_STEPS; step++) {
    const time = step * FIXED_DT;

    if (step % PRINT_EVERY === 0) {
        const E = totalEnergy(state, config);
        const drift = E - E0;
        const driftPct = E0 !== 0 ? (drift / Math.abs(E0)) * 100 : 0;
        const angleDeg = (state.theta * 180) / Math.PI;

        if (Math.abs(driftPct) > Math.abs(maxDriftPct)) {
            maxDriftPct = driftPct;
        }

        console.log(
            `  ${time.toFixed(0).padStart(7)} | ${E.toFixed(6).padStart(11)} | ${drift.toExponential(3).padStart(11)} | ${driftPct.toExponential(3).padStart(11)} | ${angleDeg.toFixed(2).padStart(10)}`
        );
    }

    if (step === TOTAL_STEPS) break;
    state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => cartPendulumDerivatives(s, config, 0));
}

console.log("");
console.log("=== Result ===");
console.log(`  Max energy drift: ${maxDriftPct.toExponential(4)}%`);
console.log(`  Verdict: ${Math.abs(maxDriftPct) < 0.01 ? "PASS — energy conserved within 0.01%" : Math.abs(maxDriftPct) < 1 ? "MARGINAL — drift < 1%" : "FAIL — significant energy drift"}`);
