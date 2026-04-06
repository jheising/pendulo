import { useRef, useEffect, useCallback } from "react";
import type { Rig, Dimensions } from "@/types/Rig";

interface Ripple {
    x: number;
    y: number;
    strength: number; // 0–1 normalized
    startTime: number;
}

const RIPPLE_DURATION_MS = 600;
const RIPPLE_MAX_RADIUS = 60;

interface SimCanvasProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rig: Rig<any, any>;
    state: Record<string, number>;
    config: Record<string, number>;
    lastForce: number;
    onPerturb?: (stateKey: string, delta: number) => void;
}

export function SimCanvas({ rig, state, config, lastForce, onPerturb }: SimCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ripplesRef = useRef<Ripple[]>([]);
    const rippleRafRef = useRef<number>(0);

    // Ripple animation loop — runs independently so ripples animate even when sim is paused
    useEffect(() => {
        let running = true;

        const animateRipples = () => {
            if (!running) return;

            const ripples = ripplesRef.current;
            const now = performance.now();

            // Prune expired ripples
            ripplesRef.current = ripples.filter(r => now - r.startTime < RIPPLE_DURATION_MS);

            // Only re-render if there are active ripples (the main render handles the sim frame)
            if (ripplesRef.current.length > 0) {
                drawRipples();
            }

            rippleRafRef.current = requestAnimationFrame(animateRipples);
        };

        rippleRafRef.current = requestAnimationFrame(animateRipples);
        return () => {
            running = false;
            cancelAnimationFrame(rippleRafRef.current);
        };
    }, []);

    const drawRipples = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const now = performance.now();

        ctx.save();
        ctx.scale(dpr, dpr);

        for (const ripple of ripplesRef.current) {
            const elapsed = now - ripple.startTime;
            const progress = elapsed / RIPPLE_DURATION_MS;
            if (progress >= 1) continue;

            const radius = RIPPLE_MAX_RADIUS * ripple.strength * easeOutCubic(progress);
            const opacity = (1 - progress) * 0.6;
            const lineWidth = 2 + 2 * ripple.strength * (1 - progress);

            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, radius, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();

            // Inner filled flash
            if (progress < 0.3) {
                const flashOpacity = (1 - progress / 0.3) * 0.15 * ripple.strength;
                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = `rgba(0, 229, 255, ${flashOpacity})`;
                ctx.fill();
            }
        }

        ctx.restore();
    }, []);

    // Store latest props in refs so the render function always reads current values
    const rigRef = useRef(rig);
    const stateRef = useRef(state);
    const configRef = useRef(config);
    const lastForceRef = useRef(lastForce);
    rigRef.current = rig;
    stateRef.current = state;
    configRef.current = config;
    lastForceRef.current = lastForce;

    const renderFrame = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Size canvas for retina
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        const dims: Dimensions = { width, height };

        // Draw the rig
        rigRef.current.render(ctx, stateRef.current, configRef.current, dims);

        // Draw force arrow on top
        drawForceArrow(ctx, lastForceRef.current, width, height);

        // Draw active ripples on top of everything
        if (ripplesRef.current.length > 0) {
            drawRipples();
        }
    }, [drawRipples]);

    // Re-render on prop changes
    useEffect(() => {
        const rafId = requestAnimationFrame(renderFrame);
        return () => cancelAnimationFrame(rafId);
    }, [renderFrame, rig, state, config, lastForce]);

    // Re-render when the container is resized
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            requestAnimationFrame(renderFrame);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, [renderFrame]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!onPerturb || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const dims: Dimensions = { width: rect.width, height: rect.height };

            const perturbation = rig.getPerturbation(clickX, clickY, state, config, dims);
            if (perturbation) {
                onPerturb(perturbation.stateKey, perturbation.delta);

                // Spawn ripple — strength normalized to [0, 1] based on max impulse of 5 rad/s
                const strength = Math.min(Math.abs(perturbation.delta) / 5, 1);
                ripplesRef.current.push({ x: clickX, y: clickY, strength, startTime: performance.now() });
            }
        },
        [rig, state, config, onPerturb]
    );

    return (
        <div ref={containerRef} className="sim-canvas-container">
            <canvas ref={canvasRef} onClick={handleClick} aria-label="Simulation visualization — click near the pendulum bob to perturb it" />
        </div>
    );
}

function easeOutCubic(t: number): number {
    return 1 - (1 - t) * (1 - t) * (1 - t);
}

function drawForceArrow(ctx: CanvasRenderingContext2D, force: number, width: number, height: number) {
    if (Math.abs(force) < 0.1) return;

    const centerX = width / 2;
    const arrowY = height * 0.55 + 30;
    const arrowLength = Math.min(Math.abs(force) * 3, 120);
    const direction = Math.sign(force);

    const startX = centerX;
    const endX = centerX + arrowLength * direction;

    // Arrow glow
    ctx.shadowColor = "rgba(0, 230, 118, 0.4)";
    ctx.shadowBlur = 8;
    ctx.strokeStyle = "#00e676";
    ctx.fillStyle = "#00e676";
    ctx.lineWidth = 2;

    // Arrow line
    ctx.beginPath();
    ctx.moveTo(startX, arrowY);
    ctx.lineTo(endX, arrowY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(endX, arrowY);
    ctx.lineTo(endX - 10 * direction, arrowY - 5);
    ctx.lineTo(endX - 10 * direction, arrowY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Force label
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0, 230, 118, 0.6)";
    ctx.fillText(`${force.toFixed(1)} N`, centerX, arrowY + 18);
}
