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



const BurnChart: React.FC<Props> = ({ burnData }) => {
  const labels = burnData.dailyBurns.map(d => {
    // Parse date as UTC to avoid timezone issues
    const [year, month, day] = d.date.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const deflationaryThreshold = 86400; // Fixed 1 TINC/second = 86,400 TINC/day

  const data = {
    labels,
    datasets: [
      {
        label: 'TINC Burned',
        data: burnData.dailyBurns.map(d => d.amountTinc),
        backgroundColor: (context: any) => {
          const value = context.parsed?.y || 0;
          const isDeflationary = value >= deflationaryThreshold;
          if (isDeflationary) {
            // Dragon jade for deflationary
            return 'rgba(0, 212, 170, 0.85)';
          }
          // Ember orange gradient for below threshold
          const maxValue = Math.max(...burnData.dailyBurns.map(d => d.amountTinc));
          const intensity = value / maxValue;
          return `rgba(245, 166, 35, ${0.4 + intensity * 0.45})`;
        },
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: (context: any) => {
          const value = context.parsed?.y || 0;
          const isDeflationary = value >= deflationaryThreshold;
          // Brighter on hover
          return isDeflationary ? 'rgba(0, 255, 204, 0.95)' : 'rgba(255, 109, 58, 0.9)';
        },
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
            label: {
              display: false
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
      </div>
    </div>
  );
};

export default BurnChart;