import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, Line } from 'recharts'; // Import Line
import { Card } from 'react-bootstrap';
import { formatCurrency } from './utils/currency'; // Import the utility

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'];

// Helper function to find the applicable budget for a given category, year, and month
const findApplicableBudget = (category, year, month, budgets) => {
  const safeBudgets = budgets || [];

  // If annual budget is requested, sum up all monthly budgets for that year
  if (month === null) {
    let totalAnnualBudget = 0;
    for (let m = 1; m <= 12; m++) {
      totalAnnualBudget += findApplicableBudget(category, year, m, budgets); // Recursive call for each month
    }
    return totalAnnualBudget;
  }

  // Monthly budget calculation (month is not null)

  // 1. Try to find an exact match for a specific month
  const exactBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === year &&
      b.months &&
      b.months.includes(month)
  );
  if (exactBudget) {
    return exactBudget.amount;
  }

  // 2. Try to find a budget for the whole year (treated as an annual total)
  const yearBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === year &&
      (!b.months || !b.months.length) // Check for empty array as well
  );
  if (yearBudget) {
    return yearBudget.amount / 12; // Treat as annual total, divide by 12 for monthly
  }

  // 3. Try to find a default budget for the category (treated as a recurring monthly amount)
  const defaultBudget = safeBudgets.find(
    (b) =>
      b.category === category &&
      b.year === null &&
      (!b.months || !b.months.length) // Check for empty array as well
  );
  if (defaultBudget) {
    return defaultBudget.amount; // Treat as monthly amount
  }

  return 0; // No budget found for the month
};

const MonthlyStackedBarChart = ({ data, excludedCategories, budgets, currency }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-4 shadow-lg">
        <Card.Header>Monthly Category-wise Expense Comparison</Card.Header>
        <Card.Body>
          <p>No monthly category expense data available for charting.</p>
        </Card.Body>
      </Card>
    );
  }

  // Aggregate data by main category
  const processedData = data.map(item => ({
    ...item,
    mainCategory: item.Category,
  })).reduce((acc, item) => {
    const key = `${item.YearMonth}-${item.mainCategory}`;
    if (!acc[key]) {
      acc[key] = { YearMonth: item.YearMonth, mainCategory: item.mainCategory, total_cost: 0 };
    }
    acc[key].total_cost += item.total_cost;
    return acc;
  }, {});

  const aggregatedData = Object.values(processedData);

  // Get all unique months and categories
  const allMonths = [...new Set(aggregatedData.map(item => item.YearMonth))].sort();
  const allMainCategories = [...new Set(aggregatedData.map(item => item.mainCategory))];

  // Restructure data for Recharts stacked bar chart
  const chartData = allMonths.map(month => {
    const monthData = { YearMonth: month };
    let monthlyTotalExpenses = 0;
    let monthlyTotalBudget = 0;

    const [yearStr, monthStr] = month.split('-');
    const currentYear = parseInt(yearStr);
    const currentMonth = parseInt(monthStr);

    allMainCategories.forEach(category => {
      const entry = aggregatedData.find(item => item.YearMonth === month && item.mainCategory === category);
      const cost = entry ? entry.total_cost : 0;
      monthData[category] = cost;
      monthlyTotalExpenses += cost;

      // Calculate budget for each category for the current month
      const categoryBudget = findApplicableBudget(category, currentYear, currentMonth, budgets);
      monthlyTotalBudget += categoryBudget;
    });
    
    // Add budget for ALL_CATEGORIES if no specific category budgets are found
    if (monthlyTotalBudget === 0 && allMainCategories.length > 0) {
        const allCategoriesBudget = findApplicableBudget("ALL_CATEGORIES", currentYear, currentMonth, budgets);
        monthlyTotalBudget = allCategoriesBudget;
    }


    monthData.monthlyTotalExpenses = monthlyTotalExpenses; // Store monthly total expenses
    monthData.monthlyTotalBudget = monthlyTotalBudget; // Store monthly total budget
    return monthData;
  });

  // Custom Tooltip to show percentage
  const CustomTooltip = ({ active, payload, label, currency }) => {
    if (active && payload && payload.length) {
      const totalExpenses = payload[0].payload.monthlyTotalExpenses;
      const totalBudget = payload[0].payload.monthlyTotalBudget;
      return (
        <Card className="custom-tooltip" style={{ zIndex: 999, position: 'relative' }}>
          <Card.Header>{label}</Card.Header>
          <Card.Body>
            {payload.map((entry, index) => (
              // Filter out the budget line from the stacked bar tooltip
              entry.dataKey !== 'monthlyTotalBudget' && (
                <p key={`item-${index}`} style={{ color: entry.color }}>
                  {entry.name}: {formatCurrency(entry.value, currency)} ({(entry.value / totalExpenses * 100).toFixed(2)}%)
                </p>
              )
            ))}
            <p className="total">Total Expenses: {formatCurrency(totalExpenses, currency)}</p>
            <p className="total" style={{ color: '#ff0000' }}>Total Budget: {formatCurrency(totalBudget, currency)}</p>
          </Card.Body>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card className="mb-4 shadow-lg">
      <Card.Header>Monthly Category-wise Expense Comparison</Card.Header>
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
            <YAxis formatter={(value) => formatCurrency(value, currency)}>
              <Label value="Amount" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend />
            {allMainCategories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="a" // All bars stack on top of each other
                fill={COLORS[index % COLORS.length]}
              />
            ))}
            <Line type="monotone" dataKey="monthlyTotalBudget" stroke="#ff0000" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default MonthlyStackedBarChart;