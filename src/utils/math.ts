export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function wrapAngle(angle: number): number {
    // Wrap angle to [-PI, PI]
    let result = angle % (2 * Math.PI);
    if (result > Math.PI) result -= 2 * Math.PI;
    if (result < -Math.PI) result += 2 * Math.PI;
    return result;
}

export function isFiniteState(state: Record<string, number>): boolean {
    return Object.values(state).every(v => Number.isFinite(v));
}
