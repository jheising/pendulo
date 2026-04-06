/**
 * Test 2: Small-Angle Period
 *
 * Oscillation around the natural hanging equilibrium (theta = pi).
 * For a fixed-pivot pendulum, small oscillations around the bottom have period:
 *   T = 2 * pi * sqrt(l / g)
 *
 * We use a very heavy cart (M=10000) so it barely moves,
 * and start at theta = pi + 0.017 (~1 degree offset from hanging).
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testSmallAnglePeriod.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.0001; // 0.1ms for precision
const SIM_DURATION = 30;
const TOTAL_STEPS = Math.round(SIM_DURATION / FIXED_DT);

const config: CartPendulumConfig = {
    M: 10000,
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0,
    maxForce: 0
};

const offsetRad = 1 * (Math.PI / 180); // 1 degree

let state: CartPendulumState = {
    x: 0,
    xDot: 0,
    theta: Math.PI + offsetRad, // 1 degree past hanging-down
    thetaDot: 0
};

const analyticalPeriod = 2 * Math.PI * Math.sqrt(config.l / config.g);

console.log("=== Small-Angle Period Test ===");
console.log(`Duration: ${SIM_DURATION}s | Timestep: ${FIXED_DT * 1000}ms`);
console.log(`Initial theta: pi + 1 deg (small oscillation around hanging equilibrium)`);
console.log(`Analytical period: T = 2*pi*sqrt(l/g) = ${analyticalPeriod.toFixed(6)}s`);
console.log("");

// Track zero crossings of (theta - pi), i.e. when oscillation crosses equilibrium
// going from positive to negative
const zeroCrossings: number[] = [];
let prevOffset = state.theta - Math.PI;

for (let step = 0; step < TOTAL_STEPS; step++) {
    state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => cartPendulumDerivatives(s, config, 0));
    const time = (step + 1) * FIXED_DT;
    const offset = state.theta - Math.PI;

    // Detect positive-to-negative zero crossing of the offset
    if (prevOffset > 0 && offset <= 0) {
        const frac = prevOffset / (prevOffset - offset);
        const crossTime = time - FIXED_DT + frac * FIXED_DT;
        zeroCrossings.push(crossTime);
    }

    prevOffset = offset;
}

console.log("  Zero crossings (offset goes positive → negative):");
const periods: number[] = [];
for (let i = 0; i < zeroCrossings.length; i++) {
    const t = zeroCrossings[i];
    if (i >= 1) {
        // Each consecutive same-direction crossing is one full period
        const period = zeroCrossings[i] - zeroCrossings[i - 1];
        periods.push(period);
        const errorPct = ((period - analyticalPeriod) / analyticalPeriod) * 100;
        console.log(`    crossing ${i}: t=${t.toFixed(6)}s  period=${period.toFixed(6)}s  error=${errorPct.toExponential(3)}%`);
    } else {
        console.log(`    crossing ${i}: t=${t.toFixed(6)}s`);
    }
}

const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
const avgError = ((avgPeriod - analyticalPeriod) / analyticalPeriod) * 100;

console.log("");
console.log("=== Result ===");
console.log(`  Analytical period:   ${analyticalPeriod.toFixed(6)}s`);
console.log(`  Measured avg period: ${avgPeriod.toFixed(6)}s`);
console.log(`  Average error:       ${avgError.toExponential(4)}%`);
console.log(`  Periods measured:    ${periods.length}`);
console.log(`  Verdict: ${Math.abs(avgError) < 0.01 ? "PASS — period matches within 0.01%" : "FAIL — period error exceeds 0.01%"}`);
