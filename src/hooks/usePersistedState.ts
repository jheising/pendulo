import { useState, useEffect, useRef, useCallback } from "react";

const DEBOUNCE_MS = 500;

/**
 * Like useState, but persists the value to localStorage under the given key.
 * Reads the stored value on mount (falling back to initialValue),
 * and debounce-writes on every change.
 */
export function usePersistedState<T>(storageKey: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    const [state, setState] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw !== null) {
                return JSON.parse(raw) as T;
            }
        } catch {
            /* ignore parse errors */
        }
        return initialValue;
    });

    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const initialValueRef = useRef(initialValue);
    initialValueRef.current = initialValue;

    // Debounced write to localStorage
    useEffect(() => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(storageKey, JSON.stringify(state));
            } catch {
                /* localStorage may be full or unavailable */
            }
        }, DEBOUNCE_MS);

        return () => clearTimeout(timerRef.current);
    }, [storageKey, state]);

    // Reset to initial value and clear storage
    const reset = useCallback(() => {
        setState(initialValueRef.current);
        try {
            localStorage.removeItem(storageKey);
        } catch {
            /* ignore */
        }
    }, [storageKey]);

    return [state, setState, reset];
}
