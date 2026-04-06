import type { ParameterDefinition } from "@/types/Rig";

interface ParameterPanelProps {
    title: string;
    definitions: ParameterDefinition[];
    values: Record<string, number>;
    onChange: (key: string, value: number) => void;
}

export function ParameterPanel({ title, definitions, values, onChange }: ParameterPanelProps) {
    return (
        <div className="parameter-panel">
            <h3 className="panel-title">{title}</h3>
            {definitions.map(def => {
                const value = values[def.key] ?? def.defaultValue;
                return (
                    <div key={def.key} className="parameter-row">
                        <label className="parameter-label" htmlFor={`param-${def.key}`}>
                            {def.label}
                            {def.unit && <span className="parameter-unit"> ({def.unit})</span>}
                        </label>
                        <div className="parameter-controls">
                            <input
                                id={`param-${def.key}`}
                                type="range"
                                min={def.min}
                                max={def.max}
                                step={def.step}
                                value={value}
                                onChange={e => onChange(def.key, parseFloat(e.target.value))}
                                className="parameter-slider"
                                aria-label={`${def.label} value`}
                            />
                            <span className="parameter-value">{value.toFixed(2)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
