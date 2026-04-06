import { useState, useEffect, useRef, useCallback } from "react";
import type { ControllerFunction } from "@/types/Controller";
import { compileController } from "@/engine/controllerSandbox";

const DEBOUNCE_MS = 300;

interface UseControllerCompilerResult {
    controller: ControllerFunction | null;
    error: string | null;
    recompile: () => void;
}

/**
 * Debounced compilation of user controller code.
 * Returns the compiled controller, any compilation error, and a recompile
 * function that forces a fresh compilation (resetting any closure state).
 */
export function useControllerCompiler(code: string): UseControllerCompilerResult {
    const [controller, setController] = useState<ControllerFunction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const codeRef = useRef(code);
    codeRef.current = code;

    useEffect(() => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const result = compileController(code);
            setController(() => result.controller);
            setError(result.error);
        }, DEBOUNCE_MS);

        return () => clearTimeout(timerRef.current);
    }, [code]);

    const recompile = useCallback(() => {
        const result = compileController(codeRef.current);
        setController(() => result.controller);
        setError(result.error);
    }, []);

    return { controller, error, recompile };
}
