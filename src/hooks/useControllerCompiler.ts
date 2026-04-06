import { useState, useEffect, useRef } from "react";
import type { ControllerFunction } from "@/types/Controller";
import { compileController } from "@/engine/controllerSandbox";

const DEBOUNCE_MS = 300;

interface UseControllerCompilerResult {
    controller: ControllerFunction | null;
    error: string | null;
}

/**
 * Debounced compilation of user controller code.
 * Returns the compiled controller and any compilation error.
 */
export function useControllerCompiler(code: string): UseControllerCompilerResult {
    const [controller, setController] = useState<ControllerFunction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const result = compileController(code);
            setController(() => result.controller);
            setError(result.error);
        }, DEBOUNCE_MS);

        return () => clearTimeout(timerRef.current);
    }, [code]);

    return { controller, error };
}
