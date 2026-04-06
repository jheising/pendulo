/**
 * Test 2: Small-Angle Period
 *
 * For small oscillations of a simple pendulum, the period is:
 *   T = 2 * pi * sqrt(l / g)
 *
 * With l=1, g=9.81: T_analytical = 2.0060666...s
 *
 * We fix the cart (M very large so it barely moves) and start at a small
 * angle (1 degree), then measure zero-crossings to determine the period.
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testSmallAnglePeriod.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.0001; // 0.1ms for high precision period measurement
const SIM_DURATION = 30;
const TOTAL_STEPS = Math.round(SIM_DURATION / FIXED_DT);

const config: CartPendulumConfig = {
    M: 1000, // very heavy cart — effectively fixed
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0,
    maxForce: 0
};

const smallAngle = 1 * (Math.PI / 180); // 1 degree

let state: CartPendulumState = {
    x: 0,
    xDot: 0,
    theta: smallAngle,
    thetaDot: 0
};

const analyticalPeriod = 2 * Math.PI * Math.sqrt(config.l / config.g);

console.log("=== Small-Angle Period Test ===");
console.log(`Duration: ${SIM_DURATION}s | Timestep: ${FIXED_DT * 1000}ms | Initial angle: 1 deg`);
console.log(`Analytical period: T = 2*pi*sqrt(l/g) = ${analyticalPeriod.toFixed(6)}s`);
console.log("");

// Track zero crossings (theta going from positive to negative)
const zeroCrossings: number[] = [];
let prevTheta = state.theta;

for (let step = 0; step < TOTAL_STEPS; step++) {
    state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => cartPendulumDerivatives(s, config, 0));
    const time = (step + 1) * FIXED_DT;

    // Detect positive-to-negative zero crossing
    if (prevTheta > 0 && state.theta <= 0) {
        // Linear interpolation for precise crossing time
        const frac = prevTheta / (prevTheta - state.theta);
        const crossTime = time - FIXED_DT + frac * FIXED_DT;
        zeroCrossings.push(crossTime);
    }

    prevTheta = state.theta;
}

// Every other zero crossing completes a full period
console.log("  Zero crossings (positive→negative):");
const periods: number[] = [];
for (let i = 0; i < zeroCrossings.length; i++) {
    const t = zeroCrossings[i];
    if (i >= 2) {
        // Period = time between every other zero crossing
        const period = zeroCrossings[i] - zeroCrossings[i - 2];
        periods.push(period);
        const error = period - analyticalPeriod;
        const errorPct = (error / analyticalPeriod) * 100;
        console.log(`    crossing ${i}: t=${t.toFixed(6)}s  period=${period.toFixed(6)}s  error=${errorPct.toExponential(3)}%`);
    } else {
        console.log(`    crossing ${i}: t=${t.toFixed(6)}s`);
    }
}

const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
const avgError = ((avgPeriod - analyticalPeriod) / analyticalPeriod) * 100;

console.log("");
console.log("=== Result ===");
console.log(`  Analytical period:  ${analyticalPeriod.toFixed(6)}s`);
console.log(`  Measured avg period: ${avgPeriod.toFixed(6)}s`);
console.log(`  Average error:       ${avgError.toExponential(4)}%`);
console.log(`  Periods measured:    ${periods.length}`);
console.log(`  Verdict: ${Math.abs(avgError) < 0.01 ? "PASS — period matches within 0.01%" : "FAIL — period error exceeds 0.01%"}`);
