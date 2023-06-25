import React, { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { useContext } from 'react';
import { AppContext } from '../hooks/context';

const Statistics = () => {

    const { loggedInUser } = useContext(AppContext);
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
    const binCount = 9;
    const bins = Array(binCount).fill(0);

    loggedInUser?.scores?.forEach((percentage) => {
        let binIndex;
        if (percentage >= 35) {
            binIndex = binCount - 1;
        } else if (percentage >= 25) {
            binIndex = binCount - 2;
        } else if (percentage >= 15) {
            binIndex = binCount - 3;
        } else if (percentage >= 5) {
            binIndex = binCount - 4;
        } else if (percentage >= -5) {
            binIndex = binCount - 5;
        } else if (percentage >= -15) {
            binIndex = binCount - 6;
        } else if (percentage >= -25) {
            binIndex = binCount - 7;
        } else if (percentage >= -35) {
            binIndex = binCount - 8;
        } else {
            binIndex = 0;
        }

        bins[binIndex]++;
    });

        const binLabels = [
            '-35%+',
            '-35%',
            '-25%',
            '-15%',
            '±5%',
            '15%',
            '25%',
            '35%',
            '35%+',
        ];

        const chartData = {
            labels: binLabels,
            datasets: [
            {
                label: 'Percentage',
                data: bins,
                backgroundColor: '#545050',
                borderWidth: 1,
                barThickness: width / (binCount * 2) * 0.8,
            },
            ],
        };

        const ctx = chartRef.current.getContext('2d');
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 30,
                    },
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: false,
                        },
                        ticks: {
                            color: '#0070c0',
                        },
                        grid: {
                            display: false,
                        },
                        barPercentage: 0.8,
                        categoryPercentage: 0.9,
                    },
                    y: {
                        display: false,
                    },
                },
                animation: {
                    onComplete: () => {
                        if (chartInstanceRef.current) {
                            const { ctx } = chartInstanceRef.current;
                
                            ctx.font = 'bold 12px Arial';
                            ctx.fillStyle = '#000000';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                
                            chartInstanceRef.current.data.datasets.forEach((dataset, datasetIndex) => {
                                const meta = chartInstanceRef.current.getDatasetMeta(datasetIndex);
                                meta.data.forEach((bar, index) => {
                                    const frequency = dataset.data[index];
                                    const x = bar.x;
                                    const y = bar.y - 5;
                
                                    if (frequency > 0) {
                                        ctx.fillText(frequency.toString(), x, y);
                                    } else {
                                        ctx.fillText("", x, y);
                                    }
                                });
                            });
                        }
                    },
                },
            },
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [loggedInUser?.scores, width]);

    return (
        <div className="chartContainer">
            <canvas id="histogramChart" ref={chartRef} className="myChart"></canvas>
        </div>
    );
};

export default Statistics;

