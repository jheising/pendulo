import { useRef, useEffect, useCallback } from "react";
import { Chart, LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, Filler } from "chart.js";
import type { PlotDefinition } from "@/types/Rig";
import type { RingBuffer } from "@/utils/history";

Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Legend, Filler);

const PLOT_UPDATE_INTERVAL_MS = 100;

interface TimePlotsProps {
    plotDefinitions: PlotDefinition[];
    history: RingBuffer;
}

export function TimePlots({ plotDefinitions, history }: TimePlotsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

    const defsKey = plotDefinitions.map(d => d.key).join(",");
    const plotDefsRef = useRef(plotDefinitions);
    plotDefsRef.current = plotDefinitions;

    // Create/recreate chart when definitions change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const defs = plotDefsRef.current;

        const chart = new Chart(canvas, {
            type: "line",
            data: {
                labels: [],
                datasets: defs.map(def => ({
                    label: `${def.label} (${def.unit})`,
                    borderColor: def.color,
                    backgroundColor: def.color + "20",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.1,
                    data: [],
                    yAxisID: def.key
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: "linear",
                        title: { display: false },
                        ticks: {
                            color: "#666",
                            font: { family: "monospace", size: 10 },
                            maxTicksLimit: 10
                        },
                        grid: { color: "#333" }
                    },
                    ...Object.fromEntries(
                        defs.map((def, i) => [
                            def.key,
                            {
                                type: "linear" as const,
                                position: i % 2 === 0 ? ("left" as const) : ("right" as const),
                                display: i === 0,
                                grid: { color: i === 0 ? "#333" : "transparent" },
                                ticks: {
                                    color: "#666",
                                    font: { family: "monospace", size: 10 }
                                }
                            }
                        ])
                    )
                },
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        labels: {
                            color: "#e2e8f0",
                            font: { family: "monospace", size: 11 },
                            usePointStyle: true,
                            pointStyle: "rectRounded",
                            padding: 16
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: "index",
                        intersect: false,
                        titleFont: { family: "monospace", size: 11 },
                        bodyFont: { family: "monospace", size: 11 }
                    }
                },
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false
                }
            }
        });

        chartRef.current = chart;

        return () => {
            chart.destroy();
            chartRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defsKey]);

    // Throttled data update
    const updateChart = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const defs = plotDefsRef.current;
        const points = history.getAll();
        const len = points.length;

        // Build x-axis labels (time values)
        const labels: number[] = new Array(len);
        for (let i = 0; i < len; i++) {
            labels[i] = points[i].time;
        }

        chart.data.labels = labels;

        // Fill each dataset
        for (let j = 0; j < defs.length; j++) {
            const getValue = defs[j].getValue;
            const dataArr: number[] = new Array(len);
            for (let i = 0; i < len; i++) {
                dataArr[i] = getValue(points[i].values);
            }
            chart.data.datasets[j].data = dataArr;
        }

        chart.update("none");
    }, [history]);

    useEffect(() => {
        intervalRef.current = setInterval(updateChart, PLOT_UPDATE_INTERVAL_MS);
        return () => clearInterval(intervalRef.current);
    }, [updateChart]);

    return (
        <div className="time-plots">
            <canvas ref={canvasRef} />
        </div>
    );
}
