import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from './utils/currency';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

const PaymentSourcePieChart = ({ expenses, currency }) => {
  const filteredExpenses = expenses; // Expenses are already filtered by excludedCategories in App.js

  const paymentSources = filteredExpenses.reduce((acc, expense) => {
    const source = expense.payment_source;
    const amount = Math.abs(expense.amount);
    if (!acc[source]) {
      acc[source] = 0;
    }
    acc[source] += amount;
    return acc;
  }, {});

  const data = {
    labels: Object.keys(paymentSources),
    datasets: [
      {
        label: 'Expenses by Payment Source',
        data: Object.values(paymentSources),
        backgroundColor: COLORS.slice(0, Object.keys(paymentSources).length), // Use COLORS array
        borderColor: COLORS.slice(0, Object.keys(paymentSources).length),     // Use COLORS array
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to fill container without maintaining aspect ratio
    plugins: {
      legend: {
        position: 'right', // Set legend position to right
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += formatCurrency(context.parsed, currency);
            }
            return label;
          }
        }
      }
    },
  };

  return (
    <div className="chart-container" style={{ height: '400px' }}> {/* Define a height for responsiveness */}
      <Pie data={data} options={options} />
    </div>
  );
};

export default PaymentSourcePieChart;
