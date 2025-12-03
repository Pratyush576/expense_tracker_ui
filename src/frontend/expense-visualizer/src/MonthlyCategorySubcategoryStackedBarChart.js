import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { Card } from 'react-bootstrap';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', '#f45b5b', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'];

const MonthlyCategorySubcategoryStackedBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-4">
        <Card.Header>Monthly Main Category & Subcategory Expense Breakdown</Card.Header>
        <Card.Body>
          <p>No monthly category expense data available for charting.</p>
        </Card.Body>
      </Card>
    );
  }

  // Filter out MONEY_MOVEMENT from the raw data
  const filteredData = data.filter(item => item.Category.split(':')[0].trim() !== 'MONEY_MOVEMENT');

  // Process data to separate main category and subcategory
  const processedData = filteredData.map(item => {
    const parts = item.Category.split(':').map(s => s.trim());
    const mainCategory = parts[0];
    const subCategory = parts.length > 1 ? parts.slice(1).join(':') : 'Uncategorized'; // Handle categories without subcategories
    return {
      YearMonth: item.YearMonth,
      mainCategory: mainCategory,
      subCategory: subCategory,
      total_cost: item.total_cost,
    };
  });

  // Aggregate costs by YearMonth, mainCategory, and subCategory
  const aggregatedBySubcategory = processedData.reduce((acc, item) => {
    const key = `${item.YearMonth}-${item.mainCategory}-${item.subCategory}`;
    if (!acc[key]) {
      acc[key] = { ...item, total_cost: 0 };
    }
    acc[key].total_cost += item.total_cost;
    return acc;
  }, {});

  const finalAggregatedData = Object.values(aggregatedBySubcategory);

  // Get all unique months, main categories, and subcategories
  const allMonths = [...new Set(finalAggregatedData.map(item => item.YearMonth))].sort();
  const allMainCategories = [...new Set(finalAggregatedData.map(item => item.mainCategory))];
  const allSubcategories = [...new Set(finalAggregatedData.map(item => item.subCategory))];

  // Restructure data for Recharts stacked bar chart
  // Each month will have an object, with main categories as keys, and within those, subcategories
  const chartData = allMonths.map(month => {
    const monthData = { YearMonth: month };
    allMainCategories.forEach(mainCat => {
      // For each main category, we need to sum up its subcategories for the month
      const mainCatTotal = finalAggregatedData
        .filter(item => item.YearMonth === month && item.mainCategory === mainCat)
        .reduce((sum, item) => sum + item.total_cost, 0);
      monthData[mainCat] = mainCatTotal; // This will be the total for the main category bar
      
      // Now, for stacking, we need individual subcategory values
      finalAggregatedData
        .filter(item => item.YearMonth === month && item.mainCategory === mainCat)
        .forEach(item => {
          // Use a unique key for each subcategory within the month, e.g., "MainCategory - SubCategory"
          monthData[`${mainCat} - ${item.subCategory}`] = item.total_cost;
        });
    });
    return monthData;
  });

  // Determine all unique stack keys (MainCategory - SubCategory) for the bars
  const allStackKeys = [...new Set(finalAggregatedData.map(item => `${item.mainCategory} - ${item.subCategory}`))];

  // Custom Tooltip to show percentage and actual values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const monthTotal = payload.reduce((sum, entry) => sum + entry.value, 0);
      return (
        <Card className="custom-tooltip">
          <Card.Header>{label}</Card.Header>
          <Card.Body>
            {payload.map((entry, index) => (
              <p key={`item-${index}`} style={{ color: entry.color }}>
                {entry.name}: ${entry.value.toFixed(2)} ({(entry.value / monthTotal * 100).toFixed(2)}%)
              </p>
            ))}
            <p className="total">Total: ${monthTotal.toFixed(2)}</p>
          </Card.Body>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card className="mb-4">
      <Card.Header>Monthly Main Category & Subcategory Expense Breakdown</Card.Header>
      <Card.Body style={{ height: '500px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20, right: 30, left: 20, bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="YearMonth">
              <Label value="Month" offset={-3} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Amount ($)" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {allStackKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={key.split(' - ')[0]} // Stack by main category
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default MonthlyCategorySubcategoryStackedBarChart;
