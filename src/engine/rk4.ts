/**
 * Generic 4th-order Runge-Kutta integrator for state objects.
 * Works with any Record<string, number> state shape.
 */
export function rk4Step<S extends Record<string, number>>(state: S, dt: number, derivativesFn: (s: S) => S): S {
    const keys = Object.keys(state) as (keyof S)[];

    const addStates = (a: S, b: S, scale: number): S => {
        const result = {} as S;
        for (const key of keys) {
            (result as Record<string, number>)[key as string] = (a[key] as number) + (b[key] as number) * scale;
        }
        return result;
    };

    const k1 = derivativesFn(state);
    const k2 = derivativesFn(addStates(state, k1, dt / 2));
    const k3 = derivativesFn(addStates(state, k2, dt / 2));
    const k4 = derivativesFn(addStates(state, k3, dt));

    // state + (dt/6) * (k1 + 2*k2 + 2*k3 + k4)
    const result = {} as S;
    for (const key of keys) {
        const k = key as string;
        (result as Record<string, number>)[k] =
            (state[key] as number) +
            (dt / 6) * ((k1[key] as number) + 2 * (k2[key] as number) + 2 * (k3[key] as number) + (k4[key] as number));
    }

    return result;
}
