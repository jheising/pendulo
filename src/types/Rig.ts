export interface Dimensions {
    width: number;
    height: number;
}

export interface ParameterDefinition {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit?: string;
}

export interface InitialConditionDefinition {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit?: string;
}

export interface PlotDefinition {
    key: string;
    label: string;
    unit: string;
    color: string;
    getValue: (state: Record<string, number>) => number;
}

export interface PerturbationResult {
    stateKey: string;
    delta: number;
}

export interface ConfigPreset<C extends Record<string, number>> {
    id: string;
    label: string;
    description: string;
    config: C;
}

export interface Rig<S extends Record<string, number>, C extends Record<string, number>> {
    name: string;
    description: string;
    defaultState: S;
    defaultConfig: C;
    derivatives(state: S, config: C, controlInput: number): S;
    getControllerInput(state: S): Record<string, number>;
    render(ctx: CanvasRenderingContext2D, state: S, config: C, dims: Dimensions): void;
    getParameterDefinitions(): ParameterDefinition[];
    getInitialConditionDefinitions(): InitialConditionDefinition[];
    getPlotDefinitions(): PlotDefinition[];
    /** Given a click in CSS pixels, return the perturbation to apply (or null if too far away). */
    getPerturbation(clickX: number, clickY: number, state: S, config: C, dims: Dimensions): PerturbationResult | null;
    getPresets(): ConfigPreset<C>[];
}
