import type { SimulationStatus } from "@/types/Simulation";

interface ToolbarProps {
    status: SimulationStatus;
    time: number;
    speedMultiplier: number;
    onPlay: () => void;
    onPause: () => void;
    onReset: () => void;
    onSpeedChange: (speed: number) => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function Toolbar({ status, time, speedMultiplier, onPlay, onPause, onReset, onSpeedChange }: ToolbarProps) {
    const isRunning = status === "running";
    const isDiverged = status === "diverged";

    return (
        <div className="toolbar">
            <div className="toolbar-left">
                <button className="btn btn-primary" onClick={isRunning ? onPause : onPlay} disabled={isDiverged} aria-label={isRunning ? "Pause simulation" : "Play simulation"}>
                    {isRunning ? "⏸ Pause" : "▶ Play"}
                </button>
                <button className="btn" onClick={onReset} aria-label="Reset simulation">
                    ↺ Reset
                </button>
                <div className="speed-controls" role="group" aria-label="Simulation speed">
                    {SPEED_OPTIONS.map(speed => (
                        <button key={speed} className={`btn btn-speed ${speedMultiplier === speed ? "active" : ""}`} onClick={() => onSpeedChange(speed)} aria-pressed={speedMultiplier === speed}>
                            {speed}x
                        </button>
                    ))}
                </div>
            </div>
            <div className="toolbar-right">
                {isDiverged && <span className="diverged-warning">Simulation diverged!</span>}
                <span className="time-display">Time: {time.toFixed(2)}s</span>
            </div>
        </div>
    );
}
