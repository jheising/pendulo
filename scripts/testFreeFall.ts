/**
 * Test 3: Free Fall — Energy Conservation Check at Specific Points
 *
 * With a very heavy cart (effectively fixed) and no friction, release the
 * pendulum from various angles and verify the speed at the bottom (theta=pi)
 * matches the energy conservation prediction.
 *
 * Convention: theta=0 is UP, theta=pi is DOWN (hanging).
 * PE = m*g*l*cos(theta), so releasing from theta0 with E = mgl*cos(theta0),
 * at the bottom (theta=pi): 0.5*m*l^2*w^2 + mgl*cos(pi) = mgl*cos(theta0)
 *   => w = sqrt(2*g*(cos(theta0) - cos(pi)) / l) = sqrt(2*g*(cos(theta0) + 1) / l)
 *
 * Usage: npx tsx --tsconfig tsconfig.app.json scripts/testFreeFall.ts
 */
import { rk4Step } from "../src/engine/rk4";
import { cartPendulumDerivatives } from "../src/rigs/cartPendulum/physics";
import { isFiniteState } from "../src/utils/math";
import type { CartPendulumState, CartPendulumConfig } from "../src/rigs/cartPendulum/types";

const FIXED_DT = 0.0001;

const config: CartPendulumConfig = {
    M: 100000, // effectively fixed cart
    m: 0.3,
    l: 1.0,
    g: 9.81,
    b: 0,
    maxForce: 0
};

interface TestCase {
    name: string;
    theta0: number;
}

const testCases: TestCase[] = [
    { name: "Release from 30 deg (near top)", theta0: (30 * Math.PI) / 180 },
    { name: "Release from 90 deg (horizontal)", theta0: Math.PI / 2 },
    { name: "Release from 150 deg (near bottom)", theta0: (150 * Math.PI) / 180 }
];

console.log("=== Free Fall Velocity Test ===");
console.log(`Timestep: ${FIXED_DT * 1000}ms | Cart mass: ${config.M}kg (effectively fixed)`);
console.log(`Convention: theta=0 is UP, theta=pi is DOWN`);
console.log("");

let allPass = true;

for (const tc of testCases) {
    // Expected angular velocity at the bottom (theta=pi)
    // From energy: 0.5*l*w^2 = g*(cos(theta0) + 1)
    const expectedSpeed = Math.sqrt((2 * config.g * (Math.cos(tc.theta0) + 1)) / config.l);

    let state: CartPendulumState = {
        x: 0,
        xDot: 0,
        theta: tc.theta0,
        thetaDot: 0
    };

    // Simulate and find the angular velocity when theta is closest to pi
    let bestThetaDot = 0;
    let bestThetaDist = Infinity;
    const maxSteps = Math.round(10 / FIXED_DT);

    for (let step = 0; step < maxSteps; step++) {
        state = rk4Step(state, FIXED_DT, (s: CartPendulumState) => cartPendulumDerivatives(s, config, 0));

        if (!isFiniteState(state)) break;

        // How close is theta to pi (mod 2pi)?
        const dist = Math.abs(((state.theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (dist < bestThetaDist) {
            bestThetaDist = dist;
            bestThetaDot = Math.abs(state.thetaDot);
        }

        // Stop once we've passed through pi and theta is moving away
        if (bestThetaDist < 0.001 && dist > 0.1) break;
    }

    const error = bestThetaDot - expectedSpeed;
    const errorPct = expectedSpeed > 0 ? (error / expectedSpeed) * 100 : 0;
    const pass = Math.abs(errorPct) < 0.1;
    if (!pass) allPass = false;

    console.log(`  --- ${tc.name} ---`);
    console.log(`  Release angle:     ${((tc.theta0 * 180) / Math.PI).toFixed(1)} deg`);
    console.log(`  Expected |w| at bottom: ${expectedSpeed.toFixed(6)} rad/s`);
    console.log(`  Measured |w| at bottom: ${bestThetaDot.toFixed(6)} rad/s`);
    console.log(`  Closest to pi:     ${bestThetaDist.toExponential(3)} rad`);
    console.log(`  Error:             ${errorPct.toExponential(3)}%`);
    console.log(`  Verdict:           ${pass ? "PASS" : "FAIL"}`);
    console.log("");
}

console.log(`=== Overall: ${allPass ? "ALL PASS" : "SOME FAILED"} ===`);
