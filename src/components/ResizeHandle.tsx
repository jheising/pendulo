import type { ResizeDirection } from "@/hooks/useResizable";

interface ResizeHandleProps {
    direction: ResizeDirection;
    onMouseDown: (e: React.MouseEvent) => void;
    isDragging: boolean;
}

export function ResizeHandle({ direction, onMouseDown, isDragging }: ResizeHandleProps) {
    const isHorizontal = direction === "horizontal";

    return (
        <div
            className={`resize-handle resize-handle-${isHorizontal ? "h" : "v"} ${isDragging ? "resize-handle-active" : ""}`}
            onMouseDown={onMouseDown}
            role="separator"
            aria-orientation={isHorizontal ? "vertical" : "horizontal"}
            aria-label={`Resize ${isHorizontal ? "horizontally" : "vertically"}`}
            tabIndex={0}
        />
    );
}
