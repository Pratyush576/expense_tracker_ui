import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MonthlyBarChart = ({ income, expenses }) => {
  const [chartDataVisibility, setChartDataVisibility] = useState({
    Income: true,
    Expenses: true,
    'Net Income': true,
  });

  const processData = (transactions) => {
    return transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.Date);
      const month = date.toLocaleString('default', { month: 'short' }); // Use short month name for better display
      const year = date.getFullYear();
      const monthYear = `${month} ${year}`;
      const amount = transaction.Amount;

      if (!acc[monthYear]) {
        acc[monthYear] = 0;
      }
      acc[monthYear] += amount;
      return acc;
    }, {});
  };

  const monthlyIncomeRaw = processData(income);
  const monthlyExpensesRaw = processData(expenses);

  // Get all unique months and sort them chronologically
  const allMonthsSet = new Set([...Object.keys(monthlyIncomeRaw), ...Object.keys(monthlyExpensesRaw)]);
  const allMonths = Array.from(allMonthsSet).sort((a, b) => {
    const [monthA, yearA] = a.split(' ');
    const [monthB, yearB] = b.split(' ');
    const dateA = new Date(`${monthA} 1, ${yearA}`);
    const dateB = new Date(`${monthB} 1, ${yearB}`);
    return dateA - dateB;
  });

  const monthlyIncome = allMonths.map(month => monthlyIncomeRaw[month] || 0);
  const monthlyExpenses = allMonths.map(month => monthlyExpensesRaw[month] || 0);
  const monthlyNetIncome = allMonths.map(month => (monthlyIncomeRaw[month] || 0) + (monthlyExpensesRaw[month] || 0));

  const data = {
    labels: allMonths,
    datasets: [
      {
        label: 'Income',
        data: monthlyIncome,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
        hidden: !chartDataVisibility.Income,
      },
      {
        label: 'Expenses',
        data: monthlyExpenses.map(amount => Math.abs(amount)), // Display absolute value for expenses
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        hidden: !chartDataVisibility.Expenses,
      },
      {
        label: 'Net Income',
        data: monthlyNetIncome,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
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
        text: 'Monthly Income, Expenses, and Net Income',
      },
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

  return <Bar data={data} options={options} />;
};

export default MonthlyBarChart;
