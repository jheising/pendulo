import type { Rig, Dimensions, PlotDefinition, PerturbationResult, ConfigPreset, ControllerDocs } from "@/types/Rig";
import type { CartPendulumState, CartPendulumConfig } from "./types";
import { cartPendulumDerivatives } from "./physics";
import { renderCartPendulum, getBobScreenPosition } from "./renderer";

export const cartPendulumRig: Rig<CartPendulumState, CartPendulumConfig> = {
    name: "Cart Pendulum",
    description: "Classic inverted pendulum on a moving cart. Apply force to the cart to balance the pendulum upright.",

    defaultState: {
        x: 0,
        xDot: 0,
        theta: 0.17, // ~10 degrees
        thetaDot: 0
    },

    defaultConfig: {
        M: 1.0,
        m: 0.3,
        l: 1.0,
        g: 9.81,
        b: 0.1,
        maxForce: 30
    },

    derivatives(state: CartPendulumState, config: CartPendulumConfig, controlInput: number): CartPendulumState {
        return cartPendulumDerivatives(state, config, controlInput);
    },

    getControllerInput(state: CartPendulumState): Record<string, number> {
        return {
            angle: state.theta,
            angularVelocity: state.thetaDot,
            cartPosition: state.x,
            cartVelocity: state.xDot
        };
    },

    render(ctx: CanvasRenderingContext2D, state: CartPendulumState, config: CartPendulumConfig, dims: Dimensions): void {
        renderCartPendulum(ctx, state, config, dims);
    },

    getParameterDefinitions() {
        return [
            { key: "M", label: "Cart Mass", min: 0.1, max: 100, step: 0.1, defaultValue: 1.0, unit: "kg" },
            { key: "m", label: "Bob Mass", min: 0.05, max: 20, step: 0.05, defaultValue: 0.3, unit: "kg" },
            { key: "l", label: "Rod Length", min: 0.2, max: 3, step: 0.1, defaultValue: 1.0, unit: "m" },
            { key: "g", label: "Gravity", min: 0.1, max: 20, step: 0.1, defaultValue: 9.81, unit: "m/s\u00B2" },
            { key: "b", label: "Friction", min: 0, max: 10, step: 0.01, defaultValue: 0.1, unit: "" },
            { key: "maxForce", label: "Max Force", min: 1, max: 1000, step: 1, defaultValue: 30, unit: "N" }
        ];
    },

    getInitialConditionDefinitions() {
        return [
            { key: "x", label: "Cart Position", min: -5, max: 5, step: 0.1, defaultValue: 0, unit: "m" },
            { key: "xDot", label: "Cart Velocity", min: -5, max: 5, step: 0.1, defaultValue: 0, unit: "m/s" },
            { key: "theta", label: "Pendulum Angle", min: -3.14, max: 3.14, step: 0.01, defaultValue: 0.17, unit: "rad" },
            { key: "thetaDot", label: "Angular Velocity", min: -10, max: 10, step: 0.1, defaultValue: 0, unit: "rad/s" }
        ];
    },

    getPerturbation(clickX: number, clickY: number, state: CartPendulumState, config: CartPendulumConfig, dims: Dimensions): PerturbationResult | null {
        const bob = getBobScreenPosition(state, config, dims);
        const dx = clickX - bob.x;
        const dy = clickY - bob.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Impulse scales inversely with distance — strong up close, weak far away
        const maxImpulse = 5; // rad/s at point blank
        const halfLife = 150; // px — distance at which impulse is half of max
        const magnitude = maxImpulse / (1 + distance / halfLife);

        // Push in the opposite horizontal direction from the click
        const direction = dx > 0 ? -1 : 1;

        return { stateKey: "thetaDot", delta: direction * magnitude };
    },

    getPlotDefinitions(): PlotDefinition[] {
        return [
            { key: "theta", label: "Angle", unit: "rad", color: "#ef4444", getValue: (s: Record<string, number>) => s.theta },
            { key: "x", label: "Cart Position", unit: "m", color: "#3b82f6", getValue: (s: Record<string, number>) => s.x },
            { key: "force", label: "Control Force", unit: "N", color: "#22c55e", getValue: (s: Record<string, number>) => s.force }
        ];
    },

    getPresets(): ConfigPreset<CartPendulumConfig>[] {
        return [
            {
                id: "default",
                label: "Wheeled Cart",
                description: "Standard cart on wheels with moderate friction",
                config: { M: 1.0, m: 0.3, l: 1.0, g: 9.81, b: 0.1, maxForce: 30 }
            },
            {
                id: "linear-actuator",
                label: "Linear Actuator",
                description: "Low-mass carriage on a rail driven by a belt or leadscrew",
                config: { M: 0.1, m: 0.3, l: 1.0, g: 9.81, b: 0, maxForce: 50 }
            },
            {
                id: "segway",
                label: "Segway",
                description: "Heavy platform with rider, short effective pendulum, high torque wheels",
                config: { M: 80, m: 10, l: 1.0, g: 9.81, b: 5, maxForce: 500 }
            },
            {
                id: "long-rod",
                label: "Long Rod",
                description: "Extra-long pendulum with slow, dramatic swings",
                config: { M: 1.0, m: 0.1, l: 3.0, g: 9.81, b: 0.1, maxForce: 30 }
            },
            {
                id: "heavy-bob",
                label: "Heavy Bob",
                description: "Large mass at the tip — harder to control, needs more force",
                config: { M: 1.0, m: 2.0, l: 1.0, g: 9.81, b: 0.1, maxForce: 60 }
            },
            {
                id: "moon",
                label: "Moon Gravity",
                description: "Same cart on the lunar surface — 1/6th Earth gravity",
                config: { M: 1.0, m: 0.3, l: 1.0, g: 1.62, b: 0.1, maxForce: 30 }
            }
        ];
    },

    getControllerDocs(): ControllerDocs {
        return {
            stateFields: [
                { name: "state.angle", description: "Pendulum angle from vertical (0 = upright, positive = tilted right)", unit: "rad" },
                { name: "state.angularVelocity", description: "Pendulum angular velocity (positive = falling right)", unit: "rad/s" },
                { name: "state.cartPosition", description: "Cart position on the track (positive = right of origin)", unit: "m" },
                { name: "state.cartVelocity", description: "Cart velocity (positive = moving right)", unit: "m/s" }
            ],
            returnDescription: "Horizontal force applied to the cart. Positive = push right, negative = push left. Clamped to the configured max force.",
            returnUnit: "N",
            llmPrompt: [
                "Write a JavaScript controller function for an inverted pendulum on a cart.",
                "",
                "## System",
                "A pendulum is attached to a cart that moves along a horizontal track.",
                "The goal is to keep the pendulum balanced upright (angle = 0) and the cart near the origin (position = 0).",
                "You control the cart by applying a horizontal force.",
                "",
                "## Function signature",
                "```javascript",
                "function controller(state, dt) {",
                "    // Your code here",
                "    return force; // number (Newtons)",
                "}",
                "```",
                "",
                "## Inputs",
                "- `state.angle` — Pendulum angle from vertical in radians. 0 = perfectly upright. Positive = tilted right.",
                "- `state.angularVelocity` — Angular velocity in rad/s. Positive = falling rightward.",
                "- `state.cartPosition` — Cart position in meters. Positive = right of origin.",
                "- `state.cartVelocity` — Cart velocity in m/s. Positive = moving right.",
                "- `dt` — Fixed simulation timestep (0.001 seconds). Useful if you need to integrate or accumulate values over time.",
                "",
                "## Output",
                "Return a number representing horizontal force in Newtons to apply to the cart.",
                "- Positive value pushes the cart right.",
                "- Negative value pushes the cart left.",
                "- The force is clamped to a configurable maximum (default: 30 N).",
                "- If the function throws, returns NaN, or returns a non-number, zero force is applied.",
                "",
                "## Physics notes",
                "- When the pendulum tilts right (positive angle), pushing the cart right (positive force) moves the cart under the lean, which helps recover.",
                "- Cart position and velocity gains should have the SAME sign as the angle gains — this indirectly steers the pendulum to lean toward center.",
                "- The system starts with the pendulum at ~10 degrees from vertical.",
                "",
                "## Constraints",
                "- You must define a function called `controller`.",
                "- You can use any standard JavaScript (ES2023) — Math, closures, variables outside the function for accumulated state, etc.",
                "- Do not use DOM APIs, fetch, or async/await — the function runs in a synchronous sandbox.",
                "- The function is called ~1000 times per simulated second. Keep it fast."
            ].join("\n")
        };
    }
};
