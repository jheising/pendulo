import type { ConfigPreset } from "@/types/Rig";

interface PresetSelectorProps {
    presets: ConfigPreset<Record<string, number>>[];
    onSelect: (config: Record<string, number>) => void;
    onReset?: () => void;
}

export function PresetSelector({ presets, onSelect, onReset }: PresetSelectorProps) {
    return (
        <div className="preset-selector">
            <label htmlFor="preset-select">Preset:</label>
            <select
                id="preset-select"
                defaultValue=""
                onChange={e => {
                    const preset = presets.find(p => p.id === e.target.value);
                    if (preset) {
                        onSelect(preset.config);
                    }
                    e.target.value = "";
                }}
                aria-label="Select a parameter preset"
            >
                <option value="" disabled>
                    Choose a preset...
                </option>
                {presets.map(p => (
                    <option key={p.id} value={p.id} title={p.description}>
                        {p.label}
                    </option>
                ))}
            </select>
            {onReset && (
                <button className="btn btn-reset" onClick={onReset} aria-label="Reset parameters to defaults">
                    Reset
                </button>
            )}
        </div>
    );
}
