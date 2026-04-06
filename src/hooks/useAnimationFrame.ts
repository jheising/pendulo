import { useRef, useEffect, useCallback } from "react";

/**
 * Calls the given callback on every animation frame with the delta time (seconds).
 * Automatically cleans up on unmount.
 */
export function useAnimationFrame(callback: (dt: number) => void, active: boolean): void {
    const callbackRef = useRef(callback);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    callbackRef.current = callback;

    const loop = useCallback((timestamp: number) => {
        if (lastTimeRef.current > 0) {
            const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
            callbackRef.current(dt);
        }
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    useEffect(() => {
        if (active) {
            lastTimeRef.current = 0;
            rafRef.current = requestAnimationFrame(loop);
            return () => cancelAnimationFrame(rafRef.current);
        }
    }, [active, loop]);
}
