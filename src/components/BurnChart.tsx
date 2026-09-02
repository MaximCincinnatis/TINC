'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Bar } from 'react-chartjs-2';
import { BurnData } from '../types/BurnData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface Props {
  burnData: BurnData;
}

const THRESHOLD = 86400; // 1 TINC/second = 86,400 TINC/day
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/**
 * Bars warm toward the line: a small burn is a dim ember (--ember-orange), a day just short of
 * the emission is full ember gold, a day above it is dragon jade, brightening toward
 * --dragon-jade-bright as it doubles the emission. Hover shows the same hue at full strength.
 */
function barColor(value: number, hover = false): string {
  if (value >= THRESHOLD) {
    const e = Math.min((value - THRESHOLD) / THRESHOLD, 1);
    return `rgba(0, ${lerp(212, 255, e)}, ${lerp(170, 204, e)}, ${hover ? 1 : 0.85 + e * 0.1})`;
  }
  const t = Math.max(0, Math.min(value / THRESHOLD, 1));
  return `rgba(${lerp(255, 245, t)}, ${lerp(109, 166, t)}, ${lerp(58, 35, t)}, ${hover ? 1 : 0.5 + t * 0.45})`;
}

const BurnChart: React.FC<Props> = ({ burnData }) => {
  const labels = burnData.dailyBurns.map(d => {
    // Parse date as UTC to avoid timezone issues
    const [year, month, day] = d.date.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const deflationaryThreshold = THRESHOLD;

  const data = {
    labels,
    datasets: [
      {
        label: 'TINC Burned',
        data: burnData.dailyBurns.map(d => d.amountTinc),
        backgroundColor: (context: any) => barColor(context.parsed?.y || 0),
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: (context: any) => barColor(context.parsed?.y || 0, true),
        type: 'bar' as const,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart' as const,
      delay: (context: any) => context.dataIndex * 30,
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 13, 18, 0.97)',
        titleColor: '#FAF8F0',
        bodyColor: '#FAF8F0',
        borderColor: 'rgba(0, 212, 170, 0.2)',
        borderWidth: 1,
        padding: 16,
        cornerRadius: 12,
        displayColors: false,
        titleAlign: 'center',
        bodyAlign: 'left',
        titleFont: {
          size: 14,
          weight: 'bold',
          family: 'Dela Gothic One, sans-serif'
        },
        bodyFont: {
          size: 13,
          weight: '500',
          family: 'Zen Maru Gothic, sans-serif'
        },
        footerFont: {
          size: 12,
          weight: 'bold',
          family: 'IBM Plex Mono, monospace'
        },
        callbacks: {
          title: (context: any) => {
            const dateStr = burnData.dailyBurns[context[0].dataIndex].date;
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            return date.toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC'
            });
          },
          label: (context: any) => {
            const dayData = burnData.dailyBurns[context.dataIndex];
            const amount = dayData.amountTinc;
            const transactions = dayData.transactionCount;
            
            const formatAmount = (num: number) => {
              // Show full numbers with commas for thousands
              return Math.round(num).toLocaleString();
            };
            
            const difference = amount - deflationaryThreshold;
            const lines = [
              `TINC Burned: ${formatAmount(amount)}`,
              `Transactions: ${transactions}`,
              `Daily Threshold: ${formatAmount(deflationaryThreshold)}`
            ];
            
            if (difference > 0) {
              lines.push(`Net Deflation: ${formatAmount(difference)}`);
            } else {
              lines.push(`Shortfall: ${formatAmount(Math.abs(difference))}`);
            }
            lines.push(`${Math.round((amount / deflationaryThreshold) * 100)}% of the day's emission`);
            
            return lines;
          },
          footer: (context: any) => {
            const amount = context[0].parsed.y;
            const isDeflationary = amount >= deflationaryThreshold;
            return isDeflationary ? '🐉 DEFLATIONARY DAY' : '⚡ BELOW THRESHOLD';
          }
        }
      },
      annotation: {
        annotations: {
          deflationaryLine: {
            type: 'line',
            yMin: deflationaryThreshold,
            yMax: deflationaryThreshold,
            borderColor: '#00D4AA',
            borderWidth: 2,
            borderDash: [0],
            // 2026-09-02 (D-9): name the line on the plot, not only in the legend
            label: {
              display: true,
              content: `${(deflationaryThreshold / 1000).toFixed(1)}K / day`,
              position: 'end',
              xAdjust: -4,
              yAdjust: -14,
              backgroundColor: 'rgba(15, 15, 24, 0.85)',
              borderColor: 'rgba(0, 212, 170, 0.3)',
              borderWidth: 1,
              borderRadius: 6,
              color: '#00D4AA',
              font: { family: 'IBM Plex Mono, monospace', size: 11, weight: 600 },
              padding: { x: 7, y: 4 }
            }
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(250, 248, 240, 0.6)',
          font: {
            size: 11,
            weight: 500,
            family: 'Zen Maru Gothic, sans-serif'
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15
        },
        offset: true,
        bounds: 'data'
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(250, 248, 240, 0.04)',
          drawBorder: false
        },
        ticks: {
          color: 'rgba(250, 248, 240, 0.6)',
          font: {
            size: 11,
            weight: 500,
            family: 'IBM Plex Mono, sans-serif'
          },
          callback: function(value: any) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(0) + 'K';
            }
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="chart-wrapper">
      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-line deflationary"></div>
          <span>Deflationary Threshold: 86,400 TINC/Day</span>
        </div>
        <div className="legend-item">
          <div className="legend-ramp"></div>
          <span>Bars warm from ember to gold as a day nears the line, jade above it</span>
        </div>
      </div>
    </div>
  );
};

export default BurnChart;