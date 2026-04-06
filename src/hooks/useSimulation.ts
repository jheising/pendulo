import { useState, useRef, useCallback, useMemo } from "react";
import type { Rig } from "@/types/Rig";
import type { SimulationStatus } from "@/types/Simulation";
import type { ControllerFunction } from "@/types/Controller";
import { SimulationEngine } from "@/engine/SimulationEngine";
import { useAnimationFrame } from "./useAnimationFrame";

export interface UseSimulationResult {
    state: Record<string, number>;
    time: number;
    status: SimulationStatus;
    lastForce: number;
    engine: SimulationEngine<Record<string, number>, Record<string, number>>;
    play: () => void;
    pause: () => void;
    reset: (initialState?: Partial<Record<string, number>>) => void;
    setController: (controller: ControllerFunction | null) => void;
    setConfig: (config: Record<string, number>) => void;
    setSpeedMultiplier: (multiplier: number) => void;
    perturb: (stateKey: string, delta: number) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSimulation(rig: Rig<any, any>): UseSimulationResult {
    const engineRef = useRef<SimulationEngine<Record<string, number>, Record<string, number>>>(undefined);

    if (!engineRef.current) {
        engineRef.current = new SimulationEngine(rig);
    }

    const engine = engineRef.current;

    // Trigger re-renders on each animation frame
    const [, setTick] = useState(0);

    const isRunning = engine.status === "running";

    useAnimationFrame(dt => {
        engine.step(dt);
        setTick(t => t + 1);
    }, isRunning);

    const play = useCallback(() => {
        engine.play();
        setTick(t => t + 1);
    }, [engine]);

    const pause = useCallback(() => {
        engine.pause();
        setTick(t => t + 1);
    }, [engine]);

    const reset = useCallback(
        (initialState?: Partial<Record<string, number>>) => {
            engine.reset(initialState);
            setTick(t => t + 1);
        },
        [engine]
    );

    const setController = useCallback(
        (controller: ControllerFunction | null) => {
            engine.setController(controller);
        },
        [engine]
    );

    const setConfig = useCallback(
        (config: Record<string, number>) => {
            engine.setConfig(config);
        },
        [engine]
    );

    const setSpeedMultiplier = useCallback(
        (multiplier: number) => {
            engine.setSpeedMultiplier(multiplier);
        },
        [engine]
    );

    const perturb = useCallback(
        (stateKey: string, delta: number) => {
            engine.perturb(stateKey, delta);
            setTick(t => t + 1);
        },
        [engine]
    );

    return useMemo(
        () => ({
            state: engine.getState(),
            time: engine.time,
            status: engine.status,
            lastForce: engine.lastForce,
            engine,
            play,
            pause,
            reset,
            setController,
            setConfig,
            setSpeedMultiplier,
            perturb
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [engine, play, pause, reset, setController, setConfig, setSpeedMultiplier, perturb, isRunning, engine.time]
    );
}
