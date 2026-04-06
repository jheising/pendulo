import type { ControllerFunction } from "@/types/Controller";

export interface CompilationResult {
    success: boolean;
    controller: ControllerFunction | null;
    error: string | null;
}

/**
 * Compiles user code into a safe controller function.
 * Uses new Function() with "use strict" and wraps invocation in try/catch.
 */
export function compileController(code: string): CompilationResult {
    try {
        // Wrap user code so that the `controller` function is returned
        const wrappedCode = `"use strict";\n${code}\nreturn controller;`;
        const factory = new Function(wrappedCode);
        const userFn = factory();

        if (typeof userFn !== "function") {
            return { success: false, controller: null, error: "Code must define a function named 'controller'" };
        }

        // Wrap in a safe invocation layer
        const safeController: ControllerFunction = (state, dt) => {
            try {
                const result = userFn(state, dt);
                if (typeof result !== "number" || !Number.isFinite(result)) {
                    return 0;
                }
                return result;
            } catch {
                return 0;
            }
        };

        return { success: true, controller: safeController, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, controller: null, error: message };
    }
}
