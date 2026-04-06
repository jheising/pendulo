import type { CartPendulumState, CartPendulumConfig } from "./types";
import type { Dimensions } from "@/types/Rig";

const CART_WIDTH = 80;
const CART_HEIGHT = 36;
const TICK_SPACING_M = 0.5;
export const PIXELS_PER_METER = 150;
const TRAIL_LENGTH = 40;

export interface ScreenPosition {
    x: number;
    y: number;
}

// Trail buffers store world-space positions so they render correctly as the camera pans
interface TrailPoint {
    worldX: number; // meters
    worldY: number; // screen Y (doesn't shift with camera)
}

const bobTrail: TrailPoint[] = [];

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
    const scale = PIXELS_PER_METER;

    // --- Background ---
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, width, height);

    // Grid
    drawGrid(ctx, width, height, state.x, scale, centerX, trackY);

    // --- Track ---
    const trackGrad = ctx.createLinearGradient(0, trackY - 2, 0, trackY + 2);
    trackGrad.addColorStop(0, "rgba(0, 229, 255, 0.15)");
    trackGrad.addColorStop(0.5, "rgba(0, 229, 255, 0.4)");
    trackGrad.addColorStop(1, "rgba(0, 229, 255, 0.15)");
    ctx.fillStyle = trackGrad;
    ctx.fillRect(0, trackY - 2, width, 4);

    // Track glow
    ctx.shadowColor = "rgba(0, 229, 255, 0.3)";
    ctx.shadowBlur = 8;
    ctx.fillRect(0, trackY - 1, width, 2);
    ctx.shadowBlur = 0;

    // Tick marks
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    const viewLeftM = -width / 2 / scale + state.x;
    const viewRightM = width / 2 / scale + state.x;
    const firstTick = Math.ceil(viewLeftM / TICK_SPACING_M) * TICK_SPACING_M;
    for (let m = firstTick; m <= viewRightM; m += TICK_SPACING_M) {
        const px = centerX + (m - state.x) * scale;
        ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
        ctx.fillRect(px - 0.5, trackY - 6, 1, 12);
        ctx.fillStyle = "rgba(0, 229, 255, 0.55)";
        ctx.fillText(`${m.toFixed(1)}`, px, trackY + 32);
    }

    // --- Cart ---
    const cartX = centerX - CART_WIDTH / 2;
    const cartY = trackY - CART_HEIGHT / 2;

    // Cart body with gradient
    const cartGrad = ctx.createLinearGradient(cartX, cartY, cartX, cartY + CART_HEIGHT);
    cartGrad.addColorStop(0, "#1a3a5c");
    cartGrad.addColorStop(1, "#0d1f33");
    ctx.fillStyle = cartGrad;
    ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cartX, cartY, CART_WIDTH, CART_HEIGHT, 5);
    ctx.fill();
    ctx.stroke();

    // Cart edge glow
    ctx.shadowColor = "rgba(0, 229, 255, 0.2)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Cart detail lines
    ctx.strokeStyle = "rgba(0, 229, 255, 0.1)";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
        const ly = cartY + (CART_HEIGHT / 4) * i;
        ctx.beginPath();
        ctx.moveTo(cartX + 6, ly);
        ctx.lineTo(cartX + CART_WIDTH - 6, ly);
        ctx.stroke();
    }

    // Speed lines on the cart
    drawSpeedLines(ctx, state.xDot, centerX, cartY, CART_WIDTH, CART_HEIGHT);

    // --- Pendulum rod ---
    const pivotX = centerX;
    const pivotY = trackY - CART_HEIGHT / 2;
    const rodLength = config.l * scale;
    const bobX = pivotX + rodLength * Math.sin(state.theta);
    const bobY = pivotY - rodLength * Math.cos(state.theta);

    // Record bob trail in world space
    const bobWorldX = state.x + config.l * Math.sin(state.theta);
    bobTrail.push({ worldX: bobWorldX, worldY: bobY });
    if (bobTrail.length > TRAIL_LENGTH) bobTrail.shift();

    drawTrail(ctx, bobTrail, state.x, centerX, scale, "255, 107, 53");

    // Rod with gradient
    const rodGrad = ctx.createLinearGradient(pivotX, pivotY, bobX, bobY);
    rodGrad.addColorStop(0, "rgba(0, 229, 255, 0.5)");
    rodGrad.addColorStop(1, "rgba(255, 107, 53, 0.6)");
    ctx.strokeStyle = rodGrad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Rod glow
    ctx.shadowColor = "rgba(0, 229, 255, 0.3)";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pivot point
    ctx.fillStyle = "#00e5ff";
    ctx.shadowColor = "rgba(0, 229, 255, 0.6)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Bob ---
    const bobRadius = Math.max(8, Math.sqrt(config.m) * 14);

    // Outer glow
    ctx.shadowColor = "rgba(255, 107, 53, 0.6)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 107, 53, 0.15)";
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius + 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bob body with gradient
    const bobGrad = ctx.createRadialGradient(bobX - 2, bobY - 2, 0, bobX, bobY, bobRadius);
    bobGrad.addColorStop(0, "#ff8a5c");
    bobGrad.addColorStop(0.6, "#ff6b35");
    bobGrad.addColorStop(1, "#cc4a1a");
    ctx.fillStyle = bobGrad;
    ctx.strokeStyle = "rgba(255, 107, 53, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Bob highlight
    ctx.fillStyle = "rgba(255, 200, 160, 0.3)";
    ctx.beginPath();
    ctx.arc(bobX - bobRadius * 0.25, bobY - bobRadius * 0.25, bobRadius * 0.45, 0, 2 * Math.PI);
    ctx.fill();

    // --- State readout ---
    drawHUD(ctx, state);
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, cartX: number, scale: number, centerX: number, trackY: number): void {
    const gridSpacing = 50;

    // Vertical lines
    ctx.strokeStyle = "rgba(0, 229, 255, 0.03)";
    ctx.lineWidth = 0.5;
    const offsetX = (centerX - cartX * scale) % gridSpacing;
    for (let x = offsetX; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = trackY % gridSpacing; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Horizon line (subtle)
    ctx.strokeStyle = "rgba(0, 229, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(width, trackY);
    ctx.stroke();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[], currentCartX: number, centerX: number, scale: number, rgb: string): void {
    if (trail.length < 2) return;

    for (let i = 1; i < trail.length; i++) {
        const progress = i / trail.length;
        const alpha = progress * 0.35;
        const radius = progress * 2;

        // Convert world X to screen X: offset from current camera position
        const screenX = centerX + (trail[i].worldX - currentCartX) * scale;
        const screenY = trail[i].worldY;

        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, velocity: number, cartCenterX: number, cartY: number, cartW: number, cartH: number): void {
    const speed = Math.abs(velocity);
    if (speed < 0.15) return;

    // Vertical lines trail behind the cart (opposite to motion direction)
    const direction = Math.sign(velocity);
    const trailingEdge = cartCenterX - direction * (cartW / 2 + 6);

    // Number of lines: more at higher speed
    const lineCount = Math.min(8, Math.floor(2 + speed * 2));

    // Spacing between lines increases with speed
    const baseSpacing = 4 + Math.min(speed * 3, 14);

    // Line height (vertical extent)
    const lineHeight = cartH * 0.6;
    const lineCenterY = cartY + cartH / 2;

    for (let i = 0; i < lineCount; i++) {
        // Position each line behind the trailing edge, spaced further apart at higher speed
        const x = trailingEdge - direction * (i * baseSpacing);

        // Lines further from the cart are shorter and more faded
        const falloff = 1 - i / lineCount;
        const height = lineHeight * (0.4 + falloff * 0.6);
        const alpha = falloff * falloff * Math.min(speed / 2, 1) * 0.5;

        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.lineWidth = 1.5 * falloff + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, lineCenterY - height / 2);
        ctx.lineTo(x, lineCenterY + height / 2);
        ctx.stroke();
    }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: CartPendulumState): void {
    const thetaDeg = ((state.theta * 180) / Math.PI).toFixed(1);
    const lines = [
        { label: "\u03B8", value: `${thetaDeg}\u00B0`, color: "#ff6b35" },
        { label: "\u03C9", value: `${state.thetaDot.toFixed(2)} rad/s`, color: "#ff6b35" },
        { label: "x", value: `${state.x.toFixed(3)} m`, color: "#00e5ff" },
        { label: "v", value: `${state.xDot.toFixed(2)} m/s`, color: "#00e5ff" }
    ];

    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";

    lines.forEach((line, i) => {
        const y = 22 + i * 20;

        // Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fillText(`${line.label}:`, 12, y);

        // Value
        ctx.fillStyle = line.color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(line.value, 30, y);
        ctx.globalAlpha = 1;
    });
}
