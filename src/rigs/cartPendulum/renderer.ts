import type { CartPendulumState, CartPendulumConfig } from "./types";
import type { Dimensions } from "@/types/Rig";

const TRACK_HEIGHT = 4;
const CART_WIDTH = 80;
const CART_HEIGHT = 40;
const TICK_SPACING_M = 0.5; // tick mark every 0.5 meters
export const PIXELS_PER_METER = 150;

export interface ScreenPosition {
    x: number;
    y: number;
}

/** Returns the bob's position in CSS pixels (not retina-scaled). */
export function getBobScreenPosition(state: CartPendulumState, config: CartPendulumConfig, dims: Dimensions): ScreenPosition {
    const centerX = dims.width / 2;
    const trackY = dims.height * 0.55;
    const pivotY = trackY - CART_HEIGHT / 2;
    const rodLength = config.l * PIXELS_PER_METER;

    return {
        x: centerX + rodLength * Math.sin(state.theta),
        y: pivotY - rodLength * Math.cos(state.theta)
    };
}

export function renderCartPendulum(ctx: CanvasRenderingContext2D, state: CartPendulumState, config: CartPendulumConfig, dims: Dimensions): void {
    const { width, height } = dims;
    const centerX = width / 2;
    const trackY = height * 0.55;

    ctx.clearRect(0, 0, width, height);

    // Scale factor
    const scale = PIXELS_PER_METER;

    // --- Track ---
    ctx.fillStyle = "#444";
    ctx.fillRect(0, trackY - TRACK_HEIGHT / 2, width, TRACK_HEIGHT);

    // Tick marks
    ctx.fillStyle = "#666";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    const viewLeftM = -width / 2 / scale + state.x;
    const viewRightM = width / 2 / scale + state.x;
    const firstTick = Math.ceil(viewLeftM / TICK_SPACING_M) * TICK_SPACING_M;
    for (let m = firstTick; m <= viewRightM; m += TICK_SPACING_M) {
        const px = centerX + (m - state.x) * scale;
        ctx.fillRect(px - 1, trackY - 8, 2, 16);
        ctx.fillText(`${m.toFixed(1)}`, px, trackY + 22);
    }

    // --- Cart ---
    const cartX = centerX - CART_WIDTH / 2;
    const cartY = trackY - CART_HEIGHT / 2;

    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cartX, cartY, CART_WIDTH, CART_HEIGHT, 4);
    ctx.fill();
    ctx.stroke();

    // Wheels
    const wheelRadius = 8;
    const wheelY = trackY + CART_HEIGHT / 2 - 4;
    ctx.fillStyle = "#333";
    for (const offsetX of [-CART_WIDTH / 3, CART_WIDTH / 3]) {
        ctx.beginPath();
        ctx.arc(centerX + offsetX, wheelY, wheelRadius, 0, 2 * Math.PI);
        ctx.fill();
    }

    // --- Pendulum rod ---
    const pivotX = centerX;
    const pivotY = trackY - CART_HEIGHT / 2;
    const rodLength = config.l * scale;
    // theta=0 is up, so bob is at pivot + (l*sin(theta), -l*cos(theta))
    const bobX = pivotX + rodLength * Math.sin(state.theta);
    const bobY = pivotY - rodLength * Math.cos(state.theta);

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Pivot point
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // --- Bob ---
    const bobRadius = Math.max(8, Math.sqrt(config.m) * 14);
    ctx.fillStyle = "#ef4444";
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // --- State readout ---
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    const thetaDeg = ((state.theta * 180) / Math.PI).toFixed(1);
    const lines = [`θ: ${thetaDeg}°`, `ω: ${state.thetaDot.toFixed(2)} rad/s`, `x: ${state.x.toFixed(3)} m`, `v: ${state.xDot.toFixed(2)} m/s`];
    lines.forEach((line, i) => {
        ctx.fillText(line, 12, 24 + i * 20);
    });
}
