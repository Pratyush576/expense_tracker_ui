import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Line } from 'recharts'; // Import Line
import { Card, Row, Col } from 'react-bootstrap';
import { formatCurrency } from './utils/currency'; // Import the utility

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'];

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

const CategoryCostChart = ({ data, budgets, selectedYear, currency }) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-4 shadow-lg">
        <Card.Header>Category-wise Cost Analysis</Card.Header>
        <Card.Body>
          <p>No expense data available for charting.</p>
        </Card.Body>
      </Card>
    );
  }

  console.log("CategoryCostChart data prop:", data);

  const processedData = data.map(entry => {
    const categoryName = entry.Category || 'Unknown'; // Provide a default if category is undefined/null
    return {
      ...entry,
      mainCategory: categoryName, // Use Category directly
      displayCategory: categoryName // Use Category directly
    };
  });
  console.log("Processed Data:", processedData);

  // Aggregate amounts for the same main categories
  const aggregatedData = processedData.reduce((acc, item) => {
    const existingCategory = acc.find(d => d.mainCategory === item.mainCategory);
    if (existingCategory) {
      existingCategory.total_cost += item.total_cost;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, []);
  console.log("Aggregated Data:", aggregatedData);

  // Calculate budget for each category
  const finalChartData = aggregatedData.map(entry => {
    const categoryBudget = findApplicableBudget(entry.mainCategory, parseInt(selectedYear), null, budgets); // Pass null for month to get annual budget
    return {
      ...entry,
      categoryBudget: categoryBudget // Add budget to data
    };
  });

  // Custom Tooltip to show percentage and budget
  const CustomTooltip = ({ active, payload, label, currency }) => {
    if (active && payload && payload.length) {
      const totalCost = payload[0].payload.total_cost;
      const categoryBudget = payload[0].payload.categoryBudget;
      return (
        <Card className="custom-tooltip">
          <Card.Header>{label}</Card.Header>
          <Card.Body>
            {payload.map((entry, index) => (
              entry.dataKey !== 'categoryBudget' && (
                <p key={`item-${index}`} style={{ color: entry.color }}>
                  {entry.dataKey === 'total_cost' ? 'Actual Expenses' : entry.name}: {formatCurrency(entry.value, currency)}
                </p>
              )
            ))}
            <p className="total" style={{ color: '#ff0000' }}>Budget: {formatCurrency(categoryBudget, currency)}</p>
            <p className="total">Difference: {formatCurrency(categoryBudget - totalCost, currency)}</p>
          </Card.Body>
        </Card>
      );
    }
    return null;
  };

  // Calculate total yearly expenses and budget
  const totalYearlyExpenses = finalChartData.reduce((sum, entry) => sum + entry.total_cost, 0);
  const totalYearlyBudget = finalChartData.reduce((sum, entry) => sum + entry.categoryBudget, 0);
  const remainingBudget = totalYearlyBudget - totalYearlyExpenses;

  return (
          <Card className="mb-4 shadow-lg">
            <Card.Header>Category-wise Cost Analysis</Card.Header>      <Card.Body style={{ height: '600px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={finalChartData} // Use finalChartData
            margin={{
              top: 20, right: 30, left: 100, bottom: 5, // Increased left margin
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" formatter={(value) => formatCurrency(value, currency)} />
            <YAxis type="category" dataKey="displayCategory" width={100} /> {/* Increased YAxis width */}
            <Tooltip content={<CustomTooltip currency={currency} />} /> {/* Pass currency to CustomTooltip */}
            <Legend />
            <Bar dataKey="total_cost">
              {
                finalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))
              }
            </Bar>
            <Line type="number" dataKey="categoryBudget" stroke="#ff0000" strokeWidth={2} dot={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card.Body>
      <Card.Footer>
        <Card.Header className="bg-info text-white">Annual Summary</Card.Header>
        <Row>
          <Col>
            <strong>Total Budget:</strong> {formatCurrency(totalYearlyBudget, currency)}
          </Col>
          <Col>
            <strong>Total Expenses:</strong> {formatCurrency(totalYearlyExpenses, currency)}
          </Col>
          <Col>
            <strong>Remaining Budget:</strong> <span className={remainingBudget >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(remainingBudget, currency)}</span>
          </Col>
        </Row>
      </Card.Footer>
    </Card>
  );
};

export default CategoryCostChart;