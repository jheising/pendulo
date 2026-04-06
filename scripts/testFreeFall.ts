/**
 * Test 3: Free Fall from Horizontal
 *
 * Release the pendulum from theta = pi/2 (horizontal) with the cart fixed.
 * At the bottom (theta = 0), all PE has converted to KE.
 *
 * Energy conservation gives:
 *   0.5 * m * l^2 * thetaDot^2 = m * g * l * (1 - cos(theta_0))
 *
 * For theta_0 = pi/2: thetaDot_at_bottom = sqrt(2*g/l) = sqrt(2*9.81/1) = 4.4294...
 *
 * We also test a full 180-degree release (theta = pi, straight down).
 * At the bottom: thetaDot = sqrt(4*g/l) = sqrt(4*9.81/1) = 6.2642...
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testFreeFall.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.0001; // high precision

const config: CartPendulumConfig = {
    M: 10000, // effectively fixed cart
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0,
    maxForce: 0
};

interface TestCase {
    name: string;
    theta0: number;
    expectedThetaDot: number;
}

const testCases: TestCase[] = [
    {
        name: "90-degree release (horizontal)",
        theta0: Math.PI / 2,
        // thetaDot at bottom = sqrt(2*g*(1-cos(theta0))/l) = sqrt(2*g/l) for theta0=pi/2
        expectedThetaDot: Math.sqrt((2 * config.g * (1 - Math.cos(Math.PI / 2))) / config.l)
    },
    {
        name: "180-degree release (straight down)",
        theta0: Math.PI - 0.001, // slightly off to avoid exact unstable equilibrium
        expectedThetaDot: Math.sqrt((2 * config.g * (1 - Math.cos(Math.PI - 0.001))) / config.l)
    },
    {
        name: "45-degree release",
        theta0: Math.PI / 4,
        expectedThetaDot: Math.sqrt((2 * config.g * (1 - Math.cos(Math.PI / 4))) / config.l)
    }
];

console.log("=== Free Fall Velocity Test ===");
console.log(`Timestep: ${FIXED_DT * 1000}ms | Cart mass: ${config.M}kg (effectively fixed)`);
console.log("");

let allPass = true;

for (const tc of testCases) {
    let state: CartPendulumState = {
        x: 0,
        xDot: 0,
        theta: tc.theta0,
        thetaDot: 0
    };

    // Simulate until the pendulum passes through theta = 0 (straight up)
    // Since we're measuring speed at the "top" in our convention (theta=0 = up),
    // we actually want to find when it passes through the bottom.
    // theta=0 is UP, so the bottom is theta = pi.
    // If we start at theta0 and swing, we need to track when |thetaDot| is maximum
    // (which occurs when theta passes through 0 for a release from small angles,
    //  or through the bottom for large angles).

    // For our convention: theta=0 is up, PE = -mgl*cos(theta)
    // Maximum KE occurs at the lowest point. For a pendulum released from theta0,
    // the lowest point is theta=0 (straight up is theta=0... wait)

    // Let me reconsider the convention: theta=0 is UPRIGHT (inverted pendulum up).
    // So the natural hanging position is theta=pi (down).
    // If we release from theta0, the bob falls DOWN (toward theta=pi) due to gravity.
    // The lowest point is theta=pi. But we want maximum speed, which is at the bottom.
    //
    // For release from theta0 < pi, the bob swings toward pi.
    // Maximum angular velocity occurs when passing through the natural equilibrium.
    //
    // Energy: E = 0.5*m*l^2*thetaDot^2 - m*g*l*cos(theta) (for fixed cart)
    // At start: E = -m*g*l*cos(theta0)  (thetaDot=0)
    // At max speed: 0.5*m*l^2*w^2 - m*g*l*cos(theta_at_max) = -m*g*l*cos(theta0)
    //
    // Max speed occurs at theta = pi (hanging straight down):
    // 0.5*l*w^2 + g*cos(pi) = -g*cos(theta0)
    // 0.5*l*w^2 - g = -g*cos(theta0)
    // 0.5*l*w^2 = g - g*cos(theta0) = g*(1 - cos(theta0))
    // w = sqrt(2*g*(1-cos(theta0))/l)  ✓

    let maxThetaDot = 0;
    let thetaAtMax = state.theta;
    const maxSteps = Math.round(10 / FIXED_DT);

    for (let step = 0; step < maxSteps; step++) {
        state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => cartPendulumDerivatives(s, config, 0));

        if (Math.abs(state.thetaDot) > Math.abs(maxThetaDot)) {
            maxThetaDot = state.thetaDot;
            thetaAtMax = state.theta;
        }

        // Stop after one full swing (when thetaDot changes sign after reaching max)
        if (Math.abs(maxThetaDot) > 0.1 && Math.abs(state.thetaDot) < Math.abs(maxThetaDot) * 0.5) {
            break;
        }
    }

    const measuredSpeed = Math.abs(maxThetaDot);
    const error = measuredSpeed - tc.expectedThetaDot;
    const errorPct = (error / tc.expectedThetaDot) * 100;
    const pass = Math.abs(errorPct) < 0.1;
    if (!pass) allPass = false;

    console.log(`  --- ${tc.name} ---`);
    console.log(`  Release angle:    ${((tc.theta0 * 180) / Math.PI).toFixed(2)} deg`);
    console.log(`  Expected thetaDot: ${tc.expectedThetaDot.toFixed(6)} rad/s`);
    console.log(`  Measured thetaDot: ${measuredSpeed.toFixed(6)} rad/s`);
    console.log(`  Theta at max:      ${((thetaAtMax * 180) / Math.PI).toFixed(2)} deg (expect ~180)`);
    console.log(`  Error:             ${errorPct.toExponential(3)}%`);
    console.log(`  Verdict:           ${pass ? "PASS" : "FAIL"}`);
    console.log("");
}

console.log(`=== Overall: ${allPass ? "ALL PASS" : "SOME FAILED"} ===`);
