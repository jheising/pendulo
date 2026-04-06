export type SimulationStatus = "running" | "paused" | "stopped" | "diverged";

export interface TimeSeriesPoint {
    time: number;
    values: Record<string, number>;
}
