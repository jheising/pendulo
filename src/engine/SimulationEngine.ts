import type { Rig } from "@/types/Rig";
import type { SimulationStatus, TimeSeriesPoint } from "@/types/Simulation";
import type { ControllerFunction } from "@/types/Controller";
import { rk4Step } from "./rk4";
import { clamp, isFiniteState } from "@/utils/math";
import { RingBuffer } from "@/utils/history";

const FIXED_DT = 0.001; // 1ms fixed timestep
const MAX_ACCUMULATOR = 0.1; // 100ms cap to prevent spiral-of-death
const HISTORY_CAPACITY = 5000; // ~50s at 10ms sample rate
const HISTORY_SAMPLE_INTERVAL = 10; // Record every 10th step

export class SimulationEngine<S extends Record<string, number>, C extends Record<string, number>> {
    private rig: Rig<S, C>;
    private state: S;
    private config: C;
    private controller: ControllerFunction | null = null;
    private accumulator = 0;
    private stepCount = 0;
    private _time = 0;
    private _status: SimulationStatus = "paused";
    private _lastForce = 0;
    private _history: RingBuffer;
    private _speedMultiplier = 1;

    constructor(rig: Rig<S, C>) {
        this.rig = rig;
        this.state = { ...rig.defaultState };
        this.config = { ...rig.defaultConfig };
        this._history = new RingBuffer(HISTORY_CAPACITY);
    }

    get time(): number {
        return this._time;
    }

    get status(): SimulationStatus {
        return this._status;
    }

    get lastForce(): number {
        return this._lastForce;
    }

    get history(): RingBuffer {
        return this._history;
    }

    get speedMultiplier(): number {
        return this._speedMultiplier;
    }

    getState(): S {
        return this.state;
    }

    getConfig(): C {
        return this.config;
    }

    setController(controller: ControllerFunction | null): void {
        this.controller = controller;
    }

    setConfig(config: C): void {
        this.config = { ...config };
    }

    setSpeedMultiplier(multiplier: number): void {
        this._speedMultiplier = multiplier;
    }

    play(): void {
        if (this._status !== "diverged") {
            this._status = "running";
        }
    }

    pause(): void {
        if (this._status === "running") {
            this._status = "paused";
        }
    }

    /**
     * Apply an instantaneous impulse to a state variable (e.g. angular velocity).
     * Used for perturbations like clicking near the pendulum bob.
     */
    perturb(key: keyof S, delta: number): void {
        if (key in this.state) {
            (this.state as Record<string, number>)[key as string] += delta;
        }
    }

    /** Update the live state directly (for preview/slider updates without resetting time/history). */
    setState(newState: Partial<S>): void {
        this.state = { ...this.state, ...newState };
    }

    reset(initialState?: Partial<S>): void {
        this.state = { ...this.rig.defaultState, ...initialState };
        this.accumulator = 0;
        this.stepCount = 0;
        this._time = 0;
        this._lastForce = 0;
        this._status = "paused";
        this._history.clear();
    }

    /**
     * Advance the simulation by wallDt seconds (real time elapsed since last frame).
     * Drains the accumulator in fixed-timestep chunks via RK4.
     */
    step(wallDt: number): void {
        if (this._status !== "running") return;

        this.accumulator += wallDt * this._speedMultiplier;
        this.accumulator = Math.min(this.accumulator, MAX_ACCUMULATOR);

        while (this.accumulator >= FIXED_DT) {
            this.accumulator -= FIXED_DT;

            // Evaluate controller
            let force = 0;
            if (this.controller) {
                const controllerInput = this.rig.getControllerInput(this.state);
                force = this.controller(controllerInput, FIXED_DT);
            }

            // Clamp force
            const maxForce = (this.config as Record<string, number>).maxForce ?? Infinity;
            force = clamp(force, -maxForce, maxForce);
            this._lastForce = force;

            // RK4 integration
            const capturedForce = force;
            const capturedConfig = this.config;
            this.state = rk4Step(this.state, FIXED_DT, s => this.rig.derivatives(s as S, capturedConfig, capturedForce));

            this._time += FIXED_DT;
            this.stepCount++;

            // Divergence check
            if (!isFiniteState(this.state)) {
                this._status = "diverged";
                return;
            }

            // Record history at sample interval
            if (this.stepCount % HISTORY_SAMPLE_INTERVAL === 0) {
                const point: TimeSeriesPoint = {
                    time: this._time,
                    values: { ...this.state, force: this._lastForce }
                };
                this._history.push(point);
            }
        }
    }
}
