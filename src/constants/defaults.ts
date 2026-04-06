export const DEFAULT_CONTROLLER_CODE = `function controller(state, dt) {
    // Full state feedback gains
    // Pendulum: push cart toward the lean to catch it
    const Kp = 150;
    const Kd = 30;

    // Cart centering: same sign — nudges pendulum to lean
    // toward center, which indirectly brings the cart back
    const Kx = 4;
    const Kv = 10;

    return Kp * state.angle + Kd * state.angularVelocity
         + Kx * state.cartPosition + Kv * state.cartVelocity;
}`;
