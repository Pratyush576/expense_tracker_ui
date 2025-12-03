
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ExpenseChart = ({ income, expenses }) => {
  const allDates = [...new Set([...income.map(i => i.Date), ...expenses.map(e => e.Date)])].sort();

  const data = {
    labels: allDates,
    datasets: [
      {
        label: 'Income',
        data: allDates.map(date => income.find(i => i.Date === date)?.Amount || 0),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Expenses',
        data: allDates.map(date => expenses.find(e => e.Date === date)?.Amount || 0),
        fill: false,
        backgroundColor: 'rgb(255, 99, 132)',
        borderColor: 'rgba(255, 99, 132, 0.2)',
      },
    ],
  };

  return <Line data={data} />;
};

export default ExpenseChart;
