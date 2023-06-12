import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { useContext } from 'react';
import { AppContext } from '../hooks/context';

const Statistics = () => {

  const { loggedInUser } = useContext(AppContext)
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const binCount = 14;
    // const dataMin = -50.0;
    // const dataMax = 50.0;
    // const binSize = (dataMax - dataMin) / binCount;
    const bins = Array(binCount).fill(0);

    loggedInUser?.scores?.forEach((percentage) => {
    let binIndex;
    if (percentage > 30) {
        binIndex = binCount - 1;
    } else if (percentage > 20) {
        binIndex = binCount - 2;
    } else if (percentage > 10) {
        binIndex = binCount - 3;
    } else if (percentage > 5) {
        binIndex = binCount - 4;
    } else if (percentage > 2) {
        binIndex = binCount - 5;
    } else if (percentage > 1) {
        binIndex = binCount - 6;
    } else if (percentage > 0) {
        binIndex = binCount - 7;
    } else if (percentage > -1) {
        binIndex = binCount - 8;
    } else if (percentage > -2) {
        binIndex = binCount - 9;
    } else if (percentage > -5) {
        binIndex = binCount - 10;
    } else if (percentage > -10) {
        binIndex = binCount - 11;
    } else if (percentage > -20) {
        binIndex = binCount - 12;
    } else if (percentage > -30) {
        binIndex = binCount - 13;
    } else {
        binIndex = 0;
    }

    bins[binIndex]++;
});

    const binLabels = [
        '-50%+',
        '-30%',
        '-20%',
        '-10%',
        '-5%',
        '-2%',
        '-1%',
        '1%',
        '2%',
        '5%',
        '10%',
        '20%',
        '30%',
        '50%+',
    ];

    const chartData = {
        labels: binLabels,
        datasets: [
            {
                label: 'Percentage',
                data: bins,
                backgroundColor: '#545050',
                borderWidth: 1,
                barThickness: 30,
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
                    top: 30 
                }
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

                ctx.fillText(frequency.toString(), x, y);
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
    }, 
    [loggedInUser?.scores]);

    return (
        <div className="chartContainer">
            <canvas id="histogramChart" ref={chartRef} className="myChart"></canvas>
        </div>
    );
};

export default Statistics;

