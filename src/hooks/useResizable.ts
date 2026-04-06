import { useState, useCallback, useEffect, useRef } from "react";

export type ResizeDirection = "horizontal" | "vertical";

interface UseResizableOptions {
    direction: ResizeDirection;
    initialSize: number;
    minSize: number;
    maxSize: number;
    /** If true, size is measured from the right/bottom edge instead of left/top */
    inverted?: boolean;
    /** When provided, the size is persisted to localStorage under this key */
    storageKey?: string;
}

interface UseResizableResult {
    size: number;
    isDragging: boolean;
    startDrag: (e: React.MouseEvent) => void;
}

function readStoredSize(storageKey: string | undefined, fallback: number, min: number, max: number): number {
    if (!storageKey) return fallback;
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw === null) return fallback;
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return Math.min(max, Math.max(min, parsed));
    } catch {
        /* localStorage may be unavailable */
    }
    return fallback;
}

/**
 * Tracks a drag operation on a resize handle and returns the current panel size.
 * Works for both horizontal (left/right) and vertical (top/bottom) splits.
 */
export function useResizable({ direction, initialSize, minSize, maxSize, inverted = false, storageKey }: UseResizableOptions): UseResizableResult {
    const [size, setSize] = useState(() => readStoredSize(storageKey, initialSize, minSize, maxSize));
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ pos: 0, size: 0 });
    const sizeRef = useRef(size);
    sizeRef.current = size;

    const startDrag = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            const pos = direction === "horizontal" ? e.clientX : e.clientY;
            dragStartRef.current = { pos, size };
            setIsDragging(true);
        },
        [direction, size]
    );

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
            const delta = currentPos - dragStartRef.current.pos;
            const adjustedDelta = inverted ? -delta : delta;
            const newSize = Math.min(maxSize, Math.max(minSize, dragStartRef.current.size + adjustedDelta));
            setSize(newSize);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, String(sizeRef.current));
                } catch {
                    /* localStorage may be unavailable */
                }
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, direction, inverted, minSize, maxSize, storageKey]);

    return { size, isDragging, startDrag };
}
