import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { Card } from 'react-bootstrap';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

const MonthlyCategoryLineChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Monthly Expense Trends by Category</Card.Header>
        <Card.Body>
          <p>No monthly category expense data available for charting.</p>
        </Card.Body>
      </Card>
    );
  }

  // Process data for Recharts:
  // 1. Get all unique months
  // 2. Get all unique categories
  // 3. Restructure data to have each month as an object with category costs as properties

  // First, map to main categories and aggregate costs
  const processedData = data
    .map(item => ({
      ...item,
      mainCategory: item.Category,
    }))
    .reduce((acc, item) => {
      const key = `${item.YearMonth}-${item.mainCategory}`;
      if (!acc[key]) {
        acc[key] = { YearMonth: item.YearMonth, mainCategory: item.mainCategory, total_cost: 0 };
      }
      acc[key].total_cost += item.total_cost;
      return acc;
    }, {});

  const aggregatedData = Object.values(processedData);

  const allMonths = [...new Set(aggregatedData.map(item => item.YearMonth))].sort();
  const allMainCategories = [...new Set(aggregatedData.map(item => item.mainCategory))];

  const chartData = allMonths.map(month => {
    const monthData = { YearMonth: month };
    allMainCategories.forEach(category => {
      const entry = aggregatedData.find(item => item.YearMonth === month && item.mainCategory === category);
      monthData[category] = entry ? entry.total_cost : 0;
    });
    return monthData;
  });

  return (
    <Card className="mb-4">
      <Card.Header>Monthly Expense Trends by Category</Card.Header>
      <Card.Body style={{ height: '500px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5, right: 30, left: 20, bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="YearMonth">
              <Label value="Month" offset={-3} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Amount ($)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            <Legend />
            {allMainCategories.map((category, index) => ( // Use allMainCategories here
              <Line
                key={category}
                type="monotone"
                dataKey={category}
                stroke={COLORS[index % COLORS.length]}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default MonthlyCategoryLineChart;