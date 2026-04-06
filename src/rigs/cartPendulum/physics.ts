import type { CartPendulumState, CartPendulumConfig } from "./types";

/**
 * Full nonlinear equations of motion from Lagrangian mechanics.
 * Solves two coupled 2nd-order ODEs via Cramer's rule.
 */
export function cartPendulumDerivatives(state: CartPendulumState, config: CartPendulumConfig, controlInput: number): CartPendulumState {
    const { x: _x, xDot, theta, thetaDot } = state;
    const { M, m, l, g, b } = config;

    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);
    const F = controlInput;

    // Determinant of the mass matrix
    const D = l * (M + m * sinTheta * sinTheta);

    // Coupled accelerations via Cramer's rule
    const xDDot = (l * (F - b * xDot + m * l * thetaDot * thetaDot * sinTheta) - m * l * cosTheta * g * sinTheta) / D;

    const thetaDDot = ((M + m) * g * sinTheta - cosTheta * (F - b * xDot + m * l * thetaDot * thetaDot * sinTheta)) / D;

    void _x; // position derivative is just velocity
    return {
        x: xDot,
        xDot: xDDot,
        theta: thetaDot,
        thetaDot: thetaDDot
    };
}
