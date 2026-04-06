/**
 * Test 1: Energy Conservation
 *
 * With no friction (b=0) and no controller, total mechanical energy should
 * be conserved. Any drift beyond floating-point noise indicates a bug in
 * the equations of motion or the RK4 integrator.
 *
 * Total energy = cart KE + pendulum KE + pendulum PE
 *   KE_cart    = 0.5 * M * xDot^2
 *   KE_pend    = 0.5 * m * (vx^2 + vy^2)  where (vx, vy) is the bob velocity
 *   PE_pend    = m * g * h               where h = l * cos(theta) (up from pivot)
 *
 * Bob velocity in world frame:
 *   vx = xDot + l * thetaDot * cos(theta)
 *   vy = l * thetaDot * sin(theta)
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testEnergyConservation.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.001;
const SIM_DURATION = 60;
const TOTAL_STEPS = Math.round(SIM_DURATION / FIXED_DT);
const PRINT_EVERY = Math.round(1 / FIXED_DT); // every 1 second

const config: CartPendulumConfig = {
    M: 1.0,
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0, // no friction — energy must be conserved
    maxForce: 0
};

// Start with a large angle so there's significant energy exchange
let state: CartPendulumState = {
    x: 0,
    xDot: 0,
    theta: Math.PI / 3, // 60 degrees
    thetaDot: 0
};

function totalEnergy(s: CartPendulumState, c: CartPendulumConfig): number {
    const { M, m, l, g } = c;

    // Cart kinetic energy
    const kCart = 0.5 * M * s.xDot * s.xDot;

    // Bob velocity in world frame
    const vxBob = s.xDot + l * s.thetaDot * Math.cos(s.theta);
    const vyBob = l * s.thetaDot * Math.sin(s.theta);
    const kPend = 0.5 * m * (vxBob * vxBob + vyBob * vyBob);

    // Bob height relative to pivot (positive = up)
    // theta=0 is straight up, so h = l*cos(theta)
    const h = l * Math.cos(s.theta);
    const pPend = -m * g * h; // PE = -mgh (lower = more PE when measured from top)

    return kCart + kPend + pPend;
}

const E0 = totalEnergy(state, config);

console.log("=== Energy Conservation Test ===");
console.log(`Duration: ${SIM_DURATION}s | Timestep: ${FIXED_DT * 1000}ms | Initial angle: 60 deg`);
console.log(`Config: M=${config.M} m=${config.m} l=${config.l} g=${config.g} b=${config.b} (no friction)`);
console.log(`Initial energy: ${E0.toFixed(6)} J`);
console.log("");
console.log("  time(s) |  energy(J)  |  drift(J)   |  drift(%)   |  angle(deg)");
console.log("  --------|-------------|-------------|-------------|------------");

let maxDrift = 0;
let maxDriftPct = 0;

for (let step = 0; step <= TOTAL_STEPS; step++) {
    const time = step * FIXED_DT;

    if (step % PRINT_EVERY === 0) {
        const E = totalEnergy(state, config);
        const drift = E - E0;
        const driftPct = (drift / Math.abs(E0)) * 100;
        const angleDeg = (state.theta * 180) / Math.PI;

        if (Math.abs(drift) > Math.abs(maxDrift)) {
            maxDrift = drift;
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
console.log(`  Max energy drift: ${maxDrift.toExponential(4)} J (${maxDriftPct.toExponential(4)}%)`);
console.log(`  Verdict: ${Math.abs(maxDriftPct) < 0.01 ? "PASS — energy conserved within 0.01%" : "FAIL — energy drift exceeds 0.01%"}`);
