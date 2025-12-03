import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { formatCurrency } from './utils/currency';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PaymentSourceMonthlyBarChart = ({ income, expenses, selectedPaymentSource, currency }) => {
  const [chartDataVisibility, setChartDataVisibility] = useState({
    Income: true,
    Expenses: true,
    'Net Income': true,
  });

  const processData = (transactions) => { // Removed isExpense parameter
    return transactions.reduce((acc, transaction) => {
      // Filter by selectedPaymentSource
      if (selectedPaymentSource && transaction.payment_source !== selectedPaymentSource) {
        return acc;
      }

      const date = new Date(transaction.date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() is 0-indexed
      const monthYear = `${year}-${month.toString().padStart(2, '0')}`; // Standardize to "YYYY-MM" format
      const amount = transaction.amount;

      if (!acc[monthYear]) {
        acc[monthYear] = 0;
      }

      acc[monthYear] += amount;
      return acc;
    }, {});
  };

  const monthlyIncomeRaw = processData(income);
  const monthlyExpensesRaw = processData(expenses);

  // Get all unique months and sort them chronologically (in YYYY-MM format)
  const allMonthsSet = new Set([...Object.keys(monthlyIncomeRaw), ...Object.keys(monthlyExpensesRaw)]);
  const allMonthsYYYYMM = Array.from(allMonthsSet).sort(); // Sort chronologically in YYYY-MM format
  // Convert YYYY-MM to "Mon YYYY" for display labels
  const allMonthsDisplay = allMonthsYYYYMM.map(monthYear => {
    const [year, month] = monthYear.split('-');
    return `${new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'short' })} ${year}`;
  });

  const monthlyIncome = allMonthsYYYYMM.map(month => monthlyIncomeRaw[month] || 0);
  const monthlyExpenses = allMonthsYYYYMM.map(month => monthlyExpensesRaw[month] || 0);
  const monthlyNetIncome = allMonthsYYYYMM.map(month => (monthlyIncomeRaw[month] || 0) + (monthlyExpensesRaw[month] || 0));

  const data = {
    labels: allMonthsDisplay, // Use display labels for chart
    datasets: [
      {
        label: 'Income',
        data: monthlyIncome,
        backgroundColor: '#50e3c2', // Use hex code for secondary-color
        borderColor: '#50e3c2',
        borderWidth: 1,
        hidden: !chartDataVisibility.Income,
      },
      {
        label: 'Expenses',
        data: monthlyExpenses.map(amount => Math.abs(amount)), // Display absolute value for expenses
        backgroundColor: '#e74c3c', // Use hex code for danger-color
        borderColor: '#e74c3c',
        borderWidth: 1,
        hidden: !chartDataVisibility.Expenses,
      },
      {
        label: 'Net Income',
        data: monthlyNetIncome,
        backgroundColor: '#4a90e2', // Use hex code for primary-color
        borderColor: '#4a90e2',
        borderWidth: 1,
        hidden: !chartDataVisibility['Net Income'],
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        onClick: (e, legendItem, legend) => {
          const newVisibility = { ...chartDataVisibility };
          newVisibility[legendItem.text] = !newVisibility[legendItem.text];
          setChartDataVisibility(newVisibility);
        },
      },
      title: {
        display: true,
        text: `Monthly Overview for ${selectedPaymentSource || 'All Sources'} `,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y, currency);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: false,
      },
      y: {
        stacked: false,
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="chart-container" style={{ height: '350px' }}> {/* Define a height for responsiveness */}
      <Bar data={data} options={options} />
    </div>
  );
};

export default PaymentSourceMonthlyBarChart;
