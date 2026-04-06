import { rigRegistry } from "@/rigs";

interface RigSelectorProps {
    selectedRigId: string;
    onSelect: (rigId: string) => void;
}

export function RigSelector({ selectedRigId, onSelect }: RigSelectorProps) {
    const rigIds = Object.keys(rigRegistry);

    return (
        <div className="rig-selector">
            <label htmlFor="rig-select">Rig:</label>
            <select id="rig-select" value={selectedRigId} onChange={e => onSelect(e.target.value)} aria-label="Select simulation rig">
                {rigIds.map(id => (
                    <option key={id} value={id}>
                        {rigRegistry[id].name}
                    </option>
                ))}
            </select>
        </div>
    );
}
