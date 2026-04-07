export const DEFAULT_CONTROLLER_CODE = `function controller(state, dt) {
    // Physical constants (must match the rig parameters)
    const m = 0.3, l = 1.0, g = 9.81;
    const omega = state.angularVelocity;

    // Wrap the angle to [-pi, pi] so it works after full rotations
    let theta = state.angle % (2 * Math.PI);
    if (theta > Math.PI) theta -= 2 * Math.PI;
    if (theta < -Math.PI) theta += 2 * Math.PI;

    // How much energy does the pendulum have right now?
    // E = 0 means exactly enough to balance upright.
    // E < 0 means not enough energy (hanging low).
    const E = 0.5 * m * l * l * omega * omega
            + m * g * l * (Math.cos(theta) - 1);

    // =============================================
    // PHASE 1: BALANCE (when the pendulum is near upright)
    // =============================================
    // Uses LQR (Linear Quadratic Regulator) — an optimal control
    // method that uses all four state variables at once.
    // The gains were computed by solving the algebraic Riccati
    // equation for our system parameters.
    //
    // The "dynamic clamp" limits how hard we push the cart
    // right after catching the pendulum. Without it, the cart's
    // built-up momentum from the swing-up would overwhelm the
    // pendulum and knock it over.

    if (Math.abs(theta) < 1.0 && Math.abs(omega) < 5) {
        // Pendulum stabilization (keeps it upright)
        const pendulumForce = 150.32 * theta + 53.33 * omega;

        // Cart centering (returns cart to track origin)
        const cartForce = 22.36 * state.cartPosition
                        + 30.35 * state.cartVelocity;

        // How stable are we? 0 = just caught, 1 = perfectly upright
        const stability = 1 - Math.min(Math.abs(theta), 1);

        // Allow more cart force as the pendulum stabilizes:
        // just caught → max 8N, well balanced → max 30N
        const maxCart = 8 + 22 * stability;
        const clamped = Math.max(-maxCart, Math.min(maxCart, cartForce));

        return pendulumForce + clamped;
    }

    // =============================================
    // PHASE 2: SWING-UP (when the pendulum is far from upright)
    // =============================================
    // Uses the Astrom energy method: push the cart in the
    // direction the pendulum bob is already moving. This adds
    // energy to the pendulum on each swing, like pushing a
    // child on a playground swing. The force is proportional
    // to how far below the target energy we are, so it
    // automatically slows down as we approach the top.

    const ke = 4.0; // energy pumping gain
    const swingForce = ke * E * Math.sign(omega * Math.cos(theta));

    // Gently pull the cart back toward center during swing-up
    // so it doesn't drift too far from the track origin
    const centerForce = -(1.0 * state.cartPosition
                        + 2.0 * state.cartVelocity);

    return swingForce + centerForce;
}`;
