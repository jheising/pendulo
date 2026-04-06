import { useState, useCallback, useEffect } from "react";
import { rigRegistry, defaultRigId } from "@/rigs";
import { useSimulation } from "@/hooks/useSimulation";
import { useControllerCompiler } from "@/hooks/useControllerCompiler";
import { useResizable } from "@/hooks/useResizable";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Toolbar } from "@/components/Toolbar";
import { SimCanvas } from "@/components/SimCanvas";
import { CodeEditor } from "@/components/CodeEditor";
import { ParameterPanel } from "@/components/ParameterPanel";
import { TimePlots } from "@/components/TimePlots";
import { RigSelector } from "@/components/RigSelector";
import { ResizeHandle } from "@/components/ResizeHandle";
import { PresetSelector } from "@/components/PresetSelector";
import { DEFAULT_CONTROLLER_CODE } from "@/constants/defaults";
import "./App.css";

export default function App() {
    const [rigId, setRigId] = useState(defaultRigId);
    const rig = rigRegistry[rigId];

    const sim = useSimulation(rig);

    // Persisted state — saved to localStorage, with reset-to-default capability
    const [code, setCode, resetCode] = usePersistedState("pendulo:controller-code", DEFAULT_CONTROLLER_CODE);
    const [config, setConfig, resetConfig] = usePersistedState<Record<string, number>>("pendulo:config", { ...rig.defaultConfig });
    const [initialConditions, setInitialConditions, resetInitialConditions] = usePersistedState<Record<string, number>>("pendulo:initial-conditions", { ...rig.defaultState });

    const { controller, error: compileError, recompile } = useControllerCompiler(code);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    // Resizable panes
    const sidebar = useResizable({ direction: "horizontal", initialSize: 420, minSize: 250, maxSize: 800, inverted: true, storageKey: "pendulo:sidebar-width" });
    const plots = useResizable({ direction: "vertical", initialSize: 180, minSize: 80, maxSize: 500, inverted: true, storageKey: "pendulo:plots-height" });
    const panels = useResizable({ direction: "vertical", initialSize: 280, minSize: 100, maxSize: 600, inverted: true, storageKey: "pendulo:panels-height" });
    const anyDragging = sidebar.isDragging || plots.isDragging || panels.isDragging;

    // Sync controller with engine
    useEffect(() => {
        sim.setController(controller);
    }, [controller, sim]);

    // Sync config with engine
    useEffect(() => {
        sim.setConfig(config);
    }, [config, sim]);

    // Sync speed
    useEffect(() => {
        sim.setSpeedMultiplier(speedMultiplier);
    }, [speedMultiplier, sim]);

    const handleConfigChange = useCallback((key: string, value: number) => {
        setConfig(prev => ({ ...(typeof prev === "object" ? prev : {}), [key]: value }));
    }, [setConfig]);

    const handleInitialConditionChange = useCallback((key: string, value: number) => {
        setInitialConditions(prev => ({ ...(typeof prev === "object" ? prev : {}), [key]: value }));
    }, [setInitialConditions]);

    const handlePresetSelect = useCallback(
        (presetConfig: Record<string, number>) => {
            setConfig(presetConfig);
        },
        [setConfig]
    );

    const handleResetConfig = useCallback(() => {
        resetConfig();
        resetInitialConditions();
    }, [resetConfig, resetInitialConditions]);

    const handleReset = useCallback(() => {
        recompile();
        sim.reset(initialConditions);
    }, [sim, initialConditions, recompile]);

    const handleRigChange = useCallback(
        (newRigId: string) => {
            setRigId(newRigId);
            const newRig = rigRegistry[newRigId];
            setConfig({ ...newRig.defaultConfig });
            setInitialConditions({ ...newRig.defaultState });
            recompile();
            sim.reset();
        },
        [sim, setConfig, setInitialConditions, recompile]
    );

    return (
        <div
            className={`app-layout ${anyDragging ? "is-resizing" : ""}`}
            style={{
                gridTemplateColumns: `1fr var(--resize-handle-size) ${sidebar.size}px`,
                gridTemplateRows: `var(--toolbar-height) 1fr var(--resize-handle-size) ${plots.size}px`
            }}
        >
            <header className="app-toolbar">
                <Toolbar
                    status={sim.status}
                    time={sim.time}
                    speedMultiplier={speedMultiplier}
                    onPlay={sim.play}
                    onPause={sim.pause}
                    onReset={handleReset}
                    onSpeedChange={setSpeedMultiplier}
                />
                <RigSelector selectedRigId={rigId} onSelect={handleRigChange} />
            </header>

            <section className="app-canvas" aria-label="Simulation visualization">
                <SimCanvas rig={rig} state={sim.state} config={config} lastForce={sim.lastForce} onPerturb={sim.perturb} />
            </section>

            <ResizeHandle direction="horizontal" onMouseDown={sidebar.startDrag} isDragging={sidebar.isDragging} />

            <aside className="app-sidebar">
                <div className="sidebar-editor" style={{ flex: "1 1 0", minHeight: 0 }}>
                    <CodeEditor code={code} onChange={setCode} error={compileError} onReset={resetCode} docs={rig.getControllerDocs()} />
                </div>
                <ResizeHandle direction="vertical" onMouseDown={panels.startDrag} isDragging={panels.isDragging} />
                <div className="sidebar-panels" style={{ height: panels.size }}>
                    <PresetSelector presets={rig.getPresets()} onSelect={handlePresetSelect} onReset={handleResetConfig} />
                    <ParameterPanel title="Parameters" definitions={rig.getParameterDefinitions()} values={config} onChange={handleConfigChange} />
                    <ParameterPanel title="Initial Conditions" definitions={rig.getInitialConditionDefinitions()} values={initialConditions} onChange={handleInitialConditionChange} />
                </div>
            </aside>

            <ResizeHandle direction="vertical" onMouseDown={plots.startDrag} isDragging={plots.isDragging} />

            <footer className="app-plots" aria-label="Time series plots">
                <TimePlots plotDefinitions={rig.getPlotDefinitions()} history={sim.engine.history} />
            </footer>
        </div>
    );
}
