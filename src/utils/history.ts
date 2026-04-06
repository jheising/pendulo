import type { TimeSeriesPoint } from "@/types/Simulation";

export class RingBuffer {
    private buffer: TimeSeriesPoint[];
    private head = 0;
    private count = 0;
    private capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }

    push(point: TimeSeriesPoint): void {
        this.buffer[this.head] = point;
        this.head = (this.head + 1) % this.capacity;
        if (this.count < this.capacity) {
            this.count++;
        }
    }

    getAll(): TimeSeriesPoint[] {
        if (this.count < this.capacity) {
            return this.buffer.slice(0, this.count);
        }
        // Buffer has wrapped — return in chronological order
        return [...this.buffer.slice(this.head), ...this.buffer.slice(0, this.head)];
    }

    clear(): void {
        this.head = 0;
        this.count = 0;
    }

    get length(): number {
        return this.count;
    }
}
